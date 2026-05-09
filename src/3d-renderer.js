import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { state } from "./state.js";
import { calculateCaseGeometry, rad, getScrewHoleCoords } from "./geometry.js";
import { HP_TO_MM } from "./constants.js";

let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let canvasEl = null;
let rafHandle = null;
let isRunning = false;
let sceneRoot = null;

const COLOR_BOTTOM = 0x8b6f47;
const COLOR_FRONT = 0xa67c52;
const COLOR_BACK = 0xa67c52;
const COLOR_SHELF = 0x8b6f47;
const COLOR_SIDE = 0xc9a57b;
const COLOR_RAIL = 0xb0b0b0;
const COLOR_SCREW = 0x444444;
const COLOR_BG = 0xf2f2f2;

export function initThreeRenderer(canvas) {
  canvasEl = canvas;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio || 1);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR_BG);

  const w = canvas.clientWidth || 600;
  const h = canvas.clientHeight || 400;
  camera = new THREE.PerspectiveCamera(40, w / h, 1, 5000);
  camera.position.set(350, 250, 450);

  controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 60, 0);

  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
  dirLight.position.set(200, 400, 300);
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
  fillLight.position.set(-200, 100, -200);
  scene.add(fillLight);

  renderer.setSize(w, h, false);
}

function disposeNode(node) {
  node.traverse((child) => {
    if (child.geometry) {
      child.geometry.dispose();
    }
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material.dispose();
      }
    }
  });
}

export function disposeScene() {
  if (sceneRoot) {
    scene.remove(sceneRoot);
    disposeNode(sceneRoot);
    sceneRoot = null;
  }
}

function makeExtrudedFromPolygon(points2D, depthZ, material) {
  const shape = new THREE.Shape();
  shape.moveTo(points2D[0].x, points2D[0].y);
  for (let i = 1; i < points2D.length; i++) {
    shape.lineTo(points2D[i].x, points2D[i].y);
  }
  shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: depthZ,
    bevelEnabled: false,
    curveSegments: 4,
  });
  return new THREE.Mesh(geom, material);
}

function makeBoardMesh(points2D, depthZ, material, zOffset) {
  const mesh = makeExtrudedFromPolygon(points2D, depthZ, material);
  mesh.position.z = zOffset;
  return mesh;
}

function makeHorizontalRailMesh(panel, panelIndex, caseWidth, isBottom, totalRows) {
  const railLength = caseWidth + 2 * state.caseMaterialThickness; // Full width including side walls
  const railHeight = 15; // 15mm tall
  const railDepth = 10;  // 10mm deep

  const screws = getScrewHoleCoords(panel, panelIndex);
  const screwPos = isBottom ? screws.bottomScrew : screws.topScrew;

  // Position rail so the screw hole is in the center of the 10mm depth and 5mm from bottom
  const inwardX = Math.sin(rad(panel.angle));
  const inwardY = -Math.cos(rad(panel.angle));
  
  // Rail center should be railDepth/2 inward from the screw hole position
  const railCenterX = screwPos.x + inwardX * (railDepth / 2);
  const railCenterY = screwPos.y + inwardY * (railDepth / 2);
  
  // Adjust Y position so screw is 5mm from bottom of rail
  const screwOffsetFromBottom = 5; // 5mm from bottom of rail
  const railBottomOffset = railHeight / 2 - screwOffsetFromBottom;
  const railY = railCenterY + railBottomOffset * Math.cos(rad(panel.angle));
  const railX = railCenterX + railBottomOffset * Math.sin(rad(panel.angle));

  // Create rail geometry with holes drilled through it (width-wise, not length-wise)
  const railGeom = new THREE.BoxGeometry(railDepth, railHeight, railLength);
  const mat = new THREE.MeshLambertMaterial({ color: COLOR_RAIL });
  const mesh = new THREE.Mesh(railGeom, mat);

  // Add the screw hole as a dark cylinder going through the ENTIRE case width (Z direction)
  const holeMatGeom = new THREE.CylinderGeometry(1.5, 1.5, railLength + 10, 12);
  const holeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const holeVisMesh = new THREE.Mesh(holeMatGeom, holeMat);
  holeVisMesh.position.set(0, -railHeight/2 + screwOffsetFromBottom, 0);
  holeVisMesh.rotation.x = Math.PI / 2; // Rotate to go through case width (Z direction)
  
  mesh.add(holeVisMesh);

  // Rotate the rail to align with the panel angle
  mesh.rotation.z = rad(panel.angle);
  mesh.position.set(railX, railY, 0);
  
  return mesh;
}

function makeScrewHoleMesh(screw, angle, caseWidth, isLeft) {
  const radius = 1.6;
  const length = 4;
  const geom = new THREE.CylinderGeometry(radius, radius, length, 12);
  const mat = new THREE.MeshLambertMaterial({ color: COLOR_SCREW });
  const mesh = new THREE.Mesh(geom, mat);

  mesh.rotation.x = Math.PI / 2;

  const railWidth = 10;
  const zPos = isLeft
    ? -caseWidth / 2 + railWidth / 2 + state.caseMaterialThickness
    : caseWidth / 2 - railWidth / 2 - state.caseMaterialThickness;

  mesh.position.set(screw.x, screw.y, zPos);
  return mesh;
}

