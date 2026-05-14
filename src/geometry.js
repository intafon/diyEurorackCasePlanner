import { state } from "./state.js";
import { HP_TO_MM, BOX_JOINT_TAB_WIDTH } from "./constants.js";

export function rad(d) {
  return (d / 180) * Math.PI;
}

export function roundToPlace(v, p) {
  return Math.round(v * Math.pow(10, p)) / Math.pow(10, p);
}

export function actualDistance(d, showInches) {
  let t = Math.abs(roundToPlace(d, 2)) + "mm";
  if (showInches) {
    t += " (" + Math.abs(roundToPlace(d / 25.4, 2)) + "in)";
  }
  return t;
}

export function getScrewHoleCoords(panel, panelIndex) {
  const panelHeight = state.getPanelHeightForRow(panelIndex);
  const railSeparation = state.getRailSeparationForRow(panelIndex);
  const screwDist = (panelHeight - railSeparation) / 2;
  const screwDistX = Math.cos(rad(panel.angle)) * screwDist;
  const screwDistY = Math.sin(rad(panel.angle)) * screwDist;
  const screwDistDepthX = Math.sin(rad(panel.angle)) * state.actualRailDepth;
  const screwDistDepthY = -Math.cos(rad(panel.angle)) * state.actualRailDepth;

  return {
    bottomScrew: {
      x: panel.coords[0] + screwDistX + screwDistDepthX,
      y: panel.coords[1] + screwDistY + screwDistDepthY,
    },
    topScrew: {
      x: panel.coords[2] - screwDistX + screwDistDepthX,
      y: panel.coords[3] - screwDistY + screwDistDepthY,
    },
  };
}

