import { state } from "./state.js";
import { HP_TO_MM, BOX_JOINT_DEFAULT_TAB_WIDTH, BOX_JOINT_MINIMUM_TAB_WIDTH } from "./constants.js";

export function rad(d) {
  return (d / 180) * Math.PI;
}

export function roundToPlace(v, p) {
  return Math.round(v * Math.pow(10, p)) / Math.pow(10, p);
}

export function actualDistance(d, showInches) {
  let t = Math.abs(roundToPlace(d, 2)) + "mm";
  if (showInches) {
    t += " (" + Math.abs(roundToPlace(d / 25.4, 2)) + "in)";
  }
  return t;
}

export function getScrewHoleCoords(panel, panelIndex) {
  const panelHeight = state.getPanelHeightForRow(panelIndex);
  const railSeparation = state.getRailSeparationForRow(panelIndex);
  const screwDist = (panelHeight - railSeparation) / 2;
  const screwDistX = Math.cos(rad(panel.angle)) * screwDist;
  const screwDistY = Math.sin(rad(panel.angle)) * screwDist;
  const screwDistDepthX = Math.sin(rad(panel.angle)) * state.actualRailDepth;
  const screwDistDepthY = -Math.cos(rad(panel.angle)) * state.actualRailDepth;

  return {
    bottomScrew: {
      x: panel.coords[0] + screwDistX + screwDistDepthX,
      y: panel.coords[1] + screwDistY + screwDistDepthY,
    },
    topScrew: {
      x: panel.coords[2] - screwDistX + screwDistDepthX,
      y: panel.coords[3] - screwDistY + screwDistDepthY,
    },
  };
}

// const currentGeometry = {timestamp};

