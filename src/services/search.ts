/**
 * DuckDuckGo Search Service (No API Key Required)
 */

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export class SearchService {
  private static CORS_PROXIES = [
    'https://api.allorigins.win/get?url=',
    'https://corsproxy.io/?'
  ];

  static async search(query: string): Promise<SearchResult[]> {
    const encodedQuery = encodeURIComponent(query);
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;
    
    try {
      // Try direct first (some browsers/environments might allow it or DDG might have relaxed CORS for simple GETs)
      const response = await fetch(ddgUrl);
      if (response.ok) {
        return this.parseDDG(await response.json());
      }
    } catch (e) {
      console.warn("Direct search blocked by CORS, trying proxy...");
    }

    // Fallback to proxy
    for (const proxy of this.CORS_PROXIES) {
      try {
        const proxyUrl = proxy.includes('allorigins') 
          ? `${proxy}${encodeURIComponent(ddgUrl)}`
          : `${proxy}${ddgUrl}`;
          
        const response = await fetch(proxyUrl);
        if (response.ok) {
          const data = await response.json();
          let json;
          
          if (proxy.includes('allorigins')) {
            if (!data.contents) continue;
            try {
              json = JSON.parse(data.contents);
            } catch (e) {
              console.error("Failed to parse AllOrigins contents:", e);
              continue;
            }
          } else {
            json = data;
          }
          
          return this.parseDDG(json);
        }
      } catch (e) {
        console.warn(`Proxy ${proxy} failed:`, e.message || e);
      }
    }

    return [];
  }

  private static parseDDG(data: any): SearchResult[] {
    const results: SearchResult[] = [];

    // Abstract
    if (data.AbstractText) {
      results.push({
        title: data.Heading || "Abstract",
        snippet: data.AbstractText,
        url: data.AbstractURL || ""
      });
    }

    // Related Topics
    if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
      data.RelatedTopics.slice(0, 5).forEach((topic: any) => {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || "Related Topic",
            snippet: topic.Text,
            url: topic.FirstURL
          });
        }
      });
    }

    return results;
  }
}