export function calculateCaseGeometry() {
  const geometry = {
    outline: [],
    drillHoles: [],
    frontPieceOutline: [],
    backPieceOutline: [],
    shelfPieceOutline: [],
    baseBoardOutline: [],
    panels: [],
    cutPanels: [],
    maxX: 0,
    maxY: 0,
  };

  let x = 0,
    y = 0;

  function addPoint(xn, yn, marker = null) {
    x = xn;
    y = yn;
    geometry.maxX = Math.max(geometry.maxX, xn);
    geometry.maxY = Math.max(geometry.maxY, yn);
    geometry.outline.push({ x: xn, y: yn, marker });
  }

  const firstAngle = state.rowAngles[0];

  geometry.panels = state.rowAngles.map((r, i) => ({
    angle: state.getActualRowAngle(i),
    coords: [],
    is1U: state.rowIs1U[i],
  }));

  addPoint(0, 0);

  //   const bottomPanelDepth = state.useStaticRise
  //     ? state.actualPanelDepth
  //     : Math.abs(
  //         state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
  //       );
  addPoint(x, y + getFrontPanelHeight());

  geometry.frontPieceOutline.push({ x: 0, y: y });
  geometry.frontPieceOutline.push({
    x: x + state.caseMaterialThickness,
    y: y,
  });
  geometry.frontPieceOutline.push({
    x: x + state.caseMaterialThickness,
    y: 0,
  });
  geometry.frontPieceOutline.push({ x: 0, y: 0 });

  addPoint(
    x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y + Math.sin(rad(firstAngle)) * state.caseMaterialThickness,
    "nowrite"
  );

  let maxScrewX = 0;
  let maxScrewY = 0;

  state.rowAngles.forEach((angle, i) => {
    const rowHeight = state.getPanelHeightForRow(i);
    geometry.panels[i].coords.push(x, y);
    addPoint(
      x + Math.cos(rad(state.getActualRowAngle(i))) * rowHeight,
      y + Math.sin(rad(state.getActualRowAngle(i))) * rowHeight,
      i === state.rowAngles.length - 1 ? true : null
    );
    geometry.panels[i].coords.push(x, y);
    const screwCoords = getScrewHoleCoords(geometry.panels[i], i);
    maxScrewX = Math.max(maxScrewX, screwCoords.topScrew.x);
    maxScrewY = Math.max(maxScrewY, screwCoords.topScrew.y);
  });

  const lastRowEndX = x;
  const lastRowEndY = y;
  const lastRowAngle = state.getActualRowAngle();
  // Inner back wall should allow for module depth to be that specified by user.
  const backInnerWallX =
    maxScrewX +
    Math.sin(rad(lastRowAngle)) *
      (state.actualPanelDepth - state.actualRailDepth);
  const backOuterWallX = backInnerWallX + state.caseMaterialThickness;

  let backWallInside, backWallY, backWallOutside;

  if (state.flattenTopShelf) {
    const shelfStartX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfStartY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;

    const normalBackWallInside = backWallInside;
    const normalBackWallOutside = backOuterWallX;

    const shelfEndX = normalBackWallOutside;
    const shelfEndY = shelfStartY;

    backWallInside = shelfEndX - state.caseMaterialThickness;
    backWallOutside = shelfEndX;

    const shelfTopLeftX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfTopLeftY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfTopRightX = backWallOutside;
    const shelfTopRightY = shelfTopLeftY;
    const shelfBottomRightX = backWallOutside;
    const shelfBottomRightY = shelfTopLeftY - state.caseMaterialThickness;
    const shelfBottomLeftX = shelfTopLeftX;
    const shelfBottomLeftY = shelfBottomRightY;

    addPoint(shelfStartX, shelfStartY);
    addPoint(shelfEndX, shelfEndY, {
      labelPos: { below: true, side: "right" },
    });
    addPoint(shelfEndX, 0);

    const backTopLeftX = backWallInside;
    const backTopLeftY = shelfTopRightY - state.caseMaterialThickness;
    const backTopRightX = backWallOutside;
    const backTopRightY = backTopLeftY;
    const backBottomRightX = backWallOutside;
    const backBottomRightY = 0;
    const backBottomLeftX = backWallInside;
    const backBottomLeftY = 0;

    geometry.backPieceOutline.push({ x: backTopLeftX, y: backTopLeftY });
    geometry.backPieceOutline.push({
      x: backTopRightX,
      y: backTopRightY,
    });
    geometry.backPieceOutline.push({
      x: backBottomRightX,
      y: backBottomRightY,
    });
    geometry.backPieceOutline.push({
      x: backBottomLeftX,
      y: backBottomLeftY,
    });

    geometry.shelfPieceOutline.push({ x: shelfTopLeftX, y: shelfTopLeftY });
    geometry.shelfPieceOutline.push({
      x: shelfTopRightX,
      y: shelfTopRightY,
    });
    geometry.shelfPieceOutline.push({
      x: shelfBottomRightX,
      y: shelfBottomRightY,
    });
    geometry.shelfPieceOutline.push({
      x: shelfBottomLeftX,
      y: shelfBottomLeftY,
    });
  } else {
    const shelfTopLeftX = lastRowEndX;
    const shelfTopLeftY = lastRowEndY;
    const shelfTopRightX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfTopRightY =
      shelfTopLeftY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfBottomRightX = backOuterWallX;
    // shelfTopRightX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const shelfBottomRightY =
      shelfTopRightY -
      ((backOuterWallX - shelfTopRightX) / Math.sin(rad(lastRowAngle))) *
        Math.cos(rad(lastRowAngle));
    // shelfTopRightY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;
    const shelfBottomLeftX =
      shelfBottomRightX -
      state.caseMaterialThickness * Math.cos(rad(lastRowAngle));
    // shelfTopLeftX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const shelfBottomLeftY =
      shelfBottomRightY -
      state.caseMaterialThickness * Math.sin(rad(lastRowAngle));
    // shelfTopLeftY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;

    backWallY = shelfBottomRightY;
    backWallOutside = shelfBottomRightX;
    backWallInside = backWallOutside - state.caseMaterialThickness;

    geometry.shelfPieceOutline.push({ x: lastRowEndX, y: lastRowEndY });
    geometry.shelfPieceOutline.push({
      x: shelfTopRightX,
      y: shelfTopRightY,
    });
    geometry.shelfPieceOutline.push({
      x: shelfBottomRightX,
      y: shelfBottomRightY,
    });
    geometry.shelfPieceOutline.push({
      x: shelfBottomLeftX,
      y: shelfBottomLeftY,
    });

    geometry.backPieceOutline.push({
      x: backWallInside,
      y: backWallY,
    });
    geometry.backPieceOutline.push({
      x: backWallOutside,
      y: backWallY,
    });
    geometry.backPieceOutline.push({
      x: backWallOutside,
      y: 0,
    });
    geometry.backPieceOutline.push({
      x: backWallInside,
      y: 0,
    });

    addPoint(shelfTopRightX, shelfTopRightY);
    addPoint(backWallOutside, backWallY);
    addPoint(backWallOutside, 0, "nowrite");
  }

  addPoint(0, 0);

  geometry.backWallInside = backWallInside;

  geometry.baseBoardOutline = [
    { x: 0, y: 0 },
    { x: geometry.maxX, y: 0 },
    { x: geometry.maxX, y: -state.caseMaterialThickness },
    { x: 0, y: -state.caseMaterialThickness },
    { x: 0, y: 0 },
  ];

  // let maxScrewX = 0;
  // let maxScrewY = 0;

  geometry.panels.forEach((panel, i) => {
    const screwCoords = getScrewHoleCoords(panel, i);
    geometry.drillHoles.push(screwCoords.bottomScrew);
    geometry.drillHoles.push(screwCoords.topScrew);
    // maxScrewX = Math.max(maxScrewX, screwCoords.topScrew.x);
    // maxScrewY = Math.max(maxScrewY, screwCoords.topScrew.y);
  });

  const panelWidth = state.caseWidthHP * HP_TO_MM;

  const frontHeight = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(
        state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
      );

  const bottomDepth = geometry.maxX;

  let backHeight, topShelfDepth;

  if (state.flattenTopShelf) {
    const lastRowEndY = geometry.outline[geometry.outline.length - 4].y;
    const shelfY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    backHeight = shelfY - state.caseMaterialThickness;

    const lastRowEndX = geometry.outline[geometry.outline.length - 5].x;
    const shelfStartX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    topShelfDepth = geometry.maxX - shelfStartX;
  } else {
    const backWallTopY = geometry.outline[geometry.outline.length - 3].y;
    backHeight = geometry.maxY;
    topShelfDepth = state.actualPanelDepth;
  }

  const bottomWidth = panelWidth + 2 * state.caseMaterialThickness;
  geometry.cutPanels = [
    {
      name: "Front",
      width: panelWidth,
      height: frontHeight,
    },
    {
      name: "Bottom",
      width: bottomWidth,
      height: bottomDepth,
    },
    {
      name: "Back",
      width: panelWidth,
      height: backHeight,
    },
  ];

  if (state.flattenTopShelf) {
    geometry.cutPanels.push({
      name: "Top Shelf",
      width: panelWidth,
      height: topShelfDepth,
    });
  } else {
    geometry.cutPanels.push({
      name: "Back-Top (angled)",
      width: panelWidth,
      height: topShelfDepth,
    });
  }

  return geometry;
}

