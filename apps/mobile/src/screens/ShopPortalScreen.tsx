import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { api, type OpsDashboard } from "../api";
import { useStore } from "../store";
import { colors, space } from "../theme";
import { Blueprint, Button, Field, Loading, Note, Screen, Tag } from "../ui";

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

export function ShopPortalScreen() {
  const { accessToken, user, setSession, opsShopSlug, setOpsShopSlug } = useStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dash, setDash] = useState<OpsDashboard | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const slug = opsShopSlug;

  const load = useCallback(async () => {
    if (!accessToken || !slug) return;
    try {
      setError(null);
      setDash(await api.opsDashboard(accessToken, slug));
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
        <Blueprint>
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
          <Button disabled={!identifier.trim() || !password} label="Sign in" loading={busy} onPress={() => void signIn()} />
        </Blueprint>
      </Screen>
    );
  }

  if (!slug) {
    return (
      <Screen subtitle="One-time setup: which shop is this device for?" title="Pick your shop">
        <Blueprint>
          <Field
            autoCapitalize="none"
            label="Shop link name"
            onChangeText={setSlugInput}
            placeholder="e.g. demo-barber"
            value={slugInput}
          />
          <Button disabled={!slugInput.trim()} label="Open my shop" onPress={() => setOpsShopSlug(slugInput.trim())} />
        </Blueprint>
        <Button kind="ghost" label="Sign out" onPress={() => setSession(null, null)} small />
      </Screen>
    );
  }

  if (!dash) {
    return (
      <Screen title="Your queue">
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

  return (
    <Screen
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      subtitle={`Signed in as ${user?.firstName ?? "staff"}`}
      title={dash.shop.name}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space(3) }}>
        <Tag label={dash.shop.queuePaused ? "Queue paused" : "Queue open"} pulse={!dash.shop.queuePaused} tone={dash.shop.queuePaused ? "neutral" : "accent"} />
        <Button
          kind="secondary"
          label={dash.shop.queuePaused ? "Resume queue" : "Pause queue"}
          loading={busy}
          onPress={() =>
            void act(() =>
              dash.shop.queuePaused
                ? api.opsResumeQueue(accessToken, slug)
                : api.opsPauseQueue(accessToken, slug)
            )
          }
          small
        />
      </View>

      {inService.length > 0 ? (
        <>
          <Text style={sectionStyle}>In the chair</Text>
          {inService.map((visit) => (
            <Blueprint key={visit.id}>
              <View style={rowStyle}>
                <View>
                  <Text style={nameStyle}>{visit.customer.firstName}</Text>
                  {visit.startedAt ? <Text style={metaStyle}>started {timeAgo(visit.startedAt)}</Text> : null}
                </View>
                <Button
                  label="Done"
                  loading={busy}
                  onPress={() => void act(() => api.opsCompleteService(accessToken, slug, visit.id))}
                  small
                />
              </View>
            </Blueprint>
          ))}
        </>
      ) : null}

      <Text style={sectionStyle}>Waiting ({waiting.length})</Text>
      {waiting.length === 0 ? <Note>No one is waiting right now.</Note> : null}
      {waiting.map((entry) => {
        const called = Boolean(entry.calledAt);
        return (
          <Blueprint key={entry.id}>
            <View style={rowStyle}>
              <View style={{ flex: 1 }}>
                <Text style={nameStyle}>{entry.visit.customer.firstName}</Text>
                <Text style={metaStyle}>
                  joined {timeAgo(entry.joinedAt)}
                  {called ? " · called" : ""}
                  {entry.confirmationStatus === "COMING" ? " · on their way" : ""}
                </Text>
              </View>
              {called ? (
                <View style={{ gap: space(2) }}>
                  <Button
                    label="Start"
                    loading={busy}
                    onPress={() => void act(() => api.opsStartService(accessToken, slug, entry.trackingToken))}
                    small
                  />
                  <Button
                    kind="secondary"
                    label="No-show"
                    loading={busy}
                    onPress={() => void act(() => api.opsReleaseNoShow(accessToken, slug, entry.trackingToken))}
                    small
                  />
                </View>
              ) : (
                <Button
                  label="Call"
                  loading={busy}
                  onPress={() => void act(() => api.opsCall(accessToken, slug, entry.trackingToken))}
                  small
                />
              )}
            </View>
          </Blueprint>
        );
      })}

      <Text style={sectionStyle}>Add a walk-in</Text>
      <Blueprint>
        <Field label="Customer first name" onChangeText={setWalkInName} placeholder="e.g. Alex" value={walkInName} />
        <Button
          disabled={!walkInName.trim()}
          kind="secondary"
          label="Add to queue"
          loading={busy}
          onPress={() =>
            void act(async () => {
              await api.opsAddWalkIn(accessToken, slug, walkInName.trim());
              setWalkInName("");
            })
          }
        />
      </Blueprint>

      {missed.length > 0 ? (
        <>
          <Text style={sectionStyle}>Missed turn</Text>
          {missed.map((entry) => (
            <Blueprint key={entry.id}>
              <View style={rowStyle}>
                <Text style={nameStyle}>{entry.visit.customer.firstName}</Text>
                <Button
                  kind="secondary"
                  label="Re-add"
                  loading={busy}
                  onPress={() => void act(() => api.opsReinstate(accessToken, slug, entry.trackingToken))}
                  small
                />
              </View>
            </Blueprint>
          ))}
        </>
      ) : null}

      {error ? <Note tone="danger">{error}</Note> : null}

      <View style={{ marginTop: space(6) }}>
        <Button kind="ghost" label="Sign out" onPress={() => setSession(null, null)} small />
      </View>
    </Screen>
  );
}

const sectionStyle = {
  fontSize: 14,
  fontWeight: "700" as const,
  color: colors.muted,
  textTransform: "uppercase" as const,
  letterSpacing: 0.6,
  marginTop: space(4),
  marginBottom: space(2)
};

const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  gap: space(3)
};

const nameStyle = { fontSize: 17, fontWeight: "700" as const, color: colors.ink };
const metaStyle = { fontSize: 13, color: colors.muted, marginTop: 2 };
