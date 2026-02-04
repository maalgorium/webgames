/**
 * Pixabay Interface UI
 * Handles the Pixabay search tab interface, results, and preview modal
 */

(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  /**
   * Build the Pixabay search interface
   * @param {HTMLElement} container - Container element for Pixabay content
   */
  Puzzle.buildPixabayInterface = function buildPixabayInterface(container) {
    const searchForm = document.createElement("form");
    searchForm.className = "museum-search";
    searchForm.innerHTML = `
      <input
        type="text"
        class="museum-search-input"
        placeholder="Search Pixabay images..."
        aria-label="Search Pixabay images"
      >
      <button type="submit" class="museum-search-button icon-button">🔍</button>
    `;
    searchForm.addEventListener("submit", Puzzle.handlePixabaySearch);

    const results = document.createElement("div");
    results.className = "museum-results";
    results.id = "pixabay-results";

    container.appendChild(searchForm);
    container.appendChild(results);
  };

  /**
   * Handle Pixabay search form submission
   * @param {Event} event - Form submit event
   */
  Puzzle.handlePixabaySearch = async function handlePixabaySearch(event) {
    event.preventDefault();

    const input = event.target.querySelector(".museum-search-input");
    const query = input.value.trim();

    if (!query) return;

    const resultsContainer = document.getElementById("pixabay-results");

    Puzzle.showPixabayLoading(resultsContainer);

    try {
      const { results, total, hasMore } = await Puzzle.pixabayAPI.searchPixabay(query, 1, 20);

      Puzzle.state.pixabaySearch = {
        query,
        results,
        total,
        hasMore,
        page: 1
      };

      Puzzle.renderPixabayResults(results, resultsContainer);

      if (hasMore) {
        Puzzle.addPixabayLoadMoreButton(resultsContainer);
      }
    } catch (error) {
      Puzzle.showPixabayError(resultsContainer, error.message || "Unable to search Pixabay. Please check your connection and try again.");
    }
  };

  /**
   * Render Pixabay search results
   * @param {Array} results - Array of image objects
   * @param {HTMLElement} container - Container to render into
   */
  Puzzle.renderPixabayResults = function renderPixabayResults(results, container) {
    if (results.length === 0) {
      container.innerHTML = `
        <div class="museum-empty">
          <div class="museum-empty-icon">📷</div>
          <div class="museum-empty-title">No images found</div>
          <div class="museum-empty-hint">Try keywords like "nature", "city", or "sunset"</div>
        </div>
      `;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "gallery-grid drawer-grid";

    results.forEach(image => {
      const card = Puzzle.createPixabayCard(image);
      grid.appendChild(card);
    });

    container.innerHTML = "";
    container.appendChild(grid);
  };

  /**
   * Create a Pixabay result card
   * @param {Object} image - Image data
   * @returns {HTMLElement} Card element
   */
  Puzzle.createPixabayCard = function createPixabayCard(image) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "museum-result gallery-item";

    const thumb = document.createElement("div");
    thumb.className = "gallery-thumb";
    thumb.style.backgroundImage = `url(${image.src})`;

    const info = document.createElement("div");
    info.className = "gallery-label";

    const title = document.createElement("div");
    title.className = "museum-result-title";
    title.textContent = image.label;

    const artist = document.createElement("div");
    artist.className = "museum-result-artist";
    artist.textContent = image.attribution.artist;

    info.appendChild(title);
    info.appendChild(artist);
    card.appendChild(thumb);
    card.appendChild(info);

    card.addEventListener("click", () => Puzzle.showPixabayPreview(image));

    return card;
  };

  /**
   * Show loading state in results container
   * @param {HTMLElement} container - Results container
   */
  Puzzle.showPixabayLoading = function showPixabayLoading(container) {
    container.innerHTML = `
      <div class="museum-loading">
        <div class="museum-spinner"></div>
        <div>Searching Pixabay...</div>
      </div>
    `;
  };

  /**
   * Show error state in results container
   * @param {HTMLElement} container - Results container
   * @param {string} message - Error message to display
   */
  Puzzle.showPixabayError = function showPixabayError(container, message) {
    container.innerHTML = `
      <div class="museum-error">
        <div class="museum-error-title">Search failed</div>
        <div>${message}</div>
      </div>
    `;
  };

  /**
   * Show preview modal for Pixabay image
   * @param {Object} image - Image data to preview
   */
  Puzzle.showPixabayPreview = function showPixabayPreview(image) {
    const overlay = document.createElement("div");
    overlay.className = "museum-preview-overlay";
    overlay.id = "pixabay-preview";

    overlay.innerHTML = `
      <div class="museum-preview-modal">
        <img src="${image.src}" alt="${image.label}" class="museum-preview-image">
        <div class="museum-preview-info">
          <h2 class="museum-preview-title">${image.label}</h2>
          <div class="museum-preview-meta">
            <div class="museum-preview-meta-item">
              <span class="museum-preview-meta-label">Contributor:</span>
              ${image.attribution.artist}
            </div>
          </div>
          <div class="museum-preview-license">
            📜 ${image.attribution.institution} — ${image.attribution.license}
          </div>
          <div class="museum-preview-actions">
            <button class="secondary" id="pixabay-preview-cancel">Cancel</button>
            <button id="pixabay-preview-add">Add to My Puzzles</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        Puzzle.closePixabayPreview();
      }
    });

    document.getElementById("pixabay-preview-cancel").addEventListener("click", Puzzle.closePixabayPreview);
    document.getElementById("pixabay-preview-add").addEventListener("click", () => {
      Puzzle.addPixabayImageToCollection(image);
    });

    const escHandler = (e) => {
      if (e.key === "Escape") {
        Puzzle.closePixabayPreview();
        document.removeEventListener("keydown", escHandler);
      }
    };
    document.addEventListener("keydown", escHandler);
  };

  /**
   * Close the preview modal
   */
  Puzzle.closePixabayPreview = function closePixabayPreview() {
    const overlay = document.getElementById("pixabay-preview");
    if (overlay) {
      overlay.remove();
    }
  };

  /**
   * Add Pixabay image to user's collection
   * @param {Object} image - Image to add
   */
  Puzzle.addPixabayImageToCollection = function addPixabayImageToCollection(image) {
    const exists = Puzzle.state.images.some(img => img.id === image.id);
    if (exists) {
      alert("This image is already in your collection.");
      Puzzle.closePixabayPreview();
      Puzzle.switchTab("local");
      return;
    }

    Puzzle.state.images.push(image);
    Puzzle.saveImages();
    Puzzle.buildGallery();
    Puzzle.switchTab("local");
    Puzzle.closePixabayPreview();
  };

  /**
   * Add "Load More" button to results
   * @param {HTMLElement} container - Results container
   */
  Puzzle.addPixabayLoadMoreButton = function addPixabayLoadMoreButton(container) {
    const loadMore = document.createElement("button");
    loadMore.className = "museum-load-more";
    loadMore.textContent = "Load More";
    loadMore.addEventListener("click", Puzzle.loadMorePixabayResults);

    container.appendChild(loadMore);
  };

  /**
   * Load more Pixabay results (pagination)
   */
  Puzzle.loadMorePixabayResults = async function loadMorePixabayResults() {
    const { query, page, results } = Puzzle.state.pixabaySearch;
    const container = document.getElementById("pixabay-results");

    const loadMoreBtn = container.querySelector(".museum-load-more");
    if (loadMoreBtn) {
      loadMoreBtn.textContent = "Loading...";
      loadMoreBtn.disabled = true;
    }

    try {
      const nextPage = page + 1;
      const { results: newResults, hasMore } = await Puzzle.pixabayAPI.searchPixabay(query, nextPage, 20);

      const updatedResults = [...results, ...newResults];
      Puzzle.state.pixabaySearch.results = updatedResults;
      Puzzle.state.pixabaySearch.page = nextPage;
      Puzzle.state.pixabaySearch.hasMore = hasMore;

      Puzzle.renderPixabayResults(updatedResults, container);

      if (hasMore) {
        Puzzle.addPixabayLoadMoreButton(container);
      }
    } catch (error) {
      if (loadMoreBtn) {
        loadMoreBtn.textContent = "Load More";
        loadMoreBtn.disabled = false;
      }
      console.error("Failed to load more Pixabay results:", error);
    }
  };
})();
