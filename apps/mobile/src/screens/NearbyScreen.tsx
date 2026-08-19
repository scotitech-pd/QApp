import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";

import { api, type ShopSummary } from "../api";
import { colors, fonts, space } from "../theme";
import { Blueprint, Loading, Note, Screen, Tag } from "../ui";

function waitLabel(shop: ShopSummary) {
  if (shop.queuePaused) return "Paused";
  const count = shop.queueLength ?? 0;
  if (count === 0) return "No wait";
  return shop.estimatedWaitMin != null ? `~${shop.estimatedWaitMin} min wait` : `${count} in queue`;
}

function waitTone(shop: ShopSummary): "accent" | "outline" | "neutral" {
  const count = shop.queueLength ?? 0;
  if (shop.queuePaused) return "neutral";
  if (count === 0) return "accent";
  return count >= 5 ? "neutral" : "outline";
}

export function NearbyScreen({ onOpenShop }: { onOpenShop: (slug: string) => void }) {
  const [shops, setShops] = useState<ShopSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setShops(await api.listShops());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load salons.");
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <Screen
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      subtitle="Live wait times · tap a salon to join its queue"
      title="Nearby salons"
    >
      {error ? <Note tone="danger">{error}</Note> : null}
      {!shops && !error ? <Loading /> : null}
      {shops?.map((shop) => (
        <Blueprint key={shop.slug} onPress={() => onOpenShop(shop.slug)}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: space(2) }}>
            <Text style={{ fontSize: 19, fontFamily: fonts.heading, color: colors.text, flexShrink: 1 }}>
              {shop.name}
            </Text>
            <Tag label={waitLabel(shop)} pulse={!shop.queuePaused} tone={waitTone(shop)} />
          </View>
          <View style={{ flexDirection: "row", gap: space(3.5), marginTop: space(2) }}>
            <Text style={{ fontSize: 12, color: colors.neutral600, fontFamily: fonts.body }}>
              {shop.queueLength ?? 0} in queue
            </Text>
            {shop.city ? (
              <Text style={{ fontSize: 12, color: colors.neutral600, fontFamily: fonts.body, marginLeft: "auto" }}>
                {shop.city}
              </Text>
            ) : null}
          </View>
        </Blueprint>
      ))}
      {shops && shops.length === 0 ? <Note center>No salons are live yet. Pull down to refresh.</Note> : null}
      {shops && shops.length > 0 ? (
        <Note center tone="faint">
          No account needed. Tap a salon to join its queue.
        </Note>
      ) : null}
    </Screen>
  );
}
