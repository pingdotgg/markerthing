/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,

    // TODO: Restore this whenever app router is unfucked
    // runtime: "experimental-edge",
  },
  images: {
    domains: ["static-cdn.jtvnw.net", "vod-secure.twitch.tv"],
  },
};

const { withPlausibleProxy } = require("next-plausible");

module.exports = withPlausibleProxy()(nextConfig);
