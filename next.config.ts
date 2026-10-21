import type { NextConfig } from "next";

// React's development build uses eval() to reconstruct callstacks and run other
// debug features, and Turbopack's HMR uses websockets. Neither is needed in
// production, so 'unsafe-eval'/ws are granted only when running `next dev`.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "img-src 'self' data:",
  // The App Router injects inline bootstrap + RSC-flight scripts, so
  // 'unsafe-inline' is required for scripts and styles; a nonce-based policy
  // would need middleware. 'unsafe-eval' is development-only.
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  isDev ? "connect-src 'self' ws: wss:" : "connect-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  // The CSV importer advertises a 5 MB cap, but Next caps Server Action request
  // bodies at 1 MB by default — anything in between died with an opaque 500
  // before the friendly in-app check could fire. Raise the framework ceiling a
  // little above the advertised limit so the app's own message always wins.
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },

  // Never advertise the framework/version.
  poweredByHeader: false,

  // Baseline hardening. Low-impact while this only runs on localhost, but these
  // matter the moment it sits behind a proxy or is ever hosted: the app exposes
  // state-changing Server Actions, so clickjacking (frame-ancestors) is a real
  // concern even without a CSRF hole.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Content-Security-Policy",
            value: csp,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
