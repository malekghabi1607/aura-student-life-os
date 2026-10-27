# Migrations de base de données (Flyway)

Le schéma PostgreSQL est créé et modifié **uniquement** par Flyway, au démarrage du backend.
Hibernate se contente ensuite de le valider (`ddl-auto: validate` en production).
L'ancien script `docker-init.sql` n'existe plus : son contenu est devenu la migration V1.

| Élément | Emplacement |
| --- | --- |
| Migrations | `backend/src/main/resources/db/migration/V<n>__<description>.sql` |
| Schéma initial | `V1__baseline_schema.sql` (DDL identique à l'ancien `docker-init.sql`) |
| Garde d'adoption | `beforeBaseline.sql` (callback Flyway, lecture seule) |
| Configuration | `spring.flyway.*` dans `backend/src/main/resources/application.yml` |
| Diagnostic | `scripts/Test-DatabaseBaseline.ps1` (lecture seule) |
| Sauvegarde / restauration | `scripts/Backup-Database.ps1`, `scripts/Restore-Database.ps1` |

## Comportement selon l'état de la base

| État de la base | Ce que fait le backend au démarrage |
| --- | --- |
| Vide (nouveau volume) | Flyway applique V1 puis les suivantes. Hibernate valide. |
| Gérée par Flyway | Flyway applique seulement les migrations en attente. |
| Existante **sans** historique Flyway (volume créé avant Flyway) | **Refus de démarrer**, sans rien écrire : `Found non-empty schema(s) "public" but no schema history table`. Il faut l'adopter une fois (procédure ci-dessous). |
| Existante sans historique **et** `FLYWAY_BASELINE_ON_MIGRATE=true` | `beforeBaseline.sql` compare le schéma à V1. S'il est identique : baseline en version 1 (V1 n'est **pas** exécutée), puis migrations suivantes. Sinon : refus, aucune écriture. |

Paramètres retenus :
- `baseline-on-migrate=false` par défaut ;
- `baseline-version=1` ;
- `validate-on-migrate=true` ;
- `out-of-order=false` ;
- `clean-disabled=true`.

Les profils `test` (H2) et `dev` (`ddl-auto: update`) désactivent Flyway par défaut. En dev, on peut l'activer avec `FLYWAY_ENABLED=true`, mais seulement sur une base dédiée.

### Pourquoi une garde en plus de `baselineOnMigrate`

`baselineOnMigrate=true` marque **n'importe quel** schéma non vide comme étant « en version 1 », sans le comparer à V1. Une base divergente (colonne manuelle, ancien schéma `ddl-auto: update`, mauvaise base ciblée) serait alors déclarée conforme, et les futures V2+ s'exécuteraient sur un schéma inattendu.

`beforeBaseline.sql` calcule une empreinte des éléments suivants du schéma `public` :
- colonnes, types, tailles, nullabilité, identités ;
- contraintes ;
- index (sans leurs noms) ;
- relations.

Il la compare ensuite à celle de V1 (`2787e44dd1123d77411caf8528c5a51a`, calculée sur PostgreSQL 16).

Les expressions `CHECK` sont normalisées (sans casts ni parenthèses), parce que `pg_dump`/`pg_restore` les réécrit différemment. Une base restaurée depuis une sauvegarde reste ainsi adoptable.

## Ajouter une migration

1. Créer `V2__description_courte.sql` (numéro suivant, jamais réutilisé).
2. **Ne jamais modifier une migration déjà livrée**. Flyway vérifie son checksum et refuserait de démarrer. Le checksum ne dépend pas des fins de ligne CRLF/LF.
3. Écrire du SQL rétrocompatible quand c'est possible : ajout de colonne nullable ou avec valeur par défaut. L'image précédente peut alors encore tourner en cas de retour arrière.
4. Tester sur une base PostgreSQL temporaire, sur une base vide **et** sur une copie restaurée de la production, avant tout déploiement.

## Sauvegarde

```powershell
# Lecture seule pour la base. Écrit backups/aura-<date>.dump et .dump.sha256 (dossier ignoré par git).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Backup-Database.ps1
# Autre conteneur / dossier :
$container = 'aura-student-life-os-containers-postgres-1'; $folder = 'backups'   # à adapter
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Backup-Database.ps1 -Container $container -OutputDirectory $folder
```

