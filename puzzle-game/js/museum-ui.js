/**
 * Museum Interface UI
 * Handles the Browse Museums tab interface, search, results, and preview modal
 */

(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  /**
   * Build the museum search and browse interface
   * @param {HTMLElement} container - Container element for museum content
   */
  Puzzle.buildMuseumInterface = function buildMuseumInterface(container) {
  // Search bar
  const searchForm = document.createElement("form");
  searchForm.className = "museum-search";
  searchForm.innerHTML = `
    <input
      type="text"
      class="museum-search-input"
      placeholder="Search artworks..."
      aria-label="Search artworks"
    >
    <button type="submit" class="museum-search-button icon-button">🔍</button>
  `;
  searchForm.addEventListener("submit", Puzzle.handleMuseumSearch);

  // Results container
  const results = document.createElement("div");
  results.className = "museum-results";
  results.id = "museum-results";

  container.appendChild(searchForm);
  container.appendChild(results);
};

/**
 * Handle museum search form submission
 * @param {Event} event - Form submit event
 */
  Puzzle.handleMuseumSearch = async function handleMuseumSearch(event) {
  event.preventDefault();

  const input = event.target.querySelector(".museum-search-input");
  const query = input.value.trim();

  if (!query) return;

  const resultsContainer = document.getElementById("museum-results");

  // Show loading state
  Puzzle.showMuseumLoading(resultsContainer);

  try {
    const { results, total, hasMore } = await Puzzle.museumAPI.searchMetMuseum(query, 0, 20);

    Puzzle.state.museumSearch = {
      query,
      results,
      total,
      hasMore,
      offset: 20
    };

    Puzzle.renderMuseumResults(results, resultsContainer);

    if (hasMore) {
      Puzzle.addLoadMoreButton(resultsContainer);
    }
  } catch (error) {
    Puzzle.showMuseumError(resultsContainer, error.message || "Unable to search museums. Please check your connection and try again.");
  }
};

/**
 * Render museum search results
 * @param {Array} results - Array of artwork objects
 * @param {HTMLElement} container - Container to render into
 */
  Puzzle.renderMuseumResults = function renderMuseumResults(results, container) {
  if (results.length === 0) {
    container.innerHTML = `
      <div class="museum-empty">
        <div class="museum-empty-icon">🖼️</div>
        <div class="museum-empty-title">No artworks found</div>
        <div class="museum-empty-hint">Try different keywords like "landscape", "portrait", or "ocean"</div>
      </div>
    `;
    return;
  }

  const grid = document.createElement("div");
  grid.className = "gallery-grid drawer-grid";

  results.forEach(artwork => {
    const card = Puzzle.createMuseumCard(artwork);
    grid.appendChild(card);
  });

  container.innerHTML = "";
  container.appendChild(grid);
};

/**
 * Create a museum result card
 * @param {Object} artwork - Artwork data
 * @returns {HTMLElement} Card element
 */
  Puzzle.createMuseumCard = function createMuseumCard(artwork) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "museum-result gallery-item";

  const thumb = document.createElement("div");
  thumb.className = "gallery-thumb";
  thumb.style.backgroundImage = `url(${artwork.src})`;

  const info = document.createElement("div");
  info.className = "gallery-label";

  const title = document.createElement("div");
  title.className = "museum-result-title";
  title.textContent = artwork.label;

  const artist = document.createElement("div");
  artist.className = "museum-result-artist";
  artist.textContent = artwork.attribution.artist;

  info.appendChild(title);
  info.appendChild(artist);
  card.appendChild(thumb);
  card.appendChild(info);

  card.addEventListener("click", () => Puzzle.showMuseumPreview(artwork));

  return card;
};

/**
 * Show loading state in results container
 * @param {HTMLElement} container - Results container
 */
  Puzzle.showMuseumLoading = function showMuseumLoading(container) {
  container.innerHTML = `
    <div class="museum-loading">
      <div class="museum-spinner"></div>
      <div>Searching museums...</div>
    </div>
  `;
};

/**
 * Show error state in results container
 * @param {HTMLElement} container - Results container
 * @param {string} message - Error message to display
 */
  Puzzle.showMuseumError = function showMuseumError(container, message) {
  container.innerHTML = `
    <div class="museum-error">
      <div class="museum-error-title">Search failed</div>
      <div>${message}</div>
    </div>
  `;
};

