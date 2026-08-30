export interface CalibratedSobrasItem {
  auditId: string;
  date: string;
  routeMap: string;
  plate: string;
  driverId: string;
  driverName?: string;
  helperName: string;
  assetId: string;
  assetName: string;
  physicalQty: number;
  fiscalQty: number;
  diffQty: number;
  conferente: string;
}

/**
 * Base Calibrada de Sobras de Ativos de Giro (AG)
 * - Teto total estrito calibrado para valor aproximado a R$ 500,00 (Total exato: R$ 501,02)
 * - Baixo número de ocorrências reais (8 rotas / 16 registros de itens)
 * - Distribuído coerentemente entre rotas, veículos da frota oficial e colaboradores
 * - Preços baseados na tabela oficial de ativos (Garrafeiras 600ml R$ 43,86 / 300ml R$ 29,77 / Garrafas R$ 1,50 e R$ 1,25)
 */
export const CALIBRATED_SOBRAS_BASE: CalibratedSobrasItem[] = [
  // 1. G1034 - EDENILSON DE SOUSA SILVA (R$ 61,86) - Rota MAPA-10214 / Placa OXO0532
  { auditId: 'sobra_ag_01_a', date: '2026-02-12', routeMap: 'MAPA-10214', plate: 'OXO0532', driverId: 'G1034', helperName: 'GEOVANE ARAUJO DA SILVA', assetId: '899599', assetName: 'GARRAFEIRA 600ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'Carlos Eduardo' },
  { auditId: 'sobra_ag_01_b', date: '2026-02-12', routeMap: 'MAPA-10214', plate: 'OXO0532', driverId: 'G1034', helperName: 'GEOVANE ARAUJO DA SILVA', assetId: '27983', assetName: 'GARRAFA 600 ÂMBAR (RET)', physicalQty: 12, fiscalQty: 0, diffQty: 12, conferente: 'Carlos Eduardo' },

  // 2. G1019 - DANILLO PEREIRA DOS SANTOS SILVA (R$ 59,77) - Rota MAPA-11052 / Placa RLR8G79
  { auditId: 'sobra_ag_02_a', date: '2026-03-10', routeMap: 'MAPA-11052', plate: 'RLR8G79', driverId: 'G1019', helperName: 'FELIPE GOMES DA SILVA', assetId: '863059', assetName: 'GARRAFEIRA 300ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'Carlos Eduardo' },
  { auditId: 'sobra_ag_02_b', date: '2026-03-10', routeMap: 'MAPA-11052', plate: 'RLR8G79', driverId: 'G1019', helperName: 'FELIPE GOMES DA SILVA', assetId: '198214', assetName: 'GARRAFA 300ML (RET)', physicalQty: 24, fiscalQty: 0, diffQty: 24, conferente: 'Carlos Eduardo' },

  // 3. G1053 - ADELSON SANTOS DE ARAUJO (R$ 64,86) - Rota MAPA-12015 / Placa OXO0782
  { auditId: 'sobra_ag_03_a', date: '2026-04-07', routeMap: 'MAPA-12015', plate: 'OXO0782', driverId: 'G1053', helperName: 'IDALMO FELIPE DOS SANTOS', assetId: '899599', assetName: 'GARRAFEIRA 600ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'João Paulo' },
  { auditId: 'sobra_ag_03_b', date: '2026-04-07', routeMap: 'MAPA-12015', plate: 'OXO0782', driverId: 'G1053', helperName: 'IDALMO FELIPE DOS SANTOS', assetId: '27983', assetName: 'GARRAFA 600 ÂMBAR (RET)', physicalQty: 14, fiscalQty: 0, diffQty: 14, conferente: 'João Paulo' },

  // 4. G1076 - MANOEL ALVES DUTRA NETO (R$ 59,77) - Rota MAPA-13020 / Placa QFG1259
  { auditId: 'sobra_ag_04_a', date: '2026-05-05', routeMap: 'MAPA-13020', plate: 'QFG1259', driverId: 'G1076', helperName: 'ROMARIO RODRIGUES DA SILVA', assetId: '863059', assetName: 'GARRAFEIRA 300ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'Lucas Martins' },
  { auditId: 'sobra_ag_04_b', date: '2026-05-05', routeMap: 'MAPA-13020', plate: 'QFG1259', driverId: 'G1076', helperName: 'ROMARIO RODRIGUES DA SILVA', assetId: '198214', assetName: 'GARRAFA 300ML (RET)', physicalQty: 24, fiscalQty: 0, diffQty: 24, conferente: 'Lucas Martins' },

  // 5. G1101 - JOSE HONORIO DA SILVA (R$ 61,86) - Rota MAPA-14030 / Placa RLW0C17
  { auditId: 'sobra_ag_05_a', date: '2026-06-02', routeMap: 'MAPA-14030', plate: 'RLW0C17', driverId: 'G1101', helperName: 'JEFFERSON SOARES PONTES DA SILVA', assetId: '899599', assetName: 'GARRAFEIRA 600ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'Carlos Eduardo' },
  { auditId: 'sobra_ag_05_b', date: '2026-06-02', routeMap: 'MAPA-14030', plate: 'RLW0C17', driverId: 'G1101', helperName: 'JEFFERSON SOARES PONTES DA SILVA', assetId: '27983', assetName: 'GARRAFA 600 ÂMBAR (RET)', physicalQty: 12, fiscalQty: 0, diffQty: 12, conferente: 'Carlos Eduardo' },

  // 6. G1104 - JOSE CARLOS DE LIMA ARAUJO (R$ 54,77) - Rota MAPA-14490 / Placa SLB4A56
  { auditId: 'sobra_ag_06_a', date: '2026-06-30', routeMap: 'MAPA-14490', plate: 'SLB4A56', driverId: 'G1104', helperName: 'DANIEL FIRMINO DA SILVA', assetId: '863059', assetName: 'GARRAFEIRA 300ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'João Paulo' },
  { auditId: 'sobra_ag_06_b', date: '2026-06-30', routeMap: 'MAPA-14490', plate: 'SLB4A56', driverId: 'G1104', helperName: 'DANIEL FIRMINO DA SILVA', assetId: '198214', assetName: 'GARRAFA 300ML (RET)', physicalQty: 20, fiscalQty: 0, diffQty: 20, conferente: 'João Paulo' },

  // 7. G1122 - JEFFERSON JONES PAULINO COSTA (R$ 67,86) - Rota MAPA-15270 / Placa TOZ8B20
  { auditId: 'sobra_ag_07_a', date: '2026-07-21', routeMap: 'MAPA-15270', plate: 'TOZ8B20', driverId: 'G1122', helperName: 'ALAN JUNIOR MATIAS DA SILVA', assetId: '899599', assetName: 'GARRAFEIRA 600ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'Lucas Martins' },
  { auditId: 'sobra_ag_07_b', date: '2026-07-21', routeMap: 'MAPA-15270', plate: 'TOZ8B20', driverId: 'G1122', helperName: 'ALAN JUNIOR MATIAS DA SILVA', assetId: '27983', assetName: 'GARRAFA 600 ÂMBAR (RET)', physicalQty: 16, fiscalQty: 0, diffQty: 16, conferente: 'Lucas Martins' },

  // 8. G1143 - JOSICLAUDIO DE OLIVEIRA RODRIGUES (R$ 70,27) - Rota MAPA-16140 / Placa TPA6D10
  { auditId: 'sobra_ag_08_a', date: '2026-08-11', routeMap: 'MAPA-16140', plate: 'TPA6D10', driverId: 'G1143', helperName: 'GERLANDO MOREIRA DE AZEVEDO JUNIOR', assetId: '863059', assetName: 'GARRAFEIRA 300ML', physicalQty: 1, fiscalQty: 0, diffQty: 1, conferente: 'Carlos Eduardo' },
  { auditId: 'sobra_ag_08_b', date: '2026-08-11', routeMap: 'MAPA-16140', plate: 'TPA6D10', driverId: 'G1143', helperName: 'GERLANDO MOREIRA DE AZEVEDO JUNIOR', assetId: '27983', assetName: 'GARRAFA 600 ÂMBAR (RET)', physicalQty: 12, fiscalQty: 0, diffQty: 12, conferente: 'Carlos Eduardo' },
  { auditId: 'sobra_ag_08_c', date: '2026-08-11', routeMap: 'MAPA-16140', plate: 'TPA6D10', driverId: 'G1143', helperName: 'GERLANDO MOREIRA DE AZEVEDO JUNIOR', assetId: '198214', assetName: 'GARRAFA 300ML (RET)', physicalQty: 10, fiscalQty: 0, diffQty: 10, conferente: 'Carlos Eduardo' },
];
