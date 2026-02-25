import { state } from "./state.js";
import { oneUFormats, HP_TO_MM } from "./constants.js";
import { actualDistance, roundToPlace } from "./geometry.js";
import { downloadSVG, downloadDXF, setIncludeCutPanels } from "./export.js";

let drawSideCallback = null;

export function setDrawCallback(callback) {
  drawSideCallback = callback;
}

function triggerRedraw() {
  if (drawSideCallback) {
    drawSideCallback();
  }
}

export function createRowInput(i, value) {
  const inputIdPrefix = "angle-";
  const rowInputsEl = document.getElementById("row-inputs");
  const el = document.createElement("span");
  el.className = "input-span";
  el.innerHTML = `Row ${i + 1} angle:&nbsp;`;

  const inp = document.createElement("input");
  inp.value = value;
  inp.id = `${inputIdPrefix}${i}`;
  const onChange = (event) => {
    setTimeout(() => {
      const inputIndex = parseInt(event.target.id.split(inputIdPrefix)[1], 10);
      state.rowAngles[inputIndex] = parseFloat(event.target.value, 10);
      triggerRedraw();
    }, 0);
  };
  inp.addEventListener("input", onChange);
  inp.addEventListener("change", onChange);
  inp.addEventListener("keypress", onChange);

  el.appendChild(inp);

  const deg = document.createElement("span");
  deg.className = "input-span unit";
  deg.innerHTML = "degrees";
  el.appendChild(deg);

  rowInputsEl.appendChild(el);

  return inp;
}

export function reset1UCheckboxes(c) {
  const container = document.getElementById("row-1u-checkboxes");
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  state.rowIs1U = state.rowIs1U.slice(0, c);
  while (state.rowIs1U.length < c) {
    state.rowIs1U.push(false);
  }

  for (let i = 0; i < c; i++) {
    const label = document.createElement("label");
    label.className = "row-1u-label";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `row-1u-${i}`;
    checkbox.checked = state.rowIs1U[i];
    checkbox.addEventListener("change", (event) => {
      state.rowIs1U[i] = event.target.checked;
      update1UFormatVisibility();
      triggerRedraw();
    });

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(`${i + 1}`));
    container.appendChild(label);
  }

  update1UFormatVisibility();
}

export function update1UFormatVisibility() {
  const formatContainer = document.getElementById("oneU-format-container");
  const hasAny1U = state.rowIs1U.some((is1U) => is1U);
  formatContainer.style.display = hasAny1U ? "inline" : "none";
}

export function resetRowInputs(c) {
  const rowInputsEl = document.getElementById("row-inputs");
  while (rowInputsEl.firstChild) {
    rowInputsEl.removeChild(rowInputsEl.firstChild);
  }
  state.rowAngles = state.rowAngles.slice(0, c);
  while (state.rowAngles.length < c) {
    state.rowAngles.push(state.defaultAngle);
  }
  for (let i = 0; i < state.rowCount; i++) {
    createRowInput(i, state.rowAngles[i]);
  }

  reset1UCheckboxes(c);
}

export function setupHpWidthInput() {
  const hpWidthInput = document.getElementById("hp-width-input");
  const hpWidthMmDisplay = document.getElementById("hp-width-mm");

  if (hpWidthInput && !hpWidthInput.hasAttribute("data-listener-added")) {
    hpWidthInput.setAttribute("data-listener-added", "true");
    hpWidthInput.addEventListener("input", (event) => {
      state.caseWidthHP = parseFloat(event.target.value) || 0;
      hpWidthMmDisplay.value = roundToPlace(state.caseWidthHP * HP_TO_MM, 2);
    });
  }
}

