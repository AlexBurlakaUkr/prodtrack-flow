import React, { useState, useEffect, useRef } from 'react';
import {
  ScheduleConfig,
  ScheduleItem,
} from '../../types';
import {
  getScheduleConfig,
  getActiveScheduleState,
  ActiveScheduleState,
  SCHEDULE_UPDATE_EVENT,
  SCHEDULE_PREVIEW_EVENT,
} from '../../services/scheduleService';
import { SolemnRemembranceOverlay } from './SolemnRemembranceOverlay';
import { WorkBreakOverlay } from './WorkBreakOverlay';
import { MinimizedBreakPill } from './MinimizedBreakPill';

export const ScheduleOverlay: React.FC = () => {
  const [config, setConfig] = useState<ScheduleConfig>(() => getScheduleConfig());
  const [activeState, setActiveState] = useState<ActiveScheduleState | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [dismissedBreakId, setDismissedBreakId] = useState<string | null>(null);

  // Preview state for testing
  const [previewState, setPreviewState] = useState<ActiveScheduleState | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for configuration updates
  useEffect(() => {
    const handleConfigUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<ScheduleConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(getScheduleConfig());
      }
    };

    window.addEventListener(SCHEDULE_UPDATE_EVENT, handleConfigUpdate);
    window.addEventListener('storage', handleConfigUpdate);

    return () => {
      window.removeEventListener(SCHEDULE_UPDATE_EVENT, handleConfigUpdate);
      window.removeEventListener('storage', handleConfigUpdate);
    };
  }, []);

  // Listen for test preview events
  useEffect(() => {
    const handlePreview = (e: Event) => {
      const customEvent = e as CustomEvent<{ item: ScheduleItem; durationSeconds: number }>;
      const { item, durationSeconds } = customEvent.detail;

      if (previewTimerRef.current) {
        clearInterval(previewTimerRef.current);
      }

      let remaining = durationSeconds || 30;
      const total = remaining;

      setPreviewState({
        activeItem: item,
        totalSeconds: total,
        elapsedSeconds: 0,
        remainingSeconds: remaining,
        progress: 0,
        isPreview: true,
      });
      setIsMinimized(false);

      previewTimerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          if (previewTimerRef.current) clearInterval(previewTimerRef.current);
          setPreviewState(null);
        } else {
          setPreviewState({
            activeItem: item,
            totalSeconds: total,
            elapsedSeconds: total - remaining,
            remainingSeconds: remaining,
            progress: Math.min(100, Math.max(0, ((total - remaining) / total) * 100)),
            isPreview: true,
          });
        }
      }, 1000);
    };

    const handlePreviewStop = () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
      setPreviewState(null);
    };

    window.addEventListener(SCHEDULE_PREVIEW_EVENT, handlePreview);
    window.addEventListener('schedule_preview_stop', handlePreviewStop);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewTimerRef.current) clearInterval(previewTimerRef.current);
        setPreviewState(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(SCHEDULE_PREVIEW_EVENT, handlePreview);
      window.removeEventListener('schedule_preview_stop', handlePreviewStop);
      window.removeEventListener('keydown', handleKeyDown);
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);
    };
  }, []);

  // Global background tick interval checking local system clock every second
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const state = getActiveScheduleState(config, now);

      if (!state) {
        // Interval ended or no active interval
        setActiveState(null);
        setDismissedBreakId(null);
        setIsMinimized(false);
      } else {
        // If a new break has just started, reset minimized state and dismissed ID
        setActiveState((prev) => {
          if (!prev || prev.activeItem.id !== state.activeItem.id) {
            setIsMinimized(false);
            setDismissedBreakId(null);
          }
          return state;
        });
      }
    };

    // Initial check immediately
    checkSchedule();

    // Check every second
    const interval = setInterval(checkSchedule, 1000);

    return () => clearInterval(interval);
  }, [config]);

  // Current effective state: preview has precedence if active
  const effectiveState = previewState || activeState;

  if (!effectiveState) {
    return null;
  }

  // If user dismissed this specific break instance (only for non-solemn events)
  if (!effectiveState.activeItem.isSolemn && dismissedBreakId === effectiveState.activeItem.id && !effectiveState.isPreview) {
    return null;
  }

  // 1. Solemn Event Mode (Хвилина мовчання) - Locked Screen, cannot be minimized
  if (effectiveState.activeItem.isSolemn) {
    return (
      <SolemnRemembranceOverlay
        state={effectiveState}
        onClosePreview={
          effectiveState.isPreview
            ? () => {
                if (previewTimerRef.current) clearInterval(previewTimerRef.current);
                setPreviewState(null);
              }
            : undefined
        }
      />
    );
  }

  // 2. Work Break Mode (Short Breaks & Lunch) - Apple Glass Modal with minimize to floating pill
  if (isMinimized) {
    return (
      <MinimizedBreakPill
        state={effectiveState}
        onExpand={() => setIsMinimized(false)}
        onDismiss={() => {
          if (effectiveState.isPreview) {
            if (previewTimerRef.current) clearInterval(previewTimerRef.current);
            setPreviewState(null);
          } else {
            setDismissedBreakId(effectiveState.activeItem.id);
          }
        }}
      />
    );
  }

  return (
    <WorkBreakOverlay
      state={effectiveState}
      onMinimize={() => setIsMinimized(true)}
      onDismiss={() => {
        if (effectiveState.isPreview) {
          if (previewTimerRef.current) clearInterval(previewTimerRef.current);
          setPreviewState(null);
        } else {
          setDismissedBreakId(effectiveState.activeItem.id);
        }
      }}
    />
  );
};
