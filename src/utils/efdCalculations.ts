import * as XLSX from 'xlsx';
import { AuditSession, ImportedRoute, Driver } from '../types';
import { EMBEDDED_ACCOMPANIMENT_RECORDS } from '../data/embeddedAccompanimentData';
import { DEFAULT_DRIVERS } from '../data';

/**
 * Função utilitária para gerar hash estável a partir de string
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/**
 * Localiza ou sorteia um motorista devidamente cadastrado na base da plataforma.
 * Quando o motorista não possui menção ou é genérico ("Não Informado", "DRV-", etc.),
 * sorteia de forma aleatória/determinística entre os motoristas cadastrados.
 * Se não houver nome ou motoristas cadastrados, cria um registro válido.
 */
export function resolveRegisteredDriver(
  driverIdOrName?: string,
  seedKey?: string,
  customDriverList?: Driver[]
): { id: string; name: string } {
  // Garantir que a lista de motoristas contenha APENAS colaboradores cadastrados reais (sem placeholders como "Motorista G...")
  const validRegisteredDrivers = (customDriverList && customDriverList.length > 0 ? customDriverList : DEFAULT_DRIVERS)
    .filter(d => {
      const upName = (d.name || '').toUpperCase().trim();
      const upId = (d.id || '').toUpperCase().trim();
      return (
        d.role === 'MOTORISTA' &&
        upId !== 'G1082' &&
        !upName.includes('CESARIO') &&
        !upName.includes('CESÁRIO') &&
        !upName.startsWith('MOTORISTA G') &&
        !upName.startsWith('MOTORISTA_') &&
        upName !== 'MOTORISTA' &&
        !upName.includes('NÃO CADASTRADO') &&
        !upName.includes('NAO CADASTRADO') &&
        !upName.includes('NÃO INFORMADO') &&
        !upName.includes('NAO INFORMADO')
      );
    });

  const pool = validRegisteredDrivers.length > 0 ? validRegisteredDrivers : DEFAULT_DRIVERS.filter(d => d.role === 'MOTORISTA' && !d.name.toUpperCase().includes('CESARIO') && d.id !== 'G1082');

  if (pool.length === 0) {
    return { id: 'G1034', name: 'EDENILSON DE SOUSA SILVA' };
  }

  if (driverIdOrName && driverIdOrName.trim()) {
    const raw = driverIdOrName.trim();
    const upper = raw.toUpperCase();

    // Identifica se é placeholder, código genérico ou motorista não cadastrado
    const isPlaceholderOrGeneric = [
      'NÃO INFORMADO', 'NAO INFORMADO', 'N/A', 'DESCONHECIDO', 'MOTORISTA', 
      'TEMP', 'PENDENTE', 'DRV-', 'DRV_', 'G72', 'G71', 'G70', 'G20', 'G30', 'G50', 
      'NÃO CADASTRADO', 'NAO CADASTRADO', 'MOTORISTA G'
    ].some(p => upper.includes(p)) || /^G\d{1,2}$/.test(upper);

    if (!isPlaceholderOrGeneric) {
      // 1. Procura correspondência exata ou por ID na base oficial de motoristas cadastrados
      const matched = pool.find(d => 
        d.id.toUpperCase() === upper || 
        d.name.toUpperCase() === upper
      );
      if (matched) {
        return { id: matched.id, name: matched.name };
      }

      // 2. Procura por correspondência parcial de nome cadastrado
      const partialMatch = pool.find(d => 
        (upper.length >= 6 && d.name.toUpperCase().includes(upper)) ||
        (d.name.length >= 6 && upper.includes(d.name.toUpperCase()))
      );
      if (partialMatch) {
        return { id: partialMatch.id, name: partialMatch.name };
      }

      // Se for um nome humano com nome e sobrenome legítimo que não seja placeholder
      const words = raw.split(/\s+/).filter(w => w.length > 1);
      if (words.length >= 2 && !upper.startsWith('G') && !upper.includes('MOTORISTA')) {
        return { id: `G${Math.abs(hashString(raw) % 900) + 1100}`, name: upper };
      }
    }
  }

  // Sorteia determinístico e consistente a partir do seedKey (mapa/placa/driverId) entre os motoristas cadastrados
  const combinedSeed = `${seedKey || ''}_${driverIdOrName || ''}`;
  let seedIndex = 0;
  if (combinedSeed.trim()) {
    seedIndex = Math.abs(hashString(combinedSeed));
  } else {
    seedIndex = Math.floor(Math.random() * pool.length);
  }

  const selected = pool[seedIndex % pool.length];
  return { id: selected.id, name: selected.name };
}

export const OFFICIAL_REGISTERED_VEHICLES: Array<{ plate: string; capacityPallets: number }> = [
  { plate: 'NPR2601', capacityPallets: 10 },
  { plate: 'OXO0532', capacityPallets: 8 },
  { plate: 'OXO0542', capacityPallets: 8 },
  { plate: 'OXO0552', capacityPallets: 6 },
  { plate: 'OXO0782', capacityPallets: 10 },
  { plate: 'QFG1259', capacityPallets: 8 },
  { plate: 'QSK7D92', capacityPallets: 10 },
  { plate: 'RLR8G79', capacityPallets: 8 },
  { plate: 'RLU4H49', capacityPallets: 8 },
  { plate: 'RLW0C17', capacityPallets: 6 },
  { plate: 'SLB3J76', capacityPallets: 10 },
  { plate: 'SLB4A26', capacityPallets: 10 },
  { plate: 'SLB4A56', capacityPallets: 10 },
  { plate: 'TOU7F39', capacityPallets: 8 },
  { plate: 'TOZ8B20', capacityPallets: 10 },
  { plate: 'TOZ8B50', capacityPallets: 10 },
  { plate: 'TPA6D10', capacityPallets: 10 }
];

export function resolveRegisteredPlate(
  rawPlate?: string,
  seedKey?: string
): string {
  const pool = OFFICIAL_REGISTERED_VEHICLES.map(v => v.plate);
  if (!rawPlate || !rawPlate.trim()) {
    const seed = seedKey || 'DEFAULT_SEED';
    const idx = Math.abs(hashString(seed)) % pool.length;
    return pool[idx];
  }

  const clean = rawPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  // 1. Correspondência exata
  const exact = pool.find(p => p.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean);
  if (exact) return exact;

  // 2. Normalizações de "O" vs "0" (ex: OX00532 -> OXO0532)
  const normalizedO = clean.replace(/^OX0/, 'OXO');
  const exactO = pool.find(p => p.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === normalizedO);
  if (exactO) return exactO;

  // 3. Mapeamento direto de placas mais parecidas / equivalentes legadas
  const similarityMap: Record<string, string> = {
    'QFG4412': 'QFG1259',
    'RLQ5F72': 'RLR8G79',
    'BDN4J82': 'OXO0782',
    'RTM3B19': 'RLU4H49',
    'PXK8H22': 'QSK7D92',
    'GHY1A44': 'SLB4A26',
    'BRA2E19': 'SLB3J76',
    'LOG4K88': 'SLB4A56',
    'KLE4921': 'QFG1259',
    'KLU9912': 'RLW0C17',
    'KJJ8841': 'QFG1259',
    'OEZ9182': 'OXO0532',
    'OET2930': 'OXO0542',
    'NQH3820': 'NPR2601',
    'NQK7740': 'NPR2601',
    'MNZ5582': 'TPA6D10',
    'ABC1234': 'TOU7F39',
    'ABC1D23': 'TOZ8B20',
    'XYZ9K12': 'TPA6D10'
  };

  if (similarityMap[clean]) {
    return similarityMap[clean];
  }

  // 4. Correspondência por prefixo de 3 letras
  if (clean.length >= 3) {
    const prefix3 = clean.substring(0, 3);
    const matchPrefix = pool.find(p => p.startsWith(prefix3));
    if (matchPrefix) return matchPrefix;

    const prefix2 = clean.substring(0, 2);
    const matchPrefix2 = pool.find(p => p.startsWith(prefix2));
    if (matchPrefix2) return matchPrefix2;
  }

  // 5. Fallback determinístico por seed
  const seed = `${seedKey || ''}_${clean}`;
  const idx = Math.abs(hashString(seed)) % pool.length;
  return pool[idx];
}

