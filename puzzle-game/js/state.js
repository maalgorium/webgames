(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  const IMAGES = [
    { id: "picture", src: "assets/picture.jpg", label: "Example" }
  ];

  Puzzle.constants = {
    IMAGES,
    TRAY_PADDING: 16,
    TRAY_GAP: 12,
    SNAP_THRESHOLD: 0.35,
    STORAGE_KEY: "puzzle.completed",
    STORAGE_SELECTED: "puzzle.selected",
    STORAGE_IMAGES: "puzzle.images",
    STORAGE_PIECE_COUNT: "puzzle.pieceCount"
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
    groups: new Map(),
    nextGroupId: 1,
    layoutQueued: false,
    boardObserver: null,
    lastBoardSize: null,
    preview: { x: 24, y: 24, width: 260, ratio: 1 },
    previewAction: null,
    previewHidden: false,
    galleryItems: new Map(),
    trayCollapsed: false,
    museumSearch: {
      query: "",
      results: [],
      total: 0,
      hasMore: false,
      offset: 0
    },
    activeGalleryTab: "local",
    pieceCount: 150,
    grid: { cols: 15, rows: 10 }
  };

  Puzzle.elements = {
    gallery: document.getElementById("gallery"),
    pieceCount: document.getElementById("piece-count"),
    pieceCountSelect: document.getElementById("piece-count-select"),
    shuffle: document.getElementById("shuffle"),
    reset: document.getElementById("reset"),
    menuToggle: document.getElementById("menu-toggle"),
    overflowToggle: document.getElementById("overflow-toggle"),
    overflowMenu: document.getElementById("overflow-menu"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    galleryDrawer: document.getElementById("gallery-drawer"),
    galleryClose: document.getElementById("gallery-close"),
    playArea: document.getElementById("play-area"),
    boardZone: document.getElementById("board-zone"),
    board: document.getElementById("board"),
    tray: document.getElementById("tray"),
    trayToggle: document.getElementById("tray-toggle"),
    traySurface: document.getElementById("tray-surface"),
    traySpacer: document.getElementById("tray-spacer"),
    preview: document.getElementById("preview"),
    previewImage: document.getElementById("preview-image"),
    previewResize: document.getElementById("preview-resize"),
    previewToggle: document.getElementById("preview-toggle"),
    previewShow: document.getElementById("preview-show")
  };
})();
