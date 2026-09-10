import { DelayConfig, DelayReason, BOMNode } from '../types';
import { differenceInDays, parseISO } from 'date-fns';
import { db } from './db';

export const DELAY_CONFIG_KEY = 'prodtrack_delay_config';
export const DELAY_CONFIG_UPDATED_EVENT = 'prodtrack_delay_config_updated';

export const DEFAULT_DELAY_REASONS: DelayReason[] = [
  { id: 'reason-supply', label: 'Затримка постачання матеріалів / комплектуючих', isDefault: true },
  { id: 'reason-equipment', label: 'Поломка, налагодження або калібрування обладнання', isDefault: true },
  { id: 'reason-quality', label: 'Виробничий брак / повернення ВТК', isDefault: true },
  { id: 'reason-staff', label: 'Нестача персоналу / хвороба фахівця', isDefault: true },
  { id: 'reason-design', label: 'Внесення змін у креслення / конструкторська доробка', isDefault: true },
  { id: 'reason-testing', label: 'Очікування випробувань або сертифікації', isDefault: true },
  { id: 'reason-logistics', label: 'Логістичні або митні затримки', isDefault: true },
];

export const DEFAULT_DELAY_CONFIG: DelayConfig = {
  deadlineWarningDaysThreshold: 2,
  progressWarningThreshold: 80,
  reasons: DEFAULT_DELAY_REASONS,
};

/**
 * Retrieves the current delay configuration from localStorage or defaults
 */
export function getDelayConfig(): DelayConfig {
  try {
    const raw = localStorage.getItem(DELAY_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        typeof parsed.deadlineWarningDaysThreshold === 'number' &&
        typeof parsed.progressWarningThreshold === 'number' &&
        Array.isArray(parsed.reasons)
      ) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to parse delay config from storage:', err);
  }
  return DEFAULT_DELAY_CONFIG;
}

/**
 * Saves delay configuration to localStorage and db.settings, notifying listeners
 */
export async function saveDelayConfig(config: DelayConfig): Promise<void> {
  try {
    localStorage.setItem(DELAY_CONFIG_KEY, JSON.stringify(config));
    await db.settings.put({
      key: 'delay_config',
      value: JSON.stringify(config),
    });
    window.dispatchEvent(new CustomEvent(DELAY_CONFIG_UPDATED_EVENT, { detail: config }));
  } catch (err) {
    console.error('Failed to save delay config:', err);
  }
}

/**
 * Resets delay config back to system defaults
 */
export async function resetDelayConfig(): Promise<DelayConfig> {
  await saveDelayConfig(DEFAULT_DELAY_CONFIG);
  return DEFAULT_DELAY_CONFIG;
}

/**
 * Checks if a BOM node is overdue or approaching deadline based on current config
 */
export function evaluateNodeDelay(
  node: BOMNode,
  customConfig?: DelayConfig
): { isOverdue: boolean; isApproaching: boolean; daysDiff: number } {
  const config = customConfig || getDelayConfig();
  let daysDiff = 0;
  let isOverdue = false;
  let isApproaching = false;

  try {
    const dueDate = parseISO(node.dueDate);
    const now = new Date();
    daysDiff = differenceInDays(dueDate, now);

    if (daysDiff < 0 && node.progress < 100) {
      isOverdue = true;
    } else if (
      daysDiff <= config.deadlineWarningDaysThreshold &&
      node.progress < config.progressWarningThreshold
    ) {
      isApproaching = true;
    }
  } catch {
    // Ignore date parse issues
  }

  return { isOverdue, isApproaching, daysDiff };
}
