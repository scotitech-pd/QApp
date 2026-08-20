// OnQ design tokens — evolved from the Claude Design blueprint palette into
// a shipped-product look: white elevated cards, rounded corners, soft depth.
export const colors = {
  bg: "#F3F4F6",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF0F3",
  text: "#1D1F20",
  divider: "rgba(29, 31, 32, 0.16)",
  dividerSoft: "rgba(29, 31, 32, 0.08)",

  accent: "#5980A6",
  accent100: "#EEF6FF",
  accent200: "#D6EBFF",
  accent600: "#597EA3",
  accent700: "#416180",
  accent800: "#2C455D",

  neutral100: "#F5F5F8",
  neutral500: "#98989B",
  neutral600: "#7A7A7D",
  neutral700: "#5D5D60",
  neutral800: "#424244",

  // Semantic aliases used across screens
  ink: "#1D1F20",
  ink2: "#424244",
  muted: "#7A7A7D",
  danger: "#A64848",
  dangerSoft: "#F6E4E4",
  success: "#4A7D5F",
  successSoft: "#E3EFE7"
};

export const fonts = {
  heading: "BarlowCondensed_600SemiBold",
  headingRegular: "BarlowCondensed_400Regular",
  body: "Barlow_400Regular",
  bodyMedium: "Barlow_500Medium",
  bodyBold: "Barlow_700Bold"
};

export const radius = { none: 0, sm: 8, md: 12, lg: 16, xl: 22, full: 999 };

export const space = (n: number) => n * 4;

export const shadowCard = {
  shadowColor: "#101828",
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 3
};

export const shadowSoft = {
  shadowColor: "#101828",
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2
};

export const shadowFloat = {
  shadowColor: "#101828",
  shadowOpacity: 0.12,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 8 },
  elevation: 6
};
