(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.setupObservers = function setupObservers() {
    window.addEventListener("resize", Puzzle.scheduleLayout);
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
