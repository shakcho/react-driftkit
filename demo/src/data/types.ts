/**
 * API table row. Each cell is an HTML string so pages can embed `<code>`,
 * line breaks, and emphasis without depending on JSX inside .astro markup.
 * Keep cells small — substance belongs in the component's paragraph copy.
 */
export type ApiRow = {
  prop: string;
  typeHtml: string;
  defaultHtml: string;
  descriptionHtml: string;
};

export type CodeExample = {
  label: string;
  code: string;
  lang?: 'tsx' | 'typescript' | 'jsx' | 'javascript';
};

export type ComponentMeta = {
  key: 'launcher' | 'dock' | 'sheet' | 'splitter' | 'zoomlens' | 'flickdeck';
  slug: string;
  title: string;
  tagline: string;
  metaDescription: string;
  /** Short, keyword-rich descriptor appended to <title> for SEO (e.g. "React Draggable Floating Widget"). */
  seoDescriptor?: string;
  /** Comma-separated keywords for <meta name="keywords"> hints. */
  seoKeywords?: string;
  apiRows: ApiRow[];
  apiFootnoteHtml?: string;
  codeExamples: CodeExample[];
  typesCode: string;
};
