import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Loader from '../Loader/Loader';
import { getDetailSchedule } from '../../api/getDetailSchedule';
import { sendPhotoAI } from '../../api/sendPhotoAI';
import { editAttendance } from '../../api/editAttendance';
import AttendanceHeader from './AttendanceHeader';
import AttendanceCamera from './AttendanceCamera';
import AttendanceStudentsList from './AttendanceStudentsList';
import { clamp, mapApiToState } from './attendanceUtils';
import useCameraFaceMesh from './useCameraFaceMesh';

const DEBUG_FACE_PREVIEW = false;

const AttendanceScanning = ({ isDark = true, scheduleId = null }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLivenessConfirmed, setIsLivenessConfirmed] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanNotice, setScanNotice] = useState(null);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [scheduleError, setScheduleError] = useState(null);
  const [sessionData, setSessionData] = useState({ group: '', subject: '', time: '', date: '', totalStudents: 0 });
  const [students, setStudents] = useState([]);

  const { scheduleId: scheduleIdFromParams } = useParams();
  const effectiveScheduleId = scheduleId ?? scheduleIdFromParams;

  const { videoRef, canvasRef, faceBoxRef, isCameraActive, scanFrame, startCamera, stopCamera, stopFaceMesh, resetLiveness } =
    useCameraFaceMesh({
      isScanning,
      onLivenessConfirmed: () => setIsLivenessConfirmed(true),
      onNotice: setScanNotice,
    });

  const stats = {
    present: students.filter((s) => s.status === 'present').length,
    late: students.filter((s) => s.status === 'late').length,
    absent: students.filter((s) => s.status === 'absent' || s.status === null).length,
  };

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

  const captureCroppedFaceBlob = async () => {
    const video = videoRef.current;
    const faceBox = faceBoxRef.current;
    if (!video || !faceBox?.hasFace) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    const faceW = faceBox.maxX - faceBox.minX;
    const faceH = faceBox.maxY - faceBox.minY;
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
    return new Promise((resolve) => cropCanvas.toBlob(resolve, 'image/jpeg', 0.92));
  };

  const openFacePreview = (blob) => {
    if (!DEBUG_FACE_PREVIEW) return;
    const url = URL.createObjectURL(blob);
    const previewWindow = window.open(url, '_blank');
    if (previewWindow) {
      previewWindow.onbeforeunload = () => URL.revokeObjectURL(url);
    } else {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const applyRecognitionResult = async (student, status = 'present') => {
    const now = new Date();
    const nowTime = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const markedAt = now.toISOString();

    setCurrentStudent({ ...student, status });
    setStudents((prev) => prev.map((s) => (s.id === student.id ? { ...s, status, scanTime: nowTime } : s)));

    if (student.attendanceId) {
      try {
        await editAttendance(student.attendanceId, status, markedAt);
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
      const eased = t * t * (3 - 2 * t);
      const next = Math.min(PROGRESS_MAX, Math.round(eased * PROGRESS_MAX));
      setScanProgress((prev) => (next > prev ? next : prev));
    }, 120);

    const waitMinScan = async () => {
      const elapsed = performance.now() - startTime;
      const remaining = MIN_SCAN_MS - elapsed;
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
    };

    const finishFailure = async (message) => {
      await waitMinScan();
      stopProgress();
      setScanProgress(100);
      setScanNotice({ type: 'error', text: message });
      setTimeout(() => { setIsProcessing(false); setScanProgress(0); }, 600);
    };

    try {
      const blob = await captureCroppedFaceBlob();
      if (!blob) { await finishFailure('Лицо не найдено. Попробуйте снова.'); return; }

      openFacePreview(blob);
      const result = await sendPhotoAI(blob);
      await waitMinScan();
      stopProgress();
      setScanProgress(100);

      const studentId = result?.student_id;
      const aiStatus = result?.status;

      if (!studentId || aiStatus !== 'recognized') {
        console.warn('Face not recognized:', result);
        const statusText =
          aiStatus === 'empty_embeddings'
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

    setStudents((prev) => prev.map((s) => (s.id === studentId ? { ...s, status, scanTime: nowTime } : s)));

    const target = students.find((s) => s.id === studentId);
    if (target?.attendanceId) {
      try {
        await editAttendance(target.attendanceId, status, markedAt);
      } catch (error) {
        console.error('Failed to save attendance:', error);
        setScanNotice({ type: 'error', text: 'Не удалось сохранить отметку' });
      }
    }
  };

  const startScanning = async () => {
    if (!isCameraActive) await startCamera();
    setIsLivenessConfirmed(false);
    resetLiveness();
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
    resetLiveness();
    stopFaceMesh();
    stopCamera();
  };

  const resetAttendance = () => {
    if (window.confirm('Вы уверены, что хотите сбросить все отметки?')) {
      setStudents((prev) => prev.map((s) => ({ ...s, status: null, scanTime: null })));
      stopScanning();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {isLoadingSchedule && (
        <div className="mb-4">
          <Loader />
        </div>
      )}
      {scheduleError && (
        <div className={`mb-4 p-3 rounded-xl border ${isDark ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'}`}>
          {scheduleError}
        </div>
      )}
      <AttendanceHeader isDark={isDark} sessionData={sessionData} stats={stats} onReset={resetAttendance} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
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
