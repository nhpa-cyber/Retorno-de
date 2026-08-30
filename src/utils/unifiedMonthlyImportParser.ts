import * as XLSX from 'xlsx';
import { AuditSession, AuditRefugo, AuditAssetItem, Driver, ImportedRoute } from '../types';
import { isUnloadedBefore10AM, isUnloadedBefore14PM, isUnloadedBefore22PM, getAssignedEmpilhador, normalizeDateString, normalizeTimeString, normalizeDepartureTime } from './efdCalculations';

export interface UnifiedRefugoDetail {
  data: string;
  mes: string;
  mapa: string;
  placa: string;
  codMotorista: string;
  nomeMotorista: string;
  tipo: string;
  ativo: string;
  assetId: string;
  totalAferidoMedia: number;
  quebrada: number;
  segunda: number;
  bicadaInterna: number;
  bicadaExterna: number;
  corForaPadrao: number;
  faltante: number;
  logomarcaEstranha: number;
  rotuloPlastico: number;
  sujidadeInterna: number;
  sujidadeExterna: number;
  tampada: number;
  trincada: number;
  totalRefugo: number;
  pctRefugo: string;
}

export interface UnifiedMonthlyRecord {
  id: string;
  dataDescarregamento: string; // YYYY-MM-DD
  mapa: string;
  veiculo: string;
  horarioDescarregamento: string; // HH:mm
  quantidadePalletsDescarregados: number;
  colaboradorDescarregamento: string; // José Ronildo, Marivaldo, etc.
  statusDescarregamento: string;
  isPernoite: boolean;
  dayCycleStage: 'D1' | 'D2' | 'D3' | 'D4';
  diffDays: number;
  unloadedBefore10: boolean; // Evaluates <= 22:00
  efdHit: boolean;

  // Detalhes da Viagem e Rota
  dataSaida?: string;
  horarioSaida?: string;
  dataHoraSaida?: string;
  dataChegada?: string;
  horarioChegada?: string;
  dataHoraChegada?: string;
  tipoRetorno?: string; // "D0", "D1", "D2", "D3", "D4"
  diasFora?: number;
  retornouMesmoDia?: boolean;
  origemDataSaida?: string;
  origemDataChegada?: string;
  chaveViagem?: string;

  codMotorista?: string;
  nomeMotorista?: string;
  indiceRefugo?: {
    registrosAssetIndex: number;
    totalAferidoMedia: number;
    totalRefugo: number;
    pctRefugo: string;
    detalhes: UnifiedRefugoDetail[];
  };
  mesRef?: string; // ex: "FEB", "02", "2026-02"
}

export interface ProcessedMonthlyData {
  monthKey: string; // ex: "2026-02"
  monthName: string; // ex: "Fevereiro / 2026"
  records: UnifiedMonthlyRecord[];
  totalMaps: number;
  totalPallets: number;
  totalVolumeAferido: number;
  totalRefugoPcs: number;
  averageRefugoPct: number;
  efdPercentage: number;
  efdBefore10Count: number;
  efdAfter10Count: number;
  pernoiteCount: number;
  d1Count: number;
  d2Count: number;
  d3Count: number;
  d4Count: number;
  collaborators: { name: string; count: number; before10: number; efdRate: number }[];
  auditsToSave: AuditSession[];
  routesToSave: ImportedRoute[];
  newDriversToSave: Driver[];
}

// Helper to convert month codes to readable name
export const MONTH_NAMES_PT: Record<string, string> = {
  '01': 'Janeiro',
  '02': 'Fevereiro',
  '03': 'Março',
  '04': 'Abril',
  '05': 'Maio',
  '06': 'Junho',
  '07': 'Julho',
  '08': 'Agosto',
  '09': 'Setembro',
  '10': 'Outubro',
  '11': 'Novembro',
  '12': 'Dezembro',
  'JAN': 'Janeiro',
  'FEB': 'Fevereiro',
  'MAR': 'Março',
  'APR': 'Abril',
  'MAY': 'Maio',
  'JUN': 'Junho',
  'JUL': 'Julho',
  'AUG': 'Agosto',
  'SEP': 'Setembro',
  'OCT': 'Outubro',
  'NOV': 'Novembro',
  'DEC': 'Dezembro'
};

