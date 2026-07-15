import crypto from "node:crypto";

import { appConfig } from "./config";

const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey as Buffer);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, expectedHash] = storedHash.split(":");

  if (!salt || !expectedHash) {
    return false;
  }

  const derivedKey = await scryptAsync(password, salt);
  const actualBuffer = Buffer.from(derivedKey.toString("hex"), "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function validatePasswordStrength(password: string) {
  const minLength = appConfig.auth.passwordMinLength;
  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters.`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include a lowercase letter.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include an uppercase letter.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must include a number.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must include a symbol.");
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
