// Assuming the raw results have a string property for the snippet/content
interface RawGoogleResult {
  title: string;
  link: string;
  snippet: string; // Assuming Google API provides a string snippet
  // ... other properties
}


// Your existing Tavily type seems correct for its raw format
interface RawTavilyResult {
  title: string;
  link: string; // Tavily uses 'url' in the response, but the provider maps it to 'link'
  content: string; // Tavily uses 'content' for snippet, which is a string
}

// Define the standardized structure including the provider
export interface StandardizedSearchResult {
  title: string;
  link: string;
  snippet: string; // Represents the description/content snippet
  provider: string;
}

export function standardizeGoogleResults(rawResults: RawGoogleResult[], providerName: string): StandardizedSearchResult[] {
  // Filter out results missing essential fields like snippet, title, or link
  const filteredResults = rawResults.filter(item =>
      item.title && item.link && typeof item.snippet === 'string' && item.snippet.length > 0
  );

  return filteredResults.map((item: RawGoogleResult) => ({
    title: item.title,
    link: item.link,
    snippet: item.snippet,
    provider: providerName,
  }));
}


export function standardizeTavilyResults(rawResults: RawTavilyResult[], providerName: string): StandardizedSearchResult[] {
    // Filter out results missing essential fields
    // Note: Tavily provider already maps raw results to { title, link, content }
     const filteredResults = rawResults.filter(item =>
        item.title && item.link && typeof item.content === 'string' && item.content.length > 0
    );

  return filteredResults.map((item: RawTavilyResult) => ({
    title: item.title,
    link: item.link,
    snippet: item.content, // Use 'content' as the snippet
    provider: providerName,
  }));
}