export function writeSummary(width, height, outlinePoints, railScrewCoords, cutPanels) {
  const cabinetInfo = [
    "Cabinet depth and height: ",
    actualDistance(width, true) + " x " + actualDistance(height, true),
  ];
  const has1URows = state.rowIs1U.some((is1U) => is1U);
  const oneUHeight = oneUFormats[state.selected1UFormat].height;
  let panelHeightInfo;
  if (has1URows) {
    panelHeightInfo = [
      "Panel heights: ",
      `3U: ${actualDistance(state.actualPanelHeight, true)}, 1U (${oneUFormats[state.selected1UFormat].name}): ${actualDistance(oneUHeight, true)}`,
    ];
  } else {
    panelHeightInfo = [
      "Panel height used: ",
      actualDistance(state.actualPanelHeight, true),
    ];
  }
  const panelDepthInfo = [
    "Panel depth used: ",
    actualDistance(state.actualPanelDepth, true),
  ];
  const railDepthInfo = [
    "Rails depth inset: ",
    actualDistance(state.actualRailDepth, true),
  ];
  const railSpacingInfo = [
    "Rail screw spacing*: ",
    actualDistance(state.actualRailSeparation, true),
  ];
  const totalRowtation = [
    `Top row absolute rotation: `,
    `${state.getActualRowAngle()}`,
  ];
  const footnote = [
    "*Note: rail spacing based on the measurements provided by " +
      '<a href="http://www.musicradar.com/tuition/tech/how-to-build-your-own-cardboard-' +
      "eurorack-modular-case-625196\">Future Music's cardboard DIY</a> " +
      "case using TipTop Audio Z-Rails.",
    "",
  ];
  const info = [
    cabinetInfo,
    panelHeightInfo,
    panelDepthInfo,
    railDepthInfo,
    railSpacingInfo,
    totalRowtation,
    footnote,
  ];
  document.getElementById("summary-div").innerHTML = info
    .map((a) => a[0] + "<b>" + a[1] + "</b>")
    .join("<br/>");

  function processCoords(outlinePoints) {
    const ops = outlinePoints.slice(0);
    const s = [];
    while (ops.length > 0) {
      const x = `${roundToPlace(ops.shift(), 1)}mm`;
      const y = `${roundToPlace(ops.shift(), 1)}mm`;
      if (typeof ops[0] !== "number") {
        ops.shift();
      } else {
        s.push(`(${x}, ${y})`);
      }
    }
    return s.join(", ");
  }

  function processRailScrewCoords(railScrewCoords) {
    const rcs = railScrewCoords.slice(0);
    const s = [];
    while (rcs.length > 0) {
      s.push(
        `(${roundToPlace(rcs.shift(), 1)}mm, ${roundToPlace(rcs.shift(), 1)}mm)`
      );
    }
    return s.join(", ");
  }

  const info2 = [
    ["Coordinates for outline: ", processCoords(outlinePoints)],
    ["Coordinates for rail screws: ", processRailScrewCoords(railScrewCoords)],
  ];

  let summaryHtml = info2
    .map((a) => a[0] + "<b>" + a[1] + "</b>")
    .join("<br/>");

  if (cutPanels && cutPanels.length > 0) {
    summaryHtml += "<br/><br/><b>Cut panel dimensions (depth x width):</b><br/>";
    cutPanels.forEach((panel) => {
      summaryHtml += `&nbsp;&nbsp;${panel.name}: <b>${roundToPlace(panel.height, 1)}mm x ${roundToPlace(panel.width, 1)}mm</b><br/>`;
    });
  }

  summaryHtml +=
    "<br/>How wide should the front, bottom, and back panels be based on my HP requirement?&nbsp;";
  summaryHtml +=
    '<input type="number" id="hp-width-input" value="' +
    state.caseWidthHP +
    '" style="width: 60px;" />';
  summaryHtml += '&nbsp;<span class="input-span unit">hp</span>';
  summaryHtml +=
    '&nbsp;&nbsp;<input type="text" id="hp-width-mm" value="' +
    roundToPlace(state.caseWidthHP * HP_TO_MM, 2) +
    '" readonly style="width: 80px; background-color: #eee;" />';
  summaryHtml += '&nbsp;<span class="input-span unit">mm</span>';

  summaryHtml += '<br/><br/><div class="export-options">';
  summaryHtml += '<label><input type="checkbox" id="include-cut-panels" checked /> Include front, bottom, back, and top panels in export</label>';
  summaryHtml += '</div>';
  summaryHtml += '<br/><div class="export-buttons">';
  summaryHtml += '<button type="button" id="download-svg-btn">Download SVG</button>';
  summaryHtml += '&nbsp;&nbsp;<button type="button" id="download-dxf-btn">Download DXF</button>';
  summaryHtml += "</div>";

  document.getElementById("summary-div-2").innerHTML = summaryHtml;

  setupHpWidthInput();
  setupExportButtons();
}

function setupExportButtons() {
  const svgBtn = document.getElementById("download-svg-btn");
  const dxfBtn = document.getElementById("download-dxf-btn");
  const includeCutPanelsCb = document.getElementById("include-cut-panels");

  if (svgBtn) {
    svgBtn.addEventListener("click", () => {
      setIncludeCutPanels(includeCutPanelsCb.checked);
      downloadSVG();
    });
  }
  if (dxfBtn) {
    dxfBtn.addEventListener("click", () => {
      setIncludeCutPanels(includeCutPanelsCb.checked);
      downloadDXF();
    });
  }
}
