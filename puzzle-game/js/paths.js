(() => {
  const Puzzle = window.Puzzle || (window.Puzzle = {});

  function pointToString(point) {
    return `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
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

    const tabWidth = length * 0.56 * edge.size;
    const mid = length / 2;
    const startTab = mid - tabWidth / 2;
    const endTab = mid + tabWidth / 2;
    const depth = depthBase * 1.05 * edge.depth * edge.sign;
    const handle = tabWidth * 0.2;
    const bulb = tabWidth * 0.16;
    const crownHandle = tabWidth * 0.12;

    const p1 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, startTab, 0);
    const cp1 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, startTab + handle, 0);
    const cp2 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid - bulb - handle, depth);
    const p2 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid - bulb, depth);
    const cp3 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid - bulb + crownHandle, depth);
    const cp4 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid + bulb - crownHandle, depth);
    const p3 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid + bulb, depth);
    const cp5 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, mid + bulb + handle, depth);
    const cp6 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, endTab - handle, 0);
    const p4 = edgePoint(startX, startY, dirX, dirY, normalX, normalY, endTab, 0);

    parts.push(`L ${pointToString(p1)}`);
    parts.push(`C ${pointToString(cp1)} ${pointToString(cp2)} ${pointToString(p2)}`);
    parts.push(`C ${pointToString(cp3)} ${pointToString(cp4)} ${pointToString(p3)}`);
    parts.push(`C ${pointToString(cp5)} ${pointToString(cp6)} ${pointToString(p4)}`);
    parts.push(`L ${pointToString(end)}`);
    return end;
  }

  Puzzle.buildPiecePath = function buildPiecePath(edges, width, height, tab) {
    const parts = [];
    let x = tab;
    let y = tab;
    parts.push(`M ${x.toFixed(4)},${y.toFixed(4)}`);
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