/**
 * Parse any file (JSON array, Excel .xlsx, .xls, .csv, .txt) into UnifiedMonthlyRecord[]
 */
export async function parseUnifiedMonthlyFile(
  fileOrContent: File | string | any[],
  existingDrivers: Driver[] = []
): Promise<UnifiedMonthlyRecord[]> {
  let rawData: any[] = [];

  if (Array.isArray(fileOrContent)) {
    rawData = fileOrContent;
  } else if (typeof fileOrContent === 'string') {
    const trimmed = fileOrContent.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        rawData = JSON.parse(trimmed);
      } catch {
        rawData = [];
      }
    }
  } else if (fileOrContent instanceof File) {
    const fileName = fileOrContent.name.toLowerCase();
    if (fileName.endsWith('.json')) {
      const text = await fileOrContent.text();
      const parsed = JSON.parse(text);
      rawData = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || [parsed]);
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const buffer = await fileOrContent.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      // Look for sheet named "Import_Refugo_Rota" or the first sheet
      const sheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('refugo') || s.toLowerCase().includes('viagem') || s.toLowerCase().includes('efd')) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const sheetRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      rawData = convertExcelSheetToUnified(sheetRows);
    } else {
      // CSV or text
      const text = await fileOrContent.text();
      if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
        try {
          rawData = JSON.parse(text.trim());
        } catch {}
      }
      if (!rawData || rawData.length === 0) {
        // Parse CSV
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          const delimiter = lines[0].includes(';') ? ';' : (lines[0].includes('\t') ? '\t' : ',');
          const headers = lines[0].split(delimiter).map(h => h.trim());
          const rows: any[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(delimiter).map(c => c.trim());
            const rowObj: any = {};
            headers.forEach((h, idx) => {
              rowObj[h] = cells[idx] || '';
            });
            rows.push(rowObj);
          }
          rawData = convertExcelSheetToUnified(rows);
        }
      }
    }
  }

  if (!rawData || rawData.length === 0) {
    return [];
  }

  // Parse structured array into UnifiedMonthlyRecord
  const results: UnifiedMonthlyRecord[] = [];

  rawData.forEach((item, index) => {
    // 1. Extract unloading / EFD properties
    const dataDescarregamentoRaw = String(item.data_descarregamento || item.dataDescarregamento || item.DATA || item.data || '').trim();
    const dataDescarregamento = normalizeDateString(dataDescarregamentoRaw) || new Date().toISOString().split('T')[0];
    
    const mapa = String(item.mapa || item.MAPA || item.routeMap || item.numero_mapa || '').trim();
    const veiculo = String(item.veiculo || item.veículo || item.PLACA || item.placa || item.plate || '').trim().toUpperCase();
    
    const horarioDescarregamentoRaw = String(item.horario_descarregamento || item.horário_descarregamento || item.horarioDescarregamento || item.hora_chegada || item.horaChegada || '').trim();
    const horarioDescarregamento = normalizeTimeString(horarioDescarregamentoRaw) || '17:00';
    
    const quantidadePallets = Number(item.quantidade_pallets_descarregados ?? item.quantidadePalletsDescarregados ?? item.pallets ?? 8);
    const rawColaborador = String(item.colaborador_descarregamento || item.colaboradorDescarregamento || item.colaborador || item.empilhador || '').trim();
    const colaborador = getAssignedEmpilhador(horarioDescarregamento, rawColaborador);
    const statusDescarregamento = String(item.status_descarregamento || item.statusDescarregamento || 'Descarregado').trim();
    
    const unloadedUntil22 = isUnloadedBefore22PM(horarioDescarregamento);

    // Extract journey details
    const dataSaidaRaw = String(item.data_saida || item.dataSaida || '').trim();
    const dataSaida = dataSaidaRaw ? (normalizeDateString(dataSaidaRaw) || dataSaidaRaw) : dataDescarregamento;
    const horarioSaidaRaw = String(item.horario_saida || item.horarioSaida || item.hora_saida || '').trim();
    const horarioSaida = normalizeDepartureTime(horarioSaidaRaw, `${mapa}_${veiculo}`);
    const dataHoraSaida = item.data_hora_saida || item.dataHoraSaida || (dataSaida && horarioSaida ? `${dataSaida}T${horarioSaida}:00` : undefined);

    const dataChegadaRaw = String(item.data_chegada || item.dataChegada || '').trim();
    const dataChegada = dataChegadaRaw ? (normalizeDateString(dataChegadaRaw) || dataChegadaRaw) : dataDescarregamento;
    const horarioChegadaRaw = String(item.horario_chegada || item.horarioChegada || item.hora_chegada || horarioDescarregamento).trim();
    const horarioChegada = normalizeTimeString(horarioChegadaRaw) || horarioDescarregamento;
    const dataHoraChegada = item.data_hora_chegada || item.dataHoraChegada || (dataChegada && horarioChegada ? `${dataChegada}T${horarioChegada}:00` : undefined);

    const tipoRetorno = String(item.tipo_retorno || item.tipoRetorno || '').trim().toUpperCase();
    const diasFora = item.dias_fora !== undefined ? Number(item.dias_fora) : (item.diasFora !== undefined ? Number(item.diasFora) : undefined);
    const retornouMesmoDia = item.retornou_mesmo_dia !== undefined ? !!item.retornou_mesmo_dia : (item.retornouMesmoDia !== undefined ? !!item.retornouMesmoDia : (diasFora === 0 || tipoRetorno === 'D0' || (dataSaida && dataChegada && dataSaida === dataChegada)));
    const origemDataSaida = item.origem_data_saida || item.origemDataSaida || 'Saida Cdd/Fab';
    const origemDataChegada = item.origem_data_chegada || item.origemDataChegada || 'PC_Financeira';
    const chaveViagem = item.chave_viagem || item.chaveViagem || `${dataSaida}_${dataChegada}_${mapa}_${veiculo}`;

    // Calculate diffDays and dayCycleStage
    // Regras: D0 / mesmo dia = D1; pernoite manual = D1; pernoite D4 = D1
    let dayCycleStage: 'D1' | 'D2' | 'D3' | 'D4' = 'D1';
    let diffDays = diasFora !== undefined ? diasFora : 0;
    let isPernoite = !!(item.isPernoite || item.pernoite === 'SIM' || item.pernoite === 'sim' || item.pernoite === true || item.pernoite === 1 || item.pernoite === '1');

    if (tipoRetorno === 'D0' || diasFora === 0 || retornouMesmoDia === true || (dataSaida && dataChegada && dataSaida === dataChegada)) {
      dayCycleStage = 'D1';
      diffDays = 0;
    } else if (tipoRetorno === 'D1' || diasFora === 1) {
      dayCycleStage = 'D1';
      diffDays = 1;
    } else if (tipoRetorno === 'D2' || diasFora === 2) {
      dayCycleStage = isPernoite ? 'D1' : 'D2';
      diffDays = 2;
    } else if (tipoRetorno === 'D3' || diasFora === 3) {
      dayCycleStage = isPernoite ? 'D1' : 'D3';
      diffDays = 3;
    } else if (tipoRetorno === 'D4' || (diasFora !== undefined && diasFora >= 4)) {
      // Regra: pernoites D4 devem ser convertidos em D1
      dayCycleStage = isPernoite ? 'D1' : 'D4';
      diffDays = diasFora || 4;
    } else if (dataSaida && dataChegada) {
      try {
        const depT = new Date(`${dataSaida}T00:00:00`).getTime();
        const arrT = new Date(`${dataChegada}T00:00:00`).getTime();
        diffDays = Math.round((arrT - depT) / (1000 * 60 * 60 * 24));
        if (diffDays <= 1) dayCycleStage = 'D1';
        else if (diffDays === 2) dayCycleStage = isPernoite ? 'D1' : 'D2';
        else if (diffDays === 3) dayCycleStage = isPernoite ? 'D1' : 'D3';
        else dayCycleStage = isPernoite ? 'D1' : 'D4';
      } catch {
        dayCycleStage = 'D1';
      }
    } else {
      dayCycleStage = 'D1';
    }

    // Regra adicional: se for pernoite, converter qualquer D4 em D1
    if (isPernoite || (dayCycleStage as any) === 'D4' && isPernoite) {
      dayCycleStage = 'D1';
    }

    const efdHit = isPernoite || unloadedUntil22;

    // 2. Extract Refugo & Defect details
    let codMotorista = '';
    let nomeMotorista = '';
    let detalhesList: UnifiedRefugoDetail[] = [];
    let registrosAssetIndex = 0;
    let totalAferidoMedia = 0;
    let totalRefugo = 0;
    let pctRefugo = '0,000%';
    let mesRef = '';

    if (totalAferidoMedia > 0) {
      const rawPct = (totalRefugo / totalAferidoMedia) * 100;
      const treatedPct = rawPct * 0.77; // Redução de 23% solicitada pelo usuário (Fator 0,77)
      pctRefugo = `${(treatedPct || 0).toFixed(3).replace('.', ',')}%`;
    }

    if (item.indice_refugo || item.indiceRefugo) {
      const refugoObj = item.indice_refugo || item.indiceRefugo;
      registrosAssetIndex = Number(refugoObj.registros_asset_index ?? refugoObj.registrosAssetIndex ?? 0);
      totalAferidoMedia = Number(refugoObj.total_aferido_media ?? refugoObj.totalAferidoMedia ?? 0);
      totalRefugo = Number(refugoObj.total_refugo ?? refugoObj.totalRefugo ?? 0);
      
      if (totalAferidoMedia > 0) {
        const rawPct = (totalRefugo / totalAferidoMedia) * 100;
        const treatedPct = rawPct * 0.77;
        pctRefugo = `${(treatedPct || 0).toFixed(3).replace('.', ',')}%`;
      } else {
        pctRefugo = String(refugoObj.pct_refugo ?? refugoObj.pctRefugo ?? '0,000%');
      }

      if (Array.isArray(refugoObj.detalhes)) {
        detalhesList = refugoObj.detalhes.map((d: any) => {
          const detailMes = String(d.MES || d.mes || '').trim();
          if (detailMes && !mesRef) mesRef = detailMes;
          
          const detailCodMot = String(d['COD MOTORISTA'] || d.codMotorista || d.cod_motorista || '').trim();
          const detailNomeMot = String(d['NOME MOTORISTA'] || d.nomeMotorista || d.nome_motorista || '').trim();
          if (detailCodMot && !codMotorista) codMotorista = detailCodMot;
          if (detailNomeMot && !nomeMotorista) nomeMotorista = detailNomeMot;

          return {
            data: normalizeDateString(d.DATA || d.data || dataDescarregamento),
            mes: detailMes || 'FEB',
            mapa: String(d.MAPA || d.mapa || mapa).trim(),
            placa: String(d.PLACA || d.placa || veiculo).trim().toUpperCase(),
            codMotorista: detailCodMot,
            nomeMotorista: detailNomeMot,
            tipo: String(d.TIPO || d.tipo || ''),
            ativo: String(d.ATIVO || d.ativo || ''),
            assetId: String(d['ASSET ID'] || d.assetId || d.asset_id || ''),
            totalAferidoMedia: Number(d['TOTAL AFERIDO MEDIA'] ?? d.totalAferidoMedia ?? 0),
            quebrada: Number(d.QUEBRADA ?? d.quebrada ?? 0),
            segunda: Number(d.SEGUNDA ?? d.segunda ?? 0),
            bicadaInterna: Number(d['BICADA INTERNA'] ?? d.bicadaInterna ?? 0),
            bicadaExterna: Number(d['BICADA EXTERNA'] ?? d.bicadaExterna ?? 0),
            corForaPadrao: Number(d['COR FORA DO PADRÃO'] ?? d['COR FORA DO PADRAO'] ?? d.corForaPadrao ?? 0),
            faltante: Number(d.FALTANTE ?? d.faltante ?? 0),
            logomarcaEstranha: Number(d['LOGOMARCA ESTRANHA'] ?? d.logomarcaEstranha ?? 0),
            rotuloPlastico: Number(d['ROTULO PLASTICO'] ?? d['RÓTULO PLÁSTICO'] ?? d.rotuloPlastico ?? 0),
            sujidadeInterna: Number(d['SUJIDADE INTERNA'] ?? d.sujidadeInterna ?? 0),
            sujidadeExterna: Number(d['SUJIDADE EXTERNA'] ?? d.sujidadeExterna ?? 0),
            tampada: Number(d.TAMPADA ?? d.tampada ?? 0),
            trincada: Number(d.TRINCADA ?? d.trincada ?? 0),
            totalRefugo: Number(d['TOTAL REFUGO'] ?? d.totalRefugo ?? 0),
            pctRefugo: String(d['PCT REFUGO'] ?? d.pctRefugo ?? '0,000%')
          };
        });
      }
    }

    // Determine month ref from dataDescarregamento (ex: "2026-02" -> FEB)
    if (!mesRef && dataDescarregamento) {
      const monthNumber = dataDescarregamento.split('-')[1];
      mesRef = monthNumber || '02';
    }

    results.push({
      id: `unified_record_${mapa || index}_${Date.now()}_${index}`,
      dataDescarregamento,
      mapa: mapa || `MAPA-${index + 1}`,
      veiculo: veiculo || 'N/A',
      horarioDescarregamento,
      quantidadePalletsDescarregados: quantidadePallets,
      colaboradorDescarregamento: colaborador,
      statusDescarregamento,
      isPernoite,
      dayCycleStage,
      diffDays,
      unloadedBefore10: unloadedUntil22,
      efdHit,

      // Detalhes da Viagem
      dataSaida,
      horarioSaida,
      dataHoraSaida,
      dataChegada,
      horarioChegada,
      dataHoraChegada,
      tipoRetorno,
      diasFora,
      retornouMesmoDia,
      origemDataSaida,
      origemDataChegada,
      chaveViagem,

      codMotorista: codMotorista || item.driverId,
      nomeMotorista: nomeMotorista || item.driverName,
      indiceRefugo: {
        registrosAssetIndex: registrosAssetIndex || detalhesList.length,
        totalAferidoMedia,
        totalRefugo,
        pctRefugo,
        detalhes: detalhesList
      },
      mesRef
    });
  });

  return results;
}

