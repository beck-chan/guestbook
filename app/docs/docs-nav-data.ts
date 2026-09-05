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
      { label: "Prerequisites" },
      { label: "Quickstart", href: "/docs/quickstart" },
      { label: "Install with `npm`" },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "Set Up Admin Users" },
      { label: "Customize Settings" },
      { label: "Moderate Comments" },
      { label: "Add Analytics" },
    ],
  },
  {
    title: "Reference",
    items: [{ label: "API Reference" }],
  },
  {
    title: "Etc.",
    items: [
      {
        label: "Releases",
        href: "https://github.com/beck-chan/y2k-guestbook/releases",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        label: "Report Issue",
        href: "https://github.com/beck-chan/y2k-guestbook/issues",
        target: "_blank",
        rel: "noopener noreferrer",
      },
      {
        label: "Donate",
        href: "https://ko-fi.com/beckchan",
        target: "_blank",
        rel: "noopener noreferrer",
      },
    ],
  },
];
