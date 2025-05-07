import axios from 'axios';

export async function searchGoogle(query: string, apiKey: string, cx: string, numResults: number): Promise<any[]> {
  if (!apiKey || !cx) {
    // Throw an error that the main handler can catch
    throw new Error('Google API key or CX missing');
  }

  const baseUrl = 'https://www.googleapis.com/customsearch/v1';
  const params = {
    key: apiKey,
    cx: cx,
    q: query,
num: numResults.toString(),
  };

  try {
    const response = await axios.get(baseUrl, { params });
    // Ensure items exist before returning
    if (!response.data || !Array.isArray(response.data.items)) {
      console.error('Google API returned unexpected response format:', response.data);
      throw new Error(`Google API returned unexpected response format`);
    }
    return response.data.items;
  } catch (error: any) {
    // Log the specific error and re-throw it
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error('Google Search API Error:', errorMessage);
    throw new Error(`Google Search API Error: ${errorMessage}`);
  }
}
