import { state } from "./state.js";
import {
  rad,
  actualDistance,
  roundToPlace,
  getScrewHoleCoords,
  calculateCaseGeometry,
} from "./geometry.js";
import { COLORS, DRILL_HOLE_2D_RADIUS } from "./constants.js";

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

function drawDistanceIndicator(
  startX,
  startY,
  endX,
  endY,
  distance,
  labelOffsetX,
  labelOffsetY,
  labelPosition
) {
  const plotStart = getPlot(startX, startY);
  const plotEnd = getPlot(endX, endY);
  const angle = Math.atan2(plotEnd.y - plotStart.y, plotEnd.x - plotStart.x);

  ctx.beginPath();
  ctx.moveTo(plotStart.x, plotStart.y);
  ctx.lineTo(plotEnd.x, plotEnd.y);
  ctx.stroke();
  ctx.closePath();

  drawArrowHead(plotEnd.x, plotEnd.y, angle, 6);

  let labelX, labelY;
  if (labelPosition === "end") {
    labelX = plotEnd.x + labelOffsetX;
    labelY = plotEnd.y + labelOffsetY;
  } else {
    labelX = (plotStart.x + plotEnd.x) / 2 + labelOffsetX;
    labelY = (plotStart.y + plotEnd.y) / 2 + labelOffsetY;
  }

  ctx.font = "9px sans-serif";
  ctx.fillText(actualDistance(distance, false), labelX, labelY);
}

function calculatePerpEndpoint(screw, angle, backWallX) {
  console.info("calculatePerpEndpoint", screw, angle, backWallX);

  const perpDirX = Math.sin(rad(angle));
  const perpDirY = -Math.cos(rad(angle));

  const cosAngle = Math.cos(rad(angle));
  const sinAngle = Math.sin(rad(angle));

  let tBottom = Infinity;
  let tBack = Infinity;

  if (Math.abs(cosAngle) > 0.0001) {
    tBottom = screw.y / cosAngle;
  }
  if (Math.abs(sinAngle) > 0.0001) {
    tBack = (backWallX - screw.x) / sinAngle;
  }

  let t;
  if (tBottom > 0 && tBack > 0) {
    t = Math.min(tBottom, tBack);
  } else if (tBottom > 0) {
    t = tBottom;
  } else if (tBack > 0) {
    t = tBack;
  } else {
    t = Math.max(tBottom, tBack);
  }

  return {
    perpDirX,
    perpDirY,
    t,
    endX: screw.x + perpDirX * t,
    endY: screw.y + perpDirY * t,
  };
}

