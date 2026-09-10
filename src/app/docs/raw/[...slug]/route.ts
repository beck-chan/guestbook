import {
  getComposedDocBySlug,
} from "@/lib/docs/llmIngestion";
import { getDocsCorpus } from "@/lib/docs/compose";

export const dynamic = "force-static";

type RouteParams = { params: Promise<{ slug: string[] }> };

export function generateStaticParams() {
  return getDocsCorpus().map((doc) => ({
    slug: doc.slug.split("/").filter(Boolean),
  }));
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug: parts } = await params;
  const slug = (parts ?? []).join("/");
  const doc = getComposedDocBySlug(slug);

  if (!doc) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(doc.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
