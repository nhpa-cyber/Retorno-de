import React, { useState, useMemo, useEffect } from 'react';
import { User, ImportedRoute, AuditSession, Vehicle, Driver } from '../types';
import { 
  Truck, Play, CheckCircle2, Clock, Search, 
  Plus, Edit3, UserCheck, AlertCircle, RefreshCw, Layers, Check, X,
  ShieldAlert, ShieldCheck, ArrowRight, Pencil, Save, Moon
} from 'lucide-react';
import { getRouteCycleInfo } from '../utils/efdCalculations';

interface EmpilhadorViewProps {
  currentUser: User;
  importedRoutes: ImportedRoute[];
  onSaveImportedRoutes: (routes: ImportedRoute[]) => void;
  audits: AuditSession[];
  onSaveAudits?: (audits: AuditSession[]) => void;
  vehicles?: Vehicle[];
  drivers?: Driver[];
}

const normalizeMapCode = (mapCode: any): string => {
  if (!mapCode) return '';
  const str = String(mapCode).trim();
  const digitsOnly = str.replace(/\D/g, '');
  if (digitsOnly.length > 0) {
    return String(parseInt(digitsOnly, 10));
  }
  return str;
};

export default function EmpilhadorView({
  currentUser,
  importedRoutes = [],
  onSaveImportedRoutes,
  audits = [],
  onSaveAudits,
  vehicles = [],
  drivers = []
}: EmpilhadorViewProps) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  
  // Navigation tabs: pendentes, descarregados, pernoites
  const [activeTab, setActiveTab] = useState<'pendentes' | 'descarregados' | 'pernoites'>('pendentes');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Success notification toast
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Operational Safety & Unloading Checklist State
  const [activeChecklistRoute, setActiveChecklistRoute] = useState<ImportedRoute | null>(null);
  const [safetySteps, setSafetySteps] = useState({
    giro360: false,
    travaRodas: false,
    sobeBaias: false,
    blitzRefugoSeparada: false,
    motoristaManobraAvisado: false
  });

  // Modal for starting / editing / finishing
  const [selectedRoute, setSelectedRoute] = useState<ImportedRoute | null>(null);
  const [modalMode, setModalMode] = useState<'start' | 'finish' | 'edit' | 'create' | 'checklist' | null>(null);
  
  // Form fields
  const [formPlate, setFormPlate] = useState('');
  const [formRouteMap, setFormRouteMap] = useState('');
  const [formDriverName, setFormDriverName] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formPallets, setFormPallets] = useState<number>(8);
  const [formNotes, setFormNotes] = useState('');
  const resolveOperatorForView = (existingOp?: string) => {
    if (existingOp && existingOp.trim() && existingOp !== 'N/A') {
      const lower = existingOp.toLowerCase();
      if (lower.includes('admin') || lower.includes('gestor') || lower.includes('g1009')) {
        return 'Paulo Pereira';
      }
      return existingOp.trim();
    }
    if (currentUser.role === 'empilhador' && currentUser.name) {
      return currentUser.name;
    }
    const lowerName = (currentUser.name || '').toLowerCase();
    if (lowerName.includes('admin') || lowerName.includes('gestor') || lowerName.includes('g1009')) {
      return 'Paulo Pereira';
    }
    return currentUser.name || 'Paulo Pereira';
  };

  const [formOperator, setFormOperator] = useState(() => resolveOperatorForView());
  const [driverManeuverConfirmed, setDriverManeuverConfirmed] = useState(true);

  // Quick Plate Edit Modal State for Empilhador
  const [quickPlateModalRoute, setQuickPlateModalRoute] = useState<ImportedRoute | null>(null);
  const [quickPlateInput, setQuickPlateInput] = useState('');

  const handleOpenQuickEditPlate = (route: ImportedRoute) => {
    setQuickPlateModalRoute(route);
    setQuickPlateInput(route.plate);
  };

  const handleSaveQuickEditPlate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickPlateModalRoute) return;
    const cleanPlate = quickPlateInput.trim().toUpperCase();
    if (!cleanPlate) {
      alert('Por favor informe uma placa válida.');
      return;
    }

    const oldPlate = quickPlateModalRoute.plate.trim().toUpperCase();
    const targetMap = quickPlateModalRoute.routeMap.trim().toUpperCase();

    const updatedRoutes = importedRoutes.map(r => {
      if (r.id === quickPlateModalRoute.id || (targetMap && r.routeMap.trim().toUpperCase() === targetMap)) {
        return {
          ...r,
          plate: cleanPlate
        };
      }
      return r;
    });
    onSaveImportedRoutes(updatedRoutes);

    if (onSaveAudits && audits.length > 0) {
      const updatedAudits = audits.map(a => {
        const matchMap = targetMap && (a.routeMap.trim().toUpperCase() === targetMap || (a.unifiedMaps && a.unifiedMaps.some(m => m.trim().toUpperCase() === targetMap)));
        const matchPlate = oldPlate && a.plate.trim().toUpperCase() === oldPlate;
        if (matchMap || matchPlate) {
          return {
            ...a,
            plate: cleanPlate
          };
        }
        return a;
      });
      onSaveAudits(updatedAudits);
    }

    setSuccessToast(`Placa atualizada de ${oldPlate} para ${cleanPlate} com sucesso!`);
    setTimeout(() => setSuccessToast(null), 4000);
    setQuickPlateModalRoute(null);
  };

  // Helper to determine if a route is closed in audits
  const isRouteClosedInAudits = (mapCode: string): boolean => {
    const norm = normalizeMapCode(mapCode).toUpperCase();
    const upper = mapCode.trim().toUpperCase();
    return audits.some(a => {
      const aNorm = normalizeMapCode(a.routeMap).toUpperCase();
      const aUpper = a.routeMap.trim().toUpperCase();
      const isMatch = aNorm === norm || aUpper === upper ||
        (a.unifiedMaps && a.unifiedMaps.some(m => normalizeMapCode(m).toUpperCase() === norm || m.trim().toUpperCase() === upper));
      const isFinished = a.status === 'finalizado_ok' || a.status === 'finalizado_divergente' || (a as any).pdfDownloaded === true || (a as any).surplusFlowStatus === 'BAIXADO';
      return isMatch && isFinished && !a.reopeningRequested;
    });
  };

  // Sync effect: automatically normalize any old closed historical routes
  useEffect(() => {
    if (!importedRoutes || importedRoutes.length === 0) return;
    
    let needsUpdate = false;
    const updated = importedRoutes.map(r => {
      const isClosed = isRouteClosedInAudits(r.routeMap) || r.status === 'fechado';
      if (isClosed && (r.loadingStatus !== 'descarregado' || r.status !== 'fechado')) {
        needsUpdate = true;
        return {
          ...r,
          status: 'fechado' as const,
          loadingStatus: 'descarregado' as const,
          loadingEndTime: r.loadingEndTime || '10:00',
          loadingPalletsCount: r.loadingPalletsCount || r.pallets || 8
        };
      }
      return r;
    });

    if (needsUpdate) {
      onSaveImportedRoutes(updated);
    }
  }, [audits, importedRoutes, onSaveImportedRoutes]);

  // 1. Calculate OPEN / PENDING ROUTES (Strictly vehicles waiting or currently in unloading)
  const pendingRoutes = useMemo(() => {
    const list: ImportedRoute[] = [];
    const processedMaps = new Set<string>();

    (importedRoutes || []).forEach(route => {
      const routeMapUpper = route.routeMap.toUpperCase();
      const routeMapNorm = normalizeMapCode(route.routeMap).toUpperCase();

      const matchingAudit = audits.find(a => {
        const aNorm = normalizeMapCode(a.routeMap).toUpperCase();
        if (aNorm === routeMapNorm || a.routeMap.toUpperCase() === routeMapUpper) return true;
        if (a.unifiedMaps) {
          return a.unifiedMaps.some(m => normalizeMapCode(m).toUpperCase() === routeMapNorm || m.toUpperCase() === routeMapUpper);
        }
        return false;
      });

      const isFinalizedInAudit = matchingAudit && (
        matchingAudit.status === 'finalizado_ok' || 
        matchingAudit.status === 'finalizado_divergente' || 
        (matchingAudit as any).pdfDownloaded === true || 
        (matchingAudit as any).surplusFlowStatus === 'BAIXADO'
      );
      const isReopeningReq = matchingAudit?.reopeningRequested === true;
      const isAuditActive = matchingAudit && (matchingAudit.status === 'em_aberto' || matchingAudit.status === 'reconferencia');
      const isSubmittedToFiscal = matchingAudit && (matchingAudit.status === 'conferido_fisico' || matchingAudit.status === 'recontagem_finalizada');
      const isClosed = (isRouteClosedInAudits(route.routeMap) || route.status === 'fechado' || isFinalizedInAudit) && !isReopeningReq;

      // CRITICAL RULE: If the route is already "descarregado", IT MUST NOT BE IN PENDENTES!
      const isAlreadyUnloaded = route.loadingStatus === 'descarregado' || route.loadingStatus === 'carregado';

      if (!isAlreadyUnloaded && ((!isClosed && !isSubmittedToFiscal && route.status !== 'em_analise') || isReopeningReq || isAuditActive)) {
        if (!processedMaps.has(routeMapUpper) && !processedMaps.has(routeMapNorm)) {
          processedMaps.add(routeMapUpper);
          processedMaps.add(routeMapNorm);
          list.push(route);
        }
      }
    });

    return list;
  }, [importedRoutes, audits]);

  // 2. Calculate UNLOADED TODAY ROUTES (Strictly routes unloaded today by the operator)
  const unloadedTodayRoutes = useMemo(() => {
    return (importedRoutes || []).filter(r => {
      const isUnloaded = r.loadingStatus === 'descarregado' || r.loadingStatus === 'carregado';
      if (!isUnloaded) return false;

      const rDate = r.routeDate || r.date || (r.departureDate ? r.departureDate.split('T')[0] : '');
      const unloadedDate = (r as any).unloadedDate || (r.importedAt ? r.importedAt.split('T')[0] : '');
      
      // Match today's date or routes explicitly marked unloaded today
      const isToday = rDate === todayStr || unloadedDate === todayStr || (r as any).unloadedToday === true;
      return isToday;
    });
  }, [importedRoutes, todayStr]);

  // Pernoite routes (Classified by Auxiliar)
  const pernoiteRoutes = useMemo(() => {
    return (importedRoutes || []).filter(r => r.isPernoite && r.status !== 'fechado');
  }, [importedRoutes]);

  // Active list based on selected Tab
  const displayedRoutes = useMemo(() => {
    let targetPool = pendingRoutes;
    if (activeTab === 'descarregados') {
      targetPool = unloadedTodayRoutes;
    } else if (activeTab === 'pernoites') {
      targetPool = pernoiteRoutes;
    }

    return targetPool.filter(r => {
      const matchesSearch = 
        r.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.routeMap.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.driverName && r.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.loadingOperatorName && r.loadingOperatorName.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesSearch;
    });
  }, [activeTab, pendingRoutes, unloadedTodayRoutes, pernoiteRoutes, searchTerm]);

  // Pallet stats for today
  const totalPalletsToday = useMemo(() => {
    return unloadedTodayRoutes.reduce((acc, r) => acc + Number(r.loadingPalletsCount || r.pallets || 8), 0);
  }, [unloadedTodayRoutes]);

  const getCurrentTimeStr = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const handleOpenChecklistAndStart = (route: ImportedRoute) => {
    setActiveChecklistRoute(route);
    setSelectedRoute(route);
    setFormPlate(route.plate);
    setFormRouteMap(route.routeMap);
    setFormDriverName(route.driverName || '');
    setFormStartTime(route.loadingStartTime || getCurrentTimeStr());
    setFormEndTime(route.loadingEndTime || '');
    setFormPallets(route.loadingPalletsCount || route.pallets || 8);
    setFormNotes(route.loadingNotes || '');
    setFormOperator(resolveOperatorForView(route.loadingOperatorName));
    setSafetySteps({
      giro360: false,
      travaRodas: false,
      sobeBaias: false,
      blitzRefugoSeparada: !!route.isBlitz,
      motoristaManobraAvisado: true
    });
    setModalMode('checklist');
  };

  const handleConfirmStartWithChecklist = () => {
    if (!safetySteps.giro360 || !safetySteps.travaRodas || !safetySteps.sobeBaias) {
      alert('Atenção: É obrigatório confirmar o Giro 360º, a Colocação do Trava-Rodas/Calço e a Subida das Baias para iniciar o descarregamento!');
      return;
    }

    if (selectedRoute) {
      const startTime = formStartTime || getCurrentTimeStr();
      const updated = importedRoutes.map(r => {
        if (r.id === selectedRoute.id) {
          return {
            ...r,
            loadingStatus: 'em_descarregamento' as const,
            loadingStartTime: startTime,
            loadingOperatorId: currentUser.id,
            loadingOperatorName: formOperator.trim() || currentUser.name,
            loadingPalletsCount: Number(formPallets) || r.loadingPalletsCount || r.pallets || 8,
            loadingNotes: formNotes.trim() || `Início com Giro 360º e Trava-rodas (${currentUser.name})`
          };
        }
        return r;
      });
      onSaveImportedRoutes(updated);

      if (onSaveAudits && audits.length > 0) {
        const updatedAudits = audits.map(a => {
          if (a.routeMap === selectedRoute.routeMap || a.plate === selectedRoute.plate) {
            return {
              ...a,
              loadingStatus: 'em_descarregamento' as const,
              loadingStartTime: startTime,
              loadingOperatorId: currentUser.id,
              loadingOperatorName: formOperator.trim() || currentUser.name,
              loadingPalletsCount: Number(formPallets) || a.loadingPalletsCount || 8
            };
          }
          return a;
        });
        onSaveAudits(updatedAudits);
      }
    }

    setModalMode(null);
    setSelectedRoute(null);
    setActiveChecklistRoute(null);
  };

  const handleOpenFinish = (route: ImportedRoute) => {
    setSelectedRoute(route);
    setFormPlate(route.plate);
    setFormRouteMap(route.routeMap);
    setFormDriverName(route.driverName || '');
    setFormStartTime(route.loadingStartTime || getCurrentTimeStr());
    setFormEndTime(getCurrentTimeStr());
    setFormPallets(route.loadingPalletsCount || route.pallets || 8);
    setFormNotes(route.loadingNotes || '');
    setFormOperator(resolveOperatorForView(route.loadingOperatorName));
    setDriverManeuverConfirmed(true);
    setModalMode('finish');
  };

  const handleOpenEdit = (route: ImportedRoute) => {
    setSelectedRoute(route);
    setFormPlate(route.plate);
    setFormRouteMap(route.routeMap);
    setFormDriverName(route.driverName || '');
    setFormStartTime(route.loadingStartTime || '');
    setFormEndTime(route.loadingEndTime || '');
    setFormPallets(route.loadingPalletsCount || route.pallets || 8);
    setFormNotes(route.loadingNotes || '');
    setFormOperator(resolveOperatorForView(route.loadingOperatorName));
    setModalMode('edit');
  };

  const handleOpenCreate = () => {
    setSelectedRoute(null);
    setFormPlate('');
    setFormRouteMap('');
    setFormDriverName('');
    setFormStartTime(getCurrentTimeStr());
    setFormEndTime('');
    setFormPallets(8);
    setFormNotes('');
    setFormOperator(resolveOperatorForView());
    setModalMode('create');
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formPlate.trim()) {
      alert('Por favor informe a placa do veículo.');
      return;
    }

    const isFinishing = modalMode === 'finish';
    let status: 'aguardando' | 'em_descarregamento' | 'descarregado' = 'aguardando';
    
    if (isFinishing || formEndTime) {
      status = 'descarregado';
    } else if (formStartTime) {
      status = 'em_descarregamento';
    }

    if (modalMode === 'create') {
      const newRoute: ImportedRoute = {
        id: `route_manual_${Date.now()}`,
        plate: formPlate.trim().toUpperCase(),
        routeMap: formRouteMap.trim() || `MAPA-${Date.now().toString().slice(-4)}`,
        driverId: 'temporario',
        routeDate: todayStr,
        date: todayStr,
        departureDate: todayStr,
        driverName: formDriverName.trim() || 'MOTORISTA NÃO INFORMADO',
        pallets: Number(formPallets) || 8,
        status: status === 'descarregado' ? 'fechado' : 'pendente',
        importedAt: new Date().toISOString(),
        itemsCount: 0,
        loadingStatus: status as any,
        loadingStartTime: formStartTime || undefined,
        loadingEndTime: formEndTime || undefined,
        loadingOperatorId: currentUser.id,
        loadingOperatorName: formOperator.trim() || currentUser.name,
        loadingPalletsCount: Number(formPallets) || 8,
        loadingNotes: formNotes.trim() || undefined,
        unloadedDate: todayStr,
        unloadedToday: true
      } as any;

      const updated = [newRoute, ...importedRoutes];
      onSaveImportedRoutes(updated);

      if (status === 'descarregado') {
        setSuccessToast(`Placa ${formPlate.toUpperCase()} descarregada com sucesso! Motorista acionado para manobrar.`);
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } else if (selectedRoute) {
      const updated = importedRoutes.map(r => {
        if (r.id === selectedRoute.id) {
          return {
            ...r,
            routeDate: todayStr,
            loadingStatus: status as any,
            loadingStartTime: formStartTime || r.loadingStartTime,
            loadingEndTime: formEndTime || r.loadingEndTime,
            loadingOperatorId: currentUser.id,
            loadingOperatorName: formOperator.trim() || currentUser.name,
            loadingPalletsCount: Number(formPallets) || r.loadingPalletsCount || r.pallets || 8,
            loadingNotes: formNotes.trim() || undefined,
            unloadedDate: todayStr,
            unloadedToday: true
          };
        }
        return r;
      });
      onSaveImportedRoutes(updated);

      // Also update linked audit session
      if (onSaveAudits && audits.length > 0) {
        const updatedAudits = audits.map(a => {
          if (a.routeMap === selectedRoute.routeMap || a.plate === selectedRoute.plate) {
            return {
              ...a,
              loadingStatus: status,
              loadingStartTime: formStartTime || a.loadingStartTime,
              loadingEndTime: formEndTime || a.loadingEndTime,
              loadingOperatorId: currentUser.id,
              loadingOperatorName: formOperator.trim() || currentUser.name,
              loadingPalletsCount: Number(formPallets) || a.loadingPalletsCount || 8,
              loadingNotes: formNotes.trim() || a.loadingNotes
            };
          }
          return a;
        });
        onSaveAudits(updatedAudits);
      }

      if (status === 'descarregado') {
        setSuccessToast(`Placa ${selectedRoute.plate} finalizada e movida para Descarregados! Motorista instruído a manobrar.`);
        setTimeout(() => setSuccessToast(null), 5000);
      }
    }

    setModalMode(null);
    setSelectedRoute(null);
  };

  const calculateDurationMinutes = (startTime?: string, endTime?: string): number | null => {
    if (!startTime || !endTime) return null;
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const startTotal = sh * 60 + sm;
      const endTotal = eh * 60 + em;
      return endTotal >= startTotal ? endTotal - startTotal : (24 * 60 - startTotal) + endTotal;
    } catch {
      return null;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 px-4 sm:px-6 lg:px-8 pt-4">
      
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center justify-between animate-bounce border border-emerald-400">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-xs font-bold font-sans">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-white/80 hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner - CLEAN (No Date Icon/Input as requested) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-sans">
                Operação de Empilhadeira & Descarregamento
              </h1>
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                Empilhador
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Giro 360º, Calço de segurança, Abertura de baias e Descarregamento de paletes na Red Zone
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700/80 px-3.5 py-2 rounded-xl">
            <UserCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-slate-300 font-bold uppercase">{currentUser.name}</span>
          </div>

          <button
            onClick={handleOpenCreate}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-md cursor-pointer hover:scale-105 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar Placa</span>
          </button>
        </div>
      </div>

      {/* Logistics & Safety Guidance Alert Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl p-4 sm:p-5 text-white shadow-lg space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="bg-amber-500 text-slate-950 p-2.5 rounded-xl font-black shrink-0 shadow-md mt-0.5">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400 font-sans">
                  Diretrizes de Segurança & Manobra de Veículos (DPO Ambev)
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.2 rounded-full uppercase">
                  Procedimento Padrão
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1 leading-relaxed text-justify">
                <strong>DIRETRIZ DE LOGÍSTICA:</strong> Após o descarregamento completo na Red Zone e retirada do calço de segurança, <strong>É O MOTORISTA QUEM MANOBRA O VEÍCULO</strong> para o bolsão de estacionamento. O operador de empilhadeira é proibido de manobrar caminhões.
              </p>
            </div>
          </div>

          {/* Quick EPIs status chips */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full lg:w-auto shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 block">🪖 Capacete</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">C/ Jugular</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 block">👓 Óculos</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">Impacto</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 block">🎧 Protetor</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">Auricular</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 block">🧤 Luvas</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">Vaqueta</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 block">🥾 Calçado</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">Biqueira</span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-300 block">🦺 Colete</span>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">Refletivo</span>
            </div>
          </div>
        </div>
      </div>

      {/* PAINEL DE VEÍCULOS EM PERNOITE CLASSIFICADOS PELA LOGÍSTICA / AUXILIAR */}
      {pernoiteRoutes.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 rounded-2xl border-2 border-indigo-500/50 p-5 shadow-lg space-y-4 text-white animate-fade-in" id="pernoite_empilhador_panel">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-800/60 pb-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/40">
                <Moon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-sans font-black text-sm uppercase tracking-wide flex items-center gap-2">
                  <span>🌙 Veículos em Pernoite no Pátio</span>
                  <span className="bg-indigo-500 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {pernoiteRoutes.length} {pernoiteRoutes.length === 1 ? 'veículo' : 'veículos'}
                  </span>
                </h3>
                <p className="text-xs text-indigo-200/80">
                  Classificados pela Auxiliar de Logística para pernoitar no pátio da unidade.
                </p>
              </div>
            </div>
            {activeTab !== 'pernoites' && (
              <button
                onClick={() => setActiveTab('pernoites')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase px-3.5 py-1.5 rounded-xl transition cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
              >
                <span>Ver Apenas Pernoites</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pernoiteRoutes.map(route => {
              const isUnloaded = route.loadingStatus === 'descarregado' || route.loadingStatus === 'carregado';
              return (
                <div key={route.id} className="bg-slate-900/90 p-3.5 rounded-xl border border-indigo-500/40 hover:border-indigo-400 transition space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white font-mono">{route.routeMap}</span>
                    <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono text-[10px] font-extrabold px-2 py-0.5 rounded">
                      {route.plate}
                    </span>
                  </div>
                  <div className="text-xxs text-slate-300 space-y-0.5 font-sans">
                    <div><strong>Motorista:</strong> {route.driverName || 'Não informado'}</div>
                    <div><strong>Paletes:</strong> {route.loadingPalletsCount || route.pallets || 8} paletes</div>
                    <div className="flex items-center justify-between pt-1">
                      <span><strong>Status:</strong> {isUnloaded ? '🚚 Descarregado' : '⏳ Na Fila'}</span>
                      {!isUnloaded && (
                        <button
                          onClick={() => handleOpenChecklistAndStart(route)}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-lg cursor-pointer transition"
                        >
                          Descarregar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NAVIGATION TABS: PENDENTES, DESCARREGADOS HOJE & PERNOITES */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto flex-wrap gap-y-2">
          {/* Tab 1: Pendentes */}
          <button
            id="tab_pendentes"
            onClick={() => setActiveTab('pendentes')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 ${
              activeTab === 'pendentes'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Pendentes ({pendingRoutes.length})</span>
          </button>

          {/* Tab 2: Descarregados Hoje */}
          <button
            id="tab_descarregados"
            onClick={() => setActiveTab('descarregados')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 ${
              activeTab === 'descarregados'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Descarregados Hoje ({unloadedTodayRoutes.length})</span>
          </button>

          {/* Tab 3: Pernoites */}
          <button
            id="tab_pernoites"
            onClick={() => setActiveTab('pernoites')}
            className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center space-x-2 ${
              activeTab === 'pernoites'
                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30'
                : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/60'
            }`}
          >
            <Moon className="h-4 w-4" />
            <span>Pernoites ({pernoiteRoutes.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar placa, mapa ou motorista..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* KPI Cards for the current view */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xxs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Aguardando / Pendentes</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{pendingRoutes.length}</p>
          <span className="text-[10px] text-slate-400">Na fila de descarregamento</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xxs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Descarregados Hoje</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{unloadedTodayRoutes.length}</p>
          <span className="text-[10px] text-slate-400">Liberados para conferência</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xxs uppercase font-extrabold tracking-wider text-indigo-600 dark:text-indigo-400">🌙 Pernoites</span>
            <Moon className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">{pernoiteRoutes.length}</p>
          <span className="text-[10px] text-slate-400">Dormindo no pátio</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xxs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Paletes Movimentados</span>
            <Layers className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">{totalPalletsToday}</p>
          <span className="text-[10px] text-slate-400">Volume físico hoje</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xxs uppercase font-extrabold tracking-wider text-slate-500 dark:text-slate-400">Meta EFD (&lt; 10:00)</span>
            <Truck className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1 font-mono">100%</p>
          <span className="text-[10px] text-slate-400">Eficiência de descarga</span>
        </div>
      </div>

      {/* Routes Grid / Cards */}
      {displayedRoutes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-sm">
          <Truck className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 uppercase">
            {activeTab === 'pendentes' 
              ? 'Nenhum veículo pendente de descarregamento' 
              : 'Nenhum veículo descarregado na data de hoje'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            {activeTab === 'pendentes'
              ? 'Todos os veículos abertos já foram descarregados. Clique na guia "Descarregados Hoje" para conferir os registros.'
              : 'Assim que você finalizar o descarregamento de um veículo na guia "Pendentes", ele aparecerá automaticamente aqui.'}
          </p>
          {activeTab === 'pendentes' && (
            <button
              onClick={handleOpenCreate}
              className="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer shadow-sm uppercase inline-flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Placa Manualmente</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedRoutes.map((route) => {
            const status = route.loadingStatus || 'aguardando';
            const duration = calculateDurationMinutes(route.loadingStartTime, route.loadingEndTime);
            const cycleInfo = getRouteCycleInfo(
              route.routeDate || (route as any).departureDate || (route as any).date,
              status === 'descarregado' || status === 'carregado'
                ? ((route as any).unloadedDate || todayStr)
                : todayStr,
              route.isPernoite
            );

            return (
              <div
                key={route.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm transition-all relative flex flex-col justify-between ${
                  status === 'em_carregamento' || status === 'em_descarregamento'
                    ? 'border-blue-500/60 ring-2 ring-blue-500/20 bg-blue-50/10'
                    : status === 'carregado' || status === 'descarregado'
                    ? 'border-emerald-500/50 dark:border-emerald-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top Badge & Plate */}
                  <div className="flex items-center justify-between mb-3 gap-1.5 flex-wrap">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="font-mono text-base font-black tracking-wider bg-slate-950 text-amber-400 px-2.5 py-1 rounded-lg shadow-xs border border-slate-800 inline-flex items-center gap-1.5">
                        <span>{route.plate}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenQuickEditPlate(route);
                          }}
                          title="Corrigir Placa do Veículo (Atualiza para todos)"
                          className="text-slate-400 hover:text-amber-300 p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      </span>

                      {/* D0-D4 Cycle Badge */}
                      <span
                        title={cycleInfo.tooltip}
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${cycleInfo.badgeClass}`}
                      >
                        <Clock className="h-3 w-3" />
                        <span>{cycleInfo.label}</span>
                      </span>

                      <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md">
                        {route.loadingPalletsCount || route.pallets || 8} Paletes
                      </span>
                      {route.isPernoite && (
                        <span className="bg-indigo-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                          <Moon className="h-2.5 w-2.5" />
                          <span>Pernoite</span>
                        </span>
                      )}
                      {route.isBlitz && (
                        <span className="bg-red-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs animate-pulse">
                          <span>🚨 Blitz</span>
                        </span>
                      )}
                    </div>

                    {status === 'aguardando' && (
                      <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>Aguardando</span>
                      </span>
                    )}
                    {(status === 'em_carregamento' || status === 'em_descarregamento') && (
                      <span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 animate-pulse shrink-0">
                        <Play className="h-3 w-3 fill-current" />
                        <span>Descarregando</span>
                      </span>
                    )}
                    {(status === 'carregado' || status === 'descarregado') && (
                      <span className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Descarregado</span>
                      </span>
                    )}
                  </div>

                  {/* Route & Driver Info */}
                  <div className="space-y-1.5 mb-4 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium">Mapa de Rota:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-200">{route.routeMap}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span className="font-medium">Motorista:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200 truncate max-w-[180px]" title={route.driverName}>
                        {route.driverName || 'Não informado'}
                      </span>
                    </div>
                    {route.loadingOperatorName && (
                      <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                        <span className="font-medium">Empilhador:</span>
                        <span className="font-bold text-amber-600 dark:text-amber-400">{route.loadingOperatorName}</span>
                      </div>
                    )}
                  </div>

                  {/* Blitz Specific Guidance */}
                  {route.isBlitz && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5 mb-3 text-red-700 dark:text-red-300 text-xxs font-bold">
                      ⚠️ VEÍCULO EM BLITZ: Levar todas as caixas de vasilhame para a Área de Aferição de Refugo!
                    </div>
                  )}

                  {/* Timing details */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 mb-4 space-y-1.5 text-xxs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Início:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {route.loadingStartTime ? `${route.loadingStartTime} hrs` : '---'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Término:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {route.loadingEndTime ? `${route.loadingEndTime} hrs` : '---'}
                      </span>
                    </div>
                    {duration !== null && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-800">
                        <span className="text-slate-500">Tempo Total:</span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                          {duration} min
                        </span>
                      </div>
                    )}
                  </div>

                  {route.loadingNotes && (
                    <div className="text-xxs text-slate-500 dark:text-slate-400 italic mb-4 bg-amber-500/5 p-2 rounded-lg border border-amber-500/20">
                      "{route.loadingNotes}"
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  {status === 'aguardando' && (
                    <button
                      onClick={() => handleOpenChecklistAndStart(route)}
                      className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Iniciar Descarregamento</span>
                    </button>
                  )}

                  {(status === 'em_carregamento' || status === 'em_descarregamento') && (
                    <button
                      onClick={() => handleOpenFinish(route)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Finalizar Descarregamento</span>
                    </button>
                  )}

                  {(status === 'carregado' || status === 'descarregado') && (
                    <button
                      onClick={() => handleOpenEdit(route)}
                      className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 transition cursor-pointer"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>Editar Registro</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenEdit(route)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-xl transition cursor-pointer"
                    title="Detalhes e Edição"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety & Operational Checklist Modal (Before Starting) */}
      {modalMode === 'checklist' && activeChecklistRoute && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="h-5 w-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base uppercase">Checklist de Segurança & Descarregamento</h3>
                  <span className="text-xxs text-slate-400 font-mono">Placa: {activeChecklistRoute.plate} • Mapa: {activeChecklistRoute.routeMap}</span>
                </div>
              </div>
              <button
                onClick={() => { setModalMode(null); setActiveChecklistRoute(null); }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Mandatory Procedure Steps */}
              <div className="space-y-3">
                <span className="text-xs font-black uppercase text-amber-500 tracking-wider block">
                  Etapas Obrigatórias de Segurança (DPO Ambev):
                </span>

                <label className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                  <input
                    type="checkbox"
                    checked={safetySteps.giro360}
                    onChange={(e) => setSafetySteps({ ...safetySteps, giro360: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">1. Giro 360º de Inspeção Visual no Veículo</span>
                    <span className="text-xxs text-slate-500 dark:text-slate-400">Verifiquei se há pedestres, obstáculos, calçamento irregular ou riscos no entorno do caminhão.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                  <input
                    type="checkbox"
                    checked={safetySteps.travaRodas}
                    onChange={(e) => setSafetySteps({ ...safetySteps, travaRodas: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">2. Instalação da Trava-Rodas / Calço de Segurança</span>
                    <span className="text-xxs text-slate-500 dark:text-slate-400">Calço devidamente fixado nas rodas traseiras do veículo antes de aproximar a empilhadeira.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 transition">
                  <input
                    type="checkbox"
                    checked={safetySteps.sobeBaias}
                    onChange={(e) => setSafetySteps({ ...safetySteps, sobeBaias: e.target.checked })}
                    className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">3. Abertura e Elevação Segura das Baias Laterais</span>
                    <span className="text-xxs text-slate-500 dark:text-slate-400">Baias erguidas e travadas com segurança antes da entrada do garfo da empilhadeira.</span>
                  </div>
                </label>

                {activeChecklistRoute.isBlitz && (
                  <label className="flex items-start space-x-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={safetySteps.blitzRefugoSeparada}
                      onChange={(e) => setSafetySteps({ ...safetySteps, blitzRefugoSeparada: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded text-red-500 focus:ring-red-400 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-red-700 dark:text-red-300 block">4. Segregação para Área de Aferição de Refugo</span>
                      <span className="text-xxs text-red-600 dark:text-red-400">Veículo sorteado para Blitz de Refugo: todas as caixas de vasilhame serão levadas à área de conferência 1 a 1.</span>
                    </div>
                  </label>
                )}

                {/* Logistics reminder box */}
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-amber-900 dark:text-amber-200 text-xxs font-medium">
                  <strong>⚠️ Lembrete Operacional:</strong> Ao finalizar a retirada dos paletes, o calço deve ser retirado e o <strong>MOTORISTA</strong> deve ser acionado para manobrar o veículo até o estacionamento.
                </div>
              </div>

              {/* Information form */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Horário de Início</label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Qtd. Paletes</label>
                  <input
                    type="number"
                    value={formPallets}
                    onChange={(e) => setFormPallets(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setModalMode(null); setActiveChecklistRoute(null); }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmStartWithChecklist}
                  disabled={!safetySteps.giro360 || !safetySteps.travaRodas || !safetySteps.sobeBaias}
                  className={`px-5 py-2 font-black text-xs uppercase rounded-xl transition shadow-md flex items-center space-x-1.5 ${
                    safetySteps.giro360 && safetySteps.travaRodas && safetySteps.sobeBaias
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Confirmar e Iniciar Descarregamento</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Start / Finish / Edit / Create */}
      {modalMode && modalMode !== 'checklist' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Truck className="h-5 w-5 text-amber-400" />
                <h3 className="font-bold text-base uppercase">
                  {modalMode === 'start' && 'Iniciar Descarregamento'}
                  {modalMode === 'finish' && 'Finalizar Descarregamento & Liberar'}
                  {modalMode === 'edit' && 'Editar Registro de Descarregamento'}
                  {modalMode === 'create' && 'Adicionar Nova Placa'}
                </h3>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    value={formPlate}
                    onChange={(e) => setFormPlate(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC1D23"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Mapa de Rota
                  </label>
                  <input
                    type="text"
                    value={formRouteMap}
                    onChange={(e) => setFormRouteMap(e.target.value)}
                    placeholder="Ex: 88123"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Motorista
                  </label>
                  <input
                    type="text"
                    value={formDriverName}
                    onChange={(e) => setFormDriverName(e.target.value)}
                    placeholder="Nome do motorista..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Quantidade de Paletes
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={formPallets}
                    onChange={(e) => setFormPallets(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Horário de Início
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                    Horário de Término
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                  Empilhador Responsável
                </label>
                <input
                  type="text"
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Logistics & Driver maneuver confirmation checkbox for finish mode */}
              {modalMode === 'finish' && (
                <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl space-y-2">
                  <label className="flex items-start space-x-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={driverManeuverConfirmed}
                      onChange={(e) => setDriverManeuverConfirmed(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                    />
                    <div className="text-xxs text-amber-900 dark:text-amber-200 font-semibold">
                      <span>✓ Confirmar que o <strong>MOTORISTA</strong> foi acionado para manobrar o veículo até o estacionamento de veículos (e o calço de segurança foi desarmado).</span>
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">
                  Observações de Descarregamento (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ex: Paletes descarregados na Red Zone, vasilhames conferidos..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalMode === 'finish' && !driverManeuverConfirmed}
                  className={`px-5 py-2 font-black text-xs uppercase rounded-xl transition shadow-md cursor-pointer flex items-center space-x-1.5 ${
                    modalMode === 'finish'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  <Check className="h-4 w-4" />
                  <span>{modalMode === 'finish' ? 'Finalizar Descarregamento' : 'Salvar Registro'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Plate Edit Modal for Empilhador */}
      {quickPlateModalRoute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in" id="quick_plate_modal_empilhador">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-amber-500" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase">Corrigir Placa do Veículo</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickPlateModalRoute(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEditPlate} className="space-y-4">
              <div>
                <span className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                  Mapa de Rota Selecionado
                </span>
                <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md block">
                  {quickPlateModalRoute.routeMap || 'MAPA NÃO INFORMADO'}
                </span>
              </div>

              <div>
                <label className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">
                  Placa Corrigida <span className="text-red-500 font-extrabold">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: ABC1D23 ou ABC1234"
                  value={quickPlateInput}
                  onChange={(e) => setQuickPlateInput(e.target.value.toUpperCase())}
                  className="w-full text-base font-mono font-black uppercase tracking-wider bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-amber-400 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Esta alteração será propagada em tempo real para todas as visões (Conferente, Fiscal e Gestor).
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setQuickPlateModalRoute(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Placa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
