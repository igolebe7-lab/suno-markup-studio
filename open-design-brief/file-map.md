# File Map For Open Design

Use these files as product and UI context.

## Primary UI

```text
source/apps/web/src/App.tsx
```

Contains the current app shell and main React components:

- `AppHeader`
- `AuthModal`
- `TagLibrary`
- `DraggableTag`
- `TagSettingsPanel`
- `StylePromptEditor`
- `LyricsEditor`
- `RightPanel`
- `PresetRail`

This file defines the UI structure and interaction surface.

```text
source/apps/web/src/styles.css
```

Contains the current visual system, responsive layout, editor panels, tag rows, modals, dark mode, and mobile behavior.

## State And Backend Sync

```text
source/apps/web/src/stores/projectStore.ts
```

Zustand store for:

- current project;
- local editor UI state;
- undo/redo;
- auth user;
- project list;
- sync status;
- localStorage fallback;
- backend project sync.

```text
source/apps/web/src/lib/api.ts
```

Typed frontend API client. Relevant for auth and sync UI states.

## Product Data

```text
source/apps/web/src/data/tags.ts
```

Tag catalog. Important for tag library density and category-aware tag settings.

```text
source/apps/web/src/data/presets.ts
```

Genre presets. Important for preset rail and preset selector.

## Domain Logic

```text
source/apps/web/src/domain/types.ts
source/apps/web/src/domain/lyrics.ts
source/apps/web/src/domain/stylePrompt.ts
source/apps/web/src/domain/validation.ts
source/apps/web/src/domain/exporters.ts
```

Pure logic. Do not redesign these directly, but preserve the behavior they imply.

## Architecture Docs

```text
apps_structure.md
AGENTS.md
README.md
```

Use these to understand the application purpose, rules, architecture and test expectations.

## Intentionally Excluded

The package excludes:

- `.env`;
- backend source;
- Prisma schema;
- `node_modules`;
- `dist`;
- `package-lock.json`;
- generated files.

Reason: this Open Design task is frontend UX redesign, not backend architecture.
