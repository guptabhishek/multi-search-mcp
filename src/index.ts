// MCP Search Server (TypeScript, MCP SDK, stdio transport)

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Correct the import: CallToolResultSchema instead of CallToolResponseSchema
import { ListToolsRequestSchema, CallToolRequestSchema, ErrorCode, McpError, CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { PROVIDER_PRIORITY, DEFAULT_NUM_RESULTS } from './config.js';
import { searchGoogle } from './providers/google.js';
import { searchTavily } from './providers/tavily.js';
// Import the new interface and updated functions
import { StandardizedSearchResult, standardizeGoogleResults, standardizeTavilyResults } from './utils/standardize.js';

const TOOL_NAME = 'search';

const TOOL_DEFINITION = {
  name: TOOL_NAME,
  description: 'Performs a web search using multiple providers (google, tavily).',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query.',
      },
      provider: {
        type: 'string',
        enum: ['google', 'tavily'],
        description: 'Optional: Specify a provider directly (google, tavily). If omitted, uses priority fallback.',
      },
      num_results: {
        type: 'integer',
        description: `Number of results desired (default: ${DEFAULT_NUM_RESULTS}).`,
        default: DEFAULT_NUM_RESULTS,
        minimum: 1,
        maximum: 20,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
};

// Define types for search and standardize functions for better type safety
type SearchFunction = (query: string, ...args: any[]) => Promise<any[]>;
type StandardizeFunction = (rawResults: any[], providerName: string) => StandardizedSearchResult[];

const searchFunctions: Record<string, SearchFunction> = {
  google: searchGoogle,
  tavily: searchTavily,
};

const standardizeFunctions: Record<string, StandardizeFunction> = {
  google: standardizeGoogleResults,
  tavily: standardizeTavilyResults,
};

const API_KEYS = {
  tavily_key: process.env.TAVILY_API_KEY || '',
  google_key: process.env.GOOGLE_API_KEY || '',
  google_cx: process.env.GOOGLE_CX || '',
};

class McpSearchServer {
  server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-search-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          toolDescriptions: true,
        },
      }
    );
    this.setupToolHandlers();
    this.server.onerror = (error: any) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [TOOL_DEFINITION],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      if (request.params.name !== TOOL_NAME) {
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
      const args = request.params.arguments;
      // Validate input
      if (!args.query || typeof args.query !== 'string' || args.query.trim() === '') {
        throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid required argument: query (string)');
      }
      const query = args.query;
      const requestedProvider = args.provider;
      const numResults = args.num_results || DEFAULT_NUM_RESULTS;

      if (requestedProvider && !searchFunctions[requestedProvider]) {
        throw new McpError(ErrorCode.InvalidParams, `Invalid provider specified: ${requestedProvider}. Valid options are: google, tavily`);
      }

      if (requestedProvider === 'tavily') {
        if (!API_KEYS.tavily_key) {
          // Throw as InvalidParams because it's a configuration issue tied to the specific request
          throw new McpError(ErrorCode.InvalidParams, `Tavily API key is not configured for this server`);
        }
      }
       if (requestedProvider === 'google') {
           if (!API_KEYS.google_key || !API_KEYS.google_cx) {
             // Throw as InvalidParams because it's a configuration issue tied to the specific request
             throw new McpError(ErrorCode.InvalidParams, `Google API key or CX are not configured for this server`);
           }
         }


      // --- Start of logic to track fallback and order ---
      const providersAttemptedOrder = requestedProvider ? [requestedProvider] : PROVIDER_PRIORITY;
      // Fallback is considered triggered if no specific provider was requested,
      // meaning the server attempted providers based on the priority list.
      const fallbackTriggered = !requestedProvider;
      // --- End of logic to track fallback and order ---

      // Provider execution logic
      let finalResults: StandardizedSearchResult[] = [];
      let errorMessages: string[] = [];
      let successfulProvider: string | null = null;
      const timeoutMs = 10000; // 10 second timeout per provider

      for (const provider of providersAttemptedOrder) { // Use the list captured for tracking
        try {
          const searchFn = searchFunctions[provider];
          const standardizeFn = standardizeFunctions[provider];

          // --- Move API key check here, inside the loop before attempting the provider ---
          // This ensures we only throw missing key errors for providers we actually try
          // and prevents the loop from stopping if the *first* provider in the priority list
          // has a missing key but later ones might be configured.
          switch (provider) {
             case 'google':
               if (!API_KEYS.google_key || !API_KEYS.google_cx) {
                 // Throw a standard Error here, which will be caught by the inner try/catch
                 throw new Error('Google API key or CX missing');
               }
               break;
             case 'tavily':
               if (!API_KEYS.tavily_key) {
                 // Throw a standard Error here
                 throw new Error('Tavily API key missing');
               }
               break;
             // Add cases for other providers here
          }
           // --- End of moved API key check ---


          console.error(`Attempting search with ${provider}...`);

          // Prepare provider-specific arguments
          let providerArgs: any[];
          switch (provider) {
            case 'google':
              providerArgs = [API_KEYS.google_key, API_KEYS.google_cx, numResults];
              break;
            case 'tavily':
              providerArgs = [API_KEYS.tavily_key, numResults];
              break;
            default:
              // Should not happen due to earlier checks, but good practice
              throw new McpError(ErrorCode.InternalError, `Internal error: Unknown provider ${provider}`);
          }

          // Execute search with timeout
          const rawResults = await Promise.race([
            searchFn(query, ...providerArgs),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`${provider} search timed out after ${timeoutMs}ms`)), timeoutMs)),
          ]);

          // Standardize results, passing the provider name
          // Add type assertion for rawResults from Promise.race
          const standardized = standardizeFn(rawResults as any[], provider);

          if (standardized.length > 0) {
            finalResults = standardized;
            successfulProvider = provider;
            console.error(`Search successful with ${provider}.`);
            break; // Exit loop on first success
          } else {
            console.error(`${provider} returned 0 results.`);
            // Don't add to errorMessages here, it's not an error, just no results
          }
        } catch (error: any) {
          // Catch errors thrown by providers (missing keys, API errors, timeouts)
          const message = `${provider}: ${error.message}`;
          console.error(`Error during search with ${provider}:`, error.message);
          errorMessages.push(message);
        }
      }

      // Check if any provider succeeded
      if (successfulProvider && finalResults.length > 0) {
        // Format results according to MCP spec (array of content items)
        const content = finalResults.map(item => ({
          type: 'text', // Use 'text' type for the search results
          // Combine the details into a single text string for the 'text' content item
          text: `Title: ${item.title}\nLink: ${item.link}\nSnippet: ${item.snippet}\nSource: ${item.provider}`,
        }));

        // --- Construct the 'data' object with fallback information ---
        const responseData = {
           fallbackTriggered: fallbackTriggered,
           providersAttemptedOrder: providersAttemptedOrder,
           successfulProvider: successfulProvider, // Include the successful provider for clarity
           errorsDuringAttempt: errorMessages.length > 0 ? errorMessages : undefined // Optionally include errors if any occurred before success
        };
        // --- End of 'data' object construction ---


        // Return MCP success response including content AND data
        return { content, data: responseData };
      } else {
        // If no provider succeeded, throw an MCP error
        const combinedErrors = errorMessages.join('; ');
        console.error(`Search failed for query "${query}". Errors: ${combinedErrors}`);
        // You could also include the attempted providers list in the error data if needed
        // const errorData = { providersAttemptedOrder };
        throw new McpError(
          ErrorCode.InternalError, // Or a more specific code if applicable
          `Search failed. No provider succeeded for query "${query}". Errors: ${combinedErrors || 'No results found or provider configuration issue.'}`,
         // errorData // Optional: pass errorData here
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Search Server running on stdio');
  }
}

const server = new McpSearchServer();
server.run().catch(console.error);