export function calculateCaseGeometry() {
  const geometry = {
    outline: [],
    drillHoles: [],
    frontPieceOutline: [],
    backPieceOutline: [],
    shelfPieceOutline: [],
    baseBoardOutline: [],
    panels: [],
    cutPanels: [],
    maxX: 0,
    maxY: 0,
    panelWidth: 0,
    bottomWidth: 0,
  };

  let x = 0,
    y = 0;

  function addPoint(xn, yn, marker = null) {
    x = xn;
    y = yn;
    geometry.maxX = Math.max(geometry.maxX, xn);
    geometry.maxY = Math.max(geometry.maxY, yn);
    geometry.outline.push({ x: xn, y: yn, marker });
  }

  const firstAngle = state.rowAngles[0];

  geometry.panels = state.rowAngles.map((r, i) => ({
    angle: state.getActualRowAngle(i),
    coords: [],
    is1U: state.rowIs1U[i],
  }));

  addPoint(0, 0);

  //   const bottomPanelDepth = state.useStaticRise
  //     ? state.actualPanelDepth
  //     : Math.abs(
  //         state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
  //       );
  addPoint(x, y + getFrontPanelHeight());

  geometry.frontPieceOutline.push({ x: 0, y: y });
  geometry.frontPieceOutline.push({
    x: x + state.caseMaterialThickness,
    y: y,
  });
  geometry.frontPieceOutline.push({
    x: x + state.caseMaterialThickness,
    y: 0,
  });
  geometry.frontPieceOutline.push({ x: 0, y: 0 });

  addPoint(
    x + Math.cos(rad(firstAngle)) * state.caseMaterialThickness,
    y + Math.sin(rad(firstAngle)) * state.caseMaterialThickness,
    "nowrite"
  );

  let maxScrewX = 0;
  let maxScrewY = 0;

  state.rowAngles.forEach((angle, i) => {
    const rowHeight = state.getPanelHeightForRow(i);
    geometry.panels[i].coords.push(x, y);
    addPoint(
      x + Math.cos(rad(state.getActualRowAngle(i))) * rowHeight,
      y + Math.sin(rad(state.getActualRowAngle(i))) * rowHeight,
      i === state.rowAngles.length - 1 ? true : null
    );
    geometry.panels[i].coords.push(x, y);
    const screwCoords = getScrewHoleCoords(geometry.panels[i], i);
    maxScrewX = Math.max(maxScrewX, screwCoords.topScrew.x);
    maxScrewY = Math.max(maxScrewY, screwCoords.topScrew.y);
  });

  const lastRowEndX = x;
  const lastRowEndY = y;
  const lastRowAngle = Math.max(state.getActualRowAngle(), 0);
  // Inner back wall should allow for module depth to be that specified by user.
  const backInnerWallX =
    maxScrewX +
    Math.sin(rad(lastRowAngle)) *
      (state.actualPanelDepth - state.actualRailDepth);
  const backOuterWallX = backInnerWallX + state.caseMaterialThickness;

  let backWallInside, backWallY, backWallOutside;

  geometry.hasShelfTop = true;

  if (state.flattenTopShelf) {
    geometry.shelfAngle = 90;
    const shelfStartX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfStartY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;

    const normalBackWallInside = backWallInside;
    const normalBackWallOutside = backOuterWallX;

    const shelfEndX = normalBackWallOutside;
    const shelfEndY = shelfStartY;

    backWallInside = shelfEndX - state.caseMaterialThickness;
    backWallOutside = shelfEndX;

    const shelfTopLeftX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfTopLeftY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfTopRightX = backWallOutside;
    const shelfTopRightY = shelfTopLeftY;
    const shelfBottomRightX = backWallOutside;
    const shelfBottomRightY = shelfTopLeftY - state.caseMaterialThickness;
    const shelfBottomLeftX = shelfTopLeftX;
    const shelfBottomLeftY = shelfBottomRightY;

    addPoint(shelfStartX, shelfStartY);
    addPoint(shelfEndX, shelfEndY, {
      labelPos: { below: true, side: "right" },
    });
    addPoint(shelfEndX, 0);

    const backTopLeftX = backWallInside;
    const backTopLeftY = shelfTopRightY - state.caseMaterialThickness;
    const backTopRightX = backWallOutside;
    const backTopRightY = backTopLeftY;
    const backBottomRightX = backWallOutside;
    const backBottomRightY = 0;
    const backBottomLeftX = backWallInside;
    const backBottomLeftY = 0;

    geometry.backPieceOutline.push({ x: backTopLeftX, y: backTopLeftY });
    geometry.backPieceOutline.push({
      x: backTopRightX,
      y: backTopRightY,
    });
    geometry.backPieceOutline.push({
      x: backBottomRightX,
      y: backBottomRightY,
    });
    geometry.backPieceOutline.push({
      x: backBottomLeftX,
      y: backBottomLeftY,
    });

    geometry.shelfPieceOutline.push({
      x: shelfBottomLeftX,
      y: shelfBottomLeftY,
    });
    geometry.shelfPieceOutline.push({ x: shelfTopLeftX, y: shelfTopLeftY });
    geometry.shelfPieceOutline.push({
      x: shelfTopRightX,
      y: shelfTopRightY,
    });
    geometry.shelfPieceOutline.push({
      x: shelfBottomRightX,
      y: shelfBottomRightY,
    });
    geometry.backPanelHeight = backTopRightY;
  } else {
    geometry.shelfAngle = lastRowAngle + 90;
    const shelfTopLeftX = lastRowEndX;
    const shelfTopLeftY = lastRowEndY;
    const shelfTopRightX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfTopRightY =
      shelfTopLeftY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    const shelfBottomRightX = backOuterWallX;
    // shelfTopRightX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const shelfBottomRightY =
      shelfTopRightY -
      ((backOuterWallX - shelfTopRightX) / Math.sin(rad(lastRowAngle))) *
        Math.cos(rad(lastRowAngle));
    // shelfTopRightY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;
    const shelfBottomLeftX =
      shelfBottomRightX -
      state.caseMaterialThickness * Math.cos(rad(lastRowAngle));
    // shelfTopLeftX + Math.sin(rad(lastRowAngle)) * state.actualPanelDepth;
    const shelfBottomLeftY =
      shelfBottomRightY -
      state.caseMaterialThickness * Math.sin(rad(lastRowAngle));
    // shelfTopLeftY - Math.cos(rad(lastRowAngle)) * state.actualPanelDepth;

    // If the top shelf is negative in height and angle < 90 or the topshelf is really short, then
    // lets just have the back panel with no top shelf. The negative angle is the result of the
    // way we are calculating things, but in this case the need for the top shelf is really
    // non-existent as it would be so short.
    if (
      (shelfBottomLeftY - shelfTopLeftY > 0 && lastRowAngle < 90) ||
      distance(
        {
          x: shelfTopRightX,
          y: shelfTopRightY,
        },
        {
          x: shelfBottomRightX,
          y: shelfBottomRightY,
        }
      ) < 30 /* if topshelf is less than 30mm long*/
    ) {
      geometry.hasShelfTop = false;
    }

    console.info(
      "shelfTopLeftY",
      shelfTopLeftY,
      "shelfTopRightY",
      shelfTopRightY,

      "shelfBottomRightY",
      shelfBottomRightY,
      "shelfBottomLeftY",
      shelfBottomLeftY,
      "geometry.hasShelfTop",
      geometry.hasShelfTop
    );

    if (geometry.hasShelfTop) {
      backWallY = shelfBottomLeftY; //shelfBottomRightY;
      backWallOutside = shelfBottomRightX;
      backWallInside = backWallOutside - state.caseMaterialThickness;

      geometry.shelfPieceOutline.push({ x: lastRowEndX, y: lastRowEndY });
      geometry.shelfPieceOutline.push({
        x: shelfTopRightX,
        y: shelfTopRightY,
      });
      geometry.shelfPieceOutline.push({
        x: shelfBottomRightX,
        y: shelfBottomRightY,
      });
      geometry.shelfPieceOutline.push({
        x: shelfBottomLeftX,
        y: shelfBottomLeftY,
      });

      geometry.backPieceOutline.push({
        x: backWallInside,
        y: backWallY,
      });
      geometry.backPieceOutline.push({
        x: backWallOutside,
        y: backWallY,
      });
      geometry.backPieceOutline.push({
        x: backWallOutside,
        y: 0,
      });
      geometry.backPieceOutline.push({
        x: backWallInside,
        y: 0,
      });

      addPoint(shelfTopRightX, shelfTopRightY);
      // addPoint(backWallOutside, backWallY);
      addPoint(shelfBottomRightX, shelfBottomRightY);
      addPoint(backWallOutside, 0, "nowrite");

      geometry.backWallInside = backWallInside;
      geometry.backPanelHeight = backWallY;
    } else {
      geometry.shelfAngle = lastRowAngle + 90;

      // }

      const backPanelAngle = lastRowAngle + 90;
      const backTopLeftX = lastRowEndX;
      const backTopLeftY = lastRowEndY;
      const backTopRightX =
        lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
      const backTopRightY =
        backTopLeftY +
        Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
      const backBottomLeftY = 0;
      const backBottomLeftX =
        backTopLeftX - backTopLeftY / Math.tan(rad(backPanelAngle));
      const backPanelLen = distance(
        {
          x: backTopLeftX,
          y: backTopLeftY,
        },
        {
          x: backBottomLeftX,
          y: backBottomLeftY,
        }
      );
      const backBottomRightX =
        backBottomLeftX +
        Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
      const backBottomRightY =
        backBottomLeftY +
        Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
      const backBottomEndX =
        backTopRightX - backTopRightY / Math.tan(rad(backPanelAngle));
      // const backBottomRightX = backOuterWallX;
      // const backBottomRightY = backTopRightY - state.caseMaterialThickness;
      // const backBottomLeftX = backTopLeftX;

      geometry.backPieceOutline.push({
        x: backTopLeftX,
        y: backTopLeftY,
      });
      geometry.backPieceOutline.push({
        x: backTopRightX,
        y: backTopRightY,
      });
      geometry.backPieceOutline.push({
        x: backBottomRightX,
        y: backBottomRightY,
      });
      geometry.backPieceOutline.push({
        x: backBottomLeftX,
        y: backBottomLeftY,
      });

      addPoint(backTopRightX, backTopRightY);
      // addPoint(backWallOutside, backWallY);
      //   addPoint(shelfBottomRightX, shelfBottomRightY);
      addPoint(backBottomEndX, 0, "nowrite");

      geometry.backWallInside = backBottomLeftX;
      geometry.backPanelHeight = distance(
        {
          x: backTopLeftX,
          y: backTopLeftY,
        },
        {
          x: backBottomLeftX,
          y: backBottomLeftY,
        }
      );
    }
    // backWallY = shelfBottomLeftY; //shelfBottomRightY;
    // backWallOutside = shelfBottomRightX;
    // backWallInside = backWallOutside - state.caseMaterialThickness;

    // geometry.shelfPieceOutline.push({ x: lastRowEndX, y: lastRowEndY });
    // geometry.shelfPieceOutline.push({
    //   x: shelfTopRightX,
    //   y: shelfTopRightY,
    // });
    // geometry.shelfPieceOutline.push({
    //   x: shelfBottomRightX,
    //   y: shelfBottomRightY,
    // });
    // geometry.shelfPieceOutline.push({
    //   x: shelfBottomLeftX,
    //   y: shelfBottomLeftY,
    // });

    // geometry.backPieceOutline.push({
    //   x: backWallInside,
    //   y: backWallY,
    // });
    // geometry.backPieceOutline.push({
    //   x: backWallOutside,
    //   y: backWallY,
    // });
    // geometry.backPieceOutline.push({
    //   x: backWallOutside,
    //   y: 0,
    // });
    // geometry.backPieceOutline.push({
    //   x: backWallInside,
    //   y: 0,
    // });

    // addPoint(shelfTopRightX, shelfTopRightY);
    // // addPoint(backWallOutside, backWallY);
    // addPoint(shelfBottomRightX, shelfBottomRightY);
    // addPoint(backWallOutside, 0, "nowrite");
  }

  addPoint(0, 0);

  geometry.baseBoardOutline = [
    { x: 0, y: 0 },
    { x: geometry.maxX, y: 0 },
    { x: geometry.maxX, y: -state.caseMaterialThickness },
    { x: 0, y: -state.caseMaterialThickness },
    { x: 0, y: 0 },
  ];

  // let maxScrewX = 0;
  // let maxScrewY = 0;

  geometry.panels.forEach((panel, i) => {
    const screwCoords = getScrewHoleCoords(panel, i);
    geometry.drillHoles.push(screwCoords.bottomScrew);
    geometry.drillHoles.push(screwCoords.topScrew);
    // maxScrewX = Math.max(maxScrewX, screwCoords.topScrew.x);
    // maxScrewY = Math.max(maxScrewY, screwCoords.topScrew.y);
  });

  const panelWidth = state.caseWidth;
  geometry.panelWidth = panelWidth;

  const frontHeight = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(
        state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
      );

  const bottomDepth = geometry.maxX;

  let backHeight, topShelfDepth;

  if (state.flattenTopShelf) {
    const lastRowEndY = geometry.outline[geometry.outline.length - 4].y;
    const shelfY =
      lastRowEndY + Math.sin(rad(lastRowAngle)) * state.caseMaterialThickness;
    backHeight = shelfY - state.caseMaterialThickness;

    const lastRowEndX = geometry.outline[geometry.outline.length - 5].x;
    const shelfStartX =
      lastRowEndX + Math.cos(rad(lastRowAngle)) * state.caseMaterialThickness;
    topShelfDepth = geometry.maxX - shelfStartX;
  } else {
    const backWallTopY = geometry.outline[geometry.outline.length - 3].y;
    backHeight = geometry.maxY;
    topShelfDepth = state.actualPanelDepth;
  }

  const bottomWidth = panelWidth + 2 * state.caseMaterialThickness;
  geometry.bottomWidth = bottomWidth;
  geometry.cutPanels = [
    {
      name: "Front",
      width: panelWidth,
      height: frontHeight,
    },
    {
      name: "Bottom",
      width: bottomWidth,
      height: bottomDepth,
    },
    {
      name: "Back",
      width: panelWidth,
      height: geometry.backPanelHeight, //backHeight,
    },
  ];

  if (state.flattenTopShelf) {
    geometry.cutPanels.push({
      name: "Top Shelf",
      width: panelWidth,
      height: topShelfDepth,
    });
  } else {
    geometry.cutPanels.push({
      name: "Back-Top (angled)",
      width: panelWidth,
      height: topShelfDepth,
    });
  }

  const createSidePanelOutline = (side = "right") => {
    // the side panel from calculateCaseGeometry() starts at 0,0 x,y currently and goes up to the top
    // left corner.
    const outlinePoints = [...geometry.outline.slice(1)];
    const zValue =
      side === "right"
        ? state.caseWidth / 2 + state.caseMaterialThickness
        : -state.caseWidth / 2 - state.caseMaterialThickness;
    return outlinePoints.map((point) => ({
      ...point,
      z: zValue,
    }));
  };

  const createSidePanel2dSideOutline = () => {
    // This should basically create what is currently created for 2d display
    const outlinePoints = [...geometry.outline.slice(1)];
    return outlinePoints;
  };

  const createSidePanelExtrudableOutline = (side = "right") => {
    // This should create the side panel with the tabs/notches added
    // For 3d and export we need to create a mirror image of this as well, which should be basically
    // just the same points mirrored about the y-axis.
    const points = createSidePanelOutline(side);
    console.info("points", points);
    const bottomLeft = points.pop();
    const bottomRight = points.pop();
    const backTop = points.pop();

    const frontTop = geometry.hasShelfTop ? points.pop() : null;
    const topBoxJointWidth = frontTop
      ? calculateCustomBoxJointWidth(frontTop, backTop)
      : 0;
    const topJoints = frontTop
      ? [
          frontTop,
          ...createBoxJoints({
            point1: frontTop,
            point2: backTop,
            type: boxJointType.notch,
            flip: true,
            jointWidth: topBoxJointWidth,
          }),
        ]
      : [];
    console.info("topBoxJointWidth", topBoxJointWidth, "topJoints", topJoints);

    // In flattenTopShelf mode the top shelf panel occupies the top caseMaterialThickness
    // of the back edge, so the back panel's side edge is that much shorter at the top.
    // Shift the notch start point down by caseMaterialThickness so the notch pattern on
    // the side panel matches the tab pattern on the back panel's side edges exactly.
    const backPanelPoints = createBackPanelOutline();
    const backJointsStart = state.flattenTopShelf
      ? { ...backTop, y: backTop.y - state.caseMaterialThickness, z:0 }
      : { ...backTop, y: backPanelPoints.topLeft.y, z:0 };
    const backJointsEnd = geometry.hasShelfTop
      ? {...bottomRight, z: 0}
      : { x: backPanelPoints.bottomLeft.x, y: backPanelPoints.bottomLeft.y, z:0 };
    // const backBoxJointWidth = Math.min(
    //   BOX_JOINT_DEFAULT_TAB_WIDTH,
    //   (distance(backJointsStart, backJointsEnd) - 1) / 3
    // );
    const backBoxJointWidth = calculateCustomBoxJointWidth(
      backJointsStart,
      backJointsEnd
    );
    console.info(
      "backBoxJointWidth for sidepanel",
      backBoxJointWidth,
      "BOX_JOINT_TAB_WIDTH",
      BOX_JOINT_DEFAULT_TAB_WIDTH,
      "(distance(backJointsStart, backJointsEnd) - 1) / 3",
      (distance3d(backJointsStart, backJointsEnd) - 1) / 3,
      "point distance",
      distance3d(backJointsStart, backJointsEnd),
      "start point",
      backJointsStart,"end point", backJointsEnd,
    );
    const backJoints = createBoxJoints({
      point1: backJointsStart,
      point2: backJointsEnd,
      type: boxJointType.notch,
      flip: true,
      jointWidth: backBoxJointWidth,
    });

    const bottomJoints = createBoxJoints({
      point1: bottomRight,
      point2: bottomLeft,
      type: boxJointType.tab,
      flip: true,
    });

    // const frontBoxJointWidth = Math.min(
    //   BOX_JOINT_DEFAULT_TAB_WIDTH,
    //   (points[0].y - bottomLeft.y - 1) / 3
    // );
    const frontBoxJointWidth = calculateCustomBoxJointWidth(
      points[0],
      bottomLeft
    );
    const frontJoints = createBoxJoints({
      point1: bottomLeft,
      point2: points[0],
      type: boxJointType.notch,
      flip: true,
      jointWidth: frontBoxJointWidth,
    });
    const allPoints = [
      ...points,
      //   frontTop ? frontTop : ...[],
      ...topJoints,
      backTop,
      // In flattenTopShelf mode, plain step down to where the joinable region starts
      ...(state.flattenTopShelf ? [backJointsStart] : []),
      ...backJoints,
      bottomRight,
      ...bottomJoints,
      bottomLeft,
      ...frontJoints,
      //   points[0],
    ];
    //return side === "left" ? allPoints.reverse() : allPoints;
    return allPoints.reverse();
  };

  const createFrontPanelOutline = () => {
    return {
      topLeft: { z: -state.caseWidth / 2, y: getFrontPanelHeight(), x: 0 },
      topRight: { z: state.caseWidth / 2, y: getFrontPanelHeight(), x: 0 },
      bottomRight: { z: state.caseWidth / 2, y: 0, x: 0 },
      bottomLeft: { z: -state.caseWidth / 2, y: 0, x: 0 },
    };
  };

  const createFrontPanel2dSideOutline = () => {
    // This should return the point necessary to create the side view outline of the panel.
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createFrontPanelOutline();
    return [
      { x: topLeft.x, y: topLeft.y },
      { x: topLeft.x + state.caseMaterialThickness, y: topLeft.y },
      { x: bottomLeft.x + state.caseMaterialThickness, y: bottomLeft.y },
      { x: bottomLeft.x, y: bottomLeft.y },
    ];
  };

  const createFrontPanelExtrudableOutline = () => {
    // Creates the outline for the front panel with the box joint tabs and notches.
    // Note that the outline will currently be centered at the -caseWidth/2 Z position to match
    // with the current way the 3d geometry is handled.
    //
    // The current center Z point is at state.caseWidth/2, and thus since the front piece goes
    // between the side panels, its main outline without the box joints will go from -state.caseWidth
    // to state.caseWidth in the Z direction.
    //
    // In the Y direction, the front piece goes from 0 to state.actualPanelDepth not counting the
    // box joint tabs.
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createFrontPanelOutline();

    // Now create outlines with tabs on the left and right sides and the bottom. First create the
    // center tab, then expend the tabs outward from there.
    const bottomJoints = createBoxJoints({
      point1: bottomRight,
      point2: bottomLeft,
      type: boxJointType.tab,
      flip: false,
      preferredUp: { x: 1, y: 0, z: 0 },
    });
    // const sideBoxJointWidth = Math.min(
    //   BOX_JOINT_DEFAULT_TAB_WIDTH,
    //   (topLeft.y - bottomLeft.y - 1) / 3
    // );
    const sideBoxJointWidth = calculateCustomBoxJointWidth(
      bottomLeft,
      topLeft
    );
    const leftJoints = createBoxJoints({
      point1: bottomLeft,
      point2: topLeft,
      type: boxJointType.tab,
      flip: false,
      preferredUp: { x: 1, y: 0, z: 0 },
      jointWidth: sideBoxJointWidth,
    });
    const rightJoints = createBoxJoints({
      point1: topRight,
      point2: bottomRight,
      type: boxJointType.tab,
      flip: false,
      preferredUp: { x: 1, y: 0, z: 0 },
      jointWidth: sideBoxJointWidth,
    });
    console.info(
      "frontPanelExtrudableOutline",
      topLeft,
      topRight,
      rightJoints,
      bottomRight,
      bottomJoints,
      bottomLeft,
      leftJoints,
      topLeft
    );
    return [
      topLeft,
      topRight,
      ...rightJoints,
      bottomRight,
      ...bottomJoints,
      bottomLeft,
      ...leftJoints,
      //   topLeft,
    ];//.reverse();
  };

  const createBottomPanelOutline = () => {
    // Creates the bottom up view of the bottom panel, as if you were looking at the case from the
    // front and lifted the front to look at the bottom (so the front is at the top)
    const bottomPanelOutline = geometry.baseBoardOutline;
    return {
      topLeft: {
        z: -(state.caseWidth / 2 + state.caseMaterialThickness),
        y: -state.caseMaterialThickness,
        x: 0,
      },
      topRight: {
        z: state.caseWidth / 2 + state.caseMaterialThickness,
        y: -state.caseMaterialThickness,
        x: 0,
      },
      bottomRight: {
        z: state.caseWidth / 2 + state.caseMaterialThickness,
        y: -state.caseMaterialThickness,
        x: bottomPanelOutline[1].x,
      },
      bottomLeft: {
        z: -(state.caseWidth / 2 + state.caseMaterialThickness),
        y: -state.caseMaterialThickness,
        x: bottomPanelOutline[1].x,
      },
    };
  };

  const createBottomPanel2dSideOutline = () => {
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createBottomPanelOutline();
    return [
      { x: topLeft.x, y: 0 },
      { x: bottomLeft.x, y: 0 },
      { x: bottomLeft.x, y: -state.caseMaterialThickness },
      { x: topLeft.x, y: -state.caseMaterialThickness },
    ];
  };

  const createBottomPanelExtrudableOutline = () => {
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createBottomPanelOutline();
    const topJoints = createBoxJoints({
      point1: topLeft,
      point2: topRight,
      type: boxJointType.notch,
      flip: false,
      preferredUp: { x: 0, y: 1, z: 0 },
    });
    const rightJoints = createBoxJoints({
      point1: topRight,
      point2: bottomRight,
      type: boxJointType.notch,
      flip: false,
      preferredUp: { x: 0, y: 1, z: 0 },
    });
    const bottomJoints = createBoxJoints({
      point1: bottomRight,
      point2: bottomLeft,
      type: boxJointType.notch,
      flip: false,
      preferredUp: { x: 0, y: 1, z: 0 },
    });
    const leftJoints = createBoxJoints({
      point1: bottomLeft,
      point2: topLeft,
      type: boxJointType.notch,
      flip: false,
      preferredUp: { x: 0, y: 1, z: 0 },
    });
    return [
      topLeft,
      ...topJoints,
      topRight,
      ...rightJoints,
      bottomRight,
      ...bottomJoints,
      bottomLeft,
      ...leftJoints,
      //   topLeft,
    ].reverse();
  };

  const createBackPanelOutline = () => {
    // Creates the back panel, looking from the back at the back face of it.
    const backPieceOutline = geometry.backPieceOutline;
    return {
      topLeft: {
        z: state.caseWidth / 2,
        y: backPieceOutline[1].y,
        x: backPieceOutline[1].x,
      },
      topRight: {
        z: -state.caseWidth / 2,
        y: backPieceOutline[1].y,
        x: backPieceOutline[1].x,
      },
      bottomRight: {
        z: -state.caseWidth / 2,
        y: backPieceOutline[2].y,
        x: backPieceOutline[2].x,
      },
      bottomLeft: {
        z: state.caseWidth / 2,
        y: backPieceOutline[2].y,
        x: backPieceOutline[2].x,
      },
    };
  };

  const createBackPanel2dSideOutline = () => {
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createBackPanelOutline();
    return [
      { x: topLeft.x - state.caseMaterialThickness, y: topLeft.y },
      { x: topLeft.x, y: topLeft.y },
      { x: bottomLeft.x, y: bottomLeft.y },
      { x: bottomLeft.x - state.caseMaterialThickness, y: bottomLeft.y },
    ];
  };

  const createBackPanelExtrudableOutline = () => {
    // back panel has tabs on all four sides
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createBackPanelOutline();

    console.info(
      "createBackPanelOutline()",
      createBackPanelOutline(),
      "flat height",
      distance3d(topLeft, bottomLeft)
    );

    // fix it so that the tabs make the back the right height, and otherwise shorten it
    // topLeft.y = topLeft.y - state.caseMaterialThickness;
    // topRight.y = topRight.y - state.caseMaterialThickness;

    // Now create outlines with tabs on the left and right sides and the bottom. First create the
    // center tab, then expend the tabs outward from there.
    const topJoints = geometry.hasShelfTop
      ? createBoxJoints({
          point1: topLeft,
          point2: topRight,
          type: boxJointType.tab,
          flip: true,
          preferredUp: { x: 1, y: 0, z: 0 },
        })
      : [];

    /*
          const backPanelPoints = createBackPanelOutline();
    const backJointsStart = state.flattenTopShelf
      ? { ...backTop, y: backTop.y - state.caseMaterialThickness }
      : { ...backTop, y: backPanelPoints.topLeft.y };
    const backJointsEnd = geometry.hasShelfTop
      ? bottomRight
      : { x: backPanelPoints.bottomLeft.x, y: backPanelPoints.bottomLeft.y };
    const backBoxJointWidth = calculateCustomBoxJointWidth(
      backJointsStart,
      backJointsEnd
    );
      */

    const rightJoints = createBoxJoints({
      point1: topRight,
      point2: bottomRight,
      type: boxJointType.tab,
      flip: true,
      preferredUp: { x: 1, y: 0, z: 0 },
      jointWidth: calculateCustomBoxJointWidth(topRight, bottomRight),
    });

    const bottomJoints = createBoxJoints({
      point1: bottomRight,
      point2: bottomLeft,
      type: boxJointType.tab,
      flip: true,
      //   preferredUp: { x: 1, y: 0, z: 0 },
    });

    /*
          const backPanelPoints = createBackPanelOutline();
    const backJointsStart = state.flattenTopShelf
      ? { ...backTop, y: backTop.y - state.caseMaterialThickness }
      : { ...backTop, y: backPanelPoints.topLeft.y };
    const backJointsEnd = geometry.hasShelfTop
      ? bottomRight
      : { x: backPanelPoints.bottomLeft.x, y: backPanelPoints.bottomLeft.y };
    const backBoxJointWidth = calculateCustomBoxJointWidth(
      backJointsStart,
      backJointsEnd
    );
      */
    const leftSideJointWidth = calculateCustomBoxJointWidth(bottomLeft, topLeft);
    const leftJoints = createBoxJoints({
      point1: bottomLeft,
      point2: topLeft,
      type: boxJointType.tab,
      flip: true,
      preferredUp: { x: 1, y: 0, z: 0 },
      jointWidth: leftSideJointWidth,
    });

    console.info(
      "backBoxJointWidth for left side of back panel",
      leftSideJointWidth,
      "BOX_JOINT_TAB_WIDTH",
      BOX_JOINT_DEFAULT_TAB_WIDTH,
      "(distance(bottomLeft, topLeft) - 1) / 3",
      (distance3d(bottomLeft, topLeft) - 1) / 3,
      "point distance",
      distance3d(bottomLeft, topLeft),
      "start point",
      bottomLeft,
      "end point",
      topLeft
    );

    console.info("createBackPanelExtrudableOutline", [
      topLeft,
      topRight,
      bottomRight,
      ...bottomJoints,
      bottomLeft,
    ]);
    return [
      topLeft,
      ...topJoints,
      topRight,
      ...rightJoints,
      bottomRight,
      ...bottomJoints,
      bottomLeft,
      ...leftJoints,
    ];
  };

  const createTopPanelOutline = () => {
    // Creates the back top panel, looking from behind and above
    const topPanelOutline = geometry.shelfPieceOutline;
    if (state.flattenTopShelf) {
      // flat case: [0]=bottomLeft, [1]=topLeft, [2]=topRight, [3]=bottomRight
      // The outline is viewed from above: front edge runs along Z, side edges run along X.
      // [1] and [2] share y=shelfTopY; they differ in X (front vs back of shelf).
      // We keep both left/right at the same X per edge so the polygon lies flat.
      return {
        topLeft: {
          z: state.caseWidth / 2,
          y: topPanelOutline[1].y,
          x: topPanelOutline[1].x,
        },
        topRight: {
          z: -state.caseWidth / 2,
          y: topPanelOutline[1].y,
          x: topPanelOutline[1].x,
        },
        bottomRight: {
          z: -state.caseWidth / 2,
          y: topPanelOutline[2].y,
          x: topPanelOutline[2].x,
        },
        bottomLeft: {
          z: state.caseWidth / 2,
          y: topPanelOutline[2].y,
          x: topPanelOutline[2].x,
        },
      };
    }
    // angled case: [1]=outer front corner, [2]=outer back corner
    return {
      topLeft: {
        z: state.caseWidth / 2,
        y: topPanelOutline[1].y,
        x: topPanelOutline[1].x,
      },
      topRight: {
        z: -state.caseWidth / 2,
        y: topPanelOutline[1].y,
        x: topPanelOutline[1].x,
      },
      bottomRight: {
        z: -state.caseWidth / 2,
        y: topPanelOutline[2].y,
        x: topPanelOutline[2].x,
      },
      bottomLeft: {
        z: state.caseWidth / 2,
        y: topPanelOutline[2].y,
        x: topPanelOutline[2].x,
      },
    };
  };

  const createTopPanel2dSideOutline = () => {
    // need to figure out if we want to change this...

    // const { topLeft, topRight, bottomRight, bottomLeft } =
    //   createTopPanelOutline();
    // return [
    //   { x: topLeft.x - state.caseMaterialThickness, y: topLeft.y },
    //   { x: topLeft.x, y: topLeft.y },
    //   { x: bottomLeft.x, y: bottomLeft.y },
    //   { x: bottomLeft.x - state.caseMaterialThickness, y: bottomLeft.y },
    // ];
    return geometry.shelfPieceOutline;
  };

  const createTopPanelExtrudableOutline = () => {
    // top panel has tabs on the sides and notches on the bottom/back
    const { topLeft, topRight, bottomRight, bottomLeft } =
      createTopPanelOutline();


    console.info(
      "createTopPanelOutline()",
      createTopPanelOutline(),
      "flat height",
      distance3d(topLeft, bottomLeft)
    );

    const preferredUp = state.flattenTopShelf
      ? { x: 0, y: -1, z: 0 }
      : {
          x: -Math.sin(rad(geometry.shelfAngle)),
          y: Math.cos(rad(geometry.shelfAngle)),
          z: 0,
        };

    // const topJoints = createBoxJoints(
    //   topLeft,
    //   topRight,
    //   boxJointType.tab,
    //   true /* flip */,
    //   { x: 1, y: 0, z: 0 } /* preferredUp */
    // );
    // const leftRightBoxJointWidth = Math.min(
    //   BOX_JOINT_DEFAULT_TAB_WIDTH,
    //   (Math.sqrt(Math.pow(distance(topRight, bottomRight), 2)) - 1) / 3
    // );
    const leftRightBoxJointWidth = calculateCustomBoxJointWidth(
      topRight,
      bottomRight
    );
    const rightJoints = createBoxJoints({
      point1: topRight,
      point2: bottomRight,
      type: boxJointType.tab,
      flip: false,
      preferredUp,
      jointWidth: leftRightBoxJointWidth,
    });
    const bottomJoints = createBoxJoints({
      point1: bottomRight,
      point2: bottomLeft,
      type: boxJointType.notch,
      flip: false,
      preferredUp,
    });
    const leftJoints = createBoxJoints({
      point1: bottomLeft,
      point2: topLeft,
      type: boxJointType.tab,
      flip: false,
      preferredUp,
      jointWidth: leftRightBoxJointWidth,
    });
    return [
      topLeft,
      //   ...topJoints,
      topRight,
      ...rightJoints,
      bottomRight,
      ...bottomJoints,
      bottomLeft,
      ...leftJoints,
      //   topLeft,
    ].reverse();
  };

  return {
    ...geometry,
    createSidePanelOutline,
    createSidePanel2dSideOutline,
    createSidePanelExtrudableOutline,
    createFrontPanelOutline,
    createFrontPanel2dSideOutline,
    createFrontPanelExtrudableOutline,
    createBottomPanelOutline,
    createBottomPanel2dSideOutline,
    createBottomPanelExtrudableOutline,
    createBackPanelOutline,
    createBackPanel2dSideOutline,
    createBackPanelExtrudableOutline,
    createTopPanelOutline,
    createTopPanel2dSideOutline,
    createTopPanelExtrudableOutline,
  };
}