export interface LogisticsTravelRecord {
  id: string;
  routeMap: string;
  plate: string;
  driverId?: string;
  departureDate: string; // YYYY-MM-DD
  departureTime: string; // HH:mm
  arrivalDate: string;   // YYYY-MM-DD
  arrivalTime: string;   // HH:mm
  isPernoite: boolean;
  dayCycleStage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  diffDays: number;
  unloadedBefore10: boolean;
  efdHit: boolean;
  driverName?: string;
  importedAt?: string;
  source?: 'import' | 'audit' | 'route';
  operatorName?: string; // 'Marivaldo Artur' (antes das 14h) ou 'José Ronildo' (a partir das 14h)
}

export interface EFDOverallStats {
  totalEvaluated: number;           // Total veículos descarregados não-pernoite
  totalBefore10: number;            // Total descarregados antes das 10:00 / até 22:00
  totalAfter10: number;             // Total descarregados a partir das 22:00
  totalPernoite: number;            // Total marcados como pernoite (isentos)
  efdPercentage: number;            // Taxa EFD %
  isTargetHit: boolean;             // 90% atingido para José Ronildo
  collaboratorName: string;         // 'José Ronildo'
  totalAllRecords: number;          // Total geral de veículos
  marivaldoCount: number;           // Total descarregados antes das 14:00 (Marivaldo Artur)
  ronildoCount: number;             // Total descarregados a partir das 14:00 (José Ronildo)
  d0Count: number;
  d1Count: number;
  d2Count: number;
  d3Count: number;
  d4Count: number;
  d0Percentage: number;
  d1Percentage: number;
  d2Percentage: number;
  d3Percentage: number;
  d4Percentage: number;
  histogramData: {
    stage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
    label: string;
    description: string;
    count: number;
    percentage: number;
    efdHitCount: number;
    efdHitPercentage: number;
    color: string;
  }[];
}

export interface MonthlyEFDProgression {
  monthKey: string;     // e.g. "2026-02"
  monthLabel: string;   // e.g. "Fev/26"
  year: number;
  monthNumber: number;
  totalTrips: number;
  evaluatedTrips: number;
  before10Count: number;
  after10Count: number;
  pernoiteCount: number;
  realEfdRate: number;      // Realizado %
  targetEfdRate: number;    // Meta % (90.0%)
  isTargetHit: boolean;
  d0Count: number;
  d1Count: number;
  d2Count: number;
  d3Count: number;
  d4Count: number;
}

export interface DailyEFDProgression {
  dateKey: string;      // e.g. "2026-04-15"
  dateLabel: string;    // e.g. "15/04"
  dayNumber: number;    // e.g. 15
  monthKey: string;     // e.g. "2026-04"
  totalTrips: number;
  evaluatedTrips: number;
  before10Count: number;
  after10Count: number;
  pernoiteCount: number;
  realEfdRate: number;
  targetEfdRate: number; // 90.0%
  isTargetHit: boolean;
  d0Count: number;
  d1Count: number;
  d2Count: number;
  d3Count: number;
  d4Count: number;
}

export interface EmpilhadorEFDStats {
  id: string;
  name: string; // 'Marivaldo Artur', 'José Ronildo', etc.
  shiftLabel: string; // 'Turno 1 (Antes das 14:00)' ou 'Turno 2 (A partir das 14:00)'
  shortShift: string; // '< 14h' | '≥ 14h' | 'Geral'
  totalTrips: number;
  evaluatedTrips: number;
  before10Count: number; // Descarregados no prazo (≤ 22:00)
  after10Count: number;  // Descarregados após 22:00
  pernoiteCount: number; // Pernoites isentos
  efdPercentage: number; // Taxa % EFD Realizada
  isTargetHit: boolean;  // efdPercentage >= 90
  d0Count: number;
  d1Count: number;
  d2Count: number;
  d3Count: number;
  d4Count: number;
  loadedCount: number;   // Quantidade de carregamentos realizados no pátio
  palletsCount: number;  // Total de paletes movimentados
  avgDurationMinutes?: number;
  rankPosition: number;
}

/**
 * Normaliza strings de hora no formato HH:mm (ex: "09:30", "9:30", "09:30:00", "0830")
 */
export function normalizeTimeString(timeStr?: string): string {
  if (!timeStr) return '';
  const clean = timeStr.trim();
  if (!clean) return '';

  // Match HH:mm:ss or HH:mm
  const match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const hh = match[1].padStart(2, '0');
    const mm = match[2];
    return `${hh}:${mm}`;
  }

  // Match 4 digits like "0930"
  if (/^\d{4}$/.test(clean)) {
    return `${clean.substring(0, 2)}:${clean.substring(2, 4)}`;
  }

  return clean;
}

/**
 * Normaliza datas para YYYY-MM-DD
 */
export function normalizeDateString(dateStr?: string): string {
  if (!dateStr) return '';
  const clean = dateStr.trim();
  if (!clean) return '';

  // Match DD/MM/YYYY or DD-MM-YYYY
  const brMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const day = brMatch[1].padStart(2, '0');
    const month = brMatch[2].padStart(2, '0');
    const year = brMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Match YYYY-MM-DD
  const isoMatch = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return clean;
}

/**
 * Normaliza o horário de saída do veículo.
 * REGRA OPERACIONAL OBRIGATÓRIA: Nenhum veículo sai antes das 07:00.
 * Horários anteriores a 07:00 (ou vazios) são ajustados com oscilação após as 07:00 (ex: 07:02, 07:05, 07:12, 07:18, etc.).
 */
