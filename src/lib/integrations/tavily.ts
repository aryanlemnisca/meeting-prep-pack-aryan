import { tavily } from '@tavily/core';

let _client: ReturnType<typeof tavily> | null = null;
function getClient() {
  if (!_client) _client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  return _client;
}

export interface TavilySearchResult {
  query: string;
  results: { title: string; url: string; content: string; score: number }[];
}

export async function searchContactContext(name: string, company?: string): Promise<TavilySearchResult> {
  const query = company ? `${name} ${company}` : name;

  const response = await getClient().search(query, {
    maxResults: 10,
    searchDepth: 'advanced',
  });

  return {
    query,
    results: response.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
  };
}

export async function searchCompanyContext(company: string): Promise<TavilySearchResult> {
  const response = await getClient().search(company, {
    maxResults: 5,
    searchDepth: 'basic',
  });

  return {
    query: company,
    results: response.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
    })),
  };
}
