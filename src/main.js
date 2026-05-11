import { state } from "./state.js";
import { oneUFormats, HP_TO_MM } from "./constants.js";
import { rad, calculateCaseGeometry } from "./geometry.js";
import {
  initCanvas,
  getCanvas,
  getContext,
  drawPath,
  drawPanelRails,
  drawJointDistanceIndicators,
  calculateViewScale,
  drawPanelRailHoles,
} from "./canvas-renderer.js";
import {
  setDrawCallback,
  resetRowInputs,
  writeSummary,
  setupHpWidthInput,
} from "./ui.js";
import {
  initThreeRenderer,
  buildScene,
  startRenderLoop,
  stopRenderLoop,
  resizeThreeCanvas,
} from "./3d-renderer.js";
import "./style.css";
import packageJson from "../package.json";

let canvasDiv, canvas, ctx;
let threeCanvas;
let activeView = "2d";

function calculateCaseBoundsAndPanels() {
  let maxX = 0, maxY = 0;
  let x = 0, y = 0;

  const firstAngle = state.rowAngles[0];

  const bottomPanelDepth = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle)));

  const frontHeight = bottomPanelDepth;

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
  const lastRowEndX = x;
  const lastRowEndY = y;

  let backHeight, topShelfDepth;

  if (state.flattenTopShelf) {
    const shelfStartX = lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfStartY = lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    const normalBackWallInside = lastRowEndX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const normalBackWallOutside = normalBackWallInside + state.caseMaterialThickness;
    maxX = Math.max(maxX, normalBackWallOutside);
    maxY = Math.max(maxY, shelfStartY);

    backHeight = shelfStartY - state.caseMaterialThickness;
    topShelfDepth = normalBackWallOutside - shelfStartX;
  } else {
    const backWallOutside = lastRowEndX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth + state.caseMaterialThickness;
    const topY = lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    maxX = Math.max(maxX, backWallOutside);
    maxY = Math.max(maxY, topY);

    backHeight = topY;
    topShelfDepth = state.actualPanelDepth;
  }

  const panelWidth = state.caseWidthHP * HP_TO_MM;
  const bottomDepth = maxX;

  const bottomWidth = panelWidth + 2 * state.caseMaterialThickness;
  const cutPanels = [
    { name: "Front", width: panelWidth, height: frontHeight },
    { name: "Bottom", width: bottomWidth, height: bottomDepth },
    { name: "Back", width: panelWidth, height: backHeight },
  ];

  if (state.flattenTopShelf) {
    cutPanels.push({ name: "Top Shelf", width: panelWidth, height: topShelfDepth });
  } else {
    cutPanels.push({ name: "Back-Top", width: panelWidth, height: topShelfDepth });
  }

  return { maxX, maxY, cutPanels };
}

