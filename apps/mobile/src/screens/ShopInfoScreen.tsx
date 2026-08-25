import React, { useEffect, useState } from "react";
import { Linking, Platform, Pressable, Share, Text, View } from "react-native";
import Svg, { Path as SvgPath, Rect as SvgRect } from "react-native-svg";

import { api, type ShopDetail } from "../api";
import { useStore } from "../store";
import { WEB_BASE_URL } from "../config";
import { colors, fonts, radius, shadowSoft, space } from "../theme";
import { BackLink, Blueprint, Button, Kicker, Loading, Note, Screen, Tag } from "../ui";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <Text style={{ fontSize: size, color: colors.amber, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map((step) => (rating >= step - 0.25 ? "★" : "☆")).join("")}
    </Text>
  );
}

function StorefrontChip() {
  const tint = colors.accent700;
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: 15,
        backgroundColor: colors.accent100,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Svg fill="none" height={30} viewBox="0 0 24 24" width={30}>
        <SvgPath
          d="M4 3.5h16l1.5 4.2c0 1.5-1.2 2.7-2.7 2.7-1.2 0-2.2-.8-2.6-1.9-.4 1.1-1.4 1.9-2.6 1.9s-2.2-.8-2.6-1.9c-.4 1.1-1.4 1.9-2.6 1.9S6.2 9.6 5.8 8.5C5.4 9.6 4.4 10.4 3.2 10.4 1.7 10.4.5 9.2.5 7.7L2 3.5h2Z"
          fill={tint}
          opacity={0.9}
        />
        <SvgPath d="M4.5 11v8.2c0 .7.6 1.3 1.3 1.3h12.4c.7 0 1.3-.6 1.3-1.3V11" stroke={tint} strokeLinecap="round" strokeWidth={1.8} />
        <SvgRect fill={tint} height={5.4} opacity={0.85} rx={0.8} width={4.2} x={13.2} y={14.2} />
      </Svg>
    </View>
  );
}

