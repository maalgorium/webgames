(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.clearPieces = function clearPieces() {
    const { pieces } = Puzzle.state;
    pieces.forEach((piece) => {
      piece.element.remove();
    });
    Puzzle.state.pieces = [];
  };

  Puzzle.resetPieces = function resetPieces() {
    const { GRID } = Puzzle.constants;
    Puzzle.clearPieces();
    Puzzle.state.edgeMaps = Puzzle.buildEdgeMaps(GRID.rows, GRID.cols);
    Puzzle.state.pieces = Puzzle.buildPieces(GRID.rows, GRID.cols);
    Puzzle.shufflePieces();
    Puzzle.updatePieceCount();
  };

  Puzzle.buildPieces = function buildPieces(rows, cols) {
    const pieces = [];
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const piece = Puzzle.createPiece(row, col);
        pieces.push(piece);
      }
    }
    return pieces;
  };

  Puzzle.createPiece = function createPiece(row, col) {
    const piece = {
      id: `${row}-${col}`,
      row,
      col,
      locked: false,
      location: "tray",
      order: 0,
      element: null,
      svg: null,
      imageEl: null,
      clipPathPath: null,
      outlinePath: null,
      clipId: null,
      edges: Puzzle.getPieceEdges(row, col),
      home: { x: 0, y: 0 }
    };
    piece.element = Puzzle.createPieceElement(piece);
    Puzzle.elements.traySurface.appendChild(piece.element);
    return piece;
  };

  Puzzle.createPieceElement = function createPieceElement(piece) {
    const el = document.createElement("div");
    el.className = "piece";
    el.dataset.row = piece.row;
    el.dataset.col = piece.col;
    const svg = Puzzle.buildPieceSvg(piece);
    el.appendChild(svg);
    el.addEventListener("pointerdown", (event) => Puzzle.startPieceDrag(event, piece));
    return el;
  };

  Puzzle.buildPieceSvg = function buildPieceSvg(piece) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
    const clipId = `clip-${piece.id}-${Math.random().toString(36).slice(2, 7)}`;
    clipPath.setAttribute("id", clipId);
    clipPath.setAttribute("clipPathUnits", "userSpaceOnUse");

    const clipPathShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
    clipPath.appendChild(clipPathShape);
    defs.appendChild(clipPath);

    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttribute("clip-path", `url(#${clipId})`);
    image.setAttribute("preserveAspectRatio", "none");

    const outline = document.createElementNS("http://www.w3.org/2000/svg", "path");
    outline.setAttribute("class", "piece-outline");

    svg.setAttribute("aria-hidden", "true");
    svg.appendChild(defs);
    svg.appendChild(image);
    svg.appendChild(outline);

    piece.svg = svg;
    piece.imageEl = image;
    piece.clipPathPath = clipPathShape;
    piece.outlinePath = outline;
    piece.clipId = clipId;
    return svg;
  };

  Puzzle.updatePieceSvg = function updatePieceSvg(piece) {
    const { currentImage, boardRect, pieceSize, pieceOuter } = Puzzle.state;
    if (!currentImage || !boardRect) {
      return;
    }
    const { width: cellW, height: cellH } = pieceSize;
    const { width: outerW, height: outerH, tab } = pieceOuter;
    const path = Puzzle.buildPiecePath(piece.edges, cellW, cellH, tab);
    piece.svg.setAttribute("viewBox", `0 0 ${outerW} ${outerH}`);
    piece.svg.setAttribute("width", outerW);
    piece.svg.setAttribute("height", outerH);
    piece.imageEl.setAttribute("href", currentImage.src);
    piece.imageEl.setAttributeNS("http://www.w3.org/1999/xlink", "href", currentImage.src);
    piece.imageEl.setAttribute("width", boardRect.width);
    piece.imageEl.setAttribute("height", boardRect.height);
    piece.imageEl.setAttribute("x", tab - piece.col * cellW);
    piece.imageEl.setAttribute("y", tab - piece.row * cellH);
    piece.clipPathPath.setAttribute("d", path);
    piece.outlinePath.setAttribute("d", path);
  };

  Puzzle.updatePieceStyles = function updatePieceStyles() {
    const { currentImage, pieces, pieceOuter } = Puzzle.state;
    if (!currentImage) {
      return;
    }
    const { width, height } = pieceOuter;
    pieces.forEach((piece) => {
      const el = piece.element;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      Puzzle.updatePieceSvg(piece);
    });
  };

  Puzzle.shufflePieces = function shufflePieces() {
    const order = [...Puzzle.state.pieces];
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((piece, index) => {
      piece.order = index;
    });
    Puzzle.layoutTrayPieces();
  };

  Puzzle.positionLockedPieces = function positionLockedPieces() {
    Puzzle.state.pieces.forEach((piece) => {
      if (!piece.locked) {
        return;
      }
      Puzzle.placePieceOnBoard(piece);
    });
  };

  Puzzle.placePieceInTray = function placePieceInTray(piece) {
    if (piece.element.parentElement !== Puzzle.elements.traySurface) {
      Puzzle.elements.traySurface.appendChild(piece.element);
    }
    piece.location = "tray";
    piece.element.classList.remove("locked");
    piece.element.style.left = `${piece.home.x}px`;
    piece.element.style.top = `${piece.home.y}px`;
  };

  Puzzle.movePieceToPlayArea = function movePieceToPlayArea(piece) {
    if (piece.element.parentElement === Puzzle.elements.playArea) {
      return;
    }
    const pieceRect = piece.element.getBoundingClientRect();
    const playRect = Puzzle.elements.playArea.getBoundingClientRect();
    const x = pieceRect.left - playRect.left;
    const y = pieceRect.top - playRect.top;
    Puzzle.elements.playArea.appendChild(piece.element);
    piece.element.style.left = `${x}px`;
    piece.element.style.top = `${y}px`;
  };

  Puzzle.setPiecePosition = function setPiecePosition(piece, x, y) {
    piece.element.style.left = `${x}px`;
    piece.element.style.top = `${y}px`;
    piece.dragX = x;
    piece.dragY = y;
  };

  Puzzle.getPieceCenter = function getPieceCenter(piece) {
    const { pieceOuter } = Puzzle.state;
    return {
      x: piece.dragX + pieceOuter.width / 2,
      y: piece.dragY + pieceOuter.height / 2
    };
  };

  Puzzle.keepPieceOnBoard = function keepPieceOnBoard(piece) {
    piece.location = "board";
    piece.element.classList.remove("locked");
    if (piece.element.parentElement !== Puzzle.elements.playArea) {
      Puzzle.elements.playArea.appendChild(piece.element);
    }
  };

  Puzzle.getPieceTarget = function getPieceTarget(piece) {
    const { boardRect, pieceSize } = Puzzle.state;
    return {
      x: boardRect.x + piece.col * pieceSize.width,
      y: boardRect.y + piece.row * pieceSize.height
    };
  };

  Puzzle.getPieceSnapPosition = function getPieceSnapPosition(piece) {
    const target = Puzzle.getPieceTarget(piece);
    const { tab } = Puzzle.state.pieceOuter;
    return {
      x: target.x - tab,
      y: target.y - tab
    };
  };

  Puzzle.trySnapPiece = function trySnapPiece(piece) {
    const { boardRect, pieceSize, pieceOuter } = Puzzle.state;
    if (!boardRect) {
      return false;
    }
    const target = Puzzle.getPieceTarget(piece);
    const pieceCenter = {
      x: piece.dragX + pieceOuter.width / 2,
      y: piece.dragY + pieceOuter.height / 2
    };
    const targetCenter = {
      x: target.x + pieceSize.width / 2,
      y: target.y + pieceSize.height / 2
    };
    const dx = pieceCenter.x - targetCenter.x;
    const dy = pieceCenter.y - targetCenter.y;
    const distance = Math.hypot(dx, dy);
    const threshold = Math.min(pieceSize.width, pieceSize.height) * Puzzle.constants.SNAP_THRESHOLD;
    if (distance > threshold) {
      return false;
    }
    const snap = Puzzle.getPieceSnapPosition(piece);
    Puzzle.lockPiece(piece, snap.x, snap.y);
    return true;
  };

  Puzzle.lockPiece = function lockPiece(piece, x, y) {
    piece.locked = true;
    piece.location = "board";
    Puzzle.elements.playArea.appendChild(piece.element);
    piece.element.classList.add("locked");
    Puzzle.setPiecePosition(piece, x, y);
  };

  Puzzle.placePieceOnBoard = function placePieceOnBoard(piece) {
    const snap = Puzzle.getPieceSnapPosition(piece);
    Puzzle.lockPiece(piece, snap.x, snap.y);
  };

  Puzzle.updatePieceCount = function updatePieceCount() {
    const locked = Puzzle.state.pieces.filter((piece) => piece.locked).length;
    Puzzle.elements.pieceCount.textContent = `${locked} / ${Puzzle.state.pieces.length}`;
  };

  Puzzle.checkCompletion = function checkCompletion() {
    const allLocked = Puzzle.state.pieces.every((piece) => piece.locked);
    if (!allLocked || !Puzzle.state.currentImage) {
      return;
    }
    Puzzle.state.completed.add(Puzzle.state.currentImage.id);
    Puzzle.saveCompleted();
    Puzzle.updateGalleryStatus();
  };
})();
