import { state } from "./state.js";
import {
  rad,
  actualDistance,
  roundToPlace,
  getScrewHoleCoords,
} from "./geometry.js";
import { COLORS, DRILL_HOLE_2D_RADIUS } from "./constants.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const MARGIN = 100;

let svgEl;
let svgOffsetX = 0;
let svgOffsetY = 0;
let _svgWidth = 0;
let _svgHeight = 0;

export function initSvg(svgElement) {
  svgEl = svgElement;
}

export function getSvgElement() {
  return svgEl;
}

export function resetSvg() {
  while (svgEl.firstChild) {
    svgEl.removeChild(svgEl.firstChild);
  }
}

function svgStartX() {
  return svgOffsetX;
}

function svgStartY() {
  return _svgHeight - svgOffsetY;
}

export function getPlotSvg(x, y) {
  return {
    x: svgStartX() + (x / state.heightRatio) * state.viewScale,
    y: svgStartY() - (y / state.heightRatio) * state.viewScale,
  };
}

export function calculateViewScaleSvg(maxX, maxY) {
  _svgWidth =
    parseFloat(svgEl.getAttribute("width")) || svgEl.clientWidth || 300;
  _svgHeight =
    parseFloat(svgEl.getAttribute("height")) || svgEl.clientHeight || 300;

  const baseScale = 1 / state.heightRatio;
  const caseWidthBase = maxX * baseScale;
  const caseHeightBase = maxY * baseScale;

  const scaleX = (_svgWidth - 2 * MARGIN) / caseWidthBase;
  const scaleY = (_svgHeight - 2 * MARGIN) / caseHeightBase;

  state.viewScale = Math.max(0.01, Math.min(scaleX, scaleY));

  const caseWidthPx = caseWidthBase * state.viewScale;
  const caseHeightPx = caseHeightBase * state.viewScale;

  svgOffsetX = (_svgWidth - caseWidthPx) / 2;
  svgOffsetY = (_svgHeight - caseHeightPx) / 2;
}

// ── SVG DOM helpers ───────────────────────────────────────────────────────────

