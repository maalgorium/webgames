(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  function pointToString(point) {
    return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }

  function edgePoint(startX, startY, dirX, dirY, normalX, normalY, along, offset) {
    return {
      x: startX + dirX * along + normalX * offset,
      y: startY + dirY * along + normalY * offset
    };
  }

  function appendEdgePath(parts, startX, startY, dirX, dirY, normalX, normalY, length, edge, depthBase) {
    const end = edgePoint(startX, startY, dirX, dirY, normalX, normalY, length, 0);
    if (!edge || edge.sign === 0) {
      parts.push(`L ${pointToString(end)}`);
      return end;
    }

    const tabWidth = length * 0.46 * edge.size;
    const mid = length / 2;
    const startTab = mid - tabWidth / 2;
    const endTab = mid + tabWidth / 2;
    const depth = depthBase * edge.depth * edge.sign;
    const handle = tabWidth * 0.15;

    const p1 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, startTab, 0);
    const cp1 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, startTab + handle, 0);
    const cp2 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid - handle, depth);
    const p2 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid, depth);
    const cp3 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid + handle, depth);
    const cp4 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, endTab - handle, 0);
    const p3 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, endTab, 0);

    parts.push(`L ${pointToString(p1)}`);
    parts.push(`C ${pointToString(cp1)} ${pointToString(cp2)} ${pointToString(p2)}`);
    parts.push(`C ${pointToString(cp3)} ${pointToString(cp4)} ${pointToString(p3)}`);
    parts.push(`L ${pointToString(end)}`);
    return end;
  }

  Puzzle.buildPiecePath = function buildPiecePath(edges, width, height, tab) {
    const parts = [];
    let x = tab;
    let y = tab;
    parts.push(`M ${x.toFixed(2)},${y.toFixed(2)}`);
    const depthH = tab;
    const depthW = tab;

    ({ x, y } = appendEdgePath(parts, x, y, 1, 0, 0, -1, width, edges.top, depthH));
    ({ x, y } = appendEdgePath(parts, x, y, 0, 1, 1, 0, height, edges.right, depthW));
    ({ x, y } = appendEdgePath(parts, x, y, -1, 0, 0, 1, width, edges.bottom, depthH));
    ({ x, y } = appendEdgePath(parts, x, y, 0, -1, -1, 0, height, edges.left, depthW));

    parts.push("Z");
    return parts.join(" ");
  };
})();
