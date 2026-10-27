# Exécution conteneurisée d'Aura

## Architecture et isolation

```text
Navigateur -> 127.0.0.1:8088 -> Nginx:8080 -> /api/... -> backend:8080 -> postgres:5432
                                  |                         |
                              React/Vite              santé interne :8081
```

Le frontend utilise les URL relatives `/api`. Le proxy conserve ce préfixe et les
paramètres de requête, grâce à `proxy_pass` sans URI ajoutée
([documentation Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass)).
Les liens React utilisent le fallback `index.html`. Les fichiers manquants sous
`/assets/` renvoient 404. Les endpoints Actuator ne sont pas relayés par Nginx.

- Backend : build Maven Wrapper/JDK 17 avec les tests, puis JRE 17, utilisateur non root.
  Les polices nécessaires aux exports Excel sont installées dans les deux étapes.
- Frontend : build Node 22 avec `npm ci`, tests et Vite, puis Nginx 1.28 non root.
- PostgreSQL : version 16, volume persistant `postgres_data`, réseau interne `database`.
- Backend/frontend : réseau `application`, permettant aussi la sortie du backend vers Gemini/Resend.
- Aucun port PostgreSQL ou backend n'est publié. Seul Nginx est publié sur loopback.
- Frontend et backend ont un système de fichiers en lecture seule et un `/tmp` temporaire.

Le nouveau projet Compose est **aura-student-life-os-containers**. L'ancien Compose
utilisait le conteneur `finance-tracker-db` et le volume `pgdata`. Cette stack n'attache
aucun de ces éléments ; le nouveau volume porte normalement le nom
`aura-student-life-os-containers_postgres_data`. Ne remplacer ni ce nom ni ce volume
par ceux de l'ancienne base. Aucun transfert de données n'est automatique.

## Préparation — PowerShell, à la racine du dépôt

Prérequis : Docker Desktop avec moteur Linux démarré et Docker Compose v2 ou plus récent.

```powershell
docker version
docker compose version
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Initialize-DockerSecrets.ps1
docker compose --env-file .env.docker config --quiet
```

Le script prépare `.env.docker` et quatre fichiers sous `.secrets/`, sans écraser
les fichiers existants ni afficher leurs valeurs :

| Fichier | Utilisation |
| --- | --- |
| `postgres_password` | Mot de passe aléatoire partagé par PostgreSQL et le backend |
| `jwt_secret` | Secret JWT aléatoire, stable entre les redémarrages |
| `gemini_api_key` | Vide initialement ; renseigner pour activer l'IA |
| `resend_api_key` | Vide initialement ; renseigner pour les emails |

