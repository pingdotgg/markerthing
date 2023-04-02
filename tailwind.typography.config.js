/*
  Config for our tailwind typography instance
  @see https://github.com/tailwindlabs/tailwindcss-typography/blob/master/src/styles.js
*/
const round = (num) =>
  num
    .toFixed(7)
    .replace(/(\.[0-9]+?)0+$/, "$1")
    .replace(/\.0$/, "");
const em = (px, base) => `${round(px / base)}em`;

module.exports = (theme) => ({
  sm: {
    css: {
      kdb: {
        fontSize: em(12, 14),
      },
    },
  },
  DEFAULT: {
    css: {
      color: theme("colors.gray.100"),
      strong: {
        color: theme("colors.gray.200"),
      },
      a: {
        color: theme("colors.pink.400"),
        textDecoration: "none",
        "&:hover": {
          color: theme("colors.pink.400"),
          textDecoration: "underline",
        },
      },
      kbd: {
        color: theme("colors.gray.300"),
        fontSize: em(14, 16),
        fontWeight: theme("fontWeight.medium"),
        backgroundColor: theme("colors.gray.750"),
        borderColor: theme("colors.gray.700"),
        borderWidth: theme("borderWidth.DEFAULT"),
        borderRadius: theme("borderRadius.sm"),
        padding: theme("spacing[0.5]"),
      },
      code: {
        color: theme("colors.gray.300"),
        fontSize: em(14, 16),
        fontWeight: theme("fontWeight.medium"),
        backgroundColor: theme("colors.gray.800"),
        borderColor: theme("colors.gray.750"),
        borderWidth: theme("borderWidth.DEFAULT"),
        borderRadius: theme("borderRadius.sm"),
        padding: theme("spacing[0.5]"),
        "&::before": {
          display: "none",
        },
        "&::after": {
          display: "none",
        },
      },
      h2: {
        color: theme("colors.gray.300"),
      },
      h3: {
        color: theme("colors.gray.300"),
      },
      h4: {
        color: theme("colors.gray.300"),
      },
      h5: {
        color: theme("colors.gray.300"),
      },
      ol: {
        li: {
          "&::before": {
            color: theme("colors.gray.300"),
          },
        },
      },
      th: {
        color: theme("colors.gray.300"),
      },
    },
  },
});