function getFrontPanelHeight() {
  const firstAngle = state.rowAngles[0];
  const height = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(
        state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
      );
  return height;
}

const boxJointType = { tab: "tab", notch: "notch" };

function findCenterPoint(point1, point2) {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2,
    z: (point1.z + point2.z) / 2,
  };
}

function createBoxJoints(
  point1,
  point2,
  type = boxJointType.tab,
  includeEndpoints = false
) {
  const jointHeight = state.caseMaterialThickness;
  const jointWidth = BOX_JOINT_TAB_WIDTH;
  // const centerPoint = findCenterPoint(point1, point2);
  // const jointIndex = 0;

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Basic safety check
  if (length < jointWidth * 2) return [p1, p2];

  const ux = dx / length;
  const uy = dy / length;
  const uz = dz / length;

  // Normal vector (u x Z-axis)
  // 'notch' flips the orientation of the tab height
  const multiplier = type === boxJointType.notch ? -1 : 1;
  const nx = uy * multiplier;
  const ny = -ux * multiplier;
  const nz = 0;

  const halfW = jointWidth / 2;
  const mid = length / 2;
  const tabOffsets = [];

  // Helper to check if a tab at a specific center point fits the boundary rules
  const fits = (center) => {
    const start = center - halfW;
    const end = center + halfW;
    // Tab must start and end at least jointWidth away from the line endpoints
    return start >= jointWidth && end <= length - jointWidth;
  };

  // 1. Center tab
  if (fits(mid)) {
    tabOffsets.push(mid);

    // 2. Add outward tabs with a period of 2 * jointWidth (1 tab + 1 gap)
    let step = 1;
    while (true) {
      let added = false;
      const forward = mid + step * (2 * jointWidth);
      const backward = mid - step * (2 * jointWidth);

      if (fits(forward)) {
        tabOffsets.push(forward);
        added = true;
      }
      if (fits(backward)) {
        tabOffsets.push(backward);
        added = true;
      }

      if (!added) break;
      step++;
    }
  }

  // Sort offsets chronologically along the line
  tabOffsets.sort((a, b) => a - b);

  const points = [];

  if (includeEndpoints) {
    points.push(p1);
  }

  tabOffsets.forEach((offset) => {
    const tStart = offset - halfW;
    const tEnd = offset + halfW;

    // Move to tab start on the baseline
    points.push({
      x: p1.x + ux * tStart,
      y: p1.y + uy * tStart,
      z: p1.z + uz * tStart,
    });

    // Rise
    points.push({
      x: p1.x + ux * tStart + nx * jointHeight,
      y: p1.y + uy * tStart + ny * jointHeight,
      z: p1.z + uz * tStart + nz * jointHeight,
    });

    // Span tab width
    points.push({
      x: p1.x + ux * tEnd + nx * jointHeight,
      y: p1.y + uy * tEnd + ny * jointHeight,
      z: p1.z + uz * tEnd + nz * jointHeight,
    });

    // Drop back to baseline
    points.push({
      x: p1.x + ux * tEnd,
      y: p1.y + uy * tEnd,
      z: p1.z + uz * tEnd,
    });
  });

  if (includeEndpoints) {
    points.push(p2);
  }

  return points;
}

