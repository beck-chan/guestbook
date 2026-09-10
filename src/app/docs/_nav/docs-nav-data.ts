import { flags, releasesUrl, reportIssueUrl } from "@/lib/flags";

export type DocsNavItem = {
  label: string;
  href?: string;
  target?: string;
  rel?: string;
};

export type DocsNavSection = {
  title: string;
  items?: DocsNavItem[];
};

export const DOCS_NAV_SECTIONS: DocsNavSection[] = [
  {
    title: "Installation",
    items: [
      { label: "Prerequisites", href: "/docs/prerequisites" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Install with npm", href: "/docs/install" },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "Manage Admin Auth", href: "/docs/admin" },
      { label: "Add Analytics", href: "/docs/analytics" },
      { label: "Customize Settings", href: "/docs/settings" },
      { label: "Manage Comments", href: "/docs/manage" },
    ],
  },
  {
    title: "Reference",
    items: [{ label: "API Library", href: "/docs/api" }, 
      { label: "Cucumber Specs", href: "/docs/specs" }
    ],
  },
  {
    title: "Etc.",
    items: [
      {
        label: "LICENSE",
        href: "https://github.com/beck-chan/y2k-guestbook/blob/main/LICENSE",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        label: "Releases",
        href: releasesUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        label: "Report Issue",
        href: reportIssueUrl,
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        label: "Sign Guestbook",
        href: "/",
        target: "_blank",
      },
      {
        label: "Donate",
        href: "https://ko-fi.com/beckchan",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ],
  },
  {
    title: "Fine Print",
    items: [
      {
        label: "Privacy Policy",
        href: "/docs/policy/",
      },
      {
        label: "Terms of Service",
        href: "/docs/service/",
      },
    ],
  },
  ...(flags.public
    ? []
    : [
        {
          title: "Internal",
          items: [
            // {
            //   label: "Guestbook Build",
            //   href: "/docs/book-build/",
            //   },
            {
              label: "Documentation Build",
              href: "/docs/docs-build/",
              },
            {
            label: "Search & LLM Ingestion",
            href: "/docs/search/",
            },
            {
              label: "Documentation Reference",
              href: "/docs/example/",
            },
          ],
        },
      ]),
];