export function drawJointDistanceIndicators(panels, backWallX) {
    console.info("drawJointDistanceIndicators", panels, backWallX);
  const savedStrokeStyle = ctx.strokeStyle;
  const savedFillStyle = ctx.fillStyle;
  const savedLineDash = ctx.getLineDash();

  ctx.strokeStyle = COLORS.indicator;
  ctx.fillStyle = COLORS.indicator;
  ctx.setLineDash([3, 3]);

  const drawnLabels = [];

  function getLabelInfo(screw, angle, screwIndex) {
    const { endX, endY } = calculatePerpEndpoint(screw, angle, backWallX);
    const hitsBottom = Math.abs(endY) < 0.1;
    const isVertical = Math.abs(screw.x - endX) < 0.1;

    let offsetX, offsetY;
    let position = "mid";

    if (isVertical && hitsBottom) {
      position = "end";
      offsetX = 5;
      offsetY = -5;

      for (const prev of drawnLabels) {
        const dist = Math.abs(endX - prev.x);
        if (dist < 50 && Math.abs(endY - prev.y) < 5) {
          offsetY = prev.offsetY - 12;
        }
      }
    } else if (hitsBottom) {
      position = "end";
      offsetX = 5;
      offsetY = -5;
    } else {
      offsetX = -40;
      offsetY = 5;
    }

    const labelX = position === "end" ? endX : (screw.x + endX) / 2;
    const labelY = position === "end" ? endY : (screw.y + endY) / 2;
    drawnLabels.push({ x: labelX, y: labelY, offsetX, offsetY });

    return {
      labelOffsetX: offsetX,
      labelOffsetY: offsetY,
      labelPosition: position,
    };
  }

  function drawIndicatorForScrew(screw, angle, screwIndex) {
    const { perpDirX, perpDirY, t, endX, endY } = calculatePerpEndpoint(
      screw,
      angle,
      backWallX
    );
    const startX = screw.x - perpDirX * state.actualRailDepth;
    const startY = screw.y - perpDirY * state.actualRailDepth;
    const perpDist = Math.abs(t) + state.actualRailDepth;

    const labelInfo = getLabelInfo(screw, angle, screwIndex);
    drawDistanceIndicator(
      startX,
      startY,
      endX,
      endY,
      perpDist,
      labelInfo.labelOffsetX,
      labelInfo.labelOffsetY,
      labelInfo.labelPosition
    );
  }

  const firstRowAngle = state.getActualRowAngle(0);
  const firstScrews = getScrewHoleCoords(panels[0], 0);
  drawIndicatorForScrew(firstScrews.bottomScrew, firstRowAngle, 0);

  const lastRowIndex = panels.length - 1;
  const lastRowAngle = state.getActualRowAngle(lastRowIndex);
  const lastScrews = getScrewHoleCoords(panels[lastRowIndex], lastRowIndex);
  drawIndicatorForScrew(
    lastScrews.topScrew,
    lastRowAngle,
    panels.length * 2 - 1
  );

  for (let i = 1; i < panels.length; i++) {
    const prevRowAngle = state.getActualRowAngle(i - 1);
    const currentRowAngle = state.getActualRowAngle(i);
    const relativeAngle = state.rowAngles[i];

    const prevScrews = getScrewHoleCoords(panels[i - 1], i - 1);
    const currentScrews = getScrewHoleCoords(panels[i], i);

    const screw1 = prevScrews.topScrew;
    const screw2 = currentScrews.bottomScrew;

    if (relativeAngle === 0) {
      drawIndicatorForScrew(screw2, currentRowAngle, i * 2);
    } else {
      drawIndicatorForScrew(screw1, prevRowAngle, i * 2 - 1);
      drawIndicatorForScrew(screw2, currentRowAngle, i * 2);
    }
  }

  ctx.strokeStyle = savedStrokeStyle;
  ctx.fillStyle = savedFillStyle;
  ctx.setLineDash(savedLineDash);
}

// export function drawPanelRail(panel, panelIndex) {
//   const p = [];
//   const circR = DRILL_HOLE_2D_RADIUS;
//   const screwHoles = getScrewHoleCoords(panel, panelIndex);
//   const savedStrokeStyle = ctx.strokeStyle;
//   const savedFillStyle = ctx.fillStyle;
//   ctx.strokeStyle = COLORS.drillHole;
//   ctx.fillStyle = COLORS.drillHole;

//   // Bottom screw - label below
//   let screwX = screwHoles.bottomScrew.x;
//   let screwY = screwHoles.bottomScrew.y;
//   let plot = getPlot(screwX, screwY);

//   ctx.beginPath();
//   ctx.arc(plot.x, plot.y, circR, 0, 2 * Math.PI);
//   ctx.stroke();
//   ctx.closePath();
//   ctx.beginPath();
//   ctx.arc(plot.x, plot.y, circR / 5, 0, 2 * Math.PI);
//   ctx.fill();
//   ctx.closePath();
//   writeCoords(screwX, screwY, true, "right", COLORS.drillHole);
//   p.push(screwX, screwY);

//   // Top screw - label above
//   screwX = screwHoles.topScrew.x;
//   screwY = screwHoles.topScrew.y;
//   plot = getPlot(screwX, screwY);

//   ctx.beginPath();
//   ctx.arc(plot.x, plot.y, circR, 0, 2 * Math.PI);
//   ctx.stroke();
//   ctx.closePath();
//   ctx.beginPath();
//   ctx.arc(plot.x, plot.y, circR / 5, 0, 2 * Math.PI);
//   ctx.fill();
//   ctx.closePath();
//   writeCoords(screwX, screwY, false, "left", COLORS.drillHole);
//   p.push(screwX, screwY);

//   ctx.strokeStyle = savedStrokeStyle;
//   ctx.fillStyle = savedFillStyle;

//   return p;
// }

// export function drawPanelRails(panels) {
//   const p = [];
//   for (let i = 0; i < panels.length; i++) {
//     p.push(...drawPanelRail(panels[i], i));
//   }
//   console.info("drawPanelRails", p);
//   return p;
// }

