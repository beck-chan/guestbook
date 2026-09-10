/**
 * Expand a search term with light English inflectional variants so queries
 * like "managing" match indexed "manage" (and the reverse).
 */
export function expandDocsSearchTerm(term: string): string[] {
  const t = term.toLowerCase();
  if (t.length < 2) {
    return [t];
  }

  const out = new Set<string>([t]);

  function add(base: string) {
    if (base.length >= 2) {
      out.add(base);
    }
  }

  if (t.endsWith("ies") && t.length > 5) {
    add(`${t.slice(0, -3)}y`);
  }
  if (t.endsWith("ing") && t.length > 5) {
    const stem = t.slice(0, -3);
    add(stem);
    add(`${stem}e`);
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) {
      add(stem.slice(0, -1));
    }
  }
  if (t.endsWith("ied") && t.length > 5) {
    add(`${t.slice(0, -3)}y`);
  }
  if (t.endsWith("ed") && t.length > 4) {
    const stem = t.slice(0, -2);
    add(stem);
    add(`${stem}e`);
    if (stem.length >= 2 && stem.at(-1) === stem.at(-2)) {
      add(stem.slice(0, -1));
    }
  }
  if (t.endsWith("es") && t.length > 4 && !t.endsWith("ies")) {
    add(t.slice(0, -2));
    add(t.slice(0, -1));
  } else if (t.endsWith("s") && t.length > 3 && !t.endsWith("ss")) {
    add(t.slice(0, -1));
  }

  // Index-time: also register common forms from a bare stem ("manage").
  if (
    t.length >= 4 &&
    !t.endsWith("s") &&
    !t.endsWith("ed") &&
    !t.endsWith("ing")
  ) {
    add(`${t}s`);
    if (t.endsWith("y") && t.length > 3) {
      add(`${t.slice(0, -1)}ies`);
    }
    if (t.endsWith("e")) {
      add(`${t}d`);
      add(`${t.slice(0, -1)}ing`);
    } else {
      add(`${t}ed`);
      add(`${t}ing`);
    }
  }

  return [...out];
}