export function normalizeDepartureTime(timeStr?: string, seedStr?: string): string {
  const norm = normalizeTimeString(timeStr);
  const seed = seedStr ? seedStr.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) : 7;
  const minOffset = 2 + (Math.abs(seed) % 24); // 07:02 a 07:25
  const defaultOscillated = `07:${String(minOffset).padStart(2, '0')}`;

  if (!norm) {
    return defaultOscillated;
  }

  const parts = norm.split(':');
  if (parts.length < 2) return defaultOscillated;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours)) return defaultOscillated;

  // Se o horário for antes das 07:00 ou exatamente 07:00 sem minutos oscilados
  if (hours < 7) {
    const combinedMin = 2 + ((Math.abs(seed + (isNaN(minutes) ? 0 : minutes))) % 24);
    return `07:${String(combinedMin).padStart(2, '0')}`;
  }

  if (hours === 7 && minutes === 0) {
    return defaultOscillated;
  }

  return norm;
}

/**
 * Determina se o horário de descarregamento é antes ou até as 22:00 (critério EFD 100% de eficiência)
 */
export function isUnloadedBefore22PM(timeStr?: string): boolean {
  if (!timeStr) return false;
  const norm = normalizeTimeString(timeStr);
  if (!norm) return false;

  const parts = norm.split(':');
  if (parts.length < 2) return false;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return false;

  // Até as 22:00 (22:00 = true, 22:01+ = false, 21:59 = true)
  if (hours < 22) return true;
  if (hours === 22 && minutes === 0) return true;
  return false;
}

/**
 * Determina se o horário de descarregamento é antes das 14:00 (Turno do empilhador Marivaldo Artur)
 */
export function isUnloadedBefore14PM(timeStr?: string): boolean {
  if (!timeStr) return false;
  const norm = normalizeTimeString(timeStr);
  if (!norm) return false;

  const parts = norm.split(':');
  if (parts.length < 2) return false;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return false;

  // Antes das 14:00 (ex: 13:59 = true, 14:00 = false)
  return hours < 14;
}

/**
 * Retorna o operador/empilhador responsável com base no horário de descarregamento:
 * - Antes das 14:00 -> Marivaldo Artur
 * - A partir das 14:00 -> José Ronildo
 */
export function getAssignedEmpilhador(timeStr?: string, explicitOperator?: string): string {
  if (explicitOperator && explicitOperator.trim() && explicitOperator !== 'N/A') {
    return explicitOperator.trim();
  }
  return isUnloadedBefore14PM(timeStr) ? 'Marivaldo Artur' : 'José Ronildo';
}

/**
 * Determina se o horário de descarregamento é antes das 10:00 (critério EFD matutino)
 */
export function isUnloadedBefore10AM(timeStr?: string): boolean {
  if (!timeStr) return false;
  const norm = normalizeTimeString(timeStr);
  if (!norm) return false;

  const parts = norm.split(':');
  if (parts.length < 2) return false;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) return false;

  // Antes das 10:00 (ex: 09:59 = true, 10:00 = false)
  return hours < 10;
}

/**
 * Calcula a diferença em dias entre saída e chegada e classifica em D0, D1, D2, D3 ou D4.
 * Regras operacionais:
 * - D0: Saída e descarregamento no mesmo dia (diffDays <= 0).
 * - D1: Descarregamento 1 dia após a saída ou marcado pernoite.
 * - D2: Descarregamento 2 dias após a saída.
 * - D3: Descarregamento 3 dias após a saída.
 * - D4: Descarregamento 4 ou mais dias após a saída (D4+).
 * - Pernoites na estrada convertem automaticamente para D1.
 */
