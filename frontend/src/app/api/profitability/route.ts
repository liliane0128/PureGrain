// Import de NextResponse pour renvoyer des résultats JSON depuis le serveur.
import { NextResponse } from 'next/server';

// Catégories économiques supportées par le tableau de pilotage.
type ProfitabilityMode = 'cultures' | 'fientes';

// Cultures disponibles dans le moteur de rentabilité.
type AdminCropKey = 'ble' | 'mais' | 'colza' | 'tournesol';

// Espèces disponibles dans le moteur fientes.
type AdminPoultryKey = 'poulet' | 'poule' | 'dinde' | 'canard';

// Requête JSON reçue par l'API.
type ProfitabilityRequest = {
  mode?: unknown;
  key?: unknown;
  quantity?: unknown;
  buyPriceTonne?: unknown;
  sellPrice?: unknown;
  logisticCostTonne?: unknown;
  processingCost?: unknown;
};

// Données issues de calc_rentabilite_cultures 2.py.
const CROPS_DATA: Record<
  AdminCropKey,
  {
    label: string;
    yieldWasteTotalKgHa: number;
    recoveryRate: number;
    marketPriceTonne: number;
  }
> = {
  mais: {
    label: 'Maïs',
    yieldWasteTotalKgHa: 7100,
    recoveryRate: 0.7,
    marketPriceTonne: 45,
  },
  ble: {
    label: 'Blé',
    yieldWasteTotalKgHa: 5000,
    recoveryRate: 0.7,
    marketPriceTonne: 38,
  },
  colza: {
    label: 'Colza',
    yieldWasteTotalKgHa: 4000,
    recoveryRate: 0.7,
    marketPriceTonne: 52,
  },
  tournesol: {
    label: 'Tournesol',
    yieldWasteTotalKgHa: 3000,
    recoveryRate: 0.7,
    marketPriceTonne: 48,
  },
};

// Données issues de calc_rentabilite_fientes.py.
const POULTRY_DATA: Record<
  AdminPoultryKey,
  {
    label: string;
    manureKgAnimalYear: number;
    dryMatterPct: number;
    marketPriceTonneRaw: number;
  }
> = {
  poulet: {
    label: 'Poulet de chair',
    manureKgAnimalYear: 2.2,
    dryMatterPct: 0.6,
    marketPriceTonneRaw: 12,
  },
  poule: {
    label: 'Poule pondeuse',
    manureKgAnimalYear: 45,
    dryMatterPct: 0.5,
    marketPriceTonneRaw: 15,
  },
  dinde: {
    label: 'Dinde',
    manureKgAnimalYear: 60,
    dryMatterPct: 0.55,
    marketPriceTonneRaw: 14,
  },
  canard: {
    label: 'Canard',
    manureKgAnimalYear: 35,
    dryMatterPct: 0.45,
    marketPriceTonneRaw: 10,
  },
};

// Ratio de transformation issu du script cultures: 1 kg de déchet vers 0,15 kg de larves déshydratées.
const WASTE_TO_LARVAE_RATIO = 0.15;

// Vérifie que la catégorie demandée est connue.
function isProfitabilityMode(value: unknown): value is ProfitabilityMode {
  // Accepte uniquement les deux modes de pilotage économique.
  return value === 'cultures' || value === 'fientes';
}

// Vérifie que la culture demandée existe dans le moteur.
function isAdminCropKey(value: unknown): value is AdminCropKey {
  // Accepte les clés reprises du script Python fourni.
  return value === 'ble' || value === 'mais' || value === 'colza' || value === 'tournesol';
}

// Vérifie que l'espèce demandée existe dans le moteur.
function isAdminPoultryKey(value: unknown): value is AdminPoultryKey {
  // Accepte les clés reprises du script Python fourni.
  return value === 'poulet' || value === 'poule' || value === 'dinde' || value === 'canard';
}

