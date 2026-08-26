import * as AppleAuthentication from "expo-apple-authentication";
import * as Application from "expo-application";
import * as Google from "expo-auth-session/providers/google";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Image, Linking, Modal, Platform, Pressable, Share, Text, View } from "react-native";

import { api, type ShopSummary, type VisitHistoryItem } from "../api";
import { GOOGLE_CLIENT_IDS, WEB_BASE_URL } from "../config";
import { pickSquareImage } from "../images";
import { LegalScreen, type LegalDoc } from "./LegalScreen";
import { Storefront } from "../scenery";
import { useStore } from "../store";
import { colors, fonts, radius, shadowCard, shadowSoft, space } from "../theme";
import { Blueprint, Button, Field, Kicker, Loading, Note, Screen, Tag } from "../ui";

WebBrowser.maybeCompleteAuthSession();

type GoogleIds = { iosClientId?: string; androidClientId?: string; webClientId?: string };

/* Client IDs are build-time constants. Kept at module scope so their object
 * identity is stable: rebuilding them every render re-created the auth request
 * inside useIdTokenAuthRequest, which set state, which re-rendered — the
 * "Me tab flickering" loop. */
const EMBEDDED_GOOGLE_IDS = ((Constants.expoConfig?.extra as { googleClientIds?: GoogleIds } | undefined)?.googleClientIds ?? {}) as GoogleIds;
const GOOGLE_IDS: GoogleIds = { ...EMBEDDED_GOOGLE_IDS, ...GOOGLE_CLIENT_IDS };

const APP_VERSION = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "dev";
const APP_BUILD = Application.nativeBuildVersion ?? "—";

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
  return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
}

function monthYear(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], { month: "short", year: "numeric" });
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function waitLine(shop: ShopSummary) {
  if (shop.queuePaused) return "Paused";
  const count = shop.queueLength ?? 0;
  if (count === 0) return "No wait";
  return `${count} waiting · ~${shop.estimatedWaitMin ?? "?"} min`;
}

function Avatar({ name, url, size = 64 }: { name: string; url?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) {
    return (
      <Image
        onError={() => setFailed(true)}
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: colors.surfaceAlt }}
      />
    );
  }
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: colors.accent100,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text style={{ fontFamily: fonts.heading, fontSize: size * 0.38, color: colors.accent700 }}>{initials(name)}</Text>
    </View>
  );
}

function Row({
  label,
  value,
  onPress,
  tone = "neutral",
  last
}: {
  label: string;
  value?: string;
  onPress: () => void;
  tone?: "neutral" | "danger";
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: space(3.5),
          paddingHorizontal: space(4),
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.dividerSoft,
          backgroundColor: pressed ? colors.surfaceAlt : "transparent"
        }
      ]}
    >
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: tone === "danger" ? colors.danger : colors.text }}>{label}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral500 }}>{value ?? "›"}</Text>
    </Pressable>
  );
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
  const authConfig = useMemo(
    () => ({ iosClientId: ids.iosClientId, androidClientId: ids.androidClientId, webClientId: ids.webClientId }),
    [ids.iosClientId, ids.androidClientId, ids.webClientId]
  );
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(authConfig);

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

function FavouritesSection({ deviceKey, onOpenShop }: { deviceKey: string | null; onOpenShop: (slug: string) => void }) {
  const { favoriteSlugs, toggleFavorite } = useStore();
  const [shops, setShops] = useState<ShopSummary[] | null>(null);

  useEffect(() => {
    if (!deviceKey) return;
    let active = true;
    api
      .listFavorites(deviceKey)
      .then((items) => {
        if (active) setShops(items);
      })
      .catch(() => {
        if (active) setShops([]);
      });
    return () => {
      active = false;
    };
  }, [deviceKey, favoriteSlugs.length]);

  return (
    <>
      <View style={{ marginBottom: space(2), flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Kicker>Favourite salons</Kicker>
        {shops && shops.length > 0 ? (
          <Text style={{ fontSize: 12, color: colors.neutral500, fontFamily: fonts.body }}>{shops.length}</Text>
        ) : null}
      </View>
      {!shops ? <Loading /> : null}
      {shops && shops.length === 0 ? (
        <Blueprint>
          <Note center tone="faint">
            No favourites yet. Tap ♥ on any salon and it lives here for one-tap rejoining.
          </Note>
        </Blueprint>
      ) : null}
      {shops?.map((shop) => (
        <Blueprint key={shop.slug} onPress={() => onOpenShop(shop.slug)} style={{ paddingVertical: space(3) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
              <Storefront size={22} tint={colors.accent700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>
                {shop.name}
              </Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.neutral600 }}>{waitLine(shop)}</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => void toggleFavorite(shop.slug)}>
              <Text style={{ fontSize: 20, color: colors.danger }}>♥</Text>
            </Pressable>
          </View>
        </Blueprint>
      ))}
    </>
  );
}

function shareApp() {
  void Share.share({
    message: `Skip the wait at your salon — I join the queue from home with OnQ. ${WEB_BASE_URL}`
  });
}

function Footer({ onOpenLegal }: { onOpenLegal: (doc: LegalDoc) => void }) {
  return (
    <View style={{ alignItems: "center", gap: 4, marginTop: space(6) }}>
      <Pressable
        onPress={shareApp}
        style={({ pressed }) => [
          {
            flexDirection: "row",
            alignItems: "center",
            gap: space(2),
            paddingHorizontal: space(4),
            paddingVertical: space(2),
            borderRadius: radius.full,
            backgroundColor: colors.accent100,
            marginBottom: space(3)
          },
          pressed && { opacity: 0.7 }
        ]}
      >
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.accent700 }}>
          ↗ Share OnQ with friends
        </Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: space(4) }}>
        <Pressable onPress={() => onOpenLegal("privacy")}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent700 }}>Privacy</Text>
        </Pressable>
        <Pressable onPress={() => onOpenLegal("terms")}>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent700 }}>Terms</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: colors.neutral500 }}>
        OnQ {APP_VERSION} ({APP_BUILD}) · Scotitech Solutions
      </Text>
    </View>
  );
}