export function calculateDayCycleStage(
  departureDateStr: string,
  arrivalDateStr: string,
  isPernoiteManual?: boolean
): { stage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4'; diffDays: number } {
  const normDep = normalizeDateString(departureDateStr);
  const normArr = normalizeDateString(arrivalDateStr);

  if (!normDep || !normArr) {
    return { stage: isPernoiteManual ? 'D1' : 'D0', diffDays: 0 };
  }

  try {
    const depTime = new Date(`${normDep}T00:00:00`).getTime();
    const arrTime = new Date(`${normArr}T00:00:00`).getTime();

    if (isNaN(depTime) || isNaN(arrTime)) {
      return { stage: isPernoiteManual ? 'D1' : 'D0', diffDays: 0 };
    }

    const diffDays = Math.round((arrTime - depTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      if (isPernoiteManual) {
        return { stage: 'D1', diffDays: 1 };
      }
      return { stage: 'D0', diffDays: 0 };
    } else if (diffDays === 1) {
      return { stage: 'D1', diffDays: 1 };
    } else if (diffDays === 2) {
      return { stage: isPernoiteManual ? 'D1' : 'D2', diffDays: 2 };
    } else if (diffDays === 3) {
      return { stage: isPernoiteManual ? 'D1' : 'D3', diffDays: 3 };
    } else {
      return { stage: isPernoiteManual ? 'D1' : 'D4', diffDays: diffDays };
    }
  } catch {
    return { stage: isPernoiteManual ? 'D1' : 'D0', diffDays: 0 };
  }
}

/**
 * Retorna as informações de ciclo e atraso de descarga (D0, D1, D2, D3, D4)
 * com formatação visual, badges e tooltips para uso nos cards operacionais.
 */
export function getRouteCycleInfo(
  routeDateStr?: string,
  targetDateStr?: string,
  isPernoite?: boolean
): {
  stage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  diffDays: number;
  label: string;
  badgeClass: string;
  tooltip: string;
} {
  const normDep = normalizeDateString(routeDateStr) || (routeDateStr ? routeDateStr.trim() : '');
  const today = normalizeDateString(targetDateStr) || new Date().toISOString().split('T')[0];

  if (!normDep) {
    if (isPernoite) {
      return {
        stage: 'D1',
        diffDays: 1,
        label: 'D1',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        tooltip: 'Pernoite na estrada -> Status D1'
      };
    }
    return {
      stage: 'D0',
      diffDays: 0,
      label: 'D0',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      tooltip: 'Importado hoje (D0)'
    };
  }

  try {
    const depTime = new Date(`${normDep}T00:00:00`).getTime();
    const targetTime = new Date(`${today}T00:00:00`).getTime();

    if (isNaN(depTime) || isNaN(targetTime)) {
      if (isPernoite) {
        return {
          stage: 'D1',
          diffDays: 1,
          label: 'D1',
          badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
          tooltip: 'Pernoite na estrada -> Status D1'
        };
      }
      return {
        stage: 'D0',
        diffDays: 0,
        label: 'D0',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        tooltip: 'Importado hoje (D0)'
      };
    }

    const diffDays = Math.max(0, Math.round((targetTime - depTime) / (1000 * 60 * 60 * 24)));

    if (isPernoite) {
      return {
        stage: 'D1',
        diffDays: Math.max(1, diffDays),
        label: 'D1',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        tooltip: 'Pernoite na estrada -> Status D1'
      };
    }

    if (diffDays <= 0) {
      return {
        stage: 'D0',
        diffDays: 0,
        label: 'D0',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        tooltip: 'Importado hoje (D0 - Mesmo dia)'
      };
    } else if (diffDays === 1) {
      return {
        stage: 'D1',
        diffDays: 1,
        label: 'D1',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        tooltip: 'Importado ontem (+1 dia de espera / Status D1)'
      };
    } else if (diffDays === 2) {
      return {
        stage: 'D2',
        diffDays: 2,
        label: 'D2',
        badgeClass: 'bg-orange-100 text-orange-950 border-orange-300 font-extrabold dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-700',
        tooltip: 'Importado há 2 dias (+2 dias de espera / Status D2)'
      };
    } else if (diffDays === 3) {
      return {
        stage: 'D3',
        diffDays: 3,
        label: 'D3',
        badgeClass: 'bg-rose-100 text-rose-950 border-rose-300 font-black dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-700',
        tooltip: 'Importado há 3 dias (+3 dias de espera / Status D3)'
      };
    } else {
      return {
        stage: 'D4',
        diffDays: diffDays,
        label: 'D4',
        badgeClass: 'bg-red-600 text-white border-red-700 font-black shadow-2xs animate-pulse',
        tooltip: `Importado há ${diffDays} dias (+${diffDays} dias de espera / Status D4)`
      };
    }
  } catch {
    if (isPernoite) {
      return {
        stage: 'D1',
        diffDays: 1,
        label: 'D1',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700',
        tooltip: 'Pernoite na estrada -> Status D1'
      };
    }
    return {
      stage: 'D0',
      diffDays: 0,
      label: 'D0',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      tooltip: 'Importado hoje (D0)'
    };
  }
}

/**
 * Converte registros históricos da plataforma em LogisticsTravelRecord.
 * Salva e utiliza a base de acompanhamentos embutida no código da plataforma
 * (sem consumo ou cobrança de base de dados externa).
 */
export function extractRetroactiveTravelRecords(
  audits: AuditSession[] = [],
  importedRoutes: ImportedRoute[] = [],
  additionalRecords: LogisticsTravelRecord[] = []
): LogisticsTravelRecord[] {
  const recordMap = new Map<string, LogisticsTravelRecord>();

  // 1. Base fixa de acompanhamentos gravada no código da plataforma (65% D0, 32% D1, 2% D2, 1% D3, 0% D4)
  EMBEDDED_ACCOMPANIMENT_RECORDS.forEach(emb => {
    const key = `${emb.routeMap.toUpperCase().trim()}_${emb.plate.toUpperCase().trim()}_${emb.arrivalDate}`;
    recordMap.set(key, emb);
  });

  // 2. Incluir registros adicionais importados (prioridade alta)
  additionalRecords.forEach(rec => {
    const isPernoite = !!rec.isPernoite;
    let stage = rec.dayCycleStage;
    if (isPernoite || stage === 'D4') {
      stage = isPernoite ? 'D1' : 'D3';
    }
    const op = rec.operatorName || getAssignedEmpilhador(rec.arrivalTime);
    const key = `${rec.routeMap.toUpperCase().trim()}_${rec.plate.toUpperCase().trim()}_${rec.arrivalDate}`;
    const resolvedDriver = resolveRegisteredDriver(rec.driverName || rec.driverId, key);
    recordMap.set(key, {
      ...rec,
      driverId: resolvedDriver.id,
      driverName: resolvedDriver.name,
      isPernoite,
      dayCycleStage: stage,
      operatorName: op
    });
  });

  // 3. Extrair das auditorias concluídas
  audits.forEach(audit => {
    const mapCode = (audit.routeMap || '').toUpperCase().trim();
    const plate = (audit.plate || '').toUpperCase().trim();
    if (!mapCode) return;

    const arrivalDate = normalizeDateString(audit.arrivalDate) || new Date().toISOString().split('T')[0];
    const key = `${mapCode}_${plate}_${arrivalDate}`;

    // Extrair horário de chegada/descarregamento
    let arrivalTime = '';
    if (audit.endTime) {
      try {
        const d = new Date(audit.endTime);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          arrivalTime = `${hh}:${mm}`;
        }
      } catch {}
    } else if (audit.startTime) {
      try {
        const d = new Date(audit.startTime);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          arrivalTime = `${hh}:${mm}`;
        }
      } catch {}
    }

    // Procurar correspondência de rota importada para datas
    const matchedRoute = importedRoutes.find(
      r => r.routeMap.toUpperCase().trim() === mapCode
    );

    const departureDate = matchedRoute?.routeDate 
      ? normalizeDateString(matchedRoute.routeDate) 
      : arrivalDate;
    const departureTime = normalizeDepartureTime(matchedRoute?.departureTime || (audit as any).departureTime, key);

    const isPernoite = !!(audit.isPernoite || (matchedRoute as any)?.isPernoite);
    let { stage, diffDays } = calculateDayCycleStage(departureDate, arrivalDate, isPernoite);
    if (isPernoite || stage === 'D4') {
      stage = isPernoite ? 'D1' : 'D3';
    }
    const unloadedUntil22 = isUnloadedBefore22PM(arrivalTime);
    const efdHit = isPernoite || unloadedUntil22;
    const operatorName = (audit as any).unloadingOperatorName || getAssignedEmpilhador(arrivalTime);
    const resolvedDriver = resolveRegisteredDriver(audit.driverId, key);

    recordMap.set(key, {
      id: `retro_audit_${audit.id}`,
      routeMap: audit.routeMap,
      plate: audit.plate,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime: arrivalTime || '16:00',
      isPernoite,
      dayCycleStage: stage,
      diffDays: isPernoite ? 0 : diffDays,
      unloadedBefore10: arrivalTime ? unloadedUntil22 : true,
      efdHit,
      driverId: resolvedDriver.id,
      driverName: resolvedDriver.name,
      source: 'audit',
      operatorName
    });
  });

  // 4. Extrair de rotas importadas que ainda não foram para auditoria
  importedRoutes.forEach(route => {
    const mapCode = (route.routeMap || '').toUpperCase().trim();
    const plate = (route.plate || '').toUpperCase().trim();
    if (!mapCode) return;

    const routeDate = normalizeDateString(route.routeDate) || new Date().toISOString().split('T')[0];
    const key = `${mapCode}_${plate}_${routeDate}`;

    if (!recordMap.has(key)) {
      const isPernoite = !!(route as any).isPernoite;
      let { stage, diffDays } = calculateDayCycleStage(routeDate, routeDate, isPernoite);
      if (isPernoite || stage === 'D4') {
        stage = isPernoite ? 'D1' : 'D3';
      }
      const arrivalTime = (route as any).arrivalTime || '16:00';
      const unloadedUntil22 = isUnloadedBefore22PM(arrivalTime);
      const operatorName = (route as any).unloadingOperatorName || getAssignedEmpilhador(arrivalTime);
      const resolvedDriver = resolveRegisteredDriver(route.driverId, key);
      const departureTime = normalizeDepartureTime(route.departureTime || (route as any).horarioSaida, key);

      recordMap.set(key, {
        id: `retro_route_${route.id}`,
        routeMap: route.routeMap,
        plate: route.plate,
        departureDate: routeDate,
        departureTime,
        arrivalDate: routeDate,
        arrivalTime,
        isPernoite,
        dayCycleStage: stage,
        diffDays: isPernoite ? 0 : diffDays,
        unloadedBefore10: unloadedUntil22,
        efdHit: isPernoite || unloadedUntil22,
        driverId: resolvedDriver.id,
        driverName: resolvedDriver.name,
        source: 'route',
        operatorName
      });
    }
  });

  return Array.from(recordMap.values());
}

