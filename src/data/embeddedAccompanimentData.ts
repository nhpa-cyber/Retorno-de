import { LogisticsTravelRecord } from '../utils/efdCalculations';
import { DEFAULT_DRIVERS } from '../data';

/**
 * Base de Acompanhamentos e Registros Logísticos Embutida no Código da Plataforma.
 * Configurada com a distribuição operacional solicitada:
 * - 65% D0 (Descarregamento no mesmo dia)
 * - 32% D1 (1 dia de rota / pernoites)
 * - 2% D2 (2 dias de rota)
 * - 1% D3 (3 dias de rota)
 * - 0% D4 (Sem D4 na operação)
 * 
 * Permite acompanhamento contínuo e imediato sem consumo ou dependência de base de dados externa.
 * Todos os motoristas são vinculados aos colaboradores cadastrados na plataforma.
 */

// Filtra apenas os motoristas cadastrados
const REGISTERED_MOTORISTAS = DEFAULT_DRIVERS.filter(d => d.role === 'MOTORISTA');

const PLATES_POOL = [
  'NPR2601', 'OXO0532', 'OXO0542', 'OXO0552', 'OXO0782', 'QFG1259',
  'QSK7D92', 'RLR8G79', 'RLU4H49', 'RLW0C17', 'SLB3J76', 'SLB4A26',
  'SLB4A56', 'TOU7F39', 'TOZ8B20', 'TOZ8B50', 'TPA6D10'
];

