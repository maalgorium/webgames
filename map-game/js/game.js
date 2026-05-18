// game.js — Core game logic
// Requires: data.js and leaderboard.js loaded first

const MAP_SVG_PATH = "worldPacificRimHigh.svg";

// ─── State ───────────────────────────────────────────────────────────────────

const state = {
  found: new Set(),
  startTime: null,       // Date.now() when current timer segment started
  timerId: null,
  pausedElapsed: 0,      // Total seconds accumulated before the current segment
  paused: false,
  winModalTimeout: null, // ID of pending win-modal setTimeout
  registry: new Map(),   // slug → { name, continent }
  nameIndex: new Map(),  // normalized input → slug
  tileNodes: new Map(),  // slug → SVG path element
  territoryNodes: new Map(), // slug → [SVG path elements]
  listNodes: new Map(),  // slug → <li> element
  zoomBounds: new Map(), // zoom region → { x, y, width, height }
  originalViewBox: null,
  total: 0
};

// ─── DOM References ──────────────────────────────────────────────────────────

const elements = {
  input: document.getElementById("guess"),
  timer: document.getElementById("timer"),
  progress: document.getElementById("progress"),
  status: document.getElementById("status"),
  reset: document.getElementById("reset"),
  pause: document.getElementById("pause"),
  mapContainer: document.getElementById("map-container"),
  mapPlaceholder: document.getElementById("map-placeholder"),
  icelandInset: document.getElementById("iceland-inset"),
  map: null,
  lists: document.getElementById("lists"),
  starContainer: document.getElementById("star-container")
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeInput(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Registry / Name Index ───────────────────────────────────────────────────

function buildRegistry() {
  const registry = new Map();
  Object.entries(CONTINENT_COUNTRIES).forEach(([continent, countries]) => {
    countries.forEach((name) => {
      registry.set(slugify(name), { name, continent });
    });
  });
  return registry;
}

function buildNameIndex(registry) {
  const index = new Map();
  registry.forEach(({ name }, slug) => {
    index.set(normalizeInput(name), slug);
  });
  Object.entries(COUNTRY_ALIASES).forEach(([alias, canonical]) => {
    const key = normalizeInput(alias);
    const slug = slugify(canonical);
    if (registry.has(slug)) index.set(key, slug);
  });
  return index;
}

// ─── Map Loading ─────────────────────────────────────────────────────────────

function showMapMessage(message) {
  if (elements.mapPlaceholder) elements.mapPlaceholder.textContent = message;
}

function parseSvgText(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) return null;
  return prepareMapSvg(svg);
}

function prepareMapSvg(svg) {
  svg.setAttribute("id", "map");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "World map");
  if (!svg.getAttribute("preserveAspectRatio")) {
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }
  return svg;
}

function mountMapSvg(svg) {
  if (elements.map) elements.map.remove();
  if (elements.mapPlaceholder) {
    elements.mapPlaceholder.replaceWith(svg);
    elements.mapPlaceholder = null;
  } else {
    elements.mapContainer.appendChild(svg);
  }
  elements.map = svg;
}

async function loadMapSvgWithFetch() {
  const response = await fetch(MAP_SVG_PATH, { cache: "no-store" });
  if (!response.ok) throw new Error(`Map load failed: ${response.status}`);
  const svg = parseSvgText(await response.text());
  if (!svg) throw new Error("Map SVG missing <svg> root.");
  mountMapSvg(svg);
}

function loadMapSvgWithInlineText() {
  if (typeof MAP_SVG_TEXT === "undefined") {
    throw new Error("Inline map SVG text is unavailable.");
  }
  const svg = parseSvgText(MAP_SVG_TEXT);
  if (!svg) throw new Error("Map SVG missing <svg> root.");
  mountMapSvg(svg);
}

function loadMapSvgWithObject() {
  return new Promise((resolve, reject) => {
    const objectEl = document.createElement("object");
    objectEl.type = "image/svg+xml";
    objectEl.data = MAP_SVG_PATH;
    objectEl.className = "map-svg-loader";
    objectEl.setAttribute("aria-hidden", "true");

    objectEl.addEventListener("load", () => {
      const svg = objectEl.contentDocument && objectEl.contentDocument.querySelector("svg");
      if (!svg) {
        objectEl.remove();
        reject(new Error("Map SVG missing <svg> root."));
        return;
      }
      mountMapSvg(prepareMapSvg(document.importNode(svg, true)));
      objectEl.remove();
      resolve();
    }, { once: true });

    objectEl.addEventListener("error", () => {
      objectEl.remove();
      reject(new Error("Map object load failed."));
    }, { once: true });

    elements.mapContainer.appendChild(objectEl);
  });
}

