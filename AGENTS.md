# Repository Guidelines

## Project Structure & Module Organization
- `map-game/`: map guessing game folder.
- `map-game/index.html`: single-page app containing HTML, CSS, and JS for the game.
- `map-game/worldPacificRimHigh.svg`: map asset referenced by the game.
- `puzzle-game/`: puzzle game folder.
- `puzzle-game/index.html`: single-page app containing HTML, CSS, and JS for the puzzle.
- `puzzle-game/assets/`: image gallery assets for the puzzle.

## Build, Test, and Development Commands
- No build step is required; open `map-game/index.html` or `puzzle-game/index.html` directly in a browser for quick checks.
- Optional local server for file-based fetch/security parity:
  - `python -m http.server 8000` (run from repo root).

## Coding Style & Naming Conventions
- Indentation: 2 spaces for HTML, CSS, and JS.
- Naming: `kebab-case` for CSS classes/ids, `camelCase` for JS variables/functions, `UPPER_SNAKE_CASE` for constants.
- JS style: prefer small, focused functions; avoid long functions and split logic by responsibility (input handling, map rendering, list updates, timer).
- Keep CSS organized by section (layout, map, lists, states) and avoid one-off inline styles.

## Testing Guidelines
- No automated tests are currently configured.
- Manual checks should cover:
  - Typing a correct country fills the map and list entry.
  - Timer starts on first input and resets correctly.
  - Reset button clears map and lists.

## Commit & Pull Request Guidelines
- No commit history exists yet; use clear, imperative messages (e.g., "Add inline SVG map").
- PRs should include:
  - A short description of behavior changes.
  - Manual test steps.
  - A screenshot or screen recording for UI changes.

## Agent-Specific Notes
- If adding Python tooling, use `uv` (`uv add`, `uv sync`) per repository instructions.
