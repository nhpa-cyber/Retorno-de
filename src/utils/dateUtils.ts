/**
 * Universal Date Normalization & Parsing Utilities
 * Handles DD/MM/YYYY, YYYY-MM-DD, ISO timestamps, and Excel date formats.
 */

export function normalizeDateToYMD(dateVal?: any): string {
  if (!dateVal) return '';
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return '';
    return dateVal.toISOString().split('T')[0];
  }

  const str = String(dateVal).trim();
  if (!str) return '';

  // If already standard ISO date "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // If ISO timestamp like "2026-07-15T14:30:00.000Z"
  if (str.includes('T')) {
    const ymd = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  }

  // If contains slashes like "DD/MM/YYYY" or "D/M/YYYY" or "YYYY/MM/DD"
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY -> YYYY-MM-DD
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD -> YYYY-MM-DD
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  // If contains hyphens like "DD-MM-YYYY" or "D-M-YYYY"
  if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD-MM-YYYY -> YYYY-MM-DD
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD (with potentially single-digit month or day)
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  }

  // Fallback: try parsing with Date constructor
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  } catch (e) {
    // ignore
  }

  return str;
}

export function formatDateToPtBR(dateVal?: any): string {
  const ymd = normalizeDateToYMD(dateVal);
  if (!ymd || !ymd.includes('-')) return dateVal ? String(dateVal) : 'N/A';
  const parts = ymd.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return ymd;
}

export function isDateInRange(dateVal?: any, startDate?: string, endDate?: string): boolean {
  const ymd = normalizeDateToYMD(dateVal);
  if (!ymd) return false;
  
  if (startDate) {
    const normStart = normalizeDateToYMD(startDate);
    if (normStart && ymd < normStart) return false;
  }
  
  if (endDate) {
    const normEnd = normalizeDateToYMD(endDate);
    if (normEnd && ymd > normEnd) return false;
  }
  
  return true;
}
