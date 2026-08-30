import { Vale } from '../types';

/**
 * Base Oficial de Vales de Desvio de Conferência (P.A. e A.G.)
 * Gerados a partir das faltas apuradas no retorno de rota (Fev/2026 a Ago/2026).
 * 
 * Regra de Negócio e Curva de Giro:
 * - Produtos Acabados (P.A.) ordenados e distribuídos com maior volume nos itens de maior saída:
 *   1. [9067] ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL (R$ 33,97)
 *   2. [34608] SKOL LATA 350ML SH C/12 NPAL MULTIPACK (R$ 31,78)
 *   3. [2538] ANTARCTICA PILSEN 600ML (R$ 62,80)
 *   4. [1743] ANTARCTICA PILSEN GFA VD 1L COM TTC (R$ 72,76)
 *   5. [13205] SKOL GFA VD 300ML CX C/23 (R$ 53,05)
 *   6. [21020] BUDWEISER LT SLEEK 350ML CX CART C 12 (R$ 38,19)
 *   7. [2349] GUARANA CHP ANTARCTICA PET 2L CAIXA C/6 (R$ 40,52)
 *   8. [982] SKOL 600ML (R$ 66,07)
 *   9. [2548] BUDWEISER 600ML (R$ 73,57)
 *   10. [9068] SKOL LATA 350ML SH C/12 NPAL (R$ 32,77)
 *   11. [19164] GUARANA CHP ANTARCTICA PET 1L PACK C/2 MULTPACK (R$ 6,79)
 *   12. [2546] ORIGINAL 600ML (R$ 78,06)
 *   13. [33820] BRAHMA CHOPP LATA 350ML SH C/12 NPAL MULTIPACK . (R$ 34,14)
 *   14. [13201] BRAHMA CHOPP GFA VD 300ML CX C/23 (R$ 52,93)
 *   15. [1388] SKOL GFA VD 1L 2,99 (R$ 73,98)
 *   16. [988] BRAHMA CHOPP 600ML (R$ 70,50)
 *   17. [35331] BUDWEISER GFA VD 1L (R$ 84,51)
 *   18. [2319] GUARANA CHP ANTARCTICA PET 1L CAIXA C/12 (R$ 47,75)
 *   19. [13061] H2OH LIMONETO PET 500ML SHRINK C/12 NPAL (R$ 45,50)
 *   20. [17808] BUDWEISER OW 330ML CX C/24 (R$ 114,69)
 *   21. [20164] SKOL LT 473ML SH C/12 NPAL MULTPACK 12 (R$ 41,91)
 *   22. [20217] ORIGINAL GFA VD 300ML CX C/23 (R$ 59,57)
 *   23. [23186] SPATEN N 600ML (R$ 77,18)
 * 
 * - Meses Anteriores (Fev a Jul/2026): Status 'COMPENSADO'
 * - Mês de Agosto/2026: Status 'PENDENTE_ASSINATURA'
 */
