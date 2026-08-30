import { Product, ActiveAsset } from '../types';
import { DEFAULT_PRODUCTS, DEFAULT_ACTIVE_ASSETS } from '../data';

export interface ResolvedCatalogItem {
  code: string;
  description: string;
  segment: 'PA' | 'AG';
  category: string;
  unit: string;
  cost: number;
  hectolitersPerUnit: number;
  group?: string;
}

// Canonical static mappings for common legacy strings/abbreviations to official catalog items
const CATALOG_ALIAS_MAP: Record<string, { code: string; desc: string; segment: 'PA' | 'AG'; category: string; cost: number; hlPerUnit: number }> = {
  // P.A. (Produtos Acabados)
  'skol pilsen 350ml lata': { code: '9068', desc: 'SKOL LATA 350ML SH C/12 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.52, hlPerUnit: 0.0035 },
  'skol 350ml': { code: '9068', desc: 'SKOL LATA 350ML SH C/12 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.52, hlPerUnit: 0.0035 },
  'skol lata 350ml': { code: '9068', desc: 'SKOL LATA 350ML SH C/12 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.52, hlPerUnit: 0.0035 },
  'skol 600ml': { code: '982', desc: 'SKOL 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 53.35, hlPerUnit: 0.006 },
  'skol 1l': { code: '1388', desc: 'SKOL GFA VD 1L 2,99', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 51.44, hlPerUnit: 0.010 },

  'stella artois 330ml ln': { code: '18807', desc: 'STELLA ARTOIS LONG NECK 330ML SIX-PACK SHRINK C/4', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 101.72, hlPerUnit: 0.0033 },
  'stella artois 330ml': { code: '18807', desc: 'STELLA ARTOIS LONG NECK 330ML SIX-PACK SHRINK C/4', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 101.72, hlPerUnit: 0.0033 },
  'stella artois 600 ml': { code: '20530', desc: 'STELLA ARTOIS 600 ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 64.71, hlPerUnit: 0.006 },
  'stella artois 600ml': { code: '20530', desc: 'STELLA ARTOIS 600 ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 64.71, hlPerUnit: 0.006 },

  'brahma duplo malte 600ml': { code: '20329', desc: 'BRAHMA DUPLO MALTE 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 54.69, hlPerUnit: 0.006 },
  'brahma duplo malte': { code: '20329', desc: 'BRAHMA DUPLO MALTE 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 54.69, hlPerUnit: 0.006 },
  'brahma chopp 600ml': { code: '983', desc: 'BRAHMA CHOPP 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 53.35, hlPerUnit: 0.006 },
  'brahma chopp 350ml': { code: '9069', desc: 'BRAHMA CHOPP LATA 350ML SH C/12 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.51, hlPerUnit: 0.0035 },

  'spaten 600ml retornável': { code: '23186', desc: 'SPATEN N 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 60.57, hlPerUnit: 0.006 },
  'spaten 600ml retorna': { code: '23186', desc: 'SPATEN N 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 60.57, hlPerUnit: 0.006 },
  'spaten 600ml': { code: '23186', desc: 'SPATEN N 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 60.57, hlPerUnit: 0.006 },
  'spaten 350ml lata': { code: '21658', desc: 'SPATEN N LT SLEEK 350ML CX CART C 12', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 40.16, hlPerUnit: 0.0035 },
  'spaten 350ml': { code: '21658', desc: 'SPATEN N LT SLEEK 350ML CX CART C 12', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 40.16, hlPerUnit: 0.0035 },

  'corona extra 330ml': { code: '18836', desc: 'CORONA EXTRA N LONG NECK 330ML CX C/24 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 118.01, hlPerUnit: 0.0033 },
  'corona extra': { code: '18836', desc: 'CORONA EXTRA N LONG NECK 330ML CX C/24 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 118.01, hlPerUnit: 0.0033 },

  'budweiser 330ml ln': { code: '17808', desc: 'BUDWEISER OW 330ML CX C/24', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 90.67, hlPerUnit: 0.0033 },
  'budweiser 330ml': { code: '17808', desc: 'BUDWEISER OW 330ML CX C/24', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 90.67, hlPerUnit: 0.0033 },

  'beats senses 269ml lata': { code: '13566', desc: 'SKOL BEATS SENSES LT 269ML CX C/8 FRIDGE PACK', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 29.40, hlPerUnit: 0.00269 },
  'beats senses 269ml': { code: '13566', desc: 'SKOL BEATS SENSES LT 269ML CX C/8 FRIDGE PACK', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 29.40, hlPerUnit: 0.00269 },
  'skol beats gt 269ml': { code: '21119', desc: 'SKOL BEATS GT LT 269ML CX CARTAO C/8 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 31.27, hlPerUnit: 0.00269 },
  'beats gt 269ml': { code: '21119', desc: 'SKOL BEATS GT LT 269ML CX CARTAO C/8 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 31.27, hlPerUnit: 0.00269 },

  'guaraná antarctica 2l pet': { code: '2353', desc: 'GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.09, hlPerUnit: 0.020 },
  'guarana antarctica 2l pet': { code: '2353', desc: 'GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.09, hlPerUnit: 0.020 },
  'guaraná antarctica 2l': { code: '2353', desc: 'GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 28.09, hlPerUnit: 0.020 },

  'antarctica sub zero 350ml': { code: '9427', desc: 'ANTARCTICA PILSEN LT 473ML SH C/12 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 45.90, hlPerUnit: 0.0035 },

  // A.G. (Ativos de Giro)
  'garrafeira 600ml (gfe 600)': { code: '899599', desc: 'GARRAFEIRA 600ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 43.86, hlPerUnit: 0 },
  'garrafeira 600ml': { code: '899599', desc: 'GARRAFEIRA 600ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 43.86, hlPerUnit: 0 },
  'garrafeiras 600ml': { code: '899599', desc: 'GARRAFEIRA 600ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 43.86, hlPerUnit: 0 },
  'gfe 600': { code: '899599', desc: 'GARRAFEIRA 600ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 43.86, hlPerUnit: 0 },

  'garrafeira litrinho 300ml (gfe 300)': { code: '863059', desc: 'GARRAFEIRA 300ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 29.77, hlPerUnit: 0 },
  'garrafeira litrinho 300ml': { code: '863059', desc: 'GARRAFEIRA 300ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 29.77, hlPerUnit: 0 },
  'garrafeira 300ml litrinho': { code: '863059', desc: 'GARRAFEIRA 300ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 29.77, hlPerUnit: 0 },
  'garrafeira 300ml': { code: '863059', desc: 'GARRAFEIRA 300ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 29.77, hlPerUnit: 0 },
  'gfe 300': { code: '863059', desc: 'GARRAFEIRA 300ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 29.77, hlPerUnit: 0 },

  'garrafeira litrão 1l (gfe 1l)': { code: '188005', desc: 'GARRAFEIRA 1L', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 45.27, hlPerUnit: 0 },
  'garrafeira litrao 1l (gfe 1l)': { code: '188005', desc: 'GARRAFEIRA 1L', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 45.27, hlPerUnit: 0 },
  'garrafeira 1l': { code: '188005', desc: 'GARRAFEIRA 1L', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 45.27, hlPerUnit: 0 },
  'gfe 1l': { code: '188005', desc: 'GARRAFEIRA 1L', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 45.27, hlPerUnit: 0 },

  'palete pbr 1': { code: 'pal_pbr', desc: 'PALETE PBR 1', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 9.79, hlPerUnit: 0 },
  'palete pbr padrão': { code: 'pal_pbr', desc: 'PALETE PBR 1', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 9.79, hlPerUnit: 0 },
  'palete pbr padrao': { code: 'pal_pbr', desc: 'PALETE PBR 1', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 9.79, hlPerUnit: 0 },
  'paletes de vasilhame': { code: 'pal_pbr', desc: 'PALETE PBR 1', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 9.79, hlPerUnit: 0 },

  'garrafa 600 âmbar (ret)': { code: '27983', desc: 'GARRAFA 600 ÂMBAR (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 1.47, hlPerUnit: 0 },
  'garrafa 600 ambar (ret)': { code: '27983', desc: 'GARRAFA 600 ÂMBAR (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 1.47, hlPerUnit: 0 },
  'vasilhame 600ml âmbar': { code: '27983', desc: 'GARRAFA 600 ÂMBAR (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 1.47, hlPerUnit: 0 },
  'vasilhame 600ml ambar': { code: '27983', desc: 'GARRAFA 600 ÂMBAR (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 1.47, hlPerUnit: 0 },
  'garrafas 600ml âmbar': { code: '27983', desc: 'GARRAFA 600 ÂMBAR (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 1.47, hlPerUnit: 0 },

  'garrafa verde 600ml (ret)': { code: '786238', desc: 'GARRAFA VERDE 600ML (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 1.47, hlPerUnit: 0 },
  'garrafa 300ml (ret)': { code: '198214', desc: 'GARRAFA 300ML (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 0.66, hlPerUnit: 0 },
  'garrafa 1l(ret)': { code: '188006', desc: 'GARRAFA 1L(RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 2.68, hlPerUnit: 0 },
  'garrafa 1l (ret)': { code: '188006', desc: 'GARRAFA 1L(RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 2.68, hlPerUnit: 0 },

  'chapatex': { code: 'chapatex', desc: 'CHAPATEX', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 8.62, hlPerUnit: 0 },
  'chapatex padrão': { code: 'chapatex', desc: 'CHAPATEX', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 8.62, hlPerUnit: 0 },
  'chapatex padrao': { code: 'chapatex', desc: 'CHAPATEX', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', cost: 8.62, hlPerUnit: 0 }
};

/**
 * Resolves any raw product code, asset ID, or free-text description into the official
 * Product Code and Official Description from the master catalog (Cadastro de Produtos / Cadastro de Ativos de Giro).
 */
export function resolveOfficialCatalogItem(
  rawCode?: string | number | null,
  rawNameOrDesc?: string | null,
  dynamicProducts?: Product[],
  dynamicAssets?: ActiveAsset[]
): ResolvedCatalogItem {
  const prodList = dynamicProducts && dynamicProducts.length > 0 ? dynamicProducts : DEFAULT_PRODUCTS;
  const assetList = dynamicAssets && dynamicAssets.length > 0 ? dynamicAssets : DEFAULT_ACTIVE_ASSETS;

  const codeStr = rawCode !== undefined && rawCode !== null ? String(rawCode).trim() : '';
  const cleanCode = codeStr.replace(/^0+/, '');
  const nameStr = rawNameOrDesc !== undefined && rawNameOrDesc !== null ? String(rawNameOrDesc).trim() : '';
  const lowerName = nameStr.toLowerCase().replace(/[\t\n\r]/g, ' ').replace(/\s+/g, ' ');

  // 1. Direct code lookup in Active Assets
  if (codeStr) {
    const matchedAsset = assetList.find(a => a.id === codeStr || a.id.toLowerCase() === codeStr.toLowerCase());
    if (matchedAsset) {
      return {
        code: matchedAsset.id,
        description: matchedAsset.name,
        segment: 'AG',
        category: 'ATIVOS DE GIRO (A.G.)',
        unit: 'un',
        cost: matchedAsset.cost,
        hectolitersPerUnit: 0
      };
    }
  }

  // 2. Direct code lookup in Products
  if (codeStr) {
    const matchedProduct = prodList.find(p => p.code === codeStr || p.code === cleanCode);
    if (matchedProduct) {
      const hl = matchedProduct.hectoFactor || getHectoliterFromDesc(matchedProduct.description);
      return {
        code: matchedProduct.code,
        description: matchedProduct.description,
        segment: 'PA',
        category: 'PRODUTO ACABADO (P.A.)',
        unit: matchedProduct.unit || 'un',
        cost: matchedProduct.cost,
        hectolitersPerUnit: hl,
        group: matchedProduct.group
      };
    }
  }

  // 3. Exact alias dictionary match
  if (CATALOG_ALIAS_MAP[lowerName]) {
    const alias = CATALOG_ALIAS_MAP[lowerName];
    return {
      code: alias.code,
      description: alias.desc,
      segment: alias.segment,
      category: alias.category,
      unit: 'un',
      cost: alias.cost,
      hectolitersPerUnit: alias.hlPerUnit
    };
  }

  // 4. Exact match in Active Assets by name
  if (nameStr) {
    const matchedAssetByName = assetList.find(a => a.name.toUpperCase() === nameStr.toUpperCase());
    if (matchedAssetByName) {
      return {
        code: matchedAssetByName.id,
        description: matchedAssetByName.name,
        segment: 'AG',
        category: 'ATIVOS DE GIRO (A.G.)',
        unit: 'un',
        cost: matchedAssetByName.cost,
        hectolitersPerUnit: 0
      };
    }
  }

  // 5. Exact match in Products by description
  if (nameStr) {
    const matchedProdByName = prodList.find(p => p.description.toUpperCase() === nameStr.toUpperCase());
    if (matchedProdByName) {
      const hl = matchedProdByName.hectoFactor || getHectoliterFromDesc(matchedProdByName.description);
      return {
        code: matchedProdByName.code,
        description: matchedProdByName.description,
        segment: 'PA',
        category: 'PRODUTO ACABADO (P.A.)',
        unit: matchedProdByName.unit || 'un',
        cost: matchedProdByName.cost,
        hectolitersPerUnit: hl,
        group: matchedProdByName.group
      };
    }
  }

  // 6. Heuristic keyword match for active assets
  if (lowerName) {
    if (lowerName.includes('garrafeira') && (lowerName.includes('600') || lowerName.includes('600ml'))) {
      return { code: '899599', description: 'GARRAFEIRA 600ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 43.86, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('garrafeira') && (lowerName.includes('300') || lowerName.includes('litrinho'))) {
      return { code: '863059', description: 'GARRAFEIRA 300ML', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 29.77, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('garrafeira') && (lowerName.includes('1l') || lowerName.includes('litrão') || lowerName.includes('litrao'))) {
      return { code: '188005', description: 'GARRAFEIRA 1L', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 45.27, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('palete') || lowerName.includes('pbr')) {
      return { code: 'pal_pbr', description: 'PALETE PBR 1', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 9.79, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('chapatex')) {
      return { code: 'chapatex', description: 'CHAPATEX', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 8.62, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('ambar') || lowerName.includes('âmbar')) {
      return { code: '27983', description: 'GARRAFA 600 ÂMBAR (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 1.47, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('verde') && lowerName.includes('600')) {
      return { code: '786238', description: 'GARRAFA VERDE 600ML (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 1.47, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('garrafa') && (lowerName.includes('300') || lowerName.includes('300ml'))) {
      return { code: '198214', description: 'GARRAFA 300ML (RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 0.66, hectolitersPerUnit: 0 };
    }
    if (lowerName.includes('garrafa') && lowerName.includes('1l')) {
      return { code: '188006', description: 'GARRAFA 1L(RET)', segment: 'AG', category: 'ATIVOS DE GIRO (A.G.)', unit: 'un', cost: 2.68, hectolitersPerUnit: 0 };
    }
  }

  // 7. Heuristic keyword match for products
  if (lowerName) {
    if (lowerName.includes('spaten') && (lowerName.includes('350') || lowerName.includes('lata'))) {
      return { code: '21658', description: 'SPATEN N LT SLEEK 350ML CX CART C 12', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 40.16, hectolitersPerUnit: 0.0035, group: 'CERVEJA' };
    }
    if (lowerName.includes('spaten') && (lowerName.includes('600') || lowerName.includes('retorn'))) {
      return { code: '23186', description: 'SPATEN N 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 60.57, hectolitersPerUnit: 0.006, group: 'CERVEJA' };
    }
    if (lowerName.includes('duplo malte') || (lowerName.includes('brahma') && lowerName.includes('malte'))) {
      return { code: '20329', description: 'BRAHMA DUPLO MALTE 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 54.69, hectolitersPerUnit: 0.006, group: 'CERVEJA' };
    }
    if (lowerName.includes('brahma chopp') && lowerName.includes('600')) {
      return { code: '983', description: 'BRAHMA CHOPP 600ML', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 53.35, hectolitersPerUnit: 0.006, group: 'CERVEJA' };
    }
    if (lowerName.includes('skol') && (lowerName.includes('350') || lowerName.includes('lata') || lowerName.includes('pilsen'))) {
      return { code: '9068', description: 'SKOL LATA 350ML SH C/12 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 28.52, hectolitersPerUnit: 0.0035, group: 'CERVEJA' };
    }
    if (lowerName.includes('stella')) {
      return { code: '18807', description: 'STELLA ARTOIS LONG NECK 330ML SIX-PACK SHRINK C/4', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 101.72, hectolitersPerUnit: 0.0033, group: 'CERVEJA' };
    }
    if (lowerName.includes('budweiser') || lowerName.includes('bud')) {
      return { code: '17808', description: 'BUDWEISER OW 330ML CX C/24', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 90.67, hectolitersPerUnit: 0.0033, group: 'CERVEJA' };
    }
    if (lowerName.includes('corona')) {
      return { code: '18836', description: 'CORONA EXTRA N LONG NECK 330ML CX C/24 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 118.01, hectolitersPerUnit: 0.0033, group: 'MARKETPLACE' };
    }
    if (lowerName.includes('beats gt') || lowerName.includes('skol beats gt')) {
      return { code: '21119', description: 'SKOL BEATS GT LT 269ML CX CARTAO C/8 NPAL', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 31.27, hectolitersPerUnit: 0.00269, group: 'CERVEJA' };
    }
    if (lowerName.includes('beats senses') || (lowerName.includes('beats') && lowerName.includes('269'))) {
      return { code: '13566', description: 'SKOL BEATS SENSES LT 269ML CX C/8 FRIDGE PACK', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', cost: 29.40, hectolitersPerUnit: 0.00269, group: 'CERVEJA', unit: 'un' };
    }
    if (lowerName.includes('guarana') || lowerName.includes('guaraná')) {
      return { code: '2353', description: 'GUARANA CHP ANTARCTICA DIET PET 2L CAIXA C/6', segment: 'PA', category: 'PRODUTO ACABADO (P.A.)', unit: 'un', cost: 28.09, hectolitersPerUnit: 0.020, group: 'NAB' };
    }
  }

  // Fallback if completely unmatched
  const isLikelyAG = lowerName.includes('garrafe') || lowerName.includes('palete') || lowerName.includes('garrafa') || lowerName.includes('chapa');
  return {
    code: codeStr || (isLikelyAG ? 'AG-000' : 'PA-000'),
    description: (nameStr || codeStr || 'ITEM NÃO IDENTIFICADO').toUpperCase(),
    segment: isLikelyAG ? 'AG' : 'PA',
    category: isLikelyAG ? 'ATIVOS DE GIRO (A.G.)' : 'PRODUTO ACABADO (P.A.)',
    unit: 'un',
    cost: 45.0,
    hectolitersPerUnit: getHectoliterFromDesc(nameStr)
  };
}

function getHectoliterFromDesc(desc: string): number {
  const d = (desc || '').toUpperCase();
  if (d.includes('600') || d.includes('600ML')) return 0.006;
  if (d.includes('1L') || d.includes('1000ML') || d.includes('1 LITRO')) return 0.010;
  if (d.includes('300') || d.includes('300ML') || d.includes('RGB')) return 0.003;
  if (d.includes('350') || d.includes('350ML') || d.includes('LATA')) return 0.0035;
  if (d.includes('269') || d.includes('269ML')) return 0.00269;
  if (d.includes('473') || d.includes('473ML')) return 0.00473;
  if (d.includes('330') || d.includes('330ML') || d.includes('355') || d.includes('LN') || d.includes('LONG NECK')) return 0.0033;
  if (d.includes('2L') || d.includes('PET 2L')) return 0.020;
  return 0.005;
}
