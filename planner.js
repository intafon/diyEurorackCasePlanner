"use strict";

document.addEventListener("DOMContentLoaded", function () {
    init();
});

var input, canvasDiv, canvas, calcRiseCb, ctx, w, h;
let rowCounts = [1, 2, 3, 4, 5];
let rowCount = rowCounts[2];
let rowAngles = [5, 10, 10];
let rowIs1U = [false, false, false];
let rowInputs = [];
let defaultAngle = 5;

const oneUFormats = {
    intellijel: { name: "Intellijel", height: 39.65, railSeparation: 29.5 },
    pulplogic: { name: "Pulp Logic", height: 43.18, railSeparation: 33 }
};
let selected1UFormat = "intellijel";

var inputDepth, matThickness, pxPerCmInput;

var actualPanelHeight = 133.4;
var actual1UPanelHeight = 39.65;
var actualRailSeparation = 123;
var actual1URailSeparation = 29.5;
var actualRailDepth = 14;
var actualPanelDepth = 60;
var useStaticRise = false;
var caseMaterialThickness = 3;

var pxPerCm = 400 / actualPanelHeight;
var panelHeight = actualPanelHeight * pxPerCm;
var heightRatio = actualPanelHeight / panelHeight;
var angle1 = 10;
var angle2 = 15;
var panel1 = [];
var panel2 = [];
var panels = [];

var startX = function () {
    return 70;
};

var startY = function () {
    return canvas.height - 70;
};

/**
 * Calculate radians from degrees.
 *
 * @param {number} d Degrees input.
 * @returns Radians value.
 */
function rad(d) {
    return (d / 180) * Math.PI;
}

/**
 * Shows a display of distance in text.
 *
 * @param {number} d Distance to show.
 * @param {boolean} showInches Whether or not to show inches translation.
 * @returns A display string.
 */
function actualDistance(d, showInches) {
    var t = Math.abs(roundToPlace(d, 1)) + "mm";
    if (showInches) {
        t += " (" + Math.abs(roundToPlace(d / 25.4, 1)) + "in)";
    }
    return t;
}

/**
 * The row angle inputs are based on the angle prior to the current angle. For
 * example, if the first row has an angle of 10 and the second also has an angle
 * of 10, the second row's actual angle is 20.
 *
 * @param {number} r The index number of the row for which to show the angle.
 * @returns The actual angle of the row.
 */
function getActualRowAngle(r) {
    if (r === undefined) {
        r = rowAngles.length;
    }
    return rowAngles.reduce((sum, cur, i) => {
        if (i <= r) {
            sum += cur;
        }
        return sum;
    }, 0);
}

/**
 * Draws the side silhouette of the case.
 */
