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
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Backup-Database.ps1 -Container <conteneur> -OutputDirectory <dossier>
```

Le script fonctionne ainsi :
- il lance `pg_dump --format=custom` **dans** le conteneur, via le socket local, sans manipuler de mot de passe ;
- il contrôle le dump avec `pg_restore --list` ;
- il le copie avec `docker cp`, sans faire passer de binaire dans le pipeline PowerShell ;
- il supprime ensuite la copie temporaire du conteneur et écrit le SHA-256.

Le dump contient des données personnelles. Il faut le conserver hors du dépôt et hors des partages publics.

## Restauration

`Restore-Database.ps1` ne restaure que dans une base **vide**. Il refuse toute cible contenant déjà une relation, ainsi qu'un dump dont le SHA-256 ne correspond pas. La restauration se fait en une seule transaction (`--single-transaction --exit-on-error`) et le script affiche le nombre exact de lignes par table.

Test de restauration sur une base temporaire (recommandé après chaque sauvegarde importante) :

```powershell
docker run -d --rm --name aura-restore-check --tmpfs /var/lib/postgresql/data `
  -e POSTGRES_USER=aura -e POSTGRES_DB=aura_student_life -e POSTGRES_HOST_AUTH_METHOD=trust postgres:16-alpine
docker exec aura-restore-check sh -c 'until pg_isready -U aura -d aura_student_life -q; do sleep 1; done'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./scripts/Restore-Database.ps1 -Container aura-restore-check -DumpFile backups/<fichier>.dump
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

1. **Sauvegarder** : `scripts/Backup-Database.ps1`. Vérifier que le `.dump` et le `.sha256` sont présents.
2. **Tester la restauration** de cette sauvegarde sur une base temporaire (section précédente). Les nombres de lignes doivent être identiques à ceux de la base source, et le diagnostic doit indiquer `ADOPTABLE`.
3. **Diagnostiquer la base réelle** : `scripts/Test-DatabaseBaseline.ps1` doit indiquer `ADOPTABLE` (code de sortie 0). En cas de `NOT ADOPTABLE` : **arrêter** et analyser l'écart avec V1.
4. **Construire** la nouvelle image : `docker compose --env-file .env.docker build backend`.
5. **Adopter**, avec la variable dans le shell uniquement et jamais dans `.env.docker` :
   ```powershell
   $env:FLYWAY_BASELINE_ON_MIGRATE = 'true'
   docker compose --env-file .env.docker up -d --no-deps --wait --wait-timeout 180 backend
   Remove-Item Env:FLYWAY_BASELINE_ON_MIGRATE
   ```
6. **Vérifier** :
   - `docker compose --env-file .env.docker logs backend` contient `Schema public matches V1` et `Successfully baselined schema with version: 1` ;
   - `Test-DatabaseBaseline.ps1` indique `MANAGED (1 BASELINE true)` ;
   - `scripts/Test-DockerStack.ps1` indique `PASS`.
7. **Recréer le backend sans le drapeau** : `docker compose --env-file .env.docker up -d --no-deps --wait backend`. Le conteneur est recréé avec `FLYWAY_BASELINE_ON_MIGRATE=false` et les logs indiquent « Schema "public" is up to date ».

**Retour arrière** :
- si l'étape 5 échoue, rien n'a été écrit : il suffit de redémarrer l'ancienne image ;
- après la baseline, l'ancienne image (sans Flyway) démarre encore normalement, car Hibernate ignore la table `flyway_schema_history`. C'est vérifié par un test. Cette garantie ne vaut que tant que les migrations V2+ restent rétrocompatibles.

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
