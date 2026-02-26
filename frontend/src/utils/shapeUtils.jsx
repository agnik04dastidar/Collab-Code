// shapeUtils.jsx
export const drawLine = (ctx, x0, y0, x1, y1, color) => {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();
};

export const drawRect = (ctx, x0, y0, x1, y1, color) => {
  ctx.beginPath();
  ctx.rect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();
};

export const drawCircle = (ctx, x0, y0, x1, y1, color) => {
  const radius = Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
  ctx.beginPath();
  ctx.arc(x0, y0, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();
};

export const drawEllipse = (ctx, x0, y0, x1, y1, color) => {
  ctx.beginPath();
  ctx.ellipse(
    (x0 + x1) / 2,
    (y0 + y1) / 2,
    Math.abs(x1 - x0) / 2,
    Math.abs(y1 - y0) / 2,
    0,
    0,
    2 * Math.PI
  );
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.closePath();
};

export const drawTriangle = (ctx, x0, y0, x1, y1, color) => {
  ctx.beginPath();
  ctx.moveTo((x0 + x1) / 2, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x0, y1);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
};

export const drawDiamond = (ctx, x0, y0, x1, y1, color) => {
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  ctx.beginPath();
  ctx.moveTo(centerX, y0);
  ctx.lineTo(x1, centerY);
  ctx.lineTo(centerX, y1);
  ctx.lineTo(x0, centerY);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
};

export const drawPentagon = (ctx, x0, y0, x1, y1, color) => {
  const centerX = (x0 + x1) / 2;
  const centerY = (y0 + y1) / 2;
  const radius = Math.min(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2;
  const angle = (2 * Math.PI) / 5;

  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const x = centerX + radius * Math.cos(i * angle - Math.PI / 2);
    const y = centerY + radius * Math.sin(i * angle - Math.PI / 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
};
