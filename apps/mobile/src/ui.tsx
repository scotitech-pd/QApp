import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type ViewStyle
} from "react-native";

import { colors, fonts, radius, space } from "./theme";

/* Blueprint design language: square corners, hairline borders,
 * corner registration ticks, condensed headings, pulsing live tags. */

const TICK = 11;
const TICK_OFFSET = -6;

function CornerTick({ position }: { position: "tl" | "tr" | "bl" | "br" }) {
  const anchor: ViewStyle = {
    position: "absolute",
    width: TICK,
    height: TICK,
    ...(position === "tl" ? { top: TICK_OFFSET, left: TICK_OFFSET } : {}),
    ...(position === "tr" ? { top: TICK_OFFSET, right: TICK_OFFSET } : {}),
    ...(position === "bl" ? { bottom: TICK_OFFSET, left: TICK_OFFSET } : {}),
    ...(position === "br" ? { bottom: TICK_OFFSET, right: TICK_OFFSET } : {})
  };
  const barColor = "rgba(29, 31, 32, 0.55)";
  return (
    <View pointerEvents="none" style={anchor}>
      <View style={{ position: "absolute", left: 5, top: 0, width: 1, height: TICK, backgroundColor: barColor }} />
      <View style={{ position: "absolute", top: 5, left: 0, width: TICK, height: 1, backgroundColor: barColor }} />
    </View>
  );
}

export function Blueprint({
  children,
  style,
  onPress
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const frame = (
    <View style={[styles.blueprint, style]}>
      {children}
      <CornerTick position="tl" />
      <CornerTick position="tr" />
      <CornerTick position="bl" />
      <CornerTick position="br" />
    </View>
  );
  if (!onPress) return frame;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { backgroundColor: colors.accent100 }]}>
      {frame}
    </Pressable>
  );
}

export function Screen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing,
  headerLeft,
  headerRight
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl onRefresh={onRefresh} refreshing={Boolean(refreshing)} tintColor={colors.muted} />
        ) : undefined
      }
      style={styles.screen}
    >
      {headerLeft}
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space(3) }}>
        <Text style={[styles.title, { flexShrink: 1 }]}>{title}</Text>
        {headerRight}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={{ height: space(4) }} />
      {children}
      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}

export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable hitSlop={12} onPress={onPress} style={{ marginBottom: space(3), alignSelf: "flex-start" }}>
      <Text style={{ color: colors.accent, fontSize: 14, fontFamily: fonts.bodyMedium }}>← {label}</Text>
    </Pressable>
  );
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  loading,
  small,
  blueprint
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  blueprint?: boolean;
}) {
  const boxStyle = [
    styles.button,
    small && styles.buttonSmall,
    kind === "primary" && { backgroundColor: colors.accent, borderColor: colors.accent },
    kind === "secondary" && { backgroundColor: "transparent", borderColor: colors.divider },
    kind === "danger" && { backgroundColor: "transparent", borderColor: colors.danger },
    kind === "ghost" && { backgroundColor: "transparent", borderColor: "transparent" },
    (disabled || loading) && { opacity: 0.45 }
  ];
  const labelStyle = [
    styles.buttonLabel,
    small && { fontSize: 14 },
    kind === "secondary" && { color: colors.text },
    kind === "danger" && { color: colors.danger },
    kind === "ghost" && { color: colors.accent }
  ];
  const inner = (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [boxStyle, pressed && !disabled && { opacity: 0.85 }]}
    >
      {loading ? (
        <ActivityIndicator color={kind === "primary" ? colors.bg : colors.text} />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </Pressable>
  );
  if (!blueprint) return inner;
  return (
    <View style={{ position: "relative" }}>
      {inner}
      <CornerTick position="tl" />
      <CornerTick position="tr" />
      <CornerTick position="bl" />
      <CornerTick position="br" />
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={{ gap: 5, marginBottom: space(3) }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize ?? "sentences"}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral500}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function Tag({
  label,
  tone = "outline",
  pulse
}: {
  label: string;
  tone?: "accent" | "outline" | "neutral" | "filled";
  pulse?: boolean;
}) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.3, duration: 1250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1250, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, opacity]);

  const box = [
    styles.tag,
    tone === "accent" && { backgroundColor: colors.accent100 },
    tone === "outline" && { borderWidth: 1, borderColor: colors.accent },
    tone === "neutral" && { backgroundColor: colors.neutral100 },
    tone === "filled" && { backgroundColor: colors.accent }
  ];
  const fg =
    tone === "accent" ? colors.accent800 : tone === "outline" ? colors.accent : tone === "filled" ? colors.bg : colors.neutral800;
  return (
    <Animated.View style={[box, pulse && { opacity }]}>
      <Text style={{ color: fg, fontSize: 11, fontFamily: fonts.bodyMedium, letterSpacing: 0.2 }}>{label}</Text>
    </Animated.View>
  );
}

export function Note({ children, tone = "neutral", center }: { children: React.ReactNode; tone?: "neutral" | "danger" | "good" | "faint"; center?: boolean }) {
  const color =
    tone === "danger" ? colors.danger : tone === "good" ? colors.success : tone === "faint" ? colors.neutral500 : colors.neutral600;
  return (
    <Text style={{ color, fontSize: tone === "faint" ? 12 : 14, lineHeight: 20, fontFamily: fonts.body, textAlign: center ? "center" : "left" }}>
      {children}
    </Text>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction
}: {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Blueprint style={{ alignItems: "center", gap: space(2), paddingVertical: space(8), paddingHorizontal: space(4) }}>
      <Text style={{ fontSize: 22, fontFamily: fonts.heading, color: colors.text }}>{title}</Text>
      <Note center>{message}</Note>
      {actionLabel && onAction ? (
        <View style={{ marginTop: space(3), alignSelf: "stretch" }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Blueprint>
  );
}

export function Loading() {
  return (
    <View style={{ paddingVertical: space(10), alignItems: "center" }}>
      <ActivityIndicator color={colors.accent} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { padding: space(5), paddingTop: space(4) },
  title: { fontSize: 30, fontFamily: fonts.heading, color: colors.text, lineHeight: 34 },
  subtitle: { fontSize: 13, color: colors.neutral600, marginTop: space(1), lineHeight: 19, fontFamily: fonts.body },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.neutral600,
    fontFamily: fonts.bodyMedium
  },
  blueprint: {
    position: "relative",
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.none,
    padding: space(3.5),
    marginBottom: space(4),
    backgroundColor: "transparent"
  },
  button: {
    minHeight: 48,
    borderRadius: radius.none,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(4)
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: space(3) },
  buttonLabel: { color: colors.bg, fontSize: 16, fontFamily: fonts.heading, letterSpacing: 0.4 },
  fieldLabel: { fontSize: 12, color: "rgba(29, 31, 32, 0.7)", fontFamily: fonts.body },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: radius.none,
    paddingHorizontal: space(2.5),
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    fontFamily: fonts.body
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.none,
    alignSelf: "flex-start"
  }
});
