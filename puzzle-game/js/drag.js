(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.startPieceDrag = function startPieceDrag(event, piece) {
    if (piece.locked) {
      return;
    }
    event.preventDefault();
    const wasInTray = piece.location === "tray";
    if (wasInTray) {
      piece.location = "floating";
    }
    Puzzle.movePieceToPlayArea(piece);
    piece.element.setPointerCapture(event.pointerId);
    const rect = piece.element.getBoundingClientRect();
    Puzzle.state.dragging = {
      piece,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId
    };
    piece.element.classList.add("dragging");
    Puzzle.movePieceDrag(event);
    if (wasInTray) {
      Puzzle.layoutTrayPieces();
    }
  };

  Puzzle.movePieceDrag = function movePieceDrag(event) {
    if (!Puzzle.state.dragging) {
      return;
    }
    const playRect = Puzzle.elements.playArea.getBoundingClientRect();
    const x = event.clientX - playRect.left - Puzzle.state.dragging.offsetX;
    const y = event.clientY - playRect.top - Puzzle.state.dragging.offsetY;
    Puzzle.setPiecePosition(Puzzle.state.dragging.piece, x, y);
  };

  Puzzle.endPieceDrag = function endPieceDrag(event) {
    if (!Puzzle.state.dragging) {
      return;
    }
    const { piece, pointerId } = Puzzle.state.dragging;
    piece.element.releasePointerCapture(pointerId);
    piece.element.classList.remove("dragging");
    Puzzle.state.dragging = null;
    const snapped = Puzzle.trySnapPiece(piece);
    if (!snapped) {
      const center = Puzzle.getPieceCenter(piece);
      const onBoard = Puzzle.state.boardRect && Puzzle.isPointInsideRect(center, Puzzle.state.boardRect);
      if (onBoard) {
        Puzzle.keepPieceOnBoard(piece);
      } else {
        Puzzle.placePieceInTray(piece);
        Puzzle.layoutTrayPieces();
      }
    }
    Puzzle.updatePieceCount();
    Puzzle.checkCompletion();
  };

  Puzzle.bindControls = function bindControls() {
    Puzzle.elements.shuffle.addEventListener("click", Puzzle.shufflePieces);
    Puzzle.elements.reset.addEventListener("click", () => {
      Puzzle.resetPieces();
      Puzzle.scheduleLayout();
    });
    Puzzle.elements.playArea.addEventListener("pointermove", Puzzle.movePieceDrag);
    Puzzle.elements.playArea.addEventListener("pointerup", Puzzle.endPieceDrag);
    Puzzle.elements.playArea.addEventListener("pointercancel", Puzzle.endPieceDrag);
  };
})();
