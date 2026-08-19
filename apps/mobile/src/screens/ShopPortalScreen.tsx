import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api, type OpsDashboard, type ShopCustomerRecord, type ShopInsights } from "../api";
import { useStore } from "../store";
import { colors, fonts, space } from "../theme";
import { Blueprint, Button, Field, Kicker, Loading, Note, Screen, Tag } from "../ui";

type OwnerTab = "queue" | "customers" | "earnings";

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
    { key: "earnings", label: "Earnings" }
  ];
  return (
    <View style={{ flexDirection: "row", borderWidth: 1, borderColor: colors.divider, marginBottom: space(4) }}>
      {items.map((item, index) => {
        const active = tab === item.key;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={{
              flex: 1,
              paddingVertical: space(2),
              alignItems: "center",
              backgroundColor: active ? colors.accent : "transparent",
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: colors.divider
            }}
          >
            <Text
              style={{
                fontSize: 11,
                letterSpacing: 1,
                textTransform: "uppercase",
                fontFamily: fonts.heading,
                color: active ? colors.bg : colors.neutral600
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

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
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
      setError(err instanceof Error ? err.message : "Could not load the queue.");
    }
  }, [accessToken, slug]);

  useEffect(() => {
    if (!accessToken || !slug) return;
    void load();
    const timer = setInterval(() => void load(), 6000);
    return () => clearInterval(timer);
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

  if (!accessToken) {
    return (
      <Screen subtitle="For salon owners and staff. Customers don't need an account." title="Shop sign in">
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setIdentifier}
          placeholder="owner@yourshop.com"
          value={identifier}
        />
        <Field label="Password" onChangeText={setPassword} secureTextEntry value={password} />
        {error ? (
          <View style={{ marginBottom: space(3) }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}
        <Button blueprint disabled={!identifier.trim() || !password} label="Sign in" loading={busy} onPress={() => void signIn()} />
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
      <SegTabs onChange={setOwnerTab} tab={ownerTab} />

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
            return (
              <Blueprint key={visit.id} style={{ backgroundColor: colors.accent100 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5) }}>
                  <Tag label="In chair" pulse tone="accent" />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>
                      {visit.customer.firstName}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.neutral600, fontFamily: fonts.body }}>
                      {started != null ? `started ${started} min ago` : "in progress"}
                      {visit.plannedDurationMin ? ` · ${visit.plannedDurationMin} min slot` : ""}
                    </Text>
                  </View>
                  <Button kind="ghost" label="+10 min" onPress={() => void act(() => api.opsExtendService(accessToken, slug, visit.id))} small />
                  <Button kind="ghost" label="Done" onPress={() => void act(() => api.opsCompleteService(accessToken, slug, visit.id))} small />
                </View>
              </Blueprint>
            );
          })}

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
            <View style={{ borderWidth: 1, borderColor: colors.divider }}>
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
                      height: Math.max(2, Math.round(pct * 64)),
                      backgroundColor: peak ? colors.accent : colors.accent200,
                      borderWidth: 1,
                      borderColor: colors.divider
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

      {error ? (
        <View style={{ marginTop: space(3) }}>
          <Note tone="danger">{error}</Note>
        </View>
      ) : null}

      <View style={{ marginTop: space(6) }}>
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
