import { oneUFormats, DEFAULTS, HP_TO_MM } from "./constants.js";

class AppState {
  constructor() {
    this.reset();
  }

  reset() {
    this.rowCounts = [...DEFAULTS.rowCounts];
    this.rowCount = DEFAULTS.rowCount;
    this.rowAngles = [...DEFAULTS.rowAngles];
    this.rowIs1U = [false, false, false];
    this.defaultAngle = DEFAULTS.defaultAngle;
    this.selected1UFormat = "intellijel";

    this.actualPanelHeight = DEFAULTS.actualPanelHeight;
    this.actual1UPanelHeight = DEFAULTS.actual1UPanelHeight;
    this.actualRailSeparation = DEFAULTS.actualRailSeparation;
    this.actual1URailSeparation = DEFAULTS.actual1URailSeparation;
    this.actualRailDepth = DEFAULTS.actualRailDepth;
    this.actualPanelDepth = DEFAULTS.actualPanelDepth;
    this.useStaticRise = false;
    this.caseMaterialThickness = DEFAULTS.caseMaterialThickness;
    this.flattenTopShelf = false;
    this.caseWidthHP = DEFAULTS.caseWidthHP;
    this.caseWidth = HP_TO_MM * this.caseWidthHP;
    this.caseWidthFull = this.caseWidth + 2 * this.caseMaterialThickness;

    this.pxPerCm = 400 / this.actualPanelHeight;
    this.panels = [];
    this.viewScale = 1; // Auto-calculated scale to fit canvas
  }

  get panelHeight() {
    return this.actualPanelHeight * this.pxPerCm;
  }

  get heightRatio() {
    return this.actualPanelHeight / this.panelHeight;
  }

  setHpWidth(value) {
    this.caseWidthHP = value;
    this.caseWidth = HP_TO_MM * this.caseWidthHP;
    this.caseWidthFull = this.caseWidth + 2 * this.caseMaterialThickness;
  }

  getPanelHeightForRow(rowIndex) {
    if (this.rowIs1U[rowIndex]) {
      return oneUFormats[this.selected1UFormat].height;
    }
    return this.actualPanelHeight;
  }

  getRailSeparationForRow(rowIndex) {
    if (this.rowIs1U[rowIndex]) {
      return oneUFormats[this.selected1UFormat].railSeparation;
    }
    return this.actualRailSeparation;
  }

  getActualRowAngle(r) {
    if (r === undefined) {
      r = this.rowAngles.length;
    }
    return this.rowAngles.reduce((sum, cur, i) => {
      if (i <= r) {
        sum += cur;
      }
      return sum;
    }, 0);
  }
}

export const state = new AppState();
