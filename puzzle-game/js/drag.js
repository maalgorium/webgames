(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.canStartDrag = function canStartDrag(piece) {
    if (!piece.locked) {
      return true;
    }
    const group = Puzzle.getGroupForPiece(piece);
    return group && group.pieces.size > 1;
  };

  Puzzle.getDragPieces = function getDragPieces(piece) {
    const group = Puzzle.ensureGroupForPiece(piece);
    if (!group) {
      return [piece];
    }
    return [...group.pieces];
  };

  Puzzle.setDraggingState = function setDraggingState(pieces, isDragging) {
    pieces.forEach((piece) => {
      piece.element.classList.toggle("dragging", isDragging);
    });
  };

  Puzzle.movePiecesToPlayArea = function movePiecesToPlayArea(pieces) {
    pieces.forEach((piece) => Puzzle.movePieceToPlayArea(piece));
  };

  Puzzle.buildDragOffsets = function buildDragOffsets(pieces, anchor) {
    const anchorPos = Puzzle.getPiecePosition(anchor);
    const offsets = new Map();
    pieces.forEach((piece) => {
      const pos = Puzzle.getPiecePosition(piece);
      offsets.set(piece, { dx: pos.x - anchorPos.x, dy: pos.y - anchorPos.y });
    });
    return offsets;
  };

  Puzzle.startPieceDrag = function startPieceDrag(event, piece) {
    if (!Puzzle.canStartDrag(piece)) {
      return;
    }
    event.preventDefault();
    const pieces = Puzzle.getDragPieces(piece);
    const wasInTray = piece.location === "tray";
    if (wasInTray) {
      piece.location = "floating";
    }
    Puzzle.movePiecesToPlayArea(pieces);
    piece.element.setPointerCapture(event.pointerId);
    const rect = piece.element.getBoundingClientRect();
    Puzzle.state.dragging = {
      piece,
      pieces,
      offsets: Puzzle.buildDragOffsets(pieces, piece),
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      pointerId: event.pointerId
    };
    Puzzle.setDraggingState(pieces, true);
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
    const { pieces, offsets, offsetX, offsetY } = Puzzle.state.dragging;
    const x = event.clientX - playRect.left - offsetX;
    const y = event.clientY - playRect.top - offsetY;
    pieces.forEach((piece) => {
      const offset = offsets.get(piece);
      Puzzle.setPiecePosition(piece, x + offset.dx, y + offset.dy);
    });
  };

  Puzzle.findGroupSnapAnchor = function findGroupSnapAnchor(pieces) {
    let anchor = null;
    pieces.forEach((piece) => {
      const distance = Puzzle.getPieceTargetDistance(piece);
      if (distance === null || distance > Puzzle.getSnapThreshold()) {
        return;
      }
      if (!anchor || distance < anchor.distance) {
        anchor = { piece, distance };
      }
    });
    return anchor;
  };

  Puzzle.lockGroupPieces = function lockGroupPieces(pieces) {
    const group = Puzzle.getGroupForPiece(pieces[0]);
    Puzzle.clearGroup(group);
    pieces.forEach((piece) => {
      const snap = Puzzle.getPieceSnapPosition(piece);
      Puzzle.lockPiece(piece, snap.x, snap.y);
    });
    Puzzle.flashPieces(pieces);
  };

  Puzzle.trySnapGroupToBoard = function trySnapGroupToBoard(pieces) {
    const anchor = Puzzle.findGroupSnapAnchor(pieces);
    if (!anchor) {
      return false;
    }
    const snap = Puzzle.getPieceSnapPosition(anchor.piece);
    const pos = Puzzle.getPiecePosition(anchor.piece);
    Puzzle.translatePieces(pieces, snap.x - pos.x, snap.y - pos.y);
    Puzzle.lockGroupPieces(pieces);
    return true;
  };

  Puzzle.getGroupCenter = function getGroupCenter(pieces) {
    const { pieceOuter } = Puzzle.state;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    pieces.forEach((piece) => {
      const pos = Puzzle.getPiecePosition(piece);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + pieceOuter.width);
      maxY = Math.max(maxY, pos.y + pieceOuter.height);
    });
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  };

  Puzzle.keepPiecesOnBoard = function keepPiecesOnBoard(pieces) {
    pieces.forEach((piece) => {
      Puzzle.keepPieceOnBoard(piece);
    });
  };

  Puzzle.sendGroupToTray = function sendGroupToTray(pieces) {
    const group = Puzzle.getGroupForPiece(pieces[0]);
    Puzzle.clearGroup(group);
    pieces.forEach((piece) => {
      Puzzle.unlockPiece(piece);
      Puzzle.placePieceInTray(piece);
    });
  };

  Puzzle.finishSingleDrop = function finishSingleDrop(piece) {
    const snapped = Puzzle.trySnapPiece(piece);
    if (snapped) {
      return;
    }
    const center = Puzzle.getPieceCenter(piece);
    const onBoard = Puzzle.state.boardRect && Puzzle.isPointInsideRect(center, Puzzle.state.boardRect);
    if (onBoard) {
      if (!Puzzle.trySnapGroupToNeighbor([piece])) {
        Puzzle.keepPieceOnBoard(piece);
      }
      return;
    }
    Puzzle.placePieceInTray(piece);
    Puzzle.layoutTrayPieces();
  };

  Puzzle.finishGroupDrop = function finishGroupDrop(pieces) {
    if (Puzzle.trySnapGroupToBoard(pieces)) {
      return;
    }
    const center = Puzzle.getGroupCenter(pieces);
    const onBoard = Puzzle.state.boardRect && Puzzle.isPointInsideRect(center, Puzzle.state.boardRect);
    if (onBoard) {
      if (!Puzzle.trySnapGroupToNeighbor(pieces)) {
        Puzzle.keepPiecesOnBoard(pieces);
      }
      return;
    }
    Puzzle.sendGroupToTray(pieces);
    Puzzle.layoutTrayPieces();
  };

  Puzzle.endPieceDrag = function endPieceDrag(event) {
    if (!Puzzle.state.dragging) {
      return;
    }
    const { piece, pieces, pointerId } = Puzzle.state.dragging;
    piece.element.releasePointerCapture(pointerId);
    Puzzle.setDraggingState(pieces, false);
    pieces.forEach((dragPiece) => Puzzle.syncPiecePosition(dragPiece));
    Puzzle.state.dragging = null;
    if (pieces.length > 1) {
      Puzzle.finishGroupDrop(pieces);
    } else {
      Puzzle.finishSingleDrop(piece);
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
