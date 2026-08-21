export type DrawingStroke = {
  points: Array<[number, number]>;
  color: string;
  width: number;
  tool: "brush" | "eraser";
};

export type StructuredDrawing = {
  canvas: string;
  drawingSvg: string;
  asciiGrid: string;
  asciiGridNote: string;
  strokeCount: number;
};

export function strokesToStructuredDrawing(strokes: DrawingStroke[], width = 1000, height = 700): StructuredDrawing {
  const drawableStrokes = strokes.filter((stroke) => stroke.tool !== "eraser" && stroke.points.length > 0);
  return {
    canvas: `${width}x${height}`,
    drawingSvg: strokesToSvg(drawableStrokes, width, height),
    asciiGrid: makeAsciiGrid(drawableStrokes, width, height),
    asciiGridNote: "ascii_grid is 60 columns x 42 rows; # means a line passes through that area, . means empty space. Judge the overall silhouette, not a single mark.",
    strokeCount: drawableStrokes.length,
  };
}

function svgEscape(value: string) {
  return String(value ?? "").replace(/[<>"'&]/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch] ?? ch));
}

function normalizePointPairs(points: Array<[number, number]>) {
  return points
    .map(([x, y]) => [Number(x), Number(y)] as [number, number])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}

function strokesToSvg(strokes: DrawingStroke[], width: number, height: number) {
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="20" fill="#fffafc"/>`,
  ];

  for (const stroke of strokes.slice(0, 100)) {
    const points = normalizePointPairs(stroke.points);
    if (!points.length) continue;
    const d = points.map(([x, y], index) => `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    const color = svgEscape(stroke.color || "#4f454b");
    const lineWidth = Math.max(1, Math.min(28, Number(stroke.width || 7)));
    parts.push(`<path d="${d}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round"/>`);
  }

  parts.push("</svg>");
  return parts.join("");
}

function makeAsciiGrid(strokes: DrawingStroke[], width: number, height: number, cols = 60, rows = 42) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill("."));
  function mark(x: number, y: number) {
    const col = Math.max(0, Math.min(cols - 1, Math.floor((x / width) * cols)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((y / height) * rows)));
    grid[row][col] = "#";
  }

  for (const stroke of strokes) {
    const points = normalizePointPairs(stroke.points);
    if (points.length === 1) {
      mark(points[0][0], points[0][1]);
      continue;
    }
    for (let index = 1; index < points.length; index += 1) {
      const [x1, y1] = points[index - 1];
      const [x2, y2] = points[index];
      const steps = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 8));
      for (let step = 0; step <= steps; step += 1) {
        const t = step / steps;
        mark(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
      }
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}