export function drawPanelRailHoles(drillHoles) {
  const p = [];
  drillHoles.forEach((hole, index) => {
    const screwX = hole.x;
    const screwY = hole.y;
    const plot = getPlot(screwX, screwY);
    const savedStrokeStyle = ctx.strokeStyle;
    const savedFillStyle = ctx.fillStyle;
    ctx.strokeStyle = COLORS.drillHole;
    ctx.fillStyle = COLORS.drillHole;
    const isBottomHole = index % 2 === 0;

    ctx.beginPath();
    ctx.arc(plot.x, plot.y, DRILL_HOLE_2D_RADIUS, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, DRILL_HOLE_2D_RADIUS / 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
    writeCoords(
      screwX,
      screwY,
      isBottomHole,
      isBottomHole ? "right" : "left",
      COLORS.drillHole
    );
    p.push(screwX, screwY);

    ctx.strokeStyle = savedStrokeStyle;
    ctx.fillStyle = savedFillStyle;

    p.push(hole.x, hole.y);
  });
  return p;
}

const IntersectionType = {
  NONE: "None",
  HORIZONTAL: "Horizontal",
  VERTICAL: "Vertical",
};

/**
 * Calculates the first intersection of a perpendicular line projecting from lineA through pointB.
 * Now completely independent of lineAPointBDist!
 * * @param {Object} params
 * @param {Object} params.lineAStart - {x, y} Start point of lineA
 * @param {number} params.lineAAngle - Angle in degrees from horizontal (rising to the right)
 * @param {Object} params.pointB - {x, y} Point below lineA
 * @param {number} params.horiDestLineY - Y-coordinate of the target horizontal line
 * @param {number} params.vertDestLineX - X-coordinate of the target vertical line
 */
function calculatePerpendicularIntersection(params) {
  const { lineAStart, lineAAngle, pointB, horiDestLineY, vertDestLineX } =
    params;

  /* Use:
    const testParams = {
        lineAStart: { x: 0, y: 10 },
        lineAAngle: 30,                 // 30 degrees slope rising right
        pointB: { x: 5, y: 5 },          // Below the line
        horiDestLineY: -5,              // Deep horizontal floor
        vertDestLineX: 12               // Vertical wall to the right
    };

    const result = calculatePerpendicularIntersection(testParams);
    console.log(result);
  */

  // 1. Convert angle to radians and get lineA's unit direction vector
  const angleRad = (lineAAngle * Math.PI) / 180;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  // 2. Vector from lineAStart to pointB
  const vX = pointB.x - lineAStart.x;
  const vY = pointB.y - lineAStart.y;

  // 3. Project vector V onto lineA's direction vector using the dot product
  const dotProduct = vX * cosA + vY * sinA;

  // 4. Calculate the exact origin point on lineA
  const originPoint = {
    x: lineAStart.x + dotProduct * cosA,
    y: lineAStart.y + dotProduct * sinA,
  };

  // 5. Setup ray casting down the perpendicular line
  let t_h = Infinity;
  let t_v = Infinity;

  // Intersection with horizontal line (Y = horiDestLineY)
  if (Math.abs(cosA) > 1e-9) {
    const t = (originPoint.y - horiDestLineY) / cosA;
    if (t > 0) t_h = t;
  }

  // Intersection with vertical line (X = vertDestLineX)
  if (Math.abs(sinA) > 1e-9) {
    const t = (vertDestLineX - originPoint.x) / sinA;
    if (t > 0) t_v = t;
  }

  // If no forward intersection exists
  if (t_h === Infinity && t_v === Infinity) {
    return {
      intersectionType: IntersectionType.NONE,
      intersectionPoint: null,
      originPoint,
      distanceVector: { x: 0, y: 0 },
      distance: 0,
    };
  }

  // 6. Determine which intersection happens first
  let intersectionType;
  let finalDistance;
  let intersectionPoint;

  if (t_h < t_v) {
    intersectionType = IntersectionType.HORIZONTAL;
    finalDistance = t_h;
    intersectionPoint = {
      x: originPoint.x + t_h * sinA,
      y: horiDestLineY,
    };
  } else {
    intersectionType = IntersectionType.VERTICAL;
    finalDistance = t_v;
    intersectionPoint = {
      x: vertDestLineX,
      y: originPoint.y - t_v * cosA,
    };
  }

  const distanceVector = {
    x: intersectionPoint.x - originPoint.x,
    y: intersectionPoint.y - originPoint.y,
  };

  return {
    intersectionType,
    intersectionPoint,
    originPoint,
    distanceVector,
    distance: finalDistance,
  };
}