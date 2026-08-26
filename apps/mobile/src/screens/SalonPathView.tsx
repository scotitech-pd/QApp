import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  LayoutAnimation,
  Linking,
  Platform,
  Pressable,
  Share,
  Text,
  UIManager,
  View
} from "react-native";
import Svg, { Ellipse, Path } from "react-native-svg";

import { FenceG, HayBaleG, SheepG, StoneG, Storefront, TractorG, TreeG } from "../scenery";
import { useStore } from "../store";

import { api, type ShopDetail, type ShopSummary } from "../api";
import { WEB_BASE_URL } from "../config";
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

function SheetStars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: "#D99A3D", letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((step) => (rating >= step - 0.25 ? "★" : "☆")).join("")}
    </Text>
  );
}

function relativeDay(iso?: string) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
}

function hoursLines(openingHours: ShopDetail["openingHours"]): string[] {
  if (!openingHours) return [];
  if (typeof openingHours === "object" && "note" in openingHours && openingHours.note) return [String(openingHours.note)];
  return Object.entries(openingHours as Record<string, string>).map(
    ([day, hours]) => `${day.charAt(0).toUpperCase()}${day.slice(1)}: ${hours}`
  );
}

/* Native two-detent sheet on @gorhom/bottom-sheet: opens at the limited
 * half view; swiping up anywhere expands to 85% and the same gesture hands
 * off into content scrolling; pulling down from scroll-top collapses, then
 * dismisses. */
function ShopLogo({
  uri,
  size,
  radius: r,
  fallbackTint
}: {
  uri?: string | null;
  size: number;
  radius: number;
  fallbackTint: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <Storefront size={size * 0.74} tint={fallbackTint} />;
  return (
    <Image
      onError={() => setFailed(true)}
      resizeMode="cover"
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: r }}
    />
  );
}

