import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";

import { GOOGLE_CLIENT_IDS } from "../config";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";

import { api, type VisitHistoryItem } from "../api";
import { Storefront } from "../scenery";
import { useStore } from "../store";
import { colors, fonts, radius, shadowSoft, space } from "../theme";
import { Blueprint, Button, Kicker, Loading, Note, Screen } from "../ui";

WebBrowser.maybeCompleteAuthSession();

type GoogleIds = { iosClientId?: string; androidClientId?: string; webClientId?: string };

function statusLabel(status: string) {
  switch (status) {
    case "COMPLETED":
      return "Served";
    case "MISSED":
    case "NO_SHOW":
      return "Missed";
    case "CANCELLED":
      return "Left";
    case "IN_SERVICE":
      return "In the chair";
    default:
      return "In queue";
  }
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function GoogleButton({
  ids,
  busy,
  onIdToken,
  onError
}: {
  ids: GoogleIds;
  busy: boolean;
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
}) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: ids.iosClientId,
    androidClientId: ids.androidClientId,
    webClientId: ids.webClientId
  });

  useEffect(() => {
    if (response?.type === "success" && response.params?.id_token) onIdToken(response.params.id_token);
    if (response?.type === "error") onError("Google sign-in failed.");
  }, [response, onIdToken, onError]);

  return (
    <Pressable
      disabled={!request || busy}
      onPress={() => void promptAsync()}
      style={({ pressed }) => [
        {
          minHeight: 50,
          borderRadius: radius.md,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.dividerSoft,
          ...shadowSoft
        },
        pressed && { transform: [{ scale: 0.98 }] }
      ]}
    >
      <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>Continue with Google</Text>
    </Pressable>
  );
}

export function MeScreen({ onOpenShop }: { onOpenShop: (slug: string) => void }) {
  const { customerToken, customerProfile, setCustomerSession, trackingToken } = useStore();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [history, setHistory] = useState<VisitHistoryItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const embeddedIds = ((Constants.expoConfig?.extra as { googleClientIds?: GoogleIds } | undefined)?.googleClientIds ?? {}) as GoogleIds;
  const googleIds: GoogleIds = { ...embeddedIds, ...GOOGLE_CLIENT_IDS };
  const googleConfigured =
    Platform.OS === "ios" ? Boolean(googleIds.iosClientId) : Platform.OS === "android" ? Boolean(googleIds.androidClientId) : Boolean(googleIds.webClientId);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!customerToken) return;
    try {
      setError(null);
      setHistory(await api.customerHistory(customerToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your visits.");
    }
  }, [customerToken]);

  useEffect(() => {
    setHistory(null);
    if (!customerToken) return;
    void (async () => {
      if (trackingToken) {
        await api.customerClaim(customerToken, trackingToken).catch(() => undefined);
      }
      await loadHistory();
    })();
  }, [customerToken, trackingToken, loadHistory]);

  const handleGoogleIdToken = useCallback(
    (idToken: string) => {
      setBusy(true);
      api
        .customerAuthGoogle(idToken)
        .then((result) => setCustomerSession(result.token, result.profile))
        .catch((err) => setError(err instanceof Error ? err.message : "Google sign-in failed."))
        .finally(() => setBusy(false));
    },
    [setCustomerSession]
  );

  async function signInWithApple() {
    setBusy(true);
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL]
      });
      if (!credential.identityToken) throw new Error("Apple did not return an identity token.");
      const result = await api.customerAuthApple(credential.identityToken, credential.fullName?.givenName ?? null);
      setCustomerSession(result.token, result.profile);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code !== "ERR_REQUEST_CANCELED") setError(err instanceof Error ? err.message : "Apple sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  function signOut() {
    Alert.alert("Sign out?", "Your visit history stays safe on your account.", [
      { text: "Stay", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => setCustomerSession(null, null) }
    ]);
  }

  if (!customerToken || !customerProfile) {
    return (
      <Screen subtitle="Optional. Joining a queue never needs an account." title="Me">
        <Blueprint style={{ alignItems: "center", gap: space(2), paddingVertical: space(6) }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
            <Storefront size={32} tint={colors.accent700} />
          </View>
          <Text style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.text }}>Keep your visits</Text>
          <Note center>
            Sign in to see every salon you've visited, your ratings, and rejoin your regulars in one tap.
          </Note>
        </Blueprint>

        {appleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            cornerRadius={radius.md}
            onPress={() => void signInWithApple()}
            style={{ height: 50, marginBottom: space(3) }}
          />
        ) : null}

        {googleConfigured ? (
          <GoogleButton busy={busy} ids={googleIds} onError={setError} onIdToken={handleGoogleIdToken} />
        ) : (
          <View
            style={{
              minHeight: 50,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.dividerSoft,
              opacity: 0.45
            }}
          >
            <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>Continue with Google</Text>
          </View>
        )}
        {!googleConfigured ? (
          <View style={{ marginTop: space(2) }}>
            <Note center tone="faint">
              Google sign-in activates once OAuth client IDs are configured.
            </Note>
          </View>
        ) : null}
        {busy ? <Loading /> : null}
        {error ? (
          <View style={{ marginTop: space(3) }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      onRefresh={loadHistory}
      subtitle={customerProfile.email ?? customerProfile.phone ?? "Signed in"}
      title={`Hi, ${customerProfile.firstName}`}
    >
      <View style={{ marginBottom: space(2), flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Kicker>Your visits</Kicker>
        {history ? <Text style={{ fontSize: 12, color: colors.neutral500, fontFamily: fonts.body }}>{history.length} total</Text> : null}
      </View>

      {!history ? <Loading /> : null}
      {history && history.length === 0 ? (
        <Blueprint>
          <Note center tone="faint">
            No visits yet. Join a queue and it shows up here automatically.
          </Note>
        </Blueprint>
      ) : null}
      {history?.map((visit) => (
        <Blueprint key={visit.id} onPress={() => onOpenShop(visit.shopSlug)} style={{ paddingVertical: space(3) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
              <Storefront size={22} tint={colors.accent700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }} numberOfLines={1}>
                {visit.shopName}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.neutral600 }}>
                {dayLabel(visit.joinedAt)} · {statusLabel(visit.status)}
                {visit.rating ? ` · ${"★".repeat(visit.rating)}` : ""}
              </Text>
            </View>
            <Text style={{ color: colors.accent700, fontFamily: fonts.bodyMedium, fontSize: 13 }}>Rejoin ›</Text>
          </View>
        </Blueprint>
      ))}

      {error ? <Note tone="danger">{error}</Note> : null}
      <View style={{ marginTop: space(4) }}>
        <Button kind="ghost" label="Sign out" onPress={signOut} small />
      </View>
    </Screen>
  );
}
