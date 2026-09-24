/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "static-cdn.jtvnw.net" },
      { protocol: "https", hostname: "vod-secure.twitch.tv" },
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
};

const withMdx = require("@next/mdx")()(nextConfig);

const { withPlausibleProxy } = require("next-plausible");

module.exports = withPlausibleProxy()(withMdx);
