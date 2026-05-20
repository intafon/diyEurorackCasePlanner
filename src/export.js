import DxfWriter from "dxf-writer";
import { calculateCaseGeometry } from "./geometry.js";
import { state } from "./state.js";
import { HP_TO_MM } from "./constants.js";
import { rad } from "./geometry.js";

const SVG_STROKE_WIDTH = "1pt";
const PANEL_SPACING = 15;

/**
 * Projects a 3D extrudable outline to 2D based on panel type.
 * Each panel type uses different axes for its face.
 */
function projectTo2D(points, panelType, geometry) {
  switch (panelType) {
    case "side":
      return points.map((p) => ({ x: p.x, y: p.y }));

    case "front":
      // Front panel face: z is horizontal, y is vertical
      return points.map((p) => ({ x: p.z, y: p.y }));

    case "back":
      // Back panel face: z is horizontal (but mirrored since looking from back), y is vertical
      return points.map((p) => ({ x: -p.z, y: p.y }));

    case "bottom":
      // Bottom panel face: z is horizontal, x is vertical (depth)
      return points.map((p) => ({ x: p.z, y: p.x }));

    case "top":
      // Top/shelf panel: needs rotation to flat when angled
      return flattenTopPanel(points, geometry);

    default:
      return points.map((p) => ({ x: p.x, y: p.y }));
  }
}

/**
 * Flattens the top/shelf panel outline to 2D.
 * In flattenTopShelf mode it's already flat (z horizontal, x vertical).
 * In angled mode, we project along the shelf's angled plane.
 */
function flattenTopPanel(points, geometry) {
  if (state.flattenTopShelf) {
    // Flat shelf: z is horizontal, x is vertical (depth from front edge to back)
    return points.map((p) => ({ x: p.z, y: p.x }));
  }

  // Angled shelf: the panel lies along the shelf angle.
  // We need to project the points onto the plane of the shelf.
  // The shelf runs from the top of the last row towards the back wall.
  // Its "depth" direction is along the angle (shelfAngle from geometry).
  // Its "width" direction is along Z.
  // We compute the position along the shelf's depth axis by projecting x,y onto the shelf direction.
  const shelfAngle = geometry.shelfAngle;
  const dirX = Math.cos(rad(shelfAngle));
  const dirY = Math.sin(rad(shelfAngle));

  // Find a reference point (first point of the outline)
  const ref = points[0];

  return points.map((p) => {
    // Width is along Z axis
    const width = p.z;
    // Depth is the projection of (p - ref) onto the shelf direction vector
    const dx = p.x - ref.x;
    const dy = p.y - ref.y;
    const depth = dx * dirX + dy * dirY;
    return { x: width, y: depth };
  });
}

/**
 * Computes bounding box of a 2D point array.
 */
