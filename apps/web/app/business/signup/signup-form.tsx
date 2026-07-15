"use client";

import { useEffect, useRef, useState } from "react";

import { requestJson, unwrapItem } from "../../lib/api";

type GeolocationSource = "BROWSER_GPS" | "ADDRESS_GEOCODE" | "MANUAL_PIN";

type SignupState = {
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  password: string;
  passwordConfirm: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
  industryType: string;
  serviceStationsCount: string;
  openingHoursNote: string;
};

type Coordinates = {
  latitude: number;
  longitude: number;
  geolocationSource: GeolocationSource;
  placeId?: string;
};

type SubmissionResult = {
  id: string;
  createdAt: string;
  approvalStatus: string;
  latitude: number;
  longitude: number;
};

declare global {
  interface Window {
    google?: any;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const defaultState: SignupState = {
  businessName: "",
  ownerName: "",
  mobileNumber: "",
  email: "",
  password: "",
  passwordConfirm: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  countryCode: "GB",
  industryType: "BARBER",
  serviceStationsCount: "3",
  openingHoursNote: ""
};

const industryOptions = [
  "BARBER",
  "SALON",
  "BEAUTY_CLINIC",
  "NAIL_STUDIO",
  "TATTOO_STUDIO",
  "CAR_WASH",
  "VEHICLE_SERVICE_CENTRE",
  "PHYSIOTHERAPY_CLINIC",
  "DENTAL_CLINIC",
  "OTHER"
];

function loadGoogleMaps() {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not available."));
      return;
    }

    if (window.google?.maps) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps-loader="true"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), {
        once: true
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = "true";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), {
      once: true
    });
    document.head.appendChild(script);
  });
}

