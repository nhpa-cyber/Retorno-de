import React from 'react';
import { Database, CheckCircle2, ShieldCheck, Server, Layers } from 'lucide-react';
import { FIREBASE_PRESETS } from '../firebasePresets';

interface DatabaseSwitcherProps {
  onSwitchComplete?: () => void;
  compact?: boolean;
  currentUser?: {
    name?: string;
    username?: string;
    role?: string;
  } | null;
}

export const DatabaseSwitcher: React.FC<DatabaseSwitcherProps> = ({ compact = false }) => {
  const mainPreset = FIREBASE_PRESETS[0];

  if (compact) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <Database className="w-3.5 h-3.5" />
        <span>Banco Único (Banco 01)</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Banco de Dados Operacional Único
              <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
                ATIVO E CONSOLIDADO
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Todos os módulos (Conferente, Empilhador, Fiscal e Gestor) operam sincronizados em tempo real no mesmo banco de dados.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {mainPreset.config.projectId}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
              {mainPreset.description}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-1 rounded-md border border-emerald-300 dark:border-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Conectado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-xs">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">ID do Banco</span>
            <span className="font-mono font-bold text-slate-700 dark:text-slate-200 truncate block text-[11px]">
              {mainPreset.config.firestoreDatabaseId}
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Modo Operacional</span>
            <span className="font-bold text-slate-700 dark:text-slate-200 block text-[11px]">
              Banco Único (Sem Troca)
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sincronização</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5" />
              100% Consistente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
