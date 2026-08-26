import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import Svg, { Path as SvgPath, Rect as SvgRect } from "react-native-svg";

import { api, type ShopSummary } from "../api";
import { colors, fonts, radius, space } from "../theme";
import { Blueprint, Button, Loading, Note, Screen, Tag } from "../ui";
import { LayoutAnimation } from "react-native";
import { SalonPathView, SortToggle, type PathSort } from "./SalonPathView";

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

const VERTICALS: Record<string, { label: string; emoji: string }> = {
  BARBER: { label: "Barbers", emoji: "\u{1F488}" },
  SALON: { label: "Salons", emoji: "\u{1F487}" },
  BEAUTY_CLINIC: { label: "Beauty", emoji: "\u2728" },
  NAIL_STUDIO: { label: "Nails", emoji: "\u{1F485}" },
  TATTOO_STUDIO: { label: "Tattoo", emoji: "\u{1F58B}" },
  CAR_WASH: { label: "Car wash", emoji: "\u{1F697}" },
  VEHICLE_SERVICE_CENTRE: { label: "Vehicle service", emoji: "\u{1F527}" },
  PHYSIOTHERAPY_CLINIC: { label: "Physio", emoji: "\u{1FA7A}" }
};

/** Floating vertical switcher. Hidden while only one kind of shop is live —
 * it appears by itself the day a second vertical (say, a car wash) onboards. */
function VerticalFab({
  options,
  active,
  onSelect
}: {
  options: string[];
  active: string | null;
  onSelect: (next: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (options.length <= 1) return null;
  const current = active ? VERTICALS[active] : null;
  return (
    <>
      <Pressable
        accessibilityLabel="Choose a service type"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          {
            position: "absolute",
            right: space(5),
            bottom: space(6),
            minWidth: 56,
            height: 56,
            borderRadius: 28,
            paddingHorizontal: current ? space(4) : 0,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 6,
            shadowColor: colors.accent800,
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6
          },
          pressed && { transform: [{ scale: 0.94 }] }
        ]}
      >
        <Text style={{ fontSize: 22 }}>{current ? current.emoji : "\u2630"}</Text>
        {current ? (
          <Text style={{ color: "#FFFFFF", fontFamily: fonts.bodyMedium, fontSize: 13 }}>{current.label}</Text>
        ) : null}
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(29,31,32,0.35)", justifyContent: "flex-end" }}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              padding: space(5),
              paddingBottom: space(10),
              gap: space(2)
            }}
          >
            <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: colors.text, marginBottom: space(1) }}>
              What are you queuing for?
            </Text>
            {[null, ...options].map((key) => {
              const item = key ? VERTICALS[key] : { label: "Everything nearby", emoji: "\u{1F30D}" };
              const selected = active === key;
              return (
                <Pressable
                  key={key ?? "all"}
                  onPress={() => {
                    onSelect(key);
                    setOpen(false);
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: space(3),
                    padding: space(3),
                    borderRadius: radius.md,
                    backgroundColor: selected ? colors.accent100 : colors.surfaceAlt
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
                  <Text style={{ flex: 1, fontFamily: fonts.bodyMedium, fontSize: 15, color: selected ? colors.accent700 : colors.text }}>
                    {item.label}
                  </Text>
                  {selected ? <Text style={{ color: colors.accent700 }}>{"\u2713"}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
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
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sort, setSort] = useState<PathSort>("wait");
  const [vertical, setVertical] = useState<string | null>(null);
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

  const verticalOptions = Array.from(
    new Set((shops ?? []).map((shop) => shop.industryType).filter((v): v is string => Boolean(v && VERTICALS[v])))
  );
  const visibleShops = shops
    ? vertical
      ? shops.filter((shop) => shop.industryType === vertical)
      : shops
    : null;

  return (
    <View style={{ flex: 1 }}>
    <Screen
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      fixedHeader
      headerBottom={
        shops && shops.length > 0 ? (
          <SortToggle
            hasLocation={coords != null}
            onChange={(next) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSort(next);
            }}
            sort={sort}
          />
        ) : null
      }
      headerRight={<ScanButton onPress={() => setScanOpen(true)} />}
      subtitle="Live wait times · tap a salon to join its queue"
      title="Nearby salons"
    >
      <ScanModal onClose={() => setScanOpen(false)} onShop={onOpenShop} visible={scanOpen} />
      {error ? <Note tone="danger">{error}</Note> : null}
      {!shops && !error ? <Loading /> : null}
      {visibleShops && visibleShops.length > 0 ? (
        <SalonPathView onOpenShop={onOpenShop} shops={visibleShops} sort={sort} />
      ) : null}
      {visibleShops && visibleShops.length === 0 ? (
        <Note center>{vertical ? "Nothing of that type is live yet." : "No salons are live yet. Pull down to refresh."}</Note>
      ) : null}
    </Screen>
    <VerticalFab active={vertical} onSelect={setVertical} options={verticalOptions} />
    </View>
  );
}
