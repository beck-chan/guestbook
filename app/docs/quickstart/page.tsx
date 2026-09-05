import { DocsTabset } from "../DocsTabset";
import { DocsToc } from "../DocsToc";

const TOC = [
  { href: "#use-this-template", label: "Use this template" },
  { href: "#configure-your-project", label: "Configure your project" },
  { href: "#run-locally", label: "Run locally" },
  { href: "#deploy", label: "Deploy" },
  { href: "#next-steps", label: "Next steps" },
  { href: "#troubleshooting", label: "Troubleshooting" },
  { href: "#faq", label: "FAQ" },
  { href: "#limits", label: "Limits" },
  { href: "#changelog", label: "Changelog" },
];

function Lorem() {
  return (
    <p>
      Cum sociis natoque penatibus et magnis dis parturient montes, nascetur
      ridiculus mus. Donec ullamcorper nulla non metus auctor fringilla.
      Vestibulum id ligula porta felis euismod semper. Etiam porta sem malesuada
      magna mollis euismod.
    </p>
  );
}

export default function QuickstartPage() {
  return (
    <>
      <DocsToc items={TOC} />
      <article className="docs-article">
        <h1 className="docs-title">Quickstart</h1>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer
          posuere erat a ante venenatis dapibus posuere velit aliquet.{" "}
          <a href="https://beck-chan.github.io/">Cras mattis consectetur purus</a>{" "}
          sit amet fermentum. Aenean lacinia bibendum nulla sed consectetur.
          Nullam quis risus eget urna mollis ornare vel eu leo.
        </p>
        <h2 id="use-this-template" className="docs-heading">
          Use this template
        </h2>
        <Lorem />
        <h3 id="copy-the-repo" className="docs-subheading">
          Copy the repo
        </h3>
        <p>
          Maecenas faucibus mollis interdum. Sed posuere consectetur est at
          lobortis. Curabitur blandit tempus porttitor. Nullam id dolor id nibh
          ultricies vehicula ut id elit. Aenean eu leo quam. Pellentesque ornare
          sem lacinia quam venenatis vestibulum.
        </p>
        <h2 id="configure-your-project" className="docs-heading">
          Configure your project
        </h2>
        <Lorem />
        <h2 id="run-locally" className="docs-heading">
          Run locally
        </h2>
        <Lorem />
        <pre className="docs-code">
          <code>{`npm install
npm run dev`}</code>
        </pre>
        <DocsTabset
          tabs={[
            {
              label: "Tab 1",
              content: (
                <>
                  <p>
                    Maecenas sed diam eget risus varius blandit sit amet non
                    magna. Integer posuere erat a ante venenatis dapibus posuere
                    velit aliquet.
                  </p>
                  <pre className="docs-code">
                    <code>{`npm install
npm run dev`}</code>
                  </pre>
                </>
              ),
            },
            {
              label: "Tab 2",
              content: (
                <>
                  <p>
                    Cras justo odio, dapibus ac facilisis in, egestas eget quam.
                    Nullam quis risus eget urna mollis ornare vel eu leo.
                  </p>
                  <pre className="docs-code">
                    <code>{`pnpm install
pnpm dev`}</code>
                  </pre>
                </>
              ),
            },
          ]}
        />
        <h2 id="deploy" className="docs-heading">
          Deploy
        </h2>
        <Lorem />
        <h2 id="next-steps" className="docs-heading">
          Next steps
        </h2>
        <Lorem />
        <h2 id="troubleshooting" className="docs-heading">
          Troubleshooting
        </h2>
        <Lorem />
        <h2 id="faq" className="docs-heading">
          FAQ
        </h2>
        <Lorem />
        <h2 id="limits" className="docs-heading">
          Limits
        </h2>
        <Lorem />
        <h2 id="changelog" className="docs-heading">
          Changelog
        </h2>
        <Lorem />
        <a className="docs-cta" href="#">
          Get started
        </a>
      </article>
    </>
  );
}
