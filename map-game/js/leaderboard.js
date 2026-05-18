// leaderboard.js — Leaderboard persistence, sync, and rendering

const LEADERBOARD_KEY = "mapgame-leaderboard";
const MAX_ENTRIES = 10;
const SYNC_DB_NAME = "mapgame-leaderboard-sync";
const SYNC_DB_VERSION = 1;
const SYNC_STORE_NAME = "handles";
const SYNC_HANDLE_KEY = "leaderboard-file";
const LEADERBOARD_FILE_VERSION = 1;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createScoreId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createScoreEntry({ name, countries, total, seconds }) {
  return {
    id: createScoreId(),
    name: name || "Anonymous",
    countries,
    total,
    seconds,
    date: new Date().toLocaleDateString(),
    savedAt: new Date().toISOString()
  };
}

function normalizeScoreEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const countries = Number(entry.countries);
  const total = Number(entry.total);
  const seconds = Number(entry.seconds);
  if (!Number.isFinite(countries) || !Number.isFinite(total) || !Number.isFinite(seconds)) return null;
  return {
    id: typeof entry.id === "string" && entry.id.trim() ? entry.id : null,
    name: String(entry.name || "Anonymous").trim() || "Anonymous",
    countries,
    total,
    seconds,
    date: String(entry.date || ""),
    savedAt: String(entry.savedAt || "")
  };
}

function compareScoreEntries(a, b) {
  if (b.countries !== a.countries) return b.countries - a.countries;
  if (a.seconds !== b.seconds) return a.seconds - b.seconds;
  return a.name.localeCompare(b.name);
}

function getScoreKey(entry) {
  if (entry.id) return `id:${entry.id}`;
  return `legacy:${entry.name}|${entry.countries}|${entry.total}|${entry.seconds}|${entry.date}`;
}

function rankScores(scores) {
  return [...scores].sort(compareScoreEntries).slice(0, MAX_ENTRIES);
}

function mergeScoreLists(...scoreLists) {
  const scoresByKey = new Map();
  scoreLists.flat().forEach((entry) => {
    const normalized = normalizeScoreEntry(entry);
    if (!normalized) return;
    const key = getScoreKey(normalized);
    const current = scoresByKey.get(key);
    if (!current || compareScoreEntries(normalized, current) < 0) {
      scoresByKey.set(key, normalized);
    }
  });
  return rankScores([...scoresByKey.values()]);
}

function parseLeaderboardText(text) {
  if (!text || !text.trim()) return [];
  const payload = JSON.parse(text);
  const scores = Array.isArray(payload) ? payload : payload.scores;
  if (!Array.isArray(scores)) throw new Error("Leaderboard file does not contain a scores list.");
  return mergeScoreLists(scores);
}

function serializeLeaderboard(scores) {
  return JSON.stringify({
    version: LEADERBOARD_FILE_VERSION,
    updatedAt: new Date().toISOString(),
    scores: mergeScoreLists(scores)
  }, null, 2);
}

function supportsWritableFiles() {
  return typeof window !== "undefined"
    && window.isSecureContext !== false
    && typeof window.showOpenFilePicker === "function"
    && typeof window.showSaveFilePicker === "function";
}

function getSyncUi() {
  return {
    status: document.getElementById("leaderboard-sync-status"),
    connect: document.getElementById("leaderboard-connect"),
    create: document.getElementById("leaderboard-create"),
    refresh: document.getElementById("leaderboard-refresh"),
    disconnect: document.getElementById("leaderboard-disconnect")
  };
}

function setSyncStatus(message, variant = "") {
  const { status } = getSyncUi();
  if (!status) return;
  status.textContent = message;
  status.className = variant ? `leaderboard-sync-status ${variant}` : "leaderboard-sync-status";
}

function setSyncButtonState(hasHandle) {
  const ui = getSyncUi();
  const supported = supportsWritableFiles();
  [ui.connect, ui.create].forEach((button) => {
    if (button) button.disabled = !supported;
  });
  [ui.refresh, ui.disconnect].forEach((button) => {
    if (button) button.disabled = !supported || !hasHandle;
  });
}

function openSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_DB_NAME, SYNC_DB_VERSION);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(SYNC_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function canStoreFileHandle() {
  return typeof indexedDB !== "undefined" && indexedDB;
}

async function readStoredFileHandle() {
  if (!canStoreFileHandle()) return null;
  const db = await openSyncDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(SYNC_STORE_NAME, "readonly")
      .objectStore(SYNC_STORE_NAME)
      .get(SYNC_HANDLE_KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function storeFileHandle(handle) {
  if (!canStoreFileHandle()) return;
  const db = await openSyncDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(SYNC_STORE_NAME, "readwrite")
      .objectStore(SYNC_STORE_NAME)
      .put(handle, SYNC_HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function forgetStoredFileHandle() {
  if (!canStoreFileHandle()) return;
  const db = await openSyncDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(SYNC_STORE_NAME, "readwrite")
      .objectStore(SYNC_STORE_NAME)
      .delete(SYNC_HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function hasFilePermission(handle, mode, requestAccess) {
  const options = { mode };
  if (typeof handle.queryPermission !== "function") return true;
  if (await handle.queryPermission(options) === "granted") return true;
  if (!requestAccess || typeof handle.requestPermission !== "function") return false;
  return await handle.requestPermission(options) === "granted";
}

async function readScoresFromFile(handle, requestAccess = false) {
  if (!await hasFilePermission(handle, "read", requestAccess)) {
    throw new Error("Permission is needed to read the leaderboard file.");
  }
  const file = await handle.getFile();
  return parseLeaderboardText(await file.text());
}

async function writeScoresToFile(handle, scores) {
  if (!await hasFilePermission(handle, "readwrite", true)) {
    throw new Error("Permission is needed to write the leaderboard file.");
  }
  const writable = await handle.createWritable();
  await writable.write(serializeLeaderboard(scores));
  await writable.close();
}

function getFileTypeOptions() {
  return {
    types: [{
      description: "Leaderboard JSON",
      accept: { "application/json": [".json"] }
    }],
    excludeAcceptAllOption: false
  };
}

function getOpenPickerOptions() {
  return {
    ...getFileTypeOptions(),
    multiple: false
  };
}

/**
 * Coordinates local leaderboard storage, optional synced file storage, and leaderboard rendering.
 */
const leaderboard = {
  syncHandle: null,
  syncControlsBound: false,

  /**
   * Starts the leaderboard UI and restores any remembered sync file handle.
   */
  init() {
    this.bindSyncControls();
    this.render();
    setSyncButtonState(false);
    if (!supportsWritableFiles()) {
      setSyncStatus("Local leaderboard only. File sync needs Chrome or Edge with file access enabled.", "warn");
      return;
    }
    setSyncStatus("Local leaderboard. Connect or create a JSON file in iCloud Drive to sync scores.");
    this.restoreSyncFile();
  },

  /**
   * Returns the locally cached leaderboard scores.
   */
  getScores() {
    try {
      return parseLeaderboardText(localStorage.getItem(LEADERBOARD_KEY));
    } catch {
      return [];
    }
  },

  /**
   * Saves leaderboard scores to the local browser cache.
   */
  saveScores(scores) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(mergeScoreLists(scores)));
  },

  /**
   * Adds a completed game score and writes it to the synced file when connected.
   */
  async addScore(score) {
    const entry = createScoreEntry(score);
    const syncedScores = await this.readCurrentSyncedScores();
    const scores = mergeScoreLists(syncedScores, this.getScores(), [entry]);
    this.saveScores(scores);
    this.render();
    await this.persistSyncedScores(scores);
  },

  /**
   * Formats a score duration as MM:SS.
   */
  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  },

  /**
   * Renders the leaderboard table from local scores.
   */
  render() {
    const scores = this.getScores();
    const tbody = document.getElementById("leaderboard-body");
    const emptyEl = document.getElementById("leaderboard-empty");
    const tableEl = document.getElementById("leaderboard-table");
    if (!tbody || !emptyEl || !tableEl) return;

    if (scores.length === 0) {
      tableEl.style.display = "none";
      emptyEl.style.display = "block";
      return;
    }

    tableEl.style.display = "table";
    emptyEl.style.display = "none";
    tbody.innerHTML = "";

    scores.forEach((entry, i) => {
      const tr = document.createElement("tr");
      if (entry.countries === entry.total) tr.classList.add("gold-row");
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td>${escapeHtml(entry.name)}</td>
        <td>${entry.countries} / ${entry.total}</td>
        <td>${this.formatTime(entry.seconds)}</td>
        <td>${escapeHtml(entry.date)}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  /**
   * Connects leaderboard sync buttons to their file actions.
   */
  bindSyncControls() {
    if (this.syncControlsBound) return;
    const ui = getSyncUi();
    if (ui.connect) ui.connect.addEventListener("click", () => this.connectSyncFile());
    if (ui.create) ui.create.addEventListener("click", () => this.createSyncFile());
    if (ui.refresh) ui.refresh.addEventListener("click", () => this.refreshSyncFile());
    if (ui.disconnect) ui.disconnect.addEventListener("click", () => this.disconnectSyncFile());
    this.syncControlsBound = true;
  },

  /**
   * Restores a previously selected leaderboard file when permission remains available.
   */
  async restoreSyncFile() {
    try {
      this.syncHandle = await readStoredFileHandle();
      setSyncButtonState(Boolean(this.syncHandle));
      if (!this.syncHandle) return;
      if (!await hasFilePermission(this.syncHandle, "read", false)) {
        setSyncStatus("Leaderboard file remembered. Click Refresh to allow access again.", "warn");
        return;
      }
      await this.mergeSyncedScores(false);
      setSyncStatus(`Connected to ${this.syncHandle.name}.`);
    } catch (error) {
      console.warn(error);
      setSyncStatus("Could not restore the synced leaderboard file.", "warn");
    }
  },

  /**
   * Lets the player choose an existing JSON file for synced leaderboard storage.
   */
  async connectSyncFile() {
    if (!supportsWritableFiles()) return;
    try {
      const [handle] = await window.showOpenFilePicker(getOpenPickerOptions());
      this.syncHandle = handle;
      await storeFileHandle(handle);
      setSyncButtonState(true);
      await this.mergeSyncedScores(true);
      setSyncStatus(`Connected to ${handle.name}.`);
    } catch (error) {
      this.handleSyncError(error, "Could not connect the leaderboard file.");
    }
  },

  /**
   * Lets the player create a new JSON file for synced leaderboard storage.
   */
  async createSyncFile() {
    if (!supportsWritableFiles()) return;
    try {
      const handle = await window.showSaveFilePicker({
        ...getFileTypeOptions(),
        suggestedName: "map-game-leaderboard.json"
      });
      this.syncHandle = handle;
      await storeFileHandle(handle);
      setSyncButtonState(true);
      await this.persistSyncedScores(this.getScores());
      setSyncStatus(`Created ${handle.name}.`);
    } catch (error) {
      this.handleSyncError(error, "Could not create the leaderboard file.");
    }
  },

  /**
   * Pulls scores from the synced file and merges them with local scores.
   */
  async refreshSyncFile() {
    if (!this.syncHandle) return;
    try {
      await this.mergeSyncedScores(true);
      setSyncStatus(`Refreshed ${this.syncHandle.name}.`);
    } catch (error) {
      this.handleSyncError(error, "Could not refresh the leaderboard file.");
    }
  },

  /**
   * Forgets the synced file handle without deleting local scores or the file.
   */
  async disconnectSyncFile() {
    this.syncHandle = null;
    try {
      await forgetStoredFileHandle();
    } catch (error) {
      console.warn(error);
    }
    setSyncButtonState(false);
    setSyncStatus("Disconnected. Scores remain saved locally.");
  },

  /**
   * Merges synced-file scores into the local leaderboard cache.
   */
  async mergeSyncedScores(requestAccess) {
    const syncedScores = await readScoresFromFile(this.syncHandle, requestAccess);
    const scores = mergeScoreLists(syncedScores, this.getScores());
    this.saveScores(scores);
    this.render();
    if (requestAccess) await this.persistSyncedScores(scores);
  },

  /**
   * Reads the connected sync file before saving a new score.
   */
  async readCurrentSyncedScores() {
    if (!this.syncHandle) return [];
    try {
      return await readScoresFromFile(this.syncHandle, true);
    } catch (error) {
      console.warn(error);
      setSyncStatus("Saved locally. Could not read the synced file before saving.", "warn");
      return [];
    }
  },

  /**
   * Writes scores to the connected sync file when one is available.
   */
  async persistSyncedScores(scores) {
    if (!this.syncHandle) return;
    try {
      await writeScoresToFile(this.syncHandle, scores);
      setSyncStatus(`Saved to ${this.syncHandle.name}.`);
    } catch (error) {
      console.warn(error);
      setSyncStatus("Saved locally. Could not write the synced file.", "warn");
    }
  },

  /**
   * Reports file-picker and file-access errors in the leaderboard panel.
   */
  handleSyncError(error, message) {
    if (error && error.name === "AbortError") {
      setSyncStatus("Sync file selection cancelled.");
      return;
    }
    console.warn(error);
    setSyncStatus(message, "warn");
  }
};
