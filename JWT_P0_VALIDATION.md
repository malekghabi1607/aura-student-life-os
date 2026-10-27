# Validation JWT P0 — 27 octobre 2026

## Diagnostic du HTTP 400

Le token de reset était trouvé : le rejet venait de son expiration. Dans le précédent conteneur temporaire, PostgreSQL utilisait UTC tandis que la JVM utilisait Europe/Paris. La fixture enregistrait `2026-10-27 15:12:18.607829` dans une colonne `timestamp without time zone`. À 15:05 UTC (16:05 Paris), cette date était future pour la session SQL mais passée pour `LocalDateTime.now()` côté Java.

Le scénario injectait ainsi une échéance incohérente avec celle produite par `UserService.initPasswordReset`, qui utilise l'horloge Java. Le format UUID et la validation de la requête n'étaient pas la cause. Aucun changement supplémentaire du calcul d'expiration métier : le nouveau scénario appelle réellement `/api/auth/forgot-password`, récupère le token persisté et exige un reset HTTP 200 avant de vérifier la révocation. L'envoi d'e-mail est simulé ; aucune correction e-mail n'est incluse.

## Reproduction isolée

Prérequis : Java 17, Docker, image PostgreSQL 16 et sauvegarde locale accompagnée de son fichier `.sha256`.

```powershell
./scripts/Test-JwtPostgres.ps1 -DumpFile ./backups/<sauvegarde>.dump
```

Le script vérifie le checksum, crée son propre conteneur avec stockage tmpfs et port loopback aléatoire, restaure la sauvegarde uniquement dans une nouvelle base et exécute `backend/mvnw.cmd -f backend/pom.xml -B -ntp clean verify` avec les propriétés d'activation des tests PostgreSQL. Il nettoie uniquement son conteneur identifié et son fichier de mot de passe temporaire. Aucun volume persistant n'est créé ni supprimé. Les logs restent dans `.validation-tools`, ignoré par Git.

## Résultats attendus et vérifiés

| Étape | HTTP |
|---|---:|
| Inscription / vérification | 201 / 302 |
| Connexion initiale et JWT_A sur les catégories | 200 / 200 |
| Demande de reset / reset réellement effectué | 200 / 200 |
| JWT_A après reset | 401 |
| Connexion avec nouveau mot de passe / JWT_B | 200 / 200 |
| JWT_B après désactivation persistée | 401 |
| JWT de l'autre utilisateur après reset et désactivation | 200 / 200 |
| JWT expiré, mauvaise version, sans ver, mauvaise signature | 401 chacun |
| Connexion publique avec Bearer rejeté | 200 |
| Demande de reset pour adresse inconnue | 200 |
| Reset invalide / vérification invalide | 400 / 302 |
| Endpoint protégé sans authentification | 403 (comportement conservé) |

`token_version` : utilisateur cible 0 → 1 au reset → 2 à la désactivation ; autre utilisateur 0.

135 tests Maven, dont 4 tests PostgreSQL activés explicitement. Sans cette activation, les 4 tests PostgreSQL sont ignorés et les 131 autres s'exécutent normalement. Le test H2 de révocation désactive les traces HTTP DEBUG et les dumps MockMvc pour éviter les fragments de JWT dans les logs. Le script détecte les JWT complets ou tronqués et recherche les valeurs des secrets locaux ainsi que le mot de passe temporaire avant d'afficher le bilan.

Flyway : V1 puis V2 sur base vide ; baseline V1 puis V2 sur la copie restaurée pré-Flyway. Empreintes de toutes les lignes des sept tables et valeurs des séquences identiques avant/après V2, hors nouvelle colonne ; toutes les versions préexistantes initialisées à 0. V1 inchangée.

## Limites et suite soumise à autorisation

Les appels HTTP passent par MockMvc avec la vraie chaîne Spring Security et une vraie persistance PostgreSQL 16 ; ils ne valident pas un déploiement réseau ou Nginx. La copie correspond à la sauvegarde vérifiée disponible, pas à un nouveau snapshot de la base réelle.

Les anciens JWT sans `ver` seront refusés : reconnexion nécessaire après adoption. Les colonnes de reset restent sans fuseau ; conserver une configuration de fuseau cohérente entre instances. L'ALTER TABLE V2 nécessite un verrou exclusif, même sans réécriture des lignes : planifier son exécution réelle. Les scénarios publics listés sont vérifiés ; ceci ne constitue pas un audit exhaustif des endpoints publics.

Aucun déploiement, redémarrage de la stack réelle, push, changement de base réelle ou correction e-mail. Toute adoption de V2 sur la base réelle attend l'autorisation explicite de l'utilisateur.
