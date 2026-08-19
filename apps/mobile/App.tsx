import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native";

import { QueueScreen } from "./src/screens/QueueScreen";
import { NearbyScreen } from "./src/screens/NearbyScreen";
import { ShopDetailScreen } from "./src/screens/ShopDetailScreen";
import { ShopPortalScreen } from "./src/screens/ShopPortalScreen";
import { StoreProvider, useStore } from "./src/store";
import { colors, space } from "./src/theme";

type Tab = "nearby" | "queue" | "shop";

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? colors.accent : colors.muted;
  const glyph = tab === "nearby" ? "◎" : tab === "queue" ? "◷" : "▤";
  return <Text style={{ fontSize: 22, color }}>{glyph}</Text>;
}

function Shell() {
  const { ready, trackingToken, setTrackingToken } = useStore();
  const [tab, setTab] = useState<Tab>("nearby");
  const [openShopSlug, setOpenShopSlug] = useState<string | null>(null);

  if (!ready) return <View style={styles.root} />;

  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "nearby", label: "Nearby" },
    { key: "queue", label: "My Queue" },
    { key: "shop", label: "Shop" }
  ];

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === "nearby" ? (
          openShopSlug ? (
            <ShopDetailScreen
              onBack={() => setOpenShopSlug(null)}
              onJoined={(token) => {
                setTrackingToken(token);
                setOpenShopSlug(null);
                setTab("queue");
              }}
              slug={openShopSlug}
            />
          ) : (
            <NearbyScreen onOpenShop={setOpenShopSlug} />
          )
        ) : tab === "queue" ? (
          trackingToken ? (
            <QueueScreen
              onClear={() => {
                setTrackingToken(null);
                setTab("nearby");
              }}
              trackingToken={trackingToken}
            />
          ) : (
            <View style={styles.emptyQueue}>
              <Text style={styles.emptyTitle}>No active queue</Text>
              <Text style={styles.emptyBody}>
                Join a queue from the Nearby tab and your live status will appear here.
              </Text>
              <Pressable onPress={() => setTab("nearby")} style={styles.emptyCta}>
                <Text style={styles.emptyCtaLabel}>Browse shops</Text>
              </Pressable>
            </View>
          )
        ) : (
          <ShopPortalScreen />
        )}
      </View>

      <SafeAreaView style={styles.tabBarSafe}>
        <View style={styles.tabBar}>
          {tabs.map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setTab(item.key)}
                style={({ pressed }) => [styles.tabItem, pressed && { opacity: 0.7 }]}
              >
                <TabIcon active={active} tab={item.key} />
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
      <StatusBar style={tab === "nearby" || tab === "queue" ? "light" : "dark"} />
    </View>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg
  },
  body: {
    flex: 1
  },
  tabBarSafe: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  tabBar: {
    flexDirection: "row",
    paddingTop: space(2),
    paddingBottom: Platform.OS === "ios" ? 0 : space(2)
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: space(1)
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.muted
  },
  tabLabelActive: {
    color: colors.accent
  },
  emptyQueue: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space(8),
    gap: space(3),
    backgroundColor: colors.bg
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5
  },
  emptyBody: {
    fontSize: 15,
    color: colors.ink2,
    textAlign: "center",
    lineHeight: 22
  },
  emptyCta: {
    marginTop: space(2),
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: space(6),
    paddingVertical: space(3)
  },
  emptyCtaLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700"
  }
});
