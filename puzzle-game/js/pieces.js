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
    Puzzle.resetGroups();
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
      groupId: null,
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

  Puzzle.resetGroups = function resetGroups() {
    Puzzle.state.groups = new Map();
    Puzzle.state.nextGroupId = 1;
  };

  Puzzle.getPiecePosition = function getPiecePosition(piece) {
    if (Number.isFinite(piece.dragX) && Number.isFinite(piece.dragY)) {
      return { x: piece.dragX, y: piece.dragY };
    }
    const rect = Puzzle.getRelativeRect(piece.element, Puzzle.elements.playArea);
    piece.dragX = rect.x;
    piece.dragY = rect.y;
    return { x: rect.x, y: rect.y };
  };

  Puzzle.syncPiecePosition = function syncPiecePosition(piece) {
    const rect = Puzzle.getRelativeRect(piece.element, Puzzle.elements.playArea);
    piece.dragX = rect.x;
    piece.dragY = rect.y;
  };

  Puzzle.getSnapThreshold = function getSnapThreshold() {
    const { pieceSize } = Puzzle.state;
    return Math.min(pieceSize.width, pieceSize.height) * Puzzle.constants.SNAP_THRESHOLD;
  };

  Puzzle.getPieceTargetDistance = function getPieceTargetDistance(piece) {
    const { boardRect, pieceSize, pieceOuter } = Puzzle.state;
    if (!boardRect) {
      return null;
    }
    const pos = Puzzle.getPiecePosition(piece);
    const target = Puzzle.getPieceTarget(piece);
    const pieceCenter = {
      x: pos.x + pieceOuter.width / 2,
      y: pos.y + pieceOuter.height / 2
    };
    const targetCenter = {
      x: target.x + pieceSize.width / 2,
      y: target.y + pieceSize.height / 2
    };
    return Math.hypot(pieceCenter.x - targetCenter.x, pieceCenter.y - targetCenter.y);
  };

  Puzzle.isPieceCloseToTarget = function isPieceCloseToTarget(piece) {
    const distance = Puzzle.getPieceTargetDistance(piece);
    if (distance === null) {
      return false;
    }
    return distance <= Puzzle.getSnapThreshold();
  };

  Puzzle.unlockPiece = function unlockPiece(piece) {
    if (!piece.locked) {
      return;
    }
    piece.locked = false;
    piece.element.classList.remove("locked");
  };

  Puzzle.flashPieceOutline = function flashPieceOutline(piece) {
    const outline = piece.outlinePath;
    if (!outline) {
      return;
    }
    outline.classList.remove("flash-outline");
    outline.getBoundingClientRect();
    outline.classList.add("flash-outline");
    outline.addEventListener(
      "animationend",
      () => {
        outline.classList.remove("flash-outline");
      },
      { once: true }
    );
  };

  Puzzle.flashPieces = function flashPieces(pieces) {
    pieces.forEach((piece) => Puzzle.flashPieceOutline(piece));
  };

  Puzzle.getGroupForPiece = function getGroupForPiece(piece) {
    if (!piece.groupId) {
      return null;
    }
    return Puzzle.state.groups.get(piece.groupId) || null;
  };

  Puzzle.createGroup = function createGroup() {
    const id = Puzzle.state.nextGroupId;
    Puzzle.state.nextGroupId += 1;
    const group = { id, pieces: new Set() };
    Puzzle.state.groups.set(id, group);
    return group;
  };

  Puzzle.mergeGroups = function mergeGroups(targetGroup, sourceGroup) {
    if (!sourceGroup || sourceGroup === targetGroup) {
      return;
    }
    sourceGroup.pieces.forEach((piece) => {
      targetGroup.pieces.add(piece);
      piece.groupId = targetGroup.id;
    });
    Puzzle.state.groups.delete(sourceGroup.id);
  };

  Puzzle.removePieceFromGroup = function removePieceFromGroup(piece) {
    const group = Puzzle.getGroupForPiece(piece);
    if (!group) {
      return;
    }
    group.pieces.delete(piece);
    piece.groupId = null;
    if (group.pieces.size >= 2) {
      return;
    }
    group.pieces.forEach((remaining) => {
      remaining.groupId = null;
    });
    Puzzle.state.groups.delete(group.id);
  };

  Puzzle.addPieceToGroup = function addPieceToGroup(piece, group) {
    if (piece.groupId === group.id) {
      return;
    }
    Puzzle.removePieceFromGroup(piece);
    group.pieces.add(piece);
    piece.groupId = group.id;
  };

  Puzzle.getGroupsForPieces = function getGroupsForPieces(pieces) {
    const groups = new Set();
    pieces.forEach((piece) => {
      const group = Puzzle.getGroupForPiece(piece);
      if (group) {
        groups.add(group);
      }
    });
    return [...groups];
  };

  Puzzle.joinPiecesAsGroup = function joinPiecesAsGroup(pieces) {
    const unique = [...new Set(pieces)];
    if (unique.length < 2) {
      return null;
    }
    const groups = Puzzle.getGroupsForPieces(unique);
    const group = groups[0] || Puzzle.createGroup();
    groups.slice(1).forEach((existing) => Puzzle.mergeGroups(group, existing));
    unique.forEach((piece) => {
      Puzzle.unlockPiece(piece);
      Puzzle.addPieceToGroup(piece, group);
    });
    return group;
  };

  Puzzle.clearGroup = function clearGroup(group) {
    if (!group) {
      return;
    }
    group.pieces.forEach((piece) => {
      piece.groupId = null;
    });
    Puzzle.state.groups.delete(group.id);
  };

  Puzzle.getGroupPieces = function getGroupPieces(piece) {
    const group = Puzzle.getGroupForPiece(piece);
    if (!group) {
      return [piece];
    }
    return [...group.pieces];
  };

  Puzzle.translatePieces = function translatePieces(pieces, dx, dy) {
    pieces.forEach((piece) => {
      const pos = Puzzle.getPiecePosition(piece);
      Puzzle.setPiecePosition(piece, pos.x + dx, pos.y + dy);
      piece.location = "board";
    });
  };

  Puzzle.findPieceAt = function findPieceAt(row, col) {
    return Puzzle.state.pieces.find((piece) => piece.row === row && piece.col === col);
  };

  Puzzle.arePiecesAligned = function arePiecesAligned(basePiece, neighborPiece) {
    const expected = Puzzle.getNeighborSnapPosition(basePiece, neighborPiece);
    const neighborPos = Puzzle.getPiecePosition(neighborPiece);
    const distance = Math.hypot(expected.x - neighborPos.x, expected.y - neighborPos.y);
    return distance <= Puzzle.getSnapThreshold();
  };

  Puzzle.getNeighborPositions = function getNeighborPositions(piece) {
    return [
      { row: piece.row - 1, col: piece.col },
      { row: piece.row + 1, col: piece.col },
      { row: piece.row, col: piece.col - 1 },
      { row: piece.row, col: piece.col + 1 }
    ];
  };

  Puzzle.findAlignedCluster = function findAlignedCluster(startPiece) {
    const cluster = new Set([startPiece]);
    const queue = [startPiece];
    while (queue.length) {
      const current = queue.shift();
      Puzzle.getNeighborPositions(current).forEach((position) => {
        const neighbor = Puzzle.findPieceAt(position.row, position.col);
        if (!neighbor || neighbor.locked || neighbor.location === "tray") {
          return;
        }
        if (cluster.has(neighbor)) {
          return;
        }
        if (!Puzzle.arePiecesAligned(current, neighbor)) {
          return;
        }
        cluster.add(neighbor);
        queue.push(neighbor);
      });
    }
    return [...cluster];
  };

  Puzzle.findNeighborSnapForGroup = function findNeighborSnapForGroup(pieces) {
    const pieceSet = new Set(pieces);
    let best = null;
    const threshold = Puzzle.getSnapThreshold();
    pieces.forEach((piece) => {
      Puzzle.getNeighborPositions(piece).forEach((position) => {
        const neighbor = Puzzle.findPieceAt(position.row, position.col);
        if (!neighbor || neighbor.locked || neighbor.location === "tray" || pieceSet.has(neighbor)) {
          return;
        }
        const expected = Puzzle.getNeighborSnapPosition(neighbor, piece);
        const pos = Puzzle.getPiecePosition(piece);
        const dx = expected.x - pos.x;
        const dy = expected.y - pos.y;
        const distance = Math.hypot(dx, dy);
        if (distance > threshold) {
          return;
        }
        if (!best || distance < best.distance) {
          best = { piece, neighbor, dx, dy, distance };
        }
      });
    });
    return best;
  };

  Puzzle.trySnapGroupToNeighbor = function trySnapGroupToNeighbor(pieces) {
    const match = Puzzle.findNeighborSnapForGroup(pieces);
    if (!match) {
      return false;
    }
    Puzzle.translatePieces(pieces, match.dx, match.dy);
    const neighborGroupPieces = Puzzle.getGroupPieces(match.neighbor);
    Puzzle.joinPiecesAsGroup([match.neighbor, ...pieces]);
    const flashSet = new Set([...pieces, ...neighborGroupPieces]);
    Puzzle.flashPieces([...flashSet]);
    return true;
  };

  Puzzle.ensureGroupForPiece = function ensureGroupForPiece(piece) {
    const existing = Puzzle.getGroupForPiece(piece);
    if (existing) {
      return existing;
    }
    if (piece.locked) {
      return null;
    }
    const cluster = Puzzle.findAlignedCluster(piece);
    if (cluster.length < 2) {
      return null;
    }
    return Puzzle.joinPiecesAsGroup(cluster);
  };

  Puzzle.getNeighborSnapPosition = function getNeighborSnapPosition(basePiece, neighborPiece) {
    const { pieceSize } = Puzzle.state;
    const basePos = Puzzle.getPiecePosition(basePiece);
    const colDiff = neighborPiece.col - basePiece.col;
    const rowDiff = neighborPiece.row - basePiece.row;
    return {
      x: basePos.x + colDiff * pieceSize.width,
      y: basePos.y + rowDiff * pieceSize.height
    };
  };

  Puzzle.snapNeighborsToLockedPiece = function snapNeighborsToLockedPiece(lockedPiece) {
    Puzzle.getNeighborPositions(lockedPiece).forEach((position) => {
      const neighbor = Puzzle.findPieceAt(position.row, position.col);
      if (!neighbor || neighbor.locked || neighbor.location === "tray") {
        return;
      }
      const expected = Puzzle.getNeighborSnapPosition(lockedPiece, neighbor);
      const neighborPos = Puzzle.getPiecePosition(neighbor);
      const dx = expected.x - neighborPos.x;
      const dy = expected.y - neighborPos.y;
      const neighborGroupPieces = Puzzle.getGroupPieces(neighbor);
      Puzzle.translatePieces(neighborGroupPieces, dx, dy);
      Puzzle.joinPiecesAsGroup([lockedPiece, neighbor]);
      Puzzle.flashPieces(neighborGroupPieces);
    });
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
    const pos = Puzzle.getPiecePosition(piece);
    return {
      x: pos.x + pieceOuter.width / 2,
      y: pos.y + pieceOuter.height / 2
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
    if (!Puzzle.isPieceCloseToTarget(piece)) {
      return false;
    }
    const snap = Puzzle.getPieceSnapPosition(piece);
    Puzzle.lockPiece(piece, snap.x, snap.y);
    Puzzle.flashPieceOutline(piece);
    Puzzle.snapNeighborsToLockedPiece(piece);
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
    Puzzle.clearSelectedImage();
    Puzzle.updateGalleryStatus();
  };
})();
