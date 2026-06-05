"""
Génération de données synthétiques + entraînement du Random Forest.
Exécuter une fois: python -m app.ml.train
"""
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

from app.ml.features import FEATURE_NAMES

# ── Constantes globales ───────────────────────────────────────────────────────

# RANDOM_STATE garantit que les résultats sont reproductibles : en fixant cette
# "graine" à 42 (valeur arbitraire, convention dans la communauté ML), chaque
# exécution du script produit exactement les mêmes données aléatoires et le
# même modèle entraîné. Sans cette valeur, les résultats changeraient à chaque
# lancement, rendant les comparaisons impossibles.
RANDOM_STATE = 42

# Nombre de lignes (observations) dans le jeu de données synthétique.
# 5 000 échantillons offrent un bon compromis : assez pour que le modèle
# apprenne les patterns, assez peu pour que l'entraînement reste rapide (<30s).
N_SAMPLES = 5000

# Chemin vers le fichier modèle sauvegardé sur disque.
# Ce fichier (.joblib) contient le modèle entraîné et est chargé à chaque
# démarrage de l'API pour répondre aux requêtes de prédiction.
MODEL_PATH = Path(__file__).parent.parent / "data" / "model.joblib"


def generate_synthetic_data(n: int = N_SAMPLES) -> pd.DataFrame:
    """
    Génère un jeu de données fictif simulant des scénarios de contamination
    fongique dans les céréales. Comme nous n'avons pas encore de données
    réelles issues du capteur, on simule des situations plausibles en
    s'appuyant sur la biologie connue des mycotoxines (ZEN).

    Règles biologiques appliquées :
    - La ZEN se développe surtout entre 15°C et 30°C (optimum ~22°C)
    - Une humidité relative > 70% sur 48h favorise fortement la production
    - Plus le temps depuis la récolte est long, plus le risque augmente
    - Seuil réglementaire EU : 100 µg/kg pour les céréales non transformées
    """
    rng = np.random.default_rng(RANDOM_STATE)

    # ── 1. Génération des variables météorologiques ───────────────────────────
    # On simule des températures réalistes pour des zones céréalières
    # européennes (5°C à 35°C). La moyenne sur 24h dérive légèrement de
    # celle sur 48h (±2°C), ce qui reflète la variabilité journalière normale.
    # np.clip garantit que les valeurs restent dans des plages physiquement
    # possibles (ex: pas de température à 40°C dans un champ de blé européen).
    temp_mean_48h = rng.uniform(5, 35, n)
    temp_mean_24h = np.clip(temp_mean_48h + rng.normal(0, 2, n), 5, 38)
    temp_current = temp_mean_24h + rng.normal(0, 1.5, n)

    # L'humidité varie entre 40% (conditions sèches) et 98% (quasi-saturation).
    # La valeur actuelle fluctue légèrement autour de la moyenne 24h.
    # np.clip(... 0, 100) empêche des valeurs absurdes comme 103% d'humidité.
    humidity_mean_48h = rng.uniform(40, 98, n)
    humidity_mean_24h = humidity_mean_48h + rng.normal(0, 5, n).clip(-20, 20)
    humidity_current = np.clip(humidity_mean_24h + rng.normal(0, 3, n), 0, 100)

    # L'amplitude thermique (écart max-min) est un indicateur de stress pour
    # les champignons : une forte amplitude ralentit leur développement.
    thermal_amplitude_24h = rng.uniform(2, 15, n)
    thermal_amplitude_48h = rng.uniform(2, 18, n)

    # ── 2. Génération des variables liées au grain ────────────────────────────
    # L'humidité du grain (teneur en eau) est clé : au-dessus de 14-15%,
    # le grain est propice au développement fongique pendant le stockage.
    # La norme de stockage sûr est généralement < 14%.
    grain_moisture_pct = rng.uniform(10, 25, n)

    # Nombre de jours depuis la récolte : plus c'est long, plus le grain
    # a été exposé aux conditions potentiellement favorables aux moisissures.
    days_since_harvest = rng.integers(0, 60, n)

    # ── 3. Calcul des facteurs de risque biologiques ──────────────────────────
    # Ces trois scores (0 à 1) traduisent la biologie fongique en chiffres :

    # Risque lié à l'humidité : nul en dessous de 60%, maximal à 100%.
    # Formule : (humidité - 60) / 40, borné entre 0 et 1.
    humidity_risk = np.clip((humidity_mean_48h - 60) / 40, 0, 1)

    # Risque lié à la température : maximal à 22°C (optimum biologique ZEN),
    # qui décroît symétriquement jusqu'à 0 à 5°C ou 39°C.
    # Formule : 1 - |temp - 22| / 17
    temp_risk = 1 - np.abs(temp_mean_48h - 22) / 17
    temp_risk = np.clip(temp_risk, 0, 1)

    # Risque lié à la durée : atteint son maximum après 30 jours post-récolte.
    duration_risk = np.clip(days_since_harvest / 30, 0, 1)

    # ── 4. Simulation de la concentration en ZEN (µg/kg) ─────────────────────
    # La ZEN produite est la somme pondérée des trois facteurs de risque,
    # à laquelle on ajoute un bruit aléatoire (loi exponentielle) pour
    # simuler l'imprévisibilité naturelle de la contamination.
    # Contributions : humidité (40 µg/kg max) + température (30) +
    #                 durée (20) + humidité grain (1 par %) + bruit (moy. 8)
    base_zen = (
        humidity_risk * 40
        + temp_risk * 30
        + duration_risk * 20
        + grain_moisture_pct * 1
        + rng.exponential(8, n)  # bruit aléatoire, moyenne = 8 µg/kg
    )
    # On plafonne à 500 µg/kg (valeur extrême rarement observée sur le terrain)
    zen_ppb = np.clip(base_zen, 0, 500)

    # ── 5. Calcul des variables d'interaction ────────────────────────────────
    # Ces variables combinent deux mesures pour capturer des effets croisés
    # que le modèle ne pourrait pas détecter autrement :

    # Tendance de l'humidité : positif = humidité qui monte (situation
    # aggravante), négatif = humidité qui baisse (situation s'améliorant).
    humidity_trend = humidity_mean_24h - humidity_mean_48h

    # Produit température × humidité : capte le fait que la chaleur humide
    # est bien plus dangereuse que la chaleur sèche ou le froid humide.
    temp_x_humidity_24h = temp_mean_24h * humidity_mean_24h / 100

    # Produit ZEN × humidité grain : un grain déjà humide avec beaucoup de
    # ZEN présente un double risque pour le stockage.
    zen_x_moisture = zen_ppb * grain_moisture_pct / 100

    # ── 6. Attribution des étiquettes de risque (GREEN / ORANGE / RED) ───────
    # Le score composite agrège les quatre facteurs de risque avec des poids
    # reflétant leur importance relative selon la littérature scientifique :
    # humidité (40%) > température (30%) > durée (15%) > ZEN mesurée (15%)
    composite_risk = humidity_risk * 0.4 + temp_risk * 0.3 + duration_risk * 0.15 + (zen_ppb / 500) * 0.15

    # Classification en trois niveaux (règlement EU + logique de stockage) :
    # RED    : ZEN > 80 µg/kg OU score de risque > 0.65 → stockage interdit
    # ORANGE : ZEN > 62 µg/kg OU score de risque > 0.50 → surveillance requise
    # GREEN  : tout le reste               → stockage autorisé sans restriction
    labels = np.where(
        (zen_ppb > 80) | (composite_risk > 0.65),
        2,  # RED
        np.where(
            (zen_ppb > 62) | (composite_risk > 0.50),
            1,  # ORANGE
            0   # GREEN
        )
    )

    # Bruit sur les étiquettes (5% de cas inversés aléatoirement) :
    # Dans la réalité, même des experts peuvent se tromper sur des cas
    # limites. Ce "flip" simule cette incertitude et évite que le modèle
    # mémorise des règles trop parfaites (sur-apprentissage).
    flip_mask = rng.random(n) < 0.05
    labels[flip_mask] = rng.integers(0, 3, flip_mask.sum())

    # ── 7. Assemblage du tableau final ───────────────────────────────────────
    df = pd.DataFrame({
        "zen_ppb": zen_ppb,
        "grain_moisture_pct": grain_moisture_pct,
        "temp_current": temp_current,
        "humidity_current": humidity_current,
        "temp_mean_24h": temp_mean_24h,
        "humidity_mean_24h": humidity_mean_24h,
        "thermal_amplitude_24h": thermal_amplitude_24h,
        "temp_mean_48h": temp_mean_48h,
        "humidity_mean_48h": humidity_mean_48h,
        "thermal_amplitude_48h": thermal_amplitude_48h,
        "humidity_trend": humidity_trend,
        "temp_x_humidity_24h": temp_x_humidity_24h,
        "days_since_harvest": days_since_harvest,
        "zen_x_moisture": zen_x_moisture,
        "label": labels,
    })
    return df


