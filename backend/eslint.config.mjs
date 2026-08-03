import parentConfig from "../eslint.config.mjs";

const config = [
  ...parentConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

export default config;
