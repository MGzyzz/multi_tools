import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Video,
  UserCheck,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Play,
  Square,
  RotateCcw,
  Download,
  AlertCircle,
  Scan,
  Loader2,
  Check
} from 'lucide-react';
import Loader from '../Loader/Loader';

// ✅ MediaPipe
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';
// import { drawConnectors } from '@mediapipe/drawing_utils';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const DEBUG = true;
const log = (...args) => DEBUG && console.log('[ATT]', ...args);
const warn = (...args) => DEBUG && console.warn('[ATT]', ...args);
const err = (...args) => DEBUG && console.error('[ATT]', ...args);
const lerp = (a, b, t) => a + (b - a) * t;

const AttendanceScanning = ({ isDark = true, scheduleId = null }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ✅ refs для MediaPipe
  const faceMeshRef = useRef(null);
  const mpCameraRef = useRef(null);
  const rafRef = useRef(null);

  // ✅ цель позиции рамки (target) + текущая (smooth)
  const frameTargetRef = useRef({ cx: 0, cy: 0, size: 256, hasFace: false });
  const frameSmoothRef = useRef({ cx: 0, cy: 0, size: 256, hasFace: false });

  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ состояние рамки для UI
  const [scanFrame, setScanFrame] = useState({
    cx: 0,
    cy: 0,
    size: 256,
    visible: false
  });

  // Mock данные - в будущем из API
  const [sessionData, setSessionData] = useState({
    group: 'Группа А',
    subject: 'Математика',
    time: '13:00',
    date: '2026-01-04',
    totalStudents: 10
  });

  const [students, setStudents] = useState([
    { id: 1, name: 'Иванов Иван', status: null, scanTime: null },
    { id: 2, name: 'Петров Петр', status: null, scanTime: null },
    { id: 3, name: 'Сидоров Сидор', status: null, scanTime: null },
    { id: 4, name: 'Козлова Анна', status: null, scanTime: null },
    { id: 5, name: 'Смирнов Алексей', status: null, scanTime: null },
    { id: 6, name: 'Новикова Мария', status: null, scanTime: null },
    { id: 7, name: 'Федоров Дмитрий', status: null, scanTime: null },
    { id: 8, name: 'Морозова Елена', status: null, scanTime: null },
    { id: 9, name: 'Волков Андрей', status: null, scanTime: null },
    { id: 10, name: 'Соколова Ольга', status: null, scanTime: null }
  ]);

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    late: students.filter(s => s.status === 'late').length,
    absent: students.filter(s => s.status === null).length
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
          return;
        }

        // ✅ Bounding box лица по landmarks (normalized 0..1)
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (const p of face) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }

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

  // =========================
  // Scanning
  // =========================
  const startScanning = async () => {
    if (!isCameraActive) {
      await startCamera();
    }
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanProgress(0);
    setCurrentStudent(null);
    setIsProcessing(false);
    stopFaceMesh();
    stopCamera();
  };

  // Имитация распознавания лица (в будущем заменить на API)
  const simulateFaceRecognition = () => {
    if (!isScanning || isProcessing) return;

    setIsProcessing(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          recognizeStudent();
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  const recognizeStudent = () => {
    const unrecognizedStudents = students.filter(s => s.status === null);

    if (unrecognizedStudents.length === 0) {
      setIsProcessing(false);
      setScanProgress(0);
      return;
    }

    const randomStudent = unrecognizedStudents[Math.floor(Math.random() * unrecognizedStudents.length)];
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

    const status = Math.random() > 0.2 ? 'present' : 'late';

    setCurrentStudent({ ...randomStudent, status });

    setTimeout(() => {
      setStudents(prev => prev.map(s =>
        s.id === randomStudent.id
          ? { ...s, status, scanTime: now }
          : s
      ));

      setIsProcessing(false);
      setScanProgress(0);
      setCurrentStudent(null);
    }, 1500);
  };

  const markStudent = (studentId, status) => {
    const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setStudents(prev => prev.map(s =>
      s.id === studentId
        ? { ...s, status, scanTime: now }
        : s
    ));
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

  const FuturisticFrameOnly = ({ isProcessing, scanProgress }) => (
    <div className="absolute inset-0 pointer-events-none">
      <div className="relative w-full h-full">
        {/* Outer rotating ring */}
        <div
          className={`absolute inset-0 border-4 rounded-full transition-all duration-300 ${isProcessing ? 'border-blue-500 animate-spin' : 'border-green-500/50'
            }`}
          style={{
            animationDuration: '3s',
            borderStyle: 'dashed',
            borderWidth: '3px'
          }}
        />

        {/* Middle rotating ring (opposite direction) */}
        <div
          className={`absolute inset-4 border-2 rounded-full transition-all duration-300 ${isProcessing ? 'border-purple-500' : 'border-green-500/30'
            }`}
          style={{
            animation: isProcessing ? 'spin 2s linear infinite reverse' : 'none',
            borderStyle: 'dotted'
          }}
        />

        {/* Main frame */}
        <div
          className={`absolute inset-8 border-4 rounded-3xl transition-all duration-300 ${isProcessing
              ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]'
              : 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]'
            }`}
        >
          {/* Corner accents */}
          {[
            { top: '-2px', left: '-2px', rotate: '0deg' },
            { top: '-2px', right: '-2px', rotate: '90deg' },
            { bottom: '-2px', right: '-2px', rotate: '180deg' },
            { bottom: '-2px', left: '-2px', rotate: '270deg' }
          ].map((pos, i) => (
            <div
              key={i}
              className={`absolute w-8 h-8 transition-all duration-300 ${isProcessing ? 'bg-blue-500' : 'bg-green-500'
                }`}
              style={{
                ...pos,
                clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                transform: `rotate(${pos.rotate})`
              }}
            />
          ))}

          {/* Scanning line */}
          {isProcessing && (
            <div
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
              style={{
                top: `${scanProgress}%`,
                transition: 'top 0.1s linear',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.8)'
              }}
            />
          )}

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            {scanProgress === 100 ? (
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isProcessing ? 'bg-blue-500/20 animate-pulse' : 'bg-green-500/20'
                  }`}
              >
                <Scan
                  className={`w-6 h-6 transition-colors duration-300 ${isProcessing ? 'text-blue-400' : 'text-green-400'
                    }`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Отметка студентов
            </h1>
            <p className={`text-sm sm:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {sessionData.group} • {sessionData.subject} • {sessionData.time}
            </p>
          </div>
          <button
            onClick={resetAttendance}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl ${isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } cursor-pointer transition-all duration-300`}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Сбросить</span>
          </button>
        </div>
        а
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          {/* present */}
          <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'
            } shadow-lg hover:scale-105 transition-all duration-300`}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.present}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Присутствуют
              </p>
            </div>
          </div>

          {/* late */}
          <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'
            } shadow-lg hover:scale-105 transition-all duration-300`}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.late}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Опоздали
              </p>
            </div>
          </div>

          {/* absent */}
          <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-4 sm:p-5 border ${isDark ? 'border-gray-700' : 'border-gray-200'
            } shadow-lg hover:scale-105 transition-all duration-300`}>
            <div className="flex flex-col">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-lg">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <span className={`text-3xl sm:text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats.absent}
                </span>
              </div>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Не отмечены
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Camera Section */}
        <div className="lg:col-span-2">
          <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-5 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'
            } shadow-lg`}>
            <h3 className={`text-lg sm:text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Сканирование лиц
            </h3>

            {/* Video Preview */}
            <div className={`relative aspect-video rounded-xl overflow-hidden mb-4 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Canvas overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {!isCameraActive && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Video className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                    <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Камера не активна
                    </p>
                  </div>
                </div>
              )}

              {/* ✅ ДВИЖУЩАЯСЯ РАМКА */}
              {isScanning && isCameraActive && scanFrame.visible && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute"
                    style={{
                      left: `${scanFrame.cx}px`,
                      top: `${scanFrame.cy}px`,
                      width: `${scanFrame.size}px`,
                      height: `${scanFrame.size}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    <FuturisticFrameOnly isProcessing={isProcessing} scanProgress={scanProgress} />

                    {/* (опционально) оставь свой прогресс-бар снизу, если он нужен отдельно */}
                    {isProcessing && scanProgress > 0 && (
                      <div className="absolute -bottom-12 left-0 right-0">
                        <div className="bg-gray-800/80 rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                            style={{ width: `${scanProgress}%` }}
                          />
                        </div>
                        <p className="text-white text-center text-sm mt-2">
                          Распознавание... {scanProgress}%
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recognition Result */}
              {currentStudent && isCameraActive && (
                <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStudent.status === 'present'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        : 'bg-gradient-to-br from-amber-500 to-orange-500'
                      } shadow-lg`}>
                      {currentStudent.status === 'present' ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <Clock className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold">{currentStudent.name}</p>
                      <p className="text-gray-300 text-sm">
                        {currentStudent.status === 'present' ? 'Присутствует' : 'Опоздал'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-3">
              {!isScanning ? (
                <button
                  onClick={startScanning}
                  className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <Play className="w-5 h-5" />
                  <span>Начать сканирование</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={simulateFaceRecognition}
                    disabled={isProcessing}
                    className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300 ${isProcessing
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:scale-105'
                      } text-white shadow-lg`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Распознавание...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-5 h-5" />
                        <span>Распознать лицо</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={stopScanning}
                    className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Square className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className={`${isDark ? 'bg-gray-800/50' : 'bg-white'} backdrop-blur-sm rounded-2xl p-5 sm:p-6 border ${isDark ? 'border-gray-700' : 'border-gray-200'
          } shadow-lg flex flex-col max-h-[600px]`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg sm:text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Список студентов
            </h3>
            <span className={`text-xs px-2 py-1 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
              } font-medium`}>
              {stats.present + stats.late}/{sessionData.totalStudents}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800/50">
            {students.map((student) => (
              <div
                key={student.id}
                className={`rounded-xl p-3 border transition-all duration-300 ${student.status === 'present'
                    ? isDark
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                    : student.status === 'late'
                      ? isDark
                        ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20'
                        : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      : isDark
                        ? 'bg-gray-700/30 border-gray-600 hover:bg-gray-700/50'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold text-sm ${student.status
                      ? student.status === 'present'
                        ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                        : isDark ? 'text-amber-400' : 'text-amber-700'
                      : isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                    {student.name}
                  </span>
                  {student.status && (
                    <span className="text-xs text-gray-500">
                      {student.scanTime}
                    </span>
                  )}
                </div>

                {!student.status && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => markStudent(student.id, 'present')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 ${isDark
                          ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                          : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-700 border border-emerald-300'
                        }`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Присутствует</span>
                      </div>
                    </button>
                    <button
                      onClick={() => markStudent(student.id, 'late')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-300 ${isDark
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30'
                          : 'bg-amber-100 hover:bg-amber-200 text-amber-700 border border-amber-300'
                        }`}
                    >
                      <div className="flex items-center justify-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Опоздал</span>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            className="mt-4 w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Download className="w-5 h-5" />
            <span>Экспорт отчета</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceScanning;
