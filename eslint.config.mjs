import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";

export default [
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    linterOptions: { reportUnusedDisableDirectives: "off" },
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