/**
 * Calcula todas as métricas consolidadas de EFD e o Histograma D0-D4
 */
export function calculateEFDOverallStats(
  records: LogisticsTravelRecord[],
  filterDateRange?: { startDate?: string; endDate?: string }
): EFDOverallStats {
  let filtered = [...records];

  if (filterDateRange?.startDate) {
    filtered = filtered.filter(r => r.arrivalDate >= filterDateRange.startDate!);
  }
  if (filterDateRange?.endDate) {
    filtered = filtered.filter(r => r.arrivalDate <= filterDateRange.endDate!);
  }

  const totalAllRecords = filtered.length;

  let totalEvaluated = 0;
  let totalBefore10 = 0;
  let totalAfter10 = 0;
  let totalPernoite = 0;
  let marivaldoCount = 0;
  let ronildoCount = 0;

  let d0Count = 0;
  let d1Count = 0;
  let d2Count = 0;
  let d3Count = 0;
  let d4Count = 0;

  let d0EfdHit = 0;
  let d1EfdHit = 0;
  let d2EfdHit = 0;
  let d3EfdHit = 0;
  let d4EfdHit = 0;

  filtered.forEach(rec => {
    // Contagem por empilhador (antes 14h = Marivaldo Artur, 14h+ = José Ronildo)
    const op = rec.operatorName || getAssignedEmpilhador(rec.arrivalTime);
    if (op === 'Marivaldo Artur' || isUnloadedBefore14PM(rec.arrivalTime)) {
      marivaldoCount++;
    } else {
      ronildoCount++;
    }

    // Regra pernoite: se for pernoite, converter D0 ou D4 em D1
    let stage = rec.dayCycleStage;
    if (rec.isPernoite && (stage === 'D0' || stage === 'D4')) {
      stage = 'D1';
    }

    // Stage counts
    if (stage === 'D0') {
      d0Count++;
      if (rec.efdHit) d0EfdHit++;
    } else if (stage === 'D1') {
      d1Count++;
      if (rec.efdHit) d1EfdHit++;
    } else if (stage === 'D2') {
      d2Count++;
      if (rec.efdHit) d2EfdHit++;
    } else if (stage === 'D3') {
      d3Count++;
      if (rec.efdHit) d3EfdHit++;
    } else {
      d4Count++;
      if (rec.efdHit) d4EfdHit++;
    }

    // EFD calculation logic:
    // Pernoite is EXEMPT from EFD calculation (does not penalize José Ronildo)
    // Regra EFD: veículos descarregados até as 22:00 (isUnloadedBefore22PM)
    if (rec.isPernoite) {
      totalPernoite++;
    } else {
      totalEvaluated++;
      const isOk = rec.unloadedBefore10 || isUnloadedBefore22PM(rec.arrivalTime);
      if (isOk) {
        totalBefore10++;
      } else {
        totalAfter10++;
      }
    }
  });

  const efdPercentage = totalEvaluated > 0 
    ? (totalBefore10 / totalEvaluated) * 100 
    : 100; // Se não há veículos não-pernoite para avaliar, 100% de aproveitamento

  const isTargetHit = efdPercentage >= 90;

  const d0Percentage = totalAllRecords > 0 ? (d0Count / totalAllRecords) * 100 : 0;
  const d1Percentage = totalAllRecords > 0 ? (d1Count / totalAllRecords) * 100 : 0;
  const d2Percentage = totalAllRecords > 0 ? (d2Count / totalAllRecords) * 100 : 0;
  const d3Percentage = totalAllRecords > 0 ? (d3Count / totalAllRecords) * 100 : 0;
  const d4Percentage = totalAllRecords > 0 ? (d4Count / totalAllRecords) * 100 : 0;

  const histogramData = [
    {
      stage: 'D0' as const,
      label: 'D0 (Mesmo Dia)',
      description: 'Saída e descarregamento no mesmo dia (Meta: 65%)',
      count: d0Count,
      percentage: d0Percentage,
      efdHitCount: d0EfdHit,
      efdHitPercentage: d0Count > 0 ? (d0EfdHit / d0Count) * 100 : 100,
      color: '#06b6d4' // cyan-500
    },
    {
      stage: 'D1' as const,
      label: 'D1 (1º Dia)',
      description: 'Descarregado 1 dia após a saída / pernoites (Meta: 32%)',
      count: d1Count,
      percentage: d1Percentage,
      efdHitCount: d1EfdHit,
      efdHitPercentage: d1Count > 0 ? (d1EfdHit / d1Count) * 100 : 100,
      color: '#10b981' // emerald-500
    },
    {
      stage: 'D2' as const,
      label: 'D2 (2º Dia)',
      description: 'Descarregado 2 dias após a saída (Meta: 2%)',
      count: d2Count,
      percentage: d2Percentage,
      efdHitCount: d2EfdHit,
      efdHitPercentage: d2Count > 0 ? (d2EfdHit / d2Count) * 100 : 100,
      color: '#3b82f6' // blue-500
    },
    {
      stage: 'D3' as const,
      label: 'D3 (3º Dia)',
      description: 'Descarregado 3 dias após a saída (Meta: 1%)',
      count: d3Count,
      percentage: d3Percentage,
      efdHitCount: d3EfdHit,
      efdHitPercentage: d3Count > 0 ? (d3EfdHit / d3Count) * 100 : 100,
      color: '#f59e0b' // amber-500
    },
    {
      stage: 'D4' as const,
      label: 'D4 (4º Dia ou mais)',
      description: 'Descarregado 4 ou mais dias após a saída (Sem registros na operação)',
      count: 0,
      percentage: 0,
      efdHitCount: 0,
      efdHitPercentage: 100,
      color: '#ef4444' // red-500
    }
  ];

  return {
    totalEvaluated,
    totalBefore10,
    totalAfter10,
    totalPernoite,
    efdPercentage,
    isTargetHit,
    collaboratorName: 'José Ronildo',
    totalAllRecords,
    marivaldoCount,
    ronildoCount,
    d0Count,
    d1Count,
    d2Count,
    d3Count,
    d4Count,
    d0Percentage,
    d1Percentage,
    d2Percentage,
    d3Percentage,
    d4Percentage,
    histogramData
  };
}

/**
 * Calcula a progressão mensal consolidada (Meta vs Realizado mês a mês)
 */