function drawSide() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = "#999999";
    ctx.setLineDash([]); //([1, 5]);

    var maxX = 0,
        maxY = 0;
    var x, y;
    var p = [];

    function add(xn, yn, noWriteMarker) {
        x = xn;
        y = yn;
        maxX = Math.max(maxX, xn);
        maxY = Math.max(maxY, yn);
        p.push(xn, yn);
        if (noWriteMarker) {
            p.push(noWriteMarker);
        }
    }

    const firstAngle = rowAngles[0];

    panels = rowAngles.map((r, i) => {
        return {
            angle: getActualRowAngle(i),
            coords: [],
        };
    });
    console.info("panels", panels, "rowAngles", rowAngles);

    var frontPieceOutline = [];
    var backPieceOutline = [];

    add(0, 0);

    // bottom panel goes underneath the sides, front, and back

    var bottomPanelDepth = useStaticRise
        ? actualPanelDepth
        : Math.abs(actualPanelDepth * Math.sin(Math.PI / 2 - rad(firstAngle)));
    add(x, y + bottomPanelDepth);

    // Add the points for drawing the dotted line representing the cardboard
    // piece for the case front on the other side of the side panel.
    frontPieceOutline.push(
        x + Math.cos(rad(firstAngle)) * caseMaterialThickness,
        y + Math.sin(rad(firstAngle)) * caseMaterialThickness
    );
    frontPieceOutline.push(x + Math.cos(rad(firstAngle)) * caseMaterialThickness, 0);
    frontPieceOutline.push(0, 0);
    add(
        x + Math.cos(rad(firstAngle)) * caseMaterialThickness,
        y + Math.sin(rad(firstAngle)) * caseMaterialThickness,
        "nowrite"
    );

    rowAngles.forEach((angle, i) => {
        const rowHeight = getPanelHeightForRow(i);
        panels[i].coords.push(x, y);
        panels[i].is1U = rowIs1U[i];
        add(
            x + Math.cos(rad(getActualRowAngle(i))) * rowHeight,
            y + Math.sin(rad(getActualRowAngle(i))) * rowHeight,
            // If it is the last row, then the outline will continue for the width of
            // the material, so we'll just write the coord marker at the end of that
            // instead of the end of the row outline.
            i === rowAngles.length - 1
        );
        panels[i].coords.push(x, y);
    });

    // Add the points for drawing the dotted line representing the cardboard
    // piece for the case back on the other side of the side panel.
    backPieceOutline.push(x, y);
    // Now get the *inside* x position of the back of the case. We will add the material
    // thickness to this below.
    const backWallInside = x + Math.sin(rad(getActualRowAngle())) * actualPanelDepth;
    backPieceOutline.push(
        backWallInside,
        y - Math.cos(rad(getActualRowAngle())) * actualPanelDepth
    );
    backPieceOutline.push(backWallInside, 0);

    add(
        x + Math.cos(rad(getActualRowAngle())) * caseMaterialThickness,
        y + Math.sin(rad(getActualRowAngle())) * caseMaterialThickness
    );

    add(
        backWallInside + caseMaterialThickness,
        y - Math.cos(rad(getActualRowAngle())) * actualPanelDepth
    );
    add(x, 0);
    add(0, 0);

    ctx.setLineDash([1, 5]);
    ctx.beginPath();
    // Draw the base board outline
    drawPath(
        false,
        0,
        0,
        maxX,
        0,
        maxX,
        -caseMaterialThickness,
        0,
        -caseMaterialThickness,
        0,
        0
    );
    ctx.closePath();

    // draw the front and back side outlines
    frontPieceOutline.unshift("false");
    backPieceOutline.unshift("false");
    ctx.beginPath();
    drawPath(frontPieceOutline);
    ctx.closePath();
    ctx.beginPath();
    drawPath(backPieceOutline);
    ctx.closePath();

    ctx.setLineDash([]);
    const railScrewCoords = drawPanelRails(panels);
    const pathCoords = p.slice(0);
    drawPath(p);

    drawJointDistanceIndicators(panels, maxX);

    writeSummary(maxX, maxY, pathCoords, railScrewCoords);
}

/**
 * Draws an arrow head at the end of a line.
 *
 * @param {number} toX End x coordinate
 * @param {number} toY End y coordinate
 * @param {number} angle Angle of the line in radians
 * @param {number} headLength Length of the arrow head
 */
function drawArrowHead(toX, toY, angle, headLength) {
    const headAngle = Math.PI / 6;
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle - headAngle),
        toY - headLength * Math.sin(angle - headAngle)
    );
    ctx.moveTo(toX, toY);
    ctx.lineTo(
        toX - headLength * Math.cos(angle + headAngle),
        toY - headLength * Math.sin(angle + headAngle)
    );
    ctx.stroke();
    ctx.closePath();
}

/**
 * Draws a distance indicator line with arrow and label.
 *
 * @param {number} startX Start x in real coordinates
 * @param {number} startY Start y in real coordinates
 * @param {number} endX End x in real coordinates
 * @param {number} endY End y in real coordinates
 * @param {number} distance The distance to display
 * @param {number} labelOffsetX Offset for label positioning
 * @param {number} labelOffsetY Offset for label positioning
 */
