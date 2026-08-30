import React, { useState, useMemo } from 'react';
import { 
  AuditSession, 
  Product, 
  Driver, 
  Vehicle, 
  ActiveAsset, 
  ImportedRoute, 
  Vale 
} from '../types';
import { 
  Trophy, 
  TrendingUp, 
  DollarSign, 
  Beer, 
  Package, 
  Boxes, 
  Filter, 
  Layers, 
  Calendar, 
  Search, 
  Download, 
  RotateCcw, 
  AlertTriangle, 
  PlusCircle, 
  Truck, 
  FileSpreadsheet, 
  FileText, 
  ChevronRight, 
  BarChart3, 
  PieChart, 
  Medal, 
  Sparkles, 
  Eye, 
  X, 
  CheckCircle,
  Receipt
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import * as XLSX from 'xlsx';
import { resolveRegisteredDriver } from '../utils/efdCalculations';
import { normalizeDateToYMD, formatDateToPtBR, isDateInRange } from '../utils/dateUtils';
import { getSkuClosedPrice } from '../utils/prices';
import { getStandardItemCost } from '../utils/pricing';
import { resolveOfficialCatalogItem } from '../utils/productCatalogResolver';
import { CALIBRATED_SOBRAS_BASE } from '../data/calibratedSobrasData';
import { DEFAULT_OPERATIONAL_ACTIONS } from '../data/defaultOperationalActions';

export interface RankingDashboardPaAgProps {
  audits: AuditSession[];
  products: Product[];
  drivers: Driver[];
  vehicles?: Vehicle[];
  activeAssets?: ActiveAsset[];
  importedRoutes?: ImportedRoute[];
  vales?: Vale[];
  mode?: 'vales' | 'geral';
  onSelectDriver?: (driverName: string) => void;
  onNavigateToVales?: () => void;
}

export interface DiscrepancyRecord {
  id: string;
  auditId: string;
  date: string; // YYYY-MM-DD
  formattedDate: string;
  routeMap: string;
  plate: string;
  driverName: string;
  helperName: string;
  itemCode: string;
  itemDescription: string;
  segment: 'PA' | 'AG';
  category: string;
  tipo: 'SOBRA' | 'FALTA';
  physicalQty: number;
  fiscalQty: number;
  diffQty: number; // positive number
  unitHectoliters: number;
  totalHectoliters: number;
  unitPriceReais: number;
  totalPriceReais: number;
  status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO';
  valeId?: string;
  valeValor?: number;
  notes?: string;
}

// Convert SKU description to Hectoliters (hL)
export function calculateHectoliters(prodCode: string, prodDesc: string, qtyUnits: number): number {
  const desc = (prodDesc || '').toUpperCase();
  let hlPerUnit = 0.005; // 500ml default

  if (desc.includes('600') || desc.includes('600ML')) {
    hlPerUnit = 0.006; // 600ml
  } else if (desc.includes('1L') || desc.includes('1000ML') || desc.includes('1 LITRO')) {
    hlPerUnit = 0.010; // 1L
  } else if (desc.includes('300') || desc.includes('300ML') || desc.includes('RGB')) {
    hlPerUnit = 0.003; // 300ml
  } else if (desc.includes('350') || desc.includes('350ML') || desc.includes('LATA')) {
    hlPerUnit = 0.0035; // 350ml
  } else if (desc.includes('269') || desc.includes('269ML')) {
    hlPerUnit = 0.00269;
  } else if (desc.includes('473') || desc.includes('473ML') || desc.includes('LATÃO') || desc.includes('LATAO')) {
    hlPerUnit = 0.00473;
  } else if (desc.includes('355') || desc.includes('LONG NECK') || desc.includes('LN')) {
    hlPerUnit = 0.00355;
  } else if (desc.includes('50L') || desc.includes('BARRIL 50')) {
    hlPerUnit = 0.500;
  } else if (desc.includes('30L') || desc.includes('BARRIL 30')) {
    hlPerUnit = 0.300;
  } else if (desc.includes('20L') || desc.includes('GALAO') || desc.includes('GALÃO')) {
    hlPerUnit = 0.200;
  } else if (desc.includes('2L') || desc.includes('PET 2L')) {
    hlPerUnit = 0.020;
  } else if (desc.includes('1.5L') || desc.includes('1,5L')) {
    hlPerUnit = 0.015;
  }

  return qtyUnits * hlPerUnit;
}

export const RankingDashboardPaAg: React.FC<RankingDashboardPaAgProps> = ({
  audits,
  products,
  drivers,
  vehicles = [],
  activeAssets = [],
  importedRoutes = [],
  vales = [],
  mode = 'geral',
  onSelectDriver,
  onNavigateToVales
}) => {
  const isValesMode = mode === 'vales';

  // FILTERS
  const [segmentFilter, setSegmentFilter] = useState<'TODOS' | 'PA' | 'AG'>('TODOS');
  const [metricFocus, setMetricFocus] = useState<'VALOR' | 'HECTOLITRO' | 'UNIDADES'>('VALOR');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'FALTA' | 'SOBRA'>(isValesMode ? 'FALTA' : 'TODOS');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDriverFilter, setSelectedDriverFilter] = useState<string>('');
  const [inspectedRecord, setInspectedRecord] = useState<DiscrepancyRecord | null>(null);

  // 1. EXTRACT ALL DISCREPANCIES (P.A. & A.G.)
  const allDiscrepancies = useMemo<DiscrepancyRecord[]>(() => {
    const list: DiscrepancyRecord[] = [];
    const seenKeys = new Set<string>();

    const valeMap = new Map<string, Vale>();
    vales.forEach(v => {
      if (v.auditId) valeMap.set(v.auditId, v);
      if (v.routeMap) valeMap.set(v.routeMap.toUpperCase().trim(), v);
    });

    // 1.1 Process Audits
    audits.forEach(audit => {
      const rawDate = audit.arrivalDate || audit.routeDate || audit.startTime || (audit.history && audit.history[0]?.timestamp) || '2026-08-01';
      const dateYMD = normalizeDateToYMD(rawDate);
      const formattedDate = formatDateToPtBR(dateYMD);
      const routeMap = (audit.routeMap || 'S/N').toUpperCase().trim();
      const plate = (audit.plate || 'SEM_PLACA').toUpperCase().trim();
      const resolved = resolveRegisteredDriver(audit.driverId || audit.driverName || '', `${routeMap}_${plate}`, drivers);
      const driverName = resolved.name;
      const helperName = audit.helperName || 'NÃO INFORMADO';
      const relatedVale = valeMap.get(audit.id) || valeMap.get(routeMap);

      // P.A. Items
      if (audit.items && audit.items.length > 0) {
        audit.items.forEach((item, idx) => {
          const phys = Number(item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty) || 0;
          const fisc = Number(item.fiscalQty ?? item.systemQty) || 0;
          const diff = phys - fisc;

          if (diff !== 0) {
            const isSobra = diff > 0;
            // In Vales Mode, completely skip sobras because ONLY faltas generate vales
            if (isValesMode && isSobra) return;

            const diffAbs = Math.abs(diff);
            const resolvedItem = resolveOfficialCatalogItem(item.productCode, item.productDescription, products, activeAssets);
            const hl = calculateHectoliters(resolvedItem.code, resolvedItem.description, diffAbs);
            const unitPrice = item.unitPrice || getSkuClosedPrice(resolvedItem.code, resolvedItem.cost || item.cost, products, resolvedItem.description);

            const key = `audit-${audit.id}-pa-${resolvedItem.code}-${idx}`;
            seenKeys.add(key);

            let status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO' = 'PENDENTE';
            if (isSobra) {
              status = 'CONCLUIDO';
            } else if (relatedVale) {
              status = 'VALE_GERADO';
            } else {
              status = audit.status === 'aprovado' || audit.status === 'concluido' ? 'ALINHADO' : 'PENDENTE';
            }

            list.push({
              id: key,
              auditId: audit.id,
              date: dateYMD,
              formattedDate,
              routeMap,
              plate,
              driverName,
              helperName,
              itemCode: resolvedItem.code,
              itemDescription: resolvedItem.description,
              segment: resolvedItem.segment,
              category: resolvedItem.category,
              tipo: isSobra ? 'SOBRA' : 'FALTA',
              physicalQty: phys,
              fiscalQty: fisc,
              diffQty: diffAbs,
              unitHectoliters: hl / (diffAbs || 1),
              totalHectoliters: hl,
              unitPriceReais: unitPrice,
              totalPriceReais: diffAbs * unitPrice,
              status,
              valeId: relatedVale?.id,
              valeValor: relatedVale?.valor,
              notes: item.notes || audit.notes || ''
            });
          }
        });
      }

      // A.G. Items
      if (audit.assets && audit.assets.length > 0) {
        audit.assets.forEach((asset, idx) => {
          const phys = Number(asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty) || 0;
          const fisc = Number(asset.fiscalQty ?? asset.systemQty) || 0;
          const comodato = Number(asset.comodatoQty) || 0;
          const recolha = Number(asset.recolhaQty) || 0;
          const diff = (phys + comodato) - (fisc + recolha);

          if (diff !== 0) {
            const isSobra = diff > 0;
            // In Vales Mode, completely skip sobras because ONLY faltas generate vales
            if (isValesMode && isSobra) return;

            const diffAbs = Math.abs(diff);
            const resolvedItem = resolveOfficialCatalogItem(asset.assetId, asset.assetName, products, activeAssets);
            const unitPrice = getStandardItemCost(resolvedItem.code, resolvedItem.description, activeAssets, products);

            const key = `audit-${audit.id}-ag-${resolvedItem.code}-${idx}`;
            seenKeys.add(key);

            let status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO' = 'PENDENTE';
            if (isSobra) {
              status = 'CONCLUIDO';
            } else if (relatedVale) {
              status = 'VALE_GERADO';
            } else {
              status = audit.status === 'aprovado' || audit.status === 'concluido' ? 'ALINHADO' : 'PENDENTE';
            }

            list.push({
              id: key,
              auditId: audit.id,
              date: dateYMD,
              formattedDate,
              routeMap,
              plate,
              driverName,
              helperName,
              itemCode: resolvedItem.code,
              itemDescription: resolvedItem.description,
              segment: resolvedItem.segment,
              category: resolvedItem.category,
              tipo: isSobra ? 'SOBRA' : 'FALTA',
              physicalQty: phys,
              fiscalQty: fisc,
              diffQty: diffAbs,
              unitHectoliters: 0,
              totalHectoliters: 0,
              unitPriceReais: unitPrice,
              totalPriceReais: diffAbs * unitPrice,
              status,
              valeId: relatedVale?.id,
              valeValor: relatedVale?.valor,
              notes: asset.notes || audit.notes || ''
            });
          }
        });
      }
    });

    // 1.2 Process Calibrated Sobras AG (ONLY in general mode, NEVER in vales mode)
    if (!isValesMode) {
      CALIBRATED_SOBRAS_BASE.forEach(sob => {
        const resolvedItem = resolveOfficialCatalogItem(sob.assetId, sob.assetName, products, activeAssets);
        const key = `calibrated-sobra-${sob.auditId}-${resolvedItem.code}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const resolved = resolveRegisteredDriver(sob.driverId || sob.driverName, `${sob.routeMap}_${sob.plate}`, drivers);
          const unitPrice = getStandardItemCost(resolvedItem.code, resolvedItem.description, activeAssets, products);
          const diffAbs = Number(sob.diffQty || sob.physicalQty) || 1;

          list.push({
            id: key,
            auditId: sob.auditId,
            date: sob.date,
            formattedDate: formatDateToPtBR(sob.date),
            routeMap: sob.routeMap,
            plate: sob.plate,
            driverName: resolved.name,
            helperName: sob.helperName || 'NÃO INFORMADO',
            itemCode: resolvedItem.code,
            itemDescription: resolvedItem.description,
            segment: resolvedItem.segment,
            category: resolvedItem.category,
            tipo: 'SOBRA',
            physicalQty: diffAbs,
            fiscalQty: sob.fiscalQty || 0,
            diffQty: diffAbs,
            unitHectoliters: 0,
            totalHectoliters: 0,
            unitPriceReais: unitPrice,
            totalPriceReais: diffAbs * unitPrice,
            status: 'CONCLUIDO',
            notes: `Sobra identificada em conferência física e compensada.`
          });
        }
      });
    }

    // 1.3 Process Operational Actions (PA & AG)
    DEFAULT_OPERATIONAL_ACTIONS.forEach(act => {
      const isSobra = act.type === 'sobra';
      const isFalta = act.type === 'falta';

      // In Vales mode, strictly only process faltas
      if (isFalta || (!isValesMode && isSobra)) {
        const key = `op-action-${act.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          const dateYMD = normalizeDateToYMD(act.startDate || '2026-08-01');
          const diffAbs = act.quantity || 1;

          const resolvedItem = resolveOfficialCatalogItem(null, act.productOrAsset, products, activeAssets);
          const isAG = resolvedItem.segment === 'AG';

          let unitPrice = 45.0;
          let hl = 0;
          if (isAG) {
            unitPrice = getStandardItemCost(resolvedItem.code, resolvedItem.description, activeAssets, products);
          } else {
            unitPrice = getSkuClosedPrice(resolvedItem.code, resolvedItem.cost || 45.0, products, resolvedItem.description);
            hl = calculateHectoliters(resolvedItem.code, resolvedItem.description, diffAbs);
          }

          const vNorm = (id: string) => (id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const fNorm = vNorm(act.id.replace('act', 'val'));

          const relatedVale = vales.find(v => vNorm(v.id) === fNorm) ||
                              valeMap.get(act.id.replace('act-', 'val_')) || 
                              valeMap.get(act.routeMap || '') || 
                              vales.find(v => act.routeMap && (v.routeMap === act.routeMap || v.descricao.includes(act.routeMap)));

          let status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO' = 'PENDENTE';
          if (isSobra) {
            status = 'CONCLUIDO';
          } else if (relatedVale) {
            status = 'VALE_GERADO';
          } else {
            status = act.status === 'CONCLUIDA' ? 'CONCLUIDO' : 'PENDENTE';
          }

          const calculatedTotal = isSobra 
            ? (diffAbs * unitPrice) 
            : (relatedVale ? relatedVale.valor : (diffAbs * unitPrice));

          const calculatedUnitPrice = isSobra
            ? unitPrice
            : (relatedVale ? Number((relatedVale.valor / (diffAbs || 1)).toFixed(2)) : unitPrice);

          list.push({
            id: key,
            auditId: act.id,
            date: dateYMD,
            formattedDate: formatDateToPtBR(dateYMD),
            routeMap: (act.routeMap || '00000').toUpperCase().trim(),
            plate: (act.plate || 'FROTA').toUpperCase().trim(),
            driverName: act.colaboradorName || 'MOTORISTA OPERAÇÃO',
            helperName: 'NÃO INFORMADO',
            itemCode: resolvedItem.code,
            itemDescription: resolvedItem.description,
            segment: resolvedItem.segment,
            category: resolvedItem.category,
            tipo: isSobra ? 'SOBRA' : 'FALTA',
            physicalQty: isSobra ? diffAbs : 0,
            fiscalQty: isSobra ? 0 : diffAbs,
            diffQty: diffAbs,
            unitHectoliters: hl / (diffAbs || 1),
            totalHectoliters: hl,
            unitPriceReais: calculatedUnitPrice,
            totalPriceReais: calculatedTotal,
            status,
            valeId: relatedVale?.id,
            valeValor: relatedVale?.valor,
            notes: `${act.observations || ''}${act.resolutionNotes ? ' | Tratativa: ' + act.resolutionNotes : ''}`.trim()
          });
        }
      }
    });

    return list;
  }, [audits, products, drivers, activeAssets, vales, isValesMode]);

  // Extract available months
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allDiscrepancies.forEach(item => {
      if (item.date && item.date.length >= 7) {
        monthsSet.add(item.date.substring(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [allDiscrepancies]);

  // Handle Quick Month Filter
  const handleSelectMonth = (monthVal: string) => {
    setSelectedMonth(monthVal);
    if (monthVal === 'todos') {
      setStartDate('');
      setEndDate('');
    } else {
      const [year, month] = monthVal.split('-');
      const y = parseInt(year, 10);
      const m = parseInt(month, 10);
      const lastDay = new Date(y, m, 0).getDate();
      setStartDate(`${year}-${month.padStart(2, '0')}-01`);
      setEndDate(`${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    }
  };

  const applyQuickPreset = (preset: 'todos' | 'mes_atual' | 'mes_anterior' | 'ultimos_30') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (preset === 'mes_atual') {
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      const s = `${y}-${String(m).padStart(2, '0')}-01`;
      const e = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
      setStartDate(s);
      setEndDate(e);
    } else if (preset === 'mes_anterior') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const y = prev.getFullYear();
      const m = prev.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      const s = `${y}-${String(m).padStart(2, '0')}-01`;
      const e = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
      setStartDate(s);
      setEndDate(e);
    } else if (preset === 'ultimos_30') {
      setSelectedMonth('todos');
      const past30 = new Date();
      past30.setDate(past30.getDate() - 30);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else {
      setSelectedMonth('todos');
      setStartDate('');
      setEndDate('');
    }
  };

  // FILTERED RECORDS
  const filteredRecords = useMemo(() => {
    return allDiscrepancies.filter(item => {
      // Segment Filter (PA vs AG vs TODOS)
      if (segmentFilter !== 'TODOS' && item.segment !== segmentFilter) return false;

      // Type Filter (FALTA vs SOBRA vs TODOS)
      if (typeFilter !== 'TODOS' && item.tipo !== typeFilter) return false;

      // Date Range Filter
      if (startDate || endDate) {
        if (!isDateInRange(item.date, startDate, endDate)) return false;
      }

      // Driver Filter
      if (selectedDriverFilter && item.driverName !== selectedDriverFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const mProd = item.itemDescription.toLowerCase().includes(q) || item.itemCode.toLowerCase().includes(q);
        const mMap = item.routeMap.toLowerCase().includes(q);
        const mPlate = item.plate.toLowerCase().includes(q);
        const mDriver = item.driverName.toLowerCase().includes(q);
        const mCat = item.category.toLowerCase().includes(q);
        return mProd || mMap || mPlate || mDriver || mCat;
      }

      return true;
    });
  }, [allDiscrepancies, segmentFilter, typeFilter, startDate, endDate, selectedDriverFilter, searchQuery]);

  // SUMMARY METRICS
  const summary = useMemo(() => {
    let totalValor = 0;
    let totalHl = 0;
    let totalUnidades = 0;

    let paValor = 0;
    let paHl = 0;
    let paUnidades = 0;

    let agValor = 0;
    let agUnidades = 0;

    let totalSobrasValor = 0;
    let totalFaltasValor = 0;
    let sobrasCount = 0;
    let faltasCount = 0;

    filteredRecords.forEach(item => {
      totalValor += item.totalPriceReais;
      totalHl += item.totalHectoliters;
      totalUnidades += item.diffQty;

      if (item.segment === 'PA') {
        paValor += item.totalPriceReais;
        paHl += item.totalHectoliters;
        paUnidades += item.diffQty;
      } else {
        agValor += item.totalPriceReais;
        agUnidades += item.diffQty;
      }

      if (item.tipo === 'SOBRA') {
        totalSobrasValor += item.totalPriceReais;
        sobrasCount++;
      } else {
        totalFaltasValor += item.totalPriceReais;
        faltasCount++;
      }
    });

    const valesVinculados = vales.reduce((acc, v) => acc + (v.valor || 0), 0);

    return {
      totalValor,
      totalHl,
      totalUnidades,
      paValor,
      paHl,
      paUnidades,
      agValor,
      agUnidades,
      totalSobrasValor,
      totalFaltasValor,
      sobrasCount,
      faltasCount,
      valesVinculados,
      mediaPorDesvio: filteredRecords.length > 0 ? totalValor / filteredRecords.length : 0
    };
  }, [filteredRecords, vales]);

  // 2. RANKING DE MOTORISTAS (COM VALOR E HECTOLITROS)
  const driverRanking = useMemo(() => {
    const map = new Map<string, {
      driverName: string;
      totalValor: number;
      totalHl: number;
      totalUnidades: number;
      paValor: number;
      paHl: number;
      agValor: number;
      count: number;
      faltasCount: number;
      sobrasCount: number;
      valesTotal: number;
    }>();

    filteredRecords.forEach(item => {
      const dName = item.driverName || 'NÃO INFORMADO';
      if (!map.has(dName)) {
        map.set(dName, {
          driverName: dName,
          totalValor: 0,
          totalHl: 0,
          totalUnidades: 0,
          paValor: 0,
          paHl: 0,
          agValor: 0,
          count: 0,
          faltasCount: 0,
          sobrasCount: 0,
          valesTotal: 0
        });
      }

      const entry = map.get(dName)!;
      entry.totalValor += item.totalPriceReais;
      entry.totalHl += item.totalHectoliters;
      entry.totalUnidades += item.diffQty;
      entry.count += 1;

      if (item.segment === 'PA') {
        entry.paValor += item.totalPriceReais;
        entry.paHl += item.totalHectoliters;
      } else {
        entry.agValor += item.totalPriceReais;
      }

      if (item.tipo === 'FALTA') {
        entry.faltasCount += 1;
        if (item.valeValor) entry.valesTotal += item.valeValor;
      } else {
        entry.sobrasCount += 1;
      }
    });

    const list = Array.from(map.values());

    // Sort based on primary metric focus
    if (metricFocus === 'VALOR') {
      list.sort((a, b) => b.totalValor - a.totalValor);
    } else if (metricFocus === 'HECTOLITRO') {
      list.sort((a, b) => b.totalHl - a.totalHl || b.totalValor - a.totalValor);
    } else {
      list.sort((a, b) => b.totalUnidades - a.totalUnidades || b.totalValor - a.totalValor);
    }

    return list;
  }, [filteredRecords, metricFocus]);

  // 3. RANKING DE PRODUTOS & ATIVOS (SKUs & AG)
  const productRanking = useMemo(() => {
    const map = new Map<string, {
      code: string;
      desc: string;
      segment: 'PA' | 'AG';
      totalValor: number;
      totalHl: number;
      totalUnidades: number;
      faltasUn: number;
      sobrasUn: number;
      count: number;
      unitPrice: number;
    }>();

    filteredRecords.forEach(item => {
      const key = `${item.segment}_${item.itemCode}_${item.itemDescription}`;
      if (!map.has(key)) {
        map.set(key, {
          code: item.itemCode,
          desc: item.itemDescription,
          segment: item.segment,
          totalValor: 0,
          totalHl: 0,
          totalUnidades: 0,
          faltasUn: 0,
          sobrasUn: 0,
          count: 0,
          unitPrice: item.unitPriceReais
        });
      }

      const entry = map.get(key)!;
      entry.totalValor += item.totalPriceReais;
      entry.totalHl += item.totalHectoliters;
      entry.totalUnidades += item.diffQty;
      entry.count += 1;

      if (item.tipo === 'FALTA') {
        entry.faltasUn += item.diffQty;
      } else {
        entry.sobrasUn += item.diffQty;
      }
    });

    const list = Array.from(map.values());

    if (metricFocus === 'VALOR') {
      list.sort((a, b) => b.totalValor - a.totalValor);
    } else if (metricFocus === 'HECTOLITRO') {
      list.sort((a, b) => b.totalHl - a.totalHl || b.totalValor - a.totalValor);
    } else {
      list.sort((a, b) => b.totalUnidades - a.totalUnidades || b.totalValor - a.totalValor);
    }

    return list;
  }, [filteredRecords, metricFocus]);

  // Chart Data for Top 7 Drivers
  const driverChartData = useMemo(() => {
    return driverRanking.slice(0, 7).map(d => ({
      name: d.driverName.length > 14 ? d.driverName.substring(0, 14) + '...' : d.driverName,
      fullName: d.driverName,
      valor: Number(d.totalValor.toFixed(2)),
      hectolitros: Number(d.totalHl.toFixed(2)),
      unidades: d.totalUnidades,
      paValor: Number(d.paValor.toFixed(2)),
      agValor: Number(d.agValor.toFixed(2))
    }));
  }, [driverRanking]);

  // Chart Data for Top 7 Products / Assets
  const productChartData = useMemo(() => {
    return productRanking.slice(0, 7).map(p => ({
      name: p.desc.length > 16 ? p.desc.substring(0, 16) + '...' : p.desc,
      fullName: p.desc,
      code: p.code,
      segment: p.segment,
      valor: Number(p.totalValor.toFixed(2)),
      hectolitros: Number(p.totalHl.toFixed(2)),
      unidades: p.totalUnidades
    }));
  }, [productRanking]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const rows = filteredRecords.map(r => ({
      'Segmento': r.segment === 'PA' ? 'Produto Acabado (P.A.)' : 'Ativo de Giro (A.G.)',
      'Data': r.formattedDate,
      'Mapa / Rota': r.routeMap,
      'Placa': r.plate,
      'Motorista': r.driverName,
      'Tipo': r.tipo,
      'Código Item': r.itemCode,
      'Descrição': r.itemDescription,
      'Físico': r.physicalQty,
      'Fiscal / Sistema': r.fiscalQty,
      'Divergência (un)': r.diffQty,
      'Volume (hL)': Number((r.totalHectoliters || 0).toFixed(3)),
      'Preço Unitário (R$)': Number((r.unitPriceReais || 0).toFixed(2)),
      'Valor Total (R$)': Number((r.totalPriceReais || 0).toFixed(2)),
      'Status': r.status,
      'Vale Vinculado': r.valeId || '-',
      'Observações': r.notes || ''
    }));

    const driverSummary = driverRanking.map((d, idx) => ({
      'Posição': idx + 1,
      'Motorista': d.driverName,
      'Total Ocorrências': d.count,
      'Volume Total (hL)': Number(d.totalHl.toFixed(3)),
      'Valor Total (R$)': Number(d.totalValor.toFixed(2)),
      'P.A. (R$)': Number(d.paValor.toFixed(2)),
      'P.A. (hL)': Number(d.paHl.toFixed(3)),
      'A.G. (R$)': Number(d.agValor.toFixed(2)),
      'Total Unidades': d.totalUnidades
    }));

    const wb = XLSX.utils.book_new();
    const wsDetails = XLSX.utils.json_to_sheet(rows);
    const wsRanking = XLSX.utils.json_to_sheet(driverSummary);

    XLSX.utils.book_append_sheet(wb, wsRanking, 'Ranking Motoristas');
    XLSX.utils.book_append_sheet(wb, wsDetails, 'Detalhes Desvios');

    const dateTag = startDate && endDate ? `${startDate}_a_${endDate}` : 'geral';
    XLSX.writeFile(wb, `Dashboard_Ranking_PA_AG_${dateTag}.xlsx`);
  };

  const getMonthLabel = (mStr: string) => {
    const [y, m] = mStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${monthName}/${y}`;
  };

  return (
    <div className="space-y-6 animate-fade-in" id="dashboard_ranking_pa_ag_root">
      {/* 1. TOP HERO BANNER & CONTROL BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 rounded-xl shadow-md font-bold">
                <Trophy className="h-5 w-5" />
              </span>
              <h2 className="font-sans font-black text-xl sm:text-2xl text-white tracking-tight uppercase">
                {isValesMode ? 'Dashboard de Faltas & Vales Emitidos' : 'Dashboard de Rankings, Valor & Hectolitro'}
              </h2>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40">
                {isValesMode ? 'Apenas Faltas (Vales)' : 'P.A. & A.G.'}
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              {isValesMode 
                ? 'Painel analítico e financeiro de faltas apuradas em rotas e conferências físicas. Apenas faltas físicas geram vales de responsabilidade financeira. Acompanhe a volumetria em Hectolitros (hL), impacto financeiro (R$) e ranking de colaboradores.'
                : 'Painel analítico e comparativo de desvios físicos e fiscais. Acompanhe a volumetria em Hectolitros (hL), o impacto financeiro em Reais (R$) e o ranking detalhado por motorista e SKU de Produto Acabado (P.A.) e Ativos de Giro (A.G.).'
              }
            </p>
          </div>

          {/* METRIC TOGGLE BUTTONS */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase px-2">
              Métrica do Ranking:
            </span>
            <div className="flex items-center gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMetricFocus('VALOR')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  metricFocus === 'VALOR'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Valor (R$)</span>
              </button>

              <button
                type="button"
                onClick={() => setMetricFocus('HECTOLITRO')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  metricFocus === 'HECTOLITRO'
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Beer className="h-3.5 w-3.5" />
                <span>Volume (hL)</span>
              </button>

              <button
                type="button"
                onClick={() => setMetricFocus('UNIDADES')}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  metricFocus === 'UNIDADES'
                    ? 'bg-slate-700 text-white shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Package className="h-3.5 w-3.5" />
                <span>Unidades</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. DEDICATED P.A. & A.G. SEGMENT FILTER */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-amber-400 uppercase mr-1 flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filtro de Segmento:</span>
            </span>

            <button
              type="button"
              onClick={() => setSegmentFilter('TODOS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
                segmentFilter === 'TODOS'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Todos (P.A. + A.G.)</span>
              <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded-md font-mono">
                {allDiscrepancies.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSegmentFilter('PA')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
                segmentFilter === 'PA'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/90 text-amber-300 hover:bg-slate-800 hover:text-amber-200 border border-amber-500/30'
              }`}
            >
              <Beer className="h-3.5 w-3.5 text-amber-400" />
              <span>Produto Acabado (P.A.)</span>
              <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded-md font-mono">
                {allDiscrepancies.filter(d => d.segment === 'PA').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSegmentFilter('AG')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
                segmentFilter === 'AG'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20'
                  : 'bg-slate-800/90 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200 border border-emerald-500/30'
              }`}
            >
              <Boxes className="h-3.5 w-3.5 text-emerald-400" />
              <span>Ativos de Giro (A.G.)</span>
              <span className="text-[10px] bg-slate-950/60 px-1.5 py-0.5 rounded-md font-mono">
                {allDiscrepancies.filter(d => d.segment === 'AG').length}
              </span>
            </button>
          </div>

          {/* QUICK EXPORT BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer"
              title="Exportar Ranking e Detalhes para Planilha Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exportar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PERIOD AND SEARCH FILTER PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-600" />
              <span>Período:</span>
            </span>

            <button
              type="button"
              onClick={() => applyQuickPreset('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                !startDate && !endDate && selectedMonth === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos os Meses
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('mes_atual')}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                selectedMonth.startsWith(new Date().toISOString().substring(0, 7))
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Mês Atual (Agosto)
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('mes_anterior')}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Mês Anterior (Julho)
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('ultimos_30')}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
            >
              Últimos 30 Dias
            </button>
          </div>

          {/* Month Selector Dropdown */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xxs font-mono text-slate-500 font-bold uppercase">Mês Selecionado:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleSelectMonth(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-mono rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="todos">Todos os Meses Registrados</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {getMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search & Custom Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por motorista, placa, rota/mapa ou SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            {isValesMode ? (
              <div className="w-full py-1.5 px-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <span>Apenas Faltas (Vales)</span>
              </div>
            ) : (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="TODOS">Tipo: Faltas & Sobras</option>
                <option value="FALTA">Apenas Faltas (-)</option>
                <option value="SOBRA">Apenas Sobras (+)</option>
              </select>
            )}
          </div>

          {/* Driver Filter */}
          <div>
            <select
              value={selectedDriverFilter}
              onChange={(e) => setSelectedDriverFilter(e.target.value)}
              className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todos os Motoristas</option>
              {drivers.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              type="button"
              onClick={() => {
                setSegmentFilter('TODOS');
                if (!isValesMode) setTypeFilter('TODOS');
                setStartDate('');
                setEndDate('');
                setSelectedMonth('todos');
                setSearchQuery('');
                setSelectedDriverFilter('');
              }}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar Filtros</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. EXECUTIVE SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: VALOR TOTAL */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
              {isValesMode ? 'Total em Faltas (Vales Emitidos)' : 'Impacto Financeiro Total'}
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-2xl text-slate-900">
              R$ {summary.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xxs font-mono">
              <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                P.A: R$ {summary.paValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">
                A.G: R$ {summary.agValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* CARD 2: VOLUME EM HECTOLITROS (hL) */}
        <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-blue-700 tracking-wider">
              {isValesMode ? 'Volume Faltante em Hectolitros' : 'Volume em Hectolitros (hL)'}
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Beer className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-2xl text-blue-950">
              {summary.totalHl.toFixed(3)} <span className="text-sm font-normal text-blue-700">hL</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xxs font-mono text-blue-800">
              <span>{summary.paHl.toFixed(3)} hL de Produto Acabado</span>
              <span>•</span>
              <span>{(summary.totalHl * 100).toFixed(0)} Litros</span>
            </div>
          </div>
        </div>

        {/* CARD 3: QUANTIDADE DE UNIDADES / CAIXAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
              {isValesMode ? 'Total de Unidades Faltantes' : 'Unidades & Embalagens'}
            </span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-2xl text-slate-900">
              {summary.totalUnidades.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-500">un</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xxs font-mono text-slate-600">
              <span>P.A: {summary.paUnidades} un</span>
              <span>•</span>
              <span>A.G: {summary.agUnidades} un</span>
              <span>•</span>
              <span>{filteredRecords.length} {isValesMode ? 'faltas apuradas' : 'desvios'}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: VALES OPERACIONAIS */}
        <div className="bg-white rounded-2xl border border-purple-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-purple-700 tracking-wider">
              Vales Formalizados
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2">
            <div className="font-mono font-black text-2xl text-purple-950">
              {vales.length} <span className="text-sm font-normal text-purple-700">vales</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xxs font-mono text-purple-800">
              <span>Total: R$ {summary.valesVinculados.toFixed(2)}</span>
              <span>•</span>
              <span className="font-bold">{vales.filter(v => v.status === 'PENDENTE_ASSINATURA').length} pendentes</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. VISUAL CHARTS: COMPARATIVO VALOR (R$) VS HECTOLITROS (hL) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRÁFICO 1: TOP MOTORISTAS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-900 text-amber-400 rounded-lg">
                <Truck className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900 uppercase">
                  Top Motoristas — {isValesMode ? 'Faltas em ' : ''}{metricFocus === 'VALOR' ? 'Impacto Financeiro (R$)' : metricFocus === 'HECTOLITRO' ? 'Volume em Hectolitros (hL)' : 'Quantidade de Unidades'}
                </h3>
                <p className="text-xxs text-slate-400 font-mono">
                  {isValesMode ? 'Concentração de faltas e vales por colaborador' : 'Distribuição comparativa por prestador de transporte'}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              Top 7
            </span>
          </div>

          <div className="h-72 w-full">
            {driverChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverChartData} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis 
                    width={70} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                    tickFormatter={(val: number) => {
                      if (metricFocus === 'VALOR') {
                        if (val >= 1000) return `R$ ${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
                        return `R$ ${val}`;
                      }
                      if (metricFocus === 'HECTOLITRO') {
                        return `${val} hL`;
                      }
                      return `${val} un`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontFamily: 'monospace', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'valor' || name === 'Valor Total (R$)') return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Impacto em Faltas (R$)'];
                      if (name === 'hectolitros' || name === 'Volume (hL)') return [`${Number(value).toFixed(3)} hL (${(Number(value) * 100).toFixed(0)} L)`, 'Volume Faltante'];
                      if (name === 'unidades' || name === 'Unidades') return [`${value} unidades`, 'Qtd Faltante'];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Motorista: ${label}`}
                  />
                  {metricFocus === 'VALOR' ? (
                    <Bar dataKey="valor" name="Valor Total (R$)" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                      {driverChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#d97706' : index === 1 ? '#f59e0b' : '#fbbf24'} />
                      ))}
                    </Bar>
                  ) : metricFocus === 'HECTOLITRO' ? (
                    <Bar dataKey="hectolitros" name="Volume (hL)" fill="#2563eb" radius={[6, 6, 0, 0]}>
                      {driverChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#1d4ed8' : index === 1 ? '#2563eb' : '#60a5fa'} />
                      ))}
                    </Bar>
                  ) : (
                    <Bar dataKey="unidades" name="Unidades" fill="#475569" radius={[6, 6, 0, 0]}>
                      {driverChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#0f172a' : '#334155'} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Nenhum dado de faltas encontrado para o filtro selecionado.
              </div>
            )}
          </div>
        </div>

        {/* GRÁFICO 2: TOP PRODUTOS E ATIVOS (P.A. & A.G.) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500 text-slate-950 rounded-lg font-bold">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-sm text-slate-900 uppercase">
                  Top Itens & SKUs — {isValesMode ? 'Faltas em ' : ''}{segmentFilter === 'TODOS' ? 'P.A. e A.G.' : segmentFilter === 'PA' ? 'Produto Acabado' : 'Ativos de Giro'}
                </h3>
                <p className="text-xxs text-slate-400 font-mono">
                  Concentração de perdas e faltas por mercadoria
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
              Top 7 SKUs
            </span>
          </div>

          <div className="h-72 w-full">
            {productChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productChartData} margin={{ top: 15, right: 20, left: 10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={55}
                  />
                  <YAxis 
                    width={70} 
                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} 
                    tickFormatter={(val: number) => {
                      if (metricFocus === 'VALOR') {
                        if (val >= 1000) return `R$ ${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
                        return `R$ ${val}`;
                      }
                      if (metricFocus === 'HECTOLITRO') {
                        return `${val} hL`;
                      }
                      return `${val} un`;
                    }}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '11px', fontFamily: 'monospace', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}
                    formatter={(value: any, name: any) => {
                      if (name === 'valor' || name === 'Valor Total (R$)') return [`R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Impacto em Faltas (R$)'];
                      if (name === 'hectolitros' || name === 'Volume (hL)') return [`${Number(value).toFixed(3)} hL (${(Number(value) * 100).toFixed(0)} L)`, 'Volume Faltante'];
                      if (name === 'unidades' || name === 'Unidades') return [`${value} unidades`, 'Qtd Faltante'];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.desc ? `${item.desc} (${item.segment})` : label;
                    }}
                  />
                  {metricFocus === 'VALOR' ? (
                    <Bar dataKey="valor" name="Valor Total (R$)" fill="#059669" radius={[6, 6, 0, 0]}>
                      {productChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.segment === 'PA' ? '#d97706' : '#059669'} />
                      ))}
                    </Bar>
                  ) : metricFocus === 'HECTOLITRO' ? (
                    <Bar dataKey="hectolitros" name="Volume (hL)" fill="#2563eb" radius={[6, 6, 0, 0]}>
                      {productChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#2563eb" />
                      ))}
                    </Bar>
                  ) : (
                    <Bar dataKey="unidades" name="Unidades" fill="#475569" radius={[6, 6, 0, 0]}>
                      {productChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.segment === 'PA' ? '#f59e0b' : '#10b981'} />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                Nenhum item com faltas encontrado para o filtro selecionado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. TABELAS DE RANKING DETALHADAS (MOTORISTAS & PRODUTOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RANKING COMPLETO DE MOTORISTAS (LADO ESQUERDO / 6 COLS) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-slate-950 rounded-lg">
                <Trophy className="h-4 w-4" />
              </span>
              <h3 className="font-sans font-bold text-sm text-slate-900 uppercase">
                Ranking Geral de Motoristas
              </h3>
            </div>
            <span className="text-xxs font-mono font-bold text-slate-500">
              {driverRanking.length} motoristas
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-3 text-center w-12">Pos.</th>
                  <th className="py-3 px-3">Motorista</th>
                  <th className="py-3 px-3 text-right">Volume (hL)</th>
                  <th className="py-3 px-3 text-right">Valor Total (R$)</th>
                  <th className="py-3 px-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {driverRanking.length > 0 ? (
                  driverRanking.map((driver, index) => {
                    const isPodium1 = index === 0;
                    const isPodium2 = index === 1;
                    const isPodium3 = index === 2;

                    const percentOfTotal = summary.totalValor > 0 
                      ? ((driver.totalValor / summary.totalValor) * 100).toFixed(1) 
                      : '0.0';

                    return (
                      <tr 
                        key={driver.driverName}
                        className={`hover:bg-slate-50 transition ${
                          selectedDriverFilter === driver.driverName ? 'bg-amber-50/80 font-bold' : ''
                        }`}
                      >
                        {/* Posição no Ranking */}
                        <td className="py-3 px-3 text-center">
                          {isPodium1 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                              🥇
                            </span>
                          ) : isPodium2 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-900 font-black text-xs shadow-xs">
                              🥈
                            </span>
                          ) : isPodium3 ? (
                            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-700/60 text-white font-black text-xs shadow-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="font-bold text-slate-400 text-xs">
                              #{index + 1}
                            </span>
                          )}
                        </td>

                        {/* Nome do Motorista */}
                        <td className="py-3 px-3">
                          <div className="font-sans font-bold text-slate-900 truncate max-w-[180px]">
                            {driver.driverName}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                            <span>{driver.count} ocorrências</span>
                            <span>•</span>
                            <span className="text-amber-700">{percentOfTotal}% do total</span>
                          </div>
                          {/* Mini Progress Bar */}
                          <div className="w-full bg-slate-100 h-1 rounded-full mt-1.5 overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full" 
                              style={{ width: `${Math.min(Number(percentOfTotal), 100)}%` }}
                            />
                          </div>
                        </td>

                        {/* Volume em Hectolitros */}
                        <td className="py-3 px-3 text-right font-bold text-blue-700">
                          {driver.totalHl.toFixed(3)} <span className="text-xxs font-normal">hL</span>
                        </td>

                        {/* Valor Total em Reais */}
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          R$ {driver.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <div className="text-[9px] text-slate-400 font-normal">
                            PA: R$ {driver.paValor.toFixed(0)} | AG: R$ {driver.agValor.toFixed(0)}
                          </div>
                        </td>

                        {/* Ação: Filtrar */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedDriverFilter === driver.driverName) {
                                setSelectedDriverFilter('');
                              } else {
                                setSelectedDriverFilter(driver.driverName);
                                if (onSelectDriver) onSelectDriver(driver.driverName);
                              }
                            }}
                            className={`p-1.5 rounded-lg text-xxs font-bold transition cursor-pointer ${
                              selectedDriverFilter === driver.driverName
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                            title="Filtrar ocorrências deste motorista"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                      Nenhum motorista encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RANKING COMPLETO DE PRODUTOS & ATIVOS (LADO DIREITO / 6 COLS) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                <Package className="h-4 w-4" />
              </span>
              <h3 className="font-sans font-bold text-sm text-slate-900 uppercase">
                Ranking de Itens & SKUs (P.A. & A.G.)
              </h3>
            </div>
            <span className="text-xxs font-mono font-bold text-slate-500">
              {productRanking.length} produtos / ativos
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-900 text-white font-mono text-[10px] uppercase">
                <tr>
                  <th className="py-3 px-3 text-center w-12">Pos.</th>
                  <th className="py-3 px-3">Item / SKU</th>
                  <th className="py-3 px-3 text-center">Seg.</th>
                  <th className="py-3 px-3 text-right">Volume (hL)</th>
                  <th className="py-3 px-3 text-right">Valor Total (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {productRanking.length > 0 ? (
                  productRanking.map((item, index) => {
                    const isPodium = index < 3;
                    return (
                      <tr key={`${item.segment}_${item.code}_${item.desc}`} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-3 text-center">
                          <span className={`font-bold ${isPodium ? 'text-amber-600 font-black' : 'text-slate-400'}`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-sans font-bold text-slate-900 truncate max-w-[200px]" title={item.desc}>
                            {item.desc}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Cód: {item.code} • {item.totalUnidades} unidades desviadas
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                            item.segment === 'PA' 
                              ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}>
                            {item.segment}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-blue-700">
                          {item.totalHl > 0 ? `${item.totalHl.toFixed(3)} hL` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          R$ {item.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                      Nenhum item ou ativo encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 7. TABELA DETALHADA DE REGISTROS DE DESVIO COM INSPEÇÃO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-sans font-bold text-sm text-slate-900 uppercase flex items-center gap-2">
              <Layers className="h-4 w-4 text-amber-600" />
              <span>Registros Detalhados de Ocorrências ({filteredRecords.length})</span>
            </h3>
            <p className="text-xxs text-slate-400 font-mono">
              Listagem individual de conciliação física-fiscal com dados de volume e precificação
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition border border-slate-200 cursor-pointer flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              <span>Exportar Dados</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900 text-white font-mono text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Seg.</th>
                <th className="py-2.5 px-3">Data</th>
                <th className="py-2.5 px-3">Mapa</th>
                <th className="py-2.5 px-3">Placa</th>
                <th className="py-2.5 px-3">Motorista</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Descrição Item</th>
                <th className="py-2.5 px-3 text-right">Qtd</th>
                <th className="py-2.5 px-3 text-right text-blue-300">Volume (hL)</th>
                <th className="py-2.5 px-3 text-right text-amber-300">Valor Total</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Ver</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {filteredRecords.slice(0, 50).map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      record.segment === 'PA' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                    }`}>
                      {record.segment}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 font-bold">{record.formattedDate}</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{record.routeMap}</td>
                  <td className="py-2.5 px-3 text-slate-600">{record.plate}</td>
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-900 truncate max-w-[150px]">
                    {record.driverName}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      record.tipo === 'SOBRA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {record.tipo}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-sans truncate max-w-[200px]" title={record.itemDescription}>
                    {record.itemDescription}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                    {record.diffQty}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-blue-700">
                    {record.totalHectoliters > 0 ? `${record.totalHectoliters.toFixed(3)} hL` : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-black text-slate-900">
                    R$ {record.totalPriceReais.toFixed(2)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full ${
                      record.status === 'CONCLUIDO' ? 'bg-emerald-100 text-emerald-800' :
                      record.status === 'VALE_GERADO' ? 'bg-purple-100 text-purple-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {record.status === 'VALE_GERADO' ? 'Vale Emitido' : record.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setInspectedRecord(record)}
                      className="p-1 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition"
                      title="Ver detalhes da ocorrência"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 8. MODAL DE DETALHES / INSPEÇÃO DE OCORRÊNCIA */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${
                  inspectedRecord.tipo === 'SOBRA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Detalhes do Registro: {inspectedRecord.tipo} de {inspectedRecord.segment === 'PA' ? 'P.A.' : 'A.G.'}
                  </h3>
                  <p className="text-xxs font-mono text-slate-500">
                    Rota: {inspectedRecord.routeMap} • Placa: {inspectedRecord.plate} • Data: {inspectedRecord.formattedDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-sans text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="grid grid-cols-2 gap-3 text-xxs font-mono">
                  <div>
                    <span className="text-slate-400 block uppercase">Motorista</span>
                    <strong className="text-slate-900 text-xs">{inspectedRecord.driverName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Produto / Ativo</span>
                    <strong className="text-slate-900 text-xs">{inspectedRecord.itemDescription}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Volume</span>
                    <strong className="text-blue-700 text-xs">
                      {inspectedRecord.totalHectoliters > 0 ? `${inspectedRecord.totalHectoliters.toFixed(3)} hL` : 'Ativo Físico'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Impacto Financeiro</span>
                    <strong className="text-slate-900 text-xs">
                      R$ {inspectedRecord.totalPriceReais.toFixed(2)} ({inspectedRecord.diffQty} un @ R$ {inspectedRecord.unitPriceReais.toFixed(2)})
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações e Tratativa:
                </label>
                <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl text-slate-800 font-sans leading-relaxed text-xs">
                  {inspectedRecord.notes || 'Nenhuma observação informada no momento do registro.'}
                </div>
              </div>

              {inspectedRecord.valeId && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-700" />
                    <div>
                      <span className="text-xxs font-bold text-purple-900 block">Vale Financeiro Vinculado</span>
                      <span className="text-xxs font-mono text-purple-700">Cód: {inspectedRecord.valeId}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-purple-900">
                    R$ {(inspectedRecord.valeValor || inspectedRecord.totalPriceReais).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingDashboardPaAg;
