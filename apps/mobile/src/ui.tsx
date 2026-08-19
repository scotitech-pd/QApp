import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle
} from "react-native";

import { colors, radius, shadowCard, space } from "./theme";

export function Card({
  children,
  style,
  dark
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  return <View style={[styles.card, dark && styles.cardDark, style]}>{children}</View>;
}

export function Eyebrow({ text, onDark }: { text: string; onDark?: boolean }) {
  return (
    <Text style={[styles.eyebrow, onDark && { color: colors.creamDim }]}>{text.toUpperCase()}</Text>
  );
}

export function Title({ text, onDark, size = 24 }: { text: string; onDark?: boolean; size?: number }) {
  return (
    <Text style={[styles.title, { fontSize: size }, onDark && { color: colors.cream }]}>{text}</Text>
  );
}

export function Body({ text, onDark, style }: { text: string; onDark?: boolean; style?: object }) {
  return (
    <Text style={[styles.body, onDark && { color: colors.creamDim }, style]}>{text}</Text>
  );
}

export function Pill({
  label,
  tone = "neutral"
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "danger" | "accent";
}) {
  const toneStyles = {
    neutral: { bg: colors.bgElevated, fg: colors.ink2 },
    good: { bg: colors.successSoft, fg: colors.success },
    warn: { bg: colors.warnSoft, fg: colors.warn },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    accent: { bg: colors.accentSoft, fg: colors.accent }
  }[tone];

  return (
    <View style={[styles.pill, { backgroundColor: toneStyles.bg }]}>
      <Text style={[styles.pillText, { color: toneStyles.fg }]}>{label}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  busy,
  style
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "darkGhost";
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const variantStyle = {
    primary: { backgroundColor: colors.accent, borderColor: colors.accent },
    secondary: { backgroundColor: colors.surface, borderColor: colors.borderStrong },
    danger: { backgroundColor: colors.danger, borderColor: colors.danger },
    ghost: { backgroundColor: "transparent", borderColor: "transparent" },
    darkGhost: { backgroundColor: "rgba(244,235,208,0.12)", borderColor: "rgba(244,235,208,0.25)" }
  }[variant];
  const labelColor =
    variant === "primary" || variant === "danger"
      ? "#FFFFFF"
      : variant === "darkGhost"
        ? colors.cream
        : colors.ink;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        (disabled || busy) && { opacity: 0.5 },
        pressed && !disabled && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style
      ]}
    >
      {busy ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={[styles.buttonLabel, { color: labelColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  ...inputProps
}: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: space(2) }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...inputProps}
      />
    </View>
  );
}

export function Row({
  children,
  style
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function LiveDot() {
  return (
    <View style={styles.liveDotWrap}>
      <View style={styles.liveDot} />
      <Text style={styles.liveDotText}>LIVE</Text>
    </View>
  );
}

export function StatBlock({
  label,
  value,
  onDark
}: {
  label: string;
  value: string;
  onDark?: boolean;
}) {
  return (
    <View style={{ gap: 2, minWidth: 92 }}>
      <Text style={[styles.statLabel, onDark && { color: colors.creamDim }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.statValue, onDark && { color: colors.cream }]}>{value}</Text>
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
      {label ? <Body text={label} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(5),
    gap: space(3),
    ...shadowCard
  },
  cardDark: {
    backgroundColor: colors.navy,
    borderColor: "rgba(244,235,208,0.12)"
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4
  },
  title: {
    color: colors.ink,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 30
  },
  body: {
    color: colors.ink2,
    fontSize: 15,
    lineHeight: 22
  },
  pill: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: space(3),
    paddingVertical: space(1)
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700"
  },
  button: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(5),
    paddingVertical: space(3)
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "700"
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.ink2
  },
  input: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: space(4),
    fontSize: 16,
    color: colors.ink
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space(3),
    flexWrap: "wrap"
  },
  liveDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success
  },
  liveDotText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.muted
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.5
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space(3),
    padding: space(8)
  }
});
