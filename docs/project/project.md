Current Tech Stack:

- React 19 + TypeScript + Vite 8
- `simple-mind-map` 0.14.0-fix.2 (npm package, not UMD)
- `antd` 6 + `@ant-design/icons` 6 — UI component library
- `jsonrepair` — JSON auto-repair
- No i18n library
- No HTTP client library — uses native `fetch`
- IndexedDB for storage (not localStorage)
- Pure CSS styling (no CSS-in-JS, no Tailwind)
- pnpm as package manager

Project Structure:

```
react-simple-mind-map/
├── public/
│   ├── vendor/
│   │   └── simpleMindMap.umd.min.js    # UMD fallback (legacy)
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── templates/                      # Mind map template JSON files
│   │   ├── bayesian-thinking*.json
│   │   ├── code-generation*.json
│   │   ├── course-learning*.json
│   │   ├── critical-thinking*.json
│   │   ├── default*.json
│   │   ├── fermats-law*.json
│   │   ├── first-principles*.json
│   │   ├── note-taking*.json
│   │   └── card.html
│   ├── AISettingsDrawer.tsx            # AI settings drawer (antd Drawer)
│   ├── App.css                         # App-level styles
│   ├── App.tsx                         # Main app: toolbar, document management
│   ├── MindMapCanvas.tsx               # Canvas component with MindMapCanvasHandle
│   ├── OutlinePanel.tsx                # Outline panel component
│   ├── ThinkingModelDrawer.tsx          # Thinking model selection drawer
│   ├── const.ts                        # thinkingModels, languageOptions, modelOptions
│   ├── index.css                       # Global styles
│   ├── libai.ts                        # AI service: buildPrompt, requestCompletions, extractIdeas, expandPrompt, checkModelConfig
│   ├── main.tsx                        # React entry point
│   ├── mindmapData.ts                  # Tree manipulation utilities
│   ├── simple-mind-map.d.ts            # Type declarations for simple-mind-map global
│   ├── storage.ts                      # IndexedDB storage for documents & AI settings
│   ├── types.ts                        # MindNode, MindMapDocument, AISettings, ThinkingModel, AIGenerateNode, etc.
│   └── useAIGenerate.ts               # Hook: AI generation logic (buildPrompt → request → extractIdeas → addAIChildNodes)
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts
```
