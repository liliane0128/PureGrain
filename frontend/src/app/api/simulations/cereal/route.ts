// Import de NextResponse pour renvoyer une réponse JSON depuis la route serveur.
import { NextResponse } from 'next/server';

// Types de cultures acceptés par le moteur de calcul côté serveur.
type CropKey = 'ble' | 'mais';

// Structure des données agronomiques utilisées pour le calcul réel du simulateur.
type CropData = {
  label: string;
  residueKgPerHa: number;
  marketPricePerTonne: number;
  pureGrainPremiumPct: number;
  recoveryRate: number;
};

// Structure de la requête reçue depuis le formulaire frontend.
type CerealSimulationRequest = {
  cropType?: unknown;
  hectares?: unknown;
};

// Données de calcul issues des fichiers fournis dans Calcule_prix.
const CROPS: Record<CropKey, CropData> = {
  ble: {
    label: 'Blé tendre',
    residueKgPerHa: 4200,
    marketPricePerTonne: 55,
    pureGrainPremiumPct: 15,
    recoveryRate: 0.65,
  },
  mais: {
    label: 'Maïs grain',
    residueKgPerHa: 6500,
    marketPricePerTonne: 42,
    pureGrainPremiumPct: 20,
    recoveryRate: 0.55,
  },
};

// Vérifie qu'une valeur correspond bien à une culture prise en charge.
function isCropKey(value: unknown): value is CropKey {
  // Accepte uniquement les clés présentes dans le moteur de calcul serveur.
  return value === 'ble' || value === 'mais';
}

// Calcule la valorisation agricole réelle à partir des données fournies.
function computeCerealSimulation(hectares: number, cropType: CropKey) {
  // Récupère les paramètres agronomiques de la culture sélectionnée.
  const crop = CROPS[cropType];
  // Calcule la masse totale de résidus produite sur la surface.
  const totalResidueKg = hectares * crop.residueKgPerHa;
  // Applique le taux récupérable pour préserver une part de matière organique au sol.
  const recoverableKg = totalResidueKg * crop.recoveryRate;
  // Convertit la masse récupérable en tonnes pour appliquer les prix de marché.
  const recoverableTonnes = recoverableKg / 1000;
  // Calcule le revenu théorique au prix du marché courant.
  const marketRevenueEuros = recoverableTonnes * crop.marketPricePerTonne;
  // Applique la prime Pure Grain par rapport au marché.
  const pricePerTonnePureGrain = crop.marketPricePerTonne * (1 + crop.pureGrainPremiumPct / 100);
  // Calcule le revenu proposé par la plateforme.
  const pureGrainRevenueEuros = recoverableTonnes * pricePerTonnePureGrain;
  // Calcule le gain additionnel créé par la prime de revalorisation.
  const bonusEuros = pureGrainRevenueEuros - marketRevenueEuros;
  // Calcule la quantité récupérable moyenne par hectare.
  const residuePerHa = recoverableKg / hectares;

  // Renvoie toutes les valeurs utiles au frontend sans exposer les tables de calcul.
  return {
    cropLabel: crop.label,
    amount: pureGrainRevenueEuros,
    residueTons: recoverableTonnes,
    pricePerTon: pricePerTonnePureGrain,
    marketRevenueEuros,
    bonusEuros,
    bonusPct: crop.pureGrainPremiumPct,
    residuePerHa,
  };
}

/**
 * Route serveur du simulateur céréales.
 * Le frontend envoie uniquement la culture et les hectares; le vrai calcul reste côté serveur.
 * Si le calcul migre plus tard vers Python, cette route pourra appeler le script Python et garder
 * exactement le même contrat JSON pour ne pas modifier l'interface utilisateur.
 */
export async function POST(request: Request) {
  // Lit le corps JSON envoyé par le formulaire de simulation.
  const body = (await request.json()) as CerealSimulationRequest;
  // Extrait la culture demandée.
  const cropType = body.cropType;
  // Convertit la surface en nombre exploitable.
  const hectares = Number(body.hectares);

  // Refuse les cultures inconnues pour éviter un calcul incohérent.
  if (!isCropKey(cropType)) {
    return NextResponse.json({ message: 'Culture non prise en charge.' }, { status: 400 });
  }

  // Refuse les surfaces invalides ou nulles.
  if (!Number.isFinite(hectares) || hectares <= 0) {
    return NextResponse.json({ message: 'Surface invalide.' }, { status: 400 });
  }

  // Exécute le calcul serveur et renvoie le résultat au client.
  return NextResponse.json(computeCerealSimulation(hectares, cropType));
}
