import type { Metadata } from "next";

import { BusinessSignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Register your shop",
  description:
    "Put your barbershop or salon on OnQ. Customers see your live queue and join from anywhere. Free during the pilot — reviewed by hand, usually the same day."
};

export default function BusinessSignupPage() {
  return (
    <main className="auth-page auth-page-wide">
      <div className="signup-head">
        <h1>Get your shop on OnQ</h1>
        <p>
          Five minutes of setup, reviewed by hand — usually the same day. Free during the pilot:
          no card, no contract, no per-customer fees.
        </p>
      </div>
      <BusinessSignupForm />
    </main>
  );
}
