import { useCallback, useRef } from "react";

const LEFT_EYE = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE = [362, 385, 387, 263, 373, 380];
const EAR_THRESHOLD = 0.20;
const CONSEC_FRAMES = 2;

type Lm = { x: number; y: number };

function computeEar(lm: Lm[], idx: number[]): number {
  const p = idx.map((i) => lm[i]);
  const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
  const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
  const h = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
  return (v1 + v2) / (2 * h + 1e-6);
}

export function useBlinkDetector() {
  const closedFrames = useRef(0);

  // Returns true if blink detected within timeoutMs, false on timeout
  const waitForBlink = useCallback(
    async (video: HTMLVideoElement, timeoutMs = 8000): Promise<boolean> => {
      closedFrames.current = 0;

      const { FaceMesh } = await import("@mediapipe/face_mesh");

      const mesh = new FaceMesh({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
      });

      mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      return new Promise<boolean>((resolve) => {
        let done = false;

        const finish = (detected: boolean) => {
          if (done) return;
          done = true;
          mesh.close();
          resolve(detected);
        };

        const timeoutId = setTimeout(() => finish(false), timeoutMs);

        mesh.onResults((results) => {
          if (done) return;

          const lms = results.multiFaceLandmarks?.[0];
          if (!lms) {
            closedFrames.current = 0;
            return;
          }

          const avgEar =
            (computeEar(lms, LEFT_EYE) + computeEar(lms, RIGHT_EYE)) / 2;

          if (avgEar < EAR_THRESHOLD) {
            closedFrames.current++;
          } else {
            if (closedFrames.current >= CONSEC_FRAMES) {
              clearTimeout(timeoutId);
              finish(true);
            }
            closedFrames.current = 0;
          }
        });

        const loop = async () => {
          if (done) return;
          await mesh.send({ image: video });
          requestAnimationFrame(loop);
        };

        void mesh.initialize().then(loop);
      });
    },
    [],
  );

  return { waitForBlink };
}
