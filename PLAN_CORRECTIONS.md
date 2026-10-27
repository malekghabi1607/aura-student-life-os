# Plan de corrections — Aura Student Life OS

Basé sur [AUDIT_COMPLET.md](AUDIT_COMPLET.md). Les identifiants (AUTH-1, VAL-1…) renvoient à ce rapport.

## Principes

1. **Un lot = une branche = un ou plusieurs commits atomiques.** Pas de mélange entre sécurité, fonctionnel et refactorisation.
2. **Test rouge d'abord.** Les scénarios de [AuditRegressionTest.java](.validation-tools/audit/backend/src/test/java/com/financetracker/audit/AuditRegressionTest.java) sont déplacés dans `backend/src/test/...` au début de chaque lot concerné. Ils doivent échouer avant le correctif et passer après.
3. **Non-régression globale** à la fin de chaque lot :
   - `./mvnw test` (115 tests existants + nouveaux) ;
   - tests front (`node --test`) ;
   - `npm run build` ;
   - `scripts/Test-DockerStack.ps1` sur la stack locale ;
   - suivi de la couverture JaCoCo (référence : 52,5 % des lignes). Elle ne doit pas baisser.
4. **Ne jamais toucher aux volumes** `aura-student-life-os-containers_postgres_data` ni `orderflow-*`. Les changements de schéma passent par une migration (lot 3), jamais par une recréation du volume.

---

## Ordre de correction

### Lot 1 — P0 : révocation des sessions (AUTH-1, AUTH-2)

**Changements**
- `JwtFilter` : ne pas authentifier si `!userDetails.isEnabled()` (ainsi que les autres drapeaux `isAccountNonLocked`…). Journaliser les échecs de parsing en `debug` au lieu de `catch (Exception ignored)`.
- Ajouter `User.tokenVersion` (int, défaut 0) et le claim `ver` dans le JWT. `JwtUtil.isValid` compare `ver` à `user.getTokenVersion()`.
- Incrémenter `tokenVersion` dans `resetPassword`, à la désactivation du compte et lors d'un futur « déconnecter toutes les sessions ».
- Option recommandée : réduire la durée de vie du JWT (par exemple 1 h). Le refresh token peut attendre un lot ultérieur.

**Risques**
- Ajouter une colonne implique une évolution du schéma. Comme `prod` est en `ddl-auto: validate` sans migrations, **le backend ne démarrera pas** sur le volume Docker existant tant que la colonne n'existe pas. Il faut donc soit livrer le lot 3 (Flyway) avant ou en même temps, soit fournir un script `ALTER TABLE users ADD COLUMN token_version integer NOT NULL DEFAULT 0` appliqué manuellement, sans recréer le volume.
- Tous les JWT émis avant le déploiement deviennent invalides (pas de claim `ver`). L'impact est acceptable : les utilisateurs devront se reconnecter. Sinon, considérer l'absence de claim comme `ver=0` pendant une période de transition.

**Tests de non-régression**
- `disabledAccountMustNotKeepJwtAccess` : 401/403.
- `resetMustInvalidateExistingJwt` : 401/403.
- Nouveau : un JWT émis **après** le reset fonctionne (200).
- Nouveau : un token malformé, expiré ou signé avec une autre clé est refusé.
- Les tests `*ControllerTest` existants restent verts (ils génèrent des tokens valides).

---

### Lot 2 — P1 : parcours d'inscription et e-mails (AUTH-3, AUTH-4, AUTH-5, MAIL-4)

**Changements**
1. Ajouter `User.verificationTokenExpiry`, fixé à 24 h, et le contrôler dans `verify()`. Cela aligne le comportement sur le texte du mail.
2. Ajouter l'endpoint `POST /api/auth/resend-verification` :
   - réponse toujours 200, quel que soit l'état du compte (pas d'énumération) ;
   - régénère le jeton et l'expiration si le compte existe et n'est pas activé ;
   - limité en débit.
