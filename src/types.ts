export type UserRole = 'conferente' | 'auxiliar_logistica' | 'gestor' | 'monitoramento' | 'financeiro' | 'empilhador';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  password?: string;
}

export interface Driver {
  id: string;
  name: string;
  role: 'MOTORISTA' | 'AJUDANTE';
  cpf: string;
  isTemporary?: boolean;
}

export interface Product {
  code: string;
  description: string;
  group: string;
  unit: string;
  palletFactor: number;
  skuFactor: number;
  hectoFactor: number;
  cost: number;
  curve: string;
  photoUrl?: string;
}

export interface Vehicle {
  plate: string;
  capacityPallets: number;
  isTemporary?: boolean;
}

export interface ActiveAsset {
  id: string;
  name: string;
  category: 'GARRAFEIRA' | 'GARRAFA' | 'PALETE' | 'OUTRO';
  cost: number;
}

// A return audit represents a vehicle arrival, physical counting, and fiscal comparison
export type AuditStatus = 
  | 'em_aberto'             // Registered, awaiting or currently undergoing physical audit
  | 'conferido_fisico'      // Physical audit done, awaiting fiscal verification
  | 'reconferencia'         // Fiscal checker flagged discrepancies, returned to physical count
  | 'recontagem_finalizada'  // Re-audit completed by physical checker, awaiting final fiscal decision
  | 'finalizado_ok'         // Fiscal check completed, counts matched perfectly
  | 'finalizado_divergente'; // Fiscal check completed, counts had discrepancies, finalized anyway

export interface AuditItem {
  productCode: string;
  productDescription: string;
  cost: number;
  // Blind physical counts
  physicalQty: number;
  // Fiscal target counts (only entered/visible by fiscal user)
  fiscalQty?: number;
  // Second physical count if re-audit was requested
  rePhysicalQty?: number;
  // Original expected spreadsheet quantity
  expectedQty?: number;
  // Treated quantity (quantidades já tratadas/regularizadas)
  treatedQty?: number;
  treatmentNotes?: string;
}

export interface AuditAssetItem {
  assetId: string;
  assetName: string;
  cost: number;
  physicalQty: number;
  fiscalQty?: number;
  rePhysicalQty?: number;
  comodatoQty?: number;
  recolhaQty?: number;
  // Treated quantity (quantidades já tratadas/regularizadas)
  treatedQty?: number;
  treatmentNotes?: string;
}

export interface AuditRefugo {
  id: string;
  assetId: string;
  assetName: string;
  qty: number;
  reason: string;
  photoUrl?: string;
  photoId?: string;
}

export interface AuditSession {
  id: string;
  routeMap: string;         // Mapa da rota
  unifiedMaps?: string[];   // Lista de mapas unificados
  plate: string;            // Placa do veículo
  exchangePlate?: string;   // Placa substituta (Troca de veículo se houver)
  driverId: string;         // Motorista principal
  helperId?: string;        // Ajudante
  arrivalKm?: number;       // KM de chegada
  arrivalDate: string;      // YYYY-MM-DD
  
  // Timing productivity metrics
  startTime?: string;       // ISO string when physical count starts
  endTime?: string;         // ISO string when physical count is completed
  
  status: AuditStatus;
  conferenteId?: string;    // Who did physical audit
  auxiliarId?: string;      // Who did fiscal audit
  
  items: AuditItem[];       // Finished products
  assets: AuditAssetItem[]; // Active assets (Ativos de giro)
  refugos?: AuditRefugo[];  // Refugos dos ativos de giro (Garrafas / Garrafeiras danificadas)
  exchanges?: AuditExchangeItem[]; // Trocas e Reposições de PA
  
  history: {
    timestamp: string;
    action: string;
    user: string;
    details?: string;
  }[];
  
