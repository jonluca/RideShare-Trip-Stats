import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  targetBrowsers: ["chrome", "edge", "firefox", "safari"],
  zip: {
    includeSources: [
      ".yarnrc.yml",
      "LICENSE",
      "PRIVACY.md",
      "README.md",
      "css/main.css",
      "entrypoints/**",
      "eslint.config.mjs",
      "fonts/sf-compact-*",
      "package.json",
      "public/images/**",
      "src/**",
      "tsconfig.json",
      "wxt.config.ts",
      "yarn.lock",
    ],
  },
  manifest: ({ browser }) => ({
    name: "RideShare Trip Stats",
    description: "Analyzes your Uber ride history and displays trip, spending, distance, and time statistics.",
    permissions: ["activeTab", "scripting", "storage"],
    action: {
      default_title: "Analyze Uber ride history",
    },
    homepage_url: "https://github.com/jonluca/RideShare-Trip-Stats",
    icons: {
      16: "images/icon16.png",
      32: "images/icon32.png",
      64: "images/icon64.png",
      128: "images/icon128.png",
    },
    ...(browser === "firefox"
      ? {
          browser_specific_settings: {
            gecko: {
              id: "rideshare-trip-stats@jonluca.com",
              data_collection_permissions: {
                required: ["none"],
              },
            },
          },
        }
      : {}),
  }),
});
