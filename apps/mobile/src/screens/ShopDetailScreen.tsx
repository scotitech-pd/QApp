import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { api, type ShopDetail } from "../api";
import { colors, fonts, space } from "../theme";
import { BackLink, Blueprint, Button, Field, Kicker, Loading, Note, Screen, Tag } from "../ui";

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

  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [busy, setBusy] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [code, setCode] = useState("");

  useEffect(() => {
    api
      .getShop(slug)
      .then(setShop)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this salon."));
  }, [slug]);

  async function startJoin() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.joinStart(slug, firstName.trim(), mobileNumber.trim());
      setChallengeId(result.challengeId);
      setCodePreview(result.codePreview ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyJoin() {
    if (!challengeId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.joinVerify(challengeId, code.trim());
      onJoined(result.queueStatus.trackingToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wrong code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!shop && !error) {
    return (
      <Screen headerLeft={<BackLink label="All salons" onPress={onBack} />} title="Loading...">
        <Loading />
      </Screen>
    );
  }

  if (!shop) {
    return (
      <Screen headerLeft={<BackLink label="All salons" onPress={onBack} />} title="Something went wrong">
        <Note tone="danger">{error}</Note>
      </Screen>
    );
  }

  const waiting = shop.queueLength ?? 0;
  const chairs = shop.serviceStationsCount;
  const meta = [shop.city, chairs ? `${chairs} chairs` : null].filter(Boolean).join(" · ");
  const waitTag = shop.queuePaused ? "Paused" : waiting === 0 ? "No wait" : `~${shop.estimatedWaitMin ?? "?"} min wait`;

  return (
    <Screen
      headerLeft={<BackLink label="All salons" onPress={onBack} />}
      headerRight={<Tag label={waitTag} tone={waiting === 0 && !shop.queuePaused ? "accent" : "outline"} />}
      subtitle={meta || undefined}
      title={shop.name}
    >
      {!challengeId ? (
        <>
          <View style={{ marginBottom: space(2) }}>
            <Kicker>Your details</Kicker>
          </View>
          <Field label="Name" onChangeText={setFirstName} placeholder="e.g. Rahul" value={firstName} />
          <Field
            autoCapitalize="none"
            keyboardType="phone-pad"
            label="Phone"
            onChangeText={setMobileNumber}
            placeholder="10-digit mobile"
            value={mobileNumber}
          />
          <Blueprint>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 13, color: colors.text, fontFamily: fonts.body }}>People ahead of you</Text>
              <Text style={{ fontSize: 15, fontFamily: fonts.heading, color: colors.text }}>{waiting}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space(1) }}>
              <Text style={{ fontSize: 13, color: colors.text, fontFamily: fonts.body }}>Estimated wait</Text>
              <Text style={{ fontSize: 15, fontFamily: fonts.heading, color: colors.text }}>
                {shop.queuePaused
                  ? "Paused"
                  : waiting === 0
                    ? "None — walk right in"
                    : `~${shop.estimatedWaitMin ?? "?"} min`}
              </Text>
            </View>
          </Blueprint>
          {error ? (
            <View style={{ marginBottom: space(3) }}>
              <Note tone="danger">{error}</Note>
            </View>
          ) : null}
          <Button
            blueprint
            disabled={shop.queuePaused || firstName.trim().length === 0 || mobileNumber.trim().length < 7}
            label={shop.queuePaused ? "Queue is paused" : "Join queue"}
            loading={busy}
            onPress={() => void startJoin()}
          />
          <View style={{ marginTop: space(4) }}>
            <Note center tone="faint">
              No service picking — just join. The owner extends your slot if your service runs long.
            </Note>
          </View>
        </>
      ) : (
        <>
          <View style={{ marginBottom: space(2) }}>
            <Kicker>Verify your phone</Kicker>
          </View>
          {codePreview ? (
            <Blueprint style={{ alignItems: "center", gap: space(1) }}>
              <Note center>Test mode — no SMS is sent. Your code is</Note>
              <Text style={{ fontSize: 34, fontFamily: fonts.heading, color: colors.accent700, letterSpacing: 6 }}>
                {codePreview}
              </Text>
            </Blueprint>
          ) : (
            <View style={{ marginBottom: space(3) }}>
              <Note>We texted a 6-digit code to {mobileNumber}.</Note>
            </View>
          )}
          <Field
            autoCapitalize="none"
            keyboardType="number-pad"
            label="6-digit code"
            onChangeText={setCode}
            placeholder="123456"
            value={code}
          />
          {error ? (
            <View style={{ marginBottom: space(3) }}>
              <Note tone="danger">{error}</Note>
            </View>
          ) : null}
          <Button blueprint disabled={code.trim().length < 4} label="Confirm and join" loading={busy} onPress={() => void verifyJoin()} />
          {codePreview ? (
            <View style={{ marginTop: space(2) }}>
              <Button kind="ghost" label="Use the code above" onPress={() => setCode(codePreview)} small />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
