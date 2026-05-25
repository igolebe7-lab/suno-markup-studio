# Open Design Brief — Suno Markup Studio

## Goal

Create a production-ready redesign for Suno Markup Studio using the included real source files as the source of truth.

This is a dense productivity editor for preparing Suno AI music prompts and plain-text lyrics markup. It is not a landing page, not a marketing site, and not a decorative portfolio page.

## Product Summary

Suno Markup Studio helps a user assemble:

- `Style / Genre prompt`: genre, mood, tempo, vocal, instruments, production, language, avoid descriptors.
- `Lyrics`: plain text lyrics with square-bracket metatags like `[Verse]`, `[Chorus: full band]`, `[Outro]`, `[End]`.
- `Validation`: syntax, structure, conflicting descriptor warnings.
- `Export`: Style, Lyrics, both, Markdown, JSON, TXT.

The app now has backend auth and cloud project persistence, but this design task should focus on the frontend editor UX.

## Current UI Structure

Use the included `source/apps/web/src/App.tsx` and `source/apps/web/src/styles.css`.

Current surfaces:

- Header:
  - app brand;
  - project title;
  - project selector when authenticated;
  - preset selector;
  - undo/redo;
  - validate;
  - login/logout;
  - save/sync;
  - export;
  - theme/settings icons.
- Left sidebar:
  - `Библиотека тегов`;
  - search;
  - placement/confidence filters;
  - category chips;
  - draggable tag rows with favorite toggle and short description.
- Center workspace:
  - `Стиль / жанр`;
  - style chips;
  - raw style prompt textarea;
  - generated style output;
  - `Текст песни`;
  - CodeMirror plain-text editor;
  - highlighted `[tags]`;
  - drag insertion guide.
- Right inspector:
  - Outline;
  - warnings;
  - export actions.
- Modals:
  - auth login/register;
  - category-aware tag settings.

## Critical Product Logic

Preserve these rules:

- Lyrics editor must remain plain text.
- Square-bracket tags are visual highlights only, not rich blocks.
- Drag/drop into Lyrics inserts a tag as its own line at a line boundary.
- Drag/drop into Style adds compatible style tags.
- Export must remain plain strings/JSON without hidden markup.
- Tag settings must be category-aware:
  - Structure: section number, section energy, arrangement, transition.
  - Vocal: vocal role/range, delivery, layers, vocal effect.
  - Instrument: role, tone, energy, transition.
  - Dynamics: shape, intensity, timing, transition.
  - Production: space, texture, effect amount, mix focus.
  - Style descriptors: style energy, texture, arrangement.
- Instrument tags must not show vocal controls.
- Vocal tags must not show instrument-only controls.
- Auth/sync controls must be visible but not dominate the editor.

## Design Direction

Use a practical professional editor style:

- dense but readable;
- light theme first;
- neutral white/light surfaces;
- teal/cyan primary actions;
- amber/red validation states;
- compact panels with 6-8px radius;
- clear hierarchy, no overlapping panels;
- no hero section;
- no marketing composition;
- no decorative blobs/orbs;
- no oversized cards;
- no visual noise that slows editing.

References by function, not by visual copying:

- Figma-style side panels;
- VS Code-style workspace hierarchy;
- Notion-level density;
- DAW/editor workflow logic.

## Required Outputs

Produce:

1. Desktop 1440px main editor design.
2. Mobile 390px main editor design.
3. Tag settings modal design.
4. Auth modal design.
5. Project selector and sync-state design.
6. Design tokens:
   - colors;
   - typography;
   - spacing;
   - radius;
   - shadows;
   - state colors.
7. Implementation notes:
   - which CSS sections to replace;
   - which React components should be split out;
   - responsive behavior;
   - accessibility notes.

## Do Not Do

- Do not create a landing page.
- Do not invent unrelated AI generation features.
- Do not add Suno API integration.
- Do not redesign backend behavior.
- Do not hide the tag library behind an always-closed menu on desktop.
- Do not make the editor sparse or presentation-like.
- Do not remove line numbers or plain-text editing.

## Success Criteria

The final design should make these workflows faster and clearer:

- find a tag;
- configure a tag logically;
- drag a tag into Style or Lyrics;
- edit lyrics;
- inspect outline/warnings;
- save to account;
- export plain text.