function drawDistanceIndicator(startX, startY, endX, endY, distance, labelOffsetX, labelOffsetY) {
    const plotStart = getPlot(startX, startY);
    const plotEnd = getPlot(endX, endY);
    
    const angle = Math.atan2(plotEnd.y - plotStart.y, plotEnd.x - plotStart.x);
    
    ctx.beginPath();
    ctx.moveTo(plotStart.x, plotStart.y);
    ctx.lineTo(plotEnd.x, plotEnd.y);
    ctx.stroke();
    ctx.closePath();
    
    drawArrowHead(plotEnd.x, plotEnd.y, angle, 6);
    
    const midX = (plotStart.x + plotEnd.x) / 2 + labelOffsetX;
    const midY = (plotStart.y + plotEnd.y) / 2 + labelOffsetY;
    
    ctx.font = "9px sans-serif";
    ctx.fillText(actualDistance(distance, false), midX, midY);
}

/**
 * Gets the screw hole coordinates for a panel.
 * 
 * @param {object} panel The panel object
 * @param {number} panelIndex The index of the panel
 * @returns {object} Object with bottomScrew and topScrew coordinates
 */
function getScrewHoleCoords(panel, panelIndex) {
    const panelHeight = getPanelHeightForRow(panelIndex);
    const railSeparation = getRailSeparationForRow(panelIndex);
    const screwDist = (panelHeight - railSeparation) / 2;
    const screwDistX = Math.cos(rad(panel.angle)) * screwDist;
    const screwDistY = Math.sin(rad(panel.angle)) * screwDist;
    const screwDistDepthX = Math.sin(rad(panel.angle)) * actualRailDepth;
    const screwDistDepthY = -Math.cos(rad(panel.angle)) * actualRailDepth;
    
    return {
        bottomScrew: {
            x: panel.coords[0] + screwDistX + screwDistDepthX,
            y: panel.coords[1] + screwDistY + screwDistDepthY
        },
        topScrew: {
            x: panel.coords[2] - screwDistX + screwDistDepthX,
            y: panel.coords[3] - screwDistY + screwDistDepthY
        }
    };
}

/**
 * Draws perpendicular distance indicators at each joint between rows.
 * Lines originate from the row surface, pass through the screw hole,
 * and extend perpendicular to that row until hitting the bottom or back of the case.
 *
 * @param {array} panels The panels array with coordinates
 * @param {number} maxX The maximum x coordinate (back of case)
 */
