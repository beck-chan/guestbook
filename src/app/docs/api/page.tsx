import Guide, { toc, title } from "./content.mdx";
import { DocsApiReference } from "../_components/DocsApiReference";
import { DocsPage } from "../_components/DocsPage";

export const metadata = { title };

export default function Page() {
  return (
    <DocsPage toc={toc}>
      <Guide />
      <DocsApiReference />
    </DocsPage>
  );
}
