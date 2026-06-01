export const HP_TO_MM = 5.08;

const SPEC_3U_HEIGHT = 133.35; // (5.25in)
const SPEC_1U_INTELLIJEL_HEIGHT = 44.45; // (1.5625in)
const SPEC_3U_PANEL_HEIGHT = 128.5;
const SPEC_1U_INTELLIJEL_PANEL_HEIGHT = 39.65;
const SPEC_1U_PULP_LOGIC_PANEL_HEIGHT = 43.18;
// Basing this on panel intellijel 1u panel height minus the 1U spec height.
const SPEC_1U_PULP_LOGIC_HEIGHT = 4.8 + SPEC_1U_PULP_LOGIC_PANEL_HEIGHT;
// This is based on the Future Music guide, and may apply only to TipTop Audio Z-Rails.
const SPEC_3U_RAIL_HOLE_SPACING = 123;
const SPEC_HEIGHT_TO_HOLE_SPACING_DIFF = 10.35; // 3U_SPEC_HEIGHT - 3U_SPEC_RAIL_HOLE_SPACING;
const SPEC_1U_INTELLIJEL_RAIL_HOLE_SPACING =
  SPEC_1U_INTELLIJEL_HEIGHT - SPEC_HEIGHT_TO_HOLE_SPACING_DIFF;
const SPEC_1U_PULP_LOGIC_RAIL_HOLE_SPACING =
  SPEC_1U_PULP_LOGIC_HEIGHT - SPEC_HEIGHT_TO_HOLE_SPACING_DIFF;

export const oneUFormats = {
  intellijel: {
    name: "Intellijel",
    height: SPEC_1U_INTELLIJEL_HEIGHT,
    railSeparation: SPEC_1U_INTELLIJEL_RAIL_HOLE_SPACING,
  },
  pulplogic: {
    name: "Pulp Logic",
    height: SPEC_1U_PULP_LOGIC_HEIGHT,
    railSeparation: SPEC_1U_PULP_LOGIC_RAIL_HOLE_SPACING,
  },
};

export const DEFAULTS = {
  rowCounts: [1, 2, 3, 4, 5],
  rowCount: 3,
  rowAngles: [5, 10, 10],
  default1URows: [2], // Top row is 1U by default
  defaultAngle: 5,
  // Note, this actualPanelHeight is actually top of top rail to bottom of bottom rail for 3U.
  actualPanelHeight: SPEC_3U_HEIGHT,
  actual1UPanelHeight: SPEC_1U_INTELLIJEL_HEIGHT,
  actualRailSeparation: SPEC_3U_RAIL_HOLE_SPACING,
  actual1URailSeparation: SPEC_1U_INTELLIJEL_RAIL_HOLE_SPACING,
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