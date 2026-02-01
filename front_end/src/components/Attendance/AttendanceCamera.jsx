import React from 'react';
import { Video, Play, Square, Scan, Loader2, CheckCircle, Clock } from 'lucide-react';
import FuturisticFrameOnly from './FuturisticFrameOnly';

const AttendanceCamera = ({
  isDark,
  videoRef,
  canvasRef,
  isCameraActive,
  isScanning,
  scanFrame,
  isProcessing,
  scanProgress,
  currentStudent,
  notice,
  onStartScanning,
  onStopScanning,
  onSimulateRecognition
}) => (
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
            onClick={onStartScanning}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg"
          >
            <Play className="w-5 h-5" />
            <span>Начать сканирование</span>
          </button>
        ) : (
          <>
            <button
              onClick={onSimulateRecognition}
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
              onClick={onStopScanning}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white rounded-xl font-semibold cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <Square className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {notice && (
        <div
          className={`mt-3 text-sm px-3 py-2 rounded-lg border ${
            notice.type === 'success'
              ? isDark
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : isDark
                ? 'border-red-500/40 bg-red-500/10 text-red-300'
                : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </div>
      )}
    </div>
  </div>
);

export default AttendanceCamera;
