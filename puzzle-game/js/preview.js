(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.initPreview = function initPreview() {
    Puzzle.elements.preview.addEventListener("pointerdown", Puzzle.startPreviewPointer);
    Puzzle.elements.preview.addEventListener("pointermove", Puzzle.movePreviewPointer);
    Puzzle.elements.preview.addEventListener("pointerup", Puzzle.endPreviewPointer);
    Puzzle.elements.preview.addEventListener("pointercancel", Puzzle.endPreviewPointer);
    Puzzle.applyPreviewRect();
  };

  Puzzle.applyPreviewRect = function applyPreviewRect() {
    const maxWidth = Math.min(window.innerWidth - 32, 420);
    Puzzle.state.preview.width = Puzzle.clamp(Puzzle.state.preview.width, 180, maxWidth);
    Puzzle.elements.preview.style.width = `${Puzzle.state.preview.width}px`;
    Puzzle.elements.preview.style.left = `${Puzzle.state.preview.x}px`;
    Puzzle.elements.preview.style.top = `${Puzzle.state.preview.y}px`;
  };

  Puzzle.startPreviewPointer = function startPreviewPointer(event) {
    if (event.target === Puzzle.elements.previewResize) {
      Puzzle.startPreviewResize(event);
      return;
    }
    if (event.target === Puzzle.elements.previewToggle) {
      return;
    }
    Puzzle.startPreviewDrag(event);
  };

  Puzzle.startPreviewDrag = function startPreviewDrag(event) {
    event.preventDefault();
    Puzzle.elements.preview.setPointerCapture(event.pointerId);
    Puzzle.state.previewAction = {
      mode: "drag",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: Puzzle.state.preview.x,
      startTop: Puzzle.state.preview.y
    };
  };

  Puzzle.startPreviewResize = function startPreviewResize(event) {
    event.preventDefault();
    Puzzle.elements.preview.setPointerCapture(event.pointerId);
    Puzzle.state.previewAction = {
      mode: "resize",
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: Puzzle.state.preview.width
    };
  };

  Puzzle.movePreviewPointer = function movePreviewPointer(event) {
    if (!Puzzle.state.previewAction || event.pointerId !== Puzzle.state.previewAction.pointerId) {
      return;
    }
    if (Puzzle.state.previewAction.mode === "drag") {
      Puzzle.movePreviewDrag(event);
      return;
    }
    if (Puzzle.state.previewAction.mode === "resize") {
      Puzzle.movePreviewResize(event);
    }
  };

  Puzzle.movePreviewDrag = function movePreviewDrag(event) {
    const dx = event.clientX - Puzzle.state.previewAction.startX;
    const dy = event.clientY - Puzzle.state.previewAction.startY;
    const rect = Puzzle.elements.preview.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 8;
    const maxY = window.innerHeight - rect.height - 8;
    Puzzle.state.preview.x = Puzzle.clamp(Puzzle.state.previewAction.startLeft + dx, 8, maxX);
    Puzzle.state.preview.y = Puzzle.clamp(Puzzle.state.previewAction.startTop + dy, 8, maxY);
    Puzzle.applyPreviewRect();
  };

  Puzzle.movePreviewResize = function movePreviewResize(event) {
    const dx = event.clientX - Puzzle.state.previewAction.startX;
    const dy = event.clientY - Puzzle.state.previewAction.startY;
    const delta = Math.max(dx, dy * (Puzzle.state.preview.ratio || 1));
    Puzzle.state.preview.width = Puzzle.state.previewAction.startWidth + delta;
    Puzzle.applyPreviewRect();
  };

  Puzzle.endPreviewPointer = function endPreviewPointer(event) {
    if (!Puzzle.state.previewAction || event.pointerId !== Puzzle.state.previewAction.pointerId) {
      return;
    }
    Puzzle.elements.preview.releasePointerCapture(event.pointerId);
    Puzzle.state.previewAction = null;
  };
})();