Le script fonctionne ainsi :
1. Il lance `pg_dump --format=custom` **dans** le conteneur, via le socket local, sans manipuler de mot de passe. Il contrôle le dump avec `pg_restore --list` et calcule son SHA-256 dans le conteneur.
2. Il transfère le fichier par `docker exec … cat`, lu comme un flux d'octets brut, jamais par le pipeline PowerShell qui altère les binaires. Il n'utilise pas `docker cp`, que Docker Desktop refuse sur un conteneur dont la source d'un montage a disparu (c'est le cas du conteneur PostgreSQL créé avant Flyway, qui monte encore `docker-init.sql`).
3. Il recalcule le SHA-256 sur l'hôte et le compare à celui du conteneur, puis renvoie la copie de l'hôte à `pg_restore --list` pour prouver qu'elle est lisible.
4. Il écrit `<nom>.dump` et `<nom>.dump.sha256`. Un fichier `.partial` n'est jamais conservé, et le dump temporaire est toujours supprimé du conteneur, même en cas d'erreur.

Le dump contient des données personnelles. Il faut le conserver hors du dépôt et hors des partages publics.

## Restauration

`Restore-Database.ps1` ne restaure que dans une base **vide**. Il refuse toute cible contenant déjà une relation, ainsi qu'un dump dont le SHA-256 ne correspond pas. La restauration se fait en une seule transaction (`--single-transaction --exit-on-error`) et le script affiche le nombre exact de lignes par table.

Test de restauration sur une base temporaire (recommandé après chaque sauvegarde importante) :

```powershell
docker run -d --rm --name aura-restore-check --tmpfs /var/lib/postgresql/data `
  -e POSTGRES_USER=aura -e POSTGRES_DB=aura_student_life -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
