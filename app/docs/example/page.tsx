import Guide, { toc, title, frontmatter } from "./content.mdx";
import { DocsPage } from "../_components/DocsPage";

export const metadata = { title };

export default function Page() {
  return (
    <DocsPage toc={toc} frontmatter={frontmatter}>
      <Guide />
    </DocsPage>
  );
}


// Example TOC imports from snippets

// import Guide, { toc as guideToc, title } from "./content.mdx";
// import { DocsPage } from "../_components/DocsPage";
// import { toc as previewToc } from "../_snippets/preview.mdx";
// import { toc as buildToc } from "../_snippets/build.mdx";

// const toc = [...guideToc, ...previewToc, ...buildToc];