function SheetHeart({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <Svg fill={filled ? colors.amber : "none"} height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.2 4.5 6.8 4.5c2 0 3.4 1.1 4.2 2.3.8-1.2 2.2-2.3 4.2-2.3 3.6 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
        stroke={filled ? colors.amberDeep : colors.neutral600}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function DetailSheet({
  shop,
  onClose,
  onJoin
}: {
  shop: ShopSummary;
  onClose: () => void;
  onJoin: (slug: string) => void;
}) {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [detail, setDetail] = useState<ShopDetail | null>(null);
  const [index, setIndex] = useState(0);
  const { favoriteSlugs, toggleFavorite } = useStore();
  const isFavorite = favoriteSlugs.includes(shop.slug);

  useEffect(() => {
    sheetRef.current?.present();
    api.getShop(shop.slug).then(setDetail).catch(() => undefined);
  }, [shop.slug]);

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  const rating = shop.reviewSummary?.averageRating ?? detail?.reviewSummary?.averageRating ?? null;
  const ratingCount = shop.reviewSummary?.ratingCount ?? detail?.reviewSummary?.ratingCount ?? 0;
  const reviews = detail?.reviews ?? [];
  const hours = hoursLines(detail?.openingHours ?? null);
  const expanded = index >= 1;

  function openDirections() {
    if (shop.latitude == null || shop.longitude == null) return;
    const label = encodeURIComponent(shop.name);
    const url =
      Platform.OS === "ios"
        ? `maps:?daddr=${shop.latitude},${shop.longitude}&q=${label}`
        : `geo:${shop.latitude},${shop.longitude}?q=${shop.latitude},${shop.longitude}(${label})`;
    void Linking.openURL(url).catch(() => {
      void Linking.openURL(`https://maps.google.com/?daddr=${shop.latitude},${shop.longitude}`);
    });
  }

  function callShop() {
    const phone = detail?.phone;
    if (phone) void Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  }

  function shareShop() {
    void Share.share({
      message: `Skip the wait at ${shop.name} — join the queue from your phone: ${WEB_BASE_URL}/shops/${shop.slug}`
    });
  }

  return (
    <BottomSheetModal
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: colors.surface, borderRadius: 24 }}
      enablePanDownToClose
      handleIndicatorStyle={{ backgroundColor: colors.dividerSoft, width: 38, height: 5 }}
      index={0}
      onChange={setIndex}
      onDismiss={onClose}
      ref={sheetRef}
      snapPoints={["34%", "85%"]}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingHorizontal: space(5), paddingBottom: space(12) }}
        showsVerticalScrollIndicator={expanded}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
          <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accent100, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <ShopLogo fallbackTint={colors.accent700} radius={14} size={48} uri={shop.logoImageUrl} />
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 22, color: colors.text }}>
              {shop.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {rating != null && ratingCount > 0 ? (
                <>
                  <SheetStars rating={rating} />
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.neutral600 }}>
                    {rating.toFixed(1)} · {ratingCount} verified
                  </Text>
                </>
              ) : (
                <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.neutral500 }}>{shop.city ?? ""}</Text>
              )}
            </View>
          </View>
          <Pressable
            accessibilityLabel={isFavorite ? "Remove from favourites" : "Add to favourites"}
            hitSlop={10}
            onPress={() => void toggleFavorite(shop.slug)}
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isFavorite ? "#FDECEC" : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: isFavorite ? "#F3C1C1" : colors.dividerSoft
              },
              pressed && { transform: [{ scale: 0.88 }] }
            ]}
          >
            <SheetHeart filled={isFavorite} />
          </Pressable>
        </View>

        <View style={{ flexDirection: "row", gap: space(2), marginTop: space(3) }}>
          {[
            { label: "Waiting", value: String(shop.queueLength ?? 0) },
            {
              label: "Est. wait",
              value: shop.queuePaused ? "Paused" : (shop.queueLength ?? 0) === 0 ? "None" : `~${shop.estimatedWaitMin ?? "?"} min`
            },
            { label: "Distance", value: shortDistance(shop) }
          ].map((stat) => (
            <View key={stat.label} style={{ flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: space(2.5), alignItems: "center" }}>
              <Text style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
                {stat.label}
              </Text>
              <Text style={{ fontSize: 20, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>{stat.value}</Text>
            </View>
          ))}
        </View>

        <Pressable
          disabled={shop.queuePaused}
          onPress={() => {
            sheetRef.current?.dismiss();
            onJoin(shop.slug);
          }}
          style={({ pressed }) => [
            {
              minHeight: 50,
              borderRadius: radius.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
              marginTop: space(3),
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

        {!expanded ? (
          <Pressable onPress={() => sheetRef.current?.snapToIndex(1)} style={{ paddingVertical: space(2), marginTop: space(1) }}>
            <Text style={{ textAlign: "center", fontSize: 14, color: colors.accent700, fontFamily: fonts.bodyMedium }}>
              View details, ratings & reviews ↑
            </Text>
          </Pressable>
        ) : (
          <View style={{ height: space(4) }} />
        )}

        {expanded ? (
          <>
        <View style={{ flexDirection: "row", gap: space(2), marginTop: space(2) }}>
          {[
            { label: "Directions", action: openDirections, enabled: shop.latitude != null },
            { label: "Call", action: callShop, enabled: Boolean(detail?.phone) },
            { label: "Share", action: shareShop, enabled: true }
          ].map((item) => (
            <Pressable
              disabled={!item.enabled}
              key={item.label}
              onPress={item.action}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minHeight: 42,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.surfaceAlt,
                  opacity: item.enabled ? 1 : 0.4
                },
                pressed && { transform: [{ scale: 0.96 }] }
              ]}
            >
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.accent700 }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {detail?.publicDescription || hours.length > 0 ? (
          <View style={{ marginTop: space(4) }}>
            <Text style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium, marginBottom: space(2) }}>
              About
            </Text>
            {detail?.publicDescription ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink2 }}>{detail.publicDescription}</Text>
            ) : null}
            {hours.length > 0 ? (
              <View style={{ marginTop: space(2) }}>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral700, marginBottom: 2 }}>Opening hours</Text>
                {hours.map((line) => (
                  <Text key={line} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.neutral600 }}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ marginTop: space(4), flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: space(2) }}>
          <Text style={{ fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
            Reviews
          </Text>
          <Text style={{ fontSize: 11, color: colors.success, fontFamily: fonts.bodyMedium }}>✓ Verified visits only</Text>
        </View>
        {reviews.length === 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: colors.neutral500, textAlign: "center", paddingVertical: space(3) }}>
            No written reviews yet — ratings come only from completed visits.
          </Text>
        ) : (
          reviews.slice(0, 8).map((review, reviewIndex) => {
            const name = review.customerName ?? review.customerFirstName ?? review.customer?.firstName ?? "Customer";
            const when = relativeDay(review.createdAt);
            return (
              <View key={review.id ?? reviewIndex} style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space(3), marginBottom: space(2) }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text }}>{name}</Text>
                  <SheetStars rating={review.rating} size={12} />
                </View>
                {review.comment ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.ink2, marginTop: 4 }}>
                    {review.comment}
                  </Text>
                ) : null}
                {when ? <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.neutral500, marginTop: 4 }}>{when}</Text> : null}
              </View>
            );
          })
        )}
        {reviews.length > 0 ? (
          <Text style={{ fontFamily: fonts.body, fontSize: 12, color: colors.neutral500, textAlign: "center", marginTop: space(1) }}>
            Every rating comes from a real completed visit — no anonymous reviews.
          </Text>
        ) : null}
          </>
        ) : null}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

