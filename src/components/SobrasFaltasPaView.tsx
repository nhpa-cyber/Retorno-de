import React, { useState, useMemo } from 'react';
import { AuditSession, Product, Driver, Vehicle, ActiveAsset, ImportedRoute, Vale, getAssetCode } from '../types';
import { getStandardItemCost } from '../utils/pricing';
import { 
  FileCheck, 
  TrendingUp, 
  AlertTriangle, 
  PlusCircle, 
  Search, 
  Filter, 
  DollarSign, 
  Beer, 
  Boxes, 
  Calendar, 
  Truck, 
  User as UserIcon, 
  ArrowUpDown, 
  CheckCircle2, 
  Download,
  Layers,
  ChevronRight,
  ChevronLeft,
  Package,
  RotateCcw,
  Sparkles,
  Receipt,
  FileSpreadsheet,
  MessageSquareText,
  Info,
  Clock,
  CheckCheck,
  ArrowRight,
  X
} from 'lucide-react';
import { resolveRegisteredDriver } from '../utils/efdCalculations';
import { normalizeDateToYMD, formatDateToPtBR, isDateInRange } from '../utils/dateUtils';
import { getSkuClosedPrice } from '../utils/prices';
import { resolveOfficialCatalogItem } from '../utils/productCatalogResolver';
import { CALIBRATED_SOBRAS_BASE } from '../data/calibratedSobrasData';
import { DEFAULT_OPERATIONAL_ACTIONS } from '../data/defaultOperationalActions';
import { getTurnoverRank, OFFICIAL_TURNOVER_MAP } from '../data/officialTurnoverCatalog';


interface SobrasFaltasPaViewProps {
  audits: AuditSession[];
  products: Product[];
  drivers: Driver[];
  vehicles: Vehicle[];
  activeAssets?: ActiveAsset[];
  importedRoutes?: ImportedRoute[];
  vales?: Vale[];
}

export interface DiscrepancyItem {
  id: string;
  auditId: string;
  date: string;
  formattedDate: string;
  routeMap: string;
  plate: string;
  driverName: string;
  helperName: string;
  itemCode: string;
  itemDescription: string;
  segment: 'PA' | 'AG'; // PA = Produto Acabado, AG = Ativo de Giro
  category: string;
  tipo: 'SOBRA' | 'FALTA';
  physicalQty: number;
  fiscalQty: number;
  diffQty: number; // absolute positive value
  unitHectoliters: number;
  totalHectoliters: number;
  unitPriceReais: number;
  totalPriceReais: number;
  status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO';
  valeId?: string;
  valeValor?: number;
  notes?: string;
}