/**
 * Converts tabular Excel rows into nested Unified structure
 */
function convertExcelSheetToUnified(rows: any[]): any[] {
  const mapGroups: Record<string, any> = {};

  rows.forEach(row => {
    const mapa = String(row.MAPA || row.mapa || row.Route || row.route || '').trim();
    if (!mapa) return;

    if (!mapGroups[mapa]) {
      mapGroups[mapa] = {
        data_descarregamento: row.DATA || row.data || row.Data_Descarregamento || new Date().toISOString().split('T')[0],
        mapa: mapa,
        veiculo: row.PLACA || row.placa || row.Veiculo || row.veiculo || 'N/A',
        horario_descarregamento: row.HORA_CHEGADA || row.hora_chegada || row.Horario_Descarregamento || '16:00',
        quantidade_pallets_descarregados: Number(row.PALLETS || row.pallets || 10),
        colaborador_descarregamento: row.COLABORADOR || row.colaborador || 'José Ronildo',
        status_descarregamento: 'Descarregado',
        indice_refugo: {
          registros_asset_index: 0,
          total_aferido_media: 0,
          total_refugo: 0,
          pct_refugo: '0,000%',
          detalhes: []
        }
      };
    }

    // Add detail item
    const totalRefugoInRow = Number(row['TOTAL REFUGO'] || row.total_refugo || row.Refugo || 0);
    const totalAferidoInRow = Number(row['TOTAL AFERIDO MEDIA'] || row.total_aferido || row.Volume || 0);

    mapGroups[mapa].indice_refugo.detalhes.push({
      DATA: row.DATA || row.data || mapGroups[mapa].data_descarregamento,
      MES: row.MES || row.mes || 'FEB',
      MAPA: mapa,
      PLACA: mapGroups[mapa].veiculo,
      'COD MOTORISTA': row['COD MOTORISTA'] || row.cod_motorista || '',
      'NOME MOTORISTA': row['NOME MOTORISTA'] || row.nome_motorista || '',
      TIPO: String(row.TIPO || row.tipo || ''),
      ATIVO: String(row.ATIVO || row.ativo || 'GARRAFA 600'),
      'ASSET ID': String(row['ASSET ID'] || row.asset_id || ''),
      'TOTAL AFERIDO MEDIA': totalAferidoInRow,
      QUEBRADA: Number(row.QUEBRADA || row.quebrada || 0),
      SEGUNDA: Number(row.SEGUNDA || row.segunda || 0),
      'BICADA INTERNA': Number(row['BICADA INTERNA'] || row.bicada_interna || 0),
      'BICADA EXTERNA': Number(row['BICADA EXTERNA'] || row.bicada_externa || 0),
      'COR FORA DO PADRÃO': Number(row['COR FORA DO PADRÃO'] || row['COR FORA DO PADRAO'] || 0),
      FALTANTE: Number(row.FALTANTE || row.faltante || 0),
      'LOGOMARCA ESTRANHA': Number(row['LOGOMARCA ESTRANHA'] || row.logomarca_estranha || 0),
      'ROTULO PLASTICO': Number(row['ROTULO PLASTICO'] || row.rotulo_plastico || 0),
      'SUJIDADE INTERNA': Number(row['SUJIDADE INTERNA'] || row.sujidade_interna || 0),
      'SUJIDADE EXTERNA': Number(row['SUJIDADE EXTERNA'] || row.sujidade_externa || 0),
      TAMPADA: Number(row.TAMPADA || row.tampada || 0),
      TRINCADA: Number(row.TRINCADA || row.trincada || 0),
      'TOTAL REFUGO': totalRefugoInRow,
      'PCT REFUGO': String(row['PCT REFUGO'] || row.pct_refugo || '0,000%')
    });

    mapGroups[mapa].indice_refugo.total_aferido_media += totalAferidoInRow;
    mapGroups[mapa].indice_refugo.total_refugo += totalRefugoInRow;
    mapGroups[mapa].indice_refugo.registros_asset_index = mapGroups[mapa].indice_refugo.detalhes.length;
    
    if (mapGroups[mapa].indice_refugo.total_aferido_media > 0) {
      const rawPct = (mapGroups[mapa].indice_refugo.total_refugo / mapGroups[mapa].indice_refugo.total_aferido_media) * 100;
      const treatedPct = rawPct * 0.77; // Redução de 23% solicitada pelo usuário (Fator 0,77)
      mapGroups[mapa].indice_refugo.pct_refugo = `${(treatedPct || 0).toFixed(3).replace('.', ',')}%`;
    }
  });

  return Object.values(mapGroups);
}

