/** Names removed from the API Library. Docs chat entries are shown on /docs/bot-build. */

const META_RPCS = ["rls_auto_enable", "hook_before_user_created"] as const;

const DOCS_TABLES = [
  "docs_query_embedding",
  "docs_chat_message",
  "docs_section",
  "docs_chat_limits",
  "docs_chat_session",
] as const;

const DOCS_RPCS = ["search_docs_sections", "match_docs_sections"] as const;

const metaRpcs = new Set<string>(META_RPCS);
const docsTables = new Set<string>(DOCS_TABLES);
const docsRpcs = new Set<string>(DOCS_RPCS);

export function catalogTagKey(name: string) {
  return name.trim().toLowerCase().replace(/^\(rpc\)\s+/, "");
}

function rpcPath(name: string) {
  return `/rpc/${name}`;
}

function tablePath(name: string) {
  return `/${name}`;
}

const docsCatalogPaths = new Set<string>([
  ...DOCS_TABLES.map(tablePath),
  ...DOCS_RPCS.map(rpcPath),
]);

const hiddenLibraryPaths = new Set<string>([
  "/",
  "",
  ...META_RPCS.map(rpcPath),
  ...docsCatalogPaths,
]);

export function isDocsCatalogPath(path: string) {
  return docsCatalogPaths.has(path.trim().toLowerCase());
}

export function isHiddenLibraryPath(path: string) {
  return hiddenLibraryPaths.has(path.trim().toLowerCase());
}

export function isHiddenLibraryTag(name: string) {
  if (name.trim().toLowerCase() === "introspection") {
    return true;
  }
  const key = catalogTagKey(name);
  return metaRpcs.has(key) || docsTables.has(key) || docsRpcs.has(key);
}

export function isHiddenLibraryOperation(tag: string, path: string) {
  return isHiddenLibraryTag(tag) || isHiddenLibraryPath(path);
}

export const HIDDEN_LIBRARY_PATHS = hiddenLibraryPaths;

export function hiddenLibraryPathList() {
  return hiddenLibraryPaths;
}

export const HIDDEN_API_SEARCH =
  /rls_auto_enable|hook_before_user_created|docs_query_embedding|docs_chat_messages?|docs_chat_limits|docs_chat_session|docs_section|search_docs_sections|match_docs_sections/i;
