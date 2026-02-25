import { state } from "./state.js";
import { rad, actualDistance, roundToPlace, getScrewHoleCoords } from "./geometry.js";
import { COLORS } from "./constants.js";

let canvas, ctx;

const PADDING = 70;

export function initCanvas(canvasElement) {
  canvas = canvasElement;
  ctx = canvas.getContext("2d");
  return ctx;
}

export function getCanvas() {
  return canvas;
}

export function getContext() {
  return ctx;
}

function startX() {
  return PADDING * state.viewScale;
}

function startY() {
  return canvas.height - PADDING * state.viewScale;
}

export function getPlot(x, y) {
  return {
    x: startX() + (x / state.heightRatio) * state.viewScale,
    y: startY() - (y / state.heightRatio) * state.viewScale,
  };
}

export function calculateViewScale(maxX, maxY) {
  const baseScale = 1 / state.heightRatio;
  
  const requiredWidth = PADDING + maxX * baseScale + PADDING;
  const requiredHeight = PADDING + maxY * baseScale + PADDING;
  
  const availableWidth = canvas.width;
  const availableHeight = canvas.height;
  
  const scaleX = availableWidth / requiredWidth;
  const scaleY = availableHeight / requiredHeight;
  
  state.viewScale = Math.min(1, scaleX, scaleY);
}

function moveTo(x, y) {
  const plot = getPlot(x, y);
  ctx.moveTo(plot.x, plot.y);
}

function lineTo(x, y) {
  const plot = getPlot(x, y);
  ctx.lineTo(plot.x, plot.y);
}

export function writeCoords(x, y, showBelow, side, color) {
  const yFactor = showBelow ? -1 : 1;
  ctx.font = "10px sans-serif";
  const plot = getPlot(x, y);
  const text = actualDistance(x) + ", " + actualDistance(y);
  const textWidth = ctx.measureText(text).width;

  let xOffset;
  if (side === "left") {
    xOffset = -textWidth - 5;
  } else {
    xOffset = 5;
  }

  const savedFillStyle = ctx.fillStyle;
  if (color) {
    ctx.fillStyle = color;
  }
  ctx.fillText(text, plot.x + xOffset, plot.y - 10 * yFactor);
  ctx.fillStyle = savedFillStyle;
}

export function drawPath(pts) {
  if (!Array.isArray(pts)) {
    pts = Array.prototype.slice.call(arguments);
  }
  if (pts.length === 0) {
    return;
  }
  let shouldWriteCoords = true;
  if (typeof pts[0] !== "number") {
    pts.shift();
    shouldWriteCoords = false;
  }
  ctx.beginPath();
  moveTo(pts.shift(), pts.shift());
  while (pts.length > 0) {
    const x = pts.shift();
    const y = pts.shift();
    lineTo(x, y);
    if (typeof pts[0] === "number") {
      if (shouldWriteCoords) {
        writeCoords(x, y);
      }
    } else {
      const marker = pts.shift();
      if (marker && typeof marker === "object" && marker.labelPos) {
        writeCoords(x, y, marker.labelPos.below, marker.labelPos.side);
      }
    }
  }
  ctx.stroke();
  ctx.closePath();
}

function drawArrowHead(toX, toY, angle, headLength) {
  const headAngle = Math.PI / 6;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - headAngle),
    toY - headLength * Math.sin(angle - headAngle)
  );
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle + headAngle),
    toY - headLength * Math.sin(angle + headAngle)
  );
  ctx.stroke();
  ctx.closePath();
}

function drawDistanceIndicator(startX, startY, endX, endY, distance, labelOffsetX, labelOffsetY) {
  const plotStart = getPlot(startX, startY);
  const plotEnd = getPlot(endX, endY);
  const angle = Math.atan2(plotEnd.y - plotStart.y, plotEnd.x - plotStart.x);

  ctx.beginPath();
  ctx.moveTo(plotStart.x, plotStart.y);
  ctx.lineTo(plotEnd.x, plotEnd.y);
  ctx.stroke();
  ctx.closePath();

  drawArrowHead(plotEnd.x, plotEnd.y, angle, 6);

  const midX = (plotStart.x + plotEnd.x) / 2 + labelOffsetX;
  const midY = (plotStart.y + plotEnd.y) / 2 + labelOffsetY;

  ctx.font = "9px sans-serif";
  ctx.fillText(actualDistance(distance, false), midX, midY);
}

