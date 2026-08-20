import React, { useMemo, useRef, useState } from "react";
import { Animated, LayoutAnimation, Platform, Pressable, Text, UIManager, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

import type { ShopSummary } from "../api";
import { colors, fonts, radius, shadowCard, shadowSoft, space } from "../theme";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type PathSort = "wait" | "distance";

const STOP_HEIGHT = 148;
const TOP_PAD = 64;
const NODE_R = 15;

function waitScore(shop: ShopSummary) {
  if (shop.queuePaused) return Number.MAX_SAFE_INTEGER;
  return shop.estimatedWaitMin ?? 0;
}

function waitLine(shop: ShopSummary) {
  if (shop.queuePaused) return "Paused — not taking joins";
  const count = shop.queueLength ?? 0;
  if (count === 0) return "No wait — walk right in";
  return `${count} waiting · ~${shop.estimatedWaitMin ?? "?"} min`;
}

function distanceLine(shop: ShopSummary) {
  const km = shop.distanceKm;
  if (km == null) return null;
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`;
  return `${km.toFixed(1)} km`;
}

export function SalonPathView({
  shops,
  hasLocation,
  onOpenShop
}: {
  shops: ShopSummary[];
  hasLocation: boolean;
  onOpenShop: (slug: string) => void;
}) {
  const [sort, setSort] = useState<PathSort>("wait");
  const [width, setWidth] = useState(0);

  const stops = useMemo(() => {
    const list = [...shops];
    if (sort === "wait") {
      list.sort((a, b) => waitScore(a) - waitScore(b));
    } else {
      list.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
    }
    return list.slice(0, 6);
  }, [shops, sort]);

  function switchSort(next: PathSort) {
    if (next === sort) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSort(next);
  }

  const height = TOP_PAD + stops.length * STOP_HEIGHT;

  // Winding trail: start under "You", then alternate left / right nodes.
  const nodeX = (index: number) => (index % 2 === 0 ? 0.22 : 0.78) * width;
  const nodeY = (index: number) => TOP_PAD + index * STOP_HEIGHT + STOP_HEIGHT / 2 - space(6);

  let d = "";
  if (width > 0 && stops.length > 0) {
    const startX = 0.22 * width;
    d = `M ${startX} ${18}`;
    let prevX = startX;
    let prevY = 18;
    stops.forEach((_, index) => {
      const x = nodeX(index);
      const y = nodeY(index);
      const midY = (prevY + y) / 2;
      d += ` C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`;
      prevX = x;
      prevY = y;
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
          marginBottom: space(3)
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
      {!hasLocation ? (
        <Text style={{ fontSize: 12, color: colors.neutral500, fontFamily: fonts.body, textAlign: "center", marginBottom: space(2) }}>
          Allow location to route by distance.
        </Text>
      ) : null}

      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height, position: "relative" }}>
        {width > 0 ? (
          <Svg height={height} pointerEvents="none" style={{ position: "absolute", inset: 0 }} width={width}>
            <Path d={d} fill="none" stroke={colors.accent200} strokeDasharray="1 10" strokeLinecap="round" strokeWidth={3.5} />
            {stops.map((shop, index) => (
              <Circle
                cx={nodeX(index)}
                cy={nodeY(index)}
                fill={index === 0 ? colors.accent : colors.surface}
                key={shop.slug}
                r={NODE_R}
                stroke={index === 0 ? colors.accent : colors.accent200}
                strokeWidth={2}
              />
            ))}
          </Svg>
        ) : null}

        {/* "You are here" origin */}
        <View style={{ position: "absolute", top: 0, left: width * 0.22 - 60, width: 120, alignItems: "center" }}>
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
          const left = index % 2 === 0;
          const y = nodeY(index);
          const dist = distanceLine(shop);
          return (
            <View key={shop.slug} style={{ position: "absolute", top: y - 44, left: 0, right: 0 }}>
              {/* rank number inside the node */}
              <Text
                style={{
                  position: "absolute",
                  top: 44 - space(6) + 33,
                  left: nodeX(index) - NODE_R,
                  width: NODE_R * 2,
                  textAlign: "center",
                  fontFamily: fonts.heading,
                  fontSize: 15,
                  color: index === 0 ? "#FFFFFF" : colors.accent700
                }}
              >
                {index + 1}
              </Text>
              <Pressable
                onPress={() => onOpenShop(shop.slug)}
                style={({ pressed }) => [
                  {
                    position: "absolute",
                    top: 0,
                    width: width * 0.56,
                    ...(left ? { left: width * 0.34 } : { right: width * 0.30 }),
                    backgroundColor: colors.surface,
                    borderRadius: radius.lg,
                    padding: space(3),
                    ...shadowCard
                  },
                  index === 0 && { borderWidth: 1.5, borderColor: colors.accent200 },
                  pressed && { transform: [{ scale: 0.97 }] }
                ]}
              >
                {index === 0 ? (
                  <Text style={{ fontSize: 9, letterSpacing: 1, fontFamily: fonts.bodyMedium, color: colors.accent, textTransform: "uppercase", marginBottom: 2 }}>
                    Best pick
                  </Text>
                ) : null}
                <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 17, color: colors.text }}>
                  {shop.name}
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.neutral600, fontFamily: fonts.body, marginTop: 2 }}>
                  {waitLine(shop)}
                </Text>
                {dist ? (
                  <Text style={{ fontSize: 11.5, color: colors.neutral500, fontFamily: fonts.bodyMedium, marginTop: 2 }}>
                    {dist} away
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>

      {shops.length > stops.length ? (
        <Text style={{ fontSize: 12, color: colors.neutral500, fontFamily: fonts.body, textAlign: "center", marginTop: space(1) }}>
          Showing the best {stops.length} — switch to List for all {shops.length}.
        </Text>
      ) : null}
    </View>
  );
}
