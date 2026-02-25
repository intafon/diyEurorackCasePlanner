import { state } from "./state.js";
import { oneUFormats } from "./constants.js";
import { rad } from "./geometry.js";
import {
  initCanvas,
  getCanvas,
  getContext,
  drawPath,
  drawPanelRails,
  drawJointDistanceIndicators,
  calculateViewScale,
} from "./canvas-renderer.js";
import {
  setDrawCallback,
  resetRowInputs,
  writeSummary,
} from "./ui.js";
import "./style.css";

let canvasDiv, canvas, ctx;

function calculateCaseBounds() {
  let maxX = 0, maxY = 0;
  let x = 0, y = 0;

  const firstAngle = state.rowAngles[0];

  const bottomPanelDepth = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle)));
  
  y += bottomPanelDepth;
  x += Math.cos(rad(firstAngle)) * state.caseMaterialThickness;
  y = Math.sin(rad(firstAngle)) * state.caseMaterialThickness + bottomPanelDepth;

  state.rowAngles.forEach((angle, i) => {
    const rowHeight = state.getPanelHeightForRow(i);
    x += Math.cos(rad(state.getActualRowAngle(i))) * rowHeight;
    y += Math.sin(rad(state.getActualRowAngle(i))) * rowHeight;
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });

  const lastRowAngle = state.getActualRowAngle();

  if (state.flattenTopShelf) {
    const shelfStartY = y + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    const normalBackWallInside = x + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const normalBackWallOutside = normalBackWallInside + state.caseMaterialThickness;
    maxX = Math.max(maxX, normalBackWallOutside);
    maxY = Math.max(maxY, shelfStartY);
  } else {
    const backWallOutside = x + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth + state.caseMaterialThickness;
    const topY = y + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    maxX = Math.max(maxX, backWallOutside);
    maxY = Math.max(maxY, topY);
  }

  return { maxX, maxY };
}

function drawSide() {
  const bounds = calculateCaseBounds();
  calculateViewScale(bounds.maxX, bounds.maxY);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.strokeStyle = "#999999";
  ctx.setLineDash([]);

  let maxX = 0,
    maxY = 0;
  let x = 0,
    y = 0;
  const p = [];

  function add(xn, yn, noWriteMarker) {
    x = xn;
    y = yn;
    maxX = Math.max(maxX, xn);
    maxY = Math.max(maxY, yn);
    p.push(xn, yn);
    if (noWriteMarker) {
      p.push(noWriteMarker);
    }
  }

  const firstAngle = state.rowAngles[0];

  state.panels = state.rowAngles.map((r, i) => ({
    angle: state.getActualRowAngle(i),
    coords: [],
  }));

  const frontPieceOutline = [];
  const backPieceOutline = [];
  let shelfPieceOutline = [];

  add(0, 0);

  const bottomPanelDepth = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle)));
  add(x, y + bottomPanelDepth);

  frontPieceOutline.push(
    x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y + Math.sin(rad(firstAngle)) * state.caseMaterialThickness
  );
  frontPieceOutline.push(
    x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    0
  );
  frontPieceOutline.push(0, 0);
  add(
    x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y + Math.sin(rad(firstAngle)) * state.caseMaterialThickness,
    "nowrite"
  );

  state.rowAngles.forEach((angle, i) => {
    const rowHeight = state.getPanelHeightForRow(i);
    state.panels[i].coords.push(x, y);
    state.panels[i].is1U = state.rowIs1U[i];
    add(
      x + Math.cos(rad(state.getActualRowAngle(i))) * rowHeight,
      y + Math.sin(rad(state.getActualRowAngle(i))) * rowHeight,
      i === state.rowAngles.length - 1
    );
    state.panels[i].coords.push(x, y);
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

    add(shelfStartX, shelfStartY);
    add(shelfEndX, shelfEndY, { labelPos: { below: true, side: "right" } });
    add(shelfEndX, 0);

    backPieceOutline.push(lastRowEndX, lastRowEndY);
    backPieceOutline.push(backWallInside, shelfEndY - state.caseMaterialThickness);
    backPieceOutline.push(backWallInside, 0);

    shelfPieceOutline.push(shelfStartX, shelfStartY);
    shelfPieceOutline.push(shelfStartX, shelfStartY - state.caseMaterialThickness);
    shelfPieceOutline.push(backWallInside, shelfStartY - state.caseMaterialThickness);
    shelfPieceOutline.push(backWallInside, 0);
  } else {
    backWallInside =
      lastRowEndX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    backWallY =
      lastRowEndY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;
    backWallOutside = backWallInside + state.caseMaterialThickness;

    backPieceOutline.push(lastRowEndX, lastRowEndY);
    backPieceOutline.push(backWallInside, backWallY);
    backPieceOutline.push(backWallInside, 0);

    add(
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness,
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness
    );
    add(backWallOutside, backWallY);
    add(backWallOutside, 0, "nowrite");
  }

  add(0, 0);

  ctx.setLineDash([1, 5]);
  ctx.beginPath();
  drawPath(
    false,
    0,
    0,
    maxX,
    0,
    maxX,
    -state.caseMaterialThickness,
    0,
    -state.caseMaterialThickness,
    0,
    0
  );
  ctx.closePath();

  frontPieceOutline.unshift("false");
  backPieceOutline.unshift("false");
  ctx.beginPath();
  drawPath(frontPieceOutline);
  ctx.closePath();
  ctx.beginPath();
  drawPath(backPieceOutline);
  ctx.closePath();

  if (state.flattenTopShelf && shelfPieceOutline.length > 0) {
    shelfPieceOutline.unshift("false");
    ctx.beginPath();
    drawPath(shelfPieceOutline);
    ctx.closePath();
  }

  ctx.setLineDash([]);
  const railScrewCoords = drawPanelRails(state.panels);
  const pathCoords = p.slice(0);
  drawPath(p);

  drawJointDistanceIndicators(state.panels, backWallInside);

  writeSummary(maxX, maxY, pathCoords, railScrewCoords);
}