  reconciliationNotes?: string;
  pdfDownloaded?: boolean;
  financeiroCiente?: boolean; // Financeiro ciente do fechamento para Promax
  isEstimated?: boolean;      // Marcar se a auditoria possui dados estimados/retroativos
  isRetroactive?: boolean;    // Marcar se a auditoria pertence à carga retroativa
  estimatedVolumeHandled?: number; // Volume total aferido/movimentado para a rota/mapa em unidades

  // Discrepancy Action Tracker Fields (Sobras & Faltas)
  surplusActionStatus?: 'prazo_envio_ok' | 'fora_do_prazo' | 'enviado_cliente' | 'baixado_direto' | 'comentado'; // for Sobras
  deficitActionStatus?: 'pendente_baixa' | 'baixado' | 'baixado_direto' | 'comentado'; // for Faltas
  correctiveActionNotes?: string; // Observation about what action was taken

  // Monitoramento and Gestor fields for Sobras flow
  clientCodeNB?: string;                // Código do Cliente (NB)
  deliveryDate?: string;                // Data de Entrega
  gestorAlignedDeliveryDate?: boolean;  // Se o Gestor alinhou a data de entrega do produto que sobrou
  surplusFlowStatus?: 'PENDENTE' | 'ENCAMINHADO' | 'ENVIADO' | 'BAIXADO' | 'REPROVADO'; // Status do fluxo de sobras
  gestorAcknowledgedSurplus?: boolean;  // Se o gestor marcou ciente no card de ação do auxiliar de sobras

  // Suspension & time tracking fields
  isSuspended?: boolean;
  suspensionNotes?: string;
  lastTimerStart?: string;
  totalCountingDurationMs?: number;
  routeObservations?: RouteObservation[];
  
  // Blitz results
  isBlitz?: boolean;
  blitzBoxesChecked?: number;
  blitzAvariasFound?: number;

  // Concurrency metadata fields
  updatedAt?: string;
  lastUpdatedBy?: string;

  // Reopening request fields
  reopeningRequested?: boolean;
  reopeningJustification?: string;
  reopeningRequestDate?: string;
  reopeningRequestUser?: string;

  // EFD & Logistics Travel Tracking
  isPernoite?: boolean;           // Veículo pernoitou (não impacta / isento de EFD)
  departureDate?: string;         // YYYY-MM-DD
  departureTime?: string;         // HH:mm
  arrivalTime?: string;           // HH:mm
  unloadedBefore10?: boolean;     // Descarregado antes das 10:00
  efdHit?: boolean;               // EFD batida (ou pernoite isento)
  dayCycleStage?: 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  loadingStatus?: 'aguardando' | 'em_carregamento' | 'em_descarregamento' | 'carregado' | 'descarregado';
  loadingStartTime?: string;
  loadingEndTime?: string;
  loadingOperatorId?: string;
  loadingOperatorName?: string;
  loadingPalletsCount?: number;
  loadingNotes?: string;
  unloadingStartDate?: string;
  unloadingStartTime?: string;
  unloadingEndDate?: string;
  unloadingEndTime?: string;
  unloadingDurationMinutes?: number;
  unloadingOperatorName?: string;
  unloadedAt?: string;
}

export interface RouteObservation {
  id: string;
  author: string; // e.g. "Monitoramento", "Financeiro", "Gestor", etc.
  text: string;
  timestamp: string;
  type?: 'sobra' | 'falta' | 'todos';
}

export interface ReturnForecast {
  id: string;
  plate: string;
  driverName: string;
  helperName?: string;
  routeMap: string;
  eta: string;             // Expected time of arrival (e.g. "15:30")
  status: 'em_rota' | 'chegando' | 'no_patio';
  tripStatus?: 'retornam' | 'pernoitam'; // 'retornam' or 'pernoitam'
  updatedAt: string;
}

