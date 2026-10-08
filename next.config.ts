import type { NextConfig } from "next";

const isLocalDevelopment = process.env.NODE_ENV !== "production";
const localConnections = isLocalDevelopment
  ? " http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*"
  : "";

const securityHeaders = [
  { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; frame-src http://localhost:* http://127.0.0.1:* https://www.youtube.com https://www.youtube-nocookie.com https://checkout.stripe.com https://js.stripe.com https://*.js.stripe.com https://hooks.stripe.com; object-src 'none'; script-src 'self' 'unsafe-inline'${isLocalDevelopment ? " 'unsafe-eval'" : ""} https://checkout.stripe.com https://js.stripe.com https://*.js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.github.com https://api.mistral.ai https://api.stripe.com https://checkout.stripe.com${localConnections};${process.env.NODE_ENV === "production" ? " upgrade-insecure-requests" : ""}` },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
    ],
  },
  logging: {
    browserToTerminal: "warn",
    fetches: { fullUrl: false },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
