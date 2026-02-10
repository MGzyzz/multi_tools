import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
import Loader from '../Loader/Loader';
import { getDetailSchedule } from '../../api/getDetailSchedule';
import { sendPhotoAI } from '../../api/sendPhotoAI';
import { editAttendance } from '../../api/editAttendance';
import AttendanceHeader from './AttendanceHeader';
import AttendanceCamera from './AttendanceCamera';
import AttendanceStudentsList from './AttendanceStudentsList';
import { clamp, lerp, mapApiToState } from './attendanceUtils';

const DEBUG_FACE_PREVIEW = false;
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

const AttendanceScanning = ({ isDark = true, scheduleId = null }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ✅ refs для MediaPipe
  const faceMeshRef = useRef(null);
  const mpCameraRef = useRef(null);
  const rafRef = useRef(null);
  const faceBoxRef = useRef({ minX: 0, minY: 0, maxX: 0, maxY: 0, hasFace: false });
  const livenessRef = useRef({
    confirmed: false,
    lastEyeState: 'open',
    closedFrames: 0,
    lastBlinkAt: 0
  });

  // ✅ цель позиции рамки (target) + текущая (smooth)
  const frameTargetRef = useRef({ cx: 0, cy: 0, size: 256, hasFace: false });
  const frameSmoothRef = useRef({ cx: 0, cy: 0, size: 256, hasFace: false });

  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isLivenessConfirmed, setIsLivenessConfirmed] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const { scheduleId: scheduleIdFromParams } = useParams();
  const effectiveScheduleId = scheduleId ?? scheduleIdFromParams; // если вдруг передаешь пропом

  // ✅ состояние рамки для UI
  const [scanFrame, setScanFrame] = useState({
    cx: 0,
    cy: 0,
    size: 256,
    visible: false
  });

  // Mock данные - в будущем из API
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);

  const [sessionData, setSessionData] = useState({
    group: '',
    subject: '',
    time: '',
    date: '',
    totalStudents: 0
  });
  const [students, setStudents] = useState([]);

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    late: students.filter(s => s.status === 'late').length, // если позже появится
    absent: students.filter(s => s.status === 'absent' || s.status === null).length
  };

  // =========================
  // Camera
  // =========================
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
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
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // =========================
  // ✅ FaceMesh overlay + движение рамки
  // =========================
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

      // спрячем рамку
      setScanFrame(prev => ({ ...prev, visible: false }));
      frameTargetRef.current.hasFace = false;
      frameSmoothRef.current.hasFace = false;
      faceBoxRef.current.hasFace = false;
      livenessRef.current.lastEyeState = 'open';
      livenessRef.current.closedFrames = 0;
    } catch (e) {
      console.warn('stopFaceMesh error:', e);
    }
  };

  const startFaceMesh = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // ✅ canvas должен совпадать с реальным размером video на экране
    const syncCanvasToElement = () => {
      const rect = video.getBoundingClientRect();

      // ФОЛБЭКИ: если rect еще 0 (бывает при старте)
      const w = Math.max(1, Math.round(rect.width || video.videoWidth || 1280));
      const h = Math.max(1, Math.round(rect.height || video.videoHeight || 720));

      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;

      return { w, h };
    };


    // ✅ запускаем "плавное" движение рамки через requestAnimationFrame
    const startFrameAnimationLoop = () => {
      const tick = () => {
        const target = frameTargetRef.current;
        const cur = frameSmoothRef.current;

        // если лица нет — медленно гасим рамку
        if (!target.hasFace) {
          setScanFrame(prev => ({ ...prev, visible: false }));
          rafRef.current = requestAnimationFrame(tick);
          return;
        }

        // сглаживание (чтобы не тряслось)
        const smoothCx = lerp(cur.cx, target.cx, 0.2);
        const smoothCy = lerp(cur.cy, target.cy, 0.2);
        const smoothSize = lerp(cur.size, target.size, 0.18);

        frameSmoothRef.current = {
          cx: smoothCx,
          cy: smoothCy,
          size: smoothSize,
          hasFace: true
        };

        setScanFrame({
          cx: smoothCx,
          cy: smoothCy,
          size: smoothSize,
          visible: true
        });

        rafRef.current = requestAnimationFrame(tick);
      };

      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick);
    };

    // Создаём FaceMesh один раз
    if (!faceMeshRef.current) {
      const fm = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      fm.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
      });

      fm.onResults((results) => {
        // ✅ синхронизируем размеры canvas (нам нужно w/h для перевода координат)
        const { w, h } = syncCanvasToElement();

        // ✅ очистим canvas (чтобы точно ничего не рисовалось)
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
                setIsLivenessConfirmed(true);
                setScanNotice({ type: 'success', text: 'Проверка живости пройдена. Можно распознавать лицо.' });
              }
              livenessRef.current.lastEyeState = 'open';
              livenessRef.current.closedFrames = 0;
            }
          }
        }

        // ✅ Bounding box лица по landmarks (normalized 0..1)
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const p of face) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }

        // Нормализованный бокс (для вырезания по исходному видео)
        minX = clamp(minX, 0, 1);
        minY = clamp(minY, 0, 1);
        maxX = clamp(maxX, 0, 1);
        maxY = clamp(maxY, 0, 1);

        faceBoxRef.current = { minX, minY, maxX, maxY, hasFace: true };

        // Переводим в пиксели (в НЕ-зеркальном пространстве)
        const faceW = (maxX - minX) * w;
        const faceH = (maxY - minY) * h;
        const cx = ((minX + maxX) / 2) * w;
        const cy = ((minY + maxY) / 2) * h;

        // ✅ размер рамки чуть больше лица
        let size = Math.max(faceW, faceH) * 1.55;
        size = clamp(size, 200, Math.min(w, h) * 0.9);

        // ✅ видео зеркальное → рамку зеркалим по X
        const cxMirrored = w - cx;

        // ✅ clamp внутри границ
        const half = size / 2;
        const safeCx = clamp(cxMirrored, half, w - half);
        const safeCy = clamp(cy, half, h - half);

        frameTargetRef.current = {
          cx: safeCx,
          cy: safeCy,
          size,
          hasFace: true
        };

        // ✅ запускаем сглаживание (если ещё не запущено)
        startFrameAnimationLoop();
      });



      faceMeshRef.current = fm;
    }

    // Если уже запущено — не стартуем повторно
    if (mpCameraRef.current) return;

    // старт цикла MediaPipe Camera
    syncCanvasToElement();

    const waitForVideoReady = async () => {
      const maxWaitMs = 2000;
      const start = performance.now();

      while (performance.now() - start < maxWaitMs) {
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          return true;
        }
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
        if (!isScanning) return;

        const v = videoRef.current;
        if (!v) return;

        if (v.readyState < 2 || v.videoWidth === 0 || v.videoHeight === 0) return;

        await faceMeshRef.current.send({ image: v });
      },
      width: 1280,
      height: 720
    });

    mpCameraRef.current = mpCam;
    mpCam.start();
  };

  // Запускаем/останавливаем FaceMesh автоматически
  useEffect(() => {
    if (isScanning && isCameraActive) {
      startFaceMesh();
    } else {
      stopFaceMesh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning, isCameraActive]);

  useEffect(() => {
    if (!effectiveScheduleId) return;

    const load = async () => {
      setIsLoadingSchedule(true);
      setScheduleError(null);
      try {
        const data = await getDetailSchedule(effectiveScheduleId);
        const mapped = mapApiToState(data);
        setSessionData(mapped.session);
        setStudents(mapped.students);
      } catch (e) {
        setScheduleError('Не удалось загрузить данные расписания');
        console.error(e);
      } finally {
        setIsLoadingSchedule(false);
      }
    };

    load();
  }, [effectiveScheduleId]);


  // =========================
  // Scanning
  // =========================
  const captureCroppedFaceBlob = async () => {
    const video = videoRef.current;
    const faceBox = faceBoxRef.current;

    if (!video || !faceBox?.hasFace) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    const faceW = faceBox.maxX - faceBox.minX;
    const faceH = faceBox.maxY - faceBox.minY;

    // tighter crop to reduce background, with small adaptive padding
    const padX = clamp(faceW * 0.08, 0.01, 0.04);
    const padY = clamp(faceH * 0.1, 0.01, 0.05);

    const minX = clamp(faceBox.minX - padX, 0, 1);
    const minY = clamp(faceBox.minY - padY, 0, 1);
    const maxX = clamp(faceBox.maxX + padX, 0, 1);
    const maxY = clamp(faceBox.maxY + padY, 0, 1);

    let sx = Math.round(minX * vw);
    let sy = Math.round(minY * vh);
    let sw = Math.round((maxX - minX) * vw);
    let sh = Math.round((maxY - minY) * vh);

    if (sw <= 0 || sh <= 0) return null;

    sw = Math.min(sw, vw);
    sh = Math.min(sh, vh);
    sx = clamp(sx, 0, vw - sw);
    sy = clamp(sy, 0, vh - sh);

    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const ctx = cropCanvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    return new Promise((resolve) => {
      cropCanvas.toBlob(resolve, 'image/jpeg', 0.92);
    });
  };

  const openFacePreview = (blob) => {
    if (!DEBUG_FACE_PREVIEW) return;
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open(url, '_blank');
    // TODO: убрать debug-превью после интеграции.
    if (previewWindow) {
      previewWindow.onbeforeunload = () => URL.revokeObjectURL(url);
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const startScanning = async () => {
    if (!isCameraActive) {
      await startCamera();
    }
    setIsLivenessConfirmed(false);
    livenessRef.current = {
      confirmed: false,
      lastEyeState: 'open',
      closedFrames: 0,
      lastBlinkAt: 0
    };
    setScanNotice({ type: 'info', text: 'Пожалуйста, моргните для проверки живости.' });
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanProgress(0);
    setCurrentStudent(null);
    setIsProcessing(false);
    setScanNotice(null);
    setIsLivenessConfirmed(false);
    livenessRef.current = {
      confirmed: false,
      lastEyeState: 'open',
      closedFrames: 0,
      lastBlinkAt: 0
    };
    stopFaceMesh();
    stopCamera();
  };

  const applyRecognitionResult = async (student, status = 'present') => {
    const now = new Date();
    const nowTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const markedAt = now.toISOString();
    const presense = status === 'present' || status === 'late';

    setCurrentStudent({ ...student, status });
    setStudents(prev => prev.map(s =>
      s.id === student.id
        ? { ...s, status, scanTime: nowTime }
        : s
    ));

    if (student.attendanceId) {
      try {
        await editAttendance(student.attendanceId, presense, markedAt);
      } catch (error) {
        console.error('Failed to save attendance:', error);
        setScanNotice({ type: 'error', text: 'Не удалось сохранить отметку' });
      }
    }

    setTimeout(() => {
      setIsProcessing(false);
      setScanProgress(0);
      setCurrentStudent(null);
    }, 1500);
  };

  // Распознавание через AI
  const simulateFaceRecognition = async () => {
    if (!isScanning || isProcessing) return;
    if (!isLivenessConfirmed) {
      setScanNotice({ type: 'info', text: 'Для проверки моргните в камеру перед распознаванием.' });
      return;
    }

    setIsProcessing(true);
    setScanProgress(0);
    setScanNotice(null);

    const PROGRESS_MAX = 92;
    const PROGRESS_RAMP_MS = 5200;
    const MIN_SCAN_MS = 1600;
    const startTime = performance.now();

    let intervalId = null;
    const stopProgress = () => {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    };

    intervalId = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(1, elapsed / PROGRESS_RAMP_MS);
      const eased = t * t * (3 - 2 * t); // smoothstep
      const next = Math.min(PROGRESS_MAX, Math.round(eased * PROGRESS_MAX));
      setScanProgress(prev => (next > prev ? next : prev));
    }, 120);

    const waitMinScan = async () => {
      const elapsed = performance.now() - startTime;
      const remaining = MIN_SCAN_MS - elapsed;
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, remaining));
      }
    };

    const finishFailure = async (message) => {
      await waitMinScan();
      stopProgress();
      setScanProgress(100);
      setScanNotice({ type: 'error', text: message });
      setTimeout(() => {
        setIsProcessing(false);
        setScanProgress(0);
      }, 600);
    };

    try {
      const blob = await captureCroppedFaceBlob();
      if (!blob) {
        await finishFailure('Лицо не найдено. Попробуйте снова.');
        return;
      }

      openFacePreview(blob);
      const result = await sendPhotoAI(blob);

      await waitMinScan();
      stopProgress();
      setScanProgress(100);

      const studentId = result?.student_id;
      const aiStatus = result?.status;

      if (!studentId || aiStatus !== 'recognized') {
        console.warn('Face not recognized:', result);
        const statusText = aiStatus === 'empty_embeddings'
          ? 'Нет данных для распознавания'
          : aiStatus === 'no_face'
            ? 'Лицо не найдено. Попробуйте снова.'
            : 'Лицо не распознано';
        await finishFailure(statusText);
        return;
      }

      const student = students.find((s) => s.id === studentId) || null;
      if (!student) {
        console.warn('No student matched for AI student_id:', studentId);
        await finishFailure('Студент не найден в списке');
        return;
      }

      setScanNotice({ type: 'success', text: `Распознан: ${student.name}` });
      await applyRecognitionResult(student, 'present');
    } catch (error) {
      stopProgress();
      console.error('Face recognition error:', error);
      await finishFailure('Ошибка распознавания. Попробуйте снова.');
    }
  };

  const markStudent = async (studentId, status) => {
    const now = new Date();
    const nowTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const markedAt = now.toISOString();
    const presense = status === 'present' || status === 'late';

    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, status, scanTime: nowTime }
        : s
    ));

    const target = students.find((s) => s.id === studentId);
    if (target?.attendanceId) {
      try {
        await editAttendance(target.attendanceId, presense, markedAt);
      } catch (error) {
        console.error('Failed to save attendance:', error);
        setScanNotice({ type: 'error', text: 'Не удалось сохранить отметку' });
      }
    }
  };

  const resetAttendance = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все отметки?')) {
      setStudents(prev => prev.map(s => ({ ...s, status: null, scanTime: null })));
      stopScanning();
    }
  };

  useEffect(() => {
    return () => {
      stopFaceMesh();
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {isLoadingSchedule && (
        <div className="mb-4">
          <Loader /> {/* или твой Loader2 */}
        </div>
      )}

      {scheduleError && (
        <div className={`mb-4 p-3 rounded-xl border ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {scheduleError}
        </div>
      )}
      <AttendanceHeader
        isDark={isDark}
        sessionData={sessionData}
        stats={stats}
        onReset={resetAttendance}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Camera Section */}
        <AttendanceCamera
          isDark={isDark}
          videoRef={videoRef}
          canvasRef={canvasRef}
          isCameraActive={isCameraActive}
          isScanning={isScanning}
          isLivenessConfirmed={isLivenessConfirmed}
          scanFrame={scanFrame}
          isProcessing={isProcessing}
          scanProgress={scanProgress}
          currentStudent={currentStudent}
          notice={scanNotice}
          onStartScanning={startScanning}
          onStopScanning={stopScanning}
          onSimulateRecognition={simulateFaceRecognition}
        />

        {/* Students List */}
        <AttendanceStudentsList
          isDark={isDark}
          students={students}
          stats={stats}
          sessionData={sessionData}
          onMarkStudent={markStudent}
        />
      </div>
    </div>
  );
};

export default AttendanceScanning;
