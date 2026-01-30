(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.setupObservers = function setupObservers() {
    // Observe board element directly - only fires when board actually resizes
    Puzzle.state.boardObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (!entry.contentBoxSize || entry.contentBoxSize.length === 0) {
          continue;
        }

        const { inlineSize, blockSize } = entry.contentBoxSize[0];

        // Debounce tiny changes (browser rounding)
        const prev = Puzzle.state.lastBoardSize || { width: 0, height: 0 };
        const THRESHOLD = 2;

        if (Math.abs(inlineSize - prev.width) < THRESHOLD &&
            Math.abs(blockSize - prev.height) < THRESHOLD) {
          continue;
        }

        Puzzle.state.lastBoardSize = { width: inlineSize, height: blockSize };
        Puzzle.scheduleLayout();
      }
    });

    Puzzle.state.boardObserver.observe(Puzzle.elements.board);
  };

  Puzzle.init = function init() {
    Puzzle.loadCompleted();
    Puzzle.buildGallery();
    Puzzle.bindControls();
    Puzzle.initPreview();
    Puzzle.setupObservers();
    Puzzle.loadSelectedImage();
  };

  Puzzle.init();
})();
