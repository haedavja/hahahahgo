# Legacy Battle Workflow

The standalone battle view (`public/battle.html`) is still loaded through an iframe, but we now keep the canonical React source under version control so future changes, bug fixes, and tests can be done in one place.

## Files & Folders

- `legacy/battle/battle-app.jsx` — **single source of truth** for the legacy battle React code.
- `public/battle.html` — served to the iframe. The `<script type="text/babel">…</script>` block is generated from `battle-app.jsx`.
- `scripts/sync-battle.js` — small Node script that copies the JSX into `battle.html` with the right indentation.

## Editing Flow

1. Edit `legacy/battle/battle-app.jsx`.
2. Run `npm run sync:battle` to update `public/battle.html`.
3. Restart `npm run dev` (Vite caches assets under `public/`), then refresh `http://localhost:5173/` or load `http://localhost:5173/battle.html` directly.

## Testing Ideas

The battle file already exposes pure helpers (e.g. `detectPokerCombo`, `applyAction`, `generateEnemyActions`). You can copy them into dedicated modules later and add Jest/RTL tests without touching the iframe plumbing. Until then, editing only `battle-app.jsx` keeps future refactors safe and reviewable.

## NPM Scripts

```bash
npm run dev         # start Vite dev server
npm run build       # production build
npm run lint        # ESLint
npm run preview     # preview build output
npm run sync:battle # regenerate public/battle.html from legacy/battle/battle-app.jsx
```

Feel free to expand on this README as we move more logic from `public/battle.html` into proper modules/components.
