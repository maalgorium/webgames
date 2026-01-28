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
    Puzzle.selectImage(Puzzle.state.images[0]);
  };

  Puzzle.init();
})();
