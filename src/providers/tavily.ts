import axios from 'axios';

// Define the expected structure of a single result item returned by this function
// This should match the *input* structure expected by your standardize functions
interface SimplifiedSearchResult {
    title: string;
    link: string;
    content: string; // This should be the string snippet
}

export async function searchTavily(query: string, apiKey: string, numResults: number): Promise<SimplifiedSearchResult[]> {
  if (!apiKey) {
    // This check is also in the server handler, but good to have here too
    throw new Error('Tavily API key is missing');
  }

  const baseUrl = 'https://api.tavily.com/search';

  try {
    const response = await axios.post(baseUrl, {
      query: query,
      max_results: numResults, // Use max_results parameter
      include_answer: "basic", // Keep if you want the answer field (separate from results array)
      // include_images: false, // Add options as needed
      // include_deeplinks: true,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });

    // Check if response data or results array is valid
    if (!response.data || !Array.isArray(response.data.results)) {
         console.error('Tavily API returned unexpected response format:', response.data);
         const errorDetails = response.data ? JSON.stringify(response.data).substring(0, 200) + '...' : 'No response data';
         throw new Error(`Tavily API returned unexpected response format: ${errorDetails}`);
    }

    // Map the raw Tavily results to the simplified structure
    // Filtering for valid results (e.g., missing title/link/content) is better done in the standardize step
    // This mapping just assumes the basic structure exists and provides defaults
    return response.data.results.map((item: any) => ({
      title: item.title || '',
      link: item.url || '',   
      content: item.content || '',
    })).filter((item: SimplifiedSearchResult) => item.title && item.link && item.content); // Optional: Filter out results with no title, link, or content


  } catch (error: any) {
    console.error('Tavily Search API Error:', error.message);
    throw error;
  }
}