export interface FiscalAlert {
  id: string;
  routeMap: string;
  plate: string;
  status: 'finalizado_ok' | 'finalizado_divergente' | 'recontagem_solicitada' | 'conferido_fisico' | 'recontagem_finalizada' | 'sobra_alinhada' | 'outros';
  timestamp: string;
  read: boolean;
  title?: string;
  message?: string;
  targetRole?: UserRole | 'todos';
}

export interface AuditExchangeItem {
  productCode: string;
  productDescription: string;
  qty: number;
  type: 'TROCA' | 'REPOSICAO'; // TROCA = avariado em rota, REPOSICAO = faltas em rota
}

export interface ImportedRouteItem {
  productCode: string;
  productDescription: string;
  qty: number;
  unit: string;
}

export interface DelayJustification {
  id: string;
  timestamp: string;
  author: string;
  text: string;
  delayStage: 'D0' | 'D1' | 'D2' | 'D3' | 'D4+' | 'D4';
}

export interface ImportedRoute {
  id: string;
  routeMap: string;
  plate: string;
  driverId: string;
  routeDate: string; // The date of the route requested during import
  date?: string;
  driverName?: string;
  pallets?: number;
  status: 'pendente' | 'descarregando' | 'descarregado' | 'conferindo' | 'fechado' | 'em_analise' | 'reconferir';
  importedAt: string;
  itemsCount: number;
  justification?: string;
  delayJustifications?: DelayJustification[];
  delayStageOverride?: 'D0' | 'D1';
  alertDismissed?: boolean;
  discrepancyObservation?: string; // Observação de divergência de ativos de giro ou P.A
  exchanges?: AuditExchangeItem[]; // Trocas e Reposições de PA
  items?: ImportedRouteItem[];
  routeObservations?: RouteObservation[];
  isBlitz?: boolean; // Flag indicando se este veículo foi selecionado para Blitz de Refugo do dia
  totalBoxes?: number;
  updatedAt?: string;
  isPernoite?: boolean; // Se o veículo pernoitou (não impacta / isento de EFD)
  departureDate?: string;
  departureTime?: string;
  arrivalDate?: string;
  arrivalTime?: string;
  unloadedBefore10?: boolean;
  efdHit?: boolean;
  dayCycleStage?: 'D0' | 'D1' | 'D2' | 'D3' | 'D4';
  loadingStatus?: 'aguardando' | 'em_carregamento' | 'em_descarregamento' | 'carregado' | 'descarregado';
  loadingStartTime?: string;
  loadingEndTime?: string;
  loadingOperatorId?: string;
  loadingOperatorName?: string;
  loadingPalletsCount?: number;
  loadingNotes?: string;
  unloadingStartDate?: string;
  unloadingStartTime?: string;
  unloadingEndDate?: string;
  unloadingEndTime?: string;
  unloadingDurationMinutes?: number;
  unloadingOperatorName?: string;
  unloadedAt?: string;
}

export function isTreatableAssetId(assetId: string): boolean {
  const id = assetId.toLowerCase();
  // Filter out pallets and chapatex/other non-bottle/crate assets
  return id !== 'pal_pbr' && id !== 'chapatex' && !id.includes('palete') && !id.includes('pallet') && !id.includes('chapatex');
}

