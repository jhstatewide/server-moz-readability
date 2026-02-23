# Mozilla Readability Parser MCP Server (Fork)

**This is a fork of the original Mozilla Readability Parser MCP Server, published as `@jharding_npm/server-moz-readability`.**

**Now written in TypeScript.**

An [model context protocol (MCP)](https://github.com/modelcontextprotocol) server that extracts and transforms webpage content into clean, LLM-optimized Markdown. Returns article title, main content, excerpt, byline and site name. Uses [Mozilla's Readability algorithm](https://github.com/mozilla/readability) to remove ads, navigation, footers and non-essential elements while preserving the core content structure. [More about MCP](https://modelcontextprotocol.io/introduction).

_Current version: **1.1.0**_

<a href="https://glama.ai/mcp/servers/jdcx8fmajm"><img width="380" height="200" src="https://glama.ai/mcp/servers/jdcx8fmajm/badge" alt="Mozilla Readability Parser Server MCP server" /></a>

## Features
- Removes ads, navigation, footers and other non-essential content
- Converts clean HTML into well-formatted Markdown (also uses Turndown)
- Returns article metadata (title, excerpt, byline, site name)
- Handles errors gracefully

## Why Not Just Fetch?
Unlike simple fetch requests, this server:
- Extracts only relevant content using Mozilla's Readability algorithm
- Eliminates noise like ads, popups, and navigation menus
- Reduces token usage by removing unnecessary HTML/CSS
- Provides consistent Markdown formatting for better LLM processing
- Includes useful metadata about the content

## Installation

### Installing via Smithery

To install Mozilla Readability Parser for Claude Desktop automatically via [Smithery](https://smithery.ai/server/server-moz-readability):

```bash
npx -y @smithery/cli install @jharding_npm/server-moz-readability --client claude
```

### Manual Installation
```bash
npm install @jharding_npm/server-moz-readability
```

## Starting the Server (CLI)

You can start the server directly with:

```bash
npx -y @jharding_npm/server-moz-readability
```

You should see a banner with the version number, and the server will wait for requests via stdio.

## Tool Reference

### `parse`
Fetches and transforms webpage content into clean Markdown.

**Arguments:**
```json
{
  "url": {
    "type": "string",
    "description": "The website URL to parse",
    "required": true
  }
}
```

**Returns:**
```json
{
  "title": "Article title",
  "content": "Markdown content...",
  "metadata": {
    "excerpt": "Brief summary",
    "byline": "Author information",
    "siteName": "Source website name"
  }
}
```

## Usage with Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "readability": {
      "command": "npx",
      "args": ["-y", "@jharding_npm/server-moz-readability"]
    }
  }
}
```

## Example MCP config.json

To use this server with an MCP host or compatible LLM tool, add it to your MCP config JSON like so:

```json
{
  "mcpServers": {
    "readability": {
      "command": "npx",
      "args": ["-y", "@jharding_npm/server-moz-readability"]
    }
  }
}
```

Save this as `config.json` and provide it to your MCP host or LLM tool as needed. This will launch the server using npx and make it available for tool calls under the name `readability`.

## Dependencies
- @mozilla/readability - Content extraction
- turndown - HTML to Markdown conversion
- jsdom - DOM parsing
- axios - HTTP requests

## License
MIT
