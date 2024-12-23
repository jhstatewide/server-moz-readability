# MCP Website Parser Server

An MCP server that extracts and transforms webpage content into clean, LLM-optimized Markdown. Returns article title, main content, excerpt, byline and site name. Uses Mozilla's Readability algorithm to remove ads, navigation, footers and non-essential elements while preserving the core content structure.

## Features
- Removes ads, navigation, footers and other non-essential content
- Converts clean HTML into well-formatted Markdown
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
```bash
npm install website-parser-mcp
```

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
    "parser": {
      "command": "npx",
      "args": ["-y", "website-parser-mcp"]
    }
  }
}
```

## Dependencies
- @mozilla/readability - Content extraction
- turndown - HTML to Markdown conversion
- jsdom - DOM parsing
- axios - HTTP requests

## License
MIT
