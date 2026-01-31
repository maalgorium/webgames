(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  Puzzle.createEdge = function createEdge(sign) {
    if (sign === 0) {
      return { sign: 0, size: 1, depth: 1 };
    }
    return {
      sign,
      size: Puzzle.randRange(0.85, 1.15),
      depth: Puzzle.randRange(0.85, 1.2)
    };
  };

  Puzzle.buildEdgeMaps = function buildEdgeMaps(rows, cols) {
    const vertical = Array.from({ length: rows + 1 }, () =>
      Array.from({ length: cols }, () => Puzzle.createEdge(0))
    );
    const horizontal = Array.from({ length: rows }, () =>
      Array.from({ length: cols + 1 }, () => Puzzle.createEdge(0))
    );

    for (let row = 1; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        vertical[row][col] = Puzzle.createEdge(Math.random() > 0.5 ? 1 : -1);
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let col = 1; col < cols; col += 1) {
        horizontal[row][col] = Puzzle.createEdge(Math.random() > 0.5 ? 1 : -1);
      }
    }

    return { vertical, horizontal };
  };

  Puzzle.invertEdge = function invertEdge(edge) {
    if (!edge || edge.sign === 0) {
      return Puzzle.createEdge(0);
    }
    return { sign: -edge.sign, size: edge.size, depth: edge.depth };
  };

  Puzzle.getPieceEdges = function getPieceEdges(row, col) {
    const { grid, edgeMaps } = Puzzle.state;
    const flat = Puzzle.createEdge(0);
    if (!edgeMaps) {
      return { top: flat, right: flat, bottom: flat, left: flat };
    }
    const top = row === 0 ? flat : Puzzle.invertEdge(edgeMaps.vertical[row][col]);
    const bottom = row === grid.rows - 1 ? flat : edgeMaps.vertical[row + 1][col];
    const left = col === 0 ? flat : Puzzle.invertEdge(edgeMaps.horizontal[row][col]);
    const right = col === grid.cols - 1 ? flat : edgeMaps.horizontal[row][col + 1];
    return { top, right, bottom, left };
  };
})();
