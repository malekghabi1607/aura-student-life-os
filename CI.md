# Intégration continue GitHub Actions

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se déclenche sur
les push vers `main` et les pull requests dont la branche cible est `main`, branche
principale constatée dans le dépôt. Les anciennes exécutions d'une même PR/branche
sont annulées lorsqu'une nouvelle arrive.

## Jobs et résultats

1. **Backend / Java 17** : Temurin 17, cache Maven, puis Maven Wrapper `verify`.
   Cette commande exécute les tests et construit le JAR en une seule fois.
   Les tests de persistance utilisent H2 ; aucun service PostgreSQL n'est lancé.
2. **Frontend / Node 22** : cache npm basé sur le lockfile, `npm ci`, les tests
   existants puis `npm run build`. Le cache npm ne remplace pas `npm ci`.
3. **Docker / backend** et **Docker / frontend** : exécutés seulement si les deux
   jobs précédents réussissent. Les artefacts du même workflow sont téléchargés
   dans des contextes minimaux et assemblés avec la cible `ci-runtime` des Dockerfiles.
   Le JAR et le frontend ne sont ni recompilés ni retestés dans ce job. Les couches
   BuildKit sont mises en cache séparément pour chaque image.

Le job Docker vérifie aussi que Java peut s'exécuter et que la configuration Nginx
est valide, sans réseau. Il ne démarre ni l'application complète ni sa base. Le script
de vérification de stack décrit dans [DOCKER.md](DOCKER.md) reste une validation locale
complémentaire. La cible finale par défaut des Dockerfiles reste `runtime` : les
builds locaux/Compose continuent à compiler et tester eux-mêmes les sources.

## Consulter une exécution

1. Après le push, ouvrir le dépôt GitHub, puis l'onglet **Actions**.
2. Choisir **CI**, puis l'exécution correspondant au commit ou à la pull request.
3. Ouvrir chaque job, puis l'étape en échec pour consulter ses logs.
4. Dans **Artifacts**, télécharger `backend-test-reports` pour les rapports Surefire
   (conservation 7 jours). `backend-jar` et `frontend-dist` sont conservés 1 jour et
   servent au transfert vers le job Docker. Les images ne sont pas publiées.
5. Sur une PR, les résultats sont également visibles dans **Checks**.

Si une PR vient d'un fork, GitHub peut demander à un mainteneur d'autoriser son
exécution selon les réglages du dépôt. Aucun secret de production n'est nécessaire.
Les contrôles à rendre obligatoires dans la protection de `main` pourront être
sélectionnés après la première exécution, avec les noms affichés dans **Checks**.

## Sécurité et limites

- Le jeton du workflow n'a que `contents: read` ; les identifiants du checkout ne
  sont pas conservés. Aucun droit d'écriture sur le dépôt, les packages ou OIDC.
- Les actions sont épinglées par SHA de commit vérifié auprès de leurs dépôts officiels.
  Les commentaires indiquent leur version majeure pour faciliter les mises à jour.
- Aucun bloc `secrets`, secret de production, connexion à un registre ou argument
  de build contenant un identifiant. Les jetons internes nécessaires aux caches et
  artefacts sont gérés par GitHub Actions.
- Les contextes Docker CI contiennent seulement le JAR ou `dist/` et `nginx.conf`.
  Aucun `.env`, répertoire `.secrets`, dépôt Git ou cache de dépendances n'y est copié.
- `push: false` : les images restent éphémères sur les runners. Aucun déploiement,
  aucune modification PostgreSQL et aucune infrastructure AWS.
- Le workflow utilise `pull_request`, jamais `pull_request_target`, et ne récupère
  pas d'artefact depuis un workflow privilégié distinct.
- Les caches accélèrent les builds, mais une première exécution devra télécharger
  dépendances et images de base. Les runners ont besoin d'accéder à Maven Central,
  npm, Docker Hub et aux actions GitHub.

## Reproduire les commandes

Avec Java 17, Node 22 et Docker disponibles, depuis la racine :

```bash
(cd backend && sh ./mvnw --batch-mode --no-transfer-progress verify)
(cd frontend && npm ci --no-audit --no-fund)
(cd frontend && node --test src/components/SafeMessageContent.test.js src/utils/aiMessages.test.js)
(cd frontend && npm run build)
mkdir -p .ci-images/backend .ci-images/frontend/dist
cp backend/target/finance-tracker-api-1.0.0.jar .ci-images/backend/
cp -R frontend/dist/. .ci-images/frontend/dist/
cp frontend/nginx.conf .ci-images/frontend/
docker build --target ci-runtime -f backend/Dockerfile -t aura-backend:ci .ci-images/backend
docker build --target ci-runtime -f frontend/Dockerfile -t aura-frontend:ci .ci-images/frontend
docker run --rm --network none --entrypoint java aura-backend:ci -version
docker run --rm --network none --entrypoint nginx aura-frontend:ci -t
```

Les scripts en syntaxe Bash ci-dessus correspondent aux runners Ubuntu. Sous Windows,
utiliser `mvnw.cmd`, `npm.cmd`, `New-Item` et `Copy-Item` pour leurs équivalents.
Ne pas fournir de variable de production pour reproduire les tests.
