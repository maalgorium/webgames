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

    // Traditional jigsaw shape: circular head on a narrow neck
    const sign = edge.sign;
    const mid = length / 2;
    const totalDepth = depthBase * edge.depth * sign;
    const headR = Math.abs(totalDepth) * 0.56;
    const headCV = totalDepth - sign * headR;   // circle center offset along normal
    const neckHalf = length * 0.10 * edge.size; // half-width of neck at edge base
    const k = 0.552;                            // bezier circle approximation constant

    function pt(u, v) {
      return pointToString(edgePoint(startX, startY, dirX, dirY, normalX, normalY, u, v));
    }

    const startTab = mid - neckHalf;
    const endTab = mid + neckHalf;

    // Left shoulder: from (startTab, 0) curving up to left of circle
    parts.push(`L ${pt(startTab, 0)}`);
    parts.push(`C ${pt(startTab, headCV * 0.5)} ${pt(mid - headR, headCV - sign * headR * 0.5)} ${pt(mid - headR, headCV)}`);
    // Left quarter arc of circle
    parts.push(`C ${pt(mid - headR, headCV + sign * headR * k)} ${pt(mid - headR * k, headCV + sign * headR)} ${pt(mid, headCV + sign * headR)}`);
    // Right quarter arc of circle
    parts.push(`C ${pt(mid + headR * k, headCV + sign * headR)} ${pt(mid + headR, headCV + sign * headR * k)} ${pt(mid + headR, headCV)}`);
    // Right shoulder: from right of circle back down to (endTab, 0)
    parts.push(`C ${pt(mid + headR, headCV - sign * headR * 0.5)} ${pt(endTab, headCV * 0.5)} ${pt(endTab, 0)}`);
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
