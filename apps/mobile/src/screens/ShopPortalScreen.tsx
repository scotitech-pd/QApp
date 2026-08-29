import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Image, Linking, Pressable, Text, View, ActivityIndicator } from "react-native";

import { api, ApiRequestError, type OpsDashboard, type ShopCustomerRecord, type ShopInsights, type ShopProfile } from "../api";
import { pickPhoto, pickSquareImage } from "../images";
import { WEB_BASE_URL } from "../config";
import { watchShop } from "../realtime";
import { OptionSheet } from "../select";
import { useStore } from "../store";
import { colors, fonts, radius, shadowSoft, space } from "../theme";
import { Blueprint, Button, Field, Kicker, Loading, Note, Screen, Tag } from "../ui";
import { RegisterShopScreen } from "./RegisterShopScreen";

const PENDING_KEY = "qapp.pendingSignup";
type PendingSignup = { email: string; mobileNumber: string; businessName: string; submittedAt: string };

type OwnerTab = "queue" | "customers" | "earnings" | "shop";

function maskPhone(phone: string | null) {
  if (!phone || phone.length < 6) return "—";
  return `${phone.slice(0, 3)}•••••${phone.slice(-3)}`;
}

function minsAgo(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function relativeDay(iso: string | null) {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function moveToken(tokens: string[], index: number, delta: number) {
  const next = [...tokens];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function fmtClear(totalMins: number) {
  if (totalMins <= 0) return "0m";
  if (totalMins < 60) return `${totalMins}m`;
  return `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;
}

function hourLabel(hour: number) {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}`;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <Blueprint style={{ flex: 1, paddingVertical: space(2), paddingHorizontal: space(2.5), marginBottom: 0 }}>
      <Text style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
        {label}
      </Text>
      <Text style={{ fontSize: 24, fontFamily: fonts.heading, color: colors.text, marginTop: 1 }}>{value}</Text>
    </Blueprint>
  );
}

function SegTabs({ tab, onChange }: { tab: OwnerTab; onChange: (next: OwnerTab) => void }) {
  const items: Array<{ key: OwnerTab; label: string }> = [
    { key: "queue", label: "Queue" },
    { key: "customers", label: "Customers" },
    { key: "earnings", label: "Earnings" },
    { key: "shop", label: "Shop" }
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.full,
        padding: 3,
        marginBottom: space(4)
      }}
    >
      {items.map((item) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              flex: 1,
              paddingVertical: space(2),
              alignItems: "center",
              borderRadius: radius.full,
              backgroundColor: active ? colors.surface : "transparent",
              ...(active ? shadowSoft : null)
            }}
          >
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                fontFamily: fonts.heading,
                color: active ? colors.accent700 : colors.neutral600
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ShopPortalScreen() {
  const { accessToken, user, setSession, opsShopSlug, setOpsShopSlug } = useStore();

  // Dev builds prefill the seeded demo staff login so simulator demos are one tap.
  const [identifier, setIdentifier] = useState(__DEV__ ? "staff@fadeyard.demo" : "");
  const [password, setPassword] = useState(__DEV__ ? "QappStaff123!" : "");
  const [slugInput, setSlugInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ownerTab, setOwnerTab] = useState<OwnerTab>("queue");
  const [dash, setDash] = useState<OpsDashboard | null>(null);
  const [insights, setInsights] = useState<ShopInsights | null>(null);
  const [customers, setCustomers] = useState<ShopCustomerRecord[] | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInName, setWalkInName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [portalMode, setPortalMode] = useState<"signin" | "register">("signin");
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ShopProfile | null>(null);
  const [profileDraft, setProfileDraft] = useState<{ name: string; publicDescription: string; phone: string } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (raw) setPending(JSON.parse(raw));
      })
      .catch(() => undefined);
  }, []);

  async function checkPending() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      const status = await api.businessSignupStatus(pending.email, pending.mobileNumber);
      if (status.approvalStatus === "APPROVED") {
        setPendingStatus(`Approved! Sign in below as ${pending.email} with the password you chose.`);
        setIdentifier(pending.email);
        await AsyncStorage.removeItem(PENDING_KEY);
        setPending(null);
      } else if (status.approvalStatus === "REJECTED") {
        setPendingStatus(`Not approved${status.rejectionReason ? `: ${status.rejectionReason}` : "."} You can register again.`);
        await AsyncStorage.removeItem(PENDING_KEY);
        setPending(null);
      } else {
        setPendingStatus("Still under review — usually same day. We'll make it live as soon as it's checked.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not check status.");
    } finally {
      setBusy(false);
    }
  }

  const slug = opsShopSlug;

  const load = useCallback(async () => {
    if (!accessToken || !slug) return;
    try {
      setError(null);
      const [dashboard, shopInsights, shopCustomers] = await Promise.all([
        api.opsDashboard(accessToken, slug),
        api.opsInsights(accessToken, slug).catch(() => null),
        api.opsCustomers(accessToken, slug).catch(() => null)
      ]);
      setDash(dashboard);
      if (shopInsights) setInsights(shopInsights);
      if (shopCustomers) setCustomers(shopCustomers);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        // Session expired — back to sign-in instead of a dead error screen.
        setDash(null);
        setSession(null, null);
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load the queue.");
    }
  }, [accessToken, slug]);

  useEffect(() => {
    if (!accessToken || !slug) return;
    void load();
    // Sockets deliver changes the moment they happen; polling is the safety net.
    const unwatch = watchShop(slug, () => void load());
    const timer = setInterval(() => void load(), 15000);
    return () => {
      unwatch();
      clearInterval(timer);
    };
  }, [accessToken, slug, load]);

  async function signIn() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.login(identifier.trim(), password);
      setSession(result.tokens.accessToken, result.user);
      const staffSlug = result.user.staffProfiles[0]?.businessLocation.slug;
      if (staffSlug) setOpsShopSlug(staffSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  async function act(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!accessToken && portalMode === "register") {
    return (
      <RegisterShopScreen
        onBack={() => setPortalMode("signin")}
        onSubmitted={(submittedEmail, submittedMobile, businessName) => {
          const record: PendingSignup = { email: submittedEmail, mobileNumber: submittedMobile, businessName, submittedAt: new Date().toISOString() };
          setPending(record);
          setPendingStatus(`Thanks — ${businessName} is submitted. We review every shop by hand, usually the same day.`);
          setIdentifier(submittedEmail);
          void AsyncStorage.setItem(PENDING_KEY, JSON.stringify(record));
          setPortalMode("signin");
        }}
      />
    );
  }

  if (!accessToken) {
    return (
      <Screen subtitle="For salon owners and staff. Customers don't need an account." title="Shop sign in">
        {pending || pendingStatus ? (
          <Blueprint style={{ backgroundColor: colors.accent100 }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>
              {pending ? `${pending.businessName} · awaiting approval` : "Registration update"}
            </Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.neutral700, marginTop: 4, lineHeight: 19 }}>
              {pendingStatus ?? `Submitted ${new Date(pending!.submittedAt).toLocaleDateString()}. Check back here — once approved, sign in below.`}
            </Text>
            {pending ? (
              <View style={{ marginTop: space(2), alignSelf: "flex-start" }}>
                <Button kind="secondary" label="Check status" loading={busy} onPress={() => void checkPending()} small />
              </View>
            ) : null}
          </Blueprint>
        ) : null}
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setIdentifier}
          placeholder="owner@yourshop.com"
          value={identifier}
        />
        <Field label="Password" onChangeText={setPassword} secureTextEntry value={password} />
        <Pressable
          hitSlop={8}
          onPress={() => void Linking.openURL(`${WEB_BASE_URL}/forgot-password`)}
          style={{ alignSelf: "flex-start", marginTop: -space(1.5), marginBottom: space(3) }}
        >
          <Text style={{ color: colors.accent700, fontFamily: fonts.bodyMedium, fontSize: 13 }}>Forgot password?</Text>
        </Pressable>
        {error ? (
          <View style={{ marginBottom: space(3) }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}
        <Button blueprint disabled={!identifier.trim() || !password} label="Sign in" loading={busy} onPress={() => void signIn()} />
        <View style={{ marginTop: space(5), alignItems: "center", gap: space(1) }}>
          <Note center tone="faint">
            New here? Get your shop on OnQ — free during the pilot.
          </Note>
          <Button kind="ghost" label="Register your shop" onPress={() => setPortalMode("register")} small />
        </View>
      </Screen>
    );
  }

  if (!slug) {
    return (
      <Screen subtitle="One-time setup: which shop is this device for?" title="Pick your shop">
        <Field
          autoCapitalize="none"
          label="Shop link name"
          onChangeText={setSlugInput}
          placeholder="e.g. demo-barber"
          value={slugInput}
        />
        <Button blueprint disabled={!slugInput.trim()} label="Open my shop" onPress={() => setOpsShopSlug(slugInput.trim())} />
        <View style={{ marginTop: space(3) }}>
          <Button kind="ghost" label="Sign out" onPress={() => setSession(null, null)} small />
        </View>
      </Screen>
    );
  }

  if (!dash) {
    return (
      <Screen title="Your shop">
        {error ? (
          <>
            <Note tone="danger">{error}</Note>
            <View style={{ marginTop: space(3) }}>
              <Button kind="secondary" label="Try a different shop" onPress={() => setOpsShopSlug(null)} small />
            </View>
          </>
        ) : (
          <Loading />
        )}
      </Screen>
    );
  }

  const waiting = dash.queueEntries;
  const inService = dash.inServiceVisits;
  const missed = dash.missedQueueEntries;
  const first = waiting[0];
  const firstCalled = Boolean(first?.calledAt);
  const totalMins = waiting.reduce(
    (sum, entry) => sum + (entry.visit.plannedDurationMin ?? dash.shop.defaultWalkInDurationMin),
    0
  );
  const estClear = fmtClear(Math.ceil(totalMins / Math.max(1, dash.shop.serviceStationsCount)));
  const maxHour = insights ? Math.max(1, ...insights.byHourToday.map((entry) => entry.count)) : 1;
  const weekDelta =
    insights && insights.servedLastWeek > 0
      ? Math.round(((insights.servedThisWeek - insights.servedLastWeek) / insights.servedLastWeek) * 100)
      : null;

  return (
    <Screen
      headerRight={<Tag label={dash.shop.queuePaused ? "PAUSED" : "OPEN · LIVE"} pulse={!dash.shop.queuePaused} tone={dash.shop.queuePaused ? "neutral" : "accent"} />}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      title={dash.shop.name}
    >
      <SegTabs
        onChange={(next) => {
          setOwnerTab(next);
          if (next === "shop" && accessToken && !profile) {
            api
              .opsShopProfile(accessToken, slug)
              .then((loaded) => {
                setProfile(loaded);
                setProfileDraft({
                  name: loaded.name ?? "",
                  publicDescription: loaded.publicDescription ?? "",
                  phone: loaded.phone ?? ""
                });
              })
              .catch((err) => {
                const message = err instanceof Error ? err.message : "Could not load shop profile.";
                setProfileError(
                  /forbidden|not allow|role|permission|403/i.test(message)
                    ? "Only the shop owner or manager can edit the shop profile and photos. Sign out on the Queue tab and sign in with the owner account."
                    : message
                );
              });
          }
        }}
        tab={ownerTab}
      />

      {ownerTab === "queue" ? (
        <>
          <View style={{ flexDirection: "row", gap: space(2.5), marginBottom: space(4) }}>
            <StatBox label="In queue" value={String(waiting.length)} />
            <StatBox label="Est. clear" value={estClear} />
            <StatBox label="Served today" value={insights ? String(insights.servedToday) : "—"} />
          </View>

          <Button
            blueprint
            disabled={!first || dash.shop.queuePaused}
            label={
              !first
                ? "Call next — queue empty"
                : firstCalled
                  ? `Start — ${first.visit.customer.firstName}`
                  : `Call next — ${first.visit.customer.firstName}`
            }
            loading={busy}
            onPress={() =>
              void act(() =>
                firstCalled
                  ? api.opsStartService(accessToken, slug, first.trackingToken)
                  : api.opsCall(accessToken, slug, first.trackingToken)
              )
            }
          />

          <View style={{ flexDirection: "row", gap: space(2.5), marginTop: space(3), marginBottom: space(3) }}>
            <View style={{ flex: 1 }}>
              <Button kind="secondary" label="+ Walk-in" onPress={() => setWalkInOpen((open) => !open)} small />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                kind="secondary"
                label={dash.shop.queuePaused ? "▶ Resume queue" : "⏸ Pause queue"}
                onPress={() =>
                  void act(() =>
                    dash.shop.queuePaused ? api.opsResumeQueue(accessToken, slug) : api.opsPauseQueue(accessToken, slug)
                  )
                }
                small
              />
            </View>
          </View>

          {walkInOpen ? (
            <Blueprint>
              <Text style={{ fontSize: 18, fontFamily: fonts.heading, color: colors.text, marginBottom: space(2) }}>
                Add walk-in
              </Text>
              <Field label="Name" onChangeText={setWalkInName} placeholder="Customer name" value={walkInName} />
              <View style={{ flexDirection: "row", gap: space(2.5) }}>
                <View style={{ flex: 1 }}>
                  <Button kind="secondary" label="Cancel" onPress={() => setWalkInOpen(false)} small />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    disabled={!walkInName.trim()}
                    label="Add to queue"
                    loading={busy}
                    onPress={() =>
                      void act(async () => {
                        await api.opsAddWalkIn(accessToken, slug, walkInName.trim());
                        setWalkInName("");
                        setWalkInOpen(false);
                      })
                    }
                    small
                  />
                </View>
              </View>
            </Blueprint>
          ) : null}

          {inService.map((visit) => {
            const started = minsAgo(visit.startedAt);
            const slot = visit.plannedDurationMin ?? dash.shop.defaultWalkInDurationMin;
            const overdue = started != null && slot > 0 && started > slot * 2;
            return (
              <Blueprint key={visit.id} style={{ backgroundColor: overdue ? "#FCEFDC" : colors.accent100 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5) }}>
                  <Tag label={overdue ? "Still going?" : "In chair"} pulse tone={overdue ? "neutral" : "accent"} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>
                      {visit.customer.firstName}
                    </Text>
                    <Text style={{ fontSize: 12, color: overdue ? "#A76607" : colors.neutral600, fontFamily: fonts.body }}>
                      {started != null ? `started ${started} min ago` : "in progress"}
                      {visit.plannedDurationMin ? ` · ${visit.plannedDurationMin} min slot` : ""}
                      {overdue ? " · tap Done or +10 min" : ""}
                    </Text>
                  </View>
                  <Button kind="ghost" label="+10 min" onPress={() => void act(() => api.opsExtendService(accessToken, slug, visit.id))} small />
                  <Button
                    kind="ghost"
                    label="Done"
                    onPress={() => setCompletingId(visit.id)}
                    small
                  />
                </View>
              </Blueprint>
            );
          })}

          {completingId != null ? (
          <OptionSheet
            footerLabel="Just done — no tag"
            onClose={() => setCompletingId(null)}
            onFooter={() => {
              const id = completingId;
              setCompletingId(null);
              if (id) void act(() => api.opsCompleteService(accessToken, slug, id));
            }}
            onPick={(tag) => {
              const id = completingId;
              setCompletingId(null);
              if (id) void act(() => api.opsCompleteService(accessToken, slug, id, tag));
            }}
            options={["Cut", "Shave", "Beard", "Colour", "Facial", "Other"]}
            title={`What did ${inService.find((v) => v.id === completingId)?.customer?.firstName ?? "they"} get?`}
          />
          ) : null}
          <View style={{ marginBottom: space(2) }}>
            <Kicker>Waiting</Kicker>
          </View>
          {waiting.length === 0 && inService.length === 0 ? (
            <Note center tone="faint">
              Queue is empty.
            </Note>
          ) : null}
          {waiting.map((entry, index) => {
            const called = Boolean(entry.calledAt);
            const source = entry.visit.source === "WALK_IN" ? "Walk-in" : "App";
            return (
              <Blueprint key={entry.id} style={{ paddingVertical: space(2.5) }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5) }}>
                  <Text style={{ width: 24, fontFamily: fonts.heading, fontSize: 18, color: colors.accent700 }}>
                    {index + 1}
                  </Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: space(2) }}>
                      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text }}>
                        {entry.visit.customer.firstName}
                      </Text>
                      <Tag label={source} tone={source === "App" ? "accent" : "neutral"} />
                      {entry.confirmationStatus === "COMING" ? <Tag label="On their way" tone="outline" /> : null}
                    </View>
                    <Text style={{ fontSize: 12, color: colors.neutral600, fontFamily: fonts.body }}>
                      {maskPhone(entry.visit.customer.phone)}
                    </Text>
                  </View>
                  {!called && waiting.length > 1 ? (
                    <View style={{ flexDirection: "row", gap: 2, marginRight: space(1) }}>
                      <Pressable
                        disabled={index === 0 || busy}
                        hitSlop={6}
                        onPress={() => void act(() => api.opsReorder(accessToken, slug, moveToken(waiting.map((w) => w.trackingToken), index, -1)))}
                        style={{ width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, opacity: index === 0 ? 0.35 : 1 }}
                      >
                        <Text style={{ color: colors.accent700, fontSize: 14, fontFamily: fonts.bodyBold }}>↑</Text>
                      </Pressable>
                      <Pressable
                        disabled={index === waiting.length - 1 || busy}
                        hitSlop={6}
                        onPress={() => void act(() => api.opsReorder(accessToken, slug, moveToken(waiting.map((w) => w.trackingToken), index, 1)))}
                        style={{ width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, opacity: index === waiting.length - 1 ? 0.35 : 1 }}
                      >
                        <Text style={{ color: colors.accent700, fontSize: 14, fontFamily: fonts.bodyBold }}>↓</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  {called ? (
                    <Button kind="ghost" label="No-show" onPress={() => void act(() => api.opsReleaseNoShow(accessToken, slug, entry.trackingToken))} small />
                  ) : index > 0 ? (
                    <Button kind="ghost" label="Call" onPress={() => void act(() => api.opsCall(accessToken, slug, entry.trackingToken))} small />
                  ) : null}
                </View>
              </Blueprint>
            );
          })}

          {missed.length > 0 ? (
            <>
              <View style={{ marginBottom: space(2), marginTop: space(2) }}>
                <Kicker>Missed turn</Kicker>
              </View>
              {missed.map((entry) => (
                <Blueprint key={entry.id} style={{ paddingVertical: space(2.5) }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.text }}>
                      {entry.visit.customer.firstName}
                    </Text>
                    <Button kind="ghost" label="Re-add" onPress={() => void act(() => api.opsReinstate(accessToken, slug, entry.trackingToken))} small />
                  </View>
                </Blueprint>
              ))}
            </>
          ) : null}
        </>
      ) : null}

      {ownerTab === "customers" ? (
        <>
          <View style={{ marginBottom: space(2) }}>
            <Kicker>Customer records</Kicker>
          </View>
          {!customers ? <Loading /> : null}
          {customers && customers.length === 0 ? (
            <Note center tone="faint">
              No completed visits yet — records build automatically as customers are served.
            </Note>
          ) : null}
          {customers && customers.length > 0 ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadowSoft }}>
              <View style={{ flexDirection: "row", paddingHorizontal: space(3), paddingVertical: space(2), borderBottomWidth: 1, borderBottomColor: colors.divider }}>
                <Text style={[thStyle, { flex: 1 }]}>Customer</Text>
                <Text style={[thStyle, { width: 50 }]}>Visits</Text>
                <Text style={[thStyle, { width: 90, textAlign: "right" }]}>Last visit</Text>
              </View>
              {customers.map((record) => (
                <View
                  key={record.customerId}
                  style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: space(3), paddingVertical: space(2.5), borderBottomWidth: 1, borderBottomColor: colors.dividerSoft }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text }}>{record.firstName}</Text>
                    <Text style={{ fontSize: 11, color: colors.neutral500, fontFamily: fonts.body }}>
                      {record.phoneMasked ?? "—"}
                    </Text>
                  </View>
                  <Text style={{ width: 50, fontSize: 14, color: colors.text, fontFamily: fonts.body }}>{record.visits}</Text>
                  <Text style={{ width: 90, textAlign: "right", fontSize: 12, color: colors.neutral600, fontFamily: fonts.body }}>
                    {relativeDay(record.lastVisitAt)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
          <View style={{ marginTop: space(2) }}>
            <Note tone="faint">Built automatically from queue joins — no data entry.</Note>
          </View>
        </>
      ) : null}

      {ownerTab === "earnings" ? (
        <>
          <Blueprint style={{ alignItems: "center", paddingVertical: space(4) }}>
            <Kicker>Served today</Kicker>
            <Text style={{ fontSize: 42, lineHeight: 46, fontFamily: fonts.heading, color: colors.accent700 }}>
              {insights ? insights.servedToday : "—"}
            </Text>
            <Text style={{ fontSize: 12, color: colors.neutral600, fontFamily: fonts.body }}>
              {insights && insights.servedToday > 0
                ? `${insights.walkInsToday} walk-ins · avg ${insights.avgDurationMin ?? "—"} min per customer`
                : "No customers served yet today"}
            </Text>
          </Blueprint>

          <View style={{ marginBottom: space(2) }}>
            <Kicker>Busiest hours</Kicker>
          </View>
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 5, height: 84, paddingHorizontal: 2, marginBottom: space(4) }}>
            {(insights?.byHourToday ?? []).map((entry) => {
              const pct = entry.count / maxHour;
              const peak = insights != null && entry.count > 0 && entry.count === maxHour;
              return (
                <View key={entry.hour} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 3 }}>
                  <View
                    style={{
                      width: "100%",
                      height: Math.max(3, Math.round(pct * 64)),
                      backgroundColor: peak ? colors.accent : colors.accent200,
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4
                    }}
                  />
                  <Text style={{ fontSize: 8.5, color: colors.neutral500, fontFamily: fonts.body }}>{hourLabel(entry.hour)}</Text>
                </View>
              );
            })}
          </View>

          <Blueprint>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
              <View>
                <Kicker>This week</Kicker>
                <Text style={{ fontSize: 20, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>
                  {insights ? `${insights.servedThisWeek} served` : "—"}
                </Text>
              </View>
              {weekDelta != null ? (
                <Tag label={`${weekDelta >= 0 ? "▲" : "▼"} ${Math.abs(weekDelta)}% vs last week`} tone={weekDelta >= 0 ? "accent" : "neutral"} />
              ) : null}
            </View>
          </Blueprint>
          <Note tone="faint">Revenue tracking arrives with pricing — for now this counts served customers.</Note>
        </>
      ) : null}

      {ownerTab === "shop" ? (
        !profile || !profileDraft ? (
          profileError ? (
            <Note tone="danger">{profileError}</Note>
          ) : (
            <Loading />
          )
        ) : (
          <>
            <View style={{ marginBottom: space(2) }}>
              <Kicker>Shop profile</Kicker>
            </View>
            <Blueprint>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space(4) }}>
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: radius.lg,
                    backgroundColor: colors.accent100,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}
                >
                  {profile.logoImageUrl ? (
                    <Image source={{ uri: profile.logoImageUrl }} style={{ width: 64, height: 64 }} />
                  ) : (
                    <Text style={{ fontFamily: fonts.heading, fontSize: 24, color: colors.accent700 }}>
                      {(profileDraft.name || "?").slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text }}>Shop logo</Text>
                  <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.neutral600, marginBottom: space(1.5) }}>
                    Shown on the map and your page.
                  </Text>
                  <Button
                    kind="secondary"
                    label={profile.logoImageUrl ? "Change logo" : "Upload logo"}
                    onPress={() => {
                      void (async () => {
                        const image = await pickSquareImage();
                        if (!image || !accessToken) return;
                        setProfileBusy(true);
                        try {
                          const updated = await api.opsUpdateShopProfile(accessToken, slug, { logoImageUrl: image });
                          setProfile(updated);
                          setProfileNote("Logo updated.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not upload logo.");
                        } finally {
                          setProfileBusy(false);
                        }
                      })();
                    }}
                    small
                  />
                </View>
              </View>
            </Blueprint>

            <Blueprint style={{ marginBottom: space(3) }}>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text }}>Shop photos</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.neutral600, marginBottom: space(2) }}>
                Inside, outside, your best work — customers see these on your page. Up to 6.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(2) }}>
                {(profile.photos ?? []).map((photo) => (
                  <Pressable
                    key={photo.id}
                    onPress={() => {
                      Alert.alert("Remove photo?", "Customers will no longer see it.", [
                        { text: "Keep", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => {
                            void (async () => {
                              if (!accessToken) return;
                              try {
                                await api.opsRemoveShopPhoto(accessToken, slug, photo.id);
                                setProfile({ ...profile, photos: (profile.photos ?? []).filter((entry) => entry.id !== photo.id) });
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Could not remove photo.");
                              }
                            })();
                          }
                        }
                      ]);
                    }}
                    style={{ width: 92, height: 92, borderRadius: radius.md, overflow: "hidden", backgroundColor: colors.surfaceAlt }}
                  >
                    <Image source={{ uri: photo.url }} style={{ width: 92, height: 92 }} />
                  </Pressable>
                ))}
                {profileBusy ? (
                  <View
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: radius.md,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.surfaceAlt
                    }}
                  >
                    <ActivityIndicator color={colors.accent700} />
                  </View>
                ) : null}
                {(profile.photos ?? []).length < 6 ? (
                  <Pressable
                    disabled={profileBusy}
                    onPress={() => {
                      void (async () => {
                        const image = await pickPhoto();
                        if (!image || !accessToken) return;
                        setProfileBusy(true);
                        try {
                          const added = await api.opsAddShopPhoto(accessToken, slug, image);
                          setProfile({ ...profile, photos: [...(profile.photos ?? []), added] });
                          setProfileNote("Photo added.");
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Could not add photo.");
                        } finally {
                          setProfileBusy(false);
                        }
                      })();
                    }}
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: radius.md,
                      borderWidth: 1.5,
                      borderStyle: "dashed",
                      borderColor: colors.accent200,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: colors.accent100
                    }}
                  >
                    <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: colors.accent700 }}>+</Text>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.accent700 }}>Add photo</Text>
                  </Pressable>
                ) : null}
              </View>
            </Blueprint>

            <Field label="Shop name" onChangeText={(next) => setProfileDraft({ ...profileDraft, name: next })} value={profileDraft.name} />
            <Field
              label="Short description"
              onChangeText={(next) => setProfileDraft({ ...profileDraft, publicDescription: next })}
              placeholder="What customers should know"
              value={profileDraft.publicDescription}
            />
            <Field
              autoCapitalize="none"
              keyboardType="phone-pad"
              label="Shop phone"
              onChangeText={(next) => setProfileDraft({ ...profileDraft, phone: next })}
              placeholder="Customers call this number"
              value={profileDraft.phone}
            />

            {([
              { label: "Chairs / stations", key: "serviceStationsCount" as const, min: 1, max: 50, step: 1 },
              { label: "Minutes per customer", key: "defaultWalkInDurationMin" as const, min: 5, max: 240, step: 5 }
            ]).map((row) => (
              <Blueprint key={row.key} style={{ paddingVertical: space(2.5) }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 14, color: colors.text }}>{row.label}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
                    {[-row.step, row.step].map((delta, i) => (
                      <React.Fragment key={delta}>
                        {i === 1 ? (
                          <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.text, minWidth: 34, textAlign: "center" }}>
                            {profile[row.key]}
                          </Text>
                        ) : null}
                        <Pressable
                          disabled={profileBusy}
                          onPress={() => {
                            if (!accessToken) return;
                            const next = Math.max(row.min, Math.min(row.max, profile[row.key] + delta));
                            if (next === profile[row.key]) return;
                            setProfileBusy(true);
                            api
                              .opsUpdateShopProfile(accessToken, slug, { [row.key]: next })
                              .then(setProfile)
                              .catch((err) => setError(err instanceof Error ? err.message : "Could not save."))
                              .finally(() => setProfileBusy(false));
                          }}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: radius.full,
                            backgroundColor: colors.surfaceAlt,
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Text style={{ fontFamily: fonts.heading, fontSize: 17, color: colors.accent700 }}>
                            {delta > 0 ? "+" : "−"}
                          </Text>
                        </Pressable>
                      </React.Fragment>
                    ))}
                  </View>
                </View>
              </Blueprint>
            ))}

            {profileNote ? <Note tone="faint">{profileNote}</Note> : null}
            <Button
              label="Save changes"
              loading={profileBusy}
              onPress={() => {
                if (!accessToken) return;
                setProfileBusy(true);
                setProfileNote(null);
                api
                  .opsUpdateShopProfile(accessToken, slug, {
                    name: profileDraft.name.trim(),
                    publicDescription: profileDraft.publicDescription.trim() || null,
                    phone: profileDraft.phone.trim() || null
                  })
                  .then((updated) => {
                    setProfile(updated);
                    setProfileNote("Saved. Customers see this immediately.");
                  })
                  .catch((err) => setError(err instanceof Error ? err.message : "Could not save."))
                  .finally(() => setProfileBusy(false));
              }}
            />

            <View style={{ marginTop: space(6), marginBottom: space(2) }}>
              <Kicker>Danger zone</Kicker>
            </View>
            <Note tone="faint">
              Closing hides your shop from customers and stops the queue. Your history stays; an admin can re-open you later.
            </Note>
            <Button
              kind="ghost"
              label="Close this shop"
              onPress={() => {
                Alert.alert("Close this shop?", "Customers will no longer see it or join your queue.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Close shop",
                    style: "destructive",
                    onPress: () => {
                      if (!accessToken) return;
                      api
                        .opsArchiveShop(accessToken, slug)
                        .then(() => {
                          setOpsShopSlug(null);
                          setDash(null);
                        })
                        .catch((err) => setError(err instanceof Error ? err.message : "Could not close the shop."));
                    }
                  }
                ]);
              }}
            />
          </>
        )
      ) : null}

      {error ? (
        <View style={{ marginTop: space(3) }}>
          <Note tone="danger">{error}</Note>
        </View>
      ) : null}

      <View style={{ marginTop: space(6) }}>
        <Button
          kind="secondary"
          label="Print QR counter sign"
          onPress={() => void Linking.openURL(`${WEB_BASE_URL}/ops/shops/${slug}/qr`)}
          small
        />
        <View style={{ height: space(2) }} />
        <Note center tone="faint">
          Signed in as {user?.firstName ?? "staff"}
        </Note>
        <Button kind="ghost" label="Sign out" onPress={() => setSession(null, null)} small />
      </View>
    </Screen>
  );
}

const thStyle = {
  fontSize: 10,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
  color: colors.neutral600,
  fontFamily: fonts.bodyMedium
};