export function MeScreen({ onOpenShop }: { onOpenShop: (slug: string) => void }) {
  const { customerToken, customerProfile, setCustomerSession, trackingToken, deviceKey, setFavoriteSlugs } = useStore();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [history, setHistory] = useState<VisitHistoryItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [legal, setLegal] = useState<LegalDoc | null>(null);

  const googleConfigured =
    Platform.OS === "ios" ? Boolean(GOOGLE_IDS.iosClientId) : Platform.OS === "android" ? Boolean(GOOGLE_IDS.androidClientId) : Boolean(GOOGLE_IDS.webClientId);

  useEffect(() => {
    if (Platform.OS === "ios") {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false));
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!customerToken) return;
    try {
      setError(null);
      const [profile, visits] = await Promise.all([api.customerMe(customerToken), api.customerHistory(customerToken)]);
      setCustomerSession(customerToken, profile);
      setHistory(visits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your profile.");
    }
  }, [customerToken, setCustomerSession]);

  useEffect(() => {
    if (!customerToken) {
      setHistory(null);
      return;
    }
    let active = true;
    void (async () => {
      if (trackingToken) await api.customerClaim(customerToken, trackingToken).catch(() => undefined);
      if (deviceKey) await api.customerLinkDevice(customerToken, deviceKey).catch(() => undefined);
      if (active) await refreshProfile();
    })();
    return () => {
      active = false;
    };
    // refreshProfile is stable (store setters are stable); exclude to avoid re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerToken, trackingToken, deviceKey]);

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

  async function saveName() {
    if (!customerToken) return;
    const next = draftName.trim();
    if (!next) return;
    setBusy(true);
    try {
      const profile = await api.customerUpdate(customerToken, next);
      setCustomerSession(customerToken, profile);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your name.");
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

  function confirmDelete() {
    Alert.alert(
      "Delete your account?",
      "This removes your name, email, phone, photo, favourites and sign-in links immediately. Past queue visits are anonymised. This can't be undone.",
      [
        { text: "Keep my account", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () => {
            if (!customerToken) return;
            setBusy(true);
            api
              .customerDelete(customerToken)
              .then(() => {
                setFavoriteSlugs([]);
                setCustomerSession(null, null);
                Alert.alert("Account deleted", "Thanks for using OnQ. You can still join queues without an account.");
              })
              .catch((err) => setError(err instanceof Error ? err.message : "Could not delete the account."))
              .finally(() => setBusy(false));
          }
        }
      ]
    );
  }

  // ---------- Signed out ----------
  if (!customerToken || !customerProfile) {
    return (
      <Screen subtitle="Optional. Joining a queue never needs an account." title="Me">
        <Blueprint style={{ alignItems: "center", gap: space(2), paddingVertical: space(6) }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
            <Storefront size={32} tint={colors.accent700} />
          </View>
          <Text style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.text }}>Keep your visits</Text>
          <Note center>Sign in to see every salon you've visited, your ratings, and rejoin your regulars in one tap.</Note>
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
          <GoogleButton busy={busy} ids={GOOGLE_IDS} onError={setError} onIdToken={handleGoogleIdToken} />
        ) : (
          <Note center tone="faint">Google sign-in activates once OAuth client IDs are configured.</Note>
        )}
        {busy ? <Loading /> : null}
        {error ? (
          <View style={{ marginTop: space(3) }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}

        <View style={{ height: space(6) }} />
        <FavouritesSection deviceKey={deviceKey} onOpenShop={onOpenShop} />
        <Footer onOpenLegal={setLegal} />
        <LegalScreen doc={legal} onClose={() => setLegal(null)} />
      </Screen>
    );
  }

  // ---------- Signed in ----------
  const stats = customerProfile.stats;
  const since = monthYear(customerProfile.memberSince);

  return (
    <Screen onRefresh={refreshProfile} title="Me">
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: space(5), marginBottom: space(4), ...shadowCard }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space(4) }}>
          <Pressable
            accessibilityLabel="Change profile photo"
            onPress={() => {
              void (async () => {
                if (!customerToken) return;
                const image = await pickSquareImage();
                if (!image) return;
                try {
                  const profile = await api.customerUpdateAvatar(customerToken, image);
                  setCustomerSession(customerToken, profile);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not update photo.");
                }
              })();
            }}
          >
            <Avatar name={customerProfile.firstName} url={customerProfile.avatarUrl} />
            <View
              style={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 22,
                height: 22,
                borderRadius: 11,
                backgroundColor: colors.accent,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.surface
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 11 }}>✎</Text>
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 24, color: colors.text }}>
              {customerProfile.firstName}
            </Text>
            {customerProfile.email ? (
              <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral600 }}>
                {customerProfile.email}
              </Text>
            ) : null}
            {customerProfile.phone ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral600 }}>{customerProfile.phone}</Text>
            ) : null}
            <View style={{ flexDirection: "row", gap: space(2), marginTop: space(2), flexWrap: "wrap" }}>
              {customerProfile.providers.map((provider) => (
                <Tag key={provider} label={provider === "apple" ? "Apple" : "Google"} tone="neutral" />
              ))}
              {since ? <Tag label={`Since ${since}`} tone="outline" /> : null}
            </View>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: space(2), marginTop: space(4) }}>
          {[
            { label: "Visits", value: stats?.visits ?? history?.length ?? 0 },
            { label: "Favourites", value: stats?.favorites ?? 0 },
            { label: "Ratings", value: stats?.ratings ?? 0 }
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: space(2.5), alignItems: "center" }}>
              <Text style={{ fontSize: 20, fontFamily: fonts.heading, color: colors.text }}>{stat.value}</Text>
              <Text style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <FavouritesSection deviceKey={deviceKey} onOpenShop={onOpenShop} />

      <View style={{ marginTop: space(4), marginBottom: space(2), flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Kicker>Recent visits</Kicker>
        {history ? <Text style={{ fontSize: 12, color: colors.neutral500, fontFamily: fonts.body }}>{history.length} total</Text> : null}
      </View>
      {!history ? <Loading /> : null}
      {history && history.length === 0 ? (
        <Blueprint>
          <Note center tone="faint">No visits yet. Join a queue and it shows up here automatically.</Note>
        </Blueprint>
      ) : null}
      {history?.slice(0, 8).map((visit) => (
        <Blueprint key={visit.id} onPress={() => onOpenShop(visit.shopSlug)} style={{ paddingVertical: space(3) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center" }}>
              <Storefront size={22} tint={colors.accent700} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>
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

      <View style={{ marginTop: space(4), marginBottom: space(2) }}>
        <Kicker>Account</Kicker>
      </View>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, overflow: "hidden", ...shadowSoft }}>
        <Row label="Edit name" onPress={() => { setDraftName(customerProfile.firstName); setEditing(true); }} value={customerProfile.firstName} />
        <Row label="Notifications" onPress={() => void Linking.openSettings()} value="System settings ›" />
        <Row label="Privacy policy" onPress={() => setLegal("privacy")} />
        <Row label="Terms of use" onPress={() => setLegal("terms")} />
        <Row label="Sign out" onPress={signOut} />
        <Row label="Delete account" last onPress={confirmDelete} tone="danger" value=" " />
      </View>

      {error ? (
        <View style={{ marginTop: space(3) }}>
          <Note tone="danger">{error}</Note>
        </View>
      ) : null}
      <Footer onOpenLegal={setLegal} />
      <LegalScreen doc={legal} onClose={() => setLegal(null)} />

      <Modal animationType="fade" onRequestClose={() => setEditing(false)} transparent visible={editing}>
        <Pressable onPress={() => setEditing(false)} style={{ flex: 1, backgroundColor: "rgba(16,24,40,0.45)", justifyContent: "center", padding: space(6) }}>
          <Pressable onPress={() => undefined} style={{ backgroundColor: colors.surface, borderRadius: radius.xl, padding: space(5), ...shadowCard }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: space(3) }}>Your name</Text>
            <Field autoCapitalize="words" label="Shown to the shop when it's your turn" onChangeText={setDraftName} placeholder="First name" value={draftName} />
            <Button disabled={!draftName.trim()} label="Save" loading={busy} onPress={() => void saveName()} />
            <View style={{ marginTop: space(2) }}>
              <Button kind="ghost" label="Cancel" onPress={() => setEditing(false)} small />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