3. Ajouter le bouton « Renvoyer l'email » sur `CheckEmailPage`, et dans le toast de `LoginPage` en cas de 403.
4. Login : vérifier le mot de passe **avant** de révéler l'état « non vérifié ». Par exemple, gérer `DisabledException` seulement si `passwordEncoder.matches()` est vrai ; sinon répondre 401 générique.
5. `EmailService` : ne plus avaler l'échec en silence. Remonter une erreur de livraison explicite, ou enregistrer l'échec pour un nouvel essai. Au minimum, l'utilisateur doit pouvoir utiliser l'endpoint de renvoi.
6. Corriger `AuthResponse` : ajouter un champ `message` distinct de `name` (AUTH-9). Le front lit `message`.

**Risques**
- Évolution du schéma (même contrainte que le lot 1 : migration requise).
- Les comptes existants non vérifiés n'ont pas d'expiration : la traiter comme expirée et proposer le renvoi.
- La modification de `LoginPage` doit garder le message 403 pour les comptes non vérifiés **avec** un mot de passe correct.

**Tests de non-régression**
- `registrationVerificationAndLoginWorkWithFakeMail` reste vert.
- Nouveau : un jeton de vérification expiré → redirection `?error=invalid-token`, compte toujours désactivé.
- Nouveau : renvoi de vérification sur un compte inconnu, activé ou non activé → 200 dans les trois cas, et un mail envoyé uniquement pour le compte non activé.
- Nouveau : compte non vérifié + mauvais mot de passe → **401** (et non plus 403).
- Nouveau : compte non vérifié + bon mot de passe → 403.
- Nouveau : `EmailService` qui lève une exception → l'utilisateur peut encore obtenir un lien via le renvoi.
- `expiredResetIsRejectedAndUnknownAddressIsSilent` reste vert.

---

### Lot 3 — P1 : migrations et intégrité de la base (DB-3, DOCK-1, DB-1, DB-2)

**Changements**
- Introduire Flyway :
  - `V1__baseline.sql` = schéma actuel de `docker-init.sql` ;
  - `baselineOnMigrate=true`, pour **adopter le volume existant sans le recréer** ;
  - `docker-init.sql` n'est plus monté (ou vidé) une fois Flyway en place.
- `V2__indexes.sql` : index sur `user_id` pour chaque table, et index `(user_id, date)` sur `transactions` et `planning_events`.
- `V3__user_fks.sql` : clés étrangères `user_id → users(id)`. Vérifier d'abord en lecture seule l'absence de lignes orphelines (`SELECT ... WHERE user_id NOT IN (SELECT id FROM users)`).
- Colonnes des lots 1 et 2 (`token_version`, `verification_token_expiry`) dans `V4__auth_tokens.sql`.

**Risques**
- Le baseline doit correspondre **exactement** au schéma existant, sinon `validate` échoue. Faire une sauvegarde `pg_dump` du volume avant la première exécution en production. La restauration doit être testée (DOCK-4).
- Une clé étrangère échoue si des données orphelines existent : le contrôle préalable est obligatoire.
- La création d'index sur de grosses tables verrouille : utiliser `CREATE INDEX CONCURRENTLY` si les volumes de données le justifient.

**Tests de non-régression**
- `ContainerSchemaTest` adapté pour valider le schéma issu de Flyway.
- Nouveau test d'intégration PostgreSQL (Testcontainers ou la base d'audit éphémère) : démarrage avec `ddl-auto: validate` sur un schéma migré.
- Nouveau test d'intégration PostgreSQL de `/api/statistics/dashboard`, qui comble la lacune DB-4 (la requête native n'est pas testable sous H2).
- `Test-DockerStack.ps1` sur un **nouveau** projet Compose temporaire, puis sur la stack existante après sauvegarde.

---

### Lot 4 — P1 : validation des modules Student (VAL-1, VAL-2, VAL-3, VAL-4, VAL-8)

**Changements**
- `@Valid` sur les `@RequestBody` de Goal, Planning, Study et Fitness.
- Contraintes :
  - `@NotBlank @Size` sur les titres et noms ;
  - `@Min(0)` sur `progress`, `duration` et `calories` ;
  - `@Min(1)` sur `target` ;
  - `@NotNull` sur `date` quand le champ est requis.
- Le patch de progression : DTO validé à la place de `Map<String,Integer>`.
- `GoalService.updateProgress` : borner `progress` à `[0, target]` et écrire `completed = progress >= target` dans les deux sens.
- `GlobalExceptionHandler` :
  - `MethodArgumentTypeMismatchException` et `MissingServletRequestParameterException` → 400 ;
  - `DataIntegrityViolationException` → 409 ou 400 générique ;
  - **journaliser** l'exception dans le handler 500 (`log.error`, sans données sensibles).
