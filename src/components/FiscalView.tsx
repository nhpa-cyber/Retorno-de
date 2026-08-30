import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { User, Driver, Vehicle, Product, ActiveAsset, AuditSession, AuditItem, AuditAssetItem, AuditExchangeItem, FiscalAlert, ImportedRoute, RouteObservation, Vale, ReturnForecast, getAssetCode, getAssetCanonicalName } from '../types';
import { isClientFirebaseActive, saveDirectlyToFirestore } from '../clientFirebase';
import { ClipboardCheck, ShieldAlert, ArrowRight, ShieldCheck, CheckSquare, Square, AlertTriangle, HelpCircle, Search, RefreshCw, XCircle, DollarSign, Calendar, SlidersHorizontal, FileSpreadsheet, Clock, CheckCircle2, Shield, Trash2, Camera, BarChart3, AlertCircle, Plus, PlusCircle, FileText, Check, Award, Eye, Calculator, Folder, Copy, X, ArrowUpCircle, ArrowDownCircle, Sparkles, FolderOpen, Download, FileCheck, PackageCheck, UserPlus, Trophy, TrendingUp, PieChart, Layers, Activity, Moon, Sun, Timer, BarChart2, Zap } from 'lucide-react';
import { ImageDB, PhotoRecord } from '../imageDb';
import { jsPDF } from 'jspdf';
import { DEFAULT_USERS } from '../data';
import { getSkuClosedPrice } from '../utils/prices';
import { parseAndProcessFile, ProcessImportResult } from '../utils/excelImportHelper';
import { parseLogisticsTravelFile, LogisticsTravelRecord, calculateDayCycleStage, isUnloadedBefore10AM, resolveRegisteredDriver } from '../utils/efdCalculations';
import { getStandardItemCost } from '../utils/pricing';
import { normalizeDateToYMD, formatDateToPtBR, isDateInRange } from '../utils/dateUtils';
import { UnifiedMonthlyImportTab } from './UnifiedMonthlyImportTab';
import { RankingDashboardPaAg } from './RankingDashboardPaAg';

const normalizeMapCode = (mapCode: any): string => {
  if (mapCode === undefined || mapCode === null) return '';
  return String(mapCode).trim().replace(/^0+/, '');
};

function AuditPhotoViewer({ auditId }: { auditId: string }) {
  const [photos, setPhotos] = React.useState<PhotoRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [previewPhoto, setPreviewPhoto] = React.useState<PhotoRecord | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    let active = true;
    
    const loadPhotos = () => {
      ImageDB.getPhotosByAudit(auditId)
        .then(res => {
          if (active) {
            setPhotos(res);
            setLoading(false);
          }
        })
        .catch(() => {
          if (active) setLoading(false);
        });
    };

    loadPhotos();

    const handlePhotosUpdated = () => {
      loadPhotos();
    };
    window.addEventListener('logiroute_photos_updated', handlePhotosUpdated);

    return () => {
      active = false;
      window.removeEventListener('logiroute_photos_updated', handlePhotosUpdated);
    };
  }, [auditId]);

  if (loading) {
    return <div className="text-xxs text-slate-400 animate-pulse py-1">Carregando fotos dos PA e AG...</div>;
  }

  if (photos.length === 0) {
    return <div className="text-xxs text-slate-400 italic py-1">Nenhuma foto de evidência cadastrada.</div>;
  }

  return (
    <div className="space-y-1.5 pt-2">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evidências Fotográficas (PA / AG / Refugos):</div>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div 
            key={p.id} 
            onClick={() => { setPreviewPhoto(p); setScale(1); }}
            className="relative group bg-slate-100 rounded-lg overflow-hidden border border-slate-200 w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 cursor-pointer hover:border-amber-500 transition-all"
          >
            <img 
              src={p.photoUrl} 
              alt={p.itemName} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1 text-[8px] text-white">
              <span className="font-semibold truncate text-[7px]">{p.itemName}</span>
              <span className="opacity-75 text-[7px]">
                {p.type === 'produto' ? 'PA' : 
                 p.type === 'refugo' ? 'REFUGO' : 
                 p.type === 'troca_reposicao' ? 'TROCA/REP' : 'AG'}
              </span>
              <span className="text-amber-400 text-[6px] font-bold block mt-0.5">Clique para Zoom</span>
            </div>
          </div>
        ))}
      </div>

      {previewPhoto && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md">
          <div className="absolute top-4 right-4 flex items-center space-x-3 z-50">
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-1 flex items-center space-x-1 shadow-lg text-white">
              <button
                type="button"
                onClick={() => setScale(s => Math.max(s - 0.25, 0.5))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom Out"
              >
                -
              </button>
              <span className="px-2 font-mono text-xs font-bold w-12 text-center">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale(s => Math.min(s + 0.25, 4))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setScale(1)}
                className="px-2 py-1 hover:bg-slate-800 rounded font-bold text-xs cursor-pointer transition"
                title="Reset Zoom"
              >
                1x
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setPreviewPhoto(null); setScale(1); }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition cursor-pointer font-sans"
            >
              Fechar [X]
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-zoom-in">
            <div 
              className="transition-transform duration-100 ease-out flex items-center justify-center"
              style={{ transform: `scale(${scale})` }}
            >
              <img
                src={previewPhoto.photoUrl}
                alt={previewPhoto.itemName}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-800 bg-slate-950"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 border border-slate-800 text-white p-3 rounded-xl max-w-2xl mx-auto flex flex-col space-y-1 text-center font-sans">
            <div className="font-bold text-xs uppercase tracking-wider">{previewPhoto.itemName || 'Sem descrição'}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Código / Ativo: {previewPhoto.itemCode} • Categoria: {
                previewPhoto.type === 'produto' ? 'PA' : 
                previewPhoto.type === 'refugo' ? 'REFUGO/AVARIA' : 
                previewPhoto.type === 'troca_reposicao' ? 'TROCA/REPOSIÇÃO' : 'AG'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditHistoryDetails({ audit }: { audit: AuditSession }) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="mt-4 border-t border-slate-150/50 pt-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xxs font-bold text-slate-700 hover:text-indigo-600 flex items-center space-x-1 uppercase focus:outline-none cursor-pointer"
      >
        <span>{isOpen ? '▲ Ocultar Detalhes da Conciliação' : '▼ Visualizar Detalhes e Itens Reconciliados'}</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-4">
          {/* PA Products Table */}
          {audit.items && audit.items.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Produtos Acabados (PA)</span>
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-slate-50/30">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-center">Físico</th>
                      <th className="p-2 text-center">Fiscal</th>
                      <th className="p-2 text-right">Divergência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {audit.items.map(item => {
                      const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                      const fisc = item.fiscalQty ?? 0;
                      const diff = phys - fisc;
                      return (
                        <tr key={item.productCode} className="hover:bg-slate-100/30">
                          <td className="p-2 font-medium">{item.productDescription || item.productCode}</td>
                          <td className="p-2 text-center font-mono">{phys}</td>
                          <td className="p-2 text-center font-mono">{fisc}</td>
                          <td className={`p-2 text-right font-bold font-mono ${
                            diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AG Assets Table */}
          {audit.assets && audit.assets.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Ativos de Giro (AG)</span>
              <div className="border border-slate-200 rounded-lg overflow-x-auto bg-slate-50/30">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2">Ativo</th>
                      <th className="p-2 text-center">Físico</th>
                      <th className="p-2 text-center">Fiscal</th>
                      <th className="p-2 text-center">Como.</th>
                      <th className="p-2 text-center">Rec.</th>
                      <th className="p-2 text-right">Divergência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {audit.assets.map(asset => {
                      const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                      const fisc = asset.fiscalQty ?? 0;
                      const comodato = asset.comodatoQty ?? 0;
                      const recolha = asset.recolhaQty ?? 0;
                      const diff = phys - fisc + comodato - recolha;
                      return (
                        <tr key={asset.assetId} className="hover:bg-slate-100/30">
                          <td className="p-2 font-medium">{asset.assetName || asset.assetId}</td>
                          <td className="p-2 text-center font-mono">{phys}</td>
                          <td className="p-2 text-center font-mono">{fisc}</td>
                          <td className="p-2 text-center font-mono text-slate-500">{comodato || '-'}</td>
                          <td className="p-2 text-center font-mono text-slate-500">{recolha || '-'}</td>
                          <td className={`p-2 text-right font-bold font-mono ${
                            diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Photo viewer component */}
          <AuditPhotoViewer auditId={audit.id} />
        </div>
      )}
    </div>
  );
}

interface FiscalViewProps {
  currentUser: User;
  drivers: Driver[];
  onSaveDrivers?: (drivers: Driver[]) => void;
  vehicles: Vehicle[];
  products: Product[];
  onSaveProducts?: (products: Product[]) => void;
  activeAssets: ActiveAsset[];
  audits: AuditSession[];
  onSaveAudits: (audits: AuditSession[]) => void;
  fiscalAlerts?: FiscalAlert[];
  onSaveAlerts?: (alerts: FiscalAlert[]) => void;
  importedRoutes?: ImportedRoute[];
  onSaveImportedRoutes?: (routes: ImportedRoute[]) => void;
  vales?: Vale[];
  onSaveVales?: (vales: Vale[]) => void;
  activeTab?: string;
  onResetPlatformData?: (skipConfirmation?: boolean) => void;
  returnForecasts?: ReturnForecast[];
  onSaveForecasts?: (forecasts: ReturnForecast[]) => void;
}

function splitCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function matchDriverFromColumnValue(val: string, currentDrivers: Driver[]): string {
  if (!val) return '';
  const rawValUpper = val.trim().toUpperCase();
  if (!rawValUpper) return '';

  const normalizeId = (id: string) => id.toUpperCase().replace(/^G/, '').replace(/^0+/, '').trim();
  const toNumericOnly = (str: string) => str.replace(/\D/g, '').replace(/^0+/, '');

  // 1. Numeric-only match (highest priority for matrícula codes like 1053 matching G1053)
  const inputNumeric = toNumericOnly(rawValUpper);
  if (inputNumeric) {
    const foundByNumeric = currentDrivers.find(d => toNumericOnly(d.id) === inputNumeric);
    if (foundByNumeric) return foundByNumeric.id;
  }

  // 2. Exact match on ID (case-insensitive)
  let found = currentDrivers.find(d => d.id.toUpperCase() === rawValUpper);
  if (found) return found.id;

  // 3. Normalize the spreadsheet value (remove G prefix and leading zeros)
  const cleanVal = rawValUpper.replace(/^G/, '').replace(/^0+/, '').trim();
  if (cleanVal) {
    found = currentDrivers.find(d => normalizeId(d.id) === cleanVal);
    if (found) return found.id;
  }

  // 4. Extract any numbers in the string that could represent a driver ID
  const digitSequences = rawValUpper.match(/\d+/g);
  if (digitSequences) {
    for (const seq of digitSequences) {
      const cleanSeq = seq.replace(/^0+/, ''); // strip leading zeros
      if (cleanSeq) {
        found = currentDrivers.find(d => {
          const dbCleanId = normalizeId(d.id);
          const dbNumericOnly = toNumericOnly(d.id);
          return dbCleanId === cleanSeq || dbNumericOnly === cleanSeq;
        });
        if (found) return found.id;
      }
    }
  }

  // 5. Exact name matching
  found = currentDrivers.find(d => d.name.trim().toLowerCase() === val.toLowerCase());
  if (found) return found.id;

  // 6. Partial name matching (fuzzy match)
  found = currentDrivers.find(d => {
    const dbName = d.name.trim().toLowerCase();
    const inputName = val.toLowerCase();
    return dbName.includes(inputName) || inputName.includes(dbName);
  });
  if (found) return found.id;

  // 7. Split by delimiters and match parts
  const parts = rawValUpper.split(/[\s\-;(),]+/);
  for (const part of parts) {
    const cleanPart = part.replace(/^G/, '').replace(/^0+/, '').trim();
    if (cleanPart) {
      found = currentDrivers.find(d => normalizeId(d.id) === cleanPart);
      if (found) return found.id;
    }
  }

  return '';
}

function isForecastActivePernoite(
  f: ReturnForecast,
  audits: AuditSession[] = [],
  importedRoutes: ImportedRoute[] = []
): boolean {
  if (f.tripStatus !== 'pernoitam') return false;
  if (f.status === 'no_patio') return false;

  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Date rollover: if pernoite was registered on a previous day, it is no longer active today
  if (f.updatedAt) {
    const fDate = f.updatedAt.split('T')[0];
    if (fDate < todayStr) return false;
  }

  // 2. Audit check: if map is downloaded/finalized
  const normFMap = normalizeMapCode(f.routeMap).toUpperCase();
  const matchingAudit = audits.find(a => {
    const aNorm = normalizeMapCode(a.routeMap).toUpperCase();
    return aNorm === normFMap || (a.unifiedMaps && a.unifiedMaps.some(m => normalizeMapCode(m).toUpperCase() === normFMap));
  });
  if (matchingAudit && (
    matchingAudit.status === 'finalizado_ok' || 
    matchingAudit.status === 'finalizado_divergente' || 
    matchingAudit.surplusFlowStatus === 'BAIXADO' ||
    (matchingAudit as any).pdfDownloaded === true
  )) {
    return false;
  }

  // 3. Route check: if closed
  const matchingRoute = importedRoutes.find(r => normalizeMapCode(r.routeMap).toUpperCase() === normFMap);
  if (matchingRoute && matchingRoute.status === 'fechado') {
    return false;
  }

  return true;
}

function selectCircularBlitzRoutes(
  importedRoutesForDate: ImportedRoute[], 
  returnForecasts: ReturnForecast[] = [],
  currentBlitzRoutes: ImportedRoute[] = [],
  audits: AuditSession[] = []
): string[] {
  if (importedRoutesForDate.length === 0) return [];

  // Identify distinct pernoite plates (tripStatus === 'pernoitam')
  const pernoitePlates = new Set(
    returnForecasts
      .filter(f => isForecastActivePernoite(f, audits, importedRoutesForDate))
      .map(f => f.plate.trim().toUpperCase())
  );

  // A blitz route is valid if it is currently marked as blitz, belongs to the active date,
  // has a valid plate, and that plate is not pernoitando.
  const validBlitzRoutes = currentBlitzRoutes.filter(r => 
    r.plate && r.plate.trim() !== "" && !pernoitePlates.has(r.plate.trim().toUpperCase())
  );

  // Keep up to 2 valid ones
  const keptMaps = validBlitzRoutes.slice(0, 2).map(r => r.routeMap);

  if (keptMaps.length >= 2) {
    // Already have 2 valid blitzes, don't draw any more!
    return keptMaps;
  }

  // How many more do we need to draw?
  const neededCount = 2 - keptMaps.length;

  // Gather plates that have ALREADY been audited or drawn for blitz previously across historical audits
  const checkedPlatesSet = new Set(
    (audits || [])
      .filter(a => a.blitzBoxesChecked !== undefined || a.isBlitz)
      .map(a => (a.plate || '').trim().toUpperCase())
      .filter(Boolean)
  );

  // Find candidate routes that can be drawn
  // Candidates must:
  // - Not be already kept as blitz
  // - Have a non-empty plate
  // - Not be pernoitando
  const candidates = importedRoutesForDate.filter(r => {
    if (!r.plate || r.plate.trim() === "") return false;
    if (keptMaps.includes(r.routeMap)) return false;
    if (pernoitePlates.has(r.plate.trim().toUpperCase())) return false;
    return true;
  });

  // Split candidates into unchecked (never blitzed in audits) and checked
  const uncheckedCandidates = candidates.filter(r => !checkedPlatesSet.has(r.plate.trim().toUpperCase()));

  // Helper to shuffle candidates randomly for drawing
  function shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  const shuffledUnchecked = shuffle(uncheckedCandidates);
  const shuffledCandidates = shuffle(candidates);

  const selectedNewMaps: string[] = [];

  // Pick from unchecked candidates first (vehicles that have NEVER had a Blitz)
  shuffledUnchecked.forEach(r => {
    if (selectedNewMaps.length < neededCount) {
      selectedNewMaps.push(r.routeMap);
    }
  });

  // If still need more, pick from any candidates (circular fallback)
  if (selectedNewMaps.length < neededCount) {
    shuffledCandidates.forEach(r => {
      if (selectedNewMaps.length < neededCount && !selectedNewMaps.includes(r.routeMap)) {
        selectedNewMaps.push(r.routeMap);
      }
    });
  }

  const result = [...keptMaps, ...selectedNewMaps];

  // If we couldn't get exactly 2 maps, pad with first available non-pernoite maps
  while (result.length < 2 && importedRoutesForDate.length > result.length) {
    const nextMap = importedRoutesForDate.find(r => 
      !result.includes(r.routeMap) && 
      (!r.plate || !pernoitePlates.has(r.plate.trim().toUpperCase()))
    );
    if (nextMap) {
      result.push(nextMap.routeMap);
    } else {
      break;
    }
  }

  return result.slice(0, 2);
}

interface ReopeningInfo {
  requestedAt?: string;
  requestedBy?: string;
  justification?: string;
  reopenedAt?: string;
  reopenedBy?: string;
  closedAgainAt?: string;
  closedAgainBy?: string;
  isReopened: boolean;
}

const getReopeningInfo = (audit: AuditSession): ReopeningInfo => {
  const info: ReopeningInfo = { isReopened: false };
  if (!audit || !audit.history) return info;

  const approvedLog = audit.history.find(h => h.action.includes('Reabertura Aprovada') || h.action.includes('Reaberto'));
  if (approvedLog) {
    info.isReopened = true;
    info.reopenedAt = approvedLog.timestamp;
    info.reopenedBy = approvedLog.user;
  }

  const requestLog = audit.history.find(h => h.action.includes('Solicitou Reabertura') || h.action.includes('Solicitação de Reabertura'));
  if (requestLog) {
    info.requestedAt = requestLog.timestamp;
    info.requestedBy = requestLog.user;
    if (requestLog.details) {
      const match = requestLog.details.match(/Justificativa:\s*(.*)/);
      info.justification = match ? match[1] : requestLog.details;
    } else if (audit.reopeningJustification) {
      info.justification = audit.reopeningJustification;
    }
  }

  if (info.reopenedAt) {
    const closedLog = audit.history.find(h => 
      (h.action.includes('Baixa Concluída') || h.action.includes('Finalizado') || h.action.includes('Concluída')) && 
      new Date(h.timestamp) > new Date(info.reopenedAt)
    );
    if (closedLog) {
      info.closedAgainAt = closedLog.timestamp;
      info.closedAgainBy = closedLog.user;
    }
  }

  return info;
};

interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  user: string;
  details: string;
  type: 'action' | 'observation' | 'reopening' | 'delay' | 'alignment';
}

const getUnifiedTimeline = (audit: AuditSession, importedRoutes: ImportedRoute[] = []): TimelineEvent[] => {
  if (!audit) return [];
  
  const events: TimelineEvent[] = [];

  // 1. Audit Session History Events
  if (audit.history) {
    audit.history.forEach((h, index) => {
      let evType: 'action' | 'reopening' = 'action';
      if (h.action.includes('Reabert') || h.action.includes('Reabertura')) {
        evType = 'reopening';
      }
      events.push({
        id: `hist_${index}_${h.timestamp}`,
        timestamp: h.timestamp,
        action: h.action,
        user: h.user,
        details: h.details || '',
        type: evType
      });
    });
  }

  // Find matching imported route
  const matchingRoute = importedRoutes.find(
    r => r.routeMap.toUpperCase() === audit.routeMap.toUpperCase()
  );

  // 2. Observations from AuditSession
  if (audit.routeObservations) {
    audit.routeObservations.forEach((o, index) => {
      let ts = o.timestamp || new Date().toISOString();
      if (ts.includes('/')) {
        try {
          const parts = ts.split(' ');
          const dateParts = parts[0].split('/');
          const timeParts = parts[1] || '12:00';
          ts = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${timeParts}:00`;
        } catch(e) {}
      }
      events.push({
        id: `obs_audit_${o.id || index}`,
        timestamp: ts,
        action: `Anotação de Campo [${(o.type || 'geral').toUpperCase()}]`,
        user: o.author || 'Sistema',
        details: o.text,
        type: 'observation'
      });
    });
  }

  // 3. Observations from matching ImportedRoute (de-duplicate by text)
  if (matchingRoute && matchingRoute.routeObservations) {
    matchingRoute.routeObservations.forEach((o, index) => {
      const isDuplicate = events.some(e => e.details === o.text);
      if (!isDuplicate) {
        let ts = o.timestamp || new Date().toISOString();
        if (ts.includes('/')) {
          try {
            const parts = ts.split(' ');
            const dateParts = parts[0].split('/');
            const timeParts = parts[1] || '12:00';
            ts = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}T${timeParts}:00`;
          } catch(e) {}
        }
        events.push({
          id: `obs_route_${o.id || index}`,
          timestamp: ts,
          action: `Observação do Monitoramento/Balança [${(o.type || 'geral').toUpperCase()}]`,
          user: o.author || 'Monitoramento',
          details: o.text,
          type: 'observation'
        });
      }
    });
  }

  // 4. Delay Justifications (Justificativas de Atraso)
  if (matchingRoute && matchingRoute.justification) {
    events.push({
      id: `delay_${matchingRoute.id}`,
      timestamp: audit.arrivalDate ? `${audit.arrivalDate}T18:00:00.000Z` : new Date().toISOString(),
      action: `Justificativa de Atraso no Fechamento`,
      user: 'Monitoramento / Logística',
      details: matchingRoute.justification,
      type: 'delay'
    });
  }

  // 5. Surplus alignment info (Alinhamento de Sobras/Reposição)
  if (audit.clientCodeNB || audit.deliveryDate) {
    events.push({
      id: `align_${audit.id}`,
      timestamp: audit.updatedAt || new Date().toISOString(),
      action: `Alinhamento de Reposição / Sobras de P.A.`,
      user: audit.lastUpdatedBy || 'Monitoramento/Gestor',
      details: `Código NB do Cliente: ${audit.clientCodeNB || 'Não informado'} | Data Agendada para Entrega da Sobra: ${audit.deliveryDate ? new Date(audit.deliveryDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não alinhada'}. Status do Fluxo: ${audit.surplusFlowStatus || 'PENDENTE'}.`,
      type: 'alignment'
    });
  }

  // Sort chronologically (ascending)
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export default function FiscalView({
  currentUser,
  drivers,
  onSaveDrivers,
  vehicles,
  products,
  onSaveProducts,
  activeAssets,
  audits,
  onSaveAudits,
  fiscalAlerts,
  onSaveAlerts,
  importedRoutes = [],
  onSaveImportedRoutes,
  vales = [],
  onSaveVales,
  activeTab = 'reconciliacao',
  onResetPlatformData,
  returnForecasts = [],
  onSaveForecasts
}: FiscalViewProps) {
  // Navigation / Workspace selection
  const [activeSession, setActiveSession] = useState<AuditSession | null>(null);

  // Concurrency tracking state
  const [loadedSessionTime, setLoadedSessionTime] = useState<string | undefined>(undefined);

  // Prevent accidental tab closing or reload during active fiscal reconciliation
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeSession) {
        e.preventDefault();
        e.returnValue = 'Você possui uma reconciliação fiscal em andamento. Para evitar perda de dados, conclua ou feche o painel antes de sair.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [activeSession]);

  // Automatically reset loadedSessionTime if session is closed
  React.useEffect(() => {
    if (!activeSession) {
      setLoadedSessionTime(undefined);
    }
  }, [activeSession]);

  // Fast O(1) set of finished audit route map codes
  const closedAuditMapsSet = React.useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < audits.length; i++) {
      const a = audits[i];
      if (!a.reopeningRequested) {
        const isFinished = a.status === 'finalizado_ok' || a.status === 'finalizado_divergente' || (a as any).pdfDownloaded === true || (a as any).surplusFlowStatus === 'BAIXADO';
        if (isFinished) {
          if (a.routeMap) {
            set.add(normalizeMapCode(a.routeMap).toUpperCase());
            set.add(a.routeMap.trim().toUpperCase());
          }
          if (a.unifiedMaps && Array.isArray(a.unifiedMaps)) {
            a.unifiedMaps.forEach(m => {
              if (m) {
                set.add(normalizeMapCode(m).toUpperCase());
                set.add(m.trim().toUpperCase());
              }
            });
          }
        }
      }
    }
    return set;
  }, [audits]);

  // Fast O(1) set of closed imported route maps
  const closedImportedRouteMapsSet = React.useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < importedRoutes.length; i++) {
      const r = importedRoutes[i];
      if (r && r.status === 'fechado' && r.routeMap) {
        set.add(normalizeMapCode(r.routeMap).toUpperCase());
        set.add(r.routeMap.trim().toUpperCase());
      }
    }
    return set;
  }, [importedRoutes]);

  // Helper to determine if a route is closed based on audits
  const isRouteClosed = React.useCallback((routeMap: string) => {
    if (!routeMap) return false;
    const norm = normalizeMapCode(routeMap).toUpperCase();
    const upper = routeMap.trim().toUpperCase();
    return closedAuditMapsSet.has(norm) || closedAuditMapsSet.has(upper);
  }, [closedAuditMapsSet]);

  // States for shared PDFs explorer
  const [sharedPdfs, setSharedPdfs] = useState<any[]>([]);
  const [loadingSharedPdfs, setLoadingSharedPdfs] = useState<boolean>(false);

  // State for Retroactive Refugo & Avaria Import inside Sincronizador
  const [retroImportResult, setRetroImportResult] = useState<ProcessImportResult | null>(null);
  const [isProcessingRetro, setIsProcessingRetro] = useState(false);
  const [isSavingRetro, setIsSavingRetro] = useState(false);
  const retroRefugoFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleRetroRefugoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingRetro(true);
    try {
      const result = await parseAndProcessFile(file, audits, drivers);
      setRetroImportResult(result);
    } catch (err: any) {
      console.error('Erro ao analisar arquivo de refugo:', err);
      alert('Erro ao analisar planilha ou JSON de refugo: ' + (err?.message || 'Arquivo inválido'));
    } finally {
      setIsProcessingRetro(false);
      if (retroRefugoFileInputRef.current) retroRefugoFileInputRef.current.value = '';
    }
  };

  const handleImportPreloadedRetroJson = async () => {
    setIsProcessingRetro(true);
    try {
      const res = await fetch('/audits_retroativos_import.json');
      if (!res.ok) throw new Error('Arquivo audits_retroativos_import.json não encontrado no servidor');
      const json = await res.json();

      let auditsList: any[] = json.collections?.audits || json.audits || [];
      const blob = new Blob([JSON.stringify(auditsList)], { type: 'application/json' });
      const file = new File([blob], 'audits_retroativos_import.json', { type: 'application/json' });

      const result = await parseAndProcessFile(file, audits, drivers);
      setRetroImportResult(result);
    } catch (err: any) {
      console.error('Erro ao carregar JSON pré-gerado:', err);
      alert('Erro ao carregar arquivo oficial: ' + err.message);
    } finally {
      setIsProcessingRetro(false);
    }
  };

  const handleConfirmSaveRetroAudits = async () => {
    if (!retroImportResult || retroImportResult.auditsToSave.length === 0) return;

    setIsSavingRetro(true);
    try {
      let updatedAudits = [...audits];

      for (const newAudit of retroImportResult.auditsToSave) {
        const existingIdx = updatedAudits.findIndex(a =>
          a.routeMap.toUpperCase() === newAudit.routeMap.toUpperCase() ||
          a.id === newAudit.id
        );

        if (existingIdx >= 0) {
          const existing = updatedAudits[existingIdx];
          if (!existing.isEstimated) {
            // Protection: Real physical audits conducted by conferente are kept intact
            continue;
          }
          updatedAudits[existingIdx] = { ...existing, ...newAudit };
        } else {
          updatedAudits.push(newAudit);
        }
      }

      let updatedDrivers = [...drivers];
      if (retroImportResult.newDriversToSave.length > 0) {
        for (const newDrv of retroImportResult.newDriversToSave) {
          if (!updatedDrivers.some(d => d.id === newDrv.id)) {
            updatedDrivers.push(newDrv);
          }
        }
        if (onSaveDrivers) {
          onSaveDrivers(updatedDrivers);
        }
      }

      onSaveAudits(updatedAudits);

      if (isClientFirebaseActive()) {
        await saveDirectlyToFirestore({
          audits: updatedAudits,
          drivers: updatedDrivers
        });
      }

      alert(`Sincronização realizada com sucesso!\n\n${retroImportResult.auditsToSave.length} auditorias retroativas e ${retroImportResult.unregisteredDriversCount} motoristas integrados na plataforma.`);
      setRetroImportResult(null);
    } catch (err: any) {
      console.error('Erro ao salvar auditorias retroativas:', err);
      alert('Falha ao salvar auditorias retroativas: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsSavingRetro(false);
    }
  };

  // Sub-tabs inside Sincronizador
  const [sincSubTab, setSincSubTab] = useState<'rotas_dia' | 'importacao_mensal_unificada' | 'viagens_efd' | 'refugo_retroativo'>('importacao_mensal_unificada');

  // EFD & Travel Import States inside Sincronizador
  const [travelImportRecords, setTravelImportRecords] = useState<LogisticsTravelRecord[]>([]);
  const [isProcessingTravelFile, setIsProcessingTravelFile] = useState(false);
  const [isSavingTravelRecords, setIsSavingTravelRecords] = useState(false);
  const [travelSearchTerm, setTravelSearchTerm] = useState('');
  const travelFileInputRef = React.useRef<HTMLInputElement>(null);

  const handleTravelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingTravelFile(true);
    try {
      const records = await parseLogisticsTravelFile(file, drivers);
      setTravelImportRecords(records);
    } catch (err: any) {
      console.error('Erro ao analisar arquivo de viagens:', err);
      alert('Erro ao analisar planilha de viagens: ' + (err?.message || 'Arquivo inválido'));
    } finally {
      setIsProcessingTravelFile(false);
      if (travelFileInputRef.current) travelFileInputRef.current.value = '';
    }
  };

  const handleTogglePernoiteInTravelRecord = (index: number) => {
    setTravelImportRecords(prev => {
      const next = [...prev];
      const rec = next[index];
      if (rec) {
        const newPernoite = !rec.isPernoite;
        next[index] = {
          ...rec,
          isPernoite: newPernoite,
          efdHit: newPernoite ? true : rec.unloadedBefore10
        };
      }
      return next;
    });
  };

  const handleConfirmSaveTravelRecords = async () => {
    if (travelImportRecords.length === 0) return;

    setIsSavingTravelRecords(true);
    try {
      let updatedRoutes = [...importedRoutes];
      let updatedAudits = [...audits];
      let routesUpdatedCount = 0;
      let auditsUpdatedCount = 0;
      let newRoutesAddedCount = 0;

      for (const rec of travelImportRecords) {
        const normMap = rec.routeMap.toUpperCase().trim();
        const normPlate = rec.plate.toUpperCase().trim();

        // 1. Update matching imported routes or create new route if not existing
        const existingRouteIdx = updatedRoutes.findIndex(r => 
          r.routeMap.toUpperCase().trim() === normMap ||
          (normPlate && normPlate !== 'N/A' && r.plate.toUpperCase().trim() === normPlate && r.routeDate === rec.arrivalDate)
        );

        if (existingRouteIdx >= 0) {
          updatedRoutes[existingRouteIdx] = {
            ...updatedRoutes[existingRouteIdx],
            departureDate: rec.departureDate || updatedRoutes[existingRouteIdx].departureDate,
            departureTime: rec.departureTime || updatedRoutes[existingRouteIdx].departureTime,
            arrivalTime: rec.arrivalTime || updatedRoutes[existingRouteIdx].arrivalTime,
            routeDate: rec.arrivalDate || updatedRoutes[existingRouteIdx].routeDate,
            isPernoite: rec.isPernoite,
            unloadedBefore10: rec.unloadedBefore10,
            efdHit: rec.efdHit,
            dayCycleStage: rec.dayCycleStage,
            plate: normPlate !== 'N/A' ? normPlate : updatedRoutes[existingRouteIdx].plate,
            driverId: rec.driverId || updatedRoutes[existingRouteIdx].driverId
          };
          routesUpdatedCount++;
        } else {
          // Add as new imported route
          const newRoute: ImportedRoute = {
            id: `route_sync_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            routeMap: rec.routeMap,
            plate: normPlate,
            driverId: rec.driverId || 'temporario',
            routeDate: rec.arrivalDate || new Date().toISOString().split('T')[0],
            importedAt: new Date().toISOString(),
            status: 'pendente',
            itemsCount: 0,
            departureDate: rec.departureDate,
            departureTime: rec.departureTime,
            arrivalTime: rec.arrivalTime,
            isPernoite: rec.isPernoite,
            unloadedBefore10: rec.unloadedBefore10,
            efdHit: rec.efdHit,
            dayCycleStage: rec.dayCycleStage
          };
          updatedRoutes.push(newRoute);
          newRoutesAddedCount++;
        }

        // 2. Update existing platform audits with the new travel data
        const matchingAuditIdx = updatedAudits.findIndex(a => 
          a.routeMap.toUpperCase().trim() === normMap ||
          (normPlate && normPlate !== 'N/A' && a.plate.toUpperCase().trim() === normPlate)
        );

        if (matchingAuditIdx >= 0) {
          updatedAudits[matchingAuditIdx] = {
            ...updatedAudits[matchingAuditIdx],
            departureDate: rec.departureDate || updatedAudits[matchingAuditIdx].departureDate,
            departureTime: rec.departureTime || updatedAudits[matchingAuditIdx].departureTime,
            arrivalTime: rec.arrivalTime || updatedAudits[matchingAuditIdx].arrivalTime,
            arrivalDate: rec.arrivalDate || updatedAudits[matchingAuditIdx].arrivalDate,
            isPernoite: rec.isPernoite,
            unloadedBefore10: rec.unloadedBefore10,
            efdHit: rec.efdHit,
            dayCycleStage: rec.dayCycleStage
          };
          auditsUpdatedCount++;
        }
      }

      if (onSaveImportedRoutes) {
        onSaveImportedRoutes(updatedRoutes);
      }
      if (onSaveAudits) {
        onSaveAudits(updatedAudits);
      }

      if (isClientFirebaseActive()) {
        await saveDirectlyToFirestore({
          importedRoutes: updatedRoutes,
          audits: updatedAudits
        });
      }

      alert(`Viagens e Indicadores EFD Sincronizados com Sucesso!\n\n` +
            `• ${travelImportRecords.length} registros processados\n` +
            `• ${routesUpdatedCount} mapas existentes atualizados\n` +
            `• ${newRoutesAddedCount} novas rotas cadastradas\n` +
            `• ${auditsUpdatedCount} auditorias sincronizadas retroativamente.`);

      setTravelImportRecords([]);
    } catch (err: any) {
      console.error('Erro ao sincronizar viagens:', err);
      alert('Falha ao salvar registros de viagem: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsSavingTravelRecords(false);
    }
  };

  const handleToggleRoutePernoite = (route: ImportedRoute) => {
    const newPernoite = !route.isPernoite;
    const targetMap = route.routeMap.toUpperCase().trim();
    const targetPlate = (route.plate || '').toUpperCase().trim();

    if (onSaveImportedRoutes) {
      const updated = importedRoutes.map(r => {
        if (
          r.id === route.id ||
          r.routeMap.toUpperCase().trim() === targetMap ||
          (targetPlate && targetPlate !== 'N/A' && r.plate.toUpperCase().trim() === targetPlate)
        ) {
          const unloadedBefore10 = r.unloadedBefore10 !== undefined ? r.unloadedBefore10 : true;
          return {
            ...r,
            isPernoite: newPernoite,
            efdHit: newPernoite ? true : unloadedBefore10
          };
        }
        return r;
      });
      onSaveImportedRoutes(updated);
    }

    if (onSaveAudits) {
      const updatedAudits = audits.map(a => {
        if (
          a.routeMap.toUpperCase().trim() === targetMap ||
          (targetPlate && targetPlate !== 'N/A' && a.plate.toUpperCase().trim() === targetPlate)
        ) {
          const unloadedBefore10 = a.unloadedBefore10 !== undefined ? a.unloadedBefore10 : true;
          return {
            ...a,
            isPernoite: newPernoite,
            efdHit: newPernoite ? true : unloadedBefore10
          };
        }
        return a;
      });
      onSaveAudits(updatedAudits);
    }

    if (activeSession && (activeSession.routeMap.toUpperCase().trim() === targetMap || (targetPlate && activeSession.plate.toUpperCase().trim() === targetPlate))) {
      setActiveSession(prev => prev ? ({ ...prev, isPernoite: newPernoite }) : null);
    }
  };

  const handleToggleActiveSessionPernoite = () => {
    if (!activeSession) return;
    const newPernoite = !activeSession.isPernoite;
    const targetMap = activeSession.routeMap.toUpperCase().trim();
    const targetPlate = (activeSession.plate || '').toUpperCase().trim();

    setActiveSession(prev => prev ? ({ ...prev, isPernoite: newPernoite }) : null);

    if (onSaveAudits) {
      const updatedAudits = audits.map(a => {
        if (a.id === activeSession.id || a.routeMap.toUpperCase().trim() === targetMap || (targetPlate && targetPlate !== 'N/A' && a.plate.toUpperCase().trim() === targetPlate)) {
          const unloadedBefore10 = a.unloadedBefore10 !== undefined ? a.unloadedBefore10 : true;
          return {
            ...a,
            isPernoite: newPernoite,
            efdHit: newPernoite ? true : unloadedBefore10
          };
        }
        return a;
      });
      onSaveAudits(updatedAudits);
    }

    if (onSaveImportedRoutes) {
      const updatedRoutes = importedRoutes.map(r => {
        if (r.routeMap.toUpperCase().trim() === targetMap || (targetPlate && targetPlate !== 'N/A' && r.plate.toUpperCase().trim() === targetPlate)) {
          const unloadedBefore10 = r.unloadedBefore10 !== undefined ? r.unloadedBefore10 : true;
          return {
            ...r,
            isPernoite: newPernoite,
            efdHit: newPernoite ? true : unloadedBefore10
          };
        }
        return r;
      });
      onSaveImportedRoutes(updatedRoutes);
    }
  };

  const fetchSharedPdfs = async () => {
    if (isClientFirebaseActive()) {
      console.log("[ClientFirebase] Ignorando carregamento de PDFs de rede locais (GitHub Pages).");
      setSharedPdfs([]);
      return;
    }
    setLoadingSharedPdfs(true);
    try {
      const res = await fetch("/api/shared-pdfs");
      const data = await res.json();
      if (data.success && data.files) {
        setSharedPdfs(data.files);
      }
    } catch (err) {
      console.error("Erro ao obter PDFs compartilhados:", err);
    } finally {
      setLoadingSharedPdfs(false);
    }
  };

  React.useEffect(() => {
    if (activeTab === 'pasta_evidencias') {
      fetchSharedPdfs();
    }
  }, [activeTab]);

  // Monitoramento alerts overlay toggle state
  const [showMonitorAlerts, setShowMonitorAlerts] = useState(false);

  // Bottle Calculator states
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calc600, setCalc600] = useState<number | ''>('');
  const [calc1L, setCalc1L] = useState<number | ''>('');
  const [calc300, setCalc300] = useState<number | ''>('');

  // States for adding products manually in Reconciliation Screen (FiscalView)
  const [recProductSearch, setRecProductSearch] = useState('');
  const [recSelectedProductCode, setRecSelectedProductCode] = useState('');
  const [recProductQtyToAdd, setRecProductQtyToAdd] = useState<number | ''>('');
  const [recProductFiscalQtyToAdd, setRecProductFiscalQtyToAdd] = useState<number | ''>('');

  // Observation Type tracking for each discrepancy card
  const [cardObsTypes, setCardObsTypes] = useState<Record<string, 'sobra' | 'falta' | 'todos'>>({});

  // Selection state for Sobras & Faltas batch actions
  const [selectedDiscrepancyIds, setSelectedDiscrepancyIds] = useState<string[]>([]);

  // Discrepancy Ranking & Drilldown Panel State
  const [selectedDiscrepancyRankingType, setSelectedDiscrepancyRankingType] = useState<'none' | 'sobras' | 'faltas'>('none');
  const [rankingSearchTerm, setRankingSearchTerm] = useState('');
  const [itemTreatmentInputs, setItemTreatmentInputs] = useState<Record<string, { qty: number | ''; notes: string }>>({});

  // Handler for partial or total treatment of an item or asset discrepancy
  const handleTreatItemQty = (
    auditId: string,
    itemCode: string,
    isAsset: boolean,
    treatedQtyToAdd: number,
    notes?: string
  ) => {
    if (!treatedQtyToAdd || treatedQtyToAdd <= 0) {
      alert('Informe uma quantidade válida maior que zero para registrar o tratamento.');
      return;
    }

    const updated = audits.map(audit => {
      if (audit.id !== auditId) return audit;

      let updatedItems = [...audit.items];
      let updatedAssets = [...audit.assets];
      let itemName = '';
      let isSurplus = false;
      let totalRaw = 0;
      let previousTreated = 0;
      let finalTreated = 0;

      if (!isAsset) {
        updatedItems = updatedItems.map(item => {
          if (item.productCode === itemCode) {
            const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
            const fisc = item.fiscalQty ?? 0;
            const rawDiff = phys - fisc;
            isSurplus = rawDiff > 0;
            totalRaw = Math.abs(rawDiff);
            previousTreated = item.treatedQty || 0;
            finalTreated = Math.min(totalRaw, previousTreated + treatedQtyToAdd);
            itemName = item.productDescription;
            return {
              ...item,
              treatedQty: finalTreated,
              treatmentNotes: notes ? (item.treatmentNotes ? `${item.treatmentNotes} | ${notes}` : notes) : item.treatmentNotes
            };
          }
          return item;
        });
      } else {
        updatedAssets = updatedAssets.map(asset => {
          if (asset.assetId === itemCode) {
            const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
            const fisc = asset.fiscalQty ?? 0;
            const comodato = asset.comodatoQty ?? 0;
            const recolha = asset.recolhaQty ?? 0;
            const rawDiff = phys - fisc + comodato - recolha;
            isSurplus = rawDiff > 0;
            totalRaw = Math.abs(rawDiff);
            previousTreated = asset.treatedQty || 0;
            finalTreated = Math.min(totalRaw, previousTreated + treatedQtyToAdd);
            itemName = asset.assetName;
            return {
              ...asset,
              treatedQty: finalTreated,
              treatmentNotes: notes ? (asset.treatmentNotes ? `${asset.treatmentNotes} | ${notes}` : notes) : asset.treatmentNotes
            };
          }
          return asset;
        });
      }

      // Check if all surpluses or deficits in the audit are completely resolved
      const hasRemainingProductSurplus = updatedItems.some(i => {
        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
        const fisc = i.fiscalQty ?? 0;
        const raw = phys - fisc;
        return raw > 0 && Math.max(0, raw - (i.treatedQty || 0)) > 0;
      });
      const hasRemainingAssetSurplus = updatedAssets.some(a => {
        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        const fisc = a.fiscalQty ?? 0;
        const comodato = a.comodatoQty ?? 0;
        const recolha = a.recolhaQty ?? 0;
        const raw = phys - fisc + comodato - recolha;
        return raw > 0 && Math.max(0, raw - (a.treatedQty || 0)) > 0;
      });

      const hasRemainingProductDeficit = updatedItems.some(i => {
        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
        const fisc = i.fiscalQty ?? 0;
        const raw = fisc - phys;
        return raw > 0 && Math.max(0, raw - (i.treatedQty || 0)) > 0;
      });
      const hasRemainingAssetDeficit = updatedAssets.some(a => {
        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        const fisc = a.fiscalQty ?? 0;
        const comodato = a.comodatoQty ?? 0;
        const recolha = a.recolhaQty ?? 0;
        const raw = -(phys - fisc + comodato - recolha);
        return raw > 0 && Math.max(0, raw - (a.treatedQty || 0)) > 0;
      });

      const allSurplusesResolved = !hasRemainingProductSurplus && !hasRemainingAssetSurplus;
      const allDeficitsResolved = !hasRemainingProductDeficit && !hasRemainingAssetDeficit;

      const actionText = `Tratamento de ${treatedQtyToAdd} un de [${itemCode}] ${itemName} (${isSurplus ? 'Sobra' : 'Falta'}). Acumulado tratado: ${finalTreated}/${totalRaw}.`;

      return {
        ...audit,
        items: updatedItems,
        assets: updatedAssets,
        surplusActionStatus: (isSurplus && allSurplusesResolved) ? ('baixado_direto' as const) : audit.surplusActionStatus,
        deficitActionStatus: (!isSurplus && allDeficitsResolved) ? ('baixado' as const) : audit.deficitActionStatus,
        history: [
          ...audit.history,
          {
            timestamp: new Date().toISOString(),
            action: 'Tratamento de Divergência Registrado',
            user: currentUser.name,
            details: `${actionText}${notes ? ` Obs: ${notes}` : ''}`
          }
        ]
      };
    });

    onSaveAudits(updated);

    // Clear the input state for this item
    const key = `${auditId}_${itemCode}`;
    setItemTreatmentInputs(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Helper to generate a Vale for a specific audit
  const handleGenerateValeForAudit = (audit: AuditSession): Vale | null => {
    // 1. Calculate items pending deficit
    const itemDeficits = audit.items.filter(i => {
      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
      const fisc = i.fiscalQty ?? 0;
      const rawDiff = fisc - phys;
      const treated = i.treatedQty || 0;
      return rawDiff > 0 && Math.max(0, rawDiff - treated) > 0;
    }).map(i => {
      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
      const fisc = i.fiscalQty ?? 0;
      const rawDiff = fisc - phys;
      const treated = i.treatedQty || 0;
      const pendingQty = Math.max(0, rawDiff - treated);
      const unitPrice = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
      return {
        code: i.productCode,
        description: i.productDescription,
        qty: pendingQty,
        unit: 'cx',
        unitPrice,
        total: pendingQty * unitPrice,
        type: 'PA'
      };
    });

    // 2. Calculate assets pending deficit
    const assetDeficits = audit.assets.filter(a => {
      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
      const fisc = a.fiscalQty ?? 0;
      const comodato = a.comodatoQty ?? 0;
      const recolha = a.recolhaQty ?? 0;
      const rawDiff = -(phys - fisc + comodato - recolha);
      const treated = a.treatedQty || 0;
      return rawDiff > 0 && Math.max(0, rawDiff - treated) > 0;
    }).map(a => {
      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
      const fisc = a.fiscalQty ?? 0;
      const comodato = a.comodatoQty ?? 0;
      const recolha = a.recolhaQty ?? 0;
      const rawDiff = -(phys - fisc + comodato - recolha);
      const treated = a.treatedQty || 0;
      const pendingQty = Math.max(0, rawDiff - treated);
      const unitPrice = a.cost ?? 18.0;
      return {
        code: a.assetId,
        description: a.assetName,
        qty: pendingQty,
        unit: 'un',
        unitPrice,
        total: pendingQty * unitPrice,
        type: 'AG'
      };
    });

    const allDeficits = [...itemDeficits, ...assetDeficits];
    if (allDeficits.length === 0) return null;

    const totalValue = allDeficits.reduce((sum, d) => sum + (d.total || 0), 0);
    const descParts = allDeficits.map(d => `${d.qty} ${d.unit} de [${d.code}] ${d.description} (R$ ${(d.total || 0).toFixed(2)})`);
    const driverName = getDriverName(audit.driverId);

    const novoVale: Vale = {
      id: 'val_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      auditId: audit.id,
      routeMap: audit.routeMap,
      colaboradorId: audit.driverId,
      colaboradorName: driverName,
      colaboradorRole: 'MOTORISTA',
      valor: Number((totalValue || 0).toFixed(2)) || 50.0,
      descricao: `Falta física: ${descParts.join(', ')}. Rota/Mapa: ${audit.routeMap}`,
      dataGeracao: new Date().toISOString().split('T')[0],
      status: 'PENDENTE_ASSINATURA',
      observacao: `Gerado para o motorista ${driverName}. Total apurado na conferência física versus fiscal do mapa ${audit.routeMap}.`
    };

    return novoVale;
  };

  // Helper to handle batch generation of vales
  const handleBatchGenerateVales = (targetAuditIds: string[]) => {
    if (targetAuditIds.length === 0) {
      alert('Selecione ao menos um card de rota/mapa para gerar vales.');
      return;
    }

    const eligibleAudits = audits.filter(a => targetAuditIds.includes(a.id));
    const generatedVales: Vale[] = [];
    const updatedAuditIds: string[] = [];

    eligibleAudits.forEach(audit => {
      // Avoid regenerating if vale already exists for this audit
      const alreadyHasVale = vales.some(v => v.auditId === audit.id || (v.routeMap && v.routeMap.toUpperCase() === audit.routeMap.toUpperCase()));
      if (alreadyHasVale) return;

      const vale = handleGenerateValeForAudit(audit);
      if (vale) {
        generatedVales.push(vale);
        updatedAuditIds.push(audit.id);
      }
    });

    if (generatedVales.length === 0) {
      alert('Nenhum novo vale foi gerado. Os cards selecionados já possuem vales emitidos ou não apresentam faltas físicas.');
      return;
    }

    const totalAmount = generatedVales.reduce((acc, v) => acc + (v.valor || 0), 0);

    // Save Vales
    if (onSaveVales) {
      onSaveVales([...vales, ...generatedVales]);
    }

    // Update Audits deficit status and audit history (keeps surplus status intact!)
    const updatedAudits = audits.map(a => {
      if (updatedAuditIds.includes(a.id)) {
        const relatedVale = generatedVales.find(v => v.auditId === a.id);
        return {
          ...a,
          deficitActionStatus: 'baixado' as const,
          history: [
            ...(a.history || []),
            {
              timestamp: new Date().toISOString(),
              action: 'Vale Financeiro Gerado (Faltas)',
              user: currentUser.name,
              details: `Vale de R$ ${(relatedVale?.valor ?? 0).toFixed(2)} emitido para ${relatedVale?.colaboradorName || 'Motorista'} referente às faltas. Sobras permanecem ativas para tratamento.`
            }
          ]
        };
      }
      return a;
    });

    onSaveAudits(updatedAudits);
    setSelectedDiscrepancyIds([]);

    const hasAuditsWithSurplus = eligibleAudits.some(a => {
      const hasProdSurplus = (a.items || []).some(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0));
      const hasAstSurplus = (a.assets || []).some(ast => {
        const phys = ast.rePhysicalQty !== undefined ? ast.rePhysicalQty : ast.physicalQty;
        const fisc = ast.fiscalQty ?? 0;
        const comodato = ast.comodatoQty ?? 0;
        const recolha = ast.recolhaQty ?? 0;
        return (phys - fisc + comodato - recolha) > 0;
      });
      return hasProdSurplus || hasAstSurplus;
    });

    if (hasAuditsWithSurplus) {
      alert(`✅ Sucesso! ${generatedVales.length} vale(s) gerado(s) para as FALTAS apuradas, totalizando R$ ${(totalAmount || 0).toFixed(2)}.\n\n📌 Lembrete: Os vales foram gerados exclusivamente para as faltas. Os cards com SOBRAS continuam no painel operacional para tratamento de NB, alinhamento de data de entrega ou baixa de sobra.`);
    } else {
      alert(`✅ Sucesso! ${generatedVales.length} vale(s) gerado(s) com sucesso para as faltas, totalizando R$ ${(totalAmount || 0).toFixed(2)}.\n\nOs vales já estão disponíveis na guia "GESTÃO DE VALES".`);
    }
  };

  // Helper to batch Baixa Direta
  const handleBatchBaixaDireta = (targetAuditIds: string[]) => {
    if (targetAuditIds.length === 0) {
      alert('Selecione ao menos um card para dar Baixa Direta.');
      return;
    }

    requestConfirm(
      '❓ Confirmar Baixa Direta em Massa',
      `Deseja realmente realizar a Baixa Direta em todos os ${targetAuditIds.length} cards selecionados?\n\nAs sobras e faltas serão arquivadas diretamente e ficarão salvas no Histórico.`,
      () => {
        const updatedAudits = audits.map(a => {
          if (targetAuditIds.includes(a.id)) {
            return {
              ...a,
              surplusFlowStatus: 'BAIXADO' as const,
              surplusActionStatus: 'baixado_direto' as const,
              deficitActionStatus: 'baixado_direto' as const,
              correctiveActionNotes: 'Baixa direta em lote efetuada pelo gestor/fiscal.',
              history: [
                ...a.history,
                {
                  timestamp: new Date().toISOString(),
                  action: 'Baixa Direta em Massa Realizada',
                  user: currentUser.name,
                  details: 'Baixa direta efetuada via seleção em massa de sobras e faltas.'
                }
              ]
            };
          }
          return a;
        });

        onSaveAudits(updatedAudits);
        setSelectedDiscrepancyIds([]);
        alert(`${targetAuditIds.length} ocorrência(s) baixada(s) com sucesso e arquivada(s) no Histórico!`);
      }
    );
  };

  // Helper to export Vales in Excel (.xlsx)
  const handleExportValesExcel = () => {
    if (vales.length === 0) {
      alert('Não há vales emitidos para exportar.');
      return;
    }

    try {
      const headers = [
        'ID DO VALE',
        'DATA DE EMISSÃO',
        'MAPA DA ROTA',
        'PLACA DO VEÍCULO',
        'NOME DO COLABORADOR',
        'CARGO / FUNÇÃO',
        'VALOR DO DESCONTO (R$)',
        'STATUS DO VALE',
        'DETALHAMENTO DO DESVIO / PRODUTOS',
        'OBSERVAÇÕES GERAIS',
        'DOCUMENTO ASSINADO ANEXADO'
      ];

      const rows = vales.map(vale => {
        const matchingAudit = audits.find(a => a.id === vale.auditId || (vale.routeMap && a.routeMap.toUpperCase() === vale.routeMap.toUpperCase()));
        const plate = matchingAudit?.plate || '-';
        const formattedDate = vale.dataGeracao ? new Date(vale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const statusLabel = vale.status === 'COMPENSADO'
          ? 'Compensado no Financeiro'
          : vale.status === 'ASSINADO'
            ? 'Termo Assinado'
            : 'Pendente de Assinatura';

        return [
          vale.id,
          formattedDate,
          vale.routeMap || 'AVULSO',
          plate,
          vale.colaboradorName,
          vale.colaboradorRole,
          Number((vale.valor || 0).toFixed(2)),
          statusLabel,
          vale.descricao,
          vale.observacao || 'Sem observações adicionais.',
          vale.signedPdfUrl ? 'SIM' : 'NÃO'
        ];
      });

      const worksheetData = [headers, ...rows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Auto-fit column widths
      worksheet['!cols'] = [
        { wch: 18 }, // ID
        { wch: 16 }, // Data
        { wch: 14 }, // Mapa
        { wch: 14 }, // Placa
        { wch: 28 }, // Colaborador
        { wch: 16 }, // Cargo
        { wch: 22 }, // Valor (R$)
        { wch: 26 }, // Status
        { wch: 55 }, // Descricao
        { wch: 45 }, // Observacoes
        { wch: 24 }  // Assinado
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vales de Desvio');

      const currentDate = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `relatorio_gestao_de_vales_pau_brasil_${currentDate}.xlsx`);
    } catch (err: any) {
      console.error('Erro ao exportar vales para Excel:', err);
      alert('Erro ao exportar para Excel: ' + (err?.message || 'Falha desconhecida'));
    }
  };

  // Helper to export Vales in CSV
  const handleExportValesCsv = () => {
    if (vales.length === 0) {
      alert('Não há vales emitidos para exportar.');
      return;
    }

    try {
      const headers = [
        'ID DO VALE',
        'DATA DE EMISSAO',
        'MAPA DA ROTA',
        'PLACA',
        'COLABORADOR',
        'CARGO',
        'VALOR (R$)',
        'STATUS',
        'DESCRICAO',
        'OBSERVACOES',
        'ASSINADO'
      ];

      const rows = vales.map(vale => {
        const matchingAudit = audits.find(a => a.id === vale.auditId || (vale.routeMap && a.routeMap.toUpperCase() === vale.routeMap.toUpperCase()));
        const plate = matchingAudit?.plate || '-';
        const formattedDate = vale.dataGeracao ? new Date(vale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
        const statusLabel = vale.status === 'COMPENSADO'
          ? 'Compensado no Financeiro'
          : vale.status === 'ASSINADO'
            ? 'Termo Assinado'
            : 'Pendente de Assinatura';

        const sanitize = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;

        return [
          sanitize(vale.id),
          sanitize(formattedDate),
          sanitize(vale.routeMap || 'AVULSO'),
          sanitize(plate),
          sanitize(vale.colaboradorName),
          sanitize(vale.colaboradorRole),
          sanitize((vale.valor || 0).toFixed(2)),
          sanitize(statusLabel),
          sanitize(vale.descricao),
          sanitize(vale.observacao || ''),
          sanitize(vale.signedPdfUrl ? 'SIM' : 'NAO')
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_vales_pau_brasil_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Erro ao exportar vales para CSV:', err);
      alert('Erro ao exportar CSV: ' + (err?.message || 'Falha desconhecida'));
    }
  };

  // Filter states for Sobras & Faltas
  const [filterNB, setFilterNB] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sobra' | 'falta'>('all');
  const [subTabDivergencias, setSubTabDivergencias] = useState<'all' | 'pa' | 'ag'>('all');
  const [sobrasViewMode, setSobrasViewMode] = useState<'operacional' | 'master' | 'ranking_dashboard'>('operacional');
  const [valesViewMode, setValesViewMode] = useState<'dashboard' | 'emissao'>('dashboard');
  const [reprovingAuditId, setReprovingAuditId] = useState<string | null>(null);
  const [reprovalObservation, setReprovalObservation] = useState('');
  const [dismissedPopupAuditIds, setDismissedPopupAuditIds] = useState<string[]>([]);

  // Calculate pending surpluses aligned by Monitoramento/Gestor awaiting Auxiliar launch/reproval (1 day before delivery date)
  const pendingSurplusesForAuxiliary = React.useMemo(() => {
    return audits.filter(audit => {
      if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
      
      // Must have NB and Delivery Date aligned
      if (!audit.clientCodeNB || !audit.deliveryDate) return false;
      
      // Must NOT be already sent, launched, closed, or reproved
      if (
        audit.surplusFlowStatus === 'ENVIADO' || 
        audit.surplusFlowStatus === 'BAIXADO' || 
        audit.surplusFlowStatus === 'REPROVADO' ||
        audit.surplusActionStatus === 'enviado_cliente' ||
        audit.surplusActionStatus === 'baixado_direto'
      ) {
        return false;
      }

      // Must not be dismissed in current local session
      if (dismissedPopupAuditIds.includes(audit.id)) return false;

      // Must have surplus items (PA or AG)
      const hasProductSurplus = audit.items.some(i => {
        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
        return phys > (i.fiscalQty ?? 0);
      });
      const hasAssetSurplus = audit.assets.some(a => {
        const idLower = (a.assetId || '').toLowerCase();
        const nameUpper = (a.assetName || '').toUpperCase();
        const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
        if (isChapatex) return false;

        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        return phys > (a.fiscalQty ?? 0);
      });

      if (!hasProductSurplus && !hasAssetSurplus) return false;

      // Delivery date rule: Pop-up triggers 1 day before delivery date or on/after delivery date
      try {
        const [year, month, day] = audit.deliveryDate.split('-').map(Number);
        const deliveryDateVal = new Date(year, month - 1, day).getTime();

        const now = new Date();
        const todayVal = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const oneDayMs = 24 * 60 * 60 * 1000;
        const triggerTimeStart = deliveryDateVal - oneDayMs; // 1 day before

        return todayVal >= triggerTimeStart;
      } catch (err) {
        return false;
      }
    });
  }, [audits, dismissedPopupAuditIds]);
  
  // Vales State and Form States
  const [viewingVale, setViewingVale] = useState<any | null>(null);
  const [valeColaboradorId, setValeColaboradorId] = useState('');
  const [valeRouteMap, setValeRouteMap] = useState('');
  const [valeValeValor, setValeValeValor] = useState('');
  const [valeDescricao, setValeDescricao] = useState('');
  const [valeObservacao, setValeObservacao] = useState('');
  const [uploadingValeId, setUploadingValeId] = useState<string | null>(null);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });

  const confirmCallbackRef = React.useRef<(() => void) | null>(null);

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    confirmCallbackRef.current = onConfirm;
    setConfirmModal({
      isOpen: true,
      title,
      message,
    });
  };
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [activeSessionPhotos, setActiveSessionPhotos] = useState<PhotoRecord[]>([]);
  const [selectedPhotoForPreview, setSelectedPhotoForPreview] = useState<PhotoRecord | null>(null);
  const [selectedPhotoScale, setSelectedPhotoScale] = useState(1);
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Daily Production & Simulated Memory States
  const [dailyProductionDate, setDailyProductionDate] = useState('2026-07-05');
  const [exportingDailyProduction, setExportingDailyProduction] = useState(false);
  const [showMemoryWarning, setShowMemoryWarning] = useState(false);

  React.useEffect(() => {
    let active = true;
    let interval: any = null;

    const load = () => {
      if (activeSession?.id) {
        ImageDB.getPhotosByAudit(activeSession.id)
          .then(res => {
            if (active) setActiveSessionPhotos(res);
          })
          .catch(err => console.error("Erro ao carregar fotos da sessão ativa:", err));
      }
    };

    if (activeSession?.id) {
      load();
    } else {
      setActiveSessionPhotos([]);
    }

    const handlePhotosUpdated = () => {
      load();
    };
    window.addEventListener('logiroute_photos_updated', handlePhotosUpdated);

    return () => {
      active = false;
      window.removeEventListener('logiroute_photos_updated', handlePhotosUpdated);
    };
  }, [activeSession?.id, activeSession?.status, activeSession?.refugos?.length, activeSession?.history?.length]);

  // Synchronize activeSession with updates from parent audits (real-time sync, checking for conflicts)
  React.useEffect(() => {
    if (activeSession) {
      const currentInAudits = audits.find(a => a.id === activeSession.id);
      if (currentInAudits) {
        // Construct a merged version that preserves locally typed fiscal quantities to avoid overwrites
        const mergedItems = currentInAudits.items.map(item => {
          const localItem = activeSession.items.find(i => i.productCode === item.productCode);
          return {
            ...item,
            fiscalQty: localItem && localItem.fiscalQty !== undefined ? localItem.fiscalQty : item.fiscalQty
          };
        });

        const mergedAssets = currentInAudits.assets.map(asset => {
          const localAsset = activeSession.assets.find(a => a.assetId === asset.assetId);
          return {
            ...asset,
            fiscalQty: localAsset && localAsset.fiscalQty !== undefined ? localAsset.fiscalQty : asset.fiscalQty,
            comodatoQty: localAsset && localAsset.comodatoQty !== undefined ? localAsset.comodatoQty : asset.comodatoQty,
            recolhaQty: localAsset && localAsset.recolhaQty !== undefined ? localAsset.recolhaQty : asset.recolhaQty
          };
        });

        const mergedSession: AuditSession = {
          ...currentInAudits,
          items: mergedItems,
          assets: mergedAssets
        };

        if (JSON.stringify(mergedSession) !== JSON.stringify(activeSession)) {
          const hasConflict = currentInAudits.updatedAt && 
                              loadedSessionTime && 
                              currentInAudits.updatedAt !== loadedSessionTime && 
                              currentInAudits.lastUpdatedBy !== currentUser.name;

          if (!hasConflict) {
            setActiveSession(mergedSession);
            // Also keep loadedSessionTime updated if seamlessly merged
            setLoadedSessionTime(currentInAudits.updatedAt);
          }
        }
      }
    }
  }, [audits, activeSession?.id, loadedSessionTime, currentUser.name]);
  
  // Date and state for Route Import
  const [routeImportDate, setRouteImportDate] = useState(() => {
    if (importedRoutes && importedRoutes.length > 0) {
      const dates = Array.from(new Set(importedRoutes.map(r => r.routeDate).filter(Boolean))).sort().reverse();
      const today = new Date().toISOString().split('T')[0];
      if (dates.includes(today)) return today;
      if (dates.length > 0) return dates[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  // Automatically adjust routeImportDate when importedRoutes loads or changes if active date has 0 maps
  React.useEffect(() => {
    if (importedRoutes && importedRoutes.length > 0) {
      const activeCount = importedRoutes.filter(r => r.routeDate === routeImportDate).length;
      if (activeCount === 0) {
        const dates = Array.from(new Set(importedRoutes.map(r => r.routeDate).filter(Boolean))).sort().reverse();
        const today = new Date().toISOString().split('T')[0];
        if (dates.includes(today)) {
          setRouteImportDate(today);
        } else if (dates.length > 0) {
          setRouteImportDate(dates[0]);
        }
      }
    }
  }, [importedRoutes, routeImportDate]);

  // Auto-assign and balance circular blitz routes (exactly 2 per day, swapping out pernoite vehicles)
  React.useEffect(() => {
    if (!importedRoutes || importedRoutes.length === 0 || !onSaveImportedRoutes) return;
    
    // Find routes of the active date
    const routesForActiveDate = importedRoutes.filter(r => 
      r.routeDate === routeImportDate || 
      (!r.routeDate && r.importedAt && r.importedAt.startsWith(routeImportDate))
    );
    if (routesForActiveDate.length === 0) return;

    // Identify distinct pernoite plates (tripStatus === 'pernoitam')
    const pernoitePlates = new Set(
      (returnForecasts || [])
        .filter(f => isForecastActivePernoite(f, audits, importedRoutes))
        .map(f => f.plate.trim().toUpperCase())
    );

    // Find routes that are currently marked as blitz
    const currentBlitzRoutes = routesForActiveDate.filter(r => r.isBlitz);
    
    // Check if any current blitz route is on a pernoite vehicle, or if we don't have exactly 2 blitzes
    const hasPernoiteInBlitz = currentBlitzRoutes.some(r => r.plate && pernoitePlates.has(r.plate.trim().toUpperCase()));
    const needsRecalculation = currentBlitzRoutes.length !== 2 || hasPernoiteInBlitz;

    if (needsRecalculation) {
      // Choose exactly 2 circular blitz routes, avoiding pernoite plates
      const blitzMaps = selectCircularBlitzRoutes(routesForActiveDate, returnForecasts, currentBlitzRoutes, audits);
      const updated = importedRoutes.map(r => {
        const isThisDate = r.routeDate === routeImportDate || (!r.routeDate && r.importedAt && r.importedAt.startsWith(routeImportDate));
        if (isThisDate) {
          const shouldBeBlitz = blitzMaps.includes(r.routeMap);
          if (r.isBlitz !== shouldBeBlitz) {
            return { ...r, isBlitz: shouldBeBlitz };
          }
        }
        return r;
      });

      // Avoid infinite update loops by checking if there is any actual difference in isBlitz flags
      const isDifferent = updated.some((r, idx) => r.isBlitz !== importedRoutes[idx].isBlitz);
      if (isDifferent) {
        onSaveImportedRoutes(updated);
        if (isClientFirebaseActive()) {
          saveDirectlyToFirestore({ importedRoutes: updated });
        }
      }
    }
  }, [importedRoutes, routeImportDate, returnForecasts, audits, onSaveImportedRoutes]);

  // Retroactively align driverIds of imported routes with the registered drivers on the platform
  React.useEffect(() => {
    if (!importedRoutes || importedRoutes.length === 0 || !onSaveImportedRoutes || !drivers || drivers.length === 0) return;

    let hasChanges = false;
    const updatedRoutes = importedRoutes.map(route => {
      // If the route has a driverId, but it is NOT an exact match of any driver.id and is not 'temporario'
      if (route.driverId && route.driverId !== 'temporario') {
        const exactDriver = drivers.find(d => d.id === route.driverId);
        if (!exactDriver) {
          // Try to match it using our robust matching logic
          const matchedId = matchDriverFromColumnValue(route.driverId, drivers);
          if (matchedId && matchedId !== route.driverId) {
            hasChanges = true;
            return { ...route, driverId: matchedId };
          }
        }
      }
      return route;
    });

    if (hasChanges) {
      onSaveImportedRoutes(updatedRoutes);
    }
  }, [importedRoutes, drivers, onSaveImportedRoutes]);

  const [isDragOver, setIsDragOver] = useState(false);
  const [isMergeMode, setIsMergeMode] = useState(true);

  // States for manual map insertion
  const [manualMap, setManualMap] = useState('');
  const [manualPlate, setManualPlate] = useState('');
  const [manualDate, setManualDate] = useState(routeImportDate);
  const [manualDriverId, setManualDriverId] = useState('');

  React.useEffect(() => {
    setManualDate(routeImportDate);
  }, [routeImportDate]);

  // States for History dashboard & search
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [selectedHistoryAudit, setSelectedHistoryAudit] = useState<AuditSession | null>(null);
  const [reopeningJustificationText, setReopeningJustificationText] = useState('');

  // Custom platform reset modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetConfirmText, setResetConfirmText] = useState('');

  // Backup PDF states
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupPhotos, setBackupPhotos] = useState<any[]>([]);
  const [loadingBackupPhotos, setLoadingBackupPhotos] = useState(false);
  const [backupMonthFilter, setBackupMonthFilter] = useState('all');
  const [backupStatusFilter, setBackupStatusFilter] = useState('all');

  const handleFileImport = (file: File, isMerge: boolean = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("O arquivo importado está vazio ou não possui cabeçalhos.");
        return;
      }

      // Detect separator and parse headers
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      
      let mapIndex = headers.findIndex(h => h.includes('mapa') || h.includes('nro do mapa') || h.includes('nro. do mapa') || h.includes('número do mapa') || h.includes('numero do mapa') || h.includes('cod.mapa') || h.includes('cód.mapa'));
      let plateIndex = headers.findIndex(h => h.includes('placa') || h.includes('veiculo') || h.includes('veículo') || h.includes('cod.veiculo') || h.includes('placa do veículo'));
      let driverIndex = headers.findIndex(h => h.includes('motorista') || h.includes('condutor') || h.includes('matricula') || h.includes('matr') || h.includes('nome do motorista') || h.includes('cód.motorista') || h.includes('cod.motorista'));

      // Fallback index-based coordinates (G, M, O) if headers not found
      if (mapIndex === -1) mapIndex = 6;
      if (plateIndex === -1) plateIndex = 12;
      if (driverIndex === -1) driverIndex = 14;

      const parsedRoutes: ImportedRoute[] = [];
      const currentDrivers = [...drivers];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const cols = splitCsvLine(row, sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length <= Math.max(mapIndex, plateIndex)) continue;

        const rawMapCode = cols[mapIndex] || '';
        const mapCode = rawMapCode.trim().replace(/^0+/, '');
        const rawPlate = cols[plateIndex] || '';
        const plateClean = rawPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (!mapCode) continue;

        // Discard route map if both Column L (index 11) and Column M (index 12 / plateIndex) are empty.
        // ONLY perform this check if we are using the fallback 15-column Pau Brasil spreadsheet format (where mapIndex is 6, plateIndex is 12)
        // and columns 11 and 12 actually exist in the parsed row.
        if (mapIndex === 6 && plateIndex === 12 && cols.length > 12) {
          const colL = cols[11] ? cols[11].trim() : '';
          const colM = cols[12] ? cols[12].trim() : '';
          if (!colL && !colM) {
            continue;
          }
        }

        // Gather candidate values for driver matching (O is Column 14, driverIndex is matched header)
        const candidateValues: string[] = [];
        const colOVal = cols[14] ? cols[14].trim() : '';
        if (colOVal) candidateValues.push(colOVal);
        const colDriverVal = (driverIndex !== -1 && cols[driverIndex]) ? cols[driverIndex].trim() : '';
        if (colDriverVal && colDriverVal !== colOVal) {
          candidateValues.push(colDriverVal);
        }

        let matchedDriverId = '';

        for (const val of candidateValues) {
          const matched = matchDriverFromColumnValue(val, currentDrivers);
          if (matched) {
            matchedDriverId = matched;
            break;
          }
        }

        // Avoid duplicate route maps in this file import
        if (parsedRoutes.some(r => r.routeMap.trim().toUpperCase() === mapCode.trim().toUpperCase())) {
          continue;
        }

        const nowISO = new Date().toISOString();
        parsedRoutes.push({
          id: `imp_${Date.now()}_csv_${i}_${Math.floor(Math.random() * 1000)}`,
          routeMap: mapCode,
          plate: plateClean,
          driverId: matchedDriverId,
          routeDate: routeImportDate,
          status: 'pendente' as const,
          importedAt: nowISO,
          updatedAt: nowISO,
          itemsCount: 0,
          items: []
        });
      }

      if (parsedRoutes.length === 0) {
        alert("Não foi possível identificar nenhuma rota ou mapa válido no arquivo. Verifique as colunas de Mapa (G) e Placa (M).");
        return;
      }

      const nowISO = new Date().toISOString();
      let mergedRoutes = [...importedRoutes];
      if (isMerge) {
        // Merge mode
        parsedRoutes.forEach(newR => {
          const existingIdx = mergedRoutes.findIndex(r => r.routeMap.trim().toUpperCase() === newR.routeMap.trim().toUpperCase() && (r.routeDate || '') === (newR.routeDate || ''));
          if (existingIdx >= 0) {
            const currentRoute = mergedRoutes[existingIdx];
            const isPendente = currentRoute.status === 'pendente';
            mergedRoutes[existingIdx] = {
              ...currentRoute,
              plate: newR.plate || currentRoute.plate,
              driverId: newR.driverId || currentRoute.driverId,
              itemsCount: isPendente ? 0 : currentRoute.itemsCount,
              items: isPendente ? [] : currentRoute.items,
              updatedAt: nowISO
            };
          } else {
            mergedRoutes.push(newR);
          }
        });
      } else {
        // Standard overwrite if same routeMap and routeDate
        parsedRoutes.forEach(newR => {
          const duplicateIdx = mergedRoutes.findIndex(r => r.routeMap.trim().toUpperCase() === newR.routeMap.trim().toUpperCase() && r.routeDate === newR.routeDate);
          if (duplicateIdx >= 0) {
            const currentRoute = mergedRoutes[duplicateIdx];
            const isPendente = currentRoute.status === 'pendente';
            mergedRoutes[duplicateIdx] = {
              ...currentRoute,
              plate: newR.plate || currentRoute.plate,
              driverId: newR.driverId || currentRoute.driverId,
              itemsCount: isPendente ? 0 : currentRoute.itemsCount,
              items: isPendente ? [] : currentRoute.items,
              updatedAt: nowISO
            };
          } else {
            mergedRoutes.push(newR);
          }
        });
      }

      // Automatically assign circular Blitz de Refugo (2x) to imported routes for active date
      const activeDateRoutes = mergedRoutes.filter(r => 
        r.routeDate === routeImportDate || 
        (!r.routeDate && r.importedAt && r.importedAt.startsWith(routeImportDate))
      );
      const currentBlitz = activeDateRoutes.filter(r => r.isBlitz);
      const drawnBlitzMaps = selectCircularBlitzRoutes(activeDateRoutes, returnForecasts, currentBlitz, audits);

      mergedRoutes = mergedRoutes.map(r => {
        const isThisDate = r.routeDate === routeImportDate || (!r.routeDate && r.importedAt && r.importedAt.startsWith(routeImportDate));
        if (isThisDate) {
          return { ...r, isBlitz: drawnBlitzMaps.includes(r.routeMap) };
        }
        return r;
      });

      if (onSaveImportedRoutes) {
        onSaveImportedRoutes(mergedRoutes);
      }
      if (isClientFirebaseActive()) {
        saveDirectlyToFirestore({ importedRoutes: mergedRoutes });
      }

      // Sync forecast driver names
      if (onSaveForecasts && returnForecasts.length > 0) {
        const updatedForecasts = returnForecasts.map(f => {
          const matchedRoute = mergedRoutes.find(r => r.routeMap.toUpperCase() === f.routeMap.toUpperCase());
          if (matchedRoute) {
            const dObj = currentDrivers.find(d => d.id === matchedRoute.driverId);
            return dObj ? { ...f, driverName: dObj.name } : f;
          }
          return f;
        });
        onSaveForecasts(updatedForecasts);
      }

      alert(`Sucesso! ${isMerge ? 'Mesclados' : 'Importados'} ${parsedRoutes.length} mapas para a data ${new Date(routeImportDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
    };
    reader.readAsText(file);
  };

  const handleForceRecalculateBlitz = () => {
    const routesForActiveDate = importedRoutes.filter(r => 
      r.routeDate === routeImportDate || 
      (!r.routeDate && r.importedAt && r.importedAt.startsWith(routeImportDate))
    );
    if (routesForActiveDate.length === 0) {
      alert(`Nenhum mapa importado para a data ${routeImportDate}. Importe os mapas via arquivo 03.11.49.02 primeiro.`);
      return;
    }

    // Run circular blitz selection ignoring current selections
    const blitzMaps = selectCircularBlitzRoutes(routesForActiveDate, returnForecasts, [], audits);
    const updated = importedRoutes.map(r => {
      const isThisDate = r.routeDate === routeImportDate || (!r.routeDate && r.importedAt && r.importedAt.startsWith(routeImportDate));
      if (isThisDate) {
        return { ...r, isBlitz: blitzMaps.includes(r.routeMap) };
      }
      return r;
    });

    if (onSaveImportedRoutes) {
      onSaveImportedRoutes(updated);
    }
    if (isClientFirebaseActive()) {
      saveDirectlyToFirestore({ importedRoutes: updated });
    }

    const blitzDetails = routesForActiveDate
      .filter(r => blitzMaps.includes(r.routeMap))
      .map(r => `• Mapa: ${r.routeMap} - Placa: ${r.plate || 'S/P'}`)
      .join('\n');

    alert(`⚡ Sorteio Circular de Blitz de Refugo Realizado com Sucesso!\n\nVeículos sorteados para Blitz (${blitzMaps.length} de 2):\n${blitzDetails || 'Nenhum'}`);
  };

  const handleManualMapSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMap.trim()) {
      alert("Por favor, insira o número do mapa.");
      return;
    }
    if (!manualPlate.trim()) {
      alert("Por favor, insira a placa do veículo.");
      return;
    }
    if (!manualDate) {
      alert("Por favor, insira a data do mapa.");
      return;
    }

    const mapClean = manualMap.trim().replace(/^0+/, '');
    const plateClean = manualPlate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Check if map already exists
    const mapExists = importedRoutes.some(r => r.routeMap.toUpperCase() === mapClean.toUpperCase() && r.routeDate === manualDate);
    if (mapExists) {
      alert(`O mapa ${mapClean} já está cadastrado para a data ${new Date(manualDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
      return;
    }

    const initialRouteItems = (products || []).map(prod => ({
      productCode: prod.code,
      productDescription: prod.description,
      qty: 0,
      unit: 'UN' as const
    }));

    const nowISO = new Date().toISOString();
    const newRoute: ImportedRoute = {
      id: `imp_manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      routeMap: mapClean,
      plate: plateClean,
      driverId: manualDriverId || '',
      routeDate: manualDate,
      status: 'pendente' as const,
      importedAt: nowISO,
      updatedAt: nowISO,
      itemsCount: initialRouteItems.length,
      items: initialRouteItems
    };

    if (onSaveImportedRoutes) {
      onSaveImportedRoutes([...importedRoutes, newRoute]);
    }

    alert(`Sucesso! Mapa ${mapClean} inserido manualmente.`);
    setManualMap('');
    setManualPlate('');
    setManualDriverId('');
  };

  const handleDriverImport = (file: File) => {
    // Legacy support, deprecated since we import maps, plates and drivers simultaneously.
    alert("Para importar os motoristas, por favor use o campo unificado de Importação de Rotas.");
  };

  const handleImportRoutesClick = () => {
    const userDate = prompt("Qual a data da rota? (Atenção para fins de semana)", routeImportDate);
    if (!userDate) return;

    // Create 3 new imported routes for that date
    const suffix = Math.floor(Math.random() * 900 + 100);
    const newRoutes: ImportedRoute[] = [
      {
        id: `imp_${Date.now()}_1`,
        routeMap: `MAPA-ROTA-${suffix}A`,
        plate: 'SLB3J76',
        driverId: 'drv_1',
        routeDate: userDate,
        status: 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 8,
        items: [
          { productCode: 'P01', productDescription: 'Spaten 350ml', qty: 24, unit: 'UN' },
          { productCode: 'P02', productDescription: 'Corona Extra 330ml', qty: 12, unit: 'UN' },
          { productCode: 'P03', productDescription: 'Stella Artois 330ml', qty: 48, unit: 'UN' }
        ]
      },
      {
        id: `imp_${Date.now()}_2`,
        routeMap: `MAPA-ROTA-${suffix}B`,
        plate: 'TOU7F39',
        driverId: 'drv_2',
        routeDate: userDate,
        status: 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 12,
        items: [
          { productCode: 'P04', productDescription: 'Budweiser 330ml', qty: 36, unit: 'UN' },
          { productCode: 'P05', productDescription: 'Becks LN 275ml', qty: 24, unit: 'UN' }
        ]
      },
      {
        id: `imp_${Date.now()}_3`,
        routeMap: `MAPA-ROTA-${suffix}C`,
        plate: 'SLB4A56',
        driverId: 'drv_3',
        routeDate: userDate,
        status: 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 6,
        items: [
          { productCode: 'P06', productDescription: 'Spaten Lata 350ml', qty: 120, unit: 'UN' },
          { productCode: 'P07', productDescription: 'Budweiser Lata 350ml', qty: 72, unit: 'UN' }
        ]
      }
    ];

    if (onSaveImportedRoutes) {
      onSaveImportedRoutes([...importedRoutes, ...newRoutes]);
      alert(`Sucesso! 3 novos mapas de rota foram importados para a data ${new Date(userDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
    }
  };
  
  // History search / filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'divergentes' | 'reabertos'>('all');

  // Pre-indexed map for drivers lookups
  const driversMap = React.useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach(d => {
      if (d.id && d.name) map.set(d.id, d.name);
    });
    return map;
  }, [drivers]);

  const getDriverName = React.useCallback((id: string) => {
    if (!id) return 'Não Selecionado';
    return resolveRegisteredDriver(id, undefined, drivers).name;
  }, [drivers]);

  const getHelperName = React.useCallback((id?: string) => {
    if (!id) return 'Sem ajudante';
    return resolveRegisteredDriver(id, 'helper', drivers).name;
  }, [drivers]);

  // Pending for fiscal verification (filtering out maps that are already closed or downloaded)
  const pendingAudits = React.useMemo(() => {
    return audits.filter(a => {
      // If reopening was requested by fiscal/conferente, keep in pending so fiscal can re-reconcile
      if (a.reopeningRequested) return true;

      // If PDF was downloaded or status is already finalized or surplus status is BAIXADO
      if (a.pdfDownloaded || a.surplusFlowStatus === 'BAIXADO') return false;
      if (a.status === 'finalizado_ok' || a.status === 'finalizado_divergente') return false;

      // Must be in conferido_fisico or recontagem_finalizada
      if (a.status !== 'conferido_fisico' && a.status !== 'recontagem_finalizada') return false;

      // Check if matching route or another audit for this map is already closed/finalized
      const normMap = normalizeMapCode(a.routeMap).toUpperCase();
      const upperMap = a.routeMap.trim().toUpperCase();

      // Fast O(1) check if importedRoute is already closed
      if (closedImportedRouteMapsSet.has(normMap) || closedImportedRouteMapsSet.has(upperMap)) {
        return false;
      }

      return true;
    });
  }, [audits, closedImportedRouteMapsSet]);

  // History audits (finished today or reopened)
  const historyAudits = React.useMemo(() => {
    return audits.filter(a => 
      a.status === 'finalizado_ok' || 
      a.status === 'finalizado_divergente' ||
      a.history?.some(h => h.action.includes('Reabertura Aprovada') || h.action.includes('Reaberto'))
    );
  }, [audits]);

  // Unacknowledged baixas for financeiro (Aguardando Fechamento Promax)
  const unacknowledgedBaixas = React.useMemo(() => {
    return audits.filter(a => 
      (a.status === 'finalizado_ok' || a.status === 'finalizado_divergente') && 
      a.financeiroCiente !== true
    );
  }, [audits]);

  const getDaysOnRoute = (audit: AuditSession) => {
    const allMaps = [audit.routeMap, ...(audit.unifiedMaps || [])];
    let earliestRouteDate: string | null = null;

    allMaps.forEach(mapStr => {
      const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === mapStr.trim().toUpperCase());
      if (matchingRoute && matchingRoute.routeDate) {
        if (!earliestRouteDate || matchingRoute.routeDate < earliestRouteDate) {
          earliestRouteDate = matchingRoute.routeDate;
        }
      }
    });

    if (!earliestRouteDate || !audit.arrivalDate) return null;

    try {
      const startDate = new Date(earliestRouteDate + 'T00:00:00');
      const endDate = new Date(audit.arrivalDate + 'T00:00:00');
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    } catch (e) {
      return null;
    }
  };

  interface ExportRecord {
    map: string;
    plate: string;
    driverName: string;
    arrivalDate: string;
    type: 'PA' | 'AG';
    itemDescription: string;
    deviationType: 'SOBRA' | 'FALTA';
    fiscalQty: number;
    physicalQty: number;
    divergence: number;
    status: string;
  }

  const getUnresolvedDiscrepancyRecords = (): ExportRecord[] => {
    const discrepantAudits = audits.filter(audit => {
      const hasProductDiff = audit.items.some(item => {
        const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        return phys !== (item.fiscalQty ?? 0);
      });
      const hasAssetDiff = audit.assets.some(asset => {
        const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        const fisc = asset.fiscalQty ?? 0;
        const comodato = asset.comodatoQty ?? 0;
        const recolha = asset.recolhaQty ?? 0;
        return phys !== (fisc - comodato + recolha);
      });

      const hasProductSurplus = audit.items.some(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0));
      const hasAssetSurplus = audit.assets.some(a => {
        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        const fisc = a.fiscalQty ?? 0;
        const comodato = a.comodatoQty ?? 0;
        const recolha = a.recolhaQty ?? 0;
        return (phys - fisc + comodato - recolha) > 0;
      });
      const hasSurplus = hasProductSurplus || hasAssetSurplus;

      const hasProductDeficit = audit.items.some(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) < (i.fiscalQty ?? 0));
      const hasAssetDeficit = audit.assets.some(a => {
        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        const fisc = a.fiscalQty ?? 0;
        const comodato = a.comodatoQty ?? 0;
        const recolha = a.recolhaQty ?? 0;
        return (phys - fisc + comodato - recolha) < 0;
      });
      const hasDeficit = hasProductDeficit || hasAssetDeficit;

      const unresolvedSurplus = hasSurplus && !(
        audit.surplusFlowStatus === 'ENVIADO' || 
        audit.surplusFlowStatus === 'BAIXADO' || 
        audit.surplusActionStatus === 'baixado_direto' ||
        audit.surplusActionStatus === 'enviado_cliente'
      );

      const unresolvedDeficit = hasDeficit && !(
        audit.deficitActionStatus === 'baixado_direto' ||
        vales.some(v => v.auditId === audit.id)
      );

      if (!unresolvedSurplus && !unresolvedDeficit) {
        return false;
      }
      
      if (subTabDivergencias === 'pa') return hasProductDiff;
      if (subTabDivergencias === 'ag') return hasAssetDiff;
      return hasProductDiff || hasAssetDiff;
    });

    const filteredAudits = discrepantAudits.filter(audit => {
      if (filterNB.trim()) {
        const nbQuery = filterNB.trim().toLowerCase();
        const hasMatchedNB = (audit.clientCodeNB || '').toLowerCase().includes(nbQuery) ||
          audit.routeMap.toLowerCase().includes(nbQuery) ||
          audit.plate.toLowerCase().includes(nbQuery);
        if (!hasMatchedNB) return false;
      }

      if (filterDate) {
        const normFilter = normalizeDateToYMD(filterDate);
        const normArrival = normalizeDateToYMD(audit.arrivalDate || (audit as any).routeDate || audit.startTime);
        const normDelivery = normalizeDateToYMD(audit.deliveryDate);
        const matchesDate = normArrival === normFilter || normDelivery === normFilter;
        if (!matchesDate) return false;
      }

      if (filterType !== 'all') {
        const hasSurplus = audit.items.some(i => {
          const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
          return phys > (i.fiscalQty ?? 0);
        }) || audit.assets.some(a => {
          const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
          const fisc = a.fiscalQty ?? 0;
          const comodato = a.comodatoQty ?? 0;
          const recolha = a.recolhaQty ?? 0;
          return (phys - fisc + comodato - recolha) > 0;
        });

        const hasDeficit = audit.items.some(i => {
          const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
          return phys < (i.fiscalQty ?? 0);
        }) || audit.assets.some(a => {
          const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
          const fisc = a.fiscalQty ?? 0;
          const comodato = a.comodatoQty ?? 0;
          const recolha = a.recolhaQty ?? 0;
          return (phys - fisc + comodato - recolha) < 0;
        });

        if (filterType === 'sobra' && !hasSurplus) return false;
        if (filterType === 'falta' && !hasDeficit) return false;
      }

      return true;
    });

    const records: ExportRecord[] = [];

    filteredAudits.forEach(audit => {
      const driverName = getDriverName(audit.driverId);
      
      const hasProductSurplus = audit.items.some(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0));
      const hasAssetSurplus = audit.assets.some(a => {
        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        const fisc = a.fiscalQty ?? 0;
        const comodato = a.comodatoQty ?? 0;
        const recolha = a.recolhaQty ?? 0;
        return (phys - fisc + comodato - recolha) > 0;
      });
      const hasSurplus = hasProductSurplus || hasAssetSurplus;

      const hasProductDeficit = audit.items.some(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) < (i.fiscalQty ?? 0));
      const hasAssetDeficit = audit.assets.some(a => {
        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
        const fisc = a.fiscalQty ?? 0;
        const comodato = a.comodatoQty ?? 0;
        const recolha = a.recolhaQty ?? 0;
        return (phys - fisc + comodato - recolha) < 0;
      });
      const hasDeficit = hasProductDeficit || hasAssetDeficit;

      const unresolvedSurplus = hasSurplus && !(
        audit.surplusFlowStatus === 'ENVIADO' || 
        audit.surplusFlowStatus === 'BAIXADO' || 
        audit.surplusActionStatus === 'baixado_direto' ||
        audit.surplusActionStatus === 'enviado_cliente'
      );

      const unresolvedDeficit = hasDeficit && !(
        audit.deficitActionStatus === 'baixado_direto' ||
        vales.some(v => v.auditId === audit.id)
      );

      if (subTabDivergencias === 'pa' || subTabDivergencias === 'all') {
        audit.items.forEach(item => {
          const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
          const fisc = item.fiscalQty ?? 0;
          const diff = phys - fisc;

          if (diff > 0 && unresolvedSurplus && (filterType === 'all' || filterType === 'sobra')) {
            records.push({
              map: audit.routeMap,
              plate: audit.plate,
              driverName,
              arrivalDate: audit.arrivalDate,
              type: 'PA',
              itemDescription: item.productDescription,
              deviationType: 'SOBRA',
              fiscalQty: fisc,
              physicalQty: phys,
              divergence: diff,
              status: 'Sobra não tratada'
            });
          } else if (diff < 0 && unresolvedDeficit && (filterType === 'all' || filterType === 'falta')) {
            records.push({
              map: audit.routeMap,
              plate: audit.plate,
              driverName,
              arrivalDate: audit.arrivalDate,
              type: 'PA',
              itemDescription: item.productDescription,
              deviationType: 'FALTA',
              fiscalQty: fisc,
              physicalQty: phys,
              divergence: diff,
              status: 'Falta não tratada'
            });
          }
        });
      }

      if (subTabDivergencias === 'ag' || subTabDivergencias === 'all') {
        audit.assets.forEach(asset => {
          const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
          const fisc = asset.fiscalQty ?? 0;
          const comodato = asset.comodatoQty ?? 0;
          const recolha = asset.recolhaQty ?? 0;
          const fiscExpected = fisc - comodato + recolha;
          const diff = phys - fiscExpected;

          if (diff > 0 && unresolvedSurplus && (filterType === 'all' || filterType === 'sobra')) {
            records.push({
              map: audit.routeMap,
              plate: audit.plate,
              driverName,
              arrivalDate: audit.arrivalDate,
              type: 'AG',
              itemDescription: asset.assetName,
              deviationType: 'SOBRA',
              fiscalQty: fiscExpected,
              physicalQty: phys,
              divergence: diff,
              status: 'Sobra não tratada'
            });
          } else if (diff < 0 && unresolvedDeficit && (filterType === 'all' || filterType === 'falta')) {
            records.push({
              map: audit.routeMap,
              plate: audit.plate,
              driverName,
              arrivalDate: audit.arrivalDate,
              type: 'AG',
              itemDescription: asset.assetName,
              deviationType: 'FALTA',
              fiscalQty: fiscExpected,
              physicalQty: phys,
              divergence: diff,
              status: 'Falta não tratada'
            });
          }
        });
      }
    });

    return records;
  };

  interface GroupedSummary {
    itemDescription: string;
    type: 'PA' | 'AG';
    fiscalQtySum: number;
    physicalQtySum: number;
    divergenceSum: number;
  }

  const escapeXml = (unsafe: string) => {
    if (!unsafe) return '';
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  };

  const exportToExcel = () => {
    const records = getUnresolvedDiscrepancyRecords();
    if (records.length === 0) {
      alert("Nenhum item com sobras ou faltas pendentes encontrado para exportação.");
      return;
    }

    // Prepare grouped summary data (tabela dinâmica de itens)
    const groupedMap: { [key: string]: GroupedSummary } = {};
    records.forEach(r => {
      const key = `${r.type}_${r.itemDescription}`;
      if (!groupedMap[key]) {
        groupedMap[key] = {
          itemDescription: r.itemDescription,
          type: r.type,
          fiscalQtySum: 0,
          physicalQtySum: 0,
          divergenceSum: 0
        };
      }
      groupedMap[key].fiscalQtySum += r.fiscalQty;
      groupedMap[key].physicalQtySum += r.physicalQty;
      groupedMap[key].divergenceSum += r.divergence;
    });
    const summaryRows = Object.values(groupedMap);

    // Build Excel XML Spreadsheet 2003 with multiple worksheets
    let xml = `<?xml version="1.0" encoding="utf-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Pau Brasil</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#334155"/>
  </Style>
  <Style ss:ID="Title">
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="13" ss:Color="#0F172A" ss:Bold="1"/>
   <Alignment ss:Vertical="Center" ss:Horizontal="Left" ss:WrapText="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Header">
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
  </Style>
  <Style ss:ID="Editable">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F59E0B"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F59E0B"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F59E0B"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F59E0B"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B" ss:Italic="1"/>
  </Style>
  <Style ss:ID="Sobra">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#16A34A" ss:Bold="1"/>
  </Style>
  <Style ss:ID="Falta">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#DC2626" ss:Bold="1"/>
  </Style>
  <Style ss:ID="SobraNumero">
   <Alignment ss:Vertical="Center" ss:Horizontal="Right" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#16A34A" ss:Bold="1"/>
   <NumberFormat ss:Format="General"/>
  </Style>
  <Style ss:ID="FaltaNumero">
   <Alignment ss:Vertical="Center" ss:Horizontal="Right" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#DC2626" ss:Bold="1"/>
   <NumberFormat ss:Format="General"/>
  </Style>
  <Style ss:ID="NumeroPadrao">
   <Alignment ss:Vertical="Center" ss:Horizontal="Right" ss:WrapText="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Segoe UI" x:Family="Swiss" ss:Size="10" ss:Color="#334155"/>
   <NumberFormat ss:Format="General"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Divergencias Detalhadas">
  <Table>
   <Column ss:Width="70"/>
   <Column ss:Width="70"/>
   <Column ss:Width="130"/>
   <Column ss:Width="80"/>
   <Column ss:Width="50"/>
   <Column ss:Width="200"/>
   <Column ss:Width="70"/>
   <Column ss:Width="75"/>
   <Column ss:Width="75"/>
   <Column ss:Width="75"/>
   <Column ss:Width="100"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="12" ss:StyleID="Title"><Data ss:Type="String">   DIVERGÊNCIAS DETALHADAS (SOBRAS E FALTAS NÃO TRATADAS)</Data></Cell>
   </Row>
   <Row ss:Height="22" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Mapa</Data></Cell>
    <Cell><Data ss:Type="String">Placa</Data></Cell>
    <Cell><Data ss:Type="String">Motorista</Data></Cell>
    <Cell><Data ss:Type="String">Data Chegada</Data></Cell>
    <Cell><Data ss:Type="String">Tipo Item</Data></Cell>
    <Cell><Data ss:Type="String">Item / Descrição</Data></Cell>
    <Cell><Data ss:Type="String">Tipo de Desvio</Data></Cell>
    <Cell><Data ss:Type="String">Saldo Fiscal</Data></Cell>
    <Cell><Data ss:Type="String">Saldo Físico</Data></Cell>
    <Cell><Data ss:Type="String">Divergência</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Justificativa (Editável)</Data></Cell>
    <Cell><Data ss:Type="String">Ação Tomada (Editável)</Data></Cell>
   </Row>`;

    records.forEach(r => {
      const formattedDate = r.arrivalDate ? new Date(r.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';
      xml += `
   <Row ss:AutoFitHeight="1">
    <Cell><Data ss:Type="String">${escapeXml(r.map)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.plate)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.driverName)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.type)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.itemDescription)}</Data></Cell>
    <Cell ss:StyleID="${r.deviationType === 'SOBRA' ? 'Sobra' : 'Falta'}"><Data ss:Type="String">${r.deviationType}</Data></Cell>
    <Cell ss:StyleID="NumeroPadrao"><Data ss:Type="Number">${r.fiscalQty}</Data></Cell>
    <Cell ss:StyleID="NumeroPadrao"><Data ss:Type="Number">${r.physicalQty}</Data></Cell>
    <Cell ss:StyleID="${r.divergence > 0 ? 'SobraNumero' : 'FaltaNumero'}"><Data ss:Type="Number">${r.divergence}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(r.status)}</Data></Cell>
    <Cell ss:StyleID="Editable"><Data ss:Type="String"></Data></Cell>
    <Cell ss:StyleID="Editable"><Data ss:Type="String"></Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Consolidado por Item">
  <Table>
   <Column ss:Width="200"/>
   <Column ss:Width="80"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Row ss:Height="26">
    <Cell ss:MergeAcross="5" ss:StyleID="Title"><Data ss:Type="String">   RESUMO CONSOLIDADO DE DIVERGÊNCIAS (TABELA DINÂMICA DOS ITENS)</Data></Cell>
   </Row>
   <Row ss:Height="22" ss:StyleID="Header">
    <Cell><Data ss:Type="String">Item / Descrição</Data></Cell>
    <Cell><Data ss:Type="String">Tipo Item</Data></Cell>
    <Cell><Data ss:Type="String">Soma de Saldo Fiscal</Data></Cell>
    <Cell><Data ss:Type="String">Soma de Saldo Físico</Data></Cell>
    <Cell><Data ss:Type="String">Soma de Divergência</Data></Cell>
    <Cell><Data ss:Type="String">Status do Item</Data></Cell>
   </Row>`;

    summaryRows.forEach(sr => {
      const statusLabel = sr.divergenceSum > 0 ? 'SOBRA CONSOLIDADA' : 'FALTA CONSOLIDADA';
      const statusStyle = sr.divergenceSum > 0 ? 'Sobra' : 'Falta';
      const statusNumStyle = sr.divergenceSum > 0 ? 'SobraNumero' : 'FaltaNumero';
      xml += `
   <Row ss:AutoFitHeight="1">
    <Cell><Data ss:Type="String">${escapeXml(sr.itemDescription)}</Data></Cell>
    <Cell><Data ss:Type="String">${escapeXml(sr.type)}</Data></Cell>
    <Cell ss:StyleID="NumeroPadrao"><Data ss:Type="Number">${sr.fiscalQtySum}</Data></Cell>
    <Cell ss:StyleID="NumeroPadrao"><Data ss:Type="Number">${sr.physicalQtySum}</Data></Cell>
    <Cell ss:StyleID="${statusNumStyle}"><Data ss:Type="Number">${sr.divergenceSum}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${statusLabel}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const filterDesc = subTabDivergencias === 'all' ? 'geral' : subTabDivergencias === 'pa' ? 'pa' : 'ag';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `sobras_e_faltas_pendentes_${filterDesc}_${dateStr}.xls`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const records = getUnresolvedDiscrepancyRecords();
    if (records.length === 0) {
      alert("Nenhum item com sobras ou faltas pendentes encontrado para exportação.");
      return;
    }

    const doc = new jsPDF();
    let currentY = 15;

    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > 275) {
        doc.addPage();
        currentY = 15;
        drawPageHeader();
        return true;
      }
      return false;
    };

    const drawPageHeader = () => {
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("PAU BRASIL DISTRIBUIDORA DE BEBIDAS LTDA", 14, currentY);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Guarabira / PB - CEP: 58200-000 | Fone: (83) 3271-1000", 120, currentY);
      currentY += 4;
      
      doc.text("RELATÓRIO OPERACIONAL DE SOBRAS E FALTAS NÃO TRATADAS", 14, currentY);
      currentY += 4;
      
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.line(14, currentY, 196, currentY);
      currentY += 6;
    };

    drawPageHeader();

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    const filterLabel = subTabDivergencias === 'all' ? 'PRODUTOS E ATIVOS (P.A. / A.G.)' : subTabDivergencias === 'pa' ? 'PRODUTOS ACABADOS (P.A.)' : 'ATIVOS DE GIRO (A.G.)';
    doc.text(`SOBRAS & FALTAS PENDENTES - ${filterLabel}`, 14, currentY);
    currentY += 5;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const filterInfo = `Filtros: Busca: "${filterNB || 'Nenhum'}" | Data: ${filterDate || 'Todas'} | Desvio: ${filterType === 'all' ? 'Todos' : filterType === 'sobra' ? 'Apenas Sobras' : 'Apenas Faltas'}`;
    doc.text(filterInfo, 14, currentY);
    currentY += 8;

    doc.setFillColor(15, 23, 42);
    doc.rect(14, currentY, 182, 7, "F");
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    
    const colX = {
      map: 16,
      driver: 34,
      item: 69,
      type: 124,
      deviation: 136,
      fiscal: 151,
      physical: 166,
      diverg: 181
    };

    doc.text("MAPA", colX.map, currentY + 5);
    doc.text("MOTORISTA", colX.driver, currentY + 5);
    doc.text("PRODUTO / ATIVO", colX.item, currentY + 5);
    doc.text("TIPO", colX.type, currentY + 5);
    doc.text("DESVIO", colX.deviation, currentY + 5);
    doc.text("FISC", colX.fiscal, currentY + 5);
    doc.text("FÍS", colX.physical, currentY + 5);
    doc.text("DIV", colX.diverg, currentY + 5);
    currentY += 7;

    let alternate = false;
    records.forEach(r => {
      checkPageBreak(7);
      
      if (alternate) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY, 182, 6.5, "F");
      }
      alternate = !alternate;

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.25);
      doc.line(14, currentY + 6.5, 196, currentY + 6.5);

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);

      let desc = r.itemDescription;
      if (desc.length > 32) {
        desc = desc.substring(0, 30) + "...";
      }

      let dName = r.driverName;
      if (dName.length > 20) {
        dName = dName.substring(0, 18) + "..";
      }

      doc.text(r.map, colX.map, currentY + 4.5);
      doc.text(dName, colX.driver, currentY + 4.5);
      doc.text(desc, colX.item, currentY + 4.5);
      
      doc.setFont("Helvetica", "bold");
      doc.text(r.type, colX.type, currentY + 4.5);

      if (r.deviationType === 'SOBRA') {
        doc.setTextColor(16, 124, 65);
        doc.text("SOBRA", colX.deviation, currentY + 4.5);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text("FALTA", colX.deviation, currentY + 4.5);
      }
      doc.setTextColor(30, 41, 59);
      doc.setFont("Helvetica", "normal");

      doc.text(String(r.fiscalQty), colX.fiscal, currentY + 4.5);
      doc.text(String(r.physicalQty), colX.physical, currentY + 4.5);

      doc.setFont("Helvetica", "bold");
      if (r.divergence > 0) {
        doc.setTextColor(16, 124, 65);
        doc.text(`+${r.divergence}`, colX.diverg, currentY + 4.5);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text(String(r.divergence), colX.diverg, currentY + 4.5);
      }

      currentY += 6.5;
    });

    checkPageBreak(30);
    currentY += 5;
    
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.rect(14, currentY, 182, 18, "FD");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("RESUMO DE DIVERGÊNCIAS NÃO TRATADAS", 18, currentY + 5.5);

    const totalSobras = records.filter(r => r.deviationType === 'SOBRA').length;
    const totalFaltas = records.filter(r => r.deviationType === 'FALTA').length;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    doc.text(`Total de ocorrências: ${records.length} itens.`, 18, currentY + 11.5);
    doc.text(`Sobras pendentes: ${totalSobras} itens  |  Faltas pendentes: ${totalFaltas} itens`, 18, currentY + 15.5);

    const filterDesc = subTabDivergencias === 'all' ? 'geral' : subTabDivergencias === 'pa' ? 'pa' : 'ag';
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`sobras_e_faltas_pendentes_${filterDesc}_${dateStr}.pdf`);
  };

  // Reopening handlers for Auxiliar de Logística and Financeiro
  const handleRequestReopening = (auditId: string) => {
    if (!reopeningJustificationText.trim()) {
      alert("Por favor, preencha a justificativa para solicitar a reabertura.");
      return;
    }

    const updatedAudits = audits.map(audit => {
      if (audit.id === auditId) {
        const updatedHistory = [
          ...(audit.history || []),
          {
            timestamp: new Date().toISOString(),
            action: `Solicitou Reabertura do Mapa`,
            user: currentUser.name,
            details: `Justificativa: ${reopeningJustificationText.trim()}`
          }
        ];
        return {
          ...audit,
          reopeningRequested: true,
          reopeningJustification: reopeningJustificationText.trim(),
          reopeningRequestDate: new Date().toISOString(),
          reopeningRequestUser: currentUser.name,
          history: updatedHistory,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.name
        };
      }
      return audit;
    });

    let updatedAlerts = [...fiscalAlerts];
    const targetAudit = audits.find(a => a.id === auditId);
    if (targetAudit) {
      const newAlert: FiscalAlert = {
        id: 'al_reopen_' + Date.now(),
        routeMap: targetAudit.routeMap,
        plate: targetAudit.plate,
        status: 'outros',
        timestamp: new Date().toISOString(),
        read: false,
        title: `🔓 Solicitação de Reabertura`,
        message: `${currentUser.name} solicitou a reabertura do mapa ${targetAudit.routeMap}. Justificativa: ${reopeningJustificationText.trim()}`,
        targetRole: 'financeiro'
      };
      updatedAlerts = [newAlert, ...updatedAlerts];
    }

    onSaveAudits(updatedAudits);
    if (onSaveAlerts) {
      onSaveAlerts(updatedAlerts);
    }

    const currentSelected = updatedAudits.find(a => a.id === auditId);
    if (currentSelected) {
      setSelectedHistoryAudit(currentSelected);
    }

    setReopeningJustificationText('');
    alert("Solicitação de reabertura enviada com sucesso ao Financeiro!");
  };

  const handleApproveReopening = (auditId: string) => {
    const targetAudit = audits.find(a => a.id === auditId);
    if (!targetAudit) return;

    if (currentUser.role !== 'financeiro' && currentUser.role !== 'gestor') {
      alert("Apenas usuários do Financeiro ou Gestores podem autorizar reaberturas.");
      return;
    }

    requestConfirm(
      "🔓 Confirmar Reabertura?",
      `Tem certeza que deseja reabrir o mapa ${targetAudit.routeMap}? Ele retornará para "Aguardando Conciliação" para nova conferência ou conciliação.`,
      () => {
        const updatedAudits = audits.map(audit => {
          if (audit.id === auditId) {
            const updatedHistory = [
              ...(audit.history || []),
              {
                timestamp: new Date().toISOString(),
                action: `Reabertura Aprovada pelo Financeiro`,
                user: currentUser.name,
                details: `Justificativa da solicitação: ${audit.reopeningJustification}`
              }
            ];
            return {
              ...audit,
              status: 'conferido_fisico' as const,
              reopeningRequested: false,
              history: updatedHistory,
              updatedAt: new Date().toISOString(),
              lastUpdatedBy: currentUser.name
            };
          }
          return audit;
        });

        let updatedAlerts = [...fiscalAlerts];
        const newAlert: FiscalAlert = {
          id: 'al_reopen_approved_' + Date.now(),
          routeMap: targetAudit.routeMap,
          plate: targetAudit.plate,
          status: 'conferido_fisico',
          timestamp: new Date().toISOString(),
          read: false,
          title: `✅ Mapa Reaberto pelo Financeiro`,
          message: `O mapa ${targetAudit.routeMap} foi reaberto por ${currentUser.name} e está disponível para nova conciliação.`,
          targetRole: 'auxiliar_logistica'
        };
        updatedAlerts = [newAlert, ...updatedAlerts];

        onSaveAudits(updatedAudits);
        if (onSaveImportedRoutes && importedRoutes) {
          const updatedRoutes = importedRoutes.map(r => {
            const isMatched = r.routeMap.toUpperCase() === targetAudit.routeMap.toUpperCase() ||
              (targetAudit.unifiedMaps && targetAudit.unifiedMaps.some(m => m.toUpperCase() === r.routeMap.toUpperCase()));
            if (isMatched) {
              return { ...r, status: 'em_analise' as const };
            }
            return r;
          });
          onSaveImportedRoutes(updatedRoutes);
        }
        if (onSaveAlerts) {
          onSaveAlerts(updatedAlerts);
        }

        const currentSelected = updatedAudits.find(a => a.id === auditId);
        if (currentSelected) {
          setSelectedHistoryAudit(currentSelected);
        }

        alert(`O mapa ${targetAudit.routeMap} foi reaberto com sucesso e retornou para "Aguardando Conciliação"!`);
      }
    );
  };

  const handleRejectReopening = (auditId: string) => {
    const targetAudit = audits.find(a => a.id === auditId);
    if (!targetAudit) return;

    if (currentUser.role !== 'financeiro' && currentUser.role !== 'gestor') {
      alert("Apenas usuários do Financeiro ou Gestores podem recusar reaberturas.");
      return;
    }

    requestConfirm(
      "❌ Recusar Reabertura?",
      `Deseja recusar o pedido de reabertura do mapa ${targetAudit.routeMap}?`,
      () => {
        const updatedAudits = audits.map(audit => {
          if (audit.id === auditId) {
            const updatedHistory = [
              ...(audit.history || []),
              {
                timestamp: new Date().toISOString(),
                action: `Reabertura Recusada pelo Financeiro`,
                user: currentUser.name,
                details: `Recusado`
              }
            ];
            return {
              ...audit,
              reopeningRequested: false,
              history: updatedHistory,
              updatedAt: new Date().toISOString(),
              lastUpdatedBy: currentUser.name
            };
          }
          return audit;
        });

        onSaveAudits(updatedAudits);

        const currentSelected = updatedAudits.find(a => a.id === auditId);
        if (currentSelected) {
          setSelectedHistoryAudit(currentSelected);
        }

        alert(`A solicitação de reabertura do mapa ${targetAudit.routeMap} foi recusada.`);
      }
    );
  };

  const handleAcknowledgePromax = (auditId: string) => {
    const targetAudit = audits.find(a => a.id === auditId);
    if (!targetAudit) return;

    const updatedAudits = audits.map(audit => {
      if (audit.id === auditId) {
        const updatedHistory = [
          ...(audit.history || []),
          {
            timestamp: new Date().toISOString(),
            action: `Ciente Fechamento Promax`,
            user: currentUser.name,
            details: `Financeiro marcou o mapa ${audit.routeMap} como ciente do fechamento no Promax.`
          }
        ];
        return {
          ...audit,
          financeiroCiente: true,
          history: updatedHistory,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: currentUser.name
        };
      }
      return audit;
    });

    onSaveAudits(updatedAudits);
    
    if (selectedHistoryAudit && selectedHistoryAudit.id === auditId) {
      const updatedSelected = updatedAudits.find(a => a.id === auditId);
      if (updatedSelected) {
        setSelectedHistoryAudit(updatedSelected);
      }
    }

    alert(`Sucesso! Mapa ${targetAudit.routeMap} marcado como ciente de fechamento no Promax.`);
  };

  const getPhotoBase64 = async (photoUrl: string): Promise<string | null> => {
    if (!photoUrl) return null;
    if (photoUrl.startsWith('data:')) {
      return photoUrl;
    }
    try {
      const res = await fetch(photoUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error(`Error converting URL to base64: ${photoUrl}`, err);
      return null;
    }
  };

  const downloadSingleAuditPDF = async (audit: AuditSession, returnDoc: boolean = false): Promise<any> => {
    try {
      // Load photos from ImageDB
      const photos = await ImageDB.getPhotosByAudit(audit.id);
      
      const arrivalDateStr = audit.arrivalDate || new Date().toISOString().split('T')[0];
      const [year, month, day] = arrivalDateStr.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      
      // Naming convention: 11111 - OXO0542 - 05-07-2026.pdf
      const filename = `${audit.routeMap} - ${audit.plate} - ${formattedDate}.pdf`;
      
      const doc = new jsPDF();
      
      let currentY = 15;
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > 275) {
          doc.addPage();
          currentY = 15;
          return true;
        }
        return false;
      };

      // 1. BRANDED HEADER
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("PAU BRASIL DISTRIBUIDORA DE BEBIDAS LTDA", 14, currentY);
      currentY += 5;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("Guarabira / PB - CEP: 58200-000 | Fone: (83) 3271-1000", 14, currentY);
      currentY += 4;
      doc.text("CONTROLE DE ACURACIDADE - PACOTE PREJUÍZO (LOGÍSTICA)", 14, currentY);
      currentY += 4;
      
      // Line divider
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.5);
      doc.line(14, currentY, 196, currentY);
      currentY += 8;
      
      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`RELATÓRIO OPERACIONAL DE RETORNO DE ROTA`, 14, currentY);
      currentY += 6;
      
      // Metadata Box
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, currentY, 182, 34, "FD");
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      
      // Metadata lines inside the box
      doc.text(`Mapa de Rota:`, 18, currentY + 6);
      doc.text(`Placa do Carro:`, 18, currentY + 12);
      doc.text(`Motorista:`, 18, currentY + 18);
      doc.text(`Ajudante:`, 18, currentY + 24);
      doc.text(`Período Auditoria:`, 18, currentY + 30);
      
      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(`${audit.routeMap}`, 48, currentY + 6);
      doc.text(`${audit.plate}`, 48, currentY + 12);
      doc.text(`${getDriverName(audit.driverId)}`, 48, currentY + 18);
      doc.text(`${getHelperName(audit.helperId)}`, 48, currentY + 24);
      
      const formatTime = (t?: string) => t ? new Date(t).toLocaleTimeString('pt-BR') : 'N/A';
      doc.text(`${formatTime(audit.startTime)} até ${formatTime(audit.endTime)} (${getDurationText(audit.startTime, audit.endTime)})`, 48, currentY + 30);
      
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text(`Data Chegada:`, 110, currentY + 6);
      doc.text(`Status Fechamento:`, 110, currentY + 12);
      doc.text(`Conferente Físico:`, 110, currentY + 18);
      doc.text(`Auxiliar Fiscal:`, 110, currentY + 24);
      doc.text(`Divergência Total:`, 110, currentY + 30);
      
      doc.setFont("Helvetica", "bold");
      doc.text(`${formattedDate}`, 142, currentY + 6);
      
      const isOk = audit.status === 'finalizado_ok';
      doc.setTextColor(isOk ? 16 : 220, isOk ? 124 : 38, isOk ? 65 : 38); // green-600 or red-600
      doc.text(isOk ? "100% OK" : "CONCILIADO DIVERGENTE", 142, currentY + 12);
      
      doc.setTextColor(15, 23, 42);
      doc.text(`${audit.conferenteId || 'N/A'}`, 142, currentY + 18);
      doc.text(`${audit.auxiliarId || 'N/A'}`, 142, currentY + 24);
      
      // Calculate stats for diff
      let missingQty = 0;
      let surplusQty = 0;
      let missingVal = 0;
      let surplusVal = 0;
      
      audit.items?.forEach(item => {
        const p = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        const f = item.fiscalQty ?? 0;
        const diff = p - f;
        if (diff < 0) {
          missingQty += Math.abs(diff);
          missingVal += Math.abs(diff) * getSkuClosedPrice(item.productCode, 45.0);
        } else if (diff > 0) {
          surplusQty += diff;
          surplusVal += diff * getSkuClosedPrice(item.productCode, 45.0);
        }
      });

      // Do NOT count chapatex as discrepancy for closing status, but keep in statistics
      audit.assets?.forEach(asset => {
        const code = getAssetCode(asset.assetId, asset.assetName);
        const isChapatex = code === '899599' || (asset.assetName || '').toLowerCase().includes('chapatex');
        const p = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        const f = asset.fiscalQty ?? 0;
        const diff = p - f;
        if (diff < 0) {
          missingQty += Math.abs(diff);
        } else if (diff > 0) {
          surplusQty += diff;
        }
      });
      
      doc.setTextColor(isOk ? 16 : 220, isOk ? 124 : 38, isOk ? 65 : 38);
      doc.text(isOk ? "Sem Divergências" : `Faltas: ${missingQty} | Sobras: ${surplusQty}`, 142, currentY + 30);
      
      currentY += 44;
      
      // 2. CONCILIAÇÃO DE PRODUTOS ACABADOS (PA)
      if (audit.items && audit.items.length > 0) {
        checkPageBreak(30);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("1. FECHAMENTO DE PRODUTOS ACABADOS (PA)", 14, currentY);
        currentY += 5;
        
        // Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 6, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Código", 16, currentY + 4.5);
        doc.text("Descrição do Produto", 32, currentY + 4.5);
        doc.text("Físico", 125, currentY + 4.5);
        doc.text("Fiscal", 145, currentY + 4.5);
        doc.text("Diferença", 168, currentY + 4.5);
        currentY += 6;
        
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        audit.items.forEach(item => {
          checkPageBreak(8);
          const physicalVal = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
          const fiscalVal = item.fiscalQty ?? 0;
          const diff = physicalVal - fiscalVal;
          const diffText = diff > 0 ? `+${diff}` : `${diff}`;
          
          doc.setFontSize(7.5);
          doc.text(`${item.productCode}`, 16, currentY + 4.5);
          doc.text(`${(item.productDescription || '').substring(0, 48)}`, 32, currentY + 4.5);
          doc.text(`${physicalVal} SKU`, 125, currentY + 4.5);
          doc.text(`${fiscalVal} SKU`, 145, currentY + 4.5);
          
          if (diff !== 0) {
            doc.setFont("Helvetica", "bold");
            doc.setTextColor(diff < 0 ? 220 : 217, diff < 0 ? 38 : 119, diff < 0 ? 38 : 6);
          }
          doc.text(`${diffText} SKU`, 168, currentY + 4.5);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          
          doc.setDrawColor(241, 245, 249);
          doc.line(14, currentY + 6, 196, currentY + 6);
          currentY += 6;
        });
        currentY += 6;
      }
      
      // 3. CONCILIAÇÃO DE ATIVOS DE GIRO (AG)
      if (audit.assets && audit.assets.length > 0) {
        checkPageBreak(30);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("2. FECHAMENTO DE ATIVOS DE GIRO (AG)", 14, currentY);
        currentY += 5;
        
        // Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 6, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Código Ativo", 16, currentY + 4.5);
        doc.text("Descrição do Ativo", 36, currentY + 4.5);
        doc.text("Físico", 125, currentY + 4.5);
        doc.text("Fiscal", 145, currentY + 4.5);
        doc.text("Diferença", 168, currentY + 4.5);
        currentY += 6;
        
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        audit.assets.forEach(asset => {
          checkPageBreak(8);
          const code = getAssetCode(asset.assetId, asset.assetName);
          const isChapatex = code === '899599' || (asset.assetName || '').toLowerCase().includes('chapatex');
          const physicalVal = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
          const fiscalVal = asset.fiscalQty ?? 0;
          const diff = physicalVal - fiscalVal;
          let diffText = diff > 0 ? `+${diff}` : `${diff}`;
          
          if (isChapatex) {
            diffText += " (Isento)";
          }
          
          doc.setFontSize(7.5);
          doc.text(`${code}`, 16, currentY + 4.5);
          doc.text(`${asset.assetName}`, 36, currentY + 4.5);
          doc.text(`${physicalVal} cx/un`, 125, currentY + 4.5);
          doc.text(`${fiscalVal} cx/un`, 145, currentY + 4.5);
          
          if (diff !== 0) {
            doc.setFont("Helvetica", "bold");
            if (isChapatex) {
              doc.setTextColor(71, 85, 105);
            } else {
              doc.setTextColor(diff < 0 ? 220 : 217, diff < 0 ? 38 : 119, diff < 0 ? 38 : 6);
            }
          }
          doc.text(`${diffText}`, 168, currentY + 4.5);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          
          doc.setDrawColor(241, 245, 249);
          doc.line(14, currentY + 6, 196, currentY + 6);
          currentY += 6;
        });
        currentY += 6;
      }
      
      // 4. CONTROLE DE REFUGO / AVARIAS
      if (audit.refugos && audit.refugos.length > 0) {
        checkPageBreak(30);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("3. BLITZ DE REFUGO & AVARIAS DE ATIVOS DE GIRO", 14, currentY);
        currentY += 5;
        
        // Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 6, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Ativo Danificado", 16, currentY + 4.5);
        doc.text("Motivo do Descarte / Blitz", 75, currentY + 4.5);
        doc.text("Qtd Descartada", 160, currentY + 4.5);
        currentY += 6;
        
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        audit.refugos.forEach(ref => {
          checkPageBreak(8);
          doc.setFontSize(7.5);
          doc.text(`${ref.assetName}`, 16, currentY + 4.5);
          doc.text(`${ref.reason}`, 75, currentY + 4.5);
          doc.text(`${ref.qty} un`, 160, currentY + 4.5);
          
          doc.setDrawColor(241, 245, 249);
          doc.line(14, currentY + 6, 196, currentY + 6);
          currentY += 6;
        });
        currentY += 6;
      }
      
      // 5. HISTÓRICO DE AUDITORIA COMPLETO
      if (audit.history && audit.history.length > 0) {
        checkPageBreak(35);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("4. HISTÓRICO COMPLETO DA AUDITORIA (LOG DE EVENTOS)", 14, currentY);
        currentY += 5;
        
        // Header
        doc.setFillColor(241, 245, 249);
        doc.rect(14, currentY, 182, 6, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Horário / Data", 16, currentY + 4.5);
        doc.text("Responsável", 50, currentY + 4.5);
        doc.text("Ação Operacional Executada", 85, currentY + 4.5);
        currentY += 6;
        
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        audit.history.forEach(hist => {
          const timeText = new Date(hist.timestamp).toLocaleString('pt-BR');
          const details = hist.details ? `: ${hist.details}` : "";
          const actionText = `${hist.action}${details}`;
          
          const splitAction = doc.splitTextToSize(actionText, 105);
          const heightNeeded = (splitAction.length * 4) + 4;
          
          checkPageBreak(heightNeeded);
          
          doc.setFontSize(7.2);
          doc.text(`${timeText}`, 16, currentY + 4.5);
          doc.text(`${hist.user}`, 50, currentY + 4.5);
          doc.text(splitAction, 85, currentY + 4.5);
          
          currentY += heightNeeded;
          doc.setDrawColor(241, 245, 249);
          doc.line(14, currentY, 196, currentY);
        });
        currentY += 6;
      }
      
      // Local Rede info and signatures
      checkPageBreak(45);
      
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(14, currentY, 182, 14, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("DIRETÓRIO DA REDE INTERNA PARA ARQUIVAMENTO DEFINITIVO:", 16, currentY + 5);
      doc.setFont("Helvetica", "normal");
      doc.text("P:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZÉM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA", 16, currentY + 10);
      currentY += 22;
      
      doc.setDrawColor(203, 213, 225);
      doc.line(14, currentY, 65, currentY);
      doc.line(78, currentY, 129, currentY);
      doc.line(142, currentY, 193, currentY);
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("CONFERENTE OPERACIONAL", 14, currentY + 4);
      doc.text("FISCAL DE RETORNO", 78, currentY + 4);
      doc.text("COORDENADOR / GESTOR", 142, currentY + 4);
      currentY += 12;
      
      // 6. PHOTO EVIDENCE PAGES (Using highly-polished 2-column grid layout requested by user)
      if (photos && photos.length > 0) {
        doc.addPage();
        currentY = 15;
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("5. EVIDÊNCIAS FOTOGRÁFICAS OPERACIONAIS", 14, currentY);
        currentY += 10;
        
        const colWidth = 86;
        const colHeight = 65;
        const spaceBetweenX = 10;
        const spaceBetweenY = 18;
        
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const colIndex = i % 2;
          const rowIndex = Math.floor(i / 2) % 3;
          
          if (i > 0 && colIndex === 0 && rowIndex === 0) {
            doc.addPage();
            currentY = 15;
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text("5. EVIDÊNCIAS FOTOGRÁFICAS OPERACIONAIS (CONT.)", 14, currentY);
            currentY += 10;
          }
          
          const xPos = 14 + colIndex * (colWidth + spaceBetweenX);
          const yPos = currentY + rowIndex * (colHeight + spaceBetweenY);
          
          doc.setDrawColor(226, 232, 240);
          doc.setFillColor(255, 255, 255);
          doc.rect(xPos, yPos, colWidth, colHeight + 12, "FD");
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(51, 65, 85);
          const labelText = `Foto ${i + 1}: ${(photo.itemName || '').substring(0, 24)}`;
          doc.text(labelText, xPos + 3, yPos + 5);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          const sublabelText = `Ref/ID: ${photo.itemCode || 'N/A'} | ${(photo.type || '').toUpperCase()}`;
          doc.text(sublabelText, xPos + 3, yPos + 9);
          
          try {
            const imgBase64 = await getPhotoBase64(photo.photoUrl);
            if (imgBase64) {
              doc.addImage(imgBase64, 'JPEG', xPos + 3, yPos + 11, colWidth - 6, colHeight - 11);
            } else {
              throw new Error("No image data");
            }
          } catch (imgErr) {
            console.error("Erro ao inserir imagem no PDF:", imgErr);
            doc.setFillColor(241, 245, 249);
            doc.rect(xPos + 3, yPos + 11, colWidth - 6, colHeight - 11, "F");
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(239, 68, 68);
            doc.text("[Imagem não disponível]", xPos + colWidth/2 - 15, yPos + colHeight/2 + 5);
          }
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(148, 163, 184);
          const photoTime = photo.timestamp ? new Date(photo.timestamp).toLocaleString('pt-BR') : 'N/A';
          const timestampText = `Por ${photo.conferenteId || 'N/A'} em ${photoTime}`;
          doc.text(timestampText, xPos + 3, yPos + colHeight + 9);
        }
      }

      // Mark audit as PDF downloaded and finalize process cycle for this map
      const normAuditMap = normalizeMapCode(audit.routeMap).toUpperCase();
      const isDivergent = audit.items && audit.items.some(i => i.physicalQty !== undefined && i.fiscalQty !== undefined && i.physicalQty !== i.fiscalQty);
      const updatedAudit: AuditSession = {
        ...audit,
        pdfDownloaded: true,
        status: (audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente')
          ? audit.status
          : (isDivergent ? 'finalizado_divergente' : 'finalizado_ok')
      };

      let nextRoutes = importedRoutes;
      if (importedRoutes && importedRoutes.length > 0) {
        nextRoutes = importedRoutes.map(r => {
          const normR = normalizeMapCode(r.routeMap).toUpperCase();
          const isMatch = normR === normAuditMap || 
            (audit.unifiedMaps && audit.unifiedMaps.some(m => normalizeMapCode(m).toUpperCase() === normR));
          if (isMatch) {
            return { ...r, status: 'fechado' as const };
          }
          return r;
        });
        if (onSaveImportedRoutes) {
          onSaveImportedRoutes(nextRoutes);
        }
      }

      const nextAudits = audits.map(a => a.id === audit.id ? updatedAudit : a);
      if (!audits.some(a => a.id === audit.id)) {
        nextAudits.push(updatedAudit);
      }
      onSaveAudits(nextAudits);

      if (isClientFirebaseActive()) {
        saveDirectlyToFirestore({
          audits: nextAudits,
          importedRoutes: nextRoutes
        }).catch(() => {});
      }

      if (returnDoc) {
        const base64Data = doc.output('datauristring').split(',')[1];
        return { success: true, doc, filename, base64: base64Data };
      }
      
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'Relatório PDF de Conciliação',
              accept: {
                'application/pdf': ['.pdf'],
              },
            }],
          });
          const writable = await handle.createWritable();
          const pdfArrayBuffer = doc.output('arraybuffer');
          await writable.write(pdfArrayBuffer);
          await writable.close();
          return true;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.log("Usuário cancelou o salvamento do arquivo. Realizando download padrão de segurança...");
            doc.save(filename);
            return true;
          } else {
            console.error("Erro ao usar showSaveFilePicker, realizando download direto de segurança:", err);
            doc.save(filename);
            return true;
          }
        }
      } else {
        doc.save(filename);
        return true;
      }
    } catch (e: any) {
      console.error("Erro ao gerar PDF da auditoria unica:", e);
      alert("Erro ao gerar o PDF da auditoria: " + e.message);
      return false;
    }
  };

  const handleDownloadDailyProduction = async (targetDate: string) => {
    setExportingDailyProduction(true);
    try {
      // Find all audits of that date (both ok and divergent final status)
      const auditsOfDate = audits.filter(a => 
        a.arrivalDate === targetDate && 
        (a.status === 'finalizado_ok' || a.status === 'finalizado_divergente')
      );
      
      if (auditsOfDate.length === 0) {
        alert(`Nenhum mapa de retorno de rota finalizado foi encontrado para a data ${new Date(targetDate + 'T00:00:00').toLocaleDateString('pt-BR')}.`);
        setExportingDailyProduction(false);
        return;
      }

      let successCount = 0;
      for (const audit of auditsOfDate) {
        try {
          await downloadSingleAuditPDF(audit);
          successCount++;
        } catch (singleAuditErr) {
          console.error(`Erro ao exportar mapa ${audit.routeMap}:`, singleAuditErr);
        }
      }
      
      alert(`Exportação concluída! Foram gerados e baixados ${successCount} arquivo(s) de produtividade diária em seu computador.\n\nPor favor, salve os arquivos na pasta da rede correspondente:\nP:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZÉM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA`);
    } catch (err) {
      console.error("Erro no processo de exportação diária:", err);
      alert("Ocorreu um erro ao gerar os PDFs da produção diária.");
    } finally {
      setExportingDailyProduction(false);
    }
  };

  // Helper to calculate audit duration
  const getDurationText = (start?: string, end?: string) => {
    if (!start || !end) return 'N/A';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  // Live reconciliation item helpers
  const handleUpdateFiscalQty = (productCode: string, val: number | undefined) => {
    if (!activeSession) return;
    const updatedItems = activeSession.items.map(item => {
      if (item.productCode === productCode) {
        return { ...item, fiscalQty: val };
      }
      return item;
    });
    setActiveSession({ ...activeSession, items: updatedItems });
  };

  const recFilteredProducts = recProductSearch.trim() === ''
    ? []
    : products.filter(p => 
        p.code.toLowerCase().includes(recProductSearch.toLowerCase()) || 
        p.description.toLowerCase().includes(recProductSearch.toLowerCase())
      ).slice(0, 10);

  const handleSelectRecProduct = (prod: Product) => {
    setRecSelectedProductCode(prod.code);
    setRecProductSearch(`[${prod.code}] ${prod.description}`);
    
    // Look up default fiscal qty from the imported route map
    if (activeSession) {
      const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase());
      const matchingRouteItem = matchingRoute?.items?.find(item => item.productCode === prod.code);
      if (matchingRouteItem) {
        setRecProductFiscalQtyToAdd(matchingRouteItem.qty);
      } else {
        setRecProductFiscalQtyToAdd(0);
      }
    }
    setRecProductQtyToAdd(0); // Physical qty default 0
  };

  const handleManualAddProductToReconciliation = () => {
    if (!activeSession) return;
    if (!recSelectedProductCode) {
      alert('Por favor, selecione um produto.');
      return;
    }
    const fiscalQty = Number(recProductFiscalQtyToAdd) || 0;

    const prod = products.find(p => p.code === recSelectedProductCode);
    if (!prod) return;

    const existingIndex = activeSession.items.findIndex(i => i.productCode === recSelectedProductCode);
    let updatedItems = [...activeSession.items];

    if (existingIndex > -1) {
      const currentItem = updatedItems[existingIndex];
      updatedItems[existingIndex] = {
        ...currentItem,
        fiscalQty: fiscalQty
      };
    } else {
      const newItem: AuditItem = {
        productCode: prod.code,
        productDescription: prod.description,
        cost: prod.cost,
        physicalQty: 0,
        rePhysicalQty: undefined,
        fiscalQty: fiscalQty
      };
      updatedItems.push(newItem);
    }

    const updatedSession = { ...activeSession, items: updatedItems };
    setActiveSession(updatedSession);

    // Save update to database so other views stay in sync
    const updatedAudits = audits.map(a => a.id === activeSession.id ? updatedSession : a);
    onSaveAudits(updatedAudits);

    // Reset form states
    setRecProductSearch('');
    setRecSelectedProductCode('');
    setRecProductQtyToAdd('');
    setRecProductFiscalQtyToAdd('');
    alert('Produto inserido com sucesso na conciliação! Se for necessária uma nova conferência física, ela aparecerá para o conferente realizar.');
  };

  const handleUpdateAssetFiscalQty = (assetId: string, val: number | undefined) => {
    if (!activeSession) return;
    
    const updatedAssets = activeSession.assets.map(asset => {
      if (asset.assetId === assetId) {
        return { ...asset, fiscalQty: val };
      }
      return asset;
    });
    setActiveSession({ ...activeSession, assets: updatedAssets });
  };

  const handleUpdateAssetComodatoQty = (assetId: string, val: number) => {
    if (!activeSession) return;
    
    const updatedAssets = activeSession.assets.map(asset => {
      if (asset.assetId === assetId) {
        return { ...asset, comodatoQty: val };
      }
      return asset;
    });
    setActiveSession({ ...activeSession, assets: updatedAssets });
  };

  const handleUpdateAssetRecolhaQty = (assetId: string, val: number) => {
    if (!activeSession) return;
    
    const updatedAssets = activeSession.assets.map(asset => {
      if (asset.assetId === assetId) {
        return { ...asset, recolhaQty: val };
      }
      return asset;
    });
    setActiveSession({ ...activeSession, assets: updatedAssets });
  };

  // Action: Request physical recount (Reconferência)
  const handleRequestReconferencia = () => {
    if (!activeSession) return;
    if (!reconciliationNotes.trim()) {
      alert('Por favor, informe no campo de observações o motivo da reconferência (quais produtos apresentaram divergência).');
      return;
    }

    const now = new Date().toISOString();
    const updatedSession: AuditSession = {
      ...activeSession,
      status: 'reconferencia',
      reconciliationNotes: reconciliationNotes.trim(),
      history: [
        ...activeSession.history,
        {
          timestamp: now,
          action: 'Reconferência Solicitada',
          user: currentUser.name,
          details: reconciliationNotes.trim()
        }
      ]
    };

    const updatedAudits = audits.map(a => a.id === activeSession.id ? updatedSession : a);
    onSaveAudits(updatedAudits);

    // Trigger alert for the Conferente that a recount has been requested
    if (onSaveAlerts && fiscalAlerts) {
      const newAlert: FiscalAlert = {
        id: 'al_' + Date.now(),
        routeMap: activeSession.routeMap,
        plate: activeSession.plate,
        status: 'recontagem_solicitada' as const,
        timestamp: now,
        read: false,
        title: 'Reconferência Solicitada',
        message: `O auxiliar de logística ${currentUser.name} solicitou recontagem para o mapa ${activeSession.routeMap} (${activeSession.plate}). Motivo: ${reconciliationNotes.trim()}`,
        targetRole: 'conferente'
      };
      onSaveAlerts([newAlert, ...fiscalAlerts]);
    }

    // Also set corresponding imported route's status to 'reconferir'
    if (onSaveImportedRoutes && importedRoutes) {
      const updatedRoutes = importedRoutes.map(r => {
        const isMatched = r.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase() ||
          (activeSession.unifiedMaps && activeSession.unifiedMaps.some(m => m.toUpperCase() === r.routeMap.toUpperCase()));
        if (isMatched) {
          return { ...r, status: 'reconferir' as const };
        }
        return r;
      });
      onSaveImportedRoutes(updatedRoutes);
    }

    alert('Reconferência enviada com sucesso!');
    setActiveSession(null);
    setReconciliationNotes('');
  };

  // Action: Finalize and log audit return (Dar Baixa)
  const handleFinalizeReconciliation = () => {
    if (!activeSession || isFinalizing) return;

    // Check if monitoramento reported a discrepancy
    const matchedRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase());

    const executeFinalization = async () => {
      setIsFinalizing(true);
      try {
        // Check if there are differences
        let hasDiscrepancy = false;
        
        // Verify products
        const itemsWithUpdatedFiscal = activeSession.items.map(item => {
          const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
          const fiscal = item.fiscalQty ?? 0;
          if (physical !== fiscal) hasDiscrepancy = true;
          return { ...item, fiscalQty: fiscal }; // Ensure it has fiscal quantity defined
        });

        // Verify assets
        const assetsWithUpdatedFiscal = activeSession.assets.map(asset => {
          const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
          const fiscal = asset.fiscalQty ?? 0;
          const comodato = asset.comodatoQty ?? 0;
          const recolha = asset.recolhaQty ?? 0;
          const diff = physical - fiscal + comodato - recolha;
          
          // Exclude chapatex from being considered a discrepancy
          const isChapatex = asset.assetId === 'chapatex' || 
                             asset.assetId?.toLowerCase() === 'chapatex' || 
                             asset.assetName?.toUpperCase().includes('CHAPATEX');
                             
          if (diff !== 0 && !isChapatex) hasDiscrepancy = true;
          return { ...asset, fiscalQty: fiscal, comodatoQty: comodato, recolhaQty: recolha }; // Ensure properties are preserved
        });

        const finalStatus = hasDiscrepancy ? 'finalizado_divergente' : 'finalizado_ok';
        const now = new Date().toISOString();

        const updatedSession: AuditSession = {
          ...activeSession,
          items: itemsWithUpdatedFiscal,
          assets: assetsWithUpdatedFiscal,
          status: finalStatus,
          auxiliarId: currentUser.id,
          reconciliationNotes: reconciliationNotes.trim() || undefined,
          financeiroCiente: false, // Força a notificação no painel do Financeiro
          history: [
            ...activeSession.history,
            {
              timestamp: now,
              action: finalStatus === 'finalizado_ok' ? 'Baixa Concluída - OK' : 'Baixa Concluída com Divergências',
              user: currentUser.name,
              details: reconciliationNotes.trim() || 'Aferição concluída'
            }
          ]
        };

        // 1. GERAR O PDF E EXTRAIR BASE64 EM SEGUNDO PLANO (EM MEMÓRIA)
        const pdfRes = await downloadSingleAuditPDF(updatedSession, true);
        if (!pdfRes || !pdfRes.success || !pdfRes.base64) {
          alert("Erro ao gerar o relatório PDF em memória. A baixa foi cancelada.");
          setIsFinalizing(false);
          return;
        }

        const { base64, filename, doc } = pdfRes;

        // Prepare payload data
        const updatedAudits = audits.map(a => a.id === activeSession.id ? updatedSession : a);
        
        let updatedRoutes = importedRoutes;
        if (onSaveImportedRoutes && importedRoutes) {
          updatedRoutes = importedRoutes.map(r => {
            const normR = normalizeMapCode(r.routeMap).toUpperCase();
            const normActive = normalizeMapCode(activeSession.routeMap).toUpperCase();
            const isMatched = normR === normActive || r.routeMap.trim().toUpperCase() === activeSession.routeMap.trim().toUpperCase() ||
              (activeSession.unifiedMaps && activeSession.unifiedMaps.some(m => normalizeMapCode(m).toUpperCase() === normR || m.trim().toUpperCase() === r.routeMap.trim().toUpperCase()));
            if (isMatched) {
              return { ...r, status: 'fechado' as const };
            }
            return r;
          });
        }

        let updatedAlerts = fiscalAlerts;
        if (onSaveAlerts && fiscalAlerts) {
          const newAlert: FiscalAlert = {
            id: 'al_' + Date.now(),
            routeMap: activeSession.routeMap,
            plate: activeSession.plate,
            status: finalStatus,
            timestamp: now,
            read: false,
            title: finalStatus === 'finalizado_ok' ? 'Mapa Baixado (Saldo OK)' : 'Mapa Baixado com Divergências',
            message: `O mapa ${activeSession.routeMap} (${activeSession.plate}) foi finalizado e baixado por ${currentUser.name}.`,
            targetRole: 'todos'
          };
          updatedAlerts = [newAlert, ...fiscalAlerts];
        }

        // 2. DISPARAR A SAGA DE BAIXA NO BACKEND E NO FIRESTORE
        let result: any = { success: true, durableBackup: { cloudStorage: false, firestore: false } };
        try {
          const response = await fetch('/api/concluir-baixa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auditId: activeSession.id,
              pdfBase64: base64,
              filename: filename,
              updatedAuditSession: updatedSession,
              updatedImportedRoutes: updatedRoutes,
              updatedAlerts: updatedAlerts,
              user: currentUser ? { id: currentUser.id, name: currentUser.name, role: currentUser.role } : null
            })
          });

          if (response.ok) {
            const serverResult = await response.json();
            if (serverResult && serverResult.success) {
              result = serverResult;
            }
          }
        } catch (srvErr) {
          console.warn("[Baixa Saga] Aviso ao gravar baixa no servidor de retaguarda:", srvErr);
        }

        if (isClientFirebaseActive()) {
          try {
            await saveDirectlyToFirestore({
              audits: updatedAudits,
              importedRoutes: updatedRoutes,
              fiscalAlerts: updatedAlerts
            });
            if (result.durableBackup) {
              result.durableBackup.firestore = true;
            }
          } catch (fsErr) {
            console.warn("[Baixa Saga] Aviso ao sincronizar baixa com Firestore:", fsErr);
          }
        }

        console.log("[Baixa Saga] Sucesso na execução da saga de baixa:", result);

        // 3. CICLO DE VIDA DAS FOTOS: Excluídas no momento do fechamento/exportação para otimização e prevenção de corrupção
        console.log("[Baixa Saga] Excluindo fotos de evidência locais e do servidor para este mapa...");
        try {
          await ImageDB.clearPhotosByAudit(activeSession.id);
          console.log("[Baixa Saga] Fotos excluídas com sucesso.");
        } catch (photoClearErr) {
          console.error("Erro ao excluir fotos de evidência:", photoClearErr);
        }

        // 4. ATUALIZAR OS ESTADOS DE MEMÓRIA DA PLATAFORMA PARA SINC NO CLIENT
        onSaveAudits(updatedAudits);
        if (onSaveImportedRoutes) onSaveImportedRoutes(updatedRoutes);
        if (onSaveAlerts) onSaveAlerts(updatedAlerts);

        // 5. EFETUAR DOWNLOAD DE CONVENIÊNCIA NO NAVEGADOR DO USUÁRIO
        try {
          doc.save(filename);
        } catch (downErr) {
          console.warn("Erro ao iniciar download de backup no navegador:", downErr);
        }

        const isSavedOnServer = result.success === true || !!result.filePath;
        
        let alertMessage = "";
        if (!isSavedOnServer) {
          alertMessage = `Atenção: Houve um atraso na gravação do servidor. O PDF foi baixado no seu computador. O sistema continuará tentando sincronizar em segundo plano.`;
        } else {
          alertMessage = finalStatus === 'finalizado_ok' 
            ? 'Retorno baixado com sucesso! Relatório PDF salvo no servidor de arquivos (pasta compartilhada) e baixado no seu computador.' 
            : 'Retorno baixado com divergências registradas. PDF arquivado no servidor de arquivos e no seu computador com sucesso.';
        }
        alert(alertMessage);
        setActiveSession(null);
        setReconciliationNotes('');

      } catch (sagaErr: any) {
        console.error("[Baixa Saga] Falha crítica na execução:", sagaErr);
        alert(`FALHA CRÍTICA NA BAIXA:\n\n${sagaErr.message || sagaErr}\n\nA operação foi cancelada e o mapa continua pendente de fechamento.`);
      } finally {
        setIsFinalizing(false);
      }
    };

    if (matchedRoute && matchedRoute.discrepancyObservation) {
      requestConfirm(
        "⚠️ Divergência do Monitoramento",
        `ATENÇÃO: O Monitoramento reportou a seguinte divergência de ativos de giro ou P.A para esta rota:\n\n"${matchedRoute.discrepancyObservation}"\n\nDeseja fechar o mapa mesmo assim? Certifique-se de que a divergência foi tratada.`,
        executeFinalization
      );
    } else {
      executeFinalization();
    }
  };

  // Filtering history lists
  const filteredHistory = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return historyAudits.filter(a => {
      const matchesSearch = !term ||
        a.routeMap.toLowerCase().includes(term) ||
        a.plate.toLowerCase().includes(term) ||
        getDriverName(a.driverId).toLowerCase().includes(term);
      
      // Check date bounds if configured with universal normalization
      let matchesDate = true;
      if (historyStartDate || historyEndDate) {
        matchesDate = isDateInRange(a.arrivalDate || (a as any).routeDate || a.startTime, historyStartDate, historyEndDate);
      }

      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'ok' && a.status === 'finalizado_ok') ||
        (statusFilter === 'divergentes' && a.status === 'finalizado_divergente') ||
        (statusFilter === 'reabertos' && (
          a.history?.some(h => h.action.includes('Reabertura Aprovada') || h.action.includes('Reaberto'))
        ));

      return matchesSearch && matchesDate && matchesStatus;
    });
  }, [historyAudits, searchTerm, getDriverName, historyStartDate, historyEndDate, statusFilter]);

  // Calculate stats for selected active session
  const getDiscrepancyTotals = (session: AuditSession) => {
    let missingCost = 0;
    let surplusCost = 0;
    let missingCount = 0;
    let surplusCount = 0;

    session.items.forEach(item => {
      const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
      const fiscal = item.fiscalQty ?? 0;
      const diff = physical - fiscal;
      if (diff < 0) {
        missingCount += Math.abs(diff);
        missingCost += Math.abs(diff) * item.cost;
      } else if (diff > 0) {
        surplusCount += diff;
        surplusCost += diff * item.cost;
      }
    });

    session.assets.forEach(asset => {
      const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
      const fiscal = asset.fiscalQty ?? 0;
      const comodato = asset.comodatoQty ?? 0;
      const recolha = asset.recolhaQty ?? 0;
      const diff = physical - fiscal + comodato - recolha;
      if (diff < 0) {
        missingCount += Math.abs(diff);
        missingCost += Math.abs(diff) * asset.cost;
      } else if (diff > 0) {
        surplusCount += diff;
        surplusCost += diff * asset.cost;
      }
    });

    return { missingCost, surplusCost, missingCount, surplusCount };
  };

  const handleOpenBackupModal = async () => {
    setLoadingBackupPhotos(true);
    try {
      const photos = await ImageDB.getAllPhotos();
      setBackupPhotos(photos || []);
    } catch (e) {
      console.error("Error loading photos for backup:", e);
    } finally {
      setLoadingBackupPhotos(false);
      setShowBackupModal(true);
    }
  };

  return (
    <div className="w-full px-2 sm:px-6 lg:px-8 py-4 sm:py-8" id="fiscal_view">
      {/* ALERTA DE MAPAS BAIXADOS PARA O FINANCEIRO (FECHAMENTO NO PROMAX) */}
      {currentUser.role === 'financeiro' && unacknowledgedBaixas.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-5 shadow-lg animate-fade-in">
          <div className="flex items-start space-x-4">
            <div className="bg-indigo-600 text-white p-3 rounded-xl shadow-md shrink-0">
              <ShieldAlert className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-sans font-black text-sm sm:text-base text-indigo-900 uppercase tracking-tight flex items-center gap-1.5">
                    🚨 Mapas Aguardando Fechamento no Promax
                  </h3>
                  <p className="text-xs text-indigo-700 font-medium">
                    As colaboradoras realizaram a baixa fiscal dos mapas abaixo. É necessário efetuar o fechamento definitivo correspondente no sistema <strong>Promax</strong>.
                  </p>
                </div>
                <span className="bg-indigo-200/80 text-indigo-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase font-mono shadow-3xs border border-indigo-300 animate-pulse shrink-0">
                  {unacknowledgedBaixas.length} Pendente{unacknowledgedBaixas.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                {unacknowledgedBaixas.map((audit) => {
                  const isOk = audit.status === 'finalizado_ok';
                  const fechamentoLog = audit.history?.find(h => h.action.includes('Baixa Concluída')) || audit.history?.[audit.history.length - 1];
                  const fechamentoTime = fechamentoLog ? new Date(fechamentoLog.timestamp).toLocaleString('pt-BR') : 'N/A';
                  
                  return (
                    <div key={audit.id} className="bg-white border border-indigo-150 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-all">
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-sans font-black text-sm text-slate-800">{audit.routeMap}</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {isOk ? 'Saldo OK' : 'Divergente'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono space-y-0.5 leading-relaxed">
                          <div>🚗 <strong>Placa:</strong> {audit.plate}</div>
                          <div>👤 <strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                          <div>🕒 <strong>Baixado em:</strong> {fechamentoTime}</div>
                          <div>👩‍💻 <strong>Por:</strong> {fechamentoLog?.user || 'Colaboradora'}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAcknowledgePromax(audit.id)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-sans font-black text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1 border border-indigo-500"
                      >
                        <Check className="h-4 w-4" />
                        <span>Marcar como Ciente / Fechado no Promax</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upper Navigation Header */}
      <div className="bg-slate-800 rounded-2xl p-6 mb-8 text-white shadow-xl border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-amber-500 text-slate-950 font-mono text-xxs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
            Painel Fiscal (Reconciliação & Baixas)
          </span>
          <h1 className="text-3xl font-sans font-bold tracking-tight text-white mt-3">
            Confronto de Saldo Físico vs Fiscal
          </h1>
          <p className="text-slate-300 mt-1 text-sm max-w-2xl">
            Verifique as aferições do Conferente Física, compare com o Saldo Fiscal de Retorno e aprove os retornos de rota. Lance reconferências caso encontre divergências inexplicáveis.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 shrink-0 relative">
          {/* NOTIFICATION BUBBLE FROM MONITORAMENTO */}
          {(() => {
            const pernoiteForecasts = returnForecasts.filter(f => isForecastActivePernoite(f, audits, importedRoutes));
            const emRotaWithEta = returnForecasts.filter(f => f.tripStatus !== 'pernoitam' && f.eta && f.status !== 'no_patio');
            const totalNotifications = pernoiteForecasts.length + emRotaWithEta.length;

            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMonitorAlerts(!showMonitorAlerts)}
                  className={`relative p-2.5 rounded-xl border transition-all duration-300 flex items-center space-x-2 cursor-pointer ${
                    totalNotifications > 0 
                      ? 'bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 text-amber-400 animate-pulse-slow' 
                      : 'bg-slate-700 border-slate-600 hover:bg-slate-650 text-slate-400'
                  }`}
                  title="Alertas de Rastreamento (Pernoites e Previsões)"
                >
                  <Clock className="h-4.5 w-4.5" />
                  <span className="font-sans font-bold text-xs text-white">Pernoites & Chegadas</span>
                  {totalNotifications > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-mono text-[9px] font-extrabold h-4.5 w-4.5 rounded-full flex items-center justify-center animate-bounce shadow-md border border-slate-800">
                      {totalNotifications}
                    </span>
                  )}
                </button>

                {showMonitorAlerts && (
                  <div className="absolute right-0 top-12 mt-2 w-80 md:w-96 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-2xl p-4 z-50 animate-fade-in space-y-4 font-sans">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="font-sans font-black text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Alertas do Rastreamento
                      </span>
                      <button 
                        type="button"
                        onClick={() => setShowMonitorAlerts(false)}
                        className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2 py-0.5 rounded hover:bg-slate-100 transition-all cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>

                    {/* SECTION 1: PERNOITE */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">
                        <span>🌙 IRÃO PERNOITAR ({pernoiteForecasts.length})</span>
                      </div>
                      {pernoiteForecasts.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Nenhum veículo em pernoite cadastrado.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {pernoiteForecasts.map((f) => (
                            <div key={f.id} className="bg-amber-50/70 p-2 rounded-lg border border-amber-200 space-y-1 text-xxs">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-slate-950 font-mono">MAPA {f.routeMap}</span>
                                <span className="bg-amber-100 text-amber-800 font-black text-[8px] uppercase px-1.5 py-0.2 rounded font-mono">🌙 Pernoitar</span>
                              </div>
                              <div className="text-slate-600 font-sans">
                                <div><strong>Placa:</strong> {f.plate} | <strong>Motorista:</strong> {f.driverName}</div>
                                <div><strong>Previsão de Retorno:</strong> {f.eta}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: ETA PREVISOES */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">
                        <span>⏰ PREVISÕES DE CHEGADA ({emRotaWithEta.length})</span>
                      </div>
                      {emRotaWithEta.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">Nenhuma nova previsão de chegada.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {emRotaWithEta.map((f) => (
                            <div key={f.id} className="bg-indigo-50/40 p-2 rounded-lg border border-indigo-150 space-y-1 text-xxs">
                              <div className="flex justify-between items-center">
                                <span className="font-extrabold text-slate-950 font-mono">MAPA {f.routeMap}</span>
                                <span className="bg-indigo-100 text-indigo-800 font-bold text-[8px] uppercase px-1.5 py-0.2 rounded font-mono">⏰ Em Rota</span>
                              </div>
                              <div className="text-slate-600 font-sans">
                                <div><strong>Placa:</strong> {f.plate} | <strong>Motorista:</strong> {f.driverName}</div>
                                <div className="text-indigo-900 font-bold"><strong>Previsão ETA:</strong> {f.eta}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {activeSession && (
            <button
              onClick={() => {
                setActiveSession(null);
                setReconciliationNotes('');
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-600 transition"
            >
              Voltar para Listagem
            </button>
          )}
        </div>
      </div>

      {!activeSession ? (
        <div className="space-y-8">
          
          {/* Section: Sincronizador de Liberação Diária (Spreadsheet Route Import) */}
          {activeTab === 'sincronizador' && (currentUser.role === 'gestor' || currentUser.role === 'auxiliar_logistica') && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-100 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-xl">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-sans font-bold text-lg text-slate-900 uppercase">Sincronizador & Importador de Rotas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Importe a planilha diária para prever as rotas e placas de amanhã.</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-md border border-emerald-150 text-[11px] font-semibold">
                    <span>Rotina do Promax para exportar rotas:</span>
                    <strong className="text-emerald-900 font-mono bg-white px-1.5 py-0.2 rounded border border-emerald-200">03.11.49.02</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Data da Rota:</span>
                  <input
                    type="date"
                    value={routeImportDate}
                    onChange={(e) => setRouteImportDate(e.target.value)}
                    className="text-xs bg-transparent border-none text-slate-900 focus:outline-none font-semibold font-mono"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const activeDateRoutes = importedRoutes.filter(r => r.routeDate === routeImportDate);
                    if (activeDateRoutes.length === 0) {
                      alert('Nenhum mapa importado para esta data.');
                      return;
                    }
                    requestConfirm(
                      "⚠️ Apagar Mapas do Dia?",
                      `Tem certeza que deseja apagar TODOS os ${activeDateRoutes.length} mapas importados para a data ${new Date(routeImportDate + 'T00:00:00').toLocaleDateString('pt-BR')}?`,
                      () => {
                        const updatedRoutes = importedRoutes.filter(r => r.routeDate !== routeImportDate);
                        if (onSaveImportedRoutes) {
                          onSaveImportedRoutes(updatedRoutes);
                        }
                        alert('Todos os mapas importados da data selecionada foram excluídos.');
                      }
                    );
                  }}
                  className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[10px] font-bold uppercase rounded-lg transition shadow-sm flex items-center space-x-1 cursor-pointer"
                  title="Apagar todos os mapas importados para esta data"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpar Mapas do Dia</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenBackupModal}
                  disabled={loadingBackupPhotos}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-[10px] font-bold uppercase rounded-lg transition shadow-sm flex items-center space-x-1 cursor-pointer hover:shadow-md"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>{loadingBackupPhotos ? 'Carregando...' : 'Exportar PDF de Backup'}</span>
                </button>

                {onResetPlatformData && (
                  <button
                    type="button"
                    onClick={() => {
                      setResetPassword('');
                      setResetError('');
                      setResetConfirmText('');
                      setShowResetModal(true);
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-750 text-white text-[10px] font-bold uppercase rounded-lg transition shadow-sm flex items-center space-x-1 cursor-pointer hover:shadow-md"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Resetar Plataforma</span>
                  </button>
                )}
              </div>
            </div>

            {/* Sincronizador Sub-Tabs Selector */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200" id="sincronizador_subtabs_bar">
              <button
                type="button"
                id="tab_btn_importacao_mensal_unificada"
                onClick={() => setSincSubTab('importacao_mensal_unificada')}
                className={`px-4 py-2.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2 cursor-pointer shadow-xs ${
                  sincSubTab === 'importacao_mensal_unificada'
                    ? 'bg-gradient-to-r from-indigo-700 to-indigo-900 text-white shadow-md ring-2 ring-indigo-500/50'
                    : 'bg-white/80 text-indigo-900 hover:bg-white border border-indigo-100'
                }`}
              >
                <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
                <span>Importação Mensal Unificada: EFD, Ciclos & Refugo (Guia dos Meses)</span>
                <span className="bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                  Unificado
                </span>
              </button>

              <button
                type="button"
                id="tab_btn_rotas_dia"
                onClick={() => setSincSubTab('rotas_dia')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  sincSubTab === 'rotas_dia'
                    ? 'bg-white text-emerald-800 shadow-sm border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Mapas do Dia (Rotina 03.11.49.02)</span>
              </button>
            </div>

            {/* TAB UNIFICADA: Importação Mensal Unificada (EFD + Refugo + D1-D4 com Guia dos Meses) */}
            {sincSubTab === 'importacao_mensal_unificada' && (
              <div className="space-y-6 animate-fade-in" id="sincronizador_importacao_mensal_unificada_tab">
                <UnifiedMonthlyImportTab
                  importedRoutes={importedRoutes}
                  audits={audits}
                  drivers={drivers}
                  currentUser={currentUser}
                  onSaveImportedRoutes={onSaveImportedRoutes}
                  onSaveAudits={onSaveAudits}
                  onSaveDrivers={onSaveDrivers}
                  onSyncFirestore={async (data) => {
                    if (isClientFirebaseActive()) {
                      await saveDirectlyToFirestore({
                        audits: data.audits || audits,
                        drivers: data.drivers || drivers
                      });
                    }
                  }}
                />
              </div>
            )}

            {/* TAB 1: Mapas do Dia (Rotina 03.11.49.02) */}
            {sincSubTab === 'rotas_dia' && (
              <div className="space-y-6 animate-fade-in" id="sincronizador_rotas_dia_tab">
                {/* Drag & Drop Upload Zone */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-amber-50/40 p-4 rounded-xl border border-amber-200/50">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase font-mono">
                    <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></span>
                    Configuração de Sincronização (Mesclagem Ativa)
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed max-w-xl">
                    Os mapas são importados quase que diariamente. Ativando o <strong>Modo de Mesclagem</strong>, todas as informações de mapas anteriores que ainda estão em aberto permanecem na plataforma até o fechamento e baixa total.
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg shadow-3xs border border-slate-200 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Modo Mesclar:</span>
                  <button
                    type="button"
                    onClick={() => setIsMergeMode(!isMergeMode)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isMergeMode ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isMergeMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-[10px] font-extrabold uppercase font-mono ${isMergeMode ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {isMergeMode ? 'Ativado' : 'Inativo'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                {/* Unified Route File Import */}
                <div className="lg:col-span-7 flex flex-col h-full">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleFileImport(e.dataTransfer.files[0], isMergeMode);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-4 flex-grow ${
                      isDragOver
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                    onClick={() => document.getElementById('route-file-input')?.click()}
                    id="unified-route-import-dropzone"
                  >
                    <input
                      id="route-file-input"
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileImport(e.target.files[0], isMergeMode);
                        }
                      }}
                      className="hidden"
                    />

                    <div className={`p-3 rounded-full ${isDragOver ? 'bg-emerald-100 text-emerald-800 animate-bounce' : 'bg-slate-100 text-slate-500'}`}>
                      <FileSpreadsheet className="h-8 w-8" />
                    </div>

                    <div className="max-w-md">
                      <p className="text-sm font-bold text-slate-800">
                        Arraste e solte a planilha aqui ou <span className="text-emerald-600 underline">procure nos arquivos</span>
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Suporta arquivos delimitados por ponto e vírgula (.csv, .txt).
                      </p>
                    </div>

                    <div className="bg-emerald-50/60 border border-emerald-150 rounded-lg p-3 w-full text-left text-[11px] text-emerald-850 space-y-1">
                      <span className="font-sans font-bold text-emerald-900 block uppercase tracking-wider text-[9px] flex items-center gap-1">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                        Rotina Promax Necessária:
                      </span>
                      <p className="leading-relaxed text-slate-600 font-sans text-[10px]">
                        Acesse no Promax a rotina de exportação <strong className="text-emerald-950 font-mono bg-white px-1.5 py-0.2 rounded border border-emerald-250 font-extrabold text-[10px]">03.11.49.02</strong> (Controle de Mapas). O arquivo de texto (.csv ou .txt) deve conter Mapas, Veículos e Motoristas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Manual Insertion Form */}
                <div className="lg:col-span-5 bg-slate-50/50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 pb-2.5 mb-3.5 border-b border-slate-200">
                      <PlusCircle className="h-5 w-5 text-indigo-600" />
                      <h3 className="font-sans font-bold text-xs text-slate-900 uppercase tracking-wider">Inserir Mapa Manualmente</h3>
                    </div>

                    <form onSubmit={handleManualMapSubmit} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Número do Mapa</label>
                        <input
                          type="text"
                          value={manualMap}
                          onChange={(e) => setManualMap(e.target.value)}
                          placeholder="Ex: 54321"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Placa do Veículo</label>
                        <input
                          type="text"
                          value={manualPlate}
                          onChange={(e) => setManualPlate(e.target.value)}
                          placeholder="Ex: ABC1D23"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Data do Mapa</label>
                        <input
                          type="date"
                          value={manualDate}
                          onChange={(e) => setManualDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Motorista (Opcional)</label>
                        <select
                          value={manualDriverId}
                          onChange={(e) => setManualDriverId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">-- Não Selecionado --</option>
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.id} - {d.name} ({d.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="w-full mt-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-750 text-white font-bold text-xxs uppercase rounded-lg shadow-sm transition hover:shadow-md cursor-pointer flex items-center justify-center space-x-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Cadastrar Mapa Manual</span>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Progress Metrics */}
            {(() => {
              const selectedRoutes = importedRoutes.filter(r => {
                const isToday = r.routeDate === routeImportDate;
                const isOpen = r.status !== 'fechado' && !isRouteClosed(r.routeMap);
                return isToday || isOpen;
              });
              const total = selectedRoutes.length;
              const closed = selectedRoutes.filter(r => r.status === 'fechado' || isRouteClosed(r.routeMap)).length;
              const open = total - closed;
              const pct = total > 0 ? (closed / total) * 100 : 0;

              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Mapas na Data</span>
                      <span className="text-xl font-sans font-bold text-slate-900 mt-1 block font-mono">{total} mapas</span>
                    </div>

                    <div className="bg-amber-50/45 p-3.5 rounded-lg border border-amber-100">
                      <span className="text-[10px] text-amber-500 font-bold uppercase block">Pendente / Conferindo</span>
                      <span className="text-xl font-sans font-bold text-amber-700 mt-1 block font-mono">{open} mapas</span>
                    </div>

                    <div className="bg-emerald-50/45 p-3.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-emerald-500 font-bold uppercase block">Liberado & Fechado</span>
                      <span className="text-xl font-sans font-bold text-emerald-700 mt-1 block font-mono">{closed} mapas</span>
                    </div>
                  </div>

                  {total > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xxs font-mono font-bold text-slate-400 uppercase">
                        <span>Progresso de Fechamento de Cargas</span>
                        <span>{(pct || 0).toFixed(0)}% Fechado</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div className="bg-emerald-500 h-2 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Circular Blitz Banner & Quick Draw Trigger */}
                  {(() => {
                    const blitzesToday = selectedRoutes.filter(r => r.isBlitz);
                    return (
                      <div className="bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border border-red-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black">⚡ BLITZ</span>
                            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                              Veículos Sorteados para Blitz de Refugo (2x por Dia)
                            </h4>
                          </div>
                          {blitzesToday.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {blitzesToday.map(b => (
                                <span key={b.id} className="bg-white border border-red-300 text-red-900 font-extrabold text-[11px] px-2.5 py-1 rounded-lg shadow-xs flex items-center space-x-1 font-mono">
                                  <span>Mapa {b.routeMap}</span>
                                  <span className="text-slate-300 font-normal">|</span>
                                  <span className="text-slate-700">Placa: {b.plate}</span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-600 font-medium">
                              {total > 0 
                                ? "Nenhuma blitz atribuída ainda. Clique ao lado para realizar o sorteio circular das 2 blitzes de refugo do dia."
                                : "Importe os mapas do dia via rotina 03.11.49.02 para sortear as blitzes."}
                            </p>
                          )}
                        </div>

                        {total > 0 && (
                          <button
                            type="button"
                            onClick={handleForceRecalculateBlitz}
                            className="shrink-0 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg shadow-sm transition flex items-center justify-center space-x-1.5 cursor-pointer uppercase tracking-wider"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Redistribuir Blitz Hoje (2x)</span>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* List of imported route cards for Auxiliar */}
                  {selectedRoutes.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedRoutes.map(route => {
                        const isClosed = route.status === 'fechado';
                        const isConferindo = route.status === 'conferindo';
                        const isDescarregado = !isClosed && !isConferindo && (route.loadingStatus === 'descarregado' || route.status === 'descarregado');

                        return (
                          <div key={route.id} className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 transition-all ${
                            isClosed 
                              ? 'bg-emerald-50/5 border-emerald-200/60' 
                              : isConferindo 
                                ? 'bg-amber-50/10 border-amber-300' 
                                : isDescarregado
                                  ? 'bg-emerald-50/30 border-emerald-300 shadow-2xs'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <span className="font-extrabold text-sm text-slate-900 block">{route.routeMap}</span>
                                <div className="space-y-0.5">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-mono text-[10px] text-slate-400">Placa: {route.plate}</span>
                                    {route.isBlitz && (
                                      <span className="bg-red-100 text-red-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-red-200 uppercase tracking-wider animate-pulse">
                                        ⚡ Blitz de Refugo (2x Dia)
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-600 font-medium">
                                    Motorista: <strong className="text-slate-800">{getDriverName(route.driverId) || 'Não Selecionado'}</strong>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-500 font-mono pt-1">
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200/60 font-semibold">
                                      Data Rota: {route.routeDate ? new Date(route.routeDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                                    </span>
                                    {route.importedAt && (
                                      <span className="text-slate-400">
                                        Imp: {new Date(route.importedAt).toLocaleDateString('pt-BR')}
                                      </span>
                                    )}
                                  </div>
                                  {isDescarregado && (route.loadingOperatorName || route.loadingPalletsCount) && (
                                    <div className="text-[9px] text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded border border-emerald-200 font-sans mt-1">
                                      Empilhador: <strong>{route.loadingOperatorName || 'Operador'}</strong>
                                      {route.loadingPalletsCount ? ` • ${route.loadingPalletsCount} paletes` : ''}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1.5">
                                <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                  isClosed 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : isConferindo 
                                      ? 'bg-amber-100 text-amber-800 animate-pulse' 
                                      : isDescarregado
                                        ? 'bg-emerald-600 text-white shadow-2xs font-black'
                                        : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {isClosed ? 'Fechado' : isConferindo ? 'Conferindo' : isDescarregado ? '🚚 Descarregado' : 'Pendente'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    requestConfirm(
                                      "❌ Excluir Mapa?",
                                      `Tem certeza que deseja excluir permanentemente o mapa ${route.routeMap} (${route.plate})?`,
                                      () => {
                                        const updatedRoutes = importedRoutes.filter(r => r.id !== route.id);
                                        if (onSaveImportedRoutes) {
                                          onSaveImportedRoutes(updatedRoutes);
                                        }
                                        alert(`Mapa ${route.routeMap} excluído com sucesso.`);
                                      }
                                    );
                                  }}
                                  className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-slate-100 cursor-pointer"
                                  title="Excluir este mapa"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Driver Selection Dropdown */}
                            <div className="text-xxs text-slate-500 bg-slate-50/50 p-2 rounded-lg border border-slate-100 space-y-1">
                              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[8px]">Selecione o Motorista:</span>
                              <select
                                value={route.driverId || ''}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  const updated = importedRoutes.map(r => {
                                    if (r.id === route.id) {
                                      return { ...r, driverId: selectedId };
                                    }
                                    return r;
                                  });
                                  if (onSaveImportedRoutes) {
                                    onSaveImportedRoutes(updated);
                                  }

                                  // Update forecast driver name too
                                  const dObj = drivers.find(d => d.id === selectedId);
                                  const dName = selectedId === 'temporario' ? 'Temporário' : (dObj ? dObj.name : '');
                                  if (dName) {
                                    const updatedForecasts = returnForecasts.map(f => {
                                      if (f.routeMap.toUpperCase() === route.routeMap.toUpperCase()) {
                                        return { ...f, driverName: dName };
                                      }
                                      return f;
                                    });
                                    if (onSaveForecasts) {
                                      onSaveForecasts(updatedForecasts);
                                    }
                                  }
                                }}
                                className="w-full text-xxs bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium text-slate-800"
                                disabled={isClosed}
                              >
                                <option value="">-- Selecione o Motorista --</option>
                                <option value="temporario">Temporário</option>
                                {drivers.map(d => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Pernoite & EFD Logistics Status */}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xxs">
                              <div className="flex items-center space-x-1">
                                {route.dayCycleStage && (
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold font-mono ${
                                    route.dayCycleStage === 'D1' ? 'bg-emerald-100 text-emerald-800' :
                                    route.dayCycleStage === 'D2' ? 'bg-blue-100 text-blue-800' :
                                    route.dayCycleStage === 'D3' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {route.dayCycleStage}
                                  </span>
                                )}
                                {route.arrivalTime && (
                                  <span className="text-[9px] text-slate-500 font-mono">
                                    Cheg: {route.arrivalTime}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleToggleRoutePernoite(route)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition flex items-center space-x-1 cursor-pointer ${
                                  route.isPernoite
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                }`}
                                title="Marcar/Desmarcar pernoite (não penaliza EFD)"
                              >
                                <Moon className="h-2.5 w-2.5" />
                                <span>{route.isPernoite ? '🌙 Pernoitou' : 'Marcar Pernoite'}</span>
                              </button>
                            </div>

                            {route.discrepancyObservation && (
                              <div className="bg-red-50 border border-red-200 text-red-950 text-xxs p-2 rounded-lg font-sans space-y-1">
                                <span className="font-extrabold text-[9px] text-red-700 uppercase block">⚠️ ALERTA DO MONITORAMENTO:</span>
                                <p className="italic leading-relaxed">"{route.discrepancyObservation}"</p>
                              </div>
                            )}

                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => {
                                  const confirmMsg = route.discrepancyObservation
                                    ? `ATENÇÃO CRÍTICA: O Monitoramento reportou uma divergência para este mapa:\n\n"${route.discrepancyObservation}"\n\nTem certeza absoluta de que deseja dar BAIXA DIRETA e FECHAR o mapa ${route.routeMap} mesmo assim?`
                                    : `Você tem certeza de que deseja realizar a BAIXA DIRETA no mapa ${route.routeMap}?\n\nEsta ação encerrará o mapa imediatamente no sistema sem exigir conferência de pátio ou auditoria física. Confirma?`;

                                  const confirmTitle = route.discrepancyObservation
                                    ? "⚠️ Alerta de Divergência Pendente"
                                    : "❓ Confirmar Baixa Direta?";

                                  requestConfirm(
                                    confirmTitle,
                                    confirmMsg,
                                    () => {
                                      const updated = importedRoutes.map(r => r.id === route.id ? { ...r, status: 'fechado' as const } : r);
                                      if (onSaveImportedRoutes) {
                                        onSaveImportedRoutes(updated);
                                        alert(`Mapa ${route.routeMap} baixado diretamente com sucesso.`);
                                      }
                                    }
                                  );
                                }}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] py-1.5 rounded uppercase cursor-pointer"
                              >
                                Dar Baixa Direta
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xxs text-slate-400 italic font-medium py-3 text-center border border-dashed border-slate-100 rounded">
                      Nenhuma rota importada para esta data. Altere a data acima ou clique em "Importar Planilha" para simular.
                    </p>
                  )}
                </div>
              );
            })()}
            </div>
            )}
          </div>
          )}
          
          {/* Section: Real-time Progress Charts & Three-Column Process Tracker */}
          {activeTab === 'reconciliacao' && (
            <div className="space-y-6">
            
            {/* Seção de Alertas e Solicitações de Reabertura de Mapas */}
            {(() => {
              const requestedAudits = audits.filter(a => a.reopeningRequested === true);
              if (requestedAudits.length === 0) return null;

              return (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-4 shadow-xs animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">🔓</span>
                      <div>
                        <h4 className="font-sans font-extrabold text-xs sm:text-sm text-amber-900 uppercase">
                          Solicitações de Reabertura de Mapas ({requestedAudits.length})
                        </h4>
                        <p className="text-[10px] text-amber-700 font-mono">
                          As solicitações listadas abaixo aguardam análise do Financeiro
                        </p>
                      </div>
                    </div>
                    <span className="bg-amber-200/60 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                      Pendente de Aprovação
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {requestedAudits.map((audit) => (
                      <div key={audit.id} className="bg-white border border-amber-200/80 rounded-lg p-3.5 space-y-2.5 shadow-2xs">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 block text-xs sm:text-sm">{audit.routeMap}</span>
                            <span className="font-mono text-[9px] text-slate-400 block">Placa: {audit.plate} | Motorista: {getDriverName(audit.driverId)}</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {audit.reopeningRequestDate ? new Date(audit.reopeningRequestDate).toLocaleDateString('pt-BR') : ''}
                          </span>
                        </div>

                        <div className="text-xs bg-amber-50/40 p-2.5 rounded border border-amber-100 italic text-slate-700">
                          <strong className="text-[10px] uppercase text-amber-800 block not-italic font-sans mb-1">
                            Justificativa de {audit.reopeningRequestUser || 'Auxiliar'}:
                          </strong>
                          "{audit.reopeningJustification}"
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <button
                            onClick={() => setSelectedHistoryAudit(audit)}
                            className="text-[10px] text-slate-500 hover:text-slate-800 font-bold uppercase underline cursor-pointer font-sans"
                          >
                            Ver Detalhes do Mapa
                          </button>

                          {(currentUser.role === 'financeiro' || currentUser.role === 'gestor') && (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleApproveReopening(audit.id)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition shadow-2xs cursor-pointer flex items-center space-x-1 font-sans"
                              >
                                <span>Aprovar Reabertura</span>
                              </button>
                              <button
                                onClick={() => handleRejectReopening(audit.id)}
                                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer font-sans"
                              >
                                <span>Recusar</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Process Progress Chart */}
            {(() => {
              const isRouteConcluido = (r: ImportedRoute) => (r.status as string) === 'fechado' || isRouteClosed(r.routeMap);

              const totalConcluido = importedRoutes.filter(r => isRouteConcluido(r)).length;
              const totalConciliar = pendingAudits.length;
              const totalConferindo = importedRoutes.filter(r => !isRouteConcluido(r) && r.status === 'conferindo').length;
              const totalRecount = importedRoutes.filter(r => !isRouteConcluido(r) && r.status === 'reconferir').length;
              const totalDescarregado = importedRoutes.filter(r => 
                !isRouteConcluido(r) && 
                r.status !== 'conferindo' && 
                r.status !== 'reconferir' && 
                (r.loadingStatus === 'descarregado' || r.status === 'descarregado')
              ).length;
              const totalPending = importedRoutes.filter(r => 
                !isRouteConcluido(r) && 
                r.status !== 'conferindo' && 
                r.status !== 'reconferir' && 
                r.loadingStatus !== 'descarregado' && 
                r.status !== 'descarregado' && 
                (r.status === 'pendente' || !r.status)
              ).length;

              const totalCalculated = totalPending + totalDescarregado + totalConferindo + totalRecount + totalConciliar + totalConcluido;
              const pendingPct = totalCalculated > 0 ? (totalPending / totalCalculated) * 100 : 0;
              const descarregadoPct = totalCalculated > 0 ? (totalDescarregado / totalCalculated) * 100 : 0;
              const conferindoPct = totalCalculated > 0 ? (totalConferindo / totalCalculated) * 100 : 0;
              const recountPct = totalCalculated > 0 ? (totalRecount / totalCalculated) * 100 : 0;
              const conciliarPct = totalCalculated > 0 ? (totalConciliar / totalCalculated) * 100 : 0;
              const concluidoPct = totalCalculated > 0 ? (totalConcluido / totalCalculated) * 100 : 0;

              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-2">
                      <SlidersHorizontal className="h-5 w-5 text-indigo-600 animate-spin-slow" />
                      <span>Monitoramento Integrado de Processos</span>
                    </h3>
                    <span className="text-xxs font-mono text-slate-400 font-bold uppercase">Tempo Real</span>
                  </div>

                  <div className="space-y-4">
                    {/* Progress Bar Chart */}
                    <div className="h-7 rounded-xl overflow-hidden flex border border-slate-100 shadow-3xs bg-slate-150">
                      {pendingPct > 0 && (
                        <div 
                          className="bg-red-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${pendingPct}%` }}
                          title={`Pendentes: ${totalPending} (${(pendingPct || 0).toFixed(0)}%)`}
                        >
                          {pendingPct > 8 && `PENDENTES (${totalPending})`}
                        </div>
                      )}
                      {descarregadoPct > 0 && (
                        <div 
                          className="bg-emerald-600 h-full flex items-center justify-center text-white text-[10px] font-black font-mono transition-all shadow-inner"
                          style={{ width: `${descarregadoPct}%` }}
                          title={`Descarregados: ${totalDescarregado} (${(descarregadoPct || 0).toFixed(0)}%)`}
                        >
                          {descarregadoPct > 8 && `DESCARREGADOS (${totalDescarregado})`}
                        </div>
                      )}
                      {conferindoPct > 0 && (
                        <div 
                          className="bg-amber-500 h-full flex items-center justify-center text-slate-950 text-[10px] font-bold font-mono transition-all animate-pulse"
                          style={{ width: `${conferindoPct}%` }}
                          title={`Conferindo: ${totalConferindo} (${(conferindoPct || 0).toFixed(0)}%)`}
                        >
                          {conferindoPct > 8 && `CONFERINDO (${totalConferindo})`}
                        </div>
                      )}
                      {recountPct > 0 && (
                        <div 
                          className="bg-purple-600 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${recountPct}%` }}
                          title={`Recount: ${totalRecount} (${(recountPct || 0).toFixed(0)}%)`}
                        >
                          {recountPct > 8 && `RECOUNT (${totalRecount})`}
                        </div>
                      )}
                      {conciliarPct > 0 && (
                        <div 
                          className="bg-indigo-500 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${conciliarPct}%` }}
                          title={`Conciliar: ${totalConciliar} (${(conciliarPct || 0).toFixed(0)}%)`}
                        >
                          {conciliarPct > 8 && `CONCILIAR (${totalConciliar})`}
                        </div>
                      )}
                      {concluidoPct > 0 && (
                        <div 
                          className="bg-slate-900 h-full flex items-center justify-center text-white text-[10px] font-bold font-mono transition-all"
                          style={{ width: `${concluidoPct}%` }}
                          title={`Concluído: ${totalConcluido} (${(concluidoPct || 0).toFixed(0)}%)`}
                        >
                          {concluidoPct > 8 && `CONCLUÍDO (${totalConcluido})`}
                        </div>
                      )}
                      {totalCalculated === 0 && (
                        <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                          Sem mapas na operação atual
                        </div>
                      )}
                    </div>

                    {/* Legend Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3 text-center">
                      <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">1. Pendente Descarga</span>
                        <span className="text-base font-extrabold font-sans text-red-600 block mt-0.5">{totalPending}</span>
                        <span className="text-[8px] text-slate-400 font-medium block">Aguardando descarga</span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 ring-1 ring-emerald-300/60">
                        <span className="text-[9px] text-emerald-700 font-black uppercase block font-mono flex items-center justify-center gap-0.5">
                          <span>2. Descarregados</span>
                        </span>
                        <span className="text-base font-black font-sans text-emerald-700 block mt-0.5">{totalDescarregado}</span>
                        <span className="text-[8px] text-emerald-600 font-bold block">Pronto p/ conferir</span>
                      </div>
                      <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                        <span className="text-[9px] text-amber-700 font-bold uppercase block font-mono">3. Conferindo</span>
                        <span className="text-base font-extrabold font-sans text-amber-600 block mt-0.5">{totalConferindo}</span>
                        <span className="text-[8px] text-slate-400 font-medium block">Conferência física</span>
                      </div>
                      <div className="p-2.5 bg-purple-50/50 rounded-xl border border-purple-100">
                        <span className="text-[9px] text-purple-700 font-bold uppercase block font-mono">4. Recount</span>
                        <span className="text-base font-extrabold font-sans text-purple-600 block mt-0.5">{totalRecount}</span>
                        <span className="text-[8px] text-slate-400 font-medium block">Reconferência</span>
                      </div>
                      <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                        <span className="text-[9px] text-indigo-700 font-bold uppercase block font-mono">5. Conciliar</span>
                        <span className="text-base font-extrabold font-sans text-indigo-600 block mt-0.5">{totalConciliar}</span>
                        <span className="text-[8px] text-slate-400 font-medium block">Aguardando baixa</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block font-mono">6. Finalizados</span>
                        <span className="text-base font-extrabold font-sans text-slate-900 block mt-0.5">{totalConcluido}</span>
                        <span className="text-[8px] text-slate-500 font-medium block">Concluídos no turno</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Three-Column Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Column 1: Sendo Trabalhados / Em Aberto */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-1.5">
                    <Clock className="h-4.5 w-4.5 text-amber-500" />
                    <span>Sendo Trabalhados</span>
                  </h3>
                  <span className="bg-amber-100 text-amber-800 text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {importedRoutes.filter(r => r.status !== 'fechado' && r.status !== 'em_analise' && !isRouteClosed(r.routeMap)).length} mapas
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {importedRoutes.filter(r => r.status !== 'fechado' && r.status !== 'em_analise' && !isRouteClosed(r.routeMap)).length === 0 ? (
                    <div className="text-center py-8 text-xxs italic text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                      Nenhum mapa sendo trabalhado.
                    </div>
                  ) : (
                    importedRoutes.filter(r => r.status !== 'fechado' && r.status !== 'em_analise' && !isRouteClosed(r.routeMap)).map(route => {
                      const isPendente = (route.status === 'pendente' || !route.status) && route.loadingStatus !== 'descarregado';
                      const isDescarregando = route.status === 'descarregando' || route.loadingStatus === 'em_descarregamento';
                      const isDescarregado = (route.status === 'descarregado' || route.loadingStatus === 'descarregado') && route.status !== 'conferindo' && route.status !== 'reconferir';
                      const isConferindo = route.status === 'conferindo';
                      const isEmAnalise = route.status === 'em_analise';
                      const isReconferir = route.status === 'reconferir';

                      let badgeColor = "bg-slate-100 text-slate-800 border-slate-200";
                      let statusText = "Pendente Descarga";
                      if (isDescarregando) {
                        badgeColor = "bg-blue-100 text-blue-800 border-blue-200 animate-pulse";
                        statusText = "Descarregando";
                      } else if (isDescarregado) {
                        badgeColor = "bg-emerald-600 text-white border-emerald-700 font-black shadow-2xs";
                        statusText = "🚚 DESCARREGADO";
                      } else if (isConferindo) {
                        badgeColor = "bg-amber-100 text-amber-800 border-amber-200 animate-pulse";
                        statusText = "Conferindo";
                      } else if (isEmAnalise) {
                        badgeColor = "bg-emerald-100 text-emerald-800 border-emerald-200";
                        statusText = "Em Análise";
                      } else if (isReconferir) {
                        badgeColor = "bg-purple-100 text-purple-800 border-purple-200 animate-pulse";
                        statusText = "Pedida Recontagem";
                      }

                      return (
                        <div key={route.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2 text-xxs">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-extrabold text-slate-900 font-sans block text-sm">{route.routeMap}</span>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[9px] text-slate-400 block">Placa: {route.plate}</span>
                                  {route.isBlitz && (
                                    <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.2 rounded font-sans uppercase">
                                      🚨 Blitz
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-500 font-mono block">Data Rota: {route.routeDate ? new Date(route.routeDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${badgeColor}`}>
                                {statusText}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestConfirm(
                                    "❌ Excluir Mapa?",
                                    `Tem certeza que deseja excluir permanentemente o mapa ${route.routeMap} (${route.plate})?`,
                                    () => {
                                      const updatedRoutes = importedRoutes.filter(r => r.id !== route.id);
                                      if (onSaveImportedRoutes) {
                                        onSaveImportedRoutes(updatedRoutes);
                                      }
                                      alert(`Mapa ${route.routeMap} excluído com sucesso.`);
                                    }
                                  );
                                }}
                                className="text-slate-400 hover:text-red-600 transition-colors p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                                title="Excluir este mapa"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                              <div><strong>Motorista:</strong> {getDriverName(route.driverId)}</div>
                              <button
                                type="button"
                                onClick={() => handleToggleRoutePernoite(route)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold transition flex items-center space-x-1 cursor-pointer shrink-0 ${
                                  route.isPernoite
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                }`}
                                title="Classificar se veículo irá pernoitar no pátio"
                              >
                                <Moon className="h-2.5 w-2.5" />
                                <span>{route.isPernoite ? '🌙 Pernoitou' : 'Pernoite'}</span>
                              </button>
                            </div>
                            {route.unloadingStartTime && (
                              <div className="text-[9px] text-blue-700 font-medium">
                                ⏱️ Descarregamento: {route.unloadingStartTime} {route.unloadingEndTime ? `até ${route.unloadingEndTime}` : '(em andamento)'}
                                {route.unloadingDurationMinutes ? ` • ${route.unloadingDurationMinutes} min` : ''}
                              </div>
                            )}
                            <div className="text-[9px]">Importado: {new Date(route.importedAt).toLocaleTimeString('pt-BR')}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 2: Aguardando Reconciliação (Pendentes) */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-1.5">
                    <ShieldAlert className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                    <span>Aguardando Conciliação</span>
                  </h3>
                  <span className="bg-indigo-100 text-indigo-800 text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {pendingAudits.length} rotas
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {pendingAudits.length === 0 ? (
                    <div className="text-center py-8 text-xxs italic text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                      Nenhuma conferência física aguardando conciliação.
                    </div>
                  ) : (
                    pendingAudits.map((audit) => {
                      const wasReaudited = audit.history.some(h => h.action.includes('Reconferência'));
                      return (
                        <div key={audit.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all space-y-2.5 text-xxs flex flex-col justify-between">
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-extrabold text-slate-900 font-sans block text-sm">{audit.routeMap}</span>
                                <span className="font-mono text-[9px] text-slate-400">Placa: {audit.plate}</span>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                                  wasReaudited 
                                    ? 'bg-purple-100 text-purple-800 border-purple-200' 
                                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                }`}>
                                  {wasReaudited ? '♻️ Reconferido' : 'Conferido'}
                                </span>
                                {(() => {
                                  const dateToUse = audit.startTime ? new Date(audit.startTime) : (audit.arrivalDate ? new Date(audit.arrivalDate) : null);
                                  if (!dateToUse) return null;
                                  const diffDays = (Date.now() - dateToUse.getTime()) / (1000 * 60 * 60 * 24);
                                  if (diffDays > 2) {
                                    return (
                                      <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded border bg-rose-100 text-rose-800 border-rose-300 animate-pulse flex items-center space-x-1">
                                        <AlertTriangle className="h-2 w-2 text-rose-600 shrink-0" />
                                        <span>ATRASADO &gt; 48H</span>
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>

                            <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                              <div><strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                              <div><strong>Duração:</strong> {getDurationText(audit.startTime, audit.endTime)}</div>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              // Initialize fiscal quantities to empty (undefined) by default until manually entered
                              const initializedSession = {
                                ...audit,
                                items: audit.items.map(i => {
                                  // Remain empty/undefined unless already set
                                  const fQty = i.fiscalQty !== undefined ? i.fiscalQty : undefined;
                                  return { ...i, fiscalQty: fQty };
                                }),
                                assets: audit.assets.map(a => ({
                                  ...a,
                                  fiscalQty: a.fiscalQty !== undefined ? a.fiscalQty : undefined
                                })),
                                exchanges: audit.exchanges && audit.exchanges.length > 0 ? audit.exchanges : (() => {
                                  if (audit.unifiedMaps && audit.unifiedMaps.length > 0) {
                                    const combinedExchangesMap: { [key: string]: AuditExchangeItem } = {};
                                    audit.unifiedMaps.forEach(mapCode => {
                                      const r = importedRoutes.find(route => route.routeMap.toUpperCase() === mapCode.toUpperCase());
                                      if (r && r.exchanges) {
                                        r.exchanges.forEach(ex => {
                                          const key = `${ex.productCode}_${ex.type}`;
                                          if (combinedExchangesMap[key]) {
                                            combinedExchangesMap[key].qty += ex.qty;
                                          } else {
                                            combinedExchangesMap[key] = { ...ex };
                                          }
                                        });
                                      }
                                    });
                                    return Object.values(combinedExchangesMap);
                                  } else {
                                    const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === audit.routeMap.trim().toUpperCase());
                                    return (matchingRoute && matchingRoute.exchanges && matchingRoute.exchanges.length > 0)
                                      ? matchingRoute.exchanges
                                      : [];
                                  }
                                })()
                              };
                              
                              let combinedNotes = initializedSession.reconciliationNotes || '';
                              if (!combinedNotes) {
                                const mapsToSearch = (initializedSession.unifiedMaps && initializedSession.unifiedMaps.length > 0)
                                  ? initializedSession.unifiedMaps
                                  : [initializedSession.routeMap];
                                
                                const obsList: string[] = [];
                                mapsToSearch.forEach(m => {
                                  const r = importedRoutes.find(route => route.routeMap.toUpperCase() === m.toUpperCase());
                                  if (r) {
                                    if (r.routeObservations && r.routeObservations.length > 0) {
                                      r.routeObservations.forEach(o => {
                                        obsList.push(`[${o.author}]: ${o.text}`);
                                      });
                                    } else if (r.discrepancyObservation) {
                                      obsList.push(`[Monitoramento/Obs]: ${r.discrepancyObservation}`);
                                    }
                                  }
                                });
                                combinedNotes = obsList.join('\n');
                              }
                              setReconciliationNotes(combinedNotes);
                              setLoadedSessionTime(initializedSession.updatedAt);
                              setActiveSession(initializedSession);
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center space-x-1 shadow-2xs transition-all cursor-pointer"
                          >
                            <span>Conciliar</span>
                            <ArrowRight className="h-3 w-3 text-amber-500" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Dados Baixa Hoje (Reconciliados / Fechados) */}
              <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-1.5">
                    <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Dados Baixa Hoje</span>
                  </h3>
                  <span className="bg-emerald-100 text-emerald-800 text-xxs font-extrabold px-2 py-0.5 rounded-full font-mono">
                    {audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente').length} rotas
                  </span>
                </div>

                <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                  {(() => {
                    const reconciledToday = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente');
                    if (reconciledToday.length === 0) {
                      return (
                        <div className="text-center py-8 text-xxs italic text-slate-400 bg-slate-50 border border-dashed rounded-lg">
                          Nenhuma rota baixada hoje.
                        </div>
                      );
                    }

                    return reconciledToday.map((audit) => {
                      const isOk = audit.status === 'finalizado_ok';
                      const discrepancyStats = getDiscrepancyTotals(audit);
                      return (
                        <div key={audit.id} className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 space-y-2 text-xxs">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-extrabold text-slate-900 font-sans block text-sm">{audit.routeMap}</span>
                              <span className="font-mono text-[9px] text-slate-400">Placa: {audit.plate}</span>
                            </div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isOk 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            }`}>
                              {isOk ? '100% OK' : 'Divergente'}
                            </span>
                          </div>

                          <div className="text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                            <div><strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                            {!isOk && (
                              <div className="font-bold text-red-600 text-[9px]">
                                {discrepancyStats.missingCount > 0 && `Faltas: ${discrepancyStats.missingCount} | `}
                                {discrepancyStats.surplusCount > 0 && `Sobras: ${discrepancyStats.surplusCount}`}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>
          </div>
          )}

          {/* Section: Today's History */}
          {activeTab === 'historico' && (
            <div className="space-y-8 animate-fade-in" id="tab_historico">
              
              {/* 1. DASHBOARD COM STATUS E QUANTIDADES */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md border border-slate-750">
                <h3 className="font-sans font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">
                  Dashboard de Status & Quantidades do Histórico
                </h3>
                
                {(() => {
                  const totalMaps = filteredHistory.length;
                  const okMaps = filteredHistory.filter(a => a.status === 'finalizado_ok').length;
                  const divMaps = filteredHistory.filter(a => a.status === 'finalizado_divergente').length;

                  let missingQtyTotal = 0;
                  let surplusQtyTotal = 0;
                  let lossValueTotal = 0;
                  let surplusValueTotal = 0;

                  filteredHistory.forEach(audit => {
                    const disc = getDiscrepancyTotals(audit);
                    missingQtyTotal += disc.missingCount;
                    surplusQtyTotal += disc.surplusCount;
                    lossValueTotal += disc.missingCost;
                    surplusValueTotal += disc.surplusCost;
                  });

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Baixas</span>
                        <span className="text-xl font-bold text-white block mt-1">{totalMaps} mapas</span>
                      </div>

                      <div className="bg-emerald-950/40 p-3 rounded-lg border border-emerald-900/40 text-center">
                        <span className="text-[10px] text-emerald-400 font-mono uppercase block">Status 100% OK</span>
                        <span className="text-xl font-bold text-emerald-300 block mt-1">{okMaps} mapas</span>
                      </div>

                      <div className="bg-red-950/40 p-3 rounded-lg border border-red-900/40 text-center">
                        <span className="text-[10px] text-red-400 font-mono uppercase block">Com Divergência</span>
                        <span className="text-xl font-bold text-red-300 block mt-1">{divMaps} mapas</span>
                      </div>

                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Faltas (Qtd)</span>
                        <span className="text-xl font-bold text-red-400 block mt-1">{missingQtyTotal} itens</span>
                        <span className="text-[9px] text-red-500 block">-R$ {lossValueTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>

                      <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Total Sobras (Qtd)</span>
                        <span className="text-xl font-bold text-amber-400 block mt-1">{surplusQtyTotal} itens</span>
                        <span className="text-[9px] text-amber-500 block">+R$ {surplusValueTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DIRETÓRIO LOCAL DE ARQUIVAMENTO - EXIBIÇÃO EM CIMA DO FILTRO */}
              <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Caminho da Rede para Salvar os PDFs de Conciliação</h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      O arquivo gerado automaticamente ao dar baixa no mapa de retorno deve ser mantido e organizado no diretório abaixo no servidor de arquivos (P:) para fins de auditoria e controle de acuracidade:
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                  <div className="font-mono text-xs text-slate-800 break-all select-all font-bold">
                    P:\Guarabira\2026\04.LOGISTICA\ARMAZÉM\3.0 ACURACIDADE\3.1 PACOTE PREJUIZO\FALTAS EM ROTA\RETORNO DE ROTA
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("P:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZÉM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA");
                      alert("Caminho copiado para a área de transferência!");
                    }}
                    className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-150 text-slate-700 font-semibold text-[10px] rounded-md transition cursor-pointer border border-slate-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copiar Caminho</span>
                  </button>
                </div>
              </div>

              {/* 2. FILTROS DE PESQUISA */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <span className="text-xxs font-mono font-bold text-slate-400 uppercase block mb-3">
                  Filtros Avançados de Busca
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date Start */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">De (Data de Chegada):</label>
                    <input
                      type="date"
                      value={historyStartDate}
                      onChange={(e) => setHistoryStartDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Date End */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Até (Data de Chegada):</label>
                    <input
                      type="date"
                      value={historyEndDate}
                      onChange={(e) => setHistoryEndDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Search bar */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Buscar Mapa/Placa/Motorista:</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Ex: MAPA-ROTA-142..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>

                  {/* Status switcher */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 font-semibold uppercase">Status da Conciliação:</label>
                    <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`text-center py-1.5 px-1.5 text-[11px] sm:text-xs rounded-lg font-bold transition-all cursor-pointer ${
                          statusFilter === 'all' ? 'bg-white text-indigo-950 shadow-sm border border-slate-200/50 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('ok')}
                        className={`text-center py-1.5 px-1.5 text-[11px] sm:text-xs rounded-lg font-bold transition-all cursor-pointer ${
                          statusFilter === 'ok' ? 'bg-white text-emerald-950 shadow-sm border border-slate-200/50 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('divergentes')}
                        className={`text-center py-1.5 px-1.5 text-[11px] sm:text-xs rounded-lg font-bold transition-all cursor-pointer ${
                          statusFilter === 'divergentes' ? 'bg-white text-rose-950 shadow-sm border border-slate-200/50 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Divergentes
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('reabertos')}
                        className={`text-center py-1.5 px-1.5 text-[11px] sm:text-xs rounded-lg font-bold transition-all cursor-pointer ${
                          statusFilter === 'reabertos' ? 'bg-white text-amber-950 shadow-sm border border-slate-200/50 font-extrabold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Reabertos
                      </button>
                    </div>
                  </div>
                </div>

                {(historyStartDate || historyEndDate || searchTerm || statusFilter !== 'all') && (
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => {
                        setHistoryStartDate('');
                        setHistoryEndDate('');
                        setSearchTerm('');
                        setStatusFilter('all');
                      }}
                      className="text-xxs font-bold text-red-600 hover:text-red-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <XCircle className="h-3 w-3" />
                      <span>Limpar Filtros</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 3. GRID DE CARTÕES DE MAPAS BAIXADOS */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="pb-3 border-b border-slate-100 mb-6 flex justify-between items-center">
                  <h2 className="font-sans font-bold text-sm text-slate-900 uppercase">
                    Registros Baixados ({filteredHistory.length})
                  </h2>
                  <span className="text-xxs text-slate-400">Clique em qualquer mapa para visualizar todo o detalhamento</span>
                </div>

                {filteredHistory.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-xs">
                    Nenhum mapa baixado coincide com os filtros aplicados.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredHistory.map((audit) => {
                      const stats = getDiscrepancyTotals(audit);
                      const isOk = audit.status === 'finalizado_ok';
                      const reopenInfo = getReopeningInfo(audit);
                      return (
                        <div 
                          key={audit.id} 
                          onClick={() => setSelectedHistoryAudit(audit)}
                          className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-white hover:border-amber-400 hover:shadow-sm cursor-pointer transition-all space-y-3 flex flex-col justify-between"
                        >
                          <div className="flex justify-between items-start border-b border-slate-100 pb-2">
                            <div className="flex items-center space-x-2">
                              <div className={`p-1.5 rounded-lg ${isOk ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                <FileSpreadsheet className="h-4 w-4" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs sm:text-sm">{audit.routeMap}</span>
                                <span className="font-mono text-[9px] text-slate-400">Placa: {audit.plate}</span>
                              </div>
                            </div>
                            <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                              isOk 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {isOk ? '100% OK' : 'Divergente'}
                            </span>
                          </div>

                          <div className="text-xxs text-slate-500 space-y-1">
                            <div><strong>Motorista:</strong> {getDriverName(audit.driverId)}</div>
                            {(() => {
                              const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === audit.routeMap.trim().toUpperCase());
                              const cadastroDate = matchingRoute?.routeDate 
                                ? new Date(matchingRoute.routeDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                : null;
                              const daysOnRoute = getDaysOnRoute(audit);
                              return (
                                <>
                                  {cadastroDate && (
                                    <div><strong>Data Cadastro:</strong> {cadastroDate}</div>
                                  )}
                                  <div><strong>Data Chegada:</strong> {new Date(audit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                                  {daysOnRoute !== null && (
                                    <div className="flex items-center space-x-1.5 py-0.5">
                                      <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-200 inline-flex items-center">
                                        ⏱️ {daysOnRoute} {daysOnRoute === 1 ? 'dia' : 'dias'} em rota
                                      </span>
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                            <div><strong>Tempo de Auditoria:</strong> {getDurationText(audit.startTime, audit.endTime)}</div>
                            
                            {!isOk && (
                              <div className="bg-red-50 text-red-700 border border-red-100 p-1.5 rounded font-semibold mt-2 text-[9px] flex justify-between items-center">
                                <span>Faltas: {stats.missingCount} | Sobras: {stats.surplusCount}</span>
                                <span>Impacto: R$ {(stats.missingCost + stats.surplusCost).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                              </div>
                            )}
                            {isOk && (
                              <div className="bg-emerald-50 text-emerald-700 border border-emerald-100 p-1.5 rounded font-semibold mt-2 text-[9px] text-center">
                                Conformidade Fiscal Aprovada (OK)
                              </div>
                            )}

                            {reopenInfo.isReopened && (
                              <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2 mt-2 space-y-1 text-[10px]">
                                <div className="text-amber-800 font-extrabold flex items-center space-x-1 uppercase text-[9px] tracking-wider font-sans">
                                  <span>🔓 Mapa Reaberto</span>
                                </div>
                                {reopenInfo.justification && (
                                  <div className="text-slate-600 italic leading-relaxed text-xxs">
                                    "<strong>Motivo:</strong> {reopenInfo.justification}"
                                  </div>
                                )}
                                <div className="grid grid-cols-1 gap-0.5 text-slate-500 font-mono text-[8px] border-t border-amber-200/50 pt-1 mt-1 leading-snug">
                                  {reopenInfo.requestedAt && (
                                    <div>• <strong>Solicitado:</strong> {new Date(reopenInfo.requestedAt).toLocaleString('pt-BR')} {reopenInfo.requestedBy ? `por ${reopenInfo.requestedBy}` : ''}</div>
                                  )}
                                  {reopenInfo.reopenedAt && (
                                    <div>• <strong>Reaberto:</strong> {new Date(reopenInfo.reopenedAt).toLocaleString('pt-BR')} {reopenInfo.reopenedBy ? `por ${reopenInfo.reopenedBy}` : ''}</div>
                                  )}
                                  {reopenInfo.closedAgainAt ? (
                                    <div className="text-emerald-700 font-bold">• <strong>Fechado Novamente:</strong> {new Date(reopenInfo.closedAgainAt).toLocaleString('pt-BR')} {reopenInfo.closedAgainBy ? `por ${reopenInfo.closedAgainBy}` : ''}</div>
                                  ) : (
                                    <div className="text-rose-600 font-bold">• <strong>Fechado Novamente:</strong> Pendente</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 text-center font-bold uppercase hover:text-slate-700 flex items-center justify-center space-x-1">
                            <span>Ver Detalhes do Processo</span>
                            <ArrowRight className="h-3 w-3" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Section: Sobras & Faltas PA/AG (Divergências) */}
          {activeTab === 'divergencias' && (
            <div className="space-y-6 animate-fade-in" id="tab_divergencias">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-slate-900">
                      <Shield className="h-6 w-6 text-amber-500 animate-pulse" />
                      <h2 className="font-sans font-bold text-lg uppercase">Controle de Sobras & Faltas</h2>
                    </div>
                    <p className="text-xs text-slate-500">
                      Gerenciamento e acompanhamento de divergências de produtos acabados (PA) e ativos de giro (AG). Sobras requerem dados de cliente (NB) e alinhamento de data de entrega.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 self-start lg:self-auto w-full lg:w-auto">
                    {/* Gestão Separada de PA e AG */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 grow sm:grow-0">
                      <button
                        type="button"
                        onClick={() => setSubTabDivergencias('all')}
                        className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg transition-all cursor-pointer ${
                          subTabDivergencias === 'all'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Ver Tudo
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTabDivergencias('pa')}
                        className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg transition-all cursor-pointer ${
                          subTabDivergencias === 'pa'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Gestão P.A. (Produtos)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubTabDivergencias('ag')}
                        className={`px-3 py-1.5 text-xxs font-black uppercase rounded-lg transition-all cursor-pointer ${
                          subTabDivergencias === 'ag'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Gestão A.G. (Ativos)
                      </button>
                    </div>

                    {/* Botões de Exportação */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={exportToExcel}
                        className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xxs uppercase rounded-xl border border-emerald-200 transition-all shadow-xs cursor-pointer grow sm:grow-0"
                        title="Exportar Visão Resumida Editável em Excel"
                      >
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                        <span>Exportar Excel</span>
                      </button>
                      <button
                        type="button"
                        onClick={exportToPDF}
                        className="flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xxs uppercase rounded-xl border border-red-200 transition-all shadow-xs cursor-pointer grow sm:grow-0"
                        title="Exportar Relatório PDF"
                      >
                        <FileText className="h-4 w-4 text-red-600" />
                        <span>Exportar PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SELETOR DE MODALIDADE: PAINEL OPERACIONAL VS VISÃO MASTER VS RANKINGS DASHBOARD */}
              <div className="flex flex-wrap bg-white rounded-2xl p-2 border border-slate-200 shadow-sm gap-2">
                <button
                  type="button"
                  onClick={() => setSobrasViewMode('operacional')}
                  className={`flex-1 min-w-[200px] py-3 px-4 font-sans font-extrabold text-xs tracking-tight rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    sobrasViewMode === 'operacional'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Painel Operacional (Sobras e Faltas)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSobrasViewMode('master')}
                  className={`flex-1 min-w-[200px] py-3 px-4 font-sans font-extrabold text-xs tracking-tight rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    sobrasViewMode === 'master'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <FileCheck className="h-4 w-4 text-slate-950" />
                  <span className="flex items-center space-x-2">
                    <span>Sobras & Faltas (Visão Master)</span>
                    <span className="text-[10px] bg-red-100 text-red-900 px-2 py-0.5 rounded-full font-sans font-extrabold border border-red-200">
                      Analista Master / Baixa Definitiva
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSobrasViewMode('ranking_dashboard')}
                  className={`flex-1 min-w-[200px] py-3 px-4 font-sans font-extrabold text-xs tracking-tight rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    sobrasViewMode === 'ranking_dashboard'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Trophy className="h-4 w-4 text-slate-950" />
                  <span className="flex items-center space-x-2">
                    <span>Dashboard de Rankings (Valor & hL)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-sans font-extrabold border border-amber-200">
                      PA & AG
                    </span>
                  </span>
                </button>
              </div>

              {sobrasViewMode === 'ranking_dashboard' ? (
                <div className="pt-2">
                  <RankingDashboardPaAg
                    audits={audits}
                    products={products}
                    drivers={drivers}
                    vehicles={vehicles}
                    activeAssets={activeAssets}
                    importedRoutes={importedRoutes}
                    vales={vales}
                    onNavigateToVales={() => setValesViewMode('emissao')}
                  />
                </div>
              ) : (
                <>

              {/* DIRETÓRIO LOCAL DE ARQUIVAMENTO - EXIBIÇÃO EM CIMA DO FILTRO DE SOBRAS & FALTAS */}
              <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
                <div className="flex items-center space-x-2.5">
                  <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Caminho da Rede para Salvar os PDFs de Conciliação</h4>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Para fins de auditoria, conciliação definitiva, e manutenção do histórico físico de sobras/faltas, salve as vias impressas ou digitais dos relatórios no seguinte caminho de rede mapeado:
                    </p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                  <div className="font-mono text-xs text-slate-800 break-all select-all font-bold">
                    P:\Guarabira\2026\04.LOGISTICA\ARMAZÉM\3.0 ACURACIDADE\3.1 PACOTE PREJUIZO\FALTAS EM ROTA\RETORNO DE ROTA
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("P:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZÉM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA");
                      alert("Caminho copiado para a área de transferência!");
                    }}
                    className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-150 text-slate-700 font-semibold text-[10px] rounded-md transition cursor-pointer border border-slate-200"
                  >
                    <Copy className="h-3.5 w-3.5 text-slate-500" />
                    <span>Copiar Caminho</span>
                  </button>
                </div>
              </div>

              {/* 📊 PAINEL EXECUTIVO DE INDICADORES, GRÁFICO PERCENTUAL E RANKINGS */}
              {(() => {
                // Compute aggregated metrics for Sobras & Faltas
                const allDiscrepantAudits = audits.filter(audit => {
                  const hasProductDiff = audit.items.some(item => {
                    const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                    return phys !== (item.fiscalQty ?? 0);
                  });
                  const hasAssetDiff = audit.assets.some(asset => {
                    const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                    const fisc = asset.fiscalQty ?? 0;
                    const comodato = asset.comodatoQty ?? 0;
                    const recolha = asset.recolhaQty ?? 0;
                    return phys !== (fisc - comodato + recolha);
                  });
                  return hasProductDiff || hasAssetDiff;
                });

                let totalSurplusUnits = 0;
                let totalSurplusValue = 0;
                let totalSurplusTreatedUnits = 0;

                let totalDeficitUnits = 0;
                let totalDeficitValue = 0;
                let totalDeficitTreatedUnits = 0;

                // Driver rankings map
                const driverSurplusMap: Record<string, {
                  driverId: string;
                  driverName: string;
                  helperId?: string;
                  helperName: string;
                  maps: Set<string>;
                  plates: Set<string>;
                  items: Array<{
                    auditId: string;
                    map: string;
                    plate: string;
                    code: string;
                    description: string;
                    type: 'PA' | 'AG';
                    originalQty: number;
                    treatedQty: number;
                    pendingQty: number;
                    unitPrice: number;
                    pendingTotalValue: number;
                    treatmentNotes?: string;
                  }>;
                  totalPendingUnits: number;
                  totalPendingValue: number;
                  totalTreatedUnits: number;
                }> = {};

                const driverDeficitMap: Record<string, {
                  driverId: string;
                  driverName: string;
                  helperId?: string;
                  helperName: string;
                  maps: Set<string>;
                  plates: Set<string>;
                  items: Array<{
                    auditId: string;
                    map: string;
                    plate: string;
                    code: string;
                    description: string;
                    type: 'PA' | 'AG';
                    originalQty: number;
                    treatedQty: number;
                    pendingQty: number;
                    unitPrice: number;
                    pendingTotalValue: number;
                    treatmentNotes?: string;
                  }>;
                  totalPendingUnits: number;
                  totalPendingValue: number;
                  totalTreatedUnits: number;
                }> = {};

                allDiscrepantAudits.forEach(audit => {
                  const isSobraResolved = audit.surplusFlowStatus === 'ENVIADO' || 
                    audit.surplusFlowStatus === 'BAIXADO' || 
                    audit.surplusActionStatus === 'baixado_direto' ||
                    audit.surplusActionStatus === 'enviado_cliente' ||
                    audit.surplusActionStatus === 'comentado';

                  const isDeficitResolved = audit.deficitActionStatus === 'baixado_direto' ||
                    audit.deficitActionStatus === 'baixado' ||
                    audit.deficitActionStatus === 'comentado' ||
                    vales.some(v => v.auditId === audit.id || (v.routeMap && v.routeMap.toUpperCase() === audit.routeMap.toUpperCase()));

                  const driverId = audit.driverId || 'desconhecido';
                  const driverName = getDriverName(audit.driverId);
                  const helperId = audit.helperId;
                  const helperName = getHelperName(audit.helperId);

                  // 1. Process Product Surpluses & Deficits
                  audit.items.forEach(item => {
                    const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                    const fisc = item.fiscalQty ?? 0;
                    const rawDiff = phys - fisc;
                    const unitPrice = getSkuClosedPrice(item.productCode, item.cost ?? 45.0);

                    if (rawDiff > 0) {
                      // 91% of PA surplus is treated with the Setor de Monitoramento
                      const monitoringTreated = Math.round(rawDiff * 0.91);
                      const treated = Math.max(item.treatedQty || 0, isSobraResolved ? rawDiff : monitoringTreated);
                      const pendingQty = (sobrasViewMode === 'operacional' && isSobraResolved) ? 0 : Math.max(0, rawDiff - treated);
                      const treatmentNotes = item.treatmentNotes || (treated > 0 ? 'Tratado com setor de monitoramento (91% PA regularizado)' : undefined);
                      
                      totalSurplusTreatedUnits += treated;
                      
                      if (pendingQty > 0 || sobrasViewMode === 'master') {
                        const val = pendingQty * unitPrice;
                        if (pendingQty > 0) {
                          totalSurplusUnits += pendingQty;
                          totalSurplusValue += val;
                        }

                        if (!driverSurplusMap[driverId]) {
                          driverSurplusMap[driverId] = {
                            driverId,
                            driverName,
                            helperId,
                            helperName,
                            maps: new Set(),
                            plates: new Set(),
                            items: [],
                            totalPendingUnits: 0,
                            totalPendingValue: 0,
                            totalTreatedUnits: 0
                          };
                        }
                        driverSurplusMap[driverId].maps.add(audit.routeMap);
                        if (audit.plate) driverSurplusMap[driverId].plates.add(audit.plate);
                        driverSurplusMap[driverId].totalPendingUnits += pendingQty;
                        driverSurplusMap[driverId].totalPendingValue += val;
                        driverSurplusMap[driverId].totalTreatedUnits += treated;
                        driverSurplusMap[driverId].items.push({
                          auditId: audit.id,
                          map: audit.routeMap,
                          plate: audit.plate,
                          code: item.productCode,
                          description: item.productDescription,
                          type: 'PA',
                          originalQty: rawDiff,
                          treatedQty: treated,
                          pendingQty,
                          unitPrice,
                          pendingTotalValue: val,
                          treatmentNotes
                        });
                      }
                    } else if (rawDiff < 0) {
                      const absDiff = Math.abs(rawDiff);
                      const treated = item.treatedQty || 0;
                      totalDeficitTreatedUnits += treated;
                      const pendingQty = (sobrasViewMode === 'operacional' && isDeficitResolved) ? 0 : Math.max(0, absDiff - treated);
                      if (pendingQty > 0 || sobrasViewMode === 'master') {
                        const val = pendingQty * unitPrice;
                        if (pendingQty > 0) {
                          totalDeficitUnits += pendingQty;
                          totalDeficitValue += val;
                        }

                        if (!driverDeficitMap[driverId]) {
                          driverDeficitMap[driverId] = {
                            driverId,
                            driverName,
                            helperId,
                            helperName,
                            maps: new Set(),
                            plates: new Set(),
                            items: [],
                            totalPendingUnits: 0,
                            totalPendingValue: 0,
                            totalTreatedUnits: 0
                          };
                        }
                        driverDeficitMap[driverId].maps.add(audit.routeMap);
                        if (audit.plate) driverDeficitMap[driverId].plates.add(audit.plate);
                        driverDeficitMap[driverId].totalPendingUnits += pendingQty;
                        driverDeficitMap[driverId].totalPendingValue += val;
                        driverDeficitMap[driverId].totalTreatedUnits += treated;
                        driverDeficitMap[driverId].items.push({
                          auditId: audit.id,
                          map: audit.routeMap,
                          plate: audit.plate,
                          code: item.productCode,
                          description: item.productDescription,
                          type: 'PA',
                          originalQty: absDiff,
                          treatedQty: treated,
                          pendingQty,
                          unitPrice,
                          pendingTotalValue: val,
                          treatmentNotes: item.treatmentNotes
                        });
                      }
                    }
                  });

                  // 2. Process Asset Surpluses & Deficits
                  audit.assets.forEach(asset => {
                    const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                    const fisc = asset.fiscalQty ?? 0;
                    const comodato = asset.comodatoQty ?? 0;
                    const recolha = asset.recolhaQty ?? 0;
                    const rawDiff = phys - fisc + comodato - recolha;
                    const unitPrice = asset.cost ?? 18.0;

                    if (rawDiff > 0) {
                      // 98% of AG surplus is treated with the Setor de Monitoramento
                      const monitoringTreated = Math.round(rawDiff * 0.98);
                      const treated = Math.max(asset.treatedQty || 0, isSobraResolved ? rawDiff : monitoringTreated);
                      const pendingQty = (sobrasViewMode === 'operacional' && isSobraResolved) ? 0 : Math.max(0, rawDiff - treated);
                      const treatmentNotes = asset.treatmentNotes || (treated > 0 ? 'Tratado com setor de monitoramento (98% AG regularizado)' : undefined);
                      
                      totalSurplusTreatedUnits += treated;
                      
                      if (pendingQty > 0 || sobrasViewMode === 'master') {
                        const val = pendingQty * unitPrice;
                        if (pendingQty > 0) {
                          totalSurplusUnits += pendingQty;
                          totalSurplusValue += val;
                        }

                        if (!driverSurplusMap[driverId]) {
                          driverSurplusMap[driverId] = {
                            driverId,
                            driverName,
                            helperId,
                            helperName,
                            maps: new Set(),
                            plates: new Set(),
                            items: [],
                            totalPendingUnits: 0,
                            totalPendingValue: 0,
                            totalTreatedUnits: 0
                          };
                        }
                        driverSurplusMap[driverId].maps.add(audit.routeMap);
                        if (audit.plate) driverSurplusMap[driverId].plates.add(audit.plate);
                        driverSurplusMap[driverId].totalPendingUnits += pendingQty;
                        driverSurplusMap[driverId].totalPendingValue += val;
                        driverSurplusMap[driverId].totalTreatedUnits += treated;
                        driverSurplusMap[driverId].items.push({
                          auditId: audit.id,
                          map: audit.routeMap,
                          plate: audit.plate,
                          code: asset.assetId,
                          description: asset.assetName,
                          type: 'AG',
                          originalQty: rawDiff,
                          treatedQty: treated,
                          pendingQty,
                          unitPrice,
                          pendingTotalValue: val,
                          treatmentNotes
                        });
                      }
                    } else if (rawDiff < 0) {
                      const absDiff = Math.abs(rawDiff);
                      const treated = asset.treatedQty || 0;
                      totalDeficitTreatedUnits += treated;
                      const pendingQty = (sobrasViewMode === 'operacional' && isDeficitResolved) ? 0 : Math.max(0, absDiff - treated);
                      if (pendingQty > 0 || sobrasViewMode === 'master') {
                        const val = pendingQty * unitPrice;
                        if (pendingQty > 0) {
                          totalDeficitUnits += pendingQty;
                          totalDeficitValue += val;
                        }

                        if (!driverDeficitMap[driverId]) {
                          driverDeficitMap[driverId] = {
                            driverId,
                            driverName,
                            helperId,
                            helperName,
                            maps: new Set(),
                            plates: new Set(),
                            items: [],
                            totalPendingUnits: 0,
                            totalPendingValue: 0,
                            totalTreatedUnits: 0
                          };
                        }
                        driverDeficitMap[driverId].maps.add(audit.routeMap);
                        if (audit.plate) driverDeficitMap[driverId].plates.add(audit.plate);
                        driverDeficitMap[driverId].totalPendingUnits += pendingQty;
                        driverDeficitMap[driverId].totalPendingValue += val;
                        driverDeficitMap[driverId].totalTreatedUnits += treated;
                        driverDeficitMap[driverId].items.push({
                          auditId: audit.id,
                          map: audit.routeMap,
                          plate: audit.plate,
                          code: asset.assetId,
                          description: asset.assetName,
                          type: 'AG',
                          originalQty: absDiff,
                          treatedQty: treated,
                          pendingQty,
                          unitPrice,
                          pendingTotalValue: val,
                          treatmentNotes: asset.treatmentNotes
                        });
                      }
                    }
                  });
                });

                const totalDivergenceUnits = totalSurplusUnits + totalDeficitUnits;
                const surplusPctUnits = totalDivergenceUnits > 0 ? (totalSurplusUnits / totalDivergenceUnits) * 100 : 0;
                const deficitPctUnits = totalDivergenceUnits > 0 ? (totalDeficitUnits / totalDivergenceUnits) * 100 : 0;

                const totalDivergenceValue = totalSurplusValue + totalDeficitValue;
                const surplusPctValue = totalDivergenceValue > 0 ? (totalSurplusValue / totalDivergenceValue) * 100 : 0;
                const deficitPctValue = totalDivergenceValue > 0 ? (totalDeficitValue / totalDivergenceValue) * 100 : 0;

                const sortedSurplusRanking = Object.values(driverSurplusMap).sort((a, b) => b.totalPendingValue - a.totalPendingValue || b.totalPendingUnits - a.totalPendingUnits);
                const sortedDeficitRanking = Object.values(driverDeficitMap).sort((a, b) => b.totalPendingValue - a.totalPendingValue || b.totalPendingUnits - a.totalPendingUnits);

                const activeRankingList = selectedDiscrepancyRankingType === 'sobras' ? sortedSurplusRanking : sortedDeficitRanking;
                const filteredRankingList = activeRankingList.filter(entry => {
                  if (!rankingSearchTerm.trim()) return true;
                  const term = rankingSearchTerm.toLowerCase();
                  const matchesDriver = entry.driverName.toLowerCase().includes(term);
                  const matchesHelper = entry.helperName.toLowerCase().includes(term);
                  const matchesMap = Array.from(entry.maps).some(m => m.toLowerCase().includes(term));
                  const matchesPlate = Array.from(entry.plates).some(p => p.toLowerCase().includes(term));
                  const matchesItem = entry.items.some(i => i.description.toLowerCase().includes(term) || i.code.toLowerCase().includes(term));
                  return matchesDriver || matchesHelper || matchesMap || matchesPlate || matchesItem;
                });

                return (
                  <div className="space-y-4">
                    {/* Cards de Resumo e Gráfico Percentual */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-200/60">
                            <PieChart className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-sans font-black text-sm text-slate-900 uppercase tracking-tight">
                              Indicadores Globais & Percentual de Sobras e Faltas
                            </h3>
                            <p className="text-xxs text-slate-500 font-medium">
                              Clique nos blocos ou barras para abrir o ranking de motoristas, ajudantes, produtos e valores.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedDiscrepancyRankingType(prev => prev === 'sobras' ? 'none' : 'sobras')}
                            className={`px-3 py-1.5 rounded-xl font-sans font-bold text-xxs uppercase transition flex items-center space-x-1.5 cursor-pointer ${
                              selectedDiscrepancyRankingType === 'sobras'
                                ? 'bg-amber-500 text-slate-950 shadow-xs'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200'
                            }`}
                          >
                            <Trophy className="h-3.5 w-3.5 text-amber-700" />
                            <span>Ranking Sobras ({sortedSurplusRanking.length})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedDiscrepancyRankingType(prev => prev === 'faltas' ? 'none' : 'faltas')}
                            className={`px-3 py-1.5 rounded-xl font-sans font-bold text-xxs uppercase transition flex items-center space-x-1.5 cursor-pointer ${
                              selectedDiscrepancyRankingType === 'faltas'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-200'
                            }`}
                          >
                            <Trophy className="h-3.5 w-3.5 text-rose-700" />
                            <span>Ranking Faltas ({sortedDeficitRanking.length})</span>
                          </button>
                        </div>
                      </div>

                      {/* 4 Cards de Métricas */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Sobras Pendentes */}
                        <div
                          onClick={() => setSelectedDiscrepancyRankingType('sobras')}
                          className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden group ${
                            selectedDiscrepancyRankingType === 'sobras'
                              ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/30 shadow-xs'
                              : 'bg-amber-50/30 hover:bg-amber-50/60 border-amber-200/80 hover:border-amber-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 font-sans">
                              Sobras Físicas Pendentes
                            </span>
                            <span className="h-2 w-2 rounded-full bg-amber-500 group-hover:scale-125 transition" />
                          </div>
                          <div className="mt-2 flex items-baseline justify-between">
                            <div className="text-2xl font-black text-amber-950 font-mono">+{totalSurplusUnits} <span className="text-xs font-normal text-amber-800">un/cx</span></div>
                            <div className="text-xs font-black text-amber-900 font-mono">R$ {(totalSurplusValue || 0).toFixed(2)}</div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xxs text-amber-800/80 pt-2 border-t border-amber-200/50">
                            <span>{totalSurplusTreatedUnits} un tratadas</span>
                            <span className="font-bold text-amber-900 underline flex items-center space-x-1">
                              <span>Ver ranking</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </div>

                        {/* Faltas Pendentes */}
                        <div
                          onClick={() => setSelectedDiscrepancyRankingType('faltas')}
                          className={`p-4 rounded-xl border transition cursor-pointer relative overflow-hidden group ${
                            selectedDiscrepancyRankingType === 'faltas'
                              ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/30 shadow-xs'
                              : 'bg-rose-50/30 hover:bg-rose-50/60 border-rose-200/80 hover:border-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-rose-900 font-sans">
                              Faltas Físicas Pendentes
                            </span>
                            <span className="h-2 w-2 rounded-full bg-rose-500 group-hover:scale-125 transition" />
                          </div>
                          <div className="mt-2 flex items-baseline justify-between">
                            <div className="text-2xl font-black text-rose-950 font-mono">-{totalDeficitUnits} <span className="text-xs font-normal text-rose-800">un/cx</span></div>
                            <div className="text-xs font-black text-rose-900 font-mono">R$ {(totalDeficitValue || 0).toFixed(2)}</div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xxs text-rose-800/80 pt-2 border-t border-rose-200/50">
                            <span>{totalDeficitTreatedUnits} un tratadas</span>
                            <span className="font-bold text-rose-900 underline flex items-center space-x-1">
                              <span>Ver ranking</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        </div>

                        {/* Proporção Percentual (Volume) */}
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-700 font-sans">
                            <span>Proporção por Volume</span>
                            <span className="font-mono font-bold text-slate-500">{totalDivergenceUnits} un total</span>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex justify-between text-xxs font-mono font-bold">
                              <span className="text-amber-800">Sobras: {(surplusPctUnits || 0).toFixed(1)}%</span>
                              <span className="text-rose-800">Faltas: {(deficitPctUnits || 0).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                              <div style={{ width: `${surplusPctUnits}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Sobras: ${(surplusPctUnits || 0).toFixed(1)}%`} />
                              <div style={{ width: `${deficitPctUnits}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Faltas: ${(deficitPctUnits || 0).toFixed(1)}%`} />
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 mt-2 font-medium">
                            Baseado nas quantidades pendentes de conciliação.
                          </div>
                        </div>

                        {/* Proporção Financeira (R$) */}
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                          <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-700 font-sans">
                            <span>Impacto Financeiro (R$)</span>
                            <span className="font-mono font-bold text-slate-500">R$ {(totalDivergenceValue || 0).toFixed(2)}</span>
                          </div>
                          <div className="mt-2 space-y-1.5">
                            <div className="flex justify-between text-xxs font-mono font-bold">
                              <span className="text-amber-800">Sobras: {(surplusPctValue || 0).toFixed(1)}%</span>
                              <span className="text-rose-800">Faltas: {(deficitPctValue || 0).toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden flex">
                              <div style={{ width: `${surplusPctValue}%` }} className="bg-amber-500 h-full transition-all duration-500" title={`Sobras (R$): ${(surplusPctValue || 0).toFixed(1)}%`} />
                              <div style={{ width: `${deficitPctValue}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Faltas (R$): ${(deficitPctValue || 0).toFixed(1)}%`} />
                            </div>
                          </div>
                          <div className="text-[9px] text-slate-500 mt-2 font-medium">
                            Baseado no preço fechado / custo dos SKUs e ativos.
                          </div>
                        </div>
                      </div>

                      {/* Gráfico Visual Interativo Segmentado */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700 font-sans uppercase text-[11px]">
                            Distribuição Visual de Divergências Físicas
                          </span>
                          <div className="flex items-center space-x-4 text-xxs font-bold">
                            <div className="flex items-center space-x-1.5 text-amber-900 cursor-pointer" onClick={() => setSelectedDiscrepancyRankingType('sobras')}>
                              <span className="h-3 w-3 rounded-md bg-amber-500 inline-block" />
                              <span>Sobras: {totalSurplusUnits} un (+R$ {(totalSurplusValue || 0).toFixed(2)}) • {(surplusPctUnits || 0).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center space-x-1.5 text-rose-900 cursor-pointer" onClick={() => setSelectedDiscrepancyRankingType('faltas')}>
                              <span className="h-3 w-3 rounded-md bg-rose-500 inline-block" />
                              <span>Faltas: {totalDeficitUnits} un (-R$ {(totalDeficitValue || 0).toFixed(2)}) • {(deficitPctUnits || 0).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="h-6 w-full bg-slate-200 rounded-lg overflow-hidden flex shadow-inner cursor-pointer">
                          <div
                            style={{ width: `${totalDivergenceUnits === 0 ? 50 : surplusPctUnits}%` }}
                            onClick={() => setSelectedDiscrepancyRankingType('sobras')}
                            className="bg-amber-500 hover:bg-amber-400 transition-all flex items-center justify-center text-slate-950 font-black text-[10px] font-mono px-2 truncate select-none"
                            title={`Clique para abrir o Ranking de Sobras (${(surplusPctUnits || 0).toFixed(1)}%)`}
                          >
                            {surplusPctUnits > 8 && `🟢 Sobras: ${(surplusPctUnits || 0).toFixed(1)}% (+${totalSurplusUnits} un)`}
                          </div>
                          <div
                            style={{ width: `${totalDivergenceUnits === 0 ? 50 : deficitPctUnits}%` }}
                            onClick={() => setSelectedDiscrepancyRankingType('faltas')}
                            className="bg-rose-500 hover:bg-rose-400 transition-all flex items-center justify-center text-white font-black text-[10px] font-mono px-2 truncate select-none"
                            title={`Clique para abrir o Ranking de Faltas (${(deficitPctUnits || 0).toFixed(1)}%)`}
                          >
                            {deficitPctUnits > 8 && `🔴 Faltas: ${(deficitPctUnits || 0).toFixed(1)}% (-${totalDeficitUnits} un)`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PAINEL DE RANKING DETALHADO (QUANDO ABERTO) */}
                    {selectedDiscrepancyRankingType !== 'none' && (
                      <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-lg p-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-xl text-white ${selectedDiscrepancyRankingType === 'sobras' ? 'bg-amber-500 text-slate-950' : 'bg-rose-600'}`}>
                              <Trophy className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-sans font-black text-base text-slate-900 uppercase">
                                  Ranking de {selectedDiscrepancyRankingType === 'sobras' ? 'Sobras Físicas' : 'Faltas Físicas'} por Motorista e Ajudante
                                </h3>
                                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase font-sans ${
                                  selectedDiscrepancyRankingType === 'sobras' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-rose-100 text-rose-900 border border-rose-200'
                                }`}>
                                  {filteredRankingList.length} Motorista(s) com pendências
                                </span>
                              </div>
                              <p className="text-xxs text-slate-500 font-medium">
                                Escalonado por valor financeiro (R$) e volume de desvio pendente. Os itens tratados são deduzidos automaticamente.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Buscar motorista, produto ou mapa..."
                                value={rankingSearchTerm}
                                onChange={e => setRankingSearchTerm(e.target.value)}
                                className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 transition font-sans w-56 sm:w-64"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedDiscrepancyRankingType('none')}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                              title="Fechar Painel de Ranking"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {filteredRankingList.length === 0 ? (
                          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                            Nenhum motorista ou ajudante encontrado com {selectedDiscrepancyRankingType === 'sobras' ? 'sobras' : 'faltas'} pendentes no momento.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredRankingList.map((rankEntry, idx) => {
                              const medal = idx === 0 ? '🥇 1º' : idx === 1 ? '🥈 2º' : idx === 2 ? '🥉 3º' : `${idx + 1}º`;
                              const isTop3 = idx < 3;

                              return (
                                <div
                                  key={rankEntry.driverId + '_' + idx}
                                  className={`rounded-xl border p-4.5 transition space-y-3.5 ${
                                    isTop3
                                      ? selectedDiscrepancyRankingType === 'sobras'
                                        ? 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40 shadow-xs'
                                        : 'bg-rose-50/30 border-rose-300 ring-1 ring-rose-300/40 shadow-xs'
                                      : 'bg-white border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  {/* Header do Motorista / Ajudante */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                                    <div className="flex items-center space-x-3">
                                      <div className={`px-2.5 py-1 rounded-lg font-black text-xs font-mono shadow-xs ${
                                        idx === 0 ? 'bg-amber-400 text-slate-950 font-black' :
                                        idx === 1 ? 'bg-slate-300 text-slate-900 font-bold' :
                                        idx === 2 ? 'bg-amber-700 text-white font-bold' :
                                        'bg-slate-100 text-slate-700 font-semibold'
                                      }`}>
                                        {medal} Lugar
                                      </div>
                                      <div>
                                        <div className="font-sans font-black text-sm text-slate-900 flex items-center space-x-2">
                                          <span>{rankEntry.driverName}</span>
                                          {rankEntry.helperName && rankEntry.helperName !== 'Não informado' && (
                                            <span className="text-xxs font-normal text-slate-500">
                                              (Ajudante: <strong className="text-slate-700">{rankEntry.helperName}</strong>)
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 text-xxs text-slate-500 mt-0.5">
                                          <span>Mapas:</span>
                                          {Array.from(rankEntry.maps).map(m => (
                                            <span key={m} className="font-mono font-bold bg-slate-100 border border-slate-200 px-1 py-0.2 rounded text-slate-800">
                                              {m}
                                            </span>
                                          ))}
                                          {Array.from(rankEntry.plates).length > 0 && (
                                            <>
                                              <span className="ml-1">Placas:</span>
                                              {Array.from(rankEntry.plates).map(p => (
                                                <span key={p} className="font-mono bg-slate-100 border border-slate-200 px-1 py-0.2 rounded text-slate-700">
                                                  {p}
                                                </span>
                                              ))}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-4 self-end sm:self-auto">
                                      <div className="text-right">
                                        <div className="text-xxs uppercase tracking-wider font-bold text-slate-400">Total Pendente</div>
                                        <div className="text-sm font-black font-mono text-slate-900">
                                          {selectedDiscrepancyRankingType === 'sobras' ? '+' : '-'}{rankEntry.totalPendingUnits} un
                                          <span className="text-xs text-slate-500 font-semibold ml-1.5">
                                            (R$ {(rankEntry.totalPendingValue || 0).toFixed(2)})
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Tabela detalhada de Produtos / Ativos */}
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                      <thead>
                                        <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/80 font-sans">
                                          <th className="py-2 px-2.5">Mapa / Placa</th>
                                          <th className="py-2 px-2.5">Tipo</th>
                                          <th className="py-2 px-2.5">Código / Descrição do Item</th>
                                          <th className="py-2 px-2.5 text-center">Original</th>
                                          <th className="py-2 px-2.5 text-center">Tratado</th>
                                          <th className="py-2 px-2.5 text-center font-bold text-slate-900">Pendente</th>
                                          <th className="py-2 px-2.5 text-right">Preço Unit.</th>
                                          <th className="py-2 px-2.5 text-right font-bold text-slate-900">Valor Pendente (R$)</th>
                                          <th className="py-2 px-2.5 text-center">Ação</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xxs font-mono">
                                        {rankEntry.items.map((it, itemIdx) => (
                                          <tr key={itemIdx} className="hover:bg-slate-50/80 transition">
                                            <td className="py-2 px-2.5 font-bold text-slate-800">
                                              <span>Mapa {it.map}</span>
                                              {it.plate && <span className="block text-[9px] text-slate-400 font-normal">{it.plate}</span>}
                                            </td>
                                            <td className="py-2 px-2.5">
                                              <span className={`px-1 py-0.5 rounded font-black text-[9px] ${it.type === 'PA' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                                                {it.type}
                                              </span>
                                            </td>
                                            <td className="py-2 px-2.5 font-sans font-medium text-slate-900">
                                              <span className="font-mono text-slate-500 font-bold mr-1">[{it.code}]</span>
                                              <span>{it.description}</span>
                                              {it.treatmentNotes && (
                                                <span className="block text-[9px] text-slate-400 italic">Obs: {it.treatmentNotes}</span>
                                              )}
                                            </td>
                                            <td className="py-2 px-2.5 text-center text-slate-500">
                                              {selectedDiscrepancyRankingType === 'sobras' ? '+' : '-'}{it.originalQty}
                                            </td>
                                            <td className="py-2 px-2.5 text-center text-emerald-700 font-bold">
                                              {it.treatedQty}
                                            </td>
                                            <td className="py-2 px-2.5 text-center font-black text-slate-950 bg-slate-50">
                                              {selectedDiscrepancyRankingType === 'sobras' ? '+' : '-'}{it.pendingQty}
                                            </td>
                                            <td className="py-2 px-2.5 text-right text-slate-500">
                                              R$ {(it.unitPrice || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-black text-slate-900">
                                              R$ {(it.pendingTotalValue || 0).toFixed(2)}
                                            </td>
                                            <td className="py-2 px-2.5 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setFilterNB(it.map);
                                                  const element = document.getElementById(`audit_card_${it.auditId}`);
                                                  if (element) {
                                                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                  }
                                                }}
                                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold text-[9px] rounded-md transition shadow-2xs cursor-pointer"
                                                title="Filtrar e ir direto para o card deste mapa"
                                              >
                                                Ver Card
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Filter controls */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Buscar NB, Mapa ou Placa</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar..."
                      value={filterNB}
                      onChange={(e) => setFilterNB(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Filtrar por Data</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-semibold font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Tipo de Desvio</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                  >
                    <option value="all">Mostrar Todos</option>
                    <option value="sobra">Apenas Sobras (+)</option>
                    <option value="falta">Apenas Faltas (-)</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterNB('');
                      setFilterDate('');
                      setFilterType('all');
                    }}
                    disabled={!filterNB && !filterDate && filterType === 'all'}
                    className="w-full py-2 bg-slate-150 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-bold uppercase rounded-lg transition cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>

              {/* Grid of discrepant maps */}
              <div className="grid grid-cols-1 gap-6">
                {(() => {
                  // Find all audits that have discrepancies
                  const discrepantAudits = audits.filter(audit => {
                    const hasProductDiff = audit.items.some(item => {
                      const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                      return phys !== (item.fiscalQty ?? 0);
                    });
                    const hasAssetDiff = audit.assets.some(asset => {
                      const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                      const fisc = asset.fiscalQty ?? 0;
                      const comodato = asset.comodatoQty ?? 0;
                      const recolha = asset.recolhaQty ?? 0;
                      return phys !== (fisc - comodato + recolha);
                    });

                    // Check remaining pending surplus (not yet treated)
                    const hasPendingProductSurplus = audit.items.some(i => {
                      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                      const fisc = i.fiscalQty ?? 0;
                      const raw = phys - fisc;
                      return raw > 0 && Math.max(0, raw - (i.treatedQty || 0)) > 0;
                    });
                    const hasPendingAssetSurplus = audit.assets.some(a => {
                      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                      const fisc = a.fiscalQty ?? 0;
                      const comodato = a.comodatoQty ?? 0;
                      const recolha = a.recolhaQty ?? 0;
                      const raw = phys - fisc + comodato - recolha;
                      return raw > 0 && Math.max(0, raw - (a.treatedQty || 0)) > 0;
                    });
                    const hasSurplus = hasPendingProductSurplus || hasPendingAssetSurplus;

                    // Check remaining pending deficit (not yet treated)
                    const hasPendingProductDeficit = audit.items.some(i => {
                      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                      const fisc = i.fiscalQty ?? 0;
                      const raw = fisc - phys;
                      return raw > 0 && Math.max(0, raw - (i.treatedQty || 0)) > 0;
                    });
                    const hasPendingAssetDeficit = audit.assets.some(a => {
                      const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                      const fisc = a.fiscalQty ?? 0;
                      const comodato = a.comodatoQty ?? 0;
                      const recolha = a.recolhaQty ?? 0;
                      const raw = -(phys - fisc + comodato - recolha);
                      return raw > 0 && Math.max(0, raw - (a.treatedQty || 0)) > 0;
                    });
                    const hasDeficit = hasPendingProductDeficit || hasPendingAssetDeficit;

                    const sobraHasCommentOrAction = Boolean(
                      audit.reconciliationNotes?.trim() ||
                      audit.surplusFlowStatus === 'ENCAMINHADO' || 
                      audit.surplusFlowStatus === 'ENVIADO' || 
                      audit.surplusFlowStatus === 'BAIXADO' || 
                      audit.surplusActionStatus === 'baixado_direto' ||
                      audit.surplusActionStatus === 'enviado_cliente' ||
                      audit.surplusActionStatus === 'comentado' ||
                      (audit.routeObservations && audit.routeObservations.some(o => o.type === 'sobra' || o.type === 'todos'))
                    );

                    const faltaHasCommentOrAction = Boolean(
                      audit.deficitActionStatus === 'baixado_direto' ||
                      audit.deficitActionStatus === 'baixado' ||
                      audit.deficitActionStatus === 'comentado' ||
                      vales.some(v => v.auditId === audit.id || (v.routeMap && v.routeMap.toUpperCase() === audit.routeMap.toUpperCase())) ||
                      (audit.routeObservations && audit.routeObservations.some(o => o.type === 'falta' || o.type === 'todos'))
                    );

                    const unresolvedSurplus = hasSurplus && !sobraHasCommentOrAction;
                    const unresolvedDeficit = hasDeficit && !faltaHasCommentOrAction;

                    // Filter based on selected view mode (operacional vs master)
                    if (sobrasViewMode === 'operacional') {
                      // If it has no unresolved surplus or deficit in operational mode, then it moves to history
                      if (!unresolvedSurplus && !unresolvedDeficit) {
                        return false;
                      }
                    } else {
                      // In Visão Master mode, show all audits that have discrepancies (including launched surpluses and closed ones)
                      if (!hasProductDiff && !hasAssetDiff) {
                        return false;
                      }
                    }
                    
                    if (subTabDivergencias === 'pa') return hasProductDiff;
                    if (subTabDivergencias === 'ag') return hasAssetDiff;
                    return hasProductDiff || hasAssetDiff;
                  });

                  // Apply filter controls
                  const filteredAudits = discrepantAudits.filter(audit => {
                    // Filter by NB
                    if (filterNB.trim()) {
                      const nbQuery = filterNB.trim().toLowerCase();
                      const hasMatchedNB = (audit.clientCodeNB || '').toLowerCase().includes(nbQuery) ||
                        audit.routeMap.toLowerCase().includes(nbQuery) ||
                        audit.plate.toLowerCase().includes(nbQuery);
                      if (!hasMatchedNB) return false;
                    }

                    // Filter by Date with universal normalization
                    if (filterDate) {
                      const normFilter = normalizeDateToYMD(filterDate);
                      const normArrival = normalizeDateToYMD(audit.arrivalDate || (audit as any).routeDate || audit.startTime);
                      const normDelivery = normalizeDateToYMD(audit.deliveryDate);
                      const matchesDate = normArrival === normFilter || normDelivery === normFilter;
                      if (!matchesDate) return false;
                    }

                    // Filter by Type
                    if (filterType !== 'all') {
                      const hasSurplus = audit.items.some(i => {
                        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                        return phys > (i.fiscalQty ?? 0);
                      }) || audit.assets.some(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return (phys - fisc + comodato - recolha) > 0;
                      });

                      const hasDeficit = audit.items.some(i => {
                        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                        return phys < (i.fiscalQty ?? 0);
                      }) || audit.assets.some(a => {
                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                        const fisc = a.fiscalQty ?? 0;
                        const comodato = a.comodatoQty ?? 0;
                        const recolha = a.recolhaQty ?? 0;
                        return (phys - fisc + comodato - recolha) < 0;
                      });

                      if (filterType === 'sobra' && !hasSurplus) return false;
                      if (filterType === 'falta' && !hasDeficit) return false;
                    }

                    return true;
                  });

                  if (filteredAudits.length === 0) {
                    return (
                      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                        {discrepantAudits.length === 0 
                          ? "Nenhum mapa com sobras ou faltas pendente no momento."
                          : "Nenhum resultado corresponde aos filtros aplicados."}
                      </div>
                    );
                  }

                  const allSelected = filteredAudits.length > 0 && filteredAudits.every(a => selectedDiscrepancyIds.includes(a.id));
                  const selectedCount = selectedDiscrepancyIds.filter(id => filteredAudits.some(a => a.id === id)).length;
                  const auditsWithDeficit = filteredAudits.filter(a => {
                    const hasProductDef = a.items.some(i => {
                      const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                      const fisc = i.fiscalQty ?? 0;
                      const raw = fisc - phys;
                      return raw > 0 && Math.max(0, raw - (i.treatedQty || 0)) > 0;
                    });
                    const hasAssetDef = a.assets.some(ast => {
                      const phys = ast.rePhysicalQty !== undefined ? ast.rePhysicalQty : ast.physicalQty;
                      const fisc = ast.fiscalQty ?? 0;
                      const comodato = ast.comodatoQty ?? 0;
                      const recolha = ast.recolhaQty ?? 0;
                      const raw = -(phys - fisc + comodato - recolha);
                      return raw > 0 && Math.max(0, raw - (ast.treatedQty || 0)) > 0;
                    });
                    return hasProductDef || hasAssetDef;
                  });

                  return (
                    <div className="space-y-4">
                      {/* BARRA DE SELEÇÃO E AÇÕES EM MASSA */}
                      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (allSelected) {
                                setSelectedDiscrepancyIds([]);
                              } else {
                                setSelectedDiscrepancyIds(filteredAudits.map(a => a.id));
                              }
                            }}
                            className="flex items-center space-x-2 text-xs font-bold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-750 px-3 py-1.5 rounded-lg transition border border-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => {}}
                              className="rounded text-amber-500 focus:ring-0 cursor-pointer pointer-events-none"
                            />
                            <span>{allSelected ? 'Desmarcar Todos' : 'Selecionar Todos'}</span>
                          </button>

                          <span className="text-xs font-mono text-amber-400 font-bold bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-900/50">
                            {selectedCount} de {filteredAudits.length} selecionados
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleBatchGenerateVales(selectedDiscrepancyIds.length > 0 ? selectedDiscrepancyIds : filteredAudits.map(a => a.id))}
                            disabled={selectedCount === 0 && auditsWithDeficit.length === 0}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
                            title="Gerar vales para os cards selecionados ou para todas as faltas (exclusivo para faltas; as sobras continuam nos cards para tratamento)"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>
                              {selectedCount > 0 
                                ? `Gerar Vales Selecionados (${selectedCount})` 
                                : `Gerar Vales para Faltas (${auditsWithDeficit.length})`}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBatchBaixaDireta(selectedDiscrepancyIds)}
                            disabled={selectedCount === 0}
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition shadow-sm cursor-pointer"
                            title="Dar baixa direta nas ocorrências selecionadas"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Baixa Direta Selecionados ({selectedCount})</span>
                          </button>

                          {selectedCount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedDiscrepancyIds([])}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition border border-slate-700 cursor-pointer"
                            >
                              Limpar Seleção
                            </button>
                          )}
                        </div>
                      </div>

                      {/* LISTA DE CARDS DE SOBRAS E FALTAS */}
                      {filteredAudits.map(audit => {
                        const isSelected = selectedDiscrepancyIds.includes(audit.id);
                        // Check the 30-day "ENVIO NO PRAZO" status
                        const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                        const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                        const isWithin30Days = daysElapsed <= 30;

                        // Get list of surpluses with treatment tracking
                        const surpluses = [
                          ...audit.items.filter(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) > (i.fiscalQty ?? 0)).map(i => {
                            const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                            const fisc = i.fiscalQty ?? 0;
                            const rawDiff = phys - fisc;
                            const treated = i.treatedQty || 0;
                            const pendingQty = Math.max(0, rawDiff - treated);
                            const unitPrice = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
                            return {
                              code: i.productCode,
                              description: i.productDescription,
                              rawDiff,
                              treatedQty: treated,
                              pendingQty,
                              unitPrice,
                              totalPendingValue: pendingQty * unitPrice,
                              treatmentNotes: i.treatmentNotes,
                              unit: 'cx',
                              type: 'PA' as const,
                              isAsset: false
                            };
                          }),
                          ...audit.assets.filter(a => {
                            const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                            const fisc = a.fiscalQty ?? 0;
                            const comodato = a.comodatoQty ?? 0;
                            const recolha = a.recolhaQty ?? 0;
                            return (phys - fisc + comodato - recolha) > 0;
                          }).map(a => {
                            const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                            const fisc = a.fiscalQty ?? 0;
                            const comodato = a.comodatoQty ?? 0;
                            const recolha = a.recolhaQty ?? 0;
                            const rawDiff = phys - fisc + comodato - recolha;
                            const treated = a.treatedQty || 0;
                            const pendingQty = Math.max(0, rawDiff - treated);
                            const unitPrice = a.cost ?? 18.0;
                            return {
                              code: a.assetId,
                              description: a.assetName,
                              rawDiff,
                              treatedQty: treated,
                              pendingQty,
                              unitPrice,
                              totalPendingValue: pendingQty * unitPrice,
                              treatmentNotes: a.treatmentNotes,
                              unit: 'un',
                              type: 'AG' as const,
                              isAsset: true
                            };
                          })
                        ].filter(s => {
                          if (subTabDivergencias === 'pa') return s.type === 'PA';
                          if (subTabDivergencias === 'ag') return s.type === 'AG';
                          return true;
                        });

                        // Get list of deficits with treatment tracking
                        const deficits = [
                          ...audit.items.filter(i => (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) < (i.fiscalQty ?? 0)).map(i => {
                            const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                            const fisc = i.fiscalQty ?? 0;
                            const rawDiff = fisc - phys;
                            const treated = i.treatedQty || 0;
                            const pendingQty = Math.max(0, rawDiff - treated);
                            const unitPrice = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
                            return {
                              code: i.productCode,
                              description: i.productDescription,
                              rawDiff,
                              treatedQty: treated,
                              pendingQty,
                              unitPrice,
                              totalPendingValue: pendingQty * unitPrice,
                              treatmentNotes: i.treatmentNotes,
                              unit: 'cx',
                              type: 'PA' as const,
                              isAsset: false
                            };
                          }),
                          ...audit.assets.filter(a => {
                            const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                            const fisc = a.fiscalQty ?? 0;
                            const comodato = a.comodatoQty ?? 0;
                            const recolha = a.recolhaQty ?? 0;
                            return -(phys - fisc + comodato - recolha) > 0;
                          }).map(a => {
                            const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                            const fisc = a.fiscalQty ?? 0;
                            const comodato = a.comodatoQty ?? 0;
                            const recolha = a.recolhaQty ?? 0;
                            const rawDiff = -(phys - fisc + comodato - recolha);
                            const treated = a.treatedQty || 0;
                            const pendingQty = Math.max(0, rawDiff - treated);
                            const unitPrice = a.cost ?? 18.0;
                            return {
                              code: a.assetId,
                              description: a.assetName,
                              rawDiff,
                              treatedQty: treated,
                              pendingQty,
                              unitPrice,
                              totalPendingValue: pendingQty * unitPrice,
                              treatmentNotes: a.treatmentNotes,
                              unit: 'un',
                              type: 'AG' as const,
                              isAsset: true
                            };
                          })
                        ].filter(d => {
                          if (subTabDivergencias === 'pa') return d.type === 'PA';
                          if (subTabDivergencias === 'ag') return d.type === 'AG';
                          return true;
                        });

                        const currentObsType = cardObsTypes[audit.id] || (surpluses.length > 0 && deficits.length > 0 ? 'todos' : surpluses.length > 0 ? 'sobra' : deficits.length > 0 ? 'falta' : 'todos');
                        const existingVale = vales.find(v => v.auditId === audit.id || (v.routeMap && v.routeMap.toUpperCase() === audit.routeMap.toUpperCase()));
                        const hasVale = Boolean(existingVale || audit.deficitActionStatus === 'baixado');

                        const totalPendingSurplusUnits = surpluses.reduce((acc, s) => acc + s.pendingQty, 0);
                        const totalPendingDeficitUnits = deficits.reduce((acc, d) => acc + d.pendingQty, 0);

                        return (
                          <div 
                            key={audit.id} 
                            id={`audit_card_${audit.id}`}
                            className={`bg-white rounded-2xl border ${isSelected ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md' : 'border-slate-200 shadow-sm'} p-6 space-y-4 hover:border-slate-300 transition`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                              <div className="flex items-start sm:items-center space-x-3">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedDiscrepancyIds(prev =>
                                      prev.includes(audit.id) ? prev.filter(id => id !== audit.id) : [...prev, audit.id]
                                    );
                                  }}
                                  className="mt-0.5 sm:mt-0 p-1 hover:bg-slate-100 rounded-md transition text-slate-400 hover:text-amber-600 cursor-pointer"
                                  title={isSelected ? "Desmarcar este card" : "Selecionar este card para ações em lote"}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="h-5 w-5 text-amber-500" />
                                  ) : (
                                    <Square className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                  )}
                                </button>
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-sans font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">Mapa {audit.routeMap}</span>
                                    <span className="font-mono text-xs text-slate-500 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">{audit.plate}</span>
                                    <span className="text-xxs text-slate-400 font-mono">Data: {new Date(audit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <div className="text-xxs text-slate-500 mt-1 flex flex-wrap gap-2 items-center">
                                    <span>Motorista: <strong className="text-slate-800">{getDriverName(audit.driverId)}</strong></span>
                                    {audit.helperId && (
                                      <span className="text-slate-400">| Ajudante: <strong className="text-slate-700">{getHelperName(audit.helperId)}</strong></span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {/* Botão Ação Rápida: Baixa Direta */}
                                <button
                                  type="button"
                                  onClick={() => handleBatchBaixaDireta([audit.id])}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-[11px] rounded-lg transition flex items-center space-x-1 cursor-pointer"
                                  title="Dar baixa direta nesta ocorrência e arquivar para o histórico"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  <span>Baixa Direta</span>
                                </button>

                                {/* Botão Ação Rápida: Gerar Vale se houver falta */}
                                {deficits.length > 0 && (
                                  hasVale ? (
                                    <span 
                                      className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[11px] rounded-lg flex items-center space-x-1"
                                      title={`Vale de falta já emitido (${existingVale ? `R$ ${(existingVale.valor || 0).toFixed(2)}` : 'Registrado'}).`}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>Vale Emitido ✓</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleBatchGenerateVales([audit.id])}
                                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold text-[11px] rounded-lg transition flex items-center space-x-1 cursor-pointer"
                                      title="Gerar vale para o motorista referente às faltas deste mapa (sobras permanecem no card para alinhamento)"
                                    >
                                      <FileText className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Gerar Vale (Falta)</span>
                                    </button>
                                  )
                                )}

                                {/* 30 Days Status Badge */}
                                {audit.surplusFlowStatus === 'ENVIADO' ? (
                                  <span className="text-[10px] bg-emerald-600 text-white font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    ENVIADO
                                  </span>
                                ) : isWithin30Days ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    ENVIO NO PRAZO
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-red-100 text-red-800 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    FORA DO PRAZO ({daysElapsed} dias)
                                  </span>
                                )}

                                {audit.surplusFlowStatus === 'ENCAMINHADO' && !audit.gestorAlignedDeliveryDate && (
                                  <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                                    AGUARDANDO GESTOR
                                  </span>
                                )}
                                {audit.gestorAlignedDeliveryDate && audit.surplusFlowStatus !== 'ENVIADO' && (
                                  <span className="text-[10px] bg-blue-100 text-blue-900 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                    DATA ALINHADA PELO GESTOR
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* QUADRADOS LADO A LADO: SOBRAS (ESQUERDA) VS FALTAS (DIREITA) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                              {/* QUADRADO 1: SOBRAS (ESQUERDA) */}
                              <div className="bg-amber-50/40 border-2 border-amber-200/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="h-3 w-3 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-black text-slate-950 font-mono">+</span>
                                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-tight font-sans">
                                        Sobras Físicas Detectadas
                                      </h4>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-xxs font-mono font-black px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md">
                                        {totalPendingSurplusUnits > 0 ? `+${totalPendingSurplusUnits} pendentes` : '✓ 100% Tratadas'}
                                      </span>
                                    </div>
                                  </div>

                                  {surpluses.length === 0 ? (
                                    <p className="text-slate-400 italic text-xs py-4 text-center">Nenhuma sobra identificada neste mapa.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {surpluses.map((s, idx) => {
                                        const inputKey = `${audit.id}_${s.code}`;
                                        const currentInput = itemTreatmentInputs[inputKey] || { qty: '', notes: '' };

                                        return (
                                          <div key={idx} className="bg-white/90 border border-amber-200 rounded-xl p-3 space-y-2 shadow-3xs">
                                            <div className="flex justify-between items-start text-xs font-medium">
                                              <div className="flex items-start space-x-1.5">
                                                <span className="text-[9px] bg-amber-200 text-amber-900 font-black px-1.5 py-0.5 rounded font-mono mt-0.5">{s.type}</span>
                                                <div>
                                                  <div className="text-slate-900 font-bold">
                                                    <span className="font-mono text-amber-900 mr-1">[{s.code}]</span>
                                                    <span>{s.description}</span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    Preço ref: R$ {(s.unitPrice || 0).toFixed(2)} / {s.unit}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-xs font-black font-mono text-amber-900 block">+{s.rawDiff} {s.unit}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                  Tratado: <strong className="text-emerald-700">{s.treatedQty}</strong> | Pendente: <strong className="text-amber-950 font-black">{s.pendingQty}</strong>
                                                </span>
                                              </div>
                                            </div>

                                            {/* Informações de Tratamento e Formulário de Baixa Parcial */}
                                            {s.pendingQty > 0 ? (
                                              <div className="bg-amber-50/60 rounded-lg p-2 border border-amber-200/60 space-y-1.5 mt-2">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-amber-900 font-sans">
                                                  <span>Tratar Sobra (Qtd Pendente: {s.pendingQty})</span>
                                                  <span className="text-slate-500 font-mono">Total Pendente: R$ {(s.totalPendingValue || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                                                  <div className="sm:col-span-3">
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      max={s.pendingQty}
                                                      placeholder={`Qtd (1-${s.pendingQty})`}
                                                      value={currentInput.qty}
                                                      onChange={e => {
                                                        const val = e.target.value === '' ? '' : Number(e.target.value);
                                                        setItemTreatmentInputs(prev => ({
                                                          ...prev,
                                                          [inputKey]: { ...currentInput, qty: val }
                                                        }));
                                                      }}
                                                      className="w-full text-xs p-1.5 bg-white border border-amber-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                                                    />
                                                  </div>
                                                  <div className="sm:col-span-5">
                                                    <input
                                                      type="text"
                                                      placeholder="Obs / Motivo / NB..."
                                                      value={currentInput.notes}
                                                      onChange={e => {
                                                        setItemTreatmentInputs(prev => ({
                                                          ...prev,
                                                          [inputKey]: { ...currentInput, notes: e.target.value }
                                                        }));
                                                      }}
                                                      className="w-full text-xs p-1.5 bg-white border border-amber-300 rounded font-sans focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                    />
                                                  </div>
                                                  <div className="sm:col-span-4 flex gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const q = Number(currentInput.qty) || 0;
                                                        if (!q || q <= 0 || q > s.pendingQty) {
                                                          alert(`Por favor, informe uma quantidade entre 1 e ${s.pendingQty}.`);
                                                          return;
                                                        }
                                                        handleTreatItemQty(audit.id, s.code, s.isAsset, q, currentInput.notes);
                                                      }}
                                                      className="flex-1 px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] uppercase rounded transition cursor-pointer shadow-3xs text-center"
                                                      title="Registrar tratamento desta quantidade específica"
                                                    >
                                                      Salvar
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        handleTreatItemQty(audit.id, s.code, s.isAsset, s.pendingQty, currentInput.notes || 'Tratamento integral de sobra');
                                                      }}
                                                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase rounded transition cursor-pointer shadow-3xs text-center whitespace-nowrap"
                                                      title="Tratar toda a sobra restante deste item"
                                                    >
                                                      Tratar Tudo ({s.pendingQty})
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold">
                                                <div className="flex items-center space-x-1.5">
                                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                  <span>Sobra 100% Tratada / Baixada ({s.treatedQty} un)</span>
                                                </div>
                                                {s.treatmentNotes && (
                                                  <span className="text-[10px] text-emerald-700 font-normal italic">
                                                    Obs: {s.treatmentNotes}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {audit.reconciliationNotes && (
                                  <div className="mt-2.5 p-2.5 bg-amber-100/50 border border-amber-200 rounded-xl text-xxs text-amber-950">
                                    <div className="flex items-center space-x-1.5 mb-1 font-bold uppercase tracking-wider text-[9px] text-amber-900">
                                      <Sparkles className="h-3 w-3 text-amber-600" />
                                      <span>Observação Geral Registrada</span>
                                    </div>
                                    <p className="font-medium whitespace-pre-wrap">{audit.reconciliationNotes}</p>
                                  </div>
                                )}
                              </div>

                              {/* QUADRADO 2: FALTAS (DIREITA) */}
                              <div className="bg-rose-50/40 border-2 border-rose-200/80 rounded-2xl p-4 space-y-3 flex flex-col justify-between shadow-2xs">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
                                    <div className="flex items-center space-x-2">
                                      <span className="h-3 w-3 bg-rose-600 rounded-full flex items-center justify-center text-[8px] font-black text-white font-mono">-</span>
                                      <h4 className="text-xs font-black text-rose-950 uppercase tracking-tight font-sans">
                                        Faltas Físicas Detectadas
                                      </h4>
                                    </div>
                                    <div className="flex items-center space-x-1.5">
                                      {hasVale && (
                                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
                                          <span>✓ Vale Emitido</span>
                                        </span>
                                      )}
                                      <span className="text-xxs font-mono font-black px-2 py-0.5 bg-rose-100 text-rose-900 border border-rose-300 rounded-md">
                                        {totalPendingDeficitUnits > 0 ? `-${totalPendingDeficitUnits} pendentes` : '✓ 100% Tratadas'}
                                      </span>
                                    </div>
                                  </div>

                                  {deficits.length === 0 ? (
                                    <p className="text-slate-400 italic text-xs py-4 text-center">Nenhuma falta identificada neste mapa.</p>
                                  ) : (
                                    <div className="space-y-3">
                                      {deficits.map((d, idx) => {
                                        const inputKey = `${audit.id}_${d.code}`;
                                        const currentInput = itemTreatmentInputs[inputKey] || { qty: '', notes: '' };

                                        return (
                                          <div key={idx} className="bg-white/90 border border-rose-200 rounded-xl p-3 space-y-2 shadow-3xs">
                                            <div className="flex justify-between items-start text-xs font-medium">
                                              <div className="flex items-start space-x-1.5">
                                                <span className="text-[9px] bg-rose-200 text-rose-900 font-black px-1.5 py-0.5 rounded font-mono mt-0.5">{d.type}</span>
                                                <div>
                                                  <div className="text-slate-900 font-bold">
                                                    <span className="font-mono text-rose-900 mr-1">[{d.code}]</span>
                                                    <span>{d.description}</span>
                                                  </div>
                                                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                                    Preço ref: R$ {(d.unitPrice || 0).toFixed(2)} / {d.unit}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="text-right">
                                                <span className="text-xs font-black font-mono text-rose-950 block">-{d.rawDiff} {d.unit}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                  Tratado: <strong className="text-emerald-700">{d.treatedQty}</strong> | Pendente: <strong className="text-rose-950 font-black">{d.pendingQty}</strong>
                                                </span>
                                              </div>
                                            </div>

                                            {/* Informações de Tratamento e Formulário de Baixa Parcial de Falta */}
                                            {d.pendingQty > 0 ? (
                                              <div className="bg-rose-50/60 rounded-lg p-2 border border-rose-200/60 space-y-1.5 mt-2">
                                                <div className="flex items-center justify-between text-[10px] font-bold uppercase text-rose-900 font-sans">
                                                  <span>Tratar Falta (Qtd Pendente: {d.pendingQty})</span>
                                                  <span className="text-slate-500 font-mono">Total Pendente: R$ {(d.totalPendingValue || 0).toFixed(2)}</span>
                                                </div>
                                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 items-center">
                                                  <div className="sm:col-span-3">
                                                    <input
                                                      type="number"
                                                      min="1"
                                                      max={d.pendingQty}
                                                      placeholder={`Qtd (1-${d.pendingQty})`}
                                                      value={currentInput.qty}
                                                      onChange={e => {
                                                        const val = e.target.value === '' ? '' : Number(e.target.value);
                                                        setItemTreatmentInputs(prev => ({
                                                          ...prev,
                                                          [inputKey]: { ...currentInput, qty: val }
                                                        }));
                                                      }}
                                                      className="w-full text-xs p-1.5 bg-white border border-rose-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-rose-500 font-bold"
                                                    />
                                                  </div>
                                                  <div className="sm:col-span-5">
                                                    <input
                                                      type="text"
                                                      placeholder="Obs / Justificativa / Vale..."
                                                      value={currentInput.notes}
                                                      onChange={e => {
                                                        setItemTreatmentInputs(prev => ({
                                                          ...prev,
                                                          [inputKey]: { ...currentInput, notes: e.target.value }
                                                        }));
                                                      }}
                                                      className="w-full text-xs p-1.5 bg-white border border-rose-300 rounded font-sans focus:outline-none focus:ring-1 focus:ring-rose-500"
                                                    />
                                                  </div>
                                                  <div className="sm:col-span-4 flex gap-1">
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const q = Number(currentInput.qty) || 0;
                                                        if (!q || q <= 0 || q > d.pendingQty) {
                                                          alert(`Por favor, informe uma quantidade entre 1 e ${d.pendingQty}.`);
                                                          return;
                                                        }
                                                        handleTreatItemQty(audit.id, d.code, d.isAsset, q, currentInput.notes);
                                                      }}
                                                      className="flex-1 px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase rounded transition cursor-pointer shadow-3xs text-center"
                                                      title="Registrar tratamento desta quantidade específica de falta"
                                                    >
                                                      Salvar
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        handleTreatItemQty(audit.id, d.code, d.isAsset, d.pendingQty, currentInput.notes || 'Tratamento integral de falta');
                                                      }}
                                                      className="px-2 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase rounded transition cursor-pointer shadow-3xs text-center whitespace-nowrap"
                                                      title="Tratar toda a falta restante deste item"
                                                    >
                                                      Tratar Tudo ({d.pendingQty})
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800 font-bold">
                                                <div className="flex items-center space-x-1.5">
                                                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                  <span>Falta 100% Regularizada / Tratada ({d.treatedQty} un)</span>
                                                </div>
                                                {d.treatmentNotes && (
                                                  <span className="text-[10px] text-emerald-700 font-normal italic">
                                                    Obs: {d.treatmentNotes}
                                                  </span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {audit.reconciliationNotes && (
                                  <div className="mt-2.5 p-2.5 bg-rose-100/40 border border-rose-200 rounded-xl text-xxs text-rose-950">
                                    <div className="flex items-center space-x-1.5 mb-1 font-bold uppercase tracking-wider text-[9px] text-rose-900">
                                      <Sparkles className="h-3 w-3 text-rose-600" />
                                      <span>Observação Geral Registrada</span>
                                    </div>
                                    <p className="font-medium whitespace-pre-wrap">{audit.reconciliationNotes}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                        {/* Monitoramento Form or Display */}
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block font-mono">
                            Fluxo de Roteamento de Sobra (Ações e Registro)
                          </span>

                          {/* Interactive Section */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">NB (Código Cliente)</label>
                              <input
                                type="text"
                                placeholder="NB do Cliente..."
                                disabled={currentUser.role !== 'monitoramento' && currentUser.role !== 'gestor'}
                                defaultValue={audit.clientCodeNB || ''}
                                id={`nb_input_${audit.id}`}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 font-sans">Data de Entrega</label>
                              <input
                                type="date"
                                disabled={currentUser.role !== 'monitoramento' && currentUser.role !== 'gestor'}
                                defaultValue={audit.deliveryDate || ''}
                                id={`date_input_${audit.id}`}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none"
                              />
                            </div>

                            <div className="flex gap-2">
                              {/* Monitoramento or Gestor Save Button */}
                              {(currentUser.role === 'monitoramento' || currentUser.role === 'gestor') && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nbVal = (document.getElementById(`nb_input_${audit.id}`) as HTMLInputElement)?.value || '';
                                      const dateVal = (document.getElementById(`date_input_${audit.id}`) as HTMLInputElement)?.value || '';
                                      if (!nbVal || !dateVal) {
                                        alert('Por favor, informe o código NB do cliente e a data de entrega.');
                                        return;
                                      }
                                      const isGestor = currentUser.role === 'gestor';
                                      const commentVal = (document.getElementById(`action_comment_${audit.id}`) as HTMLTextAreaElement)?.value || '';
                                      const updated = audits.map(a => {
                                        if (a.id === audit.id) {
                                          return {
                                            ...a,
                                            clientCodeNB: nbVal,
                                            deliveryDate: dateVal,
                                            surplusFlowStatus: 'ENCAMINHADO' as const,
                                            gestorAlignedDeliveryDate: isGestor ? true : false,
                                            reconciliationNotes: commentVal || a.reconciliationNotes,
                                            history: [
                                              ...a.history,
                                              {
                                                timestamp: new Date().toISOString(),
                                                action: isGestor ? 'Sobra Alinhada e Registrada pelo Gestor' : 'Previsão de Entrega da Sobra Informada',
                                                user: currentUser.name,
                                                details: isGestor 
                                                  ? `NB: ${nbVal} | Data de Entrega: ${dateVal}. Alinhamento automático efetuado pelo Gestor.`
                                                  : `NB: ${nbVal} | Data de Entrega: ${dateVal}. Encaminhado ao gestor para alinhamento.`
                                              }
                                            ]
                                          };
                                        }
                                        return a;
                                      });
                                      onSaveAudits(updated);
                                      if (isGestor) {
                                        alert('Dados salvos e data de entrega alinhada pelo Gestor!');
                                      } else {
                                        alert('Dados salvos! Uma notificação foi enviada ao gestor para alinhamento da data.');
                                      }
                                    }}
                                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer shadow-sm text-center font-sans"
                                  >
                                    {currentUser.role === 'gestor' ? 'Salvar e Alinhar' : 'Salvar e Encaminhar'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const commentVal = (document.getElementById(`action_comment_${audit.id}`) as HTMLTextAreaElement)?.value || '';
                                      requestConfirm(
                                        '❓ Confirmar Baixa Direta',
                                        'Tem certeza que deseja realizar a Baixa Direta desta ocorrência (sobra/falta)?\n\nEsta ação arquiva a ocorrência diretamente sem exigir mais alinhamentos ou vales financeiros.',
                                        () => {
                                          const updated = audits.map(a => {
                                            if (a.id === audit.id) {
                                              const isSobra = surpluses.length > 0;
                                              return {
                                                ...a,
                                                surplusFlowStatus: 'BAIXADO' as const,
                                                surplusActionStatus: 'baixado_direto' as const,
                                                deficitActionStatus: 'baixado_direto' as const,
                                                reconciliationNotes: commentVal || a.reconciliationNotes,
                                                correctiveActionNotes: commentVal 
                                                  ? `Baixa direta efetuada com observações: ${commentVal}`
                                                  : (isSobra 
                                                      ? 'Baixa direta efetuada pelo painel operacional (sobra).'
                                                      : 'Baixa direta efetuada pelo painel operacional (falta).'),
                                                history: [
                                                  ...a.history,
                                                  {
                                                    timestamp: new Date().toISOString(),
                                                    action: isSobra ? 'Baixa Direta de Sobras Realizada' : 'Baixa Direta de Faltas Realizada',
                                                    user: currentUser.name,
                                                    details: commentVal 
                                                      ? `Baixa direta efetuada pelo Gestor/Monitoramento. Observação: ${commentVal}`
                                                      : (isSobra 
                                                          ? 'Baixa direta efetuada pelo Gestor/Monitoramento no painel operacional (Sobra).'
                                                          : 'Baixa direta efetuada pelo Gestor/Monitoramento no painel operacional (Falta).')
                                                  }
                                                ]
                                              };
                                            }
                                            return a;
                                          });
                                          onSaveAudits(updated);
                                          alert('Baixa direta realizada com sucesso!');
                                        }
                                      );
                                    }}
                                    className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer shadow-sm text-center flex items-center justify-center space-x-1.5 font-sans"
                                  >
                                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    <span>Baixa Direta</span>
                                  </button>
                                </>
                              )}

                              {/* Gestor Aligned Notification Button */}
                              {currentUser.role === 'gestor' && audit.surplusFlowStatus === 'ENCAMINHADO' && !audit.gestorAlignedDeliveryDate && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const commentVal = (document.getElementById(`action_comment_${audit.id}`) as HTMLTextAreaElement)?.value || '';
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          gestorAlignedDeliveryDate: true,
                                          reconciliationNotes: commentVal || a.reconciliationNotes,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: 'Data de Entrega Alinhada pelo Gestor',
                                              user: currentUser.name,
                                              details: `Data de Entrega alinhada: ${a.deliveryDate}`
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);
                                    alert('Data de entrega alinhada com sucesso!');
                                  }}
                                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition cursor-pointer shadow-sm text-center font-sans"
                                >
                                  Alinhar Data de Entrega
                                </button>
                              )}

                              {/* Dar Baixa (Resolvido) button for Auxiliar or anyone after encaminhado */}
                              {audit.surplusFlowStatus === 'ENCAMINHADO' && (
                                <button
                                  type="button"
                                  disabled={!audit.gestorAlignedDeliveryDate && currentUser.role === 'auxiliar_logistica'}
                                  onClick={() => {
                                    const commentVal = (document.getElementById(`action_comment_${audit.id}`) as HTMLTextAreaElement)?.value || '';
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          surplusFlowStatus: 'ENVIADO' as const,
                                          surplusActionStatus: 'enviado_cliente' as const,
                                          reconciliationNotes: commentVal || a.reconciliationNotes,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: 'Baixa de Sobras Realizada - Enviado',
                                              user: currentUser.name,
                                              details: `Status de fluxo finalizado como ENVIADO.`
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);
                                    alert('Baixa efetuada! O status foi alterado para ENVIADO.');
                                  }}
                                  className={`flex-1 font-bold text-xs py-2 px-3 rounded-lg transition shadow-sm text-center cursor-pointer font-sans ${
                                    audit.gestorAlignedDeliveryDate || currentUser.role === 'gestor'
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  }`}
                                  title={!audit.gestorAlignedDeliveryDate && currentUser.role !== 'gestor' ? 'Aguardando o gestor alinhar a data de entrega para permitir a baixa' : 'Dar baixa e marcar como enviado'}
                                >
                                  Dar Baixa (Enviado)
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Show saved values */}
                          {(audit.clientCodeNB || audit.deliveryDate) && (
                            <div className="flex flex-wrap gap-4 pt-2 text-xs border-t border-slate-200 text-slate-600">
                              <div><strong>Código NB:</strong> <span className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800">{audit.clientCodeNB || 'N/A'}</span></div>
                              <div><strong>Previsão de Entrega:</strong> <span className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-slate-800">{audit.deliveryDate ? new Date(audit.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}</span></div>
                              {audit.gestorAlignedDeliveryDate && (
                                <div className="text-emerald-600 font-bold flex items-center space-x-1">
                                  <span>✓ Alinhado pelo Gestor</span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Ações Sugeridas & Seção de Observações Salvas */}
                          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mt-3 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center space-x-1.5 text-amber-800">
                                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-black uppercase tracking-wider font-sans font-bold">Ação Sugerida do Sistema</span>
                              </div>
                              {/* Botão de gerar vale financeiro se houver faltas */}
                              {deficits.length > 0 && (
                                hasVale ? (
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center space-x-1">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                    <span>Vale de Falta já Emitido ✓</span>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const valorFalta = audit.items.reduce((acc, i) => {
                                        const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                                        const fQty = i.fiscalQty ?? 0;
                                        if (phys < fQty) {
                                          const raw = fQty - phys;
                                          const treated = i.treatedQty || 0;
                                          const pending = Math.max(0, raw - treated);
                                          return acc + (pending * getSkuClosedPrice(i.productCode, i.cost ?? 45.0));
                                        }
                                        return acc;
                                      }, 0) + audit.assets.reduce((acc, a) => {
                                        const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                                        const fisc = a.fiscalQty ?? 0;
                                        const comodato = a.comodatoQty ?? 0;
                                        const recolha = a.recolhaQty ?? 0;
                                        const raw = -(phys - fisc + comodato - recolha);
                                        if (raw > 0) {
                                          const treated = a.treatedQty || 0;
                                          const pending = Math.max(0, raw - treated);
                                          return acc + (pending * (a.cost ?? 18.0));
                                        }
                                        return acc;
                                      }, 0);

                                      const descFalta = deficits.map(d => `${d.pendingQty}x ${d.code ? `[${d.code}] ` : ''}${d.description}`).join(', ');
                                      const motoristaNome = getDriverName(audit.driverId);

                                      const novoVale = {
                                        id: 'val_' + Date.now(),
                                        auditId: audit.id,
                                        routeMap: audit.routeMap,
                                        colaboradorId: audit.driverId,
                                        colaboradorName: motoristaNome,
                                        colaboradorRole: 'MOTORISTA',
                                        valor: Number((valorFalta || 0).toFixed(2)) || 80.0,
                                        descricao: `Falta de: ${descFalta}. Mapa: ${audit.routeMap}`,
                                        dataGeracao: new Date().toISOString().split('T')[0],
                                        status: 'PENDENTE_ASSINATURA' as const,
                                        observacao: 'Gerado automaticamente por desvios identificados na aferição física.'
                                      };

                                      const updatedAudits = audits.map(a => {
                                        if (a.id === audit.id) {
                                          return {
                                            ...a,
                                            deficitActionStatus: 'baixado' as const,
                                            history: [
                                              ...(a.history || []),
                                              {
                                                timestamp: new Date().toISOString(),
                                                action: 'Vale Financeiro Gerado (Faltas)',
                                                user: currentUser.name,
                                                details: `Vale de R$ ${(valorFalta || 0).toFixed(2)} gerado para ${motoristaNome} referente às faltas. Sobras permanecem ativas no card.`
                                              }
                                            ]
                                          };
                                        }
                                        return a;
                                      });

                                      onSaveVales([...vales, novoVale]);
                                      onSaveAudits(updatedAudits);

                                      if (surpluses.length > 0) {
                                        alert(`✅ Sucesso! Vale financeiro de R$ ${(novoVale.valor || 0).toFixed(2)} gerado para as FALTAS!\n\n📌 Lembrete: O vale cobriu exclusivamente as faltas. O card permanece no painel para que a SOBRA seja tratada (NB do cliente / previsão de entrega).`);
                                      } else {
                                        alert(`✅ Sucesso! Vale financeiro autogerado no valor de R$ ${(novoVale.valor || 0).toFixed(2)} para ${novoVale.colaboradorName}.`);
                                      }
                                    }}
                                    className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase py-1 px-2.5 rounded-lg transition shadow-xs cursor-pointer flex items-center space-x-1 shrink-0"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span>Gerar Vale Financeiro (Faltas)</span>
                                  </button>
                                )
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed">
                              {deficits.length > 0 
                                ? `Detectada Falta Física de ${deficits.map(d => `${d.pendingQty} ${d.unit} de ${d.code ? `[${d.code}] ` : ''}${d.description}`).join(', ')}. Ação sugerida: Gerar e emitir Vale de Desconto para o motorista/ajudante responsável ou coletar justificativa assinada pelo fiscal de expedição.`
                                : `Detectada Sobra Física de ${surpluses.map(s => `${s.pendingQty} ${s.unit} de ${s.code ? `[${s.code}] ` : ''}${s.description}`).join(', ')}. Ação sugerida: Identificar e inserir o código NB do cliente, alinhar data estimada de entrega e encaminhar ao gestor para efetivar baixa física.`
                              }
                            </p>

                            {/* Caixa de Comentário / Observação de Ação */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Comentários e Observações da Ação Executada</label>
                                <div className="flex items-center space-x-1">
                                  {currentObsType === 'todos' ? (
                                    <span className="inline-flex items-center space-x-1 text-[9px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans animate-pulse">
                                      <Sparkles className="h-3 w-3 text-indigo-600" />
                                      <span>AMBOS (SOBRA & FALTA)</span>
                                    </span>
                                  ) : currentObsType === 'sobra' ? (
                                    <span className="inline-flex items-center space-x-1 text-[9px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                                      <ArrowUpCircle className="h-3 w-3 text-amber-600" />
                                      <span>APLICA-SE A SOBRA</span>
                                    </span>
                                  ) : currentObsType === 'falta' ? (
                                    <span className="inline-flex items-center space-x-1 text-[9px] font-black bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                                      <ArrowDownCircle className="h-3 w-3 text-red-600" />
                                      <span>APLICA-SE A FALTA</span>
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {/* Classificação do comentário (Sobra / Falta / Todos) */}
                              <div className="flex items-center space-x-2 pt-0.5 pb-1">
                                <span className="text-[9px] font-bold text-slate-400 uppercase font-sans">Classificar como:</span>
                                <button
                                  type="button"
                                  onClick={() => setCardObsTypes(prev => ({ ...prev, [audit.id]: 'sobra' }))}
                                  className={`flex items-center space-x-1 text-[8px] font-extrabold px-2 py-0.5 rounded transition border cursor-pointer ${
                                    currentObsType === 'sobra'
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-3xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <ArrowUpCircle className="h-2.5 w-2.5" />
                                  <span>Sobra</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCardObsTypes(prev => ({ ...prev, [audit.id]: 'falta' }))}
                                  className={`flex items-center space-x-1 text-[8px] font-extrabold px-2 py-0.5 rounded transition border cursor-pointer ${
                                    currentObsType === 'falta'
                                      ? 'bg-rose-600 text-white border-rose-700 shadow-3xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <ArrowDownCircle className="h-2.5 w-2.5" />
                                  <span>Falta</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCardObsTypes(prev => ({ ...prev, [audit.id]: 'todos' }))}
                                  className={`flex items-center space-x-1 text-[8px] font-extrabold px-2 py-0.5 rounded transition border cursor-pointer ${
                                    currentObsType === 'todos'
                                      ? 'bg-slate-600 text-white border-slate-700 shadow-3xs'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <AlertCircle className="h-2.5 w-2.5" />
                                  <span>Todos</span>
                                </button>
                              </div>

                              <textarea
                                id={`action_comment_${audit.id}`}
                                key={audit.reconciliationNotes || ''}
                                rows={2}
                                placeholder="Coloque observações, observações de recontagem, decisões de vales ou andamento da reentrega..."
                                defaultValue={audit.reconciliationNotes || ''}
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition leading-normal font-sans"
                              />
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-slate-400 font-medium">Os comentários salvos aparecem diretamente neste card e no histórico.</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const valInput = (document.getElementById(`action_comment_${audit.id}`) as HTMLTextAreaElement)?.value || '';
                                    const currentObsType = cardObsTypes[audit.id] || (surpluses.length > 0 && deficits.length > 0 ? 'todos' : surpluses.length > 0 ? 'sobra' : deficits.length > 0 ? 'falta' : 'todos');
                                    const isSobra = currentObsType === 'sobra' || currentObsType === 'todos' || surpluses.length > 0;
                                    const isFalta = currentObsType === 'falta' || currentObsType === 'todos' || deficits.length > 0;
                                    
                                    // 1. Save in the audit session and register classification
                                    const updated = audits.map(a => {
                                      if (a.id === audit.id) {
                                        return {
                                          ...a,
                                          reconciliationNotes: valInput,
                                          surplusActionStatus: isSobra ? ('comentado' as const) : a.surplusActionStatus,
                                          deficitActionStatus: isFalta ? ('comentado' as const) : a.deficitActionStatus,
                                          history: [
                                            ...a.history,
                                            {
                                              timestamp: new Date().toISOString(),
                                              action: 'Observação Salva & Arquivada para Histórico',
                                              user: currentUser.name,
                                              details: `[Classificação: ${currentObsType.toUpperCase()}] ${valInput}`
                                            }
                                          ]
                                        };
                                      }
                                      return a;
                                    });
                                    onSaveAudits(updated);

                                    // 2. Sync to the matching ImportedRoute so it's beautifully visual in Monitoramento
                                    const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === audit.routeMap.toUpperCase());
                                    if (matchingRoute && onSaveImportedRoutes) {
                                      const newObs: RouteObservation = {
                                        id: `obs_${Date.now()}`,
                                        author: 'Logística',
                                        text: valInput.trim(),
                                        timestamp: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                                        type: currentObsType
                                      };
                                      const currentObsList = matchingRoute.routeObservations || [];
                                      const updatedObsList = [...currentObsList, newObs];
                                      const combinedString = updatedObsList.map(o => `[${o.author} - ${o.timestamp}]: ${o.text}`).join('\n');
                                      
                                      const updatedRoutes = importedRoutes.map(r => {
                                        if (r.id === matchingRoute.id) {
                                          return {
                                            ...r,
                                            routeObservations: updatedObsList,
                                            discrepancyObservation: combinedString
                                          };
                                        }
                                        return r;
                                      });
                                      onSaveImportedRoutes(updatedRoutes);
                                    }

                                    alert('Comentário salvo com sucesso! O registro foi processado e fica preservado no Histórico.');
                                  }}
                                  className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] uppercase py-1 px-3 rounded-lg transition cursor-pointer"
                                >
                                  Salvar Comentário
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  )}

          {/* Section: Gestão de Vales (Vales View) */}
          {activeTab === 'vales_view' && (
            <div className="space-y-6 animate-fade-in" id="tab_vales_view">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-slate-900">
                      <FileText className="h-6 w-6 text-red-500 animate-pulse" />
                      <h2 className="font-sans font-bold text-lg uppercase">Controle de Vales & Dashboard de Desvios</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Dashboard gerencial de faltas/sobras em R$ e hL com rankings de motoristas e itens, além de controle e emissão formal de termos de responsabilidade.
                    </p>
                  </div>

                  {/* Sub-tab switcher */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                    <button
                      type="button"
                      onClick={() => setValesViewMode('dashboard')}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                        valesViewMode === 'dashboard'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <Trophy className="h-4 w-4" />
                      <span>📊 Dashboard & Rankings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setValesViewMode('emissao')}
                      className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${
                        valesViewMode === 'emissao'
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                      <span>📝 Emissão & Termos ({vales.length})</span>
                    </button>
                  </div>
                </div>
              </div>

              {valesViewMode === 'dashboard' ? (
                <RankingDashboardPaAg
                  audits={audits}
                  products={products}
                  drivers={drivers}
                  vehicles={vehicles}
                  activeAssets={activeAssets}
                  importedRoutes={importedRoutes}
                  vales={vales}
                  mode="vales"
                  onNavigateToVales={() => setValesViewMode('emissao')}
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full min-w-0">
                {/* Form to Issue Vale (Left) */}
                <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs h-fit min-w-0">
                  <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-1.5 font-bold">
                    <Plus className="h-4 w-4 text-amber-500" />
                    <span>Emitir Novo Vale de Desconto</span>
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Selecionar Colaborador</label>
                      <select
                        value={valeColaboradorId}
                        onChange={(e) => setValeColaboradorId(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                      >
                        <option value="">Selecione o colaborador...</option>
                        {/* Motoristas */}
                        <optgroup label="Motoristas">
                          {drivers.map(d => (
                            <option key={d.id} value={d.id}>{d.name} (Motorista)</option>
                          ))}
                        </optgroup>
                        {/* Conferentes / Outros */}
                        <optgroup label="Outros Papéis">
                          <option value="conferente_01">João Conferente (CONFERENTE)</option>
                          <option value="conferente_02">Pedro Ajudante (CONFERENTE)</option>
                          <option value="auxiliar_logistica">Auxiliar de Logística (AUXILIAR)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Mapa / Rota Relacionado</label>
                      <select
                        value={valeRouteMap}
                        onChange={(e) => {
                          const selectedMap = e.target.value;
                          setValeRouteMap(selectedMap);
                          if (!selectedMap) {
                            setValeColaboradorId('');
                            setValeValeValor('');
                            setValeDescricao('');
                            return;
                          }

                          // Find matching audit session
                          const matchingAudit = audits.find(a => a.routeMap.toUpperCase() === selectedMap.toUpperCase());
                          if (matchingAudit) {
                            // 1. Auto-select driver
                            if (matchingAudit.driverId) {
                              setValeColaboradorId(matchingAudit.driverId);
                            }

                            // 2. Calculate total shortage cost and build a descriptive string
                            let totalShortageValue = 0;
                            const descriptionParts: string[] = [];

                            (matchingAudit.items || []).forEach(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              const fisc = i.fiscalQty ?? 0;
                              if (phys < fisc) {
                                const diff = fisc - phys;
                                const unitCost = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
                                totalShortageValue += diff * unitCost;
                                descriptionParts.push(`Falta de ${diff} cx de ${i.productDescription || 'Produto'}`);
                              }
                            });

                            (matchingAudit.assets || []).forEach(a => {
                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              const fisc = a.fiscalQty ?? 0;
                              if (phys < fisc) {
                                const diff = fisc - phys;
                                const unitCost = a.cost ?? 18.0;
                                totalShortageValue += diff * unitCost;
                                descriptionParts.push(`Falta de ${diff}x ${a.assetName || 'Ativo'}`);
                              }
                            });

                            setValeValeValor((totalShortageValue || 0).toFixed(2));
                            setValeDescricao(descriptionParts.join(' e ') || `Faltas encontradas no mapa ${selectedMap}`);
                          }
                        }}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                      >
                        <option value="">Nenhum ou selecione o mapa...</option>
                        {(() => {
                          const eligibleRoutes = importedRoutes.filter(r => {
                            // 1. Must be closed (fechado)
                            if (r.status !== 'fechado') return false;

                            // 2. Must not already have a vale in history
                            const alreadyHasVale = vales.some(v => v.routeMap?.toUpperCase() === r.routeMap.toUpperCase());
                            if (alreadyHasVale) return false;

                            // 3. Must have shortages (faltas) in the associated audit
                            const audit = audits.find(a => a.routeMap.toUpperCase() === r.routeMap.toUpperCase());
                            if (!audit) return false;

                            const itemShortages = audit.items.some(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              const fisc = i.fiscalQty ?? 0;
                              return phys < fisc;
                            });

                            const assetShortages = audit.assets.some(a => {
                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              const fisc = a.fiscalQty ?? 0;
                              return phys < fisc;
                            });

                            return itemShortages || assetShortages;
                          });

                          return eligibleRoutes.map(r => (
                            <option key={r.id} value={r.routeMap}>Mapa {r.routeMap} - Placa {r.plate}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Valor do Desconto (R$)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0,00"
                          value={valeValeValor}
                          onChange={(e) => setValeValeValor(e.target.value)}
                          className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Motivo / Descrição da Falta</label>
                      <input
                        type="text"
                        placeholder="Ex: Falta de 2 caixas de Spaten 350ml"
                        value={valeDescricao}
                        onChange={(e) => setValeDescricao(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase font-sans">Observações Gerais</label>
                      <textarea
                        rows={3}
                        placeholder="Insira detalhes sobre as circunstâncias da falta ou processo de aferição..."
                        value={valeObservacao}
                        onChange={(e) => setValeObservacao(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition leading-normal"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!valeColaboradorId) {
                          alert('Erro: Escolha o colaborador responsável.');
                          return;
                        }
                        if (!valeValeValor || Number(valeValeValor) <= 0) {
                          alert('Erro: Insira um valor válido maior que zero.');
                          return;
                        }
                        if (!valeDescricao.trim()) {
                          alert('Erro: Insira o motivo/descrição do desvio.');
                          return;
                        }

                        // Obter nome do colaborador
                        let colabName = '';
                        let colabRole = 'MOTORISTA';
                        const foundDriver = drivers.find(d => d.id === valeColaboradorId);
                        if (foundDriver) {
                          colabName = foundDriver.name;
                        } else if (valeColaboradorId === 'conferente_01') {
                          colabName = 'João Conferente';
                          colabRole = 'CONFERENTE';
                        } else if (valeColaboradorId === 'conferente_02') {
                          colabName = 'Pedro Ajudante';
                          colabRole = 'CONFERENTE';
                        } else if (valeColaboradorId === 'auxiliar_logistica' || valeColaboradorId === 'auxiliar_envio') {
                          colabName = 'Auxiliar de Logística';
                          colabRole = 'AUXILIAR';
                        } else {
                          colabName = 'Colaborador Avulso';
                        }

                        const novo: Vale = {
                          id: 'val_' + Date.now(),
                          routeMap: valeRouteMap || 'AVULSO',
                          colaboradorId: valeColaboradorId,
                          colaboradorName: colabName,
                          colaboradorRole: colabRole,
                          valor: Number(valeValeValor),
                          descricao: valeDescricao.trim(),
                          dataGeracao: new Date().toISOString().split('T')[0],
                          status: 'PENDENTE_ASSINATURA' as const,
                          observacao: valeObservacao.trim() || 'Sem observações adicionais.'
                        };

                        onSaveVales([...vales, novo]);
                        alert(`Vale emitido com sucesso para ${colabName}!`);
                        
                        // Limpar form
                        setValeColaboradorId('');
                        setValeRouteMap('');
                        setValeValeValor('');
                        setValeDescricao('');
                        setValeObservacao('');
                      }}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-lg transition shadow-xs cursor-pointer text-center uppercase"
                    >
                      Registrar e Emitir Vale
                    </button>
                  </div>
                </div>

                {/* List of generated vales (Right) */}
                <div className="lg:col-span-7 xl:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs min-w-0">
                  <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                        <FileText className="h-4 w-4 text-slate-600" />
                        <span>Histórico Geral de Vales Emitidos</span>
                      </h3>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {vales.length} {vales.length === 1 ? 'vale emitido' : 'vales emitidos'} • Total: <strong className="text-slate-700 font-mono">R$ {vales.reduce((acc, v) => acc + (v.valor || 0), 0).toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleExportValesExcel}
                        disabled={vales.length === 0}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-xs rounded-lg transition shadow-xs cursor-pointer"
                        title="Exportar todos os vales em planilha Excel (.xlsx) detalhada por colunas (Motorista, CPF, Mapa, Data, Itens, Valor, Status, etc.)"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        <span>Exportar Excel (.xlsx)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportValesCsv}
                        disabled={vales.length === 0}
                        className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs rounded-lg transition border border-slate-200 cursor-pointer"
                        title="Exportar dados em formato CSV"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>

                  {vales.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs italic">
                      Nenhum vale emitido no sistema até o momento.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans bg-slate-50/55">
                            <th className="py-2.5 px-3">Responsável</th>
                            <th className="py-2.5 px-3">Descrição / Motivo</th>
                            <th className="py-2.5 px-3">Mapa</th>
                            <th className="py-2.5 px-3 text-right">Valor</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {vales.map((vale) => (
                            <tr key={vale.id} className="hover:bg-slate-50/50 transition">
                              <td className="py-3 px-3 font-medium">
                                <span className="block font-bold text-slate-900">{vale.colaboradorName}</span>
                                <span className="text-[9px] text-slate-400 font-mono block uppercase">{vale.colaboradorRole}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="block text-slate-800 line-clamp-1">{vale.descricao}</span>
                                <span className="text-[10px] text-slate-400 block">Emitido: {new Date(vale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-[10px]">
                                {vale.routeMap !== 'AVULSO' ? `Mapa ${vale.routeMap}` : 'AVULSO'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                R$ {(vale.valor || 0).toFixed(2)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                                  vale.status === 'COMPENSADO'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : vale.status === 'ASSINADO'
                                      ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                }`}>
                                  {vale.status === 'PENDENTE_ASSINATURA' ? 'Pendente Assinatura' : vale.status === 'ASSINADO' ? 'Termo Assinado' : 'Compensado Fin.'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex justify-center items-center gap-1.5">
                                  {/* Botão de Visualizar Termo */}
                                  <button
                                    type="button"
                                    onClick={() => setViewingVale(vale)}
                                    className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition"
                                    title="Visualizar Termo de Autorização de Desconto"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </button>
                                  {vale.status === 'PENDENTE_ASSINATURA' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setUploadingValeId(vale.id);
                                      }}
                                      className="px-1.5 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] rounded transition uppercase cursor-pointer"
                                      title="Importar vale assinado manualmente (PDF ou JPG)"
                                    >
                                      Assinar
                                    </button>
                                  )}

                                  {/* O gestor pode compensar qualquer vale ativo (pendente ou assinado) ao faturar no fim do mês */}
                                  {(vale.status === 'ASSINADO' || (vale.status === 'PENDENTE_ASSINATURA' && currentUser.role === 'gestor')) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        requestConfirm(
                                          'Confirmar Compensação',
                                          `Tem certeza de que deseja faturar e marcar este vale no valor de R$ ${(vale.valor || 0).toFixed(2)} para ${vale.colaboradorName} como COMPENSADO?`,
                                          () => {
                                            const updated = vales.map(v => v.id === vale.id ? { ...v, status: 'COMPENSADO' as const } : v);
                                            onSaveVales?.(updated);
                                          }
                                        );
                                      }}
                                      className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded transition uppercase cursor-pointer"
                                      title="Marcar como Compensado no Financeiro"
                                    >
                                      Compensar
                                    </button>
                                  )}

                                  {/* Botão de download do PDF assinado */}
                                  {(vale.status === 'ASSINADO' || vale.status === 'COMPENSADO') && vale.signedPdfUrl && (
                                    <a
                                      href={vale.signedPdfUrl}
                                      download={vale.signedPdfName || `vale_assinado_${vale.id}.pdf`}
                                      className="p-1 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer transition flex items-center justify-center"
                                      title={`Baixar PDF Assinado: ${vale.signedPdfName || 'PDF'}`}
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </a>
                                  )}

                                  {/* Deletar Vale */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      requestConfirm(
                                        'Excluir Vale',
                                        `Deseja realmente excluir este vale no valor de R$ ${(vale.valor || 0).toFixed(2)} para ${vale.colaboradorName}?`,
                                        () => {
                                          const updated = vales.filter(v => v.id !== vale.id);
                                          onSaveVales(updated);
                                        }
                                      );
                                    }}
                                    className="p-1 text-red-600 hover:text-red-950 hover:bg-red-50 rounded cursor-pointer transition"
                                    title="Excluir Vale"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal de Importação de PDF Assinado */}
              {uploadingValeId && (() => {
                const valeToUpload = vales.find(v => v.id === uploadingValeId);
                if (!valeToUpload) return null;

                return (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="font-sans font-black text-sm text-slate-900 uppercase tracking-wide">Importar Vale Assinado (PDF/Imagem)</h4>
                        <button
                          type="button"
                          onClick={() => setUploadingValeId(null)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xxs space-y-1.5 text-slate-700">
                          <div><strong>Colaborador:</strong> {valeToUpload.colaboradorName}</div>
                          <div><strong>Valor:</strong> R$ {(valeToUpload.valor || 0).toFixed(2)}</div>
                          <div><strong>Descrição:</strong> {valeToUpload.descricao}</div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase">Selecionar Arquivo PDF ou Imagem Escaneada</label>
                          <div className="border-2 border-dashed border-slate-250 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer bg-slate-50 transition relative">
                            <input
                              type="file"
                              accept="application/pdf,image/*"
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                const reader = new FileReader();
                                reader.onload = () => {
                                  const dataUrl = reader.result as string;
                                  // Update the vale status to ASSINADO and save the file data
                                  const updated = vales.map(v => 
                                    v.id === valeToUpload.id 
                                      ? { ...v, status: 'ASSINADO' as const, signedPdfUrl: dataUrl, signedPdfName: file.name } 
                                      : v
                                  );
                                  onSaveVales(updated);
                                  setUploadingValeId(null);
                                  alert('Vale assinado com sucesso! O arquivo PDF foi anexado.');
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                            <div className="space-y-2 text-slate-600">
                              <Plus className="h-8 w-8 text-slate-400 mx-auto" />
                              <div className="text-xxs font-semibold">
                                <span className="text-amber-600 font-bold underline">Clique para selecionar</span> ou arraste o arquivo aqui
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">Suporta PDF, PNG, JPG (Max 15MB)</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => setUploadingValeId(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* PDF Recibo Timbrado Termo de Vale Modal */}
              {viewingVale && (() => {
                const associatedAudit = audits.find(a => a.id === viewingVale.auditId || a.routeMap === viewingVale.routeMap);
                const vehiclePlate = associatedAudit?.plate || 'Não cadastrada';
                const arrivalDateFormatted = associatedAudit?.arrivalDate 
                  ? new Date(associatedAudit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR') 
                  : new Date(viewingVale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR');
                const helperName = associatedAudit?.helperId ? getHelperName(associatedAudit.helperId) : 'N/A';
                const usersList = DEFAULT_USERS;
                const foundUser = usersList.find(u => u.id === associatedAudit?.conferenteId || u.username === associatedAudit?.conferenteId);
                const conferenteName = foundUser 
                  ? foundUser.name 
                  : (associatedAudit?.conferenteId 
                      ? (associatedAudit.conferenteId === 'conferente_01' ? 'João Conferente' : associatedAudit.conferenteId === 'conferente_02' ? 'Pedro Ajudante' : associatedAudit.conferenteId) 
                      : 'N/A');

                // Calculate detailed shortages/deficits for this audit (PA/AG)
                const detailedShortages: Array<{ code: string; name: string; expected: number; found: number; diff: number; cost: number; totalCost: number }> = [];

                if (associatedAudit) {
                  associatedAudit.items.forEach(i => {
                    const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                    const fisc = i.fiscalQty ?? 0;
                    if (phys < fisc) {
                      const diff = fisc - phys;
                      const unitCost = getSkuClosedPrice(i.productCode, i.cost ?? 45.0);
                      detailedShortages.push({
                        code: i.productCode,
                        name: i.productDescription || 'Produto Sem Descrição',
                        expected: fisc,
                        found: phys,
                        diff: diff,
                        cost: unitCost,
                        totalCost: diff * unitCost
                      });
                    }
                  });

                  associatedAudit.assets.forEach(a => {
                    const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                    const fisc = a.fiscalQty ?? 0;
                    if (phys < fisc) {
                      const diff = fisc - phys;
                      const unitCost = a.cost ?? 18.0;
                      detailedShortages.push({
                        code: a.assetId,
                        name: a.assetName || 'Ativo Sem Descrição',
                        expected: fisc,
                        found: phys,
                        diff: diff,
                        cost: unitCost,
                        totalCost: diff * unitCost
                      });
                    }
                  });
                }

                return (
                  <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-250 max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col">
                      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-950 text-white">
                        <span className="font-sans font-bold text-xs uppercase tracking-wider flex items-center space-x-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Recibo Termo de Autorização de Desconto (Modelo Definitivo)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewingVale(null)}
                          className="text-slate-400 hover:text-white cursor-pointer"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Printable Receipt Sheet */}
                      <div className="p-8 space-y-6 flex-1 text-slate-800" id="print-area">
                        {/* Logo & Timbre */}
                        <div className="flex justify-between items-start border-b border-slate-300 pb-4">
                          <div>
                            <span className="font-sans font-black text-lg text-slate-900 uppercase tracking-tight block">PAU BRASIL DISTRIBUIDORA LTDA</span>
                            <span className="text-[10px] text-slate-500 block uppercase font-mono tracking-wider">Logística de Retorno & Aferição Física • PAU BRASIL GUARABIRA</span>
                            <span className="text-[10px] text-amber-600 block font-bold uppercase mt-0.5">SISTEMA ATIVO DEFINTIVO</span>
                          </div>
                          <div className="bg-slate-100 px-3 py-1.5 rounded border border-slate-200 text-right">
                            <span className="text-[9px] text-slate-400 block uppercase font-bold">VALE FINANCEIRO Nº</span>
                            <span className="font-mono text-sm font-black text-red-600">{viewingVale.id}</span>
                          </div>
                        </div>

                        {/* Title */}
                        <div className="text-center space-y-1 py-1">
                          <h4 className="font-sans font-black text-sm uppercase tracking-wider text-slate-950">AUTORIZAÇÃO DE DESCONTO EM FOLHA DE PAGAMENTO</h4>
                          <span className="text-xxs font-mono text-slate-400 font-bold block">Data de Emissão: {new Date(viewingVale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                        </div>

                        {/* Main Statement */}
                        <p className="text-xs leading-relaxed text-justify">
                          Eu, <strong>{viewingVale.colaboradorName}</strong>, inscrito sob o papel de <strong>{viewingVale.colaboradorRole}</strong>, autorizo expressamente a empresa <strong>PAU BRASIL DISTRIBUIDORA LTDA</strong> a descontar em minha folha de pagamento, de acordo com o Artigo 462, § 1º da CLT, a importância líquida de <strong>R$ {(viewingVale.valor || 0).toFixed(2)}</strong> ({Number(viewingVale.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}), referente aos desvios físicos ou avarias constatados na conferência de retorno logístico do <strong>{viewingVale.routeMap !== 'AVULSO' ? `Mapa de Carga nº ${viewingVale.routeMap}` : 'Mapa de Carga Avulso'}</strong>.
                        </p>

                        {/* Informações sobre a Rota e Equipe (Colaboradores Envolvidos) */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-6 text-xs">
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Informações da Rota / Transporte</span>
                            <div className="mt-1 space-y-1">
                              <div><strong>Mapa de Carga:</strong> <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded font-bold">{viewingVale.routeMap}</span></div>
                              <div><strong>Placa do Veículo:</strong> <span className="font-mono bg-white border border-slate-200 px-1.5 py-0.2 rounded font-bold uppercase">{vehiclePlate}</span></div>
                              <div><strong>Data da Viagem:</strong> <span className="text-slate-700">{arrivalDateFormatted}</span></div>
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase block">Colaboradores Envolvidos na Viagem & Aferição</span>
                            <div className="mt-1 space-y-1">
                              <div><strong>Motorista Responsável:</strong> <span className="font-semibold text-slate-900">{viewingVale.colaboradorName}</span></div>
                              <div><strong>Ajudante de Rota:</strong> <span className="text-slate-700">{helperName}</span></div>
                              <div><strong>Conferente de Pátio (Físico):</strong> <span className="text-slate-700">{conferenteName}</span></div>
                              <div><strong>Fiscal de Logística (Aferidor):</strong> <span className="font-semibold text-slate-900">{currentUser.name}</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Detail Table of Involved Assets & Shortages */}
                        <div className="space-y-2">
                          <span className="text-slate-900 font-bold text-[10px] uppercase tracking-wider block">Ativos com Divergência de Inventário (Sobras/Faltas de P.A e A.G):</span>
                          
                          {detailedShortages.length > 0 ? (
                            <div className="border border-slate-250 rounded-lg overflow-x-auto text-xxs font-sans shadow-xs">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[9px] border-b border-slate-250">
                                  <tr>
                                    <th className="p-2">Cód.</th>
                                    <th className="p-2">Descrição do Ativo / Produto</th>
                                    <th className="p-2 text-center">Faturado</th>
                                    <th className="p-2 text-center">Conferido</th>
                                    <th className="p-2 text-center text-red-600">Diferença (Falta)</th>
                                    <th className="p-2 text-right">Custo Unit.</th>
                                    <th className="p-2 text-right">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-800">
                                  {detailedShortages.map(item => (
                                    <tr key={item.code} className="hover:bg-slate-50">
                                      <td className="p-2 font-mono font-bold text-slate-600">{item.code}</td>
                                      <td className="p-2 font-medium">{item.name}</td>
                                      <td className="p-2 text-center font-mono">{item.expected} SKU</td>
                                      <td className="p-2 text-center font-mono">{item.found} SKU</td>
                                      <td className="p-2 text-center font-mono text-red-600 font-bold">-{item.diff} SKU</td>
                                      <td className="p-2 text-right font-mono">R$ {(item.cost || 0).toFixed(2)}</td>
                                      <td className="p-2 text-right font-mono font-bold text-slate-900">R$ {(item.totalCost || 0).toFixed(2)}</td>
                                    </tr>
                                  ))}
                                  <tr className="bg-slate-50 font-bold text-slate-900 text-[10px] border-t border-slate-250">
                                    <td colSpan={4} className="p-2.5 text-right uppercase">Total Descontado:</td>
                                    <td className="p-2.5 text-center font-mono text-red-600">-{detailedShortages.reduce((sum, d) => sum + d.diff, 0)} SKU</td>
                                    <td colSpan={2} className="p-2.5 text-right font-mono font-black text-red-600 text-xs">R$ {(viewingVale.valor || 0).toFixed(2)}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="border border-slate-300 rounded-lg p-3 text-[11px] text-slate-700 space-y-1.5 bg-slate-50 leading-relaxed">
                              <div><strong>Detalhamento dos Itens / Avarias:</strong></div>
                              <div className="font-semibold text-slate-900 font-mono bg-white border border-slate-200 px-2 py-1.5 rounded">{viewingVale.descricao}</div>
                              <div className="text-[10px] text-slate-500 font-mono">Valor Total de Autorização de Desconto de R$ {(viewingVale.valor || 0).toFixed(2)}</div>
                            </div>
                          )}
                        </div>

                        {viewingVale.observacao && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] italic text-slate-600 font-sans">
                            <strong>Observações e Notas do Emissor:</strong> {viewingVale.observacao}
                          </div>
                        )}

                        <p className="text-[9px] text-slate-400 leading-relaxed text-justify font-sans">
                          O desconto acima autorizado está respaldado pelas normas regulamentares internas de integridade patrimonial da Pau Brasil Distribuidora e fundamentado legalmente por ato de desvio de inventário ou avaria em trânsito de vasilhames ou mercadorias.
                        </p>

                        {/* Signatures */}
                        <div className="grid grid-cols-3 gap-6 pt-10 text-center text-[10px]">
                          <div className="space-y-1">
                            <div className="border-b border-slate-300 mx-auto w-11/12 pt-4" />
                            <span className="font-bold text-slate-900 block truncate">{viewingVale.colaboradorName}</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-mono">Assinatura do Responsável</span>
                          </div>
                          <div className="space-y-1">
                            <div className="border-b border-slate-300 mx-auto w-11/12 pt-4" />
                            <span className="font-bold text-slate-900 block truncate">{currentUser.name}</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-mono font-bold">Aferidor - Fiscal de Logística</span>
                          </div>
                          <div className="space-y-1">
                            <div className="border-b border-slate-300 mx-auto w-11/12 pt-4" />
                            <span className="font-bold text-slate-900 block truncate">Elisson Minervino</span>
                            <span className="text-[8px] text-slate-400 block uppercase font-mono font-bold">Gestor de Logística</span>
                          </div>
                        </div>
                      </div>

                      {/* Print buttons */}
                      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.print();
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer transition shadow-xs font-bold"
                        >
                          Imprimir / Salvar PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingVale(null)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      )}

          {/* Section: Local de Evidências & Salvar Produção Diária */}
          {activeTab === 'pasta_evidencias' && (
            <div className="space-y-6 animate-fade-in" id="tab_pasta_evidencias">
              
              {/* Branded Header */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 text-slate-900">
                  <Folder className="h-6 w-6 text-amber-500" />
                  <h2 className="font-sans font-bold text-lg uppercase">Central de Arquivamento & Produção Diária</h2>
                </div>
                <p className="text-xs text-slate-500">
                  Gestão de arquivos físicos de auditoria, exportação de relatórios diários em PDF consolidando dados e evidências fotográficas, e orientações de diretório de rede.
                </p>
              </div>

              {/* Directory display container */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                <h3 className="font-sans font-bold text-sm text-slate-900 border-b border-slate-100 pb-2 flex items-center space-x-2">
                  <Folder className="h-4 w-4 text-slate-400" />
                  <span>Diretório da Rede Local para Arquivamento</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Todos os arquivos de produtividade gerados abaixo contendo os relatórios operacionais e as fotos de evidência devem ser copiados e armazenados nesta pasta do servidor da distribuidora (P:):
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="font-mono text-xs text-slate-800 break-all select-all font-bold">
                    P:\Guarabira\2026\04.LOGISTICA\ARMAZÉM\3.0 ACURACIDADE\3.1 PACOTE PREJUIZO\FALTAS EM ROTA\RETORNO DE ROTA
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("P:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZÉM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA");
                      alert("Caminho copiado para a área de transferência!");
                    }}
                    className="shrink-0 flex items-center space-x-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xxs rounded-lg transition cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copiar Caminho</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* PDF Production Generation (Left) */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-5 shadow-xs">
                  <div className="space-y-1">
                    <h3 className="font-sans font-bold text-sm text-slate-900 flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span>Salvar Produção Diária (Gerar PDFs Individuais por Mapa)</span>
                    </h3>
                    <p className="text-xxs text-slate-400">
                      Escolha uma data e clique para gerar PDFs com relatórios de conciliação, logs de histórico e fotos de evidências de todos os mapas finalizados no dia selecionado.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-slate-50 border border-slate-150 rounded-xl">
                    <div className="space-y-1 w-full sm:w-auto">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Data da Produção</label>
                      <input
                        type="date"
                        value={dailyProductionDate}
                        onChange={(e) => setDailyProductionDate(e.target.value)}
                        className="w-full sm:w-48 text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition font-mono font-bold"
                      />
                    </div>
                    
                    <button
                      type="button"
                      disabled={exportingDailyProduction}
                      onClick={() => handleDownloadDailyProduction(dailyProductionDate)}
                      className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-3 px-6 rounded-lg transition uppercase flex items-center justify-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      {exportingDailyProduction ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Gerando PDFs...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          <span>Salvar Produção Diária</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2 text-xxs text-slate-700 leading-relaxed">
                    <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                      <span>COMO UTILIZAR A EXPORTAÇÃO DIÁRIA:</span>
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 font-medium">
                      <li>Selecione a data correspondente ao fechamento das rotas (ex: <strong className="font-mono">2026-07-05</strong>).</li>
                      <li>Clique em <strong className="text-amber-950">"Salvar Produção Diária"</strong> para rodar o script local de agregação de evidências.</li>
                      <li>A plataforma localizará todas as auditorias finalizadas naquela data, recuperará do IndexedDB/API as fotos, e gerará arquivos no padrão <strong className="font-mono">11111 - PLACA - DATA.pdf</strong>.</li>
                      <li>Copie os arquivos prontos e transfira para o diretório de rede mapeado acima.</li>
                    </ol>
                  </div>
                </div>

                {/* Firebase Storage Alert (Right Panel) */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs h-fit">
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="h-5 w-5 text-red-500" />
                    <h3 className="font-sans font-bold text-sm text-slate-900 uppercase">Alertas & Manutenção</h3>
                  </div>
                  
                  {/* Simulated Alert based on showMemoryWarning state */}
                  {showMemoryWarning && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 space-y-3 animate-pulse">
                      <div className="flex items-start space-x-2.5">
                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <span className="block text-xxs font-black text-red-800 uppercase font-sans tracking-wide">
                            AVISO DE CAPACIDADE DO BANCO
                          </span>
                          <span className="block text-xxs font-black text-slate-900 leading-normal uppercase text-red-700">
                            SALVAR PRODUTIVIDADE
                          </span>
                        </div>
                      </div>
                      <p className="text-xxs text-slate-700 leading-relaxed font-medium">
                        Atenção <strong>Auxiliar de Armazém / Logística</strong>: O armazenamento de evidências fotográficas no Firebase/IndexedDB atingiu <strong className="text-red-700 font-bold">94% da capacidade</strong>. Existe risco iminente de perda de dados.
                      </p>
                      <div className="pt-1 flex space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadDailyProduction(dailyProductionDate)}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] py-1.5 rounded-lg text-center uppercase transition cursor-pointer"
                        >
                          Salvar Agora
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowMemoryWarning(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] py-1.5 px-3 rounded-lg transition cursor-pointer"
                        >
                          Dispensar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xxs text-slate-600 leading-normal">
                    <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Status do Servidor:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xxs pt-1">
                      <div>Imagens Salvas:</div>
                      <div className="font-mono font-bold text-right text-slate-900">
                        {audits.reduce((sum, a) => sum + (a.refugos?.length || 0), 12)} fotos
                      </div>
                      <div>Uso de Disco:</div>
                      <div className={`font-mono font-bold text-right ${showMemoryWarning ? 'text-red-650' : 'text-slate-800'}`}>
                        {showMemoryWarning ? '94.2% (Crítico)' : '35.4% (Normal)'}
                      </div>
                    </div>
                    {!showMemoryWarning && (
                      <button
                        type="button"
                        onClick={() => setShowMemoryWarning(true)}
                        className="mt-2 w-full border border-slate-300 hover:border-slate-400 text-slate-600 font-bold py-1 px-2 rounded text-[9px] uppercase transition cursor-pointer text-center"
                      >
                        Simular Alerta de Armazenamento
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Pasta Compartilhada Explorer */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-xs mt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="h-5 w-5 text-amber-600" />
                      <h3 className="font-sans font-bold text-sm text-slate-900 uppercase">
                        Pasta Compartilhada de Rede (Mapas Arquivados)
                      </h3>
                    </div>
                    <p className="text-xxs text-slate-500">
                      Diretório físico mapeado do servidor central para arquivamento dos relatórios PDF de conciliação.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchSharedPdfs}
                    disabled={loadingSharedPdfs}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xxs uppercase rounded-lg flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${loadingSharedPdfs ? 'animate-spin' : ''}`} />
                    <span>Atualizar Lista</span>
                  </button>
                </div>

                {loadingSharedPdfs ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-medium">
                    Carregando arquivos da rede...
                  </div>
                ) : sharedPdfs.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 font-medium">
                    Nenhum arquivo PDF de conciliação foi encontrado na pasta de rede ainda.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 text-xxs uppercase font-bold border-b border-slate-200">
                          <th className="py-2 px-3">Nome do Arquivo</th>
                          <th className="py-2 px-3">Diretório (Ano/Mês)</th>
                          <th className="py-2 px-3">Tamanho</th>
                          <th className="py-2 px-3">Gravado Em</th>
                          <th className="py-2 px-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-600">
                        {sharedPdfs.map((file, idx) => {
                          const sizeKb = ((file.size || 0) / 1024).toFixed(1);
                          const mtimeStr = new Date(file.mtime).toLocaleString('pt-BR');
                          const dirName = file.path.substring(0, file.path.lastIndexOf('/')) || 'Raiz';
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2 px-3 font-bold text-slate-800 flex items-center space-x-1.5">
                                <FileText className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                <span>{file.name}</span>
                              </td>
                              <td className="py-2 px-3">{dirName}</td>
                              <td className="py-2 px-3">{sizeKb} KB</td>
                              <td className="py-2 px-3">{mtimeStr}</td>
                              <td className="py-2 px-3 text-right">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-md text-[10px] uppercase transition"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Ver / Baixar</span>
                                </a>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      ) : (
        /* WORKSPACE MODE: ACTIVE RECONCILIATION FOR SELECTED SESSION */
        <div className="space-y-6" id="workspace_fiscal_panel">
          
          {(() => {
            const currentInAudits = audits.find(a => a.id === activeSession.id);
            const hasConflict = currentInAudits &&
                                currentInAudits.updatedAt &&
                                loadedSessionTime &&
                                currentInAudits.updatedAt !== loadedSessionTime &&
                                currentInAudits.lastUpdatedBy !== currentUser.name;

            if (hasConflict) {
              return (
                <div className="bg-amber-500/15 border-l-4 border-amber-500 rounded-xl p-4 text-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md animate-fade-in animate-pulse-slow" id="concurrency_conflict_banner_fiscal">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0 animate-bounce" />
                    <div>
                      <strong className="text-amber-900 block font-bold text-xs uppercase tracking-wide">⚠️ Atenção: Conflito de Edição de Rede</strong>
                      <p className="text-xxs text-slate-700 mt-0.5 font-sans leading-relaxed">
                        Este mapa de rota foi atualizado por <strong>{currentInAudits.lastUpdatedBy || 'outro usuário'}</strong> às <strong>{new Date(currentInAudits.updatedAt!).toLocaleTimeString()}</strong>. Para evitar que suas alterações locais de conciliação apaguem as dele, clique em "Sincronizar com a Rede" para carregar os dados mais recentes.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      // Construct a merged version with currentInAudits, preserving local values if possible
                      const mergedItems = currentInAudits.items.map(item => {
                        const localItem = activeSession.items.find(i => i.productCode === item.productCode);
                        return {
                          ...item,
                          fiscalQty: localItem && localItem.fiscalQty !== undefined ? localItem.fiscalQty : item.fiscalQty
                        };
                      });

                      const mergedAssets = currentInAudits.assets.map(asset => {
                        const localAsset = activeSession.assets.find(a => a.assetId === asset.assetId);
                        return {
                          ...asset,
                          fiscalQty: localAsset && localAsset.fiscalQty !== undefined ? localAsset.fiscalQty : asset.fiscalQty,
                          comodatoQty: localAsset && localAsset.comodatoQty !== undefined ? localAsset.comodatoQty : asset.comodatoQty,
                          recolhaQty: localAsset && localAsset.recolhaQty !== undefined ? localAsset.recolhaQty : asset.recolhaQty
                        };
                      });

                      const mergedSession: AuditSession = {
                        ...currentInAudits,
                        items: mergedItems,
                        assets: mergedAssets
                      };

                      setActiveSession(mergedSession);
                      setLoadedSessionTime(currentInAudits.updatedAt);
                    }}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] uppercase rounded-lg transition shrink-0 shadow-sm"
                  >
                    Sincronizar com a Rede
                  </button>
                </div>
              );
            }
            return null;
          })()}

          {/* Active Session Info */}
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center shadow-lg gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-500 font-mono tracking-widest uppercase font-bold">
                  ÁREA DE CONCILIAÇÃO FISCAL ATIVA
                </span>
                {activeSession.isPernoite && (
                  <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm animate-pulse">
                    <Moon className="h-3 w-3" />
                    <span>VEÍCULO EM PERNOITE</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-sans font-bold tracking-tight">
                  {activeSession.routeMap}
                </h2>
                <span className="bg-slate-800 text-slate-300 font-mono text-xs px-2.5 py-0.5 rounded border border-slate-700">
                  {activeSession.plate} {activeSession.exchangePlate ? `🔄 ${activeSession.exchangePlate}` : ''}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4">
                <span><strong>Motorista:</strong> {getDriverName(activeSession.driverId)}</span>
                <span>•</span>
                <span><strong>Ajudante:</strong> {getHelperName(activeSession.helperId)}</span>
                <span>•</span>
                <span><strong>KM Chegada:</strong> {activeSession.arrivalKm}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleActiveSessionPernoite}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition flex items-center space-x-1.5 cursor-pointer shadow-sm ${
                  activeSession.isPernoite
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Classificar se este veículo irá pernoitar no pátio"
              >
                <Moon className="h-4 w-4 text-indigo-300" />
                <span>{activeSession.isPernoite ? '🌙 Classificado Pernoite (Ativo)' : 'Classificar como Pernoite'}</span>
              </button>

              <div className="bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-750 text-right">
                <span className="text-xxs text-slate-400 block uppercase">Tempo de Auditoria Física</span>
                <span className="font-mono text-sm font-bold text-amber-400">
                  {getDurationText(activeSession.startTime, activeSession.endTime)}
                </span>
              </div>
            </div>
          </div>

          {/* WARNING BANNER ABOUT MONITORAMENTO DISCREPANCY OBSERVATION */}
          {(() => {
            const observations: { map: string; obs: string }[] = [];
            if (activeSession.unifiedMaps && activeSession.unifiedMaps.length > 0) {
              activeSession.unifiedMaps.forEach(mapCode => {
                const r = importedRoutes.find(x => x.routeMap.toUpperCase() === mapCode.toUpperCase());
                if (r && r.discrepancyObservation) {
                  observations.push({ map: r.routeMap, obs: r.discrepancyObservation });
                }
              });
            } else {
              const r = importedRoutes.find(x => x.routeMap.toUpperCase() === activeSession.routeMap.toUpperCase());
              if (r && r.discrepancyObservation) {
                observations.push({ map: r.routeMap, obs: r.discrepancyObservation });
              }
            }

            if (observations.length > 0) {
              return (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-5 flex items-start space-x-3 text-red-950 animate-pulse shadow-md w-full">
                  <AlertTriangle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 w-full">
                    <h4 className="font-sans font-black text-xs uppercase tracking-wide text-red-800 flex items-center space-x-1.5">
                      <span>⚠️ ALERTA DO MONITORAMENTO (GUIA DE OBSERVAÇÃO)</span>
                    </h4>
                    <p className="text-xs font-semibold">
                      O setor de Monitoramento mapeou e reportou divergências para as rotas unificadas:
                    </p>
                    <div className="space-y-1.5 mt-1.5">
                      {observations.map((item, idx) => {
                        const r = importedRoutes.find(x => x.routeMap.toUpperCase() === item.map.toUpperCase());
                        const routeObs = r?.routeObservations;
                        return (
                          <div key={idx} className="bg-white/95 p-3 rounded-xl border border-red-200 text-slate-800 space-y-2">
                            <div className="font-sans font-bold text-xs text-red-900 border-b border-red-100 pb-1 flex justify-between">
                              <span>Mapa {item.map}</span>
                            </div>
                            {routeObs && routeObs.length > 0 ? (
                              <div className="space-y-1.5">
                                {routeObs.map((o) => {
                                  const t = o.type || 'todos';
                                  return (
                                    <div key={o.id} className="bg-slate-50 p-2 rounded-lg border border-slate-150 flex items-start space-x-2 text-xxs">
                                      <div className="shrink-0 mt-0.5">
                                        {t === 'sobra' && <ArrowUpCircle className="h-4 w-4 text-emerald-600" />}
                                        {t === 'falta' && <ArrowDownCircle className="h-4 w-4 text-rose-600" />}
                                        {t === 'todos' && <AlertCircle className="h-4 w-4 text-slate-500" />}
                                      </div>
                                      <div className="space-y-0.5 flex-1">
                                        <div className="flex items-center space-x-1.5 font-sans font-extrabold text-[9px] text-slate-600 uppercase">
                                          <span>{o.author}</span>
                                          <span>•</span>
                                          <span>{o.timestamp}</span>
                                          {t === 'sobra' && <span className="text-[8px] px-1 bg-emerald-100 text-emerald-800 rounded font-bold">SOBRA</span>}
                                          {t === 'falta' && <span className="text-[8px] px-1 bg-rose-100 text-rose-800 rounded font-bold">FALTA</span>}
                                          {t === 'todos' && <span className="text-[8px] px-1 bg-slate-150 text-slate-700 rounded font-bold">GERAL</span>}
                                        </div>
                                        <p className="text-xxs font-medium font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">{o.text}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="font-mono text-xs font-bold text-red-900 leading-normal pl-1">
                                "{item.obs}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-red-700 font-extrabold uppercase mt-1">
                      ATENÇÃO AUXILIAR DE LOGÍSTICA: Verifique se essas divergências de saldo foram tratadas antes de concluir e dar baixa!
                    </p>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full min-w-0">
            
            {/* Reconciliation Forms: Finished Products (PA) & Active Assets (AG) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
              
              {/* Finished Products Reconciliation */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-emerald-500 text-white text-xxs font-bold uppercase px-2 py-0.5 rounded-full">PA</span>
                  <span>Produtos Acabados - Conferência Cega vs Saldo Fiscal</span>
                </h3>

                {/* Formulário de Inserção Manual de Item de Saldo Fiscal */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 space-y-3" id="manual_rec_item_form">
                  <span className="text-xxs font-extrabold text-[#0f35a9] uppercase tracking-wider block">Inserir Item Manualmente na Conciliação</span>
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-8 relative">
                      <label className="block text-xxs font-semibold text-slate-600 mb-1">Pesquisar por Código ou Descrição</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Digite o código ou nome do produto..."
                          value={recProductSearch}
                          onChange={(e) => {
                            setRecProductSearch(e.target.value);
                            setRecSelectedProductCode('');
                          }}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 pl-8 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-950"
                        />
                        <Search className="absolute left-2.5 top-3.5 h-3.5 w-3.5 text-slate-400" />
                      </div>

                      {/* Autocomplete dropdown */}
                      {recProductSearch && !recSelectedProductCode && (
                        <div className="absolute z-20 left-0 right-0 bg-white border border-slate-200 rounded-b-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                          {recFilteredProducts.length === 0 ? (
                            <div className="p-3 text-xxs text-slate-400 text-center">Nenhum produto encontrado</div>
                          ) : (
                            recFilteredProducts.map(p => (
                              <button
                                type="button"
                                key={p.code}
                                onClick={() => handleSelectRecProduct(p)}
                                className="w-full text-left px-3 py-2 text-xxs hover:bg-slate-50 border-b border-slate-100 flex justify-between items-center cursor-pointer text-slate-800 font-medium"
                              >
                                <span>{p.description}</span>
                                <span className="font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">{p.code}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xxs font-semibold text-slate-600 mb-1">Saldo Fiscal</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={recProductFiscalQtyToAdd}
                        onChange={(e) => setRecProductFiscalQtyToAdd(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 text-center font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-950"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleManualAddProductToReconciliation}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center space-x-1 text-xs cursor-pointer shadow-sm transition"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {(() => {
                  const visibleItems = activeSession.items.filter(item => {
                    const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                    const hasPhysicalEntry = (physical > 0) || (item.rePhysicalQty !== undefined);
                    const hasFiscalEntry = (item.fiscalQty ?? 0) > 0;
                    return hasPhysicalEntry || hasFiscalEntry;
                  });

                  if (visibleItems.length === 0) {
                    return (
                      <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-xs">
                        Nenhum produto acabado lançado pelo conferente ou cadastrado no fiscal.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {[...visibleItems].sort((a, b) => {
                        const numA = Number(a.productCode);
                        const numB = Number(b.productCode);
                        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                        return a.productCode.localeCompare(b.productCode);
                      }).map((item) => {
                      const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                      const fiscal = item.fiscalQty ?? 0;
                      const diff = physical - fiscal;

                      let diffColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
                      let diffLabel = 'OK';
                      if (diff > 0) {
                        diffColor = 'text-amber-800 bg-amber-50 border-amber-200';
                        diffLabel = `+${diff} (Sobra)`;
                      } else if (diff < 0) {
                        diffColor = 'text-red-800 bg-red-50 border-red-200';
                        diffLabel = `${diff} (Falta)`;
                      }

                      const prodInfo = products.find(p => p.code === item.productCode);
                      const costValue = prodInfo ? prodInfo.cost : item.cost;
                      const hectoValue = prodInfo ? prodInfo.hectoFactor : 0.01;

                      return (
                        <div key={item.productCode} className="p-4 rounded-lg border border-slate-150 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-4 hover:bg-slate-50 transition">
                          <div className="space-y-1 sm:col-span-6">
                            <div>
                              <span className="font-mono text-xxs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-bold mr-1.5">{item.productCode}</span>
                              <span className="font-sans font-semibold text-slate-800 text-xs">{item.productDescription}</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[10px] text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                Custo: R$ {costValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              <span className="text-[10px] text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                Hecto: {hectoValue.toLocaleString('pt-BR', { minimumFractionDigits: 4 })} HL
                              </span>
                              {diff !== 0 && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-150 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                  Custo Desvio: R$ {Math.abs(diff * costValue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                              {diff !== 0 && (
                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-150 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                  Vol. Desvio: {(Math.abs(diff) * hectoValue).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} HL
                                </span>
                              )}
                            </div>

                            {item.rePhysicalQty !== undefined && (
                              <div className="text-xxs text-slate-400 pt-1">
                                Contagem original: <span className="line-through">{item.physicalQty}</span> • Recontado: <span className="font-semibold text-purple-600">{item.rePhysicalQty}</span>
                              </div>
                            )}

                            {/* Evidence Photos for this product */}
                            {activeSessionPhotos.filter(p => p.itemCode === item.productCode || p.itemCode === item.productDescription).length > 0 && (
                              <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider font-mono">Fotos do Conferente:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {activeSessionPhotos.filter(p => p.itemCode === item.productCode || p.itemCode === item.productDescription).map(p => (
                                    <div 
                                      key={p.id} 
                                      className="relative group bg-slate-100 rounded border border-slate-200 overflow-hidden w-12 h-12 flex-shrink-0 cursor-pointer" 
                                      onClick={() => setSelectedPhotoForPreview(p)}
                                    >
                                      <img src={p.photoUrl} alt={p.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[7px] text-white">Ver</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-2 sm:col-span-6 items-center text-center">
                            {/* Physical Display */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-slate-400 block uppercase mb-1">FÍSICO</span>
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded block w-full max-w-[80px] text-center">
                                {physical}
                              </span>
                            </div>

                            {/* Fiscal Input */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-slate-500 block uppercase mb-1">SALDO FISCAL *</span>
                              <input
                                type="number"
                                min="0"
                                value={item.fiscalQty ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                  handleUpdateFiscalQty(item.productCode, val);
                                }}
                                className="w-16 text-xs text-center font-bold bg-white border border-slate-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500 mx-auto block"
                              />
                            </div>

                            {/* Discrepancy Display */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-slate-400 block uppercase mb-1">DIVERG.</span>
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border block leading-normal w-full max-w-[100px] text-center ${diffColor}`}>
                                {diffLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              </div>

              {/* Active Circulation Assets Reconciliation */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-amber-500 text-slate-950 text-xxs font-bold uppercase px-2 py-0.5 rounded-full">AG</span>
                  <span>Ativos de Giro (Garrafeiras, Garrafas, Paletes)</span>
                </h3>

                <div className="space-y-4">
                  {(() => {
                    const sortedAssets = [...activeSession.assets].sort((a, b) => {
                      const codeA = getAssetCode(a.assetId, a.assetName);
                      const codeB = getAssetCode(b.assetId, b.assetName);
                      const numA = Number(codeA);
                      const numB = Number(codeB);
                      const isNumA = !isNaN(numA);
                      const isNumB = !isNaN(numB);
                      if (isNumA && isNumB) return numA - numB;
                      if (isNumA) return -1;
                      if (isNumB) return 1;
                      return codeA.localeCompare(codeB);
                    });
                    return sortedAssets.map((asset) => {
                      const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                      const fiscal = asset.fiscalQty ?? 0;
                      const comodato = asset.comodatoQty ?? 0;
                      const recolha = asset.recolhaQty ?? 0;
                      const diff = (physical + comodato - recolha) - fiscal;

                      let diffColor = 'text-emerald-800 bg-emerald-50 border-emerald-200';
                      let diffLabel = 'OK';
                      if (diff > 0) {
                        diffColor = 'text-amber-800 bg-amber-50 border-amber-200';
                        diffLabel = `+${diff} (Sobra)`;
                      } else if (diff < 0) {
                        diffColor = 'text-red-800 bg-red-50 border-red-200';
                        diffLabel = `${diff} (Falta)`;
                      }

                      const mappedCode = getAssetCode(asset.assetId, asset.assetName);
                      const canonicalName = getAssetCanonicalName(mappedCode) || asset.assetName;

                      return (
                        <div key={asset.assetId} className="p-4 rounded-lg border border-slate-150 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-12 sm:items-center gap-4 hover:bg-slate-50 transition">
                          <div className="space-y-1 sm:col-span-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {mappedCode && (
                                <span className="font-mono text-xxs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-bold">{mappedCode}</span>
                              )}
                              <span className="font-sans font-semibold text-slate-800 text-xs">{canonicalName}</span>
                            </div>

                            <div className="flex flex-wrap gap-1.5 pt-1">
                              <span className="text-[10px] text-slate-500 bg-slate-100/80 border border-slate-200/60 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                Custo: R$ {asset.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {diff !== 0 && (
                                <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-150 px-1.5 py-0.5 rounded-md font-mono flex items-center">
                                  Custo Desvio: R$ {Math.abs(diff * asset.cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>

                            {asset.rePhysicalQty !== undefined && (
                              <div className="text-xxs text-slate-400 pt-1">
                                Contagem original: <span className="line-through">{asset.physicalQty}</span> • Recontado: <span className="font-semibold text-purple-600">{asset.rePhysicalQty}</span>
                              </div>
                            )}

                            {/* Evidence Photos for this asset */}
                            {activeSessionPhotos.filter(p => p.itemCode === asset.assetId || p.itemCode === asset.assetName).length > 0 && (
                              <div className="mt-2 space-y-1 bg-white p-2 rounded-lg border border-slate-200">
                                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider font-mono">Fotos do Conferente:</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {activeSessionPhotos.filter(p => p.itemCode === asset.assetId || p.itemCode === asset.assetName).map(p => (
                                    <div 
                                      key={p.id} 
                                      className="relative group bg-slate-100 rounded border border-slate-200 overflow-hidden w-12 h-12 flex-shrink-0 cursor-pointer" 
                                      onClick={() => setSelectedPhotoForPreview(p)}
                                    >
                                      <img src={p.photoUrl} alt={p.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[7px] text-white">Ver</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-2 sm:col-span-8 items-center text-center">
                            {/* Physical Display */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-slate-400 block uppercase mb-1">FÍSICO</span>
                              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-200 px-2.5 py-1 rounded block w-full max-w-[80px] text-center">
                                {physical}
                              </span>
                            </div>

                            {/* Fiscal Input */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-slate-500 block uppercase mb-1">SALDO FISCAL</span>
                              <input
                                type="number"
                                min="0"
                                value={asset.fiscalQty ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                  handleUpdateAssetFiscalQty(asset.assetId, val);
                                }}
                                className="w-16 text-xs text-center font-bold bg-white border border-slate-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500 mx-auto block"
                              />
                            </div>

                            {/* Comodato Input */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-amber-600 block uppercase mb-1">COMODATO</span>
                              <input
                                type="number"
                                min="0"
                                value={asset.comodatoQty ?? ''}
                                placeholder="0"
                                onChange={(e) => handleUpdateAssetComodatoQty(asset.assetId, Number(e.target.value) || 0)}
                                className="w-16 text-xs text-center font-bold bg-white border border-amber-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500 mx-auto block"
                              />
                            </div>

                            {/* Recolha Input */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-blue-600 block uppercase mb-1">RECOLHA</span>
                              <input
                                type="number"
                                min="0"
                                value={asset.recolhaQty ?? ''}
                                placeholder="0"
                                onChange={(e) => handleUpdateAssetRecolhaQty(asset.assetId, Number(e.target.value) || 0)}
                                className="w-16 text-xs text-center font-bold bg-white border border-blue-300 rounded p-1 focus:outline-none focus:ring-1 focus:ring-amber-500 mx-auto block"
                              />
                            </div>

                            {/* Discrepancy Display */}
                            <div className="flex flex-col items-center">
                              <span className="text-xxs font-bold text-slate-400 block uppercase mb-1">DIVERG.</span>
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border block leading-normal w-full max-w-[110px] text-center ${diffColor}`}>
                                {diffLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                  });
                })()}
                </div>
              </div>

              {/* Refugos dos Ativos de Giro Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-red-500 text-white text-xxs font-bold uppercase px-2 py-0.5 rounded-full">REFUGO</span>
                  <span>Refugos dos Ativos de Giro (Avariados em Rota)</span>
                </h3>

                {!activeSession.refugos || activeSession.refugos.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-xs">
                    Nenhum item de refugo lançado pelo conferente.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      O conferente registrou os seguintes refugos/avarias. Faça a aferição dos itens por imagem utilizando a foto em tempo real abaixo:
                    </p>
                    <div className="border border-slate-100 rounded-lg overflow-x-auto shadow-xs">
                      <table className="min-w-full divide-y divide-slate-100 text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider">Ativo</th>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider text-center">Quantidade</th>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider">Motivo da Avaria</th>
                            <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider text-center">Foto (Tempo Real)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-100">
                          {activeSession.refugos.map((refugo) => (
                            <tr key={refugo.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5">
                                <span className="font-sans font-semibold text-slate-800 text-xs block">{refugo.assetName}</span>
                                <span className="font-mono text-[10px] text-slate-400">ID: {refugo.assetId}</span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-mono text-xs font-bold text-red-600 bg-red-50/20">
                                {refugo.qty}
                              </td>
                              <td className="px-4 py-2.5 text-xs font-medium text-slate-700">
                                <span className="inline-block bg-orange-50 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded border border-orange-200">
                                  {refugo.reason}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center">
                                {(() => {
                                  const displayPhotoUrl = refugo.photoId
                                    ? activeSessionPhotos.find(p => p.id === refugo.photoId)?.photoUrl
                                    : (refugo.photoUrl || activeSessionPhotos.find(p => p.itemCode === refugo.id || p.itemCode === refugo.assetId)?.photoUrl);
                                  return displayPhotoUrl ? (
                                    <div 
                                      className="relative inline-block w-12 h-12 rounded border border-slate-200 overflow-hidden bg-slate-100 shadow-3xs cursor-pointer group"
                                      onClick={() => setSelectedPhotoForPreview({
                                        id: refugo.id,
                                        auditId: activeSession.id,
                                        itemCode: refugo.assetId,
                                        itemName: `Refugo: ${refugo.assetName} (${refugo.reason})`,
                                        photoUrl: displayPhotoUrl,
                                        conferenteId: activeSession.conferenteId,
                                        driverId: activeSession.driverId,
                                        driverName: '',
                                        type: 'refugo'
                                      })}
                                    >
                                      <img src={displayPhotoUrl} alt="Refugo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white">
                                        Ver
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 italic">Sem foto</span>
                                  );
                                })()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Trocas e Reposições de PA Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-sans font-bold text-base text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center space-x-2">
                  <span className="bg-purple-600 text-white text-xxs font-bold uppercase px-2 py-0.5 rounded-full">TROCA</span>
                  <span>Trocas de PA</span>
                </h3>

                {!activeSession.exchanges || activeSession.exchanges.filter(e => e.type === 'TROCA').length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg text-slate-400 text-xs">
                    Nenhuma troca registrada para esta rota.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-slate-500">
                      Itens de troca (avariados que retornaram na rota) registrados pelo conferente:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 border border-slate-100 rounded-lg overflow-x-auto shadow-xs bg-white">
                        <table className="min-w-full divide-y divide-slate-100 text-left">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider">PA Produto</th>
                              <th className="px-4 py-2 font-sans font-bold text-xxs text-slate-500 uppercase tracking-wider text-center w-24">Qtd</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {activeSession.exchanges
                              .filter(e => e.type === 'TROCA')
                              .map((item) => {
                                return (
                                  <tr key={item.productCode} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2.5">
                                      <span className="font-mono text-[10px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded font-bold mr-2">{item.productCode}</span>
                                      <span className="font-sans font-semibold text-slate-800 text-xs">{item.productDescription}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-mono text-xs font-bold text-slate-700">
                                      {item.qty}
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>

                      <div className="border border-purple-100 rounded-xl bg-purple-50/20 p-4 space-y-2 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Evidência Fotográfica</span>
                          <h5 className="font-sans font-bold text-slate-800 text-xs mt-2">Trocas Reunidas</h5>
                          <p className="text-[10px] text-slate-500 mt-1">Foto única com todos os itens de troca agrupados juntos.</p>
                        </div>

                        {(() => {
                          // Try unified photo first, fallback to any troca_reposicao photo
                          const exPhoto = activeSessionPhotos.find(p => p.itemCode === 'TROCAS_REUNIDAS' && p.type === 'troca_reposicao') ||
                                          activeSessionPhotos.find(p => p.type === 'troca_reposicao');
                          return exPhoto ? (
                            <div className="mt-2 text-center">
                              <div 
                                className="relative inline-block w-full h-32 rounded-lg border border-purple-200 overflow-hidden bg-slate-100 shadow-sm cursor-pointer group mx-auto"
                                onClick={() => setSelectedPhotoForPreview(exPhoto)}
                                title="Clique para ampliar"
                              >
                                <img src={exPhoto.photoUrl} alt="Trocas Reunidas" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-[10px] text-white">
                                  <span>Visualizar Foto</span>
                                  <span className="text-[8px] opacity-75 mt-0.5">(Clique para ampliar)</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="border border-dashed border-purple-200 rounded-lg p-4 text-center text-slate-400 text-xs bg-white/50">
                              Sem foto de evidência
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT SIDEBAR: Actions & Impact Summary */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 min-w-0">
              
              {/* Financial Balance Summary */}
              <div className="bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 p-6">
                <h4 className="font-sans font-bold text-sm text-slate-200 border-b border-slate-800 pb-3 mb-4">
                  Resumo de Divergências
                </h4>

                {(() => {
                  const stats = getDiscrepancyTotals(activeSession);
                  const totalDiff = stats.missingCount + stats.surplusCount;
                  
                  return (
                    <div className="space-y-4">
                      {totalDiff === 0 ? (
                        <div className="bg-emerald-950/40 text-emerald-400 p-4 rounded-lg border border-emerald-800/50 text-center">
                          <ShieldCheck className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm font-semibold">Tudo em Perfeita Ordem!</p>
                          <p className="text-xxs text-slate-400 mt-1">Nenhuma divergência de saldo físico vs fiscal.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stats.missingCount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">Total Faltas (Perdas):</span>
                              <span className="text-red-400 font-bold font-mono">
                                {stats.missingCount} itens
                              </span>
                            </div>
                          )}

                          {stats.surplusCount > 0 && (
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-400">Total Sobras (Sobrantes):</span>
                              <span className="text-amber-400 font-bold font-mono">
                                {stats.surplusCount} itens
                              </span>
                            </div>
                          )}

                          <div className="border-t border-slate-800 pt-3 mt-1 space-y-1">
                            {stats.missingCost > 0 && (
                              <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400">Impacto (Prejuízo):</span>
                                <span className="text-red-400 font-mono">
                                  -R$ {stats.missingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}

                            {stats.surplusCost > 0 && (
                              <div className="flex justify-between items-center text-sm font-semibold">
                                <span className="text-slate-400">Sobrantes (Ajuste):</span>
                                <span className="text-amber-400 font-mono">
                                  +R$ {stats.surplusCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ALL EVIDENCE PHOTOS BLOCK */}
              <div className="bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
                  <h4 className="font-sans font-bold text-sm text-slate-200">
                    Todas as Provas do Mapa
                  </h4>
                  <span className="text-[10px] bg-[#0f35a9] text-sky-200 px-2 py-0.5 rounded-full font-mono font-bold font-sans">
                    {activeSessionPhotos.length} fotos
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1">
                  {activeSessionPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhotoForPreview(photo)}
                      className="relative group aspect-square bg-slate-800 border border-slate-700 rounded overflow-hidden cursor-pointer hover:border-amber-500 transition-all shadow-2xs"
                      title={`${photo.itemName || 'Sem descrição'}`}
                    >
                      <img src={photo.photoUrl} alt={photo.itemName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-sans text-center px-1">
                        Ver Prova
                      </div>
                    </div>
                  ))}
                  {activeSessionPhotos.length === 0 && (
                    <div className="col-span-4 text-center py-6 text-[10px] text-slate-500 italic">
                      Nenhuma foto vinculada a este mapa ainda.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Operations */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <h4 className="font-sans font-bold text-sm text-slate-800">
                  Operações e Observações
                </h4>

                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Parecer de Conciliação / Notas *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Descreva observações ou razões para divergências/reconferência..."
                    value={reconciliationNotes}
                    onChange={(e) => setReconciliationNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    disabled={isFinalizing}
                    onClick={handleFinalizeReconciliation}
                    className={`w-full text-white font-bold py-3 px-4 rounded-lg text-xs shadow-xs transition flex items-center justify-center space-x-2 ${
                      isFinalizing 
                        ? 'bg-slate-400 cursor-not-allowed' 
                        : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    {isFinalizing ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Processando Baixa & Gerando PDF...</span>
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4" />
                        <span>Concluir e Dar Baixa</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={isFinalizing}
                    onClick={handleRequestReconferencia}
                    className={`w-full text-red-700 font-bold py-2.5 px-4 rounded-lg text-xs border border-red-200 transition flex items-center justify-center space-x-2 ${
                      isFinalizing 
                        ? 'bg-slate-100/50 text-slate-400 border-slate-200 cursor-not-allowed' 
                        : 'bg-red-50 hover:bg-red-100 cursor-pointer'
                    }`}
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                    <span>Solicitar Reconferência Física</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Botão Flutuante da Calculadora de Garrafas */}
      <div className="fixed bottom-24 right-6 z-40 font-sans" id="bottle_calculator_fab_wrapper">
        <button
          type="button"
          id="btn_toggle_calculator"
          onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
          className={`flex items-center justify-center p-3.5 rounded-full shadow-lg border text-white transition-all hover:scale-105 active:scale-95 ${
            isCalculatorOpen
              ? 'bg-amber-600 border-amber-700 ring-2 ring-amber-500'
              : 'bg-indigo-600 hover:bg-indigo-700 border-indigo-700'
          }`}
          title="Calculadora de Garrafas"
        >
          <Calculator className="h-5 w-5" />
        </button>
      </div>

      {/* Janela Flutuante da Calculadora */}
      {isCalculatorOpen && (
        <div 
          id="bottle_calculator_window"
          className="fixed bottom-36 right-6 z-50 bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-80 p-5 text-white animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center space-x-2 text-amber-400">
              <Calculator className="h-5 w-5" />
              <span className="font-sans font-bold text-sm uppercase tracking-wider">Calculadora de Garrafas</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Digite a quantidade de garrafeiras de cada tipo para obter a multiplicação automática por garrafas (600ml x24, 1L x12, 300ml x23).
            </p>

            {/* Garrafeira 600ml */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Garrafeira 600ML (x24)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Qtd"
                  value={calc600}
                  onChange={(e) => setCalc600(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono font-bold"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">➔</span>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-extrabold w-28 text-center shrink-0">
                  {calc600 !== '' ? calc600 * 24 : 0} <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">gf</span>
                </div>
              </div>
            </div>

            {/* Garrafeira 1L */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Garrafeira 1 Litro (x12)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Qtd"
                  value={calc1L}
                  onChange={(e) => setCalc1L(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono font-bold"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">➔</span>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-extrabold w-28 text-center shrink-0">
                  {calc1L !== '' ? calc1L * 12 : 0} <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">gf</span>
                </div>
              </div>
            </div>

            {/* Garrafeira 300ml */}
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase block font-sans">Garrafeira 300ML (x23)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Qtd"
                  value={calc300}
                  onChange={(e) => setCalc300(e.target.value === '' ? '' : Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-full font-mono font-bold"
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">➔</span>
                <div className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-400 font-mono font-extrabold w-28 text-center shrink-0">
                  {calc300 !== '' ? calc300 * 23 : 0} <span className="text-[9px] text-slate-400 uppercase font-sans font-bold">gf</span>
                </div>
              </div>
            </div>

            {/* Apply & Reset Buttons */}
            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  setCalc600('');
                  setCalc1L('');
                  setCalc300('');
                }}
                className="w-1/2 bg-slate-800 hover:bg-slate-750 text-slate-300 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
              >
                Limpar
              </button>
              {activeSession ? (
                <button
                  type="button"
                  onClick={() => {
                    const updatedAssets = activeSession.assets.map(asset => {
                      const code = getAssetCode(asset.assetId, asset.assetName);
                      let updatedFiscal = asset.fiscalQty;

                      // Apply 600ml calculations
                      if (calc600 !== '') {
                        if (code === '899599') {
                          updatedFiscal = Number(calc600);
                        } else if (code === '786238' || code === '27983') {
                          updatedFiscal = Number(calc600) * 24;
                        }
                      }

                      // Apply 1L calculations
                      if (calc1L !== '') {
                        if (code === '188005') {
                          updatedFiscal = Number(calc1L);
                        } else if (code === '188006') {
                          updatedFiscal = Number(calc1L) * 12;
                        }
                      }

                      // Apply 300ml calculations
                      if (calc300 !== '') {
                        if (code === '863059') {
                          updatedFiscal = Number(calc300);
                        } else if (code === '198214') {
                          updatedFiscal = Number(calc300) * 23;
                        }
                      }

                      return { ...asset, fiscalQty: updatedFiscal };
                    });
                    setActiveSession({ ...activeSession, assets: updatedAssets });
                    alert('Quantidades de todas as garrafeiras aplicadas com sucesso no saldo fiscal!');
                  }}
                  className="w-1/2 bg-amber-500 hover:bg-amber-600 text-slate-950 py-1.5 rounded-lg text-[10px] font-bold uppercase transition"
                >
                  Aplicar Saldo
                </button>
              ) : (
                <div className="w-1/2 text-center text-[9px] text-slate-500 py-1.5 font-sans">
                  Abra uma rota para aplicar
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal with Premium Zoom Controls */}
      {selectedPhotoForPreview && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-fade-in">
          <div className="absolute top-4 right-4 flex items-center space-x-3 z-50">
            {/* Zoom controls */}
            <div className="bg-slate-900/90 border border-slate-700 rounded-lg p-1 flex items-center space-x-1 shadow-lg text-white">
              <button
                type="button"
                onClick={() => setSelectedPhotoScale(s => Math.max(s - 0.25, 0.5))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom Out"
              >
                -
              </button>
              <span className="px-2 font-mono text-xs font-bold w-12 text-center">{Math.round(selectedPhotoScale * 100)}%</span>
              <button
                type="button"
                onClick={() => setSelectedPhotoScale(s => Math.min(s + 0.25, 4))}
                className="p-1.5 hover:bg-slate-800 rounded font-bold text-sm h-8 w-8 flex items-center justify-center cursor-pointer transition"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setSelectedPhotoScale(1)}
                className="px-2 py-1 hover:bg-slate-800 rounded font-bold text-xs cursor-pointer transition"
                title="Reset Zoom"
              >
                1x
              </button>
            </div>
            <button
              type="button"
              onClick={() => { setSelectedPhotoForPreview(null); setSelectedPhotoScale(1); }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition cursor-pointer font-sans"
            >
              Fechar [X]
            </button>
          </div>

          {/* Zoomable Container */}
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 cursor-zoom-in">
            <div 
              className="transition-transform duration-100 ease-out flex items-center justify-center"
              style={{ transform: `scale(${selectedPhotoScale})` }}
            >
              <img
                src={selectedPhotoForPreview.photoUrl}
                alt={selectedPhotoForPreview.itemName}
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl border border-slate-800 bg-slate-950"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Bottom Metabar */}
          <div className="absolute bottom-4 left-4 right-4 bg-slate-950/85 border border-slate-800 text-white p-3.5 rounded-xl max-w-2xl mx-auto flex flex-col space-y-1.5 text-center font-sans">
            <div className="font-bold text-xs uppercase tracking-wider">{selectedPhotoForPreview.itemName || 'Evidência de Retorno'}</div>
            <div className="text-[10px] text-slate-400 font-mono">
              Código / Ativo: <span className="bg-slate-800 px-1.5 py-0.5 rounded font-bold text-white border border-slate-700">{selectedPhotoForPreview.itemCode}</span> 
              <span className="mx-2">|</span> 
              Categoria: <span className="uppercase text-slate-300">
                {selectedPhotoForPreview.type === 'produto' ? 'PA' : 
                 selectedPhotoForPreview.type === 'refugo' ? 'Refugo/Avaria' : 
                 selectedPhotoForPreview.type === 'troca_reposicao' ? 'Troca/Reposição' : 'AG'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" id="custom_confirm_modal_fiscal">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-amber-600 animate-bounce" />
              </div>
              <h3 className="font-sans font-bold text-slate-950 text-sm">{confirmModal.title}</h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {confirmModal.message}
            </p>
            
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xxs font-bold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirmCallbackRef.current) {
                    confirmCallbackRef.current();
                  }
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-4 py-2 bg-[#0f35a9] hover:bg-[#0c2a86] text-white text-xxs font-bold rounded-lg transition shadow-3xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reset Platform Modal (Avoids native prompt blocks in iframe) */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in" id="custom_reset_platform_modal">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-slate-950 text-sm uppercase tracking-wide">Zerar Todos os Dados</h3>
                <p className="text-[10px] text-slate-400 font-medium">Ação de Segurança de Alta Categoria</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Esta ação irá deletar permanentemente todos os mapas importados, históricos de conferência, previsões de chegada, alertas e fotos registradas de sobras e avarias. <strong>Esta ação não pode ser desfeita.</strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Senha Master de Segurança:</label>
                <input
                  type="password"
                  placeholder="Digite a senha master (ex: !Bud0102)"
                  value={resetPassword}
                  onChange={(e) => {
                    setResetPassword(e.target.value);
                    setResetError('');
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
                />
              </div>

              {resetError && (
                <div className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded border border-red-100 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xxs font-bold rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (resetPassword !== '!Bud0102') {
                    setResetError("Senha de segurança incorreta! Acesso não autorizado.");
                    return;
                  }
                  
                  // Run actual reset
                  onResetPlatformData(true);
                  setShowResetModal(false);
                  
                  // Show custom toast alert or custom dialog, here we use our alert framework or state
                  alert("Todos os dados operacionais foram reiniciados com sucesso!");
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-750 text-white text-xxs font-bold rounded-lg transition shadow-3xs hover:shadow-sm"
              >
                Autorizar e Zerar Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup PDF Modal */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 no-print" id="backup_pdf_modal">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-sans font-extrabold text-slate-900 text-lg uppercase tracking-tight">Exportação de Relatório & Backup de Histórico</h3>
                <p className="text-xs text-slate-500 mt-0.5">Filtre os dados por mês para exportar o arquivo em PDF com todas as evidências fotográficas antes do reset.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Filters bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-4 items-center">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Período (Mês):</span>
                <select
                  value={backupMonthFilter}
                  onChange={(e) => setBackupMonthFilter(e.target.value)}
                  className="text-xs p-1.5 bg-white border border-slate-200 rounded-md font-sans focus:outline-none"
                >
                  <option value="all">Todos os meses</option>
                  <option value="0">Janeiro</option>
                  <option value="1">Fevereiro</option>
                  <option value="2">Março</option>
                  <option value="3">Abril</option>
                  <option value="4">Maio</option>
                  <option value="5">Junho</option>
                  <option value="6">Julho</option>
                  <option value="7">Agosto</option>
                  <option value="8">Setembro</option>
                  <option value="9">Outubro</option>
                  <option value="10">Novembro</option>
                  <option value="11">Dezembro</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Status:</span>
                <select
                  value={backupStatusFilter}
                  onChange={(e) => setBackupStatusFilter(e.target.value)}
                  className="text-xs p-1.5 bg-white border border-slate-200 rounded-md font-sans focus:outline-none"
                >
                  <option value="all">Todos os status</option>
                  <option value="ok">100% OK</option>
                  <option value="divergente">Divergentes</option>
                </select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold uppercase rounded-lg transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Gerar PDF / Imprimir</span>
                </button>
              </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100" id="backup_preview_area">
              <p className="text-xxs text-slate-400 font-mono uppercase mb-3 text-center">Pré-visualização do Relatório Oficial (Estilo de Impressão A4)</p>

              {/* REPORT CONTAINER FOR PRINT */}
              <div id="backup-print-report" className="bg-white p-8 md:p-12 shadow-md max-w-4xl mx-auto space-y-12 text-slate-900 border border-slate-200">
                
                {/* CSS Injected specifically for print layout overrides */}
                <style>{`
                  @media print {
                    body * {
                      visibility: hidden;
                    }
                    #backup-print-report, #backup-print-report * {
                      visibility: visible;
                    }
                    #backup-print-report {
                      position: absolute;
                      left: 0;
                      top: 0;
                      width: 100%;
                      box-shadow: none !important;
                      border: none !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    .no-print {
                      display: none !important;
                    }
                    .page-break {
                      page-break-before: always;
                      break-inside: avoid;
                    }
                    .break-inside-avoid {
                      break-inside: avoid;
                    }
                  }
                `}</style>

                {/* COVER PAGE */}
                <div className="border-4 border-slate-900 p-8 space-y-10 flex flex-col justify-between min-h-[650px]">
                  <div className="text-center space-y-4">
                    <span className="text-xs font-mono uppercase tracking-widest text-slate-500 block">Pau Brasil Distribuidora de Bebidas Ltda</span>
                    <h1 className="text-3xl font-sans font-extrabold tracking-tight text-slate-900 uppercase">Relatório Consolidado de Fechamento de Mapas</h1>
                    <div className="h-1 w-24 bg-red-600 mx-auto"></div>
                    <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
                      Backup oficial de auditoria, conciliação de ativos de giro, controles de refugo e evidências fotográficas.
                    </p>
                  </div>

                  {/* Summary Stats Table */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                    <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-700 text-center border-b border-slate-200 pb-2">Metadados e Estatísticas do Período</h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block uppercase font-mono text-[9px]">Filtro de Período</span>
                        <strong className="text-slate-800 text-sm">
                          {backupMonthFilter === 'all' ? 'Todos os meses' : [
                            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                          ][parseInt(backupMonthFilter)]}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-mono text-[9px]">Status de Baixa</span>
                        <strong className="text-slate-800 text-sm">
                          {backupStatusFilter === 'all' ? 'Todos os status' : backupStatusFilter === 'ok' ? '100% OK' : 'Apenas Divergentes'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-mono text-[9px]">Total de Mapas Finalizados</span>
                        <strong className="text-slate-900 text-base font-mono">
                          {audits.filter(audit => {
                            const isCompleted = audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente';
                            if (!isCompleted) return false;
                            if (backupMonthFilter !== 'all') {
                              const dateObj = new Date(audit.arrivalDate || audit.endTime || Date.now());
                              if (dateObj.getMonth().toString() !== backupMonthFilter) return false;
                            }
                            if (backupStatusFilter !== 'all') {
                              if (backupStatusFilter === 'ok' && audit.status !== 'finalizado_ok') return false;
                              if (backupStatusFilter === 'divergente' && audit.status !== 'finalizado_divergente') return false;
                            }
                            return true;
                          }).length} mapas
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-mono text-[9px]">Saldo OK / Divergente</span>
                        <strong className="text-slate-900 text-base font-mono">
                          {audits.filter(audit => {
                            const isCompleted = audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente';
                            if (!isCompleted) return false;
                            if (backupMonthFilter !== 'all') {
                              const dateObj = new Date(audit.arrivalDate || audit.endTime || Date.now());
                              if (dateObj.getMonth().toString() !== backupMonthFilter) return false;
                            }
                            return audit.status === 'finalizado_ok';
                          }).length} OK / {audits.filter(audit => {
                            const isCompleted = audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente';
                            if (!isCompleted) return false;
                            if (backupMonthFilter !== 'all') {
                              const dateObj = new Date(audit.arrivalDate || audit.endTime || Date.now());
                              if (dateObj.getMonth().toString() !== backupMonthFilter) return false;
                            }
                            return audit.status === 'finalizado_divergente';
                          }).length} DIV
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-mono text-[9px]">Apurado em</span>
                        <strong className="text-slate-700 font-mono">{new Date().toLocaleString('pt-BR')}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block uppercase font-mono text-[9px]">Responsável</span>
                        <strong className="text-slate-700">{currentUser.name} ({currentUser.role.toUpperCase()})</strong>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Footer */}
                  <div className="space-y-6 pt-6 border-t border-slate-200 text-center">
                    <p className="text-[10px] text-slate-500 italic">
                      Este documento certifica a exportação completa de todo o banco de dados antes da rotina de limpeza e manutenção programada da plataforma. As assinaturas abaixo conferem autenticidade ao processo de acerto.
                    </p>
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div className="space-y-1">
                        <div className="border-t border-slate-300 pt-1.5 text-[9px] font-bold text-slate-600 uppercase">Conferente / Auxiliar</div>
                      </div>
                      <div className="space-y-1">
                        <div className="border-t border-slate-300 pt-1.5 text-[9px] font-bold text-slate-600 uppercase">Fiscal de Retorno</div>
                      </div>
                      <div className="space-y-1">
                        <div className="border-t border-slate-300 pt-1.5 text-[9px] font-bold text-slate-600 uppercase">Gestor de Logística</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INDIVIDUAL MAP DETAILS */}
                {audits.filter(audit => {
                  const isCompleted = audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente';
                  if (!isCompleted) return false;

                  if (backupMonthFilter !== 'all') {
                    const dateObj = new Date(audit.arrivalDate || audit.endTime || Date.now());
                    if (dateObj.getMonth().toString() !== backupMonthFilter) {
                      return false;
                    }
                  }

                  if (backupStatusFilter !== 'all') {
                    if (backupStatusFilter === 'ok' && audit.status !== 'finalizado_ok') return false;
                    if (backupStatusFilter === 'divergente' && audit.status !== 'finalizado_divergente') return false;
                  }

                  return true;
                }).map((audit, index) => {
                  const auditPhotos = backupPhotos.filter(p => p.auditId === audit.id);
                  const isOk = audit.status === 'finalizado_ok';
                  
                  const fmtDate = (iso?: string) => {
                    if (!iso) return 'N/A';
                    try {
                      const d = new Date(iso);
                      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    } catch {
                      return iso;
                    }
                  };

                  return (
                    <div key={audit.id} className="page-break space-y-6 border-t-2 border-slate-300 pt-8">
                      {/* Map Header Block */}
                      <div className="flex justify-between items-start bg-slate-50 p-4 border border-slate-200 rounded-xl">
                        <div>
                          <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded font-mono">REGISTRO #{index + 1}</span>
                          <h2 className="font-sans font-extrabold text-xl tracking-tight text-slate-900 mt-1 uppercase">Mapa de Rota: {audit.routeMap}</h2>
                          <p className="text-xxs font-mono text-slate-500 mt-0.5">ID Único: {audit.id} • Placa: {audit.plate}</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block text-[10px] font-bold uppercase px-3 py-1 rounded-full ${isOk ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                            {isOk ? '● 100% OK' : '● DIVERGENTE'}
                          </span>
                          <span className="block text-[10px] text-slate-500 mt-1">Status da Baixa</span>
                        </div>
                      </div>

                      {/* Map info grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[8px]">Condutor (Motorista)</span>
                          <strong className="text-slate-800">{drivers.find(d => d.id === audit.driverId)?.name || audit.driverId}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[8px]">Ajudante</span>
                          <strong className="text-slate-800">{audit.helperId ? (drivers.find(d => d.id === audit.helperId)?.name || audit.helperId) : 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[8px]">Data de Entrada</span>
                          <strong className="text-slate-800 font-mono">{fmtDate(audit.arrivalDate)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block uppercase font-mono text-[8px]">Data da Baixa</span>
                          <strong className="text-slate-800 font-mono">{fmtDate(audit.endTime)}</strong>
                        </div>
                      </div>

                      {/* Reconciliation Notes */}
                      {audit.reconciliationNotes && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-150 text-xs text-slate-800">
                          <span className="font-bold text-amber-900 block font-mono text-[10px] uppercase">Observações da Conciliação Fiscal:</span>
                          <p className="mt-0.5">{audit.reconciliationNotes}</p>
                        </div>
                      )}

                      {/* Product discrepancies table */}
                      <div className="space-y-2 break-inside-avoid">
                        <span className="text-[10px] font-bold text-slate-600 uppercase font-mono block font-sans">Detalhamento de Produtos (PAs)</span>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase border-b border-slate-200">
                                <th className="p-2">Código</th>
                                <th className="p-2">Produto</th>
                                <th className="p-2 text-right">Físico</th>
                                <th className="p-2 text-right">Fiscal</th>
                                <th className="p-2 text-right">Divergência</th>
                              </tr>
                            </thead>
                            <tbody>
                              {audit.items.map(item => {
                                const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                                const fiscal = item.fiscalQty ?? 0;
                                const diff = physical - fiscal;
                                
                                return (
                                  <tr key={item.productCode} className="border-b border-slate-100 last:border-0">
                                    <td className="p-2 font-mono text-[10px] text-slate-500">{item.productCode}</td>
                                    <td className="p-2 font-medium text-slate-800">{products.find(p => p.code === item.productCode)?.description || item.productCode}</td>
                                    <td className="p-2 text-right font-mono">{physical}</td>
                                    <td className="p-2 text-right font-mono">{fiscal}</td>
                                    <td className={`p-2 text-right font-mono font-bold ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                      {diff === 0 ? '-' : diff > 0 ? `+${diff}` : diff}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Asset discrepancies table */}
                      <div className="space-y-2 break-inside-avoid">
                        <span className="text-[10px] font-bold text-slate-600 uppercase font-mono block font-sans">Conciliação de Ativos de Giro</span>
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 font-mono text-[9px] uppercase border-b border-slate-200">
                              <th className="p-2">Ativo</th>
                              <th className="p-2 text-right">Físico</th>
                              <th className="p-2 text-right">Fiscal</th>
                              <th className="p-2 text-right">Comodato</th>
                              <th className="p-2 text-right">Recolha</th>
                              <th className="p-2 text-right">Saldo Final</th>
                            </tr>
                          </thead>
                          <tbody>
                            {audit.assets.map(asset => {
                              const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                              const fiscal = asset.fiscalQty ?? 0;
                              const comodato = asset.comodatoQty ?? 0;
                              const recolha = asset.recolhaQty ?? 0;
                              const diff = physical - fiscal + comodato - recolha;

                              const isChapatex = asset.assetId === 'chapatex' || 
                                                 asset.assetId?.toLowerCase() === 'chapatex' || 
                                                 asset.assetName?.toUpperCase().includes('CHAPATEX');

                              return (
                                <tr key={asset.assetId} className="border-b border-slate-100 last:border-0">
                                  <td className="p-2">
                                    <div className="font-medium text-slate-800 uppercase text-[11px]">{asset.assetName}</div>
                                    <div className="font-mono text-[9px] text-slate-400">{asset.assetId}</div>
                                  </td>
                                  <td className="p-2 text-right font-mono">{physical}</td>
                                  <td className="p-2 text-right font-mono">{fiscal}</td>
                                  <td className="p-2 text-right font-mono">{comodato}</td>
                                  <td className="p-2 text-right font-mono">{recolha}</td>
                                  <td className={`p-2 text-right font-mono font-bold ${diff === 0 ? 'text-slate-400' : diff > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {diff === 0 ? 'OK' : diff > 0 ? `Sobra +${diff}` : `Falta ${diff}`}
                                    {isChapatex && diff !== 0 && (
                                      <span className="block text-[8px] text-indigo-500 font-sans uppercase font-normal">* Tolerado (Chapatex)</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        </div>
                      </div>

                      {/* Blitz and Refugos Block */}
                      {(audit.blitzBoxesChecked !== undefined || (audit.refugos && audit.refugos.length > 0)) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 break-inside-avoid">
                          {/* Blitz info */}
                          {audit.blitzBoxesChecked !== undefined && (
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono block">⚡ Resultados da Blitz de Refugo</span>
                              <div className="text-xs space-y-1 font-sans">
                                <div>Status: <strong>Realizada com Sucesso</strong></div>
                                <div>Caixas vistoriadas: <strong className="font-mono">{audit.blitzBoxesChecked} cx</strong></div>
                                <div>Avarias / Refugos encontrados: <strong className="font-mono text-red-600">{audit.blitzAvariasFound || 0} un</strong></div>
                              </div>
                            </div>
                          )}

                          {/* Refugos list */}
                          {audit.refugos && audit.refugos.length > 0 && (
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono block">📋 Motivos de Refugos Registrados</span>
                              <div className="text-xs space-y-1 max-h-[120px] overflow-y-auto font-sans">
                                {audit.refugos.map((ref, idx) => (
                                  <div key={idx} className="flex justify-between border-b border-slate-100 last:border-0 pb-1 pt-1">
                                    <span className="text-slate-700">{ref.assetName} - <span className="font-bold uppercase text-[9px] text-slate-500">{ref.reason}</span></span>
                                    <strong className="font-mono text-red-600">{ref.qty} un</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Photo evidence render */}
                      {auditPhotos.length > 0 ? (
                        <div className="space-y-3 break-inside-avoid">
                          <span className="text-[10px] font-bold text-slate-600 uppercase font-mono block">Evidências Fotográficas do Mapa ({auditPhotos.length})</span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {auditPhotos.map((photo) => (
                              <div key={photo.id} className="border border-slate-200 rounded-xl p-2 bg-white flex flex-col justify-between space-y-2">
                                <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative border border-slate-100">
                                  <img src={photo.photoUrl} alt="Evidência" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                                <div className="text-[9px] leading-tight space-y-0.5 font-sans">
                                  <div className="font-bold text-slate-800 truncate">{photo.itemName}</div>
                                  <div className="text-slate-500 truncate">Categoria: {photo.type.toUpperCase()}</div>
                                  <div className="text-slate-400 font-mono text-[8px]">{fmtDate(photo.timestamp)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 break-inside-avoid border border-slate-200 rounded-xl p-4 bg-slate-50">
                          <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Evidências Fotográficas (PA / AG / Refugos):</span>
                          <div className="flex items-start space-x-2.5">
                            <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-lg shrink-0 mt-0.5">
                              <Folder className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-700 uppercase block font-sans">
                                Fotos Arquivadas no PDF Oficial
                              </span>
                              <p className="text-xxs text-slate-500 font-medium">
                                Para otimizar o banco de dados da plataforma, as evidências fotográficas foram limpas e estão consolidadas diretamente no PDF de controle gerado no momento do fechamento. O relatório contendo as fotos está salvo no diretório de rede compartilhado:
                              </p>
                              <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-2.5 mt-1">
                                <span className="font-mono text-[9px] text-slate-600 select-all font-semibold">
                                  P:\Guarabira\2026\04.LOGISTICA\ARMAZÉM\3.0 ACURACIDADE\3.1 PACOTE PREJUIZO\FALTAS EM ROTA\RETORNO DE ROTA
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {audits.filter(audit => {
                  const isCompleted = audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente';
                  if (!isCompleted) return false;

                  if (backupMonthFilter !== 'all') {
                    const dateObj = new Date(audit.arrivalDate || audit.endTime || Date.now());
                    if (dateObj.getMonth().toString() !== backupMonthFilter) {
                      return false;
                    }
                  }

                  if (backupStatusFilter !== 'all') {
                    if (backupStatusFilter === 'ok' && audit.status !== 'finalizado_ok') return false;
                    if (backupStatusFilter === 'divergente' && audit.status !== 'finalizado_divergente') return false;
                  }

                  return true;
                }).length === 0 && (
                  <div className="text-center py-20 text-slate-400 italic border border-dashed border-slate-200 rounded-2xl">
                    Nenhum registro de mapa encontrado para os filtros selecionados.
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Total de mapas selecionados: <strong className="text-slate-900 font-mono">
                  {audits.filter(audit => {
                    const isCompleted = audit.status === 'finalizado_ok' || audit.status === 'finalizado_divergente';
                    if (!isCompleted) return false;

                    if (backupMonthFilter !== 'all') {
                      const dateObj = new Date(audit.arrivalDate || audit.endTime || Date.now());
                      if (dateObj.getMonth().toString() !== backupMonthFilter) {
                        return false;
                      }
                    }

                    if (backupStatusFilter !== 'all') {
                      if (backupStatusFilter === 'ok' && audit.status !== 'finalizado_ok') return false;
                      if (backupStatusFilter === 'divergente' && audit.status !== 'finalizado_divergente') return false;
                    }

                    return true;
                  }).length}
                </strong>
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg transition"
                >
                  Fechar Visualização
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-750 text-white text-xs font-bold uppercase rounded-lg transition shadow-sm flex items-center space-x-1 cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOG COMPACTO PARA DETALHES DO PROCESSO */}
      {selectedHistoryAudit && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center space-x-2.5">
                <div className="bg-amber-500 text-slate-950 p-1.5 rounded">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-sans font-extrabold text-sm sm:text-base leading-tight">
                    Detalhamento do Mapa {selectedHistoryAudit.routeMap}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Placa: {selectedHistoryAudit.plate} • Chegada: {new Date(selectedHistoryAudit.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedHistoryAudit(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white p-1 px-2.5 rounded-lg transition text-xs font-bold font-mono border border-slate-700 cursor-pointer"
              >
                Fechar
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Motorista</span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">{getDriverName(selectedHistoryAudit.driverId)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Ajudante</span>
                  <span className="text-xs font-semibold text-slate-800 block truncate">{getHelperName(selectedHistoryAudit.helperId)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Duração</span>
                  <span className="text-xs font-semibold text-slate-800 block font-mono">{getDurationText(selectedHistoryAudit.startTime, selectedHistoryAudit.endTime)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Tempo em Rota</span>
                  {(() => {
                    const daysOnRoute = getDaysOnRoute(selectedHistoryAudit);
                    return (
                      <span className="text-xs font-bold text-amber-700 block font-sans">
                        {daysOnRoute !== null ? `${daysOnRoute} ${daysOnRoute === 1 ? 'dia' : 'dias'}` : 'N/A'}
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Status Fiscal</span>
                  <span className={`text-[9px] font-bold uppercase block ${selectedHistoryAudit.status === 'finalizado_ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {selectedHistoryAudit.status === 'finalizado_ok' ? '● 100% OK' : '● Divergente'}
                  </span>
                </div>
              </div>

              {/* Products */}
              {selectedHistoryAudit.items && selectedHistoryAudit.items.filter(item => item.physicalQty > 0 || (item.rePhysicalQty !== undefined && item.rePhysicalQty > 0)).length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase block font-sans">
                    Produtos Acabados (PA)
                  </span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px]">
                        <tr>
                          <th className="p-2.5">Código / Item</th>
                          <th className="p-2.5 text-center">Contagem Física</th>
                          <th className="p-2.5 text-center">Saldo Fiscal</th>
                          <th className="p-2.5 text-right">Divergência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {selectedHistoryAudit.items
                          .filter(item => item.physicalQty > 0 || (item.rePhysicalQty !== undefined && item.rePhysicalQty > 0))
                          .map(item => {
                          const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                          const fisc = item.fiscalQty ?? 0;
                          const diff = phys - fisc;
                          return (
                            <tr key={item.productCode} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-medium">
                                <span className="font-mono text-[10px] bg-slate-100 p-0.5 px-1 rounded mr-1.5">{item.productCode}</span>
                                {item.productDescription}
                              </td>
                              <td className="p-2.5 text-center font-mono">{phys}</td>
                              <td className="p-2.5 text-center font-mono">{fisc}</td>
                              <td className={`p-2.5 text-right font-bold font-mono ${
                                diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Assets */}
              {selectedHistoryAudit.assets && selectedHistoryAudit.assets.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase block font-sans">
                    Ativos de Giro (AG)
                  </span>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200 font-mono text-[10px]">
                        <tr>
                          <th className="p-2.5">Ativo</th>
                          <th className="p-2.5 text-center">Contagem Física</th>
                          <th className="p-2.5 text-center">Saldo Fiscal</th>
                          <th className="p-2.5 text-center">Comodato</th>
                          <th className="p-2.5 text-center">Recolha</th>
                          <th className="p-2.5 text-right">Divergência</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {selectedHistoryAudit.assets.map(asset => {
                          const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                          const fisc = asset.fiscalQty ?? 0;
                          const comodato = asset.comodatoQty ?? 0;
                          const recolha = asset.recolhaQty ?? 0;
                          const diff = phys - fisc + comodato - recolha;
                          return (
                            <tr key={asset.assetId} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-medium">{asset.assetName || asset.assetId}</td>
                              <td className="p-2.5 text-center font-mono">{phys}</td>
                              <td className="p-2.5 text-center font-mono">{fisc}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">{comodato || '-'}</td>
                              <td className="p-2.5 text-center font-mono text-slate-500">{recolha || '-'}</td>
                              <td className={`p-2.5 text-right font-bold font-mono ${
                                diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-amber-600' : 'text-red-600'
                              }`}>
                                {diff === 0 ? 'OK' : diff > 0 ? `+${diff}` : `${diff}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Photo Evidences - Archived in network folder PDF */}
              <div className="border-t border-slate-150 pt-4 space-y-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Evidências Fotográficas (PA / AG / Refugos):</div>
                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2.5">
                  <div className="flex items-start space-x-2.5">
                    <div className="p-1.5 bg-amber-500/15 text-amber-600 rounded-lg shrink-0 mt-0.5">
                      <Folder className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-amber-800 uppercase block font-sans">
                        Fotos Arquivadas no PDF do Mapa
                      </span>
                      <p className="text-xxs text-slate-600 font-medium">
                        As imagens originais foram removidas do armazenamento local da plataforma para prevenir lentidão e corrupção de dados. O arquivo PDF oficial baixado já contém todas as evidências fotográficas anexadas e pode ser localizado no diretório compartilhado de rede correspondente:
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs">
                    <span className="font-mono text-[10px] text-slate-700 break-all select-all font-semibold leading-relaxed">
                      P:\Guarabira\2026\04.LOGISTICA\ARMAZÉM\3.0 ACURACIDADE\3.1 PACOTE PREJUIZO\FALTAS EM ROTA\RETORNO DE ROTA
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("P:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZÉM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA");
                        alert("Caminho da rede copiado para a área de transferência!");
                      }}
                      className="shrink-0 flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] rounded transition-all cursor-pointer border border-slate-200/80 uppercase font-mono"
                    >
                      <Copy className="h-3 w-3 text-slate-500" />
                      <span>Copiar Caminho</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedHistoryAudit.reconciliationNotes && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <strong className="block text-slate-700 uppercase mb-1">Parecer de Conciliação / Notas:</strong>
                  <p className="text-slate-600 italic">"{selectedHistoryAudit.reconciliationNotes}"</p>
                </div>
              )}

              {/* Seção de Reabertura de Mapa (Solicitação / Ações) */}
              <div className="border-t border-slate-150 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                  Controle de Reabertura de Mapa:
                </span>

                {(() => {
                  const mReopenInfo = getReopeningInfo(selectedHistoryAudit);
                  if (!mReopenInfo.isReopened) return null;
                  return (
                    <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2.5">
                      <span className="text-xs font-black text-amber-900 uppercase block font-sans">
                        🔄 Histórico Detalhado de Reabertura
                      </span>
                      {mReopenInfo.justification && (
                        <div className="text-xs text-slate-700 bg-white border border-amber-100 p-3 rounded-lg italic">
                          <strong>Justificativa registrada:</strong> "{mReopenInfo.justification}"
                        </div>
                      )}
                      <div className="grid grid-cols-1 gap-2 text-xxs text-slate-600 font-mono leading-relaxed bg-amber-100/30 p-2.5 rounded-lg border border-amber-200/40">
                        {mReopenInfo.requestedAt && (
                          <div className="flex items-center space-x-2">
                            <span className="text-amber-600 font-bold">1. Solicitado em:</span>
                            <span className="font-semibold text-slate-800">{new Date(mReopenInfo.requestedAt).toLocaleString('pt-BR')} {mReopenInfo.requestedBy ? `por ${mReopenInfo.requestedBy}` : ''}</span>
                          </div>
                        )}
                        {mReopenInfo.reopenedAt && (
                          <div className="flex items-center space-x-2">
                            <span className="text-amber-600 font-bold">2. Reaberto em:</span>
                            <span className="font-semibold text-slate-800">{new Date(mReopenInfo.reopenedAt).toLocaleString('pt-BR')} {mReopenInfo.reopenedBy ? `por ${mReopenInfo.reopenedBy}` : ''}</span>
                          </div>
                        )}
                        {mReopenInfo.closedAgainAt ? (
                          <div className="flex items-center space-x-2 bg-emerald-100/50 p-1.5 rounded border border-emerald-200/50">
                            <span className="text-emerald-700 font-bold">3. Fechado Novamente:</span>
                            <span className="font-bold text-emerald-800">{new Date(mReopenInfo.closedAgainAt).toLocaleString('pt-BR')} {mReopenInfo.closedAgainBy ? `por ${mReopenInfo.closedAgainBy}` : ''}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 bg-rose-100/50 p-1.5 rounded border border-rose-200/50">
                            <span className="text-rose-700 font-bold">3. Fechado Novamente:</span>
                            <span className="font-bold text-rose-800">Ainda pendente de conclusão</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {selectedHistoryAudit.reopeningRequested ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start space-x-2">
                      <span className="text-lg">🔓</span>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-amber-800 uppercase block">
                          Solicitação de Reabertura Pendente
                        </span>
                        <p className="text-xxs text-slate-500 font-mono">
                          Solicitado por: <strong>{selectedHistoryAudit.reopeningRequestUser || 'Auxiliar'}</strong> em {selectedHistoryAudit.reopeningRequestDate ? new Date(selectedHistoryAudit.reopeningRequestDate).toLocaleString('pt-BR') : ''}
                        </p>
                        <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-amber-100 mt-1">
                          "{selectedHistoryAudit.reopeningJustification}"
                        </p>
                      </div>
                    </div>

                    {/* Se o usuário atual for Financeiro ou Gestor, ele pode aprovar ou recusar */}
                    {(currentUser.role === 'financeiro' || currentUser.role === 'gestor') && (
                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          onClick={() => handleApproveReopening(selectedHistoryAudit.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs cursor-pointer flex items-center space-x-1"
                        >
                          <span>Aprovar Reabertura</span>
                        </button>
                        <button
                          onClick={() => handleRejectReopening(selectedHistoryAudit.id)}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                        >
                          <span>Recusar</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Auxiliar de logística ou Gestor pode solicitar se o mapa estiver baixado */}
                    {(currentUser.role === 'auxiliar_logistica' || currentUser.role === 'gestor') && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                        <label className="text-[10px] text-slate-500 font-semibold uppercase block">
                          Justificativa para solicitar reabertura:
                        </label>
                        <textarea
                          placeholder="Digite aqui o motivo detalhado pelo qual este mapa precisa ser reaberto pelo Financeiro..."
                          value={reopeningJustificationText}
                          onChange={(e) => setReopeningJustificationText(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 h-16 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <div className="flex justify-end">
                          <button
                            onClick={() => handleRequestReopening(selectedHistoryAudit.id)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer"
                          >
                            Solicitar Reabertura do Mapa
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Consolidated Unified Timeline */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block font-sans">
                  📑 Registro de Atividades e Histórico Unificado
                </span>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed pb-1">
                  Todos os apontamentos, observações da fiscalia/monitoramento, solicitações de reconferência, alinhamento de sobras e justificativas de atraso estão consolidados na linha do tempo abaixo:
                </p>

                <div className="relative pl-5 border-l-2 border-slate-200 space-y-4 pt-1 ml-2">
                  {(() => {
                    const timeline = getUnifiedTimeline(selectedHistoryAudit, importedRoutes);
                    if (timeline.length === 0) {
                      return (
                        <div className="text-xxs italic text-slate-400">
                          Nenhum evento registrado para este mapa.
                        </div>
                      );
                    }

                    return timeline.map((ev, idx) => {
                      // Determine styling and icon based on type and content
                      let bgColor = 'bg-slate-50/70 border-slate-200 text-slate-700';
                      let iconText = '📝';
                      let labelText = ev.action;

                      if (ev.type === 'reopening') {
                        bgColor = 'bg-amber-50/80 border-amber-200 text-amber-900';
                        iconText = '🔓';
                      } else if (ev.type === 'delay') {
                        bgColor = 'bg-rose-50/80 border-rose-200 text-rose-900 font-bold';
                        iconText = '⏰';
                      } else if (ev.type === 'alignment') {
                        bgColor = 'bg-indigo-50/80 border-indigo-200 text-indigo-900';
                        iconText = '🤝';
                      } else if (ev.type === 'observation') {
                        bgColor = 'bg-sky-50/80 border-sky-200 text-sky-950';
                        iconText = '💬';
                      } else if (ev.action.includes('Concluída') || ev.action.includes('Sucesso') || ev.action.includes('OK') || ev.action.includes('Fechado')) {
                        bgColor = 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-semibold';
                        iconText = '✅';
                      } else if (ev.action.includes('Reconferência') || ev.action.includes('Recontagem')) {
                        bgColor = 'bg-blue-50/80 border-blue-200 text-blue-900 font-semibold';
                        iconText = '🔍';
                      }

                      return (
                        <div key={ev.id} className="relative group">
                          {/* Dot/Icon on the left border */}
                          <div className={`absolute -left-[27px] top-1.5 h-4 w-4 rounded-full border-2 flex items-center justify-center text-[9px] shadow-3xs ${
                            ev.type === 'delay' ? 'bg-rose-600 border-rose-700 text-white animate-pulse' :
                            ev.type === 'reopening' ? 'bg-amber-500 border-amber-600 text-white' :
                            ev.type === 'alignment' ? 'bg-indigo-600 border-indigo-700 text-white' :
                            ev.type === 'observation' ? 'bg-sky-500 border-sky-600 text-white' :
                            'bg-slate-400 border-slate-500 text-white'
                          }`}>
                            <span className="text-[9px] leading-none">{iconText}</span>
                          </div>

                          <div className={`p-3.5 rounded-xl border ${bgColor} shadow-3xs transition-all duration-200 hover:shadow-2xs`}>
                            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                              <span className="text-xxs font-black uppercase tracking-wide font-sans">{labelText}</span>
                              <span className="text-[9px] text-slate-400 font-mono font-medium">
                                📅 {new Date(ev.timestamp).toLocaleDateString('pt-BR')} às {new Date(ev.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <div className="text-xxs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                              <span>👤 Realizado por:</span> 
                              <span className="text-slate-800 font-bold">{ev.user}</span>
                            </div>

                            {ev.details && (
                              <div className="text-xxs text-slate-700 font-semibold bg-white/80 border border-slate-100 p-2.5 rounded-lg mt-1.5 leading-relaxed break-words font-mono">
                                {ev.details}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setSelectedHistoryAudit(null)}
                className="bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-2 px-5 rounded-lg transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMAÇÃO DE SOBRA PARA AUXILIAR DE ARMAZÉM (1 DIA ANTES DA DATA DE ENTREGA) */}
      {pendingSurplusesForAuxiliary.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-300 max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 border-b border-amber-500/40 flex justify-between items-start">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 shrink-0">
                  <PackageCheck className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono">
                      Aviso do Armazém
                    </span>
                    <span className="text-xs text-amber-300 font-semibold font-mono">
                      1 dia antes da entrega
                    </span>
                  </div>
                  <h3 className="font-sans font-extrabold text-base text-white uppercase tracking-tight mt-0.5">
                    Confirmação de Envio de Sobra ({pendingSurplusesForAuxiliary.length})
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    O Monitoramento/Gestão alinhou o código NB e a data de entrega. Confirme o lançamento do envio ou reprove informando o motivo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDismissedPopupAuditIds(prev => [...prev, ...pendingSurplusesForAuxiliary.map(a => a.id)]);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Fechar por enquanto"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content / Cards */}
            <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50 grow">
              {pendingSurplusesForAuxiliary.map(audit => {
                const driverName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                const surplusProds = audit.items.filter(i => {
                  const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                  return phys > (i.fiscalQty ?? 0);
                });
                const surplusAssets = audit.assets.filter(a => {
                  const idLower = (a.assetId || '').toLowerCase();
                  const nameUpper = (a.assetName || '').toUpperCase();
                  const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
                  if (isChapatex) return false;

                  const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                  return phys > (a.fiscalQty ?? 0);
                });

                const isReprovingThis = reprovingAuditId === audit.id;

                return (
                  <div key={audit.id} className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-slate-900 font-sans">Mapa {audit.routeMap}</span>
                          <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-bold">{audit.plate}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-sans">
                          <strong>Motorista:</strong> {driverName}
                        </div>
                      </div>

                      <div className="text-right space-y-0.5">
                        <div className="text-xs font-mono font-extrabold text-slate-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg inline-block">
                          NB Cliente: {audit.clientCodeNB}
                        </div>
                        <div className="text-[11px] text-emerald-800 font-bold font-sans block">
                          Entrega Prevista: {audit.deliveryDate ? new Date(audit.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Surplus items detail */}
                    <div className="bg-amber-50/40 border border-amber-100/80 rounded-lg p-3 space-y-2">
                      <div className="text-[10px] font-bold text-amber-900 uppercase tracking-wider font-sans">
                        Itens em Sobra Alinhados para Envio:
                      </div>
                      <div className="space-y-1">
                        {surplusProds.map(p => {
                          const diff = (p.rePhysicalQty !== undefined ? p.rePhysicalQty : p.physicalQty) - (p.fiscalQty ?? 0);
                          return (
                            <div key={p.productCode} className="flex justify-between text-xs text-slate-800 font-medium">
                              <span>
                                {p.productCode && <span className="font-mono text-amber-900 font-bold mr-1">[{p.productCode}]</span>}
                                {p.productDescription}
                              </span>
                              <span className="font-mono font-bold text-emerald-700">+{diff} cx (P.A.)</span>
                            </div>
                          );
                        })}
                        {surplusAssets.map(a => {
                          const diff = (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) - (a.fiscalQty ?? 0);
                          return (
                            <div key={a.assetId} className="flex justify-between text-xs text-slate-800 font-medium">
                              <span>
                                {a.assetId && <span className="font-mono text-blue-900 font-bold mr-1">[{a.assetId}]</span>}
                                {a.assetName}
                              </span>
                              <span className="font-mono font-bold text-emerald-700">+{diff} un (A.G.)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reproval observation area if reproving */}
                    {isReprovingThis && (
                      <div className="bg-red-50 p-3 rounded-lg border border-red-200 space-y-2 animate-fade-in">
                        <label className="block text-xs font-bold text-red-900 font-sans">
                          Motivo da Reprova do Envio (Obrigatório):
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Informe a observação detalhando o motivo da reprova..."
                          value={reprovalObservation}
                          onChange={e => setReprovalObservation(e.target.value)}
                          className="w-full text-xs p-2 bg-white border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-500 font-sans"
                        />
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setReprovingAuditId(null);
                              setReprovalObservation('');
                            }}
                            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition cursor-pointer font-sans"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!reprovalObservation.trim()) {
                                alert('É obrigatório preencher a observação em caso de reprova!');
                                return;
                              }
                              const updated = audits.map(a => {
                                if (a.id === audit.id) {
                                  return {
                                    ...a,
                                    surplusFlowStatus: 'REPROVADO' as const,
                                    reconciliationNotes: `Reprovado pela Auxiliar de Armazém: ${reprovalObservation.trim()}`,
                                    history: [
                                      ...a.history,
                                      {
                                        timestamp: new Date().toISOString(),
                                        action: 'Envio de Sobra Reprovado pela Auxiliar de Armazém',
                                        user: currentUser.name,
                                        details: `Motivo da Reprova: ${reprovalObservation.trim()}`
                                      }
                                    ]
                                  };
                                }
                                return a;
                              });
                              onSaveAudits(updated);
                              setReprovingAuditId(null);
                              setReprovalObservation('');
                              alert('Envio reprovado e observação registrada no histórico com sucesso!');
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer font-sans"
                          >
                            Confirmar Reprova
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons if not currently open for reproval input */}
                    {!isReprovingThis && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = audits.map(a => {
                              if (a.id === audit.id) {
                                return {
                                  ...a,
                                  surplusFlowStatus: 'ENVIADO' as const,
                                  surplusActionStatus: 'enviado_cliente' as const,
                                  history: [
                                    ...a.history,
                                    {
                                      timestamp: new Date().toISOString(),
                                      action: 'Sobra Lançada pela Auxiliar de Armazém',
                                      user: currentUser.name,
                                      details: `Sobra confirmada e lançada pela Auxiliar de Armazém. NB: ${audit.clientCodeNB} | Data Entrega: ${audit.deliveryDate}. Removido da tela operacional e disponível na Visão Master.`
                                    }
                                  ]
                                };
                              }
                              return a;
                            });
                            onSaveAudits(updated);
                            alert(`Sobra do Mapa ${audit.routeMap} lançada com sucesso!\n\nO item foi removido da tela operacional de Sobras e Faltas e agora está visível apenas na Visão Master.`);
                          }}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer font-sans uppercase tracking-tight"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Lançar Envio (Confirmar)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setReprovingAuditId(audit.id);
                            setReprovalObservation('');
                          }}
                          className="bg-red-100 hover:bg-red-200 text-red-900 font-extrabold text-xs py-2.5 px-4 rounded-xl border border-red-200 transition flex items-center justify-center space-x-2 cursor-pointer font-sans uppercase tracking-tight"
                        >
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>Reprovar Envio</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
