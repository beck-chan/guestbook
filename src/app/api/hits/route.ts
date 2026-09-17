import { NextResponse } from "next/server";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getUniqueVisitors();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
