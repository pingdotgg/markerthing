/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    runtime: "experimental-edge",
    mdxRs: true,
  },
  images: {
    domains: ["static-cdn.jtvnw.net", "vod-secure.twitch.tv"],
  },
};

const withMdx = require("@next/mdx")()(nextConfig);

const { withPlausibleProxy } = require("next-plausible");

module.exports = withPlausibleProxy()(withMdx);
