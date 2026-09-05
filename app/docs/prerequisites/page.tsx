import Guide, { toc } from "./content.mdx";
import { DocsPage } from "../_components/DocsPage";

export default function Page() {
  return (
    <DocsPage toc={toc}>
      <Guide />
    </DocsPage>
  );
}
