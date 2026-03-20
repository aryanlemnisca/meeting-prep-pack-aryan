// Lobstr.io LinkedIn Profile Scraper
// Docs: https://docs.lobstr.io
// Reuses a single existing squid instead of creating new ones (free tier = 1 slot)

const BASE_URL = 'https://api.lobstr.io/v1';

export interface LobstrProfile {
  fullName?: string;
  headline?: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  about?: string;
  experience?: { title: string; company: string; duration: string; description?: string }[];
  education?: { school: string; degree?: string; field?: string; years?: string }[];
  skills?: string[];
  certifications?: string[];
  featuredPosts?: string[];
  recentActivity?: string[];
  rawData: Record<string, unknown>;
}

function getHeaders(): Record<string, string> {
  return {
    'Authorization': `Token ${process.env.LOBSTRIO_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

async function lobstrFetch(path: string, options?: RequestInit): Promise<any> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: { ...getHeaders(), ...options?.headers },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error(`[Lobstr.io] ${options?.method ?? 'GET'} ${path} → ${response.status}: ${errorText}`);
    throw new Error(`Lobstr.io API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Find the existing LinkedIn Profile Scraper squid
let cachedSquidId: string | null = null;

async function getSquidId(): Promise<string> {
  if (cachedSquidId) return cachedSquidId;

  console.log('[Lobstr.io] Looking up existing squid...');
  const squids = await lobstrFetch('/squids');
  const squidList = squids.data ?? squids.results ?? squids;

  if (Array.isArray(squidList) && squidList.length > 0) {
    // Use the first squid (the existing LinkedIn Profile Scraper)
    const squid = squidList[0];
    cachedSquidId = squid.id ?? squid.hash;
    console.log(`[Lobstr.io] Using existing squid: ${cachedSquidId} (${squid.name})`);
    return cachedSquidId!;
  }

  throw new Error('No squid found on Lobstr.io. Create a LinkedIn Profile Scraper squid first at https://app.lobstr.io');
}

export async function scrapeLinkedInProfile(linkedinUrl: string): Promise<LobstrProfile> {
  const apiKey = process.env.LOBSTRIO_API_KEY;
  if (!apiKey) {
    throw new Error('Lobstr.io API key not configured');
  }

  console.log(`[Lobstr.io] Starting LinkedIn scrape for: ${linkedinUrl}`);

  // Step 1: Get existing squid ID
  const squidId = await getSquidId();

  // Step 2: Add the LinkedIn URL as a task
  const taskResult = await lobstrFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify({
      squid: squidId,
      tasks: [{ url: linkedinUrl }],
    }),
  });
  console.log(`[Lobstr.io] Task added: ${linkedinUrl} (inserted: ${taskResult.inserted}, duplicates: ${taskResult.duplicates})`);

  // Step 3: Start a new run
  const run = await lobstrFetch('/runs', {
    method: 'POST',
    body: JSON.stringify({
      squid: squidId,
    }),
  });
  const runId = run.id ?? run.hash;
  console.log(`[Lobstr.io] Run started: ${runId}`);

  // Step 4: Poll for completion (max 2 minutes, check every 5 seconds)
  const maxWait = 120_000;
  const pollInterval = 5_000;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    const stats = await lobstrFetch(`/runs/${runId}/stats`);
    console.log(`[Lobstr.io] Run status: ${stats.percent_done ?? 0}% done`);

    if (stats.is_done) break;
  }

  // Step 5: Fetch results from this run
  const results = await lobstrFetch(`/results?run=${runId}&page=1&page_size=1`);
  const data = results.data?.[0];

  if (!data) {
    console.warn('[Lobstr.io] No results returned for profile');
    return { rawData: {} };
  }

  console.log(`[Lobstr.io] Profile scraped: ${data.full_name ?? data.first_name ?? 'Unknown'}`);

  return {
    fullName: data.full_name ?? (`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || undefined),
    headline: data.headline,
    currentTitle: data.job_title,
    currentCompany: data.company_name,
    location: data.location,
    about: data.description,
    experience: parseExperience(data),
    education: parseEducation(data),
    skills: data.skills,
    certifications: data.certifications,
    featuredPosts: data.featured_items,
    recentActivity: undefined,
    rawData: data,
  };
}

function parseExperience(data: any): LobstrProfile['experience'] {
  if (Array.isArray(data.experience)) return data.experience;
  if (Array.isArray(data.positions)) {
    return data.positions.map((p: any) => ({
      title: p.title ?? p.job_title,
      company: p.company ?? p.company_name,
      duration: p.duration ?? `${p.start_year ?? ''} - ${p.end_year ?? 'Present'}`,
      description: p.description ?? p.job_description,
    }));
  }
  if (data.job_title && data.company_name) {
    return [{
      title: data.job_title,
      company: data.company_name,
      duration: data.start_year ? `${data.start_year} - Present` : '',
      description: data.job_description,
    }];
  }
  return undefined;
}

function parseEducation(data: any): LobstrProfile['education'] {
  if (Array.isArray(data.education)) {
    return data.education.map((e: any) => ({
      school: e.school ?? e.school_name,
      degree: e.degree,
      field: e.field ?? e.field_of_study,
      years: e.years ?? `${e.start_year ?? ''} - ${e.end_year ?? ''}`.trim(),
    }));
  }
  if (data.school_name) {
    return [{
      school: data.school_name,
      degree: undefined,
      field: data.field_of_study,
      years: `${data.start_year ?? ''} - ${data.end_year ?? ''}`.trim() || undefined,
    }];
  }
  return undefined;
}
