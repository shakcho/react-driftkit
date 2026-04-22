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
  key: 'launcher' | 'dock' | 'sheet' | 'splitter' | 'inspector' | 'zoomlens' | 'flickdeck';
  slug: string;
  title: string;
  tagline: string;
  metaDescription: string;
  apiRows: ApiRow[];
  apiFootnoteHtml?: string;
  codeExamples: CodeExample[];
  typesCode: string;
};
