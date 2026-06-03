import { FloatingPanel } from "./floating-panel.js";
import { actualDistance, roundToPlace } from "./geometry.js";

let _cabinetDimsEl = null;
let _cutPanelsEl = null;
let _outlineCoordsEl = null;
let _railScrewsEl = null;

export function initInfoPanel() {
  const panel = new FloatingPanel({
    id: "info",
    title: "Case Info",
    initialPosition: { top: 20, left: 320 },
    width: 320,
  });

  _buildContent(panel.contentEl);
  panel.appendTo(document.body);
}

export function updateInfoPanel(
  width,
  height,
  outlinePoints,
  railScrewCoords,
  cutPanels,
  caseBottomWidth
) {
  if (!_cabinetDimsEl) return;

  _cabinetDimsEl.textContent =
    actualDistance(caseBottomWidth, true) +
    " × " +
    actualDistance(height, true) +
    " × " +
    actualDistance(width, true);

  if (_cutPanelsEl) {
    _cutPanelsEl.innerHTML = "";
    if (cutPanels && cutPanels.length > 0) {
      cutPanels.forEach((panel) => {
        const row = document.createElement("div");
        row.className = "fp-row";
        row.style.justifyContent = "space-between";
        const nameSpan = document.createElement("span");
        nameSpan.className = "fp-label";
        nameSpan.textContent = panel.name + ":";
        const valSpan = document.createElement("span");
        valSpan.style.fontWeight = "bold";
        valSpan.textContent =
          roundToPlace(panel.height, 2) +
          "mm × " +
          roundToPlace(panel.width, 2) +
          "mm";
        row.appendChild(nameSpan);
        row.appendChild(valSpan);
        _cutPanelsEl.appendChild(row);
      });
    } else {
      const empty = document.createElement("span");
      empty.className = "fp-label";
      empty.textContent = "—";
      _cutPanelsEl.appendChild(empty);
    }
  }

  if (_outlineCoordsEl) {
    const text = _processCoords(outlinePoints);
    _outlineCoordsEl.value = text;
    _outlineCoordsEl.rows = _calcRows(text);
  }

  if (_railScrewsEl) {
    const text = _processRailScrewCoords(railScrewCoords);
    _railScrewsEl.value = text;
    _railScrewsEl.rows = _calcRows(text);
  }
}

function _buildContent(contentEl) {
  // Cabinet dimensions
  contentEl.appendChild(_mkSectionTitle("Cabinet dimensions (W × H × D)"));
  const dimsRow = _mkRow();
  _cabinetDimsEl = document.createElement("span");
  _cabinetDimsEl.style.fontWeight = "bold";
  _cabinetDimsEl.textContent = "—";
  dimsRow.appendChild(_cabinetDimsEl);
  contentEl.appendChild(dimsRow);

  contentEl.appendChild(_mkDivider());

  // Cut panel dimensions
  contentEl.appendChild(_mkSectionTitle("Cut panel dimensions"));
  _cutPanelsEl = document.createElement("div");
  contentEl.appendChild(_cutPanelsEl);

  contentEl.appendChild(_mkDivider());

  // Outline coordinates
  contentEl.appendChild(_mkSectionTitle("Side panel outline coordinates"));
  _outlineCoordsEl = _mkTextarea("info-outline-coords");
  contentEl.appendChild(_outlineCoordsEl);

  contentEl.appendChild(_mkDivider());

  // Rail screw coordinates
  contentEl.appendChild(_mkSectionTitle("Rail screw coordinates"));
  _railScrewsEl = _mkTextarea("info-rail-screws");
  contentEl.appendChild(_railScrewsEl);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _mkSectionTitle(content) {
  const div = document.createElement("div");
  div.className = "fp-section-title";
  div.textContent = content;
  return div;
}

function _mkRow(extraClass = "") {
  const div = document.createElement("div");
  div.className = `fp-row${extraClass ? " " + extraClass : ""}`;
  return div;
}

function _mkDivider() {
  const div = document.createElement("div");
  div.className = "fp-divider";
  return div;
}

function _mkTextarea(id) {
  const ta = document.createElement("textarea");
  ta.id = id;
  ta.disabled = true;
  ta.rows = 2;
  ta.style.width = "100%";
  ta.style.boxSizing = "border-box";
  ta.style.resize = "none";
  return ta;
}

function _processCoords(outlinePoints) {
  const ops = outlinePoints.slice(0);
  return ops
    .map((p) => `(${roundToPlace(p.x, 2)}mm, ${roundToPlace(p.y, 2)}mm)`)
    .join(", ");
}

function _processRailScrewCoords(railScrewCoords) {
  const rcs = railScrewCoords.slice(0);
  const s = [];
  while (rcs.length > 0) {
    s.push(
      `(${roundToPlace(rcs.shift(), 2)}mm, ${roundToPlace(rcs.shift(), 2)}mm)`
    );
  }
  return s.join(", ");
}

function _calcRows(text) {
  const charsPerRow = 44;
  const estimated = Math.ceil(text.length / charsPerRow);
  return Math.max(2, Math.min(8, estimated));
}
