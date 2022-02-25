/*
 * Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

(async function () {
  const isArSessionSupported = navigator.xr && navigator.xr.isSessionSupported && await navigator.xr.isSessionSupported("immersive-ar");
  if (isArSessionSupported) {
    document.getElementById("enter-ar").addEventListener("click", window.app.activateXR)
  } else {
    onNoXRDevice();
    //document.getElementById("enter-fake").addEventListener("click", activateFake);
  }
})();
var modalStatus = 0;
var modalClicked = 0;
var glbFilePath = '../assets/Telescope.glb';
var stops = [60 / 24, 70 / 24, 80 / 24, 90 / 24, 100 / 24, 110 / 24, 120 / 24];
var titles = ["Annibale de Gasparis:", "You:", "Annibale de Gasparis:", "You:", "Annibale de Gasparis:", "You:", "Annibale de Gasparis:"];
var descriptions =
  [
    "There it is again! I knew my lens was clean!",
    "What is it? A planet? Perhaps a spiral nebulae?",
    "No! Though it is as faint as one of Messier's spiral nebulae, it orbits about the sun along a familiar path. This must be another minor planet!",
    "Well, what shall you name this one? Last year, in 1851, you called your fourth asteroid Eunomia, one of the Horae of Greek mythology.",
    "Yes...and as I've discovered it in the same place, the Naples Observatory, it shall go by...Psyche. Named after the goddess of the soul.",
    "Excellent! How does it feel to have discovered your 5th asteroid, and 16th asteroid in history?",
    "Different somehow. I cannot describe it, but I feel that something peculiar about Psyche is yet to be known..."
  ];
var pfpSrcArray = ["..\\assets\\gasPfp.PNG", "..\\assets\\defaultPfp.png", "..\\assets\\gasPfp.PNG", "..\\assets\\defaultPfp.png", "..\\assets\\gasPfp.PNG", "..\\assets\\defaultPfp.png", "..\\assets\\gasPfp.PNG"]
var animationLength = 120 / 24;
DemoUtils.setAnimationLength(animationLength);
var animationIndex = 0;
const modal = document.getElementById("modal2");

const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalPfp = document.getElementById("profilePicture");
modalTitle.innerHTML = titles[0];
modalDescription.innerHTML = descriptions[0];
modalPfp.src = pfpSrcArray[0];

const recenterButton = document.getElementById("recenter");
recenterButton.onclick = function () {
  console.log("recenter attempt");
  modalClicked = 1;
  window.app.recenter();
}

// const viewButton = document.getElementById("ViewButton");
// viewButton.onclick = function () {
//   console.log("View");
//   //modal.style.animation='reversePop 0.3s linear';
//   modal.style.display = "None";
//   modalStatus = 0;
//   modalClicked = 1;
// };
const nextButton = document.getElementById("NextButton");
nextButton.onclick = function () {
  console.log("Next");
  //modal.style.animation='reversePop 0.3s linear';
  modal.style.display = "None";

  DemoUtils.setNextTimeStop(stops[animationIndex]);
  animationIndex++;
  if (animationIndex == stops.length - 1) {
    nextButton.innerHTML = "Finish"
    nextButton.onclick = function () {
      //location.reload();
      window.open("https://psyche.asu.edu/mission/the-asteroid/");
    }
  }
  if (animationIndex >= stops.length) {
    nextButton.innerHTML = "Next"
    animationIndex = 0;
  }
  DemoUtils.resumeAnimation();

  var endTime = stops[animationIndex];
  var beginningTime = 0;
  if (animationIndex != 0) {
    beginningTime = stops[animationIndex - 1];
  }
  else {
    beginningTime = stops[animationIndex];
    endTime = animationLength;
    if (beginningTime == endTime) {
      // need to account for end of animation, not sure if we want to just end the experience or loop through yet.
      beginningTime = 0;
      endTime = 1;

    }
  }

  var modalTime = endTime - beginningTime;
  console.log(modalTime + " = " + endTime + " - " + beginningTime);
  setTimeout(function () { openModal(); }, modalTime * 1000);

  modalStatus = 0;
  modalStatus = -1;
  modalClicked = 1;
};

let gl = null;
let renderer = null;


console.log("Setup complete");

function openModal() {
  modalTitle.innerHTML = titles[animationIndex];
  modalDescription.innerHTML = descriptions[animationIndex];
  modalPfp.src = pfpSrcArray[animationIndex];
  modal.style.display = "Block";
  modalStatus = 0;
}

/**
 * Container class to manage connecting to the WebXR Device API
 * and handle rendering on every frame.
 */
class App {
  /**
   * Run when the Start AR button is pressed.
   */
  activateXR = async () => {
    console.log("activate xr");
    try {
      // Initialize a WebXR session using "immersive-ar".
      this.xrSession = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ['hit-test', 'dom-overlay'],
        domOverlay: { root: document.body }
      });

      // Create the canvas that will contain our camera's background and our virtual scene.
      this.createXRCanvas();

