# Current UI Notes

## What Works

- The app opens directly into the editor, which is correct.
- The main information architecture is correct:
  - left tag library;
  - center editing workspace;
  - right outline/warnings/export inspector.
- The tag settings modal is category-aware and should remain so.
- Drag/drop has visible line-boundary insertion in Lyrics.
- CodeMirror is plain text and should stay plain text.
- Export behavior is plain string/JSON.

## Current Weaknesses To Improve

- Header is dense and risks becoming crowded as auth/project controls expand.
- Project selector, preset selector, sync status and export need clearer grouping.
- Tag library rows now include useful descriptions, but hierarchy can be improved.
- Category chips need better scanability when the catalog is large.
- Style panel has useful controls but can look cramped.
- Right inspector should feel more like a structured inspector, not unrelated boxes.
- Auth modal is functional but visually basic.
- Tag settings modal is logical now, but needs stronger category explanation and cleaner layout.
- Mobile layout needs a deliberate mode switch: Tags / Editor / Inspector or similar.

## Design Priorities

1. Preserve workflow speed.
2. Clarify grouping.
3. Improve hierarchy and readability.
4. Make auth/sync states understandable.
5. Keep the editor compact.
6. Avoid decorative visual treatment that reduces usable space.

## Preferred Interaction Model

Desktop:

- persistent left tag library;
- persistent center editor;
- right inspector visible when width permits;
- no hidden primary workflows.

Tablet/Mobile:

- use tabs or segmented controls:
  - Tags;
  - Style;
  - Lyrics;
  - Inspector.
- avoid side-by-side cramped panels.

## Tag Settings Modal Requirements

The modal should show:

- tag label;
- category;
- placement;
- confidence;
- short Russian description;
- detailed Russian guidance;
- only relevant fields;
- examples;
- aliases;
- preview;
- actions.

The preview should remain visually prominent because it shows exactly what will be inserted.

## Auth And Sync Requirements

States to design:

- not logged in: `Войти`;
- syncing: `Сохранение...`;
- synced: `cloud saved` or Russian equivalent;
- error: visible but compact error state;
- logged in: user email, project selector, save/logout.

Auth modal states:

- login;
- register;
- loading;
- error message.
