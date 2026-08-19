import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { api, type OpsDashboard, type OpsQueueEntry } from "../api";
import { useStore } from "../store";
import { colors, radius, space } from "../theme";
import { Body, Button, Card, Eyebrow, Field, Pill, Row, StatBlock, Title } from "../ui";

const POLL_MS = 5000;

function entryStatusPill(entry: OpsQueueEntry) {
  switch (entry.visit.status) {
    case "CONFIRMATION_PENDING":
      return <Pill label="Asked: coming?" tone="warn" />;
    case "CALLED":
    case "READY":
      return <Pill label="Called" tone="accent" />;
    default:
      return entry.visit.source === "WALK_IN" ? (
        <Pill label="Walk-in" tone="neutral" />
      ) : (
        <Pill label="Remote" tone="neutral" />
      );
  }
}

export function ShopPortalScreen() {
  const { accessToken, user, setSession, opsShopSlug, setOpsShopSlug } = useStore();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [slugInput, setSlugInput] = useState(opsShopSlug ?? "");
  const [dashboard, setDashboard] = useState<OpsDashboard | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [walkInName, setWalkInName] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!accessToken || !opsShopSlug) return;
    try {
      const item = await api.opsDashboard(accessToken, opsShopSlug);
      setDashboard(item);
      setDashError(null);
    } catch (e) {
      setDashError(e instanceof Error ? e.message : "Could not load the dashboard.");
    }
  }, [accessToken, opsShopSlug]);

  useEffect(() => {
    if (!accessToken || !opsShopSlug) return;
    void loadDashboard();
    timerRef.current = setInterval(() => void loadDashboard(), POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [accessToken, opsShopSlug, loadDashboard]);

  async function signIn() {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const result = await api.login(identifier.trim(), password);
      setSession(result.tokens.accessToken, result.user);
      const staffShop = result.user.staffProfiles[0]?.businessLocation.slug;
      if (staffShop) {
        setOpsShopSlug(staffShop);
        setSlugInput(staffShop);
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Sign-in failed.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function act(name: string, run: () => Promise<unknown>) {
    setBusyAction(name);
    try {
      await run();
      await loadDashboard();
    } catch (e) {
      setDashError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  // ---------- Signed out ----------
  if (!accessToken || !user) {
    return (
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <Card dark>
          <Eyebrow text="Shop portal" onDark />
          <Title onDark size={26} text="Run the floor from your pocket." />
          <Body
            onDark
            text="Sign in with your Q-App owner or staff account to see the live queue and keep it moving."
          />
        </Card>
        <Card>
          <Field
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            label="Email or phone"
            onChangeText={setIdentifier}
            placeholder="owner@yourshop.com"
            value={identifier}
          />
          <Field
            label="Password"
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            value={password}
          />
          {authError ? <Body style={{ color: colors.danger }} text={authError} /> : null}
          <Button busy={authBusy} label="Sign in" onPress={() => void signIn()} />
        </Card>
      </ScrollView>
    );
  }

  // ---------- Signed in, no shop chosen ----------
  if (!opsShopSlug) {
    return (
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <Card>
          <Eyebrow text={`Hi ${user.firstName}`} />
          <Title size={20} text="Which shop are you running?" />
          {user.staffProfiles.length > 0 ? (
            user.staffProfiles.map((profile) => (
              <Button
                key={profile.id}
                label={profile.businessLocation.name}
                onPress={() => setOpsShopSlug(profile.businessLocation.slug)}
                variant="secondary"
              />
            ))
          ) : (
            <>
              <Body text="Enter your shop's link name (the slug from your shop URL)." />
              <Field
                autoCapitalize="none"
                label="Shop slug"
                onChangeText={setSlugInput}
                placeholder="your-shop-name"
                value={slugInput}
              />
              <Button
                disabled={!slugInput.trim()}
                label="Open dashboard"
                onPress={() => setOpsShopSlug(slugInput.trim())}
              />
            </>
          )}
          <Button label="Sign out" onPress={() => setSession(null, null)} variant="ghost" />
        </Card>
      </ScrollView>
    );
  }

  // ---------- Dashboard ----------
  const waiting = dashboard?.queueEntries ?? [];
  const inService = dashboard?.inServiceVisits ?? [];
  const missed = dashboard?.missedQueueEntries ?? [];

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Card dark style={{ gap: space(4) }}>
        <Row style={{ justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <Eyebrow onDark text="Live dashboard" />
            <Title onDark size={22} text={dashboard?.shop.name ?? opsShopSlug} />
          </View>
          {dashboard?.shop.queuePaused ? <Pill label="Paused" tone="warn" /> : <Pill label="Open" tone="good" />}
        </Row>
        <Row style={{ gap: space(6) }}>
          <StatBlock label="Waiting" onDark value={`${waiting.length}`} />
          <StatBlock label="In service" onDark value={`${inService.length}`} />
          <StatBlock label="Stations" onDark value={`${dashboard?.shop.serviceStationsCount ?? "-"}`} />
        </Row>
        <Row>
          {dashboard?.shop.queuePaused ? (
            <Button
              busy={busyAction === "resume"}
              label="Resume queue"
              onPress={() => void act("resume", () => api.opsResumeQueue(accessToken, opsShopSlug))}
              variant="darkGhost"
            />
          ) : (
            <Button
              busy={busyAction === "pause"}
              label="Pause queue"
              onPress={() => void act("pause", () => api.opsPauseQueue(accessToken, opsShopSlug))}
              variant="darkGhost"
            />
          )}
          <Button
            label="Switch shop"
            onPress={() => {
              setDashboard(null);
              setOpsShopSlug(null);
            }}
            variant="darkGhost"
          />
        </Row>
      </Card>

      {dashError ? <Body style={{ color: colors.danger }} text={dashError} /> : null}

      <Card>
        <Eyebrow text="Add a walk-in" />
        <Row>
          <View style={{ flex: 1 }}>
            <Field
              autoCapitalize="words"
              label="Customer name"
              onChangeText={setWalkInName}
              placeholder="Walk-in customer"
              value={walkInName}
            />
          </View>
          <Button
            busy={busyAction === "walkin"}
            disabled={!walkInName.trim()}
            label="Add"
            onPress={() =>
              void act("walkin", async () => {
                await api.opsAddWalkIn(accessToken, opsShopSlug, walkInName.trim());
                setWalkInName("");
              })
            }
            style={{ marginTop: space(6) }}
          />
        </Row>
      </Card>

      <Card>
        <Eyebrow text={`Queue (${waiting.length})`} />
        {waiting.length === 0 ? <Body text="No one is waiting right now." /> : null}
        {waiting.map((entry, index) => (
          <View key={entry.id} style={styles.entryRow}>
            <Row style={{ justifyContent: "space-between" }}>
              <Row>
                <Text style={styles.entryPosition}>{index + 1}</Text>
                <View>
                  <Text style={styles.entryName}>{entry.visit.customer.firstName}</Text>
                  <Text style={styles.entryMeta}>
                    joined {new Date(entry.joinedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              </Row>
              {entryStatusPill(entry)}
            </Row>
            <Row>
              {entry.visit.status === "QUEUED" ? (
                <Button
                  busy={busyAction === `call-${entry.id}`}
                  label="Call"
                  onPress={() =>
                    void act(`call-${entry.id}`, () =>
                      api.opsCall(accessToken, opsShopSlug, entry.trackingToken)
                    )
                  }
                  style={styles.rowButton}
                />
              ) : null}
              {entry.visit.status === "CONFIRMATION_PENDING" ||
              entry.visit.status === "CALLED" ||
              entry.visit.status === "READY" ? (
                <>
                  <Button
                    busy={busyAction === `start-${entry.id}`}
                    label="Start service"
                    onPress={() =>
                      void act(`start-${entry.id}`, () =>
                        api.opsStartService(accessToken, opsShopSlug, entry.trackingToken)
                      )
                    }
                    style={styles.rowButton}
                  />
                  <Button
                    busy={busyAction === `noshow-${entry.id}`}
                    label="No-show"
                    onPress={() =>
                      void act(`noshow-${entry.id}`, () =>
                        api.opsReleaseNoShow(accessToken, opsShopSlug, entry.trackingToken)
                      )
                    }
                    style={styles.rowButton}
                    variant="secondary"
                  />
                </>
              ) : null}
            </Row>
          </View>
        ))}
      </Card>

      <Card>
        <Eyebrow text={`In service (${inService.length})`} />
        {inService.length === 0 ? <Body text="No one is in a chair right now." /> : null}
        {inService.map((visit) => (
          <View key={visit.id} style={styles.entryRow}>
            <Row style={{ justifyContent: "space-between" }}>
              <View>
                <Text style={styles.entryName}>{visit.customer.firstName}</Text>
                <Text style={styles.entryMeta}>
                  {visit.startedAt
                    ? `started ${new Date(visit.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "in service"}
                </Text>
              </View>
              <Button
                busy={busyAction === `complete-${visit.id}`}
                label="Complete"
                onPress={() =>
                  void act(`complete-${visit.id}`, () =>
                    api.opsCompleteService(accessToken, opsShopSlug, visit.id)
                  )
                }
                style={styles.rowButton}
              />
            </Row>
          </View>
        ))}
      </Card>

      {missed.length > 0 ? (
        <Card>
          <Eyebrow text="Recently missed" />
          {missed.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <Row style={{ justifyContent: "space-between" }}>
                <Text style={styles.entryName}>{entry.visit.customer.firstName}</Text>
                <Button
                  busy={busyAction === `reinstate-${entry.id}`}
                  label="Reinstate"
                  onPress={() =>
                    void act(`reinstate-${entry.id}`, () =>
                      api.opsReinstate(accessToken, opsShopSlug, entry.trackingToken)
                    )
                  }
                  style={styles.rowButton}
                  variant="secondary"
                />
              </Row>
            </View>
          ))}
        </Card>
      ) : null}

      <Button label="Sign out" onPress={() => setSession(null, null)} variant="ghost" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg
  },
  content: {
    padding: space(5),
    paddingBottom: space(24),
    gap: space(4)
  },
  entryRow: {
    gap: space(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space(3)
  },
  entryPosition: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.bgElevated,
    textAlign: "center",
    lineHeight: 34,
    fontWeight: "800",
    color: colors.ink,
    overflow: "hidden"
  },
  entryName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink
  },
  entryMeta: {
    fontSize: 12,
    color: colors.muted
  },
  rowButton: {
    minHeight: 40,
    paddingVertical: space(2),
    paddingHorizontal: space(4)
  }
});
