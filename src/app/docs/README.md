## .MDX Autocomplete

These configurations only affect Cursor/VS Code IntelliSense, not the documentation build:

- [`tsconfig.json`](/tsconfig.json) comments out `"src/**/*.mdx"` in `include` so `tsserver` does not load docs MDX. Uncomment that line when you want docs autocomplete (`mdx.server.enable`).
- [`.vscode/settings.json`](/.vscode/settings.json) sets `mdx.server.enable` to `false` (docs autocomplete off; Next still compiles MDX) and `typescript.disableAutomaticTypeAcquisition` so `tsserver` does not download `@types` packages in the background.