function drawJointDistanceIndicators(panels, maxX) {
    const savedStrokeStyle = ctx.strokeStyle;
    const savedFillStyle = ctx.fillStyle;
    const savedLineDash = ctx.getLineDash();
    
    const indicatorColor = "#888888";
    ctx.strokeStyle = indicatorColor;
    ctx.fillStyle = indicatorColor;
    ctx.setLineDash([3, 3]);
    
    for (let i = 1; i < panels.length; i++) {
        const prevRowAngle = getActualRowAngle(i - 1);
        const currentRowAngle = getActualRowAngle(i);
        const relativeAngle = rowAngles[i];
        
        // Get screw hole positions
        const prevScrews = getScrewHoleCoords(panels[i - 1], i - 1);
        const currentScrews = getScrewHoleCoords(panels[i], i);
        
        // Top screw of previous row (near the joint)
        const screw1 = prevScrews.topScrew;
        // Bottom screw of current row (near the joint)
        const screw2 = currentScrews.bottomScrew;
        
        if (relativeAngle === 0) {
            // Same angle - draw only one line through the current row's bottom screw
            const angle = currentRowAngle;
            const perpDirX = Math.sin(rad(angle));
            const perpDirY = -Math.cos(rad(angle));
            
            // Start point: go backwards from screw hole to the row surface (by actualRailDepth)
            const startX = screw2.x - perpDirX * actualRailDepth;
            const startY = screw2.y - perpDirY * actualRailDepth;
            
            // Calculate where perpendicular hits bottom (y=0) and back (x=maxX) from screw position
            const tBottom = screw2.y / Math.cos(rad(angle));
            const tBack = (maxX - screw2.x) / Math.sin(rad(angle));
            
            // Use whichever is hit first (smaller positive t)
            const t = (tBottom > 0 && tBack > 0) ? Math.min(tBottom, tBack) : Math.max(tBottom, tBack);
            const perpDist = Math.abs(t) + actualRailDepth;
            
            const endX = screw2.x + perpDirX * t;
            const endY = screw2.y + perpDirY * t;
            
            drawDistanceIndicator(startX, startY, endX, endY, perpDist, 5, -5);
        } else {
            // Different angles - draw two lines through respective screw holes
            
            // Line through top screw of previous row
            const angle1 = prevRowAngle;
            const perpDirX1 = Math.sin(rad(angle1));
            const perpDirY1 = -Math.cos(rad(angle1));
            
            // Start point: go backwards from screw hole to the row surface
            const startX1 = screw1.x - perpDirX1 * actualRailDepth;
            const startY1 = screw1.y - perpDirY1 * actualRailDepth;
            
            const tBottom1 = screw1.y / Math.cos(rad(angle1));
            const tBack1 = (maxX - screw1.x) / Math.sin(rad(angle1));
            const t1 = (tBottom1 > 0 && tBack1 > 0) ? Math.min(tBottom1, tBack1) : Math.max(tBottom1, tBack1);
            const perpDist1 = Math.abs(t1) + actualRailDepth;
            
            const endX1 = screw1.x + perpDirX1 * t1;
            const endY1 = screw1.y + perpDirY1 * t1;
            
            drawDistanceIndicator(startX1, startY1, endX1, endY1, perpDist1, -30, -3);
            
            // Line through bottom screw of current row
            const angle2 = currentRowAngle;
            const perpDirX2 = Math.sin(rad(angle2));
            const perpDirY2 = -Math.cos(rad(angle2));
            
            // Start point: go backwards from screw hole to the row surface
            const startX2 = screw2.x - perpDirX2 * actualRailDepth;
            const startY2 = screw2.y - perpDirY2 * actualRailDepth;
            
            const tBottom2 = screw2.y / Math.cos(rad(angle2));
            const tBack2 = (maxX - screw2.x) / Math.sin(rad(angle2));
            const t2 = (tBottom2 > 0 && tBack2 > 0) ? Math.min(tBottom2, tBack2) : Math.max(tBottom2, tBack2);
            const perpDist2 = Math.abs(t2) + actualRailDepth;
            
            const endX2 = screw2.x + perpDirX2 * t2;
            const endY2 = screw2.y + perpDirY2 * t2;
            
            drawDistanceIndicator(startX2, startY2, endX2, endY2, perpDist2, 5, -3);
        }
    }
    
    ctx.strokeStyle = savedStrokeStyle;
    ctx.fillStyle = savedFillStyle;
    ctx.setLineDash(savedLineDash);
}

/**
 * Writes out the summary data for the case.
 *
 * @param {number} width
 * @param {number} height
 * @param {array} outlinePoints
 * @param {array} railScrewCoords
 */
function writeSummary(width, height, outlinePoints, railScrewCoords) {
    var cabinetInfo = [
        "Cabinet depth and height: ",
        actualDistance(width, true) + " x " + actualDistance(height, true),
    ];
    const has1URows = rowIs1U.some(is1U => is1U);
    const oneUHeight = oneUFormats[selected1UFormat].height;
    let panelHeightInfo;
    if (has1URows) {
        panelHeightInfo = [
            "Panel heights: ",
            `3U: ${actualDistance(actualPanelHeight, true)}, 1U (${oneUFormats[selected1UFormat].name}): ${actualDistance(oneUHeight, true)}`,
        ];
    } else {
        panelHeightInfo = [
            "Panel height used: ",
            actualDistance(actualPanelHeight, true),
        ];
    }
    var panelDepthInfo = ["Panel depth used: ", actualDistance(actualPanelDepth, true)];
    var railDepthInfo = ["Rails depth inset: ", actualDistance(actualRailDepth, true)];
    var railSpacingInfo = [
        "Rail screw spacing*: ",
        actualDistance(actualRailSeparation, true),
    ];
    let totalRowtation = [`Top row absolute rotation: `, `${getActualRowAngle()}`];
    var footnote = [
        "*Note: rail spacing based on the measurements provided by " +
            '<a href="http://www.musicradar.com/tuition/tech/how-to-build-your-own-cardboard-' +
            "eurorack-modular-case-625196\">Future Music's cardboard DIY</a> " +
            "case using TipTop Audio Z-Rails.",
        "",
    ];
    var info = [
        cabinetInfo,
        panelHeightInfo,
        panelDepthInfo,
        railDepthInfo,
        railSpacingInfo,
        totalRowtation,
        footnote,
    ];
    // console.info(info.map(function(a) {
    //     return a.join("\t");
    // }).join("\n"));
    document.getElementById("summary-div").innerHTML = info
        .map(function (a) {
            return a[0] + "<b>" + a[1] + "</b>";
        })
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
    document.getElementById("summary-div-2").innerHTML = info2
        .map(function (a) {
            return a[0] + "<b>" + a[1] + "</b>";
        })
        .join("<br/>");
}

