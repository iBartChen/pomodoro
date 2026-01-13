
export enum TimerMode {
  FOCUS = 'FOCUS',
  BREAK = 'BREAK'
}

export interface AppState {
  timeLeft: number;
  isActive: boolean;
  mode: TimerMode;
  sessionsCompleted: number;
}
