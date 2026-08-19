import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { api, type JoinStartResult, type ShopDetail } from "../api";
import { colors, radius, space } from "../theme";
import { Body, Button, Card, Eyebrow, Field, Pill, Row, Title } from "../ui";

type JoinStage = "form" | "otp";

export function ShopDetailScreen({
  slug,
  onBack,
  onJoined
}: {
  slug: string;
  onBack: () => void;
  onJoined: (trackingToken: string) => void;
}) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stage, setStage] = useState<JoinStage>("form");
  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [challenge, setChallenge] = useState<JoinStartResult | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const item = await api.getShop(slug);
      setShop(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this shop.");
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function startJoin() {
    setJoinError(null);
    if (!firstName.trim() || !mobileNumber.trim()) {
      setJoinError("Your first name and mobile number are required.");
      return;
    }
    setBusy(true);
    try {
      const result = await api.joinStart(slug, firstName.trim(), mobileNumber.trim());
      setChallenge(result);
      if (result.codePreview) setOtpCode(result.codePreview);
      setStage("otp");
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Could not start the join.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyJoin() {
    if (!challenge) return;
    setJoinError(null);
    setBusy(true);
    try {
      const result = await api.joinVerify(challenge.challengeId, otpCode.trim());
      onJoined(result.queueStatus.trackingToken);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  const waitMin = shop?.estimatedWaitMin ?? null;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <Button label="< All shops" onPress={onBack} variant="ghost" style={styles.backButton} />

      {!shop ? (
        <Card>
          <Body text={error ?? "Loading shop..."} />
        </Card>
      ) : (
        <>
          <Card dark style={{ gap: space(3) }}>
            <Eyebrow text={shop.industryType ?? "Live queue"} onDark />
            <Title text={shop.name} onDark size={26} />
            <Body
              onDark
              text={[shop.addressLine1, shop.city].filter(Boolean).join(", ") || "Confirmed location"}
            />
            <Row style={{ marginTop: space(2) }}>
              <View style={styles.waitHero}>
                <Text style={styles.waitHeroValue}>
                  {shop.queuePaused ? "Paused" : waitMin == null || waitMin <= 0 ? "Now" : `${waitMin}m`}
                </Text>
                <Text style={styles.waitHeroLabel}>estimated wait</Text>
              </View>
              <View style={{ gap: space(2) }}>
                <Pill
                  label={shop.queuePaused ? "Queue paused" : "Queue open"}
                  tone={shop.queuePaused ? "warn" : "good"}
                />
                {typeof shop.queueLength === "number" ? (
                  <Body onDark text={`${shop.queueLength} in the queue right now`} />
                ) : null}
              </View>
            </Row>
          </Card>

          {shop.queuePaused ? (
            <Card>
              <Title text="The queue is paused" size={18} />
              <Body text="The shop is not taking new joins right now. Check back shortly." />
            </Card>
          ) : stage === "form" ? (
            <Card>
              <Eyebrow text="Hold your place" />
              <Title text="Join in under a minute." size={20} />
              <Body text="No account. Just your name, phone, and a quick verification code." />
              <Field
                autoCapitalize="words"
                label="First name"
                onChangeText={setFirstName}
                placeholder="Alex"
                value={firstName}
              />
              <Field
                autoComplete="tel"
                keyboardType="phone-pad"
                label="Mobile number"
                onChangeText={setMobileNumber}
                placeholder="+44 7700 900000"
                value={mobileNumber}
              />
              {joinError ? <Body text={joinError} style={{ color: colors.danger }} /> : null}
              <Button busy={busy} label="Join the queue" onPress={() => void startJoin()} />
            </Card>
          ) : (
            <Card>
              <Eyebrow text="Verification" />
              <Title text="Enter your code" size={20} />
              <Body
                text={
                  challenge?.pilotMode
                    ? "Pilot mode: no SMS is sent. Your code is below."
                    : "We sent a 6-digit code to your phone."
                }
              />
              {challenge?.codePreview ? (
                <View style={styles.codePreview}>
                  <Text style={styles.codePreviewText}>{challenge.codePreview}</Text>
                </View>
              ) : null}
              <Field
                keyboardType="number-pad"
                label="6-digit code"
                maxLength={6}
                onChangeText={setOtpCode}
                placeholder="000000"
                value={otpCode}
              />
              {joinError ? <Body text={joinError} style={{ color: colors.danger }} /> : null}
              <Button busy={busy} label="Confirm and hold my place" onPress={() => void verifyJoin()} />
              <Button label="Start over" onPress={() => setStage("form")} variant="ghost" />
            </Card>
          )}

          {shop.reviews && shop.reviews.length > 0 ? (
            <Card>
              <Eyebrow text="What customers say" />
              {shop.reviews.slice(0, 3).map((review, index) => (
                <View key={review.id ?? index} style={styles.review}>
                  <Row>
                    <Pill label={`${review.rating}/5`} tone="good" />
                    <Body
                      text={review.customerFirstName ?? review.customer?.firstName ?? "Customer"}
                      style={{ fontWeight: "700" }}
                    />
                  </Row>
                  {review.comment ? <Body text={review.comment} /> : null}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
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
  backButton: {
    alignSelf: "flex-start",
    minHeight: 36,
    paddingHorizontal: space(2)
  },
  waitHero: {
    backgroundColor: "rgba(244,235,208,0.12)",
    borderRadius: radius.lg,
    paddingVertical: space(3),
    paddingHorizontal: space(5),
    alignItems: "center"
  },
  waitHeroValue: {
    color: colors.cream,
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -1
  },
  waitHeroLabel: {
    color: colors.creamDim,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase"
  },
  codePreview: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: space(4),
    alignItems: "center"
  },
  codePreviewText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 10,
    color: colors.ink
  },
  review: {
    gap: space(2),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: space(3)
  }
});
