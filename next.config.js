/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,

    // TODO: Restore this whenever app router is unfucked
    // runtime: "experimental-edge",
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
  swcMinify: true,
};

const withMdx = require("@next/mdx")()(nextConfig);

const { withPlausibleProxy } = require("next-plausible");

module.exports = withPlausibleProxy()(withMdx);
