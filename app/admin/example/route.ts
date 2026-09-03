import { readFileSync } from "node:fs";

export const dynamic = "force-static";

const css = readFileSync(new URL("../example.css", import.meta.url), "utf8");

export function GET() {
  return new Response(css, {
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