function createFrontPanelOutline() {
  return {
    topLeft: { z: -state.caseWidth, y: getFrontPanelHeight(), x: 0 },
    topRight: { z: state.caseWidth, y: getFrontPanelHeight(), x: 0 },
    bottomRight: { z: state.caseWidth, y: 0, x: 0 },
    bottomLeft: { z: -state.caseWidth, y: 0, x: 0 },
  };
}

function createFrontPanel2dSideOutline() {
  // This should return the point necessary to create the side view outline of the panel.
  const { topLeft, topRight, bottomRight, bottomLeft } =
    createFrontPanelOutline();
  return [
    { x: topLeft.x, y: topLeft.y },
    { x: topLeft.x + state.caseMaterialThickness, y: topLeft.y },
    { x: bottomLeft.x + state.caseMaterialThickness, y: bottomLeft.y },
    { x: bottomLeft.x, y: bottomLeft.y },
  ];
}

function createFrontPanelExtrudableOutline() {
  // Creates the outline for the front panel with the box joint tabs and notches.
  // Note that the outline will currently be centered at the -caseWidth/2 Z position to match
  // with the current way the 3d geometry is handled.
  //
  // The current center Z point is at state.caseWidth/2, and thus since the front piece goes
  // between the side panels, its main outline without the box joints will go from -state.caseWidth
  // to state.caseWidth in the Z direction.
  //
  // In the Y direction, the front piece goes from 0 to state.actualPanelDepth not counting the
  // box joint tabs.
  const { topLeft, topRight, bottomRight, bottomLeft } =
    createFrontPanelOutline();

  // Now create outlines with tabs on the left and right sides and the bottom. First create the
  // center tab, then expend the tabs outward from there.
  const bottomJoints = createBoxJoints(
    bottomRight,
    bottomLeft,
    boxJointType.tab,
    false
  );
  const leftJoints = createBoxJoints(
    bottomLeft,
    topLeft,
    boxJointType.tab,
    false
  );
  const rightJoints = createBoxJoints(
    topRight,
    bottomRight,
    boxJointType.tab,
    false
  );
  return [
    topLeft,
    topRight,
    ...rightJoints,
    bottomRight,
    ...bottomJoints,
    bottomLeft,
    ...leftJoints,
    topLeft,
  ];
}

function createBackPanelOutline() {
  // Creates the back panel, looking from the back at the back face of it.
  const backPieceOutline = calculateCaseGeometry().backPieceOutline;
  return {
    topLeft: {
      z: state.caseWidth,
      y: backPieceOutline[1].y,
      x: backPieceOutline[1].x,
    },
    topRight: {
      z: -state.caseWidth,
      y: backPieceOutline[1].y,
      x: backPieceOutline[1].x,
    },
    bottomRight: {
      z: -state.caseWidth,
      y: backPieceOutline[2].y,
      x: backPieceOutline[2].x,
    },
    bottomLeft: {
      z: state.caseWidth,
      y: backPieceOutline[2].y,
      x: backPieceOutline[2].x,
    },
  };
}

