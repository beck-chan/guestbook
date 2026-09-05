import Guide, { toc as guideToc, title } from "./content.mdx";
import { DocsPage } from "../_components/DocsPage";
import { toc as previewToc } from "../_snippets/preview.mdx";
import { toc as buildToc } from "../_snippets/build.mdx";

export const metadata = { title };

const toc = [...guideToc, ...previewToc, ...buildToc];

export default function Page() {
  return (
    <DocsPage toc={toc}>
      <Guide />
    </DocsPage>
  );
}
