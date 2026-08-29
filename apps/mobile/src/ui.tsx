import React, { useEffect, useRef, useState } from "react";
import Svg, { Circle as SvgCircle, Path as SvgPath } from "react-native-svg";
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

import { colors, fonts, radius, shadowCard, shadowSoft, space } from "./theme";

/* OnQ product UI: white elevated cards, rounded corners, condensed headings,
 * spring press feedback, gentle screen fade-ins, pulsing live tags. */

function usePressScale() {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 24, bounciness: 6 }).start();
  return { scale, pressIn, pressOut };
}

/* Card. Kept under its historical name so every screen inherits the new look. */
export function Blueprint({
  children,
  style,
  onPress
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const { scale, pressIn, pressOut } = usePressScale();

  if (!onPress) {
    return <View style={[styles.card, style]}>{children}</View>;
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
        <View style={[styles.card, style]}>{children}</View>
      </Pressable>
    </Animated.View>
  );
}

export function Screen({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing,
  headerLeft,
  headerRight,
  headerBottom,
  fixedHeader = true,
  scrollRef
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Extra row (filters, toggles) rendered under the subtitle, pinned with it. */
  headerBottom?: React.ReactNode;
  /** Keep the title bar pinned while the content scrolls beneath it. */
  fixedHeader?: boolean;
  scrollRef?: React.RefObject<ScrollView | null>;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 })
    ]).start();
  }, [opacity, translateY]);

  const headerBlock = (
    <>
      {headerLeft}
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: space(3) }}>
        <Text style={[styles.title, { flexShrink: 1 }]}>{title}</Text>
        {headerRight}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {headerBottom ? <View style={{ marginTop: space(3) }}>{headerBottom}</View> : null}
    </>
  );

  if (fixedHeader) {
    return (
      <View style={styles.screen}>
        <Animated.View style={[styles.fixedHeader, { opacity, transform: [{ translateY }] }]}>
          {headerBlock}
        </Animated.View>
        <ScrollView
          contentContainerStyle={styles.screenContentUnderHeader}
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          refreshControl={
            onRefresh ? (
              <RefreshControl onRefresh={onRefresh} refreshing={Boolean(refreshing)} tintColor={colors.muted} />
            ) : undefined
          }
          style={styles.screen}
        >
          <Animated.View style={{ opacity, transform: [{ translateY }] }}>
            {children}
            <View style={{ height: space(10) }} />
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      ref={scrollRef}
      refreshControl={
        onRefresh ? (
          <RefreshControl onRefresh={onRefresh} refreshing={Boolean(refreshing)} tintColor={colors.muted} />
        ) : undefined
      }
      style={styles.screen}
    >
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        {headerBlock}
        <View style={{ height: space(4) }} />
        {children}
        <View style={{ height: space(10) }} />
      </Animated.View>
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
  blueprint: _blueprint
}: {
  label: string;
  onPress: () => void;
  kind?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  blueprint?: boolean;
}) {
  const { scale, pressIn, pressOut } = usePressScale();

  const boxStyle = [
    styles.button,
    small && styles.buttonSmall,
    kind === "primary" && styles.buttonPrimary,
    kind === "secondary" && styles.buttonSecondary,
    kind === "danger" && styles.buttonDanger,
    kind === "ghost" && styles.buttonGhost,
    (disabled || loading) && { opacity: 0.45 }
  ];
  const labelStyle = [
    styles.buttonLabel,
    small && { fontSize: 14 },
    kind === "secondary" && { color: colors.text },
    kind === "danger" && { color: colors.danger },
    kind === "ghost" && { color: colors.accent }
  ];

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        disabled={disabled || loading}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={boxStyle}
      >
        {loading ? (
          <ActivityIndicator color={kind === "primary" ? "#FFFFFF" : colors.text} />
        ) : (
          <Text style={labelStyle}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

export function Field({
  editable,
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  autoCorrect = false
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words";
  autoCorrect?: boolean;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <View style={{ gap: 5, marginBottom: space(3) }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View>
      <TextInput
        editable={editable}
        autoCapitalize={autoCapitalize ?? "sentences"}
        autoCorrect={autoCorrect}
        spellCheck={autoCorrect}
        keyboardType={keyboardType}
        onBlur={() => setFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral500}
        secureTextEntry={secureTextEntry && !revealed}
        style={[styles.input, focused && styles.inputFocused, secureTextEntry ? { paddingRight: 46 } : null]}
        value={value}
      />
      {secureTextEntry ? (
        <Pressable
          accessibilityLabel={revealed ? "Hide password" : "Show password"}
          hitSlop={10}
          onPress={() => setRevealed((current) => !current)}
          style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}
        >
          <EyeIcon off={!revealed} />
        </Pressable>
      ) : null}
      </View>
    </View>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <Svg fill="none" height={20} viewBox="0 0 24 24" width={20}>
      <SvgPath
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke={colors.neutral600}
        strokeWidth={1.7}
      />
      <SvgCircle cx={12} cy={12} r={3.1} stroke={colors.neutral600} strokeWidth={1.7} />
      {off ? <SvgPath d="M4.5 19.5 19.5 4.5" stroke={colors.neutral600} strokeLinecap="round" strokeWidth={1.7} /> : null}
    </Svg>
  );
}

/** Mirrors the API's validatePasswordStrength — keep the two in sync. */
export const PASSWORD_RULES: Array<{ label: string; test: (password: string) => boolean }> = [
  { label: "At least 10 characters", test: (password) => password.length >= 10 },
  { label: "A lowercase letter", test: (password) => /[a-z]/.test(password) },
  { label: "An uppercase letter", test: (password) => /[A-Z]/.test(password) },
  { label: "A number", test: (password) => /[0-9]/.test(password) },
  { label: "A symbol (like ! @ #)", test: (password) => /[^A-Za-z0-9]/.test(password) }
];

export function passwordMeetsRules(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

/** Live checklist that turns green rule by rule as the password is typed. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <View style={{ gap: 6, marginTop: -space(1), marginBottom: space(3) }}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password);
        return (
          <View key={rule.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: ok ? colors.success : colors.surfaceAlt,
                borderWidth: ok ? 0 : 1.5,
                borderColor: colors.dividerSoft
              }}
            >
              {ok ? <Text style={{ color: "#FFFFFF", fontSize: 10, fontFamily: fonts.bodyBold, lineHeight: 12 }}>✓</Text> : null}
            </View>
            <Text
              style={{
                fontFamily: ok ? fonts.bodyMedium : fonts.body,
                fontSize: 12.5,
                color: ok ? colors.success : colors.neutral600
              }}
            >
              {rule.label}
            </Text>
          </View>
        );
      })}
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
        Animated.timing(opacity, { toValue: 0.35, duration: 1250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1250, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, opacity]);

  const box = [
    styles.tag,
    tone === "accent" && { backgroundColor: colors.accent100 },
    tone === "outline" && { borderWidth: 1, borderColor: colors.accent200, backgroundColor: colors.surface },
    tone === "neutral" && { backgroundColor: colors.surfaceAlt },
    tone === "filled" && { backgroundColor: colors.accent }
  ];
  const fg =
    tone === "accent" ? colors.accent700 : tone === "outline" ? colors.accent600 : tone === "filled" ? "#FFFFFF" : colors.neutral700;
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
  fixedHeader: {
    paddingHorizontal: space(5),
    paddingTop: space(4),
    paddingBottom: space(3),
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(29,31,32,0.06)",
    zIndex: 2
  },
  screenContentUnderHeader: { padding: space(5), paddingTop: space(3) },
  title: { fontSize: 30, fontFamily: fonts.heading, color: colors.text, lineHeight: 34 },
  subtitle: { fontSize: 13, color: colors.neutral600, marginTop: space(1), lineHeight: 19, fontFamily: fonts.body },
  kicker: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.neutral600,
    fontFamily: fonts.bodyMedium
  },
  card: {
    borderRadius: radius.lg,
    padding: space(4),
    marginBottom: space(4),
    backgroundColor: colors.surface,
    ...shadowCard
  },
  button: {
    minHeight: 50,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space(4)
  },
  buttonSmall: { minHeight: 38, paddingHorizontal: space(3), borderRadius: radius.sm },
  buttonPrimary: {
    backgroundColor: colors.accent,
    ...shadowSoft,
    shadowColor: colors.accent800,
    shadowOpacity: 0.28
  },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dividerSoft, ...shadowSoft },
  buttonDanger: { backgroundColor: colors.dangerSoft },
  buttonGhost: { backgroundColor: "transparent" },
  buttonLabel: { color: "#FFFFFF", fontSize: 16, fontFamily: fonts.heading, letterSpacing: 0.4 },
  fieldLabel: { fontSize: 12, color: "rgba(29, 31, 32, 0.7)", fontFamily: fonts.bodyMedium },
  input: {
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: "transparent",
    borderRadius: radius.md,
    paddingHorizontal: space(3),
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surfaceAlt,
    fontFamily: fonts.body
  },
  inputFocused: { borderColor: colors.accent, backgroundColor: colors.surface },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: "flex-start"
  }
});