async function loadMapSvg() {
  if (!elements.mapContainer) return false;
  try {
    if (window.location.protocol === "file:") {
      loadMapSvgWithInlineText();
    } else {
      await loadMapSvgWithFetch();
    }
    return true;
  } catch (primaryError) {
    console.warn(primaryError);
    try {
      loadMapSvgWithInlineText();
      return true;
    } catch (inlineError) {
      console.warn(inlineError);
      try {
        await loadMapSvgWithObject();
        return true;
      } catch (objectError) {
        console.warn(objectError);
        showMapMessage("Map failed to load.");
      }
    }
    return false;
  }
}

// ─── Map Configuration ───────────────────────────────────────────────────────

function buildSvgIndex() {
  const index = new Map();
  if (!elements.map) return index;
  elements.map.querySelectorAll(".land").forEach((path) => {
    const title = path.getAttribute("title");
    if (title) index.set(normalizeInput(title), path);
  });
  return index;
}

function mapCountriesToSvg(svgIndex) {
  state.tileNodes.clear();
  state.territoryNodes.clear();
  const missing = [];

  state.registry.forEach(({ name }, slug) => {
    const svgName = SVG_NAME_OVERRIDES[name] || name;
    const path = svgIndex.get(normalizeInput(svgName));
    if (!path) { missing.push(name); return; }
    path.dataset.country = slug;
    state.tileNodes.set(slug, path);

    const territories = COUNTRY_TERRITORIES[name];
    if (territories) {
      const territoryPaths = territories.map((t) => svgIndex.get(normalizeInput(t))).filter(Boolean);
      if (territoryPaths.length) state.territoryNodes.set(slug, territoryPaths);
    }
  });

  if (missing.length) console.warn("Missing countries in SVG:", missing);
}

function fitBoundsToContainer(bounds) {
  const container = elements.mapContainer;
  if (!container) return `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`;
  const rect = container.getBoundingClientRect();
  const cAspect = rect.width / rect.height;
  const bAspect = bounds.width / bounds.height;
  let vw = bounds.width, vh = bounds.height, vx = bounds.x, vy = bounds.y;
  if (cAspect > bAspect) {
    vw = bounds.height * cAspect;
    vx = bounds.x - (vw - bounds.width) / 2;
  } else {
    vh = bounds.width / cAspect;
    vy = bounds.y - (vh - bounds.height) / 2;
  }
  return `${vx} ${vy} ${vw} ${vh}`;
}

/**
 * Returns the combined SVG bounds for a set of registered country names.
 */
function getCountryBounds(countryNames) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasAny = false;
  countryNames.forEach((name) => {
    const path = state.tileNodes.get(slugify(name));
    if (!path) return;
    hasAny = true;
    const b = path.getBBox();
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  });
  if (!hasAny) return null;
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * Expands SVG bounds by a fixed amount in every direction.
 */
function padBounds(bounds, pad) {
  return {
    x: bounds.x - pad,
    y: bounds.y - pad,
    width: bounds.width + pad * 2,
    height: bounds.height + pad * 2
  };
}

/**
 * Applies region-specific cropping, zoom, and pan adjustments to SVG bounds.
 */
function tuneBounds(bounds, options = {}) {
  const cropTop = options.cropTop || 0;
  const scale = options.scale || 1;
  const xOffset = options.xOffset || 0;
  const yOffset = options.yOffset || 0;
  let tuned = { ...bounds };
  if (cropTop > 0) {
    const cropped = tuned.height * cropTop;
    tuned = { ...tuned, y: tuned.y + cropped, height: tuned.height - cropped };
  }
  if (scale !== 1) {
    const width = tuned.width * scale;
    const height = tuned.height * scale;
    tuned = {
      x: tuned.x + (tuned.width - width) / 2,
      y: tuned.y + (tuned.height - height) / 2,
      width,
      height
    };
  }
  return {
    ...tuned,
    x: tuned.x + tuned.width * xOffset,
    y: tuned.y + tuned.height * yOffset
  };
}

function setMapViewBox() {
  if (!elements.map) return;
  const group = elements.map.querySelector("g");
  if (!group) return;
  const box = group.getBBox();
  const pad = 18;
  state.originalViewBox = `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`;
  const bounds = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 };
  elements.map.setAttribute("viewBox", fitBoundsToContainer(bounds));
}

const ZOOM_EXCLUSIONS = {
  "Europe": ["Russia"],
  "North America": ["Canada"]
};

