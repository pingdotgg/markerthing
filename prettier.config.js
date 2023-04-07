// I only have this file because pnpm breaks prettier autoconfigs without it
// See: https://github.com/pnpm/pnpm/issues/4700

module.exports = {
  plugins: [require("prettier-plugin-tailwindcss")],
};