- `/api/auth/me` : exiger l'authentification (sortir `/me` du `permitAll`, ou renvoyer 401 si `user == null`) (AUTH-7).

**Risques**
- Le front envoie peut-être des champs vides aujourd'hui acceptés (par exemple `deadline: ''`). Vérifier chaque formulaire et chaque payload avant de durcir les contraintes, sinon des écrans actuellement fonctionnels renverront 400.
- Les données déjà en base peuvent violer les nouvelles règles. Les contraintes Bean Validation ne s'appliquent qu'aux écritures, mais un `update` d'un objet invalide sera désormais refusé.

**Tests de non-régression**
- `invalidStudentInputsMustBeRejected` → 400.
- `invalidQueryParameterMustReturn400` → 400.
- `anonymousMeMustNotReturn500` → 401/403.
- `goalMustBecomeIncompleteWhenProgressDecreases` → `false`.
- Nouveau : champ obligatoire absent sur chacun des 4 modules → 400, avec le champ en erreur dans `errors`.
- `allStudentModulesMustIsolateAccounts` reste vert.
- `feature-audit.mjs` : CRUD des 4 modules via l'API, tous en PASS.

---

### Lot 5 — P1 : confidentialité et données réelles côté front (FE-1, FE-2, FE-3, AUTH-15)

**Étape A (rapide, sans backend)**
- Préfixer toutes les clés `localStorage` par l'identifiant du compte (`aura:{email}:notes`…) et purger les clés du compte au `logout()`.
- `AuthContext` : entourer `JSON.parse` d'un `try/catch`, purger et rediriger si la valeur est corrompue. Valider la session au démarrage via `/api/auth/me`.

