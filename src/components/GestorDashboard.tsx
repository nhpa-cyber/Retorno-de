import React, { useState, useEffect } from 'react';
import { User, Driver, Vehicle, Product, ActiveAsset, AuditSession, UserRole, ImportedRoute, Vale } from '../types';
import { BarChart3, Users, Truck, ShoppingBag, Plus, Trash2, Shield, Clock, Landmark, Percent, CheckCircle2, AlertTriangle, RefreshCw, Eye, Search, Landmark as BankIcon, HardDrive, Camera, FileSpreadsheet, Sparkles, Check, FileCheck, CircleAlert, Edit, FileText, ZoomIn, ZoomOut, ArrowRight, ArrowLeft, UploadCloud, XCircle, Folder, Copy, SlidersHorizontal, TrendingUp, Box, Layers, Calendar, Database, Cloud, PlusCircle, X, BookOpen, FileCode, Download, Target, Filter, ChevronDown, ChevronUp, Table, LayoutGrid, Award, CalendarDays, BarChart2, Moon, Sun, Timer, Zap, CheckCircle, Sliders, Calculator } from 'lucide-react';
import { extractRetroactiveTravelRecords, calculateEFDOverallStats, calculateMonthlyEFDProgression, calculateDailyEFDProgression, calculateEmpilhadoresRanking, sanitizeEmpilhadorName, LogisticsTravelRecord, EFDOverallStats, MonthlyEFDProgression, DailyEFDProgression, EmpilhadorEFDStats, isUnloadedBefore14PM, resolveRegisteredDriver } from '../utils/efdCalculations';
import { getStandardItemCost } from '../utils/pricing';
import { mergeWithRetroactiveAudits } from '../data/retroactiveAuditsData';
import { CALIBRATED_SOBRAS_BASE } from '../data/calibratedSobrasData';
import { DEFAULT_OPERATIONAL_ACTIONS } from '../data/defaultOperationalActions';
import { normalizeDateToYMD, formatDateToPtBR, isDateInRange } from '../utils/dateUtils';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ReferenceLine, Cell, CartesianGrid, Line, ComposedChart } from 'recharts';
import { ImageDB, PhotoRecord } from '../imageDb';
import { DEFAULT_USERS, DEFAULT_PRODUCTS, DEFAULT_DRIVERS, DEFAULT_VEHICLES } from '../data';
import { DEFAULT_MANUAL_HTML } from './DefaultManualContent';
import { isClientFirebaseActive, getGeminiKeyFromFirestore, saveGeminiKeyToFirestore } from '../clientFirebase';
import { DatabaseSwitcher } from './DatabaseSwitcher';
import { triggerGlobalDatabaseSwitch } from '../utils/databaseScheduler';
import ExportDataView from './ExportDataView';
import { SobrasFaltasPaView } from './SobrasFaltasPaView';
import { AcoesOperacionaisView } from './AcoesOperacionaisView';
// @ts-ignore
import mammoth from 'mammoth';

interface GestorDashboardProps {
  currentUser: User;
  drivers: Driver[];
  vehicles: Vehicle[];
  products: Product[];
  activeAssets: ActiveAsset[];
  onSaveActiveAssets?: (assets: ActiveAsset[]) => void;
  audits: AuditSession[];
  users: User[];
  onSaveUsers: (users: User[]) => void;
  onSaveDrivers: (drivers: Driver[]) => void;
  onSaveVehicles: (vehicles: Vehicle[]) => void;
  onSaveProducts: (products: Product[]) => void;
  onSaveAudits: (audits: AuditSession[]) => void;
  importedRoutes: ImportedRoute[];
  onSaveImportedRoutes: (routes: ImportedRoute[]) => void;
  vales: Vale[];
  onSaveVales: (vales: Vale[]) => void;
  forceTab?: 'dashboard' | 'cadastros';
  auditLogs?: any[];
  customManualHTML?: string;
  onSaveCustomManual?: (html: string) => void;
  onResetPlatformData?: (skipConfirmation?: boolean) => void | Promise<void>;
}

export interface ConfigurableItemCost {
  id: string;
  code: string;
  name: string;
  category: 'Ativo de Giro' | 'Vasilhame' | 'Palete' | 'Produto Acabado';
  defaultCost: number;
  currentCost: number;
  description: string;
}

export const DEFAULT_CONFIGURABLE_ITEM_COSTS: ConfigurableItemCost[] = [
  {
    id: '899599',
    code: 'GARRAFEIRA_600',
    name: 'Garrafeira 600ml (GFE 600)',
    category: 'Ativo de Giro',
    defaultCost: 43.86,
    currentCost: 43.86,
    description: 'Engradado pl√°stico padr√£o Ambev para 24 garrafas de 600ml'
  },
  {
    id: '863059',
    code: 'GARRAFEIRA_300',
    name: 'Garrafeira Litrinho 300ml (GFE 300)',
    category: 'Ativo de Giro',
    defaultCost: 29.77,
    currentCost: 29.77,
    description: 'Engradado pl√°stico padr√£o Ambev para 24 garrafas de 300ml (litrinho)'
  },
  {
    id: '188005',
    code: 'GARRAFEIRA_1L',
    name: 'Garrafeira Litr√£o 1L (GFE 1L)',
    category: 'Ativo de Giro',
    defaultCost: 45.27,
    currentCost: 45.27,
    description: 'Engradado pl√°stico padr√£o Ambev para 12 garrafas de 1 Litro (litr√£o)'
  },
  {
    id: '198214',
    code: 'VASILHAME_300',
    name: 'Vasilhame Litrinho 300ml (300 RET)',
    category: 'Vasilhame',
    defaultCost: 0.66,
    currentCost: 0.66,
    description: 'Garrafa de vidro retorn√°vel 300ml (litrinho)'
  },
  {
    id: '27983',
    code: 'VASILHAME_600_AMBAR',
    name: 'Vasilhame 600ml √Çmbar (600 RET)',
    category: 'Vasilhame',
    defaultCost: 1.47,
    currentCost: 1.47,
    description: 'Garrafa de vidro retorn√°vel 600ml cor √¢mbar'
  },
  {
    id: '786238',
    code: 'VASILHAME_600_VERDE',
    name: 'Vasilhame 600ml Verde (600 RET)',
    category: 'Vasilhame',
    defaultCost: 1.47,
    currentCost: 1.47,
    description: 'Garrafa de vidro retorn√°vel 600ml cor verde (Heineken/Stella)'
  },
  {
    id: '188006',
    code: 'VASILHAME_1L',
    name: 'Vasilhame Litr√£o 1L (1L RET)',
    category: 'Vasilhame',
    defaultCost: 2.68,
    currentCost: 2.68,
    description: 'Garrafa de vidro retorn√°vel 1 Litro (litr√£o)'
  },
  {
    id: 'rgb_nab',
    code: 'RGB_NAB',
    name: 'Garrafa RGB NAB (RET)',
    category: 'Vasilhame',
    defaultCost: 2.06,
    currentCost: 2.06,
    description: 'Garrafa retorn√°vel de refrigerante n√£o alco√≥lico (RGB NAB)'
  },
  {
    id: 'barril_chopp',
    code: 'BARRIL_CHOPP',
    name: 'Barril Chopp',
    category: 'Ativo de Giro',
    defaultCost: 550.14,
    currentCost: 550.14,
    description: 'Barril de Chopp de inox'
  },
  {
    id: 'pal_pbr',
    code: 'PALETE_PBR1',
    name: 'Palete PBR 1',
    category: 'Palete',
    defaultCost: 9.79,
    currentCost: 9.79,
    description: 'Palete de madeira padr√£o PBR 1 homologado'
  },
  {
    id: 'pbr2',
    code: 'PALETE_PBR2',
    name: 'Palete PBR 2',
    category: 'Palete',
    defaultCost: 9.70,
    currentCost: 9.70,
    description: 'Palete de madeira padr√£o PBR 2'
  },
  {
    id: 'chapatex',
    code: 'CHAPATEX',
    name: 'Chapatex',
    category: 'Ativo de Giro',
    defaultCost: 8.62,
    currentCost: 8.62,
    description: 'Chapa de fibra de madeira/eucatex separadora de camadas'
  },
  {
    id: 'pa_comercial',
    code: 'PA_COMERCIAL',
    name: 'Produtos Acabados (P.A. Comercial)',
    category: 'Produto Acabado',
    defaultCost: 18.00,
    currentCost: 18.00,
    description: 'Cervejas e refrigerantes comerciais acabados'
  }
];

function AuditPhotoViewer({ auditId, onSelectPhoto }: { auditId: string; onSelectPhoto: (photo: PhotoRecord) => void }) {
  const [photos, setPhotos] = React.useState<PhotoRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

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
    return <div className="text-xxs text-slate-400 italic py-1">Nenhuma foto de evid√™ncia cadastrada.</div>;
  }

  return (
    <div className="space-y-1.5 pt-2">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Evid√™ncias Fotogr√°ficas (PA / AG / Refugos):</div>
      <div className="flex flex-wrap gap-2">
        {photos.map(p => (
          <div 
            key={p.id} 
            onClick={() => onSelectPhoto(p)}
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
    </div>
  );
}

export default function GestorDashboard({
  currentUser,
  drivers,
  vehicles,
  products,
  activeAssets,
  onSaveActiveAssets,
  audits,
  users,
  onSaveUsers,
  onSaveDrivers,
  onSaveVehicles,
  onSaveProducts,
  onSaveAudits,
  importedRoutes,
  onSaveImportedRoutes,
  vales = [],
  onSaveVales,
  forceTab,
  auditLogs = [],
  customManualHTML = '',
  onSaveCustomManual,
  onResetPlatformData
}: GestorDashboardProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedValeIdForUpload, setSelectedValeIdForUpload] = useState<string | null>(null);

  // States for Configurable Item Costs (Sobras & Refugos Unit Values)
  const [configurableCosts, setConfigurableCosts] = useState<ConfigurableItemCost[]>(() => {
    try {
      const saved = localStorage.getItem('ambev_custom_asset_costs_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return DEFAULT_CONFIGURABLE_ITEM_COSTS.map(def => {
            const found = parsed.find((p: any) => p.id === def.id || p.code === def.code);
            return found && typeof found.currentCost === 'number' ? { ...def, currentCost: found.currentCost } : def;
          });
        }
      }
    } catch (e) {
      console.warn('Error loading custom asset costs', e);
    }
    return DEFAULT_CONFIGURABLE_ITEM_COSTS;
  });

  const [costSaveNotice, setCostSaveNotice] = useState<string | null>(null);
  const [costCategoryFilter, setCostCategoryFilter] = useState<string>('TODOS');
  const [costSearchQuery, setCostSearchQuery] = useState<string>('');

  const handleUpdateItemCost = (itemId: string, newCostValue: number) => {
    const validCost = isNaN(newCostValue) ? 0 : Math.max(0, parseFloat(newCostValue.toFixed(2)));
    const updated = configurableCosts.map(item => {
      if (item.id === itemId || item.code === itemId) {
        return { ...item, currentCost: validCost };
      }
      return item;
    });
    setConfigurableCosts(updated);
    
    // Save permanently to localStorage
    try {
      localStorage.setItem('ambev_custom_asset_costs_v3', JSON.stringify(updated));
    } catch (e) {
      console.error('LocalStorage write error', e);
    }

    // Sync to activeAssets if callback provided
    if (onSaveActiveAssets && activeAssets && activeAssets.length > 0) {
      const updatedActiveAssets = activeAssets.map(a => {
        const matched = updated.find(u => u.id === a.id || u.code === a.id);
        if (matched) {
          return { ...a, cost: matched.currentCost };
        }
        return a;
      });
      onSaveActiveAssets(updatedActiveAssets);
    }

    setCostSaveNotice('‚úì Pre√ßo salvo permanentemente e rec√°lculo aplicado com sucesso!');
    setTimeout(() => setCostSaveNotice(null), 3500);
  };

  const handleResetItemCostsToDefault = () => {
    if (window.confirm('Deseja restaurar todos os valores unit√°rios para os padr√µes originais da tabela de f√°brica Ambev?')) {
      const resetList = DEFAULT_CONFIGURABLE_ITEM_COSTS.map(item => ({ ...item, currentCost: item.defaultCost }));
      setConfigurableCosts(resetList);
      try {
        localStorage.setItem('ambev_custom_asset_costs_v3', JSON.stringify(resetList));
      } catch (e) {}
      if (onSaveActiveAssets && activeAssets) {
        const updatedActiveAssets = activeAssets.map(a => {
          const matched = resetList.find(u => u.id === a.id || u.code === a.id);
          if (matched) {
            return { ...a, cost: matched.currentCost };
          }
          return a;
        });
        onSaveActiveAssets(updatedActiveAssets);
      }
      setCostSaveNotice('‚úì Valores restaurados para os padr√µes originais da tabela!');
      setTimeout(() => setCostSaveNotice(null), 3500);
    }
  };

  // Helper to resolve unit cost dynamically from configurable costs
  const getItemConfiguredCost = (assetOrItemId?: string, assetOrItemName?: string): number => {
    const targetId = (assetOrItemId || '').toLowerCase().trim();
    const targetName = (assetOrItemName || '').toLowerCase().trim();

    // 1. Direct match by ID or Code
    const directMatch = configurableCosts.find(c => 
      c.id.toLowerCase() === targetId || 
      c.code.toLowerCase() === targetId
    );
    if (directMatch && directMatch.currentCost > 0) return directMatch.currentCost;

    // 2. Match by Name keywords
    if (targetName.includes('garrafeira') && targetName.includes('600')) {
      return configurableCosts.find(c => c.id === '899599')?.currentCost || 43.86;
    }
    if (targetName.includes('garrafeira') && (targetName.includes('300') || targetName.includes('litrinho'))) {
      return configurableCosts.find(c => c.id === '863059')?.currentCost || 29.77;
    }
    if (targetName.includes('garrafeira') && (targetName.includes('1l') || targetName.includes('litr√£o') || targetName.includes('litrao'))) {
      return configurableCosts.find(c => c.id === '188005')?.currentCost || 45.27;
    }
    if ((targetName.includes('garrafa') || targetName.includes('vasilhame')) && (targetName.includes('300') || targetName.includes('litrinho'))) {
      return configurableCosts.find(c => c.id === '198214')?.currentCost || 0.66;
    }
    if ((targetName.includes('garrafa') || targetName.includes('vasilhame')) && targetName.includes('600') && targetName.includes('√¢mbar')) {
      return configurableCosts.find(c => c.id === '27983')?.currentCost || 1.47;
    }
    if ((targetName.includes('garrafa') || targetName.includes('vasilhame')) && targetName.includes('600') && (targetName.includes('verde') || targetName.includes('heineken') || targetName.includes('stella'))) {
      return configurableCosts.find(c => c.id === '786238')?.currentCost || 1.47;
    }
    if ((targetName.includes('garrafa') || targetName.includes('vasilhame')) && (targetName.includes('1l') || targetName.includes('litr√£o') || targetName.includes('litrao'))) {
      return configurableCosts.find(c => c.id === '188006')?.currentCost || 2.68;
    }
    if (targetName.includes('rgb') || targetName.includes('nab')) {
      return configurableCosts.find(c => c.id === 'rgb_nab')?.currentCost || 2.06;
    }
    if (targetName.includes('chopp') || targetName.includes('barril')) {
      return configurableCosts.find(c => c.id === 'barril_chopp')?.currentCost || 550.14;
    }
    if (targetName.includes('pbr 2') || targetName.includes('pbr2')) {
      return configurableCosts.find(c => c.id === 'pbr2')?.currentCost || 9.70;
    }
    if (targetName.includes('palete') || targetName.includes('pbr')) {
      return configurableCosts.find(c => c.id === 'pal_pbr')?.currentCost || 9.79;
    }
    if (targetName.includes('chapatex')) {
      return configurableCosts.find(c => c.id === 'chapatex')?.currentCost || 8.62;
    }

    // 3. Fallback to activeAssets or products
    const foundAsset = activeAssets?.find(a => (targetId && a.id === targetId) || (targetName && a.name.toLowerCase().trim() === targetName));
    if (foundAsset && foundAsset.cost && foundAsset.cost > 0) return foundAsset.cost;
    const foundProd = products?.find(p => (targetId && p.code === targetId) || (targetName && p.description.toLowerCase().trim() === targetName));
    if (foundProd && foundProd.cost && foundProd.cost > 0) return foundProd.cost;

    return 8.62;
  };

  // States for prestadores ranking controls
  const [rankingSortMetric, setRankingSortMetric] = useState<'valor' | 'itens' | 'viagens' | 'hecto'>('valor');
  const [rankingRoleFilter, setRankingRoleFilter] = useState<'TODOS' | 'MOTORISTA' | 'AJUDANTE'>('TODOS');
  const [rankingSearch, setRankingSearch] = useState('');

  // States for EFD (Efici√™ncia de Descarregamento) & D1-D4 Histogram
  const [efdDateFilter, setEfdDateFilter] = useState<'todos' | 'hoje' | '7dias' | '30dias' | 'custom'>('todos');
  const [efdMonthFilter, setEfdMonthFilter] = useState<'todos' | '2026-02' | '2026-03' | '2026-04' | '2026-05' | '2026-06' | '2026-07' | '2026-08' | string>('todos');
  const [efdProgressionViewMode, setEfdProgressionViewMode] = useState<'mensal' | 'diario'>('mensal');
  const [efdCustomStartDate, setEfdCustomStartDate] = useState('');
  const [efdCustomEndDate, setEfdCustomEndDate] = useState('');
  const [efdStageFilter, setEfdStageFilter] = useState<'todos' | 'D0' | 'D1' | 'D2' | 'D3' | 'D4'>('todos');
  const [efdSearchTerm, setEfdSearchTerm] = useState('');
  const [efdOnlyPernoite, setEfdOnlyPernoite] = useState<boolean | null>(null);
  const [efdEmpilhadorFilter, setEfdEmpilhadorFilter] = useState<string>('todos');

  // States for manual sobra registration
  const [showManualSobraForm, setShowManualSobraForm] = useState(false);
  const [manualSobraProdCode, setManualSobraProdCode] = useState('');
  const [manualSobraQty, setManualSobraQty] = useState<number>(0);
  const [manualSobraRouteMap, setManualSobraRouteMap] = useState('');
  const [manualSobraPlate, setManualSobraPlate] = useState('');
  const [manualSobraDriverId, setManualSobraDriverId] = useState('');
  const [manualSobraDate, setManualSobraDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [manualSobraSearch, setManualSobraSearch] = useState('');
  const [isManualSobraProdDropdownOpen, setIsManualSobraProdDropdownOpen] = useState(false);
  const productDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsManualSobraProdDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const resetManualSobraForm = () => {
    setManualSobraProdCode('');
    setManualSobraQty(0);
    setManualSobraRouteMap('');
    setManualSobraPlate('');
    setManualSobraDriverId('');
    setManualSobraDate(new Date().toISOString().split('T')[0]);
    setManualSobraSearch('');
    setIsManualSobraProdDropdownOpen(false);
  };

  const handleSaveManualSobra = () => {
    if (!manualSobraProdCode) {
      alert('Por favor, selecione um produto.');
      return;
    }
    if (!manualSobraQty || manualSobraQty <= 0) {
      alert('Por favor, informe uma quantidade v√°lida maior que zero.');
      return;
    }
    if (!manualSobraRouteMap.trim()) {
      alert('Por favor, informe o mapa da rota.');
      return;
    }
    if (!manualSobraPlate) {
      alert('Por favor, selecione ou informe o ve√≠culo.');
      return;
    }
    if (!manualSobraDriverId) {
      alert('Por favor, selecione o motorista.');
      return;
    }
    if (!manualSobraDate) {
      alert('Por favor, informe a data da sobra.');
      return;
    }

    const selectedProduct = products.find(p => p.code === manualSobraProdCode);
    if (!selectedProduct) {
      alert('Produto selecionado n√£o foi encontrado na base de dados.');
      return;
    }

    const newSobraAudit: AuditSession = {
      id: 'manual_sobra_' + Date.now(),
      routeMap: manualSobraRouteMap.trim(),
      plate: manualSobraPlate,
      driverId: manualSobraDriverId,
      arrivalKm: 0,
      arrivalDate: manualSobraDate,
      status: 'finalizado_divergente',
      conferenteId: 'gestor_manual',
      items: [
        {
          productCode: selectedProduct.code,
          productDescription: selectedProduct.description,
          cost: selectedProduct.cost,
          physicalQty: manualSobraQty,
          fiscalQty: 0
        }
      ],
      assets: [],
      history: [
        {
          timestamp: new Date().toISOString(),
          action: 'Cadastro de Sobra Manual',
          user: currentUser.name,
          details: `Cadastro de sobra f√≠sica manual realizado pelo Gestor ${currentUser.name}. Produto: ${selectedProduct.description} [${selectedProduct.code}] | Qtd: ${manualSobraQty} cx. Rota: ${manualSobraRouteMap}.`
        }
      ],
      surplusFlowStatus: 'PENDENTE',
      surplusActionStatus: 'prazo_envio_ok'
    };

    const updatedAudits = [newSobraAudit, ...audits];
    onSaveAudits(updatedAudits);
    
    resetManualSobraForm();
    setShowManualSobraForm(false);
    alert('Sobra f√≠sica manual cadastrada com sucesso!');
  };

  // Vales Dashboard States
  const [valesSearch, setValesSearch] = useState('');
  const [valesFilter, setValesFilter] = useState<'todos' | 'PENDENTE_ASSINATURA' | 'ASSINADO' | 'COMPENSADO'>('todos');
  const [viewingValeDetails, setViewingValeDetails] = useState<Vale | null>(null);
  const [selectedValeIdForUploadDash, setSelectedValeIdForUploadDash] = useState<string | null>(null);
  const dashboardValeInputRef = React.useRef<HTMLInputElement>(null);

  // Refugo Dashboard Benchmark & Performance States
  const [refugoTargetFilter, setRefugoTargetFilter] = useState<'todos' | 'dentro' | 'acima'>('todos');
  const [refugoSearchQuery, setRefugoSearchQuery] = useState('');
  const [refugoPeriodFilter, setRefugoPeriodFilter] = useState<'todos' | 'mes_atual' | 'mes_anterior'>('todos');
  const [refugoViewMode, setRefugoViewMode] = useState<'cards' | 'table'>('table');
  const [refugoPage, setRefugoPage] = useState(1);
  const [expandedRefugoAuditIds, setExpandedRefugoAuditIds] = useState<Record<string, boolean>>({});
  const [refugoTimeGranularity, setRefugoTimeGranularity] = useState<'mes' | 'dia'>('mes');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [selectedBlitzDate, setSelectedBlitzDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showBlitzHistoryModal, setShowBlitzHistoryModal] = useState<boolean>(false);
  const [showSobrasAtivosDetailModal, setShowSobrasAtivosDetailModal] = useState<boolean>(false);
  const [showCostConfigModal, setShowCostConfigModal] = useState<boolean>(false);
  const [showRefugoTreatmentModal, setShowRefugoTreatmentModal] = useState<boolean>(false);
  const [refugoReductionPct, setRefugoReductionPct] = useState<number>(() => {
    const saved = localStorage.getItem('ambev_refugo_reduction_pct');
    return saved !== null && !isNaN(Number(saved)) ? Number(saved) : 23;
  });
  const [refugoChartMetric, setRefugoChartMetric] = useState<'financeiro_reais' | 'percentual'>('financeiro_reais');

  // Navigation for Gestor views
  const [gestorTab, setGestorTab] = useState<'dashboard' | 'cadastros' | 'sobras_faltas' | 'acoes' | 'map_tracking' | 'refugos_dashboard' | 'audit_logs' | 'historico'>(
    forceTab === 'cadastros' ? 'cadastros' : 'dashboard'
  );

  // General Audit and Photo History States
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'all' | 'ok' | 'divergentes'>('all');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [selectedHistoryAudit, setSelectedHistoryAudit] = useState<AuditSession | null>(null);
  const [historicoSubTab, setHistoricoSubTab] = useState<'auditorias' | 'sobras_vales'>('auditorias');
  const [actionsSearchQuery, setActionsSearchQuery] = useState('');
  const [actionsTypeFilter, setActionsTypeFilter] = useState<'all' | 'sobra' | 'vale' | 'baixa'>('all');
  const [onlyDownloadedActions, setOnlyDownloadedActions] = useState(false);

  // Custom Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  useEffect(() => {
    if (forceTab) {
      setGestorTab(forceTab === 'cadastros' ? 'cadastros' : 'dashboard');
    }
  }, [forceTab]);

  const [cadastroSubTab, setCadastroSubTab] = useState<'usuarios' | 'produtos' | 'veiculos' | 'motoristas' | 'manutencao' | 'firebase' | 'exportar' | 'manual_diretrizes' | 'simular_troca'>('usuarios');

  // Firebase Firestore Connection Status States
  const [firebaseStatus, setFirebaseStatus] = useState<{
    firebaseConnected: boolean;
    firestoreLoadedSuccessfully: boolean;
    firestoreQuotaExceeded: boolean;
    firestoreAttemptedConnection: boolean;
    storageConnected: boolean;
    projectId: string | null;
    databaseId: string;
    stats: {
      users: number;
      products: number;
      vehicles: number;
      drivers: number;
      audits: number;
      vales: number;
      photos: number;
    };
  } | null>(null);
  const [firebaseLoading, setFirebaseLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  const fetchFirebaseStatus = async () => {
    if (isClientFirebaseActive()) {
      setFirebaseStatus({
        firebaseConnected: true,
        firestoreLoadedSuccessfully: true,
        firestoreQuotaExceeded: false,
        firestoreAttemptedConnection: true,
        storageConnected: false,
        projectId: "Direct Client Mode (GitHub Pages)",
        databaseId: "(Firestore)",
        stats: {
          audits: audits.length,
          vales: vales.length,
          photos: 0
        }
      });
      return;
    }
    setFirebaseLoading(true);
    setFirebaseError(null);
    try {
      const res = await fetch('/api/firebase/status');
      const data = await res.json();
      if (data.success) {
        setFirebaseStatus({
          firebaseConnected: data.firebaseConnected,
          firestoreLoadedSuccessfully: data.firestoreLoadedSuccessfully,
          firestoreQuotaExceeded: data.firestoreQuotaExceeded,
          firestoreAttemptedConnection: data.firestoreAttemptedConnection,
          storageConnected: data.storageConnected,
          projectId: data.projectId,
          databaseId: data.databaseId,
          stats: data.stats
        });
      } else {
        setFirebaseError(data.error || 'Erro desconhecido ao carregar status do Firebase');
      }
    } catch (err: any) {
      setFirebaseError(err?.message || 'Falha na requisi√ß√£o ao servidor');
    } finally {
      setFirebaseLoading(false);
    }
  };

  const [formApiKey, setFormApiKey] = useState('');
  const [formAuthDomain, setFormAuthDomain] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formStorageBucket, setFormStorageBucket] = useState('');
  const [formMessagingSenderId, setFormMessagingSenderId] = useState('');
  const [formAppId, setFormAppId] = useState('');
  const [formMeasurementId, setFormMeasurementId] = useState('');
  const [formFirestoreDatabaseId, setFormFirestoreDatabaseId] = useState('');

  const [formGeminiApiKey, setFormGeminiApiKey] = useState('');
  const [geminiSaveLoading, setGeminiSaveLoading] = useState(false);
  const [geminiResult, setGeminiResult] = useState<{ success: boolean; message: string } | null>(null);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const fetchFirebaseConfig = async () => {
    let localGemini = '';

    if (isClientFirebaseActive()) {
      try {
        const firestoreGemini = await getGeminiKeyFromFirestore();
        if (firestoreGemini) {
          localGemini = firestoreGemini;
        }
      } catch (err) {
        console.warn('Erro ao carregar chave do Gemini do Firestore:', err);
      }
      setFormGeminiApiKey(localGemini);
      return;
    }

    setFormGeminiApiKey(localGemini);

    try {
      const res = await fetch('/api/firebase/config');
      const data = await res.json();
      if (data.success && data.config) {
        setFormApiKey(data.config.apiKey || '');
        setFormAuthDomain(data.config.authDomain || '');
        setFormProjectId(data.config.projectId || '');
        setFormStorageBucket(data.config.storageBucket || '');
        setFormMessagingSenderId(data.config.messagingSenderId || '');
        setFormAppId(data.config.appId || '');
        setFormMeasurementId(data.config.measurementId || '');
        setFormFirestoreDatabaseId(data.config.firestoreDatabaseId || 'default');
      }
    } catch (e) {
      console.error('Erro ao buscar configura√ß√£o do Firebase:', e);
    }
  };

  const handleSaveGeminiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeminiSaveLoading(true);
    setGeminiResult(null);
    try {
      const trimmedKey = formGeminiApiKey.trim();
      let extraMessage = "";
      if (trimmedKey) {
        const savedToFirestore = await saveGeminiKeyToFirestore(trimmedKey);
        if (savedToFirestore) {
          extraMessage = " e sincronizada de forma global no Firestore!";
        }
      }
      setGeminiResult({ success: true, message: `Chave API do Gemini salva com sucesso${extraMessage}` });
    } catch (err: any) {
      setGeminiResult({ success: false, message: err?.message || "Erro ao salvar a chave da I.A." });
    } finally {
      setGeminiSaveLoading(false);
    }
  };

  const handleSaveFirebaseConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formApiKey || !formProjectId) {
      alert("API Key e Project ID s√£o obrigat√≥rios!");
      return;
    }
    setSaveLoading(true);
    setTestResult(null);
    if (isClientFirebaseActive()) {
      try {
        const config = {
          apiKey: formApiKey.trim(),
          authDomain: formAuthDomain.trim(),
          projectId: formProjectId.trim(),
          storageBucket: formStorageBucket.trim(),
          messagingSenderId: formMessagingSenderId.trim(),
          appId: formAppId.trim(),
          measurementId: formMeasurementId.trim(),
          firestoreDatabaseId: formFirestoreDatabaseId.trim(),
        };
        localStorage.setItem('logiroute_firebase_client_config', JSON.stringify(config));
        setTestResult({ success: true, message: "Configura√ß√£o do Firebase salva localmente no navegador!" });
        fetchFirebaseStatus();
      } catch (err: any) {
        setTestResult({ success: false, message: err?.message || "Erro ao salvar localmente." });
      } finally {
        setSaveLoading(false);
      }
      return;
    }
    try {
      const res = await fetch('/api/firebase/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formApiKey.trim(),
          authDomain: formAuthDomain.trim(),
          projectId: formProjectId.trim(),
          storageBucket: formStorageBucket.trim(),
          messagingSenderId: formMessagingSenderId.trim(),
          appId: formAppId.trim(),
          measurementId: formMeasurementId.trim(),
          firestoreDatabaseId: formFirestoreDatabaseId.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Configura√ß√µes salvas e aplicadas com sucesso para todos os usu√°rios!" });
        fetchFirebaseStatus();
      } else {
        setTestResult({ success: false, message: data.error || "Erro ao salvar configura√ß√µes do Firebase." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Erro na conex√£o com o servidor." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleTestFirebaseConfig = async () => {
    if (!formApiKey || !formProjectId) {
      alert("API Key e Project ID s√£o obrigat√≥rios para testar a conex√£o!");
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    if (isClientFirebaseActive()) {
      setTestResult({ success: true, message: "Em modo cliente direto, a conex√£o √© verificada dinamicamente pelo SDK." });
      setTestLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/firebase/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: formApiKey.trim(),
          authDomain: formAuthDomain.trim(),
          projectId: formProjectId.trim(),
          storageBucket: formStorageBucket.trim(),
          messagingSenderId: formMessagingSenderId.trim(),
          appId: formAppId.trim(),
          measurementId: formMeasurementId.trim(),
          firestoreDatabaseId: formFirestoreDatabaseId.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: "Teste bem sucedido! Conex√£o realizada com sucesso." });
      } else {
        setTestResult({ success: false, message: data.error || "Falha no teste de conex√£o. Verifique as credenciais." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Erro de rede ao testar conex√£o." });
    } finally {
      setTestLoading(false);
    }
  };

  const handleClearFirebaseConfig = async () => {
    if (!confirm("Tem certeza que deseja apagar a configura√ß√£o do Firebase? O sistema voltar√° ao modo offline/local.")) {
      return;
    }
    setClearLoading(true);
    setTestResult(null);
    if (isClientFirebaseActive()) {
      localStorage.removeItem('logiroute_firebase_client_config');
      setFormApiKey('');
      setFormAuthDomain('');
      setFormProjectId('');
      setFormStorageBucket('');
      setFormMessagingSenderId('');
      setFormAppId('');
      setFormMeasurementId('');
      setFormFirestoreDatabaseId('default');
      setTestResult({ success: true, message: "Configura√ß√£o do Firebase removida." });
      fetchFirebaseStatus();
      setClearLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/firebase/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFormApiKey('');
        setFormAuthDomain('');
        setFormProjectId('');
        setFormStorageBucket('');
        setFormMessagingSenderId('');
        setFormAppId('');
        setFormMeasurementId('');
        setFormFirestoreDatabaseId('default');
        setTestResult({ success: true, message: "Configura√ß√£o apagada e retornada para modo offline/local." });
        fetchFirebaseStatus();
      } else {
        setTestResult({ success: false, message: data.error || "Erro ao apagar configura√ß√µes." });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || "Erro de rede ao limpar conex√£o." });
    } finally {
      setClearLoading(false);
    }
  };

  useEffect(() => {
    if (cadastroSubTab === 'firebase' && currentUser.role === 'gestor') {
      fetchFirebaseStatus();
      fetchFirebaseConfig();
    }
  }, [cadastroSubTab]);

  // Annual export & reset states
  const [resetConfirmWord, setResetConfirmWord] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);

  const handleExportAnnualBackup = () => {
    const backupData = {
      audits,
      importedRoutes,
      timestamp: new Date().toISOString(),
      year: new Date().getFullYear(),
      version: "1.0",
      app: "Pau Brasil Guarabira Logistics Platform"
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `paubrasil_guarabira_backup_anual_${new Date().getFullYear()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    alert("Backup anual exportado com sucesso! Arquivo JSON de transa√ß√µes gerado e baixado.");
  };

  const handleResetDatabaseWipe = async () => {
    if (resetConfirmWord !== 'RESETAR') {
      alert("Por favor, digite exatamente a palavra 'RESETAR' para autorizar a limpeza.");
      return;
    }

    if (resetPassword !== '!Bud0102') {
      alert("Senha de seguran√ßa incorreta! A limpeza n√£o foi autorizada.");
      return;
    }

    try {
      if (onResetPlatformData) {
        await onResetPlatformData(true);
      } else {
        onSaveAudits([]);
        onSaveImportedRoutes([]);
        await ImageDB.clearAllPhotos();
      }

      alert("Base de dados limpa com sucesso! Toda a mem√≥ria local, Firestore e transa√ß√µes foram resetadas para todos os usu√°rios.");
      setShowResetModal(false);
      setResetConfirmWord('');
      setResetPassword('');
    } catch (e) {
      alert("Erro ao realizar limpeza de dados: " + e);
    }
  };

  // Search filter inside tables
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDetailAction, setSelectedDetailAction] = useState<any>(null);

  // States for Sobras & Faltas and Map Status Tracking
  const [correctiveNotesMap, setCorrectiveNotesMap] = useState<Record<string, string>>({});
  const [actionStatusMap, setActionStatusMap] = useState<Record<string, string>>({});
  const [importDateFilter, setImportDateFilter] = useState(() => {
    if (importedRoutes && importedRoutes.length > 0) {
      const dates = Array.from(new Set(importedRoutes.map(r => r.routeDate).filter(Boolean))).sort().reverse();
      const today = new Date().toISOString().split('T')[0];
      if (dates.includes(today)) return today;
      if (dates.length > 0) return dates[0];
    }
    return new Date().toISOString().split('T')[0];
  });

  const handleUpdateAuditDiscrepancyAction = (
    auditId: string, 
    fields: { 
      surplusActionStatus?: 'prazo_envio_ok' | 'fora_do_prazo' | 'enviado_cliente';
      deficitActionStatus?: 'pendente_baixa' | 'baixado';
      correctiveActionNotes?: string;
    }
  ) => {
    const updatedAudits = audits.map(a => {
      if (a.id === auditId) {
        const now = new Date().toISOString();
        const isSent = fields.surplusActionStatus === 'enviado_cliente' || a.surplusActionStatus === 'enviado_cliente';
        const isBaixadoDeficit = fields.deficitActionStatus === 'baixado';
        
        return {
          ...a,
          ...fields,
          ...(isSent ? { surplusFlowStatus: 'ENVIADO' as const } : {}),
          history: [
            ...a.history,
            {
              timestamp: now,
              action: isSent 
                ? 'Enviado ao Cliente' 
                : isBaixadoDeficit 
                ? 'Baixa de Falta Realizada' 
                : 'A√ß√£o Corretiva Atualizada',
              user: currentUser.name,
              details: `Status de A√ß√£o: ${fields.surplusActionStatus || fields.deficitActionStatus || 'Atualizado'}. Observa√ß√£o Corretiva: ${fields.correctiveActionNotes || a.correctiveActionNotes || ''}`
            }
          ]
        };
      }
      return a;
    });
    onSaveAudits(updatedAudits);
    alert('A√ß√£o registrada com sucesso na auditoria do mapa!');
  };

  // 1. New User form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('conferente');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // 2. New Product form state
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdGroup, setNewProdGroup] = useState('CERVEJA');
  const [newProdUnit, setNewProdUnit] = useState('un');
  const [newProdPallet, setNewProdPallet] = useState(84);
  const [newProdCost, setNewProdCost] = useState<number | ''>('');
  const [newProdHectoFactor, setNewProdHectoFactor] = useState<number | ''>('');
  const [newProdPhotoUrl, setNewProdPhotoUrl] = useState('');

  // Product bulk import states
  const [isProductDragOver, setIsProductDragOver] = useState(false);
  const [productImportMode, setProductImportMode] = useState<'replace' | 'merge' | 'add'>('replace');

  // Manual template and database baseline import/export states
  const [isManualDragOver, setIsManualDragOver] = useState(false);
  const [manualImportData, setManualImportData] = useState<any | null>(null);
  const [manualImportError, setManualImportError] = useState<string | null>(null);
  const [manualImportMode, setManualImportMode] = useState<'merge' | 'replace'>('merge');
  const [manualImportSuccessMsg, setManualImportSuccessMsg] = useState<string | null>(null);

  // 3. New Vehicle form state
  const [newVehPlate, setNewVehPlate] = useState('');
  const [newVehCapacity, setNewVehCapacity] = useState<number | ''>('');

  // 4. New Driver/Helper form state
  const [newDrvId, setNewDrvId] = useState('');
  const [newDrvName, setNewDrvName] = useState('');
  const [newDrvRole, setNewDrvRole] = useState<'MOTORISTA' | 'AJUDANTE'>('MOTORISTA');
  const [newDrvCpf, setNewDrvCpf] = useState('');
  const [editingTempDriverId, setEditingTempDriverId] = useState('');

  // Function to calculate accuracy rate based on recheck history
  const calculateAuditAccuracy = (audit: AuditSession): number => {
    // A recheck occurred if the audit went through "reconferencia" state or has any rePhysicalQty set
    const hasReconf = audit.history.some(h => 
      h.action.toLowerCase().includes('reconfer√™ncia') || 
      h.action.toLowerCase().includes('recontagem')
    ) || audit.items.some(i => i.rePhysicalQty !== undefined) || audit.assets.some(a => a.rePhysicalQty !== undefined);

    if (!hasReconf) {
      return 100; // If no recheck was requested, conferente's initial count is considered 100% correct
    }

    let totalConferente = 0;
    let qtyDivergente = 0;
    let changedAny = false;

    audit.items.forEach(item => {
      const initial = item.physicalQty;
      const final = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
      totalConferente += final;
      const diff = Math.abs(final - initial);
      qtyDivergente += diff;
      if (diff > 0) {
        changedAny = true;
      }
    });

    audit.assets.forEach(asset => {
      const initial = asset.physicalQty;
      const final = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
      totalConferente += final;
      const diff = Math.abs(final - initial);
      qtyDivergente += diff;
      if (diff > 0) {
        changedAny = true;
      }
    });

    if (!changedAny) {
      return 100; // If nothing changed during recheck, accuracy is 100%
    }

    if (totalConferente === 0) {
      return qtyDivergente === 0 ? 100 : 0;
    }

    return Math.max(0, (1 - qtyDivergente / totalConferente) * 100);
  };

  // Memoized high-level stats for manager dashboard to ensure fast switching and typing
  const {
    finishedAudits,
    totalAuditsCount,
    okAuditsCount,
    matchRate,
    avgSeconds,
    avgMinsText,
    totalMissingCost,
    totalSurplusCost,
    productDiscrepancies,
    topPADiscrepancies,
    topAGDiscrepancies
  } = React.useMemo(() => {
    const finished = audits.filter(a => a.status === 'finalizado_ok' || a.status === 'finalizado_divergente');
    const totalCount = finished.length;
    const okCount = finished.filter(a => a.status === 'finalizado_ok').length;
    const rate = totalCount > 0 ? (finished.reduce((sum, a) => sum + calculateAuditAccuracy(a), 0) / totalCount) : 100;

    // Average physical audit duration in minutes
    const auditsWithTime = finished.filter(a => {
      if (!a.startTime || !a.endTime || !a.conferenteId) return false;
      const userObj = users.find(u => u.id === a.conferenteId || u.username === a.conferenteId)
        || DEFAULT_USERS.find(u => u.id === a.conferenteId || u.username === a.conferenteId);
      return userObj?.role === 'conferente';
    });
    
    const avgSecs = auditsWithTime.length === 0 ? 0 : Math.floor((auditsWithTime.reduce((sum, a) => {
      return sum + (new Date(a.endTime!).getTime() - new Date(a.startTime!).getTime());
    }, 0) / auditsWithTime.length) / 1000);

    const minsText = avgSecs > 0 ? `${Math.floor(avgSecs / 60)}m ${avgSecs % 60}s` : 'N/A';

    let missingCost = 0;
    let surplusCost = 0;
    const discMap: Record<string, { desc: string, group: string, code: string, missing: number, surplus: number, financial: number }> = {};

    finished.forEach(audit => {
      audit.items.forEach(item => {
        const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        const fiscal = item.fiscalQty ?? 0;
        const diff = physical - fiscal;
        
        if (diff !== 0) {
          if (!discMap[item.productCode]) {
            discMap[item.productCode] = {
              code: item.productCode,
              desc: item.productDescription,
              group: 'PRODUTO',
              missing: 0,
              surplus: 0,
              financial: 0
            };
          }
          
          if (diff < 0) {
            const absDiff = Math.abs(diff);
            missingCost += absDiff * item.cost;
            discMap[item.productCode].missing += absDiff;
            discMap[item.productCode].financial -= absDiff * item.cost;
          } else {
            surplusCost += diff * item.cost;
            discMap[item.productCode].surplus += diff;
            discMap[item.productCode].financial += diff * item.cost;
          }
        }
      });

      audit.assets.forEach(asset => {
        const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        const fiscal = asset.fiscalQty ?? 0;
        const diff = physical - fiscal;

        if (diff !== 0) {
          const key = `ASSET_${asset.assetId}`;
          if (!discMap[key]) {
            discMap[key] = {
              code: asset.assetId.toUpperCase(),
              desc: asset.assetName,
              group: 'ATIVO DE GIRO',
              missing: 0,
              surplus: 0,
              financial: 0
            };
          }

          if (diff < 0) {
            const absDiff = Math.abs(diff);
            missingCost += absDiff * asset.cost;
            discMap[key].missing += absDiff;
            discMap[key].financial -= absDiff * asset.cost;
          } else {
            surplusCost += diff * asset.cost;
            discMap[key].surplus += diff;
            discMap[key].financial += diff * asset.cost;
          }
        }
      });
    });

    const topPA = Object.values(discMap)
      .filter(p => p.group === 'PRODUTO')
      .sort((a, b) => Math.abs(b.financial) - Math.abs(a.financial))
      .slice(0, 5);

    const topAG = Object.values(discMap)
      .filter(p => p.group === 'ATIVO DE GIRO')
      .sort((a, b) => Math.abs(b.financial) - Math.abs(a.financial))
      .slice(0, 5);

    return {
      finishedAudits: finished,
      totalAuditsCount: totalCount,
      okAuditsCount: okCount,
      matchRate: rate,
      avgSeconds: avgSecs,
      avgMinsText: minsText,
      totalMissingCost: missingCost,
      totalSurplusCost: surplusCost,
      productDiscrepancies: discMap,
      topPADiscrepancies: topPA,
      topAGDiscrepancies: topAG
    };
  }, [audits, users]);

  // EFD (Efici√™ncia de Descarregamento) & Histograma D1-D4 Calculations
  const travelRecords = React.useMemo(() => {
    return extractRetroactiveTravelRecords(audits, importedRoutes);
  }, [audits, importedRoutes]);

  const efdDateRange = React.useMemo(() => {
    if (efdMonthFilter !== 'todos') {
      const [year, month] = efdMonthFilter.split('-');
      const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
      return {
        startDate: `${efdMonthFilter}-01`,
        endDate: `${efdMonthFilter}-${String(daysInMonth).padStart(2, '0')}`
      };
    }
    const todayStr = new Date().toISOString().split('T')[0];
    if (efdDateFilter === 'hoje') {
      return { startDate: todayStr, endDate: todayStr };
    } else if (efdDateFilter === '7dias') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr };
    } else if (efdDateFilter === '30dias') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return { startDate: d.toISOString().split('T')[0], endDate: todayStr };
    } else if (efdDateFilter === 'custom' && (efdCustomStartDate || efdCustomEndDate)) {
      return { startDate: efdCustomStartDate || undefined, endDate: efdCustomEndDate || undefined };
    }
    return undefined;
  }, [efdMonthFilter, efdDateFilter, efdCustomStartDate, efdCustomEndDate]);

  // Stage-filtered records (D0, D1, D2, D3, D4 or all) to propagate cross-filtering across all EFD charts and rankings
  const stageFilteredTravelRecords = React.useMemo(() => {
    if (efdStageFilter === 'todos') return travelRecords;
    return travelRecords.filter(r => r.dayCycleStage === efdStageFilter);
  }, [travelRecords, efdStageFilter]);

  const efdStats: EFDOverallStats = React.useMemo(() => {
    return calculateEFDOverallStats(travelRecords, efdDateRange);
  }, [travelRecords, efdDateRange]);

  const empilhadoresRanking: EmpilhadorEFDStats[] = React.useMemo(() => {
    return calculateEmpilhadoresRanking(stageFilteredTravelRecords, importedRoutes, efdDateRange);
  }, [stageFilteredTravelRecords, importedRoutes, efdDateRange]);

  const monthlyEfdProgression: MonthlyEFDProgression[] = React.useMemo(() => {
    return calculateMonthlyEFDProgression(stageFilteredTravelRecords);
  }, [stageFilteredTravelRecords]);

  const targetDailyMonth = efdMonthFilter !== 'todos' ? efdMonthFilter : (efdDateRange?.startDate ? efdDateRange.startDate.substring(0, 7) : undefined);
  const dailyEfdProgression: DailyEFDProgression[] = React.useMemo(() => {
    return calculateDailyEFDProgression(stageFilteredTravelRecords, targetDailyMonth);
  }, [stageFilteredTravelRecords, targetDailyMonth]);

  const isDailyProgressionActive = efdMonthFilter !== 'todos' || (efdProgressionViewMode === 'diario' && dailyEfdProgression.length > 0);

  // Filtered list of travel records for interactive inspection & auditing table
  const filteredTravelRecords = React.useMemo(() => {
    let list = [...travelRecords];
    if (efdDateRange?.startDate) {
      list = list.filter(r => r.arrivalDate >= efdDateRange.startDate!);
    }
    if (efdDateRange?.endDate) {
      list = list.filter(r => r.arrivalDate <= efdDateRange.endDate!);
    }
    if (efdStageFilter !== 'todos') {
      list = list.filter(r => r.dayCycleStage === efdStageFilter);
    }
    if (efdOnlyPernoite !== null) {
      list = list.filter(r => r.isPernoite === efdOnlyPernoite);
    }
    if (efdEmpilhadorFilter !== 'todos') {
      list = list.filter(r => {
        const rawAssigned = r.operatorName || (isUnloadedBefore14PM(r.arrivalTime) ? 'Marivaldo Artur' : 'Jos√© Ronildo');
        const assigned = sanitizeEmpilhadorName(rawAssigned) || rawAssigned;
        return assigned.toLowerCase() === efdEmpilhadorFilter.toLowerCase();
      });
    }
    if (efdSearchTerm.trim()) {
      const term = efdSearchTerm.toLowerCase().trim();
      list = list.filter(r => 
        (r.routeMap || '').toLowerCase().includes(term) ||
        (r.plate || '').toLowerCase().includes(term) ||
        (r.driverName || '').toLowerCase().includes(term) ||
        (r.operatorName || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [travelRecords, efdDateRange, efdStageFilter, efdOnlyPernoite, efdEmpilhadorFilter, efdSearchTerm]);

  const handleTogglePernoiteInDashboard = (record: LogisticsTravelRecord) => {
    const targetMap = record.routeMap.toUpperCase().trim();
    const targetPlate = record.plate.toUpperCase().trim();
    const newPernoite = !record.isPernoite;

    // Update in imported routes
    if (importedRoutes && onSaveImportedRoutes) {
      let updatedRoutesCount = 0;
      const updatedRoutes = importedRoutes.map(r => {
        if (
          r.routeMap.toUpperCase().trim() === targetMap ||
          (targetPlate && targetPlate !== 'N/A' && r.plate.toUpperCase().trim() === targetPlate)
        ) {
          updatedRoutesCount++;
          return { ...r, isPernoite: newPernoite };
        }
        return r;
      });
      if (updatedRoutesCount > 0) {
        onSaveImportedRoutes(updatedRoutes);
      }
    }

    // Update in audits
    let updatedAuditsCount = 0;
    const updatedAudits = audits.map(a => {
      if (
        a.routeMap.toUpperCase().trim() === targetMap ||
        (targetPlate && targetPlate !== 'N/A' && a.plate.toUpperCase().trim() === targetPlate)
      ) {
        updatedAuditsCount++;
        return { ...a, isPernoite: newPernoite };
      }
      return a;
    });
    if (updatedAuditsCount > 0) {
      onSaveAudits(updatedAudits);
    }
  };

  // Photo storage stats state & retention policies
  const [photoStats, setPhotoStats] = useState<{ count: number; sizeMb: number }>({ count: 0, sizeMb: 0 });
  const [retentionDays, setRetentionDays] = useState(2);
  const [selectedPhotoForPreview, setSelectedPhotoForPreview] = useState<{ photoUrl: string; title: string; subtitle: string; category: string } | null>(null);
  const [selectedPhotoScale, setSelectedPhotoScale] = useState(1);
  const [selectedDeleteDate, setSelectedDeleteDate] = useState('');

  const uniqueDatesFromImported = React.useMemo(() => {
    return Array.from(new Set(importedRoutes.map(r => r.routeDate).filter(Boolean))).sort().reverse();
  }, [importedRoutes]);

  // Sobras & Faltas state for sub-tab and highlighted audit (redirect from dashboard alerts)
  const [sobrasSubTab, setSobrasSubTab] = useState<'pa_ativos' | 'operacional' | 'acoes'>('pa_ativos');
  const [highlightedAuditId, setHighlightedAuditId] = useState<string | null>(null);

  const loadPhotoStats = async () => {
    try {
      const stats = await ImageDB.getDatabaseStats();
      setPhotoStats(stats);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPhotoStats();
  }, [audits]);

  const handlePrunePhotos = async () => {
    requestConfirm(
      "Pol√≠tica de Limpeza",
      `Deseja aplicar a pol√≠tica de limpeza e apagar todas as fotos de prova com mais de ${retentionDays} dias de grava√ß√£o?`,
      async () => {
        const res = await ImageDB.prunePhotos(retentionDays);
        alert(`Faxina de armazenamento conclu√≠da! ${res.prunedCount} fotos antigas foram apagadas.`);
        loadPhotoStats();
      }
    );
  };

  const handleDeleteMapsByDate = () => {
    if (!selectedDeleteDate) return;
    
    const count = importedRoutes.filter(r => r.routeDate === selectedDeleteDate).length;
    
    requestConfirm(
      "üóëÔ∏è Excluir Mapas do Dia?",
      `Tem certeza que deseja excluir permanentemente todos os ${count} mapas importados na data ${new Date(selectedDeleteDate + 'T00:00:00').toLocaleDateString('pt-BR')}? Esta a√ß√£o remover√° as rotas, auditorias e vales associados a esses mapas de forma definitiva.`,
      () => {
        const routesToDelete = importedRoutes.filter(r => r.routeDate === selectedDeleteDate);
        const mapCodesToDelete = routesToDelete.map(r => r.routeMap.toUpperCase());
        
        const updatedRoutes = importedRoutes.filter(r => r.routeDate !== selectedDeleteDate);
        onSaveImportedRoutes(updatedRoutes);
        
        const updatedAudits = audits.filter(a => !mapCodesToDelete.includes(a.routeMap.toUpperCase()));
        onSaveAudits(updatedAudits);
        
        const updatedVales = vales.filter(v => !v.routeMap || !mapCodesToDelete.includes(v.routeMap.toUpperCase()));
        onSaveVales(updatedVales);
        
        alert(`Todos os ${count} mapas do dia ${new Date(selectedDeleteDate + 'T00:00:00').toLocaleDateString('pt-BR')} foram exclu√≠dos com sucesso.`);
        setSelectedDeleteDate('');
      }
    );
  };

  // List of all Sobras & Faltas actions performed, with route map, plate, trip date, action date, user and action
  const allSobrasFaltasActions = React.useMemo(() => {
    const list: {
      id: string;
      routeMap: string;
      plate: string;
      arrivalDate: string;
      timestamp: string;
      user: string;
      action: string;
      details?: string;
      auditStatus: string;
    }[] = [];

    audits.forEach(audit => {
      // Check if this audit had leftovers or shortages (excluding Chapatex)
      const hasProductSurplus = audit.items.some(item => {
        const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        return phys > (item.fiscalQty ?? 0);
      });
      const hasAssetSurplus = audit.assets.some(asset => {
        const idLower = (asset.assetId || '').toLowerCase();
        const nameUpper = (asset.assetName || '').toUpperCase();
        const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
        if (isChapatex) return false;
        const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        return phys > (asset.fiscalQty ?? 0);
      });
      const hasProductDeficit = audit.items.some(item => {
        const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        return phys < (item.fiscalQty ?? 0);
      });
      const hasAssetDeficit = audit.assets.some(asset => {
        const idLower = (asset.assetId || '').toLowerCase();
        const nameUpper = (asset.assetName || '').toUpperCase();
        const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
        if (isChapatex) return false;
        const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        return phys < (asset.fiscalQty ?? 0);
      });

      const isSobrasOrFaltas = hasProductSurplus || hasAssetSurplus || hasProductDeficit || hasAssetDeficit || audit.gestorAcknowledgedSurplus;
      if (!isSobrasOrFaltas) return;

      // Harvest history entries
      audit.history.forEach((h, index) => {
        const actionLower = h.action.toLowerCase();
        
        // Let's check if the action is aligned or ciente
        const isValeAction = actionLower.includes('vale') || actionLower.includes('gerado vale');
        const isEnvioAction = actionLower.includes('alinhad') || actionLower.includes('enviado');
        const isBaixaDiretaAction = actionLower.includes('baixa direta') || actionLower.includes('baixado');
        const isCommentAction = actionLower.includes('observa√ß√£o da a√ß√£o') || actionLower.includes('coment√°rio');
        const isSobraAction = actionLower.includes('sobra') || actionLower.includes('cadastro') || actionLower.includes('manual');
        const isCienteAction = actionLower.includes('ciente');

        // Include relevant actions
        if (!isValeAction && !isEnvioAction && !isBaixaDiretaAction && !isCommentAction && !isSobraAction && !isCienteAction) {
          return;
        }

        list.push({
          id: `${audit.id}_h_${index}`,
          routeMap: audit.routeMap,
          plate: audit.plate,
          arrivalDate: audit.arrivalDate,
          timestamp: h.timestamp,
          user: h.user,
          action: h.action,
          details: h.details || audit.correctiveActionNotes || audit.reconciliationNotes,
          auditStatus: audit.status
        });
      });
    });

    // Also harvest vales
    vales.forEach(vale => {
      const alreadyInList = list.some(item => item.routeMap === vale.routeMap && item.action.toLowerCase().includes('vale') && item.details?.includes(`R$ ${(vale.valor || 0).toFixed(2)}`));
      if (!alreadyInList) {
        list.push({
          id: `vale_${vale.id}`,
          routeMap: vale.routeMap || 'AVULSO',
          plate: 'N/A',
          arrivalDate: vale.dataGeracao,
          timestamp: vale.dataGeracao + 'T12:00:00.000Z',
          user: vale.colaboradorRole || 'Sistema',
          action: `Vale Financeiro: R$ ${(vale.valor || 0).toFixed(2)} (${vale.colaboradorName})`,
          details: `Prestador: ${vale.colaboradorName} (${vale.colaboradorRole}). Motivo: ${vale.descricao}. Status: ${vale.status}${vale.acknowledgedByGestor ? ' - Ciente do Gestor' : ''}`,
          auditStatus: 'finalizado_divergente'
        });
      }
    });

    // Also harvest calibrated AG Sobras actions (Ativos de Giro calibrados em ~R$ 500,00)
    CALIBRATED_SOBRAS_BASE.forEach((sobra, index) => {
      const alreadyInList = list.some(item => item.id === `calibrated_sobra_action_${sobra.auditId}_${sobra.assetId}_${index}`);
      if (!alreadyInList) {
        list.push({
          id: `calibrated_sobra_action_${sobra.auditId}_${sobra.assetId}_${index}`,
          routeMap: sobra.routeMap || 'MAPA-AG',
          plate: sobra.plate || 'FROTA',
          arrivalDate: sobra.date,
          timestamp: `${sobra.date}T16:30:00.000Z`,
          user: sobra.conferente || 'Conferente',
          action: `Sobra de Ativo de Giro: ${sobra.diffQty}x ${sobra.assetName}`,
          details: `Colaborador: ${sobra.helperName} | Motorista ID: ${sobra.driverId}. Confer√™ncia realizada por ${sobra.conferente}. Sobra regularizada e integrada ao estoque.`,
          auditStatus: 'finalizado_ok'
        });
      }
    });

    // Also harvest operational actions related to sobras and faltas
    DEFAULT_OPERATIONAL_ACTIONS.forEach(act => {
      if (act.type === 'falta' || act.type === 'sobra') {
        const alreadyInList = list.some(item => item.id === `op_act_${act.id}`);
        if (!alreadyInList) {
          list.push({
            id: `op_act_${act.id}`,
            routeMap: act.routeMap || 'MAPA-ROTA',
            plate: act.plate || 'FROTA',
            arrivalDate: act.startDate,
            timestamp: act.createdAt || `${act.startDate}T08:00:00.000Z`,
            user: act.responsibleName || 'Djeandrson',
            action: act.type === 'falta' ? `Tratativa de Falta: ${act.quantity || 1} un (${act.colaboradorName})` : `Apura√ß√£o de Sobra: ${act.quantity || 1} un (${act.colaboradorName})`,
            details: `Colaborador: ${act.colaboradorName} (${act.colaboradorRole || 'OPERACIONAL'}). Item: ${act.productOrAsset}. ${act.observations || ''} ${act.resolutionNotes ? 'Status: ' + act.resolutionNotes : ''}`,
            auditStatus: 'finalizado_ok'
          });
        }
      }
    });

    // Sort by timestamp descending (newest first)
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [audits, vales]);

  // Pre-indexed lookup map for product hectoliters factor to avoid O(N^2) inner loop lookups
  const productHectoMap = React.useMemo(() => {
    const map = new Map<string, number>();
    (products || []).forEach(p => {
      if (p.code) map.set(p.code, p.hectoFactor ?? 0);
    });
    return map;
  }, [products]);

  // Pre-indexed users map for conferente lookups
  const usersLookupMap = React.useMemo(() => {
    const map = new Map<string, User>();
    [...(DEFAULT_USERS || []), ...(users || [])].forEach(u => {
      if (u.id) map.set(u.id, u);
      if (u.username) map.set(u.username, u);
    });
    return map;
  }, [users]);

  // Calculate discrepancies by driver/helper (prestador de contas)
  interface DriverStats {
    id: string;
    name: string;
    role: 'MOTORISTA' | 'AJUDANTE';
    totalTrips: number;
    divergentTrips: number;
    totalMissingQty: number;
    totalSurplusQty: number;
    totalFinancialLoss: number;
    totalHectos: number;
  }

  const rankedDrivers = React.useMemo(() => {
    const driverStatsMap: Record<string, DriverStats> = {};

    // Initialize all known drivers/helpers to avoid blank states
    drivers.forEach(d => {
      driverStatsMap[d.id] = {
        id: d.id,
        name: d.name,
        role: d.role,
        totalTrips: 0,
        divergentTrips: 0,
        totalMissingQty: 0,
        totalSurplusQty: 0,
        totalFinancialLoss: 0,
        totalHectos: 0
      };
    });

    audits.forEach(audit => {
      if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return;

      const isDivergent = audit.status === 'finalizado_divergente';
      let missingQty = 0;
      let surplusQty = 0;
      let financialLoss = 0;
      let auditHectos = 0;

      audit.items.forEach(item => {
        const physical = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
        const fiscal = item.fiscalQty ?? 0;
        const diff = physical - fiscal;
        if (diff < 0) {
          missingQty += Math.abs(diff);
          financialLoss += Math.abs(diff) * item.cost;
        } else if (diff > 0) {
          surplusQty += diff;
        }

        if (diff !== 0) {
          const hectoFactor = productHectoMap.get(item.productCode) ?? 0;
          auditHectos += Math.abs(diff) * hectoFactor;
        }
      });

      audit.assets.forEach(asset => {
        const physical = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
        const fiscal = asset.fiscalQty ?? 0;
        const diff = physical - fiscal;
        if (diff < 0) {
          missingQty += Math.abs(diff);
          financialLoss += Math.abs(diff) * asset.cost;
        } else if (diff > 0) {
          surplusQty += diff;
        }
      });

      const addAuditToDriver = (dId: string, isHelper?: boolean) => {
        const resolved = resolveRegisteredDriver(dId, audit.routeMap || audit.id, drivers);
        const resolvedId = resolved.id;
        if (!driverStatsMap[resolvedId]) {
          const found = drivers.find(d => d.id === resolvedId) || DEFAULT_DRIVERS.find(d => d.id === resolvedId);
          driverStatsMap[resolvedId] = {
            id: resolvedId,
            name: resolved.name,
            role: isHelper ? 'AJUDANTE' : (found?.role || 'MOTORISTA'),
            totalTrips: 0,
            divergentTrips: 0,
            totalMissingQty: 0,
            totalSurplusQty: 0,
            totalFinancialLoss: 0,
            totalHectos: 0
          };
        }
        
        const d = driverStatsMap[resolvedId];
        d.totalTrips += 1;
        if (isDivergent) {
          d.divergentTrips += 1;
          d.totalMissingQty += missingQty;
          d.totalSurplusQty += surplusQty;
          d.totalFinancialLoss += financialLoss;
          d.totalHectos += auditHectos;
        }
      };

      if (audit.driverId) addAuditToDriver(audit.driverId, false);
      if (audit.helperId) addAuditToDriver(audit.helperId, true);
    });

    return Object.values(driverStatsMap)
      .filter(d => d.totalTrips > 0)
      .filter(d => {
        if (rankingRoleFilter === 'MOTORISTA') return d.role === 'MOTORISTA';
        if (rankingRoleFilter === 'AJUDANTE') return d.role === 'AJUDANTE';
        return true;
      })
      .filter(d => {
        if (!rankingSearch.trim()) return true;
        const q = rankingSearch.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.id.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (rankingSortMetric === 'valor') {
          const diffLoss = b.totalFinancialLoss - a.totalFinancialLoss;
          if (diffLoss !== 0) return diffLoss;
          return (b.totalMissingQty + b.totalSurplusQty) - (a.totalMissingQty + a.totalSurplusQty);
        } else if (rankingSortMetric === 'itens') {
          const diffQty = (b.totalMissingQty + b.totalSurplusQty) - (a.totalMissingQty + a.totalSurplusQty);
          if (diffQty !== 0) return diffQty;
          return b.totalFinancialLoss - a.totalFinancialLoss;
        } else if (rankingSortMetric === 'viagens') {
          const diffTrips = b.divergentTrips - a.divergentTrips;
          if (diffTrips !== 0) return diffTrips;
          return b.totalFinancialLoss - a.totalFinancialLoss;
        } else if (rankingSortMetric === 'hecto') {
          const diffHectos = b.totalHectos - a.totalHectos;
          if (diffHectos !== 0) return diffHectos;
          return b.totalFinancialLoss - a.totalFinancialLoss;
        }
        return 0;
      });
  }, [audits, drivers, productHectoMap, rankingRoleFilter, rankingSearch, rankingSortMetric]);

  // Productivity by Conferente
  interface ConferenteProductivityItem {
    id: string;
    name: string;
    username: string;
    count: number;
    totalSeconds: number;
    okCount: number;
    divergentCount: number;
    totalAccuracySum: number;
  }

  const confProductivity: Record<string, ConferenteProductivityItem> = React.useMemo(() => {
    const map: Record<string, ConferenteProductivityItem> = {};

    finishedAudits.forEach(audit => {
      if (audit.conferenteId && audit.startTime && audit.endTime) {
        const seconds = Math.max(0, Math.floor((new Date(audit.endTime).getTime() - new Date(audit.startTime).getTime()) / 1000));
        
        const userObj = usersLookupMap.get(audit.conferenteId);
        if (!userObj || userObj.role !== 'conferente') {
          return;
        }
        
        const confName = userObj.name;
        const confUsername = userObj.username;
        
        const key = audit.conferenteId;
        if (!map[key]) {
          map[key] = { 
            id: key,
            name: confName, 
            username: confUsername, 
            count: 0, 
            totalSeconds: 0,
            okCount: 0,
            divergentCount: 0,
            totalAccuracySum: 0
          };
        }
        
        map[key].count += 1;
        map[key].totalSeconds += seconds;
        map[key].totalAccuracySum += calculateAuditAccuracy(audit);
        if (audit.status === 'finalizado_ok') {
          map[key].okCount += 1;
        } else if (audit.status === 'finalizado_divergente') {
          map[key].divergentCount += 1;
        }
      }
    });
    return map;
  }, [finishedAudits, usersLookupMap]);

  // Calculation of Refugos (Waste/Avarias) statistics for Drivers, Motives tree, and Active Assets (Ativos de Giro)
  const driverRefugoMap: Record<string, { driverId: string; name: string; totalTripsWithRefugo: number; totalRefugoQty: number; reasons: Record<string, number> }> = {};
  const assetRefugoMap: Record<string, { assetId: string; assetName: string; totalQty: number; reasons: Record<string, number> }> = {};
  const globalRefugoMotiveMap: Record<string, number> = {
    'BICADA EXTERNA': 0,
    'BICADA INTERNA': 0,
    'QUEBRADA': 0,
    'SEGUNDA (OUTRAS EMPRESAS)': 0,
    'COLORA√á√ÉO FORA DO PADR√ÉO': 0,
    'TAMPADA': 0,
    'SUJIDADE INTERNA': 0,
    'SUJIDADE EXTERNA': 0,
    'GARRAFEIRA QUEBRADA': 0,
  };
  let totalRefugosOverallQty = 0;

  audits.forEach(audit => {
    if (!audit.refugos || audit.refugos.length === 0) return;

    const resolved = resolveRegisteredDriver(audit.driverId, audit.routeMap || audit.id, drivers);
    const drvName = resolved.name;
    const drvId = resolved.id;

    if (drvId === 'G1082' || drvName.toUpperCase().includes('CESARIO') || drvName.toUpperCase().includes('CES√ÅRIO')) {
      return;
    }

    if (!driverRefugoMap[drvId]) {
      driverRefugoMap[drvId] = {
        driverId: drvId,
        name: drvName,
        totalTripsWithRefugo: 0,
        totalRefugoQty: 0,
        reasons: {
          'BICADA EXTERNA': 0,
          'BICADA INTERNA': 0,
          'QUEBRADA': 0,
          'SEGUNDA (OUTRAS EMPRESAS)': 0,
          'COLORA√á√ÉO FORA DO PADR√ÉO': 0,
          'TAMPADA': 0,
          'SUJIDADE INTERNA': 0,
          'SUJIDADE EXTERNA': 0,
          'GARRAFEIRA QUEBRADA': 0,
        }
      };
    }

    driverRefugoMap[drvId].totalTripsWithRefugo += 1;

    audit.refugos.forEach(ref => {
      const q = ref.qty || 0;
      totalRefugosOverallQty += q;
      driverRefugoMap[drvId].totalRefugoQty += q;
      
      const rName = ref.reason;
      if (driverRefugoMap[drvId].reasons[rName] !== undefined) {
        driverRefugoMap[drvId].reasons[rName] += q;
      } else {
        driverRefugoMap[drvId].reasons[rName] = q;
      }

      if (globalRefugoMotiveMap[rName] !== undefined) {
        globalRefugoMotiveMap[rName] += q;
      } else {
        globalRefugoMotiveMap[rName] = q;
      }

      // Track asset rankings for refugo
      const aId = ref.assetId || 'desconhecido';
      const aName = ref.assetName || 'Ativo de Giro Desconhecido';
      if (!assetRefugoMap[aId]) {
        assetRefugoMap[aId] = {
          assetId: aId,
          assetName: aName,
          totalQty: 0,
          reasons: {}
        };
      }
      assetRefugoMap[aId].totalQty += q;
      assetRefugoMap[aId].reasons[rName] = (assetRefugoMap[aId].reasons[rName] || 0) + q;
    });
  });

  const rankedRefugoDrivers = Object.values(driverRefugoMap)
    .sort((a, b) => b.totalRefugoQty - a.totalRefugoQty);

  const rankedRefugoMotives = Object.entries(globalRefugoMotiveMap)
    .map(([motive, qty]) => ({
      motive,
      qty,
      percentage: totalRefugosOverallQty > 0 ? (qty / totalRefugosOverallQty) * 100 : 0
    }))
    .sort((a, b) => b.qty - a.qty);

  const rankedRefugoAssets = Object.values(assetRefugoMap)
    .map(asset => ({
      ...asset,
      percentage: totalRefugosOverallQty > 0 ? (asset.totalQty / totalRefugosOverallQty) * 100 : 0
    }))
    .sort((a, b) => b.totalQty - a.totalQty);

  // Compute Blitz metrics and ranking by license plate (placa)
  const plateBlitzMap: Record<string, {
    plate: string;
    blitzCount: number;
    boxesChecked: number;
    avariasFound: number;
  }> = {};

  let accumulatedBlitzCount = 0;
  let accumulatedBlitzBoxesChecked = 0;
  let accumulatedBlitzAvariasFound = 0;

  audits.forEach(audit => {
    if (audit.blitzBoxesChecked !== undefined) {
      accumulatedBlitzCount += 1;
      accumulatedBlitzBoxesChecked += audit.blitzBoxesChecked;
      accumulatedBlitzAvariasFound += audit.blitzAvariasFound || 0;

      const pl = (audit.plate || 'Desconhecida').trim().toUpperCase();
      if (!plateBlitzMap[pl]) {
        plateBlitzMap[pl] = {
          plate: pl,
          blitzCount: 0,
          boxesChecked: 0,
          avariasFound: 0
        };
      }
      plateBlitzMap[pl].blitzCount += 1;
      plateBlitzMap[pl].boxesChecked += audit.blitzBoxesChecked;
      plateBlitzMap[pl].avariasFound += audit.blitzAvariasFound || 0;
    }
  });

  const rankedBlitzPlates = Object.values(plateBlitzMap)
    .sort((a, b) => b.blitzCount - a.blitzCount || b.boxesChecked - a.boxesChecked);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N√£o informada';
    try {
      if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  };

  const getAuditDuration = (start?: string, end?: string) => {
    if (!start || !end) return 'N√£o registrado';
    try {
      const diffMs = new Date(end).getTime() - new Date(start).getTime();
      if (isNaN(diffMs) || diffMs < 0) return 'N/I';
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      return `${mins}m ${secs}s`;
    } catch (e) {
      return 'N/I';
    }
  };

  // Action Add User
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword) {
      alert('Por favor, preencha todos os campos, incluindo a senha.');
      return;
    }

    const formattedUsername = newUserUsername.trim().charAt(0).toUpperCase() + newUserUsername.trim().slice(1);
    const formattedName = newUserName.trim().charAt(0).toUpperCase() + newUserName.trim().slice(1);

    if (editingUserId) {
      // Editing Mode
      const exists = users.some(u => u.id !== editingUserId && u.username.toLowerCase() === formattedUsername.toLowerCase());
      if (exists) {
        alert('Este nome de usu√°rio j√° est√° cadastrado.');
        return;
      }
      const updatedUsers = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: formattedName,
            role: newUserRole,
            username: formattedUsername,
            password: newUserPassword.trim()
          };
        }
        return u;
      });
      onSaveUsers(updatedUsers);
      setEditingUserId(null);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      alert('Usu√°rio editado com sucesso!');
    } else {
      // Creation Mode
      const exists = users.some(u => u.username.toLowerCase() === formattedUsername.toLowerCase());
      if (exists) {
        alert('Este nome de usu√°rio j√° est√° cadastrado.');
        return;
      }
      const newUser: User = {
        id: 'usr_' + Date.now(),
        name: formattedName,
        role: newUserRole,
        username: formattedUsername,
        password: newUserPassword.trim()
      };
      onSaveUsers([...users, newUser]);
      setNewUserName('');
      setNewUserUsername('');
      setNewUserPassword('');
      alert('Usu√°rio cadastrado com sucesso!');
    }
  };

  const handleStartEditUser = (user: User) => {
    setEditingUserId(user.id);
    setNewUserName(user.name);
    setNewUserUsername(user.username);
    setNewUserPassword(user.password || '');
    setNewUserRole(user.role);
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserPassword('');
    setNewUserRole('conferente');
  };

  const handleRemoveUser = (id: string) => {
    if (id === currentUser.id) {
      alert('Voc√™ n√£o pode excluir o seu pr√≥prio usu√°rio logado!');
      return;
    }
    requestConfirm(
      "Excluir Colaborador",
      "Tem certeza de que deseja excluir este usu√°rio da plataforma?",
      () => {
        onSaveUsers(users.filter(u => u.id !== id));
        if (editingUserId === id) {
          handleCancelEditUser();
        }
      }
    );
  };

  // Action Add Product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdCode || !newProdDesc || !newProdCost) return;
    const exists = products.some(p => p.code === newProdCode);
    if (exists) {
      alert('J√° existe um produto cadastrado com este c√≥digo.');
      return;
    }
    const newProduct: Product = {
      code: newProdCode.trim(),
      description: newProdDesc.trim().toUpperCase(),
      group: newProdGroup,
      unit: newProdUnit,
      palletFactor: Number(newProdPallet) || 1,
      skuFactor: 1,
      hectoFactor: Number(newProdHectoFactor) || 0.01,
      cost: Number(newProdCost),
      curve: 'C'
    };
    onSaveProducts([newProduct, ...products]);
    setNewProdCode('');
    setNewProdDesc('');
    setNewProdCost('');
    setNewProdHectoFactor('');
    alert('Produto cadastrado com sucesso!');
  };

  const handleProductImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      // Handle carriage returns and split into trimmed lines
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        alert("O arquivo importado est√° vazio ou n√£o possui linhas suficientes.");
        return;
      }

      // Robustly detect the header line within the first 15 lines of the file
      // to skip potential report titles or metadata lines exported from Promax
      let headerLineIdx = 0;
      let sep = ',';
      let headers: string[] = [];

      for (let idx = 0; idx < Math.min(15, lines.length); idx++) {
        const line = lines[idx];
        const possibleSep = line.includes(';') ? ';' : (line.includes('\t') ? '\t' : ',');
        const parts = line.split(possibleSep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        const hasCode = parts.some(h => h.includes('codigo') || h.includes('c√≥digo') || h.includes('sku') || h.includes('cod') || h.includes('c√≥d'));
        const hasDesc = parts.some(h => h.includes('descricao') || h.includes('descri√ß√£o') || h.includes('desc') || h.includes('nome') || h.includes('produto') || h.includes('item'));
        
        if (hasCode || hasDesc) {
          headerLineIdx = idx;
          sep = possibleSep;
          headers = parts;
          break;
        }
      }

      // Fallback if no matching header keywords were found in the first 15 lines
      if (headers.length === 0) {
        sep = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
        headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        headerLineIdx = 0;
      }

      // Detect column indices based on common names
      let codeIdx = headers.findIndex(h => h.includes('codigo') || h.includes('c√≥digo') || h.includes('sku') || h.includes('cod') || h.includes('c√≥d'));
      
      // Ensure descIdx does not find the same index as codeIdx
      let descIdx = headers.findIndex((h, idx) => idx !== codeIdx && (h.includes('descricao') || h.includes('descri√ß√£o') || h.includes('desc') || h.includes('nome') || h.includes('produto') || h.includes('item')));
      
      let costSkuIdx = headers.findIndex((h, idx) => idx !== codeIdx && idx !== descIdx && (h.includes('custo') || h.includes('preco') || h.includes('pre√ßo') || h.includes('valor') || h.includes('val')));
      let hectoIdx = headers.findIndex((h, idx) => idx !== codeIdx && idx !== descIdx && idx !== costSkuIdx && (h.includes('hectolitro') || h.includes('hecto') || h.includes('hl') || h.includes('fator') || h.includes('fator hl') || h.includes('fator_hl')));

      // Safe fallbacks for index detection
      if (codeIdx === -1) {
        codeIdx = 0;
      }
      if (descIdx === -1 || descIdx === codeIdx) {
        descIdx = codeIdx === 0 ? 1 : 0;
      }
      if (costSkuIdx === -1) {
        costSkuIdx = [0, 1, 2, 3].find(idx => idx !== codeIdx && idx !== descIdx && idx !== hectoIdx) ?? 2;
      }
      if (hectoIdx === -1) {
        hectoIdx = [0, 1, 2, 3].find(idx => idx !== codeIdx && idx !== descIdx && idx !== costSkuIdx) ?? 3;
      }

      let importedCount = 0;
      let updatedCount = 0;
      const updatedProductsList = productImportMode === 'replace' ? [] : [...products];

      // Start reading data from the line immediately after the header line
      for (let i = headerLineIdx + 1; i < lines.length; i++) {
        const row = lines[i];
        const cols = row.split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length <= Math.max(codeIdx, descIdx)) continue;

        const code = cols[codeIdx]?.trim();
        const description = cols[descIdx]?.trim().toUpperCase();
        if (!code || !description) continue;

        const parseValue = (val: string | undefined): number => {
          if (!val) return 0;
          let cleaned = val.replace(/[R$\s]/gi, '').trim();
          if (cleaned === '-' || cleaned === '' || cleaned === '.-' || cleaned === '-,') return 0;
          if (cleaned.includes(',') && cleaned.includes('.')) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
          } else {
            cleaned = cleaned.replace(',', '.');
          }
          const parsed = Number(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        const costSku = costSkuIdx !== -1 ? parseValue(cols[costSkuIdx]) : 0;
        const hectoVal = hectoIdx !== -1 ? (parseValue(cols[hectoIdx]) || 0.01) : 0.01;

        const existingIdx = updatedProductsList.findIndex(p => p.code === code);

        if (existingIdx >= 0) {
          if (productImportMode === 'merge') {
            // Update existing
            updatedProductsList[existingIdx] = {
              ...updatedProductsList[existingIdx],
              description,
              cost: costSku > 0 ? costSku : updatedProductsList[existingIdx].cost,
              hectoFactor: hectoVal > 0 ? hectoVal : updatedProductsList[existingIdx].hectoFactor,
            };
            updatedCount++;
          }
        } else {
          // Add new product
          const newProduct: Product = {
            code,
            description,
            group: 'CERVEJA', // Default product group
            unit: 'un',
            palletFactor: 84,
            skuFactor: 1,
            hectoFactor: hectoVal,
            cost: costSku,
            curve: 'C'
          };
          updatedProductsList.push(newProduct);
          importedCount++;
        }
      }

      onSaveProducts(updatedProductsList);
      alert(`Importa√ß√£o conclu√≠da!\nProdutos novos adicionados: ${importedCount}\nProdutos existentes atualizados/mesclados: ${updatedCount}`);
    };
    reader.readAsText(file);
  };

  const handleRemoveProduct = (code: string) => {
    requestConfirm(
      "Excluir Produto",
      "Deseja realmente excluir este produto?",
      () => {
        onSaveProducts(products.filter(p => p.code !== code));
      }
    );
  };

  // --- MANUAL GUIDELINES IMPORT / EXPORT HANDLERS ---
  const generateWordHTML = (data: { products: Product[], drivers: Driver[], vehicles: Vehicle[], users: any[] }) => {
    const productsRows = data.products.map(p => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">${p.code || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${p.description || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${p.palletFactor || 84}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right;">R$ ${(p.cost || 0).toFixed(2).replace('.', ',')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${(p.hectoFactor || 0).toFixed(4).replace('.', ',')}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${p.curve || 'C'}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">
          ${p.photoUrl ? `<img src="${p.photoUrl}" width="60" height="60" style="width:60px; height:60px; object-fit:cover;" />` : 'Sem Foto'}
        </td>
      </tr>
    `).join('');

    const driversRows = data.drivers.map(d => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">${d.id || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${d.name || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">${d.cpf || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">${d.role === 'AJUDANTE' ? 'Ajudante' : 'Motorista'}</td>
      </tr>
    `).join('');

    const vehiclesRows = data.vehicles.map(v => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-family: monospace; font-weight: bold;">${v.plate || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${v.capacityPallets || 0}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">${v.isTemporary ? 'Tempor√°rio' : 'Fixo'}</td>
      </tr>
    `).join('');

    const usersRows = data.users.map(u => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 8px;">${u.id || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-weight: bold;">${u.name || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; text-transform: capitalize;">${u.role || ''}</td>
        <td style="border: 1px solid #cbd5e1; padding: 8px; font-family: monospace;">${u.username || ''}</td>
      </tr>
    `).join('');

    return `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Diretrizes e Padr√µes de Cadastro</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 20px; }
      h1 { font-size: 20pt; color: #0f35a9; margin-bottom: 5px; font-family: 'Segoe UI Semibold', sans-serif; }
      h2 { font-size: 14pt; color: #4f46e5; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; font-family: 'Segoe UI Semibold', sans-serif; }
      p { margin-bottom: 15px; font-size: 10pt; color: #475569; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; }
      th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; font-weight: bold; text-align: left; font-size: 10pt; color: #334155; }
      td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; vertical-align: middle; color: #334155; }
      .footer { font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    </style>
  </head>
  <body>
    <h1>Diretrizes Operacionais e Cadastro Geral</h1>
    <p>Este documento cont√©m as diretrizes da plataforma de Sobras e Faltas. Voc√™ pode editar este arquivo diretamente no Microsoft Word (recomenda-se salvar como .docx ou P√°gina Web .htm/.html ap√≥s a edi√ß√£o, ou manter o formato .doc). Mantenha as tabelas e cabe√ßalhos intactos para que o sistema possa ler e importar suas altera√ß√µes de forma automatizada.</p>
    <p><strong>DICA SOBRE IMAGENS:</strong> Se voc√™ deseja definir ou manter fotos dos produtos, voc√™ pode simplesmente colar imagens JPG diretamente nas c√©lulas da coluna "Foto" no Word. Ao importar este arquivo de volta (.docx, .doc ou P√°gina Web), a plataforma ir√° ler e preservar as imagens automaticamente!</p>
    
    <h2>Produtos (SKUs)</h2>
    <table id="table-products" border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 10px;">C√≥digo</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Descri√ß√£o</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Fator Caixa / Palete</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Custo (R$)</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Fator Hectolitro</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Curva</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px; width: 80px;">Foto / Imagem</th>
        </tr>
      </thead>
      <tbody>
        ${productsRows}
      </tbody>
    </table>

    <h2>Motoristas e Ajudantes</h2>
    <table id="table-drivers" border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 10px;">ID</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Nome Completo</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">CPF</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Fun√ß√£o</th>
        </tr>
      </thead>
      <tbody>
        ${driversRows}
      </tbody>
    </table>

    <h2>Ve√≠culos</h2>
    <table id="table-vehicles" border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Placa</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Capacidade (Paletes)</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Tipo</th>
        </tr>
      </thead>
      <tbody>
        ${vehiclesRows}
      </tbody>
    </table>

    <h2>Usu√°rios do Sistema</h2>
    <table id="table-users" border="1" style="border-collapse: collapse; width: 100%;">
      <thead>
        <tr style="background-color: #f1f5f9;">
          <th style="border: 1px solid #cbd5e1; padding: 10px;">ID</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Nome</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Fun√ß√£o</th>
          <th style="border: 1px solid #cbd5e1; padding: 10px;">Username</th>
        </tr>
      </thead>
      <tbody>
        ${usersRows}
      </tbody>
    </table>

    <div class="footer">Gerado automaticamente pelo Sistema de Gest√£o de Sobras e Faltas em ${new Date().toLocaleDateString('pt-BR')}.</div>
  </body>
  </html>
    `;
  };

  const parseHtmlToData = (htmlString: string): any => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');
    const tables = doc.querySelectorAll('table');

    const result: any = {
      products: [],
      drivers: [],
      vehicles: [],
      users: []
    };

    tables.forEach(table => {
      const id = table.getAttribute('id');
      const headerCells = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim().toLowerCase() || '');
      
      let tableType: 'products' | 'drivers' | 'vehicles' | 'users' | null = null;
      
      if (id === 'table-products' || (headerCells.includes('c√≥digo') && headerCells.includes('descri√ß√£o'))) {
        tableType = 'products';
      } else if (id === 'table-drivers' || (headerCells.includes('id') && headerCells.includes('nome completo'))) {
        tableType = 'drivers';
      } else if (id === 'table-vehicles' || (headerCells.includes('placa') && headerCells.includes('capacidade (paletes)'))) {
        tableType = 'vehicles';
      } else if (id === 'table-users' || (headerCells.includes('id') && headerCells.includes('nome') && headerCells.includes('username'))) {
        tableType = 'users';
      }

      if (!tableType) return;

      const rows = table.querySelectorAll('tbody tr, tr');
      rows.forEach(row => {
        if (row.querySelector('th')) return;
        
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length === 0) return;

        const cellText = cells.map(td => td.textContent?.trim() || '');

        if (tableType === 'products') {
          const code = cellText[0];
          const description = cellText[1];
          if (!code || !description) return;

          const palletFactor = parseInt(cellText[2]) || 84;
          
          let costStr = cellText[3] || '0';
          costStr = costStr.replace(/[^\d.,]/g, '').replace(',', '.');
          const cost = parseFloat(costStr) || 0;

          const hectoFactor = parseFloat(cellText[4]?.replace(',', '.')) || 0;
          const curve = cellText[5] || 'C';

          // Extract photo
          let photoUrl: string | undefined = undefined;
          const img = cells[6]?.querySelector('img');
          if (img) {
            photoUrl = img.getAttribute('src') || undefined;
          } else if (cellText[6] && (cellText[6].startsWith('http') || cellText[6].startsWith('data:'))) {
            photoUrl = cellText[6];
          }

          result.products.push({
            code,
            description,
            palletFactor,
            cost,
            hectoFactor,
            curve,
            photoUrl,
            group: 'CERVEJA',
            unit: 'CX',
            skuFactor: 1
          });
        } else if (tableType === 'drivers') {
          const idVal = cellText[0];
          const name = cellText[1];
          const cpf = cellText[2] || '';
          const roleStr = (cellText[3] || 'motorista').toLowerCase();
          const role = roleStr.includes('ajudante') ? 'AJUDANTE' : 'MOTORISTA';
          if (idVal && name) {
            result.drivers.push({ id: idVal, name, role, cpf });
          }
        } else if (tableType === 'vehicles') {
          const plate = cellText[0]?.toUpperCase().replace(/[^A-Z0-9-]/g, '');
          const capacityPallets = parseInt(cellText[1]) || 0;
          const isTemporary = (cellText[2] || '').toLowerCase().includes('tempor√°rio');
          if (plate) {
            result.vehicles.push({ plate, capacityPallets, isTemporary });
          }
        } else if (tableType === 'users') {
          const idVal = cellText[0];
          const name = cellText[1];
          let role = (cellText[2] || 'conferente').toLowerCase().trim();
          if (role !== 'gestor' && role !== 'fiscal') role = 'conferente';
          const username = cellText[3] || '';
          if (idVal && name && username) {
            result.users.push({ id: idVal, name, role, username });
          }
        }
      });
    });

    return result;
  };

  const handleDownloadManualWord = () => {
    const manualContent = customManualHTML || DEFAULT_MANUAL_HTML;
    
    const wordHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset="utf-8">
    <title>Manual de Diretrizes e Opera√ß√µes</title>
    <!--[if gte mso 9]>
    <xml>
      <w:WordDocument>
        <w:View>Print</w:View>
        <w:Zoom>100</w:Zoom>
        <w:DoNotOptimizeForBrowser/>
      </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin: 20px; }
      h1 { font-size: 20pt; color: #0f35a9; margin-bottom: 5px; font-family: 'Segoe UI Semibold', sans-serif; }
      h2 { font-size: 14pt; color: #4f46e5; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; font-family: 'Segoe UI Semibold', sans-serif; }
      p { margin-bottom: 15px; font-size: 10pt; color: #475569; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; margin-bottom: 20px; border: 1px solid #cbd5e1; }
      th { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 10px; font-weight: bold; text-align: left; font-size: 10pt; color: #334155; }
      td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9.5pt; vertical-align: middle; color: #334155; }
    </style>
  </head>
  <body>
    ${manualContent}
  </body>
  </html>
    `;
    const blob = new Blob(['\ufeff' + wordHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Manual_de_Operacoes_Pau_Brasil.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleManualFileSelect = (file: File) => {
    setManualImportError(null);
    setManualImportSuccessMsg(null);
    setManualImportData(null);

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) throw new Error("O arquivo est√° vazio.");
          let parsedHTML = '';
          try {
            const parsed = JSON.parse(text);
            parsedHTML = parsed.customManual || parsed.html || text;
          } catch (e) {
            parsedHTML = text;
          }
          setManualImportData(parsedHTML);
        } catch (err: any) {
          setManualImportError(err.message || "Erro ao processar arquivo JSON.");
        }
      };
      reader.onerror = () => {
        setManualImportError("Falha na leitura f√≠sica do arquivo.");
      };
      reader.readAsText(file);
    } 
    else if (fileExt === 'docx') {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) throw new Error("O arquivo est√° vazio.");

          // Convert .docx to HTML using mammoth
          // @ts-ignore
          const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
          const html = result.value;
          
          if (!html) throw new Error("N√£o foi poss√≠vel extrair o texto do documento do Word.");

          setManualImportData(html);
        } catch (err: any) {
          setManualImportError(`Falha ao ler arquivo Word (.docx): ${err.message || err}`);
        }
      };
      reader.onerror = () => {
        setManualImportError("Falha na leitura f√≠sica do arquivo.");
      };
      reader.readAsArrayBuffer(file);
    } 
    else if (fileExt === 'doc' || fileExt === 'html' || fileExt === 'htm') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) throw new Error("O arquivo est√° vazio.");

          setManualImportData(text);
        } catch (err: any) {
          setManualImportError(`Falha ao ler arquivo: ${err.message || err}`);
        }
      };
      reader.onerror = () => {
        setManualImportError("Falha na leitura f√≠sica do arquivo.");
      };
      reader.readAsText(file);
    } 
    else {
      setManualImportError("Formato de arquivo n√£o suportado. Use arquivos do Word (.docx, .doc), P√°ginas Web (.html, .htm) ou JSON (.json).");
    }
  };

  const handleExecuteManualImport = () => {
    if (!manualImportData || !onSaveCustomManual) return;
    try {
      onSaveCustomManual(manualImportData);
      setManualImportSuccessMsg("Sucesso! O Manual de Opera√ß√µes foi atualizado de acordo com o arquivo importado e sincronizado com os conferentes.");
      setManualImportData(null);
    } catch (e: any) {
      setManualImportError(`Falha ao salvar o novo manual: ${e.message || e}`);
    }
  };

  // Action Add Vehicle
  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehPlate || !newVehCapacity) return;
    const cleanPlate = newVehPlate.trim().toUpperCase();
    
    // Allow saving if the existing entry is temporary (upgrading)
    const existing = vehicles.find(v => v.plate === cleanPlate);
    if (existing && !existing.isTemporary) {
      alert('Ve√≠culo com esta placa j√° est√° cadastrado.');
      return;
    }
    const newVehicle: Vehicle = {
      plate: cleanPlate,
      capacityPallets: Number(newVehCapacity)
    };
    
    // Remove temporary one if present
    const filtered = vehicles.filter(v => v.plate !== cleanPlate);
    onSaveVehicles([newVehicle, ...filtered]);
    setNewVehPlate('');
    setNewVehCapacity('');
    alert('Ve√≠culo cadastrado e homologado com sucesso!');
  };

  const handleRemoveVehicle = (plate: string) => {
    requestConfirm(
      "Remover Ve√≠culo",
      "Deseja realmente remover este ve√≠culo?",
      () => {
        onSaveVehicles(vehicles.filter(v => v.plate !== plate));
      }
    );
  };

  // Action Add Driver/Helper
  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrvId || !newDrvName || !newDrvCpf) return;
    const cleanId = newDrvId.trim().toUpperCase();
    if (drivers.some(d => d.id === cleanId && d.id !== editingTempDriverId)) {
      alert('J√° existe um colaborador com esta matr√≠cula.');
      return;
    }
    const newDriver: Driver = {
      id: cleanId,
      name: newDrvName.trim().toUpperCase(),
      role: newDrvRole,
      cpf: newDrvCpf.trim()
    };
    
    let updatedDrivers = [...drivers];
    
    if (editingTempDriverId) {
      // Remove temporary driver
      updatedDrivers = updatedDrivers.filter(d => d.id !== editingTempDriverId);
      
      // Update existing audits pointing to temporary driver/helper ID
      const updatedAudits = audits.map(audit => {
        let changed = false;
        const newAudit = { ...audit };
        if (audit.driverId === editingTempDriverId) {
          newAudit.driverId = cleanId;
          changed = true;
        }
        if (audit.helperId === editingTempDriverId) {
          newAudit.helperId = cleanId;
          changed = true;
        }
        if (changed) {
          newAudit.history = [
            ...(newAudit.history || []),
            {
              timestamp: new Date().toISOString(),
              action: 'Cadastro Homologado',
              user: currentUser.name,
              details: `Cadastro tempor√°rio de ${newDrvRole === 'MOTORISTA' ? 'Motorista' : 'Ajudante'} convertido em definitivo (ID: ${cleanId}).`
            }
          ];
        }
        return newAudit;
      });
      onSaveAudits(updatedAudits);
    }
    
    // Save official driver
    onSaveDrivers([...updatedDrivers.filter(d => d.id !== cleanId), newDriver]);
    
    setNewDrvId('');
    setNewDrvName('');
    setNewDrvCpf('');
    setEditingTempDriverId('');
    alert('Colaborador cadastrado e homologado com sucesso!');
  };

  const handleRemoveDriver = (id: string) => {
    requestConfirm(
      "Remover Colaborador",
      "Deseja realmente remover este colaborador?",
      () => {
        onSaveDrivers(drivers.filter(d => d.id !== id));
      }
    );
  };

  return (
    <div className="w-full px-2 sm:px-6 lg:px-8 py-4 sm:py-8" id="gestor_view">
      
      {/* Tab Switcher upper bar */}
      {forceTab !== 'cadastros' && (
        <div className="flex flex-wrap border-b border-slate-200 mb-8 gap-y-2" id="gestor_tabs">
          <button
            onClick={() => setGestorTab('dashboard')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'dashboard' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-slate-500" />
            <span>Painel de Indicadores</span>
          </button>

          <button
            onClick={() => setGestorTab('sobras_faltas')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'sobras_faltas' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_sobras_faltas"
          >
            <FileCheck className="h-4 w-4 text-amber-600" />
            <span className="flex items-center space-x-1.5">
              <span>Sobras & Faltas (P.A. e Ativos)</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-sans font-bold">R$ & hL</span>
            </span>
          </button>

          <button
            onClick={() => setGestorTab('acoes')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'acoes' 
                ? 'border-indigo-600 text-indigo-950 font-extrabold' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_acoes_operacionais"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="flex items-center space-x-1.5">
              <span>A√ß√µes</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-sans font-bold">Operacionais</span>
            </span>
          </button>

          <button
            onClick={() => setGestorTab('map_tracking')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'map_tracking' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Monitoramento de Mapas</span>
          </button>

          <button
            onClick={() => setGestorTab('refugos_dashboard')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'refugos_dashboard' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_refugos_dashboard"
          >
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>Controle de Refugos & Avarias</span>
          </button>

          <button
            onClick={() => setGestorTab('historico')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'historico' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_historico"
          >
            <Clock className="h-4 w-4 text-emerald-500" />
            <span>Hist√≥rico de Retornos</span>
          </button>

          <button
            onClick={() => setGestorTab('audit_logs')}
            className={`pb-4 px-5 font-sans font-bold text-sm tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
              gestorTab === 'audit_logs' 
                ? 'border-amber-500 text-slate-900' 
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            id="tab_audit_logs"
          >
            <Shield className="h-4 w-4 text-indigo-600" />
            <span>Logs de Opera√ß√µes</span>
          </button>
        </div>
      )}

      {gestorTab === 'dashboard' && (
        /* DASHBOARD SECTION */
        <div className="space-y-8" id="gestor_dashboard">

          {/* Alertas de Envios Pendentes (Sobras) */}
          {(() => {
            const pendingSurplus = audits.filter(audit => {
              if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
              
              // Already sent or closed
              const isSent = audit.surplusFlowStatus === 'ENVIADO' || audit.surplusActionStatus === 'enviado_cliente';
              if (isSent) return false;

              // REQUISITO: S√ì PRECISAM APARECER SE HOUVER ALINHAMENTO NA GUIA (nb e data de entrega informados)
              if (!audit.clientCodeNB || !audit.deliveryDate) return false;

              // REQUISITO: N√ÉO GERAM SOBRAS OU FALTAS PARA CHAPATEX
              const hasProductSurplus = audit.items.some(item => {
                const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                return phys > (item.fiscalQty ?? 0);
              });

              const hasAssetSurplus = audit.assets.some(asset => {
                const idLower = (asset.assetId || '').toLowerCase();
                const nameUpper = (asset.assetName || '').toUpperCase();
                const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
                if (isChapatex) return false; // Chapatex n√£o gera sobra para envio

                const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                return phys > (asset.fiscalQty ?? 0);
              });

              if (!hasProductSurplus && !hasAssetSurplus) return false;

              // REQUISITO: A INFORMA√á√ÉO SOBRE O AVISO S√ì PRECISA FICAR APARECENDO UM DIA ANTES DA DATA DE ENTREGA (ou depois se ainda pendente)
              try {
                const [year, month, day] = audit.deliveryDate.split('-').map(Number);
                const deliveryDateVal = new Date(year, month - 1, day).getTime();

                const now = new Date();
                const todayVal = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

                const oneDayMs = 24 * 60 * 60 * 1000;
                // Ex: Se entrega √© dia 07/07, "um dia antes" √© a partir de dia 06/07
                const showTimeStart = deliveryDateVal - oneDayMs;

                return todayVal >= showTimeStart;
              } catch (err) {
                return false;
              }
            });

            if (pendingSurplus.length === 0) return null;

            return (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-3.5 shadow-xs" id="shipment_notifications">
                <div className="flex items-center space-x-2 text-amber-800">
                  <CircleAlert className="h-5 w-5 text-amber-500 animate-pulse" />
                  <h4 className="font-sans font-extrabold text-sm uppercase tracking-wider">Notifica√ß√µes de Envios Pendentes ({pendingSurplus.length})</h4>
                </div>
                <p className="text-xxs text-amber-700">
                  As seguintes rotas apresentaram <strong>Sobras F√≠sicas</strong> com alinhamento cadastrado e data de entrega pr√≥xima ou em andamento. Clique para ver detalhes e encaminhar no painel.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[250px] overflow-y-auto">
                  {pendingSurplus.map(audit => {
                    const drv = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                    return (
                      <div key={audit.id} className="bg-white p-3.5 rounded-lg border border-amber-100 flex justify-between items-center text-xs gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-800 font-sans">Mapa {audit.routeMap}</span>
                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">{audit.plate}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">Motorista: {drv}</p>
                          {audit.deliveryDate && (
                            <p className="text-[9px] text-amber-800 font-medium font-sans">
                              Previs√£o de Entrega: {new Date(audit.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setGestorTab('sobras_faltas');
                            setSobrasSubTab('operacional');
                            setHighlightedAuditId(audit.id);
                            setTimeout(() => {
                              const el = document.getElementById(`surplus_card_${audit.id}`);
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }, 350);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded text-[10px] flex items-center space-x-1 cursor-pointer transition"
                        >
                          <Check className="h-3 w-3" />
                          <span>Realizar Envio</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          
          {/* Status de Fechamento de Mapas (Vis√£o Gr√°fica) */}
          {(() => {
            const closed = audits.length > 0 ? audits.length : (importedRoutes.length || 2158);
            const auditing = 0;
            const pending = 0;
            const total = closed;

            const closedPct = 100;
            const auditingPct = 0;
            const pendingPct = 0;

            return (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4" id="gestor_closure_status_graphics">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                    <span>Status de Fechamento de Mapas (Vis√£o Gr√°fica)</span>
                  </h3>
                  <span className="text-xxs font-mono text-slate-400 font-bold">Consolidado Geral</span>
                </div>

                <div className="space-y-6">
                  {/* Visual bar graph representation */}
                  <div className="h-8 rounded-xl overflow-hidden flex shadow-3xs border border-slate-100 bg-slate-150">
                    <div 
                      className="bg-emerald-500 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all w-full"
                      title={`Baixados: ${closed} (100%)`}
                    >
                      Baixados (100%)
                    </div>
                  </div>

                  {/* Legend Grid */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <span className="text-xxs text-slate-400 font-bold uppercase block font-mono">Baixados (Ok)</span>
                      <span className="text-xl font-bold font-sans text-emerald-600 block mt-1">{closed}</span>
                      <span className="text-[10px] text-slate-500 block">(100.0%)</span>
                    </div>
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100">
                      <span className="text-xxs text-slate-400 font-bold uppercase block font-mono">Em Aferi√ß√£o</span>
                      <span className="text-xl font-bold font-sans text-amber-600 block mt-1">{auditing}</span>
                      <span className="text-[10px] text-slate-500 block">({auditingPct.toFixed(1)}%)</span>
                    </div>
                    <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                      <span className="text-xxs text-slate-400 font-bold uppercase block font-mono">Pendentes</span>
                      <span className="text-xl font-bold font-sans text-red-600 block mt-1">{pending}</span>
                      <span className="text-[10px] text-slate-500 block">({pendingPct.toFixed(1)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          
          {/* Key Metrics Bento-Grid (5 Indicators including EFD Jos√© Ronildo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4" id="painel_indicadores_kpis">
            
            {/* KPI 1 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow transition flex flex-col justify-between" id="kpi_rotas_baixadas">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Rotas Baixadas</span>
                  <span className="text-2xl lg:text-3xl font-sans font-bold text-slate-900 block mt-1">
                    {totalAuditsCount}
                  </span>
                </div>
                <div className="bg-slate-100 p-2 rounded-lg text-slate-700">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-3 font-sans">
                Aferi√ß√µes f√≠sicas e fiscais conclu√≠das.
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow transition flex flex-col justify-between" id="kpi_indice_acerto">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">√çndice de Acerto (OK)</span>
                  <span className="text-2xl lg:text-3xl font-sans font-bold text-emerald-600 block mt-1">
                    {(matchRate || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg text-emerald-700">
                  <Percent className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-3 flex items-center space-x-1 font-sans">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>{okAuditsCount} rotas em conformidade.</span>
              </div>
            </div>

            {/* KPI 3 - EFD (Efici√™ncia de Descarregamento - Ranking de Empilhadores) */}
            <div className="bg-gradient-to-br from-white to-blue-50/40 p-5 rounded-xl border-2 border-blue-200 shadow-xs hover:shadow-md transition flex flex-col justify-between relative overflow-hidden" id="kpi_efd_descarregamento">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xxs font-bold text-blue-700 uppercase tracking-wider block font-mono">EFD (Descarregamento)</span>
                    <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">Consolidado</span>
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl lg:text-3xl font-sans font-extrabold text-blue-900 font-mono">
                      {(efdStats.efdPercentage || 0).toFixed(1)}%
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono ${
                      efdStats.isTargetHit ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {efdStats.isTargetHit ? '100% Batida' : 'Em Andamento'}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-xs">
                  <Timer className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-blue-100/80 space-y-1.5">
                <div className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                  <span>Empilhadores:</span>
                  <span className="text-slate-400 font-normal">‚â§ 22:00 ({efdStats.totalBefore10}) | üåô {efdStats.totalPernoite} isentos</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {empilhadoresRanking.map((emp, i) => (
                    <div 
                      key={emp.id} 
                      onClick={() => setEfdEmpilhadorFilter(efdEmpilhadorFilter === emp.name ? 'todos' : emp.name)}
                      className={`p-1.5 rounded-lg border text-[10px] font-mono flex flex-col justify-between cursor-pointer transition ${
                        efdEmpilhadorFilter === emp.name 
                          ? 'bg-blue-100/80 border-blue-400 ring-1 ring-blue-400 text-blue-950 font-bold' 
                          : 'bg-white/80 border-blue-100/80 hover:bg-white text-slate-800'
                      }`}
                      title={`Clique para filtrar por ${emp.name}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold truncate text-[10.5px]">
                          {i === 0 ? 'ü•á ' : 'ü•à '}{emp.name.split(' ')[0]}
                        </span>
                        <span className={`font-bold ${emp.isTargetHit ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {(emp.efdPercentage || 0).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[8.5px] text-slate-500 mt-0.5">
                        <span>{emp.shortShift}</span>
                        <span>{emp.totalTrips} v.</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI 4 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow transition flex flex-col justify-between" id="kpi_produtividade_afericao">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Produtividade Aferi√ß√£o</span>
                  <span className="text-2xl lg:text-3xl font-sans font-bold text-slate-900 block mt-1">
                    {avgMinsText}
                  </span>
                </div>
                <div className="bg-amber-50 p-2 rounded-lg text-amber-700">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-3 font-sans">
                Tempo m√©dio do in√≠cio ao fim f√≠sico.
              </div>
            </div>

            {/* KPI 5 */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:shadow transition flex flex-col justify-between" id="kpi_divergencia_estoque">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider block font-mono">Diverg√™ncia Estoque</span>
                  <div className="mt-1 space-y-0.5">
                    <span className="text-xs font-bold text-red-600 block leading-tight font-mono">
                      Perdas: R$ {totalMissingCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs font-bold text-amber-600 block leading-tight font-mono">
                      Sobras: R$ {totalSurplusCost.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div className="bg-red-50 p-2 rounded-lg text-red-700">
                  <Landmark className="h-5 w-5" />
                </div>
              </div>
              <div className="text-xxs text-slate-400 mt-2 font-sans">
                Valor monet√°rio dos desvios.
              </div>
            </div>

          </div>

          {/* NOVO PAINEL & HISTORIGRAMA D1, D2, D3, D4 & INDICADORES EFD */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6" id="painel_histograma_efd">
            
            {/* Header com Filtros de Per√≠odo e Resumo Jos√© Ronildo */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                    <BarChart2 className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                      <span>Historigrama de Ve√≠culos Descarregados em D0, D1, D2, D3, D4 & EFD</span>
                      <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-black uppercase px-2 py-0.5 rounded-full font-mono">
                        Base Salva no C√≥digo
                      </span>
                    </h3>
                    <p className="text-xxs text-slate-500 mt-0.5">
                      Metas operacionais de ciclo: <strong>D0 (65%)</strong>, <strong>D1 (32%)</strong>, <strong>D2 (2%)</strong>, <strong>D3 (1%)</strong>, <strong>D4 (0% - sem registros)</strong> ‚Ä¢ EFD ‚â§ 22:00 (100% Meta).
                    </p>
                  </div>
                </div>
              </div>

              {/* Controles de Filtro de Per√≠odo, M√™s e Bot√µes */}
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
                {/* Seletor R√°pido de M√™s */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xxs font-bold overflow-x-auto max-w-full">
                  <span className="text-slate-400 px-1.5 uppercase tracking-wider text-[9px] font-mono">M√™s:</span>
                  {[
                    { key: 'todos', label: 'Todos os Meses' },
                    { key: '2026-02', label: 'Fev/26' },
                    { key: '2026-03', label: 'Mar/26' },
                    { key: '2026-04', label: 'Abr/26' },
                    { key: '2026-05', label: 'Mai/26' },
                    { key: '2026-06', label: 'Jun/26' },
                    { key: '2026-07', label: 'Jul/26' },
                    { key: '2026-08', label: 'Ago/26' },
                  ].map(m => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setEfdMonthFilter(m.key);
                        if (m.key !== 'todos') {
                          setEfdDateFilter('todos');
                          setEfdProgressionViewMode('diario');
                        } else {
                          setEfdProgressionViewMode('mensal');
                        }
                      }}
                      className={`px-2 py-1 rounded-md transition whitespace-nowrap ${
                        efdMonthFilter === m.key ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Filtros de Intervalo Relativo */}
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xxs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setEfdDateFilter('todos');
                      setEfdMonthFilter('todos');
                      setEfdProgressionViewMode('mensal');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      efdDateFilter === 'todos' && efdMonthFilter === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Geral
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEfdDateFilter('hoje');
                      setEfdMonthFilter('todos');
                      setEfdProgressionViewMode('diario');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      efdDateFilter === 'hoje' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEfdDateFilter('7dias');
                      setEfdMonthFilter('todos');
                      setEfdProgressionViewMode('diario');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      efdDateFilter === '7dias' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    7 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEfdDateFilter('30dias');
                      setEfdMonthFilter('todos');
                      setEfdProgressionViewMode('diario');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      efdDateFilter === '30dias' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    30 Dias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEfdDateFilter('custom');
                      setEfdMonthFilter('todos');
                      setEfdProgressionViewMode('diario');
                    }}
                    className={`px-2.5 py-1 rounded-md transition ${
                      efdDateFilter === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {efdDateFilter === 'custom' && (
                  <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-lg text-xxs">
                    <input
                      type="date"
                      value={efdCustomStartDate}
                      onChange={(e) => setEfdCustomStartDate(e.target.value)}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-mono text-xxs"
                    />
                    <span className="text-slate-400">at√©</span>
                    <input
                      type="date"
                      value={efdCustomEndDate}
                      onChange={(e) => setEfdCustomEndDate(e.target.value)}
                      className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-800 font-mono text-xxs"
                    />
                  </div>
                )}

                {/* Badges de Metas por Empilhador */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {empilhadoresRanking.map((emp, i) => (
                    <div 
                      key={emp.id}
                      onClick={() => setEfdEmpilhadorFilter(efdEmpilhadorFilter === emp.name ? 'todos' : emp.name)}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-center space-x-2 font-mono text-xxs cursor-pointer transition ${
                        efdEmpilhadorFilter === emp.name
                          ? 'ring-2 ring-blue-600 bg-blue-50 border-blue-400 text-blue-950 font-bold'
                          : emp.isTargetHit 
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100/70' 
                          : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100/70'
                      }`}
                      title={`Filtrar viagens de ${emp.name}`}
                    >
                      <Award className={`h-4 w-4 ${emp.isTargetHit ? 'text-emerald-600' : 'text-amber-600'}`} />
                      <div>
                        <span className="block font-bold">
                          {i === 0 ? 'ü•á ' : 'ü•à '}{emp.name}: {(emp.efdPercentage || 0).toFixed(1)}% EFD
                        </span>
                        <span className="text-[9px] opacity-80">{emp.shortShift} ‚Ä¢ {emp.isTargetHit ? '100% Meta' : 'Em Acomp.'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aviso de Filtro Ativo no Histograma e Sincroniza√ß√£o */}
            {(efdStageFilter !== 'todos' || efdMonthFilter !== 'todos') && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-xxs font-mono text-blue-900">
                <div className="flex items-center space-x-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  <span>
                    <strong>Filtros Sincronizados Ativos:</strong>
                    {efdMonthFilter !== 'todos' && (
                      <span className="ml-1.5 bg-blue-200 text-blue-900 px-2 py-0.5 rounded font-bold">
                        M√™s: {efdMonthFilter === '2026-04' ? 'Abril/2026' : efdMonthFilter}
                      </span>
                    )}
                    {efdStageFilter !== 'todos' && (
                      <span className="ml-1.5 bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-bold">
                        Ciclo Histograma: {efdStageFilter}
                      </span>
                    )}
                    <span className="ml-1.5 text-slate-500 font-normal">
                      (Todos os gr√°ficos, hist√≥rico di√°rio e ranking est√£o filtrados em tempo real)
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {efdStageFilter !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => setEfdStageFilter('todos')}
                      className="px-2 py-0.5 bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-100 font-bold transition"
                    >
                      Limpar Ciclo
                    </button>
                  )}
                  {efdMonthFilter !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEfdMonthFilter('todos');
                        setEfdProgressionViewMode('mensal');
                      }}
                      className="px-2 py-0.5 bg-white border border-blue-300 rounded text-blue-700 hover:bg-blue-100 font-bold transition"
                    >
                      Ver Todos Meses
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bento Grid dos Ciclos D0 (65%), D1 (32%), D2 (2%), D3 (1%), D4 (0%) com contagens e conformidade EFD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
              {efdStats.histogramData.map(stage => {
                const isSelected = efdStageFilter === stage.stage;
                return (
                  <div
                    key={stage.stage}
                    onClick={() => setEfdStageFilter(isSelected ? 'todos' : stage.stage)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'border-slate-800 bg-slate-50 ring-2 ring-slate-800/10' 
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-extrabold font-mono uppercase tracking-wider block" style={{ color: stage.color }}>
                          {stage.label}
                        </span>
                        <p className="text-[10px] text-slate-400">{stage.description}</p>
                      </div>
                      <span 
                        className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                        style={{ backgroundColor: `${stage.color}15`, color: stage.color }}
                      >
                        {(stage.percentage || 0).toFixed(1)}% frota
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-extrabold text-slate-900 font-mono">
                          {stage.count}
                        </span>
                        <span className="text-xxs text-slate-400 ml-1">ve√≠culos</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-700 font-mono block">
                          {(stage.efdHitPercentage || 0).toFixed(1)}% EFD
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {stage.efdHitCount} com EFD OK
                        </span>
                      </div>
                    </div>

                    {/* Mini progress bar de EFD para o ciclo */}
                    <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-1.5 rounded-full transition-all"
                        style={{ 
                          width: `${Math.min(100, Math.max(5, stage.efdHitPercentage))}%`,
                          backgroundColor: stage.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gr√°fico Recharts Histograma D1-D4 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* BarChart Container */}
              <div className="lg:col-span-8 bg-slate-50/70 border border-slate-200 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                      Distribui√ß√£o Volum√©trica e Atingimento EFD por Ciclo
                    </h4>
                    <span className="text-xxs text-slate-400">Comparativo entre Total de Ve√≠culos Descarregados vs Descarregados ‚â§ 22:00</span>
                  </div>
                  <span className="text-xxs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600 font-semibold">
                    Total: {efdStats.totalAllRecords} ve√≠culos
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={efdStats.histogramData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis 
                        dataKey="label" 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis 
                        stroke="#64748b" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={{ stroke: '#cbd5e1' }} 
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 font-mono border border-slate-700">
                                <span className="font-bold text-amber-300 block">{data.label}</span>
                                <div className="text-slate-300 text-[11px]">{data.description}</div>
                                <div className="pt-1.5 border-t border-slate-700 flex justify-between space-x-4">
                                  <span>Total Ve√≠culos:</span>
                                  <span className="font-bold">{data.count} ({(data.percentage || 0).toFixed(1)}%)</span>
                                </div>
                                <div className="flex justify-between space-x-4 text-emerald-400">
                                  <span>EFD Batida (‚â§ 22:00):</span>
                                  <span className="font-bold">{data.efdHitCount} ({(data.efdHitPercentage || 0).toFixed(1)}%)</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        align="right" 
                        wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontFamily: 'monospace' }}
                      />
                      <Bar dataKey="count" name="Total Descarregados" fill="#334155" radius={[4, 4, 0, 0]} barSize={32} />
                      <Bar dataKey="efdHitCount" name="EFD Batida (‚â§ 22:00)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={32} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Resumo e Regras EFD ao lado do gr√°fico */}
              <div className="lg:col-span-4 bg-slate-50/70 border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span>Regra de Efici√™ncia (EFD)</span>
                  </h4>
                  <p className="text-xxs text-slate-500 leading-relaxed">
                    A meta √© bater <strong>90% de ve√≠culos descarregados at√© as 22:00</strong> (exceto pernoites).
                  </p>
                </div>

                <div className="space-y-2 text-xxs font-mono bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Ve√≠culos Avaliados:</span>
                    <span className="font-bold text-slate-900">{efdStats.totalEvaluated}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700">
                    <span className="flex items-center space-x-1">
                      <Sun className="h-3 w-3" />
                      <span>Descarregados ‚â§ 22:00:</span>
                    </span>
                    <span className="font-bold">{efdStats.totalBefore10}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 text-rose-700">
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>Descarregados &gt; 22:00:</span>
                    </span>
                    <span className="font-bold">{efdStats.totalAfter10}</span>
                  </div>
                  <div className="flex justify-between py-1 text-indigo-700">
                    <span className="flex items-center space-x-1">
                      <Moon className="h-3 w-3" />
                      <span>Pernoites (Isentos):</span>
                    </span>
                    <span className="font-bold">{efdStats.totalPernoite}</span>
                  </div>
                </div>

                <div className="bg-blue-50/80 border border-blue-200 text-blue-950 p-3 rounded-lg text-xxs space-y-1">
                  <span className="font-bold uppercase tracking-wider block text-[9px] text-blue-800">
                    üí° Isen√ß√£o de Pernoite:
                  </span>
                  <p className="leading-tight text-slate-600">
                    Ve√≠culos com marca√ß√£o de <strong>Pernoite</strong> n√£o penalizam o √≠ndice EFD dos empilhadores (<strong>Marivaldo Artur</strong> e <strong>Jos√© Ronildo</strong>).
                  </p>
                </div>
              </div>

            </div>

            {/* Gr√°fico Meta vs Real - Sincronizado M√™s a M√™s ou Dia a Dia (Cross-filtering com Histograma D0-D4) */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-4" id="monthly_meta_real_chart">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                      {isDailyProgressionActive
                        ? `Evolu√ß√£o Di√°ria: Meta vs. Realizado (Dia a Dia ‚Ä¢ ${
                            efdMonthFilter === '2026-02' ? 'Fevereiro/2026' :
                            efdMonthFilter === '2026-03' ? 'Mar√ßo/2026' :
                            efdMonthFilter === '2026-04' ? 'Abril/2026' :
                            efdMonthFilter === '2026-05' ? 'Maio/2026' :
                            efdMonthFilter === '2026-06' ? 'Junho/2026' :
                            efdMonthFilter === '2026-07' ? 'Julho/2026' :
                            efdMonthFilter === '2026-08' ? 'Agosto/2026' : 'Per√≠odo Selecionado'
                          })`
                        : 'Evolu√ß√£o Mensal: Meta vs. Realizado (M√™s a M√™s)'}
                    </h4>
                    {efdStageFilter !== 'todos' && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                        Filtrado: Ciclo {efdStageFilter}
                      </span>
                    )}
                  </div>
                  <span className="text-xxs text-slate-500 block mt-0.5">
                    {isDailyProgressionActive
                      ? 'Desempenho di√°rio de atingimento da meta EFD (90% ‚â§ 22:00) sincronizado com o Histograma'
                      : 'Comparativo hist√≥rico de atingimento da meta EFD (90% ‚â§ 22:00). Clique em um m√™s para abrir o detalhamento dia a dia.'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {efdMonthFilter !== 'todos' && (
                    <button
                      type="button"
                      onClick={() => {
                        setEfdMonthFilter('todos');
                        setEfdProgressionViewMode('mensal');
                      }}
                      className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xxs font-bold transition flex items-center space-x-1"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>Ver Todos os Meses</span>
                    </button>
                  )}

                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xxs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setEfdProgressionViewMode('mensal');
                        if (efdMonthFilter !== 'todos') setEfdMonthFilter('todos');
                      }}
                      className={`px-2.5 py-1 rounded-md transition ${
                        !isDailyProgressionActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Vis√£o Mensal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEfdProgressionViewMode('diario');
                        if (efdMonthFilter === 'todos') setEfdMonthFilter('2026-04');
                      }}
                      className={`px-2.5 py-1 rounded-md transition ${
                        isDailyProgressionActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Vis√£o Di√°ria
                    </button>
                  </div>

                  <span className="text-xxs font-mono bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold border border-emerald-200">
                    Meta Padr√£o: 90% EFD
                  </span>
                </div>
              </div>

              {/* RENDERIZA√á√ÉO CONDICIONAL: VIS√ÉO DI√ÅRIA VS VIS√ÉO MENSAL */}
              {isDailyProgressionActive ? (
                dailyEfdProgression.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-mono">
                    Nenhuma viagem registrada para os filtros selecionados ({efdStageFilter !== 'todos' ? `Ciclo ${efdStageFilter}` : ''}).
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Gr√°fico Di√°rio */}
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={dailyEfdProgression}
                          margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis 
                            dataKey="dateLabel" 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={{ stroke: '#cbd5e1' }}
                            domain={[0, 105]}
                            unit="%"
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload as DailyEFDProgression;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono border border-slate-700 max-w-xs">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                                      <span className="font-bold text-amber-300">Dia {data.dateLabel} ({data.dateKey})</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                        data.isTargetHit ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                                      }`}>
                                        {data.isTargetHit ? 'Meta Batida' : 'Abaixo da Meta'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400 font-bold">
                                      <span>Realizado (EFD):</span>
                                      <span>{(data.realEfdRate || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between text-amber-400">
                                      <span>Meta Estipulada:</span>
                                      <span>{(data.targetEfdRate || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="pt-1 border-t border-slate-700/80 text-[11px] text-slate-300 space-y-0.5">
                                      <div className="flex justify-between">
                                        <span>Total de Viagens:</span>
                                        <span className="font-bold text-white">{data.totalTrips}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Descarregados ‚â§ 22:00:</span>
                                        <span className="text-emerald-300 font-bold">{data.before10Count}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Descarregados &gt; 22:00:</span>
                                        <span className="text-rose-300 font-bold">{data.after10Count}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Pernoites (Isentos):</span>
                                        <span className="text-indigo-300 font-bold">{data.pernoiteCount}</span>
                                      </div>
                                      <div className="pt-1 border-t border-slate-800 text-[10px] flex justify-between text-slate-400">
                                        <span>Ciclos: D0({data.d0Count}) D1({data.d1Count}) D2({data.d2Count})</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            verticalAlign="top" 
                            align="right" 
                            wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                          />
                          <Bar 
                            dataKey="realEfdRate" 
                            name="Realizado (% EFD)" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]} 
                            barSize={dailyEfdProgression.length > 20 ? 14 : 24} 
                          />
                          <Line 
                            type="monotone" 
                            dataKey="targetEfdRate" 
                            name="Meta (90%)" 
                            stroke="#f59e0b" 
                            strokeWidth={2.5} 
                            strokeDasharray="4 4"
                            dot={{ r: 3, fill: '#f59e0b' }} 
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Daily Summary Cards (Scroll horizontal ou grid responsivo) */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider block">
                        Detalhamento por Dia ({dailyEfdProgression.length} dias registrados):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-1">
                        {dailyEfdProgression.map(d => (
                          <div 
                            key={d.dateKey}
                            className={`p-2 rounded-lg border transition-all ${
                              d.isTargetHit 
                                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-mono font-bold text-[11px]">{d.dateLabel}</span>
                              <span className={`text-[8px] font-bold px-1 py-0.2 rounded-full ${
                                d.isTargetHit ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-100 text-rose-900'
                              }`}>
                                {d.isTargetHit ? 'OK' : 'Abaixo'}
                              </span>
                            </div>
                            <div className="flex items-baseline space-x-1">
                              <span className="text-xs font-black font-mono">
                                {(d.realEfdRate || 0).toFixed(0)}%
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">/ 90%</span>
                            </div>
                            <div className="mt-1 pt-1 border-t border-slate-200/60 flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>{d.before10Count} OK</span>
                              <span>{d.totalTrips} tot</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                monthlyEfdProgression.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-mono">
                    Nenhum dado mensal registrado para compara√ß√£o de meta vs. realizado.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Composed Chart Mensal */}
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={monthlyEfdProgression}
                          margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis 
                            dataKey="monthLabel" 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <YAxis 
                            stroke="#64748b" 
                            fontSize={11} 
                            tickLine={false} 
                            axisLine={{ stroke: '#cbd5e1' }}
                            domain={[0, 105]}
                            unit="%"
                          />
                          <RechartsTooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload as MonthlyEFDProgression;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 font-mono border border-slate-700 max-w-xs">
                                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                                      <span className="font-bold text-amber-300">{data.monthLabel}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                        data.isTargetHit ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                                      }`}>
                                        {data.isTargetHit ? 'Meta Batida' : 'Abaixo da Meta'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-emerald-400 font-bold">
                                      <span>Realizado (EFD):</span>
                                      <span>{(data.realEfdRate || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="flex justify-between text-amber-400">
                                      <span>Meta Estipulada:</span>
                                      <span>{(data.targetEfdRate || 0).toFixed(1)}%</span>
                                    </div>
                                    <div className="pt-1 border-t border-slate-700/80 text-[11px] text-slate-300 space-y-0.5">
                                      <div className="flex justify-between">
                                        <span>Total de Viagens:</span>
                                        <span className="font-bold text-white">{data.totalTrips}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Descarregados ‚â§ 22:00:</span>
                                        <span className="text-emerald-300 font-bold">{data.before10Count}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Descarregados &gt; 22:00:</span>
                                        <span className="text-rose-300 font-bold">{data.after10Count}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Pernoites (Isentos):</span>
                                        <span className="text-indigo-300 font-bold">{data.pernoiteCount}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend 
                            verticalAlign="top" 
                            align="right" 
                            wrapperStyle={{ paddingBottom: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                          />
                          <Bar 
                            dataKey="realEfdRate" 
                            name="Realizado (% EFD)" 
                            fill="#10b981" 
                            radius={[4, 4, 0, 0]} 
                            barSize={36}
                            onClick={(entry) => {
                              if (entry && entry.monthKey) {
                                setEfdMonthFilter(entry.monthKey);
                                setEfdProgressionViewMode('diario');
                              }
                            }}
                            className="cursor-pointer"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="targetEfdRate" 
                            name="Meta (90%)" 
                            stroke="#f59e0b" 
                            strokeWidth={2.5} 
                            strokeDasharray="4 4"
                            dot={{ r: 4, fill: '#f59e0b' }} 
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Monthly Summary Cards com clique interativo */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 pt-2">
                      {monthlyEfdProgression.map(m => (
                        <div 
                          key={m.monthKey}
                          onClick={() => {
                            setEfdMonthFilter(m.monthKey);
                            setEfdProgressionViewMode('diario');
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] ${
                            m.isTargetHit 
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                          title={`Clique para ver os dias de ${m.monthLabel}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono font-bold text-xs">{m.monthLabel}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                              m.isTargetHit ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                            }`}>
                              {m.isTargetHit ? 'Meta 90% OK' : `${(m.realEfdRate || 0).toFixed(0)}%`}
                            </span>
                          </div>
                          <div className="flex items-baseline space-x-1">
                            <span className="text-base font-black font-mono">
                              {(m.realEfdRate || 0).toFixed(1)}%
                            </span>
                            <span className="text-xxs text-slate-400 font-mono">/ 90%</span>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>{m.before10Count} OK</span>
                            <span className="text-blue-600 font-bold">Ver dias ‚Üí</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Painel de Ranking Oficial dos Empilhadores EFD (Marivaldo Artur, Jos√© Ronildo e equipe) */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-4" id="painel_ranking_empilhadores_efd">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    <span>Ranking de Efici√™ncia dos Empilhadores (Opera√ß√£o EFD)</span>
                  </h4>
                  <span className="text-xxs text-slate-500">
                    Desempenho individual comparativo, atingimento da meta (‚â§ 22:00 / turno), pernoites isentos e produtividade de p√°tio
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  {efdEmpilhadorFilter !== 'todos' ? (
                    <button
                      type="button"
                      onClick={() => setEfdEmpilhadorFilter('todos')}
                      className="text-xxs font-mono bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full font-bold border border-blue-200 hover:bg-blue-200 transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Filtrando: {efdEmpilhadorFilter}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-xxs font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold border border-slate-200">
                      {empilhadoresRanking.length} Empilhadores na Opera√ß√£o
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {empilhadoresRanking.map((emp) => {
                  const isSelected = efdEmpilhadorFilter === emp.name;
                  const isFirst = emp.rankPosition === 1;
                  const isSecond = emp.rankPosition === 2;

                  return (
                    <div
                      key={emp.id}
                      className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20 shadow-md'
                          : isFirst
                          ? 'border-amber-200 bg-gradient-to-br from-white via-amber-50/20 to-white hover:border-amber-300 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      <div>
                        {/* Header: Rank Medal, Shift, Name & EFD % */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-md flex items-center space-x-1 ${
                                isFirst
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : isSecond
                                  ? 'bg-slate-200 text-slate-800 border border-slate-300'
                                  : 'bg-orange-100 text-orange-900 border border-orange-200'
                              }`}>
                                <span>{isFirst ? 'ü•á' : isSecond ? 'ü•à' : 'ü•â'}</span>
                                <span>{emp.rankPosition}¬∫ LUGAR</span>
                              </span>
                              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {emp.shiftLabel}
                              </span>
                            </div>
                            <h5 className="text-base font-extrabold text-slate-900 font-sans mt-1 tracking-tight">
                              {emp.name}
                            </h5>
                          </div>

                          {/* Rate Badge */}
                          <div className="text-right">
                            <div className="flex items-baseline justify-end space-x-1">
                              <span className={`text-2xl font-black font-mono ${
                                emp.isTargetHit ? 'text-emerald-700' : 'text-amber-700'
                              }`}>
                                {(emp.efdPercentage || 0).toFixed(1)}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">EFD</span>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block font-mono ${
                              emp.isTargetHit
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}>
                              {emp.isTargetHit ? '‚úì Meta 90% Batida' : '‚ö† Em Acompanhamento'}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-[10px] font-mono text-slate-500">
                            <span>Conformidade de Hor√°rio (‚â§ 22:00)</span>
                            <span className="font-bold text-slate-700">{(emp.efdPercentage || 0).toFixed(1)}% / 90%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                emp.isTargetHit ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(5, emp.efdPercentage))}%` }}
                            />
                          </div>
                        </div>

                        {/* Metric Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3.5 pt-3 border-t border-slate-100 text-xxs font-mono">
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60">
                            <span className="text-slate-400 block text-[9px]">TOTAL VIAGENS</span>
                            <span className="font-bold text-slate-900 text-xs">{emp.totalTrips} ve√≠culos</span>
                          </div>
                          <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-100 text-emerald-900">
                            <span className="text-emerald-600 block text-[9px]">‚â§ 22:00 (NO PRAZO)</span>
                            <span className="font-bold text-emerald-800 text-xs">{emp.before10Count}</span>
                          </div>
                          <div className="bg-rose-50/70 p-2 rounded-lg border border-rose-100 text-rose-900">
                            <span className="text-rose-600 block text-[9px]">&gt; 22:00 (FORA PRAZO)</span>
                            <span className="font-bold text-rose-800 text-xs">{emp.after10Count}</span>
                          </div>
                          <div className="bg-indigo-50/70 p-2 rounded-lg border border-indigo-100 text-indigo-900">
                            <span className="text-indigo-600 block text-[9px]">üåô PERNOITES</span>
                            <span className="font-bold text-indigo-800 text-xs">{emp.pernoiteCount} isentos</span>
                          </div>
                        </div>

                        {/* Cycles & Loading Summary */}
                        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-100">
                          <div className="flex items-center space-x-2">
                            <span className="text-slate-400 font-bold">Ciclos:</span>
                            <span className="text-cyan-700 font-semibold">D0 ({emp.d0Count || 0})</span>
                            <span className="text-slate-300">‚Ä¢</span>
                            <span className="text-emerald-700 font-semibold">D1 ({emp.d1Count})</span>
                            <span className="text-slate-300">‚Ä¢</span>
                            <span className="text-blue-700 font-semibold">D2 ({emp.d2Count})</span>
                            <span className="text-slate-300">‚Ä¢</span>
                            <span className="text-amber-700 font-semibold">D3 ({emp.d3Count})</span>
                          </div>
                          {emp.loadedCount > 0 && (
                            <div className="text-slate-500">
                              <span>Carregamentos: <strong>{emp.loadedCount}</strong> ({emp.palletsCount} paletes)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Filter button for this operator */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {isSelected ? 'Exibindo viagens deste operador' : 'Clique para auditar as viagens'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setEfdEmpilhadorFilter(isSelected ? 'todos' : emp.name)}
                          className={`px-3 py-1 rounded-lg text-xxs font-mono font-bold transition flex items-center space-x-1 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <Filter className="h-3 w-3" />
                          <span>{isSelected ? 'Remover Filtro' : `Filtrar ${emp.name.split(' ')[0]}`}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela Interativa de Ve√≠culos e Auditoria EFD com Toggle de Pernoite */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                    Detalhamento de Ve√≠culos & Auditoria de Hor√°rio
                  </span>
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-slate-200">
                    {filteredTravelRecords.length} registros
                  </span>
                </div>

                {/* Filtros da Tabela */}
                <div className="flex flex-wrap items-center gap-2">
                  
                  {/* Filtro Empilhador */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEfdEmpilhadorFilter('todos')}
                      className={`px-2 py-1 rounded transition ${efdEmpilhadorFilter === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Todos Empilhadores
                    </button>
                    {empilhadoresRanking.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => setEfdEmpilhadorFilter(emp.name)}
                        className={`px-2 py-1 rounded transition flex items-center space-x-1 ${efdEmpilhadorFilter === emp.name ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        <span>{emp.rankPosition === 1 ? 'ü•á' : 'ü•à'}</span>
                        <span>{emp.name.split(' ')[0]}</span>
                        <span className="text-[8.5px] opacity-75">({emp.shortShift})</span>
                      </button>
                    ))}
                  </div>

                  {/* Filtro Pernoite */}
                  <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setEfdOnlyPernoite(null)}
                      className={`px-2 py-1 rounded transition ${efdOnlyPernoite === null ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Todas Viagens
                    </button>
                    <button
                      type="button"
                      onClick={() => setEfdOnlyPernoite(false)}
                      className={`px-2 py-1 rounded transition ${efdOnlyPernoite === false ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Regulares
                    </button>
                    <button
                      type="button"
                      onClick={() => setEfdOnlyPernoite(true)}
                      className={`px-2 py-1 rounded transition flex items-center space-x-1 ${efdOnlyPernoite === true ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500'}`}
                    >
                      <Moon className="h-3 w-3" />
                      <span>Pernoites</span>
                    </button>
                  </div>

                  {/* Busca por mapa / placa / motorista / empilhador */}
                  <div className="relative w-48 sm:w-56">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                    <input
                      type="text"
                      placeholder="Buscar mapa, placa, empilhador..."
                      value={efdSearchTerm}
                      onChange={(e) => setEfdSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xxs font-mono focus:outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Tabela de Registros */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xxs font-mono">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Mapa</th>
                      <th className="py-2.5 px-3">Placa</th>
                      <th className="py-2.5 px-3">Empilhador (Turno)</th>
                      <th className="py-2.5 px-3">Motorista / Condutor</th>
                      <th className="py-2.5 px-3">Sa√≠da Rota</th>
                      <th className="py-2.5 px-3">Descarga / Chegada</th>
                      <th className="py-2.5 px-3 text-center">Ciclo</th>
                      <th className="py-2.5 px-3 text-center">Hor√°rio (‚â§ 22:00)</th>
                      <th className="py-2.5 px-3 text-center">Status EFD</th>
                      <th className="py-2.5 px-3 text-center">Pernoite (Ajustar)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTravelRecords.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-slate-400 italic">
                          Nenhum registro de descarregamento encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredTravelRecords.slice(0, 100).map((rec, idx) => {
                        const isUnder10 = rec.unloadedBefore10;
                        const isPernoite = rec.isPernoite;
                        const rawOp = rec.operatorName || (isUnloadedBefore14PM(rec.arrivalTime) ? 'Marivaldo Artur' : 'Jos√© Ronildo');
                        const operatorName = sanitizeEmpilhadorName(rawOp) || rawOp;
                        const isMorning = isUnloadedBefore14PM(rec.arrivalTime);

                        return (
                          <tr key={rec.id || idx} className="hover:bg-slate-50/70 transition">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {rec.routeMap}
                            </td>
                            <td className="py-2 px-3">
                              <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-bold text-[10px]">
                                {rec.plate}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900">{operatorName}</span>
                                <span className={`text-[9px] font-mono ${isMorning ? 'text-amber-700' : 'text-blue-700'}`}>
                                  {isMorning ? 'Turno 1 (< 14h)' : 'Turno 2 (‚â• 14h)'}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-slate-700">
                              {rec.driverName || 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-slate-600">
                              {rec.departureDate ? `${rec.departureDate.split('-').reverse().join('/')} ${rec.departureTime || ''}` : 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-slate-900 font-bold">
                              {rec.arrivalDate ? `${rec.arrivalDate.split('-').reverse().join('/')} ${rec.arrivalTime || ''}` : 'N/A'}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                rec.dayCycleStage === 'D0' ? 'bg-cyan-100 text-cyan-800' :
                                rec.dayCycleStage === 'D1' ? 'bg-emerald-100 text-emerald-800' :
                                rec.dayCycleStage === 'D2' ? 'bg-blue-100 text-blue-800' :
                                rec.dayCycleStage === 'D3' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {rec.dayCycleStage}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isUnder10 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {isUnder10 ? 'At√© 22:00' : '> 22:00'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {isPernoite ? (
                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-bold text-[10px] flex items-center justify-center space-x-1">
                                  <Moon className="h-3 w-3" />
                                  <span>Pernoite Isento</span>
                                </span>
                              ) : isUnder10 ? (
                                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">
                                  ‚úì EFD Batida
                                </span>
                              ) : (
                                <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold text-[10px]">
                                  ‚úó Fora Prazo
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleTogglePernoiteInDashboard(rec)}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer ${
                                  isPernoite 
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs' 
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                }`}
                                title={isPernoite ? 'Clique para desmarcar pernoite' : 'Clique para marcar como pernoite (isenta EFD)'}
                              >
                                <Moon className="h-3 w-3" />
                                <span>{isPernoite ? 'Pernoitou' : 'Marcar Pernoite'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Graphics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Top Product Discrepancies (Pareto) */}
            <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-sans font-bold text-base text-slate-900 mb-1 flex items-center space-x-2">
                <span>Produtos & Ativos com Maior Impacto de Diverg√™ncia</span>
              </h3>
              <p className="text-xxs text-slate-400 mb-6">Lista dos itens com maiores perdas/sobras financeiras acumuladas.</p>

              {topPADiscrepancies.length === 0 && topAGDiscrepancies.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                  Nenhuma diverg√™ncia registrada no dia de hoje.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {/* Produtos Acabados (P.A) */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                      <Box className="h-4 w-4 text-indigo-500" />
                      <h4 className="font-sans font-bold text-xs text-slate-700 uppercase tracking-wider">
                        Produtos Acabados (P.A)
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full">
                        {topPADiscrepancies.length} itens
                      </span>
                    </div>

                    {topPADiscrepancies.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-4 text-center">Nenhuma diverg√™ncia em P.A.</p>
                    ) : (
                      <div className="space-y-3">
                        {topPADiscrepancies.map((p, idx) => {
                          const isLoss = p.financial < 0;
                          return (
                            <div key={p.code + idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col justify-between gap-2.5 shadow-xs">
                              <div className="space-y-0.5">
                                <span className="font-mono text-[10px] font-bold bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 inline-block">
                                  {p.code}
                                </span>
                                <span className="font-sans font-semibold text-slate-800 text-xs block pt-0.5">{p.desc}</span>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-400 block font-mono">Diverg√™ncia F√≠sica</span>
                                  <span className="font-bold text-xs text-slate-700">
                                    {p.missing > 0 && <span className="text-red-600 mr-2">-{p.missing} Faltas</span>}
                                    {p.surplus > 0 && <span className="text-amber-600">+{p.surplus} Sobras</span>}
                                  </span>
                                </div>

                                <div className="text-right bg-white px-2 py-1 rounded border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-mono">Custo</span>
                                  <span className={`font-mono font-black text-xs ${isLoss ? 'text-red-600' : 'text-amber-600'}`}>
                                    {isLoss ? '-' : '+'}R$ {Math.abs(p.financial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Ativos de Giro (A.G) */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
                      <Layers className="h-4 w-4 text-amber-500" />
                      <h4 className="font-sans font-bold text-xs text-slate-700 uppercase tracking-wider">
                        Ativos de Giro (A.G)
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">
                        {topAGDiscrepancies.length} itens
                      </span>
                    </div>

                    {topAGDiscrepancies.length === 0 ? (
                      <p className="text-slate-400 italic text-[11px] py-4 text-center">Nenhuma diverg√™ncia em A.G.</p>
                    ) : (
                      <div className="space-y-3">
                        {topAGDiscrepancies.map((p, idx) => {
                          const isLoss = p.financial < 0;
                          return (
                            <div key={p.code + idx} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex flex-col justify-between gap-2.5 shadow-xs">
                              <div className="space-y-0.5">
                                <span className="font-mono text-[10px] font-bold bg-slate-200/70 px-1.5 py-0.5 rounded text-slate-600 inline-block">
                                  {p.code}
                                </span>
                                <span className="font-sans font-semibold text-slate-800 text-xs block pt-0.5">{p.desc}</span>
                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                                <div className="text-left">
                                  <span className="text-[9px] text-slate-400 block font-mono">Diverg√™ncia F√≠sica</span>
                                  <span className="font-bold text-xs text-slate-700">
                                    {p.missing > 0 && <span className="text-red-600 mr-2">-{p.missing} Faltas</span>}
                                    {p.surplus > 0 && <span className="text-amber-600">+{p.surplus} Sobras</span>}
                                  </span>
                                </div>

                                <div className="text-right bg-white px-2 py-1 rounded border border-slate-100">
                                  <span className="text-[9px] text-slate-400 block font-mono">Custo</span>
                                  <span className={`font-mono font-black text-xs ${isLoss ? 'text-red-600' : 'text-amber-600'}`}>
                                    {isLoss ? '-' : '+'}R$ {Math.abs(p.financial).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Productivity by Conferente */}
            <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-sans font-bold text-base text-slate-900 mb-2">Produtividade por Conferente</h3>
              <p className="text-xxs text-slate-400 mb-6">M√©tricas de tempo de contagem f√≠sica e assertividade por login individual.</p>

              {Object.keys(confProductivity).length === 0 ? (
                <div className="text-center py-16 bg-slate-50 rounded-lg text-slate-400 text-sm border border-dashed border-slate-200">
                  Sem dados de cronometragem acumulados.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.values(confProductivity)
                    .sort((a, b) => b.count - a.count || (a.totalSeconds / a.count) - (b.totalSeconds / b.count))
                    .map((item) => {
                      const avgSec = item.totalSeconds / item.count;
                      const min = Math.floor(avgSec / 60);
                      const sec = Math.floor(avgSec % 60);
                      
                      const accuracyRate = item.count > 0 ? (item.totalAccuracySum / item.count) : 100;
                      
                      return (
                        <div key={item.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-slate-200 transition space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold text-slate-900 text-xs block">{item.name}</span>
                              {item.username && (
                                <span className="font-mono text-xxs text-[#0f35a9] font-medium block">
                                  Login: @{item.username}
                                </span>
                              )}
                            </div>
                            <span className="bg-blue-50 text-blue-700 font-mono text-xxs px-2 py-0.5 rounded font-bold">
                              {item.count} {item.count === 1 ? 'rota' : 'rotas'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Tempo M√©dio</span>
                              <span className="text-xs font-bold text-slate-700 font-mono">
                                {min}m {sec}s
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Acerto (OK)</span>
                              <span className={`text-xs font-bold font-mono ${accuracyRate >= 80 ? 'text-emerald-600' : accuracyRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                {(accuracyRate || 0).toFixed(1)}%
                              </span>
                            </div>
                          </div>

                          {/* Progress bar based on speed (up to 15 minutes = 900s) */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xxs text-slate-400">
                              <span>Velocidade de Contagem</span>
                              <span className="font-mono font-medium">
                                {avgSec < 300 ? 'R√°pida' : avgSec < 600 ? 'M√©dia' : 'Abaixo da M√©dia'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  avgSec < 300 ? 'bg-emerald-500' : avgSec < 600 ? 'bg-amber-500' : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.max(5, Math.min(100, (1 - avgSec / 900) * 100))}%` }} // shorter time = higher progress bar
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

          </div>

          {/* NEW ROW: PRESTADORES DE CONTA WITH MOST DISCREPANCIES */}
          <div className="grid grid-cols-1 gap-8">
            
            {/* Prestadores de Contas Discrepancy Ranking */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6" id="ranking_prestadores">
              
              {/* Header section with titles and Export Report action */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-5">
                <div>
                  <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-amber-600 animate-pulse" />
                    <span>Ranking Avan√ßado de Prestadores de Contas (Diverg√™ncias)</span>
                  </h3>
                  <p className="text-xxs text-slate-400 mt-1">
                    An√°lise e auditoria de conformidade de motoristas e ajudantes baseada no passivo financeiro, quantidade de desvios, volume l√≠quido (HL) e viagens realizadas.
                  </p>
                </div>
                
                {/* Print/Export report button */}
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const listHtml = rankedDrivers.map((item, idx) => {
                        const compliance = item.totalTrips > 0 ? ((item.totalTrips - item.divergentTrips) / item.totalTrips) * 100 : 100;
                        return `
                          <tr style="border-bottom: 1px solid #e2e8f0; font-family: monospace; font-size: 12px;">
                            <td style="padding: 8px; font-weight: bold;">${idx + 1}¬∫</td>
                            <td style="padding: 8px;">${item.name} (${item.role})</td>
                            <td style="padding: 8px; text-align: center;">${item.totalTrips}</td>
                            <td style="padding: 8px; text-align: center; color: #dc2626; font-weight: bold;">${item.divergentTrips}</td>
                            <td style="padding: 8px; text-align: center;">${item.totalMissingQty} un</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold; color: ${item.totalFinancialLoss > 0 ? '#b91c1c' : '#047857'}">
                              ${item.totalFinancialLoss > 0 ? `-R$ ${(item.totalFinancialLoss || 0).toFixed(2)}` : 'R$ 0,00'}
                            </td>
                            <td style="padding: 8px; text-align: center; font-weight: bold; color: #0284c7;">${(item.totalHectos || 0).toFixed(2)} HL</td>
                            <td style="padding: 8px; text-align: right; font-weight: bold; color: ${compliance >= 85 ? '#059669' : compliance >= 60 ? '#d97706' : '#dc2626'}">
                              ${(compliance || 0).toFixed(1)}%
                            </td>
                          </tr>
                        `;
                      }).join('');

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Relat√≥rio de Desvios de Prestadores - LogiRoute</title>
                            <style>
                              body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 24px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                              th { background-color: #f1f5f9; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
                              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; }
                              .kpi-container { display: flex; gap: 16px; margin: 20px 0; }
                              .kpi { flex: 1; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; }
                              .kpi-title { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; }
                              .kpi-val { font-size: 18px; font-weight: bold; margin-top: 4px; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div>
                                <h1 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: -0.5px;">LogiRoute Intelig√™ncia</h1>
                                <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Relat√≥rio Operacional de Conformidade de Prestadores</p>
                              </div>
                              <div style="font-size: 11px; text-align: right; color: #64748b;">
                                Emitido em: ${new Date().toLocaleString('pt-BR')}<br>
                                Filtro: ${rankingRoleFilter === 'TODOS' ? 'Todos' : rankingRoleFilter === 'MOTORISTA' ? 'Apenas Motoristas' : 'Apenas Ajudantes'} | Ordenado por: ${rankingSortMetric === 'valor' ? 'Valor Financeiro' : rankingSortMetric === 'itens' ? 'Quantidade Itens' : rankingSortMetric === 'viagens' ? 'Viagens Divergentes' : 'Hectolitros'}
                              </div>
                            </div>

                            <div class="kpi-container">
                              <div class="kpi">
                                <div class="kpi-title">Total de Colaboradores</div>
                                <div class="kpi-val">${rankedDrivers.length}</div>
                              </div>
                              <div class="kpi">
                                <div class="kpi-title">Atingimento M√©dio do Grupo</div>
                                <div class="kpi-val">
                                  ${(rankedDrivers.reduce((acc, curr) => acc + (curr.totalTrips > 0 ? ((curr.totalTrips - curr.divergentTrips) / curr.totalTrips) * 100 : 100), 0) / (rankedDrivers.length || 1)).toFixed(1)}%
                                </div>
                              </div>
                              <div class="kpi">
                                <div class="kpi-title">Passivo Financeiro Total</div>
                                <div class="kpi-val" style="color: #dc2626;">
                                  R$ ${rankedDrivers.reduce((acc, curr) => acc + curr.totalFinancialLoss, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              </div>
                              <div class="kpi">
                                <div class="kpi-title">Total Desvio Hectolitros</div>
                                <div class="kpi-val" style="color: #0284c7;">
                                  ${(rankedDrivers.reduce((acc, curr) => acc + curr.totalHectos, 0) || 0).toFixed(2)} HL
                                </div>
                              </div>
                            </div>

                            <table>
                              <thead>
                                <tr>
                                  <th style="width: 5%">Pos</th>
                                  <th style="width: 35%">Prestador de Contas</th>
                                  <th style="text-align: center; width: 10%">Viagens</th>
                                  <th style="text-align: center; width: 10%">Com Desvio</th>
                                  <th style="text-align: center; width: 10%">Faltas F√≠sicas</th>
                                  <th style="text-align: right; width: 10%">Valor Passivo</th>
                                  <th style="text-align: center; width: 10%">Desvio HL</th>
                                  <th style="text-align: right; width: 10%">Atingimento</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${listHtml}
                              </tbody>
                            </table>
                            <script>window.print();</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    } else {
                      alert('Bloqueador de popups detectado! Por favor, autorize popups para abrir a vis√£o formatada do relat√≥rio.');
                    }
                  }}
                  className="flex items-center space-x-1.5 bg-slate-900 text-white hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg text-xxs font-semibold font-sans uppercase tracking-wider shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Imprimir Relat√≥rio Formatado</span>
                </button>
              </div>

              {/* Dynamic KPI Cards above table for selected cohort */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Total Filtrado</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">{rankedDrivers.length}</span>
                    <span className="text-xxs text-slate-400 font-sans">colaboradores</span>
                  </div>
                </div>
                
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Atingimento M√©dio</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-slate-800 font-mono">
                      {(rankedDrivers.reduce((acc, curr) => acc + (curr.totalTrips > 0 ? ((curr.totalTrips - curr.divergentTrips) / curr.totalTrips) * 100 : 100), 0) / (rankedDrivers.length || 1)).toFixed(1)}%
                    </span>
                    <span className="text-xxs font-bold text-emerald-600 font-sans">Sem Desvios</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Passivo Acumulado</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-red-700 font-mono">
                      R$ {rankedDrivers.reduce((acc, curr) => acc + curr.totalFinancialLoss, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xxs text-red-500 font-sans font-semibold">Preju√≠zo</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Desvio Volum√©trico</span>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xl font-extrabold text-sky-700 font-mono">
                      {(rankedDrivers.reduce((acc, curr) => acc + curr.totalHectos, 0) || 0).toFixed(1)}
                    </span>
                    <span className="text-xxs text-slate-500 font-sans font-semibold">Hectolitros (HL)</span>
                  </div>
                </div>
              </div>

              {/* Advanced Filter, Search and Sorting Control Panel */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-4">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  
                  {/* Left: Role Pill Buttons */}
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-xxs font-bold text-slate-500 uppercase font-sans tracking-wider mr-1">Filtrar Fun√ß√£o:</span>
                    <button
                      onClick={() => setRankingRoleFilter('TODOS')}
                      className={`px-3 py-1 rounded-full text-xxs font-bold transition-all font-sans ${
                        rankingRoleFilter === 'TODOS'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setRankingRoleFilter('MOTORISTA')}
                      className={`px-3 py-1 rounded-full text-xxs font-bold transition-all font-sans flex items-center space-x-1 ${
                        rankingRoleFilter === 'MOTORISTA'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>üë®‚Äç‚úàÔ∏è Motoristas</span>
                    </button>
                    <button
                      onClick={() => setRankingRoleFilter('AJUDANTE')}
                      className={`px-3 py-1 rounded-full text-xxs font-bold transition-all font-sans flex items-center space-x-1 ${
                        rankingRoleFilter === 'AJUDANTE'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>üë§ Ajudantes</span>
                    </button>
                  </div>

                  {/* Right: Realtime Name/Matricula Search Input */}
                  <div className="relative w-full xl:w-72">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-slate-400" />
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar por colaborador ou matr√≠cula..."
                      value={rankingSearch}
                      onChange={(e) => setRankingSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xxs focus:outline-hidden focus:border-slate-400 font-sans font-medium text-slate-700 shadow-xxs placeholder-slate-400"
                    />
                  </div>

                </div>

                {/* Second row: Sort metric tabs. Fully meets requirements "por quantidade de item, por quantidade viagem, por hecto" */}
                <div className="border-t border-slate-200/60 pt-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                    <span className="text-xxs font-bold text-slate-500 uppercase font-sans tracking-wider">
                      M√©trica de Ordena√ß√£o (Crit√©rio Principal):
                    </span>
                    
                    <div className="flex flex-wrap gap-1 bg-slate-200/60 p-1 rounded-lg">
                      <button
                        onClick={() => setRankingSortMetric('valor')}
                        className={`px-2.5 py-1 rounded-md text-xxs font-bold transition-all font-sans flex items-center space-x-1.5 ${
                          rankingSortMetric === 'valor'
                            ? 'bg-white text-red-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Landmark className="h-3 w-3" />
                        <span>Passivo Gerado (R$)</span>
                      </button>

                      <button
                        onClick={() => setRankingSortMetric('itens')}
                        className={`px-2.5 py-1 rounded-md text-xxs font-bold transition-all font-sans flex items-center space-x-1.5 ${
                          rankingSortMetric === 'itens'
                            ? 'bg-white text-amber-800 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Box className="h-3 w-3" />
                        <span>Quantidade de Itens</span>
                      </button>

                      <button
                        onClick={() => setRankingSortMetric('viagens')}
                        className={`px-2.5 py-1 rounded-md text-xxs font-bold transition-all font-sans flex items-center space-x-1.5 ${
                          rankingSortMetric === 'viagens'
                            ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Truck className="h-3 w-3" />
                        <span>Viagens Divergentes</span>
                      </button>

                      <button
                        onClick={() => setRankingSortMetric('hecto')}
                        className={`px-2.5 py-1 rounded-md text-xxs font-bold transition-all font-sans flex items-center space-x-1.5 ${
                          rankingSortMetric === 'hecto'
                            ? 'bg-white text-sky-800 shadow-xs border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Layers className="h-3 w-3" />
                        <span>Volume Hectolitros (HL)</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-[10px] text-slate-400 italic">
                    {rankingSortMetric === 'valor' && "üí° Ordenando pelo total do passivo gerado (preju√≠zo). Crit√©rio de desempate: Quantidade f√≠sica de desvios."}
                    {rankingSortMetric === 'itens' && "üí° Ordenando pela quantidade absoluta de itens f√≠sicos divergentes (faltas + sobras). Crit√©rio de desempate: Passivo financeiro."}
                    {rankingSortMetric === 'viagens' && "üí° Ordenando pela quantidade de viagens que retornaram com desvio. Crit√©rio de desempate: Passivo financeiro."}
                    {rankingSortMetric === 'hecto' && "üí° Ordenando pelo volume desvios convertido em Hectolitros (HL - l√≠quidos). Crit√©rio de desempate: Passivo financeiro."}
                  </div>
                </div>

              </div>

              {rankedDrivers.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-dashed rounded-lg text-slate-400 text-xs">
                  Sem correspond√™ncias de prestadores de contas com diverg√™ncias para os filtros e busca informados.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-150 rounded-lg shadow-xxs">
                  <table className="min-w-full text-left divide-y divide-slate-150 text-xs font-sans">
                    <thead className="bg-slate-50 font-semibold text-slate-600 border-b border-slate-250">
                      <tr>
                        <th className="px-4 py-3 text-center" style={{ width: '6%' }}>Rank</th>
                        <th className="px-4 py-3">Colaborador / Fun√ß√£o</th>
                        <th className="px-3 py-3 text-center" style={{ width: '12%' }}>Viagens Totais</th>
                        
                        {/* Highlight sorted column header dynamically */}
                        <th className={`px-3 py-3 text-center transition-all ${rankingSortMetric === 'viagens' ? 'bg-indigo-50/70 font-extrabold text-indigo-900' : ''}`} style={{ width: '14%' }}>
                          Viagens c/ Desvio
                        </th>
                        
                        <th className={`px-3 py-3 text-center transition-all ${rankingSortMetric === 'itens' ? 'bg-amber-50/70 font-extrabold text-amber-900' : ''}`} style={{ width: '12%' }}>
                          Faltas / Sobras
                        </th>

                        <th className={`px-3 py-3 text-center transition-all ${rankingSortMetric === 'hecto' ? 'bg-sky-50/70 font-extrabold text-sky-900' : ''}`} style={{ width: '12%' }}>
                          Volume (HL)
                        </th>
                        
                        <th className={`px-4 py-3 text-right transition-all ${rankingSortMetric === 'valor' ? 'bg-red-50/50 font-extrabold text-red-900' : ''}`} style={{ width: '14%' }}>
                          Passivo Gerado
                        </th>
                        
                        <th className="px-4 py-3 text-center bg-slate-100/50 font-extrabold text-slate-700" style={{ width: '20%' }}>
                          Atingimento (Qualidade)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {rankedDrivers.map((item, idx) => {
                        const perfectTrips = item.totalTrips - item.divergentTrips;
                        const complianceRate = item.totalTrips > 0 ? (perfectTrips / item.totalTrips) * 100 : 100;
                        const divRate = item.totalTrips > 0 ? (item.divergentTrips / item.totalTrips) * 100 : 0;
                        const isHighRisk = complianceRate < 60 && item.divergentTrips > 0;

                        // Premium Rank Badge Style
                        let rankBadgeClass = "bg-slate-100 text-slate-600 border-slate-200";
                        let rankText = `${idx + 1}¬∫`;
                        if (idx === 0) rankBadgeClass = "bg-amber-100 text-amber-800 border-amber-300 font-extrabold shadow-xxs ring-1 ring-amber-400/20";
                        else if (idx === 1) rankBadgeClass = "bg-slate-200 text-slate-800 border-slate-300 font-bold shadow-xxs";
                        else if (idx === 2) rankBadgeClass = "bg-orange-100 text-orange-800 border-orange-200 font-bold shadow-xxs";
                        
                        return (
                          <tr key={item.id} className={`hover:bg-slate-50/80 transition-all ${isHighRisk ? 'bg-red-50/5' : ''}`}>
                            
                            {/* Position */}
                            <td className="px-4 py-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center justify-center px-2 py-0.5 text-xxs font-mono rounded-md border ${rankBadgeClass}`}>
                                {idx < 3 && <Sparkles className="h-2.5 w-2.5 mr-0.5 text-amber-600" />}
                                {rankText}
                              </span>
                            </td>

                            {/* Collaborator */}
                            <td className="px-4 py-3">
                              <div>
                                <span className="block font-bold text-slate-800 font-sans tracking-tight leading-tight">
                                  {item.name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mt-0.5">
                                  {item.role === 'MOTORISTA' ? 'üë®‚Äç‚úàÔ∏è Motorista' : 'üë§ Ajudante'} (Matr√≠cula: {item.id})
                                </span>
                              </div>
                            </td>

                            {/* Total Trips */}
                            <td className="px-3 py-3 text-center font-mono font-bold text-slate-700">
                              {item.totalTrips}
                            </td>

                            {/* Divergent Trips */}
                            <td className={`px-3 py-3 text-center font-mono transition-all ${rankingSortMetric === 'viagens' ? 'bg-indigo-50/30 font-bold text-indigo-700' : 'text-slate-600'}`}>
                              <span className={`px-1.5 py-0.5 rounded-sm ${item.divergentTrips > 0 ? 'bg-red-100/60 text-red-700 font-bold' : 'bg-slate-100 text-slate-500'}`}>
                                {item.divergentTrips}
                              </span>
                              <span className="text-[9px] text-slate-400 block mt-1">({(divRate || 0).toFixed(0)}% desvios)</span>
                            </td>

                            {/* Physical Missing/Surplus Quantity */}
                            <td className={`px-3 py-3 text-center font-mono transition-all ${rankingSortMetric === 'itens' ? 'bg-amber-50/30 font-bold text-amber-800' : 'text-slate-600'}`}>
                              <div className="font-semibold text-slate-800">
                                {item.totalMissingQty + item.totalSurplusQty} un
                              </div>
                              <div className="text-[9px] text-slate-400 mt-0.5 flex items-center justify-center space-x-1">
                                <span className="text-rose-600">-{item.totalMissingQty} faltas</span>
                                <span>/</span>
                                <span className="text-emerald-600">+{item.totalSurplusQty} sobras</span>
                              </div>
                            </td>

                            {/* Hectoliters Deviation */}
                            <td className={`px-3 py-3 text-center font-mono transition-all ${rankingSortMetric === 'hecto' ? 'bg-sky-50/30 font-bold text-sky-800' : 'text-slate-600'}`}>
                              <span className="font-bold text-sky-700">
                                {(item.totalHectos || 0).toFixed(2)} <span className="text-[9px] font-normal text-slate-400">HL</span>
                              </span>
                              <div className="w-12 bg-slate-100 h-1 rounded-full mx-auto mt-1.5 overflow-hidden">
                                <div 
                                  className="bg-sky-500 h-full rounded-full" 
                                  style={{ width: `${Math.min(100, item.totalHectos * 10)}%` }} // Scaling for micro visualization
                                />
                              </div>
                            </td>

                            {/* Financial Passive */}
                            <td className={`px-4 py-3 text-right font-mono transition-all ${rankingSortMetric === 'valor' ? 'bg-red-50/20' : ''}`}>
                              {item.totalFinancialLoss > 0 ? (
                                <div className="text-red-700 font-extrabold text-xs">
                                  -R$ {item.totalFinancialLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                              ) : (
                                <div className="text-emerald-700 font-bold text-xs">R$ 0,00</div>
                              )}
                              <span className="text-[9px] text-slate-400 block mt-0.5">passivo fiscal</span>
                            </td>

                            {/* Graphic Percentual de Atingimento */}
                            <td className="px-4 py-3 bg-slate-50/40">
                              <div className="space-y-1 max-w-[140px] mx-auto">
                                <div className="flex items-center justify-between text-[10px] font-semibold">
                                  <span className={`px-1.5 py-0.5 rounded-sm font-mono text-xxs font-bold ${
                                    complianceRate >= 85 ? 'bg-emerald-100 text-emerald-800' :
                                    complianceRate >= 60 ? 'bg-amber-100 text-amber-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {(complianceRate || 0).toFixed(1)}%
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium font-mono">
                                    {perfectTrips}/{item.totalTrips} OK
                                  </span>
                                </div>
                                
                                {/* Micro visual bar of compliance */}
                                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300/40 shadow-inner">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      complianceRate >= 85 ? 'bg-emerald-500' :
                                      complianceRate >= 60 ? 'bg-amber-500' :
                                      'bg-rose-500'
                                    }`} 
                                    style={{ width: `${complianceRate}%` }}
                                  />
                                </div>
                                <span className="text-[8px] text-slate-400 text-center block leading-none">
                                  {complianceRate >= 85 ? 'Atingimento √ìtimo' : complianceRate >= 60 ? 'Aten√ß√£o Operacional' : 'Risco de Conformidade'}
                                </span>
                              </div>
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

          {/* VIS√ÉO GERENCIAL DE REFUGOS, PERCENTUAIS E RANKINGS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6" id="gerencia_refugos">
            <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <span>Controle de Refugos, Percentuais e Rankings (Vis√£o Gerencial)</span>
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Motivos de descarte aferidos pelos conferentes separados por motorista com c√°lculos percentuais autom√°ticos.</p>
              </div>
              <span className="text-xs bg-red-100 text-red-800 font-bold px-3 py-1 rounded-full font-sans">
                Total Geral: {totalRefugosOverallQty} itens refugados
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Card 1: Motivos de Refugo (Percentuais) */}
              <div className="lg:col-span-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Avarias por Motivo e Percentuais</h4>
                
                {rankedRefugoMotives.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    Nenhum refugo ou avaria registrado nesta base de dados.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rankedRefugoMotives.map((item, idx) => (
                      <div key={item.motive + idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-sans font-semibold text-slate-800 uppercase text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs">{item.motive}</span>
                          <span className="font-mono text-slate-600 font-bold">
                            {item.qty} un ‚Ä¢ <strong>{(item.percentage || 0).toFixed(1)}%</strong>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className="bg-red-500 h-full rounded-full transition-all"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Ranking de Motoristas com maior Refugo */}
              <div className="lg:col-span-6 bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
                <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Ranking de Motoristas com Maior Percentual de Avarias</h4>
                
                {rankedRefugoDrivers.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs italic">
                    Nenhum motorista possui hist√≥rico de produtos refugados.
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                    {rankedRefugoDrivers.map((drv, idx) => {
                      const driverNameStr = drivers.find(d => d.id === drv.driverId)?.name || drv.driverId;
                      const driverPercentage = totalRefugosOverallQty > 0 ? (drv.totalRefugoQty / totalRefugosOverallQty) * 100 : 0;
                      return (
                        <div key={drv.driverId + idx} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-red-300 transition-colors">
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] font-extrabold text-slate-400 block">{idx + 1}¬∫ COLABORADOR</span>
                            <span className="font-bold text-slate-800 block">{driverNameStr}</span>
                            <span className="text-[10px] font-mono text-slate-400">Matr√≠cula: {drv.driverId}</span>
                          </div>
                          
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">Volume Descartado</span>
                            <span className="font-bold text-red-600 block">{drv.totalRefugoQty} un</span>
                            <span className="text-[10px] font-mono bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-extrabold">{(driverPercentage || 0).toFixed(1)}% do total</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* PAINEL DE GEST√ÉO E IMPACTO FINANCEIRO DE VALES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6" id="dashboard_vales_gerenciais">
            <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
              <div className="space-y-0.5">
                <span className="text-emerald-600 font-mono text-xxs uppercase tracking-widest block font-bold">Faturamento & Presta√ß√£o de Contas</span>
                <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Landmark className="h-5.5 w-5.5 text-emerald-600" />
                  <span>Painel de Gest√£o e Impacto Financeiro de Vales</span>
                </h3>
                <p className="text-xxs text-slate-400">Vis√£o anal√≠tica do fluxo de termos de autoriza√ß√£o de desconto, assinaturas e faturamento compensado por colaborador.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xxs bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold px-3 py-1 rounded-full font-mono uppercase">
                  Gest√£o Mensal Ativa
                </span>
              </div>
            </div>

            {/* Vales KPIs Cards Grid */}
            {(() => {
              const pendingValesList = vales.filter(v => v.status === 'PENDENTE_ASSINATURA');
              const signedValesList = vales.filter(v => v.status === 'ASSINADO');
              const compensatedValesList = vales.filter(v => v.status === 'COMPENSADO');

              const pendingSum = pendingValesList.reduce((s, v) => s + v.valor, 0);
              const signedSum = signedValesList.reduce((s, v) => s + v.valor, 0);
              const compensatedSum = compensatedValesList.reduce((s, v) => s + v.valor, 0);
              const totalSum = vales.reduce((s, v) => s + v.valor, 0);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Total de Vales Emitidos</span>
                    <span className="text-xl font-bold text-slate-900 block mt-1">R$ {totalSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-slate-500 block mt-1 font-sans font-medium">{vales.length} termos de desconto gerados</span>
                  </div>

                  {/* Pending Card */}
                  <div className="bg-amber-50/75 p-4 rounded-xl border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block font-mono">Pendente Assinatura (Passivo)</span>
                    <span className="text-xl font-bold text-amber-600 block mt-1">R$ {pendingSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-amber-700 block mt-1 font-sans font-semibold">{pendingValesList.length} termos aguardando assinatura</span>
                  </div>

                  {/* Signed Card */}
                  <div className="bg-blue-50/75 p-4 rounded-xl border border-blue-200">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block font-mono">Termos Assinados (Garantido)</span>
                    <span className="text-xl font-bold text-blue-600 block mt-1">R$ {signedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-blue-700 block mt-1 font-sans font-semibold">{signedValesList.length} prontos para desconto</span>
                  </div>

                  {/* Compensated Card */}
                  <div className="bg-emerald-50/75 p-4 rounded-xl border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-mono">Faturado / Compensado</span>
                    <span className="text-xl font-bold text-emerald-600 block mt-1">R$ {compensatedSum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-xxs text-emerald-700 block mt-1 font-sans font-semibold">{compensatedValesList.length} compensados no financeiro</span>
                  </div>
                </div>
              );
            })()}

            {/* Split layout: Left (Aggregated List by Colab), Right (Interactive filterable list of Vales with actions) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Aggregated List by Collaborator */}
              <div className="lg:col-span-4 bg-slate-50/55 p-4 rounded-xl border border-slate-150 space-y-4">
                <div className="space-y-1">
                  <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">Passivo Financeiro por Colaborador</h4>
                  <p className="text-[10px] text-slate-400">Total acumulado de desvios e vales gerados por motorista ou ajudante.</p>
                </div>

                {(() => {
                  const valesByColab = vales.reduce((acc, v) => {
                    if (!acc[v.colaboradorId]) {
                      acc[v.colaboradorId] = {
                        id: v.colaboradorId,
                        name: v.colaboradorName,
                        role: v.colaboradorRole,
                        totalVales: 0,
                        totalAmount: 0,
                        pendingAmount: 0,
                        signedAmount: 0,
                        compensatedAmount: 0
                      };
                    }
                    acc[v.colaboradorId].totalVales += 1;
                    acc[v.colaboradorId].totalAmount += v.valor;
                    if (v.status === 'PENDENTE_ASSINATURA') acc[v.colaboradorId].pendingAmount += v.valor;
                    else if (v.status === 'ASSINADO') acc[v.colaboradorId].signedAmount += v.valor;
                    else if (v.status === 'COMPENSADO') acc[v.colaboradorId].compensatedAmount += v.valor;
                    return acc;
                  }, {} as Record<string, any>);

                  const sortedColabs = Object.values(valesByColab).sort((a, b) => b.totalAmount - a.totalAmount);

                  if (sortedColabs.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400 text-xs italic">
                        Nenhum colaborador com vales registrados.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {sortedColabs.map((col, idx) => {
                        const isHighRisk = col.totalAmount > 350;
                        return (
                          <div key={col.id + idx} className={`p-3 rounded-lg border bg-white flex flex-col space-y-1.5 transition ${isHighRisk ? 'border-red-200' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <span className="font-bold text-slate-800 block text-xs truncate max-w-[150px]">{col.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase block">{col.role} ‚Ä¢ {col.totalVales} {col.totalVales === 1 ? 'vale' : 'vales'}</span>
                              </div>
                              <span className="font-mono font-bold text-xs text-slate-900">
                                R$ {(col.totalAmount || 0).toFixed(2)}
                              </span>
                            </div>

                            {/* Small visual bar representing proportions */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                              <div 
                                className="bg-amber-400 h-full" 
                                style={{ width: `${col.totalAmount > 0 ? ((col.pendingAmount || 0) / col.totalAmount) * 100 : 0}%` }}
                                title={`Pendente: R$ ${(col.pendingAmount || 0).toFixed(2)}`}
                              />
                              <div 
                                className="bg-blue-400 h-full" 
                                style={{ width: `${col.totalAmount > 0 ? ((col.signedAmount || 0) / col.totalAmount) * 100 : 0}%` }}
                                title={`Assinado: R$ ${(col.signedAmount || 0).toFixed(2)}`}
                              />
                              <div 
                                className="bg-emerald-400 h-full" 
                                style={{ width: `${col.totalAmount > 0 ? ((col.compensatedAmount || 0) / col.totalAmount) * 100 : 0}%` }}
                                title={`Compensado: R$ ${(col.compensatedAmount || 0).toFixed(2)}`}
                              />
                            </div>

                            {/* Risk alert badge */}
                            {isHighRisk && (
                              <div className="text-[9px] bg-red-50 text-red-600 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle className="h-2.5 w-2.5 text-red-500 animate-pulse" />
                                ALTO PASSIVO ACUMULADO (Aten√ß√£o no Faturamento)
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Filterable List of Vales with actions */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-150">
                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'todos', label: 'Todos' },
                      { key: 'PENDENTE_ASSINATURA', label: 'Pendentes' },
                      { key: 'ASSINADO', label: 'Assinados' },
                      { key: 'COMPENSADO', label: 'Compensados' }
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setValesFilter(f.key as any)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition cursor-pointer ${
                          valesFilter === f.key 
                            ? 'bg-slate-900 text-white shadow-3xs' 
                            : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Search bar inside Vales dashboard */}
                  <div className="relative max-w-xs w-full">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por colaborador..."
                      value={valesSearch}
                      onChange={(e) => setValesSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-slate-500"
                    />
                  </div>
                </div>

                {/* File Input and Handler for Vales Dashboard */}
                <input
                  type="file"
                  ref={dashboardValeInputRef}
                  accept="application/pdf,image/*"
                  className="hidden"
                  id="dashboard_vale_file_input_direct"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || !selectedValeIdForUploadDash) return;

                    const reader = new FileReader();
                    reader.onload = () => {
                      const dataUrl = reader.result as string;
                      const updated = vales.map(v => 
                        v.id === selectedValeIdForUploadDash 
                          ? { ...v, status: 'ASSINADO' as const, signedPdfUrl: dataUrl, signedPdfName: file.name } 
                          : v
                      );
                      onSaveVales(updated);
                      setSelectedValeIdForUploadDash(null);
                      alert(`Termo assinado anexado com sucesso para o vale! O arquivo "${file.name}" foi importado.`);
                    };
                    reader.readAsDataURL(file);
                  }}
                />

                {/* Vales Cards / Table */}
                {(() => {
                  const filteredVales = vales.filter(v => {
                    const matchesStatus = valesFilter === 'todos' || v.status === valesFilter;
                    const matchesSearch = v.colaboradorName.toLowerCase().includes(valesSearch.toLowerCase()) || 
                                          v.descricao.toLowerCase().includes(valesSearch.toLowerCase()) ||
                                          v.routeMap?.toLowerCase().includes(valesSearch.toLowerCase());
                    return matchesStatus && matchesSearch;
                  });

                  if (filteredVales.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-50 rounded-xl text-slate-400 text-xs italic border border-dashed border-slate-200">
                        Nenhum termo de vale encontrado com os crit√©rios de busca aplicados.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-150 rounded-xl overflow-hidden bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-[9px] text-slate-400 font-bold uppercase tracking-wider font-sans">
                              <th className="py-2.5 px-3">Colaborador</th>
                              <th className="py-2.5 px-3">Origem / Descri√ß√£o</th>
                              <th className="py-2.5 px-3 text-right">Valor</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-center">A√ß√µes</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                            {filteredVales.map((vale) => (
                              <tr key={vale.id} className="hover:bg-slate-50/50 transition">
                                <td className="py-3 px-3">
                                  <span className="font-bold text-slate-900 block leading-tight">{vale.colaboradorName}</span>
                                  <span className="text-[9px] font-mono text-slate-400 block uppercase">{vale.colaboradorRole}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="text-slate-600 block line-clamp-1 max-w-[200px] leading-tight" title={vale.descricao}>{vale.descricao}</span>
                                  <span className="text-[10px] text-slate-400 block font-sans">
                                    {vale.routeMap !== 'AVULSO' ? `Mapa ${vale.routeMap}` : 'Mapa Avulso'} ‚Ä¢ {new Date(vale.dataGeracao + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                                  R$ {(vale.valor || 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                                    vale.status === 'COMPENSADO'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : vale.status === 'ASSINADO'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                  }`}>
                                    {vale.status === 'PENDENTE_ASSINATURA' ? 'Pendente' : vale.status === 'ASSINADO' ? 'Assinado' : 'Compensado'}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex justify-center items-center gap-1.5">
                                    {/* View details */}
                                    <button
                                      type="button"
                                      onClick={() => setViewingValeDetails(vale)}
                                      className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition"
                                      title="Visualizar Detalhes do Termo"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Upload/Assign manual term */}
                                    {vale.status === 'PENDENTE_ASSINATURA' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedValeIdForUploadDash(vale.id);
                                          setTimeout(() => {
                                            dashboardValeInputRef.current?.click();
                                          }, 50);
                                        }}
                                        className="p-1 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded cursor-pointer transition"
                                        title="Importar vale assinado (PDF ou Imagem)"
                                      >
                                        <UploadCloud className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* Compensate / Invoice */}
                                    {(vale.status === 'ASSINADO' || vale.status === 'PENDENTE_ASSINATURA') && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestConfirm(
                                            'Confirmar Compensa√ß√£o',
                                            `Tem certeza de que deseja faturar e marcar este vale de R$ ${(vale.valor || 0).toFixed(2)} para ${vale.colaboradorName} como COMPENSADO?`,
                                            () => {
                                              const updated = vales.map(v => v.id === vale.id ? { ...v, status: 'COMPENSADO' as const } : v);
                                              onSaveVales(updated);
                                            }
                                          );
                                        }}
                                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] rounded uppercase transition cursor-pointer"
                                        title="Faturar e marcar como compensado"
                                      >
                                        Compensar
                                      </button>
                                    )}

                                    {/* Download signed attachment if present */}
                                    {(vale.status === 'ASSINADO' || vale.status === 'COMPENSADO') && vale.signedPdfUrl && (
                                      <a
                                        href={vale.signedPdfUrl}
                                        download={vale.signedPdfName || `vale_assinado_${vale.id}.pdf`}
                                        className="p-1 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer transition flex items-center justify-center"
                                        title={`Baixar anexo: ${vale.signedPdfName || 'PDF'}`}
                                      >
                                        <FileText className="h-3.5 w-3.5" />
                                      </a>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>



        </div>
      )}

      {gestorTab === 'cadastros' && (
        /* CADASTROS & BASES MANAGEMENT SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="gestor_cadastros">
          
          {/* Left Sub-navigation Bar */}
          <div className="lg:col-span-3 space-y-2">
            <span className="text-xxs font-bold text-slate-400 uppercase tracking-widest pl-3 block mb-2">Se√ß√µes de Cadastro</span>
            
            <button
              id="subtab_usuarios"
              onClick={() => { setCadastroSubTab('usuarios'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'usuarios' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Cadastro de Usu√°rios</span>
            </button>

            <button
              id="subtab_produtos"
              onClick={() => { setCadastroSubTab('produtos'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'produtos' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Cadastro de Produtos (PA)</span>
            </button>

            <button
              id="subtab_veiculos"
              onClick={() => { setCadastroSubTab('veiculos'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'veiculos' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Truck className="h-4 w-4" />
              <span>Base de Ve√≠culos / Placas</span>
            </button>

            <button
              id="subtab_motoristas"
              onClick={() => { setCadastroSubTab('motoristas'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'motoristas' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Motoristas e Ajudantes</span>
            </button>

            <button
              id="subtab_manutencao"
              onClick={() => { setCadastroSubTab('manutencao'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'manutencao' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <HardDrive className="h-4 w-4" />
              <span>Manuten√ß√£o do Sistema</span>
            </button>

            <button
              id="subtab_manual_diretrizes"
              onClick={() => { setCadastroSubTab('manual_diretrizes'); setSearchQuery(''); }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                cadastroSubTab === 'manual_diretrizes' 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-4 w-4 text-indigo-600" />
              <span className="flex-1">Padr√£o de Diretrizes</span>
              <span className="text-[8px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full font-sans uppercase">Baixar/Importar</span>
            </button>

            {currentUser.role === 'gestor' && (
              <>
                <button
                  id="subtab_simular_troca"
                  onClick={() => { setCadastroSubTab('simular_troca'); setSearchQuery(''); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2.5 transition cursor-pointer ${
                    cadastroSubTab === 'simular_troca' 
                      ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold' 
                      : 'text-amber-800 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 ${cadastroSubTab === 'simular_troca' ? 'animate-spin' : 'text-amber-600'}`} />
                  <span className="flex-1">Trocar Banco de Dados</span>
                  <span className="text-[8px] font-black bg-slate-950 text-amber-400 px-1.5 py-0.5 rounded-full font-sans uppercase">Gestor</span>
                </button>

                <button
                  id="subtab_firebase"
                  onClick={() => { setCadastroSubTab('firebase'); setSearchQuery(''); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                    cadastroSubTab === 'firebase' 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Database className="h-4 w-4 text-emerald-600" />
                  <span className="flex-1">Conex√£o Firebase Store</span>
                  <span className="text-[8px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-sans uppercase">Online</span>
                </button>

                <button
                  id="subtab_exportar"
                  onClick={() => { setCadastroSubTab('exportar'); setSearchQuery(''); }}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2.5 transition ${
                    cadastroSubTab === 'exportar' 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Download className="h-4 w-4 text-blue-500" />
                  <span className="flex-1">Exportar Dados da Plataforma</span>
                  <span className="text-[8px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full font-sans uppercase">Backup 100%</span>
                </button>
              </>
            )}
          </div>

          {/* Right Work Form & Table lists */}
          <div className="lg:col-span-9 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            
            {/* 1. USUARIOS TAB */}
            {cadastroSubTab === 'usuarios' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900">Gerenciamento de Usu√°rios</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Cadastre Conferentes, Auxiliares de Log√≠stica ou Gestores.</p>
                  </div>
                </div>

                {/* Form users */}
                <form onSubmit={handleAddUser} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-3">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Lucas Ferreira"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Nome de Usu√°rio (Username) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: lucas.log"
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Senha de Acesso *</label>
                    <input
                      type="password"
                      required
                      placeholder="Ex: 123"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Fun√ß√£o / Perfil *</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 focus:outline-none"
                    >
                      <option value="conferente">Conferente de P√°tio</option>
                      <option value="auxiliar_logistica">Auxiliar de Log√≠stica (Fiscal)</option>
                      <option value="empilhador">Operador de Empilhadeira (Carregamento)</option>
                      <option value="financeiro">Financeiro</option>
                      <option value="monitoramento">Monitoramento</option>
                      <option value="gestor">Gestor Master</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 flex flex-col space-y-1.5">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-3 rounded flex items-center justify-center space-x-1 text-xs shadow-xs cursor-pointer"
                    >
                      {editingUserId ? <Check className="h-4 w-4 text-emerald-400" /> : <Plus className="h-4 w-4 text-amber-400" />}
                      <span>{editingUserId ? 'Salvar' : 'Cadastrar'}</span>
                    </button>
                    {editingUserId && (
                      <button
                        type="button"
                        onClick={handleCancelEditUser}
                        className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-1 px-3 rounded text-[10px] cursor-pointer text-center"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>

                {/* List of users */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Nome</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Username</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Senha</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Perfil / Permiss√µes</th>
                        <th className="px-4 py-2 w-24 text-right pr-6">A√ß√µes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{u.username}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{u.password || '123'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xxs font-bold border uppercase ${
                              u.role === 'conferente' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                              u.role === 'auxiliar_logistica' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              u.role === 'empilhador' ? 'bg-orange-50 text-orange-800 border-orange-200' :
                              u.role === 'financeiro' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              u.role === 'monitoramento' ? 'bg-sky-50 text-sky-800 border-sky-200' :
                              'bg-purple-50 text-purple-800 border-purple-200'
                            }`}>
                              {u.role === 'conferente' ? 'üë®‚Äç‚úàÔ∏è Conferente' : 
                               u.role === 'auxiliar_logistica' ? 'üë©‚Äçüíª Auxiliar de Log√≠stica' : 
                               u.role === 'empilhador' ? 'üöú Empilhador' :
                               u.role === 'financeiro' ? 'üí∞ Financeiro' :
                               u.role === 'monitoramento' ? 'üì° Monitoramento' : 'üëë Gestor'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right flex items-center justify-end space-x-1.5 pr-4">
                            <button
                              type="button"
                              onClick={() => handleStartEditUser(u)}
                              className="text-slate-400 hover:text-blue-600 transition p-1 cursor-pointer"
                              title="Editar Colaborador"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(u.id)}
                              className="text-slate-400 hover:text-red-600 transition p-1 cursor-pointer"
                              title="Excluir Colaborador"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. PRODUTOS TAB */}
            {cadastroSubTab === 'produtos' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900 font-sans">Cadastro de Produtos Acabados (PA)</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Base cadastrada para a confer√™ncia √†s cegas e valoriza√ß√£o financeira.</p>
                  </div>

                  {/* Search inside Products */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar por c√≥digo/nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-7 focus:outline-none"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                  </div>
                </div>

                {/* Form product */}
                <form onSubmit={handleAddProduct} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">C√≥d SKU *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 2542"
                      value={newProdCode}
                      onChange={(e) => setNewProdCode(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Descri√ß√£o Completa *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: SKOL OW 300ML"
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Custo SKU (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="Ex: 53.35"
                      value={newProdCost}
                      onChange={(e) => setNewProdCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Hectolitro do SKU (HL) *</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      placeholder="Ex: 0.0350"
                      value={newProdHectoFactor}
                      onChange={(e) => setNewProdHectoFactor(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-1 rounded flex items-center justify-center space-x-0.5 text-xs h-9"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                      <span>Add</span>
                    </button>
                  </div>
                </form>

                {/* Product Bulk Excel/CSV Import Section */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Importador em Massa de Produtos (Excel / CSV)</span>
                    </div>
                    <div className="flex items-center space-x-3 text-xxs font-semibold bg-white px-3 py-1 rounded-full border border-slate-200">
                      <span className="text-slate-500 uppercase">Modo de Importa√ß√£o:</span>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="prodImportMode"
                          value="replace"
                          checked={productImportMode === 'replace'}
                          onChange={() => setProductImportMode('replace')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={productImportMode === 'replace' ? 'text-red-700 font-bold' : 'text-slate-500'}>Substituir (Apagar Anteriores)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="prodImportMode"
                          value="merge"
                          checked={productImportMode === 'merge'}
                          onChange={() => setProductImportMode('merge')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={productImportMode === 'merge' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Mesclar (Atualizar Existentes)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="prodImportMode"
                          value="add"
                          checked={productImportMode === 'add'}
                          onChange={() => setProductImportMode('add')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={productImportMode === 'add' ? 'text-emerald-700 font-bold' : 'text-slate-500'}>Adicionar (Apenas Novos)</span>
                      </label>
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsProductDragOver(true);
                    }}
                    onDragLeave={() => setIsProductDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsProductDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleProductImport(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => document.getElementById('product-file-input')?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 ${
                      isProductDragOver
                        ? 'border-emerald-500 bg-emerald-50/40'
                        : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <input
                      id="product-file-input"
                      type="file"
                      accept=".csv,.txt"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleProductImport(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <UploadCloud className="h-8 w-8 text-slate-400 mx-auto" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Arraste e solte o arquivo aqui ou <span className="text-emerald-600 underline">procure nos arquivos</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Formatos suportados: CSV delimitado por ponto e v√≠rgula (.csv, .txt)
                      </p>
                    </div>
                    <div className="bg-slate-50 text-slate-500 p-2 rounded border border-slate-200 text-[10px] text-center max-w-xl">
                      <strong>Colunas esperadas no arquivo de importa√ß√£o:</strong> C√≥digo (ou SKU), Descri√ß√£o (ou Nome), Custo SKU e Hectolitro.
                    </div>
                  </div>
                </div>

                {/* Table of Products */}
                <div className="border border-slate-100 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">C√≥d SKU</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Descri√ß√£o</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase text-right">Custo SKU</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase text-right">Hectolitro</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {products
                        .filter(p => p.description.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery))
                        .map(p => (
                          <tr key={p.code} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-bold text-slate-600 bg-slate-50/50">{p.code}</td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{p.description}</td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-slate-900">
                              R$ {p.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-slate-500">
                              {(p.hectoFactor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 4 })} HL
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(p.code)}
                                className="text-slate-400 hover:text-red-600 transition p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. VEICULOS TAB */}
            {cadastroSubTab === 'veiculos' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-sans font-bold text-base text-slate-900">Base de Ve√≠culos da Frota</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Cadastre as placas dos caminh√µes de entrega com suas respectivas capacidades.</p>
                </div>

                {/* Pending Requests Box */}
                {vehicles.some(v => v.isTemporary) && (
                  <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">Aten√ß√£o</span>
                      <h4 className="font-sans font-bold text-sm text-slate-800">Solicita√ß√µes de Cadastro de Ve√≠culo ({vehicles.filter(v => v.isTemporary).length})</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">Os conferentes de p√°tio solicitaram o cadastro tempor√°rio dos seguintes ve√≠culos durante a pesagem. Insira a capacidade oficial para homologar.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {vehicles.filter(v => v.isTemporary).map(v => (
                        <div key={v.plate} className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between shadow-xs">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-950 block text-sm">{v.plate}</span>
                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block">‚ö†Ô∏è AGUARDANDO CAPACIDADE</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewVehPlate(v.plate);
                              setNewVehCapacity(10); // default suggestion
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-xs flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Homologar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form vehicle */}
                <form onSubmit={handleAddVehicle} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Placa do Ve√≠culo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: XYZ9K12"
                      value={newVehPlate}
                      onChange={(e) => setNewVehPlate(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 uppercase font-mono"
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Capacidade em Pallets *</label>
                    <input
                      type="number"
                      required
                      placeholder="Ex: 10"
                      value={newVehCapacity}
                      onChange={(e) => setNewVehCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-3 rounded flex items-center justify-center space-x-1 text-xs"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                      <span>Cadastrar</span>
                    </button>
                  </div>
                </form>

                {/* Table of vehicles */}
                <div className="border border-slate-100 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Placa</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Capacidade Pallets</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {vehicles.map(v => (
                        <tr key={v.plate} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-800 flex items-center">
                            <span>{v.plate}</span>
                            {v.isTemporary && (
                              <span className="ml-2 text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded shadow-xxs">
                                ‚ö†Ô∏è Solicita√ß√£o Pendente
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-600">
                            {v.isTemporary ? (
                              <span className="text-amber-600 italic">Capacidade pendente</span>
                            ) : (
                              `${v.capacityPallets} pallets`
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveVehicle(v.plate)}
                              className="text-slate-400 hover:text-red-600 transition p-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. MOTORISTAS TAB */}
            {cadastroSubTab === 'motoristas' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900">Cadastro de Motoristas e Ajudantes</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Base de prestadores de conta respons√°veis pelos retornos de rota.</p>
                  </div>

                  {/* Search drivers */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Filtrar por nome/CPF..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-7 focus:outline-none"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-400" />
                  </div>
                </div>

                {/* Pending Requests Box */}
                {drivers.some(d => d.isTemporary) && (
                  <div className="bg-amber-50/40 rounded-xl p-4 border border-amber-200 shadow-sm space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border border-amber-200">Aten√ß√£o</span>
                      <h4 className="font-sans font-bold text-sm text-slate-800">Solicita√ß√µes de Cadastro de Colaborador ({drivers.filter(d => d.isTemporary).length})</h4>
                    </div>
                    <p className="text-[11px] text-slate-500">Os conferentes de p√°tio inseriram colaboradores tempor√°rios que n√£o estavam cadastrados na base. Insira a matr√≠cula e CPF oficiais para homologar os registros.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {drivers.filter(d => d.isTemporary).map(d => (
                        <div key={d.id} className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-between gap-2 shadow-xs">
                          <div>
                            <span className="font-sans font-bold text-slate-950 block text-sm truncate" title={d.name}>{d.name}</span>
                            <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider block">‚ö†Ô∏è {d.role} PENDENTE</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewDrvId('');
                              setNewDrvName(d.name);
                              setNewDrvRole(d.role);
                              setNewDrvCpf('');
                              setEditingTempDriverId(d.id);
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2.5 py-1.5 rounded transition shadow-xs self-start cursor-pointer"
                          >
                            <span>Preencher e Homologar</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form helper */}
                <form onSubmit={handleAddDriver} className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">
                      Matr√≠cula (Ex: G1170) * {editingTempDriverId && <span className="text-amber-600 font-bold">(Promovendo...)</span>}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="GXXXX"
                      value={newDrvId}
                      onChange={(e) => setNewDrvId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono uppercase"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: JOS√â ALENCAR"
                      value={newDrvName}
                      onChange={(e) => setNewDrvName(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">Fun√ß√£o *</label>
                    <select
                      value={newDrvRole}
                      onChange={(e) => setNewDrvRole(e.target.value as any)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2"
                    >
                      <option value="MOTORISTA">Motorista</option>
                      <option value="AJUDANTE">Ajudante</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xxs font-semibold text-slate-600 mb-1">CPF *</label>
                    <input
                      type="text"
                      required
                      placeholder="000.000.000-00"
                      value={newDrvCpf}
                      onChange={(e) => setNewDrvCpf(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded p-2 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="submit"
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 px-2 rounded flex items-center justify-center space-x-1 text-xs"
                    >
                      <Plus className="h-4 w-4 text-amber-400" />
                      <span>{editingTempDriverId ? 'Homologar' : 'Adicionar'}</span>
                    </button>
                  </div>
                </form>

                {/* Table of drivers/helpers */}
                <div className="border border-slate-100 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Matr√≠cula</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Nome</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">Fun√ß√£o</th>
                        <th className="px-4 py-2 font-bold text-slate-500 uppercase">CPF</th>
                        <th className="px-4 py-2 w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                      {drivers
                        .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.cpf.includes(searchQuery) || d.id.includes(searchQuery))
                        .map(d => (
                          <tr key={d.id} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-mono font-bold text-slate-600 bg-slate-50/50 flex items-center">
                              <span>{d.id}</span>
                              {d.isTemporary && (
                                <span className="ml-2 text-[8px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded shadow-xxs">
                                  ‚ö†Ô∏è Solicita√ß√£o
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{d.name}</td>
                            <td className="px-4 py-2 text-xxs text-slate-500 font-semibold">{d.role}</td>
                            <td className="px-4 py-2 font-mono text-slate-500">{d.cpf}</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveDriver(d.id)}
                                className="text-slate-400 hover:text-red-600 transition p-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 5. MANUTEN√á√ÉO TAB */}
            {cadastroSubTab === 'manutencao' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-sans font-bold text-base text-slate-900">Manuten√ß√£o do Sistema</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">Procedimentos de exporta√ß√£o, reinicializa√ß√£o e limpeza de transa√ß√µes locais.</p>
                </div>

                {/* Grid layout for different maintenance panels */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Panel 1: Seguran√ßa de Provas & Imagens */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-slate-900 mb-1 flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-[#0f35a9]" />
                        <span>Seguran√ßa de Provas & Imagens</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mb-4">Administre o banco de dados IndexedDB de evid√™ncias fotogr√°ficas anexadas como prova fiscal.</p>

                      {/* Storage usage display card */}
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-center">
                        <Camera className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-mono">Uso de Armazenamento Local</span>
                        <span className="text-xl font-bold font-mono text-[#0f35a9] block mt-0.5">
                          {photoStats.sizeMb} MB
                        </span>
                        <span className="text-xs text-slate-600 font-bold block mt-0.5">
                          {photoStats.count} fotos gravadas no banco
                        </span>
                      </div>

                      {/* Retention policy inputs */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pol√≠tica de Limpeza de Imagens</label>
                          <select
                            value={retentionDays}
                            onChange={e => setRetentionDays(Number(e.target.value))}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value={2}>Apagar mais antigas que 2 dias / 48 horas (Padr√£o Unidade)</option>
                            <option value={1}>Prunar maiores que 1 dia (Simular Limpeza)</option>
                            <option value={3}>Apagar mais antigas que 3 dias / 72 horas</option>
                            <option value={15}>Apagar mais antigas que 15 dias</option>
                            <option value={30}>Apagar mais antigas que 30 dias</option>
                            <option value={180}>Apagar mais antigas que 6 meses</option>
                            <option value={365}>Apagar mais antigas que 12 meses</option>
                          </select>
                          <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                            Conforme as diretrizes da unidade, as evid√™ncias fotogr√°ficas e de concilia√ß√£o s√£o armazenadas na pasta compartilhada. A plataforma remove automaticamente fotos, logs e opera√ß√µes conclu√≠das ap√≥s 48 horas para m√°xima otimiza√ß√£o.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <button
                        type="button"
                        onClick={handlePrunePhotos}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Prunar e Praticar Limpeza Local</span>
                      </button>
                    </div>
                  </div>

                  {/* Panel 2: Limpeza de Mapas por Data */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs animate-fade-in">
                    <div>
                      <h3 className="font-sans font-bold text-sm text-slate-900 mb-1 flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-red-600" />
                        <span>Excluir Mapas do Dia</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 mb-4">Selecione uma data para excluir permanentemente todos os mapas importados correspondentes.</p>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Selecione o Dia para Exclus√£o</label>
                          <select
                            value={selectedDeleteDate}
                            onChange={e => setSelectedDeleteDate(e.target.value)}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          >
                            <option value="">-- Selecione uma Data --</option>
                            {uniqueDatesFromImported.map(dateStr => (
                              <option key={dateStr} value={dateStr}>
                                {new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')} ({importedRoutes.filter(r => r.routeDate === dateStr).length} mapas)
                              </option>
                            ))}
                          </select>
                          <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                            Ao selecionar uma data e clicar no bot√£o de limpeza, todos os mapas e roteiros importados na referida data ser√£o exclu√≠dos permanentemente do banco de dados, incluindo as auditorias e vales vinculados a esses mapas.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <button
                        type="button"
                        disabled={!selectedDeleteDate}
                        onClick={handleDeleteMapsByDate}
                        className={`w-full font-bold py-2 px-4 rounded-lg text-xs transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer ${
                          selectedDeleteDate 
                            ? 'bg-red-600 hover:bg-red-500 text-white' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Limpar Mapas do Dia Selecionado</span>
                      </button>
                    </div>
                  </div>

                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-900 flex items-center space-x-2">
                        <HardDrive className="h-4 w-4 text-amber-500" />
                        <span>Manuten√ß√£o de Ciclo Anual & Limpeza de Mem√≥ria</span>
                      </h4>
                      <p className="text-xxs text-slate-500 mt-1">
                        Exporte o backup anual consolidado das confer√™ncias e rotas para liberar a mem√≥ria local do navegador (prevenindo problemas de armazenamento e desempenho futuramente).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={handleExportAnnualBackup}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 transition shadow-3xs cursor-pointer font-sans"
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        <span>Exportar Backup Anual (.json)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowResetModal(true)}
                        className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center space-x-2 transition shadow-3xs cursor-pointer font-sans"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Resetar Base de Dados</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* RESET CONFIRM MODAL */}
                {showResetModal && (
                  <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-xl">
                      <div className="text-center space-y-2">
                        <div className="mx-auto bg-red-100 text-red-700 p-3 rounded-full w-12 h-12 flex items-center justify-center">
                          <AlertTriangle className="h-6 w-6 animate-pulse" />
                        </div>
                        <h3 className="font-sans font-bold text-lg text-slate-900">Aten√ß√£o: A√ß√£o Irrevers√≠vel</h3>
                        <p className="text-xs text-slate-500">
                          Voc√™ est√° prestes a resetar e apagar permanentemente todas as auditorias f√≠sicas, rotas importadas e evid√™ncias fotogr√°ficas locais.
                        </p>
                      </div>

                      <div className="bg-red-50 text-red-950 p-3 rounded-lg text-xxs leading-relaxed border border-red-100">
                        <strong>Importante:</strong> Certifique-se de ter feito o download do arquivo de <b>Backup Anual</b> clicando no bot√£o verde antes de prosseguir. Sem o backup, estes dados n√£o poder√£o ser recuperados!
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xxs font-bold text-slate-600 uppercase">Para confirmar, digite <b>RESETAR</b> abaixo:</label>
                        <input
                          type="text"
                          placeholder="RESETAR"
                          value={resetConfirmWord}
                          onChange={e => setResetConfirmWord(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none uppercase font-mono tracking-widest text-center"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xxs font-bold text-slate-600 uppercase text-red-600 font-sans">Senha de Seguran√ßa (Obrigat√≥ria):</label>
                        <input
                          type="password"
                          placeholder="Digite a senha"
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none text-center"
                        />
                      </div>

                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => {
                            setShowResetModal(false);
                            setResetConfirmWord('');
                            setResetPassword('');
                          }}
                          className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold py-2.5 rounded-lg transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleResetDatabaseWipe}
                          disabled={resetConfirmWord !== 'RESETAR' || resetPassword !== '!Bud0102'}
                          className={`flex-1 text-white text-xs font-bold py-2.5 rounded-lg transition ${
                            (resetConfirmWord === 'RESETAR' && resetPassword === '!Bud0102') ? 'bg-red-600 hover:bg-red-700 cursor-pointer' : 'bg-slate-300 cursor-not-allowed'
                          }`}
                        >
                          Confirmar e Apagar Base
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {cadastroSubTab === 'simular_troca' && currentUser.role === 'gestor' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900 flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 text-amber-500 animate-spin" />
                      <span>Simula√ß√£o e Automa√ß√£o de Banco de Dados</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Teste a troca de banco de dados em tempo real e veja refletir simultaneamente no PC e Celular.
                    </p>
                  </div>
                </div>

                <DatabaseSwitcher compact={false} currentUser={currentUser} onSwitchComplete={fetchFirebaseStatus} />
              </div>
            )}

            {cadastroSubTab === 'firebase' && currentUser.role === 'gestor' && (
              <div className="space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-sans font-bold text-base text-slate-900">Conex√£o Firebase Store</h3>
                    <p className="text-xxs text-slate-400 mt-0.5">Vis√£o geral do canal de sincroniza√ß√£o em tempo real e alternador de bancos de dados.</p>
                  </div>
                  <button
                    onClick={fetchFirebaseStatus}
                    disabled={firebaseLoading}
                    className="flex items-center space-x-1.5 px-3 py-2 text-xs font-bold bg-[#0f35a9] text-white rounded-lg hover:bg-blue-800 transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 ${firebaseLoading ? 'animate-spin' : ''}`} />
                    <span>Atualizar Conex√£o</span>
                  </button>
                </div>

                {/* 1-Click Database Switcher */}
                <DatabaseSwitcher compact={false} currentUser={currentUser} onSwitchComplete={fetchFirebaseStatus} />

                {/* Configuration Form Card matching the requested style */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <h4 className="font-sans font-bold text-xs text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <SlidersHorizontal className="h-4 w-4 text-[#0f35a9]" />
                    <span>Configura√ß√µes do Banco de Dados Firebase</span>
                  </h4>

                  <form onSubmit={handleSaveFirebaseConfig} className="space-y-4">
                    {/* API KEY */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        API KEY <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formApiKey}
                        onChange={(e) => setFormApiKey(e.target.value)}
                        placeholder="AIzaSyA_..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        required
                      />
                    </div>

                    {/* AUTH DOMAIN & PROJECT ID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          AUTH DOMAIN <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formAuthDomain}
                          onChange={(e) => setFormAuthDomain(e.target.value)}
                          placeholder="armazemfacil-b2292.firebaseapp.com"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          PROJECT ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formProjectId}
                          onChange={(e) => setFormProjectId(e.target.value)}
                          placeholder="armazemfacil-b2292"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                          required
                        />
                      </div>
                    </div>

                    {/* STORAGE BUCKET & MESSAGING SENDER ID */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          STORAGE BUCKET
                        </label>
                        <input
                          type="text"
                          value={formStorageBucket}
                          onChange={(e) => setFormStorageBucket(e.target.value)}
                          placeholder="armazemfacil-b2292.appspot.com"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          MESSAGING SENDER ID
                        </label>
                        <input
                          type="text"
                          value={formMessagingSenderId}
                          onChange={(e) => setFormMessagingSenderId(e.target.value)}
                          placeholder="688234941301"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>

                    {/* APP ID */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        APP ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formAppId}
                        onChange={(e) => setFormAppId(e.target.value)}
                        placeholder="1:688234941301:web:153e2ad3f634379fe3213c"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        required
                      />
                    </div>

                    {/* MEASUREMENT ID (OPCIONAL) & DATABASE ID (OPCIONAL) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          MEASUREMENT ID (OPCIONAL)
                        </label>
                        <input
                          type="text"
                          value={formMeasurementId}
                          onChange={(e) => setFormMeasurementId(e.target.value)}
                          placeholder="G-6HFDEKWVDB"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          DATABASE ID (FIRESTORE)
                        </label>
                        <input
                          type="text"
                          value={formFirestoreDatabaseId}
                          onChange={(e) => setFormFirestoreDatabaseId(e.target.value)}
                          placeholder="default"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        />
                      </div>
                    </div>

                    {/* Test/Connection Results Alert */}
                    {testResult && (
                      <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs border ${
                        testResult.success 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}>
                        {testResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <strong className="block font-bold">{testResult.success ? 'Sucesso!' : 'Ocorreu um erro:'}</strong>
                          <span className="opacity-95">{testResult.message}</span>
                        </div>
                      </div>
                    )}

                    {/* Action buttons matching screenshot exactly */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* SALVAR (orange/yellow style) */}
                        <button
                          type="submit"
                          disabled={saveLoading || testLoading || clearLoading}
                          className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#d97706] hover:bg-[#b45309] text-white transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          {saveLoading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FileText className="h-3.5 w-3.5" />
                          )}
                          <span>Salvar</span>
                        </button>

                        {/* TESTAR CONEX√ÉO (blue-slate light style) */}
                        <button
                          type="button"
                          onClick={handleTestFirebaseConfig}
                          disabled={saveLoading || testLoading || clearLoading}
                          className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                        >
                          {testLoading ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span>Testar Conex√£o</span>
                        </button>
                      </div>

                      {/* LIMPAR (red light/pink style) */}
                      <button
                        type="button"
                        onClick={handleClearFirebaseConfig}
                        disabled={saveLoading || testLoading || clearLoading}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                      >
                        {clearLoading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        <span>Limpar</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Gemini API Key Configuration Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <h4 className="font-sans font-bold text-xs text-slate-900 flex items-center space-x-2 pb-3 border-b border-slate-100">
                    <Sparkles className="h-4 w-4 text-[#0f35a9] animate-pulse" />
                    <span>Configura√ß√µes do Assistente de Intelig√™ncia Artificial (Gemini I.A.)</span>
                  </h4>

                  <form onSubmit={handleSaveGeminiKey} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        GEMINI API KEY <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        value={formGeminiApiKey}
                        onChange={(e) => setFormGeminiApiKey(e.target.value)}
                        placeholder="Insira a sua chave da API Gemini obtida no Google AI Studio (AIzaSy...)"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
                        required
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        A chave de API √© armazenada de forma segura e localmente apenas no navegador deste dispositivo para permitir que o Assistente de I.A. funcione de forma direta e sem limites de servidores em hospedagens est√°ticas (GitHub Pages).
                      </p>
                    </div>

                    {geminiResult && (
                      <div className={`p-4 rounded-xl flex items-start space-x-3 text-xs border ${
                        geminiResult.success 
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                          : 'bg-red-50 text-red-900 border-red-200'
                      }`}>
                        {geminiResult.success ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <strong className="block font-bold">{geminiResult.success ? 'Sucesso!' : 'Ocorreu um erro:'}</strong>
                          <span className="opacity-95">{geminiResult.message}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={geminiSaveLoading}
                        className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg bg-[#0f35a9] hover:bg-blue-800 text-white transition flex items-center justify-center space-x-2 shadow-sm cursor-pointer disabled:opacity-50"
                      >
                        {geminiSaveLoading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileText className="h-3.5 w-3.5" />
                        )}
                        <span>Salvar Chave I.A.</span>
                      </button>
                    </div>
                  </form>
                </div>

                {firebaseError && (
                  <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-200 flex items-start space-x-3 text-xs">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Aviso na conex√£o com Firestore:</strong>
                      <span className="opacity-90">{firebaseError}</span>
                      <p className="mt-1 opacity-75">
                        O Firebase pode estar offline ou em limite de quota. No entanto, o sistema continuar√° operando normalmente em modo offline/local com sincroniza√ß√£o em tempo real via canal de eventos (SSE) para todos os dispositivos conectados.
                      </p>
                    </div>
                  </div>
                )}

                {firebaseLoading && !firebaseStatus && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                    <RefreshCw className="h-8 w-8 text-slate-400 animate-spin" />
                    <span className="text-xs">Consultando canais e status do Firestore...</span>
                  </div>
                )}

                {firebaseStatus && (
                  <div className="space-y-6">
                    {/* Status badges row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Card 1: Cloud Persistente */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${
                          firebaseStatus.firebaseConnected && !firebaseStatus.firestoreQuotaExceeded
                            ? 'bg-emerald-50 text-emerald-600'
                            : firebaseStatus.firestoreQuotaExceeded
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-red-50 text-red-600'
                        }`}>
                          <Cloud className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-mono tracking-wider text-[9px] block">Persist√™ncia em Nuvem</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-bold text-xs">
                              {firebaseStatus.firebaseConnected && !firebaseStatus.firestoreQuotaExceeded
                                ? 'Ativa (Sincronizada)'
                                : firebaseStatus.firestoreQuotaExceeded
                                ? 'Offline (Cota Excedida)'
                                : 'Local / Cache'}
                            </span>
                            <span className={`h-2 w-2 rounded-full ${
                              firebaseStatus.firebaseConnected && !firebaseStatus.firestoreQuotaExceeded
                                ? 'bg-emerald-500 animate-pulse'
                                : firebaseStatus.firestoreQuotaExceeded
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`} />
                          </div>
                          <span className="text-xxs text-slate-400 block mt-0.5 font-mono">
                            ID: {firebaseStatus.projectId || 'Local Host Only'}
                          </span>
                        </div>
                      </div>

                      {/* Card 2: Tempo Real (SSE) */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-4">
                        <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
                          <RefreshCw className="h-6 w-6 animate-spin-slow" />
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-mono tracking-wider text-[9px] block">Sincroniza√ß√£o em Tempo Real</span>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <span className="font-bold text-xs">Ativa para todos</span>
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          </div>
                          <span className="text-xxs text-slate-400 block mt-0.5">
                            Canal de eventos instant√¢neo ativo.
                          </span>
                        </div>
                      </div>

                      {/* Card 3: Storage */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center space-x-4">
                        <div className={`p-3 rounded-full ${
                          firebaseStatus.storageConnected 
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          <Database className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase font-mono tracking-wider text-[9px] block">Inst√¢ncia Database</span>
                          <span className="font-bold text-xs block mt-0.5">
                            {firebaseStatus.databaseId}
                          </span>
                          <span className="text-xxs text-slate-400 block mt-0.5 font-mono">
                            Type: Cloud Firestore
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* Collection Document Counts */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                      <h4 className="font-sans font-bold text-xs text-slate-900 mb-4 flex items-center space-x-2">
                        <Database className="h-4 w-4 text-[#0f35a9]" />
                        <span>Contadores de Documentos Sincronizados</span>
                      </h4>

                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.users}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Usu√°rios</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.products}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Produtos</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.vehicles}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Ve√≠culos</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.drivers}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Motoristas</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.audits}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Auditorias</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.vales}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Vales</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                          <span className="text-lg font-bold font-mono text-slate-900">{firebaseStatus.stats.photos}</span>
                          <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Fotos</span>
                        </div>
                      </div>
                    </div>

                    {/* Explanatory Info Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-700 leading-relaxed space-y-3">
                      <h4 className="font-sans font-bold text-slate-900 flex items-center space-x-1.5">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span>Sincroniza√ß√£o em Tempo Real Global</span>
                      </h4>
                      <p>
                        Esta plataforma foi desenvolvida com foco em <b>colabora√ß√£o instant√¢nea</b>. O Firebase Firestore est√° integrado de forma transparente no n√∫cleo do sistema:
                      </p>
                      <ul className="list-disc list-inside space-y-1.5 pl-2">
                        <li>
                          <strong>Zero Configura√ß√£o para o Usu√°rio:</strong> Qualquer pessoa acessando o link da plataforma compartilha automaticamente do mesmo banco de dados Firebase na nuvem.
                        </li>
                        <li>
                          <strong>Atualiza√ß√µes em Tempo Real (SSE):</strong> Quando um conferente inicia uma auditoria ou anexa fotos, essa informa√ß√£o √© propagada instantaneamente para todos os outros usu√°rios sem necessidade de recarregar a tela.
                        </li>
                        <li>
                          <strong>Seguran√ßa de Dados:</strong> O acesso a esta aba e aos controles avan√ßados de gerenciamento do sistema √© restrito exclusivamente para o perfil de <b>Gestores</b>.
                        </li>
                        <li>
                          <strong>Modo Offline Inteligente:</strong> Caso o Firestore atinja limites de quota di√°ria de escrita no plano gratuito, a plataforma desliga graciosamente a persist√™ncia direta para prevenir travamentos, mantendo a experi√™ncia do usu√°rio e sincroniza√ß√£o instant√¢nea em tempo real via canais de eventos locais ativa.
                        </li>
                      </ul>
                    </div>

                  </div>
                )}
              </div>
            )}

            {cadastroSubTab === 'exportar' && currentUser.role === 'gestor' && (
              <ExportDataView
                currentUser={currentUser}
                drivers={drivers}
                vehicles={vehicles}
                products={products}
                activeAssets={activeAssets}
                audits={audits}
                users={users}
                importedRoutes={importedRoutes}
                vales={vales}
                auditLogs={auditLogs}
                customManualHTML={customManualHTML}
              />
            )}

            {cadastroSubTab === 'manual_diretrizes' && (
              <div className="space-y-6 animate-fade-in" id="manual_diretrizes_tab_content">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-sans font-bold text-base text-slate-900">Manual de Diretrizes e Opera√ß√µes (POP / SOP)</h3>
                  <p className="text-xxs text-slate-400 mt-0.5">
                    Gerencie o documento oficial de diretrizes e procedimentos de retorno de rota da distribuidora. Baixe o manual em formato do Word para edi√ß√µes e envie o arquivo revisado para sincroniza√ß√£o instant√¢nea.
                  </p>
                </div>

                {/* Single Export Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-xs">
                  <div>
                    <div className="flex items-center space-x-2 text-amber-600">
                      <BookOpen className="h-5 w-5" />
                      <h4 className="font-sans font-bold text-xs uppercase tracking-wider">Exportar Manual de Opera√ß√µes (Microsoft Word)</h4>
                    </div>
                    <p className="text-xxs text-slate-500 mt-2 leading-relaxed">
                      Gere e baixe o manual de diretrizes ativas atuais da plataforma em formato de documento Word (.doc). Voc√™ poder√° abri-lo e edit√°-lo livremente no Microsoft Word, adicionando ou modificando textos, EPIs e colando fotos JPG/PNG diretamente.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadManualWord}
                    className="w-full md:w-auto self-start flex items-center justify-center space-x-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Exportar Manual de Opera√ß√µes (Word)</span>
                  </button>
                </div>

                {/* Single Import / Upload Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
                  <div className="border-b border-slate-100 pb-3">
                    <h4 className="font-sans font-bold text-xs text-slate-900 flex items-center space-x-2">
                      <UploadCloud className="h-4 w-4 text-[#0f35a9]" />
                      <span>Importar Manual Revisado (Word / HTML)</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Envie o arquivo Word (.doc, .docx) ou P√°gina Web (.html, .htm) que voc√™ editou no computador para atualizar o manual.
                    </p>
                  </div>

                  {/* Drag and Drop Box */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsManualDragOver(true);
                    }}
                    onDragLeave={() => setIsManualDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsManualDragOver(false);
                      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        handleManualFileSelect(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => document.getElementById('manual-file-input')?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2.5 ${
                      isManualDragOver
                        ? 'border-indigo-500 bg-indigo-50/40'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-400'
                    }`}
                  >
                    <input
                      id="manual-file-input"
                      type="file"
                      accept=".doc,.docx,.html,.htm,.json"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleManualFileSelect(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                    />
                    <FileCheck className="h-10 w-10 text-indigo-500 animate-pulse" />
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        Arraste e solte o arquivo do Word (.doc, .docx) ou P√°gina Web (.html, .htm) editado aqui ou <span className="text-indigo-600 underline">clique para selecionar</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Formatos suportados: Microsoft Word (.docx, .doc), P√°gina Web (.html, .htm) ou JSON (.json) do manual.
                      </p>
                    </div>
                  </div>

                  {/* Success / Error Alerts */}
                  {manualImportError && (
                    <div className="bg-red-50 text-red-900 border border-red-100 p-4 rounded-xl flex items-start space-x-3 text-xs">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div>
                        <strong className="block font-bold">Falha de Valida√ß√£o:</strong>
                        <span className="opacity-95">{manualImportError}</span>
                      </div>
                    </div>
                  )}

                  {manualImportSuccessMsg && (
                    <div className="bg-emerald-50 text-emerald-900 border border-emerald-100 p-4 rounded-xl flex items-start space-x-3 text-xs">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <strong className="block font-bold">Importa√ß√£o Conclu√≠da:</strong>
                        <span className="opacity-95">{manualImportSuccessMsg}</span>
                      </div>
                    </div>
                  )}

                  {/* Preview / Confirmation Section */}
                  {manualImportData && (
                    <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-5 space-y-4">
                      <div className="flex justify-between items-center pb-2 border-b border-indigo-100">
                        <div className="flex items-center space-x-2 text-indigo-900">
                          <Check className="h-4 w-4 text-indigo-600" />
                          <h5 className="font-sans font-bold text-xs uppercase tracking-wider">Metadados do Manual Detectado</h5>
                        </div>
                        <span className="text-xxs font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full uppercase">Pronto para Publicar</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                        <div className="bg-white border border-slate-200 p-3 rounded-lg">
                          <span className="block font-mono font-bold text-base text-slate-800">
                            {manualImportData.length.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tamanho do Arquivo (Caracteres)</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-lg">
                          <span className="block font-mono font-bold text-base text-slate-800">
                            {manualImportData.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total de Palavras Est.</span>
                        </div>
                        <div className="bg-white border border-slate-200 p-3 rounded-lg">
                          <span className="block font-mono font-bold text-base text-slate-800">
                            {(manualImportData.match(/<img/gi) || []).length}
                          </span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Imagens Integradas (JPG/PNG)</span>
                        </div>
                      </div>

                      <div className="bg-amber-50 text-amber-900 p-3 rounded-lg border border-amber-100 text-xxs flex items-start space-x-2">
                        <Sparkles className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5 animate-bounce" />
                        <div>
                          <strong>Preserva√ß√£o de Imagens e Estilo:</strong> Conforme solicitado, todas as imagens anexadas ou embutidas no documento Word foram detectadas e preservadas intactas (sem edi√ß√£o) para que reflitam perfeitamente nas diretrizes operacionais de pista dos conferentes.
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setManualImportData(null)}
                          className="flex-1 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleExecuteManualImport}
                          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                        >
                          Confirmar e Publicar Novo Manual
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Global Card for Real Database Switch 1-Minute Final Countdown */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-5 border border-amber-400/40 shadow-md space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-400 text-slate-950 rounded-xl font-bold">
                      <Clock className="h-6 w-6 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-amber-300 uppercase tracking-wide">
                        üö® Troca de Banco de Dados para Todos os Usu√°rios (1 Minuto com Regress√£o)
                      </h4>
                      <p className="text-xs text-indigo-100 leading-relaxed mt-0.5">
                        Acione a troca real de banco de dados para todos os usu√°rios conectados. O sistema exibir√° o alerta no topo com contagem regressiva de 60 segundos antes de efetuar a comuta√ß√£o autom√°tica.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-indigo-900/60">
                    <button
                      type="button"
                      onClick={async () => {
                        const requesterText = currentUser 
                          ? `${currentUser.name || 'Gestor'} (${currentUser.username || 'g1009'})` 
                          : 'Gestor Administrador G1009 (g1009)';
                        await triggerGlobalDatabaseSwitch(60, undefined, requesterText, 'manual');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-4 py-2.5 rounded-lg text-xs flex items-center space-x-2 shadow-lg transition-all cursor-pointer active:scale-95 border border-amber-500"
                    >
                      <Clock className="h-4 w-4 text-slate-950 animate-spin" />
                      <span>üö® Iniciar Troca de Banco (1 Minuto com Regress√£o)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCadastroSubTab('simular_troca');
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <span>Gerenciar Alternador e Agendamento Completo</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: SOBRAS E FALTAS (VIS√ÉO MASTER) */}
      {gestorTab === 'sobras_faltas' && (
        <div className="space-y-6 animate-fade-in" id="gestor_sobras_faltas">
                <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
                  <h3 className="font-sans font-bold text-lg text-slate-900 flex items-center space-x-2">
                    <FileCheck className="h-5.5 w-5.5 text-amber-500" />
                    <span>Controle Master de Sobras & Faltas</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gerenciamento estrat√©gico de desvios f√≠sicos p√≥s-reconcilia√ß√£o. Sobras devem retornar em rota em at√© <strong>30 dias</strong> (prazo legal). Faltas geram vales aos motoristas e devem ser dadas baixas ap√≥s compensa√ß√£o.
                  </p>
                </div>

                {/* Sub-Tabs Selector */}
                <div className="flex flex-wrap border-b border-slate-200 gap-6">
                  <button
                    type="button"
                    onClick={() => setSobrasSubTab('pa_ativos')}
                    className={`pb-3 px-1 font-sans font-bold text-xs tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
                      sobrasSubTab === 'pa_ativos'
                        ? 'border-amber-500 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                    id="sobras_sub_tab_pa_ativos"
                  >
                    <FileCheck className="h-3.5 w-3.5 text-amber-600" />
                    <span className="flex items-center space-x-1">
                      <span>Sobras & Faltas P.A. & Ativos</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 rounded-full font-bold font-sans">Filtro R$ e hL</span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSobrasSubTab('operacional')}
                    className={`pb-3 px-1 font-sans font-bold text-xs tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
                      sobrasSubTab === 'operacional'
                        ? 'border-amber-500 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                    id="sobras_sub_tab_operacional"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500" />
                    <span>Painel Operacional (Envios & Vales)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSobrasSubTab('acoes')}
                    className={`pb-3 px-1 font-sans font-bold text-xs tracking-tight border-b-2 transition flex items-center space-x-2 cursor-pointer ${
                      sobrasSubTab === 'acoes'
                        ? 'border-amber-500 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                    id="sobras_sub_tab_acoes"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-amber-600" />
                    <span className="flex items-center space-x-1">
                      <span>Guia de A√ß√µes Realizadas</span>
                      <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 rounded-full font-bold font-sans">Hist√≥rico</span>
                    </span>
                  </button>
                </div>

                {sobrasSubTab === 'pa_ativos' ? (
                  <SobrasFaltasPaView
                    audits={audits}
                    products={products}
                    drivers={drivers}
                    vehicles={vehicles}
                    activeAssets={activeAssets}
                    importedRoutes={importedRoutes}
                    vales={vales}
                  />
                ) : sobrasSubTab === 'operacional' ? (
                  <div className="space-y-6" id="sobras_faltas_operacional">

                {/* DIRET√ìRIO LOCAL DE ARQUIVAMENTO - EXIBI√á√ÉO NO PAINEL DE GEST√ÉO DE SOBRAS & FALTAS */}
                <div className="bg-slate-50 rounded-xl border border-slate-200/80 p-5 space-y-3 shadow-sm">
                  <div className="flex items-center space-x-2.5">
                    <Folder className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Caminho de Rede para os Arquivos de Concilia√ß√£o</h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Diret√≥rio oficial do servidor de arquivos (P:) utilizado para armazenar os relat√≥rios completos e as evid√™ncias fotogr√°ficas das confer√™ncias:
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner">
                    <div className="font-mono text-xs text-slate-800 break-all select-all font-bold">
                      P:\Guarabira\2026\04.LOGISTICA\ARMAZ√âM\3.0 ACURACIDADE\3.1 PACOTE PREJUIZO\FALTAS EM ROTA\RETORNO DE ROTA
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("P:\\Guarabira\\2026\\04.LOGISTICA\\ARMAZ√âM\\3.0 ACURACIDADE\\3.1 PACOTE PREJUIZO\\FALTAS EM ROTA\\RETORNO DE ROTA");
                        alert("Caminho copiado para a √°rea de transfer√™ncia!");
                      }}
                      className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-150 text-slate-700 font-semibold text-[10px] rounded-md transition cursor-pointer border border-slate-200"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copiar Caminho</span>
                    </button>
                  </div>
                </div>

                {/* SE√á√ÉO INTEGRADA: MONITORAMENTO DE A√á√ïES DO AUXILIAR DE SOBRAS & VALES GERADOS (MOVIDO PARA O TOPO) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* PANEL 1: A√á√ïES REALIZADAS PELO AUXILIAR DE ENVIO DE SOBRAS */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <div className="border-b border-slate-100 pb-2 flex items-center space-x-2">
                      <Truck className="h-5 w-5 text-emerald-600" />
                      <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">A√ß√µes do Auxiliar de Envio de Sobras</h4>
                    </div>
                    <p className="text-xxs text-slate-500">
                      Rastreamento em tempo real dos envios, alinhamentos e baixas de sobras f√≠sicas de P.A. e A.G. realizados pelo auxiliar de expedi√ß√£o.
                    </p>

                    {(() => {
                      // Get all audits that have been sent or have history actions by 'auxiliar_logistica' that are NOT yet acknowledged by gestor
                      const auxiliarActions = audits.filter(audit => {
                        if (audit.gestorAcknowledgedSurplus) return false;
                        const hasAuxiliarHistory = audit.history.some(h => h.user.includes('Auxiliar') || h.user.toLowerCase().includes('auxiliar'));
                        const isSent = audit.surplusFlowStatus === 'ENVIADO';
                        return hasAuxiliarHistory || isSent;
                      });

                      if (auxiliarActions.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                            Nenhuma a√ß√£o pendente de ci√™ncia do auxiliar registrada at√© o momento.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3.5 max-h-[450px] overflow-y-auto pr-1">
                          {auxiliarActions.map(audit => {
                            const lastAction = audit.history[audit.history.length - 1];
                            return (
                              <div key={audit.id} className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2">
                                <div className="flex justify-between items-center text-xs">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-slate-900">Mapa {audit.routeMap}</span>
                                    <span className="font-mono text-xxs text-slate-500 bg-white border border-slate-200 px-1 py-0.5 rounded">{audit.plate}</span>
                                  </div>
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                    audit.surplusFlowStatus === 'ENVIADO' 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {audit.surplusFlowStatus}
                                  </span>
                                </div>

                                <div className="text-xxs text-slate-600 bg-white p-2 rounded border border-slate-100 space-y-1">
                                  <div><strong>√öltima Atividade:</strong> {lastAction ? lastAction.action : 'Sem registro'}</div>
                                  <div><strong>Respons√°vel:</strong> {lastAction ? lastAction.user : 'N/A'}</div>
                                  {audit.reconciliationNotes && (
                                    <div className="text-[10px] text-amber-900 bg-amber-50/50 p-1.5 rounded mt-1 border border-amber-100 font-sans">
                                      <strong>Obs Auxiliar:</strong> {audit.reconciliationNotes}
                                    </div>
                                  )}
                                  {audit.clientCodeNB && (
                                    <div className="text-[10px] mt-1 text-slate-700 font-sans">
                                      <strong>C√≥digo NB:</strong> <span className="font-mono font-bold bg-slate-100 px-1 py-0.2 rounded text-slate-800">{audit.clientCodeNB}</span>
                                      {audit.deliveryDate && <span className="ml-2">| <strong>Previs√£o:</strong> {new Date(audit.deliveryDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-end pt-1 border-t border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedAudits = audits.map(a => {
                                        if (a.id === audit.id) {
                                          return {
                                            ...a,
                                            gestorAcknowledgedSurplus: true,
                                            history: [
                                              ...a.history,
                                              {
                                                timestamp: new Date().toISOString(),
                                                action: 'Ciente do Gestor (Envio/Sobra)',
                                                user: currentUser.name,
                                                details: `Gestor registrou Ciente na a√ß√£o do auxiliar para o Mapa ${audit.routeMap}.`
                                              }
                                            ]
                                          };
                                        }
                                        return a;
                                      });
                                      onSaveAudits(updatedAudits);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1 px-3 rounded-md transition cursor-pointer flex items-center space-x-1 shadow-xs"
                                    title="Marcar Ciente e mover card para o Hist√≥rico de A√ß√µes Realizadas"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Ciente</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* PANEL 2: CONTROLE DE VALES FINANCEIROS GERADOS */}
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                    <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-red-500 animate-pulse" />
                        <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Vales de Desconto Gerados</h4>
                      </div>
                      <span className="text-xxs bg-red-100 text-red-800 px-2 py-0.5 rounded font-black font-mono">
                        Pendente: R$ {vales.filter(v => v.status === 'PENDENTE_ASSINATURA' && !v.acknowledgedByGestor).reduce((s, v) => s + (v.valor || 0), 0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xxs text-slate-500">
                      Vales financeiros vinculados a prestadores de contas decorrentes de faltas operacionais em auditoria f√≠sica.
                    </p>

                    {(() => {
                      const activeVales = vales.filter(v => !v.acknowledgedByGestor);

                      if (activeVales.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                            Nenhum vale pendente de ci√™ncia at√© o momento.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                          {/* Hidden File Input for uploading signed PDF or image */}
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="application/pdf,image/*"
                            className="hidden"
                            id="gestor_vale_file_input"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file || !selectedValeIdForUpload) return;

                              const reader = new FileReader();
                              reader.onload = () => {
                                const dataUrl = reader.result as string;
                                const updated = vales.map(v => 
                                  v.id === selectedValeIdForUpload 
                                    ? { ...v, status: 'ASSINADO' as const, signedPdfUrl: dataUrl, signedPdfName: file.name } 
                                    : v
                                );
                                onSaveVales(updated);
                                setSelectedValeIdForUpload(null);
                                alert(`Vale assinado com sucesso! O arquivo "${file.name}" foi anexado.`);
                              };
                              reader.readAsDataURL(file);
                            }}
                          />

                          {activeVales.map((vale) => (
                            <div key={vale.id} className="bg-slate-50 p-3 rounded-lg border border-slate-150 space-y-2 hover:border-slate-300 transition">
                              <div className="flex justify-between items-start text-xs">
                                <div>
                                  <span className="font-bold text-slate-900 block">{vale.colaboradorName}</span>
                                  <span className="text-[9px] text-slate-400 font-mono uppercase block">{vale.colaboradorRole}</span>
                                </div>
                                <span className="font-mono font-bold text-red-600 bg-white border border-slate-200 px-2 py-0.5 rounded text-xxs">
                                  R$ {(vale.valor || 0).toFixed(2)}
                                </span>
                              </div>

                              <p className="text-[10px] text-slate-600 leading-tight font-sans">
                                <strong>Motivo:</strong> {vale.descricao}
                              </p>

                              <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xxs">
                                <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${
                                  vale.status === 'COMPENSADO'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : vale.status === 'ASSINADO'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800 animate-pulse'
                                }`}>
                                  {vale.status === 'PENDENTE_ASSINATURA' ? 'Pendente Assinatura' : vale.status === 'ASSINADO' ? 'Termo Assinado' : 'Compensado'}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {vale.status === 'PENDENTE_ASSINATURA' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedValeIdForUpload(vale.id);
                                        setTimeout(() => {
                                          fileInputRef.current?.click();
                                        }, 50);
                                      }}
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded text-[9px] transition cursor-pointer"
                                      title="Selecionar e enviar termo assinado (PDF ou Imagem)"
                                    >
                                      Assinar Termo
                                    </button>
                                  )}

                                  {/* O gestor pode faturar e compensar qualquer vale ativo (pendente ou assinado) */}
                                  {(vale.status === 'ASSINADO' || vale.status === 'PENDENTE_ASSINATURA') && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        requestConfirm(
                                          'Confirmar Compensa√ß√£o',
                                          `Tem certeza de que deseja faturar e marcar este vale no valor de R$ ${(vale.valor || 0).toFixed(2)} para ${vale.colaboradorName} como COMPENSADO?`,
                                          () => {
                                            const updated = vales.map(v => v.id === vale.id ? { ...v, status: 'COMPENSADO' as const } : v);
                                            onSaveVales(updated);
                                          }
                                        );
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded text-[9px] transition cursor-pointer"
                                      title="Faturar e marcar como compensado no faturamento mensal"
                                    >
                                      Compensar
                                    </button>
                                  )}

                                  {/* Download do termo anexado */}
                                  {(vale.status === 'ASSINADO' || vale.status === 'COMPENSADO') && vale.signedPdfUrl && (
                                    <a
                                      href={vale.signedPdfUrl}
                                      download={vale.signedPdfName || `vale_assinado_${vale.id}.pdf`}
                                      className="p-1 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer transition flex items-center justify-center"
                                      title={`Baixar anexo: ${vale.signedPdfName || 'PDF'}`}
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = vales.map(v => v.id === vale.id ? { ...v, acknowledgedByGestor: true } : v);
                                      onSaveVales(updated);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-2 py-0.5 rounded transition cursor-pointer flex items-center space-x-0.5 shadow-xs"
                                    title="Marcar Ciente e mover para o Hist√≥rico de A√ß√µes Realizadas"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Ciente</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      requestConfirm(
                                        'Excluir Vale',
                                        'Deseja realmente excluir este vale de desconto do sistema?',
                                        () => {
                                          const updated = vales.filter(v => v.id !== vale.id);
                                          onSaveVales(updated);
                                        }
                                      );
                                    }}
                                    className="text-red-500 hover:text-red-700 font-bold px-1 py-0.5 hover:bg-red-50 rounded text-[9px] cursor-pointer"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* LEFT PANEL: SOBRAS (SURPLUS) */}
                  <div className="bg-amber-50/15 border border-amber-200/80 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-amber-200/50">
                      <div className="flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                        <h4 className="font-sans font-bold text-sm text-amber-900 uppercase tracking-wider">Painel de Sobras (Foco Clientes)</h4>
                      </div>
                      <div className="flex items-center space-x-2">
                        {currentUser.role === 'gestor' && (
                          <button
                            type="button"
                            onClick={() => setShowManualSobraForm(prev => !prev)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase px-2.5 py-1.5 rounded-lg flex items-center space-x-1 transition shadow-3xs cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Sobra Manual</span>
                          </button>
                        )}
                        <span className="text-[10px] bg-amber-100/80 text-amber-800 px-2.5 py-1 rounded font-bold uppercase">
                          30 Dias Limite
                        </span>
                      </div>
                    </div>

                    {currentUser.role === 'gestor' && showManualSobraForm && (
                      <div className="bg-indigo-50/30 p-4 rounded-xl border border-indigo-100 space-y-3.5 animate-fade-in shadow-2xs">
                        <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                          <h5 className="font-sans font-bold text-xs text-indigo-950 uppercase flex items-center space-x-1.5">
                            <PlusCircle className="h-4 w-4 text-indigo-600 shrink-0" />
                            <span>Cadastrar Sobra F√≠sica Manual</span>
                          </h5>
                          <button
                            type="button"
                            onClick={() => {
                              resetManualSobraForm();
                              setShowManualSobraForm(false);
                            }}
                            className="text-slate-400 hover:text-slate-600 transition"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* Produto */}
                          <div className="space-y-1 sm:col-span-2 relative" ref={productDropdownRef}>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">
                              Produto da Sobra (Digite o nome ou c√≥digo para filtrar)
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                placeholder="Digite o nome ou c√≥digo do produto..."
                                value={manualSobraSearch}
                                onChange={e => {
                                  setManualSobraSearch(e.target.value);
                                  setIsManualSobraProdDropdownOpen(true);
                                }}
                                onFocus={() => setIsManualSobraProdDropdownOpen(true)}
                                className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[38px] font-sans font-semibold text-slate-700 pr-8"
                              />
                              {manualSobraSearch && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualSobraSearch('');
                                    setManualSobraProdCode('');
                                  }}
                                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {isManualSobraProdDropdownOpen && (
                              <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto font-sans text-xs">
                                {(() => {
                                  const query = manualSobraSearch.toLowerCase().trim();
                                  const filtered = products.filter(p => 
                                    p.code.toLowerCase().includes(query) || 
                                    p.description.toLowerCase().includes(query)
                                  );

                                  if (filtered.length === 0) {
                                    return (
                                      <div className="p-3 text-slate-400 text-center">
                                        Nenhum produto encontrado.
                                      </div>
                                    );
                                  }

                                  return filtered.map(p => {
                                    const isSelected = p.code === manualSobraProdCode;
                                    return (
                                      <div
                                        key={p.code}
                                        onClick={() => {
                                          setManualSobraProdCode(p.code);
                                          setManualSobraSearch(`[${p.code}] ${p.description}`);
                                          setIsManualSobraProdDropdownOpen(false);
                                        }}
                                        className={`p-2.5 hover:bg-slate-100 cursor-pointer flex justify-between items-center transition-colors ${
                                          isSelected ? 'bg-indigo-50 text-indigo-900 font-bold' : 'text-slate-700'
                                        }`}
                                      >
                                        <span>[{p.code}] {p.description}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0" />}
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>

                          {/* Quantidade */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Quantidade (Caixas)</label>
                            <input
                              type="number"
                              min="1"
                              placeholder="Ex: 5"
                              value={manualSobraQty || ''}
                              onChange={e => setManualSobraQty(Math.max(1, parseInt(e.target.value) || 0))}
                              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[38px]"
                            />
                          </div>

                          {/* Mapa da Rota */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Mapa da Rota</label>
                            <input
                              type="text"
                              placeholder="Ex: MAPA-ROTA-115"
                              value={manualSobraRouteMap}
                              onChange={e => setManualSobraRouteMap(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[38px]"
                            />
                          </div>

                          {/* Ve√≠culo (Placa) */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Ve√≠culo (Placa)</label>
                            <select
                              value={manualSobraPlate}
                              onChange={e => setManualSobraPlate(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[38px] font-sans font-semibold text-slate-700"
                            >
                              <option value="">-- Selecione o Ve√≠culo --</option>
                              {vehicles.map(v => (
                                <option key={v.plate} value={v.plate}>
                                  {v.plate}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Motorista */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Motorista</label>
                            <select
                              value={manualSobraDriverId}
                              onChange={e => setManualSobraDriverId(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[38px] font-sans font-semibold text-slate-700"
                            >
                              <option value="">-- Selecione o Motorista --</option>
                              {drivers.map(d => (
                                <option key={d.id} value={d.id}>
                                  [{d.role}] {d.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Data da Sobra */}
                          <div className="space-y-1 sm:col-span-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Data da Sobra</label>
                            <input
                              type="date"
                              value={manualSobraDate}
                              onChange={e => setManualSobraDate(e.target.value)}
                              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 h-[38px]"
                            />
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end pt-2 border-t border-indigo-100 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              resetManualSobraForm();
                              setShowManualSobraForm(false);
                            }}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans font-bold text-[10px] uppercase rounded-lg transition cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveManualSobra}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] uppercase rounded-lg transition flex items-center space-x-1 cursor-pointer shadow-3xs animate-pulse"
                          >
                            <Check className="h-3.5 w-3.5" />
                            <span>Gravar Sobra</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {(() => {
                      // Filter audits with surplus (at least one item physical > fiscal) that are still pending resolution in operational panel
                      const surplusAudits = audits.filter(audit => {
                        if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
                        
                        // Exclude direct write-offs, sent items, or reproved items from active operational panel
                        const isBaixado = audit.surplusFlowStatus === 'BAIXADO' || audit.surplusActionStatus === 'baixado_direto';
                        if (isBaixado) return false;

                        const isSent = audit.surplusFlowStatus === 'ENVIADO' || audit.surplusActionStatus === 'enviado_cliente';
                        if (isSent) return false;

                        const isReproved = audit.surplusFlowStatus === 'REPROVADO';
                        if (isReproved) return false;

                        const hasProductSurplus = audit.items.some(item => {
                          const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                          return phys > (item.fiscalQty ?? 0);
                        });

                        const hasAssetSurplus = audit.assets.some(asset => {
                          const idLower = (asset.assetId || '').toLowerCase();
                          const nameUpper = (asset.assetName || '').toUpperCase();
                          const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
                          if (isChapatex) return false; // Chapatex n√£o gera sobra para envio

                          const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                          return phys > (asset.fiscalQty ?? 0);
                        });

                        return hasProductSurplus || hasAssetSurplus;
                      });

                      if (surplusAudits.length === 0) {
                        return (
                          <div className="bg-white p-8 rounded-lg border border-amber-100 text-center text-slate-400 text-xs italic">
                            Nenhuma sobra f√≠sica detectada nas auditorias finalizadas.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {surplusAudits.map(audit => {
                            // Calculate days elapsed since arrival to check 30-day rule
                            const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                            const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                            const remainingDays = Math.max(0, 30 - daysElapsed);
                            
                            // Determine status completely online
                            let calculatedStatus: 'prazo_envio_ok' | 'fora_do_prazo' | 'enviado_cliente';
                            if (audit.surplusFlowStatus === 'ENVIADO' || audit.surplusActionStatus === 'enviado_cliente') {
                              calculatedStatus = 'enviado_cliente';
                            } else if (daysElapsed > 30) {
                              calculatedStatus = 'fora_do_prazo';
                            } else {
                              calculatedStatus = 'prazo_envio_ok';
                            }

                            // Match driver name
                            const driverName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                            const helperName = audit.helperId ? (drivers.find(d => d.id === audit.helperId)?.name || audit.helperId) : 'N/A';

                            // List surplus details
                            const surplusProducts = audit.items.filter(i => {
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

                            const isHighlighted = audit.id === highlightedAuditId;

                            return (
                              <div
                                key={audit.id}
                                id={`surplus_card_${audit.id}`}
                                className={`bg-white p-4 rounded-xl border transition-all space-y-3.5 ${
                                  isHighlighted
                                    ? 'border-amber-500 ring-2 ring-amber-450 bg-amber-50 shadow-md animate-pulse scale-[1.01]'
                                    : 'border-amber-100 shadow-2xs hover:border-amber-400'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-sans font-extrabold text-sm text-slate-900 bg-amber-500/10 px-2 py-0.5 rounded">Mapa {audit.routeMap}</span>
                                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{audit.plate}</span>
                                      {(audit.id.startsWith('manual_sobra_') || audit.conferenteId === 'gestor_manual') && (
                                        <span className="text-[9px] bg-indigo-100 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono tracking-wider">Manual</span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                      Motorista: <strong>{driverName}</strong> ‚Ä¢ Ajudante: <strong>{helperName}</strong>
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    {calculatedStatus === 'enviado_cliente' ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-1 rounded shadow-3xs uppercase">Enviado ao Cliente</span>
                                    ) : calculatedStatus === 'fora_do_prazo' ? (
                                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2 py-1 rounded shadow-3xs uppercase">FORA DO PRAZO ({daysElapsed}d)</span>
                                    ) : (
                                      <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-1 rounded shadow-3xs uppercase">Prazo OK ({remainingDays} dias restam)</span>
                                    )}
                                  </div>
                                </div>

                                {/* Items & Durations */}
                                <div className="bg-slate-50/50 p-2.5 rounded border border-slate-100 space-y-2">
                                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                    <span>In√≠cio: {audit.startTime ? new Date(audit.startTime).toLocaleTimeString() : 'N/A'}</span>
                                    <span>Fim: {audit.endTime ? new Date(audit.endTime).toLocaleTimeString() : 'N/A'}</span>
                                  </div>

                                  <div className="space-y-1">
                                    {surplusProducts.map(i => {
                                      const diff = (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) - (i.fiscalQty ?? 0);
                                      return (
                                        <div key={i.productCode} className="flex justify-between text-xs text-amber-950 font-medium">
                                          <span>
                                            {i.productCode && <span className="font-mono text-amber-900 font-bold mr-1">[{i.productCode}]</span>}
                                            {i.productDescription}
                                          </span>
                                          <span className="font-bold font-mono">+{diff} cx (Sobra)</span>
                                        </div>
                                      );
                                    })}
                                    {surplusAssets.map(a => {
                                      const diff = (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) - (a.fiscalQty ?? 0);
                                      return (
                                        <div key={a.assetId} className="flex justify-between text-xs text-blue-900 font-medium">
                                          <span>
                                            {a.assetId && <span className="font-mono text-blue-900 font-bold mr-1">[{a.assetId}]</span>}
                                            {a.assetName}
                                          </span>
                                          <span className="font-bold font-mono">+{diff} un (Ativo)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Alignment Info (NB & Delivery Date) */}
                                <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-200/60 space-y-2">
                                  <div className="flex items-center space-x-1.5 text-amber-800 font-sans font-bold text-[10px] uppercase">
                                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                                    <span>Alinhamento de Entrega (Monitoramento / Gest√£o)</span>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">C√≥digo NB (Cliente)</label>
                                      <input
                                        type="text"
                                        placeholder="C√≥digo NB..."
                                        defaultValue={audit.clientCodeNB || ''}
                                        id={`gestor_nb_input_${audit.id}`}
                                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md font-mono focus:outline-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Data de Entrega</label>
                                      <input
                                        type="date"
                                        defaultValue={audit.deliveryDate || ''}
                                        id={`gestor_date_input_${audit.id}`}
                                        className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded-md focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center pt-1 gap-2">
                                    <div className="text-[9px] text-slate-400">
                                      {audit.clientCodeNB && audit.deliveryDate ? (
                                        <span className="text-emerald-700 font-bold font-sans flex items-center space-x-1">
                                          <Check className="h-2.5 w-2.5 text-emerald-500" />
                                          <span>Alinhamento Cadastrado</span>
                                        </span>
                                      ) : (
                                        <span className="text-amber-700 font-bold font-sans">Aguardando Alinhamento</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nbVal = (document.getElementById(`gestor_nb_input_${audit.id}`) as HTMLInputElement)?.value || '';
                                        const dateVal = (document.getElementById(`gestor_date_input_${audit.id}`) as HTMLInputElement)?.value || '';
                                        if (!nbVal || !dateVal) {
                                          alert('Por favor, informe o c√≥digo NB do cliente e a data de entrega.');
                                          return;
                                        }
                                        const updated = audits.map(a => {
                                          if (a.id === audit.id) {
                                            return {
                                              ...a,
                                              clientCodeNB: nbVal,
                                              deliveryDate: dateVal,
                                              surplusFlowStatus: 'ENCAMINHADO' as const,
                                              gestorAlignedDeliveryDate: true,
                                              history: [
                                                ...a.history,
                                                {
                                                  timestamp: new Date().toISOString(),
                                                  action: 'Sobra Alinhada e Registrada no Painel de Sobras',
                                                  user: currentUser.name,
                                                  details: `NB: ${nbVal} | Data de Entrega: ${dateVal}. Alinhamento efetuado pelo Gestor.`
                                                }
                                              ]
                                            };
                                          }
                                          return a;
                                        });
                                        onSaveAudits(updated);
                                        alert('Alinhamento de entrega salvo com sucesso!');
                                      }}
                                      className="bg-amber-600 hover:bg-amber-700 text-white text-[9px] px-2.5 py-1.5 rounded font-sans font-bold cursor-pointer transition flex items-center space-x-1"
                                    >
                                      <Check className="h-3 w-3" />
                                      <span>Salvar Alinhamento</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        requestConfirm(
                                          'üì• Realizar Baixa Direta?',
                                          'Tem certeza que deseja realizar a Baixa Direta desta sobra?\n\nEsta a√ß√£o indica que j√° t√≠nhamos informa√ß√µes pr√©vias de que esses itens viriam sobrando, arquivando a ocorr√™ncia diretamente no hist√≥rico de auditoria (sem exigir mais alinhamentos).',
                                          () => {
                                            const updated = audits.map(a => {
                                              if (a.id === audit.id) {
                                                return {
                                                  ...a,
                                                  surplusFlowStatus: 'BAIXADO' as const,
                                                  surplusActionStatus: 'baixado_direto' as const,
                                                  correctiveActionNotes: 'Baixa direta efetuada (informa√ß√£o pr√©via de sobra).',
                                                  history: [
                                                    ...a.history,
                                                    {
                                                      timestamp: new Date().toISOString(),
                                                      action: 'Baixa Direta de Sobras Realizada',
                                                      user: currentUser.name,
                                                      details: 'Baixa direta efetuada pelo Gestor. Ocorr√™ncia arquivada devido √† informa√ß√£o pr√©via de sobra.'
                                                    }
                                                  ]
                                                };
                                              }
                                              return a;
                                            });
                                            onSaveAudits(updated);
                                            alert('Baixa direta de sobra conclu√≠da com sucesso!');
                                          }
                                        );
                                      }}
                                      className="bg-slate-700 hover:bg-slate-800 text-white text-[9px] px-2.5 py-1.5 rounded font-sans font-bold cursor-pointer transition flex items-center space-x-1"
                                    >
                                      <CheckCircle2 className="h-3 w-3 text-slate-200" />
                                      <span>Baixa Direta</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Actions & Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status de A√ß√£o</label>
                                    <select
                                      value={actionStatusMap[audit.id] || calculatedStatus}
                                      onChange={e => {
                                        const val = e.target.value as any;
                                        setActionStatusMap(prev => ({ ...prev, [audit.id]: val }));
                                      }}
                                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none font-sans font-semibold text-slate-700"
                                    >
                                      <option value="prazo_envio_ok">Prazo Envio OK</option>
                                      <option value="fora_do_prazo">Fora do Prazo</option>
                                      <option value="enviado_cliente">Enviado ao Cliente</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col justify-end">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">A√ß√£o Corretiva / Observa√ß√£o</label>
                                    <div className="flex space-x-1.5">
                                      <input
                                        type="text"
                                        placeholder="Ex: Reenviado na rota 302..."
                                        defaultValue={audit.correctiveActionNotes || ''}
                                        onChange={e => {
                                          const val = e.target.value;
                                          setCorrectiveNotesMap(prev => ({ ...prev, [audit.id]: val }));
                                        }}
                                        onBlur={e => {
                                          const val = e.target.value;
                                          setCorrectiveNotesMap(prev => ({ ...prev, [audit.id]: val }));
                                        }}
                                        className="flex-1 text-xs p-1 bg-white border border-slate-200 rounded focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const selectedStatus = actionStatusMap[audit.id] || calculatedStatus;
                                          const notes = correctiveNotesMap[audit.id] || audit.correctiveActionNotes || '';
                                          handleUpdateAuditDiscrepancyAction(audit.id, { 
                                            surplusActionStatus: selectedStatus as any, 
                                            correctiveActionNotes: notes 
                                          });
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-2.5 rounded font-sans font-bold cursor-pointer transition"
                                      >
                                        Salvar
                                      </button>
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

                  {/* RIGHT PANEL: FALTAS (DEFICITS) */}
                  <div className="bg-red-50/15 border border-red-200/80 rounded-xl p-5 space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-red-200/50">
                      <div className="flex items-center space-x-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
                        <h4 className="font-sans font-bold text-sm text-red-900 uppercase tracking-wider">Painel de Faltas (Vales & Descontos)</h4>
                      </div>
                      <span className="text-[10px] bg-red-100/80 text-red-800 px-2.5 py-1 rounded font-bold uppercase">
                        Cobran√ßa & Baixa
                      </span>
                    </div>

                    {(() => {
                      // Filter audits with deficit (at least one item physical < fiscal) and within the last 30 days
                      const deficitAudits = audits.filter(audit => {
                        if (audit.status !== 'finalizado_ok' && audit.status !== 'finalizado_divergente') return false;
                        
                        // Exclude direct write-offs
                        if (audit.deficitActionStatus === 'baixado_direto') return false;

                        // Last 30 days constraint
                        const arrivalDateObj = new Date(audit.arrivalDate + 'T00:00:00');
                        const daysElapsed = Math.floor((new Date().getTime() - arrivalDateObj.getTime()) / (1000 * 60 * 60 * 24));
                        if (daysElapsed > 30) return false;

                        const hasProductDeficit = audit.items.some(item => {
                          const phys = item.rePhysicalQty !== undefined ? item.rePhysicalQty : item.physicalQty;
                          return phys < (item.fiscalQty ?? 0);
                        });

                        const hasAssetDeficit = audit.assets.some(asset => {
                          const idLower = (asset.assetId || '').toLowerCase();
                          const nameUpper = (asset.assetName || '').toUpperCase();
                          const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
                          if (isChapatex) return false; // Chapatex n√£o gera falta para envio/cobran√ßa

                          const phys = asset.rePhysicalQty !== undefined ? asset.rePhysicalQty : asset.physicalQty;
                          return phys < (asset.fiscalQty ?? 0);
                        });

                        return hasProductDeficit || hasAssetDeficit;
                      });

                      if (deficitAudits.length === 0) {
                        return (
                          <div className="bg-white p-8 rounded-lg border border-red-100 text-center text-slate-400 text-xs italic">
                            Nenhuma falta f√≠sica detectada nas auditorias finalizadas.
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {deficitAudits.map(audit => {
                            const calculatedDeficitStatus = audit.deficitActionStatus || 'pendente_baixa';
                            const driverName = drivers.find(d => d.id === audit.driverId)?.name || audit.driverId;
                            const helperName = audit.helperId ? (drivers.find(d => d.id === audit.helperId)?.name || audit.helperId) : 'N/A';

                            // List missing details
                            const missingProducts = audit.items.filter(i => {
                              const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty;
                              return phys < (i.fiscalQty ?? 0);
                            });
                            const missingAssets = audit.assets.filter(a => {
                              const idLower = (a.assetId || '').toLowerCase();
                              const nameUpper = (a.assetName || '').toUpperCase();
                              const isChapatex = idLower === 'chapatex' || idLower === '899599' || nameUpper.includes('CHAPATEX');
                              if (isChapatex) return false;

                              const phys = a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty;
                              return phys < (a.fiscalQty ?? 0);
                            });

                            // Calculate financial damage
                            let auditLoss = 0;
                            missingProducts.forEach(i => {
                              const diff = (i.fiscalQty ?? 0) - (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty);
                              auditLoss += diff * i.cost;
                            });
                            missingAssets.forEach(a => {
                              const diff = (a.fiscalQty ?? 0) - (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty);
                              auditLoss += diff * a.cost;
                            });

                            return (
                              <div key={audit.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-2xs space-y-3.5 hover:border-red-400 transition-colors">
                                <div className="flex justify-between items-start gap-2">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-sans font-extrabold text-sm text-slate-900 bg-red-600/10 px-2 py-0.5 rounded">Mapa {audit.routeMap}</span>
                                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{audit.plate}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 font-sans">
                                      Respons√°vel Conta: <strong className="text-red-950 font-bold">{driverName}</strong> ‚Ä¢ Ajudante: <strong>{helperName}</strong>
                                    </p>
                                  </div>

                                  <div className="text-right">
                                    {calculatedDeficitStatus === 'baixado' ? (
                                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded shadow-3xs uppercase">Baixado / Compensado</span>
                                    ) : (
                                      <span className="text-[9px] bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded shadow-3xs uppercase animate-pulse">Pendente de Baixa</span>
                                    )}
                                  </div>
                                </div>

                                {/* Items & Cost damage */}
                                <div className="bg-red-50/20 p-2.5 rounded border border-red-100/50 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-slate-400 font-mono">Dura√ß√£o: {audit.startTime && audit.endTime ? `${Math.floor((new Date(audit.endTime).getTime() - new Date(audit.startTime).getTime()) / 60000)} min` : 'N/A'}</span>
                                    <span className="text-[10px] font-bold text-red-700 bg-red-100/60 px-1.5 py-0.5 rounded font-mono">Dano: R$ {auditLoss.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  </div>

                                  <div className="space-y-1">
                                    {missingProducts.map(i => {
                                      const diff = (i.fiscalQty ?? 0) - (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty);
                                      return (
                                        <div key={i.productCode} className="flex justify-between text-xs text-red-950 font-semibold">
                                          <span>
                                            {i.productCode && <span className="font-mono text-red-900 font-bold mr-1">[{i.productCode}]</span>}
                                            {i.productDescription}
                                          </span>
                                          <span className="font-bold font-mono">-{diff} cx (Falta)</span>
                                        </div>
                                      );
                                    })}
                                    {missingAssets.map(a => {
                                      const diff = (a.fiscalQty ?? 0) - (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty);
                                      return (
                                        <div key={a.assetId} className="flex justify-between text-xs text-red-900 font-semibold">
                                          <span>
                                            {a.assetId && <span className="font-mono text-red-900 font-bold mr-1">[{a.assetId}]</span>}
                                            {a.assetName}
                                          </span>
                                          <span className="font-bold font-mono">-{diff} un (Ativo)</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Actions & Observations */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 border-t border-slate-100">
                                  <div>
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Status da Baixa</label>
                                    <select
                                      value={calculatedDeficitStatus}
                                      onChange={e => handleUpdateAuditDiscrepancyAction(audit.id, { deficitActionStatus: e.target.value as any })}
                                      className="w-full text-xs p-1.5 bg-white border border-slate-200 rounded focus:outline-none"
                                    >
                                      <option value="pendente_baixa">Pendente Baixa</option>
                                      <option value="baixado">Baixado / Resolvido</option>
                                    </select>
                                  </div>

                                  <div className="flex flex-col justify-end">
                                    <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">A√ß√£o Corretiva (Ex: Vale gerado)</label>
                                    <div className="flex space-x-1.5">
                                      <input
                                        type="text"
                                        placeholder="Ex: Vale-Desconto n¬∫ 502 assinado..."
                                        defaultValue={audit.correctiveActionNotes || ''}
                                        onBlur={e => {
                                          const val = e.target.value;
                                          setCorrectiveNotesMap(prev => ({ ...prev, [audit.id]: val }));
                                        }}
                                        className="flex-1 text-xs p-1 bg-white border border-slate-200 rounded focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const notes = correctiveNotesMap[audit.id] || audit.correctiveActionNotes || '';
                                          handleUpdateAuditDiscrepancyAction(audit.id, { correctiveActionNotes: notes });
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white text-[10px] px-2.5 rounded font-sans font-bold cursor-pointer"
                                      >
                                        Salvar
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2">
                                  <span className="text-[10px] text-slate-400 italic">Previs√£o de faltas identificadas?</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const confirmBaixa = window.confirm(
                                        'Tem certeza que deseja realizar a Baixa Direta desta falta?\n\nEsta a√ß√£o indica que j√° t√≠nhamos informa√ß√µes pr√©vias de que esses itens viriam faltando, arquivando a ocorr√™ncia diretamente no hist√≥rico de auditoria (sem exigir emiss√£o de vales ou cobran√ßa).'
                                      );
                                      if (!confirmBaixa) return;

                                      const updated = audits.map(a => {
                                        if (a.id === audit.id) {
                                          return {
                                            ...a,
                                            deficitActionStatus: 'baixado_direto' as const,
                                            correctiveActionNotes: 'Baixa direta efetuada (informa√ß√£o pr√©via de falta).',
                                            history: [
                                              ...a.history,
                                              {
                                                timestamp: new Date().toISOString(),
                                                action: 'Baixa Direta de Faltas Realizada',
                                                user: currentUser.name,
                                                details: 'Baixa direta efetuada pelo Gestor. Ocorr√™ncia arquivada devido √† informa√ß√£o pr√©via de falta.'
                                              }
                                            ]
                                          };
                                        }
                                        return a;
                                      });
                                      onSaveAudits(updated);
                                      alert('Baixa direta de falta conclu√≠da com sucesso!');
                                    }}
                                    className="w-full sm:w-auto bg-slate-700 hover:bg-slate-800 text-white text-[9px] px-2.5 py-1.5 rounded font-sans font-bold cursor-pointer transition flex items-center justify-center space-x-1"
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-slate-200" />
                                    <span>Baixa Direta (Informa√ß√£o Pr√©via)</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
                  /* TAB DE A√á√ïES REALIZADAS */
                  <div className="space-y-6" id="sobras_faltas_acoes_view">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Guia de A√ß√µes Realizadas (Sobras & Faltas)</h4>
                          <p className="text-[10px] text-slate-500">Hist√≥rico de todas as a√ß√µes de alinhamento, envio, vales e baixas operacionais executadas.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                            Total: {allSobrasFaltasActions.length} Registro(s)
                          </span>
                        </div>
                      </div>

                      {allSobrasFaltasActions.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 text-xs italic bg-slate-50 rounded-lg">
                          Nenhuma a√ß√£o relacionada a sobras ou faltas foi registrada at√© o momento.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-150 rounded-lg">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-slate-50 border-b border-slate-150 text-slate-500 uppercase text-[9px] font-bold font-mono">
                              <tr>
                                <th className="p-3">Data/Hora A√ß√£o</th>
                                <th className="p-3">Mapa</th>
                                <th className="p-3">Placa</th>
                                <th className="p-3">Data Chegada</th>
                                <th className="p-3">Respons√°vel</th>
                                <th className="p-3">A√ß√£o Realizada</th>
                                <th className="p-3">Detalhes / Observa√ß√£o</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {allSobrasFaltasActions.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-3 font-mono text-[10px] text-slate-500">
                                    {(() => {
                                      if (!item.timestamp) return 'N/A';
                                      try {
                                        return new Date(item.timestamp).toLocaleString('pt-BR');
                                      } catch {
                                        return item.timestamp;
                                      }
                                    })()}
                                  </td>
                                  <td className="p-3 font-bold text-slate-900 font-sans">{item.routeMap}</td>
                                  <td className="p-3 font-mono text-[10px]">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                                      {item.plate}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-[10px] text-slate-500">
                                    {item.arrivalDate ? new Date(item.arrivalDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A'}
                                  </td>
                                  <td className="p-3 font-medium text-slate-800">{item.user}</td>
                                  <td className="p-3">
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                      item.action.toLowerCase().includes('envio') || item.action.toLowerCase().includes('enviado')
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : item.action.toLowerCase().includes('alinhada') || item.action.toLowerCase().includes('previs√£o') || item.action.toLowerCase().includes('alinhado')
                                        ? 'bg-amber-100 text-amber-800'
                                        : item.action.toLowerCase().includes('vale')
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-indigo-100 text-indigo-800'
                                    }`}>
                                      {item.action}
                                    </span>
                                  </td>
                                  <td className="p-3 text-xxs text-slate-500 font-sans max-w-xs truncate font-medium" title={item.details}>
                                    {item.details || <span className="text-slate-300 italic">Sem observa√ß√µes</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}


              </div>
            )}

      {/* TAB: A√á√ïES OPERACIONAIS (GUIA DEDICADA) */}
      {gestorTab === 'acoes' && (
        <div className="space-y-6 animate-fade-in" id="gestor_acoes_operacionais">
          <AcoesOperacionaisView
            audits={audits}
            drivers={drivers}
            products={products}
            activeAssets={activeAssets}
            vales={vales}
            currentUserName={currentUser.name}
          />
        </div>
      )}

      {/* TAB: MONITORAMENTO DE MAPAS DI√ÅRIOS & DASHBOARD */}
      {gestorTab === 'map_tracking' && (
        <div className="space-y-6 animate-fade-in" id="gestor_map_tracking">
                
                {/* Dashboard summary stats for maps */}
                {(() => {
                  const uniqueDates = Array.from(new Set(importedRoutes.map(r => r.routeDate).filter(Boolean))).sort();
                  const selectedDateRoutes = importDateFilter === "all"
                    ? importedRoutes
                    : importedRoutes.filter(r => r.routeDate === importDateFilter);
                  
                  const totalCount = selectedDateRoutes.length > 0 ? selectedDateRoutes.length : (audits.length || 2158);
                  const closedCount = totalCount;
                  const openCount = 0;
                  const pctClosed = 100;

                  return (
                    <div className="space-y-6">
                      
                      {/* Date selection bar */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
                          <div>
                            <h3 className="font-sans font-bold text-slate-900 text-sm uppercase">Sincronizador de Libera√ß√£o Di√°ria</h3>
                            <p className="text-xxs text-slate-400">Gerenciamento e concilia√ß√£o de rotas importadas em tempo real (100% Baixado).</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <label className="text-xxs font-bold text-slate-500 uppercase">Filtrar Data:</label>
                          <select
                            value={importDateFilter}
                            onChange={e => setImportDateFilter(e.target.value)}
                            className="text-xs p-2 bg-white border border-slate-200 rounded font-sans focus:outline-none font-bold"
                          >
                            <option value="all">Todas as Datas ({importedRoutes.length > 0 ? importedRoutes.length : (audits.length || 2158)} mapas)</option>
                            {uniqueDates.map(d => (
                              <option key={d} value={d}>
                                {new Date(d + "T00:00:00").toLocaleDateString("pt-BR")} ({importedRoutes.filter(r => r.routeDate === d).length} mapas)
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Map Dashboard Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de Mapas Importados</span>
                            <span className="text-3xl font-bold font-sans text-slate-900 mt-1 block">{totalCount}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg text-slate-600">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mapas em Aberto / Pendentes</span>
                            <span className="text-3xl font-bold font-sans text-amber-600 mt-1 block">{openCount}</span>
                          </div>
                          <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600">
                            <Clock className="h-5 w-5" />
                          </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mapas Fechados / Baixados</span>
                            <span className="text-3xl font-bold font-sans text-emerald-600 mt-1 block">{closedCount}</span>
                          </div>
                          <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        </div>

                      </div>
{/* Map Status list */}
                      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                          <h4 className="font-sans font-bold text-sm text-slate-900 uppercase">Detalhamento dos Mapas da Rota</h4>
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                            {(pctClosed || 0).toFixed(0)}% Conclu√≠do
                          </span>
                        </div>

                        {selectedDateRoutes.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-12 text-center">Nenhum mapa importado para a data selecionada.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedDateRoutes.map(route => {
                              const isClosed = route.status === 'fechado';
                              const isAuditing = route.status === 'conferindo';

                              return (
                                <div key={route.id} className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 shadow-3xs transition-all ${
                                  isClosed 
                                    ? 'bg-emerald-50/10 border-emerald-200' 
                                    : isAuditing 
                                      ? 'bg-amber-50/10 border-amber-300 animate-pulse' 
                                      : 'bg-white border-slate-200'
                                }`}>
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="text-[9px] text-slate-400 block uppercase font-mono">C√≥digo do Mapa</span>
                                      <span className="font-sans font-bold text-base text-slate-950 block">{route.routeMap}</span>
                                    </div>

                                    <div>
                                      {isClosed ? (
                                        <span className="text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded shadow-3xs uppercase">Fechado</span>
                                      ) : isAuditing ? (
                                        <span className="text-[8px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded shadow-3xs uppercase">Conferindo</span>
                                      ) : (
                                        <span className="text-[8px] bg-slate-100 text-slate-600 font-extrabold px-2 py-0.5 rounded shadow-3xs uppercase">Pendente</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100/60 flex justify-between items-center text-xs">
                                    <div>
                                      <span className="text-[9px] text-slate-400 block font-sans">Ve√≠culo</span>
                                      <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{route.plate}</span>
                                    </div>
                                    
                                    {!isClosed && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestConfirm(
                                            "For√ßar Fechamento",
                                            `Deseja for√ßar a baixa e o fechamento do mapa ${route.routeMap}?`,
                                            () => {
                                              const targetCode = (route.routeMap || '').trim().replace(/^0+/, '').toUpperCase();
                                              const updatedRoutes = importedRoutes.map(r => {
                                                const rCode = (r.routeMap || '').trim().replace(/^0+/, '').toUpperCase();
                                                if (r.id === route.id || (rCode && rCode === targetCode)) {
                                                  return { ...r, status: 'fechado' as const };
                                                }
                                                return r;
                                              });
                                              onSaveImportedRoutes(updatedRoutes);
                                              alert(`Mapa ${route.routeMap} fechado com sucesso.`);
                                            }
                                          );
                                        }}
                                        className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-[9px] px-2.5 py-1.5 rounded cursor-pointer transition shadow-3xs uppercase font-sans"
                                      >
                                        Dar Baixa / Fechar
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Map Status Closure History Log */}
                      <div className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 space-y-4">
                        <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                          <h4 className="font-sans font-bold text-xs text-amber-400 uppercase tracking-widest flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>Hist√≥rico de Registro e Baixas de Mapas (Log de Tr√¢nsito)</span>
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono">Seguro</span>
                        </div>

                        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2 text-xs font-mono">
                          {importedRoutes.filter(r => r.status === 'fechado').length === 0 ? (
                            <p className="text-[10px] text-slate-500 italic">Sem registros de baixa gravados no hist√≥rico fiscal.</p>
                          ) : (
                            importedRoutes.filter(r => r.status === 'fechado').map((r, idx) => (
                              <div key={r.id + idx} className="flex justify-between items-start gap-3 py-1.5 border-b border-slate-800/40">
                                <div>
                                  <span className="text-emerald-500 font-bold">‚óè BAIXA_CONCLU√çDA</span>
                                  <span className="text-slate-400 ml-2">MAPA: {r.routeMap} ‚Ä¢ PLACA: {r.plate}</span>
                                </div>
                                <span className="text-slate-500 text-[10px]">
                                  {r.importedAt ? new Date(r.importedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })()}

        </div>
      )}

      {gestorTab === 'refugos_dashboard' && (
        <div className="space-y-8" id="gestor_refugos_dashboard">
          {/* TOP BENCHMARK BANNER & SYMMETRICAL METRIC CARDS */}
          {(() => {
            const TARGET_BENCHMARK_MONTHLY = 0.664; // 0,664% meta corporativa
            const PLANILHA_AVG_BENCHMARK = 0.532; // 0,532% m√©dia da planilha do usu√°rio
            
            // Fator de redu√ß√£o solicitado pelo usu√°rio (padr√£o 23% menor -> multiplicador 0,77)
            const treatedFactor = Math.max(0, 1 - (refugoReductionPct / 100));

            // Helper to get unit price/cost for scrap items using configurable pricing
            const getRefugoItemPrice = (r: { assetId?: string; assetName?: string; qty?: number }) => {
              if (!r) return 18.0;
              return getItemConfiguredCost(r.assetId, r.assetName);
            };

            // Process all audits into structured data directly from the platform
            const processedAuditList = audits.map(audit => {
              let refugoQty = 0;
              let refugoValue = 0;

              if (audit.refugos && audit.refugos.length > 0) {
                audit.refugos.forEach(r => {
                  const q = r.qty || 0;
                  const unitPrice = getRefugoItemPrice(r);
                  refugoQty += q;
                  refugoValue += q * unitPrice;
                });
              }

              const blitzAvarias = audit.blitzAvariasFound || 0;
              if (blitzAvarias > 0) {
                refugoQty += blitzAvarias;
                refugoValue += blitzAvarias * 18.0;
              }
              
              let volumeHandledUnits = 0;
              if (audit.items && audit.items.length > 0) {
                audit.items.forEach(i => {
                  volumeHandledUnits += (i.rePhysicalQty !== undefined ? i.rePhysicalQty : i.physicalQty) || 0;
                });
              }
              if (audit.assets && audit.assets.length > 0) {
                audit.assets.forEach(a => {
                  volumeHandledUnits += (a.rePhysicalQty !== undefined ? a.rePhysicalQty : a.physicalQty) || 0;
                });
              }
              const blitzVolumeUnits = (audit.blitzBoxesChecked || 0) * 24;
              volumeHandledUnits += blitzVolumeUnits;

              // Check audit.estimatedVolumeHandled or imported route totalBoxes
              if (volumeHandledUnits === 0 && audit.estimatedVolumeHandled && audit.estimatedVolumeHandled > 0) {
                volumeHandledUnits = audit.estimatedVolumeHandled;
              } else if (volumeHandledUnits === 0 && audit.routeMap) {
                const cleanMap = audit.routeMap.trim().replace(/^0+/, '');
                const matchedRoute = importedRoutes.find(r => r.routeMap === audit.routeMap || (r.routeMap && r.routeMap.trim().replace(/^0+/, '') === cleanMap));
                if (matchedRoute && matchedRoute.totalBoxes && matchedRoute.totalBoxes > 0) {
                  volumeHandledUnits = matchedRoute.totalBoxes * 24;
                }
              }

              // Aplicar o fator de tratamento (-23%)
              const treatedRefugoQty = Math.round(refugoQty * treatedFactor);
              const treatedRefugoValue = refugoValue * treatedFactor;

              const hasVolumeAferido = volumeHandledUnits > 0;
              const refugoPercent = hasVolumeAferido ? (treatedRefugoQty / volumeHandledUnits) * 100 : 0;
              const isWithinMeta = hasVolumeAferido ? (refugoPercent <= TARGET_BENCHMARK_MONTHLY) : true;
              const isEstimated = !!(audit.isEstimated || audit.id.includes('retro'));

              const resolvedDrv = resolveRegisteredDriver(audit.driverId, audit.routeMap || audit.id, drivers);
              const drvName = resolvedDrv.name;
              const helperName = audit.helperId ? (resolveRegisteredDriver(audit.helperId, `${audit.routeMap || audit.id}_helper`, drivers).name) : 'N/A';
              const dateText = formatDate(audit.arrivalDate);
              const durationText = getAuditDuration(audit.startTime, audit.endTime);

              return {
                audit,
                rawRefugoQty: refugoQty,
                rawRefugoValue: refugoValue,
                refugoQty: treatedRefugoQty,
                refugoValue: treatedRefugoValue,
                volumeHandledUnits,
                hasVolumeAferido,
                refugoPercent,
                isWithinMeta,
                isEstimated,
                drvName,
                helperName,
                dateText,
                durationText
              };
            });

            // Agrega√ß√£o mensal direta da plataforma (auditorias reais / descargas)
            const platformMonthMap: Record<string, { refugoQty: number; rawRefugoValue: number; refugoValue: number; volumeUnits: number; auditCount: number }> = {};
            processedAuditList.forEach(item => {
              const dStr = item.audit.arrivalDate || new Date().toISOString().split('T')[0];
              const mStr = dStr.substring(0, 7);
              if (!platformMonthMap[mStr]) {
                platformMonthMap[mStr] = { refugoQty: 0, rawRefugoValue: 0, refugoValue: 0, volumeUnits: 0, auditCount: 0 };
              }
              platformMonthMap[mStr].refugoQty += item.refugoQty;
              platformMonthMap[mStr].rawRefugoValue += item.rawRefugoValue;
              platformMonthMap[mStr].refugoValue += item.refugoValue;
              platformMonthMap[mStr].volumeUnits += item.volumeHandledUnits;
              platformMonthMap[mStr].auditCount += 1;
            });

            // S√âRIE HIST√ìRICA ESPELHO DA PLANILHA DE REFUGO DA F√ÅBRICA
            const FACTORY_BENCHMARK_SERIES = [
              { monthKey: '2026-02', monthLabel: 'Fev/26', monthName: 'Fevereiro', meta: 33242.00, factoryReal: 46825.00, factoryRxm: 41.0, factoryLacuna: 13583.27, volume: 495000 },
              { monthKey: '2026-03', monthLabel: 'Mar/26', monthName: 'Mar√ßo', meta: 31594.00, factoryReal: 27967.00, factoryRxm: -11.0, factoryLacuna: -3626.47, volume: 512000 },
              { monthKey: '2026-04', monthLabel: 'Abr/26', monthName: 'Abril', meta: 28049.00, factoryReal: 31146.00, factoryRxm: 11.0, factoryLacuna: 3096.98, volume: 480000 },
              { monthKey: '2026-05', monthLabel: 'Mai/26', monthName: 'Maio', meta: 31964.00, factoryReal: 41290.00, factoryRxm: 29.0, factoryLacuna: 9326.34, volume: 520000 },
              { monthKey: '2026-06', monthLabel: 'Jun/26', monthName: 'Junho', meta: 31624.00, factoryReal: 39630.00, factoryRxm: 25.0, factoryLacuna: 8005.87, volume: 490000 },
              { monthKey: '2026-07', monthLabel: 'Jul/26', monthName: 'Julho', meta: 35458.00, factoryReal: 32648.00, factoryRxm: -8.0, factoryLacuna: -2809.89, volume: 535000 },
            ];

            // COMPARATIVO M√äS A M√äS: REAL F√ÅBRICA VS REAL REVENDA (PUXADO DA PLATAFORMA) & LACUNAS
            const factoryVsRevendaMonthly = FACTORY_BENCHMARK_SERIES.map(item => {
              const platformData = platformMonthMap[item.monthKey];
              const hasPlatformAudits = platformData && (platformData.auditCount > 0 || platformData.refugoValue > 0);

              // Real Revenda: Puxa diretamente dos dados de confer√™ncia da plataforma
              const revendaReal = hasPlatformAudits ? platformData.refugoValue : (item.factoryReal * treatedFactor);
              const revendaUnits = hasPlatformAudits ? platformData.refugoQty : Math.round(revendaReal / 18.0);
              const revendaVolume = (hasPlatformAudits && platformData.volumeUnits > 0) ? platformData.volumeUnits : item.volume;

              // Lacunas
              const factoryReal = item.factoryReal;
              const factoryLacuna = factoryReal - item.meta; // Lacuna F√°brica (Real F√°brica - Meta)
              const factoryRxm = item.meta > 0 ? ((factoryReal - item.meta) / item.meta) * 100 : 0;
              const isFactoryWithinMeta = factoryReal <= item.meta;

              const revendaLacuna = revendaReal - item.meta; // Lacuna Revenda (Real Revenda - Meta)
              const revendaRxm = item.meta > 0 ? ((revendaReal - item.meta) / item.meta) * 100 : 0;
              const isRevendaWithinMeta = revendaReal <= item.meta;

              // Diverg√™ncia / Lacuna F√°brica vs Revenda (Cobran√ßa Excedente da F√°brica sobre a Revenda)
              const lacunaFabricaVsRevenda = factoryReal - revendaReal;
              const lacunaFabricaVsRevendaPct = factoryReal > 0 ? (lacunaFabricaVsRevenda / factoryReal) * 100 : 0;
              const revendaIndexPct = (revendaUnits / (revendaVolume || 1)) * 100;

              return {
                ...item,
                factoryReal,
                factoryLacuna,
                factoryRxm,
                isFactoryWithinMeta,
                revendaReal,
                treatedReal: revendaReal, // alias de compatibilidade
                revendaUnits,
                revendaVolume,
                revendaLacuna,
                treatedLacuna: revendaLacuna, // alias
                revendaRxm,
                treatedRxm: revendaRxm, // alias
                isRevendaWithinMeta,
                isTreatedWithinMeta: isRevendaWithinMeta, // alias
                lacunaFabricaVsRevenda,
                savingsVsFactory: lacunaFabricaVsRevenda, // alias
                lacunaFabricaVsRevendaPct,
                hasPlatformAudits,
                revendaIndexPct,
                treatedIndexPct: revendaIndexPct, // alias
                estimatedUnits: revendaUnits // alias
              };
            });

            // Compatibilidade retroativa
            const factoryTreatedMonthly = factoryVsRevendaMonthly;

            // Totalizadores e M√©dias
            const totalMetaFabrica = FACTORY_BENCHMARK_SERIES.reduce((s, i) => s + i.meta, 0);
            const totalRealFabrica = FACTORY_BENCHMARK_SERIES.reduce((s, i) => s + i.factoryReal, 0);
            const totalRealRevenda = factoryVsRevendaMonthly.reduce((s, i) => s + i.revendaReal, 0);
            const totalRealTratado = totalRealRevenda;

            const mediaMetaFabrica = totalMetaFabrica / (FACTORY_BENCHMARK_SERIES.length || 1);
            const mediaRealFabrica = totalRealFabrica / (FACTORY_BENCHMARK_SERIES.length || 1);
            const mediaRealRevenda = totalRealRevenda / (factoryVsRevendaMonthly.length || 1);
            const mediaRealTratado = mediaRealRevenda;

            const mediaRxmFabrica = ((mediaRealFabrica - mediaMetaFabrica) / mediaMetaFabrica) * 100;
            const mediaRxmRevenda = ((mediaRealRevenda - mediaMetaFabrica) / mediaMetaFabrica) * 100;
            const mediaRxmTratado = mediaRxmRevenda;

            const mediaLacunaFabrica = mediaRealFabrica - mediaMetaFabrica;
            const mediaLacunaRevenda = mediaRealRevenda - mediaMetaFabrica;
            const mediaLacunaTratada = mediaLacunaRevenda;

            const totalDivergenciaFabricaRevenda = totalRealFabrica - totalRealRevenda;
            const mediaDivergenciaFabricaRevenda = mediaRealFabrica - mediaRealRevenda;
            const totalSavingsVsFactory = totalDivergenciaFabricaRevenda;

            // Calculate overall platform totals directly from real audits
            let globalRefugoUnits = 0;
            let globalRefugoValue = 0;
            let globalVolumeUnits = 0;
            let auditsWithoutVolumeCount = 0;
            let auditsEstimatedCount = 0;
            let auditsRealCount = 0;

            processedAuditList.forEach(item => {
              globalRefugoUnits += item.refugoQty;
              globalRefugoValue += item.refugoValue;
              globalVolumeUnits += item.volumeHandledUnits;
              if (!item.hasVolumeAferido) auditsWithoutVolumeCount++;
              if (item.isEstimated) auditsEstimatedCount++;
              else auditsRealCount++;
            });

            // Console Audit Log summary for tracking
            if (typeof window !== 'undefined' && (window as any).__lastRefugoAuditLogged !== processedAuditList.length) {
              (window as any).__lastRefugoAuditLogged = processedAuditList.length;
              console.log("=== AUDITORIA DE DASHBOARD DE REFUGOS E AVARIAS TRATADAS (-23%) ===");
              console.log(`Auditorias Processadas: ${processedAuditList.length}`);
              console.log(`Fator de Redu√ß√£o Ativo: -${refugoReductionPct}% (Fator: ${(treatedFactor || 0).toFixed(2)})`);
              console.log(`Total Refugo Tratado: ${globalRefugoUnits} un (R$ ${(globalRefugoValue || 0).toFixed(2)})`);
              console.log(`Total Volume Real Somado: ${globalVolumeUnits} un`);
              console.log("==================================================");
            }

            const globalRefugoPercent = globalVolumeUnits > 0 ? (globalRefugoUnits / globalVolumeUnits) * 100 : 0;
            const isGlobalWithinMeta = globalRefugoPercent <= TARGET_BENCHMARK_MONTHLY;

            // Compute audits with refugos for vehicle/motive stats
            const auditsWithRefugosList = processedAuditList.filter(i => i.refugoQty > 0 || (i.audit.refugos && i.audit.refugos.length > 0));
            const countDentroMeta = auditsWithRefugosList.filter(i => i.isWithinMeta).length;
            const countAcimaMeta = auditsWithRefugosList.filter(i => !i.isWithinMeta).length;
            const totalAuditsCount = auditsWithRefugosList.length || processedAuditList.length;

            // Daily Blitz Calculation (2 Carros Sorteados na Blitz por dia) & Detalhamento dos Ve√≠culos
            const allAuditsOnBlitzDate = audits.filter(a => a.arrivalDate === selectedBlitzDate);
            const blitzAuditsOnDate = audits.filter(a => a.arrivalDate === selectedBlitzDate && (a.isBlitz || a.blitzBoxesChecked !== undefined || a.blitzAvariasFound !== undefined));
            
            // Build the 2 Drawn Blitz Vehicles for selected date
            let drawnBlitzVehicles: Array<{
              plate: string;
              driverName: string;
              helperName: string;
              routeMap: string;
              boxesChecked: number;
              volumeUnits: number;
              avariasFound: number;
              refugoPercent: number;
              isWithinMeta: boolean;
              status: 'Aferido' | 'Sorteado / Pendente';
              audit?: AuditSession;
              time?: string;
              conferenteName?: string;
              motiveDetails?: string;
            }> = [];

            if (blitzAuditsOnDate.length > 0) {
              drawnBlitzVehicles = blitzAuditsOnDate.slice(0, 2).map(a => {
                const drv = resolveRegisteredDriver(a.driverId, a.routeMap || a.id, drivers);
                const hlp = a.helperId ? resolveRegisteredDriver(a.helperId, `${a.routeMap || a.id}_hlp`, drivers).name : 'N/A';
                const boxes = a.blitzBoxesChecked !== undefined ? a.blitzBoxesChecked : 50;
                const vol = boxes * 24;
                const avarias = a.blitzAvariasFound !== undefined ? a.blitzAvariasFound : (a.refugos?.reduce((s, r) => s + (r.qty || 0), 0) || 0);
                const pct = vol > 0 ? (avarias / vol) * 100 : 0;
                return {
                  plate: a.plate || 'SEM_PLACA',
                  driverName: drv.name,
                  helperName: hlp,
                  routeMap: a.routeMap || 'N/A',
                  boxesChecked: boxes,
                  volumeUnits: vol,
                  avariasFound: avarias,
                  refugoPercent: pct,
                  isWithinMeta: pct <= TARGET_BENCHMARK_MONTHLY,
                  status: 'Aferido' as const,
                  audit: a,
                  time: a.endTime ? new Date(a.endTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '15:30',
                  conferenteName: a.conferenteId || 'Conferente de Retorno',
                  motiveDetails: a.refugos && a.refugos.length > 0 ? a.refugos.map(r => `${r.reason || 'Avaria'}: ${r.qty}un`).join(', ') : 'Sem quebras registradas'
                };
              });
            }

            if (drawnBlitzVehicles.length < 2) {
              const existingPlates = new Set(drawnBlitzVehicles.map(v => v.plate));
              const otherAudits = allAuditsOnBlitzDate.filter(a => !existingPlates.has(a.plate));
              
              let dateSeed = 0;
              for (let i = 0; i < selectedBlitzDate.length; i++) {
                dateSeed = (dateSeed * 31 + selectedBlitzDate.charCodeAt(i)) % 1000;
              }

              const candidatePlates = vehicles.length > 0 ? vehicles.map(v => v.plate) : ['QFG-4412', 'KJJ-8841', 'OET-2930', 'MNZ-5582', 'NQK-7740', 'KLU-9912'];

              while (drawnBlitzVehicles.length < 2) {
                if (otherAudits.length > 0) {
                  const a = otherAudits.shift()!;
                  const drv = resolveRegisteredDriver(a.driverId, a.routeMap || a.id, drivers);
                  const hlp = a.helperId ? resolveRegisteredDriver(a.helperId, `${a.routeMap || a.id}_hlp`, drivers).name : 'N/A';
                  const boxes = a.blitzBoxesChecked !== undefined ? a.blitzBoxesChecked : 50;
                  const vol = boxes * 24;
                  const avarias = a.blitzAvariasFound !== undefined ? a.blitzAvariasFound : (a.refugos?.reduce((s, r) => s + (r.qty || 0), 0) || 0);
                  const pct = vol > 0 ? (avarias / vol) * 100 : 0;
                  drawnBlitzVehicles.push({
                    plate: a.plate || 'SEM_PLACA',
                    driverName: drv.name,
                    helperName: hlp,
                    routeMap: a.routeMap || 'N/A',
                    boxesChecked: boxes,
                    volumeUnits: vol,
                    avariasFound: avarias,
                    refugoPercent: pct,
                    isWithinMeta: pct <= TARGET_BENCHMARK_MONTHLY,
                    status: 'Aferido' as const,
                    audit: a,
                    time: '15:45',
                    conferenteName: a.conferenteId || 'Conferente da Blitz',
                    motiveDetails: a.refugos && a.refugos.length > 0 ? a.refugos.map(r => `${r.reason || 'Avaria'}: ${r.qty}un`).join(', ') : 'Sem avarias'
                  });
                  existingPlates.add(a.plate);
                } else {
                  const idx = (dateSeed + drawnBlitzVehicles.length * 3) % candidatePlates.length;
                  const pl = candidatePlates[idx] || `VEIC-${drawnBlitzVehicles.length + 1}`;
                  const drv = resolveRegisteredDriver(`drv_${idx}`, pl, drivers);
                  drawnBlitzVehicles.push({
                    plate: pl,
                    driverName: drv.name,
                    helperName: 'Auxiliar Ambev',
                    routeMap: `Rota ${(dateSeed % 30) + 101}`,
                    boxesChecked: 50,
                    volumeUnits: 1200,
                    avariasFound: 0,
                    refugoPercent: 0,
                    isWithinMeta: true,
                    status: 'Sorteado / Pendente' as const,
                    time: 'Aguardando Retorno',
                    conferenteName: 'Escala do Dia',
                    motiveDetails: 'Aferi√ß√£o programada no descarregamento'
                  });
                  existingPlates.add(pl);
                }
              }
            }

            let blitzBoxesTotal = 0;
            let blitzAvariasTotal = 0;
            drawnBlitzVehicles.forEach(v => {
              blitzBoxesTotal += v.boxesChecked;
              blitzAvariasTotal += v.avariasFound;
            });
            const blitzVolumeUnitsTotal = blitzBoxesTotal * 24;
            const blitzRefugoPercent = blitzVolumeUnitsTotal > 0 ? (blitzAvariasTotal / blitzVolumeUnitsTotal) * 100 : 0;

            // Full Blitz Measurement History
            const allBlitzHistoryList = audits.filter(a => a.isBlitz || a.blitzBoxesChecked !== undefined || a.blitzAvariasFound !== undefined || (a.refugos && a.refugos.length > 0)).map(a => {
              const drv = resolveRegisteredDriver(a.driverId, a.routeMap || a.id, drivers);
              const boxes = a.blitzBoxesChecked || 50;
              const vol = boxes * 24;
              const avarias = a.blitzAvariasFound !== undefined ? a.blitzAvariasFound : (a.refugos?.reduce((s, r) => s + (r.qty || 0), 0) || 0);
              const pct = vol > 0 ? (avarias / vol) * 100 : 0;
              return {
                id: a.id,
                date: a.arrivalDate || 'N/A',
                plate: a.plate || 'SEM_PLACA',
                routeMap: a.routeMap || 'N/A',
                driverName: drv.name,
                conferente: a.conferenteId || 'Conferente de Retorno',
                boxesChecked: boxes,
                volumeUnits: vol,
                avariasFound: avarias,
                refugoPercent: pct,
                isWithinMeta: pct <= TARGET_BENCHMARK_MONTHLY,
                motives: a.refugos && a.refugos.length > 0 ? a.refugos.map(r => `${r.reason || 'Avaria'}: ${r.qty}un`).join(', ') : 'Sem quebras registradas'
              };
            });

            // Base de Sobras calibradas rigorosamente (igual √† guia de Sobras e Faltas P.A. e A.G.)
            const calibratedSobrasBase = CALIBRATED_SOBRAS_BASE;

            // Ativos de Giro Sobras (F√≠sico vs Fiscal) Detalhado - Base Oficial √önica
            const ativosGiroSobrasList: Array<{
              auditId: string;
              date: string;
              routeMap: string;
              plate: string;
              driverName: string;
              helperName: string;
              assetId: string;
              assetName: string;
              physicalQty: number;
              fiscalQty: number;
              diffQty: number;
              unitCost: number;
              totalCost: number;
              conferente: string;
            }> = [];

            // 1. Processar Sobras Calibradas com pre√ßo unit√°rio configur√°vel (estritamente unificado com Sobras e Faltas)
            calibratedSobrasBase.forEach(s => {
              const drv = resolveRegisteredDriver(s.driverId, s.routeMap, drivers);
              const uCost = getItemConfiguredCost(s.assetId, s.assetName);
              ativosGiroSobrasList.push({
                auditId: s.auditId,
                date: s.date,
                routeMap: s.routeMap,
                plate: s.plate,
                driverName: drv.name,
                helperName: s.helperName,
                assetId: s.assetId,
                assetName: s.assetName,
                physicalQty: s.physicalQty,
                fiscalQty: s.fiscalQty,
                diffQty: s.diffQty,
                unitCost: uCost,
                totalCost: s.diffQty * uCost,
                conferente: s.conferente
              });
            });

            const totalAtivosGiroSobrasUnits = ativosGiroSobrasList.reduce((s, i) => s + i.diffQty, 0);
            const totalAtivosGiroSobrasValue = ativosGiroSobrasList.reduce((s, i) => s + i.totalCost, 0);

            // Total PA Sobras (se houver comercial)
            let totalPaSobrasUnits = 0;
            let totalPaSobrasValue = 0;
            audits.forEach(audit => {
              if (!audit.isEstimated && !audit.id.includes('retro') && !audit.id.includes('sobra_2026') && audit.items && audit.items.length > 0) {
                audit.items.forEach(i => {
                  const phys = i.rePhysicalQty !== undefined ? i.rePhysicalQty : (i.physicalQty || 0);
                  const sys = i.fiscalQty !== undefined ? i.fiscalQty : 0;
                  if (phys > sys) {
                    const diff = phys - sys;
                    const uPrice = getItemConfiguredCost(i.productCode, i.productDescription);
                    totalPaSobrasUnits += diff;
                    totalPaSobrasValue += diff * uPrice;
                  }
                });
              }
            });

            const totalSobrasUnits = totalAtivosGiroSobrasUnits + totalPaSobrasUnits;
            const totalSobrasValue = totalAtivosGiroSobrasValue + totalPaSobrasValue;

            const balancoFinalUnits = totalSobrasUnits - globalRefugoUnits;
            const balancoFinalValue = totalSobrasValue - globalRefugoValue;
            const isPositiveBalance = balancoFinalUnits >= 0;

            // Vehicle Aggregation
            const vehicleAggMap: Record<string, {
              plate: string;
              tripsCount: number;
              totalVolume: number;
              totalRefugos: number;
              totalRefugoValue: number;
              driverNames: Set<string>;
            }> = {};

            processedAuditList.forEach(item => {
              const pl = (item.audit.plate || 'SEM_PLACA').trim().toUpperCase();
              if (!vehicleAggMap[pl]) {
                vehicleAggMap[pl] = {
                  plate: pl,
                  tripsCount: 0,
                  totalVolume: 0,
                  totalRefugos: 0,
                  totalRefugoValue: 0,
                  driverNames: new Set()
                };
              }
              vehicleAggMap[pl].tripsCount += 1;
              vehicleAggMap[pl].totalVolume += item.volumeHandledUnits;
              vehicleAggMap[pl].totalRefugos += item.refugoQty;
              vehicleAggMap[pl].totalRefugoValue += item.refugoValue;
              if (item.drvName) vehicleAggMap[pl].driverNames.add(item.drvName);
            });

            const vehicleStatsList = Object.values(vehicleAggMap).map(v => {
              const percent = v.totalVolume > 0 ? (v.totalRefugos / v.totalVolume) * 100 : 0;
              const isWithin = percent <= TARGET_BENCHMARK_MONTHLY;
              return {
                ...v,
                percent,
                isWithin
              };
            }).sort((a, b) => b.percent - a.percent);

            // Time Analysis Aggregation (Month-by-Month & Day-by-Day)
            interface RefugoChartItem {
              timeKey: string;
              label: string;
              refugo: number;
              refugoValue: number;
              volume: number;
              count: number;
            }
            const monthMap: Record<string, RefugoChartItem> = {};
            const dayMap: Record<string, RefugoChartItem> = {};

            processedAuditList.forEach(item => {
              const dStr = item.audit.arrivalDate || new Date().toISOString().split('T')[0];
              const mStr = dStr.substring(0, 7); // YYYY-MM

              // Month Label
              const [y, m] = mStr.split('-');
              const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
              const monthLabel = `${monthNames[parseInt(m, 10) - 1] || m}/${y?.substring(2)}`;

              if (!monthMap[mStr]) {
                monthMap[mStr] = { timeKey: mStr, label: monthLabel, refugo: 0, refugoValue: 0, volume: 0, count: 0 };
              }
              monthMap[mStr].refugo += item.refugoQty;
              monthMap[mStr].refugoValue += item.refugoValue;
              monthMap[mStr].volume += item.volumeHandledUnits;
              monthMap[mStr].count += 1;

              // Day Label
              const dayParts = dStr.split('-');
              const dayLabel = `${dayParts[2]}/${dayParts[1]}`;

              if (!dayMap[dStr]) {
                dayMap[dStr] = { timeKey: dStr, label: dayLabel, refugo: 0, refugoValue: 0, volume: 0, count: 0 };
              }
              dayMap[dStr].refugo += item.refugoQty;
              dayMap[dStr].refugoValue += item.refugoValue;
              dayMap[dStr].volume += item.volumeHandledUnits;
              dayMap[dStr].count += 1;
            });

            // Build arrays for Recharts (M√™s a M√™s - Integrando S√©rie Tratada da F√°brica)
            const monthlyChartData = factoryTreatedMonthly.map(ft => {
              const localMonthData = monthMap[ft.monthKey];
              const auditCount = localMonthData ? localMonthData.count : 0;
              const isFinancial = refugoChartMetric === 'financeiro_reais';

              return {
                timeKey: ft.monthKey,
                label: ft.monthLabel,
                monthName: ft.monthName,
                refugo: ft.estimatedUnits,
                refugoValue: ft.treatedReal,
                rawFactoryRefugoValue: ft.factoryReal,
                metaValue: ft.meta,
                volume: ft.volume,
                count: auditCount,
                indice: Number((ft.treatedIndexPct || 0).toFixed(3)),
                real: isFinancial ? Number((ft.treatedReal || 0).toFixed(2)) : Number((ft.treatedIndexPct || 0).toFixed(3)),
                meta: isFinancial ? ft.meta : TARGET_BENCHMARK_MONTHLY,
                factoryReal: isFinancial ? ft.factoryReal : Number((ft.volume > 0 ? ((ft.factoryReal / 18.0) / ft.volume * 100) : 0).toFixed(3)),
                mediaPlanilha: PLANILHA_AVG_BENCHMARK,
                isWithinMeta: ft.isTreatedWithinMeta,
                treatedRxm: ft.treatedRxm,
                treatedLacuna: ft.treatedLacuna,
                factoryRxm: ft.factoryRxm,
                factoryLacuna: ft.factoryLacuna,
                savingsVsFactory: ft.savingsVsFactory,
                avgCostPerUnit: 18.0
              };
            });

            const dailyChartData = Object.values(dayMap).sort((a, b) => a.timeKey.localeCompare(b.timeKey)).map(d => {
              const indice = d.volume > 0 ? (d.refugo / d.volume) * 100 : 0;
              const formattedIndice = Number((indice || 0).toFixed(3));
              const avgCostPerUnit = d.refugo > 0 ? d.refugoValue / d.refugo : 18.0;
              const isFinancial = refugoChartMetric === 'financeiro_reais';
              const dayMetaValue = (33605 / 22); // meta di√°ria m√©dia
              return {
                ...d,
                indice: formattedIndice,
                real: isFinancial ? Number((d.refugoValue || 0).toFixed(2)) : formattedIndice,
                meta: isFinancial ? Number((dayMetaValue || 0).toFixed(2)) : TARGET_BENCHMARK_MONTHLY,
                mediaPlanilha: PLANILHA_AVG_BENCHMARK,
                isWithinMeta: isFinancial ? (d.refugoValue <= dayMetaValue) : (indice <= TARGET_BENCHMARK_MONTHLY),
                avgCostPerUnit
              };
            });

            const filteredDailyChartData = selectedMonthKey
              ? dailyChartData.filter(d => d.timeKey.substring(0, 7) === selectedMonthKey)
              : dailyChartData;

            const activeChartData = refugoTimeGranularity === 'mes' ? monthlyChartData : filteredDailyChartData;

            // Filtered Audit Records for table/cards
            const filteredAuditList = auditsWithRefugosList.filter(item => {
              // Target Filter
              if (refugoTargetFilter === 'dentro' && !item.isWithinMeta) return false;
              if (refugoTargetFilter === 'acima' && item.isWithinMeta) return false;

              // Period Filter
              if (refugoPeriodFilter === 'mes_atual') {
                const auditDate = new Date(item.audit.arrivalDate);
                const now = new Date();
                if (auditDate.getMonth() !== now.getMonth() || auditDate.getFullYear() !== now.getFullYear()) {
                  return false;
                }
              } else if (refugoPeriodFilter === 'mes_anterior') {
                const auditDate = new Date(item.audit.arrivalDate);
                const prev = new Date();
                prev.setMonth(prev.getMonth() - 1);
                if (auditDate.getMonth() !== prev.getMonth() || auditDate.getFullYear() !== prev.getFullYear()) {
                  return false;
                }
              }

              // Search Filter
              if (refugoSearchQuery.trim()) {
                const q = refugoSearchQuery.toLowerCase().trim();
                const matchPlate = item.audit.plate?.toLowerCase().includes(q);
                const matchMap = item.audit.routeMap?.toLowerCase().includes(q);
                const matchDriver = item.drvName.toLowerCase().includes(q);
                const matchHelper = item.helperName.toLowerCase().includes(q);
                const matchItem = item.audit.refugos?.some(r => r.assetName.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q));
                return matchPlate || matchMap || matchDriver || matchHelper || matchItem;
              }

              return true;
            });

            // Pagination calculation
            const itemsPerPage = 9;
            const totalPages = Math.ceil(filteredAuditList.length / itemsPerPage) || 1;
            const currentPage = Math.min(refugoPage, totalPages);
            const paginatedAudits = filteredAuditList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

            return (
              <>
                {/* HERO BANNER DE CONTROLE E RECENTRAGEM SIM√âTRICA */}
                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6 relative overflow-hidden">
                  <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                    <div className="space-y-2 max-w-3xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-amber-400 font-mono text-xxs uppercase tracking-widest font-extrabold px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1.5">
                          <BarChart2 className="h-3 w-3" />
                          Log√≠stica de Reverso & Gest√£o da Meta
                        </span>
                        <span className="text-emerald-400 font-mono text-xxs uppercase tracking-wider font-extrabold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          Meta Corporativa: 0,664% | M√©dia Planilha: 0,532%
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowRefugoTreatmentModal(true)}
                          className="text-amber-300 hover:text-amber-200 font-mono text-xxs uppercase tracking-wider font-extrabold px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="Ver espelho da planilha de refugo da f√°brica e tratamento de 23% menor"
                        >
                          <Sliders className="h-3 w-3" />
                          <span>Tratamento da Planilha F√°brica (-{refugoReductionPct}%)</span>
                        </button>
                      </div>
                      <h2 className="font-sans font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
                        Dashboard de Refugos & Avarias de Ativos
                      </h2>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        An√°lise exata do √≠ndice de refugo calculado como <strong className="text-amber-400 font-mono">Quantidade de Itens Refugados / Volume Total Aferido</strong>. Acompanhe a evolu√ß√£o hist√≥rica m√™s a m√™s e entre dias em gr√°fico de colunas com meta e real.
                      </p>
                    </div>

                    <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex items-center gap-3 shrink-0 self-stretch xl:self-auto justify-between">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">F√≥rmula do C√°lculo</span>
                        <span className="text-xs font-mono font-bold text-amber-400 block">Qtd. Refugada √∑ Qtd. Aferida</span>
                      </div>
                      <div className="h-8 w-px bg-slate-800" />
                      <div className="text-left">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block font-bold">Status do Per√≠odo</span>
                        <span className={`text-xs font-mono font-extrabold uppercase px-2 py-0.5 rounded ${
                          isGlobalWithinMeta ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {isGlobalWithinMeta ? '‚úì Na Meta (‚â§0,664%)' : '‚ö† Acima (>0,664%)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* CARDS DE METRICAS PRINCIPAIS - GRID EXECUTIVO DE BALAN√áO E REFUGO */}
                  <div className="space-y-4">
                    {/* LINHA 1: TRIO DE BALAN√áO OPERACIONAL - SOBRAS vs REFUGOS vs BALAN√áO FINAL */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                      {/* CARD 1: TOTAL DE SOBRAS */}
                      <div className="bg-emerald-950/40 p-5 rounded-2xl border border-emerald-500/30 flex flex-col justify-between h-full text-white shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1.5">
                            <PlusCircle className="h-4 w-4 text-emerald-400" />
                            TOTAL DE SOBRAS
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowCostConfigModal(true)}
                            className="text-[9px] font-mono font-bold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 transition cursor-pointer flex items-center gap-1"
                            title="Ver Tabela de Valores e Mem√≥ria de C√°lculo"
                          >
                            <Sliders className="h-3 w-3" />
                            Ajustar Pre√ßos
                          </button>
                        </div>
                        <div className="my-2.5">
                          <div className="text-3xl font-sans font-black tracking-tight text-emerald-300">
                            {totalSobrasUnits.toLocaleString('pt-BR')} <span className="text-xs text-emerald-400 font-normal">un</span>
                          </div>
                          <span className="text-xs text-emerald-200/80 font-mono block mt-1 font-bold">
                            R$ {totalSobrasValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-[10px] font-mono text-emerald-300/80">
                          <button
                            type="button"
                            onClick={() => setShowCostConfigModal(true)}
                            className="hover:underline text-emerald-300 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Mem√≥ria de C√°lculo</span>
                            <span>‚Üí</span>
                          </button>
                          <span className="font-bold text-emerald-300">Sobras Apuradas</span>
                        </div>
                      </div>

                      {/* CARD 2: TOTAL DE ITENS REFUGADOS */}
                      <div className="bg-rose-950/40 p-5 rounded-2xl border border-rose-500/30 flex flex-col justify-between h-full text-white shadow-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="h-4 w-4 text-rose-400" />
                            TOTAL DE ITENS REFUGADOS
                          </span>
                          <span className="text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30">
                            Avarias / Descartes
                          </span>
                        </div>
                        <div className="my-2.5">
                          <div className="text-3xl font-sans font-black tracking-tight text-rose-300">
                            {globalRefugoUnits.toLocaleString('pt-BR')} <span className="text-xs text-rose-400 font-normal">un</span>
                          </div>
                          <span className="text-xs text-rose-200/80 font-mono block mt-1 font-bold">
                            R$ {globalRefugoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[10px] font-mono text-rose-300/80">
                          <span>Garrafas e Ativos Refugados</span>
                          <span className="font-bold text-rose-300">Avarias Totais</span>
                        </div>
                      </div>

                      {/* CARD 3: BALAN√áO FINAL */}
                      <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full text-white shadow-xs transition-all ${
                        isPositiveBalance 
                          ? 'bg-blue-950/40 border-blue-500/30' 
                          : 'bg-amber-950/40 border-amber-500/30'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-300 flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-blue-400" />
                            BALAN√áO FINAL
                          </span>
                          <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded border ${
                            isPositiveBalance
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {isPositiveBalance ? 'Super√°vit F√≠sico' : 'D√©ficit L√≠quido'}
                          </span>
                        </div>
                        <div className="my-2.5">
                          <div className={`text-3xl font-sans font-black tracking-tight ${
                            isPositiveBalance ? 'text-blue-300' : 'text-amber-300'
                          }`}>
                            {balancoFinalUnits >= 0 ? `+${balancoFinalUnits.toLocaleString('pt-BR')}` : balancoFinalUnits.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">un</span>
                          </div>
                          <span className={`text-xs font-mono block mt-1 font-bold ${
                            balancoFinalValue >= 0 ? 'text-blue-200/90' : 'text-amber-200/90'
                          }`}>
                            {balancoFinalValue >= 0 ? `+R$ ${balancoFinalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-R$ ${Math.abs(balancoFinalValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[10px] font-mono text-slate-400">
                          <span>F√≥rmula: Sobras - Refugos</span>
                          <span className="font-bold text-slate-200">Saldo L√≠quido</span>
                        </div>
                      </div>
                    </div>

                    {/* LINHA 2: M√âTRICAS OPERACIONAIS E √çNDICE DE REFUGO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
                      {/* CARD 4: INDICE GERAL DE REFUGO */}
                      <div className={`p-5 rounded-2xl border flex flex-col justify-between h-full transition-all ${
                        isGlobalWithinMeta 
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300' 
                          : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-400">√çNDICE GERAL DE REFUGO</span>
                          <Percent className="h-4 w-4 text-amber-400" />
                        </div>
                        <div className="my-2">
                          <div className="text-3xl font-sans font-black tracking-tight text-white">
                            {(globalRefugoPercent || 0).toFixed(3)}%
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            M√©dia Planilha: <strong className="text-slate-200">0,532%</strong> ‚Ä¢ Meta: <strong className="text-amber-300">‚â§0,664%</strong>
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Status Meta</span>
                          <span className={`text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isGlobalWithinMeta ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isGlobalWithinMeta ? 'DENTRO DA META' : 'ACIMA DA META'}
                          </span>
                        </div>
                      </div>

                      {/* CARD 5: TOTAL DE REFUGO AFERIDO (VOLUME AFERIDO) */}
                      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between h-full text-white">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-400">TOTAL VOLUME AFERIDO</span>
                          <Box className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="my-2">
                          <div className="text-3xl font-sans font-black tracking-tight text-white">
                            {globalVolumeUnits.toLocaleString('pt-BR')} <span className="text-xs text-slate-400 font-normal">un</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Base Total de Unidades Aferidas</span>
                        </div>
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                          <span className="text-[9px] font-mono text-slate-400 uppercase">Unidades Conferidas</span>
                          <span className="text-[9px] font-mono font-bold text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded border border-blue-500/30">
                            {totalAuditsCount} Rotas
                          </span>
                        </div>
                      </div>

                      {/* CARD 6: BLITZ DE REFUGO (REC√ÅLCULO DI√ÅRIO - 2 CARROS POR DIA) */}
                      <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700/80 flex flex-col justify-between h-full text-white">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-amber-400 flex items-center gap-1">
                            <Shield className="h-3.5 w-3.5" />
                            BLITZ DE REFUGO (2 CARROS/DIA)
                          </span>
                          <input
                            type="date"
                            value={selectedBlitzDate}
                            onChange={(e) => setSelectedBlitzDate(e.target.value)}
                            className="bg-slate-900 text-slate-200 border border-slate-700 text-[10px] font-mono px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                            title="Selecione a data para recalcular a Blitz"
                          />
                        </div>
                        <div className="my-2 space-y-1.5">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-slate-300 font-bold font-sans">2 Ve√≠culos Sorteados</span>
                            <span className="text-lg font-mono font-black text-amber-400">{blitzAvariasTotal} un avarias</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {drawnBlitzVehicles.map((v, idx) => (
                              <span key={idx} className="text-[10px] bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono font-bold text-amber-300">
                                {v.plate} ({v.driverName.split(' ')[0]})
                              </span>
                            ))}
                          </div>
                          <div className="flex justify-between text-[10px] font-mono text-slate-400 pt-0.5">
                            <span>Vistoriadas: <strong className="text-slate-200">{blitzBoxesTotal} cx ({blitzVolumeUnitsTotal} un)</strong></span>
                            <span>Avarias: <strong className="text-amber-300">{blitzAvariasTotal} un</strong></span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setShowBlitzHistoryModal(true)}
                            className="text-[9px] font-sans font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                          >
                            Ver Hist√≥rico de Aferi√ß√£o
                          </button>
                          <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                            Taxa: {(blitzRefugoPercent || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PAINEL DIN√ÇMICO 1: VE√çCULOS SORTEADOS NA BLITZ DO DIA E HIST√ìRICO DE AFERI√á√ÉO */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-amber-500 text-slate-950 text-xs font-black px-2 py-0.5 rounded-md uppercase font-mono">
                          Blitz do Dia: {new Date(selectedBlitzDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <h3 className="font-sans font-bold text-slate-900 text-base">
                          Ve√≠culos Sorteados & Aferi√ß√£o de Qualidade
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Sorteio mandat√≥rio de 2 ve√≠culos por dia com vistoria de 50 caixas (1.200 unidades) para aferi√ß√£o de avarias (bicadas, quebras e trincadas).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowBlitzHistoryModal(true)}
                      className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-sans flex items-center space-x-2 transition cursor-pointer shrink-0"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-amber-400" />
                      <span>Hist√≥rico Geral de Aferi√ß√£o</span>
                    </button>
                  </div>

                  {/* CARDS DOS 2 VE√çCULOS SORTEADOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {drawnBlitzVehicles.map((veh, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="bg-slate-900 text-amber-400 font-mono font-black text-sm px-2.5 py-1 rounded-lg border border-slate-800 shadow-xs">
                                {veh.plate}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                veh.status === 'Aferido'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {veh.status}
                              </span>
                            </div>
                            <h4 className="font-sans font-bold text-slate-900 text-sm mt-1.5">{veh.driverName}</h4>
                            <p className="text-xxs text-slate-500 font-medium">Ajudante: {veh.helperName} ‚Ä¢ {veh.routeMap}</p>
                          </div>

                          <div className="text-right">
                            <span className="text-xxs font-mono text-slate-400 block">{veh.time}</span>
                            <span className="text-[10px] text-slate-600 font-bold">{veh.conferenteName}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-lg border border-slate-200/80 text-center">
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">Amostra Aferida</span>
                            <span className="font-mono font-black text-slate-800 text-xs">{veh.boxesChecked} cx</span>
                            <span className="text-[9px] text-slate-400 font-mono block">({veh.volumeUnits} un)</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">Avarias / Quebras</span>
                            <span className={`font-mono font-black text-xs ${veh.avariasFound > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {veh.avariasFound} un
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block">Bicadas/Trincadas</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-mono text-slate-400 uppercase block">√çndice Refugo</span>
                            <span className={`font-mono font-black text-xs ${veh.isWithinMeta ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {(veh.refugoPercent || 0).toFixed(3)}%
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono block">Meta: ‚â§0,664%</span>
                          </div>
                        </div>

                        <div className="text-xxs text-slate-600 font-sans bg-slate-100/70 p-2 rounded border border-slate-200 flex items-center justify-between">
                          <span><strong>Ocorr√™ncia:</strong> {veh.motiveDetails || 'Confer√™ncia f√≠sica sem irregularidades.'}</span>
                          <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${
                            veh.isWithinMeta ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                          }`}>
                            {veh.isWithinMeta ? 'Dentro da Meta' : 'Acima da Meta'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* PAINEL DIN√ÇMICO 2: SOBRAS DE ATIVOS DE GIRO (F√çSICO VS FISCAL) & BALAN√áO GERAL */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded-md uppercase font-mono">
                          Concilia√ß√£o F√≠sico & Fiscal
                        </span>
                        <h3 className="font-sans font-bold text-slate-900 text-base">
                          Sobras de Ativos de Giro & Balan√ßo Geral
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Diverg√™ncias apuradas na confer√™ncia f√≠sica e fiscal dos ativos de giro (Garrafeiras, Vasilhames e Paletes) e balan√ßo com os itens refugados.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCostConfigModal(true)}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold font-sans flex items-center space-x-1.5 transition cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Sliders className="h-4 w-4 text-emerald-200" />
                        <span>Ajustar Tabela de Pre√ßos</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSobrasAtivosDetailModal(true)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold font-sans flex items-center space-x-1.5 transition cursor-pointer shrink-0"
                      >
                        <Layers className="h-4 w-4" />
                        <span>Ver Rotas com Sobras</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 CARDS DE BALAN√áO GERAL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">1. Sobras de Ativos de Giro</span>
                      <div className="text-xl font-sans font-black text-slate-900 mt-1">
                        +{totalAtivosGiroSobrasUnits.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">un</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 block mt-0.5">
                        +R$ {totalAtivosGiroSobrasValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">Garrafeiras, Vasilhames e Paletes</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">2. Sobras de P.A. (Cervejas/Refris)</span>
                      <div className="text-xl font-sans font-black text-slate-900 mt-1">
                        +{Math.max(0, totalSobrasUnits - totalAtivosGiroSobrasUnits).toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">un</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-600 block mt-0.5">
                        +R$ {Math.max(0, totalSobrasValue - totalAtivosGiroSobrasValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">Produtos Acabados Comerciais</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">3. Itens Refugados & Avarias</span>
                      <div className="text-xl font-sans font-black text-rose-600 mt-1">
                        -{globalRefugoUnits.toLocaleString('pt-BR')} <span className="text-xs font-normal text-slate-500">un</span>
                      </div>
                      <span className="text-xs font-mono font-bold text-rose-600 block mt-0.5">
                        -R$ {globalRefugoValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium block mt-1">Bicadas, trincadas e amassadas</span>
                    </div>

                    <div className={`p-4 rounded-xl border ${isPositiveBalance ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                      <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">4. Balan√ßo Geral Consolidado</span>
                      <div className={`text-xl font-sans font-black mt-1 ${isPositiveBalance ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {balancoFinalUnits >= 0 ? `+${balancoFinalUnits.toLocaleString('pt-BR')}` : balancoFinalUnits.toLocaleString('pt-BR')} <span className="text-xs font-normal">un</span>
                      </div>
                      <span className={`text-xs font-mono font-bold block mt-0.5 ${isPositiveBalance ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {balancoFinalValue >= 0 ? `+R$ ${balancoFinalValue.toLocaleString('pt-xúÏ][s„∏ï~œØ@úÈ∂4c…≤eªªù∂ßd[Óv‚€HÍﬁ$SS=êILS§Ü§‹ˆ(Æ⁄l≤Ÿ™}Ÿ≠˝≥Ÿ™TRïß‘æÏ´˛I~…ûêI uÒe¶„Jzƒx úÛ·√·AmuçIœ¥Õﬁ†wÏ“ño:ˆëŸ1}oólÆëΩñ^!∑˘€Ø….˘∫P˚Ñ|2<£~∑Hõ^ÆI-j∑úc”¶÷[jXæË;ßNãZ¨Óª¶›…≠ˆ˝¬¡BØΩ˝ë˛Ω\˜˙‘ﬁW]≈ã§eQœ;ß=∂∑‚≥køÂã˛ıWÑˇÙ,Í≥¬V©D⁄éÌzÃ0=“¥ú÷{“Û+˚ußÈRè4üö˘˚ø˛©±ˆ†„Ñßtº\7Ã+Ÿ%≈Ö‡Ù‘˘·˙ß‰≤rr^=%G'Á£9;9º Â]Ú™6˙Ì1˛ÆU_Wjç:9™íÍ€ã”7£ﬂè~wA’≥ÀãZÂî|∫>›~/·]—¶iv
∫¶œàÎlÉÖÕkã4◊`nü†µ6°µº.5úÖkèÙ;Z†≈
7Öùie/j[Ïö‡?ÖñcØ∑ÀªŒÚÎÅÁõÌõBì˘≥	H”Û
ûO]Ôá-f˚ Ráˆ[°`Õ∏Ñ aøYÿíä#RjåLÿÿãEeØõä“y)IΩÉ∆•Ω&∏¢E4ÔEx-…5∞iQPΩ>O˙7ÖRq{‹=É˙}Ê∂®«mulG#!Ø‹—wm≥Âêß§¡lcÙªeRµ–⁄°◊ªÂXÀ†µC¡Àê÷¨	Új•¨^9÷`Ùß—b∞`të‹–Â?fèΩr©=∞®k˙7dooè¨ˆò∑J>'´g£øxÑ¸œ*ÿ•’#ì¬!¸ªzõ◊T≥[Vˆæj¿Úã˝)KΩ©2ˆ≠0 ó:Ω>u©o^ae}j·8"-ßGzp?‹æ√/SR}π"πøˇ·Jk;;[OÚÑëﬁËœ‘—†§&◊Ñß±…⁄£ÔöÆŸ¢Ee≠˙Z˚§$ÚQ˚¡•}25’√Abh"√¥∞1÷p∞7Í·∂°≤E∫aÿ¯æcktœøÈ£D¸∂Õ}é}hô≠˜{√\ûÏÌè˘5ôzÊ∏jÊUì˛Mb¯5Û2Ûç»0∑:	ÉÄ„j2÷|xôg‚¸HZ◊s‹Bﬂ1yC}2‘ºïê√i<$ÜÒÿÿÛAñP¯Æs≈‹›»…Á•“™FıTNàŒJú1€£ñfTãN|T  cı{ß(Û£WÜ#sÙùk:skÉŒ˝∞÷aú©3ny+∑⁄è›n1”uﬁπ|Ÿ«¨¨¡Ö¢N	ˇËµ¢¶„±–è⁄í≈¥}NPÌµæW˙˚—k∆2˙w€0[lQã6”%µLZ¿n·Ÿ&˘Ph,KS’ò◊w†Øÿ!t)5mË∏¶·w˜V¿l>Y!]fv∫~p§¨Fçµ∞#ΩÍÚ_◊ß{CÑ†d<s'nIè∫”ﬁâÔÙw…Fiç∏X˛.)√Oãµ·¸h:–hΩ]≤πMno5#Í
fûIÌWÆiœwù˜ÏàÇn∏.ΩŸ[)ìÚJpvoÂ'Ìçˆv˚≈
Y◊¯ã µÈq·Œ† ã6ôµB|>ÿÜ\ÎÎÊ∑ﬂX#m”≤@˜~≤≥ılÎys$%‘ÓX0é
õ€∑\a+v´Î∏{+≈ç[r∏U∫’ K.CÊwl
Õ6öû—≤™ÿó«±|≥Ø—ˇ∂„ˆ®c,—"Hª–7kƒÌ€≈Ü7Ì∑PzK`∂I.ÎlëO)Ìä?pmÚÂ◊Ì:`¸.§#ø˘)›»%*¸’OµÇÈLpDhÖƒ«Ê53rÂ¸Ìì,oªUøL◊Òß¨äJ0PΩ©˚7®À1ÑñËS√Äfkà·ã
®◊•6sÙ‡)Xçƒ75∏Q©Ω™6ﬁTœ_üUj?wvqﬁx}˙KPÎryß¥≠kÂ±!`Ì-¯”M∞SñdãhÔÁv€*ŸF„b%‡„íÉ÷ñÀE® Íd¥ÅÒƒ§+JÛˆ2òhMM∆¶Üõ•´≤Õ=ÜlfIRÉ2IÓIû◊ñ4\xü·ê\Ìì¸™ÆÛ∞)–Üoø`•¶N.óÊ¿€~π≥F‡0ôîæ∫”ÜBhY≈5  GùAtÊFz±EÀÕÁ˜–H/◊ìÛæ ïë∏w∞oÌÇï8®ûV»QµQ9}]9¬_§ÚÊË§qQ;©‘…·≈©Uèﬂº∫∏/Ñ}{ÑΩgdCÿ·æiÑ}˝Np‚ ¿0}«5©Gû¬¯ÔòhZΩ	b¨‘,⁄õ–-ÂÕ.˛Ü0X†πò¡%<πä≥;~˜¨∑3ÁÂ	Ã]P}/¸»vpå¡%àπ,÷O .<(|∏˜®
t‡´WíEªÃBƒöâ‚7p•ÊCaG•9ºÑ:£n´è0∂@Ç≠‰™mzé5Ä!É=Ñî‡Ï6°;¥ˆ÷¥˚?5:∆7ÈL[ﬂÇ!◊mØtÂ`‡µ®ÀœQt‚˙¯ØÉ˙cßX,Í
‚Syh∏EÕø0˜FgÄ!0ÔB è±t∑w∂G
œ±"ÍÛã¸ıyΩO9.·ívXnC{∑∆[àb +Å>ı≠¬“w∞9F ∆ò⁄vIi£0õ”xªŒ¿∑¿‚l«f¡)ÙºAÁ"„u6uühÊ°YpA-ˆß¡.òQ±\ïéπ°À≠˙é·@ uÔ*≈a%˝Xí`IQ†iAd<R_·_â:œ$›f‘@â#ä8óN0Ä\Á#S™†“ÅV±s©evBèH®Ÿ}Î’9Ü	æé&˝“,⁄2{Ù#S,QÁ@Ø¿Mf≠TËëÇ€àÒ∑-lÓ˜fpGTAëOõì¯@º}—É’@Ì[˚]FÈ‚„v)öåI@bê ∏mîê·&'G•xæ4ûé»Tªåd%pˆñ'Î‰\„óÎ~wæBﬁ≤—_[À¡ÇBÔzÅ“ tË1Ri3◊4ú˘À˘¬7äAî9!áy;ú3hÕ_»ˇZD°$¬e]ŸØ˚‘x‹ÊÎÑ´J›¿'Aq’j›tåõ®00MÉnHcÏ,Î"Ì>Ìò6‹'Bm/à≥π…+Å±Ài€B´◊x;«™˜©Ω7|võh∏Á—6K©Zr˛ù3ª;ËQBCcPŒ˝rº ¢pÄß‚sØ˚ ˆÆk™úªØkØdSC»õÀa¨≥FL„öœ∆∫«yÉì˜Ïfo∑«ZS¨©FÃ⁄˙ÛRdLmMﬁQ“—ëÚ†Ññ9±†JläsÅWˆáX˜"Ô¡"L>Cáã*´uaÛVo”ËìJ!¢&[JJÊ4O!ÄWpO∆∑•È»=∑ÁslœX`|Õq¶ktÀ ÿÖHﬂÙ±l—1’≥wóßï√äÈ€iëæãÉÜœB•âQ C1ËF˜
üøá^å8	q3¥¨êıäœ¢Ø©mXÃxc£1ê/|Êq	˘~™í–Æ–√Õ\'·7·ﬂ<∫™åOÜ∫‘>âUáoΩX˙¢Ù=∑¬VG¥ÅÈ˝ìÈwMõØs}ƒ4ëêzËÑ⁄≤™!ÑL˛¢-|)ŸbÀËK≤-µcÃüõΩ˝æ6m´N„ô≤}ìà&ò≥&ú≠ä?ioE‡èç0RO<:/e«7£Fñ¯É∞5{_'e;‚(íÓÒÖá≥„3Àö_“u@Ô”ÅWßﬁˆ†…P&:Á™ö«¥≥ÿC£DR<≤O6»”ß
_Q
®Àó(CÖÙu2ÃŒ€ZÀz9˙›^2l\ﬁàu∏≈5∆HïÊ‹â∂ú}EKC÷”√é5ˆ¢UÂë‘F ∫îî0 a≥æÀÆ,ﬂsJncçs≤ëœH]â2G”ê)£4·äÖ›u†}Mˇ¸j5ﬁ¶n1-∏Öèöéö‰qüê©ºc˜˜H∫„ﬂl⁄πIôAOˆ√ÓÈKwÙ∑Î˚F2%Ì)Ω˜ebY3bﬂÊsërbœ√˘‡“`ïÉ]Ú˙§ﬁ˝gY0Ø™∏ÅÙ®Jj’∆EÌ¸¢°∫°„}«m–¶Äùª&ö-g5nÛì∆oº_îPpI±ˇ⁄‘`”^!¶fõ6ﬂçãäY√Ö5úG3f’Ñ2$„‹˚‰“»Y4g4€Q‰” ÀC©∆à€‰¸?È?+(|Œ›Ω5˙vyÖO‡î!Ï0RΩ2ÉÌß ”r¶Œbõ.€X†é7&„xπı-Ê#{à‚ë›fn 2#}A+≤hÀEªFØhP	∏≥eZ&˝iÙø‡⁄¥GıÃï¿t∆é‹[öï•Sñ‘RIw3"F2c∞Rƒ8ª©˚ÇYœd∂;AFÅ9·u‚©$€DVä§g!Å¿ÄõLß
ñhe?ê„∂‘˝Y©éÀh÷™mÃ‹®¡3è©I%”çLüUƒ∞iª∑ˇ´,1Eäﬁ“1Ω§¸.«»]!”KÀÒJå!µK=Ü‘ú≠ÈR“ËU≈Ìá$X≠KUdÍÑf>Ô‡Ó¸'[^ÛË‰pìXù»aY:´9ú$∆I3GÂ4‹8í¥ÑË¬–"u]zC~‚%I>î7`¥©Â±iA‰E¡8œö}dÜóD¥Kæ·Ê4œ'ﬂê=2˝«?0˜<ãúî!ûÆ’≈ıê=<\˘<˛t—¥[÷¿`^Óõ¥í.9Ñèeq0ÆÇh&∞WL∞Öë¢{çäZP4¯èc-"1Æ–¢	ÁƒU/MPQºﬁVDv˛líù8n=x}§˛·ëx…ÙÛ”∆!(œwS:1ï£ËAî«r•5R.M]√µ>≈@π€÷j ã∏•‡ÎâX»≠6–∆ [í@ÊVç_öü‚nøñ2≠	˛ÁXñáΩÒÚ$ùsU2#f]ÀÇ∑Ö
üRº>ùä$GŒde0•	ûEÚÊH@jâÄŒ¥F8WzßyêMEª#‡™±?ïÂHÖrNŒ.ä›ï‹©åM,˘¥ÓK•≤AR”àR9>3àä9™ÅçíÍ)<êù¯mqÚY®;bwπÜ°ù“åúÍã{∞Â"ÜŒÂ¥Ì	º…ﬂÇ,G<”¶KÉîfM16eu„K|âß“p"æäú^º™ìuR´æ:©7j]\Vkï—ÔGˇU’·E‹U{g9oq¿hR÷£@åtc˝1‚@ıÆ…,C	ô∂avúT(‹óÖ¯…Eüπ!TAÉà·ê::=züHPçÇ\å6MÀ4@u@"PsB ¬B°[‘¿á®È≠a§œÖ¿è	¡¢9çÕINiïj	$’ÖË©HLUR˜R…®ØW√iT?˛∆¸BÛ<[ôÏpS≤˘-h–<eL&˘≥Úe`%sQˆÂ0˜c>JN¡∏r7><à0ÛJ¶Ü{c]nÕ¬∫údé—8{Çy9Ü~9¨√~≤7bz¬©≥Á©VÂU´ÒjnÂ§Â∆Ò◊v)/»ï Xêı¬4ÆwâÕ≥7hâñw@±úçF6Nf˘Â∆FYoı+˙f< ⁄ÎÉÆÿÏ·>iÏÇ*´∂ÈÍ˘∫éÃßßOËk&a*¶◊f‡1K√1ã∞Bh‘…Í±û9ë7òô”}\`AÔ‚"Ü≥ÛùÂKi«4Raöñ6£¡ºñkˆ«¢ÊîPMñë“d§À¨Rjåî£B;•áqW˙Ï‚®r
ŒÙœﬁ‘UÙû«i»e≠:˙˝EùT…!\ÑoŒO£ﬂ÷N‚Î∞^◊˘pËx˛°c∑ÕŒôcPKÔP∑ëøFL¢±Bâ|ÀA‚Œƒì\ﬂÅc⁄zo∏Nø–¥._xüÚ)C'7$Á@ﬂè˝îõÈM‰ô|Ò¿ﬂ÷πÂ·Nuz]¯Pÿ∫ø∫Ö/_îÆ∫_ë¯ÇÌXûÆi‡ááÒÉá&Ω/ﬂƒÏ`û®d¡w
.iªN/Íu;zsdèUzÃÔu¡ƒΩ/Lë≈Ç9# pôÎ•Æo•ƒ La√ΩÈKóç˛‰†üÃ7øxŸ√‹±‚¨ÃÇ+≤9Ñ⁄K ˙‰b®\æ6ÓΩ„Çg?òH˚0C„.tZ£Ô,æ/iíFäØ{<9¯Ò>_"ãÁç‘òãkë`,”!«óÙ´Jò"·=<ì–p&^XÄ	vEge‹H∫ÙÂì-ˆIY5lA‘È;w|‹7%a"JåR®È€”DT	âOy<∑A2¨	üCõ•6ûÅeê≈\|<$Í†ƒÏ^vYí YS’S9$∫8ô£‰≈M£2˝z4:L∞¥&QŒròÅ=f!Èô6Ã_nn)∂ëd^ÉñªvÄ*∑HlÕ7Ï∫‘Âı‡+œ∂æ§3 kÛ7ÙÈiEÇEgÆ˙d"”kŒáÒáf‰D·±¬,Ü|6û¡,KÃì(…‚°Rﬁ˘uF¶JÏ;ı€‚.ﬂ2Sc–Ó'Zl{Ø·±6X~JS«∏ëùHõ&ås9˛9ÅÁ1Ù;Ï®,;Õßk"E—0H†“^R√Â`ÿqê|^2„…qÎ9047	Á2ÍŸ—åa+òı—Á2%v»h©‡Ízb©rIN◊§Ø¨èC[)+À"µä-«HΩ'WÕ∂P-”UÕb≥dπ9XTÊñNhLx≈&#	ïû˝"ôe¡WÛ=á;˙XHV§ÅZ—Z÷b”\„A{Ô	Ä[È~M}ÄœÂCı‘ÒÛ/"K¢Ä)¢_rÛÂd‹./∑ö¬QÜx„¬fZÄÁ[Åkü§¥ò>öò¿æ®^∂ı|÷ﬂ[)KÍ{¿«Ç[‘◊1◊Ωã–±)mØZ!˚¿∏rü	Œòÿ>u=vl9‘ü%˜ZÛõ–ÙÁò(7è∑œm˝v61øøÈ#4ú‡sÅÒ‚+F˙,2 kö¸21gls+ç$ÿi¿r“C€ŸÉ<ëˆ“‹5ÒßXüy˘:·£fÛ∂$çëdSåÉ¥p.¡T€è-:ø.l°f¨K˙ÑIJÈ^[ãDÎ«<c+yJÍ‘∫ö p´ç—ï'“A“ ÎYıº¡âµãFêàµ~qP´/†U'oßÒQÒ!7:qƒ˘£¬I∑'ÖV√§¡Z≈ãÔ5NzJot0)Øo9#º∞ÌÛE…‡#ÉP~ΩBê1wÃ7ô8‰
"-§X˘•¡§\“M=JZsÆâ§xæq&Ä<	Ì0}çêsõ∑ô…°–∑‘3y’±KP~bƒrÆ¬ ÃãÚv{.AE√Æ‰†hˆ»:á[JÍ¥”¶=h 4-µa¡TiÍ.qsJ÷i™JBnjÊ)"ûxb TÕ_$˜@ÉoØí‹æë_∏¨∑∏ƒìñMµd¨Io∂xj≥·aÂÙ|óFıËùpbﬁTÍ’YRn=D˜ÀAç‘[!â=Cf§ÚhE≥g•√$sëÊhå{Ãì%™œyÔ∫Õ˘Û6˙<	∞pH¶XãPeÇwœBÏπƒ<∏tÀ+Jhìr™R3¢+ª7∏˜ÿ˙¬øπE>*L‚Á¶éO∑ÓD¸PËpt•QWìœU0€m.Ø&„÷Jõ-·÷gòk+ïó|J:·¬N¿$0&W ‹ Wß¸Ú?5WõÈ®Q≤ï9Ç˘ÅÊ^„yîHÕ"Å√„ClÓ	®â§9™íÉ”ì∆ØDëƒÁr86s`ô˛∑¡v†è
ï˘{mI®Ã±	&µÔÇìÓuÛïåÿ%ñ∆aìÂ3·:Jûät“„œ’1†bG…˝≤◊B!pæGmplQ‹ ¢ππs8ÜFãö◊p&WA~Ì«»Lç˙èê°ˆ0ÊqÄ1tŒá¢Ãö≥^É«Ù‹oFrá◊s·PBê´(˜∆û≥Ñ √¸‚hêH+ˇÿ†irê/ñ$ÑMOò|û∏†â?úkÊqö%∏?ﬁ€#8ê⁄¶GpSéib=ë¬#87IÌìí2=ß.√¯é—	§^ùæÎ—∑4±Mx∂éÈ&Ç¬∂Ki\9∏z/ä˘îln•›Ê„ø2P˙c4kâ^˘\zœn§´>á∆ ⁄>Á≠±› #üëú[¸b<˛’‹5§_i¢ı[>àÖ⁄$e]«ìy®Ç9ª$µMLÔ‚=R†ºó{§T‹Ÿ—4ã&kF¯wG…¯ƒy3„ÑÛf∫PºOãŒõ9!xWz>ﬂysÔ?8¢à3¶“ò4À¸5“ò1KI(’ºù5ä˝!∑z0 ØIn10uÁ•I9oˆ¸a`ŒRì„/W ô√êõœ•ÂÄÇû%Â˚k€,…ﬁ4’{ÿwö€=Sf˜±Bú's∏/≈X-¯%’Ã.w?n(v>»‡£aµJc¬ïÉÈ˘¸‰Ù5ﬂX|<˙ÌAÌ‰∞BrÖÕÚì|ê>§Ë2Í#IÈ£¬dÒ∆;^˛^g•√=
º5m∑p6úµ·R?d¡QriA3[]é[Ü€ä»SrLa¥ãΩº.kR¶p‡*ÿÛı≈˜_6Bq¯V‡0‘3XÀ·w∆πqﬂÁÀ±Ë§OëûÇ´Ì†ñèèï˙ô!Y—§2zú∏Ú}‰«Ì(sIMPò 7an& ôIxB †pÈ>ƒî¯8Æ…„89Ç®ÍcÒÒ‡:§ñŸRÇÍ.)≠«Å«Wû/[æƒ˝U«¥ÅáZb1∞ë6∏Ã¢◊äÕD§Õ≈D®Ê[lMwÄ¸‘ øÁ£¬@{âπ~Ïé4<Ü∞PV'®f∑ëPma#π⁄∞ÕLa¢x¢ {Ù‡πÚÃÒ`éÆ¿›Åõ·ôÕò- ìt«ãG¸∂~ƒ™Ö„ùT†˛WKLØU!32»∫BôZs6∫åô≈±ï&π'˘]Iπ81ı[™’˚ï‘ªê`>ﬂ[ŸêoJ	∂QKîArsb'µn∑ßÿåtŒ•Õ∂i¸çï®9ı˛!ﬂΩQbørKÍ0VháÉç«πUmWÔDUﬂπ·[ﬁA\ª∫F"
æOÒ¬[“¬Lƒ$«\7OÜ≤íÓYö^DÍÛÂ≥ÏL∫ûÏ7è§ıåÄãß-_^¬˚˘É&çªµî^¶/rΩ€,Kµ@≠ts®‹ÍfY˛AˆTMìËY<–€JzÈ{Ê„cóÏ%ˆÀ£M‰·V&ﬂ‰ë8wè)xÊT;∑woÒÛ€ì˙õ È…Ø0ïÌÔx-ˆüU≈>3Ã~{Q;©@êR}{r4˙∑Û√ìJ|„ô$’Ò«Góˇ¡mZN¨=ïhzÊ8;ñ}óÀ‰ö9„ ⁄›PõB>≈ÆBFÈí˘˚?ˇ7ôNw.- ∂é˜Å∑,∫£Ë#ßAÌ®≤Ωd≈_ìŸƒT ì√-ë	$Ê∞°ùÃ	Möd’vvÈjf"ôÌT∫çI ,~GF™eâlÍ|ƒP≈ëõ	]$’tHoàíJÙÀ≤äΩˇw‹∂á¸;phêó”∏“Fhç_r¬È1´ì∑ÍÏÏC¥«— @Éñ”Û&¿b—Ë»ïåßÏiò=¶–2ï™öÒ0mí›Êm®»ı§pïy¸e\{éM[§wf‘9™§p
&§6›ıœM˛≈ÁY0+t©∂2¿û_O
VA,
N}x*œß$ ÇÅÎ≤%}k“NˇrZ¬èUrS‚’ä"t‹⁄42mÇ{;+∑V†˝¯¯4/¡Ãd«;¢ß„î¶=üy•›£¨/!∂¯ﬂ–ó§[∞◊SÖãrTÒO;‘]#¶vO∞ê&‰˝•∞$¶Ÿ&„ñ”m§∫ë≠íÛpZ‚˝Ÿ	%ªåz<E◊¢≈¶Ï úüÜúıâÙ¶) myJˆFpQ∆‡ó‰”öÏÙ$E“úq—cÇ´ÓáÎqxq~|R;òyU=˝Åoªã¿P-Åõq–Øhz}f?
u˜®Sœ ±€T\i˛Ø,≠Ï«÷7}Õ`IEDvdÎ†Ò≤{ÃÛháM',‘~}*∫≤PÊﬂíª≥Òzë6◊wŸüõÜ§X,‚—j∑+>ZJne6RÂoLè„Õ˚ÉÚ1Ôªïq4/‹¨±æá≥‚0{ã%øê7>ıÏá	‘◊™ıjÉ„Ûï£È‘o<Ûrÿñhı∏≥≤∏—Àú¡¥úÙëíZ±DÏSŸ+SÔÄê;2Xpì;YR;‚!ù‡ç˘î£æ€+Y…ùÀ'ÍP)H¿ñ1›—w∏œ*êãepRàŸ2ÒCq∆‰#S‰tÒ◊îÙ°E=÷ò.ﬂ≤K«œÛ"?O‘·ë⁄¸zlle\M¸òÕ∫z1Û–:6oLTg‘f\Œ»…Iy∆pUH“sgÔ¢p‹OzàüπÔYÑZ››\2>	≠u˚”˝?   ˇˇ §8„