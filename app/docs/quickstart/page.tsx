import Guide, { toc as guideToc, title } from "./content.mdx";
import { toc as previewToc } from "../_snippets/preview.mdx";
import { toc as buildToc } from "../_snippets/build.mdx";
import { toc as installNextToc } from "../_snippets/install-next.mdx";
import { DocsPage } from "../_components/DocsPage";

export const metadata = { title };

const toc = [...guideToc, ...previewToc, ...buildToc, ...installNextToc];

export default function Page() {
  return (
    <DocsPage toc={toc}>
      <Guide />
    </DocsPage>
  );
}
