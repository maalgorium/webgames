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

  Puzzle.saveCompleted = function saveCompleted() {
    localStorage.setItem(Puzzle.constants.STORAGE_KEY, JSON.stringify([...Puzzle.state.completed]));
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
    Puzzle.elements.gallery.innerHTML = "";
    Puzzle.state.galleryItems.clear();
    Puzzle.state.images.forEach((image) => {
      const item = Puzzle.createGalleryItem(image);
      Puzzle.elements.gallery.appendChild(item);
      Puzzle.state.galleryItems.set(image.id, item);
    });
    Puzzle.updateGalleryStatus();
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

    item.addEventListener("click", () => Puzzle.selectImage(image));

    return item;
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
})();
