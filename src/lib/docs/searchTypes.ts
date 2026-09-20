export type ComposedSection = {
  id: string;
  heading: string;
  body: string;
};

export type ComposedDoc = {
  slug: string;
  href: string;
  title: string;
  section?: string;
  subtitle?: string;
  markdown: string;
  sections: ComposedSection[];
  public: boolean;
};

export type DocsSearchDoc = {
  id: string;
  href: string;
  title: string;
  heading: string;
  section?: string;
  body: string;
  public: boolean;
};
