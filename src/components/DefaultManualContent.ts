// Default Standards (SOPs) & Platform Manual Content - Pau Brasil Distribuidora Ambev

const BASE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
  body { 
    font-family: 'Inter', sans-serif; 
    color: #0f172a; 
    padding: 24px 30px; 
    line-height: 1.45; 
    background: #ffffff;
    font-size: 10px;
  }
  .header-logo {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    border-bottom: 3px solid #0f35a9;
    padding-bottom: 8px;
  }
  .logo-title {
    font-size: 22px;
    font-weight: 900;
    color: #0f35a9;
    letter-spacing: -0.03em;
    margin: 0;
    line-height: 1;
  }
  .logo-subtitle {
    font-size: 9.5px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #475569;
    font-weight: 700;
    margin-top: 3px;
  }
  .logo-tag {
    color: #f59e0b;
    font-weight: 900;
  }
  .doc-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    color: #475569;
    text-align: right;
    font-weight: bold;
    line-height: 1.35;
  }
  h1 { 
    color: #0f35a9; 
    font-size: 14px; 
    font-weight: 900;
    margin-top: 6px; 
    margin-bottom: 10px;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: -0.01em;
  }
  h2 { 
    color: #0f35a9; 
    font-size: 11px; 
    font-weight: 800;
    margin-top: 14px; 
    margin-bottom: 6px;
    border-bottom: 2px solid #0f35a9; 
    padding-bottom: 2px; 
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  h3 { 
    color: #1e293b; 
    font-size: 10px; 
    font-weight: 700;
    margin-top: 8px; 
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  p { 
    font-size: 9.5px; 
    color: #334155;
    margin: 4px 0; 
    text-align: justify;
  }
  ul, ol { 
    font-size: 9.5px; 
    color: #334155;
    padding-left: 16px; 
    margin-top: 3px;
    margin-bottom: 6px;
  }
  li { 
    margin: 2px 0; 
  }
  .meta-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
  }
  .meta-table td {
    padding: 4px 6px;
    border: 1px solid #cbd5e1;
    font-size: 9px;
  }
  .meta-label {
    font-weight: 700;
    color: #334155;
    width: 22%;
    background: #f1f5f9;
  }
  .meta-val {
    color: #0f172a;
    font-weight: 600;
  }
  .raci-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 8.5px;
  }
  .raci-table th, .raci-table td {
    border: 1px solid #cbd5e1;
    padding: 4px 5px;
    text-align: center;
  }
  .raci-table th {
    background: #0f35a9;
    color: #ffffff;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 8px;
  }
  .raci-table td.activity {
    text-align: left;
    font-weight: 600;
    color: #1e293b;
    width: 44%;
  }
  .raci-badge {
    display: inline-block;
    padding: 1px 4px;
    border-radius: 3px;
    font-weight: 800;
    font-size: 8px;
  }
  .raci-r { background: #fee2e2; color: #991b1b; }
  .raci-a { background: #fef3c7; color: #92400e; }
  .raci-c { background: #e0f2fe; color: #075985; }
  .raci-i { background: #dcfce7; color: #166534; }

  /* Flow Styles */
  .flow-wrapper {
    margin: 10px 0;
    padding: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
  }
  .flow-title {
    font-size: 9.5px;
    font-weight: 800;
    color: #0f35a9;
    text-transform: uppercase;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .flow-chain {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 4px;
    overflow-x: auto;
  }
  .flow-step-box {
    flex: 1;
    min-width: 100px;
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    padding: 6px;
    background: #ffffff;
    font-size: 8px;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .flow-step-start {
    border-top: 3px solid #10b981;
    background: #f0fdf4;
  }
  .flow-step-mid {
    border-top: 3px solid #3b82f6;
  }
  .flow-step-alert {
    border-top: 3px solid #ef4444;
    background: #fff1f2;
  }
  .flow-step-end {
    border-top: 3px solid #8b5cf6;
    background: #faf5ff;
  }
  .flow-tag {
    font-size: 7.5px;
    font-weight: 900;
    text-transform: uppercase;
    display: inline-block;
    padding: 1px 3px;
    border-radius: 2px;
    margin-bottom: 3px;
  }
  .flow-tag-start { background: #dcfce7; color: #15803d; }
  .flow-tag-mid { background: #dbeafe; color: #1d4ed8; }
  .flow-tag-alert { background: #fee2e2; color: #b91c1c; }
  .flow-tag-end { background: #f3e8ff; color: #6b21a8; }
  .flow-step-title {
    font-weight: 800;
    color: #0f172a;
    font-size: 8.5px;
    line-height: 1.2;
    margin-bottom: 2px;
  }
  .flow-step-desc {
    color: #475569;
    font-size: 7.5px;
    line-height: 1.25;
  }
  .flow-step-resp {
    font-weight: 700;
    color: #0f35a9;
    margin-top: 4px;
    font-size: 7.5px;
    border-top: 1px dashed #e2e8f0;
    padding-top: 2px;
  }
  .flow-arrow-div {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    font-weight: bold;
    font-size: 11px;
  }

  /* Targets and Metrics Grid */
  .targets-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    margin: 8px 0 12px 0;
  }
  .target-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px;
    background: #f8fafc;
    text-align: center;
  }
  .target-val {
    font-size: 13px;
    font-weight: 900;
    color: #0f35a9;
    margin: 2px 0;
  }
  .target-lbl {
    font-size: 8px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
  }
  .target-sub {
    font-size: 7.5px;
    color: #64748b;
  }

  /* Boxes */
  .rule-box {
    background: #fffbeb;
    border-left: 4px solid #f59e0b;
    padding: 6px 10px;
    margin: 8px 0;
    border-radius: 0 5px 5px 0;
  }
  .rule-box-title {
    font-weight: 800;
    font-size: 9px;
    color: #78350f;
    margin-bottom: 2px;
    text-transform: uppercase;
  }
  .info-box {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    padding: 6px 10px;
    margin: 8px 0;
    border-radius: 0 5px 5px 0;
  }
  .info-box-title {
    font-weight: 800;
    font-size: 9px;
    color: #1e40af;
    margin-bottom: 2px;
    text-transform: uppercase;
  }
  .danger-box {
    background: #fef2f2;
    border-left: 4px solid #ef4444;
    padding: 6px 10px;
    margin: 8px 0;
    border-radius: 0 5px 5px 0;
  }
  .danger-box-title {
    font-weight: 800;
    font-size: 9px;
    color: #991b1b;
    margin-bottom: 2px;
    text-transform: uppercase;
  }

  /* Treatment Boxes */
  .treatment-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 10px 0;
  }
  .treatment-sobras {
    border: 1px solid #bbf7d0;
    background: #f0fdf4;
    border-radius: 6px;
    padding: 8px;
  }
  .treatment-faltas {
    border: 1px solid #fecaca;
    background: #fff1f2;
    border-radius: 6px;
    padding: 8px;
  }
  .treatment-head-sobra {
    color: #166534;
    font-weight: 900;
    font-size: 9.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
    border-bottom: 1px solid #bbf7d0;
    padding-bottom: 3px;
  }
  .treatment-head-falta {
    color: #991b1b;
    font-weight: 900;
    font-size: 9.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
    border-bottom: 1px solid #fecaca;
    padding-bottom: 3px;
  }

  .footer { 
    margin-top: 20px; 
    text-align: center; 
    font-size: 7.5px; 
    color: #64748b; 
    border-top: 1px solid #e2e8f0; 
    padding-top: 6px; 
    line-height: 1.35;
  }
  .epi-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 5px;
    margin: 8px 0;
  }
  .epi-card {
    border: 1px solid #cbd5e1;
    border-radius: 5px;
    padding: 5px 2px;
    text-align: center;
    background: #f8fafc;
  }
  .epi-card-title {
    font-weight: 800;
    font-size: 8px;
    color: #0f172a;
    text-transform: uppercase;
  }
  .epi-card-sub {
    font-size: 7px;
    color: #059669;
    font-weight: 700;
  }
`;

// =========================================================================================
// PADRÃO 1: PADRÃO DE DESCARREGAMENTO E SEGURANÇA NO PÁTIO (POP-LOG-001)
// =========================================================================================
export const SOP_DESCARREGAMENTO_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POP-LOG-001 - Padrão de Descarregamento & Segurança no Pátio</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="header-logo">
    <div>
      <div class="logo-title">PAU BRASIL</div>
      <div class="logo-subtitle">distribuidora <span class="logo-tag">ambev</span></div>
    </div>
    <div class="doc-code">
      CÓD: POP-LOG-001-AMB<br/>
      REVISÃO: 03 (DATA DE REVISÃO: 18/07/2026)<br/>
      ÁREA: ARMAZÉM & MOVIMENTAÇÃO DE PÁTIO
    </div>
  </div>
  
  <h1>POP-LOG-001: PADRÃO OPERACIONAL DE DESCARREGAMENTO & SEGURANÇA DE PÁTIO</h1>
  
  <table class="meta-table">
    <tr>
      <td class="meta-label">Elaborador do Padrão</td>
      <td class="meta-val">Djeanderson Soares — Coordenador de Armazém</td>
      <td class="meta-label">Data de Elaboração</td>
      <td class="meta-val">18/07/2026</td>
    </tr>
    <tr>
      <td class="meta-label">Aprovador do Padrão</td>
      <td class="meta-val">Marcos Guilherme — GOD (Gerente de Operações)</td>
      <td class="meta-label">Data de Revisão</td>
      <td class="meta-val" style="color: #0f35a9; font-weight: 800;">18/07/2026 (Rev. 03)</td>
    </tr>
    <tr>
      <td class="meta-label">Escopo & Aplicação</td>
      <td class="meta-val">Operadores de Empilhadeira e Motoristas de Entrega</td>
      <td class="meta-label">Status do Documento</td>
      <td class="meta-val" style="color: #10b981; font-weight: bold;">✓ Aprovado e Vigente (DPO Ambev)</td>
    </tr>
  </table>

  <h2>1. OBJETIVO DO PADRÃO</h2>
  <p>
    Padronizar a rotina operacional do <strong>Operador de Empilhadeira</strong> e <strong>Motorista</strong> no recebimento e descarregamento de veículos de retorno de rota, 
    assegurando 100% de conformidade com as normas de segurança do trabalho (DPO Ambev), eliminação do risco de acidentes e atropelamentos, integridade física dos colaboradores, 
    preservação dos ativos de giro (vasilhames e paletes) e máxima fluidez no fluxo de pátio na Revenda Pau Brasil Distribuidora.
  </p>

  <h2>2. METAS OPERACIONAIS DPO DO DESCARREGAMENTO</h2>
  <div class="targets-grid">
    <div class="target-card">
      <div class="target-val">&lt; 10:00h</div>
      <div class="target-lbl">Meta EFD Diária</div>
      <div class="target-sub">100% dos caminhões descarregados</div>
    </div>
    <div class="target-card">
      <div class="target-val">&lt; 12 min</div>
      <div class="target-lbl">Tempo Médio / Veículo</div>
      <div class="target-sub">Produtividade de pátio</div>
    </div>
    <div class="target-card">
      <div class="target-val">100%</div>
      <div class="target-lbl">Adesão EPI + Calço</div>
      <div class="target-sub">Capacete c/ jugular & trava-rodas</div>
    </div>
    <div class="target-card">
      <div class="target-val">ZERO</div>
      <div class="target-lbl">Acidentes / Sinistros</div>
      <div class="target-sub">Motorista manobra pós-descarga</div>
    </div>
  </div>

  <h2>3. FLUXOGRAMA VISUAL DO PROCESSO DE DESCARREGAMENTO</h2>
  <div class="flow-wrapper">
    <div class="flow-title">➔ Sequência Cronológica do Descarregamento (Início ao Encerramento)</div>
    <div class="flow-chain">
      <div class="flow-step-box flow-step-start">
        <div>
          <span class="flow-tag flow-tag-start">Etapa 1 • Início</span>
          <div class="flow-step-title">Giro 360º de Segurança</div>
          <div class="flow-step-desc">Inspeção a pé ao redor do veículo, pedestres e piso.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 2</span>
          <div class="flow-step-title">Calço de Segurança</div>
          <div class="flow-step-desc">Instalação de trava-rodas nas rodas traseiras do caminhão.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 3</span>
          <div class="flow-step-title">Abertura de Baias</div>
          <div class="flow-step-desc">Elevação de lonas e verificação de tombamento.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 4</span>
          <div class="flow-step-title">Descarga p/ Red Zone</div>
          <div class="flow-step-desc">Garfos a 15-20cm do chão; paletes alocados na Red Zone.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-alert">
        <div>
          <span class="flow-tag flow-tag-alert">Etapa 5 • Crítica</span>
          <div class="flow-step-title">Manobra do Veículo</div>
          <div class="flow-step-desc">Retirada do calço; MOTORISTA manobra p/ bolsão.</div>
        </div>
        <div class="flow-step-resp" style="color: #991b1b;">Resp Exclusivo: Motorista</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-end">
        <div>
          <span class="flow-tag flow-tag-end">Etapa 6 • Fim</span>
          <div class="flow-step-title">Liberação Conferência</div>
          <div class="flow-step-desc">Apontamento no sistema e passagem p/ conferente cego.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>
    </div>
  </div>

  <h2>4. MATRIZ DE RESPONSABILIDADES RACI (DESCARREGAMENTO & PÁTIO)</h2>
  <table class="raci-table">
    <thead>
      <tr>
        <th>Atividade Operacional</th>
        <th>Motorista</th>
        <th>Empilhador</th>
        <th>Aux. Armazém</th>
        <th>Conferente</th>
        <th>Coord. Logística</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="activity">Inspeção 360º de Segurança ao redor do Veículo</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Instalação Obrigatória de Trava-Rodas / Calço</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Abertura e Elevação das Baias Laterais / Lonas</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Retirada Física dos Paletes com Empilhadeira p/ Red Zone</td>
        <td>-</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr style="background: #fff1f2;">
        <td class="activity">Manobra do Caminhão pós-Descarga p/ Bolsão de Estacionamento</td>
        <td><span class="raci-badge raci-r">R</span> (Exclusivo)</td>
        <td><strong>PROIBIDO</strong></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Segregação de Paletes de Veículo Sorteado p/ Blitz de Refugo</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Apontamento de Horário de Início e Término no Sistema</td>
        <td>-</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
    </tbody>
  </table>

  <h2>5. EQUIPAMENTOS DE PROTEÇÃO INDIVIDUAL (EPIS OBRIGATÓRIOS)</h2>
  <div class="epi-grid">
    <div class="epi-card">
      <div style="font-size: 14px;">🪖</div>
      <div class="epi-card-title">Capacete</div>
      <div class="epi-card-sub">C/ Jugular Presa</div>
    </div>
    <div class="epi-card">
      <div style="font-size: 14px;">👓</div>
      <div class="epi-card-title">Óculos</div>
      <div class="epi-card-sub">Anti-Impacto</div>
    </div>
    <div class="epi-card">
      <div style="font-size: 14px;">🎧</div>
      <div class="epi-card-title">Protetor</div>
      <div class="epi-card-sub">Auricular Plug</div>
    </div>
    <div class="epi-card">
      <div style="font-size: 14px;">🧤</div>
      <div class="epi-card-title">Luvas</div>
      <div class="epi-card-sub">Vaqueta / Nitrílica</div>
    </div>
    <div class="epi-card">
      <div style="font-size: 14px;">🥾</div>
      <div class="epi-card-title">Calçado</div>
      <div class="epi-card-sub">C/ Biqueira de Aço</div>
    </div>
    <div class="epi-card">
      <div style="font-size: 14px;">🦺</div>
      <div class="epi-card-title">Colete</div>
      <div class="epi-card-sub">Refletivo Classe 2</div>
    </div>
  </div>

  <h2>6. DESCRIÇÃO DETALHADA DO PROCESSO OPERACIONAL</h2>
  <ol>
    <li><strong>Passo 1 — Giro 360º de Segurança:</strong> Antes de aproximar a empilhadeira, o operador deve realizar a volta completa a pé ao redor do veículo, inspecionando pedestres no raio de alcance, piso molhado, obstáculos físicos e condições das baias.</li>
    <li><strong>Passo 2 — Calçamento Obrigatório do Veículo:</strong> Posicionar obrigatoriamente a cunha/trava-rodas nas rodas traseiras do caminhão estacionado para impedir qualquer movimentação acidental.</li>
    <li><strong>Passo 3 — Abertura Segura de Baias & Inspeção de Amarração:</strong> Levantar as cortinas laterais e verificar se a carga de vasilhame 600ml ou litrão está devidamente fitilhada e sem risco de tombamento no descarregamento.</li>
    <li><strong>Passo 4 — Retirada Física de Paletes na Red Zone:</strong> Com a torre e garfos nivelados, retirar os paletes individualmente e alocá-los na <em>Red Zone</em> para conferência cega. Manter os garfos a 15-20 cm do piso durante o trânsito da empilhadeira.</li>
    <li><strong>Passo 5 — Segregação de Blitz de Refugo:</strong> Se o veículo for sorteado para Blitz diária ou apresentar caixas danificadas, descarregar os paletes diretamente na Área de Aferição de Refugo.</li>
    <li><strong>Passo 6 — Retirada de Calço e Sinalização ao Motorista:</strong> Ao concluir a retirada de 100% dos paletes, retirar a trava-rodas e orientar o motorista a assumir a cabine.</li>
  </ol>

  <div class="danger-box">
    <div class="danger-box-title">🛑 DIRETRIZ CRÍTICA DE MANOBRA (RESPONSABILIDADE EXCLUSIVA DO MOTORISTA):</div>
    <p style="margin: 2px 0; color: #991b1b; font-weight: bold;">
      APÓS O TÉRMINO DO DESCARREGAMENTO, O MOTORISTA É QUEM DEVE MANOBRAR O VEÍCULO PARA O LOCAL DE ESTACIONAMENTO DOS VEÍCULOS.
    </p>
    <p style="margin: 2px 0; color: #7f1d1d; line-height: 1.35;">
      <strong>Regra Inegociável de Logística e Segurança:</strong> O Operador de Empilhadeira é expressamente PROIBIDO de conduzir ou manobrar caminhões da frota. Uma vez retirados os paletes e recolhido o calço, o empilhador sinaliza ao <strong>MOTORISTA</strong> para que este conduza o veículo com segurança até o bolsão de estacionamento do pátio.
    </p>
  </div>

  <div class="footer">
    PAU BRASIL DISTRIBUIDORA AMBEV • POP-LOG-001-AMB • Padrão de Descarregamento e Segurança de Pátio<br/>
    Elaborado por: Djeanderson Soares • Aprovado por: Marcos Guilherme (GOD) • Data de Revisão: 18/07/2026 (Rev. 03) • DPO Ambev
  </div>
</body>
</html>`;

// =========================================================================================
// PADRÃO 2: PADRÃO DE CONFERÊNCIA FÍSICA E BLITZ DE REFUGO (POP-LOG-002)
// =========================================================================================
export const SOP_CONFERENCIA_BLITZ_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POP-LOG-002 - Padrão de Conferência Física & Blitz de Refugo</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="header-logo">
    <div>
      <div class="logo-title">PAU BRASIL</div>
      <div class="logo-subtitle">distribuidora <span class="logo-tag">ambev</span></div>
    </div>
    <div class="doc-code">
      CÓD: POP-LOG-002-AMB<br/>
      REVISÃO: 03 (DATA DE REVISÃO: 18/07/2026)<br/>
      ÁREA: AUDITORIA FÍSICA & CONTROLE DE QUALIDADE
    </div>
  </div>
  
  <h1>POP-LOG-002: PADRÃO DE CONFERÊNCIA FÍSICA DE RETORNO & BLITZ DE REFUGO</h1>
  
  <table class="meta-table">
    <tr>
      <td class="meta-label">Elaborador do Padrão</td>
      <td class="meta-val">Djeanderson Soares — Coordenador de Armazém</td>
      <td class="meta-label">Data de Elaboração</td>
      <td class="meta-val">18/07/2026</td>
    </tr>
    <tr>
      <td class="meta-label">Aprovador do Padrão</td>
      <td class="meta-val">Marcos Guilherme — GOD (Gerente de Operações)</td>
      <td class="meta-label">Data de Revisão</td>
      <td class="meta-val" style="color: #0f35a9; font-weight: 800;">18/07/2026 (Rev. 03)</td>
    </tr>
    <tr>
      <td class="meta-label">Escopo & Aplicação</td>
      <td class="meta-val">Conferentes de Retorno, Empilhadores e Motoristas</td>
      <td class="meta-label">Status do Documento</td>
      <td class="meta-val" style="color: #10b981; font-weight: bold;">✓ Aprovado e Vigente (DPO Ambev)</td>
    </tr>
  </table>

  <h2>1. OBJETIVO DO PADRÃO</h2>
  <p>
    Normatizar e padronizar a <strong>Conferência Física Cega</strong> de retornos de rota realizada pelo <strong>Conferente</strong>, 
    assegurando a auditoria rigorosa de produtos acabados (PA), vasilhames de vidro retornáveis (600ml e litrão), caixas plásticas, barris de chopp e paletes PBR, 
    bem como a execução diária e circular da <strong>Blitz de Refugo</strong> para garantir acurácia de estoque superior a 99.2% e qualidade Ambev.
  </p>

  <h2>2. METAS OPERACIONAIS DPO DA CONFERÊNCIA & BLITZ</h2>
  <div class="targets-grid">
    <div class="target-card">
      <div class="target-val">≥ 99.2%</div>
      <div class="target-lbl">Acurácia Física (IRA)</div>
      <div class="target-sub">Conferência 100% cega</div>
    </div>
    <div class="target-card">
      <div class="target-val">2 Veículos</div>
      <div class="target-lbl">Blitz Diária</div>
      <div class="target-sub">Sorteio circular automatizado</div>
    </div>
    <div class="target-card">
      <div class="target-val">&lt; 3 min</div>
      <div class="target-lbl">Tempo / Palete</div>
      <div class="target-sub">Contagem rápida na Red Zone</div>
    </div>
    <div class="target-card">
      <div class="target-val">100%</div>
      <div class="target-lbl">Auditoria Fotográfica</div>
      <div class="target-sub">Fotos de cascos trincados/concorrência</div>
    </div>
  </div>

  <h2>3. FLUXOGRAMA VISUAL DO PROCESSO DE CONFERÊNCIA & BLITZ</h2>
  <div class="flow-wrapper">
    <div class="flow-title">➔ Sequência Cronológica da Conferência e Auditoria de Refugo</div>
    <div class="flow-chain">
      <div class="flow-step-box flow-step-start">
        <div>
          <span class="flow-tag flow-tag-start">Etapa 1 • Início</span>
          <div class="flow-step-title">Recepção Red Zone</div>
          <div class="flow-step-desc">Paletes alocados na baia demarcada; início sem dados fiscais.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 2</span>
          <div class="flow-step-title">Contagem Cega PA</div>
          <div class="flow-step-desc">Auditoria por SKU de latas, garrafas one-way e caixas fechadas.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 3</span>
          <div class="flow-step-title">Auditoria Ativos Giro</div>
          <div class="flow-step-desc">Vasilhames 600ml, Litrão, CX600, CX Litro, Paletes e Barris.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 4</span>
          <div class="flow-step-title">Blitz de Refugo (2 Carros)</div>
          <div class="flow-step-desc">Rebatimento de 50 caixas/palete e fotos obrigatórias.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-end">
        <div>
          <span class="flow-tag flow-tag-end">Etapa 5 • Fim</span>
          <div class="flow-step-title">Transmissão Sistema</div>
          <div class="flow-step-desc">Lançamento no app; se houver divergência, dispara reconferência.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>
    </div>
  </div>

  <h2>4. MATRIZ DE RESPONSABILIDADES RACI (CONFERÊNCIA & BLITZ)</h2>
  <table class="raci-table">
    <thead>
      <tr>
        <th>Atividade Operacional</th>
        <th>Conferente</th>
        <th>Motorista</th>
        <th>Empilhador</th>
        <th>Aux. Armazém</th>
        <th>Coord. Logística</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="activity">Conferência Física Cega dos Retornos (Red Zone)</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Contagem de Vasilhames, Engradados, Paletes e Barris</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Execução da Blitz de Refugo Diária (2 Carros / Dia)</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Rebatimento Caixa a Caixa de Refugo e Coleta de Fotos</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Digitação e Transmissão dos Dados Físicos p/ Sistema</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Reconferência Física em caso de Divergência Apontada</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
    </tbody>
  </table>

  <h2>5. DESCRIÇÃO DETALHADA DO PROCESSO DE CONFERÊNCIA</h2>
  <ol>
    <li><strong>Passo 1 — Recepção na Red Zone:</strong> O conferente recebe os paletes descarregados na Red Zone e inicia a contagem sem acesso prévio aos números faturados (conferência 100% cega).</li>
    <li><strong>Passo 2 — Aferição de Produtos Acabados (PA):</strong> Contagem por SKU de latas, garrafas one-way, PETs e caixas fechadas de retorno, verificando integridade física e data de validade.</li>
    <li><strong>Passo 3 — Auditoria de Ativos de Giro (AG):</strong> Contagem física exata de Caixas Plásticas (CX600, CX Litro), Vasilhames retornáveis de 600ml e Litrão, Paletes PBR e Barris de Chopp retornados.</li>
    <li><strong>Passo 4 — Lançamento Mobile / Desktop:</strong> O conferente insere as contagens na plataforma. Em caso de divergência contra o faturado, o sistema abre chamado automático de Reconferência.</li>
    <li><strong>Passo 5 — Processamento da Blitz de Refugo:</strong> Nos 2 veículos sorteados pelo algoritmo circular:
      <ul>
        <li>Rebater 100% das 50 caixas de cada palete de vasilhame.</li>
        <li>Segregar garrafas trincadas, cascos de marcas concorrentes (refugo de mercado), garrafas sujas com óleo ou resíduos sólidos.</li>
        <li>Registrar fotos obrigatórias das anomalias na plataforma e apontar a quantidade total de garrafas refugadas.</li>
      </ul>
    </li>
  </ol>

  <div class="rule-box">
    <div class="rule-box-title">🚨 DIRETRIZ DA BLITZ DE REFUGO (2 VEÍCULOS POR DIA CIRCULAR)</div>
    <p style="margin: 2px 0; color: #78350f; line-height: 1.35;">
      O sorteio de Blitz é 100% automatizado e circular: todos os motoristas da frota são auditados em ciclo contínuo antes de qualquer repetição, eliminando qualquer viés ou favoritismo na fiscalização de refugo.
    </p>
  </div>

  <div class="footer">
    PAU BRASIL DISTRIBUIDORA AMBEV • POP-LOG-002-AMB • Padrão de Conferência Física e Blitz de Refugo<br/>
    Elaborado por: Djeanderson Soares • Aprovado por: Marcos Guilherme (GOD) • Data de Revisão: 18/07/2026 (Rev. 03) • DPO Ambev
  </div>
</body>
</html>`;

// =========================================================================================
// PADRÃO 3: PADRÃO DE DEVOLUÇÕES DE ROTA E TRATATIVAS (POP-LOG-003)
// =========================================================================================
export const SOP_DEVOLUCOES_FISCAL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POP-LOG-003 - Padrão de Devoluções de Rota, Fiscal & Tratativas</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="header-logo">
    <div>
      <div class="logo-title">PAU BRASIL</div>
      <div class="logo-subtitle">distribuidora <span class="logo-tag">ambev</span></div>
    </div>
    <div class="doc-code">
      CÓD: POP-LOG-003-AMB<br/>
      REVISÃO: 03 (DATA DE REVISÃO: 18/07/2026)<br/>
      ÁREA: RETORNO DE ROTA, FISCAL & MONITORAMENTO
    </div>
  </div>
  
  <h1>POP-LOG-003: PADRÃO DE DEVOLUÇÕES DE ROTA, RECONCILIAÇÃO PROMAX & TRATATIVAS COM MONITORAMENTO</h1>
  
  <table class="meta-table">
    <tr>
      <td class="meta-label">Elaborador do Padrão</td>
      <td class="meta-val">Djeanderson Soares — Coordenador de Armazém</td>
      <td class="meta-label">Data de Elaboração</td>
      <td class="meta-val">18/07/2026</td>
    </tr>
    <tr>
      <td class="meta-label">Aprovador do Padrão</td>
      <td class="meta-val">Marcos Guilherme — GOD (Gerente de Operações)</td>
      <td class="meta-label">Data de Revisão</td>
      <td class="meta-val" style="color: #0f35a9; font-weight: 800;">18/07/2026 (Rev. 03)</td>
    </tr>
    <tr>
      <td class="meta-label">Escopo & Aplicação</td>
      <td class="meta-val">Auxiliares de Armazém, Faturamento, Monitoramento e Motoristas</td>
      <td class="meta-label">Status do Documento</td>
      <td class="meta-val" style="color: #10b981; font-weight: bold;">✓ Aprovado e Vigente (DPO Ambev)</td>
    </tr>
  </table>

  <h2>1. OBJETIVO DO PADRÃO</h2>
  <p>
    Normatizar e padronizar o fluxo de recebimento e conferência de devoluções de rota, conciliação fiscal no sistema Promax pela <strong>Auxiliar de Armazém</strong>, 
    gestão de vales eletrônicos de débito por faltas sob responsabilidade do motorista e regularização célere de sobras físicas junto ao <strong>Setor de Monitoramento</strong>.
  </p>

  <h2>2. METAS OPERACIONAIS DPO DE DEVOLUÇÕES & TRATATIVAS</h2>
  <div class="targets-grid">
    <div class="target-card">
      <div class="target-val">&lt; 11:30h</div>
      <div class="target-lbl">Fechamento Promax 05.01</div>
      <div class="target-sub">100% das rotas digitadas</div>
    </div>
    <div class="target-card">
      <div class="target-val">100%</div>
      <div class="target-lbl">Tratativa de Sobras</div>
      <div class="target-sub">91% PA e 98% AG regularizados</div>
    </div>
    <div class="target-card">
      <div class="target-val">&lt; 15 min</div>
      <div class="target-lbl">Emissão de Vale de Falta</div>
      <div class="target-sub">Geração pós-reconferência</div>
    </div>
    <div class="target-card">
      <div class="target-val">ZERO</div>
      <div class="target-lbl">Passivo Fiscal Aberto</div>
      <div class="target-sub">Painel 100% saneado e limpo</div>
    </div>
  </div>

  <h2>3. FLUXOGRAMA VISUAL DO PROCESSO FISCAL & TRATATIVAS</h2>
  <div class="flow-wrapper">
    <div class="flow-title">➔ Sequência Cronológica de Devoluções, Promax e Tratativas</div>
    <div class="flow-chain">
      <div class="flow-step-box flow-step-start">
        <div>
          <span class="flow-tag flow-tag-start">Etapa 1 • Início</span>
          <div class="flow-step-title">Triagem Guarita</div>
          <div class="flow-step-desc">Motorista apresenta NFs com carimbo e motivo de recusa.</div>
        </div>
        <div class="flow-step-resp">Resp: Motorista / Auxiliar</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 2</span>
          <div class="flow-step-title">Promax 03.03.02</div>
          <div class="flow-step-desc">Consulta de itens faturados e carregados pela manhã.</div>
        </div>
        <div class="flow-step-resp">Resp: Aux. Armazém</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">Etapa 3</span>
          <div class="flow-step-title">Promax 05.01 Zerado</div>
          <div class="flow-step-desc">Digitação cega manual dos itens retornados fisicamente.</div>
        </div>
        <div class="flow-step-resp">Resp: Aux. Armazém</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-alert">
        <div>
          <span class="flow-tag flow-tag-alert">Etapa 4 • Sobras</span>
          <div class="flow-step-title">Tratativa Monitoramento</div>
          <div class="flow-step-desc">Regularização 91% PA e 98% AG para sanear sobras.</div>
        </div>
        <div class="flow-step-resp">Resp: Auxiliar / Monit.</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-end">
        <div>
          <span class="flow-tag flow-tag-end">Etapa 5 • Fim</span>
          <div class="flow-step-title">Vales de Faltas</div>
          <div class="flow-step-desc">Emissão formal de Vale Eletrônico com ciência do motorista.</div>
        </div>
        <div class="flow-step-resp">Resp: Aux. Armazém</div>
      </div>
    </div>
  </div>

  <h2>4. TRATATIVAS DETALHADAS DE SOBRAS E FALTAS</h2>
  <div class="treatment-container">
    <div class="treatment-sobras">
      <div class="treatment-head-sobra">🟢 TRATATIVA DE SOBRAS FÍSICAS (91% PA & 98% AG)</div>
      <p><strong>Origem da Sobra:</strong> Inversão de produto em rota, pedido suspenso após faturamento, ou vasilhames/caixas recolhidos a mais em clientes.</p>
      <p><strong>Fluxo com Monitoramento:</strong> A Auxiliar aciona o Setor de Monitoramento para conferir a telemetria da rota e registrar o acerto operacional.</p>
      <p><strong>Baixa no Promax:</strong> Lançamento dos saldos regularizados para que o estoque real bata com o virtual, mantendo o painel 100% limpo.</p>
    </div>

    <div class="treatment-faltas">
      <div class="treatment-head-falta">🔴 TRATATIVA DE FALTAS FÍSICAS (VALES ELETRÔNICOS)</div>
      <p><strong>Responsabilidade Matinal:</strong> O motorista é o responsável exclusivo pela carga expedida pela manhã após conferência na saída.</p>
      <p><strong>Reconferência Cega:</strong> Havendo falta física, dispara-se imediatamente a reconferência cega com o conferente e motorista presentes.</p>
      <p><strong>Emissão do Vale:</strong> Persistindo a falta, o sistema emite o Vale Eletrônico com precificação oficial Ambev para desconto formal em folha.</p>
    </div>
  </div>

  <h2>5. MATRIZ DE RESPONSABILIDADES RACI (DEVOLUÇÕES, PROMAX & MONITORAMENTO)</h2>
  <table class="raci-table">
    <thead>
      <tr>
        <th>Atividade Operacional</th>
        <th>Aux. Armazém</th>
        <th>Motorista</th>
        <th>Conferente</th>
        <th>Setor Monit.</th>
        <th>Coord. Logística</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="activity">Sinalização de Devoluções na Entrada da Guarita</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td class="activity">Apresentação de NFs de Devolução com Motivo de Recusa</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Consulta de Carga Faturada no Promax (Rotina 03.03.02)</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Lançamento de Retorno no Promax 05.01 (Iniciando ZERADO)</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Tratativa de 91% PA e 98% AG com Setor de Monitoramento</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Emissão de Vale de Débito p/ Faltas Físicas de Rota</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    PAU BRASIL DISTRIBUIDORA AMBEV • POP-LOG-003-AMB • Padrão de Devoluções de Rota, Fiscal & Tratativas<br/>
    Elaborado por: Djeanderson Soares • Aprovado por: Marcos Guilherme (GOD) • Data de Revisão: 18/07/2026 (Rev. 03) • DPO Ambev
  </div>
</body>
</html>`;

// =========================================================================================
// PADRÃO 4: PADRÃO GERAL CONSOLIDADO (POP-LOG-004 - MANUAL COMPLETO DE PONTA A PONTA)
// =========================================================================================
export const DEFAULT_MANUAL_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>POP-LOG-004 - Padrão Consolidado de Retorno de Rota Pau Brasil</title>
  <style>
    ${BASE_CSS}
  </style>
</head>
<body>
  <div class="header-logo">
    <div>
      <div class="logo-title">PAU BRASIL</div>
      <div class="logo-subtitle">distribuidora <span class="logo-tag">ambev</span></div>
    </div>
    <div class="doc-code">
      CÓD: POP-LOG-004-AMB<br/>
      REVISÃO: 03 (DATA DE REVISÃO: 18/07/2026)<br/>
      ÁREA: RETORNO DE ROTA & CONTROLE INTEGRADO
    </div>
  </div>
  
  <h1>POP-LOG-004: PADRÃO GERAL CONSOLIDADO DE OPERAÇÃO DE RETORNO DE ROTA & CONCILIAÇÃO</h1>
  
  <table class="meta-table">
    <tr>
      <td class="meta-label">Elaborador do Padrão</td>
      <td class="meta-val">Djeanderson Soares — Coordenador de Armazém</td>
      <td class="meta-label">Data de Elaboração</td>
      <td class="meta-val">18/07/2026</td>
    </tr>
    <tr>
      <td class="meta-label">Aprovador do Padrão</td>
      <td class="meta-val">Marcos Guilherme — GOD (Gerente de Operações)</td>
      <td class="meta-label">Data de Revisão</td>
      <td class="meta-val" style="color: #0f35a9; font-weight: 800;">18/07/2026 (Rev. 03)</td>
    </tr>
    <tr>
      <td class="meta-label">Escopo Geral</td>
      <td class="meta-val">Operação Integrada de Pátio, Conferência, Fiscal e Monitoramento</td>
      <td class="meta-label">Status do Documento</td>
      <td class="meta-val" style="color: #10b981; font-weight: bold;">✓ Aprovado, Vigente e Auditado (DPO Ambev)</td>
    </tr>
  </table>

  <h2>1. OBJETIVO GERAL DO PADRÃO CONSOLIDADO</h2>
  <p>
    O presente Procedimento Operacional Padrão Consolidado (POP-LOG-004) unifica e integra de ponta a ponta todos os 3 procedimentos operacionais da Revenda Pau Brasil Distribuidora:
    <strong>(1) Descarregamento Seguro no Pátio (POP-LOG-001)</strong>, 
    <strong>(2) Conferência Física Cega e Blitz de Refugo (POP-LOG-002)</strong>, e 
    <strong>(3) Devoluções de Rota, Reconciliação Promax e Tratativas de Sobras/Faltas com Monitoramento (POP-LOG-003)</strong>.
  </p>

  <h2>2. QUADRO CONSOLIDADO DE METAS OPERACIONAIS DPO</h2>
  <div class="targets-grid">
    <div class="target-card">
      <div class="target-val">&lt; 10:00h</div>
      <div class="target-lbl">Meta EFD Pátio</div>
      <div class="target-sub">100% veículos descarregados</div>
    </div>
    <div class="target-card">
      <div class="target-val">≥ 99.2%</div>
      <div class="target-lbl">Acurácia Física (IRA)</div>
      <div class="target-sub">Conferência 100% cega</div>
    </div>
    <div class="target-card">
      <div class="target-val">&lt; 11:30h</div>
      <div class="target-lbl">Fechamento Promax</div>
      <div class="target-sub">Rotina 05.01 zerada</div>
    </div>
    <div class="target-card">
      <div class="target-val">100%</div>
      <div class="target-lbl">Saneamento Vales/Sobras</div>
      <div class="target-sub">Zero passivos em aberto</div>
    </div>
  </div>

  <h2>3. FLUXOGRAMA MASTER INTEGRADO (DO PRIMEIRO AO ÚLTIMO PROCESSO)</h2>
  <div class="flow-wrapper">
    <div class="flow-title">➔ Fluxo Integrado de Ponta a Ponta: Da Guarita ao Fechamento Fiscal</div>
    <div class="flow-chain">
      <div class="flow-step-box flow-step-start">
        <div>
          <span class="flow-tag flow-tag-start">1 • Ponto de Partida</span>
          <div class="flow-step-title">Guarita & Triagem</div>
          <div class="flow-step-desc">Chegada do caminhão, entrega de NFs e motivo de devolução.</div>
        </div>
        <div class="flow-step-resp">Resp: Motorista / Auxiliar</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">2 • Segurança Pátio</span>
          <div class="flow-step-title">Giro 360º & Calço</div>
          <div class="flow-step-desc">Inspeção física, trava-rodas instalada e abertura de baias.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">3 • Descarregamento</span>
          <div class="flow-step-title">Descarga Red Zone</div>
          <div class="flow-step-desc">Paletes alocados na baia demarcada c/ garfos baixos.</div>
        </div>
        <div class="flow-step-resp">Resp: Empilhador</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-alert">
        <div>
          <span class="flow-tag flow-tag-alert">4 • Manobra</span>
          <div class="flow-step-title">Bolsão Estacionamento</div>
          <div class="flow-step-desc">Motorista manobra caminhão. Empilhador NÃO manobra.</div>
        </div>
        <div class="flow-step-resp" style="color: #991b1b;">Resp: Motorista</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">5 • Auditoria</span>
          <div class="flow-step-title">Conferência Cega</div>
          <div class="flow-step-desc">Contagem cega de vasilhames 600/litrão, caixas, barris e PA.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">6 • Qualidade</span>
          <div class="flow-step-title">Blitz Refugo (2 Carros)</div>
          <div class="flow-step-desc">Rebatimento 50 cx/palete, fotos e segregação de avarias.</div>
        </div>
        <div class="flow-step-resp">Resp: Conferente</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-mid">
        <div>
          <span class="flow-tag flow-tag-mid">7 • Conciliação</span>
          <div class="flow-step-title">Promax 05.01 & Sobras</div>
          <div class="flow-step-desc">Digitação cega zerada; tratativa 91% PA/98% AG c/ Monitoramento.</div>
        </div>
        <div class="flow-step-resp">Resp: Auxiliar / Monit.</div>
      </div>

      <div class="flow-arrow-div">➔</div>

      <div class="flow-step-box flow-step-end">
        <div>
          <span class="flow-tag flow-tag-end">8 • Etapa Final</span>
          <div class="flow-step-title">Vales & Baixa Final</div>
          <div class="flow-step-desc">Emissão de vale eletrônico por falta matinal e baixa final.</div>
        </div>
        <div class="flow-step-resp">Resp: Auxiliar / Coord.</div>
      </div>
    </div>
  </div>

  <h2>4. TRATATIVAS COMPLETAS DE SOBRAS E FALTAS DE ROTA</h2>
  <div class="treatment-container">
    <div class="treatment-sobras">
      <div class="treatment-head-sobra">🟢 TRATATIVA INTEGRADA DE SOBRAS (91% PA E 98% AG)</div>
      <p><strong>Identificação na Conferência:</strong> Sempre que a contagem física superar a quantidade faturada de retorno, caracteriza-se sobra física de PA ou AG.</p>
      <p><strong>Acionamento do Monitoramento:</strong> A Auxiliar abre chamado direto com o Setor de Monitoramento para verificar trocas e conferências em clientes.</p>
      <p><strong>Regularização no Promax:</strong> Realização do lançamento compensatório para não manter saldos fantasmas no armazém e garantir acurácia contábil.</p>
    </div>

    <div class="treatment-faltas">
      <div class="treatment-head-falta">🔴 TRATATIVA INTEGRADA DE FALTAS E EMISSÃO DE VALES</div>
      <p><strong>Princípio da Responsabilidade:</strong> O motorista é o único responsável pela carga após conferência matinal na saída da revenda.</p>
      <p><strong>Reconferência Cega Obrigatória:</strong> Diante de falta, é realizada reconferência física imediata acompanhada pelo motorista e conferente.</p>
      <p><strong>Emissão e Desconto do Vale:</strong> Confirmada a falta, o Vale Eletrônico é emitido com valor oficial Ambev, assinado digitalmente e descontado em folha.</p>
    </div>
  </div>

  <h2>5. MATRIZ DE RESPONSABILIDADES RACI INTEGRADA COMPLETA</h2>
  <table class="raci-table">
    <thead>
      <tr>
        <th>Atividade Operacional de Retorno</th>
        <th>Motorista</th>
        <th>Conferente</th>
        <th>Aux. Armazém</th>
        <th>Empilhador</th>
        <th>Coord. Logística</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="activity">Conferência na Expedição Matinal (Saída de Rota)</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Sinalização de Devolução na Guarita e Entrega de NFs</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td>-</td>
        <td>-</td>
      </tr>
      <tr>
        <td class="activity">Giro 360º, Calço de Rodas e Abertura de Baias</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Retirada Física dos Paletes c/ Empilhadeira (Red Zone)</td>
        <td>-</td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr style="background: #fff1f2;">
        <td class="activity">Manobra do Caminhão pós-Descarga p/ Estacionamento</td>
        <td><span class="raci-badge raci-r">R</span> (Exclusivo)</td>
        <td>-</td>
        <td>-</td>
        <td><strong>PROIBIDO</strong></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Conferência Física Cega de Vasilhames e PA</td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Execução de Blitz de Refugo Diária (2 Veículos/Dia Circular)</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-c">C</span></td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Rebatimento 100% de Caixas de Refugo e Coleta de Fotos</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Consulta Promax 03.03.02 e Conciliação Promax 05.01 Zerado</td>
        <td>-</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Tratativas de Sobras (91% PA / 98% AG) c/ Setor Monitoramento</td>
        <td>-</td>
        <td>-</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
      <tr>
        <td class="activity">Emissão e Formalização Eletrônica de Vales de Débito</td>
        <td><span class="raci-badge raci-i">I</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-r">R</span></td>
        <td>-</td>
        <td><span class="raci-badge raci-a">A</span></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    PAU BRASIL DISTRIBUIDORA AMBEV • POP-LOG-004-AMB • Manual Geral Consolidado de Retorno de Rota<br/>
    Elaborado por: Djeanderson Soares • Aprovado por: Marcos Guilherme (GOD) • Data de Revisão: 18/07/2026 (Rev. 03) • DPO Ambev
  </div>
</body>
</html>`;
