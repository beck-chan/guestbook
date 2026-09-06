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

