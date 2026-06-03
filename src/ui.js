import { HP_TO_MM, oneUFormats } from "./constants.js";
import { actualDistance, roundToPlace } from "./geometry.js";
import { state } from "./state.js";

let drawSideCallback = null;

export function setDrawCallback(callback) {
  drawSideCallback = callback;
}

function triggerRedraw() {
  if (drawSideCallback) {
    drawSideCallback();
  }
}

// Rebuild all per-row controls (angle input + 1U checkbox) for `c` rows.
// Renders into #row-inputs inside the floating control panel.
export function resetRowControls(c) {
  const rowInputsEl = document.getElementById("row-inputs");
  if (!rowInputsEl) return;

  while (rowInputsEl.firstChild) {
    rowInputsEl.removeChild(rowInputsEl.firstChild);
  }

  state.rowAngles = state.rowAngles.slice(0, c);
  while (state.rowAngles.length < c) {
    state.rowAngles.push(state.defaultAngle);
  }

  state.rowIs1U = state.rowIs1U.slice(0, c);
  while (state.rowIs1U.length < c) {
    state.rowIs1U.push(false);
  }

  for (let i = 0; i < c; i++) {
    const rowEl = document.createElement("div");
    rowEl.className = "fp-row fp-row-2col";

    // Left cell: angle input
    const leftCell = document.createElement("div");
    leftCell.className = "fp-cell";

    const rowLabel = document.createElement("span");
    rowLabel.className = "fp-label";
    rowLabel.textContent = `Row ${i + 1}:`;

    const angleInput = document.createElement("input");
    angleInput.type = "number";
    angleInput.value = state.rowAngles[i];
    angleInput.id = `angle-${i}`;
    angleInput.style.width = "48px";

    const onChange = (event) => {
      setTimeout(() => {
        state.rowAngles[i] = parseFloat(event.target.value) || 0;
        triggerRedraw();
      }, 0);
    };
    angleInput.addEventListener("input", onChange);
    angleInput.addEventListener("change", onChange);

    const degUnit = document.createElement("span");
    degUnit.className = "input-span unit";
    degUnit.textContent = "°";

    leftCell.appendChild(rowLabel);
    leftCell.appendChild(angleInput);
    leftCell.appendChild(degUnit);

    // Right cell: 1U checkbox
    const rightCell = document.createElement("div");
    rightCell.className = "fp-cell";

    const checkLabel = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `row-1u-${i}`;
    checkbox.checked = state.rowIs1U[i];
    checkbox.addEventListener("change", (event) => {
      state.rowIs1U[i] = event.target.checked;
      update1UFormatToggle();
      triggerRedraw();
    });

    checkLabel.appendChild(checkbox);
    checkLabel.appendChild(document.createTextNode(` is 1U`));

    rightCell.appendChild(checkLabel);

    rowEl.appendChild(leftCell);
    rowEl.appendChild(rightCell);
    rowInputsEl.appendChild(rowEl);
  }

  update1UFormatToggle();
}

// Enable/disable the 1U format toggle based on whether any rows are 1U.
// When all rows become non-1U, resets the selection to Intellijel.
export function update1UFormatToggle() {
  const toggleEl = document.getElementById("oneU-format-toggle");
  if (!toggleEl) return;

  const hasAny1U = state.rowIs1U.some((is1U) => is1U);

  if (hasAny1U) {
    toggleEl.classList.remove("disabled");
  } else {
    // Reset to Intellijel when toggle becomes disabled
    if (toggleEl.classList.contains("active")) {
      toggleEl.classList.remove("active");
      state.selected1UFormat = "intellijel";
      state.actual1UPanelHeight = oneUFormats.intellijel.height;
      state.actual1URailSeparation = oneUFormats.intellijel.railSeparation;
    }
    toggleEl.classList.add("disabled");
  }
}

export function updateHpWidthReadouts() {
  const hpWidthMmDisplay = document.getElementById("hp-width-mm");
  const hpWidthMmBottomDisplay = document.getElementById("hp-width-mm-bottom");
  const innerWidth = state.caseWidthHP * HP_TO_MM;
  if (hpWidthMmDisplay) {
    hpWidthMmDisplay.value = roundToPlace(innerWidth, 2);
  }
  if (hpWidthMmBottomDisplay) {
    hpWidthMmBottomDisplay.value = roundToPlace(
      innerWidth + 2 * state.caseMaterialThickness,
      2
    );
  }
}

export function setupHpWidthInput() {
  const hpWidthInput = document.getElementById("hp-width-input");

  if (hpWidthInput && !hpWidthInput.hasAttribute("data-listener-added")) {
    hpWidthInput.setAttribute("data-listener-added", "true");
    hpWidthInput.value = state.caseWidthHP;
    hpWidthInput.addEventListener("input", (event) => {
      state.setHpWidth(parseFloat(event.target.value) || 0);
      updateHpWidthReadouts();
      triggerRedraw();
    });
  }
  updateHpWidthReadouts();
}

export function writeSummary(
  width,
  height,
  outlinePoints,
  railScrewCoords,
  cutPanels, caseBottomWidth,
) {
  const cabinetInfo = [
    "Cabinet width, height, and depth: ",
    actualDistance(caseBottomWidth, true) + " x " + actualDistance(height, true) + " x " + actualDistance(width, true),
  ];

  const info = [
    cabinetInfo,
  ];
  document.getElementById("summary-div").innerHTML = info
    .map((a) => a[0] + "<b>" + a[1] + "</b>")
    .join("<br/>");

  function processCoords(outlinePoints) {
    console.info("processCoords", outlinePoints);
    const ops = outlinePoints.slice(0);
    const s = ops.reduce((acc, p) => {
      acc.push(`(${roundToPlace(p.x, 2)}mm, ${roundToPlace(p.y, 2)}mm)`);
      return acc;
    }, []);
    return s.join(", ");
  }

  function processRailScrewCoords(railScrewCoords) {
    const rcs = railScrewCoords.slice(0);
    const s = [];
    while (rcs.length > 0) {
      s.push(
        `(${roundToPlace(rcs.shift(), 2)}mm, ${roundToPlace(rcs.shift(), 2)}mm)`
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
    summaryHtml +=
      "<br/><br/><b>Cut panel dimensions (depth x width):</b><br/>";
    cutPanels.forEach((panel) => {
      summaryHtml += `&nbsp;&nbsp;${panel.name}: <b>${roundToPlace(panel.height, 2)}mm x ${roundToPlace(panel.width, 2)}mm</b><br/>`;
    });
  }

  document.getElementById("summary-div-2").innerHTML = summaryHtml;

//   setupHpWidthInput();
}
