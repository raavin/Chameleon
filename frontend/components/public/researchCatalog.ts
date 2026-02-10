type ResearchDocType = 'txt' | 'json' | 'pdf' | 'other';

export interface ResearchDoc {
  id: string;
  slug: string;
  title: string;
  extension: ResearchDocType;
  summary: string;
  content?: string;
  url?: string;
  category?: string;
}

const assetUrls = import.meta.glob('../../research/*', { as: 'url', eager: true }) as Record<string, string>;
const rawTextFiles = import.meta.glob('../../research/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

const domainSummaries: Record<string, { summary: string; category: string }> = {
  'aging': {
    summary: 'Support services for elderly populations including aged care, retirement planning, and elder rights protection.',
    category: 'Social Services'
  },
  'agriculturefood': {
    summary: 'Food security programs, agricultural development, and nutrition assistance for communities.',
    category: 'Economic Development'
  },
  'cultureheritage': {
    summary: 'Cultural preservation, heritage protection, and community arts programs.',
    category: 'Community Development'
  },
  'democracy': {
    summary: 'Civic engagement, voting rights, and democratic participation initiatives.',
    category: 'Governance'
  },
  'disability': {
    summary: 'Accessibility services, disability support programs, and inclusive community initiatives.',
    category: 'Social Services'
  },
  'economics': {
    summary: 'Economic development, financial literacy, and poverty reduction programs.',
    category: 'Economic Development'
  },
  'education': {
    summary: 'Educational programs, literacy initiatives, and skills training for all ages.',
    category: 'Education'
  },
  'emergencyrelief': {
    summary: 'Disaster response, emergency aid distribution, and crisis management systems.',
    category: 'Emergency Services'
  },
  'employment': {
    summary: 'Job placement, workforce development, and employment support services.',
    category: 'Economic Development'
  },
  'environment': {
    summary: 'Environmental protection, sustainability programs, and climate action initiatives.',
    category: 'Environment'
  },
  'families': {
    summary: 'Family support services, parenting programs, and child welfare initiatives.',
    category: 'Social Services'
  },
  'governance': {
    summary: 'Public administration, transparency initiatives, and government accountability programs.',
    category: 'Governance'
  },
  'lgbtiq': {
    summary: 'LGBTIQ+ rights protection, support services, and community inclusion programs.',
    category: 'Social Justice'
  },
  'media': {
    summary: 'Media literacy, press freedom, and community journalism initiatives.',
    category: 'Community Development'
  },
  'mentalhealth': {
    summary: 'Mental health services, counseling programs, and psychological support systems.',
    category: 'Health'
  },
  'migration': {
    summary: 'Refugee support, immigration services, and migrant integration programs.',
    category: 'Social Services'
  },
  'primaryhealth': {
    summary: 'Primary healthcare delivery, preventive medicine, and community health programs.',
    category: 'Health'
  },
  'recreation': {
    summary: 'Community recreation, sports programs, and public leisure facilities.',
    category: 'Community Development'
  },
  'science': {
    summary: 'Scientific research support, STEM education, and innovation programs.',
    category: 'Education'
  },
  'socialjustice': {
    summary: 'Human rights advocacy, legal aid, and social equity programs.',
    category: 'Social Justice'
  },
  'transport': {
    summary: 'Public transportation, mobility services, and accessible transit programs.',
    category: 'Infrastructure'
  },
  'utilities': {
    summary: 'Water, electricity, and essential services access programs.',
    category: 'Infrastructure'
  },
  'women': {
    summary: 'Women\'s rights, gender equality programs, and female empowerment initiatives.',
    category: 'Social Justice'
  },
  'alcoholdrugs': {
    summary: 'Substance abuse treatment, addiction recovery, and harm reduction programs.',
    category: 'Health'
  },
  'housing': {
    summary: 'Affordable housing, homelessness prevention, and shelter services.',
    category: 'Social Services'
  },
  'masterexecutivesummary': {
    summary: 'Comprehensive overview of all domain templates and implementation guidelines.',
    category: 'Documentation'
  },
  'who_health_standards': {
    summary: 'World Health Organization standards and guidelines for health programs.',
    category: 'Health'
  },
  'source of truth': {
    summary: 'Core documentation and reference materials for the Chameleon Protocol.',
    category: 'Documentation'
  }
};

const toSlug = (filename: string) =>
  filename
    .replace(/\.(txt|json|pdf)$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const toTitle = (filename: string) =>
  filename
    .replace(/\.(txt|json|pdf)$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const toExtension = (filename: string): ResearchDocType => {
  const ext = filename.split('.').pop()?.toLowerCase() || 'other';
  if (ext === 'txt' || ext === 'json' || ext === 'pdf') {
    return ext;
  }
  return 'other';
};

export const researchDocs: ResearchDoc[] = Object.keys(assetUrls)
  .map((path) => {
    const filename = path.split('/').pop() || path;
    const slug = toSlug(filename);
    const extension = toExtension(filename);
    const content = rawTextFiles[path];
    const metadata = domainSummaries[slug] || { summary: 'Domain template for program implementation.', category: 'General' };
    
    return {
      id: filename,
      slug,
      title: toTitle(filename),
      extension,
      summary: metadata.summary,
      category: metadata.category,
      content,
      url: assetUrls[path]
    };
  })
  .filter(doc => doc.slug !== 'masterexecutivesummary')
  .sort((a, b) => a.title.localeCompare(b.title));

export const getResearchDocBySlug = (slug: string) =>
  researchDocs.find((doc) => doc.slug === slug);

export const getDocumentsByCategory = () => {
  const categories: Record<string, ResearchDoc[]> = {};
  researchDocs.forEach(doc => {
    const cat = doc.category || 'General';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(doc);
  });
  return categories;
};
