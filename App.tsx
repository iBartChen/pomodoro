import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { TimerMode } from './types';
import { FOCUS_TIME, BREAK_TIME, COLORS } from './constants';
import { NeonButton } from './components/NeonButton';

const App: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [surgeActive, setSurgeActive] = useState(false);
  const [targetTimestamp, setTargetTimestamp] = useState<number | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silentNodeRef = useRef<AudioBufferSourceNode | null>(null);
  // 新增防抖鎖定，防止極短時間內重複觸發切換
  const isSwitchingRef = useRef(false);
  
  const theme = mode === TimerMode.FOCUS ? COLORS.FOCUS : COLORS.BREAK;
  const totalTime = mode === TimerMode.FOCUS ? FOCUS_TIME : BREAK_TIME;

  const progress = useMemo(() => {
    return ((totalTime - timeLeft) / totalTime) * 100;
  }, [timeLeft, totalTime]);

  const playAlarm = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const playBeep = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;
    playBeep(880, now, 0.5);
    playBeep(880, now + 0.6, 0.5);
    playBeep(1100, now + 1.2, 0.8);
  }, []);

  const startSilentAudio = useCallback(() => {
    if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start();
    silentNodeRef.current = source;
  }, []);

  const stopSilentAudio = useCallback(() => {
    if (silentNodeRef.current) {
      silentNodeRef.current.stop();
      silentNodeRef.current = null;
    }
  }, []);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      } catch (err) {
        console.debug('WakeLock failed');
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().then(() => {
        wakeLockRef.current = null;
      });
    }
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);
    }
  };

  const sendNotification = useCallback((nextMode: TimerMode) => {
    if (notifPermission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 標題統一為 My Pomodoro，內容改為英文
        const title = 'My Pomodoro';
        const body = nextMode === TimerMode.BREAK 
          ? 'Focus session complete. Time to recharge.' 
          : 'Break is over. Back to focus mode.';
        
        registration.showNotification(title, {
          body: body,
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'pomodoro-alert', // 使用標籤確保新通知覆蓋舊通知，減少干擾
          renotify: true,
          requireInteraction: true,
          vibrate: [200, 100, 200]
        } as any);
      });
    }
  }, [notifPermission]);

  const triggerModeSwitch = useCallback(() => {
    // 如果正在切換中，直接跳過，防止重複觸發
    if (isSwitchingRef.current) return;
    isSwitchingRef.current = true;

    const nextMode = mode === TimerMode.FOCUS ? TimerMode.BREAK : TimerMode.FOCUS;
    
    setSurgeActive(true);
    playAlarm();
    sendNotification(nextMode);
    setTargetTimestamp(null);
    setIsActive(false);
    stopSilentAudio();
    
    setTimeout(() => {
      setMode(nextMode);
      setSurgeActive(false);
      setTimeLeft(nextMode === TimerMode.FOCUS ? FOCUS_TIME : BREAK_TIME);
      // 過渡動畫結束後才解鎖
      isSwitchingRef.current = false;
    }, 1500);
  }, [mode, sendNotification, playAlarm, stopSilentAudio]);

  const syncTime = useCallback(() => {
    // 檢查 isActive 狀態以及鎖定狀態
    if (!isActive || !targetTimestamp || isSwitchingRef.current) return;
    
    const now = Date.now();
    const remaining = Math.max(0, Math.round((targetTimestamp - now) / 1000));
    
    setTimeLeft(remaining);
    
    if (remaining === 0) {
      triggerModeSwitch();
      releaseWakeLock();
    }
  }, [isActive, targetTimestamp, triggerModeSwitch]);

  const toggleTimer = useCallback(() => {
    if (isSwitchingRef.current) return;

    if (!isActive) {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
      
      startSilentAudio();
      setTargetTimestamp(Date.now() + timeLeft * 1000);
      requestWakeLock();
      setIsActive(true);
    } else {
      setTargetTimestamp(null);
      releaseWakeLock();
      setIsActive(false);
      stopSilentAudio();
    }
  }, [isActive, timeLeft, startSilentAudio, stopSilentAudio]);

  const resetTimer = useCallback(() => {
    isSwitchingRef.current = false; // 重置鎖定
    setIsActive(false);
    setTargetTimestamp(null);
    setTimeLeft(mode === TimerMode.FOCUS ? FOCUS_TIME : BREAK_TIME);
    releaseWakeLock();
    stopSilentAudio();
  }, [mode, stopSilentAudio]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(syncTime, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, syncTime]);

  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        syncTime();
        if (isActive) {
          requestWakeLock();
          if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
        }
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    window.addEventListener('pageshow', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('pageshow', handleSync);
    };
  }, [syncTime, isActive]);

  // Fix: Wrapped the arrow function in parentheses to create a proper IIFE for destructuring mins and secs.
  const { mins, secs } = ((seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return { mins: m, secs: s };
  })(timeLeft);
  
  const viewBoxSize = 400;
  const center = viewBoxSize / 2;
  const radius = 180; 
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 select-none overflow-hidden bg-black">
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className={`w-[800px] h-[800px] rounded-full blur-[150px] transition-colors duration-1000 ${mode === TimerMode.FOCUS ? 'bg-[#ff003c10]' : 'bg-[#00f3ff10]'}`}></div>
      </div>

      <div className="relative z-20 flex flex-col items-center w-full max-w-md">
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
            className="relative flex items-center justify-center w-72 h-72 sm:w-[400px] sm:h-[400px] rounded-full border-2 transition-all duration-700 bg-black/40 backdrop-blur-sm overflow-hidden"
            style={{ borderColor: `${theme.primary}22`, boxShadow: `inset 0 0 20px ${theme.soft}` }}
          >
            <svg viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`} className="absolute inset-0 w-full h-full -rotate-90 p-2" style={{ zIndex: 5 }}>
              <circle cx={center} cy={center} r={radius} fill="transparent" stroke={theme.primary} strokeWidth="2" className="opacity-10" />
              <circle 
                cx={center} cy={center} r={radius} 
                fill="transparent" stroke={theme.primary} strokeWidth="8" 
                strokeDasharray={circumference}
                style={{ 
                  strokeDashoffset: offset, 
                  transition: 'stroke-dashoffset 1s linear, stroke 0.7s ease', 
                  filter: `drop-shadow(0 0 12px ${theme.primary})` 
                }} 
                strokeLinecap="round" 
              />
              {isActive && (
                <circle 
                  cx={center} cy={center} r={radius} 
                  fill="transparent" stroke="white" strokeWidth="10" 
                  strokeDasharray={`2, ${circumference}`}
                  style={{ 
                    strokeDashoffset: offset, 
                    transition: 'stroke-dashoffset 1s linear', 
                    filter: `drop-shadow(0 0 15px white) drop-shadow(0 0 5px ${theme.primary})` 
                  }} 
                  strokeLinecap="round" 
                />
              )}
            </svg>

            <div className="flex items-center font-['Orbitron'] text-6xl sm:text-8xl font-black transition-all duration-700 z-10"
              style={{ color: theme.primary, textShadow: `0 0 10px ${theme.glow}` }}>
              <span className="tabular-nums">{mins}</span>
              <span className="mx-2 sm:mx-4 opacity-70 flicker">:</span>
              <span className="tabular-nums">{secs}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-row gap-6 w-full justify-center items-center">
          <NeonButton label={isActive ? "PAUSE" : "START"} onClick={toggleTimer} color={theme.primary} glowColor={theme.glow} disabled={surgeActive} />
          <NeonButton label="RESET" onClick={resetTimer} color={theme.primary} glowColor={theme.glow} disabled={surgeActive} />
        </div>

        <div className="mt-8">
           {notifPermission !== 'granted' && (
            <button 
              onClick={requestPermission}
              className="text-[10px] font-['JetBrains_Mono'] border border-white/20 px-3 py-1 rounded-full text-white/50 hover:text-white hover:border-white/50 transition-all uppercase tracking-widest"
            >
              [ ! ] ENABLE NOTIFICATIONS
            </button>
          )}
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