/**
 * Calculates the coordinates used for drawing the graphics.
 *
 * @param {number} x
 * @param {number} y
 * @returns x and y coordinates to be used for drawing.
 */
function getPlot(x, y) {
    return {
        x: startX() + x / heightRatio,
        y: startY() - y / heightRatio,
    };
}

/**
 * Convenience overload of the canvas context moveTo function using the getPlot
 * function above for drawing.
 *
 * @param {number} x
 * @param {number} y
 */
function moveTo(x, y) {
    var plot = getPlot(x, y);
    ctx.moveTo(plot.x, plot.y);
}

/**
 * Convenience overload of the canvas context lineTo function using the getPlot
 * function above for drawing.
 *
 * @param {number} x
 * @param {number} y
 */
function lineTo(x, y) {
    var plot = getPlot(x, y);
    ctx.lineTo(plot.x, plot.y);
}

/**
 * Rounds a number to a specified decimal place.
 * @param {number} v The number to round.
 * @param {number} p The decimal place to which to round.
 * @returns rounded number
 */
function roundToPlace(v, p) {
    return Math.round(v * Math.pow(10, p)) / Math.pow(10, p);
}

/**
 * Draws the screw locations for the rails for a eurorack row.
 *
 * @param {number} panel The panel object for which to draw the rail locations.
 * @param {number} panelIndex The index of the panel.
 */
