// leaderboard.js — Leaderboard persistence and rendering

const LEADERBOARD_KEY = "mapgame-leaderboard";
const MAX_ENTRIES = 10;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const leaderboard = {
  getScores() {
    try {
      return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || [];
    } catch {
      return [];
    }
  },

  saveScores(scores) {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(scores));
  },

  addScore({ name, countries, total, seconds }) {
    const scores = this.getScores();
    scores.push({
      name,
      countries,
      total,
      seconds,
      date: new Date().toLocaleDateString()
    });

    // Sort: most countries found first, then fastest time
    scores.sort((a, b) => {
      if (b.countries !== a.countries) return b.countries - a.countries;
      return a.seconds - b.seconds;
    });

    this.saveScores(scores.slice(0, MAX_ENTRIES));
    this.render();
  },

  formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");
    return `${mins}:${secs}`;
  },

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
  }
};
