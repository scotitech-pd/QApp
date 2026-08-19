import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { api, type ShopDetail } from "../api";
import { colors, space } from "../theme";
import { BackLink, Button, Card, Field, Loading, Note, Screen } from "../ui";

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
      <Screen title="Loading..." headerLeft={<BackLink label="Salons" onPress={onBack} />}>
        <Loading />
      </Screen>
    );
  }

  if (!shop) {
    return (
      <Screen title="Something went wrong" headerLeft={<BackLink label="Salons" onPress={onBack} />}>
        <Note tone="danger">{error}</Note>
      </Screen>
    );
  }

  const waiting = shop.queueLength ?? 0;
  const mins = shop.estimatedWaitMin;

  return (
    <Screen
      headerLeft={<BackLink label="Salons" onPress={onBack} />}
      subtitle={[shop.addressLine1, shop.city].filter(Boolean).join(", ") || undefined}
      title={shop.name}
    >
      <Card>
        <Text style={{ fontSize: 15, color: colors.ink2, fontWeight: "600" }}>Right now</Text>
        <Text style={{ fontSize: 26, fontWeight: "800", color: colors.ink, marginTop: space(1) }}>
          {shop.queuePaused
            ? "Queue is paused"
            : waiting === 0
              ? "No wait — walk right in"
              : `${waiting} waiting · about ${mins ?? "?"} min`}
        </Text>
      </Card>

      {!challengeId ? (
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: space(3) }}>
            Hold your place
          </Text>
          <Field label="Your first name" onChangeText={setFirstName} placeholder="e.g. Sam" value={firstName} />
          <Field
            autoCapitalize="none"
            keyboardType="phone-pad"
            label="Mobile number"
            onChangeText={setMobileNumber}
            placeholder="+44 7… "
            value={mobileNumber}
          />
          {error ? (
            <View style={{ marginBottom: space(3) }}>
              <Note tone="danger">{error}</Note>
            </View>
          ) : null}
          <Button
            disabled={shop.queuePaused || firstName.trim().length === 0 || mobileNumber.trim().length < 7}
            label={shop.queuePaused ? "Queue is paused" : "Join the queue"}
            loading={busy}
            onPress={() => void startJoin()}
          />
        </Card>
      ) : (
        <Card>
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink, marginBottom: space(2) }}>
            Enter the code
          </Text>
          {codePreview ? (
            <View style={{ marginBottom: space(3) }}>
              <Note>
                Test mode — no SMS is sent. Your code is{" "}
                <Text style={{ fontWeight: "800", fontSize: 18, color: colors.ink }}>{codePreview}</Text>
              </Note>
            </View>
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
          <Button disabled={code.trim().length < 4} label="Confirm and join" loading={busy} onPress={() => void verifyJoin()} />
          {codePreview ? (
            <View style={{ marginTop: space(2) }}>
              <Button kind="ghost" label="Use the code above" onPress={() => setCode(codePreview)} small />
            </View>
          ) : null}
        </Card>
      )}
    </Screen>
  );
}