export const DEFAULT_VALES: Vale[] = [
  // ========================== AGOSTO / 2026 (STATUS: PENDENTE_ASSINATURA) ==========================
  {
    id: 'val_2026_08_w3_01',
    routeMap: '01089',
    colaboradorId: 'G1034',
    colaboradorName: 'EDENILSON DE SOUSA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 407.64,
    descricao: 'Falta de 12 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no retorno do mapa 01089 (Placa SLB4A26).',
    dataGeracao: '2026-08-17',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Averiguação realizada no retorno de rota com o motorista Edenilson. Termo de autorização de desconto emitido aguardando assinatura do colaborador.'
  },
  {
    id: 'val_2026_08_w3_02',
    routeMap: '01090',
    colaboradorId: 'G1049',
    colaboradorName: 'VALDKLEBER DE SOUZA ALEXANDRE',
    colaboradorRole: 'MOTORISTA',
    valor: 317.80,
    descricao: 'Falta de 10 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no retorno do mapa 01090 (Placa NPR2601).',
    dataGeracao: '2026-08-18',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Diferença física no descarregamento. Termo de vale emitido para conferência e assinatura.'
  },
  {
    id: 'val_2026_08_w3_03',
    routeMap: '01095',
    colaboradorId: 'G1019',
    colaboradorName: 'DANILLO PEREIRA DOS SANTOS SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 376.80,
    descricao: 'Falta de 6 cx de 2538 - ANTARCTICA PILSEN 600ML apurada no retorno do mapa 01095 (Placa OXO0532).',
    dataGeracao: '2026-08-19',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Divergência física no retorno de rota. Motorista orientado a apresentar canhotos faltantes ou assinar termo de desconto pendente.'
  },
  {
    id: 'val_2026_08_w2_01',
    routeMap: '01072',
    colaboradorId: 'G1020',
    colaboradorName: 'EWERTON RODRIGUES DA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 363.80,
    descricao: 'Falta de 5 cx de 1743 - ANTARCTICA PILSEN GFA VD 1L COM TTC apurada no retorno do mapa 01072 (Placa RLU4H49).',
    dataGeracao: '2026-08-10',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Falta apontada na conferência de descarga. Vale gerado e disponibilizado para colheita de assinatura do colaborador.'
  },
  {
    id: 'val_2026_08_w2_02',
    routeMap: '01075',
    colaboradorId: 'G1053',
    colaboradorName: 'ADELSON SANTOS DE ARAUJO',
    colaboradorRole: 'MOTORISTA',
    valor: 318.30,
    descricao: 'Falta de 6 cx de 13205 - SKOL GFA VD 300ML CX C/23 apurada no retorno do mapa 01075 (Placa TOZ8B50).',
    dataGeracao: '2026-08-11',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Divergência física na contagem cega. Termo de autorização em fase de coleta de assinatura.'
  },
  {
    id: 'val_2026_08_w2_03',
    routeMap: '01078',
    colaboradorId: 'G1059',
    colaboradorName: 'GILMAR DOS SANTOS FERNANDES',
    colaboradorRole: 'MOTORISTA',
    valor: 305.52,
    descricao: 'Falta de 8 cx de 21020 - BUDWEISER LT SLEEK 350ML CX CART C 12 apurada no retorno do mapa 01078 (Placa OXO0542).',
    dataGeracao: '2026-08-12',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Diferença de contagem no retorno de viagem. Notificado para alinhamento e assinatura do termo de responsabilidade.'
  },
  {
    id: 'val_2026_08_w1_01',
    routeMap: '01062',
    colaboradorId: 'G1076',
    colaboradorName: 'MANOEL ALVES DUTRA NETO',
    colaboradorRole: 'MOTORISTA',
    valor: 283.64,
    descricao: 'Falta de 7 cx de 2349 - GUARANA CHP ANTARCTICA PET 2L CAIXA C/6 apurada no mapa 01062 (Placa SLB3J76).',
    dataGeracao: '2026-08-03',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Mercadoria não localizada no retorno da rota. Termo emitido para assinatura.'
  },
  {
    id: 'val_2026_08_w1_02',
    routeMap: '01065',
    colaboradorId: 'G1101',
    colaboradorName: 'JOSE HONORIO DA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 330.35,
    descricao: 'Falta de 5 cx de 982 - SKOL 600ML apurada no mapa 01065 (Placa SLB4A56).',
    dataGeracao: '2026-08-04',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Conferência física divergente da nota fiscal. Termo em cobrança.'
  },
  {
    id: 'val_2026_08_w1_03',
    routeMap: '01068',
    colaboradorId: 'G1102',
    colaboradorName: 'JOSENILSON INACIO DE ANDRADE',
    colaboradorRole: 'MOTORISTA',
    valor: 294.28,
    descricao: 'Falta de 4 cx de 2548 - BUDWEISER 600ML apurada no retorno do mapa 01068 (Placa QSK7D92).',
    dataGeracao: '2026-08-05',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Mercadoria não entregue ao cliente final e não retornada ao armazém. Termo pendente de assinatura junto ao motorista.'
  },
  // Vales de Ativos de Giro (A.G.) - Agosto/2026
  {
    id: 'val_ag_2026_08_01',
    routeMap: '01085',
    colaboradorId: 'G1076',
    colaboradorName: 'MANOEL ALVES DUTRA NETO',
    colaboradorRole: 'MOTORISTA',
    valor: 526.32,
    descricao: 'Falta de 12x 899599 - GARRAFEIRA 600ML apurada na conferência cega do mapa 01085 (Placa SLB3J76).',
    dataGeracao: '2026-08-14',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Divergência de 12 engradados plásticos 600ml não devolvidos pelo PDV. Termo emitido e em processo de assinatura.'
  },
  {
    id: 'val_ag_2026_08_02',
    routeMap: '01092',
    colaboradorId: 'G1049',
    colaboradorName: 'VALDKLEBER DE SOUZA ALEXANDRE',
    colaboradorRole: 'MOTORISTA',
    valor: 78.32,
    descricao: 'Falta de 8x pal_pbr - PALETE PBR 1 apurada na devolução do mapa 01092 (Placa NPR2601).',
    dataGeracao: '2026-08-18',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Paletes retidos no ponto de venda sem nota de comodato anexada. Vale emitido aguardando assinatura.'
  },
  {
    id: 'val_ag_2026_08_03',
    routeMap: '01096',
    colaboradorId: 'G1143',
    colaboradorName: 'JOSICLAUDIO DE OLIVEIRA RODRIGUES',
    colaboradorRole: 'MOTORISTA',
    valor: 35.28,
    descricao: 'Falta de 24x 27983 - GARRAFA 600 ÂMBAR (RET) apurada no mapa 01096 (Placa TOU7F39).',
    dataGeracao: '2026-08-22',
    status: 'PENDENTE_ASSINATURA',
    observacao: 'Quebra física e falta de vasilhames retornáveis na rota. Termo emitido para colheita de assinatura.'
  },

  // ========================== JULHO / 2026 (STATUS: COMPENSADO) ==========================
  {
    id: 'val_2026_07_w5_01',
    routeMap: '01050',
    colaboradorId: 'G1102',
    colaboradorName: 'JOSENILSON INACIO DE ANDRADE',
    colaboradorRole: 'MOTORISTA',
    valor: 373.67,
    descricao: 'Falta de 11 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no mapa 01050 (Placa QSK7D92).',
    dataGeracao: '2026-07-27',
    status: 'COMPENSADO',
    observacao: 'Inversão física no carregamento matinal com rota paralela. Regularização financeira e contábil compensada no fechamento de Julho.'
  },
  {
    id: 'val_2026_07_w5_02',
    routeMap: '01053',
    colaboradorId: 'G1104',
    colaboradorName: 'JOSE CARLOS DE LIMA ARAUJO',
    colaboradorRole: 'MOTORISTA',
    valor: 317.80,
    descricao: 'Falta de 10 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no mapa 01053 (Placa TOZ8B20).',
    dataGeracao: '2026-07-28',
    status: 'COMPENSADO',
    observacao: 'Diferença apurada na conferência cega. Compensação processada no fechamento de folha.'
  },
  {
    id: 'val_2026_07_w5_03',
    routeMap: '01057',
    colaboradorId: 'G1111',
    colaboradorName: 'EDILSON DE ANDRADE LIMA JUNIOR',
    colaboradorRole: 'MOTORISTA',
    valor: 314.00,
    descricao: 'Falta de 5 cx de 2538 - ANTARCTICA PILSEN 600ML apurada no mapa 01057 (Placa RLW0C17).',
    dataGeracao: '2026-07-29',
    status: 'COMPENSADO',
    observacao: 'Conferência de canhoto assinada pelo cliente anexada ao mapa. Compensado no fechamento mensal.'
  },
  {
    id: 'val_2026_07_w4_01',
    routeMap: '01041',
    colaboradorId: 'G1122',
    colaboradorName: 'JEFFERSON JONES PAULINO COSTA',
    colaboradorRole: 'MOTORISTA',
    valor: 291.04,
    descricao: 'Falta de 4 cx de 1743 - ANTARCTICA PILSEN GFA VD 1L COM TTC apurada no mapa 01041 (Placa NPR2601).',
    dataGeracao: '2026-07-20',
    status: 'COMPENSADO',
    observacao: 'Devolução física registrada na portaria com comprovante formalizado. Baixa e compensação finalizadas.'
  },
  {
    id: 'val_2026_07_w4_02',
    routeMap: '01044',
    colaboradorId: 'G1140',
    colaboradorName: 'JOSE MATUZALEM PONTES DE OLIVEIRA',
    colaboradorRole: 'MOTORISTA',
    valor: 318.30,
    descricao: 'Falta de 6 cx de 13205 - SKOL GFA VD 300ML CX C/23 apurada no mapa 01044 (Placa OXO0552).',
    dataGeracao: '2026-07-21',
    status: 'COMPENSADO',
    observacao: 'Regularização efetuada na prestação de contas. Compensado no sistema.'
  },
  {
    id: 'val_2026_07_w4_03',
    routeMap: '01048',
    colaboradorId: 'G1143',
    colaboradorName: 'JOSICLAUDIO DE OLIVEIRA RODRIGUES',
    colaboradorRole: 'MOTORISTA',
    valor: 267.33,
    descricao: 'Falta de 7 cx de 21020 - BUDWEISER LT SLEEK 350ML CX CART C 12 apurada no mapa 01048 (Placa TOU7F39).',
    dataGeracao: '2026-07-22',
    status: 'COMPENSADO',
    observacao: 'Mercadoria entregue no supermercado com canhoto de recebimento comprovado. Processo compensado.'
  },
  {
    id: 'val_2026_07_w3_01',
    routeMap: '01033',
    colaboradorId: 'G1162',
    colaboradorName: 'THIAGO JOSE SANTINO DOS SANTOS',
    colaboradorRole: 'MOTORISTA',
    valor: 243.12,
    descricao: 'Falta de 6 cx de 2349 - GUARANA CHP ANTARCTICA PET 2L CAIXA C/6 apurada no mapa 01033 (Placa SLB3J76).',
    dataGeracao: '2026-07-13',
    status: 'COMPENSADO',
    observacao: 'Ajuste fiscal efetuado e conferência encerrada. Compensado no fechamento contábil.'
  },
  {
    id: 'val_2026_07_w3_02',
    routeMap: '01036',
    colaboradorId: 'G1034',
    colaboradorName: 'EDENILSON DE SOUSA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 264.28,
    descricao: 'Falta de 4 cx de 982 - SKOL 600ML apurada no mapa 01036 (Placa SLB4A26).',
    dataGeracao: '2026-07-14',
    status: 'COMPENSADO',
    observacao: 'Acerto contábil e compensação formalizada no fechamento de folha.'
  },
  {
    id: 'val_2026_07_w1_01',
    routeMap: '01012',
    colaboradorId: 'G1020',
    colaboradorName: 'EWERTON RODRIGUES DA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 294.28,
    descricao: 'Falta de 4 cx de 2548 - BUDWEISER 600ML apurada no mapa 01012 (Placa RLR8G79).',
    dataGeracao: '2026-07-01',
    status: 'COMPENSADO',
    observacao: 'Protocolo de entrega validado e arquivado no fiscal. Compensação realizada no período.'
  },
  {
    id: 'val_ag_2026_07_01',
    routeMap: '01046',
    colaboradorId: 'G1053',
    colaboradorName: 'ADELSON SANTOS DE ARAUJO',
    colaboradorRole: 'MOTORISTA',
    valor: 297.70,
    descricao: 'Falta de 10x 863059 - GARRAFEIRA 300ML apurada no mapa 01046 (Placa TOZ8B50).',
    dataGeracao: '2026-07-24',
    status: 'COMPENSADO',
    observacao: 'Diferença de garrafeiras apurada no retorno. Compensado no acerto de ativos de giro de Julho.'
  },

  // ========================== JUNHO / 2026 (STATUS: COMPENSADO) ==========================
  {
    id: 'val_2026_06_w4_01',
    routeMap: '00985',
    colaboradorId: 'G1049',
    colaboradorName: 'VALDKLEBER DE SOUZA ALEXANDRE',
    colaboradorRole: 'MOTORISTA',
    valor: 339.70,
    descricao: 'Falta de 10 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no mapa 00985 (Placa SLB4A26).',
    dataGeracao: '2026-06-22',
    status: 'COMPENSADO',
    observacao: 'Apuração e baixa contábil no encerramento da folha de Junho.'
  },
  {
    id: 'val_2026_06_w4_02',
    routeMap: '00988',
    colaboradorId: 'G1019',
    colaboradorName: 'DANILLO PEREIRA DOS SANTOS SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 286.02,
    descricao: 'Falta de 9 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no mapa 00988 (Placa OXO0532).',
    dataGeracao: '2026-06-23',
    status: 'COMPENSADO',
    observacao: 'Falta conferida na descarga e compensada no fechamento.'
  },
  {
    id: 'val_2026_06_w3_01',
    routeMap: '00972',
    colaboradorId: 'G1059',
    colaboradorName: 'GILMAR DOS SANTOS FERNANDES',
    colaboradorRole: 'MOTORISTA',
    valor: 251.20,
    descricao: 'Falta de 4 cx de 2538 - ANTARCTICA PILSEN 600ML apurada no mapa 00972 (Placa OXO0542).',
    dataGeracao: '2026-06-15',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento mensal de Junho.'
  },
  {
    id: 'val_2026_06_w2_01',
    routeMap: '00960',
    colaboradorId: 'G1076',
    colaboradorName: 'MANOEL ALVES DUTRA NETO',
    colaboradorRole: 'MOTORISTA',
    valor: 218.28,
    descricao: 'Falta de 3 cx de 1743 - ANTARCTICA PILSEN GFA VD 1L COM TTC apurada no mapa 00960 (Placa SLB3J76).',
    dataGeracao: '2026-06-08',
    status: 'COMPENSADO',
    observacao: 'Falta tratada e compensada.'
  },
  {
    id: 'val_2026_06_w1_01',
    routeMap: '00945',
    colaboradorId: 'G1101',
    colaboradorName: 'JOSE HONORIO DA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 265.25,
    descricao: 'Falta de 5 cx de 13205 - SKOL GFA VD 300ML CX C/23 apurada no mapa 00945 (Placa SLB4A56).',
    dataGeracao: '2026-06-01',
    status: 'COMPENSADO',
    observacao: 'Compensação concluída.'
  },
  {
    id: 'val_ag_2026_06_01',
    routeMap: '00978',
    colaboradorId: 'G1102',
    colaboradorName: 'JOSENILSON INACIO DE ANDRADE',
    colaboradorRole: 'MOTORISTA',
    valor: 350.88,
    descricao: 'Falta de 8x 899599 - GARRAFEIRA 600ML apurada no mapa 00978 (Placa QSK7D92).',
    dataGeracao: '2026-06-18',
    status: 'COMPENSADO',
    observacao: 'Compensado no inventário de vasilhames de Junho.'
  },

  // ========================== MAIO / 2026 (STATUS: COMPENSADO) ==========================
  {
    id: 'val_2026_05_w4_01',
    routeMap: '00910',
    colaboradorId: 'G1104',
    colaboradorName: 'JOSE CARLOS DE LIMA ARAUJO',
    colaboradorRole: 'MOTORISTA',
    valor: 305.73,
    descricao: 'Falta de 9 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no mapa 00910 (Placa TOZ8B20).',
    dataGeracao: '2026-05-25',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento mensal de Maio.'
  },
  {
    id: 'val_2026_05_w3_01',
    routeMap: '00895',
    colaboradorId: 'G1111',
    colaboradorName: 'EDILSON DE ANDRADE LIMA JUNIOR',
    colaboradorRole: 'MOTORISTA',
    valor: 254.24,
    descricao: 'Falta de 8 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no mapa 00895 (Placa RLW0C17).',
    dataGeracao: '2026-05-18',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento contábil de Maio.'
  },
  {
    id: 'val_2026_05_w2_01',
    routeMap: '00880',
    colaboradorId: 'G1122',
    colaboradorName: 'JEFFERSON JONES PAULINO COSTA',
    colaboradorRole: 'MOTORISTA',
    valor: 251.20,
    descricao: 'Falta de 4 cx de 2538 - ANTARCTICA PILSEN 600ML apurada no mapa 00880 (Placa NPR2601).',
    dataGeracao: '2026-05-11',
    status: 'COMPENSADO',
    observacao: 'Compensado no período.'
  },
  {
    id: 'val_2026_05_w1_01',
    routeMap: '00865',
    colaboradorId: 'G1140',
    colaboradorName: 'JOSE MATUZALEM PONTES DE OLIVEIRA',
    colaboradorRole: 'MOTORISTA',
    valor: 228.77,
    descricao: 'Falta de 6 cx de 21020 - BUDWEISER LT SLEEK 350ML CX CART C 12 apurada no mapa 00865 (Placa OXO0552).',
    dataGeracao: '2026-05-04',
    status: 'COMPENSADO',
    observacao: 'Compensação realizada.'
  },
  {
    id: 'val_ag_2026_05_01',
    routeMap: '00902',
    colaboradorId: 'G1143',
    colaboradorName: 'JOSICLAUDIO DE OLIVEIRA RODRIGUES',
    colaboradorRole: 'MOTORISTA',
    valor: 129.30,
    descricao: 'Falta de 15x chapatex - CHAPATEX apurada no mapa 00902 (Placa TOU7F39).',
    dataGeracao: '2026-05-20',
    status: 'COMPENSADO',
    observacao: 'Compensado na conciliação de paletes de Maio.'
  },

  // ========================== ABRIL / 2026 (STATUS: COMPENSADO) ==========================
  {
    id: 'val_2026_04_w4_01',
    routeMap: '00820',
    colaboradorId: 'G1162',
    colaboradorName: 'THIAGO JOSE SANTINO DOS SANTOS',
    colaboradorRole: 'MOTORISTA',
    valor: 271.76,
    descricao: 'Falta de 8 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no mapa 00820 (Placa SLB3J76).',
    dataGeracao: '2026-04-27',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento mensal de Abril.'
  },
  {
    id: 'val_2026_04_w3_01',
    routeMap: '00805',
    colaboradorId: 'G1034',
    colaboradorName: 'EDENILSON DE SOUSA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 222.46,
    descricao: 'Falta de 7 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no mapa 00805 (Placa SLB4A26).',
    dataGeracao: '2026-04-20',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento de folha.'
  },
  {
    id: 'val_2026_04_w2_01',
    routeMap: '00790',
    colaboradorId: 'G1049',
    colaboradorName: 'VALDKLEBER DE SOUZA ALEXANDRE',
    colaboradorRole: 'MOTORISTA',
    valor: 188.40,
    descricao: 'Falta de 3 cx de 2538 - ANTARCTICA PILSEN 600ML apurada no mapa 00790 (Placa NPR2601).',
    dataGeracao: '2026-04-13',
    status: 'COMPENSADO',
    observacao: 'Compensado.'
  },
  {
    id: 'val_2026_04_w1_01',
    routeMap: '00775',
    colaboradorId: 'G1019',
    colaboradorName: 'DANILLO PEREIRA DOS SANTOS SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 202.60,
    descricao: 'Falta de 5 cx de 2349 - GUARANA CHP ANTARCTICA PET 2L CAIXA C/6 apurada no mapa 00775 (Placa OXO0532).',
    dataGeracao: '2026-04-06',
    status: 'COMPENSADO',
    observacao: 'Compensado na conciliação contábil.'
  },
  {
    id: 'val_ag_2026_04_01',
    routeMap: '00812',
    colaboradorId: 'G1020',
    colaboradorName: 'EWERTON RODRIGUES DA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 271.62,
    descricao: 'Falta de 6x 188005 - GARRAFEIRA 1L apurada no mapa 00812 (Placa RLU4H49).',
    dataGeracao: '2026-04-22',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento de vasilhames 1L de Abril.'
  },

  // ========================== MARÇO / 2026 (STATUS: COMPENSADO) ==========================
  {
    id: 'val_2026_03_w4_01',
    routeMap: '00730',
    colaboradorId: 'G1053',
    colaboradorName: 'ADELSON SANTOS DE ARAUJO',
    colaboradorRole: 'MOTORISTA',
    valor: 237.79,
    descricao: 'Falta de 7 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no mapa 00730 (Placa TOZ8B50).',
    dataGeracao: '2026-03-23',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento de Março.'
  },
  {
    id: 'val_2026_03_w3_01',
    routeMap: '00715',
    colaboradorId: 'G1059',
    colaboradorName: 'GILMAR DOS SANTOS FERNANDES',
    colaboradorRole: 'MOTORISTA',
    valor: 190.68,
    descricao: 'Falta de 6 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no mapa 00715 (Placa OXO0542).',
    dataGeracao: '2026-03-16',
    status: 'COMPENSADO',
    observacao: 'Compensado no período.'
  },
  {
    id: 'val_2026_03_w2_01',
    routeMap: '00700',
    colaboradorId: 'G1076',
    colaboradorName: 'MANOEL ALVES DUTRA NETO',
    colaboradorRole: 'MOTORISTA',
    valor: 198.21,
    descricao: 'Falta de 3 cx de 982 - SKOL 600ML apurada no mapa 00700 (Placa SLB3J76).',
    dataGeracao: '2026-03-09',
    status: 'COMPENSADO',
    observacao: 'Compensado na conciliação física.'
  },
  {
    id: 'val_2026_03_w1_01',
    routeMap: '00685',
    colaboradorId: 'G1101',
    colaboradorName: 'JOSE HONORIO DA SILVA',
    colaboradorRole: 'MOTORISTA',
    valor: 190.95,
    descricao: 'Falta de 5 cx de 21020 - BUDWEISER LT SLEEK 350ML CX CART C 12 apurada no mapa 00685 (Placa SLB4A56).',
    dataGeracao: '2026-03-02',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento mensal de Março.'
  },

  // ========================== FEVEREIRO / 2026 (STATUS: COMPENSADO) ==========================
  {
    id: 'val_2026_02_w4_01',
    routeMap: '00640',
    colaboradorId: 'G1102',
    colaboradorName: 'JOSENILSON INACIO DE ANDRADE',
    colaboradorRole: 'MOTORISTA',
    valor: 203.82,
    descricao: 'Falta de 6 cx de 9067 - ANTARCTICA PILSEN LATA 350ML SH C/12 NPAL apurada no mapa 00640 (Placa QSK7D92).',
    dataGeracao: '2026-02-23',
    status: 'COMPENSADO',
    observacao: 'Compensado no encerramento de Fevereiro.'
  },
  {
    id: 'val_2026_02_w3_01',
    routeMap: '00625',
    colaboradorId: 'G1104',
    colaboradorName: 'JOSE CARLOS DE LIMA ARAUJO',
    colaboradorRole: 'MOTORISTA',
    valor: 158.90,
    descricao: 'Falta de 5 cx de 34608 - SKOL LATA 350ML SH C/12 NPAL MULTIPACK apurada no mapa 00625 (Placa TOZ8B20).',
    dataGeracao: '2026-02-16',
    status: 'COMPENSADO',
    observacao: 'Compensado no período.'
  },
  {
    id: 'val_2026_02_w2_01',
    routeMap: '00610',
    colaboradorId: 'G1111',
    colaboradorName: 'EDILSON DE ANDRADE LIMA JUNIOR',
    colaboradorRole: 'MOTORISTA',
    valor: 188.40,
    descricao: 'Falta de 3 cx de 2538 - ANTARCTICA PILSEN 600ML apurada no mapa 00610 (Placa RLW0C17).',
    dataGeracao: '2026-02-09',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento contábil.'
  },
  {
    id: 'val_2026_02_w1_01',
    routeMap: '00595',
    colaboradorId: 'G1122',
    colaboradorName: 'JEFFERSON JONES PAULINO COSTA',
    colaboradorRole: 'MOTORISTA',
    valor: 162.08,
    descricao: 'Falta de 4 cx de 2349 - GUARANA CHP ANTARCTICA PET 2L CAIXA C/6 apurada no mapa 00595 (Placa NPR2601).',
    dataGeracao: '2026-02-02',
    status: 'COMPENSADO',
    observacao: 'Compensado no fechamento de Fevereiro.'
  }
];
