import React from 'react';
import { Scan, Check } from 'lucide-react';

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

export default FuturisticFrameOnly;