Les fichiers sont montés en lecture seule via les
[secrets Compose](https://docs.docker.com/compose/how-tos/use-secrets/).
Spring les lit avec `configtree:/run/secrets/`, sous les noms `DATABASE_PASSWORD`,
`JWT_SECRET`, `GEMINI_API_KEY` et `RESEND_API_KEY`. PostgreSQL lit son mot de passe
avec `POSTGRES_PASSWORD_FILE`. Aucun secret n'est envoyé comme argument de build
ou variable d'environnement du conteneur. Le frontend n'a accès à aucun secret.
Les contextes de build utilisent des listes d'inclusion explicites dans `.dockerignore`.

Les fichiers locaux de secrets ne sont pas chiffrés par Compose : protéger leur
répertoire et le disque hôte. Sous Linux, un répertoire propriétaire en mode 0700
avec fichiers lisibles par l'utilisateur du conteneur est nécessaire ; un fichier
0600 appartenant à un UID différent peut empêcher le backend non root de le lire.
Ne jamais afficher leur contenu dans des logs, captures ou commandes partagées.

Modifier les valeurs **non secrètes** de `.env.docker` si nécessaire :

- `FRONTEND_PORT`, `APP_FRONTEND_URL` et `APP_BACKEND_URL` doivent être cohérents.
  Par défaut : `http://localhost:8088`. L'URL backend des emails est l'URL publique
  de Nginx, jamais le nom interne `backend`.
- `POSTGRES_DB`/`POSTGRES_USER` ne s'appliquent qu'à l'initialisation d'un volume neuf.
- `APP_MAIL_FROM` doit être autorisé par le fournisseur d'email pour un usage réel.
- `SECRETS_DIR` peut désigner un autre répertoire local ; préparer alors les quatre
  fichiers à cet emplacement. Ce chemin n'est pas un argument de build.

Voir aussi [backend/CONFIGURATION.md](backend/CONFIGURATION.md) pour les limites IA
et les autres variables. Le profil backend reste **prod**, sans seeder, avec secret
JWT obligatoire et `ddl-auto: validate`. Ne pas activer `dev` pour contourner une erreur.

## Construire et démarrer

```powershell
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d --wait --wait-timeout 180
docker compose --env-file .env.docker ps
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DockerStack.ps1
```

Ouvrir `http://localhost:8088`. Aucun compte de démonstration n'est créé. Inscription
et vérification nécessitent une configuration d'email fonctionnelle.

L'image PostgreSQL exécute `backend/src/main/resources/db/docker-init.sql` uniquement
sur un **nouveau volume vide**. Ce fichier initialise les sept tables sans créer
de compte. Il ne contient aucune suppression ni modification de données existantes.
Il ne sera pas rejoué à chaque démarrage ; ce n'est pas un mécanisme de migration.
Le backend vérifie ensuite le schéma avec Hibernate. Les changements de schéma futurs
nécessiteront une procédure de migration séparée.

PostgreSQL doit être healthy avant le backend, puis le backend avant le frontend.
Le contrôle backend utilise `/actuator/health/readiness` sur le port interne 8081
et inclut une vérification JDBC. Les probes ne donnent aucun détail de santé.
Nginx a son propre `/healthz` ; ce dernier seul ne prouve pas la disponibilité de la base.

## Arrêt et reprise sans suppression de volume

```powershell
docker compose --env-file .env.docker stop
docker compose --env-file .env.docker start
```

Pour retirer uniquement les conteneurs et réseaux de cette stack en conservant les données :

```powershell
docker compose --env-file .env.docker down
```

Ne jamais demander la suppression des volumes. Ne pas utiliser les commandes de
nettoyage global Docker sur un poste contenant d'autres projets.

## Diagnostic

```powershell
docker compose --env-file .env.docker logs --tail=100 postgres backend frontend
docker compose --env-file .env.docker exec -T frontend nginx -t
docker compose --env-file .env.docker exec -T backend curl --fail --silent http://127.0.0.1:8081/actuator/health/readiness
docker compose --env-file .env.docker exec -T postgres sh -c 'pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
curl.exe -i http://localhost:8088/healthz
curl.exe -i http://localhost:8088/dashboard
curl.exe -i http://localhost:8088/api/categories
```

Sans connexion, `/api/categories` doit être refusé (403), pas renvoyer `index.html`.
Le script de vérification contrôle aussi une connexion volontairement invalide (401)
pour exercer le parcours Nginx -> Spring Security -> repository, sans créer de compte.
Il inspecte les états healthy et compare en mémoire les secrets aux métadonnées
des images et à la configuration Compose, sans afficher de valeur sensible.

- Moteur introuvable : démarrer Docker Desktop avec le moteur Linux et relancer `docker version`.
- Schéma invalide : examiner les logs ; ne pas effacer le volume ni changer `validate` en `update`.
- Authentification PostgreSQL refusée après changement du fichier secret : le fichier
  ne change pas le mot de passe déjà enregistré dans la base. Restaurer la configuration
  cohérente ; toute rotation doit suivre une procédure explicite et sauvegardée.
- Permissions sur `/run/secrets/` : vérifier la lisibilité des fichiers par l'UID 10001.
- Une application healthy peut avoir l'IA/email non configurés : ces fournisseurs
  ne font pas partie de la probe JDBC.

La stack est prévue pour une validation locale en HTTP sur loopback. Une exposition
publique nécessite encore TLS, gestion des accès réseau et sauvegardes. Les images
de base utilisent des tags de version, pas encore des digests immuables. Les accès
au daemon Docker donnent accès aux conteneurs et à leurs secrets.
