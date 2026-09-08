import fs from "node:fs";
import path from "node:path";

export async function GET() {
  const file = path.join(
    process.cwd(),
    "node_modules/@scalar/api-reference/dist/browser/standalone.js",
  );
  const body = fs.readFileSync(file);

  return new Response(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
