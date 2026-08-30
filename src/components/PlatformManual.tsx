import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Shield, 
  Truck, 
  Settings, 
  AlertTriangle, 
  Users, 
  ArrowRight,
  ArrowDown,
  Sparkles,
  BarChart3,
  Receipt,
  ClipboardCheck,
  TrendingUp,
  Clock,
  ThumbsUp,
  AlertCircle,
  Eye,
  Printer,
  ShieldCheck,
  FileCheck2,
  Target,
  Layers,
  CheckCircle2,
  HelpCircle,
  Flame,
  ArrowRightCircle,
  FileSpreadsheet,
  Building2
} from 'lucide-react';
import { 
  DEFAULT_MANUAL_HTML, 
  SOP_DESCARREGAMENTO_HTML, 
  SOP_CONFERENCIA_BLITZ_HTML, 
  SOP_DEVOLUCOES_FISCAL_HTML 
} from './DefaultManualContent';

interface PlatformManualProps {
  customManualHTML?: string;
}

export default function PlatformManual({ customManualHTML = '' }: PlatformManualProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'sop1_desc' | 'sop2_conf' | 'sop3_dev' | 'fluxo_visual'>('all');

  const handleDownloadSpecificPDF = (sopType: 'descarregamento' | 'conferencia' | 'devolucoes' | 'consolidado') => {
    let content = '';
    if (sopType === 'descarregamento') {
      content = SOP_DESCARREGAMENTO_HTML;
    } else if (sopType === 'conferencia') {
      content = SOP_CONFERENCIA_BLITZ_HTML;
    } else if (sopType === 'devolucoes') {
      content = SOP_DEVOLUCOES_FISCAL_HTML;
    } else {
      content = customManualHTML || DEFAULT_MANUAL_HTML;
    }

    const printWindow = window.open('', '', 'width=950,height=950');
    if (printWindow) {
      let finalHtml = content;
      if (!content.includes('window.print()')) {
        finalHtml = content.replace('</body>', `
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>`);
      }
      printWindow.document.write(finalHtml);
      printWindow.document.close();
    }
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 text-white" id="platform_manual_container">
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Accordion Toggle Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <button
            id="btn_toggle_manual"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-2.5 text-sm font-bold text-slate-200 hover:text-white transition-colors focus:outline-none cursor-pointer text-left"
          >
            <BookOpen className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <span className="block text-sm sm:text-base font-extrabold tracking-tight">Manual de Diretrizes & 3 Padrões de Operação (SOPs DPO)</span>
              <span className="text-[10px] text-slate-400 font-normal font-mono block">Elaborado: Djeanderson S. • Aprovado: Marcos G. (GOD) • DPO Ambev Pau Brasil</span>
            </div>
            {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
          </button>

          {/* Quick PDF Actions in Header */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              id="btn_export_sop1_top"
              onClick={() => handleDownloadSpecificPDF('descarregamento')}
              className="flex items-center space-x-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold py-2 px-3 rounded-xl transition text-xs cursor-pointer"
              title="Baixar POP-LOG-001 (Descarregamento & Segurança)"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>1. Descarregamento (PDF)</span>
            </button>
            <button
              id="btn_export_sop2_top"
              onClick={() => handleDownloadSpecificPDF('conferencia')}
              className="flex items-center space-x-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-bold py-2 px-3 rounded-xl transition text-xs cursor-pointer"
              title="Baixar POP-LOG-002 (Conferência & Blitz)"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>2. Conferência & Blitz (PDF)</span>
            </button>
            <button
              id="btn_export_sop3_top"
              onClick={() => handleDownloadSpecificPDF('devolucoes')}
              className="flex items-center space-x-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold py-2 px-3 rounded-xl transition text-xs cursor-pointer"
              title="Baixar POP-LOG-003 (Devoluções & Promax)"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>3. Devoluções & Fiscal (PDF)</span>
            </button>
            <button
              id="btn_export_manual_pdf"
              onClick={() => handleDownloadSpecificPDF('consolidado')}
              className="flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 px-4 rounded-xl shadow-md transition-all text-xs cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Manual Consolidado (PDF)</span>
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="mt-6 pt-6 border-t border-slate-800 text-xs text-slate-300 space-y-6 animate-fade-in" id="manual_details">
            
            {/* Standards Selector Tab bar */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800" id="manual_index_nav">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                <span className="text-xxs font-extrabold text-amber-500 uppercase tracking-widest block font-mono">
                  3 PADRÕES OPERACIONAIS SEPARADOS & 1 MANUAL GERAL CONSOLIDADO
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Selecione o padrão para visualizar metas, fluxo visual com setas, RACI e tratativas
                </span>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                <button 
                  onClick={() => setActiveTab('sop1_desc')} 
                  className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    activeTab === 'sop1_desc' 
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-amber-400 font-bold">POP-LOG-001</span>
                    <Truck className="h-4 w-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-black uppercase leading-tight">Descarregamento</span>
                  <span className="text-[9.5px] text-slate-400 mt-1">EPIs, 360º, Calço & Manobra Motorista</span>
                </button>

                <button 
                  onClick={() => setActiveTab('sop2_conf')} 
                  className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    activeTab === 'sop2_conf' 
                      ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-blue-400 font-bold">POP-LOG-002</span>
                    <ClipboardCheck className="h-4 w-4 text-blue-400" />
                  </div>
                  <span className="text-xs font-black uppercase leading-tight">Conferência & Blitz</span>
                  <span className="text-[9.5px] text-slate-400 mt-1">Contagem Cega & Refugo 2 carros/dia</span>
                </button>

                <button 
                  onClick={() => setActiveTab('sop3_dev')} 
                  className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    activeTab === 'sop3_dev' 
                      ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-purple-400 font-bold">POP-LOG-003</span>
                    <FileCheck2 className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-xs font-black uppercase leading-tight">Padrão Devoluções</span>
                  <span className="text-[9.5px] text-slate-400 mt-1">Promax 05.01, Sobras 91%/98% & Vales</span>
                </button>

                <button 
                  onClick={() => setActiveTab('fluxo_visual')} 
                  className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    activeTab === 'fluxo_visual' 
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">DIAGRAMA</span>
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-xs font-black uppercase leading-tight">Fluxo Visual Ponta a Ponta</span>
                  <span className="text-[9.5px] text-slate-400 mt-1">Etapas Sequenciais com Setas</span>
                </button>

                <button 
                  onClick={() => setActiveTab('all')} 
                  className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                    activeTab === 'all' 
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">POP-LOG-004</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  </div>
                  <span className="text-xs font-black uppercase leading-tight">Manual Geral Consolidado</span>
                  <span className="text-[9.5px] text-slate-400 mt-1">União dos 3 Padrões, RACIs & Tratativas</span>
                </button>
              </div>
            </div>

            {/* TAB 1: PADRÃO DE DESCARREGAMENTO (POP-LOG-001) */}
            {activeTab === 'sop1_desc' && (
              <div className="space-y-6 animate-fade-in bg-slate-950 p-6 rounded-2xl border border-amber-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded font-mono">POP-LOG-001</span>
                      <h3 className="text-base font-black text-white uppercase">Padrão de Descarregamento & Segurança no Pátio</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5 font-mono">
                      <span>Elaborador: <strong className="text-slate-300">Djeanderson Soares</strong></span>
                      <span>Aprovador: <strong className="text-slate-300">Marcos Guilherme (GOD)</strong></span>
                      <span className="text-amber-400 font-bold">Data de Revisão: 18/07/2026 (Rev. 03)</span>
                      <span className="text-emerald-400 font-bold">✓ DPO Ambev Vigente</span>
                    </div>
                  </div>

                  <button
                    id="btn_tab1_download_pdf"
                    onClick={() => handleDownloadSpecificPDF('descarregamento')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Padrão de Descarregamento (PDF)</span>
                  </button>
                </div>

                {/* Objetivo do Padrão */}
                <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[11px] font-black uppercase text-amber-400 flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>1. Objetivo do Padrão</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Padronizar a rotina operacional do <strong>Operador de Empilhadeira</strong> e <strong>Motorista</strong> no recebimento e descarregamento de veículos de retorno de rota, assegurando 100% de conformidade com as diretrizes de segurança do trabalho (DPO Ambev), integridade física, conservação dos ativos de giro e fluidez de pátio na Pau Brasil Distribuidora.
                  </p>
                </div>

                {/* Metas Operacionais DPO */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <Target className="h-4 w-4" />
                    <span>2. Metas Operacionais DPO do Descarregamento</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Meta EFD Diária</span>
                      <span className="text-xl font-black text-amber-400 my-1 block">&lt; 10:00h</span>
                      <span className="text-[10px] text-slate-400 font-mono">100% dos veículos descarregados</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo Médio / Veículo</span>
                      <span className="text-xl font-black text-white my-1 block">&lt; 12 min</span>
                      <span className="text-[10px] text-slate-400 font-mono">Descarregamento ágil e seguro</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Conformidade EPIs</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">100%</span>
                      <span className="text-[10px] text-slate-400 font-mono">Capacete jugular + trava-rodas</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sinistros & Manobra</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">ZERO</span>
                      <span className="text-[10px] text-slate-400 font-mono">Motorista manobra exclusivamente</span>
                    </div>
                  </div>
                </div>

                {/* Fluxograma Visual da Operação com Setas */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-amber-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>3. Fluxograma Sequencial do Descarregamento</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          1 • INÍCIO
                        </span>
                        <h5 className="text-xs font-bold text-emerald-300">Giro 360º</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Volta a pé ao redor do veículo e entorno.</p>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold mt-2 pt-2 border-t border-emerald-500/20">Resp: Empilhador</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          2 • TRAVA
                        </span>
                        <h5 className="text-xs font-bold text-white">Calço de Rodas</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Instalação do calço na roda traseira.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Empilhador</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          3 • BAIAS
                        </span>
                        <h5 className="text-xs font-bold text-white">Abertura de Baias</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Elevação de lonas e inspeção de fitilhos.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Empilhador</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          4 • DESCARGA
                        </span>
                        <h5 className="text-xs font-bold text-white">Alocação Red Zone</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Garfos a 15-20cm; paletes alocados na baia.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Empilhador</span>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          5 • MANOBRA
                        </span>
                        <h5 className="text-xs font-bold text-red-300">Bolsão Pátio</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Retirada calço; motorista manobra caminhão.</p>
                      </div>
                      <span className="text-[9px] font-mono text-red-400 font-black mt-2 pt-2 border-t border-red-500/20">Resp: Motorista</span>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-purple-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          6 • FIM
                        </span>
                        <h5 className="text-xs font-bold text-purple-300">Liberação Cega</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Apontamento e início da conferência física.</p>
                      </div>
                      <span className="text-[9px] font-mono text-purple-400 font-bold mt-2 pt-2 border-t border-purple-500/20">Resp: Empilhador</span>
                    </div>
                  </div>
                </div>

                {/* Matriz RACI POP-LOG-001 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">4. Matriz de Responsabilidades RACI (Descarregamento):</h4>
                    <span className="text-[10px] text-slate-400 font-mono">R=Responsável | A=Aprovador | C=Consultado | I=Informado</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5 border-b border-slate-800">Atividade Operacional</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Motorista</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Empilhador</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Aux. Armazém</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Conferente</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Coord. Logística</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                        <tr>
                          <td className="p-2 font-medium">Inspeção 360º de Segurança ao redor do Caminhão</td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Instalação de Trava-Rodas / Calço Traseiro</td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Retirada dos Paletes c/ Empilhadeira p/ Red Zone</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr className="bg-amber-500/10">
                          <td className="p-2 font-bold text-amber-300">Manobra do Veículo pós-Descarga p/ Estacionamento</td>
                          <td className="p-2 text-center"><span className="bg-red-600 text-white px-1.5 py-0.5 rounded font-bold text-xxs">R (Exclusivo)</span></td>
                          <td className="p-2 text-center"><span className="text-red-400 font-bold text-xxs">PROIBIDO</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Logistics Process Correction Box */}
                <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl text-amber-200 space-y-2">
                  <div className="flex items-center space-x-2 font-black text-sm text-amber-400 uppercase tracking-wide">
                    <Truck className="h-5 w-5" />
                    <span>Diretriz Logística de Manobra (Responsabilidade Exclusiva do Motorista)</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed text-justify">
                    <strong>Regra Operacional & de Segurança Inegociável:</strong> Após a conclusão da retirada física dos paletes na <em>Red Zone</em> e retirada do calço de segurança, <strong>É O MOTORISTA QUEM DEVE MANOBRAR O VEÍCULO PARA O LOCAL DE ESTACIONAMENTO DOS VEÍCULOS (NÃO O EMPILHADOR)</strong>. O operador de empilhadeira é expressamente proibido de manobrar caminhões da frota.
                  </p>
                </div>

                {/* EPIs Required */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">5. EPIs 100% Obrigatórios (Operador de Empilhadeira):</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-2xl block mb-1">🪖</span>
                      <span className="text-[11px] font-bold text-white block">Capacete</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">C/ Jugular</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-2xl block mb-1">👓</span>
                      <span className="text-[11px] font-bold text-white block">Óculos</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">Impacto</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-2xl block mb-1">🎧</span>
                      <span className="text-[11px] font-bold text-white block">Protetor</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">Auricular</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-2xl block mb-1">🧤</span>
                      <span className="text-[11px] font-bold text-white block">Luvas</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">Vaqueta</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-2xl block mb-1">🥾</span>
                      <span className="text-[11px] font-bold text-white block">Calçado</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">Biqueira Aço</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center">
                      <span className="text-2xl block mb-1">🦺</span>
                      <span className="text-[11px] font-bold text-white block">Colete</span>
                      <span className="text-[9px] text-emerald-400 font-mono font-bold">Refletivo</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PADRÃO DE CONFERÊNCIA & BLITZ (POP-LOG-002) */}
            {activeTab === 'sop2_conf' && (
              <div className="space-y-6 animate-fade-in bg-slate-950 p-6 rounded-2xl border border-blue-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-600 text-white font-black text-xs px-2.5 py-0.5 rounded font-mono">POP-LOG-002</span>
                      <h3 className="text-base font-black text-white uppercase">Padrão de Conferência Física & Blitz de Refugo</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5 font-mono">
                      <span>Elaborador: <strong className="text-slate-300">Djeanderson Soares</strong></span>
                      <span>Aprovador: <strong className="text-slate-300">Marcos Guilherme (GOD)</strong></span>
                      <span className="text-blue-400 font-bold">Data de Revisão: 18/07/2026 (Rev. 03)</span>
                      <span className="text-emerald-400 font-bold">✓ DPO Ambev Vigente</span>
                    </div>
                  </div>

                  <button
                    id="btn_tab2_download_pdf"
                    onClick={() => handleDownloadSpecificPDF('conferencia')}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Padrão de Conferência & Blitz (PDF)</span>
                  </button>
                </div>

                {/* Objetivo do Padrão */}
                <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[11px] font-black uppercase text-blue-400 flex items-center space-x-2">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>1. Objetivo do Padrão</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Normatizar a <strong>Conferência Física Cega</strong> de retornos de rota pelo <strong>Conferente</strong>, auditoria de vasilhames 600ml e litrão, engradados, paletes PBR e barris, e execução diária e circular da <strong>Blitz de Refugo</strong> para atingir a meta DPO de 99.2% de acurácia.
                  </p>
                </div>

                {/* Metas Operacionais DPO */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-blue-400">
                    <Target className="h-4 w-4" />
                    <span>2. Metas Operacionais DPO da Conferência & Blitz</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Acurácia Física (IRA)</span>
                      <span className="text-xl font-black text-blue-400 my-1 block">≥ 99.2%</span>
                      <span className="text-[10px] text-slate-400 font-mono">Conferência 100% cega</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Meta Blitz Refugo</span>
                      <span className="text-xl font-black text-white my-1 block">2 Carros/Dia</span>
                      <span className="text-[10px] text-slate-400 font-mono">Sorteio circular automatizado</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tempo / Palete</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">&lt; 3 min</span>
                      <span className="text-[10px] text-slate-400 font-mono">Auditoria rápida na Red Zone</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Evidência Fotográfica</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">100%</span>
                      <span className="text-[10px] text-slate-400 font-mono">Fotos de garrafas refugadas</span>
                    </div>
                  </div>
                </div>

                {/* Fluxograma Visual da Conferência */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-blue-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>3. Fluxograma Sequencial de Conferência & Blitz</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          1 • INÍCIO
                        </span>
                        <h5 className="text-xs font-bold text-emerald-300">Recepção Red Zone</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Paletes posicionados; início sem dados fiscais.</p>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold mt-2 pt-2 border-t border-emerald-500/20">Resp: Conferente</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          2 • PRODUTO
                        </span>
                        <h5 className="text-xs font-bold text-white">Contagem Cega PA</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Latas, one-way, PETs e caixas fechadas.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Conferente</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          3 • ATIVOS
                        </span>
                        <h5 className="text-xs font-bold text-white">Ativos de Giro</h5>
                        <p className="text-[10px] text-slate-300 mt-1">CX600, CX Litro, Paletes PBR e Barris.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Conferente</span>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          4 • BLITZ
                        </span>
                        <h5 className="text-xs font-bold text-amber-300">Auditoria de Refugo</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Rebatimento 50 cx/palete e fotos obrigatórias.</p>
                      </div>
                      <span className="text-[9px] font-mono text-amber-400 font-bold mt-2 pt-2 border-t border-amber-500/20">Resp: Conferente</span>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-purple-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          5 • TRANSMISSÃO
                        </span>
                        <h5 className="text-xs font-bold text-purple-300">Lançamento & Reconferência</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Digitação no app; se divergir, dispara reconferência.</p>
                      </div>
                      <span className="text-[9px] font-mono text-purple-400 font-bold mt-2 pt-2 border-t border-purple-500/20">Resp: Conferente</span>
                    </div>
                  </div>
                </div>

                {/* Matriz RACI POP-LOG-002 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">4. Matriz de Responsabilidades RACI (Conferência & Blitz):</h4>
                    <span className="text-[10px] text-slate-400 font-mono">R=Responsável | A=Aprovador | C=Consultado | I=Informado</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5 border-b border-slate-800">Atividade Operacional</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Conferente</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Motorista</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Empilhador</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Aux. Armazém</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Coord. Logística</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                        <tr>
                          <td className="p-2 font-medium">Conferência Física Cega dos Retornos (Red Zone)</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center"><span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">C</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Contagem de Vasilhames, Caixas e Barris</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center"><span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">C</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Execução da Blitz de Refugo Diária (2 Veículos/Dia)</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center"><span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">C</span></td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Rebatimento 100% de Caixas de Refugo e Coleta de Fotos</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Diretriz da Blitz */}
                <div className="bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-r-xl text-blue-200 space-y-1.5">
                  <div className="flex items-center space-x-2 font-black text-sm text-blue-400 uppercase">
                    <Sparkles className="h-4 w-4" />
                    <span>Diretriz da Blitz Circular de Refugo</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    A seleção de 2 veículos diários para blitz é realizada através do algoritmo circular da plataforma, garantindo que 100% da frota seja auditada mensalmente de forma isonômica e sem viés.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PADRÃO DE DEVOLUÇÕES & FISCAL (POP-LOG-003) */}
            {activeTab === 'sop3_dev' && (
              <div className="space-y-6 animate-fade-in bg-slate-950 p-6 rounded-2xl border border-purple-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-purple-600 text-white font-black text-xs px-2.5 py-0.5 rounded font-mono">POP-LOG-003</span>
                      <h3 className="text-base font-black text-white uppercase">Padrão de Devoluções de Rota, Promax & Monitoramento</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5 font-mono">
                      <span>Elaborador: <strong className="text-slate-300">Djeanderson Soares</strong></span>
                      <span>Aprovador: <strong className="text-slate-300">Marcos Guilherme (GOD)</strong></span>
                      <span className="text-purple-400 font-bold">Data de Revisão: 18/07/2026 (Rev. 03)</span>
                      <span className="text-emerald-400 font-bold">✓ DPO Ambev Vigente</span>
                    </div>
                  </div>

                  <button
                    id="btn_tab3_download_pdf"
                    onClick={() => handleDownloadSpecificPDF('devolucoes')}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Padrão de Devoluções & Fiscal (PDF)</span>
                  </button>
                </div>

                {/* Objetivo do Padrão */}
                <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[11px] font-black uppercase text-purple-400 flex items-center space-x-2">
                    <FileCheck2 className="h-4 w-4" />
                    <span>1. Objetivo do Padrão</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Normatizar o fluxo de recebimento de devoluções de rota, conciliação fiscal no sistema Promax pela <strong>Auxiliar de Armazém</strong>, gestão de vales eletrônicos por faltas sob responsabilidade do motorista e regularização célere de sobras físicas (91% PA e 98% AG) junto ao <strong>Setor de Monitoramento</strong>.
                  </p>
                </div>

                {/* Metas Operacionais DPO */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-purple-400">
                    <Target className="h-4 w-4" />
                    <span>2. Metas Operacionais DPO de Devoluções & Fiscal</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fechamento Promax 05.01</span>
                      <span className="text-xl font-black text-purple-400 my-1 block">&lt; 11:30h</span>
                      <span className="text-[10px] text-slate-400 font-mono">100% das rotas digitadas</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tratativa de Sobras</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">100%</span>
                      <span className="text-[10px] text-slate-400 font-mono">91% PA / 98% AG saneadas</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Emissão de Vale Falta</span>
                      <span className="text-xl font-black text-white my-1 block">&lt; 15 min</span>
                      <span className="text-[10px] text-slate-400 font-mono">Geração pós-reconferência</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Passivo Fiscal em Aberto</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">ZERO</span>
                      <span className="text-[10px] text-slate-400 font-mono">Painel 100% limpo e atualizado</span>
                    </div>
                  </div>
                </div>

                {/* Fluxograma Visual de Devoluções & Fiscal */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-purple-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>3. Fluxograma Sequencial Fiscal & Tratativas</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-emerald-500 text-slate-950 font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          1 • GUARITA
                        </span>
                        <h5 className="text-xs font-bold text-emerald-300">Triagem de NFs</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Motorista apresenta notas com motivo de recusa.</p>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold mt-2 pt-2 border-t border-emerald-500/20">Resp: Motorista / Aux.</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          2 • PROMAX
                        </span>
                        <h5 className="text-xs font-bold text-white">Consulta 03.03.02</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Verificação dos itens faturados na carga.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Aux. Armazém</span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-blue-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          3 • RETORNO
                        </span>
                        <h5 className="text-xs font-bold text-white">Promax 05.01 Zerado</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Digitação manual estrita com tela iniciando zerada.</p>
                      </div>
                      <span className="text-[9px] font-mono text-blue-400 font-bold mt-2 pt-2 border-t border-slate-800">Resp: Aux. Armazém</span>
                    </div>

                    <div className="bg-purple-500/10 border border-purple-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-purple-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          4 • SOBRAS
                        </span>
                        <h5 className="text-xs font-bold text-purple-300">Tratativa Monitoramento</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Regularização 91% PA e 98% AG para sanear sobras.</p>
                      </div>
                      <span className="text-[9px] font-mono text-purple-400 font-bold mt-2 pt-2 border-t border-purple-500/20">Resp: Auxiliar / Monit.</span>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/40 p-3 rounded-xl flex flex-col justify-between">
                      <div>
                        <span className="bg-red-600 text-white font-black text-[9px] px-1.5 py-0.5 rounded font-mono uppercase block w-fit mb-1">
                          5 • FALTAS
                        </span>
                        <h5 className="text-xs font-bold text-red-300">Vales Eletrônicos</h5>
                        <p className="text-[10px] text-slate-300 mt-1">Emissão formal de Vale com ciência do motorista.</p>
                      </div>
                      <span className="text-[9px] font-mono text-red-400 font-bold mt-2 pt-2 border-t border-red-500/20">Resp: Aux. Armazém</span>
                    </div>
                  </div>
                </div>

                {/* Tratativas de Sobras e Faltas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-black uppercase text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Tratativa de Sobras (91% PA & 98% AG)</span>
                    </div>
                    <p className="text-xs text-slate-300 text-justify leading-relaxed">
                      • <strong>Origem:</strong> Troca de produto em rota ou recolhimento de vasilhames a mais em PDV.<br/>
                      • <strong>Ação Imediata:</strong> Acionar o <strong>Setor de Monitoramento</strong> para verificar dados de entrega.<br/>
                      • <strong>Reconciliação:</strong> Lançamento no Promax para atualizar estoque contábil e manter o painel limpo.
                    </p>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-xs font-black uppercase text-red-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Tratativa de Faltas (Vales Eletrônicos)</span>
                    </div>
                    <p className="text-xs text-slate-300 text-justify leading-relaxed">
                      • <strong>Responsabilidade:</strong> O motorista é o único responsável pela conferência 100% na saída matinal.<br/>
                      • <strong>Reconferência:</strong> Se houver divergência de falta, realiza-se reconferência cega imediata.<br/>
                      • <strong>Formalização:</strong> Emissão do Vale Eletrônico com tabela de preços Ambev para desconto formal.
                    </p>
                  </div>
                </div>

                {/* Matriz RACI POP-LOG-003 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-purple-400">5. Matriz de Responsabilidades RACI (Devoluções & Promax):</h4>
                    <span className="text-[10px] text-slate-400 font-mono">R=Responsável | A=Aprovador | C=Consultado | I=Informado</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-400 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5 border-b border-slate-800">Atividade Operacional</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Aux. Armazém</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Motorista</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Conferente</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Setor Monit.</th>
                          <th className="p-2.5 border-b border-slate-800 text-center">Coord. Logística</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300 text-[11px]">
                        <tr>
                          <td className="p-2 font-medium">Sinalização de Devoluções na Entrada da Guarita</td>
                          <td className="p-2 text-center"><span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">C</span></td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Consulta de Carga Faturada no Promax (Rotina 03.03.02)</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Lançamento no Promax 05.01 (Iniciando ZERADO)</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Tratativa de 91% PA e 98% AG com Monitoramento</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold">C</span></td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                        <tr>
                          <td className="p-2 font-medium">Emissão de Vale Eletrônico por Faltas de Rota</td>
                          <td className="p-2 text-center"><span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">R</span></td>
                          <td className="p-2 text-center"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">I</span></td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center text-slate-600">-</td>
                          <td className="p-2 text-center"><span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-bold">A</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB FLUXO VISUAL: DIAGRAMA COM SETAS E IMAGENS */}
            {activeTab === 'fluxo_visual' && (
              <div className="space-y-6 animate-fade-in bg-slate-950 p-6 rounded-2xl border border-cyan-500/30">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-cyan-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded font-mono">DIAGRAMA DPO</span>
                      <h3 className="text-base font-black text-white uppercase">Fluxo Visual Integrado com Setas (Do Início ao Fim)</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-mono">
                      Mapeamento das 8 etapas sequenciais da operação de retorno de rota da Pau Brasil Distribuidora
                    </p>
                  </div>
                </div>

                {/* Visual Chain with Arrows */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    
                    {/* ETAPA 1 */}
                    <div className="bg-emerald-500/10 border-2 border-emerald-500 p-4 rounded-xl relative flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-emerald-500 text-slate-950 font-black text-xxs px-2 py-0.5 rounded font-mono">
                          🚀 ETAPA 1 • INÍCIO
                        </span>
                        <Building2 className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">Guarita & Triagem Fiscal</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Chegada do caminhão na guarita. Apresentação das NFs de devolução com carimbo e motivo comercial.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xxs font-mono">
                        <span className="text-emerald-400 font-bold">Resp: Motorista / Aux.</span>
                        <span className="text-slate-400">POP-LOG-003</span>
                      </div>
                    </div>

                    {/* ETAPA 2 */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-amber-500 text-slate-950 font-black text-xxs px-2 py-0.5 rounded font-mono">
                          ETAPA 2 • SEGURANÇA
                        </span>
                        <Shield className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">Giro 360º & Trava-Rodas</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Inspeção física a pé ao redor do caminhão e posicionamento obrigatório do calço nas rodas traseiras.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xxs font-mono">
                        <span className="text-amber-400 font-bold">Resp: Empilhador</span>
                        <span className="text-slate-400">POP-LOG-001</span>
                      </div>
                    </div>

                    {/* ETAPA 3 */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-amber-500 text-slate-950 font-black text-xxs px-2 py-0.5 rounded font-mono">
                          ETAPA 3 • DESCARGA
                        </span>
                        <Truck className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">Descarga p/ Red Zone</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Abertura de baias e retirada física dos paletes com garfos baixos nivelados (Meta: &lt; 10:00 da manhã).
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xxs font-mono">
                        <span className="text-amber-400 font-bold">Resp: Empilhador</span>
                        <span className="text-slate-400">Meta: &lt; 12 min</span>
                      </div>
                    </div>

                    {/* ETAPA 4 */}
                    <div className="bg-red-500/10 border-2 border-red-500 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-red-600 text-white font-black text-xxs px-2 py-0.5 rounded font-mono">
                          🛑 ETAPA 4 • CRÍTICA
                        </span>
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-red-300 uppercase">Manobra p/ Bolsão</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Retirada do calço; <strong>MOTORISTA MANOBRA O CAMINHÃO</strong>. Empilhador é PROIBIDO de manobrar.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-red-500/20 flex items-center justify-between text-xxs font-mono">
                        <span className="text-red-400 font-black">Resp Exclusivo: Motorista</span>
                        <span className="text-red-300">Regra DPO</span>
                      </div>
                    </div>

                  </div>

                  {/* Connecting Arrow Down/Divider */}
                  <div className="flex items-center justify-center space-x-2 text-cyan-400 font-bold py-1">
                    <ArrowDown className="h-5 w-5 animate-bounce" />
                    <span className="text-xxs font-mono uppercase tracking-widest">Fluxo Contínuo da Red Zone ao Fechamento</span>
                    <ArrowDown className="h-5 w-5 animate-bounce" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    
                    {/* ETAPA 5 */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-blue-500 text-white font-black text-xxs px-2 py-0.5 rounded font-mono">
                          ETAPA 5 • AUDITORIA
                        </span>
                        <ClipboardCheck className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">Conferência Física Cega</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Contagem cega de vasilhames 600ml, litrão, caixas, paletes PBR, barris e produtos acabados (Meta IRA ≥ 99.2%).
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xxs font-mono">
                        <span className="text-blue-400 font-bold">Resp: Conferente</span>
                        <span className="text-slate-400">POP-LOG-002</span>
                      </div>
                    </div>

                    {/* ETAPA 6 */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-blue-500 text-white font-black text-xxs px-2 py-0.5 rounded font-mono">
                          ETAPA 6 • QUALIDADE
                        </span>
                        <Sparkles className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">Blitz de Refugo Diária</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Rebatimento 100% de 50 cx/palete em 2 veículos sorteados pelo algoritmo circular e registro de fotos.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xxs font-mono">
                        <span className="text-blue-400 font-bold">Resp: Conferente</span>
                        <span className="text-slate-400">2 Carros/Dia</span>
                      </div>
                    </div>

                    {/* ETAPA 7 */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-purple-600 text-white font-black text-xxs px-2 py-0.5 rounded font-mono">
                          ETAPA 7 • PROMAX
                        </span>
                        <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase">Promax 05.01 & Sobras</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Digitação cega com tela iniciando ZERADA (0). Regularização de 91% PA e 98% AG com o Monitoramento.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xxs font-mono">
                        <span className="text-purple-400 font-bold">Resp: Auxiliar / Monit.</span>
                        <span className="text-slate-400">Meta: &lt; 11:30h</span>
                      </div>
                    </div>

                    {/* ETAPA 8 */}
                    <div className="bg-purple-500/10 border-2 border-purple-500 p-4 rounded-xl flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-purple-600 text-white font-black text-xxs px-2 py-0.5 rounded font-mono">
                          🏁 ETAPA 8 • FINAL
                        </span>
                        <CheckCircle className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-purple-300 uppercase">Vales de Débito & Baixa</h4>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Reconferência em faltas, emissão do Vale Eletrônico para débito do motorista e encerramento da rota.
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-purple-500/20 flex items-center justify-between text-xxs font-mono">
                        <span className="text-purple-400 font-bold">Resp: Auxiliar / Coord.</span>
                        <span className="text-emerald-400 font-bold">Rota Concluída</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

            {/* TAB ALL: PADRÃO CONSOLIDADO COMPLETO (POP-LOG-004) */}
            {activeTab === 'all' && (
              <div className="space-y-6 animate-fade-in bg-slate-950 p-6 rounded-2xl border border-emerald-500/30">
                
                {/* Header POP-LOG-004 */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded font-mono">POP-LOG-004</span>
                      <h3 className="text-base font-black text-white uppercase">Manual Geral Consolidado de Retorno de Rota</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 mt-1.5 font-mono">
                      <span>Elaborador: <strong className="text-slate-300">Djeanderson Soares</strong></span>
                      <span>Aprovador: <strong className="text-slate-300">Marcos Guilherme (GOD)</strong></span>
                      <span className="text-amber-400 font-bold">Data de Revisão: 18/07/2026 (Rev. 03)</span>
                      <span className="text-emerald-400 font-bold">✓ Junção Completa dos 3 Padrões</span>
                    </div>
                  </div>

                  <button
                    id="btn_tab4_download_pdf"
                    onClick={() => handleDownloadSpecificPDF('consolidado')}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md shrink-0"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Manual Consolidado (PDF)</span>
                  </button>
                </div>

                {/* 1. Objetivo Consolidado */}
                <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[11px] font-black uppercase text-emerald-400 flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4" />
                    <span>1. Objetivo Geral do Padrão Consolidado</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed text-justify">
                    Unificar e integrar de ponta a ponta todas as fases operacionais de retorno de rota da Pau Brasil Distribuidora: 
                    <strong> (1) Descarregamento Seguro no Pátio (POP-LOG-001)</strong>, 
                    <strong> (2) Conferência Física Cega e Blitz de Refugo (POP-LOG-002)</strong>, e 
                    <strong> (3) Devoluções de Rota, Reconciliação Promax e Tratativas de Sobras/Faltas com Monitoramento (POP-LOG-003)</strong>.
                  </p>
                </div>

                {/* 2. Painel Consolidado de Metas Operacionais */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <Target className="h-4 w-4" />
                    <span>2. Metas Operacionais DPO Consolidadas</span>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Descarregamento EFD</span>
                      <span className="text-xl font-black text-amber-400 my-1 block">&lt; 10:00h</span>
                      <span className="text-[10px] text-slate-400 font-mono">100% caminhões descarregados</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Acurácia Física (IRA)</span>
                      <span className="text-xl font-black text-blue-400 my-1 block">≥ 99.2%</span>
                      <span className="text-[10px] text-slate-400 font-mono">Conferência 100% cega</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Fechamento Promax</span>
                      <span className="text-xl font-black text-purple-400 my-1 block">&lt; 11:30h</span>
                      <span className="text-[10px] text-slate-400 font-mono">Rotina 05.01 zerada</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Saneamento Vales/Sobras</span>
                      <span className="text-xl font-black text-emerald-400 my-1 block">100%</span>
                      <span className="text-[10px] text-slate-400 font-mono">Zero passivos em aberto</span>
                    </div>
                  </div>
                </div>

                {/* 3. Fluxo Master com Passos Numerados e Setas */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                    <span>3. Fluxo Operacional Integrado de Ponta a Ponta (Do 1º ao Último Processo)</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold block">1. GUARITA</span>
                      <span className="text-xs font-bold text-white block">Triagem de Devoluções</span>
                      <span className="text-[10px] text-slate-400">Motorista entrega NFs c/ motivo recusa.</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-amber-400 font-bold block">2. PÁTIO</span>
                      <span className="text-xs font-bold text-white block">Giro 360º & Trava-Rodas</span>
                      <span className="text-[10px] text-slate-400">Inspeção física e calçamento do veículo.</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-amber-400 font-bold block">3. RED ZONE</span>
                      <span className="text-xs font-bold text-white block">Descarga dos Paletes</span>
                      <span className="text-[10px] text-slate-400">Empilhador posiciona na baia demarcada.</span>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-red-400 font-black block">4. MANOBRA</span>
                      <span className="text-xs font-bold text-red-300 block">Estacionamento Bolsão</span>
                      <span className="text-[10px] text-slate-400">Motorista manobra (Empilhador NÃO).</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-blue-400 font-bold block">5. AUDITORIA</span>
                      <span className="text-xs font-bold text-white block">Conferência Física Cega</span>
                      <span className="text-[10px] text-slate-400">Contagem de vasilhames 600/litro e PA.</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-blue-400 font-bold block">6. BLITZ</span>
                      <span className="text-xs font-bold text-white block">Blitz Refugo (2 Carros)</span>
                      <span className="text-[10px] text-slate-400">Rebatimento 50 cx/palete e fotos.</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-purple-400 font-bold block">7. PROMAX</span>
                      <span className="text-xs font-bold text-white block">Promax 05.01 Zerado</span>
                      <span className="text-[10px] text-slate-400">Tratativa 91% PA/98% AG c/ Monit.</span>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/30 p-2.5 rounded-xl">
                      <span className="text-[9px] font-mono text-purple-400 font-bold block">8. BAIXA</span>
                      <span className="text-xs font-bold text-white block">Vales & Fechamento</span>
                      <span className="text-[10px] text-slate-400">Emissão de Vale p/ falta e baixa.</span>
                    </div>
                  </div>
                </div>

                {/* 4. Tratativas Completas de Sobras e Faltas */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                    4. Tratativas Detalhadas de Sobras e Faltas de Rota
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-black uppercase text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Tratativas de Sobras Físicas (91% PA & 98% AG)</span>
                      </div>
                      <p className="text-xs text-slate-300 text-justify leading-relaxed">
                        • <strong>O que é Sobra Física:</strong> Quando a contagem física cega na <em>Red Zone</em> apura quantidade superior à nota fiscal faturada ou vasilhames devolvidos.<br/>
                        • <strong>Comunicação com Monitoramento:</strong> A Auxiliar aciona de imediato o Setor de Monitoramento para conferir a telemetria, notas de troca e cancelamentos de entrega em rota.<br/>
                        • <strong>Conciliação no Promax:</strong> Registro dos saldos de 91% PA e 98% AG para manter a acurácia do estoque real com o virtual e limpar o painel.
                      </p>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/40 p-4 rounded-xl space-y-2">
                      <div className="flex items-center space-x-2 text-xs font-black uppercase text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Tratativas de Faltas Físicas (Vales Eletrônicos)</span>
                      </div>
                      <p className="text-xs text-slate-300 text-justify leading-relaxed">
                        • <strong>Responsabilidade do Motorista:</strong> O motorista é o único responsável pela conferência de 100% da carga matinal na saída da revenda.<br/>
                        • <strong>Reconferência Cega Imediata:</strong> Em caso de falta apontada, o conferente e o motorista recontam o palete conjuntamente.<br/>
                        • <strong>Emissão e Desconto do Vale:</strong> Confirmada a falta, gera-se o Vale Eletrônico com valor parametrizado Ambev, assinatura digital do motorista e desconto em folha.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Master RACI Matrix */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400">
                      5. Matriz de Responsabilidades RACI Integrada Completa (Todos os Processos):
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">R=Responsável | A=Aprovador | C=Consultado | I=Informado</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-slate-300 font-mono text-[10px] uppercase">
                        <tr>
                          <th className="p-3 border-b border-slate-800">Atividade Operacional de Retorno</th>
                          <th className="p-3 border-b border-slate-800 text-center">Motorista</th>
                          <th className="p-3 border-b border-slate-800 text-center">Conferente</th>
                          <th className="p-3 border-b border-slate-800 text-center">Aux. Armazém</th>
                          <th className="p-3 border-b border-slate-800 text-center">Empilhador</th>
                          <th className="p-3 border-b border-slate-800 text-center">Coord. Logística</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Conferência na Expedição Matinal (Saída)</td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center"><span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">C</span></td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Sinalização de Devolução na Guarita e Entrega de NFs</td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center"><span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">C</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Inspeção 360º, Calço & Descarregamento</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="bg-amber-500/10 hover:bg-amber-500/15">
                          <td className="p-3 font-bold text-amber-300">Manobra do Veículo pós-Descarga p/ Estacionamento</td>
                          <td className="p-3 text-center"><span className="bg-red-600 text-white font-black px-2 py-0.5 rounded">R (Exclusivo)</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="text-red-400 font-bold text-[10px]">PROIBIDO</span></td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Conferência Física Cega (Red Zone)</td>
                          <td className="p-3 text-center"><span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">C</span></td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Blitz de Refugo (2 veículos/dia circular)</td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center"><span className="bg-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded">C</span></td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Conciliação Promax 05.01 / 03.03.02 Zerado</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Tratativas de Sobras (91% PA / 98% AG) c/ Monitoramento</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                        <tr className="hover:bg-slate-900/50">
                          <td className="p-3 font-semibold text-white">Emissão e Formalização Eletrônica de Vales de Débito</td>
                          <td className="p-3 text-center"><span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded">I</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-red-500/20 text-red-400 font-bold px-2 py-0.5 rounded">R</span></td>
                          <td className="p-3 text-center text-slate-600">-</td>
                          <td className="p-3 text-center"><span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded">A</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO INFERIOR: DOWNLOADS DEDICADOS DOS 4 PADRÕES */}
            <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-500 p-2.5 rounded-xl text-slate-950 font-black">
                  <Download className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase text-white tracking-wide">
                    CENTRAL DE DOWNLOAD DOS PADRÕES OPERACIONAIS (PDF INDIVIDUAL & CONSOLIDADO)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Faça o download dos padrões em PDF individualmente ou baixe o manual completo consolidado
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                <button
                  id="btn_download_sop1_bottom"
                  onClick={() => handleDownloadSpecificPDF('descarregamento')}
                  className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 rounded-xl transition cursor-pointer group text-left"
                >
                  <div>
                    <span className="text-[10px] font-mono text-amber-400 font-bold block">POP-LOG-001</span>
                    <span className="text-xs font-bold text-white group-hover:text-amber-300 transition">Padrão Descarregamento</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">EPIs, Metas & Manobra Motorista</span>
                  </div>
                  <Download className="h-4 w-4 text-amber-400 shrink-0 ml-2" />
                </button>

                <button
                  id="btn_download_sop2_bottom"
                  onClick={() => handleDownloadSpecificPDF('conferencia')}
                  className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 border border-blue-500/40 rounded-xl transition cursor-pointer group text-left"
                >
                  <div>
                    <span className="text-[10px] font-mono text-blue-400 font-bold block">POP-LOG-002</span>
                    <span className="text-xs font-bold text-white group-hover:text-blue-300 transition">Conferência & Blitz</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Contagem Cega & Refugo Circular</span>
                  </div>
                  <Download className="h-4 w-4 text-blue-400 shrink-0 ml-2" />
                </button>

                <button
                  id="btn_download_sop3_bottom"
                  onClick={() => handleDownloadSpecificPDF('devolucoes')}
                  className="flex items-center justify-between p-3 bg-slate-900 hover:bg-slate-800 border border-purple-500/40 rounded-xl transition cursor-pointer group text-left"
                >
                  <div>
                    <span className="text-[10px] font-mono text-purple-400 font-bold block">POP-LOG-003</span>
                    <span className="text-xs font-bold text-white group-hover:text-purple-300 transition">Padrão Devoluções</span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">Promax 05.01, Sobras & Vales</span>
                  </div>
                  <Download className="h-4 w-4 text-purple-400 shrink-0 ml-2" />
                </button>

                <button
                  id="btn_download_sop4_bottom"
                  onClick={() => handleDownloadSpecificPDF('consolidado')}
                  className="flex items-center justify-between p-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl transition cursor-pointer shadow-md text-left"
                >
                  <div>
                    <span className="text-[10px] font-mono text-slate-900 font-bold block">POP-LOG-004</span>
                    <span className="text-xs font-black uppercase text-slate-950">Manual Consolidado</span>
                    <span className="text-[9px] text-slate-900 block mt-0.5">3 Padrões, RACIs & Tratativas</span>
                  </div>
                  <Download className="h-4 w-4 text-slate-950 shrink-0 ml-2" />
                </button>
              </div>
            </div>

            {/* Quality Standard badge / Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xxs text-slate-400 font-mono">
              <span>DOCUMENTO DE QUALIDADE CONTROLADO • REV 03 (2026)</span>
              <span className="text-emerald-500 font-bold">✓ Homologado Ambev DPO Pau Brasil Distribuidora</span>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
