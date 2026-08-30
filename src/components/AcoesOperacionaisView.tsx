import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { OperationalAction, AuditSession, Driver, Product, ActiveAsset, Vale } from '../types';
import { DEFAULT_OPERATIONAL_ACTIONS } from '../data/defaultOperationalActions';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  Truck, 
  User as UserIcon, 
  Package, 
  Layers, 
  Trash2, 
  X, 
  Edit3, 
  PlusCircle,
  TrendingUp,
  MessageSquare,
  Zap,
  ShieldCheck,
  Award,
  Flame,
  CheckCheck,
  Check
} from 'lucide-react';
import { resolveRegisteredDriver } from '../utils/efdCalculations';
import { saveDocToFirestore, saveDocsToFirestore, deleteDocFromFirestore, subscribeToCollection } from '../clientFirebase';

interface AcoesOperacionaisViewProps {
  audits: AuditSession[];
  drivers: Driver[];
  products: Product[];
  activeAssets: ActiveAsset[];
  vales: Vale[];
  currentUserName: string;
}

const STORAGE_KEY = 'ambev_operational_actions_v2';
const DEFAULT_CREATOR_NAME = 'Djeandrson';

export const AcoesOperacionaisView: React.FC<AcoesOperacionaisViewProps> = ({
  audits,
  drivers,
  products,
  activeAssets,
  vales,
  currentUserName
}) => {
  // Local state for actions with rich pre-populated historical actions (Feb to Aug 2026)
  const [actions, setActions] = useState<OperationalAction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize creator name to Djeandrson if missing or generic
          const normalized = parsed.map((a: OperationalAction) => ({
            ...a,
            responsibleName: (!a.responsibleName || a.responsibleName === 'Assistente Administrativo') ? DEFAULT_CREATOR_NAME : a.responsibleName
          }));
          // Merge ensuring historical actions from Feb to Aug are always present
          const existingIds = new Set(normalized.map((a: OperationalAction) => a.id));
          const missingDefaults = DEFAULT_OPERATIONAL_ACTIONS.filter(d => !existingIds.has(d.id));
          return [...normalized, ...missingDefaults];
        }
      }
    } catch (e) {
      console.warn('Failed to load actions from localStorage', e);
    }
    return DEFAULT_OPERATIONAL_ACTIONS;
  });

  // Real-time synchronization with Firebase Firestore & external database
  useEffect(() => {
    let isSubscribed = true;
    const unsub = subscribeToCollection('operationalActions', (remoteActions: any) => {
      if (isSubscribed && Array.isArray(remoteActions) && remoteActions.length > 0) {
        setActions(prev => {
          const map = new Map<string, OperationalAction>();
          // Defaults first
          DEFAULT_OPERATIONAL_ACTIONS.forEach(d => map.set(d.id, d));
          // Existing local actions next
          prev.forEach(p => map.set(p.id, {
            ...p,
            responsibleName: (!p.responsibleName || p.responsibleName === 'Assistente Administrativo') ? DEFAULT_CREATOR_NAME : p.responsibleName
          }));
          // Remote server actions
          remoteActions.forEach((r: OperationalAction) => {
            if (r && r.id) {
              map.set(r.id, {
                ...r,
                responsibleName: (!r.responsibleName || r.responsibleName === 'Assistente Administrativo') ? DEFAULT_CREATOR_NAME : r.responsibleName
              });
            }
          });
          const merged = Array.from(map.values());
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });
      }
    });

    return () => {
      isSubscribed = false;
      if (unsub) unsub();
    };
  }, []);

  // Save to localStorage & Firestore when actions change (debounced for maximum click response)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
    } catch (e) {
      console.warn('Failed to save actions to localStorage', e);
    }

    const timer = setTimeout(() => {
      saveDocsToFirestore('operationalActions', actions).catch(() => {});
    }, 400);

    return () => clearTimeout(timer);
  }, [actions]);

  // Modal State for New Action
  const [isNewActionModalOpen, setIsNewActionModalOpen] = useState(false);
  const [newColaboradorName, setNewColaboradorName] = useState('');
  const [newColaboradorRole, setNewColaboradorRole] = useState('Motorista');
  const [newRouteMap, setNewRouteMap] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newProductOrAsset, setNewProductOrAsset] = useState('');
  const [newQuantity, setNewQuantity] = useState<number>(1);
  const [newType, setNewType] = useState<OperationalAction['type']>('eficiencia_descarga');
  const [newStartDate, setNewStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newCompletionDate, setNewCompletionDate] = useState<string>('');
  const [newObservations, setNewObservations] = useState('');
  const [newTitle, setNewTitle] = useState('');

  // Editing Action State
  const [editingAction, setEditingAction] = useState<OperationalAction | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA'>('TODOS');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | OperationalAction['type']>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColaborador, setSelectedColaborador] = useState('');

  // Pagination for high responsiveness
  const [displayLimit, setDisplayLimit] = useState(50);

  // Helper to generate simple-language observation
  const generateSimpleObservation = useCallback((
    type: OperationalAction['type'],
    colaborador: string,
    productOrAsset: string,
    routeMap: string,
    qty: number
  ): string => {
    const colab = colaborador || 'o colaborador';
    const prod = productOrAsset || 'o item';
    const map = routeMap ? `no mapa ${routeMap}` : 'no retorno de rota';

    if (type === 'ans_distribuicao') {
      return `Alinhar com o coordenador Elisson Minervino o ANS para recepção e descarregamento de veículos após as 22h, organizando retaguarda noturna.`;
    }
    if (type === 'eficiencia_descarga') {
      return `Acompanhar e agilizar a descarga com ${colab} ${map}, reduzindo o tempo de espera e mantendo a liberação do veículo em até 45 minutos.`;
    }
    if (type === 'produtividade') {
      return `Acompanhar a produtividade de ${colab} na movimentação de paletes e vasilhame, otimizando o fluxo de empilhadeiras sem tempo ocioso.`;
    }
    if (type === 'qualidade_descarga') {
      return `Orientar ${colab} quanto ao padrão de paletização correta de garrafeiras e triagem imediata de garrafas avariadas durante a descarga.`;
    }
    if (type === 'falta') {
      return `Conversar com ${colab} para apurar a falta de ${qty} un de ${prod} ${map}. Emitir termo de acerto e checar se o item ficou no cliente.`;
    }
    if (type === 'sobra') {
      return `Dar entrada no estoque da sobra de ${qty} un de ${prod} trazida por ${colab} ${map}. Reconciliar com a nota fiscal.`;
    }
    if (type === 'avaria_refugo') {
      return `Orientar ${colab} sobre o correto manuseio de ${prod} para evitar quebras e avarias durante a viagem ${map}.`;
    }
    if (type === 'procedimento') {
      return `Realizar alinhamento com ${colab} sobre o procedimento padrão de devolução e conferência física do mapa ${routeMap || 'do dia'}.`;
    }
    return `Acompanhar ocorrência operacional com ${colab} referente a ${prod} ${map}.`;
  }, []);

  // Auto-generate actions from existing audits & vales
  const handleGenerateAutomaticActions = useCallback(() => {
    const newGenerated: OperationalAction[] = [];
    const existingKeys = new Set(actions.map(a => `${a.routeMap}-${a.productOrAsset}-${a.type}`));

    // 1. Scan audits for P.A. Sobras and Faltas
    audits.forEach(audit => {
      const date = audit.arrivalDate || new Date().toISOString().split('T')[0];
      const routeMap = audit.routeMap || 'S/N';
      const plate = audit.plate || 'SEM_PLACA';
      const resolved = resolveRegisteredDriver(audit.driverId || audit.driverName || '', `${routeMap}_${plate}`, drivers);
      const drvName = resolved.name;

      // P.A. items
      if (audit.items && audit.items.length > 0) {
        audit.items.forEach(item => {
          const phys = Number(item.physicalQty) || 0;
          const fisc = Number(item.systemQty) || 0;
          const diff = phys - fisc;

          if (diff !== 0) {
            const isSobra = diff > 0;
            const diffAbs = Math.abs(diff);
            const type: OperationalAction['type'] = isSobra ? 'sobra' : 'falta';
            const prodName = item.productDescription || `Produto ${item.productCode}`;
            const key = `${routeMap}-${prodName}-${type}`;

            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              const title = isSobra
                ? `Acerto de Sobra: ${prodName} (${diffAbs} un) - Rota ${routeMap}`
                : `Tratamento de Falta: ${prodName} (${diffAbs} un) - Rota ${routeMap}`;

              const obs = generateSimpleObservation(type, drvName, `${prodName} (${diffAbs} un)`, routeMap, diffAbs);

              // Calculate expected completion date (+3 days)
              const d = new Date(date + 'T00:00:00');
              d.setDate(d.getDate() + 3);
              const completionDate = d.toISOString().split('T')[0];

              newGenerated.push({
                id: `auto-${audit.id}-pa-${item.productCode}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                title,
                type,
                colaboradorName: drvName,
                colaboradorRole: 'Motorista',
                routeMap,
                plate,
                productOrAsset: prodName,
                quantity: diffAbs,
                startDate: date,
                completionDate,
                observations: obs,
                status: isSobra && audit.surplusFlowStatus === 'ENVIADO' ? 'CONCLUIDA' : 'PENDENTE',
                responsibleName: DEFAULT_CREATOR_NAME,
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      }

      // Assets items
      if (audit.activeAssets && audit.activeAssets.length > 0) {
        audit.activeAssets.forEach(asset => {
          const phys = Number(asset.physicalQty) || 0;
          const fisc = Number(asset.systemQty) || 0;
          const diff = phys - fisc;

          if (diff !== 0) {
            const isSobra = diff > 0;
            const diffAbs = Math.abs(diff);
            const type: OperationalAction['type'] = isSobra ? 'sobra' : 'falta';
            const assetName = asset.assetName || `Ativo ${asset.assetId}`;
            const key = `${routeMap}-${assetName}-${type}`;

            if (!existingKeys.has(key)) {
              existingKeys.add(key);
              const title = isSobra
                ? `Sobra de Ativo: ${assetName} (${diffAbs} un) - Rota ${routeMap}`
                : `Falta de Ativo: ${assetName} (${diffAbs} un) - Rota ${routeMap}`;

              const obs = generateSimpleObservation(type, drvName, `${assetName} (${diffAbs} un)`, routeMap, diffAbs);

              const d = new Date(date + 'T00:00:00');
              d.setDate(d.getDate() + 2);
              const completionDate = d.toISOString().split('T')[0];

              newGenerated.push({
                id: `auto-${audit.id}-asset-${asset.assetId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                title,
                type,
                colaboradorName: drvName,
                colaboradorRole: 'Motorista',
                routeMap,
                plate,
                productOrAsset: assetName,
                quantity: diffAbs,
                startDate: date,
                completionDate,
                observations: obs,
                status: 'PENDENTE',
                responsibleName: DEFAULT_CREATOR_NAME,
                createdAt: new Date().toISOString()
              });
            }
          }
        });
      }

      // Refugos / Avarias
      if (audit.refugos && audit.refugos.length > 0) {
        audit.refugos.forEach(refugo => {
          const qty = Number(refugo.quantity) || 1;
          const assetName = refugo.assetName || 'Garrafas / Garrafeiras';
          const key = `${routeMap}-${assetName}-avaria`;

          if (!existingKeys.has(key)) {
            existingKeys.add(key);
            const title = `Prevenção de Avaria: ${assetName} (${qty} un) - Rota ${routeMap}`;
            const obs = `Alinhar com o motorista ${drvName} sobre as avarias (${refugo.reason || 'garrafas quebradas'}) no mapa ${routeMap}. Reforçar atenção no descarregamento para reduzir perdas.`;

            const d = new Date(date + 'T00:00:00');
            d.setDate(d.getDate() + 2);
            const completionDate = d.toISOString().split('T')[0];

            newGenerated.push({
              id: `auto-${audit.id}-refugo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              title,
              type: 'avaria_refugo',
              colaboradorName: drvName,
              colaboradorRole: 'Motorista',
              routeMap,
              plate,
              productOrAsset: `${assetName} (${refugo.reason || 'Avaria'})`,
              quantity: qty,
              startDate: date,
              completionDate,
              observations: obs,
              status: 'PENDENTE',
              responsibleName: DEFAULT_CREATOR_NAME,
              createdAt: new Date().toISOString()
            });
          }
        });
      }
    });

    // 2. Scan Vales
    vales.forEach(vale => {
      const key = `${vale.routeMap || 'VALE'}-${vale.descricao}-falta`;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        newGenerated.push({
          id: `auto-vale-${vale.id}-${Date.now()}`,
          title: `Compensação de Vale: ${vale.colaboradorName} (R$ ${(vale.valor || 0).toFixed(2)})`,
          type: 'falta',
          colaboradorName: vale.colaboradorName,
          colaboradorRole: vale.colaboradorRole || 'Motorista',
          routeMap: vale.routeMap || 'S/N',
          productOrAsset: vale.descricao,
          startDate: vale.dataGeracao || new Date().toISOString().split('T')[0],
          completionDate: '',
          observations: `Acompanhar o acerto do vale de desconto com o colaborador ${vale.colaboradorName} referente a: ${vale.descricao}.`,
          status: vale.status === 'ASSINADO' || vale.status === 'COMPENSADO' ? 'CONCLUIDA' : 'PENDENTE',
          responsibleName: DEFAULT_CREATOR_NAME,
          createdAt: new Date().toISOString()
        });
      }
    });

    if (newGenerated.length > 0) {
      setActions(prev => {
        const next = [...newGenerated, ...prev];
        saveDocsToFirestore('operationalActions', next);
        return next;
      });
    }
  }, [actions, audits, vales, drivers, currentUserName, generateSimpleObservation]);

  // Add New Custom Action
  const handleCreateAction = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newColaboradorName.trim()) {
      return;
    }

    const title = newTitle.trim() || `${
      newType === 'ans_distribuicao' ? 'ANS Distribuição' :
      newType === 'eficiencia_descarga' ? 'Eficiência de Descarga' :
      newType === 'produtividade' ? 'Produtividade' :
      newType === 'qualidade_descarga' ? 'Qualidade da Descarga' :
      newType === 'sobra' ? 'Sobra' : 
      newType === 'falta' ? 'Falta' : 
      newType === 'avaria_refugo' ? 'Avaria' : 'Ação'
    }: ${newProductOrAsset || 'Operacional'} - ${newColaboradorName}`;

    const obs = newObservations.trim() || generateSimpleObservation(newType, newColaboradorName, newProductOrAsset, newRouteMap, newQuantity);

    const actionItem: OperationalAction = {
      id: `act-manual-${Date.now()}`,
      title,
      type: newType,
      colaboradorName: newColaboradorName.trim(),
      colaboradorRole: newColaboradorRole,
      routeMap: newRouteMap.trim(),
      plate: newPlate.trim().toUpperCase(),
      productOrAsset: newProductOrAsset.trim(),
      quantity: Number(newQuantity) || 1,
      startDate: newStartDate || new Date().toISOString().split('T')[0],
      completionDate: newCompletionDate || '',
      observations: obs,
      status: 'PENDENTE',
      responsibleName: DEFAULT_CREATOR_NAME,
      createdAt: new Date().toISOString()
    };

    setActions(prev => {
      const next = [actionItem, ...prev];
      saveDocToFirestore('operationalActions', actionItem);
      return next;
    });

    setIsNewActionModalOpen(false);

    // Reset Form
    setNewTitle('');
    setNewColaboradorName('');
    setNewRouteMap('');
    setNewPlate('');
    setNewProductOrAsset('');
    setNewQuantity(1);
    setNewObservations('');
    setNewCompletionDate('');
  }, [newColaboradorName, newTitle, newType, newProductOrAsset, newObservations, generateSimpleObservation, newRouteMap, newQuantity, newColaboradorRole, newPlate, newStartDate, newCompletionDate, currentUserName]);

  // Toggle Action Status (Instant optimistic response)
  const handleToggleStatus = useCallback((id: string, newStatus: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA') => {
    setActions(prev => prev.map(a => {
      if (a.id === id) {
        const updated: OperationalAction = {
          ...a,
          status: newStatus,
          resolvedAt: newStatus === 'CONCLUIDA' ? new Date().toISOString() : a.resolvedAt
        };
        saveDocToFirestore('operationalActions', updated);
        return updated;
      }
      return a;
    }));
  }, []);

  // Delete Action
  const handleDeleteAction = useCallback((id: string) => {
    setActions(prev => {
      const next = prev.filter(a => a.id !== id);
      deleteDocFromFirestore('operationalActions', id);
      return next;
    });
  }, []);

  // Save Edit Action
  const handleSaveEdit = useCallback(() => {
    if (!editingAction) return;
    setActions(prev => prev.map(a => {
      if (a.id === editingAction.id) {
        saveDocToFirestore('operationalActions', editingAction);
        return editingAction;
      }
      return a;
    }));
    setEditingAction(null);
  }, [editingAction]);

  // Filtered Actions with high-speed indexing
  const filteredActions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return actions.filter(action => {
      // Status Filter
      if (statusFilter !== 'TODOS' && action.status !== statusFilter) return false;

      // Type Filter
      if (typeFilter !== 'TODOS' && action.type !== typeFilter) return false;

      // Colaborador Filter
      if (selectedColaborador && action.colaboradorName !== selectedColaborador) return false;

      // Search Query
      if (q) {
        const matchTitle = action.title.toLowerCase().includes(q);
        const matchColab = action.colaboradorName.toLowerCase().includes(q);
        const matchObs = action.observations.toLowerCase().includes(q);
        const matchMap = action.routeMap?.toLowerCase().includes(q);
        const matchProd = action.productOrAsset?.toLowerCase().includes(q);
        const matchPlate = action.plate?.toLowerCase().includes(q);
        return matchTitle || matchColab || matchObs || matchMap || matchProd || matchPlate;
      }

      return true;
    }).sort((a, b) => {
      const order = { PENDENTE: 0, EM_ANDAMENTO: 1, CONCLUIDA: 2, CANCELADA: 3 };
      if (order[a.status] !== order[b.status]) {
        return order[a.status] - order[b.status];
      }
      return b.startDate.localeCompare(a.startDate);
    });
  }, [actions, statusFilter, typeFilter, selectedColaborador, searchQuery]);

  // KPIs
  const totalCount = actions.length;
  const pendentesCount = useMemo(() => actions.filter(a => a.status === 'PENDENTE').length, [actions]);
  const emAndamentoCount = useMemo(() => actions.filter(a => a.status === 'EM_ANDAMENTO').length, [actions]);
  const concluidasCount = useMemo(() => actions.filter(a => a.status === 'CONCLUIDA').length, [actions]);
  const resolutionRate = totalCount > 0 ? (concluidasCount / totalCount) * 100 : 0;

  // Specific counts for focus pillars
  const ansCount = useMemo(() => actions.filter(a => a.type === 'ans_distribuicao').length, [actions]);
  const eficienciaCount = useMemo(() => actions.filter(a => a.type === 'eficiencia_descarga').length, [actions]);
  const produtividadeCount = useMemo(() => actions.filter(a => a.type === 'produtividade').length, [actions]);
  const qualidadeCount = useMemo(() => actions.filter(a => a.type === 'qualidade_descarga').length, [actions]);

  // Unique collaborators for filter
  const uniqueCollaborators = useMemo(() => {
    const set = new Set<string>();
    actions.forEach(a => {
      if (a.colaboradorName) set.add(a.colaboradorName);
    });
    return Array.from(set).sort();
  }, [actions]);

  const visibleActions = useMemo(() => {
    return filteredActions.slice(0, displayLimit);
  }, [filteredActions, displayLimit]);

  return (
    <div className="space-y-6" id="guia_acoes_operacionais">
      {/* HEADER PRINCIPAL */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-amber-400 font-mono text-xxs uppercase tracking-widest font-extrabold px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />
                Gestão de Planos de Ação Operacional
              </span>
              <span className="text-emerald-400 font-mono text-xxs uppercase tracking-wider font-extrabold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-1">
                <MessageSquare className="h-3.5 w-3.5" />
                Escrita Simples & Direta ao Colaborador
              </span>
              <span className="text-cyan-400 font-mono text-xxs uppercase tracking-wider font-extrabold px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex items-center gap-1">
                <Zap className="h-3.5 w-3.5" />
                Sincronizado com Banco de Dados
              </span>
            </div>
            <h2 className="font-sans font-extrabold text-2xl sm:text-3xl tracking-tight text-white">
              Guia de Ações Operacionais
            </h2>
            <p className="text-slate-300 text-xs leading-relaxed">
              Direcionamento claro de ações com foco em <strong className="text-cyan-400">Eficiência de Descarga</strong>, <strong className="text-amber-400">ANS Distribuição (Coord. Elisson Minervino)</strong> pós 22h, <strong className="text-emerald-400">Produtividade</strong> e <strong className="text-indigo-400">Qualidade da Descarga</strong>.
            </p>
          </div>

          {/* BOTÕES PRINCIPAIS DE AÇÃO */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-stretch xl:self-auto">
            <button
              onClick={() => setIsNewActionModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black font-sans flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95 touch-manipulation"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Ação Operacional</span>
            </button>
            <button
              onClick={handleGenerateAutomaticActions}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700 active:scale-95 touch-manipulation"
              title="Gerar ações automáticas a partir de sobras, faltas e vales"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Atualizar Ações</span>
            </button>
          </div>
        </div>

        {/* CARDS DE KPI DE AÇÕES */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
          {/* TOTAL DE AÇÕES */}
          <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80 text-white">
            <span className="text-[10px] font-mono uppercase text-slate-400 block font-bold">Total de Ações</span>
            <div className="text-2xl font-sans font-black text-white my-1">{totalCount}</div>
            <span className="text-xxs text-slate-400 font-mono">Planos Registrados</span>
          </div>

          {/* PENDENTES */}
          <div className="bg-rose-950/40 p-4 rounded-xl border border-rose-500/30 text-rose-300">
            <span className="text-[10px] font-mono uppercase text-rose-400 block font-bold flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Pendentes
            </span>
            <div className="text-2xl font-sans font-black text-rose-300 my-1">{pendentesCount}</div>
            <span className="text-xxs text-rose-200/80 font-mono">Aguardando Início</span>
          </div>

          {/* EM ANDAMENTO */}
          <div className="bg-amber-950/40 p-4 rounded-xl border border-amber-500/30 text-amber-300">
            <span className="text-[10px] font-mono uppercase text-amber-400 block font-bold flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Em Andamento
            </span>
            <div className="text-2xl font-sans font-black text-amber-300 my-1">{emAndamentoCount}</div>
            <span className="text-xxs text-amber-200/80 font-mono">Em Alinhamento</span>
          </div>

          {/* CONCLUÍDAS */}
          <div className="bg-emerald-950/40 p-4 rounded-xl border border-emerald-500/30 text-emerald-300">
            <span className="text-[10px] font-mono uppercase text-emerald-400 block font-bold flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Concluídas
            </span>
            <div className="text-2xl font-sans font-black text-emerald-300 my-1">{concluidasCount}</div>
            <span className="text-xxs text-emerald-200/80 font-mono">Tratadas com Sucesso</span>
          </div>

          {/* TAXA DE RESOLUÇÃO */}
          <div className="bg-indigo-950/40 p-4 rounded-xl border border-indigo-500/30 text-indigo-300 col-span-2 lg:col-span-1">
            <span className="text-[10px] font-mono uppercase text-indigo-400 block font-bold flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Resolução
            </span>
            <div className="text-2xl font-sans font-black text-indigo-300 my-1">{(resolutionRate || 0).toFixed(1)}%</div>
            <span className="text-xxs text-indigo-200/80 font-mono">Eficácia das Ações</span>
          </div>
        </div>

        {/* ATALHOS RÁPIDOS POR PILAR ESTRATÉGICO */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 border-t border-slate-800">
          <button
            onClick={() => setTypeFilter(typeFilter === 'ans_distribuicao' ? 'TODOS' : 'ans_distribuicao')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer touch-manipulation ${
              typeFilter === 'ans_distribuicao' 
                ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-400" /> ANS Pós 22h (Elisson M.)
              </span>
              <span className="font-mono text-xxs bg-amber-500/20 px-1.5 py-0.5 rounded font-black text-amber-300">{ansCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Alinhamento de chegadas tardias</p>
          </button>

          <button
            onClick={() => setTypeFilter(typeFilter === 'eficiencia_descarga' ? 'TODOS' : 'eficiencia_descarga')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer touch-manipulation ${
              typeFilter === 'eficiencia_descarga' 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-cyan-400" /> Eficiência de Descarga
              </span>
              <span className="font-mono text-xxs bg-cyan-500/20 px-1.5 py-0.5 rounded font-black text-cyan-300">{eficienciaCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Meta &lt; 45min por veículo</p>
          </button>

          <button
            onClick={() => setTypeFilter(typeFilter === 'produtividade' ? 'TODOS' : 'produtividade')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer touch-manipulation ${
              typeFilter === 'produtividade' 
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-emerald-400" /> Produtividade
              </span>
              <span className="font-mono text-xxs bg-emerald-500/20 px-1.5 py-0.5 rounded font-black text-emerald-300">{produtividadeCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Paletes/hora e ritmo de equipe</p>
          </button>

          <button
            onClick={() => setTypeFilter(typeFilter === 'qualidade_descarga' ? 'TODOS' : 'qualidade_descarga')}
            className={`p-2.5 rounded-xl border text-left transition cursor-pointer touch-manipulation ${
              typeFilter === 'qualidade_descarga' 
                ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300' 
                : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" /> Qualidade da Descarga
              </span>
              <span className="font-mono text-xxs bg-indigo-500/20 px-1.5 py-0.5 rounded font-black text-indigo-300">{qualidadeCount}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">Paletização e zero quebras</p>
          </button>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-sans font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-500" />
              <span>Filtros Rápidos de Planos de Ação</span>
            </h3>
            <p className="text-xxs text-slate-400 mt-0.5">Filtre por status, colaborador, tipo de ocorrência ou pesquise pelo texto da observação.</p>
          </div>

          {/* TABS DE STATUS */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer touch-manipulation ${
                statusFilter === 'TODOS' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter('PENDENTE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer touch-manipulation ${
                statusFilter === 'PENDENTE' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Pendentes ({pendentesCount})
            </button>
            <button
              onClick={() => setStatusFilter('EM_ANDAMENTO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer touch-manipulation ${
                statusFilter === 'EM_ANDAMENTO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Em Andamento ({emAndamentoCount})
            </button>
            <button
              onClick={() => setStatusFilter('CONCLUIDA')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer touch-manipulation ${
                statusFilter === 'CONCLUIDA' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Concluídas ({concluidasCount})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* BUSCA POR TEXTO / OBSERVAÇÃO */}
          <div className="lg:col-span-5 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador, produto, rota, placa ou observação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* FILTRO POR TIPO */}
          <div className="lg:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="TODOS">Todos os Pilares / Tipos</option>
              <option value="ans_distribuicao">🔥 ANS Distribuição (Elisson M.) pós 22h</option>
              <option value="eficiencia_descarga">⚡ Eficiência de Descarga (&lt;45min)</option>
              <option value="produtividade">🏆 Produtividade do Colaborador</option>
              <option value="qualidade_descarga">🛡️ Qualidade da Descarga (Paletização)</option>
              <option value="falta">📦 Faltas de P.A. ou Ativos</option>
              <option value="sobra">✨ Sobras de P.A. ou Ativos</option>
              <option value="avaria_refugo">⚠️ Avarias e Refugos</option>
              <option value="procedimento">📋 Procedimentos e Diretrizes</option>
            </select>
          </div>

          {/* FILTRO POR COLABORADOR */}
          <div className="lg:col-span-4">
            <select
              value={selectedColaborador}
              onChange={(e) => setSelectedColaborador(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-sans font-bold cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">Todos os Colaboradores ({uniqueCollaborators.length})</option>
              {uniqueCollaborators.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LISTA DE CARDS DE AÇÕES OPERACIONAIS */}
      <div className="space-y-3.5">
        {visibleActions.length > 0 ? (
          visibleActions.map((action) => {
            const isCompleted = action.status === 'CONCLUIDA';
            const isPending = action.status === 'PENDENTE';

            let typeBadge = 'bg-slate-100 text-slate-700 border-slate-200';
            let typeLabel = 'Ação Geral';
            if (action.type === 'ans_distribuicao') {
              typeBadge = 'bg-amber-100 text-amber-900 border-amber-300';
              typeLabel = 'ANS Distribuição (Elisson M.)';
            } else if (action.type === 'eficiencia_descarga') {
              typeBadge = 'bg-cyan-100 text-cyan-900 border-cyan-300';
              typeLabel = 'Eficiência de Descarga';
            } else if (action.type === 'produtividade') {
              typeBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
              typeLabel = 'Produtividade';
            } else if (action.type === 'qualidade_descarga') {
              typeBadge = 'bg-indigo-100 text-indigo-900 border-indigo-300';
              typeLabel = 'Qualidade da Descarga';
            } else if (action.type === 'sobra') {
              typeBadge = 'bg-teal-100 text-teal-800 border-teal-200';
              typeLabel = 'Sobra';
            } else if (action.type === 'falta') {
              typeBadge = 'bg-rose-100 text-rose-800 border-rose-200';
              typeLabel = 'Falta';
            } else if (action.type === 'avaria_refugo') {
              typeBadge = 'bg-orange-100 text-orange-800 border-orange-200';
              typeLabel = 'Avaria / Refugo';
            } else if (action.type === 'procedimento') {
              typeBadge = 'bg-blue-100 text-blue-800 border-blue-200';
              typeLabel = 'Procedimento';
            }

            return (
              <div
                key={action.id}
                className={`bg-white rounded-2xl border transition p-5 space-y-3 shadow-xs hover:shadow-md ${
                  isCompleted 
                    ? 'border-emerald-200 bg-emerald-50/15' 
                    : isPending
                      ? 'border-rose-200 bg-rose-50/10'
                      : 'border-amber-200 bg-amber-50/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[10px] font-mono font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${typeBadge}`}>
                        {typeLabel}
                      </span>
                      <span className="text-[10px] font-sans font-bold bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-amber-600" />
                        <span>Gerado por: <strong>{action.responsibleName || DEFAULT_CREATOR_NAME}</strong></span>
                      </span>
                      {action.routeMap && (
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                          Mapa {action.routeMap}
                        </span>
                      )}
                      {action.plate && (
                        <span className="text-[10px] font-mono font-black bg-slate-50 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {action.plate}
                        </span>
                      )}
                    </div>
                    <h4 className="font-sans font-bold text-slate-900 text-sm">{action.title}</h4>
                  </div>

                  {/* STATUS SELECTOR & QUICK ACTIONS */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <select
                      value={action.status}
                      onChange={(e) => handleToggleStatus(action.id, e.target.value as any)}
                      className={`text-xs font-mono font-black px-3 py-1.5 rounded-xl border cursor-pointer focus:outline-none touch-manipulation ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : isPending
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      <option value="PENDENTE">⏳ Pendente</option>
                      <option value="EM_ANDAMENTO">⚡ Em Andamento</option>
                      <option value="CONCLUIDA">✓ Concluída</option>
                      <option value="CANCELADA">✕ Cancelada</option>
                    </select>

                    <button
                      onClick={() => setEditingAction(action)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer touch-manipulation"
                      title="Editar observações da ação"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteAction(action.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer touch-manipulation"
                      title="Excluir ação"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* OBSERVATION WITH SIMPLE WRITING */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2 font-sans">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-slate-800 leading-relaxed font-medium">
                      <strong>Orientação Direta:</strong> {action.observations}
                    </div>
                  </div>
                </div>

                {/* METADATA BAR (COLABORADOR, DATAS, PRODUTO, GERADO POR) */}
                <div className="flex flex-wrap justify-between items-center text-xxs font-mono text-slate-500 gap-y-2 pt-1 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1 text-slate-700 font-bold font-sans">
                      <UserIcon className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Colaborador: <strong className="text-slate-900 font-bold">{action.colaboradorName}</strong> ({action.colaboradorRole || 'Colaborador'})</span>
                    </span>

                    <span className="flex items-center gap-1 text-amber-900 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200 font-sans font-bold">
                      <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
                      <span>Gerado por: <strong>{action.responsibleName || DEFAULT_CREATOR_NAME}</strong></span>
                    </span>

                    {action.productOrAsset && (
                      <span className="flex items-center gap-1 text-slate-600">
                        <Package className="h-3.5 w-3.5 text-slate-400" />
                        <span>Foco: <strong className="text-slate-800">{action.productOrAsset}</strong></span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Início: <strong className="text-slate-700">{action.startDate ? action.startDate.split('-').reverse().join('/') : 'N/A'}</strong></span>
                    </span>

                    {action.completionDate && (
                      <span className="flex items-center gap-1 text-slate-500">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Conclusão: <strong className="text-slate-700">{action.completionDate.split('-').reverse().join('/')}</strong></span>
                      </span>
                    )}

                    {action.resolvedAt && (
                      <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        Finalizada em: {new Date(action.resolvedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <ClipboardList className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="font-sans font-bold text-slate-800 text-sm">Nenhuma Ação Operacional Encontrada</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Nenhuma ação cadastrada com os filtros atuais.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <button
                onClick={handleGenerateAutomaticActions}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation"
              >
                Gerar Ações Automáticas
              </button>
              <button
                onClick={() => setIsNewActionModalOpen(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation"
              >
                Cadastrar Ação Manual
              </button>
            </div>
          </div>
        )}

        {filteredActions.length > displayLimit && (
          <div className="text-center pt-2">
            <button
              onClick={() => setDisplayLimit(prev => prev + 50)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition cursor-pointer touch-manipulation"
            >
              Carregar mais ({filteredActions.length - displayLimit} restantes)
            </button>
          </div>
        )}
      </div>

      {/* MODAL: NOVA AÇÃO OPERACIONAL */}
      {isNewActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-amber-500" />
                  <span>Cadastrar Nova Ação Operacional</span>
                </h3>
                <p className="text-xxs text-slate-500 mt-0.5">
                  Crie um direcionamento operacional em escrita simples e direta.
                </p>
              </div>
              <button
                onClick={() => setIsNewActionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="space-y-4">
              {/* CREATOR BANNER */}
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl flex items-center justify-between text-xs font-sans">
                <span className="flex items-center gap-2 text-amber-950 font-bold">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Colaborador Gerador da Ação:</span>
                </span>
                <span className="font-mono font-black text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                  Djeandrson
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PILAR ESTRATÉGICO / TIPO */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Tipo / Pilar de Ação *</label>
                  <select
                    value={newType}
                    onChange={(e) => {
                      const t = e.target.value as OperationalAction['type'];
                      setNewType(t);
                      if (t === 'ans_distribuicao' && !newColaboradorName) {
                        setNewColaboradorName('ELISSON MINERVINO');
                        setNewColaboradorRole('COORDENADOR DE DISTRIBUIÇÃO');
                      }
                    }}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-sans font-bold cursor-pointer"
                  >
                    <option value="ans_distribuicao">🔥 ANS Distribuição (Elisson Minervino) - Descarga Pós 22h</option>
                    <option value="eficiencia_descarga">⚡ Eficiência de Descarga (Meta &lt; 45 min)</option>
                    <option value="produtividade">🏆 Produtividade do Colaborador (Paletes/Hora)</option>
                    <option value="qualidade_descarga">🛡️ Qualidade da Descarga (Paletização e Avarias)</option>
                    <option value="falta">📦 Falta em Rota (P.A. ou Ativo)</option>
                    <option value="sobra">✨ Sobra em Rota (P.A. ou Ativo)</option>
                    <option value="avaria_refugo">⚠️ Avaria e Refugo de Vasilhame</option>
                    <option value="procedimento">📋 Procedimento / Orientação Geral</option>
                  </select>
                </div>

                {/* COLABORADOR */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 font-sans">
                    Nome do Colaborador / Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Eduardo Silva ou Elisson Minervino"
                    value={newColaboradorName}
                    onChange={(e) => setNewColaboradorName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-sans"
                  />
                </div>

                {/* FUNÇÃO */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Função / Cargo</label>
                  <select
                    value={newColaboradorRole}
                    onChange={(e) => setNewColaboradorRole(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-sans cursor-pointer"
                  >
                    <option value="Motorista">Motorista (Prestador)</option>
                    <option value="Ajudante">Ajudante de Rota / Pátio</option>
                    <option value="Conferente">Conferente Físico/Fiscal</option>
                    <option value="COORDENADOR DE DISTRIBUIÇÃO">Coordenador de Distribuição</option>
                    <option value="Operador de Empilhadeira">Operador de Empilhadeira</option>
                    <option value="Auxiliar">Auxiliar de Logística</option>
                  </select>
                </div>

                {/* ROTA / MAPA */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Número da Rota / Mapa</label>
                  <input
                    type="text"
                    placeholder="Ex: 01048"
                    value={newRouteMap}
                    onChange={(e) => setNewRouteMap(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* PLACA */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Placa do Veículo</label>
                  <input
                    type="text"
                    placeholder="Ex: KLE-4921"
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* PRODUTO OU FOCO */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Produto, Ativo ou Foco da Ação</label>
                  <input
                    type="text"
                    placeholder="Ex: Operação Noturna pós 22h, Garrafeiras 600ml ou Spaten 350ml"
                    value={newProductOrAsset}
                    onChange={(e) => setNewProductOrAsset(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-sans"
                  />
                </div>

                {/* DATA DE INÍCIO */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Data de Início *</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* DATA DE CONCLUSÃO */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 font-sans">Data Prevista de Conclusão</label>
                  <input
                    type="date"
                    value={newCompletionDate}
                    onChange={(e) => setNewCompletionDate(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono"
                  />
                </div>

                {/* OBSERVAÇÕES EM ESCRITA SIMPLES */}
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-slate-700 font-sans">
                      Orientação Operacional Direta (Escrita Simples)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const sug = generateSimpleObservation(newType, newColaboradorName, newProductOrAsset, newRouteMap, newQuantity);
                        setNewObservations(sug);
                      }}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      ✨ Sugerir Texto Direto
                    </button>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Ex: Alinhar com o coordenador Elisson Minervino a prioridade de descarga de veículos após as 22:00..."
                    value={newObservations}
                    onChange={(e) => setNewObservations(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-sans leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewActionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer touch-manipulation"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition cursor-pointer shadow-md touch-manipulation active:scale-95"
                >
                  Salvar Ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR AÇÃO */}
      {editingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-sans font-bold text-slate-900 text-sm">Editar Observações da Ação</h4>
              <button onClick={() => setEditingAction(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-lg flex items-center justify-between text-xs font-sans">
                <span className="flex items-center gap-1.5 text-amber-950 font-bold">
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                  <span>Gerado por:</span>
                </span>
                <span className="font-mono font-black text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                  {editingAction.responsibleName || DEFAULT_CREATOR_NAME}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Título</label>
                <input
                  type="text"
                  value={editingAction.title}
                  onChange={(e) => setEditingAction({ ...editingAction, title: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Data Prevista de Conclusão</label>
                <input
                  type="date"
                  value={editingAction.completionDate || ''}
                  onChange={(e) => setEditingAction({ ...editingAction, completionDate: e.target.value })}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg mt-1 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Orientação Operacional (Escrita Simples)</label>
                <textarea
                  rows={4}
                  value={editingAction.observations}
                  onChange={(e) => setEditingAction({ ...editingAction, observations: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg mt-1 font-sans leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingAction(null)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer touch-manipulation"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg cursor-pointer touch-manipulation active:scale-95"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcoesOperacionaisView;