function generateEmbeddedRecords(): LogisticsTravelRecord[] {
  const records: LogisticsTravelRecord[] = [];
  const operationalMonths = [
    { key: '2026-02', days: 28, mapBase: 1000 },
    { key: '2026-03', days: 31, mapBase: 2000 },
    { key: '2026-04', days: 30, mapBase: 3000 },
    { key: '2026-05', days: 31, mapBase: 4000 },
    { key: '2026-06', days: 30, mapBase: 5000 },
    { key: '2026-07', days: 31, mapBase: 6000 },
    { key: '2026-08', days: 31, mapBase: 7000 }
  ];

  operationalMonths.forEach((mObj) => {
    const { key: baseYearMonth, days: maxDays, mapBase } = mObj;

    // Total de 100 registros representativos por mês para garantir exatos 65% D0, 32% D1, 2% D2, 1% D3, 0% D4
    // 65 em D0 (0 dias de diferença entre saída e chegada)
    for (let i = 1; i <= 65; i++) {
      const day = ((i * 3) % maxDays) + 1;
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${baseYearMonth}-${dayStr}`;
      const plate = PLATES_POOL[(i + mapBase) % PLATES_POOL.length];
      const registeredDriver = REGISTERED_MOTORISTAS[(i + mapBase) % REGISTERED_MOTORISTAS.length] || {
        id: 'G1034',
        name: 'EDENILSON DE SOUSA SILVA'
      };
      
      const isMorning = (i + mapBase) % 2 === 0;
      // Alguns registros (> 22:00) para desvios reais de EFD
      const isLate = i % 11 === 0;
      const arrivalTime = isLate 
        ? `${String(22 + (i % 2)).padStart(2, '0')}:${String(10 + ((i * 7) % 45)).padStart(2, '0')}`
        : isMorning 
        ? `${String(8 + (i % 5)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`
        : `${String(14 + (i % 7)).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}`;
      
      const operatorName = isMorning ? 'Marivaldo Artur' : 'José Ronildo';
      const unloadedBefore10 = !isLate;
      const efdHit = unloadedBefore10;
      const departureTime = `07:${String(2 + ((i * 3) % 25)).padStart(2, '0')}`;

      records.push({
        id: `emb_${baseYearMonth}_d0_${String(i).padStart(3, '0')}`,
        routeMap: `MAP-${mapBase + i}`,
        plate,
        driverId: registeredDriver.id,
        driverName: registeredDriver.name,
        departureDate: dateStr,
        departureTime,
        arrivalDate: dateStr,
        arrivalTime,
        isPernoite: false,
        dayCycleStage: 'D0',
        diffDays: 0,
        unloadedBefore10,
        efdHit,
        operatorName,
        source: 'route'
      });
    }

    // 32 em D1 (1 dia de diferença)
    for (let i = 1; i <= 32; i++) {
      const day = ((i * 2) % (maxDays - 1)) + 1;
      const depDayStr = String(day).padStart(2, '0');
      const arrDayStr = String(day + 1).padStart(2, '0');
      const depDate = `${baseYearMonth}-${depDayStr}`;
      const arrDate = `${baseYearMonth}-${arrDayStr}`;
      const plate = PLATES_POOL[(i + 5 + mapBase) % PLATES_POOL.length];
      const registeredDriver = REGISTERED_MOTORISTAS[(i + 3 + mapBase) % REGISTERED_MOTORISTAS.length] || {
        id: 'G1049',
        name: 'VALDKLEBER DE SOUZA ALEXANDRE'
      };
      
      const isMorning = (i + mapBase) % 2 !== 0;
      const isLate = i % 13 === 0;
      const isPernoite = i % 4 === 0;
      
      const arrivalTime = isLate && !isPernoite
        ? `${String(22 + (i % 2)).padStart(2, '0')}:${String(15 + ((i * 5) % 40)).padStart(2, '0')}`
        : isMorning 
        ? `${String(8 + (i % 5)).padStart(2, '0')}:${String((i * 9) % 60).padStart(2, '0')}`
        : `${String(14 + (i % 6)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`;
      
      const operatorName = isMorning ? 'Marivaldo Artur' : 'José Ronildo';
      const unloadedBefore10 = isPernoite || !isLate;
      const efdHit = isPernoite || unloadedBefore10;
      const departureTime = `07:${String(3 + ((i * 4) % 24)).padStart(2, '0')}`;

      records.push({
        id: `emb_${baseYearMonth}_d1_${String(i).padStart(3, '0')}`,
        routeMap: `MAP-${mapBase + 100 + i}`,
        plate,
        driverId: registeredDriver.id,
        driverName: registeredDriver.name,
        departureDate: depDate,
        departureTime,
        arrivalDate: arrDate,
        arrivalTime,
        isPernoite,
        dayCycleStage: 'D1',
        diffDays: 1,
        unloadedBefore10,
        efdHit,
        operatorName,
        source: 'route'
      });
    }

    // 2 em D2 (2 dias de diferença)
    for (let i = 1; i <= 2; i++) {
      const day = i * 10;
      const depDate = `${baseYearMonth}-${String(day).padStart(2, '0')}`;
      const arrDate = `${baseYearMonth}-${String(day + 2).padStart(2, '0')}`;
      const plate = PLATES_POOL[(i + 12 + mapBase) % PLATES_POOL.length];
      const registeredDriver = REGISTERED_MOTORISTAS[(i + 7 + mapBase) % REGISTERED_MOTORISTAS.length] || {
        id: 'G1019',
        name: 'DANILLO PEREIRA DOS SANTOS SILVA'
      };
      const arrivalTime = `${15 + i}:20`;
      const operatorName = 'José Ronildo';
      const departureTime = i === 1 ? '07:14' : '07:22';

      records.push({
        id: `emb_${baseYearMonth}_d2_${String(i).padStart(3, '0')}`,
        routeMap: `MAP-${mapBase + 200 + i}`,
        plate,
        driverId: registeredDriver.id,
        driverName: registeredDriver.name,
        departureDate: depDate,
        departureTime,
        arrivalDate: arrDate,
        arrivalTime,
        isPernoite: false,
        dayCycleStage: 'D2',
        diffDays: 2,
        unloadedBefore10: true,
        efdHit: true,
        operatorName,
        source: 'route'
      });
    }

    // 1 em D3 (3 dias de diferença)
    {
      const depDate = `${baseYearMonth}-05`;
      const arrDate = `${baseYearMonth}-08`;
      const plate = PLATES_POOL[(7 + mapBase) % PLATES_POOL.length];
      const registeredDriver = REGISTERED_MOTORISTAS[(11 + mapBase) % REGISTERED_MOTORISTAS.length] || {
        id: 'G1111',
        name: 'EDILSON DE ANDRADE LIMA JUNIOR'
      };
      const arrivalTime = '16:45';
      const operatorName = 'José Ronildo';

      records.push({
        id: `emb_${baseYearMonth}_d3_001`,
        routeMap: `MAP-${mapBase + 301}`,
        plate,
        driverId: registeredDriver.id,
        driverName: registeredDriver.name,
        departureDate: depDate,
        departureTime: '07:18',
        arrivalDate: arrDate,
        arrivalTime,
        isPernoite: false,
        dayCycleStage: 'D3',
        diffDays: 3,
        unloadedBefore10: true,
        efdHit: true,
        operatorName,
        source: 'route'
      });
    }

    // 0 em D4 (Sem D4 na operação, 0 registros)
  });

  return records;
}

export const EMBEDDED_ACCOMPANIMENT_RECORDS: LogisticsTravelRecord[] = generateEmbeddedRecords();
