"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  TimeSimulationController, 
  TimeSimulationState, 
  TIME_SCALE_PRESETS,
  JulianDateUtils
} from '../controls/TimeSimulationController';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  Calendar,
  Clock,
  Settings
} from 'lucide-react';

interface TimeControlPanelProps {
  timeController: TimeSimulationController;
  className?: string;
  compact?: boolean;
}

interface DateInputState {
  isOpen: boolean;
  inputValue: string;
  isValid: boolean;
}

export const TimeControlPanel: React.FC<TimeControlPanelProps> = ({
  timeController,
  className = '',
  compact = false
}) => {
  const [simState, setSimState] = useState<TimeSimulationState>(timeController.getState());
  const [currentDate, setCurrentDate] = useState<Date>(timeController.getCurrentDate());
  const [dateInput, setDateInput] = useState<DateInputState>({
    isOpen: false,
    inputValue: '',
    isValid: true
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update state when controller changes
  useEffect(() => {
    const handleTimeChanged = ({ time }: { time: number }) => {
      setCurrentDate(JulianDateUtils.julianToDate(time));
      setSimState(timeController.getState());
    };

    const handlePlayStateChanged = () => {
      setSimState(timeController.getState());
    };

    const handleTimeScaleChanged = () => {
      setSimState(timeController.getState());
    };

    const handleRealTimeToggled = () => {
      setSimState(timeController.getState());
    };

    // Subscribe to events
    timeController.on('time-changed', handleTimeChanged);
    timeController.on('play-state-changed', handlePlayStateChanged);
    timeController.on('time-scale-changed', handleTimeScaleChanged);
    timeController.on('real-time-toggled', handleRealTimeToggled);

    return () => {
      timeController.off('time-changed', handleTimeChanged);
      timeController.off('play-state-changed', handlePlayStateChanged);
      timeController.off('time-scale-changed', handleTimeScaleChanged);
      timeController.off('real-time-toggled', handleRealTimeToggled);
    };
  }, [timeController]);

  // Handle play/pause
  const handlePlayPause = useCallback(() => {
    timeController.togglePlaying();
  }, [timeController]);

  // Handle time scale change
  const handleTimeScaleChange = useCallback((scale: number) => {
    timeController.setTimeScale(scale);
  }, [timeController]);

  // Handle step controls
  const handleStepBackward = useCallback(() => {
    const stepSize = getStepSize(simState.timeScale);
    timeController.stepBackward(stepSize);
  }, [timeController, simState.timeScale]);

  const handleStepForward = useCallback(() => {
    const stepSize = getStepSize(simState.timeScale);
    timeController.stepForward(stepSize);
  }, [timeController, simState.timeScale]);

  // Handle jump to now
  const handleJumpToNow = useCallback(() => {
    timeController.jumpToNow(true);
  }, [timeController]);

  // Handle real-time mode toggle
  const handleRealTimeModeToggle = useCallback(() => {
    timeController.setRealTimeMode(!simState.realTimeMode);
  }, [timeController, simState.realTimeMode]);

  // Handle date input
  const handleDateInputChange = useCallback((value: string) => {
    setDateInput(prev => ({
      ...prev,
      inputValue: value,
      isValid: isValidDateString(value)
    }));
  }, []);

  const handleDateInputSubmit = useCallback(() => {
    if (dateInput.isValid && dateInput.inputValue) {
      try {
        const date = new Date(dateInput.inputValue);
        timeController.jumpToDate(date, true);
        setDateInput(prev => ({ ...prev, isOpen: false }));
      } catch (error) {
        console.error('Invalid date:', error);
      }
    }
  }, [timeController, dateInput]);

  const handleDateInputOpen = useCallback(() => {
    setDateInput({
      isOpen: true,
      inputValue: currentDate.toISOString().split('T')[0],
      isValid: true
    });
  }, [currentDate]);

  // Get appropriate step size based on time scale
  const getStepSize = (timeScale: number): number => {
    if (timeScale <= TIME_SCALE_PRESETS.REAL_TIME) return 1;
    if (timeScale <= TIME_SCALE_PRESETS.HOUR_PER_SECOND) return 1;
    if (timeScale <= TIME_SCALE_PRESETS.DAY_PER_SECOND) return 7;
    if (timeScale <= TIME_SCALE_PRESETS.MONTH_PER_SECOND) return 30;
    if (timeScale <= TIME_SCALE_PRESETS.YEAR_PER_SECOND) return 365;
    return 365 * 10;
  };

  // Validate date string
  const isValidDateString = (dateString: string): boolean => {
    if (!dateString) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };

  // Format current date for display
  const formatCurrentDate = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get time scale presets for current context
  const getRelevantPresets = () => {
    const presets = TimeSimulationController.getTimeScalePresets();
    return compact ? presets.filter(p => [0, 1, 86400, 31556952].includes(p.value)) : presets;
  };

  if (compact) {
    return (
      <Card className={`p-3 ${className}`}>
        <div className="flex items-center gap-2">
          {/* Play/Pause */}
          <Button
            variant={simState.isPlaying ? "default" : "outline"}
            size="sm"
            onClick={handlePlayPause}
            className="p-2"
          >
            {simState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          {/* Time Scale */}
          <select
            value={simState.timeScale}
            onChange={(e) => handleTimeScaleChange(Number(e.target.value))}
            className="text-sm border rounded px-2 py-1 bg-background"
          >
            {getRelevantPresets().map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.name}
              </option>
            ))}
          </select>

          {/* Current Date (clickable) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDateInputOpen}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <Calendar className="w-3 h-3 mr-1" />
            {currentDate.toLocaleDateString('tr-TR')}
          </Button>
        </div>

        {/* Date Input Modal */}
        {dateInput.isOpen && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <Card className="p-4 min-w-[300px]">
              <h3 className="text-lg font-semibold mb-3">Tarihe Git</h3>
              <div className="space-y-3">
                <input
                  type="date"
                  value={dateInput.inputValue}
                  onChange={(e) => handleDateInputChange(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
                <div className="flex gap-2">
                  <Button onClick={handleDateInputSubmit} disabled={!dateInput.isValid}>
                    Git
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDateInput(prev => ({ ...prev, isOpen: false }))}
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className={`p-4 ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Zaman Kontrolü</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Current Time Display */}
        <div className="text-center">
          <div className="text-2xl font-mono">
            {formatCurrentDate(currentDate)}
          </div>
          <div className="text-sm text-muted-foreground">
            Julian Günü: {simState.currentTime.toFixed(3)}
          </div>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleStepBackward}
            disabled={simState.realTimeMode}
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            variant={simState.isPlaying ? "default" : "outline"}
            onClick={handlePlayPause}
            className="px-6"
          >
            {simState.isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Durdur
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Başlat
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleStepForward}
            disabled={simState.realTimeMode}
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Time Scale Control */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Zaman Hızı: {TimeSimulationController.formatTimeScale(simState.timeScale)}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {getRelevantPresets().map(preset => (
              <Button
                key={preset.value}
                variant={simState.timeScale === preset.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeScaleChange(preset.value)}
                disabled={simState.realTimeMode && preset.value !== TIME_SCALE_PRESETS.REAL_TIME}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleJumpToNow}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Şimdiye Git
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDateInputOpen}
            className="flex-1"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Tarihe Git
          </Button>
        </div>

        {/* Real-time Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm">Gerçek Zaman Modu</span>
          <Button
            variant={simState.realTimeMode ? "default" : "outline"}
            size="sm"
            onClick={handleRealTimeModeToggle}
          >
            <Clock className="w-4 h-4 mr-2" />
            {simState.realTimeMode ? 'Açık' : 'Kapalı'}
          </Button>
        </div>

        {/* Advanced Controls */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-medium">Gelişmiş Kontroller</h4>
            
            {/* Custom Time Scale */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Özel Zaman Hızı
              </label>
              <input
                type="range"
                min={Math.log10(TIME_SCALE_PRESETS.REAL_TIME)}
                max={Math.log10(TIME_SCALE_PRESETS.CENTURY_PER_SECOND)}
                step="0.1"
                value={Math.log10(Math.max(simState.timeScale, 1))}
                onChange={(e) => handleTimeScaleChange(Math.pow(10, Number(e.target.value)))}
                className="w-full"
                disabled={simState.realTimeMode}
              />
              <div className="text-xs text-muted-foreground mt-1">
                1x - {TimeSimulationController.formatTimeScale(TIME_SCALE_PRESETS.CENTURY_PER_SECOND)}
              </div>
            </div>

            {/* Time Info */}
            <div className="text-xs space-y-1 text-muted-foreground">
              <div>J2000'den beri: {timeController.getDaysSinceJ2000().toFixed(1)} gün</div>
              <div>Yüzyıl: {timeController.getCenturiesSinceJ2000().toFixed(6)}</div>
            </div>
          </div>
        )}

        {/* Date Input Modal */}
        {dateInput.isOpen && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <Card className="p-6 min-w-[400px]">
              <h3 className="text-xl font-semibold mb-4">Belirli Tarihe Git</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tarih Seçin</label>
                  <input
                    type="date"
                    value={dateInput.inputValue}
                    onChange={(e) => handleDateInputChange(e.target.value)}
                    className={`w-full border rounded px-3 py-2 ${
                      dateInput.isValid ? 'border-gray-300' : 'border-red-500'
                    }`}
                  />
                  {!dateInput.isValid && (
                    <p className="text-red-500 text-sm mt-1">Geçerli bir tarih girin</p>
                  )}
                </div>

                {/* Quick Date Presets */}
                <div>
                  <label className="block text-sm font-medium mb-2">Hızlı Seçim</label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateInputChange('2000-01-01')}
                    >
                      Y2K (2000)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateInputChange('2012-12-21')}
                    >
                      Maya Takvimi
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateInputChange('1969-07-20')}
                    >
                      Ay'a İniş
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDateInputChange(new Date().toISOString().split('T')[0])}
                    >
                      Bugün
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleDateInputSubmit} 
                    disabled={!dateInput.isValid}
                    className="flex-1"
                  >
                    Tarihe Git
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setDateInput(prev => ({ ...prev, isOpen: false }))}
                    className="flex-1"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TimeControlPanel;