function init() {
  const rowCountSelector = document.getElementById("rowCount");
  rowCountSelector.value = state.rowCount;
  state.rowCounts.forEach((c, i) => {
    const newOpt = document.createElement("option");
    newOpt.value = c;
    newOpt.innerHTML = c;
    rowCountSelector.appendChild(newOpt);
    if (state.rowCounts[i] === state.rowCount) {
      newOpt.selected = true;
    }
  });
  rowCountSelector.addEventListener("change", (event) => {
    state.rowCount = parseInt(event.target.value, 10);
    resetRowInputs(state.rowCount);
    drawSide();
  });

  setDrawCallback(drawSide);
  resetRowInputs(state.rowCount);

  const oneUFormatRadios = document.querySelectorAll('input[name="oneUFormat"]');
  oneUFormatRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.selected1UFormat = event.target.value;
      state.actual1UPanelHeight = oneUFormats[state.selected1UFormat].height;
      state.actual1URailSeparation =
        oneUFormats[state.selected1UFormat].railSeparation;
      drawSide();
    });
  });

  const inputDepth = document.getElementById("the-input-depth");
  const onModuleDepthChange = (event) => {
    setTimeout(() => {
      state.actualPanelDepth = parseFloat(event.target.value);
      drawSide();
    }, 0);
  };
  inputDepth.addEventListener("input", onModuleDepthChange);

  const calcRiseCb = document.getElementById("calc-rise");
  calcRiseCb.checked = !state.useStaticRise;
  const onCalcRiseChange = (event) => {
    setTimeout(() => {
      state.useStaticRise = !event.target.checked;
      drawSide();
    }, 0);
  };
  calcRiseCb.addEventListener("change", onCalcRiseChange);

  const matThickness = document.getElementById("material-thickness");
  matThickness.value = state.caseMaterialThickness;
  const onMaterialThicknessChange = (event) => {
    setTimeout(() => {
      state.caseMaterialThickness = parseFloat(event.target.value);
      drawSide();
    }, 0);
  };
  matThickness.addEventListener("input", onMaterialThicknessChange);

  const flattenTopShelfCb = document.getElementById("flatten-top-shelf");
  flattenTopShelfCb.checked = state.flattenTopShelf;
  flattenTopShelfCb.addEventListener("change", (event) => {
    state.flattenTopShelf = event.target.checked;
    drawSide();
  });

  canvasDiv = document.getElementById("canvas-div");
  canvas = document.getElementById("the-canvas");
  ctx = initCanvas(canvas);
  const w = canvasDiv.clientWidth;
  const h = canvasDiv.clientHeight;
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = "rgb(0, 0, 0)";
  ctx.strokeStyle = "#999999";

  inputDepth.value = state.actualPanelDepth;

  drawSide();

  window.onresize = function () {
    const w = canvasDiv.clientWidth;
    const h = canvasDiv.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    drawSide();
  };
}

document.addEventListener("DOMContentLoaded", init);
