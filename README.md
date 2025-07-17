# Context7 Playwright VS Code Extension

A VS Code extension that integrates Context7 MCP for code lookup and generation, combined with Playwright for automated documentation browsing and web scraping.

## Features

### 🔍 Code Lookup
- Search for code examples and documentation across multiple libraries
- Filter by programming language
- View code snippets with context and relevance scores
- Access to Context7's comprehensive code database

### 🚀 Code Generation
- Generate code using Context7's AI-powered code generation
- Support for popular libraries like React, Next.js, TypeScript
- Natural language prompts for code creation
- Context-aware code generation based on library documentation

### 🌐 Documentation Browser
- Automated browser sessions using Playwright
- Open and browse documentation websites
- Extract content from documentation pages
- Take screenshots of documentation
- Search within documentation pages

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Compile the extension:
   ```bash
   pnpm run compile
   ```
4. Press F5 in VS Code to run the extension in development mode

## Usage

### Commands

The extension provides three main commands accessible via the Command Palette (`Ctrl+Shift+P`):

- **Context7: Lookup Code** - Search for code examples and documentation
- **Context7: Generate Code** - Generate code using AI
- **Context7: Browse Documentation** - Open documentation in automated browser

### Sidebar Views

The extension adds a new sidebar container with three views:

1. **Code Lookup** - Search interface for finding code examples
2. **Code Generator** - Interface for generating code with AI
3. **Documentation Browser** - Manage browser sessions for documentation

## Architecture

The extension follows the Single Responsibility Principle with separate services:

- **Context7Service** - Handles all Context7 MCP interactions
- **PlaywrightService** - Manages browser automation and sessions
- **CommandManager** - Orchestrates command execution
- **ViewProvider** - Manages webview UI components

## Development

### Prerequisites

- Node.js 18+
- pnpm
- VS Code Extension Development Host

### Build Commands

```bash
# Compile TypeScript
pnpm run compile

# Watch for changes
pnpm run watch

# Build webview assets
pnpm run build:webview

# Lint code
pnpm run lint

# Run tests
pnpm run test
```

### Project Structure

```
src/
├── extension.ts              # Main extension entry point
├── services/
│   ├── context7-service.ts   # Context7 MCP integration
│   ├── playwright-service.ts # Playwright browser automation
│   └── command-manager.ts    # Command handling
├── providers/
│   └── view-provider.ts      # Webview UI providers
├── models/
│   ├── mcp-server.ts         # MCP server interfaces
│   └── mcp-connection.ts     # Connection interfaces
└── webview/
    ├── input.css             # Tailwind CSS input
    └── webview.ts            # Webview TypeScript
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - Required for LangChain integration
- `CONTEXT7_API_KEY` - Optional for enhanced Context7 features

### VS Code Settings

The extension can be configured through VS Code settings:

```json
{
  "context7-playwright.apiKey": "your-api-key",
  "context7-playwright.defaultLanguage": "TypeScript",
  "context7-playwright.browserHeadless": false
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Dependencies

- **LangChain** - AI/LLM integration
- **Playwright** - Browser automation
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **@types/vscode** - VS Code Extension API types (replaces deprecated vscode package)
- **@vscode/test-electron** - Testing framework (replaces deprecated vscode-test package)

## Migration from Deprecated Packages

This extension has been updated to use the new VS Code extension development packages:

### What Changed

- **@types/vscode** replaces the deprecated `vscode` package for type definitions
- **@vscode/test-electron** replaces the deprecated `vscode-test` package for testing
- Updated test structure to use modern Mocha testing framework

### Benefits

- Better type safety with dedicated type definitions
- Improved testing capabilities with the new test framework
- Future-proof implementation following VS Code's latest recommendations
- Better performance and smaller bundle sizes

## Roadmap

- [ ] Real Context7 API integration
- [ ] More library support
- [ ] Code snippet insertion into editor
- [ ] Documentation search improvements
- [ ] Custom browser profiles
- [ ] Export/import configurations 