// Helper to convert product quantity to hectoliters (hL)
export function getProductHectoliters(prodCode: string, prodDesc: string, qtyUnits: number): number {
  const desc = prodDesc.toUpperCase();
  let hlPerUnit = 0.005; // default fallback per unit (500ml)

  if (desc.includes('600') || desc.includes('600ML')) {
    hlPerUnit = 0.006; // 600ml = 0.006 hL
  } else if (desc.includes('1L') || desc.includes('1000ML') || desc.includes('1 LITRO')) {
    hlPerUnit = 0.010; // 1L = 0.010 hL
  } else if (desc.includes('300') || desc.includes('300ML') || desc.includes('RGB') || desc.includes('RETORNÁVEL 300')) {
    hlPerUnit = 0.003; // 300ml = 0.003 hL
  } else if (desc.includes('350') || desc.includes('350ML') || desc.includes('LATA')) {
    hlPerUnit = 0.0035; // 350ml = 0.0035 hL
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

export function getProductUnitPrice(prodCode: string, prodDesc: string, products: Product[]): number {
  return getSkuClosedPrice(prodCode, undefined, products, prodDesc);
}

export const SobrasFaltasPaView: React.FC<SobrasFaltasPaViewProps> = ({
  audits,
  products,
  drivers,
  vehicles,
  activeAssets = [],
  importedRoutes = [],
  vales = []
}) => {
  // Metric toggle: Reais (R$) vs Hectolitros (hL) vs Caixas/Unidades
  const [metricUnit, setMetricUnit] = useState<'reais' | 'hectolitro' | 'unidades'>('reais');
  
  // Segment Filter: Todos vs PA (Produto Acabado) vs AG (Ativos de Giro)
  const [segmentFilter, setSegmentFilter] = useState<'todos' | 'PA' | 'AG'>('todos');

  // Main View Tab: Fila Ativa de Divergências (Pendentes / Ações Operacionais) vs Histórico Geral
  const [viewTab, setViewTab] = useState<'pendencias' | 'historico'>('pendencias');

  // Filter state
  const [filterType, setFilterType] = useState<'todos' | 'SOBRA' | 'FALTA'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [sortField, setSortField] = useState<'turnover' | 'date' | 'totalPrice' | 'totalHl' | 'qty'>('turnover');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<DiscrepancyItem | null>(null);

  // Extract all PA & AG Sobras and Faltas from audits and imported routes

  const allDiscrepancies = useMemo<DiscrepancyItem[]>(() => {
    const list: DiscrepancyItem[] = [];
    const seenKeys = new Set<string>();

    // Map existing vales by routeMap and auditId for fast lookup
    const valeMap = new Map<string, Vale>();
    vales.forEach(v => {
      if (v.auditId) valeMap.set(v.auditId, v);
      if (v.routeMap) valeMap.set(v.routeMap.toUpperCase().trim(), v);
    });

    // 1. Extract from Audits
    audits.forEach(audit => {
      const rawDate = audit.arrivalDate || audit.routeDate || audit.startTime || (audit.history && audit.history[0]?.timestamp) || new Date().toISOString();
      const dateYMD = normalizeDateToYMD(rawDate);
      const formattedDate = formatDateToPtBR(dateYMD);
      const routeMap = (audit.routeMap || 'S/N').toUpperCase().trim();
      const plate = (audit.plate || 'SEM_PLACA').toUpperCase().trim();
      const resolved = resolveRegisteredDriver(audit.driverId || audit.driverName || '', `${routeMap}_${plate}`, drivers);
      const driverName = resolved.name;
      const helperName = audit.helperName || 'NÃO INFORMADO';

      const relatedVale = valeMap.get(audit.id) || valeMap.get(routeMap);

      // 1.1 Process PA (Produto Acabado) items
      if (audit.items && audit.items.length > 0) {
        audit.items.forEach((item, idx) => {
          const phys = Number(item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty) || 0;
          const fisc = Number(item.fiscalQty ?? item.systemQty) || 0;
          const diff = phys - fisc;

          if (diff !== 0) {
            const isSobra = diff > 0;
            const diffAbs = Math.abs(diff);
            const resolvedItem = resolveOfficialCatalogItem(item.productCode, item.productDescription, products, activeAssets);
            const hl = getProductHectoliters(resolvedItem.code, resolvedItem.description, diffAbs);
            const unitPrice = item.unitPrice || getSkuClosedPrice(resolvedItem.code, resolvedItem.cost || item.cost, products, resolvedItem.description);
            
            const key = `audit-${audit.id}-pa-${resolvedItem.code}-${idx}`;
            seenKeys.add(key);

            let status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO' = 'PENDENTE';
            if (isSobra) {
              status = (audit.surplusFlowStatus === 'ENVIADO' || (item.treatedQty && item.treatedQty >= diffAbs)) ? 'CONCLUIDO' : 'PENDENTE';
            } else {
              status = (relatedVale || audit.deficitActionStatus === 'baixado') ? 'VALE_GERADO' : 'PENDENTE';
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
              notes: item.treatmentNotes || item.notes || audit.reconciliationNotes || ''
            });
          }
        });
      }

      // 1.2 Process AG Deficits (Faltas de Ativos de Giro) from audits
      if (audit.assets && audit.assets.length > 0) {
        audit.assets.forEach((asset, idx) => {
          const phys = Number(asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty) || 0;
          const fisc = Number(asset.fiscalQty ?? 0);
          const comodato = Number(asset.comodatoQty ?? 0);
          const recolha = Number(asset.recolhaQty ?? 0);
          
          // Total deviation for active assets: physical - (fiscal - comodato + recolha)
          const adjustedFiscal = fisc - comodato + recolha;
          const diff = phys - adjustedFiscal;

          if (diff < 0) {
            const diffAbs = Math.abs(diff);
            const resolvedItem = resolveOfficialCatalogItem(asset.assetId, asset.assetName, products, activeAssets);
            const unitPrice = asset.cost || getStandardItemCost(resolvedItem.code, resolvedItem.description, activeAssets, products);
            
            const key = `audit-${audit.id}-ag-falta-${resolvedItem.code}-${idx}`;
            seenKeys.add(key);

            const status: 'PENDENTE' | 'ALINHADO' | 'VALE_GERADO' | 'CONCLUIDO' = (relatedVale || audit.deficitActionStatus === 'baixado') ? 'VALE_GERADO' : 'PENDENTE';

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
              tipo: 'FALTA',
              physicalQty: phys,
              fiscalQty: adjustedFiscal,
              diffQty: diffAbs,
              unitHectoliters: 0,
              totalHectoliters: 0,
              unitPriceReais: unitPrice,
              totalPriceReais: diffAbs * unitPrice,
              status,
              valeId: relatedVale?.id,
              valeValor: relatedVale?.valor,
              notes: asset.treatmentNotes || audit.reconciliationNotes || ''
            });
          }
        });
      }
    });

    // 2. Incorporate Calibrated AG Sobras Base (~R$ 500,00 de sobras reais distribuídas equilibradamente)
    CALIBRATED_SOBRAS_BASE.forEach((sobra, idx) => {
      const dateYMD = normalizeDateToYMD(sobra.date);
      const formattedDate = formatDateToPtBR(dateYMD);
      const routeMap = (sobra.routeMap || 'S/N').toUpperCase().trim();
      const plate = (sobra.plate || 'SEM_PLACA').toUpperCase().trim();
      const resolved = resolveRegisteredDriver(sobra.driverId || '', `${routeMap}_${plate}`, drivers);
      const driverName = resolved.name || sobra.driverName || 'MOTORISTA OPERAÇÃO';
      const helperName = sobra.helperName || 'NÃO INFORMADO';

      const resolvedItem = resolveOfficialCatalogItem(sobra.assetId, sobra.assetName, products, activeAssets);
      const unitPrice = getStandardItemCost(resolvedItem.code, resolvedItem.description, activeAssets, products);
      const diffAbs = sobra.diffQty || 1;
      const key = `calibrated-ag-sobra-${sobra.auditId}-${resolvedItem.code}-${idx}`;

      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push({
          id: key,
          auditId: sobra.auditId,
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
          tipo: 'SOBRA',
          physicalQty: sobra.physicalQty,
          fiscalQty: sobra.fiscalQty,
          diffQty: diffAbs,
          unitHectoliters: 0,
          totalHectoliters: 0,
          unitPriceReais: unitPrice,
          totalPriceReais: diffAbs * unitPrice,
          status: 'CONCLUIDO',
          notes: `Sobra de Ativo de Giro conferida por ${sobra.conferente}`
        });
      }
    });

    // 3. Incorporate Operational Actions of Sobras and Faltas (P.A. e A.G.)
    DEFAULT_OPERATIONAL_ACTIONS.forEach((act, idx) => {
      if (act.type === 'falta' || act.type === 'sobra') {
        const dateYMD = normalizeDateToYMD(act.startDate || '2026-08-01');
        const formattedDate = formatDateToPtBR(dateYMD);
        const routeMap = (act.routeMap || '00000').toUpperCase().trim();
        const plate = (act.plate || 'FROTA').toUpperCase().trim();
        const driverName = act.colaboradorName || 'MOTORISTA OPERAÇÃO';
        const isSobra = act.type === 'sobra';
        const diffAbs = act.quantity || 1;
        
        const resolvedItem = resolveOfficialCatalogItem(null, act.productOrAsset, products, activeAssets);
        const isAG = resolvedItem.segment === 'AG';
        
        let unitPrice = 45.0;
        let hl = 0;
        if (isAG) {
          unitPrice = getStandardItemCost(resolvedItem.code, resolvedItem.description, activeAssets, products);
        } else {
          unitPrice = getSkuClosedPrice(resolvedItem.code, resolvedItem.cost || 45.0, products, resolvedItem.description);
          hl = getProductHectoliters(resolvedItem.code, resolvedItem.description, diffAbs);
        }

        const vNorm = (id: string) => (id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const fNorm = vNorm(act.id.replace('act', 'val'));

        const relatedVale = vales.find(v => vNorm(v.id) === fNorm) ||
                            valeMap.get(act.id.replace('act-', 'val_')) || 
                            valeMap.get(act.routeMap || '') || 
                            vales.find(v => (act.routeMap && v.routeMap === act.routeMap) || (act.routeMap && v.descricao.includes(act.routeMap)));

        const key = `op-action-${act.id}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          
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
            formattedDate,
            routeMap,
            plate,
            driverName,
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
  }, [audits, products, drivers, activeAssets, vales]);


  // Extract all available Months from the dataset (e.g. "2026-07", "2026-08")
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    allDiscrepancies.forEach(item => {
      if (item.date && item.date.length >= 7) {
        monthsSet.add(item.date.substring(0, 7));
      }
    });
    // Also check audits directly
    audits.forEach(a => {
      const d = normalizeDateToYMD(a.arrivalDate || a.routeDate || a.startTime);
      if (d && d.length >= 7) monthsSet.add(d.substring(0, 7));
    });
    return Array.from(monthsSet).sort().reverse();
  }, [allDiscrepancies, audits]);

  // Handle Quick Month Selection
  const handleSelectMonth = (monthVal: string) => {
    setSelectedMonth(monthVal);
    if (monthVal === 'todos') {
      setStartDate('');
      setEndDate('');
    } else {
      // Month format: YYYY-MM
      const [year, month] = monthVal.split('-').map(Number);
      const lastDay = new Date(year, month, 0).getDate();
      const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setStartDate(startStr);
      setEndDate(endStr);
    }
  };

  // Quick Range Presets
  const applyQuickPreset = (preset: 'hoje' | 'mes_atual' | 'mes_anterior' | 'ultimos_30' | 'todos') => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'hoje') {
      setSelectedMonth('todos');
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'mes_atual') {
      const y = today.getFullYear();
      const m = today.getMonth() + 1;
      const lastDay = new Date(y, m, 0).getDate();
      const s = `${y}-${String(m).padStart(2, '0')}-01`;
      const e = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
      setStartDate(s);
      setEndDate(e);
    } else if (preset === 'mes_anterior') {
      const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const y = prevDate.getFullYear();
      const m = prevDate.getMonth() + 1;
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
    } else if (preset === 'todos') {
      setSelectedMonth('todos');
      setStartDate('');
      setEndDate('');
    }
  };

  // Total pending count across all discrepancies
  const pendingCount = useMemo(() => {
    return allDiscrepancies.filter(d => d.status === 'PENDENTE' && !d.valeId).length;
  }, [allDiscrepancies]);

  // Filtered List with Universal Date Matching and Turnover Sort
  const filteredDiscrepancies = useMemo(() => {
    return allDiscrepancies.filter(item => {
      // Tab filter: If in 'pendencias' tab, only show active unresolved discrepancies
      if (viewTab === 'pendencias') {
        const isPending = item.status === 'PENDENTE' && !item.valeId;
        if (!isPending) return false;
      }

      // Segment filter (PA vs AG vs Todos)
      if (segmentFilter !== 'todos' && item.segment !== segmentFilter) return false;

      // Type filter (SOBRA vs FALTA vs Todos)
      if (filterType !== 'todos' && item.tipo !== filterType) return false;

      // Date range filter with robust normalization
      if (startDate || endDate) {
        if (!isDateInRange(item.date, startDate, endDate)) return false;
      }

      // Driver filter
      if (selectedDriver && item.driverName !== selectedDriver) return false;

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchProd = item.itemDescription.toLowerCase().includes(q) || item.itemCode.toLowerCase().includes(q);
        const matchMap = item.routeMap.toLowerCase().includes(q);
        const matchPlate = item.plate.toLowerCase().includes(q);
        const matchDriver = item.driverName.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        return matchProd || matchMap || matchPlate || matchDriver || matchCategory;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'turnover') {
        const rankA = getTurnoverRank(a.itemCode);
        const rankB = getTurnoverRank(b.itemCode);
        if (rankA !== rankB) {
          comparison = rankA - rankB; // Rank 1 (maior saída) no topo
        } else {
          comparison = b.totalPriceReais - a.totalPriceReais;
        }
      } else if (sortField === 'date') {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === 'totalPrice') {
        comparison = a.totalPriceReais - b.totalPriceReais;
      } else if (sortField === 'totalHl') {
        comparison = a.totalHectoliters - b.totalHectoliters;
      } else if (sortField === 'qty') {
        comparison = a.diffQty - b.diffQty;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allDiscrepancies, viewTab, segmentFilter, filterType, startDate, endDate, selectedDriver, searchQuery, sortField, sortDirection]);

  // Reset page to 1 when filters or tab change
  const totalPages = Math.max(1, Math.ceil(filteredDiscrepancies.length / itemsPerPage));
  
  // Visible discrepancies: If pendencias tab, strictly top 5 pending items of highest turnover/priority.
  // If historico tab, full paginated list.
  const displayedDiscrepancies = useMemo(() => {
    if (viewTab === 'pendencias') {
      return filteredDiscrepancies.slice(0, 5);
    }
    const safePage = Math.min(currentPage, totalPages);
    const startIdx = (safePage - 1) * itemsPerPage;
    return filteredDiscrepancies.slice(startIdx, startIdx + itemsPerPage);
  }, [viewTab, filteredDiscrepancies, currentPage, itemsPerPage, totalPages]);

  // Aggregate Metrics
  const summaryMetrics = useMemo(() => {
    let totalSobrasReais = 0;
    let totalFaltasReais = 0;
    let totalSobrasHl = 0;
    let totalFaltasHl = 0;
    let totalSobrasUnits = 0;
    let totalFaltasUnits = 0;
    let sobrasCount = 0;
    let faltasCount = 0;

    let paSobrasReais = 0;
    let paFaltasReais = 0;
    let agSobrasReais = 0;
    let agFaltasReais = 0;

    filteredDiscrepancies.forEach(item => {
      if (item.tipo === 'SOBRA') {
        totalSobrasReais += item.totalPriceReais;
        totalSobrasHl += item.totalHectoliters;
        totalSobrasUnits += item.diffQty;
        sobrasCount++;
        if (item.segment === 'PA') paSobrasReais += item.totalPriceReais;
        else agSobrasReais += item.totalPriceReais;
      } else {
        totalFaltasReais += item.totalPriceReais;
        totalFaltasHl += item.totalHectoliters;
        totalFaltasUnits += item.diffQty;
        faltasCount++;
        if (item.segment === 'PA') paFaltasReais += item.totalPriceReais;
        else agFaltasReais += item.totalPriceReais;
      }
    });

    const saldoLiquidoReais = totalSobrasReais - totalFaltasReais;
    const saldoLiquidoHl = totalSobrasHl - totalFaltasHl;
    const saldoLiquidoUnits = totalSobrasUnits - totalFaltasUnits;

    return {
      totalSobrasReais,
      totalFaltasReais,
      totalSobrasHl,
      totalFaltasHl,
      totalSobrasUnits,
      totalFaltasUnits,
      saldoLiquidoReais,
      saldoLiquidoHl,
      saldoLiquidoUnits,
      sobrasCount,
      faltasCount,
      paSobrasReais,
      paFaltasReais,
      agSobrasReais,
      agFaltasReais
    };
  }, [filteredDiscrepancies]);

  // Top Items Ranking with Discrepancies - Prioritizing Turnover and Volume
  const topDiscrepancies = useMemo(() => {
    const map = new Map<string, {
      code: string;
      desc: string;
      segment: 'PA' | 'AG';
      sobraQty: number;
      faltaQty: number;
      sobraVal: number;
      faltaVal: number;
      sobraHl: number;
      faltaHl: number;
      turnoverRank: number;
    }>();

    filteredDiscrepancies.forEach(item => {
      const key = `${item.segment}_${item.itemCode}`;
      if (!map.has(key)) {
        map.set(key, {
          code: item.itemCode,
          desc: item.itemDescription,
          segment: item.segment,
          sobraQty: 0,
          faltaQty: 0,
          sobraVal: 0,
          faltaVal: 0,
          sobraHl: 0,
          faltaHl: 0,
          turnoverRank: getTurnoverRank(item.itemCode)
        });
      }
      const entry = map.get(key)!;
      if (item.tipo === 'SOBRA') {
        entry.sobraQty += item.diffQty;
        entry.sobraVal += item.totalPriceReais;
        entry.sobraHl += item.totalHectoliters;
      } else {
        entry.faltaQty += item.diffQty;
        entry.faltaVal += item.totalPriceReais;
        entry.faltaHl += item.totalHectoliters;
      }
    });

    return Array.from(map.values())
      .sort((a, b) => {
        // Prioritize by turnover rank if both have ranks, else by financial volume
        if (a.turnoverRank !== 999 || b.turnoverRank !== 999) {
          if (a.turnoverRank !== b.turnoverRank) return a.turnoverRank - b.turnoverRank;
        }
        return (b.sobraVal + b.faltaVal) - (a.sobraVal + a.faltaVal);
      })
      .slice(0, 8);
  }, [filteredDiscrepancies]);

  // Driver Ranking with Discrepancies
  const topDriversDiscrepant = useMemo(() => {
    const map = new Map<string, { driverName: string; count: number; totalVal: number; totalHl: number }>();
    filteredDiscrepancies.forEach(item => {
      const dName = item.driverName || 'NÃO INFORMADO';
      if (!map.has(dName)) {
        map.set(dName, { driverName: dName, count: 0, totalVal: 0, totalHl: 0 });
      }
      const entry = map.get(dName)!;
      entry.count += 1;
      entry.totalVal += item.totalPriceReais;
      entry.totalHl += item.totalHectoliters;
    });

    return Array.from(map.values())
      .sort((a, b) => b.totalVal - a.totalVal)
      .slice(0, 5);
  }, [filteredDiscrepancies]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredDiscrepancies.length === 0) {
      alert('Nenhum registro para exportar.');
      return;
    }

    const headers = [
      'Segmento',
      'Data',
      'Mapa / Rota',
      'Placa',
      'Motorista',
      'Ajudante',
      'Tipo (Sobra/Falta)',
      'Codigo Item',
      'Descricao',
      'Categoria',
      'Fisico Apurado',
      'Fiscal / Sistema',
      'Divergencia (un)',
      'Volume (hL)',
      'Valor Unitario (R$)',
      'Valor Total (R$)',
      'Status / Acao',
      'Observacoes'
    ];

    const rows = filteredDiscrepancies.map(d => [
      d.segment === 'PA' ? 'Produto Acabado' : 'Ativo de Giro',
      d.formattedDate,
      `"${d.routeMap}"`,
      `"${d.plate}"`,
      `"${d.driverName}"`,
      `"${d.helperName}"`,
      d.tipo,
      `"${d.itemCode}"`,
      `"${d.itemDescription.replace(/"/g, '""')}"`,
      `"${d.category}"`,
      d.physicalQty,
      d.fiscalQty,
      d.diffQty,
      (d.totalHectoliters || 0).toFixed(3),
      (d.unitPriceReais || 0).toFixed(2),
      (d.totalPriceReais || 0).toFixed(2),
      d.status,
      `"${(d.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateTag = startDate && endDate ? `${startDate}_a_${endDate}` : 'geral';
    link.setAttribute('download', `Sobras_Faltas_PA_AG_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to get formatted month label
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
    <div className="space-y-6" id="sobras_faltas_pa_ag_root">
      {/* VIEW MODE TABS: PENDÊNCIAS vs HISTÓRICO GERAL */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setViewTab('pendencias');
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black font-sans transition flex items-center gap-2 cursor-pointer ${
              viewTab === 'pendencias'
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="h-4 w-4 text-amber-400" />
            <span>Fila Ativa (5 Pendências de Tratativa)</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
              viewTab === 'pendencias' ? 'bg-amber-500 text-slate-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {Math.min(5, pendingCount)}
            </span>
          </button>

          <button
            onClick={() => {
              setViewTab('historico');
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black font-sans transition flex items-center gap-2 cursor-pointer ${
              viewTab === 'historico'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Histórico Geral</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-black ${
              viewTab === 'historico' ? 'bg-white text-amber-900' : 'bg-slate-200 text-slate-700'
            }`}>
              {allDiscrepancies.length}
            </span>
          </button>
        </div>

        {/* METRIC SWITCHER */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
          <span className="text-[11px] font-mono font-bold text-slate-600 px-2 uppercase">Unidade:</span>
          <button
            onClick={() => setMetricUnit('reais')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
              metricUnit === 'reais'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Reais (R$)</span>
          </button>

          <button
            onClick={() => setMetricUnit('hectolitro')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
              metricUnit === 'hectolitro'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Beer className="h-3.5 w-3.5" />
            <span>Hectolitros (hL)</span>
          </button>

          <button
            onClick={() => setMetricUnit('unidades')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer ${
              metricUnit === 'unidades'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Unidades (un)</span>
          </button>
        </div>
      </div>

      {/* BANNER INFORMATIVO PARA A FILA ATIVA */}
      {viewTab === 'pendencias' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0 shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Fila Ativa de Tratativas (5 Ocorrências Prioritárias)</span>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold border border-amber-200">
                  Prioridade por Maior Saída
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Exibindo exatamente as 5 divergências pendentes de tratativa para otimização operacional e desengasgo da tela. 
                Todo o histórico consolidado, vales e notas emitidas ({allDiscrepancies.length} registros) estão centralizados na guia <strong>Histórico Geral</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setViewTab('historico');
              setCurrentPage(1);
            }}
            className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shrink-0 shadow-sm cursor-pointer"
          >
            <span>Acessar Histórico Geral ({allDiscrepancies.length})</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HEADER WITH CONTROLS & METRIC SWITCHER */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm">
                <Boxes className="h-5 w-5" />
              </span>
              <h3 className="font-sans font-black text-lg text-slate-900 tracking-tight">
                {viewTab === 'pendencias' 
                  ? 'Fila Ativa de Divergências (Sobras & Faltas Pendentes)' 
                  : 'Histórico Consolidado de Sobras e Faltas (P.A. & A.G.)'}
              </h3>
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
                {viewTab === 'pendencias' ? 'Fila Operacional' : 'Arquivo Histórico'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {viewTab === 'pendencias'
                ? 'Itens com divergência física vs fiscal aguardando regularização operacional, acerto de carga ou emissão de vale.'
                : 'Registro histórico completo com paginação otimizada, busca ágil e classificação de giro (Top Saída de Curva A a C).'}
            </p>
          </div>
        </div>

        {/* QUICK SEGMENT TOGGLE (PA vs AG vs TODOS) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-mono font-bold text-slate-500 uppercase mr-1">Segmento:</span>
          <button
            onClick={() => setSegmentFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
              segmentFilter === 'todos'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Todos (P.A. + A.G.)</span>
            <span className="text-[10px] bg-slate-700 text-slate-200 px-1.5 rounded-full font-mono">
              {allDiscrepancies.length}
            </span>
          </button>

          <button
            onClick={() => setSegmentFilter('PA')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
              segmentFilter === 'PA'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <Beer className="h-3.5 w-3.5 text-amber-400" />
            <span>Apenas Produto Acabado (P.A.)</span>
            <span className="text-[10px] bg-amber-800 text-amber-100 px-1.5 rounded-full font-mono">
              {allDiscrepancies.filter(d => d.segment === 'PA').length}
            </span>
          </button>

          <button
            onClick={() => setSegmentFilter('AG')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition flex items-center gap-1.5 cursor-pointer ${
              segmentFilter === 'AG'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <Boxes className="h-3.5 w-3.5 text-emerald-400" />
            <span>Apenas Ativos de Giro (A.G.)</span>
            <span className="text-[10px] bg-emerald-800 text-emerald-100 px-1.5 rounded-full font-mono">
              {allDiscrepancies.filter(d => d.segment === 'AG').length}
            </span>
          </button>
        </div>

        {/* QUICK DATE PRESETS & MONTH SELECTOR */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-600 uppercase flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-amber-600" />
              <span>Período Rápido:</span>
            </span>

            <button
              type="button"
              onClick={() => applyQuickPreset('todos')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                !startDate && !endDate && selectedMonth === 'todos'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Todos os Meses
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('mes_atual')}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                selectedMonth.startsWith(new Date().toISOString().substring(0, 7))
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Mês Atual
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('mes_anterior')}
              className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Mês Anterior (Julho)
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('ultimos_30')}
              className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Últimos 30 Dias
            </button>

            <button
              type="button"
              onClick={() => applyQuickPreset('hoje')}
              className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Hoje
            </button>
          </div>

          {/* DYNAMIC MONTH PICKER DROPDOWN */}
          {availableMonths.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xxs font-mono text-slate-500 font-bold uppercase">Mês Específico:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleSelectMonth(e.target.value)}
                className="bg-white border border-slate-300 text-xs font-mono rounded-lg px-2.5 py-1 font-bold text-slate-800 focus:ring-2 focus:ring-amber-500"
              >
                <option value="todos">Selecione o Mês...</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {getMonthLabel(m)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CUSTOM FILTER ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          {/* Search Query */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar produto, mapa, placa ou motorista..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            >
              <option value="todos">Tipo: Todos (Sobras & Faltas)</option>
              <option value="SOBRA">Apenas Sobras (+)</option>
              <option value="FALTA">Apenas Faltas (-)</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setSelectedMonth('todos');
              }}
              title="Data Inicial"
              className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* End Date */}
          <div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setSelectedMonth('todos');
              }}
              title="Data Final"
              className="w-full py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Export Button */}
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>
            {(searchQuery || filterType !== 'todos' || startDate || endDate || segmentFilter !== 'todos' || selectedDriver) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('todos');
                  setStartDate('');
                  setEndDate('');
                  setSelectedMonth('todos');
                  setSegmentFilter('todos');
                  setSelectedDriver('');
                }}
                className="py-1.5 px-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs transition cursor-pointer"
                title="Limpar todos os filtros"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: SOBRAS */}
        <div className="bg-white rounded-xl border border-emerald-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none -z-0" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-700 tracking-wider flex items-center gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Sobras Totais (+)</span>
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono font-black text-2xl text-emerald-900">
                  {metricUnit === 'reais' 
                    ? `R$ ${(summaryMetrics.totalSobrasReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : metricUnit === 'hectolitro'
                    ? `${(summaryMetrics.totalSobrasHl || 0).toFixed(3)} hL`
                    : `${(summaryMetrics.totalSobrasUnits || 0).toLocaleString('pt-BR')} un`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xxs font-mono text-emerald-800 mt-1">
                <span>{summaryMetrics.sobrasCount} ocorrências</span>
                <span>•</span>
                <span>P.A: R$ {(summaryMetrics.paSobrasReais || 0).toFixed(2)}</span>
                <span>•</span>
                <span>A.G: R$ {(summaryMetrics.agSobrasReais || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* CARD 2: FALTAS */}
        <div className="bg-white rounded-xl border border-rose-200 p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full pointer-events-none -z-0" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-rose-700 tracking-wider flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Faltas Totais (-)</span>
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono font-black text-2xl text-rose-900">
                  {metricUnit === 'reais' 
                    ? `R$ ${(summaryMetrics.totalFaltasReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : metricUnit === 'hectolitro'
                    ? `${(summaryMetrics.totalFaltasHl || 0).toFixed(3)} hL`
                    : `${(summaryMetrics.totalFaltasUnits || 0).toLocaleString('pt-BR')} un`}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xxs font-mono text-rose-800 mt-1">
                <span>{summaryMetrics.faltasCount} ocorrências</span>
                <span>•</span>
                <span>P.A: R$ {(summaryMetrics.paFaltasReais || 0).toFixed(2)}</span>
                <span>•</span>
                <span>A.G: R$ {(summaryMetrics.agFaltasReais || 0).toFixed(2)}</span>
              </div>
            </div>
            <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* CARD 3: SALDO LÍQUIDO */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">
                Balanço Líquido (Sobras - Faltas)
              </span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`font-mono font-black text-2xl ${
                  summaryMetrics.saldoLiquidoReais >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}>
                  {metricUnit === 'reais'
                    ? `${summaryMetrics.saldoLiquidoReais >= 0 ? '+' : ''}R$ ${(summaryMetrics.saldoLiquidoReais || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : metricUnit === 'hectolitro'
                    ? `${summaryMetrics.saldoLiquidoHl >= 0 ? '+' : ''}${(summaryMetrics.saldoLiquidoHl || 0).toFixed(3)} hL`
                    : `${summaryMetrics.saldoLiquidoUnits >= 0 ? '+' : ''}${(summaryMetrics.saldoLiquidoUnits || 0).toLocaleString('pt-BR')} un`}
                </span>
              </div>
              <div className="text-xxs font-mono text-slate-500 mt-1">
                {filteredDiscrepancies.length} registros no período filtrado
              </div>
            </div>
            <div className={`p-3 rounded-xl ${
              summaryMetrics.saldoLiquidoReais >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* RANKINGS SECTION (TOP PRODUTOS & TOP MOTORISTAS COM DESVIO) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP ITENS DISCREPANTES */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-amber-600" />
              <h4 className="font-sans font-bold text-xs text-slate-900 uppercase">
                Maiores Desvios por Produto / Ativo
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Top 6 Financeiro</span>
          </div>

          <div className="mt-3 space-y-2">
            {topDiscrepancies.length > 0 ? (
              topDiscrepancies.map((p) => {
                const totalVal = p.sobraVal + p.faltaVal;
                return (
                  <div key={`${p.segment}_${p.code}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-xs">
                    <div className="truncate max-w-[240px]">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          p.segment === 'PA' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {p.segment}
                        </span>
                        <span className="font-mono font-bold text-slate-500 text-[10px]">[{p.code}]</span>
                        <span className="font-bold text-slate-800 truncate" title={p.desc}>{p.desc}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {p.sobraQty > 0 && <span className="text-emerald-700 mr-2">+{p.sobraQty} un sobra</span>}
                        {p.faltaQty > 0 && <span className="text-rose-700">-{p.faltaQty} un falta</span>}
                      </div>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <div className="font-black text-slate-900 text-xs">
                        R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      {p.sobraHl + p.faltaHl > 0 && (
                        <div className="text-[10px] text-blue-600 font-bold">
                          {((p.sobraHl || 0) + (p.faltaHl || 0)).toFixed(2)} hL
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                Nenhum desvio registrado para o filtro atual.
              </div>
            )}
          </div>
        </div>

        {/* TOP MOTORISTAS COM DESVIOS */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-slate-700" />
              <h4 className="font-sans font-bold text-xs text-slate-900 uppercase">
                Concentração por Prestador / Motorista
              </h4>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Top 5 Volume</span>
          </div>

          <div className="mt-3 space-y-2">
            {topDriversDiscrepant.length > 0 ? (
              topDriversDiscrepant.map((drv) => (
                <div key={drv.driverName} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-xs">
                  <div className="truncate max-w-[240px]">
                    <div className="font-bold text-slate-900 truncate">{drv.driverName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {drv.count} ocorrências no período
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <div className="font-black text-slate-900 text-xs">
                      R$ {drv.totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                    {drv.totalHl > 0 && (
                      <div className="text-[10px] text-blue-600 font-bold">
                        {(drv.totalHl || 0).toFixed(2)} hL
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs italic">
                Nenhum motorista com desvios no período filtrado.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DETAILED DISCREPANCIES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h4 className="font-sans font-black text-sm text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-amber-600" />
              <span>Registros de Sobras e Faltas ({filteredDiscrepancies.length} encontrados)</span>
            </h4>
            <p className="text-xxs text-slate-500 mt-0.5">
              Valores calculados em {metricUnit === 'reais' ? 'Reais (R$)' : metricUnit === 'hectolitro' ? 'Hectolitros (hL)' : 'Unidades/Caixas'} a partir das conferências físicas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">Ordenar por:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-white border border-slate-200 text-xs font-mono rounded-lg px-2 py-1 font-bold text-slate-700"
            >
              <option value="turnover">Maior Saída / Giro (Top 1 a 170)</option>
              <option value="date">Data</option>
              <option value="totalPrice">Valor em R$</option>
              <option value="totalHl">Volume em hL</option>
              <option value="qty">Quantidade (un)</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-1 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900 cursor-pointer"
              title={sortDirection === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-mono text-[10px] uppercase tracking-wider">
                <th className="py-3 px-3 font-bold">Segmento</th>
                <th className="py-3 px-3 font-bold">Data</th>
                <th className="py-3 px-3 font-bold">Rota / Mapa</th>
                <th className="py-3 px-3 font-bold">Placa</th>
                <th className="py-3 px-3.5 font-bold">Motorista (Prestador)</th>
                <th className="py-3 px-3 font-bold">Tipo</th>
                <th className="py-3 px-3.5 font-bold">Código & Item</th>
                <th className="py-3 px-3 font-bold text-center">Físico vs Fiscal</th>
                <th className="py-3 px-3 font-bold text-right">Diferença (un)</th>
                <th className="py-3 px-3.5 font-bold text-right text-blue-300">Volume (hL)</th>
                <th className="py-3 px-3.5 font-bold text-right text-amber-300">Valor Total (R$)</th>
                <th className="py-3 px-3 font-bold text-center">Status / Ação</th>
                <th className="py-3 px-3 font-bold text-center">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-xs">
              {displayedDiscrepancies.length > 0 ? (
                displayedDiscrepancies.map((item) => {
                  const isSobra = item.tipo === 'SOBRA';
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors ${
                        isSobra ? 'hover:bg-emerald-50/40 bg-white' : 'hover:bg-rose-50/40 bg-white'
                      }`}
                    >
                      {/* SEGMENTO */}
                      <td className="py-2.5 px-3 font-bold whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.segment === 'PA' 
                            ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}>
                          {item.segment === 'PA' ? 'P.A.' : 'A.G.'}
                        </span>
                      </td>

                      {/* DATA */}
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.formattedDate}</span>
                        </div>
                      </td>

                      {/* ROTA / MAPA */}
                      <td className="py-2.5 px-3 font-bold text-slate-900 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                          {item.routeMap}
                        </span>
                      </td>

                      {/* PLACA */}
                      <td className="py-2.5 px-3 font-bold text-slate-800 whitespace-nowrap">
                        <span className="bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-xxs font-black text-slate-700">
                          {item.plate}
                        </span>
                      </td>

                      {/* MOTORISTA */}
                      <td className="py-2.5 px-3.5 font-sans font-medium text-slate-900 text-xs">
                        <div className="truncate max-w-[170px]" title={item.driverName}>
                          {item.driverName}
                        </div>
                        {item.helperName && item.helperName !== 'NÃO INFORMADO' && (
                          <span className="text-[10px] text-slate-400 font-sans block truncate max-w-[170px]">
                            Ajud: {item.helperName}
                          </span>
                        )}
                      </td>

                      {/* TIPO */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          isSobra 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {isSobra ? '+ SOBRA' : '- FALTA'}
                        </span>
                      </td>

                      {/* PRODUTO / ATIVO */}
                      <td className="py-2.5 px-3.5 font-sans">
                        <div className="font-mono font-bold text-slate-500 text-[10px]">
                          {item.itemCode}
                        </div>
                        <div className="font-bold text-slate-900 text-xs truncate max-w-[220px]" title={item.itemDescription}>
                          {item.itemDescription}
                        </div>
                      </td>

                      {/* FÍSICO vs FISCAL */}
                      <td className="py-2.5 px-3 text-center text-[11px]">
                        <span className="font-bold text-slate-900">{item.physicalQty}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className="text-slate-500">{item.fiscalQty}</span>
                      </td>

                      {/* DIFERENÇA (UN) */}
                      <td className="py-2.5 px-3 text-right font-extrabold">
                        <span className={isSobra ? 'text-emerald-700 text-xs' : 'text-rose-700 text-xs'}>
                          {isSobra ? `+${item.diffQty}` : `-${item.diffQty}`} un
                        </span>
                      </td>

                      {/* VOLUME (HL) */}
                      <td className="py-2.5 px-3.5 text-right font-extrabold text-blue-700 bg-blue-50/30">
                        {item.totalHectoliters > 0 
                          ? `${isSobra ? '+' : '-'}${(item.totalHectoliters || 0).toFixed(3)} hL` 
                          : '—'}
                      </td>

                      {/* VALOR TOTAL (R$) */}
                      <td className="py-2.5 px-3.5 text-right font-black text-xs bg-amber-50/40">
                        <span className={isSobra ? 'text-emerald-900' : 'text-rose-900'}>
                          {isSobra ? '+R$ ' : '-R$ '}
                          {item.totalPriceReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>

                      {/* STATUS / AÇÃO */}
                      <td className="py-2.5 px-3 text-center">
                        {item.valeId ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                            <Receipt className="h-3 w-3" />
                            <span>Vale Emitido</span>
                          </span>
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase font-sans ${
                            item.status === 'CONCLUIDO' 
                              ? 'bg-emerald-100 text-emerald-800'
                              : isSobra 
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                          }`}>
                            {item.status === 'CONCLUIDO' ? 'Concluído' : isSobra ? 'Aguardando Retorno' : 'Pendente de Ação'}
                          </span>
                        )}
                      </td>

                      {/* OBSERVAÇÃO & TRATATIVA */}
                      <td className="py-2.5 px-3 text-center">
                        {item.notes ? (
                          <button
                            onClick={() => setSelectedItemForNotes(item)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xxs font-sans font-bold transition cursor-pointer"
                            title={item.notes}
                          >
                            <MessageSquareText className="h-3 w-3 text-slate-500" />
                            <span className="truncate max-w-[80px] text-left">{item.notes}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 text-xxs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400 text-xs italic">
                    {viewTab === 'pendencias' 
                      ? 'Nenhuma divergência pendente de ação encontrada no filtro atual. Tudo regularizado!'
                      : 'Nenhum registro de sobra ou falta encontrado para os filtros selecionados.'}
                  </td>
                </tr>
              )}
            </tbody>

            {/* FOOTER TOTALIZADOR */}
            {filteredDiscrepancies.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white font-mono text-xs border-t-2 border-slate-700">
                  <td className="py-3 px-3.5 font-black uppercase text-amber-400" colSpan={5}>
                    TOTAL CONSOLIDADO ({filteredDiscrepancies.length} REGISTROS)
                  </td>
                  <td className="py-3 px-3 font-bold text-center text-slate-300">
                    {summaryMetrics.sobrasCount} S / {summaryMetrics.faltasCount} F
                  </td>
                  <td className="py-3 px-3.5 text-slate-300 font-sans text-xxs">
                    Saldo Líquido
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-slate-300">
                    —
                  </td>
                  <td className="py-3 px-3 text-right font-black text-white">
                    {summaryMetrics.saldoLiquidoUnits >= 0 ? `+${summaryMetrics.saldoLiquidoUnits}` : summaryMetrics.saldoLiquidoUnits} un
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-sm text-blue-300 bg-slate-800">
                    {summaryMetrics.saldoLiquidoHl >= 0 ? `+${(summaryMetrics.saldoLiquidoHl || 0).toFixed(3)}` : (summaryMetrics.saldoLiquidoHl || 0).toFixed(3)} hL
                  </td>
                  <td className="py-3 px-3.5 text-right font-black text-sm text-amber-300 bg-slate-800">
                    {summaryMetrics.saldoLiquidoReais >= 0 ? `+R$ ${summaryMetrics.saldoLiquidoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : `-R$ ${Math.abs(summaryMetrics.saldoLiquidoReais).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                  </td>
                  <td className="py-3 px-3 text-center text-xxs text-slate-400 uppercase" colSpan={2}>
                    Consolidado
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* PAGINAÇÃO OU CONTROLE DE FILA */}
        {filteredDiscrepancies.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            {viewTab === 'pendencias' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-3">
                <div className="flex items-center gap-2 text-slate-700 font-mono">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>Exibindo as <strong>{displayedDiscrepancies.length}</strong> ocorrências prioritárias pendentes de tratativa</span>
                </div>
                <button
                  onClick={() => {
                    setViewTab('historico');
                    setCurrentPage(1);
                  }}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold font-sans flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <span>Ver Histórico Geral ({allDiscrepancies.length} registros)</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-slate-600 font-mono">
                  <span>Exibindo</span>
                  <strong className="text-slate-900">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, filteredDiscrepancies.length)}
                  </strong>
                  <span>a</span>
                  <strong className="text-slate-900">
                    {Math.min(currentPage * itemsPerPage, filteredDiscrepancies.length)}
                  </strong>
                  <span>de</span>
                  <strong className="text-slate-900">{filteredDiscrepancies.length}</strong>
                  <span>registros</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-slate-600 font-mono text-xs">
                    <span>Itens por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-white border border-slate-300 rounded px-2 py-1 font-bold text-slate-800"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 transition ${
                        currentPage <= 1
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer shadow-xs'
                      }`}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>Anterior</span>
                    </button>

                    <span className="px-3 py-1 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg">
                      {currentPage} / {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1 transition ${
                        currentPage >= totalPages
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer shadow-xs'
                      }`}
                    >
                      <span>Próxima</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL DE OBSERVAÇÃO & TRATATIVA */}
      {selectedItemForNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${
                  selectedItemForNotes.tipo === 'SOBRA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">
                    Detalhes do Registro: {selectedItemForNotes.tipo === 'SOBRA' ? 'Sobra' : 'Falta'} de {selectedItemForNotes.segment === 'PA' ? 'P.A.' : 'A.G.'}
                  </h3>
                  <p className="text-xxs font-mono text-slate-500">
                    Rota: {selectedItemForNotes.routeMap} • Placa: {selectedItemForNotes.plate} • Data: {selectedItemForNotes.formattedDate}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForNotes(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 font-sans text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-xxs font-mono">
                  <div>
                    <span className="text-slate-400 block uppercase">Motorista</span>
                    <strong className="text-slate-800 text-xs">{selectedItemForNotes.driverName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Produto / Ativo</span>
                    <strong className="text-slate-800 text-xs">{selectedItemForNotes.itemDescription}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Divergência</span>
                    <strong className={selectedItemForNotes.tipo === 'SOBRA' ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {selectedItemForNotes.tipo === 'SOBRA' ? `+${selectedItemForNotes.diffQty}` : `-${selectedItemForNotes.diffQty}`} unidades (R$ {selectedItemForNotes.totalPriceReais.toFixed(2)})
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase">Status da Ação</span>
                    <strong className="text-slate-800">
                      {selectedItemForNotes.valeId ? 'Vale Emitido' : selectedItemForNotes.status}
                    </strong>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Observações e Tratativa Registradas:
                </label>
                <div className="p-3.5 bg-amber-50/50 border border-amber-200/80 rounded-xl text-slate-800 font-sans leading-relaxed text-xs">
                  {selectedItemForNotes.notes || 'Nenhuma observação informada.'}
                </div>
              </div>

              {selectedItemForNotes.valeId && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-purple-700" />
                    <div>
                      <span className="text-xxs font-bold text-purple-900 block">Vale Financeiro Vinculado</span>
                      <span className="text-xxs font-mono text-purple-700">Cód: {selectedItemForNotes.valeId}</span>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-black text-purple-900">
                    R$ {(selectedItemForNotes.valeValor || selectedItemForNotes.totalPriceReais).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedItemForNotes(null)}
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

export default SobrasFaltasPaView;

