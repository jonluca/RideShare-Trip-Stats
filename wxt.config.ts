import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  targetBrowsers: ["chrome", "edge", "firefox", "safari"],
  zip: {
    includeSources: [
      "LICENSE",
      "PRIVACY.md",
      "README.md",
      "css/main.css",
      "entrypoints/**",
      ".oxfmtrc.json",
      ".oxlintrc.json",
      "fonts/sf-compact-*",
      "package.json",
      "public/images/**",
      "src/**",
      "tsconfig.json",
      "wxt.config.ts",
    ],
  },
  manifest: ({ browser }) => ({
    name: "RideShare Trip Stats",
    description:
      "Analyzes Uber rides and Uber Eats web history locally with lifetime trip, order, spending, distance, and pattern statistics.",
    permissions: ["activeTab", "storage"],
    action: {
      default_title: "Analyze Uber ride or Eats history",
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
              strict_min_version: "140.0",
              data_collection_permissions: {
                required: ["none"],
              },
            },
            gecko_android: {
              strict_min_version: "142.0",
            },
          },
        }
      : {}),
  }),
});
