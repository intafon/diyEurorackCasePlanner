import { state } from "./state.js";
import { HP_TO_MM } from "./constants.js";

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

  const bottomPanelDepth = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(
        state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
      );
  addPoint(x, y + bottomPanelDepth);

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
    geometry.shelfPieceOutline.push({ x: shelfTopRightX, y: shelfTopRightY });
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
