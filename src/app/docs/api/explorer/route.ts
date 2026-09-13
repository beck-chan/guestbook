import {
  SCALAR_STANDALONE_SRC,
  createScalarReferenceConfig,
} from "@/lib/docs/scalarConfig";
import { loadDatabaseOpenApi } from "@/lib/docs/loadDatabaseOpenApi";

function explorerHtml(specJson: string, configJson: string) {
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
      --cover: #0b2a12;
      --peony: #ff6162;
      --peony-hot: #ff8586;
      --ink: #2f2e2c;
      --ink-muted: #6a6864;
      --paper: #faf6ea;
      --paper-hi: #f7f1e4;
      --paper-dim: #e9e6df;
    }
    html, body, #app {
      margin: 0;
      height: 100%;
      background: #fff;
      color: var(--ink);
      font-family: var(--futura-font);
    }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>window.__OPENAPI__ = ${specJson};</script>
  <script>window.__SCALAR_CONFIG__ = ${configJson};</script>
  <script src="${SCALAR_STANDALONE_SRC}"></script>
  <script>
    window.__SCALAR_CONFIG__.content = window.__OPENAPI__;
    window.Scalar.createApiReference("#app", window.__SCALAR_CONFIG__);
  </script>
</body>
</html>`;
}

export async function GET() {
  const spec = await loadDatabaseOpenApi();
  const specJson = JSON.stringify(spec)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  const configJson = JSON.stringify({
    ...createScalarReferenceConfig(),
    plugins: undefined,
    onBeforeRequest: undefined,
  })
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return new Response(explorerHtml(specJson, configJson), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