export function BusinessSignupForm() {
  const [formState, setFormState] = useState<SignupState>(defaultState);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState("No location selected yet.");
  const [showAddress, setShowAddress] = useState(false);
  const [pinConfirmedAt, setPinConfirmedAt] = useState<string | null>(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapsError(
        "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable map-based pin confirmation. Manual coordinates still work."
      );
      return;
    }

    let active = true;

    loadGoogleMaps()
      .then(() => {
        if (active) {
          setMapsReady(true);
        }
      })
      .catch((error: Error) => {
        if (active) {
          setMapsError(error.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!mapsReady || !coordinates || !mapElementRef.current || !window.google?.maps) {
      return;
    }

    const center = {
      lat: coordinates.latitude,
      lng: coordinates.longitude
    };

    if (!mapRef.current) {
      mapRef.current = new window.google.maps.Map(mapElementRef.current, {
        center,
        zoom: 16,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false
      });

      markerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position: center,
        draggable: true
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();

        if (!position) {
          return;
        }

        setCoordinates((current) => ({
          latitude: position.lat(),
          longitude: position.lng(),
          geolocationSource: "MANUAL_PIN",
          placeId: current?.placeId
        }));
        setPinConfirmedAt(null);
        setLocationStatus("Pin moved. Confirm the final location before submitting.");
      });
    } else {
      mapRef.current.setCenter(center);
      markerRef.current?.setPosition(center);
    }
  }, [coordinates, mapsReady]);

  function updateField(field: keyof SignupState, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateCoordinates(next: Coordinates, statusMessage: string) {
    setCoordinates(next);
    setPinConfirmedAt(null);
    setLocationStatus(statusMessage);
  }

  async function detectCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Browser geolocation is not supported on this device.");
      return;
    }

    setLocationStatus("Detecting your current location...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCoordinates(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            geolocationSource: "BROWSER_GPS"
          },
          "Current location detected. Move the pin if the storefront is slightly different, then confirm it."
        );
      },
      () => {
        setLocationStatus("Location access was denied or unavailable. Search the address or enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    );
  }

  async function findAddressOnMap() {
    if (!mapsReady || !window.google?.maps) {
      setLocationStatus("Google Maps is not ready yet.");
      return;
    }

    const address = [
      formState.addressLine1,
      formState.addressLine2,
      formState.city,
      formState.region,
      formState.postalCode,
      formState.countryCode
    ]
      .filter(Boolean)
      .join(", ");

    if (!address.trim()) {
      setLocationStatus("Enter the address details before searching the map.");
      return;
    }

    setAddressLookupLoading(true);

    const geocoder = new window.google.maps.Geocoder();

    geocoder.geocode({ address }, (results: any[] | null, status: string) => {
      setAddressLookupLoading(false);

      if (status !== "OK" || !results?.[0]?.geometry?.location) {
        setLocationStatus("Address search did not find a reliable location. You can still use current location or enter coordinates manually.");
        return;
      }

      const location = results[0].geometry.location;

      updateCoordinates(
        {
          latitude: location.lat(),
          longitude: location.lng(),
          geolocationSource: "ADDRESS_GEOCODE",
          placeId: results[0].place_id
        },
        "Address found. Review the map pin, adjust if needed, then confirm the location."
      );
    });
  }

  function confirmLocation() {
    if (!coordinates) {
      setLocationStatus("Choose a location first.");
      return;
    }

    const confirmedAt = new Date().toISOString();
    setPinConfirmedAt(confirmedAt);
    setLocationStatus("Location confirmed. You can now submit the business signup.");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    if (!coordinates) {
      setSubmitError("Location coordinates are required before signup can be submitted.");
      return;
    }

    if (!pinConfirmedAt) {
      setSubmitError("Confirm the map pin before creating the business.");
      return;
    }

    if (formState.password.length < 10) {
      setSubmitError("Password must be at least 10 characters.");
      return;
    }

    if (formState.password !== formState.passwordConfirm) {
      setSubmitError("Password and confirmation must match.");
      return;
    }

    setSubmitting(true);

    try {
      const payload = await requestJson<{
        id: string;
        createdAt: string;
        approvalStatus: string;
        latitude: number;
        longitude: number;
      }>("/v1/business-signups", {
        method: "POST",
        body: {
          ...formState,
          passwordConfirm: undefined,
          serviceStationsCount: Number(formState.serviceStationsCount),
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          placeId: coordinates.placeId,
          geolocationSource: coordinates.geolocationSource,
          pinConfirmedAt
        }
      });
      const item = unwrapItem(payload);

      if (!item) {
        throw new Error("Signup returned no result.");
      }

      setResult({
        id: item.id,
        createdAt: item.createdAt,
        approvalStatus: item.approvalStatus,
        latitude: item.latitude,
        longitude: item.longitude
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Signup failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="signup-shell">
      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="signup-grid">
          <label className="field">
            <span>Business Name</span>
            <input
              required
              value={formState.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Owner Name</span>
            <input
              required
              value={formState.ownerName}
              onChange={(event) => updateField("ownerName", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Mobile Number</span>
            <input
              required
              value={formState.mobileNumber}
              onChange={(event) => updateField("mobileNumber", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              required
              value={formState.email}
              onChange={(event) => updateField("email", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password (min 10 chars)</span>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={formState.password}
              onChange={(event) => updateField("password", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Confirm Password</span>
            <input
              type="password"
              required
              minLength={10}
              autoComplete="new-password"
              value={formState.passwordConfirm}
              onChange={(event) => updateField("passwordConfirm", event.target.value)}
            />
          </label>
          <label className="field">
            <span>Industry</span>
            <select
              value={formState.industryType}
              onChange={(event) => updateField("industryType", event.target.value)}
            >
              {industryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Chairs or Stations</span>
            <input
              type="number"
              min={1}
              required
              value={formState.serviceStationsCount}
              onChange={(event) => updateField("serviceStationsCount", event.target.value)}
            />
          </label>
          <label className="field field-wide">
            <span>Opening Hours Note</span>
            <textarea
              required
              rows={4}
              value={formState.openingHoursNote}
              onChange={(event) => updateField("openingHoursNote", event.target.value)}
              placeholder="Mon-Fri 9am-7pm, Sat 9am-6pm, Sun closed"
            />
          </label>
        </div>

        <div className="location-card">
          <div className="location-card-header">
            <div>
              <h3>Location Confirmation</h3>
              <p>Mandatory: confirm the exact storefront pin before continuing.</p>
            </div>
            <div className="location-actions">
              <button className="button" onClick={detectCurrentLocation} type="button">
                Use Current Location
              </button>
              <button className="button" onClick={findAddressOnMap} type="button">
                {addressLookupLoading ? "Finding..." : "Find Address"}
              </button>
            </div>
          </div>

          <p className="status-text">{locationStatus}</p>

          {mapsError ? <p className="status-text warning">{mapsError}</p> : null}

          <div className="map-shell">
            <div className="map-surface" ref={mapElementRef}>
              {!mapsReady ? (
                <div className="map-placeholder">
                  <strong>Map loading</strong>
                  <p>If a Google Maps key is not configured yet, you can still enter coordinates manually below.</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="signup-grid">
            <label className="field">
              <span>Latitude</span>
              <input
                type="number"
                step="any"
                value={coordinates?.latitude ?? ""}
                onChange={(event) =>
                  updateCoordinates(
                    {
                      latitude: Number(event.target.value),
                      longitude: coordinates?.longitude ?? 0,
                      geolocationSource: "MANUAL_PIN",
                      placeId: coordinates?.placeId
                    },
                    "Coordinates edited manually. Confirm the final location before submitting."
                  )
                }
              />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input
                type="number"
                step="any"
                value={coordinates?.longitude ?? ""}
                onChange={(event) =>
                  updateCoordinates(
                    {
                      latitude: coordinates?.latitude ?? 0,
                      longitude: Number(event.target.value),
                      geolocationSource: "MANUAL_PIN",
                      placeId: coordinates?.placeId
                    },
                    "Coordinates edited manually. Confirm the final location before submitting."
                  )
                }
              />
            </label>
          </div>

          <div className="location-footer">
            <button className="button primary" onClick={confirmLocation} type="button">
              Confirm Location
            </button>
            <span className={pinConfirmedAt ? "pill pill-good" : "pill"}>
              {pinConfirmedAt ? "Pin confirmed" : "Pin not confirmed"}
            </span>
          </div>
        </div>

        <details
          className="disclosure"
          open={showAddress}
          onToggle={(event) => setShowAddress((event.target as HTMLDetailsElement).open)}
        >
          <summary>
            <span>Address details (optional)</span>
            <small>Shown to customers. Not needed if the map pin is right.</small>
          </summary>
          <div className="signup-grid" style={{ marginTop: 16 }}>
            <label className="field field-wide">
              <span>Address Line 1</span>
              <input
                value={formState.addressLine1}
                onChange={(event) => updateField("addressLine1", event.target.value)}
              />
            </label>
            <label className="field field-wide">
              <span>Address Line 2</span>
              <input
                value={formState.addressLine2}
                onChange={(event) => updateField("addressLine2", event.target.value)}
              />
            </label>
            <label className="field">
              <span>City</span>
              <input value={formState.city} onChange={(event) => updateField("city", event.target.value)} />
            </label>
            <label className="field">
              <span>Region</span>
              <input value={formState.region} onChange={(event) => updateField("region", event.target.value)} />
            </label>
            <label className="field">
              <span>Postal Code</span>
              <input value={formState.postalCode} onChange={(event) => updateField("postalCode", event.target.value)} />
            </label>
            <label className="field">
              <span>Country Code</span>
              <input
                maxLength={2}
                value={formState.countryCode}
                onChange={(event) => updateField("countryCode", event.target.value.toUpperCase())}
              />
            </label>
          </div>
        </details>

        {submitError ? <p className="status-text warning">{submitError}</p> : null}

        <div className="location-footer">
          <button className="button primary" disabled={submitting} type="submit">
            {submitting ? "Submitting..." : "Create Business Signup"}
          </button>
        </div>
      </form>

      {result ? (
        <section className="section result-panel">
          <h2>Pending Signup Created</h2>
          <p>
            Signup <code className="inline">{result.id}</code> has been created with
            pending approval status.
          </p>
          <ol className="list">
            <li>Status: {result.approvalStatus}</li>
            <li>Created at: {result.createdAt}</li>
            <li>
              Coordinates: {result.latitude}, {result.longitude}
            </li>
          </ol>
        </section>
      ) : null}
    </div>
  );
}
