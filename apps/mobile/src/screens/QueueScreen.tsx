import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, Pressable, Share, Text, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";

import { api, type QueueStatus, type ShopDetail } from "../api";
import { WEB_BASE_URL } from "../config";
import { formatKm, haversineKm } from "../geo";
import { StoneG, Storefront, TreeG } from "../scenery";
import { useStore } from "../store";
import { colors, fonts, radius, shadowSoft, space } from "../theme";
import { Blueprint, Button, EmptyState, Loading, Note, Screen, Tag } from "../ui";

const DONE_STATES = new Set(["COMPLETED", "CANCELLED", "MISSED", "NO_SHOW"]);

function Stars({ onRate, rated }: { onRate: (n: number) => void; rated: number | null }) {
  return (
    <View style={{ flexDirection: "row", gap: space(2), justifyContent: "center", marginVertical: space(2) }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable hitSlop={8} key={n} onPress={() => onRate(n)}>
          <Text style={{ fontSize: 34, color: "#D99A3D" }}>{rated != null && n <= rated ? "★" : "☆"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/* The walk-to-the-chair scene: a dotted trail from "you" to the storefront,
 * one dot per person ahead. Dots disappear and you advance as the queue moves. */
function JourneyScene({ position, queueLength, shopName }: { position: number; queueLength: number; shopName: string }) {
  const [width, setWidth] = useState(0);
  const H = 156;
  const ahead = Math.max(0, position - 1);
  const total = Math.max(queueLength, position, 1);
  const youT = 0.1 + (1 - Math.min(1, position / (total + 1))) * 0.22;
  const storeT = 0.9;

  const point = (t: number) => ({
    x: 20 + t * (width - 72),
    y: 96 - Math.sin(t * Math.PI) * 24 - Math.sin(t * 5.1) * 5
  });

  let d = "";
  if (width > 0) {
    const steps = 26;
    for (let i = 0; i <= steps; i += 1) {
      const p = point(i / steps);
      d += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
    }
  }

  const shownDots = Math.min(ahead, 6);
  const you = point(youT);
  const store = point(storeT);

  return (
    <Blueprint style={{ paddingVertical: space(3), paddingHorizontal: space(3) }}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height: H }}>
        {width > 0 ? (
          <Svg height={H} width={width}>
            <Path d={d} fill="none" stroke={colors.accent200} strokeDasharray="1 8" strokeLinecap="round" strokeWidth={3} />
            <TreeG s={0.95} x={width * 0.30} y={point(0.30).y + 34} />
            <TreeG s={0.7} x={width * 0.72} y={point(0.72).y - 26} />
            <StoneG s={0.8} x={width * 0.52} y={point(0.52).y + 30} />
            {Array.from({ length: shownDots }).map((_, index) => {
              const t = youT + ((index + 1) / (shownDots + 1)) * (storeT - youT);
              const p = point(t);
              return <Circle cx={p.x} cy={p.y} fill={colors.accent} key={index} opacity={0.35} r={5} />;
            })}
            <Ellipse cx={store.x + 4} cy={store.y + 26} fill="rgba(16,24,40,0.10)" rx={20} ry={4.5} />
            <Ellipse cx={you.x} cy={you.y + 15} fill="rgba(16,24,40,0.10)" rx={10} ry={3} />
            <Circle cx={you.x} cy={you.y} fill={colors.accent700} r={9} stroke="#FFFFFF" strokeWidth={2.5} />
          </Svg>
        ) : null}
        {width > 0 ? (
          <>
            <View style={{ position: "absolute", left: store.x - 22, top: store.y - 46, width: 52, height: 52, borderRadius: 15, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", ...shadowSoft }}>
              <Storefront size={30} tint="#FFFFFF" />
            </View>
            <View style={{ position: "absolute", left: Math.max(0, you.x - 30), top: you.y + 20, width: 60, alignItems: "center" }}>
              <Text style={{ fontSize: 10.5, fontFamily: fonts.bodyMedium, color: colors.accent700 }}>You</Text>
            </View>
          </>
        ) : null}
      </View>
      <Text style={{ textAlign: "center", fontFamily: fonts.body, fontSize: 13.5, color: colors.neutral600 }}>
        {ahead === 0
          ? `You're next at ${shopName}`
          : `${ahead} ${ahead === 1 ? "person" : "people"} ahead of you at ${shopName}`}
        {ahead > 6 ? ` (showing 6)` : ""}
      </Text>
    </Blueprint>
  );
}

export function QueueScreen({ onFindSalon }: { onFindSalon: () => void }) {
  const { trackingToken, setTrackingToken } = useStore();
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [detail, setDetail] = useState<ShopDetail | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rated, setRated] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const detailSlugRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!trackingToken) return;
    try {
      setError(null);
      const next = await api.queueStatus(trackingToken);
      setStatus(next);
      if (next.shop.slug !== detailSlugRef.current) {
        detailSlugRef.current = next.shop.slug;
        api.getShop(next.shop.slug).then(setDetail).catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your queue place.");
    }
  }, [trackingToken]);

  useEffect(() => {
    setStatus(null);
    setDetail(null);
    setDistanceKm(null);
    setRated(null);
    detailSlugRef.current = null;
    if (!trackingToken) return;
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => clearInterval(timer);
  }, [trackingToken, load]);

  useEffect(() => {
    if (!detail?.latitude || !detail.longitude) return;
    let active = true;
    (async () => {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active && detail.latitude != null && detail.longitude != null) {
          setDistanceKm(haversineKm(position.coords.latitude, position.coords.longitude, detail.latitude, detail.longitude));
        }
      } catch {
        // distance is a nice-to-have
      }
    })();
    return () => {
      active = false;
    };
  }, [detail?.latitude, detail?.longitude]);

  function openDirections() {
    if (!detail?.latitude || !detail.longitude) return;
    const label = encodeURIComponent(status?.shop.name ?? "Salon");
    const url =
      Platform.OS === "ios"
        ? `maps:?daddr=${detail.latitude},${detail.longitude}&q=${label}`
        : `geo:${detail.latitude},${detail.longitude}?q=${detail.latitude},${detail.longitude}(${label})`;
    void Linking.openURL(url).catch(() => {
      void Linking.openURL(`https://maps.google.com/?daddr=${detail.latitude},${detail.longitude}`);
    });
  }

  function callShop() {
    if (detail?.phone) void Linking.openURL(`tel:${detail.phone.replace(/\s/g, "")}`);
  }

  function shareStatus() {
    if (!status) return;
    void Share.share({
      message: `I'm #${status.position ?? "?"} in the queue at ${status.shop.name} — track live queues on OnQ: ${WEB_BASE_URL}/shops/${status.shop.slug}`
    });
  }

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

  function confirmLeave() {
    Alert.alert("Leave the queue?", "Your spot goes to the next person. You can always join again.", [
      { text: "Stay", style: "cancel" },
      { text: "Leave queue", style: "destructive", onPress: () => void leave() }
    ]);
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
        <EmptyState actionLabel="Find a salon" message="You're not waiting anywhere right now." onAction={onFindSalon} title="No queue yet" />
      </Screen>
    );
  }

  if (!status) {
    return <Screen title="My queue">{error ? <Note tone="danger">{error}</Note> : <Loading />}</Screen>;
  }

  const askConfirm = status.confirmationStatus === "PENDING" && status.confirmationRequestedAt;
  const state = status.visitStatus;
  const waiting = state === "QUEUED" && !askConfirm;
  const distance = formatKm(distanceKm);
  const slotAt =
    status.estimatedWaitMin != null
      ? new Date(Date.now() + status.estimatedWaitMin * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : null;

  const actions = [
    { label: "Directions", sub: distance ?? undefined, action: openDirections, enabled: Boolean(detail?.latitude) },
    { label: "Call", sub: undefined, action: callShop, enabled: Boolean(detail?.phone) },
    { label: "Share", sub: undefined, action: shareStatus, enabled: true }
  ];

  return (
    <Screen
      headerRight={<Tag label="LIVE" pulse tone="accent" />}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      subtitle={status.shop.name}
      title="My queue"
    >
      {waiting ? (
        <>
          <JourneyScene position={status.position ?? 1} queueLength={status.queueLength ?? 1} shopName={status.shop.name} />

          <View style={{ flexDirection: "row", gap: space(2), marginBottom: space(3) }}>
            {[
              { label: "Your spot", value: status.position != null ? `#${status.position}` : "…" },
              { label: "Est. wait", value: status.estimatedWaitMin != null ? `~${status.estimatedWaitMin}m` : "…" },
              { label: "Slot at", value: slotAt ?? "…" }
            ].map((stat) => (
              <View key={stat.label} style={{ flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: space(3), alignItems: "center", ...shadowSoft }}>
                <Text style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
                  {stat.label}
                </Text>
                <Text style={{ fontSize: 22, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>{stat.value}</Text>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: space(2), marginBottom: space(3) }}>
            {actions.map((item) => (
              <Pressable
                disabled={!item.enabled}
                key={item.label}
                onPress={item.action}
                style={({ pressed }) => [
                  { flex: 1, minHeight: 46, borderRadius: radius.md, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, opacity: item.enabled ? 1 : 0.4, ...shadowSoft },
                  pressed && { transform: [{ scale: 0.96 }] }
                ]}
              >
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.accent700 }}>{item.label}</Text>
                {item.sub ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: colors.neutral500 }}>{item.sub}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>

          <Note center tone="faint">
            Keep OnQ open — it buzzes here when it's nearly your turn.
          </Note>

          <View style={{ marginTop: space(4) }}>
            <Button kind="danger" label="Leave the queue" loading={busy} onPress={confirmLeave} />
          </View>
        </>
      ) : null}

      {askConfirm ? (
        <Blueprint style={{ gap: space(3), paddingVertical: space(6), backgroundColor: colors.accent100 }}>
          <Text style={{ fontSize: 24, fontFamily: fonts.heading, color: colors.text, textAlign: "center" }}>
            It's nearly your turn. Are you coming?
          </Text>
          {distance ? (
            <Text style={{ textAlign: "center", fontFamily: fonts.body, fontSize: 13.5, color: colors.neutral600 }}>
              {status.shop.name} is {distance} away
            </Text>
          ) : null}
          <Button label="Yes, on my way" loading={busy} onPress={() => void respond("COMING")} />
          <Button kind="secondary" label="No, remove me" loading={busy} onPress={() => void respond("DECLINED")} />
          <Button kind="ghost" label="Directions" onPress={openDirections} small />
        </Blueprint>
      ) : null}

      {(state === "CALLED" || state === "READY" || state === "CONFIRMATION_PENDING") && !askConfirm ? (
        <Blueprint style={{ paddingVertical: space(6), alignItems: "center", gap: space(2), backgroundColor: colors.accent }}>
          <Storefront size={40} tint="#FFFFFF" />
          <Text style={{ fontSize: 26, fontFamily: fonts.heading, color: "#FFFFFF" }}>It's your turn</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: "rgba(255,255,255,0.9)", textAlign: "center" }}>
            {status.shop.name} is ready for {status.customer.firstName}
            {distance ? ` · ${distance} away` : ""}
          </Text>
          <View style={{ alignSelf: "stretch", marginTop: space(2) }}>
            <Button kind="secondary" label="Directions" onPress={openDirections} />
          </View>
        </Blueprint>
      ) : null}

      {state === "IN_SERVICE" ? (
        <Blueprint style={{ paddingVertical: space(6), alignItems: "center", gap: space(2) }}>
          <Text style={{ fontSize: 26, fontFamily: fonts.heading, color: colors.text }}>You're in the chair</Text>
          <Note>Enjoy. This page wraps up when you're done.</Note>
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

      {error ? (
        <View style={{ marginTop: space(3) }}>
          <Note tone="danger">{error}</Note>
        </View>
      ) : null}
    </Screen>
  );
}