/**
 * Process Unified Records into platform ready AuditSessions and ImportedRoutes
 */
export function processUnifiedMonthlyRecords(
  records: UnifiedMonthlyRecord[],
  existingDrivers: Driver[] = [],
  selectedMonthKey: string = '2026-02'
): ProcessedMonthlyData {
  const existingDriverIds = new Set(existingDrivers.map(d => String(d.id).trim().toUpperCase()));
  const missingDriversMap: Record<string, Driver> = {};

  const auditsToSave: AuditSession[] = [];
  const routesToSave: ImportedRoute[] = [];

  let totalVolumeAferido = 0;
  let totalRefugoPcs = 0;
  let efdBefore10Count = 0;
  let efdAfter10Count = 0;
  let pernoiteCount = 0;
  let totalPallets = 0;

  let d1Count = 0;
  let d2Count = 0;
  let d3Count = 0;
  let d4Count = 0;

  const collaboratorMap: Record<string, { total: number; before10: number }> = {};

  records.forEach(rec => {
    totalPallets += rec.quantidadePalletsDescarregados || 0;

    // Colaborador metrics
    const colab = rec.colaboradorDescarregamento || 'José Ronildo';
    if (!collaboratorMap[colab]) {
      collaboratorMap[colab] = { total: 0, before10: 0 };
    }
    collaboratorMap[colab].total++;
    if (rec.unloadedBefore10) {
      collaboratorMap[colab].before10++;
    }

    // EFD metrics
    if (rec.isPernoite) {
      pernoiteCount++;
    } else {
      if (rec.unloadedBefore10) efdBefore10Count++;
      else efdAfter10Count++;
    }

    // Cycles
    if (rec.dayCycleStage === 'D1') d1Count++;
    else if (rec.dayCycleStage === 'D2') d2Count++;
    else if (rec.dayCycleStage === 'D3') d3Count++;
    else d4Count++;

    // Refugo metrics
    const volumeAferidoMap = rec.indiceRefugo?.totalAferidoMedia || 0;
    const refugoPcsMap = rec.indiceRefugo?.totalRefugo || 0;
    totalVolumeAferido += volumeAferidoMap;
    totalRefugoPcs += refugoPcsMap;

    // Driver identification and auto-registration
    let matchedDriverId = 'temporario';
    const rawCod = (rec.codMotorista || '').trim().toUpperCase();
    const rawNome = (rec.nomeMotorista || '').trim();

    if (rawCod && rawCod !== 'NÃO CADASTRADO' && rawCod !== 'NAO CADASTRADO') {
      matchedDriverId = rawCod;
      if (!existingDriverIds.has(rawCod) && !missingDriversMap[rawCod]) {
        const cleanName = (rawNome && rawNome.toUpperCase() !== 'NÃO CADASTRADO' && rawNome.toUpperCase() !== 'NAO CADASTRADO')
          ? rawNome
          : `Motorista ${rawCod}`;

        missingDriversMap[rawCod] = {
          id: rawCod,
          name: cleanName,
          role: 'MOTORISTA',
          cpf: '000.000.000-00',
          isTemporary: false
        };
      }
    } else if (rawNome && rawNome.toUpperCase() !== 'NÃO CADASTRADO' && rawNome.toUpperCase() !== 'NAO CADASTRADO') {
      const found = existingDrivers.find(d => 
        d.name.toUpperCase().includes(rawNome.toUpperCase()) ||
        rawNome.toUpperCase().includes(d.name.toUpperCase())
      );
      if (found) {
        matchedDriverId = found.id;
      } else {
        const generatedId = `G_${rawNome.split(' ')[0].toUpperCase()}_${Date.now().toString().slice(-3)}`;
        matchedDriverId = generatedId;
        if (!missingDriversMap[generatedId]) {
          missingDriversMap[generatedId] = {
            id: generatedId,
            name: rawNome,
            role: 'MOTORISTA',
            cpf: '000.000.000-00',
            isTemporary: true
          };
        }
      }
    }

    // 1. Build ImportedRoute
    routesToSave.push({
      id: `imp_route_${rec.mapa}_${rec.dataDescarregamento}`,
      routeMap: rec.mapa,
      plate: rec.veiculo,
      driverId: matchedDriverId,
      routeDate: rec.dataDescarregamento,
      importedAt: new Date().toISOString(),
      status: 'fechado',
      itemsCount: Math.round(volumeAferidoMap) || 10,
      departureDate: rec.dataSaida || rec.dataDescarregamento,
      departureTime: rec.horarioSaida || normalizeDepartureTime(undefined, rec.mapa),
      arrivalDate: rec.dataChegada || rec.dataDescarregamento,
      arrivalTime: rec.horarioChegada || rec.horarioDescarregamento,
      isPernoite: rec.isPernoite,
      dayCycleStage: rec.dayCycleStage,
      unloadedBefore10: rec.unloadedBefore10,
      efdHit: rec.efdHit
    });

    // 2. Build AuditSession with comprehensive Refugos
    const auditRefugos: AuditRefugo[] = [];
    const auditAssets: AuditAssetItem[] = [];

    if (rec.indiceRefugo?.detalhes && rec.indiceRefugo.detalhes.length > 0) {
      rec.indiceRefugo.detalhes.forEach((det, dIdx) => {
        const assetName = det.ativo || `Ativo Tipo ${det.tipo}`;
        const assetId = det.assetId || `asset_${det.tipo}_${dIdx}`;

        auditAssets.push({
          assetId,
          assetName,
          cost: assetName.includes('GARRAFEIRA') ? 15 : (assetName.includes('PALETE') ? 45 : 2.5),
          physicalQty: Math.round(det.totalAferidoMedia) || 0
        });

        // Add each non-zero defect as AuditRefugo item
        const addDefect = (qty: number, reason: string) => {
          if (qty > 0) {
            auditRefugos.push({
              id: `refugo_${rec.mapa}_${dIdx}_${reason}_${Date.now()}`,
              assetId,
              assetName,
              qty,
              reason
            });
          }
        };

        addDefect(det.quebrada, 'QUEBRADA');
        addDefect(det.segunda, 'SEGUNDA (OUTRAS EMPRESAS)');
        addDefect(det.bicadaInterna, 'BICADA INTERNA');
        addDefect(det.bicadaExterna, 'BICADA EXTERNA');
        addDefect(det.corForaPadrao, 'COLORAÇÃO FORA DO PADRÃO');
        addDefect(det.faltante, 'FALTANTE');
        addDefect(det.logomarcaEstranha, 'LOGOMARCA ESTRANHA');
        addDefect(det.rotuloPlastico, 'RÓTULO PLÁSTICO');
        addDefect(det.sujidadeInterna, 'SUJIDADE INTERNA');
        addDefect(det.sujidadeExterna, 'SUJIDADE EXTERNA');
        addDefect(det.tampada, 'TAMPADA');
        addDefect(det.trincada, 'TRINCADA');
      });
    }

    auditsToSave.push({
      id: `audit_unified_${rec.mapa}_${rec.dataDescarregamento}`,
      routeMap: rec.mapa,
      plate: rec.veiculo,
      driverId: matchedDriverId,
      arrivalDate: rec.dataChegada || rec.dataDescarregamento,
      startTime: rec.dataHoraSaida || (rec.dataSaida && rec.horarioSaida ? `${rec.dataSaida}T${rec.horarioSaida}` : undefined),
      endTime: rec.dataHoraChegada || (rec.dataChegada && rec.horarioChegada ? `${rec.dataChegada}T${rec.horarioChegada}` : undefined),
      status: 'finalizado_ok',
      items: [],
      assets: auditAssets,
      refugos: auditRefugos,
      history: [{
        timestamp: new Date().toISOString(),
        action: 'Importação Unificada Mensal (EFD & Refugo Retroativo)',
        user: rec.colaboradorDescarregamento || 'José Ronildo',
        details: `EFD: ${rec.horarioDescarregamento} (${rec.unloadedBefore10 ? '≤ 22:00' : '> 22:00'}) | Ciclo: ${rec.dayCycleStage}${rec.tipoRetorno ? ` (${rec.tipoRetorno})` : ''} | Saída: ${rec.horarioSaida || 'N/A'} - Chegada: ${rec.horarioChegada || rec.horarioDescarregamento} | Refugo: ${refugoPcsMap} peças (${rec.indiceRefugo?.pctRefugo || '0%'})`
      }],
      isEstimated: true,
      estimatedVolumeHandled: volumeAferidoMap
    });
  });

  const totalEvaluated = efdBefore10Count + efdAfter10Count;
  const efdPercentage = totalEvaluated > 0 ? (efdBefore10Count / totalEvaluated) * 100 : 100;
  const rawAverageRefugoPct = totalVolumeAferido > 0 ? (totalRefugoPcs / totalVolumeAferido) * 100 : 0;
  const averageRefugoPct = rawAverageRefugoPct * 0.77; // Redução de 23% solicitada pelo usuário (Fator 0,77)

  const collaborators = Object.entries(collaboratorMap).map(([name, data]) => ({
    name,
    count: data.total,
    before10: data.before10,
    efdRate: data.total > 0 ? (data.before10 / data.total) * 100 : 0
  }));

  const monthParts = selectedMonthKey.split('-');
  const monthNum = monthParts[1] || '02';
  const year = monthParts[0] || '2026';
  const monthName = `${MONTH_NAMES_PT[monthNum] || 'Mês ' + monthNum} / ${year}`;

  return {
    monthKey: selectedMonthKey,
    monthName,
    records,
    totalMaps: records.length,
    totalPallets,
    totalVolumeAferido,
    totalRefugoPcs,
    averageRefugoPct,
    efdPercentage,
    efdBefore10Count,
    efdAfter10Count,
    pernoiteCount,
    d1Count,
    d2Count,
    d3Count,
    d4Count,
    collaborators,
    auditsToSave,
    routesToSave,
    newDriversToSave: Object.values(missingDriversMap)
  };
}
