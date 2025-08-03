import axios from 'axios';


export async function searchBrave(query: string, apiKey: string, numResults: number): Promise<any[]> {
  if (!apiKey) {
    throw new Error('Brave Search API key is missing');
  }

  const baseUrl = 'https://api.search.brave.com/res/v1/web/search';
  // Supported params: q, safesearch, spellcheck, country, search_lang, freshness, sources, extra_snippets, ai_summarization, goggles, page, use_autopaging
  const params: Record<string, any> = {
    q: query,
    count: numResults
    // Add more supported params here if needed
  };

  try {
    const response = await axios.get(baseUrl, {
      params,
      headers: {
        'X-Subscription-Token': apiKey,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
      },
    });

    const data: any = response.data;
    // Brave API: Only extract text (web) results, ignore videos and mixed
    if (data && data.web && Array.isArray(data.web.results)) {
      return data.web.results;
    }
    // Optionally handle locations if needed, else just return []
    return [];
  } catch (error: any) {
    console.error('Brave Search API Error:', error.message);
    throw new Error(`Brave Search API Error: ${error.message}`);
  }
}