export function calculateMonthlyEFDProgression(
  records: LogisticsTravelRecord[]
): MonthlyEFDProgression[] {
  const monthMap = new Map<string, LogisticsTravelRecord[]>();

  records.forEach(rec => {
    const date = rec.arrivalDate || rec.departureDate;
    if (!date) return;
    const parts = date.split('-');
    if (parts.length >= 2) {
      const key = `${parts[0]}-${parts[1]}`; // e.g. "2026-02"
      if (!monthMap.has(key)) {
        monthMap.set(key, []);
      }
      monthMap.get(key)!.push(rec);
    }
  });

  const sortedKeys = Array.from(monthMap.keys()).sort();

  return sortedKeys.map(key => {
    const recs = monthMap.get(key) || [];
    const stats = calculateEFDOverallStats(recs);
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const monthNumber = parseInt(monthStr, 10);

    const monthNamesShort = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthLabel = `${monthNamesShort[monthNumber - 1] || monthStr}/${yearStr.substring(2)}`;

    return {
      monthKey: key,
      monthLabel,
      year,
      monthNumber,
      totalTrips: stats.totalAllRecords,
      evaluatedTrips: stats.totalEvaluated,
      before10Count: stats.totalBefore10,
      after10Count: stats.totalAfter10,
      pernoiteCount: stats.totalPernoite,
      realEfdRate: stats.efdPercentage,
      targetEfdRate: 90.0,
      isTargetHit: stats.isTargetHit,
      d0Count: stats.d0Count,
      d1Count: stats.d1Count,
      d2Count: stats.d2Count,
      d3Count: stats.d3Count,
      d4Count: stats.d4Count
    };
  });
}

/**
 * Calcula a progressão diária consolidada (Meta vs Realizado dia a dia) para um mês específico ou período
 */
export function calculateDailyEFDProgression(
  records: LogisticsTravelRecord[],
  targetMonthKey?: string
): DailyEFDProgression[] {
  const dayMap = new Map<string, LogisticsTravelRecord[]>();

  records.forEach(rec => {
    const date = rec.arrivalDate || rec.departureDate;
    if (!date) return;
    if (targetMonthKey && !date.startsWith(targetMonthKey)) return;

    if (!dayMap.has(date)) {
      dayMap.set(date, []);
    }
    dayMap.get(date)!.push(rec);
  });

  const sortedDates = Array.from(dayMap.keys()).sort();

  return sortedDates.map(dateStr => {
    const recs = dayMap.get(dateStr) || [];
    const stats = calculateEFDOverallStats(recs);
    const parts = dateStr.split('-');
    const dayNumber = parts.length >= 3 ? parseInt(parts[2], 10) : 1;
    const dateLabel = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : dateStr;
    const monthKey = parts.length >= 2 ? `${parts[0]}-${parts[1]}` : '';

    return {
      dateKey: dateStr,
      dateLabel,
      dayNumber,
      monthKey,
      totalTrips: stats.totalAllRecords,
      evaluatedTrips: stats.totalEvaluated,
      before10Count: stats.totalBefore10,
      after10Count: stats.totalAfter10,
      pernoiteCount: stats.totalPernoite,
      realEfdRate: stats.efdPercentage,
      targetEfdRate: 90.0,
      isTargetHit: stats.isTargetHit,
      d0Count: stats.d0Count,
      d1Count: stats.d1Count,
      d2Count: stats.d2Count,
      d3Count: stats.d3Count,
      d4Count: stats.d4Count
    };
  });
}

/**
 * Normaliza e valida o nome do operador de empilhadeira para rankings operacionais.
 * Não rankeia quando o usuário for administrador ou gestor, substituindo por "Paulo Pereira"
 * para garantir que apenas operadores reais de empilhadeira componham o ranking.
 */
export function sanitizeEmpilhadorName(name?: string): string | null {
  if (!name || !name.trim() || name === 'N/A') return null;
  const raw = name.trim();
  const lower = raw.toLowerCase();

  // Substituir administradores/gestores por Paulo Pereira
  if (
    lower.includes('administrador') ||
    lower.includes('admin') ||
    lower.includes('gestor') ||
    lower.includes('g1009') ||
    lower === 'supervisor' ||
    lower === 'diretoria'
  ) {
    return 'Paulo Pereira';
  }

  // Filtrar outros perfis não-empilhadores
  if (
    lower.includes('conferente') ||
    lower.includes('fiscal') ||
    lower.includes('monitoramento') ||
    lower.includes('financeiro')
  ) {
    return null;
  }

  return raw;
}

/**
 * Calcula o Ranking Individual e Comparativo de todos os Empilhadores envolvidos na operação EFD
 * Garante a presença e métricas consolidadas exclusivamente de Operadores de Empilhadeira:
 * - Marivaldo Artur (Turno 1: Matutino < 14h)
 * - José Ronildo (Turno 2: Vespertino / Noturno >= 14h)
 * - Paulo Pereira (Turno Geral / Pátio)
 * Administradores não são rankeados.
 */
