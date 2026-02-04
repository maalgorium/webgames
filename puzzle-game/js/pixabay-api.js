/**
 * Pixabay API Integration
 * Handles searching and fetching image data from Pixabay
 */

(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  const API_KEY = "54505079-67e126a025d9e83f65dc56ed3";

  Puzzle.pixabayAPI = {
    baseUrl: "https://pixabay.com/api/",
    requestTimeout: 10000,

    /**
     * Search Pixabay images by keyword with pagination
     * @param {string} query - Search term
     * @param {number} page - Page number
     * @param {number} perPage - Results per page
     * @returns {Promise<{results: Array, total: number, hasMore: boolean}>}
     */
    async searchPixabay(query, page = 1, perPage = 20) {
      try {
        const params = new URLSearchParams({
          key: API_KEY,
          q: query,
          image_type: "photo",
          safesearch: "true",
          per_page: perPage.toString(),
          page: page.toString()
        });
        const searchUrl = `${this.baseUrl}?${params.toString()}`;
        const searchResponse = await this.fetchWithTimeout(searchUrl);
        const searchData = await searchResponse.json();

        const hits = Array.isArray(searchData.hits) ? searchData.hits : [];
        const results = hits.map(hit => this.transformPixabayHit(hit));
        const total = searchData.totalHits || results.length;
        const hasMore = page * perPage < total;

        return { results, total, hasMore };
      } catch (error) {
        console.error("Pixabay search failed:", error);
        throw new Error("Unable to search Pixabay. Please check your connection.");
      }
    },

    /**
     * Transform Pixabay hit to app image format
     * @param {Object} hit - Raw Pixabay hit
     * @returns {Object} App image format
     */
    transformPixabayHit(hit) {
      const label = hit.tags ? hit.tags.split(",").slice(0, 2).join(", ") : "Pixabay Image";
      return {
        id: `pixabay-${hit.id}`,
        src: hit.largeImageURL || hit.webformatURL,
        label: label || "Pixabay Image",
        source: "pixabay",
        sourceUrl: hit.pageURL,
        attribution: {
          institution: "Pixabay",
          license: "Pixabay License",
          artist: hit.user || "Pixabay Contributor",
          title: label || "Pixabay Image",
          date: "",
          medium: hit.type || "photo"
        }
      };
    },

    /**
     * Fetch with timeout to prevent hanging requests
     * @param {string} url - URL to fetch
     * @returns {Promise<Response>}
     */
    async fetchWithTimeout(url) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    }
  };
})();