**Étape B (structurelle)**
- Endpoints backend pour Notes, Habitudes, Lectures, Langues et profil Fitness, avec le même modèle que les modules Student : `userId`, DTO validés, tests d'isolation.
- `StudentDashboard` alimenté par les vraies données (nom de l'utilisateur, statistiques agrégées) ou, d'ici là, présenté clairement comme démo.
- Migration ponctuelle des données `localStorage` existantes vers l'API au premier chargement.

**Risques**
- Étape A : les données déjà stockées sous les anciennes clés globales doivent être rattachées au compte connecté, une seule fois, sinon l'utilisateur croira les avoir perdues. Sur un navigateur partagé, impossible de savoir à quel compte elles appartiennent : proposer un import explicite plutôt qu'une attribution automatique.
- Étape B : de nombreux nouveaux endpoints, donc une surface de test importante. Livrer un module à la fois.

**Tests de non-régression**
- Navigateur : `cross-account notes confidentiality` → Bob ne voit pas la note d'Alice.
- Navigateur : `corrupt auth storage recovery` → page de connexion affichée, aucune erreur JS non capturée.
- Navigateur : `dashboard personal identity` → nom du compte connecté.
- Les scénarios `notes reload persistence`, `habit UI`, `reading UI` restent verts.

---

### Lot 6 — P1 : sécurité transverse (AUTH-10, DEP-1, DEP-2)

**Changements**
- Limitation de débit par IP et par email sur `/login`, `/register`, `/forgot-password` et `/resend-verification`. Réutiliser le modèle d'`AIRateLimiter`, ou Bucket4j.
- Monter Spring Boot à la dernière version de patch 3.5.x (Tomcat, Spring MVC, Jackson, Security), ainsi que POI et commons-compress, et relancer OSV.
- Mettre à jour `axios` et `react-router-dom` (versions mineures), puis relancer `npm audit`.

**Risques**
- Une limite trop stricte bloque des utilisateurs légitimes derrière un NAT (université). Choisir des seuils raisonnables et renvoyer `Retry-After`.
- Les montées de version peuvent changer des comportements (Jackson, Security) : la suite complète doit être verte, y compris `ProductionConfigurationTest`.

**Tests de non-régression**
- Nouveau : N+1 tentatives de login → 429 avec `Retry-After`.
- Nouveau : le rate-limit d'un compte n'affecte pas les autres.
- Suite complète backend et frontend, build Docker, `Test-DockerStack.ps1`.
- OSV et `npm audit` : plus aucun avis high sur les dépendances directes.

---

### Lot 7 — P2

| Item | Changement | Risque | Test |
| --- | --- | --- | --- |
| AUTH-6 | `/register` : réponse identique que l'adresse existe ou non (201 + mail « vous avez déjà un compte » au propriétaire) | Changement d'UX pour l'inscription | Inscription en double → 201, aucun nouveau compte créé |
| AUTH-11, MAIL-2 | Envoi des mails en asynchrone (`@Async` ou file d'attente) | Gestion des erreurs asynchrones (articulation avec le lot 2) | Les temps de réponse de forgot-password sont comparables pour une adresse connue et inconnue |
| AUTH-12 | Stocker un **hash** SHA-256 des jetons de reset et de vérification | Invalide les liens en cours au déploiement | Le reset fonctionne ; la base ne contient pas le jeton en clair |
| AUTH-13 | Politique de mot de passe (≥ 10 caractères + liste de mots de passe courants) | Ne s'applique qu'aux nouveaux mots de passe | Tests de validation de `RegisterRequest` |
| FE-4 | Pomodoro : basculer `mode` en fin de cycle, compter seulement les focus ; sortir les effets de bord du `setTimer` | — | Navigateur : focus → « 05:00 Pause » |
| FE-5 | `GoalsPage` (et pages similaires) : état d'erreur distinct de l'état vide | — | Navigateur : `goals API error visible` |
| FE-6 | Devise : une devise par utilisateur stockée côté serveur, appliquée aussi aux exports ; ou retirer le sélecteur | Données existantes en DZD | Export et affichage cohérents |
| DOCK-2 | Ajouter `Content-Security-Policy` (default-src 'self'…) et HSTS derrière TLS | Une CSP trop stricte casse les styles inline (très utilisés) : commencer en `Report-Only` | Navigateur : aucune violation CSP sur les 14 routes |
| DOCK-4 | Script de sauvegarde et restauration `pg_dump`/`pg_restore`, documenté | — | Restauration testée sur un projet Compose temporaire |
| MAIL-3 | Documenter l'obligation d'un domaine vérifié chez Resend pour `APP_MAIL_FROM` | — | — |

### Lot 8 — P3 (dette technique, à étaler)

- Remplacer les entités renvoyées par des DTO de réponse (VAL-5) et utiliser des types forts (VAL-6).
- Un `CurrentUser` unique via `@AuthenticationPrincipal` (VAL-7).
- `COUNT` groupé pour les catégories (DB-5), retirer `cascade=ALL` (DB-6), pagination (DB-7).
- `AuthenticationEntryPoint` qui renvoie 401 (AUTH-8).
- Découpage du bundle par route (FE-10, gain mesuré : 885 kB → 64 kB pour l'entrée).
- Débordement mobile (FE-7), `aria-label` (FE-8), vidage du debounce sur `beforeunload` (FE-9).
- Ajouter ESLint, tests de composants et `data-testid`, puis rejouer les scénarios non concluants (FE-12).
- Migration vers Vite 6 ou plus (DEP-3).
- Limiteur IA partagé (Redis) en cas de déploiement multi-instance (AI-1, AI-2).

---

## Récapitulatif

| Lot | Prio | Dépend de | Effort estimé |
| --- | --- | --- | --- |
| 1 Révocation des sessions | P0 | Lot 3 (colonne) ou script SQL manuel | S |
| 2 Parcours e-mail | P1 | Lot 3 (colonnes) | M |
| 3 Flyway et intégrité | P1 | — (à faire en premier ou avec le lot 1) | M |
| 4 Validation Student | P1 | — | S |
| 5 Confidentialité front | P1 | Étape B : nouveaux endpoints | A : S, B : L |
| 6 Rate-limit et dépendances | P1 | — | S–M |
| 7 P2 | P2 | Lots 2 et 3 | M |
| 8 P3 | P3 | — | Continu |

**Ordre recommandé** :

1. Lot 3 (socle Flyway, baseline seulement).
2. Lot 1.
3. Lot 4.
4. Lot 2.
5. Lot 5A.
6. Lot 6.
7. Lot 5B.
8. Lot 7.
9. Lot 8.

Les lots 4 et 5A ne touchent pas au schéma et peuvent avancer en parallèle du lot 3.