// Convertit une valeur inconnue en nombre exploitable, avec valeur de repli.
function numberOrDefault(value: unknown, fallback: number) {
  // Convertit la valeur transmise par le client.
  const parsed = Number(value);

  // Renvoie le nombre si celui-ci est fini, sinon la valeur par défaut.
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Arrondit une valeur financière ou volumique à deux décimales.
function round2(value: number) {
  // Évite les longues décimales dans le JSON consommé par l'interface.
  return Math.round(value * 100) / 100;
}

// Calcule le prix d'achat recommandé selon calculateur_prix_achat 2.py.
function getRecommendedBuyPrice(mode: ProfitabilityMode, key: AdminCropKey | AdminPoultryKey) {
  // Données de référence du calculateur de prix d'achat.
  const marketData = {
    cultures: {
      ble: { label: 'Blé tendre', marketPriceTonne: 55, premiumPct: 15 },
      mais: { label: 'Maïs grain', marketPriceTonne: 42, premiumPct: 20 },
      colza: {
        label: 'Colza',
        marketPriceTonne: CROPS_DATA.colza.marketPriceTonne,
        premiumPct: 15,
      },
      tournesol: {
        label: 'Tournesol',
        marketPriceTonne: CROPS_DATA.tournesol.marketPriceTonne,
        premiumPct: 15,
      },
    },
    fientes: {
      poulet: { label: 'Poulet de chair', marketPriceTonne: 22, premiumPct: 10 },
      poule: { label: 'Poule pondeuse', marketPriceTonne: 22, premiumPct: 10 },
      dinde: {
        label: 'Dinde',
        marketPriceTonne: POULTRY_DATA.dinde.marketPriceTonneRaw,
        premiumPct: 10,
      },
      canard: {
        label: 'Canard',
        marketPriceTonne: POULTRY_DATA.canard.marketPriceTonneRaw,
        premiumPct: 10,
      },
    },
  } as const;

  // Récupère la donnée correspondant au mode et à la clé.
  const data =
    mode === 'cultures'
      ? marketData.cultures[key as AdminCropKey]
      : marketData.fientes[key as AdminPoultryKey];

  // Calcule le prix d'achat recommandé avec prime Pure Grain.
  const recommendedBuyPrice = data.marketPriceTonne * (1 + data.premiumPct / 100);

  // Renvoie les informations utiles au tableau de pilotage.
  return {
    label: data.label,
    marketPriceTonne: data.marketPriceTonne,
    premiumPct: data.premiumPct,
    recommendedBuyPrice: round2(recommendedBuyPrice),
  };
}

// Calcule la rentabilité plateforme sur les coproduits de cultures.
function computeCropProfitability(request: ProfitabilityRequest) {
  // Valide la culture demandée.
  if (!isAdminCropKey(request.key)) {
    return null;
  }

  // Récupère les données de la culture.
  const crop = CROPS_DATA[request.key];
  // Surface exploitée dans la simulation.
  const hectares = Math.max(0, numberOrDefault(request.quantity, 100));
  // Prix d'achat par tonne payé à l'agriculteur.
  const buyPriceTonne = Math.max(0, numberOrDefault(request.buyPriceTonne, 50));
  // Prix de vente des larves en euros par kilo.
  const sellPriceLarvaeKg = Math.max(0, numberOrDefault(request.sellPrice, 12));
  // Coût logistique par tonne de déchet.
  const logisticCostTonne = Math.max(0, numberOrDefault(request.logisticCostTonne, 15));
  // Coût de transformation par kilo de larves produit.
  const processingCostKgLarvae = Math.max(0, numberOrDefault(request.processingCost, 0.8));

  // Calcule le volume récupérable par hectare.
  const tonnesPerHa = (crop.yieldWasteTotalKgHa * crop.recoveryRate) / 1000;
  // Calcule les tonnes totales de déchets récupérées.
  const totalTonnesWaste = tonnesPerHa * hectares;
  // Calcule la production de larves déshydratées.
  const totalKgLarvae = totalTonnesWaste * 1000 * WASTE_TO_LARVAE_RATIO;

  // Calcule les coûts d'achat, logistique et transformation.
  const costPurchase = totalTonnesWaste * buyPriceTonne;
  const costLogistics = totalTonnesWaste * logisticCostTonne;
  const costProcessing = totalKgLarvae * processingCostKgLarvae;
  const totalCosts = costPurchase + costLogistics + costProcessing;

  // Calcule le chiffre d'affaires sur la vente de larves.
  const revenueTotal = totalKgLarvae * sellPriceLarvaeKg;
  // Calcule la marge nette plateforme.
  const grossMargin = revenueTotal - totalCosts;
  // Calcule le taux de marge.
  const marginPct = revenueTotal > 0 ? (grossMargin / revenueTotal) * 100 : 0;
  // Calcule le point mort en prix de vente larves.
  const breakEvenSellPrice = totalKgLarvae > 0 ? totalCosts / totalKgLarvae : 0;
  // Calcule le prix d'achat recommandé.
  const recommended = getRecommendedBuyPrice('cultures', request.key);

  // Renvoie un résultat structuré pour le dashboard.
  return {
    mode: 'cultures',
    label: crop.label,
    unitLabel: 'hectares',
    recommended,
    volume: {
      input: hectares,
      primaryLabel: 'Déchets récupérables',
      primaryValue: round2(totalTonnesWaste),
      primaryUnit: 't',
      secondaryLabel: 'Larves produites',
      secondaryValue: round2(totalKgLarvae),
      secondaryUnit: 'kg',
    },
    finance: {
      costPurchase: round2(costPurchase),
      costLogistics: round2(costLogistics),
      costProcessing: round2(costProcessing),
      totalCosts: round2(totalCosts),
      revenueTotal: round2(revenueTotal),
      grossMargin: round2(grossMargin),
      marginPct: round2(marginPct),
      breakEvenSellPrice: round2(breakEvenSellPrice),
    },
  };
}

// Calcule la rentabilité plateforme sur les fientes d'élevage.
function computePoultryProfitability(request: ProfitabilityRequest) {
  // Valide l'espèce demandée.
  if (!isAdminPoultryKey(request.key)) {
    return null;
  }

  // Récupère les données de l'espèce.
  const species = POULTRY_DATA[request.key];
  // Nombre d'animaux dans la simulation.
  const animals = Math.max(0, numberOrDefault(request.quantity, 20000));
  // Prix d'achat par tonne payé à l'éleveur.
  const buyPriceTonne = Math.max(0, numberOrDefault(request.buyPriceTonne, 20));
  // Prix de vente de l'engrais en euros par kilo.
  const sellPriceFertilizerKg = Math.max(0, numberOrDefault(request.sellPrice, 0.85));
  // Coût logistique par tonne brute.
  const logisticCostTonne = Math.max(0, numberOrDefault(request.logisticCostTonne, 20));
  // Coût de traitement par tonne brute.
  const processingCostTonne = Math.max(0, numberOrDefault(request.processingCost, 45));

  // Calcule le tonnage brut annuel.
  const totalTonnesRaw = (animals * species.manureKgAnimalYear) / 1000;
  // Calcule le tonnage final après séchage ou stabilisation.
  const totalTonnesFinal = totalTonnesRaw * species.dryMatterPct;

  // Calcule les coûts d'achat, logistique et transformation.
  const costPurchase = totalTonnesRaw * buyPriceTonne;
  const costLogistics = totalTonnesRaw * logisticCostTonne;
  const costProcessing = totalTonnesRaw * processingCostTonne;
  const totalCosts = costPurchase + costLogistics + costProcessing;

  // Calcule le chiffre d'affaires sur la vente d'engrais.
  const revenueTotal = totalTonnesFinal * 1000 * sellPriceFertilizerKg;
  // Calcule la marge nette plateforme.
  const grossMargin = revenueTotal - totalCosts;
  // Calcule le taux de marge.
  const marginPct = revenueTotal > 0 ? (grossMargin / revenueTotal) * 100 : 0;
  // Calcule le point mort en prix de vente engrais.
  const breakEvenSellPrice = totalTonnesFinal > 0 ? totalCosts / (totalTonnesFinal * 1000) : 0;
  // Calcule le prix d'achat recommandé.
  const recommended = getRecommendedBuyPrice('fientes', request.key);

  // Renvoie un résultat structuré pour le dashboard.
  return {
    mode: 'fientes',
    label: species.label,
    unitLabel: 'animaux',
    recommended,
    volume: {
      input: animals,
      primaryLabel: 'Fientes brutes',
      primaryValue: round2(totalTonnesRaw),
      primaryUnit: 't',
      secondaryLabel: 'Engrais final',
      secondaryValue: round2(totalTonnesFinal),
      secondaryUnit: 't',
    },
    finance: {
      costPurchase: round2(costPurchase),
      costLogistics: round2(costLogistics),
      costProcessing: round2(costProcessing),
      totalCosts: round2(totalCosts),
      revenueTotal: round2(revenueTotal),
      grossMargin: round2(grossMargin),
      marginPct: round2(marginPct),
      breakEvenSellPrice: round2(breakEvenSellPrice),
    },
  };
}

// Route API appelée par la section interactive de rentabilité.
export async function POST(request: Request) {
  // Lit le JSON envoyé par le frontend.
  const body = (await request.json()) as ProfitabilityRequest;

  // Vérifie que le mode demandé est valide.
  if (!isProfitabilityMode(body.mode)) {
    return NextResponse.json(
      { message: 'Mode de rentabilité non pris en charge.' },
      { status: 400 }
    );
  }

  // Lance le calcul correspondant au mode choisi.
  const result =
    body.mode === 'cultures' ? computeCropProfitability(body) : computePoultryProfitability(body);

  // Refuse les clés inconnues pour éviter un calcul incohérent.
  if (!result) {
    return NextResponse.json({ message: 'Flux non pris en charge.' }, { status: 400 });
  }

  // Renvoie le résultat de rentabilité au client.
  return NextResponse.json(result);
}
