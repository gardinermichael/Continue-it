(() => {
  if (window.ContinueItProviders) {
    return;
  }

  const PROVIDERS = [
    {
      id: "claude",
      name: "Claude",
      matches: [{ host: "claude.ai" }],
      rootSelectors: ["main", '[data-testid*="conversation"]', '[class*="conversation"]', '[class*="thread"]'],
      messageSelectors: ['[data-testid*="message"]', '[class*="message"]', '[role="article"]', 'article', '[class*="prose"]', '[class*="markdown"]', '[data-is-streaming]'],
      composerSelectors: ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]', 'textarea'],
      userHints: ["user", "human", "you", "prompt"],
      assistantHints: ["assistant", "claude", "model", "ai"]
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      matches: [{ host: "chatgpt.com" }, { host: "chat.openai.com" }],
      rootSelectors: ["main", '[data-testid*="conversation"]', '[class*="conversation"]', '[class*="thread"]', '[data-testid*="conversation-turn"]'],
      scrollSelectors: ['main', '[class*="overflow-y-auto"]', '[data-testid*="conversation"]'],
      messageSelectors: ['[data-message-author-role]', '[data-testid^="conversation-turn-"]', '[data-testid*="conversation-turn"]', '[role="article"]', 'article', '[class*="prose"]', '[class*="markdown"]', '[data-testid*="assistant"]'],
      composerSelectors: ['#prompt-textarea', 'textarea[data-id="root"]', 'form textarea', 'form [contenteditable="true"]', '[contenteditable="true"][role="textbox"]'],
      userHints: ["user", "human", "you", "prompt"],
      assistantHints: ["assistant", "chatgpt", "openai", "model", "ai"]
    },
    {
      id: "gemini",
      name: "Gemini",
      matches: [{ host: "gemini.google.com" }],
      rootSelectors: ["main", '[class*="conversation"]', '[data-test-id*="conversation"]', '[class*="chat"]'],
      messageSelectors: ['[data-test-id*="conversation-turn"]', '[data-test-id*="response"]', '[data-test-id*="user-input"]', 'article', '[class*="prose"]', '[class*="markdown"]', '[class*="message"]'],
      composerSelectors: ['rich-textarea [contenteditable="true"]', '[contenteditable="true"][aria-label*="prompt"]', 'textarea', '[contenteditable="true"]'],
      userHints: ["user", "human", "you", "prompt"],
      assistantHints: ["assistant", "gemini", "google", "model", "ai"]
    },
    {
      id: "grok",
      name: "Grok",
      matches: [{ host: "grok.com" }, { host: "x.com", pathPrefix: "/i/grok" }],
      rootSelectors: ["main", '[class*="conversation"]', '[data-testid*="conversation"]', '[class*="thread"]'],
      messageSelectors: ['[data-testid*="message"]', '[class*="message"]', 'article', '[class*="prose"]', '[class*="markdown"]', '[data-testid*="response"]'],
      composerSelectors: ['textarea', '[contenteditable="true"][role="textbox"]', '[contenteditable="true"]'],
      userHints: ["user", "human", "you", "prompt"],
      assistantHints: ["assistant", "grok", "xai", "model", "ai"]
    },
    {
      id: "perplexity",
      name: "Perplexity",
      matches: [{ host: "perplexity.ai" }, { host: "www.perplexity.ai" }],
      rootSelectors: ["main", '[class*="conversation"]', '[data-testid*="thread"]', '[class*="chat"]'],
      messageSelectors: ['[data-testid*="message"]', '[data-testid*="answer"]', 'article', '[class*="prose"]', '[class*="markdown"]', '[class*="message"]'],
      composerSelectors: ['textarea', '[contenteditable="true"][role="textbox"]', '[contenteditable="true"]'],
      userHints: ["user", "human", "you", "prompt"],
      assistantHints: ["assistant", "perplexity", "answer", "model", "ai"]
    }
  ];

  function matchProvider(locationLike = window.location) {
    const host = (locationLike.hostname || "").toLowerCase();
    const path = locationLike.pathname || "/";

    return PROVIDERS.find((provider) => {
      return provider.matches.some((match) => {
        const hostMatches = host === match.host || host.endsWith(`.${match.host}`);
        const pathMatches = !match.pathPrefix || path.startsWith(match.pathPrefix);
        return hostMatches && pathMatches;
      });
    }) || null;
  }

  window.ContinueItProviders = {
    all: PROVIDERS,
    matchProvider
  };
})();