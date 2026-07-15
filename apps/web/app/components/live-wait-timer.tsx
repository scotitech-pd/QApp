"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

type LiveWaitTimerProps = {
  minutes: number | null;
  updatedAt?: string | null;
  label?: string;
  helper?: string;
  variant?: "card" | "hero" | "inline";
  paused?: boolean;
  terminalLabel?: string;
};

function getRemainingMs(minutes: number | null, updatedAt?: string | null) {
  if (minutes === null) {
    return null;
  }

  const startTime = updatedAt ? new Date(updatedAt).getTime() : Date.now();
  const elapsedMs = Number.isFinite(startTime) ? Date.now() - startTime : 0;
  return Math.max(0, minutes * 60_000 - elapsedMs);
}

function formatRemaining(ms: number | null, terminalLabel?: string) {
  if (terminalLabel) {
    return terminalLabel;
  }

  if (ms === null) {
    return "Calculating";
  }

  if (ms <= 0) {
    return "Now";
  }

  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getTimerMood(ms: number | null, paused?: boolean, terminalLabel?: string) {
  if (terminalLabel) {
    return terminalLabel;
  }

  if (paused) {
    return "Queue paused";
  }

  if (ms === null) {
    return "Recalculating";
  }

  if (ms <= 0) {
    return "Due now";
  }

  if (ms <= 10 * 60_000) {
    return "Close";
  }

  if (ms <= 25 * 60_000) {
    return "Plan your time";
  }

  return "Busy but visible";
}

export function LiveWaitTimer({
  minutes,
  updatedAt,
  label = "Live wait",
  helper,
  variant = "card",
  paused,
  terminalLabel
}: LiveWaitTimerProps) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(minutes, updatedAt));
  const totalMs = minutes === null ? null : Math.max(minutes * 60_000, 1);
  const ratio = totalMs && remainingMs !== null ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const timerStyle = {
    "--timer-progress": `${ratio * 360}deg`
  } as CSSProperties;

  useEffect(() => {
    setRemainingMs(getRemainingMs(minutes, updatedAt));

    if (minutes === null || terminalLabel) {
      return;
    }

    const interval = window.setInterval(() => {
      setRemainingMs(getRemainingMs(minutes, updatedAt));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [minutes, updatedAt, terminalLabel]);

  return (
    <div
      className={`live-wait-timer live-wait-timer-${variant}${paused ? " live-wait-timer-paused" : ""}`}
      style={timerStyle}
    >
      <div className="live-wait-timer-copy">
        <span>{label}</span>
        <strong>{formatRemaining(remainingMs, terminalLabel)}</strong>
        <small>{helper ?? getTimerMood(remainingMs, paused, terminalLabel)}</small>
      </div>
      <div className="live-wait-timer-ring" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