function mk(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function add(el) {
  svgEl.appendChild(el);
  return el;
}

// ── Text / label helpers ──────────────────────────────────────────────────────

/**
 * Mirrors writeCoords from canvas-renderer.
 * Adds a <text> element for a coordinate label at the given case coordinates.
 */
export function writeCoordsSvg(x, y, showBelow, side, color) {
  const yFactor = showBelow ? -1 : 1;
  const plot = getPlotSvg(x, y);
  const text = actualDistance(x) + ", " + actualDistance(y);

  // Use SVG text-anchor instead of manual text-width measurement
  let textAnchor, tx;
  if (side === "left") {
    textAnchor = "end";
    tx = plot.x - 5;
  } else {
    textAnchor = "start";
    tx = plot.x + 5;
  }

  const ty = plot.y - 10 * yFactor;

  const el = mk("text", {
    x: tx,
    y: ty,
    "font-family": "sans-serif",
    "font-size": "10",
    "text-anchor": textAnchor,
    fill: color || "#000000",
  });
  el.textContent = text;
  add(el);
}

// ── Path / outline drawing ────────────────────────────────────────────────────

/**
 * Mirrors drawPath from canvas-renderer.
 * pts: flat array of [x, y, x, y, ...] numbers, with optional non-number
 * markers interspersed (same contract as canvas drawPath).
 */
export function drawPathSvg(pts, strokeColor = COLORS.outline) {
  if (!Array.isArray(pts)) {
    pts = Array.prototype.slice.call(pts);
  }
  if (pts.length === 0) return;

  let shouldWriteCoords = true;
  if (typeof pts[0] !== "number") {
    pts.shift(); // remove "false" or other non-number sentinel
    shouldWriteCoords = false;
  }

  const x0 = pts.shift();
  const y0 = pts.shift();
  const plot0 = getPlotSvg(x0, y0);
  let d = `M ${plot0.x} ${plot0.y}`;

  const labeledPoints = [];

  while (pts.length > 0) {
    const x = pts.shift();
    const y = pts.shift();
    const plot = getPlotSvg(x, y);
    d += ` L ${plot.x} ${plot.y}`;

    if (typeof pts[0] === "number") {
      if (shouldWriteCoords) {
        labeledPoints.push({ x, y });
      }
    } else {
      const marker = pts.shift();
      if (marker && typeof marker === "object" && marker.labelPos) {
        labeledPoints.push({
          x,
          y,
          showBelow: marker.labelPos.below,
          side: marker.labelPos.side,
        });
      }
    }
  }

  add(
    mk("path", {
      d,
      stroke: strokeColor,
      "stroke-width": "1",
      fill: "none",
    })
  );

  for (const lp of labeledPoints) {
    writeCoordsSvg(lp.x, lp.y, lp.showBelow, lp.side);
  }
}

/**
 * Mirrors drawAnOutline from canvas-renderer.
 * Draws a closed polygon outline from an array of {x, y} case-coordinate points.
 */
export function drawAnOutlineSvg(outlineData, color = "#CCCCCC99", dashes = []) {
  if (!outlineData || outlineData.length === 0) return;

  const plot0 = getPlotSvg(outlineData[0].x, outlineData[0].y);
  let d = `M ${plot0.x} ${plot0.y}`;

  for (let i = 1; i < outlineData.length; i++) {
    const plot = getPlotSvg(outlineData[i].x, outlineData[i].y);
    d += ` L ${plot.x} ${plot.y}`;
  }
  d += " Z";

  const attrs = {
    d,
    stroke: color,
    "stroke-width": "1",
    fill: "none",
  };

  if (dashes && dashes.length > 0) {
    attrs["stroke-dasharray"] = dashes.join(" ");
  }

  add(mk("path", attrs));
}

// ── Drill holes ───────────────────────────────────────────────────────────────

/**
 * Mirrors drawPanelRailHoles from canvas-renderer.
 * Returns the same flat array of [x, y, x, y, ...] rail screw coords.
 */
export function drawPanelRailHolesSvg(drillHoles) {
  const p = [];

  drillHoles.forEach((hole, index) => {
    const screwX = hole.x;
    const screwY = hole.y;
    const plot = getPlotSvg(screwX, screwY);
    const isBottomHole = index % 2 === 0;

    // Outer ring (stroke only)
    add(
      mk("circle", {
        cx: plot.x,
        cy: plot.y,
        r: DRILL_HOLE_2D_RADIUS,
        stroke: COLORS.drillHole,
        "stroke-width": "1",
        fill: "none",
      })
    );

    // Centre dot (filled)
    add(
      mk("circle", {
        cx: plot.x,
        cy: plot.y,
        r: DRILL_HOLE_2D_RADIUS / 5,
        fill: COLORS.drillHole,
        stroke: "none",
      })
    );

    writeCoordsSvg(
      screwX,
      screwY,
      isBottomHole,
      isBottomHole ? "right" : "left",
      COLORS.drillHole
    );

    p.push(screwX, screwY);
    p.push(hole.x, hole.y);
  });

  return p;
}

// ── Distance markers ──────────────────────────────────────────────────────────

/**
 * Mirrors drawRowDrillHoleDistanceMarkers from canvas-renderer.
 * Draws dashed lines between screw holes with measurement labels.
 */
export function drawRowDrillHoleDistanceMarkersSvg(panels) {
  const g = mk("g", {
    stroke: COLORS.indicator,
    fill: COLORS.indicator,
    "stroke-dasharray": "3 4",
  });
  svgEl.appendChild(g);

  const parentEl = svgEl;
  svgEl = g;

  panels.forEach((panel, i) => {
    const { bottomScrew, topScrew } = getScrewHoleCoords(panel, i);
    const railSep = state.getRailSeparationForRow(i);
    const angle = state.getActualRowAngle(i);

    const plotBottom = getPlotSvg(bottomScrew.x, bottomScrew.y);
    const plotTop = getPlotSvg(topScrew.x, topScrew.y);

    add(
      mk("line", {
        x1: plotBottom.x,
        y1: plotBottom.y,
        x2: plotTop.x,
        y2: plotTop.y,
        "stroke-width": "1",
      })
    );

    const midCaseX = (bottomScrew.x + topScrew.x) / 2;
    const midCaseY = (bottomScrew.y + topScrew.y) / 2;
    const offsetMM = 20;
    const labelCaseX = midCaseX - Math.sin(rad(angle)) * offsetMM;
    const labelCaseY = midCaseY + Math.cos(rad(angle)) * offsetMM;

    const plotLabel = getPlotSvg(labelCaseX, labelCaseY);
    const absoluteAngle = state.getActualRowAngle(i);
    const text =
      actualDistance(railSep, false) +
      `, ${roundToPlace(absoluteAngle, 1)}° angle`;

    const textEl = mk("text", {
      x: plotLabel.x,
      y: plotLabel.y + 4,
      "font-family": "sans-serif",
      "font-size": "9",
      "text-anchor": "middle",
      fill: COLORS.indicator,
      stroke: "none",
    });
    textEl.textContent = text;
    add(textEl);
  });

  svgEl = parentEl;
}

// ── Joint distance indicators ─────────────────────────────────────────────────

function _arrowHeadSvg(toX, toY, angle, headLength, strokeColor) {
  const headAngle = Math.PI / 6;
  const x1 = toX - headLength * Math.cos(angle - headAngle);
  const y1 = toY - headLength * Math.sin(angle - headAngle);
  const x2 = toX - headLength * Math.cos(angle + headAngle);
  const y2 = toY - headLength * Math.sin(angle + headAngle);

  add(
    mk("path", {
      d: `M ${toX} ${toY} L ${x1} ${y1} M ${toX} ${toY} L ${x2} ${y2}`,
      stroke: strokeColor,
      "stroke-width": "1",
      fill: "none",
    })
  );
}

function _drawDistanceIndicatorSvg(
  startX,
  startY,
  endX,
  endY,
  distance,
  labelOffsetX,
  labelOffsetY,
  labelPosition
) {
  const plotStart = getPlotSvg(startX, startY);
  const plotEnd = getPlotSvg(endX, endY);
  const angle = Math.atan2(
    plotEnd.y - plotStart.y,
    plotEnd.x - plotStart.x
  );

  add(
    mk("line", {
      x1: plotStart.x,
      y1: plotStart.y,
      x2: plotEnd.x,
      y2: plotEnd.y,
      "stroke-width": "1",
    })
  );

  _arrowHeadSvg(plotEnd.x, plotEnd.y, angle, 6, COLORS.indicator);

  let labelX, labelY;
  if (labelPosition === "end") {
    labelX = plotEnd.x + labelOffsetX;
    labelY = plotEnd.y + labelOffsetY;
  } else {
    labelX = (plotStart.x + plotEnd.x) / 2 + labelOffsetX;
    labelY = (plotStart.y + plotEnd.y) / 2 + labelOffsetY;
  }

  const textEl = mk("text", {
    x: labelX,
    y: labelY,
    "font-family": "sans-serif",
    "font-size": "9",
    fill: COLORS.indicator,
    stroke: "none",
  });
  textEl.textContent = actualDistance(distance, false);
  add(textEl);
}

// Copied from canvas-renderer — pure geometry, no canvas context dependency.
function _calculatePerpEndpoint(screw, angle, backWallX) {
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

/**
 * Mirrors drawJointDistanceIndicators from canvas-renderer.
 * Draws dashed indicator lines with arrow heads and measurement labels.
 */
export function drawJointDistanceIndicatorsSvg(panels, backWallX) {
  const g = mk("g", {
    stroke: COLORS.indicator,
    fill: COLORS.indicator,
    "stroke-dasharray": "3 3",
  });
  svgEl.appendChild(g);

  const parentEl = svgEl;
  svgEl = g;

  const drawnLabels = [];

  function getLabelInfo(screw, angle) {
    const { endX, endY } = _calculatePerpEndpoint(screw, angle, backWallX);
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

  function drawIndicatorForScrew(screw, angle) {
    const { perpDirX, perpDirY, t, endX, endY } = _calculatePerpEndpoint(
      screw,
      angle,
      backWallX
    );
    const startX = screw.x - perpDirX * state.actualRailDepth;
    const startY = screw.y - perpDirY * state.actualRailDepth;
    const perpDist = Math.abs(t) + state.actualRailDepth;

    const labelInfo = getLabelInfo(screw, angle);
    _drawDistanceIndicatorSvg(
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
  drawIndicatorForScrew(firstScrews.bottomScrew, firstRowAngle);

  const lastRowIndex = panels.length - 1;
  const lastRowAngle = state.getActualRowAngle(lastRowIndex);
  const lastScrews = getScrewHoleCoords(panels[lastRowIndex], lastRowIndex);
  drawIndicatorForScrew(lastScrews.topScrew, lastRowAngle);

  for (let i = 1; i < panels.length; i++) {
    const prevRowAngle = state.getActualRowAngle(i - 1);
    const currentRowAngle = state.getActualRowAngle(i);
    const relativeAngle = state.rowAngles[i];

    const prevScrews = getScrewHoleCoords(panels[i - 1], i - 1);
    const currentScrews = getScrewHoleCoords(panels[i], i);

    const screw1 = prevScrews.topScrew;
    const screw2 = currentScrews.bottomScrew;

    if (relativeAngle === 0) {
      drawIndicatorForScrew(screw2, currentRowAngle);
    } else {
      drawIndicatorForScrew(screw1, prevRowAngle);
      drawIndicatorForScrew(screw2, currentRowAngle);
    }
  }

  svgEl = parentEl;
}
