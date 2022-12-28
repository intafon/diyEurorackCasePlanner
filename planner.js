"use strict";

document.addEventListener("DOMContentLoaded", function () {
    init();
});

var input, canvasDiv, canvas, calcRiseCb, ctx, w, h;
let rowCounts = [1, 2, 3, 4, 5];
let rowCount = rowCounts[2];
let rowAngles = [5, 10, 10];
let rowInputs = [];
let defaultAngle = 5;

var inputDepth, matThickness, pxPerCmInput;

var actualPanelHeight = 133.4;
var actualRailSeparation = 123;
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
        panels[i].coords.push(x, y);
        add(
            x + Math.cos(rad(getActualRowAngle(i))) * actualPanelHeight,
            y + Math.sin(rad(getActualRowAngle(i))) * actualPanelHeight,
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

    writeSummary(maxX, maxY, pathCoords, railScrewCoords);
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
    var panelHeightInfo = [
        "Panel height used: ",
        actualDistance(actualPanelHeight, true),
    ];
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
 */
function drawPanelRail(panel) {
    let p = [];
    var circR = 3;
    var screwDist = (actualPanelHeight - actualRailSeparation) / 2;
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
    writeCoords(screwX, screwY, true);
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
    writeCoords(screwX, screwY, true);
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
        p = p.concat(drawPanelRail(panels[i]));
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
 */
function writeCoords(x, y, showBelow, offsetX, offsetY) {
    var yFactor = showBelow ? -1 : 1;
    ctx.font = "10px sans-serif";
    var plot = getPlot(x, y);
    ctx.fillText(
        actualDistance(x) + ", " + actualDistance(y),
        plot.x + 5,
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
