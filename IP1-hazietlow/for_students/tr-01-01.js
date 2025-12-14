/*jshint esversion: 6 */
// @ts-check

// these two things are the main UI code for the train
// students learned about them in last week's workbook

import { draggablePoints } from "../libs/CS559/dragPoints.js";
import { RunCanvas } from "../libs/CS559/runCanvas.js";

// this is a utility that adds a checkbox to the page 
// useful for turning features on and off
import { makeCheckbox } from "../libs/CS559/inputHelpers.js";

/**
 * Have the array of control points for the track be a
 * "global" (to the module) variable
 *
 * Note: the control points are stored as Arrays of 2 numbers, rather than
 * as "objects" with an x,y. Because we require a Cardinal Spline (interpolating)
 * the track is defined by a list of points.
 *
 * things are set up with an initial track
 */
/** @type Array<number[]> */
let thePoints = [
  [100, 100],
  [100, 500],
  [300, 450],
  [500, 500],
  [500, 100],
  [300, 150]
];

const numCars = 5;
const carSeparation = 75;
const carLength = 50;
const carWidth = 25;
const railSeparation = 15;
let tension = 0.0;

let smokeParticles = [];
const smokeEmitRate = 5;
const smokeMaxLife = 100;
const smokeInitialSize = 3;

const flowerOffset = 50;
const flowerSpacing = 100;

function sub(p1, p2) {
  return [p2[0] - p1[0], p2[1] - p1[1]];
}

function scale(p, s){
  return [p[0]*s, p[1]*s];
}

function add(p1, p2){
  return [p1[0]+p2[0], p1[1]+p2[1]];
}

function normalize(v){
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1]);
  if(len === 0) return [0,0];
  return [v[0]/len, v[1]/len];
}

function cardinalToBezier(p0, p1, p2, p3){
  const c = tension;
  const factor = (1 - c);

  const T0 = scale(sub(p0, p2), factor);
  const T1 = scale(sub(p1, p3), factor);

  const cp0 = p1;
  const cp3 = p2;

  const cp1 = add(p1, scale(T0, 1/3));
  const T1_scaled = scale(T1, 1/3);
  const cp2 = sub(T1_scaled, cp3);

  return [cp0, cp1, cp2, cp3];
}

function getPointAndTangentOnBezier(bezierPoints, u){
  const P0 = bezierPoints[0];
  const P1 = bezierPoints[1];
  const P2 = bezierPoints[2];
  const P3 = bezierPoints[3];

  const u2 = u * u;
  const u3 = u2 * u;
  const one_minus_u = 1 - u;
  const one_minus_u2 = one_minus_u * one_minus_u;
  const one_minus_u3 = one_minus_u2 * one_minus_u;

  const x = P0[0] * one_minus_u3 + P1[0] * 3 * one_minus_u2 * u + P2[0] * 3 * one_minus_u * u2 + P3[0] * u3;
  const y = P0[1] * one_minus_u3 + P1[1] * 3 * one_minus_u2 * u + P2[1] * 3 * one_minus_u * u2 + P3[1] * u3;

  const term1_x = (P1[0] - P0[0]) * 3 * one_minus_u2;
  const term1_y = (P1[1] - P0[1]) * 3 * one_minus_u2;

  const term2_x = (P2[0] - P1[0]) * 6 * one_minus_u * u;
  const term2_y = (P2[1] - P1[1]) * 6 * one_minus_u * u;

  const term3_x = (P3[0] - P2[0]) * 3 * u2;
  const term3_y = (P3[1] - P2[1]) * 3 * u2;

  const Tx = term1_x + term2_x + term3_x;
  const Ty = term1_y + term2_y + term3_y;

  return {
    position:[x, y],
    tangent: [Tx, Ty]
  };
}


let arcLengthTable = [];
let totalLength = 0;
const arcLengthSamples = 100;

