import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

import { api, type ShopDetail } from "../api";
import { useStore } from "../store";
import { colors, fonts, radius, space } from "../theme";
import { BackLink, Blueprint, Button, Field, Kicker, Loading, Note, Screen, Tag } from "../ui";

function WaitSummary({ shop }: { shop: ShopDetail }) {
  const waiting = shop.queueLength ?? 0;
  return (
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
  );
}

function GhostLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable hitSlop={8} onPress={onPress} style={{ alignSelf: "center", marginTop: space(3) }}>
      <Text style={{ color: colors.accent700, fontFamily: fonts.bodyMedium, fontSize: 13.5 }}>{label}</Text>
    </Pressable>
  );
}

export function ShopDetailScreen({
  slug,
  onBack,
  onJoined,
  onInfo
}: {
  slug: string;
  onBack: () => void;
  onJoined: (trackingToken: string) => void;
  onInfo?: (slug: string) => void;
}) {
  const { customerToken, customerProfile, savedJoinName, savedJoinPhone, setSavedJoinDetails } = useStore();
  const scrollRef = useRef<ScrollView | null>(null);

  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveDetails, setSaveDetails] = useState(true);
  const [forSomeoneElse, setForSomeoneElse] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const signedIn = Boolean(customerToken && customerProfile);
  // A signed-in profile with a phone can join in one tap — the phone was
  // verified when the account claimed its first visit.
  const oneTapReady = signedIn && Boolean(customerProfile?.phone);

  useEffect(() => {
    api
      .getShop(slug)
      .then(setShop)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load this salon."));
  }, [slug]);

  // Prefill from saved details (or the profile name) exactly once.
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || forSomeoneElse) return;
    if (savedJoinName || savedJoinPhone || customerProfile) {
      prefilled.current = true;
      if (savedJoinName) setFirstName(savedJoinName);
      else if (customerProfile?.firstName) setFirstName(customerProfile.firstName);
      if (savedJoinPhone) setMobileNumber(savedJoinPhone);
    }
  }, [savedJoinName, savedJoinPhone, customerProfile, forSomeoneElse]);

  function switchToSomeoneElse() {
    setForSomeoneElse(true);
    setFirstName("");
    setMobileNumber("");
    setChallengeId(null);
    setCode("");
  }

  function switchToMyself() {
    setForSomeoneElse(false);
    prefilled.current = false;
    setFirstName("");
    setMobileNumber("");
    setChallengeId(null);
    setCode("");
  }

  async function joinDirect(guest?: { firstName: string; mobileNumber: string }) {
    if (!customerToken) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.joinDirect(slug, customerToken, guest);
      onJoined(result.queueStatus.trackingToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function startJoin() {
    setBusy(true);
    setError(null);
    try {
      const result = await api.joinStart(slug, firstName.trim(), mobileNumber.trim());
      setChallengeId(result.challengeId);
      setCodePreview(result.codePreview ?? null);
      if (saveDetails && !forSomeoneElse) {
        setSavedJoinDetails(firstName.trim(), mobileNumber.trim());
      }
      // The OTP block renders below the details — bring it into view.
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250);
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
  const fieldsValid = firstName.trim().length > 0 && mobileNumber.trim().length >= 7;

  return (
    <Screen
      headerLeft={<BackLink label="All salons" onPress={onBack} />}
      headerRight={<Tag label={waitTag} tone={waiting === 0 && !shop.queuePaused ? "accent" : "outline"} />}
      scrollRef={scrollRef}
      subtitle={meta || undefined}
      title={shop.name}
    >
      {oneTapReady && !forSomeoneElse ? (
        // ---- Signed in: your saved details are enough ----
        <>
          <View style={{ marginBottom: space(2) }}>
            <Kicker>Joining as</Kicker>
          </View>
          <Blueprint>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.full,
                  backgroundColor: colors.accent100,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.accent700 }}>
                  {(customerProfile?.firstName ?? "?").slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15.5, color: colors.text }}>
                  {customerProfile?.firstName}
                </Text>
                <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral600 }}>
                  {customerProfile?.phone}
                </Text>
              </View>
            </View>
          </Blueprint>
          <WaitSummary shop={shop} />
          {error ? (
            <View style={{ marginBottom: space(3) }}>
              <Note tone="danger">{error}</Note>
            </View>
          ) : null}
          <Button
            blueprint
            disabled={shop.queuePaused}
            label={shop.queuePaused ? "Queue is paused" : "Join queue"}
            loading={busy}
            onPress={() => void joinDirect()}
          />
          <GhostLink label="Booking for someone else?" onPress={switchToSomeoneElse} />
        </>
      ) : (
        // ---- Details form: guests, signed-out, or profiles without a phone ----
        <>
          <View style={{ marginBottom: space(2) }}>
            <Kicker>{forSomeoneElse ? "Their details" : "Your details"}</Kicker>
          </View>
          <Field
            editable={!challengeId}
            label="Name"
            onChangeText={setFirstName}
            placeholder={forSomeoneElse ? "e.g. Papa" : "e.g. Rahul"}
            value={firstName}
          />
          <Field
            autoCapitalize="none"
            editable={!challengeId}
            keyboardType="phone-pad"
            label="Phone"
            onChangeText={setMobileNumber}
            placeholder="10-digit mobile"
            value={mobileNumber}
          />
          {!signedIn && !forSomeoneElse ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: space(3)
              }}
            >
              <Text style={{ fontFamily: fonts.body, fontSize: 13.5, color: colors.text }}>
                Remember me for next time
              </Text>
              <Switch
                onValueChange={setSaveDetails}
                thumbColor="#FFFFFF"
                trackColor={{ false: colors.neutral100, true: colors.accent }}
                value={saveDetails}
              />
            </View>
          ) : null}
          <WaitSummary shop={shop} />
          {error ? (
            <View style={{ marginBottom: space(3) }}>
              <Note tone="danger">{error}</Note>
            </View>
          ) : null}
          {!challengeId ? (
            <>
              <Button
                blueprint
                disabled={shop.queuePaused || !fieldsValid}
                label={shop.queuePaused ? "Queue is paused" : "Join queue"}
                loading={busy}
                onPress={() => {
                  // Signed-in users vouch for their guest — no OTP round-trip.
                  if (signedIn) void joinDirect({ firstName: firstName.trim(), mobileNumber: mobileNumber.trim() });
                  else void startJoin();
                }}
              />
              {forSomeoneElse ? (
                <GhostLink
                  label={oneTapReady ? "← Join as myself instead" : "← Back to my own details"}
                  onPress={switchToMyself}
                />
              ) : (
                <GhostLink label="Booking for someone else?" onPress={switchToSomeoneElse} />
              )}
            </>
          ) : (
            // ---- OTP, on the same page, right below the details ----
            <>
              <View style={{ marginTop: space(2), marginBottom: space(2) }}>
                <Kicker>Verify {forSomeoneElse ? "their" : "your"} phone</Kicker>
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
              <Button
                blueprint
                disabled={code.trim().length < 4}
                label="Confirm and join"
                loading={busy}
                onPress={() => void verifyJoin()}
              />
              {codePreview ? (
                <View style={{ marginTop: space(2) }}>
                  <Button kind="ghost" label="Use the code above" onPress={() => setCode(codePreview)} small />
                </View>
              ) : null}
              <GhostLink
                label="Edit details"
                onPress={() => {
                  setChallengeId(null);
                  setCode("");
                }}
              />
            </>
          )}
          <View style={{ marginTop: space(4) }}>
            <Note center tone="faint">
              No service picking — just join. The owner extends your slot if your service runs long.
            </Note>
          </View>
        </>
      )}
    </Screen>
  );
}
