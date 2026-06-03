import "./style.css";

import {
  buildScene,
  initThreeRenderer,
  resizeThreeCanvas,
  startRenderLoop,
  stopRenderLoop,
} from "./3d-renderer.js";
import { calculateCaseGeometry } from "./geometry.js";
import {
  calculateViewScale,
  drawJointDistanceIndicators,
  drawPanelRailHoles,
  drawRowDrillHoleDistanceMarkers,
  drawPath,
  initCanvas,
  drawAnOutline,
  resetCanvas,
  getCaseCoords,
} from "./canvas-renderer.js";
import {
  initSvg,
  calculateViewScaleSvg,
  resetSvg,
  drawPathSvg,
  drawPanelRailHolesSvg,
  drawRowDrillHoleDistanceMarkersSvg,
  drawJointDistanceIndicatorsSvg,
  drawAnOutlineSvg,
  getCaseCoordsFromSvg,
} from "./svg-renderer.js";
import { initControlPanel } from "./control-panel.js";
import { initInfoPanel, updateInfoPanel } from "./info-panel.js";

import packageJson from "../package.json";
import { state } from "./state.js";

let canvasDiv, canvas, ctx;
let threeCanvas;
let svgCanvas;
let cursorCanvas, cursorCtx;
let activeView = "2d";
let active2dSubview = "canvas"; // "canvas" | "svg"
let _setSubviewToggleVisible = null;

function draw2dView() {
  const {
    maxX,
    maxY,
    panels,
    outline,
    drillHoles,
    cutPanels,
    backWallInside,
    frontPieceOutline,
    backPieceOutline,
    shelfPieceOutline,
    baseBoardOutline,
    bottomWidth,
  } = calculateCaseGeometry();

  calculateViewScale(maxX, maxY);
  resetCanvas();

  drawPath(
    outline.reduce((acc, p) => {
      acc.push(p.x, p.y);
      if (p.marker) {
        acc.push(p.marker);
      }
      return acc;
    }, [])
  );

  const railScrewCoords = drawPanelRailHoles(drillHoles);
  drawRowDrillHoleDistanceMarkers(panels);
  drawJointDistanceIndicators(panels, backWallInside);

  updateInfoPanel(maxX, maxY, outline, railScrewCoords, cutPanels, bottomWidth);

  drawAnOutline(frontPieceOutline, "#999999", [3, 3]);
  drawAnOutline(backPieceOutline, "#999999", [3, 3]);
  drawAnOutline(shelfPieceOutline, "#999999", [3, 3]);
  drawAnOutline(baseBoardOutline, "#999999", [3, 3]);

  if (activeView === "3d") {
    buildScene();
  }
}

function drawSvgView() {
  const {
    maxX,
    maxY,
    panels,
    outline,
    drillHoles,
    cutPanels,
    backWallInside,
    frontPieceOutline,
    backPieceOutline,
    shelfPieceOutline,
    baseBoardOutline,
    bottomWidth,
  } = calculateCaseGeometry();

  calculateViewScaleSvg(maxX, maxY);
  resetSvg();

  drawPathSvg(
    outline.reduce((acc, p) => {
      acc.push(p.x, p.y);
      if (p.marker) {
        acc.push(p.marker);
      }
      return acc;
    }, [])
  );

  const railScrewCoords = drawPanelRailHolesSvg(drillHoles);
  drawRowDrillHoleDistanceMarkersSvg(panels);
  drawJointDistanceIndicatorsSvg(panels, backWallInside);

  updateInfoPanel(maxX, maxY, outline, railScrewCoords, cutPanels, bottomWidth);

  drawAnOutlineSvg(frontPieceOutline, "#999999", [3, 3]);
  drawAnOutlineSvg(backPieceOutline, "#999999", [3, 3]);
  drawAnOutlineSvg(shelfPieceOutline, "#999999", [3, 3]);
  drawAnOutlineSvg(baseBoardOutline, "#999999", [3, 3]);
}

// Unified draw — called by control panel callbacks so the correct view redraws.
function draw() {
  if (activeView === "3d") {
    buildScene();
  } else if (active2dSubview === "svg") {
    drawSvgView();
  } else {
    draw2dView();
  }
}

// Switches between canvas and SVG within the 2D view.
function setActive2dSubview(subview) {
  active2dSubview = subview;
  const w = canvasDiv.clientWidth;
  const h = canvasDiv.clientHeight;

  if (subview === "svg") {
    canvas.style.display = "none";
    svgCanvas.style.display = "block";
    if (w > 0 && h > 0) {
      svgCanvas.setAttribute("width", w);
      svgCanvas.setAttribute("height", h);
      drawSvgView();
    }
  } else {
    svgCanvas.style.display = "none";
    canvas.style.display = "block";
    if (w > 0 && h > 0) {
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "rgb(0, 0, 0)";
      ctx.strokeStyle = "#999999";
      draw2dView();
    }
  }
}

// Switches the visible canvas. The view toggle in the control panel manages
// its own active class; this function only handles the canvas/renderer state.
function setActiveView(view) {
  if (view === activeView) return;
  activeView = view;

  if (view === "3d") {
    canvas.style.display = "none";
    svgCanvas.style.display = "none";
    threeCanvas.style.display = "block";
    if (_setSubviewToggleVisible) _setSubviewToggleVisible(false);
    resizeAllCanvases();
    buildScene();
    startRenderLoop();
  } else {
    stopRenderLoop();
    threeCanvas.style.display = "none";
    if (_setSubviewToggleVisible) _setSubviewToggleVisible(true);
    // Restore whichever 2D sub-view was last active
    setActive2dSubview(active2dSubview);
  }
}

