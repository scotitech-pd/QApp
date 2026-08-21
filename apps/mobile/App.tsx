import "react-native-gesture-handler";
import { Barlow_400Regular, Barlow_500Medium, Barlow_700Bold } from "@expo-google-fonts/barlow";
import { BarlowCondensed_400Regular, BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed";
import { useFonts } from "expo-font";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { MeScreen } from "./src/screens/MeScreen";
import { NearbyScreen } from "./src/screens/NearbyScreen";
import { QueueScreen } from "./src/screens/QueueScreen";
import { ShopDetailScreen } from "./src/screens/ShopDetailScreen";
import { ShopInfoScreen } from "./src/screens/ShopInfoScreen";
import { ShopPortalScreen } from "./src/screens/ShopPortalScreen";
import { StoreProvider, useStore } from "./src/store";
import { colors, fonts, shadowFloat, space } from "./src/theme";

type Tab = "salons" | "queue" | "me" | "shop";

const TABS: Array<{ key: Tab; label: string; glyph: string }> = [
  { key: "salons", label: "Salons", glyph: "◎" },
  { key: "queue", label: "My Queue", glyph: "◷" },
  { key: "me", label: "Me", glyph: "◍" },
  { key: "shop", label: "Shop", glyph: "▦" }
];

/** https://<domain>/shops/<slug>, onq://shops/<slug>, or Expo dev URLs → shop slug. */
LogBox.ignoreAllLogs(true);

function shopSlugFromUrl(url: string | null) {
  if (!url) return null;
  const match = url.match(/\/shops\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : null;
}

function Shell() {
  const { ready, setTrackingToken } = useStore();
  const [tab, setTab] = useState<Tab>("salons");
  const [shopNav, setShopNav] = useState<{ slug: string; mode: "join" | "info" } | null>(null);

  useEffect(() => {
    const handle = (url: string | null) => {
      const slug = shopSlugFromUrl(url);
      if (slug) {
        setTab("salons");
        setShopNav({ slug, mode: "info" });
      }
    };
    Linking.getInitialURL().then(handle).catch(() => undefined);
    const sub = Linking.addEventListener("url", (event) => handle(event.url));
    return () => sub.remove();
  }, []);

  if (!ready) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.body}>
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
        {tab === "me" ? (
          <MeScreen
            onOpenShop={(slug) => {
              setTab("salons");
              setShopNav({ slug, mode: "info" });
            }}
          />
        ) : null}
        {tab === "shop" ? <ShopPortalScreen /> : null}
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={styles.tabBarSafe}>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <BottomSheetModalProvider>
        <StoreProvider>
          <StatusBar style="dark" />
          <Shell />
        </StoreProvider>
      </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBarSafe: { backgroundColor: colors.surface, ...shadowFloat },
  tabBar: { flexDirection: "row", paddingTop: space(2), paddingBottom: space(1) },
  tabItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 2 }
});
