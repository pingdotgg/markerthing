/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    mdxRs: true,
  },
  images: {
    domains: ["static-cdn.jtvnw.net", "vod-secure.twitch.tv"],
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

const withMdx = require("@next/mdx")()(nextConfig);

const { withPlausibleProxy } = require("next-plausible");

module.exports = withPlausibleProxy()(withMdx);
