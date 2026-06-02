import { FloatingPanel } from './floating-panel.js';
import { state } from './state.js';
import { oneUFormats } from './constants.js';
import {
  resetRowControls,
  setDrawCallback,
  setupHpWidthInput,
} from './ui.js';
import { downloadDXF, downloadSVG } from './export.js';

export function initControlPanel({ onDraw, onViewChange }) {
  setDrawCallback(onDraw);

  const panel = new FloatingPanel({
    id: 'controls',
    title: 'Controls',
    initialPosition: { top: 20, left: 20 },
    width: 320,
  });

  _buildContent(panel.contentEl, onDraw, onViewChange);
  panel.appendTo(document.body);

  resetRowControls(state.rowCount);
  setupHpWidthInput();
}

function _buildContent(contentEl, onDraw, onViewChange) {
  // Row 1: 2D / 3D view toggle (full width)
  const viewRow = _mkRow();
  const viewToggle = _mkToggle('view-toggle', 'Side View', '3D View');
  viewToggle.addEventListener('click', () => {
    const is3d = viewToggle.classList.toggle('active');
    onViewChange(is3d ? '3d' : '2d');
  });
  viewRow.appendChild(viewToggle);
  contentEl.appendChild(viewRow);

  contentEl.appendChild(_mkDivider());

  // Row 2: Material thickness | Case HP width
  const matRow = _mkRow('fp-row-2col');

  const matCell = _mkCell();
  matCell.appendChild(_mkLabel('Material'));
  const matInput = _mkNumberInput('material-thickness', state.caseMaterialThickness, '70px');
  matInput.addEventListener('input', (e) => {
    setTimeout(() => {
      state.caseMaterialThickness = parseFloat(e.target.value) || 0;
      onDraw();
    }, 0);
  });
  matCell.appendChild(matInput);
  matCell.appendChild(_mkUnit('mm'));

  const hpCell = _mkCell();
  hpCell.appendChild(_mkLabel('Width'));
  // Event listener managed by setupHpWidthInput() to avoid duplicating readout logic
  const hpInput = _mkNumberInput('hp-width-input', state.caseWidthHP, '70px');
  hpCell.appendChild(hpInput);
  hpCell.appendChild(_mkUnit('hp'));

  matRow.appendChild(matCell);
  matRow.appendChild(hpCell);
  contentEl.appendChild(matRow);

  // Row 3: Flatten top shelf (full width)
  const flattenRow = _mkRow();
  const flattenLabel = document.createElement('label');
  const flattenCb = document.createElement('input');
  flattenCb.type = 'checkbox';
  flattenCb.id = 'flatten-top-shelf';
  flattenCb.checked = state.flattenTopShelf;
  flattenCb.addEventListener('change', (e) => {
    state.flattenTopShelf = e.target.checked;
    onDraw();
  });
  flattenLabel.appendChild(flattenCb);
  flattenLabel.appendChild(document.createTextNode(' Flatten top shelf'));
  flattenRow.appendChild(flattenLabel);
  contentEl.appendChild(flattenRow);

  // Row 4: Bottom depth | Back wall depth
  const depthRow = _mkRow('fp-row-2col');

  const depthCell = _mkCell();
  depthCell.appendChild(_mkLabel('Btm depth'));
  const depthInput = _mkNumberInput('the-input-depth', state.actualPanelDepth, '48px');
  const onDepthChange = (e) => setTimeout(() => {
    state.actualPanelDepth = parseFloat(e.target.value) || 0;
    onDraw();
  }, 0);
  depthInput.addEventListener('input', onDepthChange);
  depthCell.appendChild(depthInput);
  depthCell.appendChild(_mkUnit('mm'));

  const backCell = _mkCell();
  backCell.appendChild(_mkLabel('Back wall'));
  const backInput = _mkNumberInput('the-input-back-depth', state.actualPanelBackDepth, '48px');
  const onBackChange = (e) => setTimeout(() => {
    state.actualPanelBackDepth = parseFloat(e.target.value) || 0;
    onDraw();
  }, 0);
  backInput.addEventListener('input', onBackChange);
  backCell.appendChild(backInput);
  backCell.appendChild(_mkUnit('mm'));

  depthRow.appendChild(depthCell);
  depthRow.appendChild(backCell);
  contentEl.appendChild(depthRow);

  contentEl.appendChild(_mkDivider());

  // Row 5: Row count | 1U format toggle
  const rowsRow = _mkRow('fp-row-2col');

  const rowsCell = _mkCell();
  rowsCell.appendChild(_mkLabel('Rows'));
  const rowCountSelect = document.createElement('select');
  rowCountSelect.id = 'rowCount';
  state.rowCounts.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    opt.selected = c === state.rowCount;
    rowCountSelect.appendChild(opt);
  });
  rowCountSelect.addEventListener('change', (e) => {
    state.rowCount = parseInt(e.target.value, 10);
    resetRowControls(state.rowCount);
    onDraw();
  });
  rowsCell.appendChild(rowCountSelect);

  const oneUCell = _mkCell();
  const oneUToggle = _mkToggle('oneU-format-toggle', 'Intellijel', 'Pulp Logic', 'toggle-switch-sm');
  // Start disabled (enabled by update1UFormatToggle when a row is 1U)
  oneUToggle.classList.add('disabled');
  oneUToggle.addEventListener('click', () => {
    if (oneUToggle.classList.contains('disabled')) return;
    const isPulpLogic = oneUToggle.classList.toggle('active');
    state.selected1UFormat = isPulpLogic ? 'pulplogic' : 'intellijel';
    state.actual1UPanelHeight = oneUFormats[state.selected1UFormat].height;
    state.actual1URailSeparation = oneUFormats[state.selected1UFormat].railSeparation;
    onDraw();
  });
  oneUCell.appendChild(oneUToggle);

  rowsRow.appendChild(rowsCell);
  rowsRow.appendChild(oneUCell);
  contentEl.appendChild(rowsRow);

  // Row inputs container — populated by resetRowControls()
  const rowInputsContainer = document.createElement('div');
  rowInputsContainer.id = 'row-inputs';
  contentEl.appendChild(rowInputsContainer);

  // Hidden calc-rise input (kept for state compatibility, feature not yet exposed)
  const calcRiseInput = document.createElement('input');
  calcRiseInput.type = 'checkbox';
  calcRiseInput.id = 'calc-rise';
  calcRiseInput.checked = !state.useStaticRise;
  calcRiseInput.style.display = 'none';
  calcRiseInput.addEventListener('change', (e) => {
    setTimeout(() => {
      state.useStaticRise = !e.target.checked;
      onDraw();
    }, 0);
  });
  contentEl.appendChild(calcRiseInput);

  // Export buttons
  contentEl.appendChild(_mkDivider());

  const exportRow = _mkRow();
  exportRow.style.gap = '8px';

  const svgBtn = document.createElement('button');
  svgBtn.type = 'button';
  svgBtn.className = 'fp-export-btn';
  svgBtn.textContent = 'Download SVG';
  svgBtn.addEventListener('click', () => downloadSVG());

  const dxfBtn = document.createElement('button');
  dxfBtn.type = 'button';
  dxfBtn.className = 'fp-export-btn';
  dxfBtn.textContent = 'Download DXF';
  dxfBtn.addEventListener('click', () => downloadDXF());

  exportRow.appendChild(svgBtn);
  exportRow.appendChild(dxfBtn);
  contentEl.appendChild(exportRow);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function _mkToggle(id, leftLabel, rightLabel, extraClass = '') {
  const el = document.createElement('div');
  el.className = `toggle-switch${extraClass ? ' ' + extraClass : ''}`;
  el.id = id;

  const left = document.createElement('span');
  left.className = 'toggle-label-left';
  left.textContent = leftLabel;

  const trackContainer = document.createElement('div');
  trackContainer.className = 'toggle-track-container';
  const track = document.createElement('div');
  track.className = 'toggle-track';
  trackContainer.appendChild(track);
  const thumb = document.createElement('div');
  thumb.className = 'toggle-thumb';
  trackContainer.appendChild(thumb);

  const right = document.createElement('span');
  right.className = 'toggle-label-right';
  right.textContent = rightLabel;

  el.appendChild(left);
  el.appendChild(trackContainer);
  el.appendChild(right);
  return el;
}

function _mkRow(extraClass = '') {
  const div = document.createElement('div');
  div.className = `fp-row${extraClass ? ' ' + extraClass : ''}`;
  return div;
}

function _mkCell() {
  const div = document.createElement('div');
  div.className = 'fp-cell';
  return div;
}

function _mkLabel(text) {
  const span = document.createElement('span');
  span.className = 'fp-label';
  span.textContent = text;
  return span;
}

function _mkUnit(text) {
  const span = document.createElement('span');
  span.className = 'input-span unit';
  span.textContent = text;
  return span;
}

function _mkNumberInput(id, value, width = '60px') {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.id = id;
  inp.value = value;
  inp.style.width = width;
  return inp;
}

function _mkDivider() {
  const div = document.createElement('div');
  div.className = 'fp-divider';
  return div;
}
