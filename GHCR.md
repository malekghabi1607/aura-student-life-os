# Publication des images sur GitHub Container Registry

## Pipeline et autorisations

La publication est intégrée au workflow [CI](.github/workflows/ci.yml). Aucun second
workflow `workflow_run` ne consomme les artefacts d'une pull request.

```text
Backend Java 17 ----> JAR ----> Docker backend --contrôle---> archive + identifiant
Frontend Node 22 ---> dist ---> Docker frontend -contrôle---> archive + identifiant
                                      |                              |
                             les deux doivent réussir                v
                                                           Publish backend/frontend
                                                           chargement, tags, push GHCR
```

Conditions cumulatives de publication :

- dépôt exact : `malekghabi1607/aura-student-life-os` ; un fork ne publie pas ;
- ref exacte : `refs/heads/main` ;
- événement `push` ou `workflow_dispatch` ;
- tests, compilations et contrôles des deux images réussis.

Sur `pull_request`, seuls les tests et builds s'exécutent : pas d'archive destinée
à la publication, pas de login GHCR et aucun job avec accès en écriture exécuté.
Un lancement manuel sur une autre branche effectue la CI mais ne publie pas.

Pour lancer manuellement : **Actions → CI → Run workflow → Branch: main**.
GitHub réserve ce déclenchement aux personnes disposant d'un accès en écriture
([documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)).
Les réglages de l'organisation peuvent imposer des restrictions supplémentaires.

Les jobs backend, frontend et Docker gardent `contents: read`. Seuls les deux
exemplaires du job matriciel `publish` reçoivent `packages: write`, pour s'authentifier
avec `GITHUB_TOKEN` via `docker/login-action`. Aucun PAT n'est à ajouter aux secrets
du dépôt, et aucun secret de production n'est transmis aux builds.

## Même image construite, contrôlée et publiée

`docker/build-push-action`, épinglée par SHA, conserve les cibles `ci-runtime`, les
artefacts JAR/dist et les caches existants. Elle construit et charge l'image avec
`push: false`. Les labels OCI `source` et `revision` sont posés dès ce build.

Après les contrôles Java/Nginx, `docker save` exporte l'image. L'archive et son
identifiant sont protégés par un fichier SHA256SUMS et transférés par les artefacts
GitHub du **même run**, conservés 1 jour. Le job `publish` vérifie les sommes, charge
l'archive, puis compare l'identifiant Docker avec celui de l'image contrôlée.
`docker/metadata-action` fournit les tags ; `docker tag` et `docker push` publient
ces images sans modifier leurs couches ni leur configuration. Il n'y a aucune
reconstruction entre le contrôle et la publication. L'identifiant Docker vérifié
n'est pas le digest du manifeste du registre : ce sont deux types d'identifiants.

Toutes les actions sont épinglées par commit. Aucune étape ne déploie l'application
et aucune connexion à PostgreSQL n'est nécessaire à la publication.

Les runs `main` sont sérialisés pour ne pas annuler une publication en cours. GitHub
peut remplacer un run encore en attente par un plus récent. La publication des deux
packages et de leurs tags n'est **pas transactionnelle** : en cas d'échec réseau,
une partie peut avoir été publiée. Vérifier les deux packages après un échec.

## Noms et tags

| Service | Image |
| --- | --- |
| Backend | `ghcr.io/malekghabi1607/aura-student-life-os-backend` |
| Frontend | `ghcr.io/malekghabi1607/aura-student-life-os-frontend` |

Les noms sont convertis en minuscules. Chaque image reçoit :

- `latest` : dernière publication réussie pour ce package ; tag mutable ;
- `<SHA_GIT_COMPLET>` : les 40 caractères du commit, sans préfixe `sha-`.

Une relance d'un ancien run peut déplacer `latest` vers cet ancien commit. Un tag
SHA reste techniquement réinscriptible par le registre, notamment lors d'un rebuild
du même commit ; pour une référence strictement immuable, conserver le digest GHCR.
Les bases utilisent toujours leurs tags de version actuels, pas des digests épinglés.

## Vérifier sur GitHub

Après le push autorisé :

1. Ouvrir **Actions → CI**, puis vérifier les deux jobs `Publish` après les quatre
   jobs existants. Sur une PR, les jobs de publication doivent être **Skipped**.
2. Ouvrir le profil `malekghabi1607` → **Packages**, ou la section **Packages** du dépôt.
3. Ouvrir chacun des deux packages ; vérifier les tags `latest`, le SHA complet et
   le lien vers le dépôt source.
4. Vérifier les digests indiqués dans les logs de push et sur les pages des versions.

La publication n'est effective qu'après une exécution GitHub réussie. Une validation
locale du workflow ne prouve pas l'accès de son jeton au registre.

## Télécharger les images

Si les packages sont publics :

```bash
docker pull ghcr.io/malekghabi1607/aura-student-life-os-backend:latest
docker pull ghcr.io/malekghabi1607/aura-student-life-os-frontend:latest
```

Pour revenir aux images d'un commit précédent, remplacer `<SHA_GIT_COMPLET>` par le
même commit pour **les deux services** :

```bash
docker pull ghcr.io/malekghabi1607/aura-student-life-os-backend:<SHA_GIT_COMPLET>
docker pull ghcr.io/malekghabi1607/aura-student-life-os-frontend:<SHA_GIT_COMPLET>
```

Cette commande télécharge seulement l'image, sans remplacer les conteneurs en cours.
Le Compose local continue à utiliser ses images `:local` et n'est pas modifié par ce
travail. Tout remplacement de service devra être explicite, avec vérification de la
compatibilité du schéma ; revenir à une image ne restaure pas les données PostgreSQL.

Une référence immuable peut être téléchargée avec
`docker pull ghcr.io/malekghabi1607/aura-student-life-os-backend@sha256:<DIGEST_GHCR>`.

## Visibilité et packages privés

Un nouveau package GHCR est privé par défaut. La visibilité du dépôt ne rend pas
automatiquement ses packages publics. Le workflow ne change pas cette visibilité.
Dans la page du package, ouvrir **Package settings → Change visibility** et choisir
public uniquement si cette publication est souhaitée. Vérifier les conséquences et
restrictions indiquées par GitHub avant confirmation.

Un package public peut être téléchargé anonymement. Pour un package privé, un
utilisateur local doit disposer d'un accès en lecture et d'un PAT **classic** avec
`read:packages`, selon les règles du compte ou de l'organisation. Utiliser une
variable sécurisée et `--password-stdin`, jamais un token littéral dans une commande :

```bash
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io -u VOTRE_COMPTE --password-stdin
```

Ne pas versionner ce token ni afficher sa valeur. Le `GITHUB_TOKEN` du workflow est
éphémère et ne constitue pas un identifiant permanent pour votre poste.

Si un package du même nom existait déjà sans être lié au dépôt, ouvrir **Package
settings → Manage Actions access** et vérifier l'accès de
`malekghabi1607/aura-student-life-os`. Une erreur `permission_denied` peut provenir
de cet accès, des règles de l'organisation ou des permissions effectives du job.
Ne pas élargir les permissions des jobs de test pour contourner cette erreur.

Références : [GHCR et authentification](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry),
[permissions et visibilité](https://docs.github.com/en/packages/learn-github-packages/about-permissions-for-github-packages).
