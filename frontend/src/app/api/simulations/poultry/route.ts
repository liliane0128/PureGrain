// Import de NextResponse pour renvoyer une réponse JSON depuis la route serveur.
import { NextResponse } from 'next/server';

// Espèces de volaille acceptées par le moteur de calcul.
type PoultryKey = 'poulet_chair' | 'poule_pondeuse';

// Méthodes de traitement acceptées par le moteur de calcul.
type ProcessingKey = 'fraiche' | 'compostee' | 'granule';

// Structure des données biologiques de production de fientes.
type PoultryData = {
  label: string;
  fienteKgPerAnimalPerYear: number;
  nitrogenPct: number;
  phosphorusPct: number;
};

// Structure des données économiques de traitement.
type ProcessingData = {
  label: string;
  pricePerTonne: number;
  priceLow: number;
  priceHigh: number;
  massCoeff: number;
};

// Structure de la requête reçue depuis le formulaire frontend.
type PoultrySimulationRequest = {
  poultryType?: unknown;
  processingType?: unknown;
  animals?: unknown;
};

// Données issues du moteur fourni dans Calcule_prix, limitées aux volailles utiles au prototype.
const POULTRY: Record<PoultryKey, PoultryData> = {
  poulet_chair: {
    label: 'Poulet de chair',
    fienteKgPerAnimalPerYear: 9.5,
    nitrogenPct: 2.5,
    phosphorusPct: 1.8,
  },
  poule_pondeuse: {
    label: 'Poule pondeuse',
    fienteKgPerAnimalPerYear: 52,
    nitrogenPct: 3.2,
    phosphorusPct: 2.1,
  },
};

// Données de prix et de réduction de masse selon la méthode de traitement.
const PROCESSING: Record<ProcessingKey, ProcessingData> = {
  fraiche: {
    label: 'Fiente fraîche',
    pricePerTonne: 22,
    priceLow: 15,
    priceHigh: 30,
    massCoeff: 1,
  },
  compostee: {
    label: 'Fiente compostée',
    pricePerTonne: 85,
    priceLow: 60,
    priceHigh: 110,
    massCoeff: 0.55,
  },
  granule: {
    label: 'Granulé séché',
    pricePerTonne: 320,
    priceLow: 250,
    priceHigh: 400,
    massCoeff: 0.28,
  },
};

// Vérifie qu'une valeur correspond bien à une espèce prise en charge.
function isPoultryKey(value: unknown): value is PoultryKey {
  // Accepte uniquement les deux espèces visibles dans l'interface.
  return value === 'poulet_chair' || value === 'poule_pondeuse';
}

// Vérifie qu'une valeur correspond bien à une méthode de traitement prise en charge.
function isProcessingKey(value: unknown): value is ProcessingKey {
  // Accepte uniquement les méthodes définies par le moteur de calcul.
  return value === 'fraiche' || value === 'compostee' || value === 'granule';
}

// Calcule la valorisation des déchets biologiques de volaille.
function computePoultrySimulation(
  animals: number,
  poultryType: PoultryKey,
  processingType: ProcessingKey
) {
  // Récupère les paramètres biologiques de l'espèce.
  const poultry = POULTRY[poultryType];
  // Récupère les paramètres économiques du traitement.
  const processing = PROCESSING[processingType];
  // Calcule la masse brute de fientes produite par an.
  const rawFienteKg = animals * poultry.fienteKgPerAnimalPerYear;
  // Applique le coefficient de réduction lié au compostage ou au séchage.
  const processedKg = rawFienteKg * processing.massCoeff;
  // Convertit la masse traitée en tonnes.
  const processedTonnes = processedKg / 1000;
  // Calcule le revenu central.
  const revenueEuros = processedTonnes * processing.pricePerTonne;
  // Calcule une fourchette basse.
  const revenueLowEuros = processedTonnes * processing.priceLow;
  // Calcule une fourchette haute.
  const revenueHighEuros = processedTonnes * processing.priceHigh;
  // Calcule la quantité d'azote organique contenue dans la fiente brute.
  const nitrogenKg = rawFienteKg * (poultry.nitrogenPct / 100);
  // Calcule la quantité de phosphore P2O5 contenue dans la fiente brute.
  const phosphorusKg = rawFienteKg * (poultry.phosphorusPct / 100);
  // Estime l'urée chimique remplacée, avec une efficacité d'utilisation prudente de 70%.
  const equivalentUreaKg = nitrogenKg / 0.46 / 0.7;
  // Estime le CO2 évité par rapport à une production d'azote chimique.
  const co2SavedKg = nitrogenKg * 3;

  // Renvoie les valeurs utiles au frontend sans exposer les tables de calcul dans le bundle client.
  return {
    poultryLabel: poultry.label,
    processingLabel: processing.label,
    amount: revenueEuros,
    rawFienteKg,
    processedKg,
    processedTonnes,
    pricePerTon: processing.pricePerTonne,
    revenueLowEuros,
    revenueHighEuros,
    nitrogenKg,
    phosphorusKg,
    equivalentUreaKg,
    co2SavedKg,
  };
}

/**
 * Route serveur du simulateur volaille.
 * Le frontend envoie seulement le nombre d'animaux, l'espèce et le traitement.
 */
export async function POST(request: Request) {
  // Lit le corps JSON envoyé par le formulaire.
  const body = (await request.json()) as PoultrySimulationRequest;
  // Extrait l'espèce demandée.
  const poultryType = body.poultryType;
  // Extrait la méthode de traitement demandée.
  const processingType = body.processingType;
  // Convertit le nombre d'animaux en nombre exploitable.
  const animals = Number(body.animals);

  // Refuse les espèces inconnues.
  if (!isPoultryKey(poultryType)) {
    return NextResponse.json(
      { message: 'Espèce de volaille non prise en charge.' },
      { status: 400 }
    );
  }

  // Refuse les traitements inconnus.
  if (!isProcessingKey(processingType)) {
    return NextResponse.json({ message: 'Traitement non pris en charge.' }, { status: 400 });
  }

  // Refuse les cheptels invalides ou nuls.
  if (!Number.isFinite(animals) || animals <= 0) {
    return NextResponse.json({ message: "Nombre d'animaux invalide." }, { status: 400 });
  }

  // Exécute le calcul serveur et renvoie le résultat au client.
  return NextResponse.json(computePoultrySimulation(animals, poultryType, processingType));
}