function getBounds(points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

/**
 * Normalizes points so that the bounding box starts at (0, 0).
 * Accepts an optional offset {minX, minY} to apply the same shift used on a related point set.
 */
function normalizePoints(points, offset = null) {
  const { minX, minY } = offset || getBounds(points);
  return points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
}

/**
 * Returns the normalization offset (minX, minY) for a set of points without moving them.
 */
function getNormalizationOffset(points) {
  const bounds = getBounds(points);
  return { minX: bounds.minX, minY: bounds.minY };
}

/**
 * Flips points vertically (mirrors about horizontal center).
 */
function flipVertical(points) {
  const bounds = getBounds(points);
  return points.map((p) => ({ x: p.x, y: bounds.maxY - (p.y - bounds.minY) + bounds.minY }));
}

/**
 * Flips points horizontally (mirrors about vertical center).
 */
function flipHorizontal(points) {
  const bounds = getBounds(points);
  return points.map((p) => ({ x: bounds.maxX - (p.x - bounds.minX) + bounds.minX, y: p.y }));
}

/**
 * Builds the layout of all panels for export.
 * Returns an array of panel objects with their outlines positioned in the layout.
 *
 * Layout (Y increases upward in the coordinate system, but in the export
 * we'll flip so Y increases downward for SVG):
 *
 * Top of output: Bottom panel (front edge at top)
 * Middle: Top/shelf panel centered above the back panel
 * Lower row: Left | Front | Right | Back, bottom-aligned
 */
function buildExportLayout(geometry) {
  const panels = [];

  // --- Get all extrudable outlines and project to 2D ---

  // Side panels (left outer face, right outer face)
  const leftOutline3D = geometry.createSidePanelExtrudableOutline("left");
  const rightOutline3D = geometry.createSidePanelExtrudableOutline("right");

  // Drill holes are in the same x,y space as the side panel outline.
  const drillHoles2D = geometry.drillHoles.map((h) => ({ x: h.x, y: h.y }));

  // For the left panel outer face: use the right outline mirrored horizontally.
  // Apply identical transforms to drill holes.
  let leftPanel2D = projectTo2D(rightOutline3D, "side", geometry);
  leftPanel2D = flipHorizontal(leftPanel2D);
  const leftOffset = getNormalizationOffset(leftPanel2D);
  leftPanel2D = normalizePoints(leftPanel2D, leftOffset);
  // Mirror drill holes the same way the right outline was mirrored for the left panel display.
  const rightOutlineBounds = getBounds(projectTo2D(rightOutline3D, "side", geometry));
  let leftDrillHoles2D = drillHoles2D.map((h) => ({
    x: rightOutlineBounds.maxX - (h.x - rightOutlineBounds.minX) + rightOutlineBounds.minX,
    y: h.y,
  }));
  leftDrillHoles2D = normalizePoints(leftDrillHoles2D, leftOffset);

  // For the right panel outer face: use the left outline as-is.
  const rightOffset = getNormalizationOffset(projectTo2D(leftOutline3D, "side", geometry));
  let rightPanel2D = projectTo2D(leftOutline3D, "side", geometry);
  rightPanel2D = normalizePoints(rightPanel2D, rightOffset);
  let rightDrillHoles2D = normalizePoints(drillHoles2D, rightOffset);

  // Front panel
  const frontOutline3D = geometry.createFrontPanelExtrudableOutline();
  let frontPanel2D = projectTo2D(frontOutline3D, "front", geometry);
  frontPanel2D = normalizePoints(frontPanel2D);

  // Back panel
  const backOutline3D = geometry.createBackPanelExtrudableOutline();
  let backPanel2D = projectTo2D(backOutline3D, "back", geometry);
  backPanel2D = normalizePoints(backPanel2D);

  // Bottom panel (front edge at top means we need front edge = max Y after normalization)
  const bottomOutline3D = geometry.createBottomPanelExtrudableOutline();
  let bottomPanel2D = projectTo2D(bottomOutline3D, "bottom", geometry);
  // The bottom panel's "front" edge (x=0 in 3D, which becomes y=0 after projection) should be at top.
  // After projection, smaller x values (front) map to smaller y. We want front at top (high y),
  // so flip vertically.
  bottomPanel2D = flipVertical(bottomPanel2D);
  bottomPanel2D = normalizePoints(bottomPanel2D);

  // Top/shelf panel (back edge at bottom)
  let topOutline3D, topPanel2D;
  if (geometry.hasShelfTop) {
    topOutline3D = geometry.createTopPanelExtrudableOutline();
    topPanel2D = projectTo2D(topOutline3D, "top", geometry);
    // After flattening, the "back" edge (connecting to back panel) should be at the bottom (y=0).
    // The top panel outline goes topLeft->topRight->bottomRight->bottomLeft where "bottom" is the
    // back-connecting edge. After projection the back edge should already be at low y values.
    // Let's normalize first and check.
    topPanel2D = normalizePoints(topPanel2D);
  } else {
    // Set top panel to back panel coords for now
    // TODO: fix this later...
    topOutline3D = backOutline3D;
    topPanel2D = backPanel2D;
  }

  // --- Compute bounds ---
  const leftBounds = getBounds(leftPanel2D);
  const rightBounds = getBounds(rightPanel2D);
  const frontBounds = getBounds(frontPanel2D);
  const backBounds = getBounds(backPanel2D);
  const bottomBounds = getBounds(bottomPanel2D);
  const topBounds = getBounds(topPanel2D);

  // --- Layout positioning ---
  // All positions are in a coordinate system where Y increases downward (SVG-style).

  // Lower row: Left | Front | Right | Back, all bottom-aligned
  // The "bottom" of each panel shape = the lowest edge, which after normalization is y=0.
  // In SVG (y-down), bottom-aligned means their max-Y values are at the same position.
  const lowerRowPanels = [
    { name: "Left Side Panel", points: leftPanel2D, bounds: leftBounds, drillHoles: leftDrillHoles2D },
    { name: "Front Panel", points: frontPanel2D, bounds: frontBounds },
    { name: "Right Side Panel", points: rightPanel2D, bounds: rightBounds, drillHoles: rightDrillHoles2D },
    { name: "Back Panel", points: backPanel2D, bounds: backBounds },
  ];

  const lowerRowMaxHeight = Math.max(
    leftBounds.height,
    frontBounds.height,
    rightBounds.height,
    backBounds.height
  );

  // Position lower row panels side by side, bottom-aligned with interleaved box joints
  let lowerRowX = 0;
  const lowerRowPositions = [];
  const overlap = state.caseMaterialThickness; // Box joint overlap for interleaving
  for (let i = 0; i < lowerRowPanels.length; i++) {
    const panel = lowerRowPanels[i];
    const yOffset = lowerRowMaxHeight - panel.bounds.height; // top-align offset for bottom-alignment in y-down
    lowerRowPositions.push({ x: lowerRowX, y: yOffset });
    if (i < lowerRowPanels.length - 1) {
      lowerRowX += panel.bounds.width - overlap; // Overlap for interleaving tabs/notches
    }
  }
  const lowerRowTotalWidth = lowerRowX + lowerRowPanels[lowerRowPanels.length - 1].bounds.width;

  // Top/shelf panel: positioned above the back panel with spacing (not interleaved)
  // The back panel is the last in the lower row.
  const backPanelPosition = lowerRowPositions[3];
  const backPanelCenterX = backPanelPosition.x + backBounds.width / 2;
  const topPanelX = backPanelCenterX - topBounds.width / 2;

  // Bottom panel: position at top, centered over front panel
  const frontPanelPosition = lowerRowPositions[1]; // Front is index 1 in [Left, Front, Right, Back]
  const frontPanelCenterX = frontPanelPosition.x + frontBounds.width / 2;
  const bottomPanelX = frontPanelCenterX - bottomBounds.width / 2;
  const bottomPanelY = 0;

  // Top/shelf panel goes between bottom panel and lower row with spacing
  const topPanelY = bottomPanelY + bottomBounds.height + PANEL_SPACING;

  // Lower row goes below the top/shelf panel with spacing
  const lowerRowY = topPanelY + topBounds.height + PANEL_SPACING;

  // --- Build final panel list with absolute positions ---
  panels.push({
    name: "Bottom Panel",
    points: bottomPanel2D,
    x: bottomPanelX,
    y: bottomPanelY,
    bounds: bottomBounds,
  });

  if (geometry.hasShelfTop) {
    panels.push({
      name: "Top Shelf Panel",
      points: topPanel2D,
      x: topPanelX,
      y: topPanelY,
      bounds: topBounds,
    });
  }

  for (let i = 0; i < lowerRowPanels.length; i++) {
    panels.push({
      name: lowerRowPanels[i].name,
      points: lowerRowPanels[i].points,
      drillHoles: lowerRowPanels[i].drillHoles || [],
      x: lowerRowPositions[i].x,
      y: lowerRowY + lowerRowPositions[i].y,
      bounds: lowerRowPanels[i].bounds,
    });
  }

  const totalHeight = lowerRowY + lowerRowMaxHeight;

  // Calculate total width based on the actual layout (bottom panel vs lower row width)
  const totalLayoutWidth = Math.max(lowerRowTotalWidth, bottomBounds.width);

  return { panels, totalWidth: totalLayoutWidth, totalHeight };
}

export function generateSVG() {
  const geometry = calculateCaseGeometry();
  const padding = 10;

  const layout = buildExportLayout(geometry);

  const width = layout.totalWidth + padding * 2;
  const height = layout.totalHeight + padding * 2;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
  <title>Eurorack Case Panels - Laser Cut Layout</title>
  <desc>Generated by DIY Eurorack Case Planner</desc>`;

  for (const panel of layout.panels) {
    const id = panel.name.toLowerCase().replace(/\s+/g, "-");
    svg += `

  <!-- ${panel.name} -->
  <g id="${id}" stroke="#FF0000" stroke-width="${SVG_STROKE_WIDTH}" fill="none">
    <path d="`;

    const points = panel.points;
    const ox = panel.x + padding;
    const oy = panel.y + padding;

    // In SVG, y increases downward. Our points are normalized with y=0 at bottom.
    // We need to flip y so that y=0 is at top within the panel's local space.
    const panelHeight = panel.bounds.height;

    svg += `M ${ox + points[0].x} ${oy + (panelHeight - points[0].y)}`;
    for (let i = 1; i < points.length; i++) {
      svg += ` L ${ox + points[i].x} ${oy + (panelHeight - points[i].y)}`;
    }
    svg += ` Z" />
  </g>`;

    if (panel.drillHoles && panel.drillHoles.length > 0) {
      svg += `

  <!-- ${panel.name} - Drill holes -->
  <g id="${id}-drill-holes" stroke="#FF0000" stroke-width="${SVG_STROKE_WIDTH}" fill="none">`;
      const drillRadius = 2.1;
      for (const hole of panel.drillHoles) {
        svg += `
    <circle cx="${ox + hole.x}" cy="${oy + (panelHeight - hole.y)}" r="${drillRadius}" />`;
      }
      svg += `
  </g>`;
    }
  }

  svg += `
</svg>`;

  return svg;
}

