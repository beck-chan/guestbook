# .MDX Extension

> https://marketplace.cursorapi.com/items/?itemName=unifiedjs.vscode-mdx

These configs only affect Cursor/VS Code IntelliSense. Next still compiles docs (`npm run docs` / `npm run build`) either way.

<!-- ## What is the MDX extension and what does it do? -->

Cursor does not understand `.mdx` by itself. The **MDX** extension (`unifiedjs.vscode-mdx`) adds that.

It does two separate things:

1. **MDX language server** (`mdx.server.enable`) — IntelliSense while you have an `.mdx` file focused (completions, outlines, some markdown/MDX diagnostics).
2. **TypeScript plugin** (`@mdx-js/typescript-plugin`) — attached to `tsserver` for the whole window. It lets TypeScript treat docs MDX as part of the guestbook project (imports, JSX in MDX, go-to-definition). This is the expensive part: with docs in `tsconfig` `include`, `tsserver` grew to ~1.5 GB.

Neither is used when Next compiles docs. `@next/mdx` / the loader builds the pages whether this extension is on or off.

Syntax highlighting can still come from the extension’s grammar even when the language server is off. Unloading the TypeScript plugin requires disabling the extension for this workspace (see below).

## Disabled 

Currently uninstalled as it was slowing down Cursor.

- [`tsconfig.json`](../../../../tsconfig.json) comments out `"src/**/*.mdx"` in `include` so `tsserver` does not load docs MDX.
- [`.vscode/settings.json`](../../../../.vscode/settings.json) (guestbook window) and the parent `beck-chan/.vscode/settings.json` (this multi-repo window) set `"mdx.server.enable": false` and `"typescript.disableAutomaticTypeAcquisition": true`.

`mdx.server.enable` only stops the MDX language server. The MDX extension still injects `@mdx-js/typescript-plugin` into `tsserver` until the extension itself is disabled.

To unload that plugin: Extensions → **MDX** (`unifiedjs.vscode-mdx`) → gear → **Disable (Workspace)** → **Developer: Reload Window**.

## Reenable

To reinstall: https://marketplace.cursorapi.com/items/?itemName=unifiedjs.vscode-mdx

1. Enable the MDX extension for this workspace.
2. Set `"mdx.server.enable": true` in the `.vscode/settings.json` for the folder you opened as the window.
3. Uncomment `"src/**/*.mdx"` in `tsconfig.json`.
4. Reload the window (or open a `.tsx` file and run **TypeScript: Restart TS Server**).
