"use strict";

var input, canvasDiv, canvas, calcRiseCb, ctx, w, h;

var inputDepth, input1, input2, matThickness, pxPerCmInput;

var actualPanelHeight = 133.4;
var actualRailSeparation = 123;
var actualRailDepth = 14;
var actualPanelDepth = 55;
var useStaticRise = false;
var caseMaterialThickness = 5;

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

function rad(d) {
    return (d / 180) * Math.PI;
}

function actualDistance(d, showInches) {
    var t = Math.abs(roundToPlace(d, 1)) + "mm";
    if (showInches) {
        t += " (" + Math.abs(roundToPlace(d / 25.4, 1)) + "in)";
    }
    return t;
}

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

    panels = [
        {
            angle: angle1,
            coords: [],
        },
        {
            angle: angle1 + angle2,
            coords: [],
        },
    ];

    var frontPieceOutline = [];
    var backPieceOutline = [];

    add(0, 0);

    // bottom panel goes underneath the sides, front, and back

    var bottomPanelDepth = useStaticRise
        ? actualPanelDepth
        : Math.abs(actualPanelDepth * Math.sin(Math.PI / 2 - rad(angle1)));
    add(x, y + bottomPanelDepth);

    // Add the points for drawing the dotted line representing the cardboard
    // piece for the case front on the other side of the side panel.
    frontPieceOutline.push(
        x + Math.cos(rad(angle1)) * caseMaterialThickness,
        y + Math.sin(rad(angle1)) * caseMaterialThickness
    );
    frontPieceOutline.push(x + Math.cos(rad(angle1)) * caseMaterialThickness, 0);
    frontPieceOutline.push(0, 0);
    add(
        x + Math.cos(rad(angle1)) * caseMaterialThickness,
        y + Math.sin(rad(angle1)) * caseMaterialThickness,
        "nowrite"
    );

    panels[0].coords.push(x, y);
    add(
        x + Math.cos(rad(angle1)) * actualPanelHeight,
        y + Math.sin(rad(angle1)) * actualPanelHeight
    );
    panels[0].coords.push(x, y);

    panels[1].coords.push(x, y);
    add(
        x + Math.cos(rad(angle1 + angle2)) * actualPanelHeight,
        y + Math.sin(rad(angle1 + angle2)) * actualPanelHeight,
        "nowrite"
    );
    panels[1].coords.push(x, y);

    // Add the points for drawing the dotted line representing the cardboard
    // piece for the case back on the other side of the side panel.
    backPieceOutline.push(x, y);
    backPieceOutline.push(
        x + Math.sin(rad(angle1 + angle2)) * actualPanelDepth,
        y - Math.cos(rad(angle1 + angle2)) * actualPanelDepth
    );
    backPieceOutline.push(x + Math.sin(rad(angle1 + angle2)) * actualPanelDepth, 0);

    add(
        x + Math.cos(rad(angle1 + angle2)) * caseMaterialThickness,
        y + Math.sin(rad(angle1 + angle2)) * caseMaterialThickness
    );

    add(
        x + Math.sin(rad(angle1 + angle2)) * actualPanelDepth,
        y - Math.cos(rad(angle1 + angle2)) * actualPanelDepth
    );
    add(x, 0);
    add(0, 0);

    ctx.setLineDash([1, 5]);
    ctx.beginPath();
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

    frontPieceOutline.unshift("false");
    backPieceOutline.unshift("false");
    ctx.beginPath();
    drawPath(frontPieceOutline);
    ctx.closePath();
    ctx.beginPath();
    drawPath(backPieceOutline);
    ctx.closePath();

    ctx.setLineDash([]);
    drawPath(p);

    drawPanelRails(panels);

    writeSummary(maxX, maxY);
}

function writeSummary(width, height) {
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
}

function getPlot(x, y) {
    return {
        x: startX() + x / heightRatio,
        y: startY() - y / heightRatio,
    };
}

function moveTo(x, y) {
    var plot = getPlot(x, y);
    ctx.moveTo(plot.x, plot.y);
}

function lineTo(x, y) {
    var plot = getPlot(x, y);
    ctx.lineTo(plot.x, plot.y);
}

function roundToPlace(v, p) {
    return Math.round(v * Math.pow(10, p)) / Math.pow(10, p);
}

function drawPanelRail(panel) {
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
}

function drawPanelRails(panels) {
    for (var i = 0; i < panels.length; i++) {
        drawPanelRail(panels[i]);
    }
}

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

function writeCoords(x, y, showBelow) {
    var yFactor = showBelow ? -1 : 1;
    ctx.font = "10px sans-serif";
    var plot = getPlot(x, y);
    ctx.fillText(
        actualDistance(x) + ", " + actualDistance(y),
        plot.x + 5,
        plot.y - 10 * yFactor
    );
}

function init() {
    input1 = document.getElementById("the-input-one");
    input2 = document.getElementById("the-input-two");

    inputDepth = document.getElementById("the-input-depth");
    calcRiseCb = document.getElementById("calc-rise");
    calcRiseCb.checked = !useStaticRise;
    matThickness = document.getElementById("material-thickness");
    matThickness.value = caseMaterialThickness;
    pxPerCmInput = document.getElementById("px-per-cm");
    pxPerCmInput.value = pxPerCm;

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
    input1.value = angle1;
    input2.value = angle2;

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

function changeValue(event) {
    // console.info(event.target);
    switch (event.target) {
        case inputDepth: {
            actualPanelDepth = parseFloat(event.target.value);
            break;
        }
        case input1: {
            angle1 = parseFloat(event.target.value);
            break;
        }
        case input2: {
            angle2 = parseFloat(event.target.value);
            break;
        }
        case calcRiseCb: {
            useStaticRise = !event.target.checked;
            break;
        }
        case matThickness: {
            caseMaterialThickness = parseFloat(event.target.value);
            break;
        }
        case pxPerCmInput: {
            pxPerCm = parseFloat(event.target.value);
            panelHeight = actualPanelHeight * pxPerCm;
            heightRatio = actualPanelHeight / panelHeight;
            break;
        }
    }

    drawSide();
}
