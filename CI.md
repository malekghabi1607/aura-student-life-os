# Intégration continue GitHub Actions

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) se déclenche sur
les push vers `main`, les pull requests dont la branche cible est `main`, ainsi que
les déclenchements manuels. Les anciennes exécutions d'une même PR sont annulées
lorsqu'une nouvelle arrive. Les exécutions sur `main` sont sérialisées sans annuler
celle en cours pour éviter d'interrompre une publication.

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
4. **Publish / backend** et **Publish / frontend** : uniquement dans le dépôt
   `malekghabi1607/aura-student-life-os`, sur un push `main` ou un lancement manuel
   sélectionnant `main`, après réussite des quatre contrôles CI. Ces jobs rechargent
   les archives des images validées, contrôlent leurs identifiants et publient sur
   GHCR avec `latest` et le SHA Git complet. Aucun rebuild n'est effectué.
   Sur une PR ou une autre branche, ils sont ignorés. Voir [GHCR.md](GHCR.md).

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
   servent au transfert vers le job Docker. Sur les exécutions autorisées à publier,
   `docker-image-backend` et `docker-image-frontend` conservent les archives validées
   pendant 1 jour pour les jobs de publication.
5. Sur une PR, les résultats sont également visibles dans **Checks**.

Si une PR vient d'un fork, GitHub peut demander à un mainteneur d'autoriser son
exécution selon les réglages du dépôt. Aucun secret de production n'est nécessaire.
Les contrôles à rendre obligatoires dans la protection de `main` pourront être
sélectionnés après la première exécution, avec les noms affichés dans **Checks**.

## Sécurité et limites

- Le jeton du workflow n'a que `contents: read` ; les identifiants du checkout ne
  sont pas conservés. Seul le job `publish` reçoit aussi `packages: write`.
  Aucun droit d'écriture sur le dépôt ni permission OIDC.
- Les actions sont épinglées par SHA de commit vérifié auprès de leurs dépôts officiels.
  Les commentaires indiquent leur version majeure pour faciliter les mises à jour.
- Aucun secret de production ni argument de build contenant un identifiant.
  Le `GITHUB_TOKEN` éphémère est utilisé uniquement pour la connexion GHCR du job
  `publish`. Les jetons internes des caches et artefacts sont gérés par GitHub Actions.
- Les contextes Docker CI contiennent seulement le JAR ou `dist/` et `nginx.conf`.
  Aucun `.env`, répertoire `.secrets`, dépôt Git ou cache de dépendances n'y est copié.
- `push: false` dans `build-push-action` : les builds ne publient jamais. Après leurs
  contrôles, les jobs `publish` utilisent `docker push` sur les mêmes images chargées
  depuis leurs archives. Aucun déploiement, aucune modification PostgreSQL ni AWS.
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
