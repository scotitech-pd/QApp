import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  UIManager,
  View
} from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";

import type { ShopSummary } from "../api";
import { colors, fonts, radius, shadowCard, shadowFloat, shadowSoft, space } from "../theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type PathSort = "wait" | "distance";

const TOP_PAD = 56;

/* Deterministic per-shop jitter so the trail feels hand-drawn but stable. */
function jitter(slug: string) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) hash = (hash * 31 + slug.charCodeAt(i)) % 997;
  return hash / 997; // 0..1
}

function waitScore(shop: ShopSummary) {
  if (shop.queuePaused) return Number.MAX_SAFE_INTEGER;
  return shop.estimatedWaitMin ?? 0;
}

function shortWait(shop: ShopSummary) {
  if (shop.queuePaused) return "Paused";
  if ((shop.queueLength ?? 0) === 0) return "No wait";
  return `~${shop.estimatedWaitMin ?? "?"} min`;
}

function shortDistance(shop: ShopSummary) {
  const km = shop.distanceKm;
  if (km == null) return "—";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  return `${km.toFixed(1)} km`;
}

function TreeG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={2.5} fill="rgba(16,24,40,0.09)" rx={11} ry={3.2} />
      <Rect fill="#9A7B5C" height={9} rx={1.3} width={2.8} x={-1.4} y={-9} />
      <Circle cx={0} cy={-15} fill="#87AC93" r={8} />
      <Circle cx={-5} cy={-10.5} fill="#97BBA2" r={5.8} />
      <Circle cx={5} cy={-11} fill="#76a084" r={6} />
    </G>
  );
}

