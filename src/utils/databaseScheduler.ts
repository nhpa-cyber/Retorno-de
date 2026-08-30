import { FIREBASE_PRESETS, FirebasePreset } from '../firebasePresets';

export interface ScheduleRule {
  id: string;
  presetId: string;
  name: string;
  badge: string;
  badgeColor: string;
  triggerHour: number;   // 0 - 23
  triggerMinute: number; // 0 - 59
  timeLabel: string;     // e.g. "07:00"
  description: string;   // e.g. "Turno Diurno (07:00 às 17:00)"
}

export const DEFAULT_SCHEDULE_RULES: ScheduleRule[] = [
  {
    id: "banco_01_principal",
    presetId: "banco-01",
    name: "Banco de Dados Principal (Banco 01)",
    badge: "Principal",
    badgeColor: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    triggerHour: 0,
    triggerMinute: 0,
    timeLabel: "24h",
    description: "Banco Único de Dados da Plataforma (gen-lang-client-0442534142)"
  }
];

export function isAutoScheduleEnabled(): boolean {
  return false;
}

export function setAutoScheduleEnabled(enabled: boolean): void {
  // Disabled - single database only
}

export function getScheduleRules(): ScheduleRule[] {
  return DEFAULT_SCHEDULE_RULES;
}

export async function saveScheduleRules(rules: ScheduleRule[]): Promise<void> {
  // Disabled - single database only
}

export async function syncScheduleRulesWithServer(): Promise<void> {
  // Disabled - single database only
}

export async function resetScheduleRulesToDefault(): Promise<void> {
  // Disabled - single database only
}

export function getBrasiliaMinutes(now = new Date()): number {
  let h = now.getHours();
  let m = now.getMinutes();
  try {
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    for (const p of parts) {
      if (p.type === 'hour') h = parseInt(p.value, 10);
      if (p.type === 'minute') m = parseInt(p.value, 10);
    }
  } catch (e) {}
  return h * 60 + m;
}

/**
 * Returns which preset SHOULD be active right now according to schedule
 */
export function getCurrentScheduledPreset(now = new Date()): FirebasePreset {
  return FIREBASE_PRESETS[0];
}

export function getCurrentScheduledPresetId(now = new Date()): string {
  return "banco-01";
}

export interface UpcomingSwitchInfo {
  currentPresetId: string;
  nextRule: ScheduleRule;
  nextPreset: FirebasePreset | undefined;
  nextSwitchDate: Date;
  remainingSeconds: number;
  remainingFormatted: string;
  warningLevel: '10m' | '5m' | '1m' | 'none';
  shouldTriggerNow: boolean;
}

export function getUpcomingDatabaseSwitchInfo(now = new Date()): UpcomingSwitchInfo {
  return {
    currentPresetId: "banco-01",
    nextRule: DEFAULT_SCHEDULE_RULES[0],
    nextPreset: FIREBASE_PRESETS[0],
    nextSwitchDate: new Date(),
    remainingSeconds: 999999,
    remainingFormatted: "Ativo",
    warningLevel: 'none',
    shouldTriggerNow: false
  };
}

export async function triggerGlobalDatabaseSwitch(
  seconds = 60,
  targetPresetId?: string,
  requestedBy?: string,
  requestedType: 'manual' | 'auto' = 'manual'
) {
  // No-op - single database mode
}

