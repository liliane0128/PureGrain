# Agent IA - Pure Graine

## Vue d'ensemble

Cet agent IA assiste le développement et la maintenance du site vitrine de **Pure Graine**, projet iGEM Sorbonne Université 2025-2026 consacré à la détection rapide de la zéaralénone (ZEN) dans les céréales.

Le projet présente trois pistes scientifiques :

- système aptamère Z0/Z1 couplé à un toehold switch fluorescent ;
- aptazyme colorimétrique activée par ZEN ;
- LAMP ciblant Fusarium via PKS4, ZEB1/PKS13 et ZEB2.

## Architecture du Projet

```text
src/
├── app/
│   ├── layout.tsx          # Layout racine avec métadonnées SEO
│   ├── page.tsx            # Page d'accueil principale
│   └── globals.css         # Styles globaux et responsive
├── components/
│   └── sections/
│       ├── Hero.tsx        # Vidéo et promesse de détection ZEN
│       ├── Features.tsx    # Pistes scientifiques et schéma de détection
│       ├── BioConversion.tsx # Graphique de réponse fluorescente
│       └── Molecules.tsx   # Docking, SMD et validation expérimentale
├── lib/
│   └── config.ts           # Configuration globale du site
└── types/
    └── index.ts            # Interfaces et types TypeScript
```

## Technologies

- **Next.js 15** avec App Router
- **React 19**
- **TypeScript strict**
- **CSS global avec variables**
- **next/image** pour les logos institutionnels

## Règles de Développement

1. Les commentaires de code doivent rester rédigés en français.
2. Le vocabulaire produit doit rester aligné avec ZEN, Fusarium, aptamères, toehold switch, TXTL, LAMP, mNeonGreen et validation expérimentale.
3. Garder un ton scientifique, clair et accessible pour un jury iGEM/hackathon.
4. Vérifier les changements avec `npm run type-check`, `npm run format:check` et `npm run build`.

## Contenu Produit

### Promesse

Identifier rapidement la zéaralénone ou sa source dans les céréales avec un test moléculaire lisible par fluorescence ou colorimétrie.

### Points scientifiques à préserver

- ZEN est une mycotoxine produite par Fusarium.
- Plan 1 : Z0/Z1 + toehold switch + reporter mNeonGreen/sfGFP.
- Plan 2 : aptazyme colorimétrique.
- Plan 3 : LAMP ciblant PKS4, ZEB1/PKS13 et ZEB2.
- Validation : ON/OFF, fuite, Z0/Z1, courbe standard, LOD/LOQ, spécificité en farine mixte.

## Commandes Utiles

```bash
npm install
npm run dev
npm run type-check
npm run format:check
npm run build
```

---

Agent IA développé pour **iGEM Sorbonne Université 2025-2026**.
