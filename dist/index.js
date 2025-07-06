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
let version = 'unknown';
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

class WebsiteParser {
  async fetchAndParse(url) {
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
    } catch (error) {
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
  tools: [{
    name: "parse",
    description: "Extracts and transforms webpage content into clean, LLM-optimized Markdown. Returns article title, main content, excerpt, byline and site name. Uses Mozilla's Readability algorithm to remove ads, navigation, footers and non-essential elements while preserving the core content structure.",
    inputSchema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The website URL to parse"
        }
      },
      required: ["url"]
    }
  }]
}));

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name !== "parse") {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }

  if (!args?.url) {
    throw new McpError(ErrorCode.InvalidParams, "URL is required");
  }

  try {
    const result = await parser.fetchAndParse(args.url);
    
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          title: result.title,
          content: result.content,
          metadata: {
            excerpt: result.excerpt,
            byline: result.byline,
            siteName: result.siteName
          }
        }, null, 2)
      }]
    };
  } catch (error) {
    return {
      isError: true,
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }]
    };
  }
});

// Start server
const transport = new StdioServerTransport();
server.connect(transport).catch(error => {
  console.error(`Server failed to start: ${error.message}`);
  process.exit(1);
});