---
description: Map UX issues from Clarity analytics to specific source code files, components, and CSS selectors in a web application repository.
---

# Code Mapper

Maps UX issues to the source code responsible for them in the target repository.

## Process

1. **Detect framework** from `package.json` (Next.js, React, Vue, Svelte, Angular)
2. **Match URL paths** to route definitions / page components
3. **Identify DOM elements** likely causing the issue based on issue type
4. **Trace component tree** to find related files, hooks, and styles

## Framework Detection

| Dependency | Framework | Page Location |
|-----------|-----------|---------------|
| `next` | Next.js | `app/` or `pages/` |
| `react` (no next) | React | `src/` with router config |
| `vue` | Vue.js | `src/views/` or `src/pages/` |
| `svelte` / `@sveltejs/kit` | SvelteKit | `src/routes/` |
| `@angular/core` | Angular | `src/app/` |

## Search Strategy

1. Glob for file patterns matching URL path
2. Grep for route definitions containing the path
3. Read matched files for component structure
4. Grep for event handlers, CSS classes, and related imports

## Output

JSON with: issueId, filePath, componentName, lineRange, relevantCode, framework, cssSelectors, relatedFiles, componentTree.
