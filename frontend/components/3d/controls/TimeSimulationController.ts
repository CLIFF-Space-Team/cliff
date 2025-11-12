import * as THREE from 'three';
import { EventEmitter } from 'events';
export interface TimeSimulationState {
  timeScale: number;         // Speed multiplier (1 = real time, 365.25 = 1 year per day)
  currentTime: number;       // Current Julian day
  isPlaying: boolean;        // Animation state
  realTimeMode: boolean;     // Real time vs simulation mode
  minTimeScale: number;      // Minimum time scale
  maxTimeScale: number;      // Maximum time scale
}
export interface TimeControlEvents {
  'time-changed': { time: number; timeScale: number };
  'play-state-changed': { isPlaying: boolean };
  'time-scale-changed': { timeScale: number };
  'date-jumped': { fromTime: number; toTime: number };
  'real-time-toggled': { realTimeMode: boolean };
}
export const TIME_SCALE_PRESETS = {
  PAUSED: 0,
  REAL_TIME: 1,
  MINUTE_PER_SECOND: 60,
  HOUR_PER_SECOND: 3600,
  DAY_PER_SECOND: 86400,
  WEEK_PER_SECOND: 604800,
  MONTH_PER_SECOND: 2629746,
  YEAR_PER_SECOND: 31556952,
  DECADE_PER_SECOND: 315569520,
  CENTURY_PER_SECOND: 3155695200
} as const;
export class JulianDateUtils {
  static readonly J2000_EPOCH = 2451545.0; // January 1, 2000, 12:00 TT
  static readonly SECONDS_PER_DAY = 86400;
  static dateToJulian(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const second = date.getSeconds();
    const millisecond = date.getMilliseconds();
    let a = Math.floor((14 - month) / 12);
    let y = year + 4800 - a;
    let m = month + 12 * a - 3;
    let jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4);
    if (year > 1582 || (year === 1582 && month > 10) || (year === 1582 && month === 10 && day >= 15)) {
      jd = jd - Math.floor(y / 100) + Math.floor(y / 400);
    }
    jd = jd - 32045;
    const timeFraction = (hour - 12) / 24 + minute / 1440 + second / 86400 + millisecond / 86400000;
    return jd + timeFraction;
  }
  static julianToDate(jd: number): Date {
    const a = Math.floor(jd + 0.5);
    const b = a + 1537;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);
    const day = b - d - Math.floor(30.6001 * e);
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;
    const timeFraction = (jd + 0.5) - a;
    const hours = timeFraction * 24;
    const hour = Math.floor(hours);
    const minutes = (hours - hour) * 60;
    const minute = Math.floor(minutes);
    const seconds = (minutes - minute) * 60;
    const second = Math.floor(seconds);
    const millisecond = Math.floor((seconds - second) * 1000);
    return new Date(year, month - 1, day, hour, minute, second, millisecond);
  }
  static getCurrentJulianDay(): number {
    return this.dateToJulian(new Date());
  }
  static daysSinceJ2000(julianDay: number): number {
    return julianDay - this.J2000_EPOCH;
  }
  static centuriesSinceJ2000(julianDay: number): number {
    return this.daysSinceJ2000(julianDay) / 36525;
  }
}
export class TimeSimulationController extends EventEmitter {
  private state: TimeSimulationState;
  private lastUpdateTime: number;
  private animationFrameId?: number;
  private targetTime?: number; // For smooth transitions
  private transitionDuration: number = 2000; // ms
  private transitionStartTime?: number;
  private initialTransitionTime?: number;
  constructor() {
    super();
    this.state = {
      timeScale: TIME_SCALE_PRESETS.REAL_TIME,
      currentTime: JulianDateUtils.getCurrentJulianDay(),
      isPlaying: false,
      realTimeMode: true,
      minTimeScale: TIME_SCALE_PRESETS.PAUSED,
      maxTimeScale: TIME_SCALE_PRESETS.CENTURY_PER_SECOND
    };
    this.lastUpdateTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.bindMethods();
    if (typeof window !== 'undefined' && typeof requestAnimationFrame !== 'undefined') {
      this.startAnimationLoop();
    }
  }
  private bindMethods(): void {
    this.update = this.update.bind(this);
  }
  private startAnimationLoop(): void {
    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      console.warn('⚠️ TimeSimulationController: requestAnimationFrame not available, animation loop disabled');
      return;
    }
    const animate = () => {
      this.update();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }
  private update(): void {
    const currentTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const deltaTime = (currentTime - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = currentTime;
    if (this.targetTime !== undefined && this.transitionStartTime !== undefined) {
      const elapsed = currentTime - this.transitionStartTime;
      const progress = Math.min(elapsed / this.transitionDuration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      if (this.initialTransitionTime !== undefined) {
        this.state.currentTime = this.initialTransitionTime + 
          (this.targetTime - this.initialTransitionTime) * easeProgress;
      }
      if (progress >= 1) {
        this.state.currentTime = this.targetTime;
        this.targetTime = undefined;
        this.transitionStartTime = undefined;
        this.initialTransitionTime = undefined;
      }
    } else if (this.state.isPlaying && this.state.timeScale > 0) {
      if (this.state.realTimeMode) {
        this.state.currentTime = JulianDateUtils.getCurrentJulianDay();
      } else {
        const julianDayDelta = (deltaTime * this.state.timeScale) / JulianDateUtils.SECONDS_PER_DAY;
        this.state.currentTime += julianDayDelta;
      }
    }
    this.emit('time-changed', {
      time: this.state.currentTime,
      timeScale: this.state.timeScale
    });
  }
  getState(): Readonly<TimeSimulationState> {
    return { ...this.state };
  }
  setTimeScale(timeScale: number): void {
    timeScale = THREE.MathUtils.clamp(timeScale, this.state.minTimeScale, this.state.maxTimeScale);
    if (timeScale !== this.state.timeScale) {
      this.state.timeScale = timeScale;
      if (timeScale > 0 && !this.state.isPlaying) {
        this.state.isPlaying = true;
        this.emit('play-state-changed', { isPlaying: true });
      }
      if (timeScale === 0 && this.state.isPlaying) {
        this.state.isPlaying = false;
        this.emit('play-state-changed', { isPlaying: false });
      }
      this.emit('time-scale-changed', { timeScale });
    }
  }
  setPlaying(isPlaying: boolean): void {
    if (isPlaying !== this.state.isPlaying) {
      this.state.isPlaying = isPlaying;
      if (isPlaying && this.state.timeScale === 0) {
        this.state.timeScale = TIME_SCALE_PRESETS.REAL_TIME;
        this.emit('time-scale-changed', { timeScale: this.state.timeScale });
      }
      this.emit('play-state-changed', { isPlaying });
    }
  }
  togglePlaying(): void {
    this.setPlaying(!this.state.isPlaying);
  }
  setTime(julianDay: number, smooth: boolean = true): void {
    const fromTime = this.state.currentTime;
    if (smooth && Math.abs(julianDay - this.state.currentTime) > 1) {
      this.targetTime = julianDay;
      this.transitionStartTime = performance.now();
      this.initialTransitionTime = this.state.currentTime;
    } else {
      this.state.currentTime = julianDay;
    }
    this.emit('date-jumped', { fromTime, toTime: julianDay });
  }
  jumpToDate(date: Date, smooth: boolean = true): void {
    const julianDay = JulianDateUtils.dateToJulian(date);
    this.setTime(julianDay, smooth);
  }
  jumpToNow(smooth: boolean = true): void {
    this.jumpToDate(new Date(), smooth);
  }
  setRealTimeMode(realTimeMode: boolean): void {
    if (realTimeMode !== this.state.realTimeMode) {
      this.state.realTimeMode = realTimeMode;
      if (realTimeMode) {
        this.jumpToNow(false);
      }
      this.emit('real-time-toggled', { realTimeMode });
    }
  }
  getCurrentDate(): Date {
    return JulianDateUtils.julianToDate(this.state.currentTime);
  }
  getDaysSinceJ2000(): number {
    return JulianDateUtils.daysSinceJ2000(this.state.currentTime);
  }
  getCenturiesSinceJ2000(): number {
    return JulianDateUtils.centuriesSinceJ2000(this.state.currentTime);
  }
  addTime(days: number): void {
    this.setTime(this.state.currentTime + days, false);
  }
  stepForward(days: number = 1): void {
    this.addTime(days);
  }
  stepBackward(days: number = 1): void {
    this.addTime(-days);
  }
  static getTimeScalePresets(): { name: string; value: number; }[] {
    return [
      { name: 'Paused', value: TIME_SCALE_PRESETS.PAUSED },
      { name: 'Real Time', value: TIME_SCALE_PRESETS.REAL_TIME },
      { name: 'Minute/Second', value: TIME_SCALE_PRESETS.MINUTE_PER_SECOND },
      { name: 'Hour/Second', value: TIME_SCALE_PRESETS.HOUR_PER_SECOND },
      { name: 'Day/Second', value: TIME_SCALE_PRESETS.DAY_PER_SECOND },
      { name: 'Week/Second', value: TIME_SCALE_PRESETS.WEEK_PER_SECOND },
      { name: 'Month/Second', value: TIME_SCALE_PRESETS.MONTH_PER_SECOND },
      { name: 'Year/Second', value: TIME_SCALE_PRESETS.YEAR_PER_SECOND },
      { name: 'Decade/Second', value: TIME_SCALE_PRESETS.DECADE_PER_SECOND },
      { name: 'Century/Second', value: TIME_SCALE_PRESETS.CENTURY_PER_SECOND }
    ];
  }
  static formatTimeScale(timeScale: number): string {
    if (timeScale === 0) return 'Paused';
    if (timeScale === 1) return 'Real Time';
    if (timeScale < 60) return `${timeScale}x`;
    if (timeScale < 3600) return `${Math.round(timeScale / 60)} min/sec`;
    if (timeScale < 86400) return `${Math.round(timeScale / 3600)} hr/sec`;
    if (timeScale < 604800) return `${Math.round(timeScale / 86400)} day/sec`;
    if (timeScale < 2629746) return `${Math.round(timeScale / 604800)} week/sec`;
    if (timeScale < 31556952) return `${Math.round(timeScale / 2629746)} month/sec`;
    return `${Math.round(timeScale / 31556952)} year/sec`;
  }
  dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
    this.removeAllListeners();
  }
}
let _timeController: TimeSimulationController | null = null;
export const getTimeController = (): TimeSimulationController => {
  if (!_timeController && typeof window !== 'undefined') {
    _timeController = new TimeSimulationController();
  }
  if (!_timeController) {
    throw new Error('TimeSimulationController requires browser environment');
  }
  return _timeController;
};
export const timeController = typeof window !== 'undefined' ? getTimeController() : null;