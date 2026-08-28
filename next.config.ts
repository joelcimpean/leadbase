import type {
  NextConfig,
} from "next";

const nextConfig:
  NextConfig = {
    experimental: {
      proxyClientMaxBodySize:
        "20mb",
    },

    /*
     * Keep Chromium and Playwright as real Node.js packages
     * on the server instead of bundling/relocating them.
     *
     * @sparticuz/chromium resolves its binary files relative
     * to its own node_modules directory.
     */
    serverExternalPackages: [
      "@sparticuz/chromium",
      "playwright-core",
    ],

    /*
     * Next.js/Vercel output tracing does not automatically
     * detect the Brotli-compressed Chromium binaries because
     * @sparticuz/chromium resolves them dynamically.
     *
     * Force those files into the Vercel server deployment.
     */
    outputFileTracingIncludes: {
      "/*": [
        "./node_modules/@sparticuz/chromium/bin/**/*",
      ],
    },
  };

export default nextConfig;