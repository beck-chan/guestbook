import bash from "highlight.js/lib/languages/bash";
import gherkin from "highlight.js/lib/languages/gherkin";
import javascript from "highlight.js/lib/languages/javascript";
import markdown from "highlight.js/lib/languages/markdown";
import pgsql from "highlight.js/lib/languages/pgsql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import rehypeHighlight from "rehype-highlight";

const languages = {
  bash,
  sh: bash,
  shell: bash,
  gherkin,
  feature: gherkin,
  cucumber: gherkin,
  javascript,
  js: javascript,
  jsx: javascript,
  mjs: javascript,
  cjs: javascript,
  markdown,
  md: markdown,
  mdx: markdown,
  // Turbopack treats `highlight.js/lib/languages/sql` as a .sql file.
  sql: pgsql,
  pgsql,
  typescript,
  ts: typescript,
  tsx: typescript,
  xml,
  html: xml,
  yaml,
  yml: yaml,
};

export default function rehypeDocsHighlight() {
  return rehypeHighlight({ languages });
}
