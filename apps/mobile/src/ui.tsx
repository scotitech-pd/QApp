import React from "react";
import {
  ActivityIndicator,
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

import { colors, radius, shadowCard, space } from "./theme";

/* One screen = one job. Big title says the job, subtitle explains it. */

export function Screen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing,
  headerLeft
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerLeft?: React.ReactNode;
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
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={{ height: space(4) }} />
      {children}
      <View style={{ height: space(10) }} />
    </ScrollView>
  );
}

export function BackLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable hitSlop={12} onPress={onPress} style={{ marginBottom: space(3) }}>
      <Text style={{ color: colors.accent, fontSize: 16, fontWeight: "600" }}>‹ {label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  kind = "primary",
  disabled,
  loading,
  small
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const base = [
    styles.button,
    small && styles.buttonSmall,
    kind === "primary" && { backgroundColor: colors.accent },
    kind === "secondary" && styles.buttonSecondary,
    kind === "danger" && { backgroundColor: colors.danger },
    kind === "ghost" && styles.buttonGhost,
    (disabled || loading) && { opacity: 0.45 }
  ];
  const labelStyle = [
    styles.buttonLabel,
    small && { fontSize: 14 },
    (kind === "secondary" || kind === "ghost") && { color: colors.ink }
  ];
  return (
    <Pressable disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [base, pressed && { transform: [{ scale: 0.985 }] }]}>
      {loading ? (
        <ActivityIndicator color={kind === "secondary" || kind === "ghost" ? colors.ink : "#fff"} />
      ) : (
        <Text style={labelStyle}>{label}</Text>
      )}
    </Pressable>
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
    <View style={{ gap: space(1.5), marginBottom: space(3) }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize ?? "sentences"}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

export function Pill({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const bg =
    tone === "good" ? colors.successSoft : tone === "warn" ? colors.warnSoft : tone === "danger" ? colors.dangerSoft : colors.bgElevated;
  const fg = tone === "good" ? colors.success : tone === "warn" ? colors.warn : tone === "danger" ? colors.danger : colors.ink2;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

export function Note({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "danger" | "good" }) {
  const color = tone === "danger" ? colors.danger : tone === "good" ? colors.success : colors.ink2;
  return <Text style={{ color, fontSize: 15, lineHeight: 21 }}>{children}</Text>;
}

export function BigStat({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={{ alignItems: "center", gap: space(1) }}>
      <Text style={styles.bigStat}>{value}</Text>
      <Text style={{ color: colors.ink2, fontSize: 16 }}>{caption}</Text>
    </View>
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
    <Card style={{ alignItems: "center", gap: space(2), paddingVertical: space(8) }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.ink }}>{title}</Text>
      <Text style={{ color: colors.ink2, fontSize: 15, textAlign: "center", lineHeight: 21 }}>{message}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: space(3), alignSelf: "stretch" }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
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
  title: { fontSize: 28, fontWeight: "800", color: colors.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: colors.ink2, marginTop: space(1), lineHeight: 21 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(4),
    marginBottom: space(3),
    ...shadowCard
  },
  button: {
    minHeight: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(4)
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: space(3) },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  buttonGhost: { backgroundColor: "transparent" },
  buttonLabel: { color: "#fff", fontSize: 17, fontWeight: "700" },
  fieldLabel: { fontSize: 14, fontWeight: "600", color: colors.ink2 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space(3.5),
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface
  },
  pill: { paddingHorizontal: space(2.5), paddingVertical: space(1), borderRadius: radius.full, alignSelf: "flex-start" },
  bigStat: { fontSize: 64, fontWeight: "800", color: colors.ink, letterSpacing: -2 }
});