function getFrontPanelHeight() {
  const firstAngle = state.rowAngles[0];
  const height = state.useStaticRise
    ? state.actualPanelDepth
    : Math.abs(
        state.actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle))
      );
  return height;
}

const boxJointType = { tab: "tab", notch: "notch" };

function findCenterPoint(point1, point2) {
  return {
    x: (point1.x + point2.x) / 2,
    y: (point1.y + point2.y) / 2,
    z: (point1.z + point2.z) / 2,
  };
}

/**
 * Generates points for a line with tabs or notches in 3D.
 * @param {Object} options Configuration object
 * @param {Object} options.p1 {x, y, z} Start point
 * @param {Object} options.p2 {x, y, z} End point
 * @param {number} options.jointWidth Width of each tab and gap
 * @param {number} options.jointHeight Height of the tab/notch
 * @param {string} options.type 'tab' or 'notch'
 * @param {boolean} options.flip Flip the normal calculation
 * @param {Object} options.preferredUp {x, y, z} growth direction reference
 * @param {boolean} options.includeEndpoints Include original p1/p2 in result
 */
function generateTabbedLine({
  p1,
  p2,
  jointWidth,
  jointHeight,
  type = "tab",
  flip = false,
  preferredUp = { x: 0, y: 0, z: 1 },
  includeEndpoints = false,
}) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

  if (length < jointWidth * 2) {
    return includeEndpoints ? [p1, p2] : [];
  }

  const ux = dx / length;
  const uy = dy / length;
  const uz = dz / length;

  // Calculate Normal (Side vector)
  let nx = uy * preferredUp.z - uz * preferredUp.y;
  let ny = uz * preferredUp.x - ux * preferredUp.z;
  let nz = ux * preferredUp.y - uy * preferredUp.x;

  let nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (nLen < 0.0001) {
    const fallback =
      Math.abs(ux) > 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    nx = uy * fallback.z - uz * fallback.y;
    ny = uz * fallback.x - ux * fallback.z;
    nz = ux * fallback.y - uy * fallback.x;
    nLen = Math.sqrt(nx * nx + ny * ny + nz * nz);
  }

  nx /= nLen;
  ny /= nLen;
  nz /= nLen;

  let multiplier = type === "notch" ? -1 : 1;
  if (flip) multiplier *= -1;

  nx *= multiplier;
  ny *= multiplier;
  nz *= multiplier;

  const halfW = jointWidth / 2;
  const mid = length / 2;
  const tabOffsets = [];

  const fits = (center) => {
    const start = center - halfW;
    const end = center + halfW;
    return start >= jointWidth + 0 && end <= length - (jointWidth + 0);
    // return (
    //   start >= jointWidth + state.caseMaterialThickness &&
    //   end <= length - (jointWidth + state.caseMaterialThickness)
    // );
  };

  if (fits(mid)) {
    tabOffsets.push(mid);
    let step = 1;
    while (true) {
      let added = false;
      const forward = mid + step * (2 * jointWidth);
      const backward = mid - step * (2 * jointWidth);
      if (fits(forward)) {
        tabOffsets.push(forward);
        added = true;
      }
      if (fits(backward)) {
        tabOffsets.push(backward);
        added = true;
      }
      if (!added) break;
      step++;
    }
  }
  tabOffsets.sort((a, b) => a - b);

  const points = includeEndpoints ? [p1] : [];

  tabOffsets.forEach((offset) => {
    const tStart = offset - halfW;
    const tEnd = offset + halfW;

    points.push({
      x: p1.x + ux * tStart,
      y: p1.y + uy * tStart,
      z: p1.z + uz * tStart,
    });
    points.push({
      x: p1.x + ux * tStart + nx * jointHeight,
      y: p1.y + uy * tStart + ny * jointHeight,
      z: p1.z + uz * tStart + nz * jointHeight,
    });
    points.push({
      x: p1.x + ux * tEnd + nx * jointHeight,
      y: p1.y + uy * tEnd + ny * jointHeight,
      z: p1.z + uz * tEnd + nz * jointHeight,
    });
    points.push({
      x: p1.x + ux * tEnd,
      y: p1.y + uy * tEnd,
      z: p1.z + uz * tEnd,
    });
  });

  if (includeEndpoints) {
    points.push(p2);
  }

  return points;
}