function drawSide() {
  const bounds = calculateCaseBoundsAndPanels();
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
  }

  const firstAngle = state.rowAngles[0];

  state.panels = state.rowAngles.map((r, i) => ({
    angle: state.getActualRowAngle(i),
    coords: [],
  }));

  add(0, 0);

  const bottomPanelDepth = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(
        state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
      );
  add(x, y + bottomPanelDepth);

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
    const normalBackWallOutside =
      normalBackWallInside + state.caseMaterialThickness;

    const shelfEndX = normalBackWallOutside;
    const shelfEndY = shelfStartY;

    backWallInside = shelfEndX - state.caseMaterialThickness;
    backWallOutside = shelfEndX;

    add(shelfStartX, shelfStartY);
    add(shelfEndX, shelfEndY, { labelPos: { below: true, side: "right" } });
    add(shelfEndX, 0);
  } else {
    backWallInside =
      lastRowEndX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    backWallY =
      lastRowEndY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;
    backWallOutside = backWallInside + state.caseMaterialThickness;

    add(
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness,
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness
    );
    add(backWallOutside, backWallY);
    add(backWallOutside, 0, "nowrite");
  }

  add(0, 0);

  const caseGeometry = calculateCaseGeometry();

  ctx.setLineDash([]);
  const railScrewCoords = drawPanelRails(state.panels);
  const railScrewCoords2 = drawPanelRailHoles(caseGeometry.drillHoles);
  const pathCoords = p.slice(0);

  console.info(p, caseGeometry.outline);
  drawPath(
    caseGeometry.outline.reduce((acc, p) => {
      acc.push(p.x, p.y);
      if (p.marker) {
        acc.push(p.marker);
      }
      return acc;
    }, [])
  );

  drawJointDistanceIndicators(state.panels, caseGeometry.backWallInside);

  writeSummary(maxX, maxY, pathCoords, railScrewCoords, bounds.cutPanels);

  // Redraw the entire side outline
  // drawAnOutline(calculateCaseGeometry().outline, "#ff0000", [2, 2]);
  // Redraw the front outline
  drawAnOutline(caseGeometry.frontPieceOutline, "#999999", [3, 3]);
  // Redraw the back outline
  drawAnOutline(caseGeometry.backPieceOutline, "#999999", [3, 3]);
  // Redraw the shelf/diagonal back outline
  drawAnOutline(caseGeometry.shelfPieceOutline, "#999999", [3, 3]);
  // Redraw the base outline
  drawAnOutline(caseGeometry.baseBoardOutline, "#999999", [1, 5]);

  if (activeView === "3d") {
    buildScene();
  }
}

/**
 * Draws an outline shape defined by the points.
 *
 * @param {Array<{x: number, y: number}>} outlineData Array of points to draw shape
 * @param {string} color CSS color string
 * @param {Array<number>} dashes Array of numbers representing the dash pattern
 */
function drawAnOutline(outlineData, color = "#CCCCCC99", dashes = []) {
  let outlinePts = outlineData.reduce((acc, p) => {
    acc.push(p.x, p.y);
    return acc;
  }, []);
  outlinePts.push(outlinePts[0], outlinePts[1]);
  outlinePts.unshift("false");
  ctx.setLineDash(dashes);
  ctx.strokeStyle = color;
  ctx.beginPath();
  drawPath(outlinePts);
  ctx.closePath();
}

function setActiveView(view) {
  if (view === activeView) return;
  activeView = view;

  const btn2d = document.getElementById("view-toggle-2d");
  const btn3d = document.getElementById("view-toggle-3d");

  if (view === "3d") {
    canvas.style.display = "none";
    threeCanvas.style.display = "block";
    btn2d.classList.remove("active");
    btn3d.classList.add("active");
    resizeAllCanvases();
    buildScene();
    startRenderLoop();
  } else {
    stopRenderLoop();
    threeCanvas.style.display = "none";
    canvas.style.display = "block";
    btn3d.classList.remove("active");
    btn2d.classList.add("active");
    resizeAllCanvases();
    drawSide();
  }
}

function resizeAllCanvases() {
  const w = canvasDiv.clientWidth;
  const h = canvasDiv.clientHeight;
  if (w <= 0 || h <= 0) return;

  if (activeView === "2d") {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = "#999999";
    drawSide();
  } else {
    threeCanvas.width = w;
    threeCanvas.height = h;
    threeCanvas.style.width = w + "px";
    threeCanvas.style.height = h + "px";
    resizeThreeCanvas(w, h);
  }
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

  threeCanvas = document.getElementById("three-canvas");
  initThreeRenderer(threeCanvas);

  inputDepth.value = state.actualPanelDepth;

  setupHpWidthInput();

  const btn2d = document.getElementById("view-toggle-2d");
  const btn3d = document.getElementById("view-toggle-3d");
  btn2d.addEventListener("click", () => setActiveView("2d"));
  btn3d.addEventListener("click", () => setActiveView("3d"));

  requestAnimationFrame(resizeAllCanvases);

  window.onresize = function () {
    resizeAllCanvases();
  };
}

function initVersionDisplay() {
  const versionTextEl = document.getElementById("version-text");
  if (versionTextEl && packageJson.version) {
    versionTextEl.textContent = packageJson.version;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initVersionDisplay();
  init();
});
