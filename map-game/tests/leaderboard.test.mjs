import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const leaderboardPath = path.resolve("map-game/js/leaderboard.js");
const leaderboardSource = fs.readFileSync(leaderboardPath, "utf8");

function createLocalStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

function loadLeaderboardApi() {
  const context = {
    console,
    document: { getElementById: () => null },
    indexedDB: null,
    localStorage: createLocalStorage(),
    window: {},
    crypto: { randomUUID: () => "fixed-id" },
    Date
  };
  vm.createContext(context);
  vm.runInContext(`${leaderboardSource}
globalThis.__api = {
  leaderboard,
  mergeScoreLists,
  parseLeaderboardText,
  rankScores,
  serializeLeaderboard
};`, context);
  return context.__api;
}

function score(overrides) {
  return {
    id: overrides.id,
    name: overrides.name || "Player",
    countries: overrides.countries,
    total: 197,
    seconds: overrides.seconds,
    date: overrides.date || "5/18/2026"
  };
}

const { leaderboard, mergeScoreLists, parseLeaderboardText, serializeLeaderboard } = loadLeaderboardApi();

const ranked = mergeScoreLists(
  [score({ id: "slow", countries: 100, seconds: 500 })],
  [score({ id: "fast", countries: 100, seconds: 300 })],
  [score({ id: "more", countries: 120, seconds: 700 })]
);
assert.deepEqual([...ranked.map((entry) => entry.id)], ["more", "fast", "slow"]);

const duplicateScores = mergeScoreLists(
  [score({ id: "same", countries: 20, seconds: 90 })],
  [score({ id: "same", countries: 30, seconds: 80 })]
);
assert.equal(duplicateScores.length, 1);
assert.equal(duplicateScores[0].countries, 30);

const parsedObject = parseLeaderboardText(JSON.stringify({ version: 1, scores: ranked }));
assert.equal(parsedObject.length, 3);
assert.equal(parsedObject[0].id, "more");

const parsedArray = parseLeaderboardText(JSON.stringify(ranked));
assert.equal(parsedArray.length, 3);

const serialized = JSON.parse(serializeLeaderboard(ranked));
assert.equal(serialized.version, 1);
assert.equal(serialized.scores.length, 3);

let writtenText = "";
leaderboard.syncHandle = {
  name: "leaderboard.json",
  async getFile() {
    return {
      async text() {
        return serializeLeaderboard([score({ id: "remote", countries: 5, seconds: 40 })]);
      }
    };
  },
  async queryPermission() {
    return "granted";
  },
  async createWritable() {
    return {
      async write(text) {
        writtenText = text;
      },
      async close() {}
    };
  }
};

await leaderboard.addScore({
  name: "Local",
  countries: 9,
  total: 197,
  seconds: 60
});

const savedScores = leaderboard.getScores();
assert.deepEqual([...savedScores.map((entry) => entry.id)], ["fixed-id", "remote"]);
assert.deepEqual(JSON.parse(writtenText).scores.map((entry) => entry.id), ["fixed-id", "remote"]);
