(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});
  const {
    menuToggle,
    overflowToggle,
    overflowMenu,
    drawerBackdrop,
    galleryDrawer,
    galleryClose
  } = Puzzle.elements || {};

  if (!menuToggle || !overflowToggle || !overflowMenu || !drawerBackdrop || !galleryDrawer || !galleryClose) {
    return;
  }

  const toggleClass = (element, name, isOn) => {
    if (!element) {
      return;
    }
    element.classList.toggle(name, isOn);
  };

  const setDrawerOpen = (isOpen) => {
    toggleClass(galleryDrawer, "open", isOpen);
    toggleClass(drawerBackdrop, "visible", isOpen);
    galleryDrawer.setAttribute("aria-hidden", isOpen ? "false" : "true");
  };

  const setOverflowOpen = (isOpen) => {
    toggleClass(overflowMenu, "open", isOpen);
    overflowToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  const handleDocumentClick = (event) => {
    if (overflowMenu.classList.contains("open")) {
      const inMenu = overflowMenu.contains(event.target) || overflowToggle.contains(event.target);
      if (!inMenu) {
        setOverflowOpen(false);
      }
    }
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Escape") {
      return;
    }
    setDrawerOpen(false);
    setOverflowOpen(false);
  };

  menuToggle.addEventListener("click", () => {
    setOverflowOpen(false);
    setDrawerOpen(true);
  });
  galleryClose.addEventListener("click", () => setDrawerOpen(false));
  drawerBackdrop.addEventListener("click", () => setDrawerOpen(false));
  overflowToggle.addEventListener("click", () => {
    const isOpen = overflowMenu.classList.contains("open");
    setOverflowOpen(!isOpen);
  });
  overflowMenu.addEventListener("click", () => setOverflowOpen(false));
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeyDown);
})();
