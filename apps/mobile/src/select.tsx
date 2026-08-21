import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import React, { useCallback, useRef } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, fonts, radius, space } from "./theme";

/* Dropdown that feels native: tapping the field opens a bottom sheet list. */

export type SelectOption<T extends string | number> = { value: T; label: string; hint?: string };

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Choose…",
  sheetTitle
}: {
  label: string;
  value: T | null;
  options: Array<SelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  sheetTitle?: string;
}) {
  const ref = useRef<BottomSheetModal>(null);
  const selected = options.find((option) => option.value === value) ?? null;

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
    ),
    []
  );

  return (
    <View style={{ gap: 5, marginBottom: space(3) }}>
      <Text style={{ fontSize: 12, color: "rgba(29, 31, 32, 0.7)", fontFamily: fonts.bodyMedium }}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => ref.current?.present()}
        style={({ pressed }) => [
          {
            minHeight: 46,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceAlt,
            paddingHorizontal: space(3),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1.5,
            borderColor: pressed ? colors.accent : "transparent"
          }
        ]}
      >
        <Text style={{ fontSize: 15, fontFamily: fonts.body, color: selected ? colors.text : colors.neutral500 }}>
          {selected ? selected.label : placeholder}
        </Text>
        <Text style={{ fontSize: 14, color: colors.neutral600 }}>⌄</Text>
      </Pressable>

      <BottomSheetModal
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
        enableDynamicSizing={false}
        handleIndicatorStyle={{ backgroundColor: colors.dividerSoft, width: 38 }}
        ref={ref}
        snapPoints={["55%"]}
      >
        <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: space(5), paddingBottom: space(10) }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 20, color: colors.text, marginBottom: space(2) }}>
            {sheetTitle ?? label}
          </Text>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => {
                  onChange(option.value);
                  ref.current?.dismiss();
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: space(3.5),
                  borderBottomWidth: 1,
                  borderBottomColor: colors.dividerSoft
                }}
              >
                <View>
                  <Text style={{ fontSize: 16, fontFamily: active ? fonts.bodyMedium : fonts.body, color: active ? colors.accent700 : colors.text }}>
                    {option.label}
                  </Text>
                  {option.hint ? (
                    <Text style={{ fontSize: 12, fontFamily: fonts.body, color: colors.neutral500 }}>{option.hint}</Text>
                  ) : null}
                </View>
                {active ? <Text style={{ color: colors.accent700, fontSize: 16, fontFamily: fonts.bodyBold }}>✓</Text> : null}
              </Pressable>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </View>
  );
}
