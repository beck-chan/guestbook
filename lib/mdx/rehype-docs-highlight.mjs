import bash from "highlight.js/lib/languages/bash";
import markdown from "highlight.js/lib/languages/markdown";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import rehypeHighlight from "rehype-highlight";

const languages = {
  bash,
  sh: bash,
  shell: bash,
  markdown,
  md: markdown,
  mdx: markdown,
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
