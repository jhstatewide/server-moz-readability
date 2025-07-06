#!/usr/bin/env node
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ErrorCode, McpError, ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
let version: string = 'unknown';
try {
  version = require(join(__dirname, '../package.json')).version;
} catch (e) {
  // fallback: try local package.json (for npx/npm cache situations)
  try {
    version = require(join(__dirname, 'package.json')).version;
  } catch {}
}
console.log(`server-moz-readability MCP server v${version} started. Waiting for requests...\n`);

// Initialize HTML to Markdown converter
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

interface ArticleResult {
  title: string;
  content: string;
  excerpt: string | null;
  byline: string | null;
  siteName: string | null;
}

interface BatchParseInput {
  urls: string[];
  maxContentLength?: number;
}

class WebsiteParser {
  async fetchAndParse(url: string): Promise<ArticleResult> {
    try {
      // Fetch the webpage
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; MCPBot/1.0)'
        }
      });

      // Create a DOM from the HTML
      const dom = new JSDOM(response.data, { url });
      const document = dom.window.document;

      // Use Readability to extract main content
      const reader = new Readability(document);
      const article = reader.parse();

      if (!article) {
        throw new Error('Failed to parse content');
      }

      // Convert HTML to Markdown
      const markdown = turndownService.turndown(article.content);

      return {
        title: article.title,
        content: markdown,
        excerpt: article.excerpt,
        byline: article.byline,
        siteName: article.siteName
      };
    } catch (error: any) {
      throw new Error(`Failed to fetch or parse content: ${error.message}`);
    }
  }
}

// Create MCP server instance
const server = new Server({
  name: "server-readability-parser",
  version: "1.0.0"
}, {
  capabilities: { tools: {} }
});

const parser = new WebsiteParser();

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "parse",
      description: "Extracts and transforms webpage content into clean, LLM-optimized Markdown. Returns article title, main content, excerpt, byline and site name. Uses Mozilla's Readability algorithm to remove ads, navigation, footers and non-essential elements while preserving the core content structure.",
      inputSchema: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The website URL to parse"
          },
          maxContentLength: {
            type: "integer",
            description: "Optional maximum number of characters to return for the content"
          }
        },
        required: ["url"]
      }
    },
    {
      name: "parse_batch",
      description: "Fetches and parses multiple URLs, returning segmented results for each. Optionally limits the content length per result.",
      inputSchema: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: { type: "string" },
            description: "Array of website URLs to parse"
          },
          maxContentLength: {
            type: "integer",
            description: "Optional maximum number of characters to return for each content"
          }
        },
        required: ["urls"]
      }
    }
  ]
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  if (name === "parse") {
    if (!args?.url) {
      throw new McpError(ErrorCode.InvalidParams, "URL is required");
    }
    const maxLen = typeof args.maxContentLength === 'number' ? args.maxContentLength : undefined;
    try {
      const result = await parser.fetchAndParse(args.url);
      let content = result.content;
      if (maxLen && typeof content === 'string' && content.length > maxLen) {
        content = content.slice(0, maxLen) + '\n... [truncated]';
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            title: result.title,
            content,
            metadata: {
              excerpt: result.excerpt,
              byline: result.byline,
              siteName: result.siteName
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }]
      };
    }
  } else if (name === "parse_batch") {
    if (!args?.urls || !Array.isArray(args.urls)) {
      throw new McpError(ErrorCode.InvalidParams, "urls (array) is required");
    }
    const maxLen = typeof args.maxContentLength === 'number' ? args.maxContentLength : undefined;
    const results = await Promise.all(args.urls.map(async (url: string) => {
      try {
        const result = await parser.fetchAndParse(url);
        let content = result.content;
        if (maxLen && typeof content === 'string' && content.length > maxLen) {
          content = content.slice(0, maxLen) + '\n... [truncated]';
        }
        return {
          url,
          result: {
            title: result.title,
            content,
            metadata: {
              excerpt: result.excerpt,
              byline: result.byline,
              siteName: result.siteName
            }
          },
          isError: false
        };
      } catch (error: any) {
        return {
          url,
          error: error.message,
          isError: true
        };
      }
    }));
    return {
      content: [{
        type: "text",
        text: JSON.stringify(results, null, 2)
      }]
    };
  } else {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
}); 