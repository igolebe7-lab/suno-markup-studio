# Open Design Package For Suno Markup Studio

This folder is a sanitized design package for Open Design.

It contains only frontend/product context:

- product brief;
- architecture summary;
- current UI notes;
- real React/CSS source files relevant to the interface;
- prompt to paste into Open Design.

It intentionally excludes:

- `.env`;
- database credentials;
- backend implementation;
- `node_modules`;
- `dist`;
- lockfiles.

## How To Use

1. Open your Open Design project folder.

If running Open Design from source, projects are usually under:

```text
open-design/.od/projects/<project-id>/
```

2. Copy this whole folder into that project folder:

```text
open-design-brief/
```

3. In Open Design, paste the contents of:

```text
open-design-brief/open-design-prompt.md
```

4. Ask Open Design to produce:

- desktop screenshot/artifact;
- mobile screenshot/artifact;
- tag settings modal;
- auth modal;
- design tokens;
- implementation notes.

5. Return the generated artifacts to the main Suno Markup Studio repo for implementation.

## Best Result

Give Open Design both:

- this package;
- screenshots of the currently running app.

Recommended screenshots:

- main editor desktop;
- tag settings modal;
- auth modal;
- mobile layout.
