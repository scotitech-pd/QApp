import { Barlow_400Regular, Barlow_500Medium, Barlow_700Bold } from "@expo-google-fonts/barlow";
import { BarlowCondensed_400Regular, BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";

import { NearbyScreen } from "./src/screens/NearbyScreen";
import { QueueScreen } from "./src/screens/QueueScreen";
import { ShopDetailScreen } from "./src/screens/ShopDetailScreen";
import { ShopInfoScreen } from "./src/screens/ShopInfoScreen";
import { ShopPortalScreen } from "./src/screens/ShopPortalScreen";
import { StoreProvider, useStore } from "./src/store";
import { colors, fonts, shadowFloat, space } from "./src/theme";

type Tab = "salons" | "queue" | "shop";

const TABS: Array<{ key: Tab; label: string; glyph: string }> = [
  { key: "salons", label: "Salons", glyph: "◎" },
  { key: "queue", label: "My Queue", glyph: "◷" },
  { key: "shop", label: "Shop", glyph: "▦" }
];

function Shell() {
  const { ready, setTrackingToken } = useStore();
  const [tab, setTab] = useState<Tab>("salons");
  const [shopNav, setShopNav] = useState<{ slug: string; mode: "join" | "info" } | null>(null);

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.body}>
        {tab === "salons" ? (
          shopNav?.mode === "join" ? (
            <ShopDetailScreen
              onBack={() => setShopNav(null)}
              onInfo={(slug) => setShopNav({ slug, mode: "info" })}
              onJoined={(token) => {
                setTrackingToken(token);
                setShopNav(null);
                setTab("queue");
              }}
              slug={shopNav.slug}
            />
          ) : shopNav?.mode === "info" ? (
            <ShopInfoScreen
              onBack={() => setShopNav(null)}
              onJoin={(slug) => setShopNav({ slug, mode: "join" })}
              slug={shopNav.slug}
            />
          ) : (
            <NearbyScreen
              onOpenInfo={(slug) => setShopNav({ slug, mode: "info" })}
              onOpenShop={(slug) => setShopNav({ slug, mode: "join" })}
            />
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
                  if (item.key !== "salons") setShopNav(null);
                }}
                style={styles.tabItem}
              >
                <Text style={{ fontSize: 20, color: active ? colors.accent700 : colors.neutral500 }}>{item.glyph}</Text>
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: active ? fonts.bodyMedium : fonts.body,
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    color: active ? colors.accent700 : colors.neutral500
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
  const [fontsLoaded] = useFonts({
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_700Bold,
    BarlowCondensed_400Regular,
    BarlowCondensed_600SemiBold
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

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
  tabBarSafe: { backgroundColor: colors.surface, ...shadowFloat },
  tabBar: { flexDirection: "row", paddingTop: space(2), paddingBottom: space(1) },
  tabItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 2 }
});