export function generateDXF() {
  const geometry = calculateCaseGeometry();

  const layout = buildExportLayout(geometry);

  const dxf = new DxfWriter();
  dxf.addLayer("BOTTOM_PANEL", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("TOP_SHELF_PANEL", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("LEFT_SIDE_PANEL", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("LEFT_DRILL_HOLES", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("FRONT_PANEL", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("RIGHT_SIDE_PANEL", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("RIGHT_DRILL_HOLES", DxfWriter.ACI.RED, "CONTINUOUS");
  dxf.addLayer("BACK_PANEL", DxfWriter.ACI.RED, "CONTINUOUS");

  const layerMap = {
    "Bottom Panel": "BOTTOM_PANEL",
    "Top Shelf Panel": "TOP_SHELF_PANEL",
    "Left Side Panel": "LEFT_SIDE_PANEL",
    "Front Panel": "FRONT_PANEL",
    "Right Side Panel": "RIGHT_SIDE_PANEL",
    "Back Panel": "BACK_PANEL",
  };

  const drillLayerMap = {
    "Left Side Panel": "LEFT_DRILL_HOLES",
    "Right Side Panel": "RIGHT_DRILL_HOLES",
  };

  const drillRadius = 2.1;

  for (const panel of layout.panels) {
    const layerName = layerMap[panel.name] || "0";
    dxf.setActiveLayer(layerName);

    const points = panel.points;
    const ox = panel.x;
    const oy = panel.y;

    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      dxf.drawLine(
        ox + points[i].x,
        oy + points[i].y,
        ox + points[next].x,
        oy + points[next].y
      );
    }

    if (panel.drillHoles && panel.drillHoles.length > 0) {
      const drillLayer = drillLayerMap[panel.name];
      if (drillLayer) {
        dxf.setActiveLayer(drillLayer);
        for (const hole of panel.drillHoles) {
          dxf.drawCircle(ox + hole.x, oy + hole.y, drillRadius);
        }
      }
    }
  }

  return dxf.toDxfString();
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSVG() {
  const svg = generateSVG();
  downloadFile(svg, "eurorack-case-panels.svg", "image/svg+xml");
}

export function downloadDXF() {
  const dxf = generateDXF();
  downloadFile(dxf, "eurorack-case-panels.dxf", "application/dxf");
}
