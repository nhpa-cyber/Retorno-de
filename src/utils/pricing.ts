import { ActiveAsset, Product } from '../types';

/**
 * Tabela Oficial de Custos e Preços Unitários da Plataforma LogiRoute
 * Fonte da Verdade: Fábrica e Cadastros Padrão
 */
export interface StandardItemPrice {
  id: string;
  code: string;
  name: string;
  category: 'Ativo de Giro' | 'Vasilhame' | 'Palete' | 'Produto Acabado';
  defaultCost: number;
  description: string;
}

export const PLATFORM_STANDARD_PRICES: StandardItemPrice[] = [
  {
    id: '899599',
    code: 'GARRAFEIRA_600',
    name: 'Garrafeira 600ml (GFE 600)',
    category: 'Ativo de Giro',
    defaultCost: 43.86,
    description: 'Engradado plástico padrão Ambev para 24 garrafas de 600ml'
  },
  {
    id: '863059',
    code: 'GARRAFEIRA_300',
    name: 'Garrafeira Litrinho 300ml (GFE 300)',
    category: 'Ativo de Giro',
    defaultCost: 29.77,
    description: 'Engradado plástico padrão Ambev para 24 garrafas de 300ml (litrinho)'
  },
  {
    id: '188005',
    code: 'GARRAFEIRA_1L',
    name: 'Garrafeira Litrão 1L (GFE 1L)',
    category: 'Ativo de Giro',
    defaultCost: 45.27,
    description: 'Engradado plástico padrão Ambev para 12 garrafas de 1 Litro (litrão)'
  },
  {
    id: '198214',
    code: 'VASILHAME_300',
    name: 'Vasilhame Litrinho 300ml (300 RET)',
    category: 'Vasilhame',
    defaultCost: 0.66,
    description: 'Garrafa de vidro retornável 300ml (litrinho)'
  },
  {
    id: '27983',
    code: 'VASILHAME_600_AMBAR',
    name: 'Vasilhame 600ml Âmbar (600 RET)',
    category: 'Vasilhame',
    defaultCost: 1.47,
    description: 'Garrafa de vidro retornável 600ml cor âmbar'
  },
  {
    id: '786238',
    code: 'VASILHAME_600_VERDE',
    name: 'Vasilhame 600ml Verde (600 RET)',
    category: 'Vasilhame',
    defaultCost: 1.47,
    description: 'Garrafa de vidro retornável 600ml cor verde (Heineken/Stella)'
  },
  {
    id: '188006',
    code: 'VASILHAME_1L',
    name: 'Vasilhame Litrão 1L (1L RET)',
    category: 'Vasilhame',
    defaultCost: 2.68,
    description: 'Garrafa de vidro retornável 1 Litro (litrão)'
  },
  {
    id: 'rgb_nab',
    code: 'RGB_NAB',
    name: 'Garrafa RGB NAB (RET)',
    category: 'Vasilhame',
    defaultCost: 2.06,
    description: 'Garrafa retornável de refrigerante não alcoólico (RGB NAB)'
  },
  {
    id: 'barril_chopp',
    code: 'BARRIL_CHOPP',
    name: 'Barril Chopp',
    category: 'Ativo de Giro',
    defaultCost: 550.14,
    description: 'Barril de Chopp de inox'
  },
  {
    id: 'pal_pbr',
    code: 'PALETE_PBR1',
    name: 'Palete PBR 1',
    category: 'Palete',
    defaultCost: 9.79,
    description: 'Palete de madeira padrão PBR 1 homologado'
  },
  {
    id: 'pbr2',
    code: 'PALETE_PBR2',
    name: 'Palete PBR 2',
    category: 'Palete',
    defaultCost: 9.70,
    description: 'Palete de madeira padrão PBR 2'
  },
  {
    id: 'chapatex',
    code: 'CHAPATEX',
    name: 'Chapatex',
    category: 'Ativo de Giro',
    defaultCost: 8.62,
    description: 'Chapa de fibra de madeira/eucatex separadora de camadas'
  },
  {
    id: 'pa_comercial',
    code: 'PA_COMERCIAL',
    name: 'Produtos Acabados (P.A. Comercial)',
    category: 'Produto Acabado',
    defaultCost: 18.00,
    description: 'Cervejas e refrigerantes comerciais acabados'
  }
];

