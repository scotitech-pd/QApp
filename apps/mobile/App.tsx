import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { NearbyScreen } from "./src/screens/NearbyScreen";
import { QueueScreen } from "./src/screens/QueueScreen";
import { ShopDetailScreen } from "./src/screens/ShopDetailScreen";
import { ShopPortalScreen } from "./src/screens/ShopPortalScreen";
import { StoreProvider, useStore } from "./src/store";
import { colors, space } from "./src/theme";

type Tab = "salons" | "queue" | "shop";

const TABS: Array<{ key: Tab; label: string; glyph: string }> = [
  { key: "salons", label: "Salons", glyph: "◎" },
  { key: "queue", label: "My Queue", glyph: "◷" },
  { key: "shop", label: "Shop", glyph: "▦" }
];

function Shell() {
  const { ready, setTrackingToken } = useStore();
  const [tab, setTab] = useState<Tab>("salons");
  const [openShopSlug, setOpenShopSlug] = useState<string | null>(null);

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.body}>
        {tab === "salons" ? (
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
        ) : null}
        {tab === "queue" ? <QueueScreen onFindSalon={() => setTab("salons")} /> : null}
        {tab === "shop" ? <ShopPortalScreen /> : null}
      </SafeAreaView>

      <SafeAreaView style={styles.tabBarSafe}>
        <View style={styles.tabBar}>
          {TABS.map((item) => {
            const active = tab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => {
                  setTab(item.key);
                  if (item.key !== "salons") setOpenShopSlug(null);
                }}
                style={styles.tabItem}
              >
                <Text style={{ fontSize: 22, color: active ? colors.accent : colors.muted }}>{item.glyph}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: active ? "700" : "500",
                    color: active ? colors.accent : colors.muted
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <StatusBar style="dark" />
      <Shell />
    </StoreProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBarSafe: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  tabBar: { flexDirection: "row", paddingTop: space(2), paddingBottom: space(1) },
  tabItem: { flex: 1, alignItems: "center", gap: 2 }
});
