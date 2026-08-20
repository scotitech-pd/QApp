// OnQ design tokens — from the "Salon queue management app" Claude Design
// project (blueprint aesthetic: square corners, hairline borders, corner ticks).
export const colors = {
  bg: "#F2F2F3",
  surface: "#E9E9EA",
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

// Blueprint frame: square corners everywhere.
export const radius = { none: 0, sm: 2, md: 4, lg: 7, full: 999 };

export const space = (n: number) => n * 4;

export const shadowCard = {
  shadowColor: "#2B2B2D",
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2
};