export function SortToggle({
  sort,
  hasLocation,
  onChange
}: {
  sort: PathSort;
  hasLocation: boolean;
  onChange: (next: PathSort) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.full,
        padding: 3
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
            onPress={() => onChange(item.key)}
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
  );
}

export function SalonPathView({
  shops,
  sort,
  onOpenShop
}: {
  shops: ShopSummary[];
  sort: PathSort;
  onOpenShop: (slug: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<ShopSummary | null>(null);

  const stops = useMemo(() => {
    const list = [...shops];
    if (sort === "wait") list.sort((a, b) => waitScore(a) - waitScore(b));
    else list.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
    return list.slice(0, 6);
  }, [shops, sort]);

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
  const scenery: Array<{ kind: "tree" | "stone" | "hay" | "fence" | "sheep" | "tractor"; x: number; y: number; s: number }> = [];
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
      const clampX = (value: number) => Math.min(width - 34, Math.max(34, value));
      // Deterministic variety so the roadside feels lived-in but never reshuffles.
      const leftKinds = ["tree", "fence", "hay", "tree", "sheep", "stone"] as const;
      const rightKinds = ["stone", "tree", "sheep", "hay", "tree", "fence"] as const;
      scenery.push({ kind: leftKinds[index % leftKinds.length], x: clampX(t1x), y: t1y, s: depthScale(t1y) });
      scenery.push({ kind: rightKinds[(index + 2) % rightKinds.length], x: clampX(t2x), y: t2y, s: depthScale(t2y) * 0.85 });
      // One tractor working the field, roughly a third of the way down.
      if (index === Math.min(1, centers.length - 1)) {
        scenery.push({ kind: "tractor", x: clampX(t2x + (j > 0.5 ? 30 : -30)), y: t2y + 26, s: depthScale(t2y) * 0.9 });
      }

      prevX = x;
      prevY = cy;
    });
  }

  return (
    <View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ height, position: "relative" }}>
        {width > 0 ? (
          <Svg height={height} pointerEvents="none" style={{ position: "absolute", inset: 0 }} width={width}>
            {/* Country lane: earth base, soft edges, two faint cart ruts. */}
            <Path d={d} fill="none" stroke="#C4A882" strokeLinecap="round" strokeOpacity={0.55} strokeWidth={26} />
            <Path d={d} fill="none" stroke="#D9C29B" strokeLinecap="round" strokeWidth={20} />
            <Path d={d} fill="none" stroke="#CBB086" strokeLinecap="round" strokeOpacity={0.75} strokeWidth={3} />
            <Path d={d} fill="none" stroke="#C0A379" strokeDasharray="10 12" strokeLinecap="round" strokeOpacity={0.5} strokeWidth={2} />
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
            {scenery.map((item, index) => {
              const k = `scenery-${index}`;
              if (item.kind === "tree") return <TreeG key={k} s={item.s} x={item.x} y={item.y} />;
              if (item.kind === "hay") return <HayBaleG key={k} s={item.s} x={item.x} y={item.y} />;
              if (item.kind === "fence") return <FenceG key={k} s={item.s} x={item.x} y={item.y} />;
              if (item.kind === "sheep") return <SheepG key={k} s={item.s} x={item.x} y={item.y} />;
              if (item.kind === "tractor") return <TractorG key={k} s={item.s} x={item.x} y={item.y} />;
              return <StoneG key={k} s={item.s} x={item.x} y={item.y} />;
            })}
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
                <ShopLogo
                  fallbackTint={first ? "#FFFFFF" : colors.accent600}
                  radius={size * 0.22}
                  size={size * 0.78}
                  uri={shop.logoImageUrl}
                />
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
          onJoin={(slug) => onOpenShop(slug)}
          shop={selected}
        />
      ) : null}

    </View>
  );
}
