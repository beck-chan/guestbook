export type TemplateVars = Record<string, string>;

const cache = new Map<string, string>();

export async function loadMail(
  name: string,
  vars: TemplateVars,
): Promise<{ subject: string; text: string }> {
  let source = cache.get(name);
  if (source === undefined) {
    source = await Deno.readTextFile(
      new URL(`./templates/${name}.md`, import.meta.url),
    );
    cache.set(name, source);
  }
  return renderMail(source, vars);
}

export function renderMail(
  source: string,
  vars: TemplateVars,
): { subject: string; text: string } {
  const { subject, body } = parseTemplate(source);
  return {
    subject: interpolate(subject, vars).trim(),
    text: interpolate(body, vars).replace(/\n{3,}/g, "\n\n").trim(),
  };
}

function parseTemplate(source: string): { subject: string; body: string } {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  if (text.startsWith("---\n")) {
    const end = text.indexOf("\n---\n", 4);
    if (end !== -1) {
      const front = text.slice(4, end);
      const body = text.slice(end + 5).replace(/^\n/, "");
      const subject =
        front
          .split("\n")
          .map((line) => line.match(/^subject:\s*(.*)$/i)?.[1]?.trim())
          .find((value) => value !== undefined) ?? "";
      return { subject, body };
    }
  }
  const heading = text.match(/^#\s+(.+)\n/);
  if (heading) {
    return { subject: heading[1].trim(), body: text.slice(heading[0].length).replace(/^\n/, "") };
  }
  return { subject: "", body: text };
}

function interpolate(source: string, vars: TemplateVars): string {
  return source.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
