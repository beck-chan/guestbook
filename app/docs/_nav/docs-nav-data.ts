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
      { label: "Install with `npm`", href: "/docs/install" },
    ],
  },
  {
    title: "Guides",
    items: [
      { label: "Set Up Admin Users", href: "/docs/admin" },
      { label: "Customize Settings", href: "/docs/settings" },
      { label: "Moderate Comments", href: "/docs/moderate" },
      { label: "Add Analytics", href: "/docs/analytics" },
    ],
  },
  {
    title: "Reference",
    items: [{ label: "API Reference", href: "/docs/api" }],
  },
  {
    title: "Etc.",
    items: [
      {
        label: "Sign Guestbook",
        href: "/",
        target: "_blank",
      },
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