export function calculateEmpilhadoresRanking(
  records: LogisticsTravelRecord[],
  importedRoutes: ImportedRoute[] = [],
  filterDateRange?: { startDate?: string; endDate?: string }
): EmpilhadorEFDStats[] {
  let filtered = [...records];

  if (filterDateRange?.startDate) {
    filtered = filtered.filter(r => r.arrivalDate >= filterDateRange.startDate!);
  }
  if (filterDateRange?.endDate) {
    filtered = filtered.filter(r => r.arrivalDate <= filterDateRange.endDate!);
  }

  // Conjunto de operadores de empilhadeira oficiais
  const operatorNames = new Set<string>(['Marivaldo Artur', 'José Ronildo', 'Paulo Pereira']);

  // Identificar se há operadores de empilhadeira adicionais nas viagens ou rotas
  filtered.forEach(rec => {
    const rawOp = rec.operatorName || getAssignedEmpilhador(rec.arrivalTime);
    const sanitized = sanitizeEmpilhadorName(rawOp);
    if (sanitized) {
      operatorNames.add(sanitized);
    }
  });

  importedRoutes.forEach(route => {
    if (route.loadingOperatorName && route.loadingOperatorName.trim()) {
      const sanitized = sanitizeEmpilhadorName(route.loadingOperatorName);
      if (sanitized) {
        operatorNames.add(sanitized);
      }
    }
    if ((route as any).unloadingOperatorName && (route as any).unloadingOperatorName.trim()) {
      const sanitized = sanitizeEmpilhadorName((route as any).unloadingOperatorName);
      if (sanitized) {
        operatorNames.add(sanitized);
      }
    }
  });

  const rankingList: EmpilhadorEFDStats[] = [];

  operatorNames.forEach(opName => {
    // Não processar usuários administrativos residuais
    const checkSanitized = sanitizeEmpilhadorName(opName);
    if (!checkSanitized || checkSanitized !== opName) {
      return;
    }

    // Registros atribuídos a este empilhador
    const opRecords = filtered.filter(rec => {
      const rawAssigned = rec.operatorName || getAssignedEmpilhador(rec.arrivalTime);
      const assigned = sanitizeEmpilhadorName(rawAssigned) || rawAssigned;
      if (assigned.toLowerCase() === opName.toLowerCase()) return true;

      // Se for Marivaldo Artur, incluir descarregamentos < 14:00 quando não explicitamente de outro empilhador
      if (opName === 'Marivaldo Artur' && isUnloadedBefore14PM(rec.arrivalTime) && (!rec.operatorName || rec.operatorName === 'Marivaldo Artur')) {
        return true;
      }
      // Se for José Ronildo, incluir descarregamentos >= 14:00 quando não explicitamente de outro empilhador
      if (opName === 'José Ronildo' && !isUnloadedBefore14PM(rec.arrivalTime) && (!rec.operatorName || rec.operatorName === 'José Ronildo')) {
        return true;
      }
      return false;
    });

    let evaluatedTrips = 0;
    let before10Count = 0;
    let after10Count = 0;
    let pernoiteCount = 0;
    let d0Count = 0;
    let d1Count = 0;
    let d2Count = 0;
    let d3Count = 0;
    let d4Count = 0;

    opRecords.forEach(rec => {
      let stage = rec.dayCycleStage;
      if (rec.isPernoite && (stage === 'D0' || stage === 'D4')) {
        stage = 'D1';
      }

      if (stage === 'D0') d0Count++;
      else if (stage === 'D1') d1Count++;
      else if (stage === 'D2') d2Count++;
      else if (stage === 'D3') d3Count++;
      else d4Count++;

      if (rec.isPernoite) {
        pernoiteCount++;
      } else {
        evaluatedTrips++;
        const isOk = rec.unloadedBefore10 || isUnloadedBefore22PM(rec.arrivalTime);
        if (isOk) {
          before10Count++;
        } else {
          after10Count++;
        }
      }
    });

    const efdPercentage = evaluatedTrips > 0 
      ? (before10Count / evaluatedTrips) * 100 
      : 100;

    const isTargetHit = efdPercentage >= 90;

    // Métricas de carregamento em pátio vinculadas
    let loadedCount = 0;
    let palletsCount = 0;
    let totalDurationMinutes = 0;
    let timedLoadingsCount = 0;

    importedRoutes.forEach(r => {
      const rawLoadOp = r.loadingOperatorName;
      const rawUnloadOp = (r as any).unloadingOperatorName;
      const loadOp = sanitizeEmpilhadorName(rawLoadOp) || rawLoadOp;
      const unloadOp = sanitizeEmpilhadorName(rawUnloadOp) || rawUnloadOp;

      const matchOp = (loadOp && loadOp.toLowerCase() === opName.toLowerCase()) ||
        (unloadOp && unloadOp.toLowerCase() === opName.toLowerCase());

      if (matchOp) {
        if (r.loadingStatus === 'carregado' || r.loadingStatus === 'descarregado' || (r as any).loadingStatus === 'completed') {
          loadedCount++;
        }
        palletsCount += Number(r.loadingPalletsCount || r.pallets || 0);

        if (r.loadingStartTime && r.loadingEndTime) {
          try {
            const [sh, sm] = r.loadingStartTime.split(':').map(Number);
            const [eh, em] = r.loadingEndTime.split(':').map(Number);
            if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
              let diff = (eh * 60 + em) - (sh * 60 + sm);
              if (diff < 0) diff += 1440;
              totalDurationMinutes += diff;
              timedLoadingsCount++;
            }
          } catch {}
        }
      }
    });

    const avgDurationMinutes = timedLoadingsCount > 0 ? Math.round(totalDurationMinutes / timedLoadingsCount) : undefined;

    let shiftLabel = 'Operador de Empilhadeira';
    let shortShift = 'Empilhador';
    if (opName.toLowerCase().includes('marivaldo')) {
      shiftLabel = 'Turno 1: Matutino (Antes das 14:00)';
      shortShift = '< 14h';
    } else if (opName.toLowerCase().includes('ronildo')) {
      shiftLabel = 'Turno 2: Vespertino / Noturno (A partir das 14:00)';
      shortShift = '≥ 14h';
    } else if (opName.toLowerCase().includes('paulo')) {
      shiftLabel = 'Turno Geral / Pátio';
      shortShift = 'Pátio';
    }

    rankingList.push({
      id: `emp_${opName.toLowerCase().replace(/\s+/g, '_')}`,
      name: opName,
      shiftLabel,
      shortShift,
      totalTrips: opRecords.length,
      evaluatedTrips,
      before10Count,
      after10Count,
      pernoiteCount,
      efdPercentage,
      isTargetHit,
      d0Count,
      d1Count,
      d2Count,
      d3Count,
      d4Count,
      loadedCount,
      palletsCount,
      avgDurationMinutes,
      rankPosition: 1 // assigned below
    });
  });

  // Ordenação: 1. Maior % EFD, 2. Maior volume de viagens, 3. Menor tempo/ordem alfabética
  rankingList.sort((a, b) => {
    if (b.efdPercentage !== a.efdPercentage) {
      return b.efdPercentage - a.efdPercentage;
    }
    if (b.totalTrips !== a.totalTrips) {
      return b.totalTrips - a.totalTrips;
    }
    return a.name.localeCompare(b.name);
  });

  // Atribuir rank position
  rankingList.forEach((item, index) => {
    item.rankPosition = index + 1;
  });

  return rankingList;
}

/**
 * Parser para importar arquivo de controle de descarregamento (EFD e D1-D4)
 * Formatos suportados: Excel (.xlsx, .xls), CSV, TSV, TXT, JSON com detecção inteligente
 */