docker exec aura-restore-check sh -c 'until pg_isready -U aura -d aura_student_life -q; do sleep 1; done'
$dump = Get-ChildItem backups/*.dump | Sort-Object Name | Select-Object -Last 1   # ou un fichier précis
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Restore-Database.ps1 -Container aura-restore-check -DumpFile $dump.FullName
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DatabaseBaseline.ps1 -Container aura-restore-check
docker stop aura-restore-check   # conteneur et données temporaires supprimés (--rm, tmpfs)
```

Pour une restauration réelle, **ne jamais restaurer sur le volume existant**. Il faut démarrer une copie de la stack sur un volume neuf, avec un autre `COMPOSE_PROJECT_NAME` et un autre `FRONTEND_PORT` :
1. `up -d postgres` uniquement ;
2. restaurer sur `<projet>-postgres-1` ;
3. lancer `Test-DatabaseBaseline.ps1` ;
4. démarrer le backend.

Ensuite, selon le dump :
- un dump post-Flyway contient son historique et démarre normalement ;
- un dump pré-Flyway suit la procédure d'adoption.

## Adoption du volume existant (une seule fois, sur décision explicite)

Le volume `aura-student-life-os-containers_postgres_data` a été créé avant Flyway. Au 27/10/2026, `Test-DatabaseBaseline.ps1` (lecture seule) le déclare **ADOPTABLE**.

Tant que l'adoption n'est pas faite, une image backend construite avec Flyway **refusera de démarrer** sur ce volume, sans rien modifier. Il ne faut donc pas reconstruire ni recréer le backend de la stack avant d'avoir suivi cette procédure.

Le conteneur PostgreSQL actuel monte encore `backend/src/main/resources/db/docker-init.sql`, qui a été supprimé du dépôt. Il fonctionne, mais `docker cp` y échoue, et un redémarrage de Docker Desktop pourrait l'empêcher de repartir. La procédure le recrée donc **sans ce montage**, sur **le même volume**. PostgreSQL ne relance pas l'initialisation sur un répertoire de données non vide, et le mot de passe stocké dans la base ne change pas.

**Règles absolues pendant toute la procédure** :
- jamais `docker compose down -v`, `--renew-anon-volumes`, `docker volume rm` ni `prune` ;
- `FLYWAY_BASELINE_ON_MIGRATE` uniquement dans le shell, jamais dans `.env.docker` ;
- chaque commande est lancée depuis la racine du dépôt, dans **une seule** session PowerShell, en s'arrêtant à la première erreur.

### 0. Préparer la session

```powershell
$ErrorActionPreference = 'Stop'
$compose = @('compose', '--env-file', '.env.docker')
$pg = 'aura-student-life-os-containers-postgres-1'
$backend = 'aura-student-life-os-containers-backend-1'
$volume = 'aura-student-life-os-containers_postgres_data'
function Assert-Ok([string]$Step) { if ($LASTEXITCODE -ne 0) { throw "ECHEC: $Step. Appliquer l'arrêt immédiat." } }
# PowerShell 5.1 strips embedded double quotes from native arguments: SQL goes through stdin
# and mounts are read as JSON, so no argument below contains nested quotes.
$countsSql = 'SELECT (SELECT count(*) FROM users), (SELECT count(*) FROM categories), (SELECT count(*) FROM transactions), (SELECT count(*) FROM goals), (SELECT count(*) FROM planning_events), (SELECT count(*) FROM study_tasks), (SELECT count(*) FROM fitness_workouts);'
function Get-Counts {
    $r = $countsSql | docker exec -i $pg sh -c 'psql -X -q -At -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
    Assert-Ok 'row counts'; return ($r -join '').Trim()
}
function Get-VolumeMount {
    $m = docker inspect $pg --format '{{json .Mounts}}' | ConvertFrom-Json; Assert-Ok 'inspect mounts'
    return (@($m | Where-Object Type -eq 'volume' | ForEach-Object { "$($_.Name)->$($_.Destination)" }) -join ',')
}
function Get-BindMounts {
    $m = docker inspect $pg --format '{{json .Mounts}}' | ConvertFrom-Json; Assert-Ok 'inspect mounts'
    return (@($m | Where-Object Type -eq 'bind' | ForEach-Object { $_.Destination }) -join ',')
}
```

### 1. Conserver l'image actuelle (retour arrière)

```powershell
docker tag aura-backend:local aura-backend:pre-flyway; Assert-Ok 'tag pre-flyway'
docker image inspect aura-backend:pre-flyway --format '{{.Id}}'   # noter l'ID
```

### 2. Sauvegarder, puis vérifier la restauration

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Backup-Database.ps1; Assert-Ok 'backup'
$dump = Get-ChildItem backups/*.dump | Sort-Object Name | Select-Object -Last 1
# Restauration de vérification sur une base jetable (aucun volume : --rm + tmpfs)
docker run -d --rm --name aura-restore-check --tmpfs /var/lib/postgresql/data `
  -e POSTGRES_USER=aura -e POSTGRES_DB=aura_student_life -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
docker exec aura-restore-check sh -c 'until pg_isready -h 127.0.0.1 -U aura -d aura_student_life -q; do sleep 1; done'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Restore-Database.ps1 -Container aura-restore-check -DumpFile $dump.FullName; Assert-Ok 'restore'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DatabaseBaseline.ps1 -Container aura-restore-check; Assert-Ok 'diagnostic restored'
docker stop aura-restore-check
```

Le nombre de lignes affiché par `Restore-Database.ps1` doit être **identique** à celui de la base réelle (ordre : users, categories, transactions, goals, planning_events, study_tasks, fitness_workouts) :

```powershell
Get-Counts
```

### 3. Diagnostiquer la base réelle

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DatabaseBaseline.ps1; Assert-Ok 'diagnostic'
```

Le diagnostic doit afficher `ADOPTABLE`. Sinon, **arrêter là** : aucune étape suivante.

### 4. Relever l'identité du volume et des données (avant)

```powershell
$volumeBefore = docker volume inspect $volume --format '{{.Name}}|{{.CreatedAt}}|{{.Mountpoint}}'; Assert-Ok 'volume inspect'
$mountBefore  = Get-VolumeMount
$countsBefore = Get-Counts
"$volumeBefore`n$mountBefore`n$countsBefore`nbinds: $(Get-BindMounts)"
```

`$mountBefore` doit valoir `aura-student-life-os-containers_postgres_data->/var/lib/postgresql/data`.

### 5. Arrêter l'application (fenêtre de maintenance)

```powershell
docker @compose stop frontend backend; Assert-Ok 'stop frontend backend'
```

### 6. Recréer PostgreSQL sans l'ancien montage, sur le même volume

```powershell
docker @compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 120 postgres; Assert-Ok 'recreate postgres'
$volumeAfter = docker volume inspect $volume --format '{{.Name}}|{{.CreatedAt}}|{{.Mountpoint}}'
$mountAfter  = Get-VolumeMount
$binds       = Get-BindMounts
$countsAfter = Get-Counts
if ($volumeAfter -ne $volumeBefore) { throw 'VOLUME DIFFERENT: arrêt immédiat.' }
if ($mountAfter -ne $mountBefore)   { throw 'MONTAGE DIFFERENT: arrêt immédiat.' }
if ($binds -match 'docker-entrypoint-initdb') { throw 'Ancien montage docker-init.sql encore présent.' }
if ($countsAfter -ne $countsBefore) { throw 'DONNEES DIFFERENTES: arrêt immédiat.' }
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DatabaseBaseline.ps1; Assert-Ok 'diagnostic after recreate'
```

Le volume doit garder le même nom, la même date de création et le même point de montage. Seul `/run/secrets/postgres_password` doit rester en bind mount, et le diagnostic doit toujours afficher `ADOPTABLE`.

### 7. Construire la nouvelle image backend

```powershell
docker @compose build backend; Assert-Ok 'build backend'
```

La construction relance les tests. `aura-backend:local` désigne alors l'image Flyway, et `aura-backend:pre-flyway` reste disponible.

### 8. Adopter (un seul démarrage avec le drapeau)

```powershell
$env:FLYWAY_BASELINE_ON_MIGRATE = 'true'
try {
    docker @compose up -d --no-deps --no-build --wait --wait-timeout 180 backend
    Assert-Ok 'adoption start'
} finally {
    Remove-Item Env:FLYWAY_BASELINE_ON_MIGRATE -ErrorAction SilentlyContinue
}
if (Test-Path Env:FLYWAY_BASELINE_ON_MIGRATE) { throw 'Drapeau encore présent dans la session.' }
```

Le bloc `finally` retire la variable même si `docker compose` échoue ou si la session est interrompue par une exception. Les commandes natives ne lèvent pas d'exception en PowerShell 5.1, d'où `Assert-Ok`.

### 9. Vérifier l'adoption

```powershell
docker @compose logs backend | Select-String 'matches V1|Successfully baselined|up to date|Started FinanceTracker'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DatabaseBaseline.ps1   # MANAGED: 1 BASELINE true
$countsAdopted = Get-Counts
if ($countsAdopted -ne $countsBefore) { throw 'DONNEES DIFFERENTES après adoption: arrêt immédiat.' }
```

Les logs doivent contenir `Schema public matches V1`, puis `Successfully baselined schema with version: 1`, puis `Schema "public" is up to date`.

### 10. Recréer le backend sans le drapeau, redémarrer le frontend, tester

```powershell
docker @compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 180 backend; Assert-Ok 'backend without flag'
docker inspect $backend --format '{{range .Config.Env}}{{println .}}{{end}}' | Select-String '^FLYWAY_BASELINE_ON_MIGRATE='   # doit afficher =false
docker @compose up -d --no-deps --no-build --wait frontend; Assert-Ok 'frontend'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DockerStack.ps1; Assert-Ok 'stack test'
```

La commande `Select-String` ne montre que la ligne Flyway : les secrets sont montés en fichiers, pas en variables d'environnement.

### Arrêt immédiat en cas d'échec

Dès qu'une commande échoue, qu'un contrôle affiche une différence ou que les logs montrent une erreur :

1. **Ne rien relancer avec le drapeau**, ne pas réessayer « pour voir ».
2. Retirer le drapeau de la session et arrêter le backend, pour stopper une éventuelle boucle de redémarrage (`restart: unless-stopped`) :
   ```powershell
   Remove-Item Env:FLYWAY_BASELINE_ON_MIGRATE -ErrorAction SilentlyContinue
   docker @compose stop backend frontend
   ```
3. Conserver les preuves : `docker @compose logs --no-color backend postgres > adoption-failure.log`. Ce fichier peut contenir des données personnelles : le garder hors du dépôt.
4. Diagnostiquer en lecture seule : `Test-DatabaseBaseline.ps1`, relever le nombre de lignes, relancer `docker volume inspect $volume`.
5. Selon le résultat :
   - le volume et les données sont intacts : appliquer le **retour arrière** ci-dessous ;
   - les données sont altérées (cas non observé en test) : **ne pas toucher au volume**. Restaurer la sauvegarde de l'étape 2 sur un **nouveau** projet Compose (autre `COMPOSE_PROJECT_NAME`, donc un autre volume), vérifier, puis décider de la bascule.

### Retour arrière vers l'image `aura-backend:pre-flyway`

```powershell
Remove-Item Env:FLYWAY_BASELINE_ON_MIGRATE -ErrorAction SilentlyContinue
docker tag aura-backend:pre-flyway aura-backend:local; Assert-Ok 'retag pre-flyway'
docker @compose up -d --no-deps --no-build --force-recreate --wait --wait-timeout 180 backend; Assert-Ok 'rollback backend'
docker @compose up -d --no-deps --no-build --wait frontend
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Test-DockerStack.ps1
```

- **Avant la baseline** (échec aux étapes 6 à 8) : rien n'a été écrit en base. L'ancienne image redémarre telle quelle.
- **Après la baseline** : l'ancienne image (sans Flyway) démarre normalement, car Hibernate ignore `flyway_schema_history`. C'est vérifié par un test. La table peut rester en place. Cette garantie ne vaut que tant que les migrations V2+ sont rétrocompatibles.
- Le conteneur PostgreSQL recréé à l'étape 6 n'a pas besoin d'être remis dans son état précédent : il utilise la même image et le même volume, sans le montage obsolète.
- Pour retenter l'adoption plus tard, il faut **reconstruire** l'image Flyway (`docker @compose build backend`), puisque `aura-backend:local` désigne de nouveau l'ancienne image.

## Tests réalisés (27/10/2026)

Les tests ont été faits sur des conteneurs `postgres:16-alpine` **temporaires** (`--rm`, `tmpfs`), jamais sur la stack ni sur ses volumes :

| Scénario | Résultat |
| --- | --- |
| Base vide → démarrage | V1 appliquée (`1 SQL success`), validation Hibernate OK, API 200, statistiques OK |
| Base vide → redémarrage | « up to date », aucune migration |
| Base existante + données fictives, sans drapeau | Démarrage refusé, pas de table d'historique, données identiques |
| Même base, avec drapeau | Callback exécuté, baseline v1, V1 non exécutée, données identiques, API relit les données |
| Redémarrage sans drapeau | « up to date », données identiques |
| Migration V2 simulée après baseline | V2 appliquée, données existantes identiques |
| Base divergente (colonne ajoutée), avec drapeau | Baseline refusée par la garde, pas de table d'historique, données identiques |
| Restauration d'un dump pré-Flyway | Données et séquences identiques ; diagnostic `ADOPTABLE` ; adoption OK |
| Restauration d'un dump post-adoption | Historique restauré ; démarrage sans migration |
| Restauration sur base non vide / dump corrompu | Refusée (code 1), cible inchangée |
| Ancienne image (sans Flyway) sur base adoptée | Démarre, API OK |
| `Backup-Database.ps1` sur la stack réelle (montage `docker-init.sql` obsolète) | SHA-256 identique dans le conteneur et sur l'hôte, `pg_restore --list` OK sur la copie de l'hôte, `/tmp` du conteneur vide, base, conteneurs et volume inchangés |
| Transfert binaire d'un dump de 35 Mo de données aléatoires | SHA-256 identique, contenu restauré identique octet par octet (md5 des 30 000 lignes) |
| Sauvegarde vers un conteneur inexistant | Échec propre (code 1), aucun fichier laissé |
| Restauration de la sauvegarde réelle sur une base temporaire | Nombre de lignes, md5 par table et séquences identiques à la source ; schéma égal à V1 ; `ADOPTABLE` |
| Blocs PowerShell de cette procédure | 16 blocs analysés sans erreur ; étapes 0 et 4 exécutées telles quelles (lecture seule) ; `try/finally` retire bien le drapeau après un échec simulé |
