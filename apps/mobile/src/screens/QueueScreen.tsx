import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api, type QueueStatus } from "../api";
import { useStore } from "../store";
import { colors, fonts, space } from "../theme";
import { Blueprint, Button, EmptyState, Kicker, Loading, Note, Screen, Tag } from "../ui";

const DONE_STATES = new Set(["COMPLETED", "CANCELLED", "MISSED", "NO_SHOW"]);

function fmtTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function Stars({ onRate, rated }: { onRate: (n: number) => void; rated: number | null }) {
  return (
    <View style={{ flexDirection: "row", gap: space(2), justifyContent: "center", marginVertical: space(2) }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable hitSlop={8} key={n} onPress={() => onRate(n)}>
          <Text style={{ fontSize: 32, color: colors.accent700 }}>{rated != null && n <= rated ? "★" : "☆"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function QueueScreen({ onFindSalon }: { onFindSalon: () => void }) {
  const { trackingToken, setTrackingToken } = useStore();
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!trackingToken) return;
    try {
      setError(null);
      setStatus(await api.queueStatus(trackingToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your queue place.");
    }
  }, [trackingToken]);

  useEffect(() => {
    setStatus(null);
    setRated(null);
    if (!trackingToken) return;
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [trackingToken, load]);

  async function respond(response: "COMING" | "DECLINED") {
    if (!trackingToken) return;
    setBusy(true);
    try {
      setStatus(await api.respondArrival(trackingToken, response));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your answer.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!trackingToken) return;
    setBusy(true);
    try {
      await api.leaveQueue(trackingToken);
      setTrackingToken(null);
    } catch {
      setTrackingToken(null);
    } finally {
      setBusy(false);
    }
  }

  async function rate(n: number) {
    if (!trackingToken) return;
    setRated(n);
    try {
      await api.sendFeedback(trackingToken, n);
    } catch {
      // rating is best-effort
    }
  }

  if (!trackingToken) {
    return (
      <Screen subtitle="Join a salon queue and your live place shows here." title="My queue">
        <EmptyState
          actionLabel="Find a salon"
          message="You're not waiting anywhere right now."
          onAction={onFindSalon}
          title="No queue yet"
        />
      </Screen>
    );
  }

  if (!status) {
    return <Screen title="My queue">{error ? <Note tone="danger">{error}</Note> : <Loading />}</Screen>;
  }

  const askConfirm = status.confirmationStatus === "PENDING" && status.confirmationRequestedAt;
  const state = status.visitStatus;
  const estMin = status.estimatedWaitMin;
  const slotTime = estMin != null ? fmtTime(new Date(Date.now() + estMin * 60000)) : null;
  const ahead = status.position != null ? status.position - 1 : null;

  return (
    <Screen
      headerRight={<Tag label="LIVE" pulse tone="accent" />}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      title={status.shop.name}
    >
      {state === "QUEUED" && !askConfirm ? (
        <>
          <Blueprint style={{ alignItems: "center", paddingVertical: space(6), gap: 2 }}>
            <Kicker>Your position</Kicker>
            <Text style={{ fontSize: 72, lineHeight: 76, fontFamily: fonts.heading, color: colors.accent700 }}>
              {status.position ?? "…"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.neutral600, fontFamily: fonts.body }}>
              {ahead === 0
                ? "You're next"
                : ahead === 1
                  ? "1 person ahead of you"
                  : ahead != null
                    ? `${ahead} people ahead of you`
                    : "finding your place…"}
            </Text>
          </Blueprint>
          <View style={{ flexDirection: "row", gap: space(3) }}>
            <Blueprint style={{ flex: 1 }}>
              <Kicker>Est. wait</Kicker>
              <Text style={{ fontSize: 22, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>
                {estMin != null ? `${estMin} min` : "—"}
              </Text>
            </Blueprint>
            <Blueprint style={{ flex: 1 }}>
              <Kicker>Your slot at</Kicker>
              <Text style={{ fontSize: 22, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>
                {slotTime ?? "—"}
              </Text>
            </Blueprint>
          </View>
          <Note>Relax — we'll ask you to confirm here when it's nearly your turn.</Note>
          <View style={{ marginTop: space(4) }}>
            <Button kind="secondary" label="Leave queue" loading={busy} onPress={() => void leave()} />
          </View>
        </>
      ) : null}

      {(state === "QUEUED" || state === "CONFIRMATION_PENDING") && askConfirm ? (
        <Blueprint style={{ backgroundColor: colors.accent, paddingVertical: space(6), gap: space(3) }}>
          <Text style={{ fontSize: 26, fontFamily: fonts.heading, color: colors.bg, textAlign: "center" }}>
            It's nearly your turn. Are you coming?
          </Text>
          <Button kind="secondary" label="Yes, on my way" loading={busy} onPress={() => void respond("COMING")} />
          <Button kind="ghost" label="No, remove me" loading={busy} onPress={() => void respond("DECLINED")} />
        </Blueprint>
      ) : null}

      {(state === "CALLED" || state === "READY" || state === "CONFIRMATION_PENDING") && !askConfirm ? (
        <Blueprint style={{ backgroundColor: colors.accent, paddingVertical: space(6), alignItems: "center", gap: space(1) }}>
          <Text style={{ fontSize: 28, fontFamily: fonts.heading, color: colors.bg }}>It's your turn</Text>
          <Text style={{ fontSize: 13, color: colors.bg, opacity: 0.85, fontFamily: fonts.body }}>
            {status.shop.name} is ready for {status.customer.firstName}
          </Text>
        </Blueprint>
      ) : null}

      {state === "IN_SERVICE" ? (
        <Blueprint style={{ paddingVertical: space(6), alignItems: "center", gap: space(1) }}>
          <Text style={{ fontSize: 26, fontFamily: fonts.heading, color: colors.text }}>You're in the chair</Text>
          <Note center>Enjoy. This page wraps up when you're done.</Note>
        </Blueprint>
      ) : null}

      {state === "COMPLETED" ? (
        <Blueprint style={{ paddingVertical: space(5), gap: space(2) }}>
          <Text style={{ fontSize: 24, fontFamily: fonts.heading, color: colors.text, textAlign: "center" }}>
            All done — thanks!
          </Text>
          {!status.feedbackSubmitted ? (
            <>
              <Note center>How was it?</Note>
              <Stars onRate={(n) => void rate(n)} rated={rated} />
            </>
          ) : null}
          <Button label="Finish" onPress={() => setTrackingToken(null)} />
        </Blueprint>
      ) : null}

      {DONE_STATES.has(state) && state !== "COMPLETED" ? (
        <Blueprint style={{ paddingVertical: space(5), gap: space(3) }}>
          <Text style={{ fontSize: 22, fontFamily: fonts.heading, color: colors.text, textAlign: "center" }}>
            {state === "MISSED" || state === "NO_SHOW" ? "You missed your turn" : "You left the queue"}
          </Text>
          <Note center>No problem — you can join again any time.</Note>
          <Button
            label="Find a salon"
            onPress={() => {
              setTrackingToken(null);
              onFindSalon();
            }}
          />
        </Blueprint>
      ) : null}

      {!DONE_STATES.has(state) ? (
        <View style={{ marginTop: space(4) }}>
          <Note center tone="faint">
            {status.customer.firstName} · updates automatically
          </Note>
        </View>
      ) : null}

      {error ? <Note tone="danger">{error}</Note> : null}
    </Screen>
  );
}