// O(1) Quick Lookup Map by clean ID/Code
const PRICE_MAP = new Map<string, number>();
PLATFORM_STANDARD_PRICES.forEach(item => {
  PRICE_MAP.set(item.id.toLowerCase(), item.defaultCost);
  PRICE_MAP.set(item.code.toLowerCase(), item.defaultCost);
});

function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Retorna o Custo Unitário Oficial de qualquer Ativo ou Produto na Plataforma.
 * Altamente resiliente a variações de acentuação, maiúsculas, códigos e descrições.
 */
export function getStandardItemCost(
  assetOrItemId?: string | null,
  assetOrItemName?: string | null,
  customActiveAssets?: ActiveAsset[],
  customProducts?: Product[]
): number {
  const targetId = (assetOrItemId || '').toLowerCase().trim();
  const targetName = removeAccents(assetOrItemName || '');

  // 1. Direct Map Lookup
  if (targetId && PRICE_MAP.has(targetId)) {
    return PRICE_MAP.get(targetId)!;
  }

  // 2. Keyword & Alias Matching (Robust with accent normalization)
  // Garrafeiras (Caixas Plásticas)
  if (targetName.includes('garrafeira') || targetName.includes('gfe') || targetName.includes('engradado') || targetName.includes('caixa')) {
    if (targetName.includes('600')) return 43.86;
    if (targetName.includes('300') || targetName.includes('litrinho') || targetName.includes('mini')) return 29.77;
    if (targetName.includes('1l') || targetName.includes('1 l') || targetName.includes('litrao') || targetName.includes('litro')) return 45.27;
    return 43.86;
  }

  // Vasilhames (Garrafas de Vidro)
  if (targetName.includes('garrafa') || targetName.includes('vasilhame') || targetName.includes('vidro') || targetName.includes('ret')) {
    if (targetName.includes('300') || targetName.includes('litrinho') || targetName.includes('mini')) return 0.66;
    if (targetName.includes('600')) return 1.47;
    if (targetName.includes('1l') || targetName.includes('1 l') || targetName.includes('litrao') || targetName.includes('litro')) return 2.68;
    if (targetName.includes('rgb') || targetName.includes('nab') || targetName.includes('refri')) return 2.06;
  }

  // Barril Chopp
  if (targetName.includes('chopp') || targetName.includes('barril') || targetName.includes('keg') || targetId.includes('chopp') || targetId.includes('barril')) {
    return 550.14;
  }

  // Paletes
  if (targetName.includes('pbr 2') || targetName.includes('pbr2') || targetId === 'pbr2' || targetId === '500022') {
    return 9.70;
  }
  if (targetName.includes('palete') || targetName.includes('pbr') || targetId.includes('pbr') || targetId === '500021' || targetId === 'pal_pbr') {
    return 9.79;
  }

  // Chapatex
  if (targetName.includes('chapatex') || targetName.includes('chapa') || targetId.includes('chapatex')) {
    return 8.62;
  }

  // 3. Fallback to custom active assets
  if (customActiveAssets && customActiveAssets.length > 0) {
    const found = customActiveAssets.find(a => 
      (targetId && a.id.toLowerCase() === targetId) || 
      (targetName && removeAccents(a.name) === targetName)
    );
    if (found && found.cost && found.cost > 0) return found.cost;
  }

  // 4. Fallback to custom products
  if (customProducts && customProducts.length > 0) {
    const found = customProducts.find(p => 
      (targetId && p.code.toLowerCase() === targetId) || 
      (targetName && removeAccents(p.description) === targetName)
    );
    if (found && found.cost && found.cost > 0) return found.cost;
  }

  // 5. Default fallback for standard assets
  return 8.62;
}