function drawScrewPerpIndicator(screw, angle, backWallX, labelOffsetX, labelOffsetY) {
  const perpDirX = Math.sin(rad(angle));
  const perpDirY = -Math.cos(rad(angle));

  const startX = screw.x - perpDirX * state.actualRailDepth;
  const startY = screw.y - perpDirY * state.actualRailDepth;

  const tBottom = screw.y / Math.cos(rad(angle));
  const tBack = (backWallX - screw.x) / Math.sin(rad(angle));
  const t = tBottom > 0 && tBack > 0 ? Math.min(tBottom, tBack) : Math.max(tBottom, tBack);
  const perpDist = Math.abs(t) + state.actualRailDepth;

  const endX = screw.x + perpDirX * t;
  const endY = screw.y + perpDirY * t;

  drawDistanceIndicator(startX, startY, endX, endY, perpDist, labelOffsetX, labelOffsetY);
}

export function drawJointDistanceIndicators(panels, backWallX) {
  const savedStrokeStyle = ctx.strokeStyle;
  const savedFillStyle = ctx.fillStyle;
  const savedLineDash = ctx.getLineDash();

  ctx.strokeStyle = COLORS.indicator;
  ctx.fillStyle = COLORS.indicator;
  ctx.setLineDash([3, 3]);

  const firstRowAngle = state.getActualRowAngle(0);
  const firstScrews = getScrewHoleCoords(panels[0], 0);
  drawScrewPerpIndicator(firstScrews.bottomScrew, firstRowAngle, backWallX, 5, -5);

  const lastRowIndex = panels.length - 1;
  const lastRowAngle = state.getActualRowAngle(lastRowIndex);
  const lastScrews = getScrewHoleCoords(panels[lastRowIndex], lastRowIndex);
  drawScrewPerpIndicator(lastScrews.topScrew, lastRowAngle, backWallX, -30, -3);

  for (let i = 1; i < panels.length; i++) {
    const prevRowAngle = state.getActualRowAngle(i - 1);
    const currentRowAngle = state.getActualRowAngle(i);
    const relativeAngle = state.rowAngles[i];

    const prevScrews = getScrewHoleCoords(panels[i - 1], i - 1);
    const currentScrews = getScrewHoleCoords(panels[i], i);

    const screw1 = prevScrews.topScrew;
    const screw2 = currentScrews.bottomScrew;

    if (relativeAngle === 0) {
      const angle = currentRowAngle;
      const perpDirX = Math.sin(rad(angle));
      const perpDirY = -Math.cos(rad(angle));

      const startX = screw2.x - perpDirX * state.actualRailDepth;
      const startY = screw2.y - perpDirY * state.actualRailDepth;

      const tBottom = screw2.y / Math.cos(rad(angle));
      const tBack = (backWallX - screw2.x) / Math.sin(rad(angle));
      const t = tBottom > 0 && tBack > 0 ? Math.min(tBottom, tBack) : Math.max(tBottom, tBack);
      const perpDist = Math.abs(t) + state.actualRailDepth;

      const endX = screw2.x + perpDirX * t;
      const endY = screw2.y + perpDirY * t;

      drawDistanceIndicator(startX, startY, endX, endY, perpDist, 5, -5);
    } else {
      const angle1 = prevRowAngle;
      const perpDirX1 = Math.sin(rad(angle1));
      const perpDirY1 = -Math.cos(rad(angle1));

      const startX1 = screw1.x - perpDirX1 * state.actualRailDepth;
      const startY1 = screw1.y - perpDirY1 * state.actualRailDepth;

      const tBottom1 = screw1.y / Math.cos(rad(angle1));
      const tBack1 = (backWallX - screw1.x) / Math.sin(rad(angle1));
      const t1 = tBottom1 > 0 && tBack1 > 0 ? Math.min(tBottom1, tBack1) : Math.max(tBottom1, tBack1);
      const perpDist1 = Math.abs(t1) + state.actualRailDepth;

      const endX1 = screw1.x + perpDirX1 * t1;
      const endY1 = screw1.y + perpDirY1 * t1;

      drawDistanceIndicator(startX1, startY1, endX1, endY1, perpDist1, -30, -3);

      const angle2 = currentRowAngle;
      const perpDirX2 = Math.sin(rad(angle2));
      const perpDirY2 = -Math.cos(rad(angle2));

      const startX2 = screw2.x - perpDirX2 * state.actualRailDepth;
      const startY2 = screw2.y - perpDirY2 * state.actualRailDepth;

      const tBottom2 = screw2.y / Math.cos(rad(angle2));
      const tBack2 = (backWallX - screw2.x) / Math.sin(rad(angle2));
      const t2 = tBottom2 > 0 && tBack2 > 0 ? Math.min(tBottom2, tBack2) : Math.max(tBottom2, tBack2);
      const perpDist2 = Math.abs(t2) + state.actualRailDepth;

      const endX2 = screw2.x + perpDirX2 * t2;
      const endY2 = screw2.y + perpDirY2 * t2;

      drawDistanceIndicator(startX2, startY2, endX2, endY2, perpDist2, 5, -3);
    }
  }

  ctx.strokeStyle = savedStrokeStyle;
  ctx.fillStyle = savedFillStyle;
  ctx.setLineDash(savedLineDash);
}