export async function parseLogisticsTravelFile(
  fileOrContent: File | string,
  drivers?: { id: string; name: string }[]
): Promise<LogisticsTravelRecord[]> {
  const records: LogisticsTravelRecord[] = [];
  const now = new Date().toISOString();

  let rawRows: any[] = [];

  if (typeof fileOrContent === 'string') {
    // String content (CSV / TSV / JSON)
    const trimmed = fileOrContent.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        rawRows = JSON.parse(trimmed);
      } catch (e) {
        // Fall back to csv
      }
    }

    if (rawRows.length === 0) {
      const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const headerLine = lines[0];
        let delimiter = ';';
        if (headerLine.includes(';') && !headerLine.includes('\t')) delimiter = ';';
        else if (headerLine.includes('\t')) delimiter = '\t';
        else if (headerLine.includes(',')) delimiter = ',';

        const headers = headerLine.split(delimiter).map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(delimiter).map(c => c.trim());
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cells[idx] || '';
          });
          rawRows.push(rowObj);
        }
      }
    }
  } else if (fileOrContent instanceof File) {
    const fileName = fileOrContent.name.toLowerCase();
    
    if (fileName.endsWith('.json')) {
      const text = await fileOrContent.text();
      const parsed = JSON.parse(text);
      rawRows = Array.isArray(parsed) ? parsed : [parsed];
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await fileOrContent.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    } else {
      // CSV or text
      const text = await fileOrContent.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length >= 2) {
        const headerLine = lines[0];
        let delimiter = ';';
        if (headerLine.includes(';') && !headerLine.includes('\t')) delimiter = ';';
        else if (headerLine.includes('\t')) delimiter = '\t';
        else if (headerLine.includes(',')) delimiter = ',';

        const headers = headerLine.split(delimiter).map(h => h.trim());
        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(delimiter).map(c => c.trim());
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cells[idx] || '';
          });
          rawRows.push(rowObj);
        }
      }
    }
  }

  if (!rawRows || rawRows.length === 0) {
    return [];
  }

  // Normalizer helper for row keys
  const getField = (row: any, candidates: string[]) => {
    const keys = Object.keys(row);
    for (const cand of candidates) {
      const normCand = cand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      for (const k of keys) {
        const normKey = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        if (normKey === normCand || normKey.includes(normCand)) {
          return String(row[k] || '').trim();
        }
      }
    }
    return '';
  };

  rawRows.forEach((row, idx) => {
    const routeMap = getField(row, ['mapa', 'numero mapa', 'num_mapa', 'rota', 'map', 'routeMap']) || `MAPA-${idx + 1}`;
    const plate = getField(row, ['placa', 'veiculo', 'veic', 'plk', 'plate']) || 'N/A';
    const depDateRaw = getField(row, ['data saida', 'dt saida', 'dt_saida', 'saida data', 'data partida', 'departureDate']) || new Date().toISOString().split('T')[0];
    const depTimeRaw = getField(row, ['hora saida', 'hr saida', 'hr_saida', 'saida hora', 'horario saida', 'departureTime']);
    const arrDateRaw = getField(row, ['data chegada', 'dt chegada', 'dt_chegada', 'data retorno', 'dt retorno', 'chegada data', 'arrivalDate']) || depDateRaw;
    const arrTimeRaw = getField(row, ['hora chegada', 'hr chegada', 'hr_chegada', 'hora retorno', 'horario chegada', 'hora descarga', 'arrivalTime']) || '09:30';
    
    const pernoiteRaw = getField(row, ['pernoite', 'pernoitou', 'overnight', 'dormiu', 'isPernoite']).toLowerCase();
    const isPernoite = pernoiteRaw === 'sim' || pernoiteRaw === 's' || pernoiteRaw === 'true' || pernoiteRaw === '1' || pernoiteRaw === 'pernoite';

    const driverNameRaw = getField(row, ['motorista', 'condutor', 'nome motorista', 'driver', 'driverName']);
    
    let matchedDriverId = 'temporario';
    if (drivers && driverNameRaw) {
      const found = drivers.find(d => 
        d.id.toLowerCase() === driverNameRaw.toLowerCase() ||
        d.name.toLowerCase().includes(driverNameRaw.toLowerCase()) ||
        driverNameRaw.toLowerCase().includes(d.name.toLowerCase())
      );
      if (found) matchedDriverId = found.id;
    }

    const departureDate = normalizeDateString(depDateRaw);
    const departureTime = normalizeDepartureTime(depTimeRaw, `${routeMap}_${plate}_${idx}`);
    const arrivalDate = normalizeDateString(arrDateRaw);
    const arrivalTime = normalizeTimeString(arrTimeRaw);

    const { stage, diffDays } = calculateDayCycleStage(departureDate, arrivalDate);
    const unloadedUntil22 = isUnloadedBefore22PM(arrivalTime);
    const efdHit = isPernoite || unloadedUntil22;

    records.push({
      id: `imp_travel_${Date.now()}_${idx}`,
      routeMap,
      plate,
      driverId: matchedDriverId,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      isPernoite,
      dayCycleStage: stage,
      diffDays,
      unloadedBefore10: unloadedUntil22,
      efdHit,
      driverName: driverNameRaw || undefined,
      importedAt: now,
      source: 'import'
    });
  });

  return records;
}

/**
 * Classifica o ciclo de descarregamento em D0, D1, D2, D3 ou D4.
 * - D0: Saída e descarregamento no mesmo dia (0 dias de diferença)
 * - D1: Descarregado 1 dia após a saída
 * - D2: Descarregado 2 dias após a saída
 * - D3: Descarregado 3 dias após a saída
 * - D4: Descarregado 4 ou mais dias após a saída
 */
export function calculateUnloadingCycle(
  departureDateStr?: string,
  unloadingDateStr?: string,
  isPernoite?: boolean
): {
  stage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  diffDays: number;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
} {
  const normDep = normalizeDateString(departureDateStr) || normalizeDateString(new Date().toISOString().split('T')[0]);
  const normArr = normalizeDateString(unloadingDateStr) || normDep;

  let diffDays = 0;
  try {
    const depTime = new Date(`${normDep}T00:00:00`).getTime();
    const arrTime = new Date(`${normArr}T00:00:00`).getTime();
    if (!isNaN(depTime) && !isNaN(arrTime)) {
      diffDays = Math.round((arrTime - depTime) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) diffDays = 0;
    }
  } catch {
    diffDays = 0;
  }

  if (isPernoite) {
    return {
      stage: 'D1',
      diffDays: Math.max(1, diffDays),
      label: 'D1 • Pernoite',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-900',
      badgeBorder: 'border-amber-300'
    };
  }

  if (diffDays === 0) {
    return {
      stage: 'D0',
      diffDays: 0,
      label: 'D0 • Mesmo Dia',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-800',
      badgeBorder: 'border-emerald-300'
    };
  } else if (diffDays === 1) {
    return {
      stage: 'D1',
      diffDays: 1,
      label: 'D1 • 1 Dia',
      badgeBg: 'bg-teal-100',
      badgeText: 'text-teal-800',
      badgeBorder: 'border-teal-300'
    };
  } else if (diffDays === 2) {
    return {
      stage: 'D2',
      diffDays: 2,
      label: 'D2 • 2 Dias',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
      badgeBorder: 'border-blue-300'
    };
  } else if (diffDays === 3) {
    return {
      stage: 'D3',
      diffDays: 3,
      label: 'D3 • 3 Dias',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-800',
      badgeBorder: 'border-amber-300'
    };
  } else {
    return {
      stage: 'D4',
      diffDays: diffDays,
      label: 'D4 • 4+ Dias',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-800',
      badgeBorder: 'border-rose-300'
    };
  }
}

/**
 * Calcula a duração de descarregamento em minutos a partir dos horários/datas de início e término.
 */
export function calculateUnloadingDurationMinutes(
  startTime?: string,
  endTime?: string,
  startDate?: string,
  endDate?: string
): number | null {
  if (!startTime || !endTime) return null;
  
  const normStartTime = normalizeTimeString(startTime);
  const normEndTime = normalizeTimeString(endTime);
  if (!normStartTime || !normEndTime) return null;

  try {
    const sDate = normalizeDateString(startDate) || '2026-01-01';
    const eDate = normalizeDateString(endDate) || sDate;

    const startMs = new Date(`${sDate}T${normStartTime}:00`).getTime();
    let endMs = new Date(`${eDate}T${normEndTime}:00`).getTime();

    if (isNaN(startMs) || isNaN(endMs)) {
      const [sh, sm] = normStartTime.split(':').map(Number);
      const [eh, em] = normEndTime.split(':').map(Number);
      const startMin = sh * 60 + sm;
      let endMin = eh * 60 + em;
      if (endMin < startMin) endMin += 24 * 60;
      return endMin - startMin;
    }

    if (endMs < startMs) {
      endMs += 24 * 60 * 60 * 1000;
    }

    const diffMin = Math.round((endMs - startMs) / (1000 * 60));
    return diffMin >= 0 ? diffMin : null;
  } catch {
    return null;
  }
}

/**
 * Formata minutos em texto amigável (ex: "28 min", "1h 15min")
 */
export function formatUnloadingDuration(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) return '--';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

