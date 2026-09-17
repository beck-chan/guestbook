import { NextResponse } from "next/server";
import { getUniqueVisitors } from "@/lib/uniqueVisitors";

export const dynamic = "force-dynamic";

export async function GET() {
  const count = await getUniqueVisitors();
  return NextResponse.json({ count });
}
