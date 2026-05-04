import type { ComponentMeta } from '../data/types';

export const SITE_URL = 'https://react-driftkit.saktichourasia.dev';

export function componentPageTitle(m: ComponentMeta): string {
  return m.seoDescriptor
    ? `${m.title} — ${m.seoDescriptor} | react-driftkit`
    : `${m.title} — react-driftkit`;
}

export function componentJsonLd(m: ComponentMeta) {
  const url = `${SITE_URL}/${m.slug}`;
  const ogImage = `${SITE_URL}/og/${m.slug}.png`;

  const sourceCode = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: `react-driftkit / ${m.title}`,
    description: m.metaDescription,
    codeRepository: 'https://github.com/shakcho/react-driftkit',
    programmingLanguage: 'TypeScript',
    runtimePlatform: 'React 18, React 19',
    url,
    image: ogImage,
    license: 'https://github.com/shakcho/react-driftkit/blob/main/LICENSE',
    isPartOf: {
      '@type': 'SoftwareSourceCode',
      name: 'react-driftkit',
      url: `${SITE_URL}/`,
    },
    author: {
      '@type': 'Person',
      name: 'Sakti Kumar Chourasia',
      url: 'https://saktichourasia.dev',
    },
    sameAs: ['https://www.npmjs.com/package/react-driftkit'],
  } as const;

  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'react-driftkit', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: m.title, item: url },
    ],
  } as const;

  const techArticle = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: `${m.title} — ${m.seoDescriptor ?? 'react-driftkit component'}`,
    description: m.metaDescription,
    url,
    image: ogImage,
    inLanguage: 'en-US',
    proficiencyLevel: 'Beginner',
    dependencies: 'React 18 or React 19',
    articleSection: 'React component documentation',
    author: {
      '@type': 'Person',
      name: 'Sakti Kumar Chourasia',
      url: 'https://saktichourasia.dev',
    },
    publisher: {
      '@type': 'Person',
      name: 'Sakti Kumar Chourasia',
      url: 'https://saktichourasia.dev',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'react-driftkit',
      url: `${SITE_URL}/`,
    },
  } as const;

  return [sourceCode, breadcrumbs, techArticle];
}
