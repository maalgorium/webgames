import fs from "node:fs";

const svg = fs.readFileSync("map-game/worldPacificRimHigh.svg", "utf8");
const escaped = svg
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

fs.writeFileSync(
  "map-game/js/map-svg.js",
  `// map-svg.js — Inline SVG text fallback for direct file opens.\n\nconst MAP_SVG_TEXT = \`${escaped}\`;\n`
);
