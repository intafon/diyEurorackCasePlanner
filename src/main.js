import "./style.css";

import { HP_TO_MM, oneUFormats } from "./constants.js";
import {
  buildScene,
  initThreeRenderer,
  resizeThreeCanvas,
  startRenderLoop,
  stopRenderLoop,
} from "./3d-renderer.js";
import { calculateCaseGeometry, rad } from "./geometry.js";
import {
  calculateViewScale,
  drawJointDistanceIndicators,
  drawPanelRailHoles,
  drawPath,
  getCanvas,
  getContext,
  initCanvas,drawAnOutline,
  resetCanvas,
} from "./canvas-renderer.js";
import {
  resetRowInputs,
  setDrawCallback,
  setupHpWidthInput,
  writeSummary,
} from "./ui.js";

import packageJson from "../package.json";
import { state } from "./state.js";

let canvasDiv, canvas, ctx;
let threeCanvas;
let activeView = "2d";

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
  drawJointDistanceIndicators(panels, backWallInside);

  writeSummary(
    maxX,
    maxY,
    outline,
    railScrewCoords,
    cutPanels
  );

  // Redraw the front outline
  drawAnOutline(frontPieceOutline, "#999999", [3, 3]);
  // Redraw the back outline
  drawAnOutline(backPieceOutline, "#999999", [3, 3]);
  // Redraw the shelf/diagonal back outline
  drawAnOutline(shelfPieceOutline, "#999999", [3, 3]);
  // Redraw the base outline
  drawAnOutline(baseBoardOutline, "#999999", [3, 3]);

  if (activeView === "3d") {
    buildScene();
  }
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
    draw2dView();
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
    draw2dView();
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
    draw2dView();
  });

  setDrawCallback(draw2dView);
  resetRowInputs(state.rowCount);

  const oneUFormatRadios = document.querySelectorAll(
    'input[name="oneUFormat"]'
  );
  oneUFormatRadios.forEach((radio) => {
    radio.addEventListener("change", (event) => {
      state.selected1UFormat = event.target.value;
      state.actual1UPanelHeight = oneUFormats[state.selected1UFormat].height;
      state.actual1URailSeparation =
        oneUFormats[state.selected1UFormat].railSeparation;
      draw2dView();
    });
  });

  const inputDepth = document.getElementById("the-input-depth");
  const onModuleDepthChange = (event) => {
    setTimeout(() => {
      state.actualPanelDepth = parseFloat(event.target.value);
      draw2dView();
    }, 0);
  };
  inputDepth.addEventListener("input", onModuleDepthChange);

  const inputBackDepth = document.getElementById("the-input-back-depth");
  const onModuleBackDepthChange = (event) => {
    setTimeout(() => {
      state.actualPanelBackDepth = parseFloat(event.target.value);
      draw2dView();
    }, 0);
  };
  inputBackDepth.addEventListener("input", onModuleBackDepthChange);

  const calcRiseCb = document.getElementById("calc-rise");
  calcRiseCb.checked = !state.useStaticRise;
  const onCalcRiseChange = (event) => {
    setTimeout(() => {
      state.useStaticRise = !event.target.checked;
      draw2dView();
    }, 0);
  };
  calcRiseCb.addEventListener("change", onCalcRiseChange);

  const matThickness = document.getElementById("material-thickness");
  matThickness.value = state.caseMaterialThickness;
  const onMaterialThicknessChange = (event) => {
    setTimeout(() => {
      state.caseMaterialThickness = parseFloat(event.target.value);
      draw2dView();
    }, 0);
  };
  matThickness.addEventListener("input", onMaterialThicknessChange);

  const flattenTopShelfCb = document.getElementById("flatten-top-shelf");
  flattenTopShelfCb.checked = state.flattenTopShelf;
  flattenTopShelfCb.addEventListener("change", (event) => {
    state.flattenTopShelf = event.target.checked;
    draw2dView();
    // if (view === "3d") {
    //  buildScene();
    // // } else {
    // //     drawSide();
    // }
  });

  canvasDiv = document.getElementById("canvas-div");
  canvas = document.getElementById("the-canvas");
  ctx = initCanvas(canvas);

  threeCanvas = document.getElementById("three-canvas");
  initThreeRenderer(threeCanvas);

  inputDepth.value = state.actualPanelDepth;
  inputBackDepth.value = state.actualPanelBackDepth;

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

  // Check if we should show the popup for this version
  const seenVersion = localStorage.getItem("diy-eurorack-planner-version");
  const shouldShowPopup = seenVersion !== currentVersion;

  // Show or hide popup based on version check
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
        // Save the current version to localStorage when popup is closed
        localStorage.setItem("diy-eurorack-planner-version", currentVersion);
      }
    });
  }

  // Close popup when clicking outside the content area
  if (popup) {
    popup.addEventListener("click", (event) => {
      if (event.target === popup) {
        popup.classList.add("hidden");
        // Save the current version to localStorage when popup is closed
        localStorage.setItem("diy-eurorack-planner-version", currentVersion);
      }
    });
  }

  // Close popup with Escape key
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      popup &&
      !popup.classList.contains("hidden")
    ) {
      popup.classList.add("hidden");
      // Save the current version to localStorage when popup is closed
      localStorage.setItem("diy-eurorack-planner-version", currentVersion);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initVersionDisplay();
  initVersionPopup();
  init();
});
