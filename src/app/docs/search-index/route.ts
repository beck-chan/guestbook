import { getDocsSearchIndex } from "@/lib/docs/searchIndex";

export const dynamic = "force-static";

export function GET() {
  return Response.json(getDocsSearchIndex(), {
    headers: {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
