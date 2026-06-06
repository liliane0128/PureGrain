# 🚀 Guide de Création du Repo GitHub

Voici comment mettre votre projet sur GitHub et configurer tout pour la production.

## 📝 Étape 1: Créer le Repo GitHub

### Via GitHub.com

1. Allez sur [github.com/new](https://github.com/new)
2. **Repository name** : `youthforbioeconomy-2026`
3. **Description** : "Site vitrine Youth for Bioeconomy 2026 - Next.js statique"
4. **Visibilité** : Public (ou Private selon vos préférences)
5. **Initialize** : Ne pas initialiser (you'll push existing repository)
6. Cliquez **Create repository**

### Via GitHub CLI (si installé)

```bash
gh repo create youthforbioeconomy-2026 \
  --public \
  --description="Site vitrine Youth for Bioeconomy 2026 - Next.js statique" \
  --source=. \
  --remote=origin \
  --push
```

## 🔗 Étape 2: Connecter votre Repo Local

Après avoir créé le repo sur GitHub, exécutez:

```bash
cd "/Users/alexis/Desktop/YOUTHFORBIOECONOMY 2026"

# Ajouter le remote GitHub (remplacez USERNAME par votre compte)
git remote add origin https://github.com/USERNAME/youthforbioeconomy-2026.git

# Renommer la branche si nécessaire
git branch -M main

# Pousser le code
git push -u origin main
```

## 🛠️ Étape 3: Configurer les Paramètres GitHub

### Protéger la Branche Main

1. Allez dans **Settings** → **Branches**
2. Cliquez **Add rule**
3. Pattern: `main`
4. Cochez:
   - ✅ Require a pull request before merging
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
5. Sauvegarder

### Configurer les Secrets (optionnel, pour le CI/CD)

**Settings** → **Secrets and variables** → **Actions**

Ajouter (si nécessaire):
- `VERCEL_TOKEN` : Pour déployer sur Vercel
- `GITHUB_TOKEN` : Automatique, généré par GitHub

## 🔄 Étape 4: Configurer GitHub Actions (CI/CD)

Créez `.github/workflows/ci.yml`:

```bash
mkdir -p .github/workflows
```

Contenu du fichier:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
      - uses: actions/checkout@v4

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build

      - name: Check if code is formatted
        run: npm run format:check
```

Puis committez:

```bash
git add .github/workflows/ci.yml
git commit -m "Add GitHub Actions CI workflow"
git push
```

## 🚀 Étape 5: Configurer le Déploiement Automatique

### Option A: Vercel (Recommandé)

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez **Import Project**
3. Sélectionnez votre repo GitHub
4. Vercel détectera automatiquement **Next.js**
5. Cliquez **Deploy**

Après le premier déploiement:
- Votre site sera disponible sur `youthforbioeconomy-2026.vercel.app`
- Chaque push recrée automatiquement le site
- Les pull requests ont des deployments preview

### Option B: GitHub Pages + GitHub Actions

Créez `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_BASE_PATH: /youthforbioeconomy-2026

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./out
```

## 📋 Checklist Avant Déploiement

- [ ] Mettre à jour `src/lib/config.ts` avec vos URLs
- [ ] Créer un `.env.local` pour les variables privées (ne pas committer)
- [ ] Vérifier les liens dans le README et `package.json`
- [ ] Tester avec `npm run build` localement
- [ ] Vérifier que `npm run lint` passe
- [ ] Mettre à jour le `author` dans `package.json`
- [ ] Ajouter des topics au repo (bioeconomy, nextjs, vitrine, etc.)

## 🌐 Configuration du Domaine Custom (optionnel)

Pour une URL personnalisée comme `youthforbioeconomy.com` :

### Vercel

1. **Settings** → **Domains**
2. Ajouter votre domaine
3. Suivre les instructions pour les DNS records
4. Configurer chez votre registraire (GoDaddy, Namecheap, etc.)

### GitHub Pages

1. **Settings** → **Pages**
2. Sous "Custom domain", entrer votre domaine
3. Créer un fichier `CNAME` à la racine avec le domaine
4. Configurer les DNS records chez votre registraire

## 📊 Activer les Insights et Pages GitHub

**Settings** → cocher:
- ✅ Issues
- ✅ Projects
- ✅ Discussions (optionnel)
- ✅ Pages (si GitHub Pages)

## 🔐 Sécurité et Meilleures Pratiques

1. **Ne jamais committer** :
   - `.env.local` ou secrets
   - `node_modules/`
   - Fichiers build (`out/`, `.next/`)

2. **Utiliser GitHub Secrets** pour les tokens/clés

3. **Activer 2FA** sur votre compte GitHub

4. **Ajouter un CODEOWNERS** pour les reviews (optionnel)

## 📚 Fichiers Importants à Connaître

| Fichier | Objectif |
|---------|----------|
| `README.md` | Documentation principale du projet |
| `agent-IA.md` | Guide pour développer avec l'IA |
| `next.config.js` | Configuration Next.js (performance, sécurité) |
| `tsconfig.json` | Configuration TypeScript |
| `.eslintrc.json` | Règles de linting |
| `.prettierrc.json` | Formatting du code |
| `package.json` | Dépendances et scripts |

## 🎯 Prochaines Étapes

1. ✅ Pousser vers GitHub
2. ✅ Configurer les protections de branche
3. ✅ Mettre en place le CI/CD
4. ✅ Déployer (Vercel ou GitHub Pages)
5. ✅ Configurer un domaine custom
6. ✅ Ajouter Google Analytics (optionnel)
7. ✅ Configurer un CDN (optionnel)

## 🆘 Dépannage Courant

### "Permission denied (publickey)"

```bash
# Vérifier la clé SSH
ssh -T git@github.com

# Ajouter la clé SSH à l'agent
ssh-add ~/.ssh/id_rsa
```

### "error: failed to push some refs"

```bash
# Récupérer les changements du serveur
git pull origin main

# Résoudre les conflits si besoin, puis pusher
git push origin main
```

### Build échoue sur Vercel

1. Vérifier les logs dans Vercel Dashboard
2. S'assurer que `npm run build` marche localement
3. Vérifier les variables d'environnement
4. Nettoyer le cache (Vercel → Settings → Git → Redeploy)

---

**Besoin d'aide ? Consultez :**
- [GitHub Docs](https://docs.github.com)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
