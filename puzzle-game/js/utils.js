(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.clamp = function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  };

  Puzzle.isPointInsideRect = function isPointInsideRect(point, rect) {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  };

  Puzzle.getRelativeRect = function getRelativeRect(element, container) {
    const rect = element.getBoundingClientRect();
    const base = container.getBoundingClientRect();
    return {
      x: rect.left - base.left,
      y: rect.top - base.top,
      width: rect.width,
      height: rect.height
    };
  };

  Puzzle.randRange = function randRange(min, max) {
    return min + Math.random() * (max - min);
  };
})();
