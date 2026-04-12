import { useRef, useState, useEffect } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import { clamp, lerp } from './attendanceUtils';

const BLINK_EAR_CLOSED = 0.19;
const BLINK_EAR_OPEN = 0.24;
const BLINK_MIN_CLOSED_FRAMES = 2;
const BLINK_COOLDOWN_MS = 800;
const LEFT_EYE_IDX = [33, 160, 158, 133, 153, 144];
const RIGHT_EYE_IDX = [362, 385, 387, 263, 373, 380];

const calcDistance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const computeEAR = (landmarks, indices) => {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => landmarks[i]);
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return null;
  const vertical1 = calcDistance(p2, p6);
  const vertical2 = calcDistance(p3, p5);
  const horizontal = calcDistance(p1, p4);
  if (!horizontal) return null;
  return (vertical1 + vertical2) / (2 * horizontal);
};

const useCameraFaceMesh = ({ isScanning, onLivenessConfirmed, onNotice }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const mpCameraRef = useRef(null);
  const rafRef = useRef(null);
  const faceBoxRef = useRef({ minX: 0, minY: 0, maxX: 0, maxY: 0, hasFace: false });
  const livenessRef = useRef({ confirmed: false, lastEyeState: 'open', closedFrames: 0, lastBlinkAt: 0 });
  const frameTargetRef = useRef({ cx: 0, cy: 0, size: 256, hasFace: false });
  const frameSmoothRef = useRef({ cx: 0, cy: 0, size: 256, hasFace: false });
  const isScanningRef = useRef(isScanning);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanFrame, setScanFrame] = useState({ cx: 0, cy: 0, size: 256, visible: false });

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setIsCameraActive(true);
    } catch (error) {
      console.error('Camera error:', error);
      alert('Не удалось запустить камеру');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const stopFaceMesh = () => {
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (mpCameraRef.current) {
        mpCameraRef.current.stop();
        mpCameraRef.current = null;
      }
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setScanFrame((prev) => ({ ...prev, visible: false }));
      frameTargetRef.current.hasFace = false;
      frameSmoothRef.current.hasFace = false;
      faceBoxRef.current.hasFace = false;
      livenessRef.current.lastEyeState = 'open';
      livenessRef.current.closedFrames = 0;
    } catch (e) {
      console.warn('stopFaceMesh error:', e);
    }
  };

  const resetLiveness = () => {
    livenessRef.current = { confirmed: false, lastEyeState: 'open', closedFrames: 0, lastBlinkAt: 0 };
  };

  const startFaceMesh = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const syncCanvasToElement = () => {
      const rect = video.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width || video.videoWidth || 1280));
      const h = Math.max(1, Math.round(rect.height || video.videoHeight || 720));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      return { w, h };
    };

    const startFrameAnimationLoop = () => {
      const tick = () => {
        const target = frameTargetRef.current;
        const cur = frameSmoothRef.current;
        if (!target.hasFace) {
          setScanFrame((prev) => ({ ...prev, visible: false }));
          rafRef.current = requestAnimationFrame(tick);
          return;
        }
        const smoothCx = lerp(cur.cx, target.cx, 0.2);
        const smoothCy = lerp(cur.cy, target.cy, 0.2);
        const smoothSize = lerp(cur.size, target.size, 0.18);
        frameSmoothRef.current = { cx: smoothCx, cy: smoothCy, size: smoothSize, hasFace: true };
        setScanFrame({ cx: smoothCx, cy: smoothCy, size: smoothSize, visible: true });
        rafRef.current = requestAnimationFrame(tick);
      };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    if (!faceMeshRef.current) {
      const fm = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6,
      });
      fm.onResults((results) => {
        const { w, h } = syncCanvasToElement();
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, w, h);

        const face = results.multiFaceLandmarks?.[0];
        if (!face || w <= 1 || h <= 1) {
          frameTargetRef.current.hasFace = false;
          faceBoxRef.current.hasFace = false;
          livenessRef.current.lastEyeState = 'open';
          livenessRef.current.closedFrames = 0;
          return;
        }

        if (!livenessRef.current.confirmed) {
          const leftEAR = computeEAR(face, LEFT_EYE_IDX);
          const rightEAR = computeEAR(face, RIGHT_EYE_IDX);
          if (leftEAR !== null && rightEAR !== null) {
            const ear = (leftEAR + rightEAR) / 2;
            const now = performance.now();
            if (ear < BLINK_EAR_CLOSED) {
              livenessRef.current.closedFrames += 1;
              livenessRef.current.lastEyeState = 'closed';
            } else if (ear > BLINK_EAR_OPEN) {
              if (
                livenessRef.current.lastEyeState === 'closed' &&
                livenessRef.current.closedFrames >= BLINK_MIN_CLOSED_FRAMES &&
                now - livenessRef.current.lastBlinkAt > BLINK_COOLDOWN_MS
              ) {
                livenessRef.current.lastBlinkAt = now;
                livenessRef.current.confirmed = true;
                onLivenessConfirmed?.();
                onNotice?.({ type: 'success', text: 'Проверка живости пройдена. Можно распознавать лицо.' });
              }
              livenessRef.current.lastEyeState = 'open';
              livenessRef.current.closedFrames = 0;
            }
          }
        }

        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const p of face) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }
        minX = clamp(minX, 0, 1);
        minY = clamp(minY, 0, 1);
        maxX = clamp(maxX, 0, 1);
        maxY = clamp(maxY, 0, 1);
        faceBoxRef.current = { minX, minY, maxX, maxY, hasFace: true };

        const faceW = (maxX - minX) * w;
        const faceH = (maxY - minY) * h;
        const cx = ((minX + maxX) / 2) * w;
        const cy = ((minY + maxY) / 2) * h;
        let size = Math.max(faceW, faceH) * 1.55;
        size = clamp(size, 200, Math.min(w, h) * 0.9);
        const cxMirrored = w - cx;
        const half = size / 2;
        frameTargetRef.current = {
          cx: clamp(cxMirrored, half, w - half),
          cy: clamp(cy, half, h - half),
          size,
          hasFace: true,
        };

        startFrameAnimationLoop();
      });
      faceMeshRef.current = fm;
    }

    if (mpCameraRef.current) return;

    syncCanvasToElement();

    const waitForVideoReady = async () => {
      const maxWaitMs = 2000;
      const start = performance.now();
      while (performance.now() - start < maxWaitMs) {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      return false;
    };

    const ok = await waitForVideoReady();
    if (!ok) {
      console.warn('Video not ready for MediaPipe');
      return;
    }

    const mpCam = new MediaPipeCamera(video, {
      onFrame: async () => {
        if (!isScanningRef.current) return;
        const v = videoRef.current;
        if (!v || v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) return;
        await faceMeshRef.current.send({ image: v });
      },
      width: 1280,
      height: 720,
    });

    mpCameraRef.current = mpCam;
    mpCam.start();
  };

  useEffect(() => {
    if (isScanning && isCameraActive) {
      startFaceMesh();
    } else {
      stopFaceMesh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, isCameraActive]);

  useEffect(() => {
    return () => {
      stopFaceMesh();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    canvasRef,
    faceBoxRef,
    isCameraActive,
    scanFrame,
    startCamera,
    stopCamera,
    stopFaceMesh,
    resetLiveness,
  };
};

export default useCameraFaceMesh;
