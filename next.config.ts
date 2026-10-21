import type { NextConfig } from "next";

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
            value: [
              "default-src 'self'",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "img-src 'self' data:",
              // Next's App Router relies on inline bootstrap + RSC-flight scripts,
              // so `script-src 'self'` alone would block hydration. A nonce-based
              // policy would need middleware; without that, 'unsafe-inline' for
              // scripts is required. The directives above still buy real
              // protection (clickjacking, plugin/base-URI abuse), which is more
              // than the previous "no CSP at all".
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "connect-src 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