function pointsFromOutline(outline) {
  return outline.map((p) => ({ x: p.x, y: p.y }));
}

export function buildScene() {
  if (!scene) return;

  disposeScene();

  const geom = calculateCaseGeometry();
  const caseWidth = state.caseWidthHP * HP_TO_MM;
  const sideThickness = state.caseMaterialThickness;
  const innerWidth = caseWidth;

  sceneRoot = new THREE.Group();

  const matBottom = new THREE.MeshLambertMaterial({ color: COLOR_BOTTOM });
  const matFront = new THREE.MeshLambertMaterial({ color: COLOR_FRONT });
  const matBack = new THREE.MeshLambertMaterial({ color: COLOR_BACK });
  const matShelf = new THREE.MeshLambertMaterial({ color: COLOR_SHELF });
  const matSide = new THREE.MeshLambertMaterial({
    color: COLOR_SIDE,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });

  const sideOutlinePts = pointsFromOutline(geom.outline).filter(
    (_, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1];
      return !(Math.abs(prev.x - arr[i].x) < 0.001 && Math.abs(prev.y - arr[i].y) < 0.001);
    }
  );

  const leftSide = makeBoardMesh(sideOutlinePts, sideThickness, matSide, -innerWidth / 2 - sideThickness);
  const rightSide = makeBoardMesh(sideOutlinePts, sideThickness, matSide, innerWidth / 2);
  sceneRoot.add(leftSide);
  sceneRoot.add(rightSide);

  if (geom.baseBoardOutline && geom.baseBoardOutline.length > 0) {
    const basePts = geom.baseBoardOutline.map((p) => ({ x: p.x, y: p.y }));
    const baseMesh = makeBoardMesh(
      basePts,
      innerWidth + 2 * sideThickness,
      matBottom,
      -innerWidth / 2 - sideThickness
    );
    sceneRoot.add(baseMesh);
  }

  if (geom.frontPieceOutline && geom.frontPieceOutline.length > 0) {
    const frontPts = geom.frontPieceOutline.map((p) => ({ x: p.x, y: p.y }));
    const frontMesh = makeBoardMesh(frontPts, innerWidth, matFront, -innerWidth / 2);
    sceneRoot.add(frontMesh);
  }

  if (geom.backPieceOutline && geom.backPieceOutline.length > 0) {
    const backPts = geom.backPieceOutline.map((p) => ({ x: p.x, y: p.y }));
    const backMesh = makeBoardMesh(backPts, innerWidth, matBack, -innerWidth / 2);
    sceneRoot.add(backMesh);
  }

  if (state.flattenTopShelf && geom.shelfPieceOutline && geom.shelfPieceOutline.length > 0) {
    const shelfPts = geom.shelfPieceOutline.map((p) => ({ x: p.x, y: p.y }));
    const shelfMesh = makeBoardMesh(shelfPts, innerWidth, matShelf, -innerWidth / 2);
    sceneRoot.add(shelfMesh);
  }

  geom.panels.forEach((panel, i) => {
    // Add horizontal rails that span the full case width (now with holes drilled through them)
    sceneRoot.add(makeHorizontalRailMesh(panel, i, innerWidth, true, geom.panels.length));  // Bottom rail
    sceneRoot.add(makeHorizontalRailMesh(panel, i, innerWidth, false, geom.panels.length)); // Top rail

    // Add screw holes in the side panels (DO NOT MOVE THESE - they stay exactly where they are)
    const screws = getScrewHoleCoords(panel, i);
    sceneRoot.add(makeScrewHoleMesh(screws.bottomScrew, panel.angle, innerWidth, true));
    sceneRoot.add(makeScrewHoleMesh(screws.topScrew, panel.angle, innerWidth, true));
    sceneRoot.add(makeScrewHoleMesh(screws.bottomScrew, panel.angle, innerWidth, false));
    sceneRoot.add(makeScrewHoleMesh(screws.topScrew, panel.angle, innerWidth, false));
  });

  const cx = geom.maxX / 2;
  const cy = geom.maxY / 2;
  sceneRoot.position.set(-cx, 0, 0);

  scene.add(sceneRoot);

  const maxDim = Math.max(geom.maxX, geom.maxY, innerWidth);
  const dist = maxDim * 1.8;
  camera.position.set(dist * 0.7, dist * 0.55, dist * 0.9);
  controls.target.set(0, cy, 0);
  controls.update();
}

function renderLoop() {
  if (!isRunning) return;
  controls.update();
  renderer.render(scene, camera);
  rafHandle = requestAnimationFrame(renderLoop);
}

export function startRenderLoop() {
  if (isRunning) return;
  isRunning = true;
  rafHandle = requestAnimationFrame(renderLoop);
}

export function stopRenderLoop() {
  isRunning = false;
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
}

export function resizeThreeCanvas(w, h) {
  if (!renderer || !camera) return;
  if (w <= 0 || h <= 0) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  if (isRunning) {
    renderer.render(scene, camera);
  }
}

export function isThreeRunning() {
  return isRunning;
}
