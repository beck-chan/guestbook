import { loadDatabaseOpenApi } from "@/lib/docs/loadDatabaseOpenApi";

function explorerHtml(specJson: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API reference</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&display=block" rel="stylesheet" />
  <style>
    :root {
      --futura-font: "futura-pt", Jost, sans-serif;
      --peony: #ff6162;
      --ink: #2f2e2c;
      --ink-muted: #6a6864;
      --paper: #faf6ea;
      --paper-hi: #f7f1e4;
      --paper-dim: #e9e6df;
      --scalar-font: var(--futura-font);
      --scalar-font-code: var(--futura-font);
      --scalar-color-1: var(--ink);
      --scalar-color-2: var(--ink-muted);
      --scalar-color-3: var(--ink-muted);
      --scalar-color-accent: var(--peony);
      --scalar-background-1: #fff;
      --scalar-background-2: var(--paper);
      --scalar-background-3: var(--paper-hi);
      --scalar-border-color: var(--paper-dim);
    }
    html, body, #app {
      margin: 0;
      height: 100%;
      background: #fff;
      color: var(--ink);
      font-family: var(--futura-font);
    }
    .scalar-app, .scalar-app * {
      font-family: var(--futura-font) !important;
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>window.__OPENAPI__ = ${specJson};</script>
  <script src="/docs/api/scalar-standalone"></script>
  <script>
    window.Scalar.createApiReference("#app", {
      content: window.__OPENAPI__,
      layout: "classic",
      theme: "none",
      darkMode: false,
      forceDarkModeState: "light",
      hideDarkModeToggle: true,
      isEditable: false,
      documentDownloadType: "none",
      showSidebar: true,
      showDeveloperTools: "always",
      customCss: ".scalar-app,.scalar-app *{font-family:var(--futura-font)!important}"
    });
  </script>
</body>
</html>`;
}

export async function GET() {
  const spec = loadDatabaseOpenApi();
  const specJson = JSON.stringify(spec)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return new Response(explorerHtml(specJson), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