const ZOOM_GROUPS = {
  "Caribbean and Central America": [
    "Antigua and Barbuda",
    "Bahamas",
    "Barbados",
    "Belize",
    "Costa Rica",
    "Cuba",
    "Dominica",
    "Dominican Republic",
    "El Salvador",
    "Grenada",
    "Guatemala",
    "Haiti",
    "Honduras",
    "Jamaica",
    "Mexico",
    "Nicaragua",
    "Panama",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Trinidad and Tobago"
  ],
  "Middle East": [
    "Bahrain",
    "Iran",
    "Iraq",
    "Israel",
    "Jordan",
    "Kuwait",
    "Lebanon",
    "Oman",
    "Palestine",
    "Qatar",
    "Saudi Arabia",
    "Syria",
    "United Arab Emirates",
    "Yemen"
  ]
};

const ZOOM_TUNING = {
  "Caribbean and Central America": { pad: 20, scale: 0.75, xOffset: 0.08, yOffset: 0.08 },
  "Europe": { pad: 18, cropTop: 0.13, scale: 0.82, xOffset: 0.02, yOffset: 0.04 },
  "Middle East": { pad: 18, scale: 0.72, xOffset: 0.04, yOffset: 0.06 },
  "Oceania": { pad: 12, scale: 0.55, xOffset: 0.1, yOffset: -0.04 }
};

/**
 * Returns countries that should be included when framing a zoom region.
 */
function getZoomCountries(continent, countries) {
  const exclusions = ZOOM_EXCLUSIONS[continent] || [];
  return countries.filter((name) => !exclusions.includes(name));
}

/**
 * Stores the calculated bounds for a named zoom region.
 */
function storeZoomBounds(name, countries) {
  const settings = ZOOM_TUNING[name] || {};
  const bounds = getCountryBounds(countries);
  if (!bounds) return;
  const padded = padBounds(bounds, settings.pad ?? 30);
  state.zoomBounds.set(name, tuneBounds(padded, settings));
}

/**
 * Calculates bounds for continent and custom regional zoom buttons.
 */
function calculateZoomBounds() {
  state.zoomBounds.clear();
  Object.entries(CONTINENT_COUNTRIES).forEach(([continent, countries]) => {
    storeZoomBounds(continent, getZoomCountries(continent, countries));
  });
  Object.entries(ZOOM_GROUPS).forEach(([name, countries]) => storeZoomBounds(name, countries));
}

