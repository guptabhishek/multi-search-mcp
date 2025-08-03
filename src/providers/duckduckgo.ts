import axios from 'axios';
import * as cheerio from 'cheerio';

export async function searchDuckDuckGo(query: string, numResults: number): Promise<any[]> {
  const baseUrl = 'https://html.duckduckgo.com/html';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  try {
    const response = await axios.post(baseUrl, `q=${encodeURIComponent(query)}`, { headers });
    const $ = cheerio.load(response.data);

    const results: any[] = [];
    $('.result').each((i, element) => {
      if (results.length >= numResults) {
        return false; // Break the loop if we have enough results
      }

      const titleElem = $(element).find('.result__title');
      const linkElem = titleElem.find('a');
      const snippetElem = $(element).find('.result__snippet');

      const title = titleElem.text().trim();
      let link = linkElem.attr('href') || '';
      const snippet = snippetElem.text().trim();

      // Clean up DuckDuckGo redirect URLs
      if (link.startsWith('//duckduckgo.com/l/?uddg=')) {
        link = decodeURIComponent(link.split('uddg=')[1].split('&')[0]);
      }

      // Skip ad results (based on the Python reference)
      if (link.includes('y.js')) {
        return true; // Continue to the next iteration
      }

      if (title && link && snippet) {
        results.push({ title, link, snippet });
      }
    });

    return results;
  } catch (error: any) {
    console.error('DuckDuckGo Search API Error:', error.message);
    throw new Error(`DuckDuckGo Search API Error: ${error.message}`);
  }
}