function resizeAllCanvases() {
  const w = canvasDiv.clientWidth;
  const h = canvasDiv.clientHeight;
  if (w <= 0 || h <= 0) return;

  cursorCanvas.width = w;
  cursorCanvas.height = h;

  if (activeView === "3d") {
    threeCanvas.width = w;
    threeCanvas.height = h;
    threeCanvas.style.width = w + "px";
    threeCanvas.style.height = h + "px";
    resizeThreeCanvas(w, h);
  } else if (active2dSubview === "svg") {
    svgCanvas.setAttribute("width", w);
    svgCanvas.setAttribute("height", h);
    drawSvgView();
  } else {
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = "#999999";
    draw2dView();
  }
}

function init() {
  canvasDiv = document.getElementById("canvas-div");
  canvas = document.getElementById("the-canvas");
  ctx = initCanvas(canvas);

  threeCanvas = document.getElementById("three-canvas");
  initThreeRenderer(threeCanvas);

  svgCanvas = document.getElementById("svg-canvas");
  initSvg(svgCanvas);

  cursorCanvas = document.getElementById("cursor-canvas");
  cursorCtx = cursorCanvas.getContext("2d");

  function _drawCursorTooltip(clientX, clientY, caseX, caseY) {
    const xR = Math.round(caseX * 100) / 100;
    const yR = Math.round(caseY * 100) / 100;
    const text = `x: ${xR}mm, y: ${yR}mm`;

    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);

    cursorCtx.font = "10px sans-serif";
    const textW = cursorCtx.measureText(text).width;
    const textH = 10;
    const pad = 4;

    const rect = cursorCanvas.getBoundingClientRect();
    let bx = clientX - rect.left + 14;
    let by = clientY - rect.top - textH - pad * 2 - 4;

    if (bx + textW + pad * 2 > cursorCanvas.width) {
      bx = clientX - rect.left - textW - pad * 2 - 14;
    }
    if (by < 0) {
      by = clientY - rect.top + 14;
    }

    cursorCtx.fillStyle = "rgba(20, 20, 20, 0.72)";
    cursorCtx.fillRect(bx - pad, by - pad, textW + pad * 2, textH + pad * 2);

    cursorCtx.fillStyle = "rgba(255, 255, 255, 0.92)";
    cursorCtx.fillText(text, bx, by + textH);
  }

  canvas.addEventListener("mousemove", (e) => {
    if (activeView !== "2d" || active2dSubview !== "canvas") return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = getCaseCoords(e.clientX - rect.left, e.clientY - rect.top);
    _drawCursorTooltip(e.clientX, e.clientY, x, y);
  });

  canvas.addEventListener("mouseleave", () => {
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  });

  canvas.addEventListener("click", (e) => {
    if (activeView !== "2d" || active2dSubview !== "canvas") return;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    const { x, y } = getCaseCoords(canvasX, canvasY);

    const xR = Math.round(x * 100) / 100;
    const yR = Math.round(y * 100) / 100;
    navigator.clipboard.writeText(`{x: ${xR}, y: ${yR}}`);
  });

  svgCanvas.addEventListener("mousemove", (e) => {
    if (activeView !== "2d" || active2dSubview !== "svg") return;
    const rect = svgCanvas.getBoundingClientRect();
    const { x, y } = getCaseCoordsFromSvg(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    _drawCursorTooltip(e.clientX, e.clientY, x, y);
  });

  svgCanvas.addEventListener("mouseleave", () => {
    cursorCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
  });

  const cp = initControlPanel({
    onDraw: draw,
    onViewChange: setActiveView,
    onSubviewChange: setActive2dSubview,
  });
  _setSubviewToggleVisible = cp.setSubviewToggleVisible;
  initInfoPanel();

  const resizeObserver = new ResizeObserver(() => {
    resizeAllCanvases();
  });
  resizeObserver.observe(canvasDiv);
}

function initVersionDisplay() {
  const versionTextEl = document.getElementById("version-text");
  const popupVersionTextEl = document.getElementById("popup-version-text");

  if (versionTextEl && packageJson.version) {
    versionTextEl.textContent = packageJson.version;
  }

  if (popupVersionTextEl && packageJson.version) {
    popupVersionTextEl.textContent = packageJson.version;
  }
}

function initVersionPopup() {
  const popup = document.getElementById("version-popup");
  const closeBtn = document.getElementById("popup-close-btn");
  const currentVersion = packageJson.version;

  const seenVersion = localStorage.getItem("diy-eurorack-planner-version");
  const shouldShowPopup = seenVersion !== currentVersion;

  if (popup) {
    if (shouldShowPopup) {
      popup.classList.remove("hidden");
    } else {
      popup.classList.add("hidden");
    }
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (popup) {
        popup.classList.add("hidden");
        localStorage.setItem("diy-eurorack-planner-version", currentVersion);
      }
    });
  }

  if (popup) {
    popup.addEventListener("click", (event) => {
      if (event.target === popup) {
        popup.classList.add("hidden");
        localStorage.setItem("diy-eurorack-planner-version", currentVersion);
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      popup &&
      !popup.classList.contains("hidden")
    ) {
      popup.classList.add("hidden");
      localStorage.setItem("diy-eurorack-planner-version", currentVersion);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initVersionDisplay();
  initVersionPopup();
  init();
});
