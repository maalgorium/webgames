/**
 * Met Museum API Integration
 * Handles searching and fetching artwork data from The Metropolitan Museum of Art
 */

(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.museumAPI = {
  baseUrl: "https://collectionapi.metmuseum.org/public/collection/v1",
  requestTimeout: 10000,

  /**
   * Search for artworks by keyword with pagination
   * @param {string} query - Search term
   * @param {number} offset - Starting index for results
   * @param {number} limit - Maximum number of results
   * @returns {Promise<{results: Array, total: number, hasMore: boolean}>}
   */
  async searchMetMuseum(query, offset = 0, limit = 20) {
    try {
      // Step 1: Search for object IDs matching query
      const searchUrl = `${this.baseUrl}/search?hasImages=true&q=${encodeURIComponent(query)}`;
      const searchResponse = await this.fetchWithTimeout(searchUrl);
      const searchData = await searchResponse.json();

      if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
        return { results: [], total: 0, hasMore: false };
      }

      // Step 2: Paginate object IDs
      const objectIDs = searchData.objectIDs.slice(offset, offset + limit);
      const total = searchData.total || searchData.objectIDs.length;
      const hasMore = offset + limit < searchData.objectIDs.length;

      // Step 3: Fetch details for each object in parallel
      const detailPromises = objectIDs.map(id => this.fetchObjectDetails(id));
      const objects = await Promise.all(detailPromises);

      // Step 4: Filter for objects with images and transform
      const results = objects
        .filter(obj => obj && obj.primaryImage)
        .map(obj => this.transformMetObject(obj));

      return { results, total, hasMore };
    } catch (error) {
      console.error("Museum search failed:", error);
      throw new Error("Unable to search museums. Please check your connection.");
    }
  },

  /**
   * Fetch details for a specific Met Museum object
   * @param {number} objectID - The Met object ID
   * @returns {Promise<Object|null>}
   */
  async fetchObjectDetails(objectID) {
    try {
      const url = `${this.baseUrl}/objects/${objectID}`;
      const response = await this.fetchWithTimeout(url);
      return await response.json();
    } catch (error) {
      console.warn(`Failed to fetch object ${objectID}:`, error);
      return null;
    }
  },

  /**
   * Transform Met Museum API object to app image format
   * @param {Object} metObj - Raw Met Museum object
   * @returns {Object} App image format
   */
  transformMetObject(metObj) {
    return {
      id: `met-${metObj.objectID}`,
      src: metObj.primaryImage,
      label: metObj.title || "Untitled",
      source: "met",
      sourceUrl: `https://www.metmuseum.org/art/collection/search/${metObj.objectID}`,
      attribution: {
        institution: "The Metropolitan Museum of Art",
        license: "CC0",
        artist: metObj.artistDisplayName || "Unknown",
        title: metObj.title || "Untitled",
        date: metObj.objectDate || "",
        medium: metObj.medium || ""
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
