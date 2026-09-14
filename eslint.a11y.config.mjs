import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tsParser from "@typescript-eslint/parser";

const recommended = jsxA11y.flatConfigs.recommended;

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/**",
  ]),
  {
    ...recommended,
    files: ["**/*.{js,jsx,mjs,ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    // Satisfy inline disable comments for other plugins without enabling them.
    plugins: {
      ...recommended.plugins,
      "react-hooks": {
        rules: {
          "exhaustive-deps": { create() { return {}; } },
        },
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
]);

export default eslintConfig;