function drawPanelRail(panel, panelIndex) {
    let p = [];
    var circR = 3;
    const panelHeight = getPanelHeightForRow(panelIndex);
    const railSeparation = getRailSeparationForRow(panelIndex);
    var screwDist = (panelHeight - railSeparation) / 2;
    var screwDistX = Math.cos(rad(panel.angle)) * screwDist;
    var screwDistY = Math.sin(rad(panel.angle)) * screwDist;
    var screwDistDepthX = Math.sin(rad(panel.angle)) * actualRailDepth;
    var screwDistDepthY = -Math.cos(rad(panel.angle)) * actualRailDepth;

    var screwX = panel.coords[0] + screwDistX + screwDistDepthX;
    var screwY = panel.coords[1] + screwDistY + screwDistDepthY;
    var plot = getPlot(screwX, screwY);

    ctx.beginPath();
    ctx.arc(plot.x, plot.y, circR, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, circR / 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
    writeCoords(screwX, screwY, true, 'right');
    p = p.concat(screwX, screwY);

    screwX = panel.coords[2] - screwDistX + screwDistDepthX;
    screwY = panel.coords[3] - screwDistY + screwDistDepthY;
    plot = getPlot(screwX, screwY);

    ctx.beginPath();
    ctx.arc(plot.x, plot.y, circR, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, circR / 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.closePath();
    writeCoords(screwX, screwY, true, 'left');
    p = p.concat(screwX, screwY);

    return p;
}

/**
 * Draws all the panel rails holes.
 *
 * @param {array} panels
 */
function drawPanelRails(panels) {
    let p = [];
    for (var i = 0; i < panels.length; i++) {
        p = p.concat(drawPanelRail(panels[i], i));
    }
    return p;
}

/**
 * Draws a path.
 * @param {array|arguments} pts Input data.
 */
function drawPath(pts) {
    if (!Array.isArray(pts)) {
        pts = Array.prototype.slice.call(arguments);
    }
    if (pts.length === 0) {
        return;
    }
    var shouldWriteCoords = true;
    if (typeof pts[0] !== "number") {
        pts.shift();
        shouldWriteCoords = false;
    }
    ctx.beginPath();
    moveTo(pts.shift(), pts.shift());
    while (pts.length > 0) {
        var x = pts.shift();
        var y = pts.shift();
        // console.info(x, y, pts[0]);
        lineTo(x, y);
        if (typeof pts[0] === "number") {
            if (shouldWriteCoords) {
                writeCoords(x, y);
            }
        } else {
            pts.shift();
        }
    }
    ctx.stroke();
    ctx.closePath();
}

/**
 * Writes the real life coordinates for a given point. This is used to label
 * the points in the drawing.
 * @param {number} x
 * @param {number} y
 * @param {boolean} showBelow
 * @param {string} side - 'left' or 'right' to position label on that side of the point
 */
function writeCoords(x, y, showBelow, side) {
    var yFactor = showBelow ? -1 : 1;
    ctx.font = "10px sans-serif";
    var plot = getPlot(x, y);
    var text = actualDistance(x) + ", " + actualDistance(y);
    var textWidth = ctx.measureText(text).width;
    
    var xOffset;
    if (side === 'left') {
        xOffset = -textWidth - 5;
    } else {
        xOffset = 5;
    }
    
    ctx.fillText(
        text,
        plot.x + xOffset,
        plot.y - 10 * yFactor
    );
}

/**
 * Creates the row angle inputs based on the number of rows.
 *
 * @param {number} i The row index value.
 * @param {number} value The starting value for the row input.
 * @returns
 */
function createRowInput(i, value) {
    const inputIdPrefix = "angle-";
    const rowInputs = document.getElementById("row-inputs");
    const el = document.createElement("span");
    el.className = "input-span";
    el.innerHTML = `Row ${i + 1} angle:&nbsp;`;

    const inp = document.createElement("input");
    inp.value = value;
    inp.id = `${inputIdPrefix}${i}`;
    const onChange = (event) => {
        // console.info("input change event", event.target.value, event);
        setTimeout(() => {
            const inputIndex = parseInt(event.target.id.split(inputIdPrefix)[1], 10);
            rowAngles[inputIndex] = parseFloat(event.target.value, 10);

            console.info(
                "input change event",
                event.target.value,
                event.target.id,
                inputIndex,
                rowAngles
            );
            drawSide();
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

    rowInputs.appendChild(el);

    return inp;
}

/**
 * Gets the panel height for a given row index based on whether it's 1U or 3U.
 *
 * @param {number} rowIndex The row index.
 * @returns The panel height in mm.
 */
function getPanelHeightForRow(rowIndex) {
    if (rowIs1U[rowIndex]) {
        return oneUFormats[selected1UFormat].height;
    }
    return actualPanelHeight;
}

/**
 * Gets the rail separation for a given row index based on whether it's 1U or 3U.
 *
 * @param {number} rowIndex The row index.
 * @returns The rail separation in mm.
 */
function getRailSeparationForRow(rowIndex) {
    if (rowIs1U[rowIndex]) {
        return oneUFormats[selected1UFormat].railSeparation;
    }
    return actualRailSeparation;
}

/**
 * Creates the 1U checkboxes for each row.
 *
 * @param {number} c The row count.
 */
function reset1UCheckboxes(c) {
    const container = document.getElementById("row-1u-checkboxes");
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    rowIs1U = rowIs1U.slice(0, c);
    while (rowIs1U.length < c) {
        rowIs1U.push(false);
    }
    
    for (let i = 0; i < c; i++) {
        const label = document.createElement("label");
        label.className = "row-1u-label";
        
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `row-1u-${i}`;
        checkbox.checked = rowIs1U[i];
        checkbox.addEventListener("change", (event) => {
            rowIs1U[i] = event.target.checked;
            update1UFormatVisibility();
            drawSide();
        });
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(`${i + 1}`));
        container.appendChild(label);
    }
    
    update1UFormatVisibility();
}

/**
 * Shows or hides the 1U format selector based on whether any rows are 1U.
 */
function update1UFormatVisibility() {
    const formatContainer = document.getElementById("oneU-format-container");
    const hasAny1U = rowIs1U.some(is1U => is1U);
    formatContainer.style.display = hasAny1U ? "inline" : "none";
}

/**
 * Redraws the row input elements.
 *
 * @param {number} c The row count.
 */
function resetRowInputs(c) {
    const rowInputs = document.getElementById("row-inputs");
    while (rowInputs.firstChild) {
        rowInputs.removeChild(rowInputs.firstChild);
    }
    rowAngles = rowAngles.slice(0, c);
    while (rowAngles.length < c) {
        rowAngles.push(defaultAngle);
    }
    for (let i = 0; i < rowCount; i++) {
        rowInputs[i] = createRowInput(i, rowAngles[i]);
    }
    
    reset1UCheckboxes(c);
}

/**
 * The initialization function for the page.
 */
function init() {
    // Handle rows
    const rowCountSelector = document.getElementById("rowCount");
    rowCountSelector.value = rowCount;
    rowCounts.forEach((c, i) => {
        const newOpt = document.createElement("option");
        newOpt.value = c;
        newOpt.innerHTML = c;
        rowCountSelector.appendChild(newOpt);
        if (rowCounts[i] === rowCount) {
            newOpt.selected = true;
        }
    });
    rowCountSelector.addEventListener("change", (event) => {
        console.info("event", event.target.value);
        rowCount = event.target.value;
        resetRowInputs(rowCount);
        drawSide();
    });
    resetRowInputs(rowCount);

    const oneUFormatRadios = document.querySelectorAll('input[name="oneUFormat"]');
    oneUFormatRadios.forEach(radio => {
        radio.addEventListener("change", (event) => {
            selected1UFormat = event.target.value;
            actual1UPanelHeight = oneUFormats[selected1UFormat].height;
            actual1URailSeparation = oneUFormats[selected1UFormat].railSeparation;
            drawSide();
        });
    });

    inputDepth = document.getElementById("the-input-depth");
    const onModuleDepthChange = (event) => {
        setTimeout(() => {
            actualPanelDepth = parseFloat(event.target.value);
            drawSide();
        }, 0);
    };
    inputDepth.addEventListener("input", onModuleDepthChange);

    calcRiseCb = document.getElementById("calc-rise");
    calcRiseCb.checked = !useStaticRise;
    const onCalcRiseChange = (event) => {
        setTimeout(() => {
            useStaticRise = !event.target.checked;
            drawSide();
        }, 0);
    };
    calcRiseCb.addEventListener("change", onCalcRiseChange);

    matThickness = document.getElementById("material-thickness");
    matThickness.value = caseMaterialThickness;
    const onMaterialThicknessChange = (event) => {
        setTimeout(() => {
            caseMaterialThickness = parseFloat(event.target.value);
            drawSide();
        }, 0);
    };
    matThickness.addEventListener("input", onMaterialThicknessChange);

    pxPerCmInput = document.getElementById("px-per-cm");
    pxPerCmInput.value = pxPerCm;
    const onPxPerCmChange = (event) => {
        setTimeout(() => {
            pxPerCm = parseFloat(event.target.value);
            panelHeight = actualPanelHeight * pxPerCm;
            heightRatio = actualPanelHeight / panelHeight;
            drawSide();
        }, 0);
    };
    pxPerCmInput.addEventListener("input", onPxPerCmChange);

    canvasDiv = document.getElementById("canvas-div");
    canvas = document.getElementById("the-canvas");
    ctx = canvas.getContext("2d");
    w = canvasDiv.clientWidth;
    h = canvasDiv.clientHeight;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = "rgb(0, 0, 0)";
    ctx.strokeStyle = "#999999";

    inputDepth.value = actualPanelDepth;

    drawSide();

    window.onresize = function () {
        w = canvasDiv.clientWidth;
        h = canvasDiv.clientHeight;
        // console.info(w,h);
        canvas.width = w;
        canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        drawSide();
    };
}