function animateViewBox(targetViewBox) {
  if (!elements.map) return;
  const current = elements.map.getAttribute("viewBox").split(" ").map(Number);
  const target = targetViewBox.split(" ").map(Number);
  const duration = 400;
  const startTime = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = easeOutCubic(progress);
    elements.map.setAttribute("viewBox", current.map((s, i) => s + (target[i] - s) * eased).join(" "));
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

function zoomToContinent(continent) {
  const bounds = state.zoomBounds.get(continent);
  if (!elements.map || !bounds) return;
  animateViewBox(fitBoundsToContainer(bounds));
  setActiveZoom(continent);
}

function getZoomRegionForCountry(name, continent) {
  const customRegion = Object.entries(ZOOM_GROUPS).find(([, countries]) => countries.includes(name));
  return customRegion ? customRegion[0] : continent;
}

function zoomToFullMap() {
  if (!elements.map || !state.originalViewBox) return;
  const parts = state.originalViewBox.split(" ").map(Number);
  animateViewBox(fitBoundsToContainer({ x: parts[0], y: parts[1], width: parts[2], height: parts[3] }));
  setActiveZoom("world");
}

/**
 * Marks the currently selected zoom button and toggles zoom-only overlays.
 */
function setActiveZoom(region) {
  document.querySelectorAll(".zoom-buttons button").forEach((button) => {
    button.classList.toggle("active", button.dataset.zoom === region);
  });
  if (elements.icelandInset) elements.icelandInset.classList.toggle("active", region === "Europe");
}

function configureMap() {
  if (!elements.map) return;
  mapCountriesToSvg(buildSvgIndex());
  setMapViewBox();
  calculateZoomBounds();
  buildIcelandInset();
  setActiveZoom("world");
}

/**
 * Builds the separate Iceland inset shown with the Europe zoom.
 */
function buildIcelandInset() {
  if (!elements.icelandInset || !elements.map) return;
  const path = state.tileNodes.get(slugify("Iceland"));
  if (!path) return;
  const box = path.getBBox();
  const pad = Math.max(box.width, box.height) * 0.35;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `${box.x - pad} ${box.y - pad} ${box.width + pad * 2} ${box.height + pad * 2}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Iceland inset");
  svg.appendChild(path.cloneNode(true));
  elements.icelandInset.replaceChildren(svg);
  refreshIcelandInset();
}

/**
 * Mirrors Iceland's found state into the Europe inset clone.
 */
function refreshIcelandInset() {
  if (!elements.icelandInset) return;
  const clone = elements.icelandInset.querySelector(".land");
  if (clone) clone.classList.toggle("found", state.found.has(slugify("Iceland")));
}

// ─── Continent Lists ──────────────────────────────────────────────────────────

function buildLists() {
  const container = elements.lists;
  container.innerHTML = "";
  Object.entries(CONTINENT_COUNTRIES).forEach(([continent, countries], index) => {
    const section = document.createElement("section");
    section.className = "continent-card";
    section.style.animationDelay = `${index * 0.06}s`;

    const heading = document.createElement("h3");
    heading.textContent = `${continent} (${countries.length})`;
    section.appendChild(heading);

    const list = document.createElement("ul");
    [...countries].sort((a, b) => a.localeCompare(b)).forEach((name) => {
      const li = document.createElement("li");
      const slug = slugify(name);
      li.dataset.country = slug;
      li.textContent = "-";
      list.appendChild(li);
      state.listNodes.set(slug, li);
    });
    section.appendChild(list);
    container.appendChild(section);
  });
}

// ─── Timer ───────────────────────────────────────────────────────────────────

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function getElapsedSeconds() {
  if (!state.startTime) return state.pausedElapsed;
  return state.pausedElapsed + Math.floor((Date.now() - state.startTime) / 1000);
}

function updateTimer() {
  elements.timer.textContent = formatTime(getElapsedSeconds());
}

function startTimer() {
  if (state.timerId || state.paused) return;
  state.startTime = Date.now();
  state.timerId = setInterval(updateTimer, 1000);
  updateTimer();
}

function stopTimer() {
  if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
  state.startTime = null;
}

function pauseTimer() {
  if (!state.timerId) return;
  state.pausedElapsed = getElapsedSeconds();
  stopTimer();
}

function resumeTimer() {
  if (state.timerId) return;
  state.startTime = Date.now();
  state.timerId = setInterval(updateTimer, 1000);
  updateTimer();
}

// ─── Pause / Resume ──────────────────────────────────────────────────────────

function setPaused(paused) {
  state.paused = paused;
  elements.pause.textContent = paused ? "Resume" : "Pause";
  elements.input.disabled = paused;

  let overlay = elements.mapContainer.querySelector(".paused-overlay");
  if (paused) {
    pauseTimer();
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "paused-overlay";
      overlay.textContent = "PAUSED";
      elements.mapContainer.appendChild(overlay);
    }
  } else {
    if (overlay) overlay.remove();
    // Resume timer only if the game was already in progress
    if (state.pausedElapsed > 0 || state.found.size > 0) {
      resumeTimer();
    }
  }
}

// ─── Status & Feedback ───────────────────────────────────────────────────────

function setStatus(message, variant) {
  elements.status.textContent = message;
  elements.status.className = variant ? `status ${variant}` : "status";
}

function clearStatus() {
  elements.status.textContent = "";
  elements.status.className = "status";
}

function showGoldStar() {
  if (!elements.starContainer) return;
  const star = document.createElement("span");
  star.className = "gold-star";
  star.setAttribute("aria-hidden", "true");
  star.textContent = "⭐";
  elements.starContainer.innerHTML = "";
  elements.starContainer.appendChild(star);
  star.addEventListener("animationend", () => star.remove());
}

// ─── Game Logic ──────────────────────────────────────────────────────────────

function updateProgress() {
  elements.progress.textContent = `${state.found.size} / ${state.total}`;
}

function markFound(slug) {
  const entry = state.registry.get(slug);
  if (!entry) return;
  state.found.add(slug);

  const tile = state.tileNodes.get(slug);
  if (tile) tile.classList.add("found");

  const territories = state.territoryNodes.get(slug);
  if (territories) territories.forEach((t) => t.classList.add("found"));

  const listItem = state.listNodes.get(slug);
  if (listItem) {
    listItem.textContent = entry.name;
    listItem.classList.add("found");
  }

  if (slug === slugify("Iceland")) refreshIcelandInset();
  zoomToContinent(getZoomRegionForCountry(entry.name, entry.continent));
  showGoldStar();
}

function resolveGuess(raw) {
  const key = normalizeInput(raw);
  return key ? (state.nameIndex.get(key) || null) : null;
}

function submitGuess(value) {
  const pieces = value.split(/[;,\n]/).map((p) => p.trim());
  let matched = false;
  pieces.forEach((part) => {
    const slug = resolveGuess(part);
    if (!slug) return;
    matched = true;
    if (!state.found.has(slug)) markFound(slug);
  });
  if (!matched) setStatus("No match yet.", "warn");
  updateProgress();
  if (state.found.size === state.total) onGameComplete();
}

function onGameComplete() {
  const finalSeconds = getElapsedSeconds(); // capture before stopTimer clears startTime
  stopTimer();
  setStatus("All countries found! 🎉", "");
  state.winModalTimeout = setTimeout(() => {
    state.winModalTimeout = null;
    showWinModal(finalSeconds);
  }, 600);
}

function resetGame() {
  // Cancel pending win modal and close it if already open
  if (state.winModalTimeout) {
    clearTimeout(state.winModalTimeout);
    state.winModalTimeout = null;
  }
  const modalOverlay = document.getElementById("modal-overlay");
  if (modalOverlay && modalOverlay.classList.contains("active")) {
    modalOverlay.classList.remove("active");
    modalOverlay.setAttribute("aria-hidden", "true");
  }

  state.found.clear();
  stopTimer();
  state.startTime = null;
  state.pausedElapsed = 0;
  state.paused = false;
  elements.pause.textContent = "Pause";
  elements.input.disabled = false;

  const overlay = elements.mapContainer.querySelector(".paused-overlay");
  if (overlay) overlay.remove();

  elements.timer.textContent = "00:00";
  elements.input.value = "";
  clearStatus();
  if (elements.starContainer) elements.starContainer.innerHTML = "";

  state.tileNodes.forEach((tile) => tile.classList.remove("found"));
  state.territoryNodes.forEach((ts) => ts.forEach((t) => t.classList.remove("found")));
  state.listNodes.forEach((item) => { item.textContent = "-"; item.classList.remove("found"); });
  refreshIcelandInset();

  updateProgress();
  zoomToFullMap();
}

// ─── Win Modal ───────────────────────────────────────────────────────────────

function showWinModal(finalSeconds) {
  const overlay = document.getElementById("modal-overlay");
  const timeEl = document.getElementById("modal-time");
  const nameInput = document.getElementById("player-name");
  const saveBtn = document.getElementById("modal-save");
  const skipBtn = document.getElementById("modal-skip");
  if (!overlay) return;

  timeEl.textContent = `Time: ${formatTime(finalSeconds)}`;
  nameInput.value = "";
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  nameInput.focus();

  function close() {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    saveBtn.removeEventListener("click", save);
    skipBtn.removeEventListener("click", close);
  }

  async function save() {
    const name = nameInput.value.trim() || "Anonymous";
    saveBtn.disabled = true;
    try {
      await leaderboard.addScore({
        name,
        countries: state.found.size,
        total: state.total,
        seconds: finalSeconds  // use captured value, not re-computed
      });
    } finally {
      saveBtn.disabled = false;
    }
    close();
  }

  saveBtn.addEventListener("click", save);
  skipBtn.addEventListener("click", close);
}

// ─── Input Handlers ──────────────────────────────────────────────────────────

function handleInput() {
  clearStatus();
  const value = elements.input.value.trim();
  if (!value || state.paused) return;
  if (!state.timerId) startTimer();

  const slug = resolveGuess(value);
  if (slug && !state.found.has(slug)) {
    markFound(slug);
    elements.input.value = "";
    updateProgress();
    if (state.found.size === state.total) onGameComplete();
  }
}

function handleKeydown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const value = elements.input.value.trim();
  if (!value || state.paused) return;
  if (!state.timerId) startTimer();
  submitGuess(value);
  elements.input.value = "";
}

// ─── Initialisation ──────────────────────────────────────────────────────────

function init() {
  state.registry = buildRegistry();
  state.nameIndex = buildNameIndex(state.registry);
  state.total = state.registry.size;

  showMapMessage("Loading map...");
  loadMapSvg().then((loaded) => { if (loaded) configureMap(); });

  buildLists();
  updateProgress();
  leaderboard.init();

  elements.input.addEventListener("input", handleInput);
  elements.input.addEventListener("keydown", handleKeydown);
  elements.reset.addEventListener("click", resetGame);
  elements.pause.addEventListener("click", () => setPaused(!state.paused));

  document.querySelector(".zoom-buttons").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-zoom]");
    if (!btn) return;
    const zone = btn.dataset.zoom;
    if (zone === "world") zoomToFullMap();
    else zoomToContinent(zone);
  });
}

init();