function HeartIcon({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <Svg fill={filled ? colors.danger : "none"} height={size} viewBox="0 0 24 24" width={size}>
      <SvgPath
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.2 4.5 6.8 4.5c2 0 3.4 1.1 4.2 2.3.8-1.2 2.2-2.3 4.2-2.3 3.6 0 5.4 3.5 4.1 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
        stroke={filled ? colors.danger : colors.neutral600}
        strokeLinejoin="round"
        strokeWidth={1.8}
      />
    </Svg>
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
  const entries = Object.entries(openingHours as Record<string, string>);
  return entries.map(([day, hours]) => `${day.charAt(0).toUpperCase()}${day.slice(1)}: ${hours}`);
}

export function ShopInfoScreen({
  slug,
  onBack,
  onJoin
}: {
  slug: string;
  onBack: () => void;
  onJoin: (slug: string) => void;
}) {
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { favoriteSlugs, toggleFavorite } = useStore();
  const isFavorite = favoriteSlugs.includes(slug);

  useEffect(() => {
    let active = true;
    api
      .getShop(slug)
      .then((detail) => {
        if (active) setShop(detail);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load this salon.");
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (!shop) {
    return (
      <Screen headerLeft={<BackLink label="Back" onPress={onBack} />} title={error ? "Something went wrong" : "Loading…"}>
        {error ? <Note tone="danger">{error}</Note> : <Loading />}
      </Screen>
    );
  }

  const rating = shop.reviewSummary?.averageRating ?? null;
  const ratingCount = shop.reviewSummary?.ratingCount ?? 0;
  const reviews = shop.reviews ?? [];
  const hours = hoursLines(shop.openingHours);
  const waiting = shop.queueLength ?? 0;

  function openDirections() {
    if (shop?.latitude == null || shop.longitude == null) return;
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
    if (shop?.phone) void Linking.openURL(`tel:${shop.phone.replace(/\s/g, "")}`);
  }

  function shareShop() {
    if (!shop) return;
    void Share.share({
      message: `Skip the wait at ${shop.name} — join the queue from your phone: ${WEB_BASE_URL}/shops/${shop.slug}`
    });
  }

  return (
    <Screen
      headerLeft={<BackLink label="Salons" onPress={onBack} />}
      title=""
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: space(3), marginTop: -space(6) }}>
        <StorefrontChip />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: colors.text }} numberOfLines={2}>
            {shop.name}
          </Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral600 }}>
            {[shop.addressLine1, shop.city].filter(Boolean).join(", ")}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={isFavorite ? "Remove from favourites" : "Add to favourites"}
          hitSlop={10}
          onPress={() => void toggleFavorite(slug)}
          style={({ pressed }) => [
            {
              width: 48,
              height: 48,
              borderRadius: 15,
              backgroundColor: isFavorite ? "#FDECEC" : colors.surface,
              borderWidth: 1,
              borderColor: isFavorite ? "#F3C1C1" : colors.dividerSoft,
              alignItems: "center",
              justifyContent: "center",
              ...shadowSoft
            },
            pressed && { transform: [{ scale: 0.88 }] }
          ]}
        >
          <HeartIcon filled={isFavorite} />
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: space(2), marginTop: space(3), marginBottom: space(3), flexWrap: "wrap" }}>
        <Tag label={shop.queuePaused ? "Paused" : "Open · live queue"} pulse={!shop.queuePaused} tone={shop.queuePaused ? "neutral" : "accent"} />
        {rating != null && ratingCount > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Stars rating={rating} />
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral700 }}>
              {rating.toFixed(1)} · {ratingCount} verified
            </Text>
          </View>
        ) : (
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral500 }}>No ratings yet</Text>
        )}
      </View>

      <Blueprint style={{ flexDirection: "row", gap: space(2), paddingVertical: space(3) }}>
        {[
          { label: "Waiting", value: String(waiting) },
          { label: "Est. wait", value: shop.queuePaused ? "—" : waiting === 0 ? "None" : `~${shop.estimatedWaitMin ?? "?"} min` },
          { label: "Chairs", value: String(shop.serviceStationsCount ?? "—") }
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", color: colors.neutral600, fontFamily: fonts.bodyMedium }}>
              {stat.label}
            </Text>
            <Text style={{ fontSize: 21, fontFamily: fonts.heading, color: colors.text, marginTop: 2 }}>{stat.value}</Text>
          </View>
        ))}
      </Blueprint>

      <Button disabled={shop.queuePaused} label={shop.queuePaused ? "Queue is paused" : "Join the queue"} onPress={() => onJoin(shop.slug)} />

      <View style={{ flexDirection: "row", gap: space(2), marginTop: space(3), marginBottom: space(4) }}>
        {[
          { label: "Directions", action: openDirections, enabled: shop.latitude != null },
          { label: "Call", action: callShop, enabled: Boolean(shop.phone) },
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
                backgroundColor: colors.surface,
                opacity: item.enabled ? 1 : 0.4,
                ...shadowSoft
              },
              pressed && { transform: [{ scale: 0.96 }] }
            ]}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.accent700 }}>{item.label}</Text>
          </Pressable>
        ))}
      </View>

      {shop.publicDescription || hours.length > 0 ? (
        <>
          <View style={{ marginBottom: space(2) }}>
            <Kicker>About</Kicker>
          </View>
          <Blueprint>
            {shop.publicDescription ? (
              <Text style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.ink2, marginBottom: hours.length ? space(3) : 0 }}>
                {shop.publicDescription}
              </Text>
            ) : null}
            {hours.length > 0 ? (
              <View>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral700, marginBottom: 4 }}>Opening hours</Text>
                {hours.map((line) => (
                  <Text key={line} style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 20, color: colors.neutral600 }}>
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </Blueprint>
        </>
      ) : null}

      <View style={{ marginBottom: space(2), flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Kicker>Reviews</Kicker>
        <Text style={{ fontSize: 11, color: colors.success, fontFamily: fonts.bodyMedium }}>✓ Verified visits only</Text>
      </View>
      {reviews.length === 0 ? (
        <Blueprint>
          <Note center tone="faint">
            No written reviews yet. Ratings here come only from customers after a completed visit — join the queue and
            you can rate your visit when it's done.
          </Note>
        </Blueprint>
      ) : (
        <>
          {reviews.slice(0, 8).map((review, index) => {
            const name = review.customerName ?? review.customerFirstName ?? review.customer?.firstName ?? "Customer";
            const when = relativeDay(review.createdAt);
            return (
              <Blueprint key={review.id ?? index} style={{ paddingVertical: space(3) }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text }}>{name}</Text>
                  <Stars rating={review.rating} size={12} />
                </View>
                {review.comment ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 13.5, lineHeight: 20, color: colors.ink2, marginTop: space(1) }}>
                    {review.comment}
                  </Text>
                ) : null}
                {when ? (
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: colors.neutral500, marginTop: space(1) }}>{when}</Text>
                ) : null}
              </Blueprint>
            );
          })}
          <Note center tone="faint">
            Every rating comes from a real completed visit — OnQ has no anonymous reviews.
          </Note>
        </>
      )}
    </Screen>
  );
}
