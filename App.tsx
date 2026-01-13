
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TimerMode } from './types';
import { FOCUS_TIME, BREAK_TIME, COLORS } from './constants';
import { NeonButton } from './components/NeonButton';

const App: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [surgeActive, setSurgeActive] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const theme = mode === TimerMode.FOCUS ? COLORS.FOCUS : COLORS.BREAK;
  const totalTime = mode === TimerMode.FOCUS ? FOCUS_TIME : BREAK_TIME;

  const progress = useMemo(() => {
    return ((totalTime - timeLeft) / totalTime) * 100;
  }, [timeLeft, totalTime]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const sendNotification = useCallback((nextMode: TimerMode) => {
    if (notifPermission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Fix: Use type assertion as 'any' to bypass missing 'vibrate' property in standard NotificationOptions types
        registration.showNotification(
          nextMode === TimerMode.BREAK ? 'NEON_SURGE: FOCUS_COMPLETE' : 'NEON_SURGE: BREAK_OVER',
          {
            body: nextMode === TimerMode.BREAK ? '系統能量充沛，啟動 5 分鐘休息模式。' : '休息結束，重新進入專注協議。',
            icon: 'https://cdn-icons-png.flaticon.com/512/3563/3563412.png',
            tag: 'pomodoro-alert',
            vibrate: [200, 100, 200]
          } as any
        );
      });
    }
  }, [notifPermission]);

  const triggerModeSwitch = useCallback(() => {
    const nextMode = mode === TimerMode.FOCUS ? TimerMode.BREAK : TimerMode.FOCUS;
    setSurgeActive(true);
    sendNotification(nextMode);
    
    setTimeout(() => {
      setMode(nextMode);
      setSurgeActive(false);
    }, 1500);
  }, [mode, sendNotification]);

  const toggleTimer = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setTimeLeft(mode === TimerMode.FOCUS ? FOCUS_TIME : BREAK_TIME);
  }, [mode]);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (!surgeActive) triggerModeSwitch();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft, triggerModeSwitch, surgeActive]);

  useEffect(() => {
    setTimeLeft(mode === TimerMode.FOCUS ? FOCUS_TIME : BREAK_TIME);
  }, [mode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const radius = 175;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 select-none overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className={`w-[800px] h-[800px] rounded-full blur-[150px] transition-colors duration-1000 ${mode === TimerMode.FOCUS ? 'bg-[#ff003c10]' : 'bg-[#00f3ff10]'}`}></div>
      </div>

      <div className="relative z-20 flex flex-col items-center w-full max-w-md">
        {/* Notification Status */}
        {notifPermission !== 'granted' && (
          <button 
            onClick={requestPermission}
            className="mb-4 text-[10px] font-['JetBrains_Mono'] border border-white/20 px-3 py-1 rounded-full text-white/50 hover:text-white hover:border-white/50 transition-all uppercase tracking-widest"
          >
            [ ! ] ENABLE REST REMINDERS
          </button>
        )}

        <div 
          className={`mb-6 font-['Orbitron'] text-lg sm:text-xl font-bold tracking-[0.3em] transition-all duration-700 ${isActive ? 'flicker' : ''}`}
          style={{ color: theme.primary, textShadow: `0 0 10px ${theme.glow}, 0 0 20px ${theme.glow}` }}
        >
          {isActive ? (mode === TimerMode.FOCUS ? '>> FOCUS_ACTIVE' : '>> BREAK_ACTIVE') : 'SYSTEM: STANDBY'}
        </div>

        <div className="relative">
          <div 
            className={`absolute inset-0 rounded-full transition-all duration-1000 ${isActive ? 'animate-ring-pulse' : ''}`}
            style={{ boxShadow: isActive ? `0 0 60px -10px ${theme.glow}` : 'none', zIndex: 0 }}
          ></div>

          <div 
            className="relative flex items-center justify-center w-72 h-72 sm:w-[400px] sm:h-[400px] rounded-full border-2 transition-all duration-700 bg-black/40 backdrop-blur-sm"
            style={{ borderColor: `${theme.primary}22`, boxShadow: `inset 0 0 20px ${theme.soft}` }}
          >
            <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ zIndex: 5 }}>
              <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke={theme.primary} strokeWidth="2" className="opacity-10" />
              <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke={theme.primary} strokeWidth="6" strokeDasharray={circumference}
                style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s linear, stroke 0.7s ease', filter: `drop-shadow(0 0 12px ${theme.primary})` }} strokeLinecap="round" />
              {isActive && (
                <circle cx="50%" cy="50%" r={radius} fill="transparent" stroke="white" strokeWidth="8" strokeDasharray={`1, ${circumference}`}
                  style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 1s linear', filter: `drop-shadow(0 0 15px white) drop-shadow(0 0 5px ${theme.primary})` }} strokeLinecap="round" />
              )}
            </svg>

            <div className="font-['Orbitron'] text-6xl sm:text-8xl font-black tracking-tighter transition-all duration-700 z-10"
              style={{ color: theme.primary, textShadow: `0 0 10px ${theme.glow}` }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-6 w-full px-12">
          <NeonButton label={isActive ? "PAUSE" : "START"} onClick={toggleTimer} color={theme.primary} glowColor={theme.glow} disabled={surgeActive} />
          <NeonButton label="RESET" onClick={resetTimer} color={theme.primary} glowColor={theme.glow} disabled={surgeActive} />
        </div>

        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl transition-opacity duration-500 ${surgeActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
          <div className="text-center font-['JetBrains_Mono'] px-4">
             <div className="text-white text-2xl mb-4 font-bold tracking-[0.2em] uppercase flicker"> &gt; MODALITY_SHIFT_DETECTED </div>
             <div className="text-gray-400 text-xs tracking-widest max-w-xs mx-auto leading-relaxed">
                REROUTING POWER TO {mode === TimerMode.FOCUS ? 'BREAK' : 'FOCUS'} SYSTEM...
             </div>
             <div className="mt-12 flex justify-center items-center gap-4">
                <div className="w-12 h-[2px] bg-red-500 shadow-[0_0_15px_#ff0000]"></div>
                <div className="text-white font-black text-xl animate-bounce">⚡</div>
                <div className="w-12 h-[2px] bg-blue-500 shadow-[0_0_15px_#00f3ff]"></div>
             </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ring-pulse { 0%, 100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.05); opacity: 0.6; } }
        .animate-ring-pulse { animation: ring-pulse 2s ease-in-out infinite; }
      `}} />
    </div>
  );
};

export default App;