def train_and_save():
    # ── Étape 1 : Génération des données ─────────────────────────────────────
    print("Génération des données synthétiques...")
    df = generate_synthetic_data()
    # Vérification de l'équilibre des classes : idéalement ~40% GREEN,
    # ~35% ORANGE, ~25% RED pour que le modèle apprenne chaque niveau
    # de risque de façon égale.
    print(f"Distribution des classes:\n{df['label'].value_counts().sort_index()}")

    X = df[FEATURE_NAMES].values  # matrice des 14 variables d'entrée
    y = df["label"].values         # vecteur des étiquettes (0, 1, 2)

    # ── Étape 2 : Séparation entraînement / test ──────────────────────────────
    # On réserve 20% des données (1 000 échantillons) pour évaluer le modèle
    # sur des cas qu'il n'a jamais vus pendant l'entraînement.
    # stratify=y garantit que chaque classe est représentée proportionnellement
    # dans les deux ensembles (pas de tirage au sort défavorable).
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # ── Étape 3 : Entraînement du modèle ─────────────────────────────────────
    print("\nEntraînement du Random Forest...")
    clf = RandomForestClassifier(
        # 200 arbres de décision construits en parallèle : plus il y en a,
        # plus le modèle est stable, mais plus il est lent à entraîner.
        n_estimators=200,
        # Profondeur maximale de chaque arbre : limite la complexité et
        # réduit le risque de sur-apprentissage (mémorisation du bruit).
        max_depth=12,
        # Un nœud ne peut se diviser que s'il contient au moins 10 exemples,
        # ce qui évite de créer des règles trop spécifiques.
        min_samples_split=10,
        # Chaque feuille finale doit contenir au moins 5 exemples.
        min_samples_leaf=5,
        # Compense automatiquement le déséquilibre entre classes :
        # une classe rare (ex: RED) reçoit un poids plus fort lors de
        # l'entraînement pour ne pas être ignorée.
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1,  # utilise tous les cœurs CPU disponibles
    )
    clf.fit(X_train, y_train)

    # ── Étape 4 : Évaluation du modèle ───────────────────────────────────────
    y_pred = clf.predict(X_test)
    # Le rapport de classification détaille pour chaque classe :
    # - precision : parmi les cas classés RED, combien l'étaient vraiment ?
    # - recall    : parmi les vrais RED, combien a-t-on correctement détectés ?
    # - f1-score  : moyenne harmonique des deux (1.0 = parfait)
    report = classification_report(y_test, y_pred, target_names=["GREEN", "ORANGE", "RED"])
    print(f"\nRapport de classification:\n{report}")

    accuracy = (y_pred == y_test).mean()
    print(f"Accuracy: {accuracy:.3f}")

    # Importance des variables : indique quelle mesure a le plus pesé dans
    # les décisions du modèle. Utile pour expliquer l'IA à l'agriculteur.
    importances = pd.Series(clf.feature_importances_, index=FEATURE_NAMES)
    print("\nTop features:")
    print(importances.sort_values(ascending=False).head(8).to_string())

    # ── Étape 5 : Sauvegarde du modèle ───────────────────────────────────────
    # Le modèle est sérialisé (converti en fichier binaire) via joblib.
    # L'API le rechargera en mémoire à chaque démarrage sans avoir à
    # ré-entraîner, ce qui rend les prédictions quasi-instantanées.
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": clf, "accuracy": accuracy, "feature_names": FEATURE_NAMES}, MODEL_PATH)
    print(f"\nModèle sauvegardé: {MODEL_PATH}")

    return clf, accuracy


if __name__ == "__main__":
    train_and_save()