export function drawPanelRail(panel, panelIndex) {
  const p = [];
  const circR = 3;
  const panelHeight = state.getPanelHeightForRow(panelIndex);
  const railSeparation = state.getRailSeparationForRow(panelIndex);
  const screwDist = (panelHeight - railSeparation) / 2;
  const screwDistX = Math.cos(rad(panel.angle)) * screwDist;
  const screwDistY = Math.sin(rad(panel.angle)) * screwDist;
  const screwDistDepthX = Math.sin(rad(panel.angle)) * state.actualRailDepth;
  const screwDistDepthY = -Math.cos(rad(panel.angle)) * state.actualRailDepth;

  const savedStrokeStyle = ctx.strokeStyle;
  const savedFillStyle = ctx.fillStyle;
  ctx.strokeStyle = COLORS.drillHole;
  ctx.fillStyle = COLORS.drillHole;

  let screwX = panel.coords[0] + screwDistX + screwDistDepthX;
  let screwY = panel.coords[1] + screwDistY + screwDistDepthY;
  let plot = getPlot(screwX, screwY);

  ctx.beginPath();
  ctx.arc(plot.x, plot.y, circR, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.arc(plot.x, plot.y, circR / 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.closePath();
  writeCoords(screwX, screwY, true, "right", COLORS.drillHole);
  p.push(screwX, screwY);

  screwX = panel.coords[2] - screwDistX + screwDistDepthX;
  screwY = panel.coords[3] - screwDistY + screwDistDepthY;
  plot = getPlot(screwX, screwY);

  ctx.beginPath();
  ctx.arc(plot.x, plot.y, circR, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.closePath();
  ctx.beginPath();
  ctx.arc(plot.x, plot.y, circR / 5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.closePath();
  writeCoords(screwX, screwY, true, "left", COLORS.drillHole);
  p.push(screwX, screwY);

  ctx.strokeStyle = savedStrokeStyle;
  ctx.fillStyle = savedFillStyle;

  return p;
}

export function drawPanelRails(panels) {
  const p = [];
  for (let i = 0; i < panels.length; i++) {
    p.push(...drawPanelRail(panels[i], i));
  }
  return p;
}
