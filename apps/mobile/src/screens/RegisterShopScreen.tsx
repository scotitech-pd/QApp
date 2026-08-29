import * as Location from "expo-location";
import { AppleMaps, GoogleMaps } from "expo-maps";
import React, { useState } from "react";
import { Pressable, Text, View, Platform } from "react-native";

import { api, type BusinessSignupPayload } from "../api";
import { colors, fonts, radius, space } from "../theme";
import { Select } from "../select";
import { BackLink, Blueprint, Button, Field, Kicker, Note, Screen } from "../ui";

const INDUSTRIES: Array<{ key: string; label: string }> = [
  { key: "BARBER", label: "Barber" },
  { key: "SALON", label: "Salon" },
  { key: "NAIL_STUDIO", label: "Nails" },
  { key: "BEAUTY_CLINIC", label: "Beauty" },
  { key: "OTHER", label: "Other" }
];

type Step = "details" | "location";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
type Day = (typeof DAYS)[number];

const CHAIR_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => ({ value: n, label: `${n} ${n === 1 ? "chair" : "chairs"}` }));

function timeLabel(minutes: number) {
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

const OPEN_OPTIONS = Array.from({ length: 13 }, (_, i) => 6 * 60 + i * 30).map((v) => ({ value: v, label: timeLabel(v) }));
const CLOSE_OPTIONS = Array.from({ length: 17 }, (_, i) => 15 * 60 + i * 30).map((v) => ({ value: v, label: timeLabel(v) }));

/** "Mon–Sat 9:00 am–8:00 pm, Sun closed" from structured picks. */
function buildHoursNote(openDays: Set<Day>, opensAt: number, closesAt: number) {
  const open = DAYS.filter((day) => openDays.has(day));
  const closed = DAYS.filter((day) => !openDays.has(day));
  const ranges: string[] = [];
  let i = 0;
  while (i < open.length) {
    let j = i;
    while (j + 1 < open.length && DAYS.indexOf(open[j + 1]) === DAYS.indexOf(open[j]) + 1) j += 1;
    ranges.push(j > i + 1 ? `${open[i]}–${open[j]}` : j === i + 1 ? `${open[i]}, ${open[j]}` : open[i]);
    i = j + 1;
  }
  const hours = `${ranges.join(", ")} ${timeLabel(opensAt)}–${timeLabel(closesAt)}`;
  return closed.length ? `${hours}, ${closed.join(", ")} closed` : hours;
}

export function RegisterShopScreen({
  onBack,
  onSubmitted
}: {
  onBack: () => void;
  onSubmitted: (email: string, mobileNumber: string, businessName: string) => void;
}) {
  const [step, setStep] = useState<Step>("details");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dev builds prefill a demo shop so simulator walkthroughs are two taps.
  const demo = __DEV__;
  const [businessName, setBusinessName] = useState(demo ? "Sharma Hair Studio" : "");
  const [ownerName, setOwnerName] = useState(demo ? "Ravi Sharma" : "");
  const [email, setEmail] = useState(demo ? `owner${Date.now() % 100000}@sharmahair.demo` : "");
  const [mobileNumber, setMobileNumber] = useState(demo ? `+9198765${String(Date.now() % 100000).padStart(5, "0")}` : "");
  const [password, setPassword] = useState(demo ? "DemoShop12345!" : "");
  const [passwordConfirm, setPasswordConfirm] = useState(demo ? "DemoShop12345!" : "");
  const [industryType, setIndustryType] = useState("BARBER");
  const [chairs, setChairs] = useState<number>(2);
  const [openDays, setOpenDays] = useState<Set<Day>>(new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]));
  const [opensAt, setOpensAt] = useState<number>(9 * 60);
  const [closesAt, setClosesAt] = useState<number>(20 * 60);
  const openingHoursNote = openDays.size > 0 ? buildHoursNote(openDays, opensAt, closesAt) : "";

  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number | null; source: "BROWSER_GPS" | "MANUAL_PIN" } | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [locating, setLocating] = useState(false);

  function validateDetails() {
    if (!businessName.trim() || !ownerName.trim() || !email.trim() || !mobileNumber.trim()) return "Fill in every field.";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "That email doesn't look right.";
    if (mobileNumber.replace(/\D/g, "").length < 7) return "Enter a valid mobile number.";
    if (password.length < 10) return "Password needs at least 10 characters.";
    if (password !== passwordConfirm) return "Passwords don't match.";
    if (openDays.size === 0) return "Pick at least one open day.";
    if (closesAt <= opensAt) return "Closing time must be after opening time.";
    return null;
  }

  async function useMyLocation() {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error("Location permission is needed to pin your shop — or type the coordinates below.");
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
        source: "BROWSER_GPS"
      });
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get your location.");
    } finally {
      setLocating(false);
    }
  }

  function applyManual() {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError("Enter coordinates like 12.9716 and 77.5946.");
      return;
    }
    setError(null);
    setCoords({ latitude: lat, longitude: lng, accuracy: null, source: "MANUAL_PIN" });
    setConfirmed(false);
  }

  async function submit() {
    if (!coords || !confirmed) {
      setError("Pin your shop and confirm it's the front door.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload: BusinessSignupPayload = {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim().toLowerCase(),
        password,
        industryType,
        serviceStationsCount: chairs,
        openingHoursNote: openingHoursNote.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        geolocationSource: coords.source,
        pinConfirmedAt: new Date().toISOString(),
        ...(addressLine1.trim() ? { addressLine1: addressLine1.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
        ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {})
      };
      await api.businessSignup(payload);
      onSubmitted(payload.email, payload.mobileNumber, payload.businessName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "details") {
    return (
      <Screen
        headerLeft={<BackLink label="Sign in" onPress={onBack} />}
        subtitle="Free during the pilot. We review every shop by hand — usually the same day."
        title="Register your shop"
      >
        <View style={{ marginBottom: space(2) }}>
          <Kicker>Step 1 of 2 · Your shop</Kicker>
        </View>
        <Field label="Shop name" onChangeText={setBusinessName} placeholder="e.g. Sharma Hair Studio" value={businessName} />
        <Field label="Your name" onChangeText={setOwnerName} placeholder="Owner or manager" value={ownerName} />
        <Field autoCapitalize="none" keyboardType="email-address" label="Email (your login)" onChangeText={setEmail} placeholder="you@shop.com" value={email} />
        <Field autoCapitalize="none" keyboardType="phone-pad" label="Mobile number" onChangeText={setMobileNumber} placeholder="+91 98…" value={mobileNumber} />
        <Field autoCapitalize="none" label="Choose a password (10+ characters)" onChangeText={setPassword} secureTextEntry value={password} />
        <Field autoCapitalize="none" label="Confirm password" onChangeText={setPasswordConfirm} secureTextEntry value={passwordConfirm} />

        <Text style={{ fontSize: 12, color: "rgba(29, 31, 32, 0.7)", fontFamily: fonts.bodyMedium, marginBottom: 6 }}>What kind of shop?</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(2), marginBottom: space(3) }}>
          {INDUSTRIES.map((item) => {
            const active = industryType === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setIndustryType(item.key)}
                style={{
                  paddingHorizontal: space(3.5),
                  paddingVertical: space(2),
                  borderRadius: radius.full,
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.dividerSoft
                }}
              >
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: active ? "#FFFFFF" : colors.text }}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Select label="Chairs or stations" onChange={setChairs} options={CHAIR_OPTIONS} sheetTitle="How many chairs or stations?" value={chairs} />

        <Text style={{ fontSize: 12, color: "rgba(29, 31, 32, 0.7)", fontFamily: fonts.bodyMedium, marginBottom: 6 }}>Open days</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space(1.5), marginBottom: space(3) }}>
          {DAYS.map((day) => {
            const active = openDays.has(day);
            return (
              <Pressable
                key={day}
                onPress={() =>
                  setOpenDays((current) => {
                    const next = new Set(current);
                    if (next.has(day)) next.delete(day);
                    else next.add(day);
                    return next;
                  })
                }
                style={{
                  width: 44,
                  height: 40,
                  borderRadius: radius.md,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: active ? colors.accent : colors.dividerSoft
                }}
              >
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: active ? "#FFFFFF" : colors.text }}>{day}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: space(2) }}>
          <View style={{ flex: 1 }}>
            <Select label="Opens at" onChange={setOpensAt} options={OPEN_OPTIONS} value={opensAt} />
          </View>
          <View style={{ flex: 1 }}>
            <Select label="Closes at" onChange={setClosesAt} options={CLOSE_OPTIONS} value={closesAt} />
          </View>
        </View>
        {openingHoursNote ? (
          <View style={{ marginBottom: space(3) }}>
            <Note tone="faint">Customers will see: {openingHoursNote}</Note>
          </View>
        ) : null}

        {error ? (
          <View style={{ marginBottom: space(3) }}>
            <Note tone="danger">{error}</Note>
          </View>
        ) : null}
        <Button
          label="Next: pin your location"
          onPress={() => {
            const problem = validateDetails();
            if (problem) {
              setError(problem);
              return;
            }
            setError(null);
            setStep("location");
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      headerLeft={<BackLink label="Your shop" onPress={() => setStep("details")} />}
      subtitle="Customers are routed by distance, so the pin must be your front door."
      title="Pin your shop"
    >
      <View style={{ marginBottom: space(2) }}>
        <Kicker>Step 2 of 2 · Location</Kicker>
      </View>

      <Button kind={coords ? "secondary" : "primary"} label={locating ? "Finding you…" : "Use my current location"} loading={locating} onPress={() => void useMyLocation()} />
      <View style={{ marginTop: space(2) }}>
        <Note center tone="faint">
          Standing in the shop? That's the most accurate pin.
        </Note>
      </View>

      <View style={{ marginTop: space(4) }}>
        <Blueprint>
          <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.neutral700, marginBottom: space(2) }}>Or type coordinates</Text>
          <View style={{ flexDirection: "row", gap: space(2) }}>
            <View style={{ flex: 1 }}>
              <Field autoCapitalize="none" keyboardType="numbers-and-punctuation" label="Latitude" onChangeText={setManualLat} placeholder="12.9716" value={manualLat} />
            </View>
            <View style={{ flex: 1 }}>
              <Field autoCapitalize="none" keyboardType="numbers-and-punctuation" label="Longitude" onChangeText={setManualLng} placeholder="77.5946" value={manualLng} />
            </View>
          </View>
          <Button disabled={!manualLat || !manualLng} kind="secondary" label="Use these coordinates" onPress={applyManual} small />
        </Blueprint>
      </View>

      {coords ? (
        <View style={{ marginTop: space(4), borderRadius: radius.lg, overflow: "hidden" }}>
          {(() => {
            const MapComponent = Platform.OS === "ios" ? AppleMaps.View : GoogleMaps.View;
            return (
              <MapComponent
                cameraPosition={{
                  coordinates: { latitude: coords.latitude, longitude: coords.longitude },
                  zoom: 18
                }}
                markers={[{ coordinates: { latitude: coords.latitude, longitude: coords.longitude } }]}
                onMapClick={(event) => {
                  const { latitude, longitude } = event.coordinates;
                  if (latitude == null || longitude == null) return;
                  setCoords({ latitude, longitude, accuracy: null, source: "MANUAL_PIN" });
                  setConfirmed(false);
                }}
                style={{ width: "100%", height: 260 }}
              />
            );
          })()}
          <View style={{ backgroundColor: colors.surface, paddingHorizontal: space(3), paddingVertical: space(2) }}>
            <Text style={{ fontFamily: fonts.body, fontSize: 12.5, color: colors.neutral600, textAlign: "center" }}>
              Tap the map to move the pin until it sits on your front door.
            </Text>
          </View>
        </View>
      ) : null}

      {coords ? (
        <Blueprint style={{ backgroundColor: colors.accent100 }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: colors.text }}>Pinned</Text>
          <Text style={{ fontFamily: fonts.body, fontSize: 13, color: colors.neutral700, marginTop: 2 }}>
            {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            {coords.accuracy != null ? ` · ±${Math.round(coords.accuracy)} m` : ""} · {coords.source === "BROWSER_GPS" ? "from your phone" : "typed"}
          </Text>
          <Pressable onPress={() => setConfirmed((value) => !value)} style={{ flexDirection: "row", alignItems: "center", gap: space(2), marginTop: space(3) }}>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 1.5,
                borderColor: confirmed ? colors.accent : colors.neutral500,
                backgroundColor: confirmed ? colors.accent : "transparent",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {confirmed ? <Text style={{ color: "#FFFFFF", fontSize: 14, fontFamily: fonts.bodyBold }}>✓</Text> : null}
            </View>
            <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text, flex: 1 }}>This is my shop's front door</Text>
          </Pressable>
        </Blueprint>
      ) : null}

      <Pressable onPress={() => setShowAddress((value) => !value)} style={{ paddingVertical: space(2) }}>
        <Text style={{ color: colors.accent700, fontFamily: fonts.bodyMedium, fontSize: 14 }}>
          {showAddress ? "Hide address" : "Add address details (optional)"}
        </Text>
      </Pressable>
      {showAddress ? (
        <>
          <Field label="Address line" onChangeText={setAddressLine1} value={addressLine1} />
          <View style={{ flexDirection: "row", gap: space(2) }}>
            <View style={{ flex: 1 }}>
              <Field label="City" onChangeText={setCity} value={city} />
            </View>
            <View style={{ flex: 1 }}>
              <Field autoCapitalize="none" label="Postcode" onChangeText={setPostalCode} value={postalCode} />
            </View>
          </View>
        </>
      ) : null}

      {error ? (
        <View style={{ marginBottom: space(3) }}>
          <Note tone="danger">{error}</Note>
        </View>
      ) : null}
      <Button disabled={!coords || !confirmed} label="Submit for approval" loading={busy} onPress={() => void submit()} />
      <View style={{ marginTop: space(2) }}>
        <Note center tone="faint">
          No card, no contract. You'll sign in with your email and password once approved.
        </Note>
      </View>
    </Screen>
  );
}
