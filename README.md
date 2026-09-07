# Aubaine

Radar web des meilleures offres de jeux PC. Aubaine interroge [CheapShark](https://www.cheapshark.com/) en temps réel, convertit les prix USD/EUR et compare les marchands.

## Fonctionnalités

- flux d'accueil limité aux promotions ;
- recherche catalogue par titre sur tous les jeux connus de CheapShark ;
- filtres boutique, prix maximum et note appliqués au flux de promotions ;
- tri par pertinence, remise, prix, note ou avis ;
- onglet des jeux gratuits et favoris persistants dans le navigateur ;
- conversion USD/EUR avec taux live et valeur de secours ;
- comparateur multi-boutiques et prix historique ;
- interface responsive, clavier-friendly et compatible avec la réduction des animations.

## Lancer le projet

Le projet ne nécessite ni build ni dépendance. Comme les modules JavaScript sont chargés par le navigateur, utilisez un serveur statique local :

```bash
npm run dev
```

Puis ouvrez l’URL indiquée. L’ouverture directe de `index.html` peut être bloquée par les règles CORS des navigateurs.

Pour vérifier la syntaxe JavaScript avant une mise en ligne :

```bash
npm run check
```

## Déployer sur Vercel

Le projet est une application statique : aucun serveur backend ni variable secrète n’est nécessaire.

### Depuis GitHub

1. Importez le dépôt `BatmanGeekeur/Aubaine` sur [vercel.com/new](https://vercel.com/new).
2. Sélectionnez le framework **Other** ou **No Framework**.
3. Laissez le répertoire racine et la commande de build vides.
4. Cliquez sur **Deploy**.

Le fichier [`vercel.json`](./vercel.json) configure déjà les en-têtes de sécurité et le cache des fichiers statiques. Chaque push sur `main` déclenchera ensuite un nouveau déploiement si le dépôt est lié à Vercel.

### Avec la CLI Vercel

```bash
npx vercel
npx vercel --prod
```

## Architecture

```text
.
├── index.html              # Shell HTML et points d’ancrage UI
├── style.css               # Design system, responsive et composants
├── src/
│   ├── app.js              # État applicatif et orchestration
│   ├── config.js           # URLs et constantes
│   ├── services/
│   │   ├── api.js          # Accès CheapShark / Frankfurter
│   │   └── storage.js      # Persistance localStorage
│   ├── ui/
│   │   └── render.js       # Rendu des cartes, états et spotlight
│   └── utils/
│       └── format.js       # Échappement HTML, prix et notes
└── README.md
```

## Données et limites

Les données dépendent des APIs publiques CheapShark et Frankfurter. Les prix affichés sont indicatifs : le prix final doit toujours être vérifié chez le marchand. Aucune donnée personnelle n’est collectée.

## Maintenance

Le projet reste volontairement sans framework pour être déployable sur n’importe quel hébergement statique. Les nouvelles fonctionnalités doivent privilégier les modules `services`, `ui` et `utils` plutôt que d’agrandir `app.js`.
