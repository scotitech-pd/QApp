import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

import { api, type ShopSummary } from "../api";
import { colors, radius, space } from "../theme";
import { Body, Card, Eyebrow, LiveDot, Pill, Title } from "../ui";

function waitLabel(shop: ShopSummary) {
  if (shop.queuePaused) return "Paused";
  const wait = shop.estimatedWaitMin;
  if (wait == null || wait <= 0) return "No wait";
  return `~${wait} min`;
}

function queueLabel(count?: number) {
  if (!count) return "No one waiting";
  if (count === 1) return "1 person waiting";
  return `${count} people waiting`;
}

export function NearbyScreen({ onOpenShop }: { onOpenShop: (slug: string) => void }) {
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const items = await api.listShops();
      setShops(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load shops.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={shops}
      keyExtractor={(shop) => shop.id}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Eyebrow text="Q-App" onDark />
          <Title text="Skip the wait. Join from anywhere." onDark size={28} />
          <Body
            onDark
            text="See live queues near you, hold your place from your phone, and show up right when it matters."
          />
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <Card>
            <Body text="Finding live queues..." />
          </Card>
        ) : (
          <Card>
            <Title text={error ? "Can't reach Q-App" : "No shops live yet"} size={18} />
            <Body text={error ?? "Check back soon - shops appear here the moment they go live."} />
          </Card>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load();
          }}
          tintColor={colors.cream}
        />
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => onOpenShop(item.slug)}>
          {({ pressed }) => (
            <Card style={[styles.shopCard, pressed && { transform: [{ scale: 0.985 }] }]}>
              <View style={styles.shopTopline}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.shopName}>{item.name}</Text>
                  <Text style={styles.shopMeta}>
                    {[item.addressLine1, item.city].filter(Boolean).join(", ") || "Location on map"}
                  </Text>
                </View>
                <LiveDot />
              </View>
              <View style={styles.shopStats}>
                <View style={styles.waitBlock}>
                  <Text style={styles.waitValue}>{waitLabel(item)}</Text>
                  <Text style={styles.waitLabel}>current wait</Text>
                </View>
                <View style={{ flex: 1, gap: space(1) }}>
                  <Body text={queueLabel(item.queueLength)} />
                  {item.reviewSummary?.averageRating ? (
                    <Body
                      text={`★ ${item.reviewSummary.averageRating.toFixed(1)} (${item.reviewSummary.ratingCount})`}
                      style={{ color: colors.warn }}
                    />
                  ) : null}
                </View>
                {item.queuePaused ? <Pill label="Paused" tone="warn" /> : <Pill label="Open" tone="good" />}
              </View>
            </Card>
          )}
        </Pressable>
      )}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.navy
  },
  listContent: {
    padding: space(5),
    paddingBottom: space(24),
    gap: space(4)
  },
  hero: {
    gap: space(3),
    paddingVertical: space(6),
    paddingHorizontal: space(1)
  },
  shopCard: {
    gap: space(4)
  },
  shopTopline: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space(3)
  },
  shopName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3
  },
  shopMeta: {
    fontSize: 13,
    color: colors.muted
  },
  shopStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(4)
  },
  waitBlock: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    paddingVertical: space(2),
    paddingHorizontal: space(4),
    alignItems: "center",
    minWidth: 96
  },
  waitValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.accent,
    letterSpacing: -0.3
  },
  waitLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  }
});