function createBackPanel2dSideOutline() {
  const { topLeft, topRight, bottomRight, bottomLeft } =
    createBackPanelOutline();
  return [
    { x: topLeft.x - state.caseMaterialThickness, y: topLeft.y },
    { x: topLeft.x, y: topLeft.y },
    { x: bottomLeft.x, y: bottomLeft.y },
    { x: bottomLeft.x - state.caseMaterialThickness, y: bottomLeft.y },
  ];
}

function createBackPanelExtrudableOutline() {
  // back panel has tabs on all four sides
  const { topLeft, topRight, bottomRight, bottomLeft } =
    createBackPanelOutline();

  // Now create outlines with tabs on the left and right sides and the bottom. First create the
  // center tab, then expend the tabs outward from there.
  const topJoints = createBoxJoints(topLeft, topRight, boxJointType.tab, false);
  const rightJoints = createBoxJoints(
    topRight,
    bottomRight,
    boxJointType.tab,
    false
  );
  const bottomJoints = createBoxJoints(
    bottomRight,
    bottomLeft,
    boxJointType.tab,
    false
  );
  const leftJoints = createBoxJoints(
    bottomLeft,
    topLeft,
    boxJointType.tab,
    false
  );
  return [
    topLeft,
    ...topJoints,
    topRight,
    ...rightJoints,
    bottomRight,
    ...bottomJoints,
    bottomLeft,
    ...leftJoints,
    topLeft,
  ];
}

function createBottomPanelOutline() {
  // Creates the bottom up view of the bottom panel, as if you were looking at the case from the
  // front and lifted the front to look at the bottom (so the front is at the top)
  const bottomPanelOutline = calculateCaseGeometry().baseBoardOutline;
  return {
    topLeft: {
      z: -(state.caseWidth + state.caseMaterialThickness),
      y: -state.caseMaterialThickness,
      x: 0,
    },
    topRight: {
      z: state.caseWidth + state.caseMaterialThickness,
      y: -state.caseMaterialThickness,
      x: 0,
    },
    bottomRight: {
      z: state.caseWidth + state.caseMaterialThickness,
      y: -state.caseMaterialThickness,
      x: bottomPanelOutline[1].x,
    },
    bottomLeft: {
      z: -(state.caseWidth + state.caseMaterialThickness),
      y: -state.caseMaterialThickness,
      x: bottomPanelOutline[1].x,
    },
  };
}

function createBottomPanel2dSideOutline() {
  const { topLeft, topRight, bottomRight, bottomLeft } =
    createBottomPanelOutline();
  return [
    { x: topLeft.x, y: 0 },
    { x: bottomLeft.x, y: 0 },
    { x: bottomLeft.x, y: -state.caseMaterialThickness },
    { x: topLeft.x, y: -state.caseMaterialThickness },
  ];
}

function createBottomPanelExtrudableOutline() {
  const { topLeft, topRight, bottomRight, bottomLeft } =
    createBottomPanelOutline();
  const topJoints = createBoxJoints(
    topLeft,
    topRight,
    boxJointType.notch,
    false
  );
  const rightJoints = createBoxJoints(
    topRight,
    bottomRight,
    boxJointType.notch,
    false
  );
  const bottomJoints = createBoxJoints(
    bottomRight,
    bottomLeft,
    boxJointType.notch,
    false
  );
  const leftJoints = createBoxJoints(
    bottomLeft,
    topLeft,
    boxJointType.notch,
    false
  );
  return [
    topLeft,
    ...topJoints,
    topRight,
    ...rightJoints,
    bottomRight,
    ...bottomJoints,
    bottomLeft,
    ...leftJoints,
    topLeft,
  ];
}


function createTopPanelOutline() {}

function createTopPanel2dSideOutline() {}

function createTopPanelExtrudableOutline() {}

function createSidePanelOutline() {}

function createSidePanel2dOutline() {
  // This should basically create what is currently created for 2d display
}

function createSidePanelExtrudableOutline() {
  // This should create the side panel with the tabs/notches added
  // For 3d and export we need to create a mirror image of this as well, which should be basically
  // just the same points mirrored about the y-axis.
}

export function flattenXYCoordsToArray(coords) {
  return coords.reduce((acc, coord) => {
    acc.push(coord.x, coord.y);
    return acc;
  }, []);
}
