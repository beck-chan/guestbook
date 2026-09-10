import { buildLlmsTxt } from "@/lib/docs/llmIngestion";

export const dynamic = "force-static";

export function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
