"use client";

import { useState, type ChangeEvent } from "react";

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

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      {off ? <path d="M4.5 19.5 19.5 4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /> : null}
    </svg>
  );
}

/** Password input with a reveal toggle. */
export function PasswordInput({
  value,
  onChange,
  autoComplete,
  required
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span className="pw-wrap">
      <input
        autoComplete={autoComplete}
        onChange={onChange}
        required={required}
        type={revealed ? "text" : "password"}
        value={value}
      />
      <button
        aria-label={revealed ? "Hide password" : "Show password"}
        className="pw-eye"
        onClick={() => setRevealed((current) => !current)}
        type="button"
      >
        <EyeIcon off={!revealed} />
      </button>
    </span>
  );
}

/** Live checklist — rules turn green one by one while typing. */
export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="pw-rules" aria-live="polite">
      {PASSWORD_RULES.map((rule) => (
        <li className={rule.test(password) ? "pw-rule ok" : "pw-rule"} key={rule.label}>
          <span className="pw-dot" aria-hidden>{rule.test(password) ? "\u2713" : ""}</span>
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
