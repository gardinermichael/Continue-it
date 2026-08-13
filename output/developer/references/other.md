# Developer - Other

**Pages:** 2

---

## Build extensions with coding agents | Extensions and AI | Chrome for Developers

**URL:** https://developer.chrome.com/docs/extensions/ai/build-with-ai

**Contents:**
- Build extensions with coding agents Stay organized with collections Save and categorize content based on your preferences.
- Setup
  - Modern Web Guidance
    - CLI
    - Antigravity
  - Chrome DevTools for coding agents
    - Antigravity
    - Claude Code
    - Other agents
  - CHROMEWEBSTORE.md agent instructions

AI coding agents, like Antigravity, can now generate extension code with impressive accuracy. However, to truly unlock their potential and ensure high-quality results, you need to provide them with the right context and tools.

This guide explains how to setup the right tools in your coding agents and how they can help you build better extensions faster.

We have created a skill for coding agents specifically designed for extension development. This skill is a part of our broader initiative, Modern Web Guidance, which provides AI coding agents with the web platform expertise, best practices, and modern API patterns.

But building the extension is just the first step. To help you verify that your code works as expected, Chrome DevTools for agents enables AI coding assistants to debug extensions directly in Chrome and benefit from DevTools debugging capabilities and performance insights.

To use the skills pack, install Modern Web Guidance to your preferred environment and add the extensions skill to it. Here are the instructions for some of the popular tools.

The recommended installation for most coding agents (including Gemini CLI, Claude Code and Codex) is through the modern-web-guidance CLI built by the Chrome team. Installing the skills through the modern-web-guidance CLI will automatically keep skills up to date.

This runs an interactive wizard to install the skills to your preferences. When presented with options, select your coding agent(s) and choose both chrome-extensions and modern-web-guidance.

Selecting chrome-extensions and modern-web-guidance in the installer wizard.

When installing Antigravity, you can select the Modern Web Guidance plugin which includes the extensions skill, or you can add it through Customizations > Build With Google Plugins > Modern Web Guidance.

Selecting the Modern Web Guidance plugin during Antigravity installation.

Adding Modern Web Guidance through Customizations after installation.

You can add Chrome DevTools for agents to your coding agent of choice either as a plugin, extension or as an MCP server.

Here are the instructions for some of the most popular agents.

On startup, or in Settings > Customizations, under Build with Google enable Chrome DevTools. This will only install the Chrome DevTools skill, but not the MCP server.

To add the Chrome DevTools MCP server go to Settings > Customization, click the Add MCP server button and search for Chrome DevTools.

Click Open MCP Config to open the MCP server configuration. Note that you have to close the settings to see the configuration file in the IDE.

Add the following two configuration parameters: --categoryExtensions (to enable the extensions tools) and --autoConnect (to enable connecting to an existing Chrome Profile, which is required when using Chrome's built-in AI APIs or requiring sign-in).

To enable remote debugging, open Chrome, navigate to chrome://inspect/#remote-debugging and select Allow remote debugging for this browser instance.

Restart Antigravity IDE.

Create a new workspace and create a test prompt: "Create a hello world Chrome extension. Test using Chrome DevTools." When the agent initiates testing the extension in the browser, Chrome will show you a dialog requesting remote debugging permission. Select Allow. While the remote debugging session is enabled, Chrome will display a banner "Chrome is currently controlled by automated test software".

For instructions on setting up other agents, check the docs on Chrome DevTools MCP GitHub.

An important part of publishing an extension is filling out the Developer Dashboard. The skill addresses this by having your coding agent create and maintain a CHROMEWEBSTORE.md file which tracks necessary information, including justifications for each permission requested in the code.

The skill will get triggered when you use phrases like "Let's publish this" or "Prepare this extension for the store", but to streamline your agentic workflows, add the following to your agent's system instructions (for example, ~/.gemini/GEMINI.md for Antigravity or ~/.claude/CLAUDE.md for Claude):

The extension skill included in Modern Web Guidance helps agents in three key ways:

Modern Web Guidance also includes skills that cover everything you need to deliver an excellent user experience, such as performance, accessibility, and modern APIs. For example, built-in AI API skills make sure that AI coding agents always use the latest version of the API together with additional information about explicit architectural rules and hardware constraints for using these APIs, to enable efficient management of model downloads, focus on security, and graceful fallback strategies.

The skill also helps your agent track necessary information for publishing, including justifications for each permission requested in the code. For example, if you ask your coding agent to build an extension using the Side Panel API and to publish it to the Chrome Web Store, the agent will recognize that it needs the sidePanel permission. It will then create a CHROMEWEBSTORE.md file with a justification. When you are ready to submit, you can review this justification, make any adjustments if needed, and copy it straight into the Developer Dashboard.

Chrome DevTools for agents enables AI coding assistants to install and debug extensions in a running Chrome instance, specifically:

Here's a prompt and a video showing how that works in practice:

In this case, the agent should create a Manifest V3 file and request the storage permission because it knows it needs to persist data. The agent can now build an extension, install it, watch it run, and verify its stability without you ever leaving the chat interface.

This is a simple prompt example. To learn more about different prompt techniques and find what works best for your use case, check out our guide on Prompt engineering.

While installing the extension skill and adding instructions to your agent will do most of the work, being specific in your prompts can produce better results for the stage of development you're in. Here's a quick guide on how to prompt your agent to create, update, and maintain your CHROMEWEBSTORE.md file.

Combining Modern Web Guidance skills with Chrome DevTools for agents helps you build high-quality features faster but also ensures your extension is stable and ready for submission to the Chrome Web Store.

Start experimenting with these tools in your next project to see how they can streamline your extension development from initial prototype to publication.

Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 4.0 License, and code samples are licensed under the Apache 2.0 License. For details, see the Google Developers Site Policies. Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2026-05-19 UTC.

**Examples:**

Example 1 (elixir):
```elixir
npx modern-web-guidance@latest install --choose
```

Example 2 (json):
```json
{
 "mcpServers": {
   "chrome-devtools-mcp": {
     "args": [
       "-y",
       "chrome-devtools-mcp@latest",
       "--categoryExtensions",
       "--autoConnect"
     ],
     "command": "npx"
   }
 }
}
```

Example 3 (jsx):
```jsx
<figure>
  <img src="image/antigravityide--u84rk62f5t9.png" alt="The remote debugging warning banner and approval popup dialog in Chrome." class="screenshot" width="800">
  <figcaption>The remote debugging banner indicating automated browser control is active.</figcaption>
</figure>
```

Example 4 (elixir):
```elixir
claude mcp add chrome-devtools --scope project -- npx chrome-devtools-mcp@latest --categoryExtensions --autoConnect
```

---

## Extensions and AI | Chrome for Developers

**URL:** https://developer.chrome.com/docs/extensions/ai

**Contents:**
  - Extensions and AI
  - Build extensions with AI coding tools
  - Enhance browsing with AI-powered extensions
    - Control web content
    - Make the browser more helpful
    - Customize the browser
  - Build AI-powered Chrome Extensions with Gemini
  - Even more use cases
- Integrate AI with extensions
  - Client-side AI

Learn how to work with AI coding tools to build and debug your extensions and unlock faster, smarter development and more powerful user experiences.

Install Chrome extensions skill from Modern Web Guidance via CLI:

---
