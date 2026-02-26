/**
 * Draws a smooth line between two points on a canvas.
 * Supports both pen and eraser tools with customizable width.
 *
 * @param {CanvasRenderingContext2D} ctx - The 2D drawing context.
 * @param {number} x0 - Starting x coordinate.
 * @param {number} y0 - Starting y coordinate.
 * @param {number} x1 - Ending x coordinate.
 * @param {number} y1 - Ending y coordinate.
 * @param {string} color - Stroke color (ignored for eraser).
 * @param {string} tool - Tool type: "pen" or "eraser".
 * @param {number} width - Optional stroke width (default 2 for pen, 20 for eraser).
 */
export const drawLine = (
  ctx,
  x0,
  y0,
  x1,
  y1,
  color = "#000000",
  tool = "pen",
  width
) => {
  if (!ctx) return;

  // Consistent smoothing
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Tool-based behavior
  if (tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = width || 20;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
  }

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.closePath();
};