function createBoxJoints({
  point1,
  point2,
  type = boxJointType.tab,
  flip = false,
  preferredUp = { x: 0, y: 0, z: 1 },
  jointWidth = BOX_JOINT_DEFAULT_TAB_WIDTH,
}) {
  // ensure that we have all the point values for the case where z might be missing
  const p1 = { x: 0, y: 0, z: 0, ...point1 };
  const p2 = { x: 0, y: 0, z: 0, ...point2 };
  const jointHeight = state.caseMaterialThickness;
  // const jointWidth = BOX_JOINT_TAB_WIDTH;

  return generateTabbedLine({
    p1,
    p2,
    jointWidth,
    jointHeight,
    type,
    flip,
    preferredUp,
    includeEndpoints: false,
  });
}

/**
 * Flattens an array of 2D or 3D points to an array of x,y coordinates.
 * @param {Array} coords Array of 2D or 3D points
 * @returns Array of x,y coordinates
 */
export function flattenXYCoordsToArray(coords) {
  return coords.reduce((acc, coord) => {
    acc.push(coord.x, coord.y);
    return acc;
  }, []);
}

/**
 * Calculates the distance between two 2D points.
 * @param {Object} p1 {x, y, z} First point
 * @param {Object} p2 {x, y, z} Second point
 * @returns The distance between the two points.
 */
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates the distance between two 3D points.
 * @param {Object} p1 {x, y, z} First point
 * @param {Object} p2 {x, y, z} Second point
 * @returns The distance between the two points.
 */
function distance3d(p1, p2) {
  const dx = (p2.x != undefined ? p2.x : 0) - (p1.x != undefined ? p1.x : 0);
  const dy = (p2.y != undefined ? p2.y : 0) - (p1.y != undefined ? p1.y : 0);
  const dz = (p2.z != undefined ? p2.z : 0) - (p1.z != undefined ? p1.z : 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the width of the box joints to be placed on a line between two points.
 *
 * @param {number} startPoint The start point of the line on which the box joints will be placed.
 * @param {number} endPoint The end point of the line on which the box joints will be placed.
 * @returns The width of the box joints to be placed on the line.
 */
function calculateCustomBoxJointWidth(startPoint, endPoint) {
    let boxJointWidth = Math.min(
      BOX_JOINT_DEFAULT_TAB_WIDTH,
      (Math.sqrt(Math.pow(distance3d(startPoint, endPoint), 2)) - 1) / 3
    );
    boxJointWidth = Math.max(BOX_JOINT_MINIMUM_TAB_WIDTH, boxJointWidth);
    return boxJointWidth;
}