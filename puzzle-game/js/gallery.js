(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.loadCompleted = function loadCompleted() {
    const stored = localStorage.getItem(Puzzle.constants.STORAGE_KEY);
    if (!stored) {
      Puzzle.state.completed = new Set();
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      Puzzle.state.completed = new Set(parsed);
    } catch (error) {
      Puzzle.state.completed = new Set();
    }
  };

  Puzzle.loadPieceCount = function loadPieceCount() {
    const stored = localStorage.getItem(Puzzle.constants.STORAGE_PIECE_COUNT);
    if (stored) {
      const count = parseInt(stored, 10);
      if (!isNaN(count) && count > 0) {
        Puzzle.state.pieceCount = count;
        if (Puzzle.elements.pieceCountSelect) {
          Puzzle.elements.pieceCountSelect.value = count;
        }
      }
    }
  };

  Puzzle.savePieceCount = function savePieceCount() {
    localStorage.setItem(Puzzle.constants.STORAGE_PIECE_COUNT, Puzzle.state.pieceCount);
  };

  Puzzle.saveCompleted = function saveCompleted() {
    localStorage.setItem(Puzzle.constants.STORAGE_KEY, JSON.stringify([...Puzzle.state.completed]));
  };

  Puzzle.saveImages = function saveImages() {
    const imagesToSave = Puzzle.state.images.map(img => ({
      id: img.id,
      src: img.src,
      label: img.label,
      source: img.source,
      sourceUrl: img.sourceUrl,
      attribution: img.attribution
    }));

    try {
      localStorage.setItem(Puzzle.constants.STORAGE_IMAGES, JSON.stringify(imagesToSave));
    } catch (error) {
      console.error("Failed to save images:", error);
      // Check if quota exceeded
      if (error.name === "QuotaExceededError") {
        alert("Storage limit reached. Try removing some museum images.");
      }
    }
  };

  Puzzle.loadImages = function loadImages() {
    try {
      const stored = localStorage.getItem(Puzzle.constants.STORAGE_IMAGES);
      if (stored) {
        const images = JSON.parse(stored);
        Puzzle.state.images = images;
        return;
      }
    } catch (error) {
      console.error("Failed to load images:", error);
    }

    // Fall back to default images from constants
    Puzzle.state.images = [...Puzzle.constants.IMAGES];
  };

  Puzzle.saveSelectedImage = function saveSelectedImage(image) {
    if (!image) {
      return;
    }
    if (Puzzle.state.completed.has(image.id)) {
      Puzzle.clearSelectedImage();
      return;
    }
    localStorage.setItem(Puzzle.constants.STORAGE_SELECTED, image.id);
  };

  Puzzle.clearSelectedImage = function clearSelectedImage() {
    localStorage.removeItem(Puzzle.constants.STORAGE_SELECTED);
  };

  Puzzle.loadSelectedImage = function loadSelectedImage() {
    const stored = localStorage.getItem(Puzzle.constants.STORAGE_SELECTED);
    if (!stored) {
      Puzzle.updatePreviewImage();
      return;
    }
    const image = Puzzle.state.images.find((item) => item.id === stored);
    if (!image || Puzzle.state.completed.has(image.id)) {
      Puzzle.clearSelectedImage();
      Puzzle.updatePreviewImage();
      return;
    }
    Puzzle.selectImage(image);
  };

  Puzzle.buildGallery = function buildGallery() {
    const container = Puzzle.elements.gallery;
    container.innerHTML = "";

    // Create tab bar
    const tabBar = document.createElement("div");
    tabBar.className = "gallery-tabs";

    const localTab = Puzzle.createTabButton("local", "My Images", true);
    const museumTab = Puzzle.createTabButton("museum", "Browse Museums", false);
    const pixabayTab = Puzzle.createTabButton("pixabay", "Pixabay", false);

    tabBar.appendChild(localTab);
    tabBar.appendChild(museumTab);
    tabBar.appendChild(pixabayTab);
    container.appendChild(tabBar);

    // Create tab content containers
    const localContent = document.createElement("div");
    localContent.className = "gallery-tab-content active";
    localContent.dataset.tab = "local";

    const museumContent = document.createElement("div");
    museumContent.className = "gallery-tab-content";
    museumContent.dataset.tab = "museum";

    const pixabayContent = document.createElement("div");
    pixabayContent.className = "gallery-tab-content";
    pixabayContent.dataset.tab = "pixabay";

    // Build local gallery (existing code)
    Puzzle.buildLocalGallery(localContent);

    // Build museum interface
    Puzzle.buildMuseumInterface(museumContent);
    Puzzle.buildPixabayInterface(pixabayContent);

    container.appendChild(localContent);
    container.appendChild(museumContent);
    container.appendChild(pixabayContent);

    Puzzle.updateGalleryStatus();
  };

  Puzzle.createTabButton = function createTabButton(tabName, label, isActive) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `gallery-tab-button ${isActive ? "active" : ""}`;
    button.dataset.tab = tabName;
    button.textContent = label;
    button.addEventListener("click", () => Puzzle.switchTab(tabName));
    return button;
  };

  Puzzle.buildLocalGallery = function buildLocalGallery(container) {
    const grid = document.createElement("div");
    grid.className = "gallery-grid drawer-grid";

    Puzzle.state.galleryItems.clear();
    Puzzle.state.images.forEach((image) => {
      const item = Puzzle.createGalleryItem(image);
      grid.appendChild(item);
      Puzzle.state.galleryItems.set(image.id, item);
    });

    container.appendChild(grid);
  };

  Puzzle.switchTab = function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll(".gallery-tab-button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll(".gallery-tab-content").forEach(content => {
      content.classList.toggle("active", content.dataset.tab === tabName);
    });

    Puzzle.state.activeGalleryTab = tabName;
  };

  Puzzle.createGalleryItem = function createGalleryItem(image) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "gallery-item";
    item.dataset.id = image.id;

    const thumb = document.createElement("div");
    thumb.className = "gallery-thumb";
    thumb.style.backgroundImage = `url(${image.src})`;

    const label = document.createElement("div");
    label.className = "gallery-label";
    label.textContent = image.label;

    const badge = document.createElement("span");
    badge.className = "gallery-badge";
    badge.textContent = "Done";

    label.appendChild(badge);
    item.appendChild(thumb);
    item.appendChild(label);

    // Add delete button for museum images
    if (image.source === "met" || image.source === "pixabay") {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "gallery-delete";
      deleteBtn.innerHTML = "✕";
      deleteBtn.title = "Remove from collection";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        Puzzle.deleteMuseumImage(image.id);
      });
      item.appendChild(deleteBtn);
    }

    item.addEventListener("click", () => Puzzle.selectImage(image));

    return item;
  };

  Puzzle.deleteMuseumImage = function deleteMuseumImage(imageId) {
    // Don't delete if currently selected
    if (Puzzle.state.currentImage?.id === imageId) {
      alert("Cannot delete the currently active puzzle. Please select a different image first.");
      return;
    }

    // Confirm deletion
    if (!confirm("Remove this image from your collection?")) {
      return;
    }

    // Remove from state
    Puzzle.state.images = Puzzle.state.images.filter(img => img.id !== imageId);

    // Save to localStorage
    Puzzle.saveImages();

    // Rebuild gallery
    Puzzle.buildGallery();
  };

  Puzzle.updateGalleryStatus = function updateGalleryStatus() {
    Puzzle.state.images.forEach((image) => {
      const item = Puzzle.state.galleryItems.get(image.id);
      if (!item) {
        return;
      }
      item.classList.toggle("active", Puzzle.state.currentImage?.id === image.id);
      item.classList.toggle("completed", Puzzle.state.completed.has(image.id));
    });
  };

  Puzzle.loadImageData = function loadImageData(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          image: img,
          width: img.naturalWidth,
          height: img.naturalHeight,
          ratio: img.naturalWidth / img.naturalHeight
        });
      };
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = src;
    });
  };

  Puzzle.updateGrid = function updateGrid() {
    const aspectRatio = Puzzle.state.imageData?.ratio || 1.5;
    Puzzle.state.grid = Puzzle.calculateGrid(Puzzle.state.pieceCount, aspectRatio);
  };

  Puzzle.selectImage = function selectImage(image) {
    if (!image) {
      return;
    }
    Puzzle.state.currentImage = image;
    Puzzle.saveSelectedImage(image);
    Puzzle.updateGalleryStatus();
    Puzzle.loadImageData(image.src)
      .then((data) => {
        Puzzle.state.imageData = data;
        Puzzle.state.preview.ratio = data.ratio || 1;
        Puzzle.updatePreviewImage();
        Puzzle.updateBoardRatio();
        Puzzle.updateGrid();
        Puzzle.resetPieces();
        Puzzle.scheduleLayout();
      })
      .catch(() => {
        Puzzle.state.imageData = null;
      });
  };

  Puzzle.updatePreviewImage = function updatePreviewImage() {
    const hasImage = Boolean(Puzzle.state.currentImage);
    Puzzle.elements.preview.classList.toggle("is-hidden", !hasImage);
    Puzzle.elements.previewImage.src = hasImage ? Puzzle.state.currentImage.src : "";
    Puzzle.elements.previewImage.alt = hasImage
      ? `${Puzzle.state.currentImage.label} preview`
      : "Puzzle preview";
    Puzzle.applyPreviewRect();
  };

  Puzzle.handlePieceCountChange = function handlePieceCountChange() {
    const newCount = parseInt(Puzzle.elements.pieceCountSelect.value, 10);
    if (isNaN(newCount) || newCount <= 0) {
      return;
    }
    Puzzle.state.pieceCount = newCount;
    Puzzle.savePieceCount();

    if (Puzzle.state.currentImage && Puzzle.state.imageData) {
      Puzzle.updateGrid();
      Puzzle.resetPieces();
      Puzzle.scheduleLayout();
    }
  };

  Puzzle.bindPieceCountControl = function bindPieceCountControl() {
    if (!Puzzle.elements.pieceCountSelect) {
      return;
    }
    Puzzle.elements.pieceCountSelect.addEventListener("change", Puzzle.handlePieceCountChange);
  };
})();