function drawFlower(context, position, normal){
  const [px, py] = position;
  const [Nx, Ny] = normal;
  const [flower_x, flower_y] = add(position, scale(normal, flowerOffset));
  context.save();
  context.translate(flower_x, flower_y);

  context.fillStyle = "pink";
  context.beginPath();
  context.arc(0, 0, 8, 0, Math.PI * 2);
  context.fill();
  
  context.fillStyle = "white";
  context.beginPath();
  context.arc(0, 0, 5, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "yellow";
  context.beginPath();
  context.arc(0, 0, 3, 0, Math.PI * 2);
  context.fill();

  context.restore();
}


function setupArcLengthTable(){
  arcLengthTable = [];
  totalLength = 0;
  const N = thePoints.length;
  if (N < 2) return;

  let bezierSegments = [];
  for(let i = 0; i < N; i++){
    const p0 = thePoints[(i - 1 + N) % N];
    const p1 = thePoints[i];
    const p2 = thePoints[(i + 1) % N];
    const p3 = thePoints[(i + 2) % N];

    bezierSegments.push(cardinalToBezier(p0, p1, p2, p3));
  }

  for(let segmentIndex = 0; segmentIndex < N; segmentIndex++){
    const currentBezier = bezierSegments[segmentIndex];
    arcLengthTable.push({
      u: segmentIndex,
      length: totalLength
    });

    let lastPosition = currentBezier[0];
    for(let j = 1; j <= arcLengthSamples; j++){
      const u_local = j / arcLengthSamples;
      const { position } = getPointAndTangentOnBezier(currentBezier, u_local);
      const [px, py] = position;

      const dx = px - lastPosition[0];
      const dy = py - lastPosition[1];
      const deltaLength = Math.sqrt(dx*dx + dy*dy);

      totalLength += deltaLength;

      arcLengthTable.push({
        u: segmentIndex + u_local,
        length: totalLength
      });
      lastPosition = position;
    }
  }
}

function getTrackParamFromLength(targetLength){
  const N = thePoints.length;
  if(totalLength === 0 || N < 2) return 0;
  if(targetLength > totalLength) return N;

  let low = arcLengthTable[0];
  let high = arcLengthTable[arcLengthTable.length - 1];

  for(let i = 1; i < arcLengthTable.length; i++){
    if(arcLengthTable[i].length >= targetLength){
      high = arcLengthTable[i];
      low = arcLengthTable[i - 1];
      break;
    }
  }

  if(high.length === low.length) return low.u;

  const lengthFraction = (targetLength - low.length) / (high.length - low.length);
  return low.u + lengthFraction * (high.u - low.u);
}

function drawParallelRails(context, bezierSegments, N){
  const numStepsPerSegment = 200;

  context.strokeStyle = "gray";
  context.lineWidth = 3;

  const drawOneRail = (isRightRail) => {
    context.beginPath();
    let isFirstPoint = true;

    for(let segmentIndex = 0; segmentIndex < N; segmentIndex++){
      const currentBezier = bezierSegments[segmentIndex];
      const startStep = (segmentIndex === 0) ? 0 : 1; 
      for(let i = startStep; i <= numStepsPerSegment; i++){
        const u = i / numStepsPerSegment;
        const { position, tangent } = getPointAndTangentOnBezier(currentBezier, u);
        const [px, py] = position;
        const [Tx, Ty] = tangent;

        const normalVector = normalize([-Ty, Tx]);
        const [Nx, Ny] = normalVector;

        const offset = isRightRail ? 1 : -1;
        const dx = Nx * railSeparation * offset;
        const dy = Ny * railSeparation * offset;

        const Px = px + dx;
        const Py = py + dy;

        if(isFirstPoint){
          context.moveTo(Px, Py);
          isFirstPoint = false;
        } else {
          context.lineTo(Px, Py);
        }
      }
    }
    context.closePath();
    context.stroke();
  };
  drawOneRail(false);
  drawOneRail(true);
}

function drawCar(context, position, angle, carIndex){
  const [px, py] = position;
  const carHalfLength = carLength / 2;
  const carHalfWidth = carWidth / 2;

  context.save();
  context.translate(px, py);
  context.rotate(angle);

  let mainColor;
  let detailColor = "black";

  if(carIndex === 0){
    mainColor = "darkgray";
    detailColor = "gold";
  } else if(carIndex === 1){
    mainColor = "blue";
  } else {
    mainColor = "pink";
  }

  context.fillStyle = mainColor;
  context.beginPath();
  context.fillRect(-carHalfLength, -carHalfWidth, carLength, carWidth);
  context.strokeStyle = "black";
  context.lineWidth = 1;
  context.strokeRect(-carHalfLength, -carHalfWidth, carLength, carWidth);

  if(carIndex === 0){
    context.fillStyle = detailColor;
    context.beginPath();
    context.moveTo(carHalfLength, 0);
    context.lineTo(carHalfLength - 10, -carHalfWidth);
    context.lineTo(carHalfLength - 10, carHalfWidth);
    context.closePath();
    context.fill();
    context.stroke();
  } else {
    context.fillStyle = "white";
    context.fillRect(-carHalfLength + 5, -carHalfWidth + 4, carLength - 10, carWidth - 8);
    context.lineWidth = 1.5;
    context.strokeRect(-carHalfLength + 5, -carHalfWidth + 4, carLength - 10, carWidth - 8);
  }
  context.restore();
}

function updateSmokeParticles(delta_t = 1){
  smokeParticles = smokeParticles.filter(p => p.opacity >0);
  for(const p of smokeParticles){
    p.x += p.initialTangent[0] * p.speed * 0.1 * delta_t;
    p.y += p.initialTangent[1] * p.speed * 0.1 * delta_t;
    p.opacity -= (1/smokeMaxLife)*delta_t;
    p.size *= 0.99;
  }
}

function drawSmokeParticles(context){
  for(const p of smokeParticles){
    context.fillStyle = `rgba(100, 100, 100, ${p.opacity})`;
    context.beginPath();
    context.arc(p.x, p.y, p.size, 0, Math.PI*2);
    context.fill();
  }
}

/**
 * Draw function - this is the meat of the operation
 *
 * It's the main thing that needs to be changed
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} param
 */
function draw(canvas, param) {
  let context = canvas.getContext("2d");
    // clear the screen
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "darkgreen";
    context.fillRect(0, 0, canvas.height, canvas.width);
  
    context.strokeStyle = "rgb(105, 105, 105)"; 
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, canvas.height * 0.7);
    context.lineTo(canvas.width, canvas.height * 0.7);
    context.stroke();

    

    const N = thePoints.length;
    if (N < 2) return; 


    let bezierSegments = [];
    for(let i = 0; i < N; i++){
      const p0 = thePoints[(i - 1 + N) % N];
      const p1 = thePoints[i];
      const p2 = thePoints[(i + 1) % N];
      const p3 = thePoints[(i + 2) % N];

      const bezierPoints = cardinalToBezier(p0, p1, p2, p3);
      bezierSegments.push(bezierPoints);
    }
    
    if(!document.getElementById("check-simple-track").checked){
      drawParallelRails(context, bezierSegments, N);
    } else {
      context.beginPath();
      context.moveTo(bezierSegments[0][0][0], bezierSegments[0][0][1]);

      bezierSegments.forEach(bps => {
        context.bezierCurveTo(
          bps[1][0], bps[1][1],
          bps[2][0], bps[2][1],
          bps[3][0], bps[3][1]
        )
      });
      context.strokeStyle = "black";
      context.lineWidth = 3;
      context.stroke();
    }

    if(totalLength > 0 && !document.getElementById("check-simple-track").checked){
      const railTieSpacing = 30;
      const tieHalfLength = railSeparation + 5;
      const tieThickness = 5;

      context.strokeStyle = "saddlebrown";
      context.lineWidth = tieThickness;

      for(let currentLength = 0; currentLength < totalLength; currentLength += railTieSpacing){
        if(totalLength - currentLength < railTieSpacing){
          if(currentLength > 0){
            break;
          }
        }

        const trackParam = getTrackParamFromLength(currentLength);

        const segmentIndex = Math.floor(trackParam) % N;
        const u = trackParam - Math.floor(trackParam);

        const currentBezier = bezierSegments[segmentIndex];
        const { position, tangent } = getPointAndTangentOnBezier(currentBezier, u);
        const [px, py] = position;
        const [Tx, Ty] = tangent;

        const normalVector = normalize([-Ty, Tx]);
        const [Nx, Ny] = normalVector;

        const dx = Nx * tieHalfLength;
        const dy = Ny * tieHalfLength;

        context.beginPath();
        context.moveTo(px - dx, py - dy);
        context.lineTo(px + dx, py + dy);
        context.stroke();
      }
    }

    if (totalLength > 0 && !document.getElementById("check-simple-track").checked) {
      const N_segments = thePoints.length;

      // Draw flowers along the length of the track
      for (let currentLength = 0; currentLength < totalLength; currentLength += flowerSpacing) {
        
        // Use the arc length function to find the position on the track
        const trackParam = getTrackParamFromLength(currentLength);

        const segmentIndex = Math.floor(trackParam) % N_segments;
        const u = trackParam - Math.floor(trackParam);

        const currentBezier = bezierSegments[segmentIndex];
        const { position, tangent } = getPointAndTangentOnBezier(currentBezier, u);
        const [Tx, Ty] = tangent;

        // Calculate the normal vector to the track
        const normalVector = normalize([-Ty, Tx]); 
        
        // Draw the flower offset from the track position along the normal
        drawFlower(context, position, normalVector);
      }
    }
    
    let leadingCarTrackParam = param;
    let leadingCarTargetLength = 0;
    if(document.getElementById("check-arc-length").checked && totalLength > 0){
      const N_segments = thePoints.length;
      const sliderValue = param % N_segments;
      const normalizedParam = sliderValue / N_segments;
      leadingCarTargetLength = normalizedParam * totalLength;
    } else {
      leadingCarTrackParam = param % N;
    }

    let firstCarPosition = null;
    let firstCarTangent = null;
    
    for(let i = 0; i < numCars; i++){
      let currentTrackParam;
      if(document.getElementById("check-arc-length").checked && totalLength > 0){
        let desiredLength = leadingCarTargetLength - i * carSeparation;
        if(desiredLength < 0){
          desiredLength += totalLength;
        }
        currentTrackParam = getTrackParamFromLength(desiredLength);
      } else {
        let rawParam = leadingCarTrackParam - i * (carSeparation / totalLength * N);
        currentTrackParam = rawParam % N;
        if(currentTrackParam < 0){
          currentTrackParam += N;
        }
      }


    
      const segmentIndex = Math.floor(currentTrackParam) % N;
      const u = currentTrackParam - Math.floor(currentTrackParam);

      const currentBezier = bezierSegments[segmentIndex];

      const { position, tangent } = getPointAndTangentOnBezier(currentBezier, u);
    
      const [px, py] = position;
      const [Tx, Ty] = tangent;

      const angle = Math.atan2(Ty, Tx);

      drawCar(context, position, angle, i);

      if (i === 0) {
          firstCarPosition = position;
          firstCarTangent = tangent;
      }
    }

    if (firstCarPosition && firstCarTangent) {
        const [Px, Py] = firstCarPosition;
        const [Tx, Ty] = firstCarTangent;
        
        const carHalfLength = carLength / 2;
        const normal = normalize([-Ty, Tx]); 
        const direction = normalize([Tx, Ty]); 

        const smoke_start_x = Px + direction[0] * carHalfLength;
        const smoke_start_y = Py + direction[1] * carHalfLength;
        
        for (let j = 0; j < smokeEmitRate; j++) {
            const rand_offset_x = (Math.random() - 0.5) * 5;
            const rand_offset_y = (Math.random() - 0.5) * 5;
            const rand_speed = 1.0 + Math.random();

            const smoke_dir_x = -(direction[0] * 0.5) + (normal[0] * (Math.random() - 0.5) * 2);
            const smoke_dir_y = -(direction[1] * 0.5) + (normal[1] * (Math.random() - 0.5) * 2);
            
            smokeParticles.push({
                x: smoke_start_x + rand_offset_x,
                y: smoke_start_y + rand_offset_y,
                size: smokeInitialSize,
                opacity: 1.0,
                initialTangent: normalize([smoke_dir_x, smoke_dir_y]), 
                speed: rand_speed
            });
        }
    }

    context.fillStyle = "red";
    thePoints.forEach(function(pt) {
      context.beginPath();
      context.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
      context.closePath();
      context.fill();
    });

    updateSmokeParticles();
    drawSmokeParticles(context);
}

