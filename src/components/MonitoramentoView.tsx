import React, { useState, useEffect } from 'react';
import { User, ImportedRoute, ReturnForecast, Driver, Vehicle, AuditSession, RouteObservation, DelayJustification } from '../types';
import { Truck, Clock, Calendar, Check, Save, RefreshCw, AlertCircle, FileSpreadsheet, MapPin, AlertTriangle, BarChart3, Plus, MessageSquare, ArrowUpCircle, ArrowDownCircle, Trash2, History, Filter, CheckCircle2 } from 'lucide-react';

interface MonitoramentoViewProps {
  currentUser: User;
  importedRoutes: ImportedRoute[];
  onSaveImportedRoutes: (routes: ImportedRoute[]) => void;
  returnForecasts: ReturnForecast[];
  onSaveForecasts: (forecasts: ReturnForecast[]) => void;
  drivers: Driver[];
  onSaveDrivers?: (drivers: Driver[]) => void;
  vehicles: Vehicle[];
  audits?: AuditSession[];
  onSaveAudits?: (audits: AuditSession[]) => void;
}

const normalizeMapCode = (mapCode: any): string => {
  if (mapCode === undefined || mapCode === null) return '';
  return String(mapCode).trim().replace(/^0+/, '');
};

export default function MonitoramentoView({
  currentUser,
  importedRoutes = [],
  onSaveImportedRoutes,
  returnForecasts = [],
  onSaveForecasts,
  drivers = [],
  onSaveDrivers,
  vehicles = [],
  audits = [],
  onSaveAudits
}: MonitoramentoViewProps) {
  // Helper to determine if a route is closed based on audits
  const isRouteClosedInAudits = (routeMap: string) => {
    const norm = normalizeMapCode(routeMap).toUpperCase();
    const upper = routeMap.trim().toUpperCase();
    return audits.some(a => {
      if (a.reopeningRequested) return false;
      const aNorm = normalizeMapCode(a.routeMap).toUpperCase();
      const aUpper = a.routeMap.trim().toUpperCase();
      const isMatch = aNorm === norm || aUpper === upper ||
        (a.unifiedMaps && a.unifiedMaps.some(m => normalizeMapCode(m).toUpperCase() === norm || m.trim().toUpperCase() === upper));
      const isFinished = a.status === 'finalizado_ok' || a.status === 'finalizado_divergente' || (a as any).pdfDownloaded === true || (a as any).surplusFlowStatus === 'BAIXADO';
      return isMatch && isFinished;
    });
  };

  // Local state for editing route forecast
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [selectedObsRouteId, setSelectedObsRouteId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [etaStart, setEtaStart] = useState('15:00');
  const [etaEnd, setEtaEnd] = useState('16:00');
  const [obs, setObs] = useState('');
  const [tripStatus, setTripStatus] = useState<'retornam' | 'pernoitam'>('retornam');
  const [status, setStatus] = useState<'em_rota' | 'chegando' | 'no_patio'>('em_rota');
  const [discrepancyObs, setDiscrepancyObs] = useState('');
  const [obsAuthor, setObsAuthor] = useState<'Monitoramento' | 'Financeiro'>('Monitoramento');
  const [obsText, setObsText] = useState('');
  const [obsType, setObsType] = useState<'sobra' | 'falta' | 'todos'>('todos');

  // Stage Filter state for map list: 'all' | 'D0' | 'D1' | 'D2' | 'D3' | 'D4+'
  const [stageFilter, setStageFilter] = useState<'all' | 'D0' | 'D1' | 'D2' | 'D3' | 'D4+'>('all');

  // Dismissed alerts tracking (both state & persistent localStorage)
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('logiroute_dismissed_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [alertActionFeedback, setAlertActionFeedback] = useState<string | null>(null);

  // Justifications local input text map
  const [justificationTexts, setJustificationTexts] = useState<Record<string, string>>({});

  const isRouteAlertDismissed = (r: ImportedRoute) => {
    if (r.alertDismissed) return true;
    const normMap = normalizeMapCode(r.routeMap).toUpperCase();
    return dismissedAlertIds.includes(r.id) || dismissedAlertIds.includes(normMap);
  };

  // Helper to calculate delay stage for a route
  const getRouteDelayStage = (route: ImportedRoute) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const routeDate = route.routeDate || (route.importedAt ? route.importedAt.split('T')[0] : todayStr);

    const todayObj = new Date(todayStr + 'T00:00:00');
    const routeDateObj = new Date(routeDate + 'T00:00:00');

    let daysOld = Math.floor((todayObj.getTime() - routeDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOld < 0) daysOld = 0;

    const forecast = returnForecasts.find(f => f.routeMap.toUpperCase() === route.routeMap.toUpperCase());
    const isPernoite = forecast?.tripStatus === 'pernoitam' || route.delayStageOverride === 'D1';

    let stage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4+';

    if (route.delayStageOverride === 'D0') {
      stage = 'D0';
    } else if (route.delayStageOverride === 'D1') {
      stage = 'D1';
    } else if (daysOld === 0) {
      stage = isPernoite ? 'D1' : 'D0';
    } else if (daysOld === 1) {
      stage = 'D1';
    } else if (daysOld === 2) {
      stage = 'D2';
    } else if (daysOld === 3) {
      stage = 'D3';
    } else {
      stage = 'D4+';
    }

    let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
    let label: string = stage;

    if (stage === 'D0') {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      label = 'D0 (Hoje)';
    } else if (stage === 'D1') {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
      label = isPernoite ? 'D1 (Pernoite)' : 'D1 (1 Dia)';
    } else if (stage === 'D2') {
      badgeClass = 'bg-orange-100 text-orange-800 border-orange-300 font-extrabold';
      label = 'D2 (Atraso 2d)';
    } else if (stage === 'D3') {
      badgeClass = 'bg-red-100 text-red-800 border-red-300 font-extrabold';
      label = 'D3 (Atraso 3d)';
    } else if (stage === 'D4+') {
      badgeClass = 'bg-red-600 text-white border-red-700 font-extrabold';
      label = `D4+ (${daysOld}d)`;
    }

    return { stage, daysOld, label, badgeClass, isPernoite };
  };

  // Toggle Pernoite (D1) vs D0 override manually on route card
  const handleTogglePernoiteD1 = (route: ImportedRoute) => {
    const currentStageInfo = getRouteDelayStage(route);
    const isCurrentlyD1 = currentStageInfo.stage === 'D1' || currentStageInfo.isPernoite;

    const newOverride: 'D0' | 'D1' = isCurrentlyD1 ? 'D0' : 'D1';
    const newTripStatus: 'retornam' | 'pernoitam' = isCurrentlyD1 ? 'retornam' : 'pernoitam';

    // 1. Update ImportedRoute
    const updatedRoutes = importedRoutes.map(r => {
      if (r.id === route.id) {
        return { ...r, delayStageOverride: newOverride };
      }
      return r;
    });
    onSaveImportedRoutes(updatedRoutes);

    // 2. Sync to ReturnForecast
    const existingIndex = returnForecasts.findIndex(f => f.routeMap.toUpperCase() === route.routeMap.toUpperCase());
    let updatedForecasts = [...returnForecasts];
    if (existingIndex > -1) {
      updatedForecasts[existingIndex] = {
        ...updatedForecasts[existingIndex],
        tripStatus: newTripStatus,
        updatedAt: new Date().toISOString()
      };
    } else {
      updatedForecasts.push({
        id: `fc_${Date.now()}`,
        plate: route.plate,
        driverName: 'Motorista Sob Consulta',
        routeMap: route.routeMap,
        eta: '15:00 as 16:00',
        status: 'em_rota',
        tripStatus: newTripStatus,
        updatedAt: new Date().toISOString()
      });
    }
    onSaveForecasts(updatedForecasts);
  };

  // Save delay justification into historical timeline (for D2, D3, D4+)
  const handleSaveJustification = (routeId: string) => {
    const text = justificationTexts[routeId];
    if (!text || !text.trim()) {
      alert("Por favor, digite o motivo do atraso antes de salvar.");
      return;
    }

    const targetRoute = importedRoutes.find(r => r.id === routeId);
    if (!targetRoute) return;

    const stageInfo = getRouteDelayStage(targetRoute);
    const currentStage = (stageInfo.stage === 'D2' || stageInfo.stage === 'D3' || stageInfo.stage === 'D4+') ? stageInfo.stage : 'D2';

    const newJustificationEntry: DelayJustification = {
      id: `just_${Date.now()}`,
      timestamp: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      author: currentUser.name || 'Monitoramento',
      text: text.trim(),
      delayStage: currentStage as 'D2' | 'D3' | 'D4+'
    };

    const updatedRoutes = importedRoutes.map(r => {
      if (r.id === routeId) {
        const history = r.delayJustifications || [];
        return {
          ...r,
          justification: text.trim(),
          delayJustifications: [newJustificationEntry, ...history]
        };
      }
      return r;
    });

    onSaveImportedRoutes(updatedRoutes);
    setJustificationTexts(prev => ({ ...prev, [routeId]: '' }));
    alert(`Justificativa registrada com sucesso para a placa ${targetRoute.plate} (Mapa ${targetRoute.routeMap})!`);
  };

  // Clear/Reset all overdue alerts
  const handleClearAllOverdueAlerts = () => {
    const overdueIds: string[] = [];
    const updatedRoutes = importedRoutes.map(r => {
      const stageInfo = getRouteDelayStage(r);
      if ((stageInfo.stage === 'D2' || stageInfo.stage === 'D3' || stageInfo.stage === 'D4+') && r.status !== 'fechado') {
        overdueIds.push(r.id);
        const normMap = normalizeMapCode(r.routeMap).toUpperCase();
        if (normMap) overdueIds.push(normMap);
        return { ...r, alertDismissed: true };
      }
      return r;
    });

    const newDismissedList = Array.from(new Set([...dismissedAlertIds, ...overdueIds]));
    setDismissedAlertIds(newDismissedList);
    try {
      localStorage.setItem('logiroute_dismissed_alerts', JSON.stringify(newDismissedList));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }

    onSaveImportedRoutes(updatedRoutes);
    setAlertActionFeedback("Alertas de atraso zerados com sucesso!");
    setTimeout(() => setAlertActionFeedback(null), 4000);
  };

  // Dismiss single alert
  const handleDismissSingleAlert = (routeId: string, routeMap: string) => {
    const normMap = normalizeMapCode(routeMap).toUpperCase();
    const updatedRoutes = importedRoutes.map(r => {
      if (r.id === routeId || normalizeMapCode(r.routeMap).toUpperCase() === normMap) {
        return { ...r, alertDismissed: true };
      }
      return r;
    });

    const newDismissedList = Array.from(new Set([...dismissedAlertIds, routeId, normMap]));
    setDismissedAlertIds(newDismissedList);
    try {
      localStorage.setItem('logiroute_dismissed_alerts', JSON.stringify(newDismissedList));
    } catch (e) {
      console.warn("Could not save to localStorage", e);
    }

    onSaveImportedRoutes(updatedRoutes);
    setAlertActionFeedback(`Alerta do Mapa ${routeMap} dispensado!`);
    setTimeout(() => setAlertActionFeedback(null), 4000);
  };

  // Restore dismissed alerts
  const handleRestoreAllAlerts = () => {
    const updatedRoutes = importedRoutes.map(r => ({ ...r, alertDismissed: false }));
    setDismissedAlertIds([]);
    try {
      localStorage.removeItem('logiroute_dismissed_alerts');
    } catch (e) {
      console.warn("Could not remove from localStorage", e);
    }
    onSaveImportedRoutes(updatedRoutes);
    setAlertActionFeedback("Alertas zerados foram restaurados.");
    setTimeout(() => setAlertActionFeedback(null), 4000);
  };

  const getForecastStatusLabel = (f: ReturnForecast) => {
    const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === f.routeMap.toUpperCase());
    
    if (f.tripStatus === 'pernoitam') {
      return {
        label: 'PERNOITE (D1)',
        color: 'bg-red-100 text-red-700 border-red-300 font-extrabold uppercase'
      };
    }

    if (matchingRoute && (matchingRoute.status === 'conferindo' || matchingRoute.status === 'em_analise')) {
      return {
        label: 'CONFERINDO / PÁTIO',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold uppercase'
      };
    }

    try {
      const timePart = f.eta.includes(' as ') ? f.eta.split(' as ')[0] : f.eta;
      const [hoursStr, minutesStr] = timePart.trim().split(':');
      const etaHours = parseInt(hoursStr, 10);
      const etaMinutes = parseInt(minutesStr, 10) || 0;

      if (!isNaN(etaHours)) {
        const etaTime = new Date();
        etaTime.setHours(etaHours, etaMinutes, 0, 0);

        const currentTime = new Date();
        const diffMs = etaTime.getTime() - currentTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours >= -12 && diffHours <= 2) {
          return {
            label: 'CHEGANDO',
            color: 'bg-amber-100 text-amber-800 border-amber-200 font-bold uppercase animate-pulse'
          };
        }
      }
    } catch (e) {
      console.error(e);
    }

    return {
      label: 'EM ROTA',
      color: 'bg-blue-100 text-blue-800 border-blue-200 font-bold uppercase'
    };
  };

  const handleStartEditing = (route: ImportedRoute) => {
    setSelectedRouteId(route.id);
    setSelectedDriverId(route.driverId || '');
    
    // Find existing forecast if any
    const existing = returnForecasts.find(f => f.routeMap === route.routeMap);
    if (existing && existing.eta) {
      if (existing.eta.includes(' as ')) {
        const parts = existing.eta.split(' as ');
        setEtaStart(parts[0] || '15:00');
        setEtaEnd(parts[1] || '16:00');
      } else {
        setEtaStart(existing.eta || '15:00');
        const [h, m] = (existing.eta || '15:00').split(':');
        const nextHour = (parseInt(h) + 1) % 24;
        const paddedHour = nextHour.toString().padStart(2, '0');
        setEtaEnd(`${paddedHour}:${m || '00'}`);
      }
      setTripStatus(existing.tripStatus || 'retornam');
      setStatus(existing.status || 'em_rota');
    } else {
      setEtaStart('15:00');
      setEtaEnd('16:00');
      setTripStatus('retornam');
      setStatus('em_rota');
    }
    setDiscrepancyObs(route.discrepancyObservation || '');
    setObs('');
  };

  const handleSaveTracking = (route: ImportedRoute) => {
    if (!etaStart || !etaEnd) {
      alert('Por favor, informe a janela de previsão de horário (De / Até).');
      return;
    }

    const finalEta = `${etaStart} as ${etaEnd}`;

    // 1. Create or update ReturnForecast
    const existingIndex = returnForecasts.findIndex(f => f.routeMap.toUpperCase() === route.routeMap.toUpperCase());
    
    const matchedDriver = drivers.find(d => d.id === selectedDriverId);
    const dName = matchedDriver ? matchedDriver.name : 'Motorista Sob Consulta';

    const newForecast: ReturnForecast = {
      id: returnForecasts[existingIndex]?.id || `fc_${Date.now()}`,
      plate: route.plate,
      driverName: dName,
      routeMap: route.routeMap,
      eta: finalEta,
      status: status,
      tripStatus: tripStatus,
      updatedAt: new Date().toISOString()
    };

    let updatedForecasts = [...returnForecasts];
    if (existingIndex > -1) {
      updatedForecasts[existingIndex] = newForecast;
    } else {
      updatedForecasts.push(newForecast);
    }
    onSaveForecasts(updatedForecasts);

    // 2. Sync to ImportedRoute
    if (onSaveImportedRoutes) {
      const updatedRoutes = importedRoutes.map(r => {
        if (r.id === route.id) {
          return {
            ...r,
            driverId: selectedDriverId,
            status: status === 'no_patio' ? ('conferindo' as const) : r.status,
            discrepancyObservation: discrepancyObs.trim() || undefined,
            delayStageOverride: tripStatus === 'pernoitam' ? 'D1' : r.delayStageOverride
          };
        }
        return r;
      });
      onSaveImportedRoutes(updatedRoutes);
    }

    setSelectedRouteId(null);
    alert(`Previsão do mapa ${route.routeMap} salva com sucesso! O Conferente e o Fiscal já conseguem ver as atualizações em tempo real.`);
  };

  const handleAddObservation = (route: ImportedRoute) => {
    if (!obsText.trim()) {
      alert('Por favor, digite uma observação antes de salvar.');
      return;
    }

    const newObs: RouteObservation = {
      id: `obs_${Date.now()}`,
      author: obsAuthor,
      text: obsText.trim(),
      timestamp: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      type: obsType
    };

    const currentObsList = route.routeObservations || [];
    const updatedObsList = [...currentObsList, newObs];

    const updatedRoutes = importedRoutes.map(r => {
      if (r.id === route.id) {
        const combinedString = updatedObsList.map(o => `[${o.author} - ${o.timestamp}]: ${o.text}`).join('\n');
        return {
          ...r,
          routeObservations: updatedObsList,
          discrepancyObservation: combinedString
        };
      }
      return r;
    });
    onSaveImportedRoutes(updatedRoutes);

    // Sync to active AuditSession
    if (audits && onSaveAudits) {
      const updatedAudits = audits.map(audit => {
        if (audit.routeMap.toUpperCase() === route.routeMap.toUpperCase()) {
          let currentNotes = audit.reconciliationNotes || '';
          const newObsStr = `[${newObs.author} - ${newObs.timestamp}]: ${newObs.text}`;
          if (currentNotes) {
            if (!currentNotes.includes(newObsStr)) {
              currentNotes = currentNotes + '\n' + newObsStr;
            }
          } else {
            currentNotes = newObsStr;
          }

          return {
            ...audit,
            routeObservations: updatedObsList,
            reconciliationNotes: currentNotes
          };
        }
        return audit;
      });
      onSaveAudits(updatedAudits);
    }

    setObsText('');
    setObsType('todos');
    alert(`Observação do ${obsAuthor} adicionada com sucesso e sincronizada com o painel da auxiliar!`);
  };

  // Group imported routes by date (most recent first)
  const uniqueDates = Array.from(new Set(importedRoutes.map(r => r.routeDate).filter(Boolean))).sort().reverse();
  const todayStr = new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (uniqueDates.includes(todayStr)) return todayStr;
    if (uniqueDates.length > 0) return uniqueDates[0];
    return todayStr;
  });

  // Auto-sync selectedDate if current selectedDate is no longer in uniqueDates and not 'all'
  useEffect(() => {
    if (selectedDate !== 'all' && !uniqueDates.includes(selectedDate) && uniqueDates.length > 0) {
      setSelectedDate(uniqueDates[0]);
    }
  }, [uniqueDates, selectedDate]);

  // All maps for the selected date (or all dates)
  const routesForSelectedDate = importedRoutes.filter(r => {
    if (selectedDate === 'all') return true;
    return r.routeDate === selectedDate;
  });

  // Filter routes according to the active stage filter tab (all, D0, D1, D2, D3, D4+)
  const routesFilteredByStage = routesForSelectedDate.filter(r => {
    if (stageFilter === 'all') return true;
    const stageInfo = getRouteDelayStage(r);
    return stageInfo.stage === stageFilter;
  });

  // Badge counts for stage filter tabs
  const countD0 = routesForSelectedDate.filter(r => getRouteDelayStage(r).stage === 'D0').length;
  const countD1 = routesForSelectedDate.filter(r => getRouteDelayStage(r).stage === 'D1').length;
  const countD2 = routesForSelectedDate.filter(r => getRouteDelayStage(r).stage === 'D2').length;
  const countD3 = routesForSelectedDate.filter(r => getRouteDelayStage(r).stage === 'D3').length;
  const countD4Plus = routesForSelectedDate.filter(r => getRouteDelayStage(r).stage === 'D4+').length;

  return (
    <div className="w-full px-2 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-8" id="monitoramento_workspace">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="bg-amber-500 text-slate-950 font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded shadow-xs font-mono">
            Módulo de Monitoramento e Rastreabilidade
          </span>
          <h1 className="font-sans font-extrabold text-2xl tracking-tight text-white mt-1 uppercase">
            Painel de Previsão & Controle de Chegadas
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Insira previsões de horário (ETA), observações de viagem, controle o status D0/D1/D2/D3/D4+ e registre o histórico de justificativas de atrasos.
          </p>
        </div>
        
        {/* Date Filter */}
        <div className="flex items-center space-x-2 bg-slate-800 border border-slate-700 rounded-xl p-2">
          <Calendar className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold text-slate-300 font-sans uppercase">Filtrar por Rota:</span>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs bg-transparent border-none text-white focus:outline-none font-semibold font-mono cursor-pointer"
          >
            {uniqueDates.length === 0 ? (
              <option value={todayStr} className="bg-slate-900 text-white">Sem rotas importadas</option>
            ) : (
              <>
                <option value="all" className="bg-slate-900 text-white">
                  Todas as Datas ({importedRoutes.length} mapas)
                </option>
                {uniqueDates.map(d => (
                  <option key={d} value={d} className="bg-slate-900 text-white">
                    {new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')} ({importedRoutes.filter(r => r.routeDate === d).length} mapas)
                  </option>
                ))}
              </>
            )}
          </select>
        </div>
      </div>

      {/* 1. VISUAL CHARTS AND STATUS GRAPHS BLOCK */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8" id="monitoramento_graphics_section">
        
        {/* Closure Status Distribution Chart card */}
        <div className="md:col-span-8 bg-white rounded-xl border border-slate-200 p-6 shadow-3xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <span>Status de Fechamento de Mapas (Visão Gráfica)</span>
            </h3>
            <span className="text-xxs font-mono text-slate-400 font-bold">Consolidado Geral</span>
          </div>

          {(() => {
            const isRouteConcluido = (r: ImportedRoute) => (r.status as string) === 'fechado' || isRouteClosedInAudits(r.routeMap);

            const totalConcluido = importedRoutes.filter(r => isRouteConcluido(r)).length;
            const totalConciliar = audits.filter(a => (a.status === 'conferido_fisico' || a.status === 'recontagem_finalizada') && !a.reopeningRequested && !isRouteClosedInAudits(a.routeMap)).length;
            const totalConferindo = importedRoutes.filter(r => !isRouteConcluido(r) && (r.status === 'conferindo' || r.status === 'reconferir')).length;
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

            const totalCalculated = totalPending + totalDescarregado + totalConferindo + totalConciliar + totalConcluido;
            const pendingPct = totalCalculated > 0 ? (totalPending / totalCalculated) * 100 : 0;
            const descarregadoPct = totalCalculated > 0 ? (totalDescarregado / totalCalculated) * 100 : 0;
            const conferindoPct = totalCalculated > 0 ? (totalConferindo / totalCalculated) * 100 : 0;
            const conciliarPct = totalCalculated > 0 ? (totalConciliar / totalCalculated) * 100 : 0;
            const concluidoPct = totalCalculated > 0 ? (totalConcluido / totalCalculated) * 100 : 0;

            return (
              <div className="space-y-6">
                {/* Visual bar graph representation */}
                <div className="h-8 rounded-xl overflow-hidden flex shadow-3xs border border-slate-100 bg-slate-150">
                  {pendingPct > 0 && (
                    <div 
                      className="bg-red-500 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all font-mono"
                      style={{ width: `${pendingPct}%` }}
                      title={`Pendentes: ${totalPending} (${(pendingPct || 0).toFixed(0)}%)`}
                    >
                      {pendingPct > 8 && `Pendentes (${totalPending})`}
                    </div>
                  )}
                  {descarregadoPct > 0 && (
                    <div 
                      className="bg-emerald-600 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all font-mono shadow-inner"
                      style={{ width: `${descarregadoPct}%` }}
                      title={`Descarregados: ${totalDescarregado} (${(descarregadoPct || 0).toFixed(0)}%)`}
                    >
                      {descarregadoPct > 8 && `Descarregados (${totalDescarregado})`}
                    </div>
                  )}
                  {conferindoPct > 0 && (
                    <div 
                      className="bg-amber-500 h-full flex items-center justify-center text-slate-950 text-[10px] font-bold transition-all font-mono animate-pulse"
                      style={{ width: `${conferindoPct}%` }}
                      title={`Conferindo: ${totalConferindo} (${(conferindoPct || 0).toFixed(0)}%)`}
                    >
                      {conferindoPct > 8 && `Conferindo (${totalConferindo})`}
                    </div>
                  )}
                  {conciliarPct > 0 && (
                    <div 
                      className="bg-indigo-500 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all font-mono"
                      style={{ width: `${conciliarPct}%` }}
                      title={`Conciliar: ${totalConciliar} (${(conciliarPct || 0).toFixed(0)}%)`}
                    >
                      {conciliarPct > 8 && `Conciliar (${totalConciliar})`}
                    </div>
                  )}
                  {concluidoPct > 0 && (
                    <div 
                      className="bg-slate-900 h-full flex items-center justify-center text-white text-[10px] font-bold transition-all font-mono"
                      style={{ width: `${concluidoPct}%` }}
                      title={`Concluído: ${totalConcluido} (${(concluidoPct || 0).toFixed(0)}%)`}
                    >
                      {concluidoPct > 8 && `Concluído (${totalConcluido})`}
                    </div>
                  )}
                  {totalCalculated === 0 && (
                    <div className="bg-slate-100 w-full h-full flex items-center justify-center text-slate-400 text-xs italic">
                      Sem dados de rotas cadastrados
                    </div>
                  )}
                </div>

                {/* Legend Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-center">
                  <div className="p-2.5 bg-red-50/50 rounded-xl border border-red-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">1. Pendentes</span>
                    <span className="text-lg font-bold font-sans text-red-600 block mt-0.5">{totalPending}</span>
                    <span className="text-[8px] text-slate-400 font-medium block">Aguardando descarga</span>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 ring-1 ring-emerald-300/60">
                    <span className="text-[9px] text-emerald-700 font-black uppercase block font-mono">2. Descarregados</span>
                    <span className="text-lg font-black font-sans text-emerald-700 block mt-0.5">{totalDescarregado}</span>
                    <span className="text-[8px] text-emerald-600 font-bold block">Pelo empilhador</span>
                  </div>
                  <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">3. Conferindo</span>
                    <span className="text-lg font-bold font-sans text-amber-600 block mt-0.5">{totalConferindo}</span>
                    <span className="text-[8px] text-slate-400 font-medium block">Conferência física</span>
                  </div>
                  <div className="p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block font-mono">4. Conciliar</span>
                    <span className="text-lg font-bold font-sans text-indigo-600 block mt-0.5">{totalConciliar}</span>
                    <span className="text-[8px] text-slate-400 font-medium block">Aguardando baixa</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block font-mono">5. Concluído</span>
                    <span className="text-lg font-bold font-sans text-slate-900 block mt-0.5">{totalConcluido}</span>
                    <span className="text-[8px] text-slate-500 font-medium block">Finalizados turno</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Delay alert system card (>= 2 DIAS: D2, D3, D4+) */}
        <div className="md:col-span-4 bg-white rounded-xl border border-slate-200 p-6 shadow-3xs flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-3">
              <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
                <span>Alertas de Atraso (&gt;= 2 dias)</span>
              </h3>
              
              {/* Actions: Zerar Alertas and Restaurar */}
              <div className="flex items-center gap-1.5">
                {importedRoutes.some(r => {
                  if (r.status === 'fechado' || isRouteClosedInAudits(r.routeMap) || isRouteAlertDismissed(r)) return false;
                  const stageInfo = getRouteDelayStage(r);
                  return stageInfo.stage === 'D2' || stageInfo.stage === 'D3' || stageInfo.stage === 'D4+';
                }) && (
                  <button
                    type="button"
                    onClick={handleClearAllOverdueAlerts}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-1 rounded-lg flex items-center space-x-1 cursor-pointer transition shadow-2xs active:scale-95"
                    title="Zerar e arquivar todos os alertas de atraso"
                  >
                    <Trash2 className="h-3 w-3 text-red-600" />
                    <span>Zerar Alertas</span>
                  </button>
                )}
                {dismissedAlertIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleRestoreAllAlerts}
                    className="text-slate-500 hover:text-slate-800 text-[9px] font-medium px-1.5 py-0.5 rounded hover:bg-slate-100 transition cursor-pointer"
                    title="Restaurar alertas previamente zerados"
                  >
                    Restaurar
                  </button>
                )}
              </div>
            </div>

            {/* Alert action feedback toast */}
            {alertActionFeedback && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between font-sans">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{alertActionFeedback}</span>
                </span>
              </div>
            )}

            {(() => {
              const overdueRoutesList = importedRoutes.filter(route => {
                if (route.status === 'fechado') return false;
                if (isRouteClosedInAudits(route.routeMap)) return false;
                if (isRouteAlertDismissed(route)) return false;

                const stageInfo = getRouteDelayStage(route);
                return stageInfo.stage === 'D2' || stageInfo.stage === 'D3' || stageInfo.stage === 'D4+';
              });

              if (overdueRoutesList.length === 0) {
                return (
                  <div className="text-center py-8 text-slate-400 space-y-1 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-800">Conformidade Plena (0 Alertas)</p>
                    <p className="text-xxs text-slate-400 leading-relaxed">Nenhum mapa pendente de fechamento com atraso sem justificativa.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {overdueRoutesList.map(route => {
                    const stageInfo = getRouteDelayStage(route);
                    const history = route.delayJustifications || [];

                    return (
                      <div key={route.id} className="bg-red-50/50 p-3 rounded-lg border border-red-200 space-y-2 text-xxs relative group">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900 font-sans block text-xs">Mapa: {route.routeMap}</span>
                            <span className="font-mono text-[9px] text-slate-600 bg-white border border-slate-200 px-1 rounded block mt-0.5 w-max">
                              Placa: {route.plate}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${stageInfo.badgeClass}`}>
                              ESTÁGIO {stageInfo.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDismissSingleAlert(route.id, route.routeMap)}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded hover:bg-red-100/50 transition cursor-pointer"
                              title="Dispensar este alerta"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* HISTÓRICO DE JUSTIFICATIVAS */}
                        {history.length > 0 && (
                          <div className="bg-white p-2 rounded-md border border-slate-200 space-y-1.5">
                            <span className="text-[9px] font-extrabold text-slate-600 uppercase flex items-center space-x-1 border-b border-slate-100 pb-1">
                              <History className="h-3 w-3 text-amber-600" />
                              <span>Histórico de Justificativas ({history.length}):</span>
                            </span>
                            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                              {history.map(j => (
                                <div key={j.id} className="text-[10px] border-b border-slate-50 last:border-none pb-1">
                                  <div className="flex justify-between items-center text-[8px] text-slate-400">
                                    <span className="font-bold text-amber-800 uppercase">{j.delayStage} • {j.author}</span>
                                    <span>{j.timestamp}</span>
                                  </div>
                                  <p className="text-slate-800 italic leading-tight mt-0.5 font-sans">"{j.text}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* INPUT FOR NEW JUSTIFICATION */}
                        <div className="space-y-1 pt-1 border-t border-red-150">
                          <label className="block font-bold text-slate-700 uppercase tracking-wider text-[8px]">
                            {history.length > 0 ? 'Adicionar Nova Justificativa de Atraso:' : 'Motivo do Atraso (Obrigatório >= D2):'}
                          </label>
                          <div className="flex space-x-1">
                            <input
                              type="text"
                              placeholder="Digite o motivo do atraso..."
                              value={justificationTexts[route.id] || ''}
                              onChange={e => setJustificationTexts({ ...justificationTexts, [route.id]: e.target.value })}
                              className="flex-1 text-[10px] p-1.5 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-red-500 font-sans"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveJustification(route.id)}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 rounded flex items-center justify-center transition cursor-pointer shadow-3xs"
                              title="Salvar Justificativa"
                            >
                              <Save className="h-3 w-3" />
                            </button>
                          </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full min-w-0">
        
        {/* LEFT 2 COLUMNS: MAPAS IMPORTADOS LIST & STAGE FILTER TABS */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6 min-w-0">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            
            {/* Header & Title */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-900 text-base uppercase tracking-wider flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-amber-500" />
                <span>Mapas {selectedDate === 'all' ? '(Todas as Datas)' : `do dia ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')}`} ({routesForSelectedDate.length})</span>
              </h3>
            </div>

            {/* STAGE SUB-TABS: ALL, D0, D1, D2, D3, D4+ */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase mr-1 flex items-center space-x-1">
                <Filter className="h-3 w-3 text-slate-400" />
                <span>Estágio:</span>
              </span>
              <button
                type="button"
                onClick={() => setStageFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                  stageFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Todos ({routesForSelectedDate.length})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('D0')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                  stageFilter === 'D0'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                D0 - Hoje ({countD0})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('D1')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                  stageFilter === 'D1'
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                    : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                }`}
              >
                D1 - Pernoite/1d ({countD1})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('D2')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                  stageFilter === 'D2'
                    ? 'bg-orange-600 text-white border-orange-700 shadow-2xs'
                    : 'bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100'
                }`}
              >
                D2 - 2 dias ({countD2})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('D3')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                  stageFilter === 'D3'
                    ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                    : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                }`}
              >
                D3 - 3 dias ({countD3})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter('D4+')}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition cursor-pointer border ${
                  stageFilter === 'D4+'
                    ? 'bg-red-900 text-white border-red-950 shadow-2xs'
                    : 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200'
                }`}
              >
                D4+ ({countD4Plus})
              </button>
            </div>

            {routesFilteredByStage.length === 0 ? (
              <div className="text-center p-12 text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Nenhum mapa localizado no estágio selecionado ({stageFilter}).
              </div>
            ) : (
              <div className="space-y-4">
                {routesFilteredByStage.map(route => {
                  const existingForecast = returnForecasts.find(f => f.routeMap.toUpperCase() === route.routeMap.toUpperCase());
                  const matchedDriver = drivers.find(d => d.id === route.driverId);
                  const isEditing = selectedRouteId === route.id;
                  const isClosed = isRouteClosedInAudits(route.routeMap) || route.status === 'fechado';
                  const stageInfo = getRouteDelayStage(route);
                  const history = route.delayJustifications || [];

                  return (
                    <div
                      key={route.id}
                      className={`p-5 rounded-xl border transition-all ${
                        isEditing 
                          ? 'border-amber-400 bg-amber-50/10 ring-1 ring-amber-400 shadow-sm'
                          : stageInfo.isPernoite || stageInfo.stage === 'D1'
                            ? 'border-amber-300 bg-amber-50/20 text-slate-900 shadow-3xs'
                            : isClosed
                              ? 'border-slate-200 bg-slate-100/60 opacity-90'
                              : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-3xs">
                              {route.plate}
                            </span>
                            <span className="text-slate-900 font-extrabold text-sm font-sans">
                              Mapa: {route.routeMap}
                            </span>
                            
                            {/* STAGE BADGE (D0, D1, D2, D3, D4+) */}
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${stageInfo.badgeClass}`}>
                              {stageInfo.label}
                            </span>

                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isClosed 
                                ? 'bg-slate-200 text-slate-700 border border-slate-300'
                                : route.status === 'conferindo'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                  : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                              {isClosed ? 'Aferido / Fechado' : route.status === 'conferindo' ? 'Em Aferição' : 'Em Rota'}
                            </span>
                          </div>
                          
                          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                            <div className="text-slate-500">
                              <span className="text-slate-400 font-medium">Motorista:</span> {matchedDriver ? matchedDriver.name : (route.driverId === 'temporario' ? 'Temporário' : route.driverId)}
                            </div>
                            <div className="text-slate-500">
                              <span className="text-slate-400 font-medium">Data Rota:</span> {new Date((route.routeDate || route.importedAt.split('T')[0]) + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </div>
                          </div>

                          {/* Forecast Badge if exists */}
                          {existingForecast && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center space-x-1 border border-blue-200">
                                <Clock className="h-3 w-3 text-blue-500" />
                                <span>Previsto Janela: {existingForecast.eta}</span>
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                existingForecast.tripStatus === 'pernoitam'
                                  ? 'bg-red-100 text-red-800 border-red-300 font-extrabold uppercase'
                                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              }`}>
                                {existingForecast.tripStatus === 'pernoitam' ? '🌙 Pernoite' : '🚗 Retorna Hoje'}
                              </span>
                            </div>
                          )}

                          {/* DISPLAY JUSTIFICATION HISTORY ON MAP CARD */}
                          {history.length > 0 && (
                            <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200 space-y-1 max-w-xl">
                              <span className="text-[9px] font-extrabold text-amber-800 uppercase flex items-center space-x-1">
                                <History className="h-3 w-3 text-amber-600" />
                                <span>Histórico de Justificativas de Atraso:</span>
                              </span>
                              {history.map(j => (
                                <div key={j.id} className="text-[10px] text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-150">
                                  <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono">
                                    <span className="font-bold text-amber-800">{j.delayStage} • {j.author}</span>
                                    <span>{j.timestamp}</span>
                                  </div>
                                  <p className="font-sans italic mt-0.5">"{j.text}"</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0 items-stretch sm:items-center justify-end">
                            
                            {/* D0 / D1 TOGGLE BUTTON */}
                            <button
                              type="button"
                              onClick={() => handleTogglePernoiteD1(route)}
                              className={`text-xs font-bold rounded-lg cursor-pointer transition shadow-3xs text-center flex items-center justify-center h-9 px-3 border ${
                                stageInfo.stage === 'D1' || stageInfo.isPernoite
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                  : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                              }`}
                              title="Marcar ou desmarcar pernoite/estágio D1"
                            >
                              {stageInfo.stage === 'D1' || stageInfo.isPernoite ? '↩️ Voltar D0' : '🌙 Marcar D1 (Pernoite)'}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                handleStartEditing(route);
                                setSelectedObsRouteId(null);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg cursor-pointer transition shadow-3xs text-center flex items-center justify-center h-9 px-3"
                            >
                              Atualizar Previsão
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (selectedObsRouteId === route.id) {
                                  setSelectedObsRouteId(null);
                                } else {
                                  setSelectedObsRouteId(route.id);
                                  setSelectedRouteId(null);
                                  setObsText('');
                                }
                              }}
                              className={`font-bold text-xs rounded-lg cursor-pointer transition shadow-3xs flex items-center justify-center space-x-1.5 border h-9 px-3 ${
                                selectedObsRouteId === route.id
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
                              }`}
                            >
                              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                              <span>{selectedObsRouteId === route.id ? 'Fechar' : 'Anotar Obs'}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* EDIT PANEL EXPANSION */}
                      {isEditing && (
                        <div className="mt-4 pt-4 border-t border-amber-200 space-y-4">
                          <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider font-mono">
                            Parâmetros de Rastreamento (Mapa {route.routeMap})
                          </h4>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Previsão Chegada De *</label>
                              <input
                                type="time"
                                value={etaStart}
                                onChange={(e) => setEtaStart(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Janela Até *</label>
                              <input
                                type="time"
                                value={etaEnd}
                                onChange={(e) => setEtaEnd(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Logística de Retorno *</label>
                              <select
                                value={tripStatus}
                                onChange={(e) => setTripStatus(e.target.value as 'retornam' | 'pernoitam')}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500"
                              >
                                <option value="retornam">Retorna Hoje (D0 - Aferição Direta)</option>
                                <option value="pernoitam">Vai Pernoitar (D1 - Fica Aberto)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xxs font-bold text-slate-500 uppercase mb-1">Selecionar Motorista</label>
                              <select
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-amber-500 font-sans text-slate-800"
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

                            <div className="sm:col-span-4 font-sans">
                              <label className="block text-xxs font-bold text-red-600 uppercase mb-1">Divergências de Ativos de Giro ou P.A Mapeados (Guia de Observação)</label>
                              <textarea
                                rows={2}
                                placeholder="Ex: Identificada divergência de 2 paletes PBR ou 5 cx de Spaten. Favor verificar antes do encerramento."
                                value={discrepancyObs}
                                onChange={(e) => setDiscrepancyObs(e.target.value)}
                                className="w-full text-xs p-2.5 bg-white border border-red-250 rounded focus:ring-1 focus:ring-red-500 leading-normal font-sans"
                              />
                              <p className="text-[10px] text-red-500 mt-0.5 font-semibold">Esta observação ficará visível para o Auxiliar de Logística para evitar o fechamento do mapa com divergências.</p>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setSelectedRouteId(null)}
                              className="text-xs text-slate-500 hover:bg-slate-100 py-1.5 px-3 rounded font-medium"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveTracking(route)}
                              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-1.5 px-4 rounded-lg flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                            >
                              <Save className="h-3.5 w-3.5" />
                              <span>Salvar Tracking</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DEDICATED OBSERVATIONS PANEL */}
                      {selectedObsRouteId === route.id && (
                        <div className="mt-4 pt-4 border-t border-indigo-200 space-y-4">
                          <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-150 space-y-3 font-sans">
                            <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                              <div className="flex items-center space-x-2">
                                <MessageSquare className="h-4 w-4 text-indigo-600 animate-pulse" />
                                <h5 className="font-sans font-bold text-xs text-slate-800 uppercase">
                                  Observações e Comodatos - Mapa {route.routeMap}
                                </h5>
                              </div>
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-extrabold px-2 py-0.5 rounded-full uppercase">
                                Multissetorial
                              </span>
                            </div>

                            {/* LIST OF CURRENT SAVED OBSERVATIONS */}
                            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                              {!route.routeObservations || route.routeObservations.length === 0 ? (
                                <p className="text-xxs text-slate-400 italic">
                                  Nenhuma observação cadastrada para este mapa.
                                </p>
                              ) : (
                                route.routeObservations.map((observation) => {
                                  const isFin = observation.author === 'Financeiro';
                                  const type = observation.type || 'todos';
                                  return (
                                    <div key={observation.id} className="bg-white p-2.5 rounded-lg border border-slate-250 shadow-3xs space-y-1">
                                      <div className="flex justify-between items-center text-[10px]">
                                        <div className="flex items-center space-x-1.5">
                                          <span className={`font-extrabold uppercase px-1.5 py-0.5 rounded text-[8px] ${
                                            isFin 
                                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                          }`}>
                                            {observation.author}
                                          </span>
                                          {type === 'sobra' && (
                                            <span className="flex items-center space-x-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 px-1 rounded text-[8px] font-bold">
                                              <ArrowUpCircle className="h-3 w-3 text-emerald-600" />
                                              <span>SOBRA</span>
                                            </span>
                                          )}
                                          {type === 'falta' && (
                                            <span className="flex items-center space-x-0.5 bg-rose-50 text-rose-700 border border-rose-150 px-1 rounded text-[8px] font-bold">
                                              <ArrowDownCircle className="h-3 w-3 text-rose-600" />
                                              <span>FALTA</span>
                                            </span>
                                          )}
                                          {type === 'todos' && (
                                            <span className="flex items-center space-x-0.5 bg-slate-50 text-slate-600 border border-slate-150 px-1 rounded text-[8px] font-bold">
                                              <AlertCircle className="h-3 w-3 text-slate-500" />
                                              <span>TODOS</span>
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-slate-400 font-mono font-medium">{observation.timestamp}</span>
                                      </div>
                                      <p className="text-xxs text-slate-800 font-medium leading-relaxed font-sans whitespace-pre-wrap">
                                        {observation.text}
                                      </p>
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            {/* INPUT FORM FOR NEW OBSERVATION */}
                            <div className="pt-2 border-t border-indigo-150 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">
                                  Nova Observação / Registro de Comodato/Recolha:
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-slate-400">Setor Autor:</span>
                                  <button
                                    type="button"
                                    onClick={() => setObsAuthor('Monitoramento')}
                                    className={`text-[9px] font-extrabold px-2.5 py-1 rounded transition border cursor-pointer ${
                                      obsAuthor === 'Monitoramento'
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-3xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    Monitoramento
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setObsAuthor('Financeiro')}
                                    className={`text-[9px] font-extrabold px-2.5 py-1 rounded transition border cursor-pointer ${
                                      obsAuthor === 'Financeiro'
                                        ? 'bg-purple-600 text-white border-purple-700 shadow-3xs'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    Financeiro (Comodatos & Recolhas)
                                  </button>
                                </div>
                              </div>

                              <div className="flex gap-2 items-end">
                                <textarea
                                  rows={2}
                                  value={obsText}
                                  onChange={(e) => setObsText(e.target.value)}
                                  placeholder={
                                    obsAuthor === 'Financeiro'
                                      ? "Ex: Cliente NB 4593 possui comodatos de 5 caixas Spaten e recolhas pendentes de vasilhames."
                                      : "Ex: Monitoramento reporta que veículo pernoitará devido a atraso na descarga do último cliente."
                                  }
                                  className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 leading-normal font-sans resize-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddObservation(route)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] px-4 py-2.5 rounded-lg shrink-0 flex flex-col justify-center items-center gap-1 shadow-3xs cursor-pointer transition-all h-[52px]"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Salvar Obs</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setSelectedObsRouteId(null)}
                              className="text-xs text-slate-500 hover:bg-slate-100 py-1.5 px-3 rounded font-medium cursor-pointer"
                            >
                              Fechar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: VEÍCULOS EM ABERTO & OVERNIGHT SUMMARY */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6 min-w-0">
          
          {/* Section: Veículos com Mapa em Aberto */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-sans font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-1.5">
                <MapPin className="h-4.5 w-4.5 text-indigo-600" />
                <span>Veículos com Mapa em Aberto</span>
              </h3>
              <p className="text-xxs text-slate-400 mt-0.5">Visão consolidada das cargas aguardando pátio ou pernoitadas.</p>
            </div>

            {(() => {
              const activeForecastsList = returnForecasts.filter(fc => {
                const todayStr = new Date().toISOString().split('T')[0];

                const matchingRoute = importedRoutes.find(r => r.routeMap.toUpperCase() === fc.routeMap.toUpperCase());
                if (matchingRoute && matchingRoute.status === 'fechado') {
                  return false;
                }

                const isAuditClosed = isRouteClosedInAudits(fc.routeMap);
                if (isAuditClosed) {
                  return false;
                }

                if (fc.status === 'no_patio') {
                  return false;
                }

                if (fc.tripStatus === 'pernoitam') {
                  if (fc.updatedAt && fc.updatedAt.split('T')[0] < todayStr) {
                    return false;
                  }
                }

                return true;
              });

              if (activeForecastsList.length === 0) {
                return <p className="text-xxs text-slate-400 italic py-4 text-center">Nenhum veículo em rota ou pernoitado registrado.</p>;
              }

              return (
                <div className="space-y-3">
                  {activeForecastsList.map(fc => {
                    const statusInfo = getForecastStatusLabel(fc);
                    const isPernoite = fc.tripStatus === 'pernoitam';
                    return (
                      <div
                        key={fc.id}
                        className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                          isPernoite
                            ? 'bg-red-50 border-red-300 text-red-950 shadow-3xs'
                            : statusInfo.label.includes('CONFERINDO')
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                              : statusInfo.label === 'CHEGANDO'
                                ? 'bg-amber-50 border-amber-300 text-amber-950'
                                : 'bg-slate-50 border-slate-150 text-slate-800'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-extrabold block">{fc.routeMap}</span>
                          <span className="text-xxs font-mono">Placa: {fc.plate}</span>
                          <span className="text-[10px] block mt-0.5 font-medium">{fc.driverName}</span>
                        </div>

                        <div className="text-right space-y-1">
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded block text-center border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xxs font-bold block font-mono">ETA: {fc.eta}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Help Box */}
          <div className="bg-amber-50/30 rounded-xl border border-amber-200/60 p-5 space-y-2">
            <div className="flex items-center space-x-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <h4 className="text-xs font-bold uppercase font-sans tracking-wide">Instruções de Integração</h4>
            </div>
            <p className="text-xxs text-slate-600 leading-relaxed font-sans">
              As previsões de horário, tripStatus (Pernoite) e status de viagem salvos pelo Monitoramento aparecem imediatamente para o <strong>Conferente</strong> ao dar entrada e para o <strong>Fiscal</strong> na tela de reconciliação fiscal.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
