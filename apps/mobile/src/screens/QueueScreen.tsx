import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api, type QueueStatus } from "../api";
import { useStore } from "../store";
import { colors, space } from "../theme";
import { BigStat, Button, Card, EmptyState, Loading, Note, Screen } from "../ui";

const DONE_STATES = new Set(["COMPLETED", "CANCELLED", "MISSED", "NO_SHOW"]);

function Stars({ onRate, rated }: { onRate: (n: number) => void; rated: number | null }) {
  return (
    <View style={{ flexDirection: "row", gap: space(2), justifyContent: "center", marginVertical: space(2) }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable hitSlop={8} key={n} onPress={() => onRate(n)}>
          <Text style={{ fontSize: 34 }}>{rated != null && n <= rated ? "★" : "☆"}</Text>
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
    return (
      <Screen title="My queue">
        {error ? <Note tone="danger">{error}</Note> : <Loading />}
      </Screen>
    );
  }

  const askConfirm = status.confirmationStatus === "PENDING" && status.confirmationRequestedAt;
  const state = status.visitStatus;

  return (
    <Screen
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      subtitle={status.shop.name}
      title="My queue"
    >
      {state === "QUEUED" && !askConfirm ? (
        <>
          <Card style={{ paddingVertical: space(8) }}>
            <BigStat
              caption={
                status.estimatedWaitMin != null ? `about ${status.estimatedWaitMin} min to go` : "wait time updating…"
              }
              value={status.position != null ? `#${status.position}` : "…"}
            />
          </Card>
          <Note>
            Do something better with your time — we'll ask you to confirm here when it's nearly your turn.
          </Note>
          <View style={{ marginTop: space(4) }}>
            <Button kind="ghost" label="Leave the queue" loading={busy} onPress={() => void leave()} small />
          </View>
        </>
      ) : null}

      {(state === "QUEUED" || state === "CONFIRMATION_PENDING") && askConfirm ? (
        <Card style={{ gap: space(3), paddingVertical: space(6) }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            It's nearly your turn. Are you coming?
          </Text>
          <Button label="Yes, on my way" loading={busy} onPress={() => void respond("COMING")} />
          <Button kind="secondary" label="No, remove me" loading={busy} onPress={() => void respond("DECLINED")} />
        </Card>
      ) : null}

      {(state === "CALLED" || state === "READY" || state === "CONFIRMATION_PENDING") && !askConfirm ? (
        <Card style={{ paddingVertical: space(6), alignItems: "center", gap: space(2) }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>It's your turn</Text>
          <Note>Head to {status.shop.name} now — they're expecting you.</Note>
        </Card>
      ) : null}

      {state === "IN_SERVICE" ? (
        <Card style={{ paddingVertical: space(6), alignItems: "center", gap: space(2) }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink }}>You're in the chair</Text>
          <Note>Enjoy. This page wraps up when you're done.</Note>
        </Card>
      ) : null}

      {state === "COMPLETED" ? (
        <Card style={{ paddingVertical: space(5), gap: space(2) }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            All done — thanks!
          </Text>
          {!status.feedbackSubmitted ? (
            <>
              <Note>How was it?</Note>
              <Stars onRate={(n) => void rate(n)} rated={rated} />
            </>
          ) : null}
          <Button label="Finish" onPress={() => setTrackingToken(null)} />
        </Card>
      ) : null}

      {DONE_STATES.has(state) && state !== "COMPLETED" ? (
        <Card style={{ paddingVertical: space(5), gap: space(3) }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.ink, textAlign: "center" }}>
            {state === "MISSED" || state === "NO_SHOW" ? "You missed your turn" : "You left the queue"}
          </Text>
          <Note>No problem — you can join again any time.</Note>
          <Button
            label="Find a salon"
            onPress={() => {
              setTrackingToken(null);
              onFindSalon();
            }}
          />
        </Card>
      ) : null}

      {error ? <Note tone="danger">{error}</Note> : null}
    </Screen>
  );
}
