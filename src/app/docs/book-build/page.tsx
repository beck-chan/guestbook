import Guide, { toc, title, frontmatter } from "./content.mdx";
import { DocsMermaid } from "../_components/DocsMermaid";
import { DocsPage } from "../_components/DocsPage";

export const metadata = { title };

export default function Page() {
  return (
    <DocsPage toc={toc} frontmatter={frontmatter}>
      <Guide components={{ DocsMermaid }} />
    </DocsPage>
  );
}