function StoneG({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${s})`}>
      <Ellipse cx={0} cy={1.8} fill="rgba(16,24,40,0.09)" rx={8.5} ry={2.6} />
      <Ellipse cx={0} cy={-2.2} fill="#C4C8CE" rx={7} ry={4.8} />
      <Ellipse cx={-1.8} cy={-3.8} fill="#D8DBDF" rx={3.6} ry={2.1} />
      <Ellipse cx={8} cy={0} fill="#CDD1D6" rx={3.4} ry={2.3} />
    </G>
  );
}

function Storefront({ size, tint }: { size: number; tint: string }) {
  return (
    <Svg fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M4 3.5h16l1.5 4.2c0 1.5-1.2 2.7-2.7 2.7-1.2 0-2.2-.8-2.6-1.9-.4 1.1-1.4 1.9-2.6 1.9s-2.2-.8-2.6-1.9c-.4 1.1-1.4 1.9-2.6 1.9S6.2 9.6 5.8 8.5C5.4 9.6 4.4 10.4 3.2 10.4 1.7 10.4.5 9.2.5 7.7L2 3.5h2Z"
        fill={tint}
        opacity={0.9}
      />
      <Path d="M4.5 11v8.2c0 .7.6 1.3 1.3 1.3h12.4c.7 0 1.3-.6 1.3-1.3V11" stroke={tint} strokeLinecap="round" strokeWidth={1.8} />
      <Rect fill={tint} height={5.4} opacity={0.85} rx={0.8} width={4.2} x={13.2} y={14.2} />
    </Svg>
  );
}

function DetailSheet({
  shop,
  onClose,
  onJoin,
  onInfo
}: {
  shop: ShopSummary;
  onClose: () => void;
  onJoin: (slug: string) => void;
  onInfo: (slug: string) => void;
}) {
  const translateY = useRef(new Animated.Value(620)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 300, mass: 0.9 })
    ]).start();
  }, [backdrop, translateY]);

  function close(after?: () => void) {
    Animated.parallel([
      Animated.timing(backdrop, { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 620, duration: 210, useNativeDriver: true })
    ]).start(() => {
      onClose();
      after?.();
    });
  }

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > 130 || gesture.vy > 0.7) {
          close();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 300 }).start();
        }
      }
    })
  ).current;

  return (
    <Modal animationType="none" onRequestClose={() => close()} transparent visible>
      <Animated.View style={{ flex: 1, backgroundColor: "rgba(16,24,40,0.5)", opacity: backdrop }}>
        <Pressable onPress={() => close()} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        {...pan.panHandlers}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateY }],
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingHorizontal: space(5),
          paddingTop: space(2),
          paddingBottom: space(10),
          gap: space(2),
          ...shadowFloat
        }}
      >
        <View style={{ alignSelf: "center", width: 38, height: 5, borderRadius: 3, backgroundColor: colors.dividerSoft, marginBottom: space(3) }} />

        <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: colors.accent100,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Storefront size={28} tint={colors.accent700} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.text }}>
              {shop.name}
            </Text>
            {shop.city ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral600 }}>{shop.city}</Text>
            ) : null}
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: space(2), marginTop: space(2) }}>
          {[
            { label: "Waiting", value: String(shop.queueLength ?? 0) },
            {
              label: "Est. wait",
              value: shop.queuePaused ? "Paused" : (shop.queueLength ?? 0) === 0 ? "None" : `~${shop.estimatedWaitMin ?? "?"} min`
            },
            { label: "Distance", value: shortDistance(shop) }
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radius.md,
                paddingVertical: space(2.5),
                alignItems: "center"
              }}
            >
              <Text style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
                {stat.label}
              </Text>
              <Text style={{ fontSize: 20, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <View style={{ marginTop: space(3), gap: space(1) }}>
          <Pressable
            disabled={shop.queuePaused}
            onPress={() => close(() => onJoin(shop.slug))}
            style={({ pressed }) => [
              {
                minHeight: 50,
                borderRadius: radius.md,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
                opacity: shop.queuePaused ? 0.45 : 1,
                ...shadowSoft
              },
              pressed && { transform: [{ scale: 0.98 }] }
            ]}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: fonts.heading, letterSpacing: 0.4 }}>
              {shop.queuePaused ? "Queue is paused" : "Join the queue"}
            </Text>
          </Pressable>
          <Pressable onPress={() => close(() => onInfo(shop.slug))} style={{ alignItems: "center", paddingVertical: space(2) }}>
            <Text style={{ color: colors.accent700, fontSize: 14, fontFamily: fonts.bodyMedium }}>View details, ratings & reviews</Text>
          </Pressable>
          <Pressable onPress={() => close()} style={{ alignItems: "center", paddingVertical: space(1) }}>
            <Text style={{ color: colors.neutral600, fontSize: 14, fontFamily: fonts.bodyMedium }}>Close</Text>
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

export function SalonPathView({
  shops,
  hasLocation,
  onOpenShop,
  onOpenInfo
}: {
  shops: ShopSummary[];
  hasLocation: boolean;
  onOpenShop: (slug: string) => void;
  onOpenInfo: (slug: string) => void;
}) {
  const [sort, setSort] = useState<PathSort>("wait");
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<ShopSummary | null>(null);

  const stops = useMemo(() => {
    const list = [...shops];
    if (sort === "wait") list.sort((a, b) => waitScore(a) - waitScore(b));
    else list.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
    return list.slice(0, 6);
  }, [shops, sort]);

  function switchSort(next: PathSort) {
    if (next === sort) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSort(next);
  }

  /* Depth: rank 0 is the biggest marker, then everything shrinks and tightens. */
  const markerSize = (index: number) => Math.max(34, 60 - index * 6);
  const gap = (index: number) => Math.max(92, 128 - index * 8);

  const centers = useMemo(() => {
    let y = TOP_PAD + 30;
    return stops.map((shop, index) => {
      const j = jitter(shop.slug);
      const base = index % 2 === 0 ? 0.26 : 0.74;
      const xFrac = Math.min(0.82, Math.max(0.18, base + (j - 0.5) * 0.22));
      const cy = y + markerSize(index) / 2;
      y += gap(index) + markerSize(index) / 2;
      return { xFrac, cy, j };
    });
  }, [stops]);

  const height = (centers[centers.length - 1]?.cy ?? TOP_PAD) + 90;

  /* Trail with true S-bends: every segment swings through a laterally offset
   * midpoint, so the path meanders like a garden walk instead of zigzagging. */
  const depthScale = (y: number) => Math.max(0.6, 1.15 - (y / Math.max(1, height)) * 0.55);

  let d = "";
  const scenery: Array<{ kind: "tree" | "stone"; x: number; y: number; s: number }> = [];
  if (width > 0 && centers.length > 0) {
    const startX = 0.26 * width;
    let prevX = startX;
    let prevY = 16;
    d = `M ${startX} ${prevY}`;
    centers.forEach(({ xFrac, cy, j }, index) => {
      const x = xFrac * width;
      const dy = cy - prevY;
      const swing = (j - 0.5) * 2 * (0.28 * width) * (index % 2 === 0 ? 1 : -1);
      const midX = Math.min(width - 30, Math.max(30, (prevX + x) / 2 + swing));
      const midY = prevY + dy * (0.42 + (j - 0.5) * 0.12);
      d += ` C ${prevX} ${prevY + dy * 0.3}, ${midX} ${midY - dy * 0.22}, ${midX} ${midY}`;
      d += ` C ${midX} ${midY + dy * 0.22}, ${x} ${cy - dy * 0.3}, ${x} ${cy}`;

      // Scatter scenery beside this segment, away from the trail line.
      const side = j > 0.5 ? 1 : -1;
      const t1x = (prevX + midX) / 2 - side * (46 + j * 30);
      const t1y = prevY + dy * 0.3;
      const t2x = (midX + x) / 2 + side * (52 + (1 - j) * 28);
      const t2y = prevY + dy * 0.72;
      const clampX = (value: number) => Math.min(width - 18, Math.max(18, value));
      scenery.push({ kind: j > 0.35 ? "tree" : "stone", x: clampX(t1x), y: t1y, s: depthScale(t1y) });
      scenery.push({ kind: j > 0.7 ? "stone" : "tree", x: clampX(t2x), y: t2y, s: depthScale(t2y) * 0.85 });

      prevX = x;
      prevY = cy;
    });
  }

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.full,
          padding: 3,
          marginBottom: space(2)
        }}
      >
        {(
          [
            { key: "wait" as const, label: "Quickest first", enabled: true },
            { key: "distance" as const, label: "Nearest first", enabled: hasLocation }
          ]
        ).map((item) => {
          const active = sort === item.key;
          return (
            <Pressable
              disabled={!item.enabled}
              key={item.key}
              onPress={() => switchSort(item.key)}
              style={{
                flex: 1,
                paddingVertical: space(2),
                alignItems: "center",
                borderRadius: radius.full,
                opacity: item.enabled ? 1 : 0.4,
                backgroundColor: active ? colors.surface : "transparent",
                ...(active ? shadowSoft : null)
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  fontFamily: fonts.heading,
                  color: active ? colors.accent700 : colors.neutral600
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height, position: "relative" }}>
        {width > 0 ? (
          <Svg height={height} pointerEvents="none" style={{ position: "absolute", inset: 0 }} width={width}>
            <Path d={d} fill="none" stroke={colors.accent200} strokeDasharray="1 9" strokeLinecap="round" strokeWidth={3} />
            {centers.map(({ xFrac, cy }, index) => (
              <Ellipse
                cx={xFrac * width}
                cy={cy + markerSize(index) / 2 + 5}
                fill="rgba(16,24,40,0.10)"
                key={`shadow-${stops[index].slug}`}
                rx={markerSize(index) * 0.42}
                ry={5}
              />
            ))}
            {scenery.map((item, index) =>
              item.kind === "tree" ? (
                <TreeG key={`scenery-${index}`} s={item.s} x={item.x} y={item.y} />
              ) : (
                <StoneG key={`scenery-${index}`} s={item.s} x={item.x} y={item.y} />
              )
            )}
          </Svg>
        ) : null}

        <View style={{ position: "absolute", top: 0, left: width * 0.26 - 60, width: 120, alignItems: "center" }}>
          <View
            style={{
              backgroundColor: colors.text,
              borderRadius: radius.full,
              paddingHorizontal: space(3),
              paddingVertical: 5,
              ...shadowSoft
            }}
          >
            <Text style={{ color: colors.bg, fontSize: 11, fontFamily: fonts.bodyMedium, letterSpacing: 0.4 }}>
              ● You are here
            </Text>
          </View>
        </View>

        {stops.map((shop, index) => {
          const { xFrac, cy } = centers[index];
          const size = markerSize(index);
          const x = xFrac * width;
          const onLeft = xFrac < 0.5;
          const metric = sort === "wait" ? shortWait(shop) : shortDistance(shop);
          const first = index === 0;
          return (
            <View key={shop.slug} style={{ position: "absolute", top: cy - size / 2, left: 0, right: 0 }}>
              <Pressable
                accessibilityLabel={`${shop.name}, ${metric}`}
                onPress={() => setSelected(shop)}
                style={({ pressed }) => [
                  {
                    position: "absolute",
                    left: x - size / 2,
                    width: size,
                    height: size,
                    borderRadius: size * 0.3,
                    backgroundColor: first ? colors.accent : colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    ...shadowCard
                  },
                  pressed && { transform: [{ scale: 0.92 }] }
                ]}
              >
                <Storefront size={size * 0.58} tint={first ? "#FFFFFF" : colors.accent600} />
              </Pressable>
              <Pressable
                onPress={() => setSelected(shop)}
                style={{
                  position: "absolute",
                  top: size / 2 - 14,
                  ...(onLeft ? { left: x + size / 2 + space(2) } : { right: width - x + size / 2 + space(2) }),
                  backgroundColor: colors.surface,
                  borderRadius: radius.full,
                  paddingHorizontal: space(2.5),
                  paddingVertical: 5,
                  ...shadowSoft,
                  ...(first ? { borderWidth: 1, borderColor: colors.accent200 } : null)
                }}
              >
                <Text
                  style={{
                    fontSize: Math.max(11, 14 - index),
                    fontFamily: fonts.bodyMedium,
                    color: first ? colors.accent700 : colors.neutral700
                  }}
                >
                  {metric}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {selected ? (
        <DetailSheet
          onClose={() => setSelected(null)}
          onInfo={(slug) => onOpenInfo(slug)}
          onJoin={(slug) => onOpenShop(slug)}
          shop={selected}
        />
      ) : null}

      {!hasLocation ? (
        <Text style={{ fontSize: 12, color: colors.neutral500, fontFamily: fonts.body, textAlign: "center", marginTop: space(1) }}>
          Allow location to route by distance.
        </Text>
      ) : null}
    </View>
  );
}
