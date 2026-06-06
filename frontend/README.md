# Pure Graine

**Site vitrine Next.js pour Pure Graine, projet iGEM Sorbonne Université dédié à la détection rapide de la zéaralénone (ZEN) dans les céréales.**

Le projet scientifique vise à identifier rapidement ZEN ou sa source, Fusarium, avec trois pistes complémentaires :

- aptamère Z0/Z1 couplé à un toehold switch fluorescent ;
- aptazyme colorimétrique spécifique à ZEN ;
- LAMP ciblant des gènes de Fusarium liés à la biosynthèse ZEN.

## Contexte scientifique

La zéaralénone est une mycotoxine produite par des champignons Fusarium. Elle peut être retrouvée dans le maïs, le blé, l’avoine et d’autres céréales. Le projet explore une détection accessible, rapide et spécifique, avec lecture fluorescente ou colorimétrique.

La piste principale s’appuie sur un aptamère Z0, un trigger Z1 et un toehold switch exprimant un reporter comme mNeonGreen ou sfGFP en système TXTL.

## Fonctionnalités du site

- Hero vidéo plein écran avec overlay de titre en fin de séquence.
- Schéma scientifique des trois pistes de détection.
- Graphique de réponse fluorescente attendue avec et sans ZEN.
- Cartes de progression : docking, NUPACK/SMD, validation TXTL/LAMP.
- Footer avec les logos institutionnels.
- Design responsive dark pour desktop et mobile.

## Stack Technique

- **Next.js 15** avec App Router
- **React 19**
- **TypeScript**
- **CSS global avec variables**
- **next/image** pour les logos

## Démarrage Rapide

```bash
npm install
npm run dev
```

Le site est ensuite disponible sur [http://localhost:3000](http://localhost:3000), ou sur le port indiqué par Next.js si `3000` est déjà utilisé.

## Scripts

```bash
npm run dev            # Démarre le serveur de développement
npm run build          # Génère le build de production
npm run start          # Lance le serveur de production
npm run type-check     # Vérifie les types TypeScript
npm run format         # Formate le code avec Prettier
npm run format:check   # Vérifie le formatage Prettier
```

## Sections Principales

### Hero

Présente Pure Graine comme projet de détection ZEN dans les céréales.

### Science

Synthétise les trois plans issus de la présentation scientifique : toehold switch, aptazyme et LAMP Fusarium.

### Détection

Explique la chaîne ZEN -> Z0/Z1 -> trigger -> reporter fluorescent.

### Validation

Présente les points à valider : stabilité Z0/Z1, ratio ON/OFF, fuite, courbe standard, LOD/LOQ et spécificité en farine mixte.

## Déploiement

```bash
npm run build
```

Projet développé pour **iGEM Sorbonne Université 2025-2026**.
