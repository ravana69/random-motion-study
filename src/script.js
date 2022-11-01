"use strict";

window.addEventListener("load",function() {

  let canv, ctx;    // canvas and context
  let maxx, maxy;   // canvas dimensions
  let ui, uiv;      // user interface controls and values
  let rp;           // random path

// for animation
  let messages;

// shortcuts for Math.
  const mrandom = Math.random;
  const mfloor = Math.floor;
  const mround = Math.round;
  const mceil = Math.ceil;
  const mabs = Math.abs;
  const mmin = Math.min;
  const mmax = Math.max;

  const mPI = Math.PI;
  const mPIS2 = Math.PI / 2;
  const mPIS3 = Math.PI / 3;
  const m2PI = Math.PI * 2;
  const m2PIS3 = Math.PI * 2 / 3;
  const msin = Math.sin;
  const mcos = Math.cos;
  const matan2 = Math.atan2;

  const mhypot = Math.hypot;
  const msqrt = Math.sqrt;

  const rac3   = msqrt(3);
  const rac3s2 = rac3 / 2;

//------------------------------------------------------------------------

function alea (mini, maxi) {
// random number in given range

  if (typeof(maxi) == 'undefined') return mini * mrandom(); // range 0..mini

  return mini + mrandom() * (maxi - mini); // range mini..maxi
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function intAlea (mini, maxi) {
// random integer in given range (mini..maxi - 1 or 0..mini - 1)
//
  if (typeof(maxi) == 'undefined') return mfloor(mini * mrandom()); // range 0..mini - 1
  return mini + mfloor(mrandom() * (maxi - mini)); // range mini .. maxi - 1
}

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function Noise1DOneShot (periodmin, periodmax, min = 0, max = 1, random) {
/* returns a 1D single-shot noise generator.
   the (optional) random function must return a value between 0 and 1
  the returned function has no parameter, and will return a new number every tiime it is called.
  If the random function provides reproductible values (and is not used elsewhere), this
  one will return reproductible values too.
  period should be > 1. The bigger period is, the smoother output noise is
*/
  random = random || Math.random;
  let currx = random(); // start with random offset
  let y0 = min + (max - min) * random(); // 'previous' value
  let y1 = min + (max - min) * random(); // 'next' value
  let period = periodmin + (periodmax - periodmin) * random()
  let dx = 1 / period;

  return function() {
    currx += dx;
    if (currx > 1) {
      currx -= 1;
      period = periodmin + (periodmax - periodmin) * random()
      dx = 1 / period;
      y0 = y1;
      y1 = min + (max - min) * random();
    }
    let z = (3 - 2 * currx) * currx * currx;
    return z * y1 + (1 - z) * y0;
  }
} // Noise1DOneShot

//------------------------------------------------------------------------
// User Interface (controls)
//------------------------------------------------------------------------
function toggleMenu() {
  if (menu.classList.contains("hidden")) {
    menu.classList.remove ("hidden");
    this.innerHTML ="close controls";
  } else {
    menu.classList.add ("hidden");
    this.innerHTML ="controls";
  }
} // toggleMenu

//------------------------------------------------------------------------
function prepareUI() {

// toggle menu handler

  document.querySelector("#controls").addEventListener("click", toggleMenu);

  ui = {};  // User Interface HTML elements
  uiv = {}; // User Interface values of controls

  ['winding', 'step', 'speed', 'radius', 'stroke'].forEach(ctrlName => ui[ctrlName] = document.getElementById(ctrlName));

  registerControl("winding", readUIFloat, "input");
  registerControl("step",readUIFloat,"input");
  registerControl("speed",readUIFloat,"input");
  registerControl("radius",readUIFloat,"input");
  registerControl("stroke",readUICheck,"input");

  readUI();

} // prepareUI

//------------------------------------------------------------------------
function readUI() {

  if (ui.registered) {
    for (const ctrl in ui.registered) ui.registered[ctrl].readF();
  }
} // readUI

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function registerControl (controlName, readFunction, changeEvent, changedFunction) {
/* provides simple way to associate controls with their read / update / changeEvent / changed functions
since many (but not all) controls work almost the same way */
/* changeEvent and changedFunction are optional */

  const ctrl = ui[controlName];
  ui.registered = ui.registered || [];
  ui.registered.push(ctrl); // NEVER register a control twice !!!
  ctrl.readF = readFunction;
  if (changeEvent) {
    ctrl.addEventListener(changeEvent, (event) => {
      readFunction.call(ctrl);
      if (changedFunction) changedFunction.call(ctrl,event);
    });
  }
} // registerControl
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function readUIFloat() {
  uiv[this.id] = parseFloat(this.value);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function readUIInt(ctrl, event) {
  uiv[this.id] = parseInt(this.value);
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function readUICheck(ctrl, event) {
  uiv[this.id] = this.checked;
}
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
function convertedWinding() {
  let val = uiv.winding
  const min = 0.5, max = 0.04; // inverted scale
  return max * val + min * (1 - val);
}
//------------------------------------------------------------------------
function RandomPath(x0, y0, width, height) {
/* object to generate a random path in given rectangle
The path MAY go outside of the rectangle
*/

  this.lRef = mmin(width, height);
  this.MINDIST = this.lRef * convertedWinding(); // minimum distance between consecutive points
  this.MINANGLE = 0.75; // minimum angle between two consecutive branches of path

  this.xmin = x0;
  this.xmax = x0 + width;
  this.ymin = y0;
  this.ymax = y0 + height;

// 1st point - anywhere
  this.p0 = [alea(this.xmin, this.xmax), alea(this.ymin, this.ymax)];

// 2nd point - far enough from 1st
  do {
      this.p1 = [alea(this.xmin, this.xmax), alea(this.ymin, this.ymax)];
  } while (mhypot(this.p1[0] - this.p0[0], this.p1[1] - this.p0[1]) < this.MINDIST);

// 3rd and 4th points - respecting distance and angle constraints
  this.p2 = this.nextPoint(this.p0, this.p1);
  this.p3 = this.nextPoint(this.p1, this.p2);

/* we will draw the segment between p1 and p2 - need tangents in those points
*/
  this.tp1 = RandomPath.bezierTangents(this.p0, this.p1, this.p2);
  this.tp2 = RandomPath.bezierTangents(this.p1, this.p2, this.p3);

/* calculate coefficients for parametric equation of curve
*/
  this.coeffs = RandomPath.bezierControlToParam([this.p1, this.tp1[1], this.tp2[0], this.p2]);

// let's begin at time 0
  this.alpha = 0;
  this.currentPosition = this.p1.slice();

} // RandomPath

//-----------------------------------------------------------------------------

RandomPath.bezierTangents = function (p0, p1, p2) {

const coeff = 0.6;
// Returns points for the two tangents surrounding p1

  const dx0 = p0[0] - p1[0];
  const dy0 = p0[1] - p1[1];
  const l0  = mhypot (dx0, dy0);

  const dx2 = p2[0] - p1[0];
  const dy2 = p2[1] - p1[1];
  const l2  = mhypot (dx2, dy2);

  let xmid = dx0 / l0 + dx2 / l2;
  let ymid = dy0 / l0 + dy2 / l2;
  const lmid = mhypot (xmid, ymid); // sure this is not 0 ( p0p1p2 can't be 0/180 degrees)
  xmid /= lmid;     // at unity distance on bisector of angle
  ymid /= lmid;
// perpendicular to bissector is (ymid, -xmid)

  const lproj1 = ymid * dx0 - xmid * dy0; // length of projection of p1-p0

  const xa = p1[0] + coeff * lproj1 * ymid;
  const ya = p1[1] - coeff * lproj1 * xmid;

  const lproj2 = ymid * dx2 - xmid * dy2; // length of projection of p1-p2

  const xb = p1[0] + coeff * lproj2 * ymid;
  const yb = p1[1] - coeff * lproj2 * xmid;

  return[[xa, ya], [xb, yb]];

} // Bezier Tangents
//-----------------------------------------------------------------------------

RandomPath.bezierControlToParam = function(bezier) {
/* takes array of 4 points */
/* returns array 4 arrays of [x, y] coefficient in parametric equation of Bezier cubic */

  let x, y;

  const a0 = bezier[0][0];
  const a1 = -3 * bezier[0][0] + 3 * bezier[1][0];
  const a2 = 3 * bezier[0][0] - 6 * bezier[1][0] + 3 * bezier[2][0];
  const a3 = - bezier[0][0] + 3 * bezier[1][0] - 3 * bezier[2][0] + bezier[3][0];

  const b0 = bezier[0][1];
  const b1 = -3 * bezier[0][1] + 3 * bezier[1][1];
  const b2 = 3 * bezier[0][1] - 6 * bezier[1][1] + 3 * bezier[2][1];
  const b3 = - bezier[0][1] + 3 * bezier[1][1] - 3 * bezier[2][1] + bezier[3][1];

  return [[a0, b0], [a1, b1], [a2, b2], [a3, b3]];

} // bezierControlToParam

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
RandomPath.prototype.move = function() {

/* use the derivative and step to calculate change in alpha, assuming step is small */

  const speed = mhypot (this.coeffs[1][0] + this.alpha * (2 * this.coeffs[2][0] + this.alpha * 3 * this.coeffs[3][0]),
                        this.coeffs[1][1] + this.alpha * (2 * this.coeffs[2][1] + this.alpha * 3 * this.coeffs[3][1]));
  const dAlpha = uiv.step / speed;
  if (this.alpha + dAlpha > 1) {
    this.nextSegment();
  } else {
    this.alpha += dAlpha;
    this.currentPosition = this.getPosition(this.alpha);
  }

} // RandomPath.prototype.move

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

RandomPath.prototype.nextSegment = function () {
/* gets ready for next Bezier arc */

  this.MINDIST = this.lRef * convertedWinding(); // minimum distance between consecutive points

// shift points
  this.p0 = this.p1;
  this.p1 = this.p2;
  this.p2 = this.p3;
  this.p3 = this.nextPoint(this.p1, this.p2);
  this.tp1 = this.tp2;
  this.tp2 = RandomPath.bezierTangents(this.p1, this.p2, this.p3);

/* calculate coefficients for parametric equation of curve
*/
  this.coeffs = RandomPath.bezierControlToParam([this.p1, this.tp1[1], this.tp2[0], this.p2]);

/* find alpha for the point at distance uiv.step from currentPoint */
  let runAt1 = mhypot(this.p1[0] - this.currentPosition[0], this.p1[1] - this.currentPosition[1]);
  if (runAt1 >= uiv.step) { // should not happen
    this.alpha = 0;
  } else {
    let dist = uiv.step - runAt1; // distance left to run
    let speed = mhypot(this.coeffs[1][0], this.coeffs[1][1]); // derivative is coeffs[1]
    this.alpha = mmin(dist / speed, 1.0); // should never be > 1)
  }
  this.currentPosition = this.getPosition(this.alpha);

} // RandomPath.prototype.nextSegment

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
RandomPath.prototype.getPosition = function (alpha) {
  return [this.coeffs[0][0] + alpha * (this.coeffs[1][0] + alpha * (this.coeffs[2][0] + alpha * this.coeffs[3][0])),
          this.coeffs[0][1] + alpha * (this.coeffs[1][1] + alpha * (this.coeffs[2][1] + alpha * this.coeffs[3][1]))];
} // RandomPath.prototype.getPosition
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

RandomPath.prototype.nextPoint = function (p0, p1) {
/* returns point p2
  - at a distance greater than MINDIST from p0 and p1
  - abs(angle p0, p1, p2) > MINANGLE) (not too acute, not too wide)
*/
  let x, y;
  let nbTries = 10000; // very few tries on the average
  while (true) {
    if (--nbTries == 0) throw ("nbTries == 0 in nextPoint");
    x = alea(this.xmin, this.xmax);
    y = alea(this.ymin, this.ymax);
    const d0 = mhypot(x - p0[0], y - p0[1]);
    if ( d0 < this.MINDIST) continue;
    const d1 = mhypot(x - p1[0], y - p1[1]);
    if ( d1 < this.MINDIST) continue;
    if ( d1 > 3 * this.MINDIST) continue;
    if (mabs(angle3Points(p0, p1, [x, y])) < this.MINANGLE) continue;
    return [x, y]; // found a good point
  }
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
  function angle3Points (p0, p1, p2) {
  // returns the angle p0-p1-p2, rather than the angle itself
  // unexpected results to be expected if distances 0 (or too small)

    const dx0 = p0[0] - p1[0];
    const dy0 = p0[1] - p1[1];

    const dx2 = p2[0] - p1[0];
    const dy2 = p2[1] - p1[1];

    const pv = dx0 * dy2 - dx2 * dy0;
    const ps = dx0 * dx2 + dy0 * dy2;
    return matan2 (pv, ps);

  } //


} // RandomPath.prototype.nextPoint

//------------------------------------------------------------------------

let animate;

{ // scope for animate

let animState = 0;
let hue, fndHue;

animate = function(tStamp) {

  let message;

  message = messages.shift();
  if (message && message.message == 'reset') animState = 0;
  if (message && message.message == 'click') animState = 0;
  window.requestAnimationFrame(animate)

  switch (animState) {

    case 0 :
      if (startOver()) {
        hue = intAlea(360);
        fndHue = Noise1DOneShot(100, 200, -2, 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#000";
        ++animState;
      }
      break;

    case 1 :
      let nbLoops = 1 + uiv.speed * 100;
      let tLoop = mmax(0,(uiv.speed - 0.7) * 30); // up to 0.3 * 30 = 10 ms
      do {
        hue += fndHue();
        if (hue > 360) hue -= 360;
        else if (hue < 0) hue += 360;
        rp.move();
        ctx.fillStyle = `hsl(${hue},100%,50%)`;
        ctx.beginPath();
        ctx.arc(rp.currentPosition[0], rp.currentPosition[1], uiv.radius,0, m2PI);
        if (uiv.stroke) ctx.stroke();
        ctx.fill();
      } while(--nbLoops > 0 || performance.now() - tStamp < tLoop);
      break;

    case 2:
      break;

  } // switch

} // animate
} // scope for animate

//------------------------------------------------------------------------
//------------------------------------------------------------------------

function startOver() {

// canvas dimensions

  maxx = window.innerWidth;
  maxy = window.innerHeight;

  canv.width = maxx;
  canv.height = maxy;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,maxx,maxy);

  rp = new RandomPath(20, 20, maxx - 40, maxy - 40);

  return true;

} // startOver

//------------------------------------------------------------------------

function mouseClick (event) {

  messages.push({message:'click'});

} // mouseClick

//------------------------------------------------------------------------
//------------------------------------------------------------------------
// beginning of execution

  {
    canv = document.createElement('canvas');
    canv.style.position="absolute";
    document.body.appendChild(canv);
    ctx = canv.getContext('2d');
  } // création CANVAS
  canv.addEventListener('click',mouseClick);
  messages = [{message:'reset'}];
  prepareUI();
  requestAnimationFrame (animate);

}); // window load listener
