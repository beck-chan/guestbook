import "server-only";

import fs from "node:fs";
import path from "node:path";
import { flags } from "@/lib/flags";
import { typesToOpenApi, type OpenApiSpec } from "./typesToOpenApi";

const API_DIR = path.join(process.cwd(), "src/app/docs/api");
const PAIR_FILES = ["database.types.ts", "database.types-public.ts"] as const;

export function assertDatabaseTypesPair() {
  for (const name of PAIR_FILES) {
    const resolved = path.join(API_DIR, name);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Docs API types file missing: ${name}`);
    }
  }
}

export function resolveDatabaseTypesPath(isPublic = flags.public) {
  assertDatabaseTypesPair();
  return path.join(
    API_DIR,
    isPublic ? "database.types-public.ts" : "database.types.ts",
  );
}

export function loadDatabaseOpenApi(isPublic = flags.public): OpenApiSpec {
  const file = resolveDatabaseTypesPath(isPublic);
  const source = fs.readFileSync(file, "utf8");
  const spec = typesToOpenApi(source, {
    title: isPublic
      ? "y2k Guestbook API"
      : "Beck's y2k Guestbook API",
    description: isPublic
      ? "The API reference below reflects the calls you can make to your connected Supabase database when the guestbook is fully installed."
      : "The API reference below reflects the functionality of Beck's custom guestbook install. [View Public API Library](https://y2k-guestbook.vercel.app/docs/api)",
  });

  if (isPublic) {
    const origin = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    if (origin) {
      spec.servers = [{ url: `${origin}/rest/v1` }];
    }
  }

  return spec;
}