      // With everything set up, start the app.
      await this.onSessionStarted();
    } catch (e) {
      console.log(e);
      onNoXRDevice();
    }
  }

  /**
   * Add a canvas element and initialize a WebGL context that is compatible with WebXR.
   */
  createXRCanvas() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);
    this.gl = this.canvas.getContext("webgl", { xrCompatible: true });

    this.xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(this.xrSession, this.gl)
    });
  }

  /**
   * Called when the XRSession has begun. Here we set up our three.js
   * renderer, scene, and camera and attach our XRWebGLLayer to the
   * XRSession and kick off the render loop.
   */
  onSessionStarted = async () => {
    // Add the `ar` class to our body, which will hide our 2D components
    document.body.classList.add('ar');

    // To help with working with 3D on the web, we'll use three.js.
    this.setupThreeJs();

    // Setup an XRReferenceSpace using the "local" coordinate system.
    this.localReferenceSpace = await this.xrSession.requestReferenceSpace('local');

    // Create another XRReferenceSpace that has the viewer as the origin.
    this.viewerSpace = await this.xrSession.requestReferenceSpace('viewer');
    // Perform hit testing using the viewer as origin.
    this.hitTestSource = await this.xrSession.requestHitTestSource({ space: this.viewerSpace });

    // Start a rendering loop using this.onXRFrame.
    this.xrSession.requestAnimationFrame(this.onXRFrame);

    this.xrSession.addEventListener("select", this.onSelect);

    this.numTaps = 0;


  }

  recenter = () => {
    console.log("recentering");
    if (window.rover) {
      window.rover.position.copy(this.reticle.position);
    }

  }

  onSelect = () => {
    this.numTaps += 1;

    //DemoUtils.resumeAnimation();

    console.log(this.numTaps);
    //console.log("modalStatus:"+modalStatus);

    if (modalClicked == 1) {
      modalClicked = 0;
      return;
    }

    if (modalStatus == 0 && DemoUtils.getTimescale() == 0) {
      console.log(modalStatus);

      modal.style.display = "block";
      modalStatus = 1;

      console.log(modalStatus);
    }


    /*
    if(this.numTaps % 2 == 0){
      DemoUtils.stopAnimation();
    }
    else{
      DemoUtils.resumeAnimation();
    }
    */



  }

  /**
   * Called on the XRSession's requestAnimationFrame.
   * Called with the time and XRPresentationFrame.
   */
  onXRFrame = (time, frame) => {
    // Queue up the next draw request.
    this.xrSession.requestAnimationFrame(this.onXRFrame);

    // Bind the graphics framebuffer to the baseLayer's framebuffer.
    const framebuffer = this.xrSession.renderState.baseLayer.framebuffer
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer)
    this.renderer.setFramebuffer(framebuffer);

    // Retrieve the pose of the device.
    // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
    const pose = frame.getViewerPose(this.localReferenceSpace);
    if (pose) {
      // In mobile AR, we only have one view.
      const view = pose.views[0];

      const viewport = this.xrSession.renderState.baseLayer.getViewport(view);
      this.renderer.setSize(viewport.width, viewport.height)

      // Use the view's transform matrix and projection matrix to configure the THREE.camera.
      this.camera.matrix.fromArray(view.transform.matrix)
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
      this.camera.updateMatrixWorld(true);

      // Conduct hit test.
      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      // If we have results, consider the environment stabilized.
      if (!this.stabilized && hitTestResults.length > 0) {
        this.stabilized = true;
        document.body.classList.add('stabilized');
        if (window.rover) {
          const hitPose = hitTestResults[0].getPose(this.localReferenceSpace);
          // place 3d model once we are stabilized
          //const clone = window.rover.clone();
          modal.style.display = "block";
          modalStatus = 1;
          const clone = window.rover;
          //clone.scale.set(.1, .1, .1);
          clone.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z)
          this.scene.add(clone)

          const shadowMesh = this.scene.children.find(c => c.name === 'shadowMesh');
          shadowMesh.position.y = clone.position.y;
          DemoUtils.resumeAnimation();

        }
      }
      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(this.localReferenceSpace);

        // Update the reticle position
        this.reticle.visible = false;
        this.reticle.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z)
        this.reticle.updateMatrixWorld(true);
      }

      if (window.rover) {
        const rover = window.rover;
        rover.rotation.set(rover.rotation.x, rover.rotation.y + 0.00, rover.rotation.z);
        //rover.scale.set(.1, .1, .1);
      }

      // Render the scene with THREE.WebGLRenderer.
      this.renderer.render(this.scene, this.camera)
    }
  }



  /**
   * Initialize three.js specific rendering code, including a WebGLRenderer,
   * a demo scene, and a camera for viewing the 3D content.
   */
  setupThreeJs() {
    // To help with working with 3D on the web, we'll use three.js.
    // Set up the WebGLRenderer, which handles rendering to our session's base layer.
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: this.canvas,
      context: this.gl
    });
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize our demo scene.
    this.scene = DemoUtils.createLitScene();
    this.reticle = new Reticle();
    this.scene.add(this.reticle);

    // We'll update the camera matrices directly from API, so
    // disable matrix auto updates so three.js doesn't attempt
    // to handle the matrices independently.
    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
  }
};

window.app = new App();
console.log("app created");


function activateFake() {
  console.log("test2");
  window.app.activateXR();

}
