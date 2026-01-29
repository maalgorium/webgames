(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.scheduleLayout = function scheduleLayout() {
    if (Puzzle.state.layoutQueued) {
      return;
    }
    Puzzle.state.layoutQueued = true;
    requestAnimationFrame(Puzzle.refreshLayout);
  };

  Puzzle.refreshLayout = function refreshLayout() {
    Puzzle.state.layoutQueued = false;
    if (!Puzzle.state.imageData) {
      return;
    }
    Puzzle.updateBoardSize();
    Puzzle.updateRects();
    Puzzle.updatePieceMetrics();
    Puzzle.updatePieceStyles();
    Puzzle.positionLockedPieces();
    Puzzle.layoutTrayPieces();
    Puzzle.updatePieceCount();
  };

  Puzzle.updateBoardSize = function updateBoardSize() {
    const zoneRect = Puzzle.elements.boardZone.getBoundingClientRect();
    const ratio = Puzzle.state.imageData?.ratio || 1;
    let width = zoneRect.width - 8;
    let height = width / ratio;
    if (height > zoneRect.height - 8) {
      height = zoneRect.height - 8;
      width = height * ratio;
    }
    Puzzle.elements.board.style.width = `${width}px`;
    Puzzle.elements.board.style.height = `${height}px`;
  };

  Puzzle.updateRects = function updateRects() {
    Puzzle.state.boardRect = Puzzle.getRelativeRect(Puzzle.elements.board, Puzzle.elements.playArea);
    Puzzle.state.trayRect = Puzzle.getRelativeRect(Puzzle.elements.traySurface, Puzzle.elements.playArea);
  };

  Puzzle.updatePieceMetrics = function updatePieceMetrics() {
    const { boardRect, pieceSize, pieceOuter } = Puzzle.state;
    if (!boardRect) {
      return;
    }
    const { GRID } = Puzzle.constants;
    pieceSize.width = boardRect.width / GRID.cols;
    pieceSize.height = boardRect.height / GRID.rows;
    const tab = Math.min(pieceSize.width, pieceSize.height) * 0.24;
    pieceOuter.tab = tab;
    pieceOuter.width = pieceSize.width + tab * 2;
    pieceOuter.height = pieceSize.height + tab * 2;
  };

  Puzzle.layoutTrayPieces = function layoutTrayPieces() {
    if (!Puzzle.state.trayRect || !Puzzle.state.pieceOuter.width) {
      return;
    }
    const unlocked = Puzzle.getTrayPieces();
    if (Puzzle.state.trayCollapsed) {
      Puzzle.layoutTrayFilmstrip(unlocked);
      return;
    }
    Puzzle.layoutTrayGrid(unlocked);
  };

  Puzzle.getTrayPieces = function getTrayPieces() {
    return Puzzle.state.pieces
      .filter((piece) => !piece.locked && piece.location === "tray")
      .sort((a, b) => a.order - b.order);
  };

  Puzzle.layoutTrayGrid = function layoutTrayGrid(unlocked) {
    Puzzle.clearTraySpacer();
    const availableWidth = Puzzle.state.trayRect.width - Puzzle.constants.TRAY_PADDING * 2;
    const cellWidth = Puzzle.state.pieceOuter.width + Puzzle.constants.TRAY_GAP;
    const columns = Math.max(1, Math.floor((availableWidth + Puzzle.constants.TRAY_GAP) / cellWidth));
    const rows = Math.max(1, Math.ceil(unlocked.length / columns));

    unlocked.forEach((piece, index) => {
      if (Puzzle.state.dragging?.piece === piece) {
        return;
      }
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = Puzzle.constants.TRAY_PADDING + col * cellWidth;
      const y = Puzzle.constants.TRAY_PADDING + row * (Puzzle.state.pieceOuter.height + Puzzle.constants.TRAY_GAP);
      piece.home = { x, y };
      Puzzle.placePieceInTray(piece);
    });

    Puzzle.setTraySurfaceHeight(rows);
  };

  Puzzle.layoutTrayFilmstrip = function layoutTrayFilmstrip(unlocked) {
    Puzzle.clearTraySpacer();
    const cellWidth = Puzzle.state.pieceOuter.width + Puzzle.constants.TRAY_GAP;
    const height = Puzzle.state.pieceOuter.height + Puzzle.constants.TRAY_PADDING * 2;
    const width =
      Puzzle.constants.TRAY_PADDING * 2 +
      Math.max(0, unlocked.length) * cellWidth -
      (unlocked.length ? Puzzle.constants.TRAY_GAP : 0);

    unlocked.forEach((piece, index) => {
      if (Puzzle.state.dragging?.piece === piece) {
        return;
      }
      const x = Puzzle.constants.TRAY_PADDING + index * cellWidth;
      const y = Puzzle.constants.TRAY_PADDING;
      piece.home = { x, y };
      Puzzle.placePieceInTray(piece);
    });

    Puzzle.setTraySurfaceHeight(1, height);
    Puzzle.setTraySpacer(width, height);
  };

  Puzzle.setTraySurfaceHeight = function setTraySurfaceHeight(rows, minHeight) {
    const height = Puzzle.getTraySurfaceHeight(rows, minHeight);
    Puzzle.elements.traySurface.style.height = `${height}px`;
  };

  Puzzle.getTraySurfaceHeight = function getTraySurfaceHeight(rows, minHeight = 200) {
    const height =
      rows * (Puzzle.state.pieceOuter.height + Puzzle.constants.TRAY_GAP) -
      Puzzle.constants.TRAY_GAP +
      Puzzle.constants.TRAY_PADDING * 2;
    return Math.max(height, minHeight);
  };

  Puzzle.setTraySpacer = function setTraySpacer(width, height) {
    const { traySpacer } = Puzzle.elements;
    if (!traySpacer) {
      return;
    }
    traySpacer.style.width = `${Math.max(width, 0)}px`;
    traySpacer.style.height = `${Math.max(height, 0)}px`;
  };

  Puzzle.clearTraySpacer = function clearTraySpacer() {
    const { traySpacer } = Puzzle.elements;
    if (!traySpacer) {
      return;
    }
    traySpacer.style.width = "";
    traySpacer.style.height = "";
  };
})();
