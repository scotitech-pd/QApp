import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { api, type QueueStatus } from "../api";
import { colors, radius, space } from "../theme";
import { Body, Button, Card, Eyebrow, Pill, Row, StatBlock, Title } from "../ui";

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED", "NO_SHOW", "MISSED"]);
const POLL_MS = 5000;

function positionLabel(status: QueueStatus) {
  if (status.visitStatus === "IN_SERVICE") return "In service";
  if (status.visitStatus === "CALLED" || status.visitStatus === "READY") return "You're up";
  const position = status.position ?? status.sortIndex;
  if (!position || position <= 1) return "Next";
  return `#${position}`;
}

function statusHeadline(status: QueueStatus) {
  switch (status.visitStatus) {
    case "COMPLETED":
      return "Thanks for visiting.";
    case "CANCELLED":
      return "You left this queue.";
    case "NO_SHOW":
    case "MISSED":
      return "This visit was released.";
    case "IN_SERVICE":
      return "You're in the chair.";
    case "CALLED":
    case "READY":
      return "It's your turn - head in.";
    default:
      return "Your place is being held.";
  }
}

export function QueueScreen({
  trackingToken,
  onClear
}: {
  trackingToken: string;
  onClear: () => void;
}) {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const item = await api.queueStatus(trackingToken);
      setStatus(item);
      setError(null);
      if (TERMINAL_STATUSES.has(item.visitStatus) && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your queue status.");
    }
  }, [trackingToken]);

  useEffect(() => {
    void load();
    timerRef.current = setInterval(() => void load(), POLL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [load]);

  async function act(name: string, run: () => Promise<unknown>) {
    setBusyAction(name);
    try {
      await run();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!status) {
    return (
      <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
        <Card>
          <Body text={error ?? "Loading your live status..."} />
          {error ? <Button label="Find a shop instead" onPress={onClear} variant="secondary" /> : null}
        </Card>
      </ScrollView>
    );
  }

  const isTerminal = TERMINAL_STATUSES.has(status.visitStatus);
  const awaitingArrivalAnswer =
    status.confirmationStatus === "PENDING" && !!status.confirmationRequestedAt && !isTerminal;
  const waitMin = status.estimatedWaitMin;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Card dark style={{ gap: space(4) }}>
        <Eyebrow text={status.shop.name} onDark />
        <Title onDark size={26} text={`${status.customer.firstName}, ${statusHeadline(status)}`} />

        <Row style={{ gap: space(6) }}>
          <StatBlock label="Your place" onDark value={positionLabel(status)} />
          <StatBlock
            label="Est. wait"
            onDark
            value={
              isTerminal
                ? "-"
                : waitMin == null || waitMin <= 0
                  ? "Now"
                  : `${waitMin} min`
            }
          />
          {typeof status.queueLength === "number" ? (
            <StatBlock label="In queue" onDark value={`${status.queueLength}`} />
          ) : null}
        </Row>

        {status.shop.queuePaused && !isTerminal ? (
          <Pill label="Shop paused the queue - your spot is safe" tone="warn" />
        ) : null}
      </Card>

      {awaitingArrivalAnswer ? (
        <Card style={styles.arrivalCard}>
          <Eyebrow text="The shop is asking" />
          <Title size={20} text="Are you on your way?" />
          <Body
            text={`Answer within ${status.shop.calledGracePeriodMin ?? 5} minutes to keep your place.`}
          />
          <Button
            busy={busyAction === "coming"}
            label="Yes, I'm coming"
            onPress={() => void act("coming", () => api.respondArrival(trackingToken, "COMING"))}
          />
          <Button
            busy={busyAction === "decline"}
            label="I can't make it"
            onPress={() => void act("decline", () => api.respondArrival(trackingToken, "DECLINED"))}
            variant="secondary"
          />
        </Card>
      ) : null}

      {!isTerminal ? (
        <Card>
          <Eyebrow text="While you wait" />
          <Body text="Keep this screen open. It refreshes automatically every few seconds - no need to stand in the shop." />
          <View style={styles.timeline}>
            {["Joined", "Near your turn", "Called", "In service", "Done"].map((step, index) => {
              const activeIndex =
                status.visitStatus === "IN_SERVICE"
                  ? 3
                  : status.visitStatus === "CALLED" || status.visitStatus === "READY"
                    ? 2
                    : awaitingArrivalAnswer
                      ? 1
                      : 0;
              const isDone = index <= activeIndex;
              return (
                <View key={step} style={styles.timelineStep}>
                  <View style={[styles.timelineDot, isDone && styles.timelineDotDone]} />
                  <Text style={[styles.timelineLabel, isDone && styles.timelineLabelDone]}>{step}</Text>
                </View>
              );
            })}
          </View>
          <Button
            busy={busyAction === "leave"}
            label="Leave the queue"
            onPress={() => void act("leave", () => api.leaveQueue(trackingToken))}
            variant="secondary"
          />
        </Card>
      ) : (
        <Card>
          <Eyebrow text={status.visitStatus === "COMPLETED" ? "All done" : "Queue closed"} />
          <Title
            size={20}
            text={
              status.visitStatus === "COMPLETED"
                ? "How was your visit?"
                : "This visit has ended."
            }
          />
          {status.visitStatus === "COMPLETED" && !feedbackSent && !status.feedbackSubmitted ? (
            <>
              <Row>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    label={rating != null && value <= rating ? "★" : "☆"}
                    onPress={() => setRating(value)}
                    style={styles.starButton}
                    variant="ghost"
                  />
                ))}
              </Row>
              <Button
                busy={busyAction === "feedback"}
                disabled={rating == null}
                label="Send rating"
                onPress={() =>
                  void act("feedback", async () => {
                    if (rating != null) await api.sendFeedback(trackingToken, rating);
                    setFeedbackSent(true);
                  })
                }
              />
            </>
          ) : status.visitStatus === "COMPLETED" ? (
            <Body text="Thanks - your rating helps the shop and other customers." />
          ) : (
            <Body text="You can join again any time the queue is open." />
          )}
          <Button label="Find another queue" onPress={onClear} variant="secondary" />
        </Card>
      )}

      {error ? <Body style={{ color: colors.danger }} text={error} /> : null}
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
  arrivalCard: {
    borderColor: colors.accent,
    borderWidth: 2
  },
  timeline: {
    gap: space(2),
    paddingVertical: space(2)
  },
  timelineStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3)
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface
  },
  timelineDotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  timelineLabel: {
    fontSize: 14,
    color: colors.muted
  },
  timelineLabelDone: {
    color: colors.ink,
    fontWeight: "600"
  },
  starButton: {
    minHeight: 44,
    paddingHorizontal: space(2)
  }
});
