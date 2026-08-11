---
name: developer
description: Use when working with developer
---

# Developer Skill

Use when working with developer

## When to Use This Skill

Use this skill when you need to:
- understand developer features, APIs, and workflows
- find concrete code examples before implementing or debugging
- navigate the official documentation quickly through categorized references

## Quick Reference

### High-Signal Examples

**Example 1** (json):
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

**Example 2** (elixir):
```elixir
npx modern-web-guidance@latest install --choose
```

**Example 3** (elixir):
```elixir
claude mcp add chrome-devtools --scope project -- npx chrome-devtools-mcp@latest --categoryExtensions --autoConnect
```

## Reference Files

This skill includes comprehensive documentation in `references/`:

- **other.md** - Other documentation

Use `view` to read specific reference files when detailed information is needed.

## Working with This Skill

### Start Here
Start with the getting_started or tutorials reference files for foundational concepts.

### For Specific Features
Use the appropriate category reference file (api, guides, etc.) for detailed information.

### For Code Examples
Use the high-signal examples above first, then open the matching reference file for full context.

## Notes

- This skill was automatically generated from official documentation
- Reference files preserve the structure and examples from source docs
- Code examples include language detection for better syntax highlighting
- Quick reference entries are filtered to avoid low-signal placeholders and inline tokens

## Updating

To refresh this skill with updated documentation:
1. Re-run the scraper with the same configuration
2. The skill will be rebuilt with the latest information
