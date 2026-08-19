import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api, type ShopSummary } from "../api";
import { colors, space } from "../theme";
import { Card, Loading, Note, Pill, Screen } from "../ui";

function waitLine(shop: ShopSummary) {
  if (shop.queuePaused) return "Not taking new customers right now";
  const count = shop.queueLength ?? 0;
  if (count === 0) return "No wait — walk right in";
  const mins = shop.estimatedWaitMin;
  const waitPart = mins != null ? ` · about ${mins} min` : "";
  return `${count} waiting${waitPart}`;
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
      subtitle="Live waits, updated as queues move. Join before you leave home."
      title="Salons near you"
    >
      {error ? <Note tone="danger">{error}</Note> : null}
      {!shops && !error ? <Loading /> : null}
      {shops?.map((shop) => (
        <Pressable key={shop.slug} onPress={() => onOpenShop(shop.slug)}>
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: space(2) }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.ink }}>{shop.name}</Text>
                {shop.city ? (
                  <Text style={{ color: colors.muted, fontSize: 14, marginTop: 2 }}>{shop.city}</Text>
                ) : null}
                <Text style={{ color: colors.ink2, fontSize: 15, marginTop: space(2), fontWeight: "600" }}>
                  {waitLine(shop)}
                </Text>
              </View>
              <Pill label={shop.queuePaused ? "Paused" : "Open"} tone={shop.queuePaused ? "warn" : "good"} />
            </View>
          </Card>
        </Pressable>
      ))}
      {shops && shops.length === 0 ? (
        <Note>No salons are live yet. Pull down to refresh.</Note>
      ) : null}
    </Screen>
  );
}
