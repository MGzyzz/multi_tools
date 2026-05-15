import { useCallback, useRef } from "react";

export type PoseId = "front" | "left" | "right" | "smile";

export interface FaceBounds {
  /** Center X in 0–1, already mirrored to match the mirrored video display */
  cx: number;
  /** Center Y in 0–1 */
  cy: number;
  /** Face width in 0–1 (raw, not padded) */
  w: number;
  /** Face height in 0–1 (raw, not padded) */
  h: number;
}

interface PoseResult {
  facePresent: boolean;
  pose: PoseId | null;
  bounds: FaceBounds | null;
}

type Lm = { x: number; y: number; z: number };

// ── Landmark indices (MediaPipe Face Mesh 468 points) ─────────────────────────
const NOSE_TIP = 4;
const LEFT_EYE_OUTER = 33;   // user's left eye, right side of raw (unmirrored) frame
const RIGHT_EYE_OUTER = 263; // user's right eye, left side of raw (unmirrored) frame
const LEFT_LIP_CORNER  = 61;
const RIGHT_LIP_CORNER = 291;

// ── Thresholds ────────────────────────────────────────────────────────────────
// yawRatio = rightEyeDist / (leftEyeDist + rightEyeDist)
// When head is straight: ≈ 0.50
// Mirrored display: user turns LEFT  → yawRatio < 0.38
//                  user turns RIGHT → yawRatio > 0.62
const YAW_LEFT_THRESHOLD = 0.38;
const YAW_RIGHT_THRESHOLD = 0.62;

// smileRatio = mouthWidth / eyeWidth
// eyeWidth = distance between outer eye corners (stable reference)
// Neutral face: ≈ 0.55–0.65 | Smile: ≈ 0.72+
const SMILE_THRESHOLD = 0.72;

// Consecutive frames the pose must be held before confirming
const CONFIRM_FRAMES = 6;

// ── Helpers ───────────────────────────────────────────────────────────────────
function dist(a: Lm, b: Lm) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function computeBounds(lms: Lm[]): FaceBounds {
  // Use all 468 landmarks for the tightest accurate bounding box —
  // works correctly at any head angle without landmark selection bias.
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const lm of lms) {
    if (lm.x < minX) minX = lm.x;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.y > maxY) maxY = lm.y;
  }
  const rawCx = (minX + maxX) / 2;
  return {
    cx: 1 - rawCx,   // mirror X to match the CSS-mirrored display
    cy: (minY + maxY) / 2,
    w: maxX - minX,
    h: maxY - minY,
  };
}

function detectPose(lms: Lm[]): PoseId {
  const nose = lms[NOSE_TIP];
  const leftEye = lms[LEFT_EYE_OUTER];
  const rightEye = lms[RIGHT_EYE_OUTER];

  const leftDist = dist(nose, leftEye);
  const rightDist = dist(nose, rightEye);
  const yawRatio = rightDist / (leftDist + rightDist + 1e-6);

  // Yaw takes priority
  if (yawRatio < YAW_LEFT_THRESHOLD) return "left";
  if (yawRatio > YAW_RIGHT_THRESHOLD) return "right";

  // Smile check: mouthWidth / eyeWidth
  // eyeWidth is a stable face-size reference — avoids the mouthHeight≈0 trap
  const eyeWidth = dist(leftEye, rightEye);
  const mouthWidth = dist(lms[LEFT_LIP_CORNER], lms[RIGHT_LIP_CORNER]);
  const smileRatio = mouthWidth / (eyeWidth + 1e-6);

  if (smileRatio > SMILE_THRESHOLD) return "smile";

  return "front";
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePoseDetector() {
  const stopRef = useRef<(() => void) | null>(null);

  const start = useCallback(
    async (
      video: HTMLVideoElement,
      onResult: (result: PoseResult) => void,
    ): Promise<void> => {
      // Stop any previous session
      stopRef.current?.();

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

      let active = true;
      let consecutiveFrames = 0;
      let lastPose: PoseId | null = null;

      stopRef.current = () => {
        active = false;
        mesh.close();
      };

      mesh.onResults((results) => {
        if (!active) return;

        const lms = results.multiFaceLandmarks?.[0] as Lm[] | undefined;
        if (!lms) {
          consecutiveFrames = 0;
          lastPose = null;
          onResult({ facePresent: false, pose: null, bounds: null });
          return;
        }

        const pose = detectPose(lms);
        const bounds = computeBounds(lms);

        // Require the same pose for CONFIRM_FRAMES consecutive frames
        if (pose === lastPose) {
          consecutiveFrames++;
        } else {
          lastPose = pose;
          consecutiveFrames = 1;
        }

        onResult({
          facePresent: true,
          pose: consecutiveFrames >= CONFIRM_FRAMES ? pose : null,
          bounds,
        });
      });

      const loop = async () => {
        if (!active) return;
        await mesh.send({ image: video });
        requestAnimationFrame(loop);
      };

      await mesh.initialize();
      loop();
    },
    [],
  );

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
  }, []);

  return { start, stop };
}
