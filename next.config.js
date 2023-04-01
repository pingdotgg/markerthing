/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ["static-cdn.jtvnw.net"],
  },
};

module.exports = nextConfig;
