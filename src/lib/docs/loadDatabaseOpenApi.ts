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
  return typesToOpenApi(source, {
    title: isPublic
      ? "y2k Guestbook Database API"
      : "Beck's y2k Guestbook Database API",
    description: isPublic
      ? "Schema map of the connected Supabase `public` schema after a full guestbook install, generated from database types. Row-level security still applies at runtime."
      : "Schema map of Beck's custom guestbook install (`public` schema), generated from database types. Row-level security still applies at runtime.",
  });
}
