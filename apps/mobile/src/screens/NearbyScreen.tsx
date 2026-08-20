import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Path as SvgPath, Rect as SvgRect } from "react-native-svg";

import { api, type ShopSummary } from "../api";
import { colors, fonts, radius, space } from "../theme";
import { Blueprint, Button, Loading, Note, Screen, Tag } from "../ui";
import { SalonPathView } from "./SalonPathView";

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

function QrGlyph() {
  const s = "#FFFFFF";
  return (
    <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
      <SvgRect height={7} rx={1.5} stroke={s} strokeWidth={1.8} width={7} x={3} y={3} />
      <SvgRect height={7} rx={1.5} stroke={s} strokeWidth={1.8} width={7} x={14} y={3} />
      <SvgRect height={7} rx={1.5} stroke={s} strokeWidth={1.8} width={7} x={3} y={14} />
      <SvgPath d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h1.5M20 14v1.5" stroke={s} strokeWidth={1.8} />
    </Svg>
  );
}

function ScanButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Scan a shop QR code"
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 44,
          height: 44,
          borderRadius: 13,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: colors.accent,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3
        },
        pressed && { transform: [{ scale: 0.92 }] }
      ]}
    >
      <QrGlyph />
    </Pressable>
  );
}

function ScanModal({
  visible,
  onClose,
  onShop
}: {
  visible: boolean;
  onClose: () => void;
  onShop: (slug: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const handled = useRef(false);

  useEffect(() => {
    if (visible) {
      handled.current = false;
      if (permission && !permission.granted && permission.canAskAgain) void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  function handleScan(data: string) {
    if (handled.current) return;
    const match = data.match(/\/shops\/([a-z0-9-]+)/i);
    if (!match) return;
    handled.current = true;
    onClose();
    onShop(match[1].toLowerCase());
  }

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={{ flex: 1, backgroundColor: colors.text }}>
        {permission?.granted ? (
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }: { data: string }) => handleScan(data)}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space(8), gap: space(4) }}>
            <Text style={{ color: colors.bg, fontFamily: fonts.body, fontSize: 15, textAlign: "center" }}>
              OnQ needs camera access to scan the shop's QR code.
            </Text>
            <Button kind="secondary" label="Allow camera" onPress={() => void requestPermission()} small />
          </View>
        )}
        <View style={{ position: "absolute", top: 64, left: 0, right: 0, alignItems: "center" }}>
          <Text
            style={{
              color: "#fff",
              fontFamily: fonts.heading,
              fontSize: 18,
              backgroundColor: "rgba(29,31,32,0.65)",
              paddingHorizontal: space(3),
              paddingVertical: space(1.5)
            }}
          >
            Point at the shop's QR code
          </Text>
        </View>
        <View style={{ position: "absolute", bottom: 48, left: space(8), right: space(8) }}>
          <Button kind="secondary" label="Cancel" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

export function NearbyScreen({
  onOpenShop,
  onOpenInfo
}: {
  onOpenShop: (slug: string) => void;
  onOpenInfo: (slug: string) => void;
}) {
  const [shops, setShops] = useState<ShopSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [view, setView] = useState<"path" | "list">("path");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const position = coordsRef.current;
      setShops(await api.listShops(position?.latitude, position?.longitude));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load salons.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!active) return;
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        coordsRef.current = next;
        setCoords(next);
        void load();
      } catch {
        // No location — wait-based routing still works.
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

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
      headerRight={<ScanButton onPress={() => setScanOpen(true)} />}
      subtitle="Live wait times · tap a salon to join its queue"
      title="Nearby salons"
    >
      <ScanModal onClose={() => setScanOpen(false)} onShop={onOpenShop} visible={scanOpen} />
      {error ? <Note tone="danger">{error}</Note> : null}
      {!shops && !error ? <Loading /> : null}
      {shops && shops.length > 0 ? (
        <View style={{ flexDirection: "row", justifyContent: "center", gap: space(2), marginBottom: space(3) }}>
          {(
            [
              { key: "path" as const, label: "Route" },
              { key: "list" as const, label: "List" }
            ]
          ).map((item) => {
            const active = view === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setView(item.key)}
                style={{
                  paddingHorizontal: space(4),
                  paddingVertical: space(1.5),
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.text : "transparent"
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontFamily: fonts.bodyMedium,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: active ? colors.bg : colors.neutral600
                  }}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {shops && shops.length > 0 && view === "path" ? (
        <SalonPathView hasLocation={coords != null} onOpenInfo={onOpenInfo} onOpenShop={onOpenShop} shops={shops} />
      ) : null}
      {view === "list" && shops?.map((shop) => (
        <Blueprint key={shop.slug} onPress={() => onOpenInfo(shop.slug)}>
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
      {shops && shops.length > 0 && view === "list" ? (
        <Note center tone="faint">
          No account needed. Tap a salon for details and reviews.
        </Note>
      ) : null}
    </Screen>
  );
}