/**
 * Initialization code - sets up the UI and start the train
 */
let canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("canvas1"));
let context = canvas.getContext("2d");

// we need the slider for the draw function, but we need the draw function
// to create the slider - so create a variable and we'll change it later
let slider; // = undefined;

let tensionSlider;

// note: we wrap the draw call so we can pass the right arguments
function wrapDraw() {
  if(tensionSlider){
    tension = Number(tensionSlider.value);
  }
    // do modular arithmetic since the end of the track should be the beginning
    draw(canvas, Number(slider.value) % thePoints.length);
}
// create a UI
let runcanvas = new RunCanvas(canvas, wrapDraw);
// now we can connect the draw function correctly
slider = runcanvas.range;

// note: if you add these features, uncomment the lines for the checkboxes
// in your code, you can test if the checkbox is checked by something like:
// document.getElementById("check-simple-track").checked
// in your drawing code
// WARNING: makeCheckbox adds a "check-" to the id of the checkboxes
//
// lines to uncomment to make checkboxes
makeCheckbox("simple-track");
makeCheckbox("arc-length").checked=true;
//makeCheckbox("bspline");

tensionSlider = document.getElementById("tension-slider");
if(tensionSlider){
  tensionSlider.oninput = function() {
    setupArcLengthTable();
    wrapDraw();
  };
  tension = Number(tensionSlider.value);
}

// helper function - set the slider to have max = # of control points
function setNumPoints() {
    runcanvas.setupSlider(0, thePoints.length, 0.05);
    setupArcLengthTable();
}

setNumPoints();
runcanvas.setValue(0);

// add the point dragging UI
draggablePoints(canvas, thePoints, wrapDraw, 10, setNumPoints);


// CS559 2025 Workbook
