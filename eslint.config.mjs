import eslint from "@eslint/js";
import prettierPlugin from "eslint-plugin-prettier";
import unusedImportsPlugin from "eslint-plugin-unused-imports";
import reactPlugin from "eslint-plugin-react";
import prettierExtends from "eslint-config-prettier";
import { fixupPluginRules } from "@eslint/compat";
import globals from "globals";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import promisePlugin from "eslint-plugin-promise";

const globalToUse = {
  ...globals.browser,
  ...globals.serviceworker,
  ...globals.es2021,
  ...globals.worker,
  ...globals.node,
};

const ignores = [
  "client/cypress/plugins/index.js",
  ".lintstagedrc.js",
  ".next/**/*",
  "**/.next/**/*",
  "**/.yarn/**/*",
  "**/.expo/**/*",
  "**/dist/**/*",
  "public/js/*",
  ".yarn/js/*",
  "ui/out/**/*",
  "ios/**/*",
  "android/**/*",
  "electron/build/**/*",
  "public/*.js",
  "public/*.map",
];
/** @type {import('@typescript-eslint/utils').FlatConfig.ConfigArray} */
const configs = tseslint.config(
  {
    ignores,

    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, promisePlugin.configs["flat/recommended"], prettierExtends],
    plugins: {
      promise: promisePlugin,
      prettierPlugin,
      "unused-imports": fixupPluginRules(unusedImportsPlugin),
      react: reactPlugin,
      "react-hooks": fixupPluginRules(hooksPlugin),
    },
    rules: {
      "no-constant-condition": ["error", { checkLoops: false }],
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
      "@typescript-eslint/ban-types": "off",
      "no-prototype-builtins": "off",
      "no-html-link-for-pages": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "prefer-const": "error",
      "promise/no-callback-in-promise": "off",
      curly: ["error", "all"],
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-empty": "off",
      "no-case-declarations": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-control-regex": "off",
      "promise/always-return": "off",
      "promise/catch-or-return": "off",
      // "no-restricted-exports": ["error", { restrictDefaultExports: { direct: true } }],
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
        },
      ],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react/jsx-curly-brace-presence": ["error", { props: "always", children: "ignore", propElementValues: "always" }],
      "unused-imports/no-unused-imports": "error",
      "object-shorthand": "error",
      "no-async-promise-executor": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
    languageOptions: {
      globals: globalToUse,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: { version: "detect" },
      "import-x/resolver": {
        typescript: {
          alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/unist`

          // Choose from one of the "project" configs below or omit to use <root>/tsconfig.json by default

          // // use <root>/path/to/folder/tsconfig.json
          // project: "path/to/folder",
          //
          // // Multiple tsconfigs (Useful for monorepos)
          //
          // // use a glob pattern
          // project: "packages/*/tsconfig.json",
          //
          // // use an array
          // project: ["packages/module-a/tsconfig.json", "packages/module-b/tsconfig.json"],
          //
          // // use an array of glob patterns
          // project: ["packages/*/tsconfig.json", "other-packages/*/tsconfig.json"],
        },
      },
    },
  },
  { ignores },
);
export default configs;
