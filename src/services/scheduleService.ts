import { ScheduleConfig, ScheduleItem } from '../types';
import { APP_CONFIG } from '../config/AppConfig';

export const SCHEDULE_STORAGE_KEY = 'prodtrack_schedule_config';
export const SCHEDULE_UPDATE_EVENT = 'schedule_config_updated';
export const SCHEDULE_PREVIEW_EVENT = 'schedule_preview_trigger';
export const SCHEDULE_PREVIEW_STOP_EVENT = 'schedule_preview_stop';

export interface ActiveScheduleState {
  activeItem: ScheduleItem;
  totalSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  isPreview?: boolean;
}

/**
 * Loads the schedule configuration from localStorage or falls back to APP_CONFIG defaults.
 */
export function getScheduleConfig(): ScheduleConfig {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.enabled === 'boolean' && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse schedule config from localStorage:', err);
  }
  return APP_CONFIG.DEFAULT_SCHEDULE_CONFIG;
}

/**
 * Saves the schedule configuration to localStorage and notifies all subscribers.
 */
export function saveScheduleConfig(config: ScheduleConfig): void {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent(SCHEDULE_UPDATE_EVENT, {
        detail: config,
      })
    );
  } catch (err) {
    console.error('Failed to save schedule config to localStorage:', err);
  }
}

/**
 * Resets the schedule configuration to system defaults.
 */
export function resetScheduleConfig(): ScheduleConfig {
  const defaultConfig = APP_CONFIG.DEFAULT_SCHEDULE_CONFIG;
  saveScheduleConfig(defaultConfig);
  return defaultConfig;
}

/**
 * Evaluates the current local system time against the active schedule items.
 */
export function getActiveScheduleState(
  config: ScheduleConfig,
  now: Date
): ActiveScheduleState | null {
  if (!config.enabled || !config.items || config.items.length === 0) {
    return null;
  }

  const nowSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  for (const item of config.items) {
    if (!item.isEnabled) continue;

    const [startH, startM] = item.startTime.split(':').map(Number);
    const [endH, endM] = item.endTime.split(':').map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) continue;

    const startSec = startH * 3600 + startM * 60;
    const endSec = endH * 3600 + endM * 60;

    let isActive = false;
    let totalSeconds = 0;
    let elapsedSeconds = 0;
    let remainingSeconds = 0;

    if (endSec > startSec) {
      // Standard daytime interval, e.g. 09:00 to 09:01 or 13:00 to 14:00
      if (nowSec >= startSec && nowSec < endSec) {
        isActive = true;
        totalSeconds = endSec - startSec;
        elapsedSeconds = nowSec - startSec;
        remainingSeconds = endSec - nowSec;
      }
    } else if (endSec < startSec) {
      // Overnight interval crossing midnight, e.g. 23:30 to 00:30
      totalSeconds = (86400 - startSec) + endSec;
      if (nowSec >= startSec) {
        isActive = true;
        elapsedSeconds = nowSec - startSec;
        remainingSeconds = totalSeconds - elapsedSeconds;
      } else if (nowSec < endSec) {
        isActive = true;
        elapsedSeconds = (86400 - startSec) + nowSec;
        remainingSeconds = totalSeconds - elapsedSeconds;
      }
    }

    if (isActive) {
      const progress = Math.min(100, Math.max(0, (elapsedSeconds / Math.max(1, totalSeconds)) * 100));
      return {
        activeItem: item,
        totalSeconds,
        elapsedSeconds,
        remainingSeconds,
        progress,
        isPreview: false,
      };
    }
  }

  return null;
}

/**
 * Triggers a manual preview of a schedule item for verification and testing.
 */
export function triggerSchedulePreview(item: ScheduleItem, durationSeconds: number = 30): void {
  window.dispatchEvent(
    new CustomEvent(SCHEDULE_PREVIEW_EVENT, {
      detail: { item, durationSeconds },
    })
  );
}

/**
 * Immediately stops any active schedule test preview.
 */
export function stopSchedulePreview(): void {
  window.dispatchEvent(new CustomEvent(SCHEDULE_PREVIEW_STOP_EVENT));
}