export function getAssetCode(assetId: string, assetName: string): string {
  const id = assetId.toLowerCase();
  const normName = assetName.toUpperCase().replace(/\s+/g, '');
  
  if (normName.includes('GARRAFEIRA1L') || normName.includes('GFE1L')) return '188005';
  if (normName.includes('GARRAFEIRA600') || normName.includes('GFE600')) return '899599';
  if (normName.includes('GARRAFEIRA300') || normName.includes('GFE300')) return '863059';
  if (normName.includes('VERDE600') || normName.includes('600MLVERDE') || normName.includes('600VERDE')) return '786238';
  if (normName.includes('ÂMBAR') || normName.includes('AMBAR')) return '27983';
  if (normName.includes('GARRAFA1L') || normName === '1L' || normName === 'GARRAFA1') return '188006';
  if (normName.includes('GARRAFA300') || normName === '300' || normName === 'GARRAFA300ML') return '198214';
  if (normName.includes('RGBNAB') || normName.includes('RGB_NAB')) return 'rgb_nab';
  if (normName.includes('BARRIL') || normName.includes('CHOPP')) return 'barril_chopp';
  if (normName.includes('PBR1') || normName.includes('PALETE1') || normName.includes('PBR_1')) return 'pal_pbr';
  if (normName.includes('PBR2') || normName.includes('PALETE2') || normName.includes('PBR_2')) return 'pbr2';
  if (normName.includes('CHAPATEX')) return 'chapatex';
  
  if (['27983', '188006', '198214', '786238', '188005', '863059', '899599', 'rgb_nab', 'barril_chopp', 'pal_pbr', 'pbr2', 'chapatex'].includes(assetId)) {
    return assetId;
  }
  
  if (id === 'gf_1l') return '188005';
  if (id === 'gf_600') return '899599';
  if (id === 'gf_300') return '863059';
  if (id === 'g_600_v') return '786238';
  if (id === 'g_600_a') return '27983';
  if (id === 'g_1l') return '188006';
  if (id === 'g_300') return '198214';

  return assetId;
}

export function getAssetCanonicalName(code: string): string {
  switch (code) {
    case '188005': return 'GARRAFEIRA 1L';
    case '899599': return 'GARRAFEIRA 600ML';
    case '863059': return 'GARRAFEIRA 300ML';
    case '786238': return 'GARRAFA VERDE 600ML (RET)';
    case '27983': return 'GARRAFA 600 ÂMBAR (RET)';
    case '188006': return 'GARRAFA 1L(RET)';
    case '198214': return 'GARRAFA 300ML (RET)';
    case 'rgb_nab': return 'GARRAFA RGB NAB (RET)';
    case 'barril_chopp': return 'BARRIL CHOPP';
    case 'pal_pbr': return 'PALETE PBR 1';
    case 'pbr2': return 'PALETE PBR 2';
    case 'chapatex': return 'CHAPATEX';
    default: return '';
  }
}

export interface Vale {
  id: string;
  auditId?: string; // mapa de auditoria de onde veio
  routeMap?: string;
  colaboradorId: string; // id do motorista/ajudante/conferente ou nome
  colaboradorName: string;
  colaboradorRole: string; // 'MOTORISTA' | 'AJUDANTE' | 'CONFERENTE' | etc.
  valor: number;
  descricao: string; // Ex: "Falta de 3 cx Spaten no mapa MAPA-108"
  dataGeracao: string; // YYYY-MM-DD
  status: 'PENDENTE_ASSINATURA' | 'ASSINADO' | 'COMPENSADO' | 'DESCONTADO_EM_FOLHA';
  observacao?: string;
  signedPdfUrl?: string; // base64 do PDF ou imagem do vale assinado
  signedPdfName?: string; // nome do arquivo PDF
  acknowledgedByGestor?: boolean; // Se o gestor marcou ciente no card do vale
}

export interface OperationalAction {
  id: string;
  title: string;
  type: 'sobra' | 'falta' | 'avaria_refugo' | 'procedimento' | 'eficiencia_descarga' | 'ans_distribuicao' | 'produtividade' | 'qualidade_descarga' | 'outros';
  colaboradorId?: string;
  colaboradorName: string;
  colaboradorRole?: string;
  routeMap?: string;
  plate?: string;
  productOrAsset?: string;
  quantity?: number;
  startDate: string; // YYYY-MM-DD
  completionDate?: string; // YYYY-MM-DD
  observations: string; // escrita simples citando o colaborador ou o produto
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  responsibleName?: string;
  createdAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  operation: 'CRIAÇÃO' | 'EDIÇÃO' | 'EXCLUSÃO' | 'OUTROS';
  details: string;
}




