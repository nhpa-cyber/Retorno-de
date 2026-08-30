import React, { useState, useRef, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Moon, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  Download, 
  Search, 
  Calendar, 
  UserCheck, 
  TrendingUp, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  X, 
  Info,
  Truck,
  Package,
  Boxes,
  Trash2,
  UploadCloud,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { AuditSession, Driver, ImportedRoute, User } from '../types';
import { 
  UnifiedMonthlyRecord, 
  ProcessedMonthlyData, 
  parseUnifiedMonthlyFile, 
  processUnifiedMonthlyRecords, 
  MONTH_NAMES_PT 
} from '../utils/unifiedMonthlyImportParser';
import { FEBRUARY_2026_UNIFIED_DATA } from '../data/february2026SampleData';

interface UnifiedMonthlyImportTabProps {
  importedRoutes: ImportedRoute[];
  audits: AuditSession[];
  drivers: Driver[];
  currentUser: User;
  onSaveImportedRoutes?: (routes: ImportedRoute[]) => void;
  onSaveAudits: (audits: AuditSession[]) => void;
  onSaveDrivers?: (drivers: Driver[]) => void;
  onSyncFirestore?: (data: { audits?: AuditSession[]; routes?: ImportedRoute[]; drivers?: Driver[] }) => Promise<void>;
}

export const UnifiedMonthlyImportTab: React.FC<UnifiedMonthlyImportTabProps> = ({
  importedRoutes,
  audits,
  drivers,
  currentUser,
  onSaveImportedRoutes,
  onSaveAudits,
  onSaveDrivers,
  onSyncFirestore
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('02'); // '01' to '12'
  
  // Independent monthly state storage: parsed records mapped by `${year}-${month}`
  const [parsedRecordsByMonth, setParsedRecordsByMonth] = useState<Record<string, UnifiedMonthlyRecord[]>>({});
  
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSavingData, setIsSavingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'before10' | 'after10' | 'pernoite' | 'refugo_high'>('all');
  const [expandedMapId, setExpandedMapId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentMonthKey = `${selectedYear}-${selectedMonth}`;
  const currentMonthName = MONTH_NAMES_PT[selectedMonth] || `Mês ${selectedMonth}`;

  // Active parsed preview records strictly for the currently selected month
  const activeParsedRecords = useMemo(() => {
    return parsedRecordsByMonth[currentMonthKey] || [];
  }, [parsedRecordsByMonth, currentMonthKey]);

  // On-platform stored routes and audits strictly for the currently selected month
  const storedRoutesForMonth = useMemo(() => {
    return importedRoutes.filter(r => 
      (r.routeDate && r.routeDate.startsWith(currentMonthKey)) || 
      (r.departureDate && r.departureDate.startsWith(currentMonthKey))
    );
  }, [importedRoutes, currentMonthKey]);

  const storedAuditsForMonth = useMemo(() => {
    return audits.filter(a => 
      (a.arrivalDate && a.arrivalDate.startsWith(currentMonthKey)) ||
      (a.startTime && a.startTime.startsWith(currentMonthKey))
    );
  }, [audits, currentMonthKey]);

  // Calculate monthly stats from existing platform data for all 12 months
  const existingMonthlySummary = useMemo(() => {
    const monthsData: Record<string, { routesCount: number; auditsCount: number; efdRate: number; refugoPcs: number }> = {};
    
    for (let m = 1; m <= 12; m++) {
      const mStr = String(m).padStart(2, '0');
      const key = `${selectedYear}-${mStr}`;
      
      const routesInMonth = importedRoutes.filter(r => 
        (r.routeDate && r.routeDate.startsWith(key)) || 
        (r.departureDate && r.departureDate.startsWith(key))
      );
      const auditsInMonth = audits.filter(a => 
        (a.arrivalDate && a.arrivalDate.startsWith(key)) ||
        (a.startTime && a.startTime.startsWith(key))
      );

      let before10 = 0;
      let evaluated = 0;
      routesInMonth.forEach(r => {
        if (!r.isPernoite) {
          evaluated++;
          if (r.unloadedBefore10 || r.efdHit) before10++;
        }
      });

      let totalRefugo = 0;
      auditsInMonth.forEach(a => {
        if (a.refugos) {
          totalRefugo += a.refugos.reduce((acc, rf) => acc + (rf.qty || 0), 0);
        }
      });

      const efdRate = evaluated > 0 ? (before10 / evaluated) * 100 : (routesInMonth.length > 0 ? 100 : 0);

      monthsData[mStr] = {
        routesCount: routesInMonth.length,
        auditsCount: auditsInMonth.length,
        efdRate,
        refugoPcs: totalRefugo
      };
    }

    return monthsData;
  }, [importedRoutes, audits, selectedYear]);

  // Process currently parsed records strictly for the active month
  const processedData: ProcessedMonthlyData = useMemo(() => {
    return processUnifiedMonthlyRecords(activeParsedRecords, drivers, currentMonthKey);
  }, [activeParsedRecords, drivers, currentMonthKey]);

  // Filtered records for table view
  const filteredRecords = useMemo(() => {
    return activeParsedRecords.filter(rec => {
      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesSearch = 
          rec.mapa.toLowerCase().includes(term) ||
          rec.veiculo.toLowerCase().includes(term) ||
          (rec.nomeMotorista && rec.nomeMotorista.toLowerCase().includes(term)) ||
          (rec.codMotorista && rec.codMotorista.toLowerCase().includes(term)) ||
          rec.colaboradorDescarregamento.toLowerCase().includes(term) ||
          rec.dayCycleStage.toLowerCase().includes(term);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter === 'before10') return rec.unloadedBefore10 && !rec.isPernoite;
      if (statusFilter === 'after10') return !rec.unloadedBefore10 && !rec.isPernoite;
      if (statusFilter === 'pernoite') return rec.isPernoite;
      if (statusFilter === 'refugo_high') {
        const refugoCount = rec.indiceRefugo?.totalRefugo || 0;
        return refugoCount >= 10;
      }

      return true;
    });
  }, [activeParsedRecords, searchTerm, statusFilter]);

  // Handler for file uploads
  const handleFileUpload = async (file: File) => {
    setIsProcessingFile(true);
    try {
      const records = await parseUnifiedMonthlyFile(file, drivers);
      if (records.length === 0) {
        alert('Nenhum registro válido encontrado no arquivo. Verifique o formato e tente novamente.');
        return;
      }

      // Auto-detect month from records if present
      let targetYear = selectedYear;
      let targetMonth = selectedMonth;

      const firstWithDate = records.find(r => r.dataDescarregamento);
      if (firstWithDate && firstWithDate.dataDescarregamento) {
        const parts = firstWithDate.dataDescarregamento.split('-');
        if (parts.length === 3) {
          targetYear = parts[0];
          targetMonth = parts[1];
          setSelectedYear(targetYear);
          setSelectedMonth(targetMonth);
        }
      }

      const targetKey = `${targetYear}-${targetMonth}`;

      // Save parsed records into the specific month map only
      setParsedRecordsByMonth(prev => ({
        ...prev,
        [targetKey]: records
      }));

    } catch (err: any) {
      console.error('Erro ao analisar arquivo unificado:', err);
      alert('Erro ao processar o arquivo: ' + (err?.message || 'Arquivo inválido'));
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handler to load official sample dataset (February 2026 only)
  const handleLoadOfficialFebruaryDataset = async () => {
    setIsProcessingFile(true);
    try {
      setSelectedYear('2026');
      setSelectedMonth('02');
      const records = await parseUnifiedMonthlyFile(FEBRUARY_2026_UNIFIED_DATA, drivers);
      setParsedRecordsByMonth(prev => ({
        ...prev,
        ['2026-02']: records
      }));
    } catch (err: any) {
      alert('Erro ao carregar dados de Fevereiro: ' + (err?.message || 'Falha'));
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Toggle Pernoite on a specific record in the current month
  const handleTogglePernoite = (index: number) => {
    setParsedRecordsByMonth(prev => {
      const currentList = prev[currentMonthKey] || [];
      const next = [...currentList];
      const rec = next[index];
      if (rec) {
        const newPernoite = !rec.isPernoite;
        next[index] = {
          ...rec,
          isPernoite: newPernoite,
          dayCycleStage: newPernoite && rec.dayCycleStage === 'D1' ? 'D2' : rec.dayCycleStage,
          efdHit: newPernoite ? true : rec.unloadedBefore10
        };
      }
      return {
        ...prev,
        [currentMonthKey]: next
      };
    });
  };

  // Save all processed data for the active month to the platform
  const handleConfirmSyncWithPlatform = async () => {
    if (activeParsedRecords.length === 0) return;

    setIsSavingData(true);
    try {
      // 1. Update/Merge ImportedRoutes for the selected month
      // Filter out previous auto-imported routes for this month to ensure pristine data replacement
      const otherMonthsRoutes = importedRoutes.filter(r => 
        !(r.routeDate && r.routeDate.startsWith(currentMonthKey)) &&
        !(r.departureDate && r.departureDate.startsWith(currentMonthKey))
      );

      const mergedRoutes = [...otherMonthsRoutes, ...processedData.routesToSave];

      // 2. Update/Merge Audits for the selected month
      // Keep real physical patio audits (!isEstimated), but replace estimated imports for this month
      const otherMonthsAudits = audits.filter(a => 
        !(a.arrivalDate && a.arrivalDate.startsWith(currentMonthKey)) &&
        !(a.startTime && a.startTime.startsWith(currentMonthKey))
      );

      const existingRealAuditsInMonth = audits.filter(a => 
        ((a.arrivalDate && a.arrivalDate.startsWith(currentMonthKey)) || (a.startTime && a.startTime.startsWith(currentMonthKey))) &&
        !a.isEstimated
      );

      // Merge new audits, skipping if a real physical patio audit already exists for that map
      const finalAuditsToSave = [...otherMonthsAudits, ...existingRealAuditsInMonth];
      for (const newAudit of processedData.auditsToSave) {
        const alreadyHasPhysical = existingRealAuditsInMonth.some(ra => 
          ra.routeMap.toUpperCase().trim() === newAudit.routeMap.toUpperCase().trim()
        );
        if (!alreadyHasPhysical) {
          finalAuditsToSave.push(newAudit);
        }
      }

      // 3. Save new drivers if any
      let updatedDrivers = [...drivers];
      if (processedData.newDriversToSave.length > 0) {
        for (const newDrv of processedData.newDriversToSave) {
          if (!updatedDrivers.some(d => d.id.toUpperCase().trim() === newDrv.id.toUpperCase().trim())) {
            updatedDrivers.push(newDrv);
          }
        }
        if (onSaveDrivers) {
          onSaveDrivers(updatedDrivers);
        }
      }

      // 4. Save state to platform
      if (onSaveImportedRoutes) {
        onSaveImportedRoutes(mergedRoutes);
      }
      onSaveAudits(finalAuditsToSave);

      // 5. Sync to Cloud Firestore if active
      if (onSyncFirestore) {
        await onSyncFirestore({
          routes: mergedRoutes,
          audits: finalAuditsToSave,
          drivers: updatedDrivers
        });
      }

      // Clear the temporary parsed preview for this month since it is now persisted
      setParsedRecordsByMonth(prev => {
        const next = { ...prev };
        delete next[currentMonthKey];
        return next;
      });

      alert(`✅ Mês ${currentMonthName} / ${selectedYear} sincronizado com sucesso!\n\n` +
            `• ${processedData.totalMaps} viagens e rotas atualizadas.\n` +
            `• ${processedData.auditsToSave.length} auditorias de refugo gravadas.\n` +
            `• EFD do mês: ${(processedData.efdPercentage || 0).toFixed(1)}% (José Ronildo).\n` +
            `• ${processedData.newDriversToSave.length} novos motoristas cadastrados.`);
    } catch (err: any) {
      console.error('Erro ao sincronizar dados mensais:', err);
      alert('Falha ao sincronizar dados: ' + (err?.message || 'Erro desconhecido'));
    } finally {
      setIsSavingData(false);
    }
  };

  // Clear all data for the currently selected month from the platform
  const handleClearMonthData = async () => {
    const confirmClear = window.confirm(
      `⚠️ Tem certeza que deseja excluir todos os dados cadastrados de ${currentMonthName} / ${selectedYear}?\n\n` +
      `Isso removerá as rotas e conferências apenas deste mês.`
    );
    if (!confirmClear) return;

    try {
      const updatedRoutes = importedRoutes.filter(r => 
        !(r.routeDate && r.routeDate.startsWith(currentMonthKey)) &&
        !(r.departureDate && r.departureDate.startsWith(currentMonthKey))
      );

      const updatedAudits = audits.filter(a => 
        !(a.arrivalDate && a.arrivalDate.startsWith(currentMonthKey)) &&
        !(a.startTime && a.startTime.startsWith(currentMonthKey))
      );

      if (onSaveImportedRoutes) {
        onSaveImportedRoutes(updatedRoutes);
      }
      onSaveAudits(updatedAudits);

      if (onSyncFirestore) {
        await onSyncFirestore({
          routes: updatedRoutes,
          audits: updatedAudits
        });
      }

      // Also clear any parsed preview
      setParsedRecordsByMonth(prev => {
        const next = { ...prev };
        delete next[currentMonthKey];
        return next;
      });

      alert(`Dados de ${currentMonthName} / ${selectedYear} foram excluídos.`);
    } catch (e: any) {
      alert('Erro ao excluir dados do mês: ' + (e?.message || 'Falha'));
    }
  };

  // Download Sample JSON
  const handleDownloadSampleJson = () => {
    const jsonStr = JSON.stringify(FEBRUARY_2026_UNIFIED_DATA.slice(0, 5), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelo_unificado_efd_refugo_${currentMonthKey}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Check if current month has active preview or synced records
  const hasParsedPreview = activeParsedRecords.length > 0;
  const hasStoredData = storedRoutesForMonth.length > 0 || storedAuditsForMonth.length > 0;

  return (
    <div className="space-y-6 animate-fade-in" id="unified_monthly_import_container">
      {/* Top Banner & Instructions */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-indigo-800/80 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/40 rounded-xl text-indigo-300">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  Importação Mensal Unificada: EFD, Ciclos D1-D4 & Refugo
                </h3>
                <p className="text-xs text-indigo-200/90 leading-relaxed max-w-2xl">
                  Módulo centralizado para importação mês a mês (Janeiro a Dezembro). Cada mês na guia é <strong>totalmente independente</strong> e atualiza automaticamente os relatórios e dashboards unificados.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto justify-end">
            <button
              type="button"
              onClick={handleDownloadSampleJson}
              className="bg-indigo-900/80 hover:bg-indigo-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl border border-indigo-500/40 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4 text-indigo-300" />
              <span>Baixar Modelo JSON</span>
            </button>

            {selectedMonth === '02' && selectedYear === '2026' && (
              <button
                type="button"
                onClick={handleLoadOfficialFebruaryDataset}
                disabled={isProcessingFile || isSavingData}
                className="bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                title="Carregar 48 registros oficiais de Fevereiro/2026"
              >
                <Sparkles className="h-4 w-4 text-slate-950" />
                <span>Carregar Dados Fevereiro/2026</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingFile || isSavingData}
              className="bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{isProcessingFile ? 'Processando...' : `Importar Arquivo de ${currentMonthName}`}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              accept=".json,.xlsx,.xls,.csv,.tsv,.txt"
              className="hidden"
            />
          </div>
        </div>

        {/* Informative Rule Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="bg-slate-800/80 border border-indigo-900/60 rounded-xl p-3 space-y-1">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              Critério EFD (≤ 22:00)
            </span>
            <p className="text-[11px] text-slate-300 leading-snug">
              Veículos descarregados até as 22:00 garantem 100% de eficiência para <strong>José Ronildo</strong>.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-indigo-900/60 rounded-xl p-3 space-y-1">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Moon className="h-3.5 w-3.5 text-indigo-400" />
              Isenção de Pernoites
            </span>
            <p className="text-[11px] text-slate-300 leading-snug">
              Rotas com pernoite confirmado são 100% isentas e não prejudicam a pontuação de EFD.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-indigo-900/60 rounded-xl p-3 space-y-1">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Refugo & Avarias Integrados
            </span>
            <p className="text-[11px] text-slate-300 leading-snug">
              Calcula volumes aferidos, garrafas (1L, 600, 300), garrafeiras, paletes e todos os tipos de avaria.
            </p>
          </div>
        </div>
      </div>

      {/* GUIA DOS MESES (Monthly Tabs Navigation) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3" id="monthly_tabs_navigation">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
              Guia dos Meses para Importação ({selectedYear})
            </h4>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Ano:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* 12 Month Pills Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => {
            const mNum = String(i + 1).padStart(2, '0');
            const mName = MONTH_NAMES_PT[mNum] || `Mês ${mNum}`;
            const isSelected = selectedMonth === mNum;
            const summary = existingMonthlySummary[mNum];
            const hasData = summary && (summary.routesCount > 0 || summary.auditsCount > 0);
            const hasActiveParsed = (parsedRecordsByMonth[`${selectedYear}-${mNum}`] || []).length > 0;

            return (
              <button
                key={mNum}
                type="button"
                onClick={() => {
                  setSelectedMonth(mNum);
                  setSearchTerm('');
                  setExpandedMapId(null);
                }}
                className={`p-3 rounded-xl border text-left transition-all relative cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'bg-slate-50/70 hover:bg-slate-100 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-extrabold uppercase ${isSelected ? 'text-indigo-950 font-sans' : 'text-slate-700'}`}>
                    {mName}
                  </span>
                  {hasActiveParsed ? (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Prévia carregada (pendente de gravação)" />
                  ) : hasData ? (
                    <span className="h-2 w-2 rounded-full bg-emerald-500" title="Dados gravados no banco" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-300" title="Sem dados" />
                  )}
                </div>

                <div className="mt-1.5 space-y-0.5 text-[10px] font-mono text-slate-500">
                  {hasActiveParsed ? (
                    <span className="text-amber-700 font-bold block">Prévia: {parsedRecordsByMonth[`${selectedYear}-${mNum}`].length} viag.</span>
                  ) : hasData ? (
                    <>
                      <div className="flex justify-between text-slate-700 font-bold">
                        <span>Viagens:</span>
                        <span>{summary.routesCount || 0}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>EFD:</span>
                        <span>{(summary.efdRate ?? 0).toFixed(0)}%</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 italic block">Pendente</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* CASE 1: Empty Month (No parsed preview and no stored data) */}
      {!hasParsedPreview && !hasStoredData && (
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
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3.5 ${
            isDragOver 
              ? 'border-indigo-500 bg-indigo-50/50' 
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
          }`}
        >
          <div className="p-4 bg-indigo-100 text-indigo-700 rounded-2xl shadow-xs">
            <FileSpreadsheet className="h-10 w-10" />
          </div>
          <div className="max-w-md space-y-1">
            <p className="text-sm font-bold text-slate-800">
              Arraste e solte o arquivo de <strong>{currentMonthName} / {selectedYear}</strong> aqui ou <span className="text-indigo-600 underline">procure nos arquivos</span>
            </p>
            <p className="text-xs text-slate-500">
              Formatos suportados: <strong>.json, .xlsx, .xls, .csv, .tsv, .txt</strong>
            </p>
            <p className="text-[11px] text-slate-400 font-mono pt-1">
              Contém automaticamente: Mapa, Placa, Horário de Descarregamento, Colaborador, Ciclo D1-D4 e Detalhes de Refugo.
            </p>
          </div>
        </div>
      )}

      {/* CASE 2: Month already Synced on Platform (No active preview, but has stored data) */}
      {!hasParsedPreview && hasStoredData && (() => {
        const summary = existingMonthlySummary[selectedMonth];
        return (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-sans font-black text-slate-900 text-base uppercase">
                    {currentMonthName} / {selectedYear} — Dados Sincronizados na Plataforma
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Este mês já está consolidado no banco de dados e alimentando os dashboards operacionais.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs px-4 py-2 rounded-xl border border-indigo-200 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Substituir com Novo Arquivo</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearMonthData}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs px-4 py-2 rounded-xl border border-rose-200 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Limpar Dados de {currentMonthName}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total de Viagens / Rotas</span>
                <span className="text-2xl font-black font-mono text-slate-900 mt-1 block">{summary?.routesCount || 0}</span>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase block">EFD do Mês (≤ 22:00)</span>
                <span className="text-2xl font-black font-mono text-emerald-700 mt-1 block">{(summary?.efdRate || 0).toFixed(1)}%</span>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block">Conferências / Auditorias</span>
                <span className="text-2xl font-black font-mono text-amber-900 mt-1 block">{summary?.auditsCount || 0}</span>
              </div>

              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase block">Peças Avariadas (Refugo)</span>
                <span className="text-2xl font-black font-mono text-rose-700 mt-1 block">{summary?.refugoPcs || 0} un</span>
              </div>
            </div>

            {/* Stored Routes Table for Current Month */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Listagem de Viagens Cadastradas em {currentMonthName} ({storedRoutesForMonth.length})
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-72">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Data Rota</th>
                      <th className="p-2.5">Mapa</th>
                      <th className="p-2.5">Placa</th>
                      <th className="p-2.5">Condutor</th>
                      <th className="p-2.5 text-center">Ciclo</th>
                      <th className="p-2.5 text-center">Status EFD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {storedRoutesForMonth.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="p-2.5 text-slate-600">{r.routeDate}</td>
                        <td className="p-2.5 font-bold text-slate-900">{r.routeMap}</td>
                        <td className="p-2.5 text-slate-800 font-semibold">{r.plate}</td>
                        <td className="p-2.5 text-slate-600 font-sans">{r.driverId || 'Temporário'}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-bold text-slate-700">
                            {r.dayCycleStage || 'D1'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          {r.isPernoite ? (
                            <span className="text-indigo-700 font-bold">🌙 Pernoite</span>
                          ) : r.unloadedBefore10 ? (
                            <span className="text-emerald-700 font-bold">✓ Conforme</span>
                          ) : (
                            <span className="text-rose-600 font-bold">✕ Atraso</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CASE 3: Active Parsed Preview for the Selected Month */}
      {hasParsedPreview && (
        <div className="space-y-6">
          {/* Action Header for Parsed Month */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-sans font-black text-slate-900 text-base uppercase">
                    Análise do Mês: {currentMonthName} / {selectedYear} ({processedData.totalMaps} Viagens Processadas)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Revise os indicadores de EFD, ciclos D1–D4 e avarias de refugo antes de confirmar a sincronização.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedRecordsByMonth(prev => {
                      const next = { ...prev };
                      delete next[currentMonthKey];
                      return next;
                    });
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar Prévia
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSyncWithPlatform}
                  disabled={isSavingData}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 flex items-center space-x-2 transition cursor-pointer"
                >
                  {isSavingData ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-slate-950" />
                  )}
                  <span>CONFIRMAR E SINCRONIZAR {currentMonthName.toUpperCase()}</span>
                </button>
              </div>
            </div>

            {/* Top Indicator Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* EFD Rate */}
              <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-indigo-300 block uppercase">EFD do Mês (≤ 22:00)</span>
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xl font-mono font-black text-emerald-400">
                    {(processedData.efdPercentage || 0).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({processedData.efdBefore10Count || 0}/{(processedData.efdBefore10Count || 0) + (processedData.efdAfter10Count || 0)})
                  </span>
                </div>
              </div>

              {/* José Ronildo Efficiency */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-emerald-900 block uppercase">José Ronildo (EFD)</span>
                <span className="text-xl font-mono font-black text-emerald-700 block">
                  {(processedData.efdPercentage || 0) >= 100 ? '100% (Meta)' : `${(processedData.efdPercentage || 0).toFixed(1)}%`}
                </span>
              </div>

              {/* Refugo Rate */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-amber-900 block uppercase">Refugo Médio</span>
                <span className="text-xl font-mono font-black text-amber-800 block">
                  {(processedData.averageRefugoPct || 0).toFixed(3)}%
                </span>
              </div>

              {/* Total Refugo Pieces */}
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-rose-900 block uppercase">Peças Avariadas</span>
                <span className="text-xl font-mono font-black text-rose-700 block">
                  {processedData.totalRefugoPcs} un
                </span>
              </div>

              {/* Total Volume Aferido */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-blue-900 block uppercase">Volume Aferido</span>
                <span className="text-xl font-mono font-black text-blue-800 block">
                  {Math.round(processedData.totalVolumeAferido).toLocaleString('pt-BR')}
                </span>
              </div>

              {/* Pernoites Isentos */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold text-indigo-900 block uppercase">Pernoites Isentos</span>
                <span className="text-xl font-mono font-black text-indigo-800 block">
                  {processedData.pernoiteCount} rotas
                </span>
              </div>
            </div>

            {/* Ciclos D1-D4 Histogram Breakdown */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <Layers className="h-4 w-4 text-indigo-600" />
                Distribuição dos Ciclos de Viagem (D1 a D4)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-800 block">D1 (1º Dia)</span>
                    <span className="text-[10px] text-slate-500">Mesmo dia</span>
                  </div>
                  <span className="text-base font-black text-emerald-700">{processedData.d1Count} ({((processedData.d1Count / (processedData.totalMaps || 1)) * 100).toFixed(0)}%)</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-blue-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-blue-800 block">D2 (2º Dia)</span>
                    <span className="text-[10px] text-slate-500">Retorno D2</span>
                  </div>
                  <span className="text-base font-black text-blue-700">{processedData.d2Count} ({((processedData.d2Count / (processedData.totalMaps || 1)) * 100).toFixed(0)}%)</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-amber-800 block">D3 (3º Dia)</span>
                    <span className="text-[10px] text-slate-500">Retorno D3</span>
                  </div>
                  <span className="text-base font-black text-amber-700">{processedData.d3Count} ({((processedData.d3Count / (processedData.totalMaps || 1)) * 100).toFixed(0)}%)</span>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-rose-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-rose-800 block">D4+ (4º Dia+)</span>
                    <span className="text-[10px] text-slate-500">Tardio</span>
                  </div>
                  <span className="text-base font-black text-rose-700">{processedData.d4Count} ({((processedData.d4Count / (processedData.totalMaps || 1)) * 100).toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Search, Status Filter & Table of Monthly Records */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div className="relative flex-1 w-full md:max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por Mapa, Placa, Condutor, Colaborador..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Quick Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({activeParsedRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('before10')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    statusFilter === 'before10' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  ≤ 22:00 ({processedData.efdBefore10Count})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('after10')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    statusFilter === 'after10' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  &gt; 22:00 ({processedData.efdAfter10Count})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('pernoite')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    statusFilter === 'pernoite' ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  🌙 Pernoites ({processedData.pernoiteCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('refugo_high')}
                  className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                    statusFilter === 'refugo_high' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  ⚠️ Refugo Alto
                </button>
              </div>
            </div>

            {/* Table of Records */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[550px]">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[9px] sticky top-0 border-b border-slate-200 z-10">
                  <tr>
                    <th className="p-2.5">Data / Viagem</th>
                    <th className="p-2.5">Mapa</th>
                    <th className="p-2.5">Placa</th>
                    <th className="p-2.5">Condutor / Motorista</th>
                    <th className="p-2.5">Colaborador</th>
                    <th className="p-2.5 text-center">Horários (Saída ➔ Descarga)</th>
                    <th className="p-2.5 text-center">Ciclo</th>
                    <th className="p-2.5 text-center">Status EFD (≤ 22:00)</th>
                    <th className="p-2.5 text-right">Vol. Aferido</th>
                    <th className="p-2.5 text-right">Refugo</th>
                    <th className="p-2.5 text-center">Pernoite</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {filteredRecords.map((rec, idx) => {
                    const isExpanded = expandedMapId === rec.mapa;
                    const refugoObj = rec.indiceRefugo;
                    const originalIndex = activeParsedRecords.findIndex(r => r.id === rec.id);

                    return (
                      <React.Fragment key={rec.id}>
                        <tr className={`hover:bg-slate-50 transition ${isExpanded ? 'bg-indigo-50/40' : ''}`}>
                          <td className="p-2.5 text-slate-700">
                            <span className="font-bold text-slate-900 block">{rec.dataDescarregamento}</span>
                            {rec.dataSaida && rec.dataSaida !== rec.dataDescarregamento && (
                              <span className="text-[10px] text-amber-600 block">Saída: {rec.dataSaida}</span>
                            )}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900">{rec.mapa}</td>
                          <td className="p-2.5 font-extrabold text-slate-800">{rec.veiculo}</td>
                          <td className="p-2.5 text-slate-700">
                            <span className="font-bold text-slate-900 block">{rec.codMotorista || 'N/A'}</span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[150px]">{rec.nomeMotorista || 'Não cadastrado'}</span>
                          </td>
                          <td className="p-2.5 text-slate-600 font-sans">{rec.colaboradorDescarregamento}</td>
                          <td className="p-2.5 text-center font-mono">
                            <div className="flex flex-col items-center justify-center text-[10px]">
                              {rec.horarioSaida && (
                                <span className="text-slate-500 text-[9px]">
                                  Saída: <strong>{rec.horarioSaida.slice(0, 5)}</strong>
                                </span>
                              )}
                              <span className={`font-bold ${rec.unloadedBefore10 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                Descarga: {rec.horarioDescarregamento}
                              </span>
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                rec.dayCycleStage === 'D1' ? 'bg-emerald-100 text-emerald-800' :
                                rec.dayCycleStage === 'D2' ? 'bg-blue-100 text-blue-800' :
                                rec.dayCycleStage === 'D3' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {rec.dayCycleStage}
                              </span>
                              {rec.tipoRetorno && (
                                <span className="text-[8px] text-slate-400 font-mono mt-0.5">{rec.tipoRetorno}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center">
                            {rec.isPernoite ? (
                              <span className="bg-indigo-100 text-indigo-800 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                🌙 Isento (Pernoite)
                              </span>
                            ) : rec.unloadedBefore10 ? (
                              <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                ✓ Até 22:00
                              </span>
                            ) : (
                              <span className="bg-rose-100 text-rose-800 font-bold text-[9px] px-2 py-0.5 rounded-full">
                                ✕ Após 22:00
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-medium text-slate-700">
                            {Math.round(refugoObj?.totalAferidoMedia || 0).toLocaleString('pt-BR')}
                          </td>
                          <td className="p-2.5 text-right font-bold">
                            <span className={((refugoObj?.totalRefugo || 0) > 10) ? 'text-rose-600' : 'text-slate-900'}>
                              {refugoObj?.totalRefugo || 0} ({refugoObj?.pctRefugo || '0%'})
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleTogglePernoite(originalIndex)}
                              className={`px-2 py-0.5 rounded text-[9px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer ${
                                rec.isPernoite
                                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                              }`}
                            >
                              <Moon className="h-2.5 w-2.5" />
                              <span>{rec.isPernoite ? 'Pernoitou' : 'Marcar'}</span>
                            </button>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedMapId(isExpanded ? null : rec.mapa)}
                              className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition cursor-pointer"
                              title="Ver detalhes de avarias por ativo"
                            >
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Detail Panel */}
                        {isExpanded && refugoObj?.detalhes && (
                          <tr className="bg-slate-900 text-white">
                            <td colSpan={12} className="p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-800">
                                <span className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                                  Detalhamento de Ativos e Defeitos - Mapa {rec.mapa} ({rec.veiculo})
                                </span>
                                <div className="flex flex-wrap items-center gap-2 text-xxs font-mono text-slate-400">
                                  {rec.dataSaida && (
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-300">
                                      Saída: {rec.dataSaida} {rec.horarioSaida || ''}
                                    </span>
                                  )}
                                  {rec.dataChegada && (
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-300">
                                      Chegada: {rec.dataChegada} {rec.horarioChegada || rec.horarioDescarregamento}
                                    </span>
                                  )}
                                  {rec.tipoRetorno && (
                                    <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-300">
                                      Retorno: {rec.tipoRetorno} ({rec.diasFora ?? 0} dias fora)
                                    </span>
                                  )}
                                  <span>Total de Ativos: {refugoObj.detalhes.length}</span>
                                </div>
                              </div>

                              <div className="overflow-x-auto border border-slate-800 rounded-lg">
                                <table className="w-full text-left text-[10px] font-mono">
                                  <thead className="bg-slate-800 text-slate-300 font-bold uppercase text-[8px]">
                                    <tr>
                                      <th className="p-1.5">Ativo</th>
                                      <th className="p-1.5">Asset ID</th>
                                      <th className="p-1.5 text-right">Aferido</th>
                                      <th className="p-1.5 text-right">Quebrada</th>
                                      <th className="p-1.5 text-right">Segunda</th>
                                      <th className="p-1.5 text-right">Bicada Ext.</th>
                                      <th className="p-1.5 text-right">Bicada Int.</th>
                                      <th className="p-1.5 text-right">Cor</th>
                                      <th className="p-1.5 text-right">Faltante</th>
                                      <th className="p-1.5 text-right">Rótulo</th>
                                      <th className="p-1.5 text-right">Sujidade</th>
                                      <th className="p-1.5 text-right">Tampada</th>
                                      <th className="p-1.5 text-right">Trincada</th>
                                      <th className="p-1.5 text-right font-bold text-amber-400">Total Refugo</th>
                                      <th className="p-1.5 text-right font-bold text-amber-400">% Refugo</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800">
                                    {refugoObj.detalhes.map((det, dIdx) => (
                                      <tr key={dIdx} className="hover:bg-slate-800/60">
                                        <td className="p-1.5 font-bold text-white">{det.ativo}</td>
                                        <td className="p-1.5 text-slate-400">{det.assetId}</td>
                                        <td className="p-1.5 text-right">{Math.round(det.totalAferidoMedia)}</td>
                                        <td className="p-1.5 text-right text-rose-400">{det.quebrada || '-'}</td>
                                        <td className="p-1.5 text-right">{det.segunda || '-'}</td>
                                        <td className="p-1.5 text-right">{det.bicadaExterna || '-'}</td>
                                        <td className="p-1.5 text-right">{det.bicadaInterna || '-'}</td>
                                        <td className="p-1.5 text-right">{det.corForaPadrao || '-'}</td>
                                        <td className="p-1.5 text-right">{det.faltante || '-'}</td>
                                        <td className="p-1.5 text-right">{det.rotuloPlastico || '-'}</td>
                                        <td className="p-1.5 text-right">{det.sujidadeInterna + det.sujidadeExterna || '-'}</td>
                                        <td className="p-1.5 text-right">{det.tampada || '-'}</td>
                                        <td className="p-1.5 text-right">{det.trincada || '-'}</td>
                                        <td className="p-1.5 text-right font-black text-amber-400">{det.totalRefugo}</td>
                                        <td className="p-1.5 text-right font-bold text-amber-300">{det.pctRefugo}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
