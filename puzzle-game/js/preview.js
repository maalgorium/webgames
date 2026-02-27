(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  // Track all active pointers on the preview element
  const activePointers = new Map();

  Puzzle.initPreview = function initPreview() {
    const el = Puzzle.elements.preview;
    el.addEventListener("pointerdown", Puzzle.onPreviewDown);
    el.addEventListener("pointermove", Puzzle.onPreviewMove);
    el.addEventListener("pointerup", Puzzle.onPreviewUp);
    el.addEventListener("pointercancel", Puzzle.onPreviewUp);
    el.addEventListener("wheel", Puzzle.onPreviewWheel, { passive: false });
    Puzzle.applyPreviewRect();
  };

  Puzzle.applyPreviewRect = function applyPreviewRect() {
    const maxWidth = Math.min(window.innerWidth - 32, 420);
    Puzzle.state.preview.width = Puzzle.clamp(Puzzle.state.preview.width, 120, maxWidth);
    Puzzle.elements.preview.style.width = `${Puzzle.state.preview.width}px`;
    Puzzle.elements.preview.style.left = `${Puzzle.state.preview.x}px`;
    Puzzle.elements.preview.style.top = `${Puzzle.state.preview.y}px`;
  };

  function getPinchDist() {
    const pts = [...activePointers.values()];
    if (pts.length < 2) return null;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  Puzzle.onPreviewDown = function onPreviewDown(event) {
    if (event.target === Puzzle.elements.previewToggle) {
      return;
    }
    event.preventDefault();
    Puzzle.elements.preview.setPointerCapture(event.pointerId);
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (activePointers.size >= 2) {
      // Switch to pinch mode
      Puzzle.state.previewAction = {
        mode: "pinch",
        startDist: getPinchDist(),
        startWidth: Puzzle.state.preview.width
      };
      return;
    }

    // Single pointer — drag or resize
    if (event.target === Puzzle.elements.previewResize) {
      Puzzle.state.previewAction = {
        mode: "resize",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: Puzzle.state.preview.width
      };
    } else {
      Puzzle.state.previewAction = {
        mode: "drag",
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: Puzzle.state.preview.x,
        startTop: Puzzle.state.preview.y
      };
    }
  };

  Puzzle.onPreviewMove = function onPreviewMove(event) {
    if (!activePointers.has(event.pointerId)) {
      return;
    }
    activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (!Puzzle.state.previewAction) {
      return;
    }

    if (Puzzle.state.previewAction.mode === "pinch") {
      const dist = getPinchDist();
      if (dist === null) {
        return;
      }
      const scale = dist / Puzzle.state.previewAction.startDist;
      Puzzle.state.preview.width = Puzzle.state.previewAction.startWidth * scale;
      Puzzle.applyPreviewRect();
      return;
    }

    if (event.pointerId !== Puzzle.state.previewAction.pointerId) {
      return;
    }

    if (Puzzle.state.previewAction.mode === "drag") {
      const dx = event.clientX - Puzzle.state.previewAction.startX;
      const dy = event.clientY - Puzzle.state.previewAction.startY;
      const rect = Puzzle.elements.preview.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width - 8;
      const maxY = window.innerHeight - rect.height - 8;
      Puzzle.state.preview.x = Puzzle.clamp(Puzzle.state.previewAction.startLeft + dx, 8, maxX);
      Puzzle.state.preview.y = Puzzle.clamp(Puzzle.state.previewAction.startTop + dy, 8, maxY);
      Puzzle.applyPreviewRect();
    } else if (Puzzle.state.previewAction.mode === "resize") {
      const dx = event.clientX - Puzzle.state.previewAction.startX;
      const dy = event.clientY - Puzzle.state.previewAction.startY;
      const delta = Math.max(dx, dy * (Puzzle.state.preview.ratio || 1));
      Puzzle.state.preview.width = Puzzle.state.previewAction.startWidth + delta;
      Puzzle.applyPreviewRect();
    }
  };

  Puzzle.onPreviewUp = function onPreviewUp(event) {
    if (!activePointers.has(event.pointerId)) {
      return;
    }
    try {
      Puzzle.elements.preview.releasePointerCapture(event.pointerId);
    } catch (_) {}
    activePointers.delete(event.pointerId);

    if (activePointers.size === 0) {
      Puzzle.state.previewAction = null;
      return;
    }

    // One finger lifted during pinch — switch back to drag with remaining pointer
    if (Puzzle.state.previewAction?.mode === "pinch") {
      const [[remainingId, remainingPtr]] = [...activePointers.entries()];
      Puzzle.state.previewAction = {
        mode: "drag",
        pointerId: remainingId,
        startX: remainingPtr.x,
        startY: remainingPtr.y,
        startLeft: Puzzle.state.preview.x,
        startTop: Puzzle.state.preview.y
      };
    }
  };

  Puzzle.onPreviewWheel = function onPreviewWheel(event) {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 20 : -20;
    Puzzle.state.preview.width += delta;
    Puzzle.applyPreviewRect();
  };
})();
