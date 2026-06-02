export const HP_TO_MM = 5.08;

// From Intellijel 1U Technical Specifications, for lipped rails with nut channel aligned
// with drill hole.
const MODEL_3U_ROW_HEIGHT = 133.35;
const MODEL_3U_PANEL_HEIGHT = 128.5; // 4.85mm less than the row height
const MODEL_3U_HOLE_SPACING = 122.5;
const MODEL_1U_INTELLIJEL_ROW_HEIGHT = 44.45;
const MODEL_1U_INTELLIJEL_PANEL_HEIGHT = 39.65; // 4.8mm less than the row height
const MODEL_1U_INTELLIJEL_HOLE_SPACING = 33.65;

// From PulpLogic_Standard-Tile-Dims-1024x624. hole spacing here refers to the panel holes
// from this diagram where the panel is mounted to the rail. The row height here refers to
// the row height as deduced for lipped rails based on numbers above. 4.85
const MODEL_1U_PULP_LOGIC_PANEL_HEIGHT = 43.18; // 1.700 inches to mm
const MODEL_1U_PULP_LOGIC_HOLE_SPACING = 37.1856; // (1.700 - 2 * 0.118) inches to mm
const MODEL_1U_PULP_LOGIC_ROW_HEIGHT = 47.98; //MODEL_1U_PULP_LOGIC_PANEL_HEIGHT + 4.8

const RAIL_PADDING = 1; // padding on either side of rail (2mm between 2 rows) (needed)?

export const oneUFormats = {
  intellijel: {
    name: "Intellijel",
    height: MODEL_1U_INTELLIJEL_ROW_HEIGHT,
    railSeparation: MODEL_1U_INTELLIJEL_HOLE_SPACING,
  },
  pulplogic: {
    name: "Pulp Logic",
    height: MODEL_1U_PULP_LOGIC_ROW_HEIGHT,
    railSeparation: MODEL_1U_PULP_LOGIC_HOLE_SPACING,
  },
};

export const DEFAULTS = {
  rowCounts: [1, 2, 3, 4, 5],
  rowCount: 3,
  rowAngles: [5, 10, 10],
  default1URows: [2], // Top row is 1U by default
  defaultAngle: 5,
  // Note, this actualPanelHeight is actually top of top rail to bottom of bottom rail for 3U.
  actualPanelHeight: MODEL_3U_ROW_HEIGHT,
  actual1UPanelHeight: MODEL_1U_INTELLIJEL_ROW_HEIGHT,
  actualRailSeparation: MODEL_3U_HOLE_SPACING,
  actual1URailSeparation: MODEL_1U_INTELLIJEL_HOLE_SPACING,
  actualRailDepth: 14,
  actualPanelDepth: 60,
  actualPanelBackDepth: 40,
  caseMaterialThickness: 3.175, // 1/8"
  caseWidthHP: 84,
};

export const COLORS = {
  drillHole: "#a33",
  indicator: "#888888",
  outline: "#999999",
};

export const DRILL_HOLE_2D_RADIUS = 3;
export const BOX_JOINT_DEFAULT_TAB_WIDTH = 25;
export const BOX_JOINT_MINIMUM_TAB_WIDTH = 10 * 0.635; // quarter inch is minimum for now


/*
// From synthrotek rails data sheet:
const SYNTHROTEK_3U_RAIL_HOLE_SPACING = 120.42; // in inches: 4.741"
const SYNTHROTEK_1U_INTELLIJEL_HOLE_SPACING = 31.75; // in mm: 1.25"
const SYNTHROTEK_1U_PULP_LOGIC_HOLE_SPACING = 35.2806 ; // in mm: 1.389"

const ZRAILS_3U_RAIL_HOLE_SPACING = 122.5; // in mm: 4.823"
const ZRAILS_1U_INTELLIJEL_HOLE_SPACING = 29.67
const ZRAILS_1U_PULP_LOGIC_HOLE_SPACING = 33.2006








const ZRAILS_RAIL_DEPTH = 23.8; // in mm: 0.937"
const ZRAILS_1U_INTELLIJEL_DEPTH = 44.45; // in mm: 1.75"
const ZRAILS_1U_PULP_LOGIC_DEPTH = 43.18; // in mm: 1.7"

const ZRAILS_RAIL_HEIGHT = 128.5; // in mm: 5.06"
const ZRAILS_1U_INTELLIJEL_HEIGHT = 44.45; // in mm: 1.75"
const ZRAILS_1U_PULP_LOGIC_HEIGHT = 43.18; // in mm: 1.7"
*/