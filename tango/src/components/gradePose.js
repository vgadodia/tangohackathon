import { useState } from "react";

function calculateAngle(point1, point2, point3) {
  let angle = 180 / Math.PI * (Math.atan2(point3.y - point2.y, point3.x - point2.x) - Math.atan2(point1.y - point2.y, point1.x - point2.x));
  if (angle < 0) angle += 360;
  if (angle > 180) angle = 360 - angle;
  return angle;
}

function anglesFromPose(pose, landmarkDict) {
    return [
      calculateAngle(pose[landmarkDict["RIGHT_SHOULDER"]], pose[landmarkDict["LEFT_SHOULDER"]], pose[landmarkDict["LEFT_ELBOW"]]),
      calculateAngle(pose[landmarkDict["LEFT_SHOULDER"]], pose[landmarkDict["LEFT_ELBOW"]], pose[landmarkDict["LEFT_WRIST"]]),
      calculateAngle(pose[landmarkDict["LEFT_SHOULDER"]], pose[landmarkDict["RIGHT_SHOULDER"]], pose[landmarkDict["RIGHT_ELBOW"]]),
      calculateAngle(pose[landmarkDict["RIGHT_SHOULDER"]], pose[landmarkDict["RIGHT_ELBOW"]], pose[landmarkDict["RIGHT_WRIST"]]),
      calculateAngle(pose[landmarkDict["RIGHT_HIP"]], pose[landmarkDict["LEFT_HIP"]], pose[landmarkDict["LEFT_KNEE"]]),
      calculateAngle(pose[landmarkDict["LEFT_HIP"]], pose[landmarkDict["LEFT_KNEE"]], pose[landmarkDict["LEFT_ANKLE"]]),
      calculateAngle(pose[landmarkDict["LEFT_HIP"]], pose[landmarkDict["RIGHT_HIP"]], pose[landmarkDict["RIGHT_KNEE"]]),
      calculateAngle(pose[landmarkDict["RIGHT_HIP"]], pose[landmarkDict["RIGHT_KNEE"]], pose[landmarkDict["RIGHT_ANKLE"]])
  ];
}

function anglesFromAnnotation(pose) {
  return [
    calculateAngle(pose["RIGHT_SHOULDER"], pose["LEFT_SHOULDER"], pose["LEFT_ELBOW"]),
    calculateAngle(pose["LEFT_SHOULDER"], pose["LEFT_ELBOW"], pose["LEFT_WRIST"]),
    calculateAngle(pose["LEFT_SHOULDER"], pose["RIGHT_SHOULDER"], pose["RIGHT_ELBOW"]),
    calculateAngle(pose["RIGHT_SHOULDER"], pose["RIGHT_ELBOW"], pose["RIGHT_WRIST"]),
    calculateAngle(pose["RIGHT_HIP"], pose["LEFT_HIP"], pose["LEFT_KNEE"]),
    calculateAngle(pose["LEFT_HIP"], pose["LEFT_KNEE"], pose["LEFT_ANKLE"]),
    calculateAngle(pose["LEFT_HIP"], pose["RIGHT_HIP"], pose["RIGHT_KNEE"]),
    calculateAngle(pose["RIGHT_HIP"], pose["RIGHT_KNEE"], pose["RIGHT_ANKLE"])
  ];
}

export default function usePoseGrader(expectedAnnotations, landmarkDict) {
  const graderWindowRadius = 15;

  const [lastFrame, setLastFrame] = useState(0);

  function comparePoses(poseA, annotationB) {
    const anglesA = anglesFromPose(poseA, landmarkDict);
    const anglesB = anglesFromAnnotation(annotationB);
  
    let rawScore = 0;
    
    for (let i = 0; i < anglesA.length; i++) {
      rawScore += Math.abs(anglesA[i] - anglesB[i]);
    }
  
    return rawScore;
  }

  function grade(pose, frame) {
    let nextFrame = lastFrame;
    let minScore = comparePoses(pose, expectedAnnotations[lastFrame]);
    for (let i = lastFrame; i < Math.min(frame + graderWindowRadius, expectedAnnotations.length); i++) {
      // console.log(pose, ";", expectedAnnotations[i]);
      const curScore = comparePoses(pose, expectedAnnotations[i]);
      if (curScore < minScore) {
        minScore = curScore;
        nextFrame = i;
      }
    }
    setLastFrame(nextFrame);
    const score = Math.max(100 - minScore/8, 0);
    return score*score/100;
  }

  return [grade];
}