/**
 * Show preview modal for artwork
 * @param {Object} artwork - Artwork data to preview
 */
  Puzzle.showMuseumPreview = function showMuseumPreview(artwork) {
  const overlay = document.createElement("div");
  overlay.className = "museum-preview-overlay";
  overlay.id = "museum-preview";

  overlay.innerHTML = `
    <div class="museum-preview-modal">
      <img src="${artwork.src}" alt="${artwork.label}" class="museum-preview-image">
      <div class="museum-preview-info">
        <h2 class="museum-preview-title">${artwork.label}</h2>
        <div class="museum-preview-meta">
          <div class="museum-preview-meta-item">
            <span class="museum-preview-meta-label">Artist:</span>
            ${artwork.attribution.artist}
          </div>
          ${artwork.attribution.date ? `
            <div class="museum-preview-meta-item">
              <span class="museum-preview-meta-label">Date:</span>
              ${artwork.attribution.date}
            </div>
          ` : ''}
          ${artwork.attribution.medium ? `
            <div class="museum-preview-meta-item">
              <span class="museum-preview-meta-label">Medium:</span>
              ${artwork.attribution.medium}
            </div>
          ` : ''}
        </div>
        <div class="museum-preview-license">
          📜 ${artwork.attribution.institution} — ${artwork.attribution.license} Public Domain
        </div>
        <div class="museum-preview-actions">
          <button class="secondary" id="preview-cancel">Cancel</button>
          <button id="preview-add">Add to My Puzzles</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event listeners
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      Puzzle.closeMuseumPreview();
    }
  });

  document.getElementById("preview-cancel").addEventListener("click", Puzzle.closeMuseumPreview);
  document.getElementById("preview-add").addEventListener("click", () => {
    Puzzle.addMuseumImageToCollection(artwork);
  });

  // Escape key to close
  const escHandler = (e) => {
    if (e.key === "Escape") {
      Puzzle.closeMuseumPreview();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);
};

/**
 * Close the preview modal
 */
  Puzzle.closeMuseumPreview = function closeMuseumPreview() {
  const overlay = document.getElementById("museum-preview");
  if (overlay) {
    overlay.remove();
  }
};

/**
 * Add museum artwork to user's collection
 * @param {Object} artwork - Artwork to add
 */
  Puzzle.addMuseumImageToCollection = function addMuseumImageToCollection(artwork) {
  // Check if already in collection
  const exists = Puzzle.state.images.some(img => img.id === artwork.id);
  if (exists) {
    alert("This artwork is already in your collection.");
    Puzzle.closeMuseumPreview();
    Puzzle.switchTab("local");
    return;
  }

  // Add to state
  Puzzle.state.images.push(artwork);

  // Save to localStorage
  Puzzle.saveImages();

  // Rebuild gallery to show new image
  Puzzle.buildGallery();

  // Switch to "My Images" tab
  Puzzle.switchTab("local");

  // Close preview
  Puzzle.closeMuseumPreview();
};

/**
 * Add "Load More" button to results
 * @param {HTMLElement} container - Results container
 */
  Puzzle.addLoadMoreButton = function addLoadMoreButton(container) {
  const loadMore = document.createElement("button");
  loadMore.className = "museum-load-more";
  loadMore.textContent = "Load More";
  loadMore.addEventListener("click", Puzzle.loadMoreResults);

  container.appendChild(loadMore);
};

  /**
   * Load more results (pagination)
   */
  Puzzle.loadMoreResults = async function loadMoreResults() {
    const { query, offset, results } = Puzzle.state.museumSearch;
    const container = document.getElementById("museum-results");

    // Show loading
    const loadMoreBtn = container.querySelector(".museum-load-more");
    if (loadMoreBtn) {
      loadMoreBtn.textContent = "Loading...";
      loadMoreBtn.disabled = true;
    }

    try {
      const { results: newResults, hasMore } = await Puzzle.museumAPI.searchMetMuseum(query, offset, 20);

      // Append to existing results
      const updatedResults = [...results, ...newResults];
      Puzzle.state.museumSearch.results = updatedResults;
      Puzzle.state.museumSearch.offset = offset + 20;
      Puzzle.state.museumSearch.hasMore = hasMore;

      // Re-render with all results
      Puzzle.renderMuseumResults(updatedResults, container);

      if (hasMore) {
        Puzzle.addLoadMoreButton(container);
      }
    } catch (error) {
      if (loadMoreBtn) {
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.disabled = false;
      }
      console.error("Failed to load more results:", error);
    }
  };
})();
