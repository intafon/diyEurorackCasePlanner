import { state } from "./state.js";

export function rad(d) {
  return (d / 180) * Math.PI;
}

export function roundToPlace(v, p) {
  return Math.round(v * Math.pow(10, p)) / Math.pow(10, p);
}

export function actualDistance(d, showInches) {
  let t = Math.abs(roundToPlace(d, 1)) + "mm";
  if (showInches) {
    t += " (" + Math.abs(roundToPlace(d / 25.4, 1)) + "in)";
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

  geometry.frontPieceOutline.push({
    x: x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y: y + Math.sin(rad(firstAngle)) * state.caseMaterialThickness,
  });
  geometry.frontPieceOutline.push({
    x: x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y: 0,
  });
  geometry.frontPieceOutline.push({ x: 0, y: 0 });

  addPoint(
    x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y + Math.sin(rad(firstAngle)) * state.caseMaterialThickness,
    "nowrite"
  );

  state.rowAngles.forEach((angle, i) => {
    const rowHeight = state.getPanelHeightForRow(i);
    geometry.panels[i].coords.push(x, y);
    addPoint(
      x + Math.cos(rad(state.getActualRowAngle(i))) * rowHeight,
      y + Math.sin(rad(state.getActualRowAngle(i))) * rowHeight,
      i === state.rowAngles.length - 1 ? true : null
    );
    geometry.panels[i].coords.push(x, y);
  });

  const lastRowEndX = x;
  const lastRowEndY = y;
  const lastRowAngle = state.getActualRowAngle();

  let backWallInside, backWallY, backWallOutside;

  if (state.flattenTopShelf) {
    const shelfStartX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfStartY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;

    const normalBackWallInside =
      lastRowEndX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const normalBackWallOutside = normalBackWallInside + state.caseMaterialThickness;

    const shelfEndX = normalBackWallOutside;
    const shelfEndY = shelfStartY;

    backWallInside = shelfEndX - state.caseMaterialThickness;
    backWallOutside = shelfEndX;

    addPoint(shelfStartX, shelfStartY);
    addPoint(shelfEndX, shelfEndY, { labelPos: { below: true, side: "right" } });
    addPoint(shelfEndX, 0);

    geometry.backPieceOutline.push({ x: lastRowEndX, y: lastRowEndY });
    geometry.backPieceOutline.push({
      x: backWallInside,
      y: shelfEndY - state.caseMaterialThickness,
    });
    geometry.backPieceOutline.push({ x: backWallInside, y: 0 });

    geometry.shelfPieceOutline.push({ x: shelfStartX, y: shelfStartY });
    geometry.shelfPieceOutline.push({
      x: shelfStartX,
      y: shelfStartY - state.caseMaterialThickness,
    });
    geometry.shelfPieceOutline.push({
      x: backWallInside,
      y: shelfStartY - state.caseMaterialThickness,
    });
    geometry.shelfPieceOutline.push({ x: backWallInside, y: 0 });
  } else {
    backWallInside =
      lastRowEndX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    backWallY =
      lastRowEndY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;
    backWallOutside = backWallInside + state.caseMaterialThickness;

    geometry.backPieceOutline.push({ x: lastRowEndX, y: lastRowEndY });
    geometry.backPieceOutline.push({ x: backWallInside, y: backWallY });
    geometry.backPieceOutline.push({ x: backWallInside, y: 0 });

    addPoint(
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness,
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness
    );
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

  geometry.panels.forEach((panel, i) => {
    const screwCoords = getScrewHoleCoords(panel, i);
    geometry.drillHoles.push(screwCoords.bottomScrew);
    geometry.drillHoles.push(screwCoords.topScrew);
  });

  return geometry;
}
