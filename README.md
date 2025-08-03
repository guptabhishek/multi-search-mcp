# MCP Search Server

[![smithery badge](https://smithery.ai/badge/@guptabhishek/multi-search-mcp)](https://smithery.ai/server/@guptabhishek/multi-search-mcp)

This package exists to provide a unified MCP (Model Context Protocol) interface for multi-provider web search. It allows you to leverage the free monthly quota given by multiple search services (such as Google and Tavily) by automatically falling back between them, maximizing your available search capacity for automation and AI workflows.

## Features

*   Supports Google Custom Search, Tavily Search, DuckDuckGo Search, and Brave Search.
*   Exposes a single MCP tool: `search`.
*   Allows specifying a provider directly or uses a priority-based fallback (default: Tavily, Google, DuckDuckGo, Brave).
*   Standardizes search results into a common format.
*   Configurable via environment variables.
*   Brave Search support (requires API key passed via MCP env, not .env).

## Getting Free API Credentials

### Tavily

1. Go to [Tavily](https://www.tavily.com/) and sign up for a free account.
2. After verifying your email, log in to your Tavily dashboard.
3. Navigate to the API section and generate a free API key.
4. Copy the API key and use it as `TAVILY_API_KEY` in your configuration.

### Brave Search

1. Go to [Brave Search API](https://brave.com/search/api/) and click "Get started".
2. Sign in or create a Brave account.
3. Follow the instructions to subscribe to the Brave Search API (free tier available).
4. Once subscribed, go to your Brave dashboard and generate an API key.
5. Copy the API key and use it as `BRAVE_API_KEY` in your MCP client configuration (must be passed via MCP env, not .env).

### Google Custom Search

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project (or select an existing one).
2. Enable the **Custom Search API** for your project.
3. Go to the [Custom Search Engine](https://cse.google.com/cse/all) and create a new search engine.
   - For "Sites to search", you can enter `www.example.com` (you can edit this later to search the entire web).
   - After creation, go to the control panel of your search engine and enable "Search the entire web" in the "Sites to search" section.
4. Copy the **Search Engine ID** (CX) and use it as `GOOGLE_CX`.
5. In the Cloud Console, go to **APIs & Services > Credentials** and create an API key.
6. Use this API key as `GOOGLE_API_KEY` in your configuration.

## Setup

### Installing via Smithery

To install multi-search-mcp for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@guptabhishek/multi-search-mcp):

```bash
npx -y @smithery/cli install @guptabhishek/multi-search-mcp --client claude
```

### Installing Manually
After updating your configuration or credentials, run:

```bash
npm run build
npm start
```

1.  **Clone/Download:** Get the server code.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Configure API Keys (via MCP Client Settings):**
    *   Instead of using a `.env` file, you can configure the API keys and optional port directly within your MCP client's JSON settings (e.g., Cline's `cline_mcp_settings.json`).
    *   Add or modify the server entry for `mcp-search-server` and provide the necessary keys in the `env` object:

    ```json
    {
      "servers": {
        // ... other servers ...

        "search": { // Or your chosen name for this server
          "autoApprove": [],
          "disabled": false, // Set to false to enable
          "timeout": 120,
          "command": "npx", // Or the command to run the server
          "args": [
              "-y",
              "mcp-search-server"
          ],
          "env": {
            // Required API Keys
            "TAVILY_API_KEY": "YOUR_TAVILY_API_KEY",
            "GOOGLE_API_KEY": "YOUR_GOOGLE_API_KEY",
            "GOOGLE_CX": "YOUR_GOOGLE_CUSTOM_SEARCH_ENGINE_ID",
            "BRAVE_API_KEY": "YOUR_BRAVE_SEARCH_API_KEY", // Brave Search API Key (must be passed via MCP env, not .env)

            // DuckDuckGo does not require an API key.

            // Optional: Configure providers and strategy
            "SEARCH_PROVIDERS": "tavily,google,duckduckgo,brave", // Comma-separated list of providers in desired priority
            "SEARCH_STRATEGY": "random", // Or "priority"

            // Optional Port Override
            "PORT": "3002" // Example: run on port 3002 instead of default
          },
          "transportType": "stdio" // Assuming stdio transport
        }

        // ... other servers ...
      }
    }
    ```
    *   Replace the placeholder values (`YOUR_..._KEY`, `/path/to/your/MCP/...`) with your actual keys and the correct path to the built `index.js` file.
    *   Ensure you provide keys for the providers you intend to use.

## Running the Server

```bash
npm start
```

The server will start, typically on port 3001 (or the port specified in `.env`). It will print the available tool name and the status of loaded API keys.

## MCP Tool: `search`

*   **Description:** Performs a web search using multiple providers (Tavily, Google, DuckDuckGo, Brave) with priority fallback.
*   **Input Schema:**
    *   `query` (string, required): The search term.
    *   `provider` (string, optional, enum: \["google", "tavily", "duckduckgo", "brave"]): Specify a provider directly. If omitted, uses priority fallback.
    *   `num_results` (integer, optional, default: 10): Number of results desired (min: 1, max: 20).
*   **Output:** A JSON object containing an array of content objects, where each object represents a structured search result:
    ```json
    {
      "content": [
        {
          "type": "search_result", // Or another appropriate type
          "title": "Result Title",
          "link": "https://example.com/result",
          "snippet": "Description or snippet of the result.",
          "provider": "tavily" // Indicates which provider returned this result
        },
        // ... more results
      ]
    }
    ```

## Connecting to Cline (or other MCP clients)

Add the server command (e.g., `node build/index.js`) or connection details to your MCP client's configuration. Cline should then detect the `search` tool.

## Modifying Provider Priority

Edit the `PROVIDER_LIST` array in `src/config.ts` (and rebuild) to change the fallback order. The default is `['tavily', 'google', 'duckduckgo', 'brave']`.
