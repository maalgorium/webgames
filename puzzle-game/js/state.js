(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  const IMAGES = [
    { id: "picture", src: "assets/picture.jpg", label: "Example" }
  ];

  Puzzle.constants = {
    IMAGES,
    GRID: { cols: 15, rows: 10 },
    TRAY_PADDING: 16,
    TRAY_GAP: 12,
    SNAP_THRESHOLD: 0.35,
    STORAGE_KEY: "puzzle.completed"
  };

  Puzzle.state = {
    images: IMAGES,
    currentImage: null,
    imageData: null,
    pieces: [],
    edgeMaps: null,
    boardRect: null,
    trayRect: null,
    pieceSize: { width: 0, height: 0 },
    pieceOuter: { width: 0, height: 0, tab: 0 },
    dragging: null,
    completed: new Set(),
    layoutQueued: false,
    preview: { x: 24, y: 24, width: 260, ratio: 1 },
    previewAction: null,
    galleryItems: new Map()
  };

  Puzzle.elements = {
    gallery: document.getElementById("gallery"),
    pieceCount: document.getElementById("piece-count"),
    shuffle: document.getElementById("shuffle"),
    reset: document.getElementById("reset"),
    playArea: document.getElementById("play-area"),
    boardZone: document.getElementById("board-zone"),
    board: document.getElementById("board"),
    tray: document.getElementById("tray"),
    traySurface: document.getElementById("tray-surface"),
    preview: document.getElementById("preview"),
    previewImage: document.getElementById("preview-image"),
    previewResize: document.getElementById("preview-resize")
  };
})();
