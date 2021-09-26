import { useEffect, useRef, useState } from "react";

import "./MediaPipeStyle.css";
import "./ControlUtils.css";
import "./LandmarkGrid.css";
// import gradePose from "./GradePose";
// import usePoseGrader from "./gradePose";

import DeviceDetector from "device-detector-js";
import { Box, Center } from "@chakra-ui/layout";
import { Spinner } from "@chakra-ui/spinner";

export default function MediaPipe({
  gridRef,
  webcamRef,
  setLoaded,
  expectedAnnotations,
  expectedDuration,
  setAccuracy,
}) {
  const canvasRef = useRef(null);
  // const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [spinnerActive, setSpinnerActive] = useState(true);

  // Usage: testSupport({client?: string, os?: string}[])
  // Client and os are regular expressions.
  // See: https://cdn.jsdelivr.net/npm/device-detector-js@2.2.10/README.md for
  // legal values for client and os
  testSupport([{ client: "Chrome" }]);
  function testSupport(supportedDevices) {
    const deviceDetector = new DeviceDetector();
    const detectedDevice = deviceDetector.parse(navigator.userAgent);
    let isSupported = false;
    for (const device of supportedDevices) {
      if (device.client !== undefined) {
        const re = new RegExp(`^${device.client}$`);
        if (!re.test(detectedDevice.client.name)) {
          continue;
        }
      }
      if (device.os !== undefined) {
        const re = new RegExp(`^${device.os}$`);
        if (!re.test(detectedDevice.os.name)) {
          continue;
        }
      }
      isSupported = true;
      break;
    }
    if (!isSupported) {
      alert(
        `This demo, running on ${detectedDevice.client.name}/${detectedDevice.os.name}, ` +
          `is not well supported at this time, expect some flakiness while we improve our code.`
      );
    }
  }

  // const [gradePose] = usePoseGrader(expectedAnnotations, window.POSE_LANDMARKS);

  useEffect(() => {
    setLoaded(false);
    const controls = window;
    const LandmarkGrid = window.LandmarkGrid;
    const drawingUtils = window;
    const mpPose = window;
    const options = {
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${mpPose.VERSION}/${file}`;
      },
    };
    // Our input frames will come from here.
    // const videoElement = webcamRef.current; // webcamRef.current;

    const canvasElement = canvasRef.current;
    const controlsElement = controlsRef.current;
    const canvasCtx = canvasElement.getContext("2d");
    // We'll add this to our control panel later, but we'll save it here so we can
    // call tick() each time the graph runs.
    const fpsControl = new controls.FPS();
    // Optimization: Turn off animated spinner after its hiding animation is done.
    // const spinner = null;
    // spinner.ontransitionend = () => {
    //   spinner.style.display = 'none';
    // };

    const landmarkContainer = gridRef.current;
    const grid = new LandmarkGrid(landmarkContainer, {
      connectionColor: 0xcccccc,
      definedColors: [
        { name: "LEFT", value: 0xffa500 },
        { name: "RIGHT", value: 0x00ffff },
      ],
      range: 2,
      fitToGrid: true,
      labelSuffix: "m",
      landmarkSize: 2,
      numCellsPerAxis: 4,
      showHidden: false,
      centered: true,
    });

    let activeEffect = "mask";
    function onResults(results) {
      // Hide the spinner.
      setSpinnerActive(false);
      setLoaded(true);

      document.body.classList.add("loaded");
      // Update the frame rate.
      fpsControl.tick();
      // Draw the overlays.
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      if (results.segmentationMask) {
        canvasCtx.drawImage(
          results.segmentationMask,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        // Only overwrite existing pixels.
        if (activeEffect === "mask" || activeEffect === "both") {
          canvasCtx.globalCompositeOperation = "source-in";
          // This can be a color or a texture or whatever...
          canvasCtx.fillStyle = "#00FF007F";
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        } else {
          canvasCtx.globalCompositeOperation = "source-out";
          canvasCtx.fillStyle = "#0000FF7F";
          canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
        }
        // Only overwrite missing pixels.
        canvasCtx.globalCompositeOperation = "destination-atop";
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        canvasCtx.globalCompositeOperation = "source-over";
      } else {
        canvasCtx.drawImage(
          results.image,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
      }
      if (results.poseLandmarks) {
        const drawRadius = 10;

        drawingUtils.drawConnectors(
          canvasCtx,
          results.poseLandmarks,
          mpPose.POSE_CONNECTIONS,
          { visibilityMin: 0.65, color: "white" }
        );
        drawingUtils.drawLandmarks(
          canvasCtx,
          Object.values(mpPose.POSE_LANDMARKS_LEFT).map(
            (index) => results.poseLandmarks[index]
          ),
          {
            visibilityMin: 0.65,
            color: "white",
            fillColor: "rgb(255,138,0)",
            radius: drawRadius,
          }
        );
        drawingUtils.drawLandmarks(
          canvasCtx,
          Object.values(mpPose.POSE_LANDMARKS_RIGHT).map(
            (index) => results.poseLandmarks[index]
          ),
          {
            visibilityMin: 0.65,
            color: "white",
            fillColor: "rgb(0,217,231)",
            radius: drawRadius,
          }
        );
        drawingUtils.drawLandmarks(
          canvasCtx,
          Object.values(mpPose.POSE_LANDMARKS_NEUTRAL).map(
            (index) => results.poseLandmarks[index]
          ),
          {
            visibilityMin: 0.65,
            color: "white",
            fillColor: "white",
            radius: drawRadius,
          }
        );

        // add annotation
        // drawingUtils.drawLandmarks(
        //   canvasCtx,
        //   [{x: .5, y: .5, z: -1, visibility: 1}],
        //   { visibilityMin: 0.65, color: "white", fillColor: "rgb(255,0,0)" }
        // );

        // console.log(expectedAnnotations);

        // console.log(mpPose.POSE_LANDMARKS);

        const color = "rgb(255, 56, 228)";
        if (expectedAnnotations.length > 0) {
          const startTime = localStorage.getItem("record-start");
          const frame =
            startTime > 0
              ? Math.round(
                  (expectedAnnotations.length * (Date.now() - startTime)) /
                    (1000 * expectedDuration)
                )
              : 0;
          if (frame > 0 && frame < expectedAnnotations.length) {
            const keys = Object.keys(expectedAnnotations[frame]);

            const leftAnchor1 =
              results.poseLandmarks[mpPose.POSE_LANDMARKS["RIGHT_SHOULDER"]];
            const rightAnchor1 =
              results.poseLandmarks[mpPose.POSE_LANDMARKS["LEFT_SHOULDER"]];
            const leftAnchor2 =
              results.poseLandmarks[mpPose.POSE_LANDMARKS["RIGHT_HIP"]];
            const rightAnchor2 =
              results.poseLandmarks[mpPose.POSE_LANDMARKS["LEFT_HIP"]];

            const breadthReal =
              (leftAnchor1.x - rightAnchor1.x) *
                (leftAnchor1.x - rightAnchor1.x) +
              (leftAnchor2.x - rightAnchor2.x) *
                (leftAnchor2.x - rightAnchor2.x);
            const breadthExpected =
              (expectedAnnotations[frame]["LEFT_SHOULDER"].x -
                expectedAnnotations[frame]["RIGHT_SHOULDER"].x) *
                (expectedAnnotations[frame]["LEFT_SHOULDER"].x -
                  expectedAnnotations[frame]["RIGHT_SHOULDER"].x) +
              (expectedAnnotations[frame]["LEFT_SHOULDER"].y -
                expectedAnnotations[frame]["RIGHT_SHOULDER"].y) *
                (expectedAnnotations[frame]["LEFT_SHOULDER"].y -
                  expectedAnnotations[frame]["RIGHT_SHOULDER"].y);
            const scale = Math.sqrt(breadthReal / breadthExpected);

            const drawPoints = [];
            const drawPointsFull = [];
            for (let i = 0; i < results.poseLandmarks.length; i++) {
              drawPointsFull.push({ x: 0, y: 0, z: 0, visibility: 0 });
            }

            for (let i = 0; i < keys.length; i++) {
              const key = keys[i];
              const drawObj = expectedAnnotations[frame][key];

              // drawObj.x = 1-drawObj.x;

              if (key === "LEFT_SHOULDER") {
                drawPoints.push(leftAnchor1);
              } else if (key === "LEFT_ELBOW" || key === "LEFT_WRIST") {
                const dx =
                  drawObj.x - expectedAnnotations[frame]["LEFT_SHOULDER"].x;
                const dy =
                  drawObj.y - expectedAnnotations[frame]["LEFT_SHOULDER"].y;
                drawPoints.push({
                  x: -scale * dx + leftAnchor1.x,
                  y: scale * dy + leftAnchor1.y,
                  z: drawObj.z,
                  visibility: drawObj.visibility,
                });
              } else if (key === "LEFT_HIP") {
                drawPoints.push(leftAnchor2);
              } else if (key === "LEFT_KNEE" || key === "LEFT_ANKLE") {
                const dx = drawObj.x - expectedAnnotations[frame]["LEFT_HIP"].x;
                const dy = drawObj.y - expectedAnnotations[frame]["LEFT_HIP"].y;
                drawPoints.push({
                  x: -scale * dx + leftAnchor2.x,
                  y: scale * dy + leftAnchor2.y,
                  z: drawObj.z,
                  visibility: drawObj.visibility,
                });
              } else if (key === "RIGHT_SHOULDER") {
                drawPoints.push(rightAnchor1);
              } else if (key === "RIGHT_ELBOW" || key === "RIGHT_WRIST") {
                const dx =
                  drawObj.x - expectedAnnotations[frame]["RIGHT_SHOULDER"].x;
                const dy =
                  drawObj.y - expectedAnnotations[frame]["RIGHT_SHOULDER"].y;
                drawPoints.push({
                  x: -scale * dx + rightAnchor1.x,
                  y: scale * dy + rightAnchor1.y,
                  z: drawObj.z,
                  visibility: drawObj.visibility,
                });
              } else if (key === "RIGHT_HIP") {
                drawPoints.push(rightAnchor2);
              } else if (key === "RIGHT_KNEE" || key === "RIGHT_ANKLE") {
                const dx =
                  drawObj.x - expectedAnnotations[frame]["RIGHT_HIP"].x;
                const dy =
                  drawObj.y - expectedAnnotations[frame]["RIGHT_HIP"].y;
                drawPoints.push({
                  x: -scale * dx + rightAnchor2.x,
                  y: scale * dy + rightAnchor2.y,
                  z: drawObj.z,
                  visibility: drawObj.visibility,
                });
              }

              const lastPoint = drawPoints[drawPoints.length - 1];
              drawPointsFull[mpPose.POSE_LANDMARKS[key]] = lastPoint;

              // drawingUtils.drawLandmarks(
              //   canvasCtx,
              //   [drawObj],
              //   { visibilityMin: 0.5, color: "white", fillColor: color }
              // );
            }

            // const accuracy = gradePose(results.poseLandmarks, frame);
            // setAccuracy(accuracy);

            drawingUtils.drawLandmarks(
              canvasCtx,
              drawPoints.map((el) => {
                // return {...el, x: 1 - el.x};
                return el;
              }),
              { visibilityMin: 0.5, color: color, fillColor: color, radius: 10 }
            );

            drawingUtils.drawConnectors(
              canvasCtx,
              drawPointsFull.map((el) => {
                // return {...el, x: 1 - el.x};
                return el;
              }),
              mpPose.POSE_CONNECTIONS,
              { visibilityMin: 0.5, color: color, fillColor: color }
            );
          }
        }
      }
      canvasCtx.restore();
      if (results.poseWorldLandmarks) {
        grid.updateLandmarks(
          results.poseWorldLandmarks,
          mpPose.POSE_CONNECTIONS,
          [
            { list: Object.values(mpPose.POSE_LANDMARKS_LEFT), color: "LEFT" },
            {
              list: Object.values(mpPose.POSE_LANDMARKS_RIGHT),
              color: "RIGHT",
            },
          ]
        );
      } else {
        grid.updateLandmarks([]);
      }
    }
    const pose = new mpPose.Pose(options);
    pose.onResults(onResults);
    // Present a control panel through which the user can manipulate the solution
    // options.
    new controls.ControlPanel(controlsElement, {
      selfieMode: true,
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: true,
      smoothSegmentation: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
      effect: "background",
    })
      .add([
        new controls.StaticText({ title: "MediaPipe Pose" }),
        fpsControl,
        new controls.Toggle({ title: "Selfie Mode", field: "selfieMode" }),
        new controls.SourcePicker({
          onSourceChanged: () => {
            // Resets because this model gives better results when reset between
            // source changes.
            pose.reset();
          },
          onFrame: async (input, size) => {
            const aspect = size.height / size.width;
            let width, height;
            if (window.innerWidth > window.innerHeight) {
              height = window.innerHeight;
              width = height / aspect;
            } else {
              width = window.innerWidth;
              height = width * aspect;
            }
            canvasElement.width = width;
            canvasElement.height = height;
            await pose.send({ image: input });
            // console.log(input);
          },
        }),
        new controls.Slider({
          title: "Model Complexity",
          field: "modelComplexity",
          discrete: ["Lite", "Full", "Heavy"],
        }),
        new controls.Toggle({
          title: "Smooth Landmarks",
          field: "smoothLandmarks",
        }),
        new controls.Toggle({
          title: "Enable Segmentation",
          field: "enableSegmentation",
        }),
        new controls.Toggle({
          title: "Smooth Segmentation",
          field: "smoothSegmentation",
        }),
        new controls.Slider({
          title: "Min Detection Confidence",
          field: "minDetectionConfidence",
          range: [0, 1],
          step: 0.01,
        }),
        new controls.Slider({
          title: "Min Tracking Confidence",
          field: "minTrackingConfidence",
          range: [0, 1],
          step: 0.01,
        }),
        new controls.Slider({
          title: "Effect",
          field: "effect",
          discrete: { background: "Background", mask: "Foreground" },
        }),
      ])
      .on((x) => {
        const options = x;
        // videoElement.classList.toggle("selfie", options.selfieMode);
        activeEffect = x["effect"];
        pose.setOptions(options);
      });
  }, []);

  return (
    <>
      <Box
        width="70%"
        height="70%"
        justifyContent="center"
        alignItems="center"
        textAlign="center"
        direction="row"
        display="flex"
      >
        {/* <video ref={webcamRef} className="input_video"></video> */}
        <canvas
          ref={canvasRef}
          className="output_canvas"
          style={{ width: "auto", height: "100%" }}
        ></canvas>
        <Center position="absolute">
          {spinnerActive && (
            <Spinner
              thickness="4px"
              speed=".65s"
              emptyColor="gray.200"
              color="blue.500"
              size="xl"
            />
          )}
        </Center>
        {/* <div className="loading">
          <div className="spinner"></div>
          <div className="message">
            Loading
          </div>
        </div> */}
        {/* <a className="abs logo" href="http://www.mediapipe.dev" target="_blank">
          <div style="display: flex;align-items: center;bottom: 0;right: 10px;">
            <img className="logo" src="logo_white.png" alt="" style="height: 50px;"/>
            <span className="title">MediaPipe</span>
          </div>
          </a> */}
        {/* <div className="shoutout">
            <div>
              <a href="https://solutions.mediapipe.dev/pose">
                Click here for more info
              </a>
            </div>
          </div> */}
        <div
          className="control-panel"
          ref={controlsRef}
          style={{ display: "none" }}
        ></div>
      </Box>
    </>
  );
}
