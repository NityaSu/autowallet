const DEV_FALLBACK = "dev-only-change-me-autowallet";

export function assertAuthSecretConfigured() {
  if (process.env.NODE_ENV !== "production") return;
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret === DEV_FALLBACK || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to a long random string in production.",
    );
  }
}

export function authSecretKey() {
  assertAuthSecretConfigured();
  const secret = process.env.AUTH_SECRET ?? DEV_FALLBACK;
  return new TextEncoder().encode(secret);
}
