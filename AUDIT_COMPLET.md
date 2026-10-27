# Audit complet — Aura Student Life OS

Date : 27/10/2026 · Branche : `main` (HEAD `c6ca628`) · Périmètre : backend Spring Boot, frontend React/Vite, e-mails, IA, base PostgreSQL, Docker.

Aucun code métier n'a été modifié. Aucune donnée PostgreSQL ni aucun volume Docker n'ont été supprimés. Aucun secret n'est reproduit dans ce document.

---

## 1. Méthode et sources de preuve

| Source | Contenu | Emplacement |
| --- | --- | --- |
| Suite de tests existante | 115 tests, 14 classes, **0 échec** (exécution du 27/10, 12:29) | `.validation-tools/audit/backend/target/surefire-reports/` |
| Scénarios de régression d'audit | 9 scénarios, **6 échecs** | `.validation-tools/audit/backend/src/test/java/com/financetracker/audit/AuditRegressionTest.java` |
| Sonde de causes racines (ajoutée lors de cette reprise) | 13 sondes qui capturent l'exception résolue par Spring MVC | `.../audit/AuditRootCauseProbeTest.java`, sortie dans `.validation-tools/audit/probe-tests.log` (lignes `PROBE\|`) |
| Couverture JaCoCo | Lignes **588/1119 = 52,5 %**, branches 123/194 = 63,4 %, méthodes 146/398 = 36,7 % | `.validation-tools/audit/baseline-coverage.json` |
| Audit navigateur (Playwright, serveur H2 isolé) | 13 scénarios UI | `.validation-tools/audit/browser-results.json`, `browser-audit.mjs` |
| Audit fonctionnel (API + UI) | 15 scénarios | `.validation-tools/audit/feature-results.json`, `feature-audit.mjs` |
| Base PostgreSQL éphémère d'audit | Schéma réel, exécution SQL en lecture seule | conteneur `aura-audit-postgres-*` |
| Stack Docker locale | Smoke test HTTP en lecture seule sur `127.0.0.1:8088` | — |
| Dépendances | `npm audit`, OSV (Maven) | `npm-audit.json`, `osv-summary.json` |

La copie `.validation-tools/audit/backend/src/main` est identique à `backend/src/main` (vérifié avec `diff -rq`). Les preuves s'appliquent donc au code actuel.

**Légende des statuts**
- **CONFIRMÉ** : reproduit par un test, une sonde ou une requête HTTP, avec la cause localisée dans le code.
- **RISQUE** : faiblesse visible dans le code ou la configuration, mais pas d'exploitation démontrée.
- **NON TESTÉ** : fonctionnalité qui n'a pas pu être exercée.
- **NON CONCLUANT** : échec dont la cause pourrait venir du script de test plutôt que de l'application.

**Priorités**
- **P0** : à corriger avant toute mise en ligne (sécurité de session).
- **P1** : bug fonctionnel bloquant ou fuite de données.
- **P2** : bug ou robustesse.
- **P3** : qualité, UX, dette technique.

---

## 2. Les six échecs de régression : causes exactes

| # | Scénario | Attendu | Obtenu | Cause exacte (preuve par sonde) |
| --- | --- | --- | --- | --- |
| 1 | `disabledAccountMustNotKeepJwtAccess` | 401/403 | **200** | [JwtFilter.java:42-46](backend/src/main/java/com/financetracker/security/JwtFilter.java#L42-L46) authentifie dès que `jwtUtil.isValid()` est vrai. [JwtUtil.java:63-65](backend/src/main/java/com/financetracker/security/JwtUtil.java#L63-L65) ne contrôle que l'email et l'expiration, jamais `userDetails.isEnabled()`. Sonde : `disabledJwt\|status=200\|resolved=none` |
| 2 | `resetMustInvalidateExistingJwt` | 401/403 | **200** | Aucun mécanisme de révocation : `User` n'a ni `tokenVersion` ni `passwordChangedAt`, et le JWT ne porte aucune date à comparer. [UserService.java:76](backend/src/main/java/com/financetracker/service/UserService.java#L76) change le hash sans invalider les sessions. Sonde : `resetCall\|200` puis `jwtAfterReset\|status=200` |
| 3 | `invalidStudentInputsMustBeRejected` | 400 | **201** | [GoalController.java:28](backend/src/main/java/com/financetracker/controller/GoalController.java#L28) : `@RequestBody` sans `@Valid`, et `GoalRequest` n'a aucune contrainte. L'objet est persisté avec `title:""`, `target:-10`, `progress:-5`. Sonde : `invalidGoal\|status=201\|body={..."progress":-5,"target":-10...}` |
| 4 | `invalidQueryParameterMustReturn400` | 400 | **500** | `MethodArgumentTypeMismatchException` (`No enum constant TransactionType.INVALID`) n'a pas de handler dédié et tombe dans le handler générique [GlobalExceptionHandler.java:56](backend/src/main/java/com/financetracker/exception/GlobalExceptionHandler.java#L56) → 500. Sonde : `invalidEnum\|status=500\|resolved=...MethodArgumentTypeMismatchException` |
| 5 | `anonymousMeMustNotReturn500` | 401/403 | **500** | `/api/auth/**` est en `permitAll`, donc `/api/auth/me` est accessible sans token. `@AuthenticationPrincipal User user` vaut alors `null`, et [AuthController.java:103](backend/src/main/java/com/financetracker/controller/AuthController.java#L103) déclenche une NPE. Sonde : `NullPointerException: Cannot invoke "User.getEmail()" because "user" is null`. **Reproduit aussi sur la stack Docker** : `GET http://127.0.0.1:8088/api/auth/me` → `500`. |
| 6 | `goalMustBecomeIncompleteWhenProgressDecreases` | `completed=false` | **true** | [GoalService.java:69-71](backend/src/main/java/com/financetracker/service/GoalService.java#L69-L71) passe `completed` à `true` quand `progress >= target`, mais ne le remet jamais à `false`. La progression n'est pas non plus bornée. |

Les trois scénarios réussis : inscription → vérification → connexion (avec un mail factice), reset expiré refusé avec silence sur une adresse inconnue, isolation des 4 modules Student entre deux comptes.

---

## 3. Connexion, validation e-mail, mot de passe oublié (vérification ciblée)

| ID | Constat | Statut | Prio | Preuve |
| --- | --- | --- | --- | --- |
| AUTH-1 | Un JWT reste valide après la désactivation du compte | CONFIRMÉ | **P0** | Échec n° 1 |
| AUTH-2 | Un JWT reste valide jusqu'à 24 h après un reset de mot de passe : un token volé survit au changement | CONFIRMÉ | **P0** | Échec n° 2 |
| AUTH-3 | **Impasse d'inscription** : si l'envoi échoue, [EmailService.java:39](backend/src/main/java/com/financetracker/service/EmailService.java#L39) avale l'exception (simple `log.warn`) et `/register` répond 201 « Vérifiez votre email ». Il n'existe **aucun endpoint de renvoi**, et se réinscrire répond 400 « compte existe déjà ». Le reset de mot de passe ne réactive pas le compte. L'utilisateur est bloqué définitivement. | CONFIRMÉ (code + sonde `registerDuplicate\|400`) | **P1** | `AuthController` n'expose que register/verify/login/forgot/reset/me |
| AUTH-4 | Le jeton de vérification **n'expire jamais**, alors que le mail annonce « expire dans 24 heures ». Il n'y a aucun champ d'expiration dans `User`. | CONFIRMÉ | **P1** | Sonde `staleVerification\|status=302\|enabledAfter=true` (compte créé il y a 30 jours) |
| AUTH-5 | Énumération via `/login` : sur un compte non vérifié, un **mauvais** mot de passe renvoie 403 « Compte non vérifié ». Spring vérifie `isEnabled()` avant le mot de passe. On apprend ainsi que le compte existe et son état, sans connaître le mot de passe. | CONFIRMÉ | **P1** | Sonde `loginUnverifiedWrongPwd\|status=403` contre `loginUnknownEmail\|status=401` |
| AUTH-6 | Énumération via `/register` : « Un compte existe déjà avec cet email ». `/forgot-password` protège pourtant correctement contre ce problème. | CONFIRMÉ | P2 | [UserService.java:33](backend/src/main/java/com/financetracker/service/UserService.java#L33), sonde `registerDuplicate` |
| AUTH-7 | `/api/auth/me` sans token → 500 au lieu de 401 | CONFIRMÉ | P2 | Échec n° 5 |
| AUTH-8 | Un token malformé renvoie 403 (pas de `AuthenticationEntryPoint`). Le front déconnecte sur 401 et 403 indifféremment. | CONFIRMÉ | P3 | Sonde `malformedJwt\|403` |
| AUTH-9 | `AuthResponse` transporte les messages d'erreur dans le champ `name` (`{"name":"Email ou mot de passe incorrect"}`) | CONFIRMÉ | P3 | Sondes login |
| AUTH-10 | Aucune limitation de débit sur `/login`, `/register`, `/forgot-password` : brute force possible, ainsi que l'envoi massif d'e-mails | RISQUE | P1 | `SecurityConfig`, aucun limiteur hors IA |
| AUTH-11 | `/forgot-password` envoie le mail **de façon synchrone** seulement si l'adresse existe : la différence de temps de réponse peut révéler les comptes | RISQUE | P2 | [UserService.java:60](backend/src/main/java/com/financetracker/service/UserService.java#L60) |
| AUTH-12 | Les jetons de reset et de vérification sont stockés **en clair** en base (UUID). Une fuite de la base permet de prendre un compte pendant la fenêtre de validité. | RISQUE | P2 | `User.resetToken`, `User.verificationToken` |
| AUTH-13 | Mot de passe minimum de 6 caractères, sans autre règle | RISQUE | P2 | `RegisterRequest`, `ResetPasswordRequest` |
| AUTH-14 | Vérification par lien `GET` : les scanners de liens des messageries peuvent consommer le jeton | RISQUE | P3 | `GET /api/auth/verify` |
| AUTH-15 | `auth_user` corrompu dans `localStorage` → `JSON.parse` lève une exception au montage → **page blanche** sur toute l'application, sans possibilité de récupération | CONFIRMÉ | P2 | [AuthContext.jsx:8](frontend/src/context/AuthContext.jsx#L8) ; navigateur : `corrupt auth storage recovery: rendered body length=0` |
| AUTH-16 | La session front ne repose que sur la présence de `auth_user` ; le token n'est jamais revalidé au démarrage (`/me` existe mais n'est pas appelé) | RISQUE | P3 | `AuthContext.jsx`, `ProtectedRoute.jsx` |

**Comportements vérifiés et corrects** :
- l'inscription envoie le mail avec le bon jeton ;
- la connexion est refusée avant vérification (403) et acceptée après (200) ;
- un reset expiré est refusé (400) ;
- un jeton de reset déjà utilisé est refusé (`resetSecond\|400`) ;
- `/forgot-password` répond 200 que l'adresse soit connue ou non ;
- les liens contenant des jetons sont retirés des logs nginx et backend ;
- la redirection `verify?token=bogus` mène à `/login?error=invalid-token` (vérifié en direct sur la stack).

---

## 4. Backend : validation et cohérence des données

| ID | Constat | Statut | Prio | Preuve |
| --- | --- | --- | --- | --- |
| VAL-1 | Les 4 contrôleurs Student (Goals, Planning, Study, Fitness) n'ont **aucun `@Valid`**, et leurs DTO n'ont aucune contrainte. Des valeurs incohérentes sont acceptées (201). | CONFIRMÉ | **P1** | Échec n° 3 ; `grep @Valid` → 0 occurrence |
| VAL-2 | Un champ obligatoire absent (`title`, `name`) provoque une **erreur 500 SQL** au lieu d'une 400 | CONFIRMÉ | P1 | Sondes `nullGoalTitle` et `nullWorkoutName` → `DataIntegrityViolationException` |
| VAL-3 | Paramètre enum invalide → 500 | CONFIRMÉ | P2 | Échec n° 4 |
| VAL-4 | `completed` n'est jamais remis à `false` ; progression non bornée | CONFIRMÉ | P2 | Échec n° 6 |
| VAL-5 | Les entités JPA Student sont renvoyées telles quelles (champ `userId` exposé, couplage API/schéma) | CONFIRMÉ | P3 | Corps de la sonde `invalidGoal` |
| VAL-6 | Types faibles : `duration`, `time`, `estimatedTime` en `String` ; `type` en texte libre | RISQUE | P3 | DTO Planning, Study, Fitness |
| VAL-7 | `currentUserId()` est dupliqué dans 7 services, avec une requête SQL à chaque appel, alors que le principal est déjà un `User` | RISQUE | P3 | Services |
| VAL-8 | Le handler 500 générique **ne journalise pas** l'exception : aucun diagnostic possible en production | CONFIRMÉ | P2 | Aucune stack trace dans `server.log` pour les 500 de l'audit |

---

## 5. Base de données

| ID | Constat | Statut | Prio | Preuve |
| --- | --- | --- | --- | --- |
| DB-1 | **Aucun index sur `user_id`**, alors que toutes les requêtes filtrent sur cette colonne | CONFIRMÉ | P2 | `pg_indexes` sur la base d'audit : uniquement les clés primaires et `users_email_key` ; aucun `CREATE INDEX` dans `docker-init.sql` |
| DB-2 | **Aucune clé étrangère vers `users`** : supprimer un utilisateur laisserait des données orphelines | CONFIRMÉ | P2 | `pg_constraint` : une seule clé étrangère (`transactions_category_id_fkey`) |
| DB-3 | Aucun outil de migration. En `prod`, `ddl-auto: validate` et le schéma ne vient que de `docker-init.sql`, **exécuté uniquement sur un volume vide**. Toute évolution d'entité empêchera le démarrage sur un volume existant. | RISQUE | P1 | `application.yml`, `docker-compose.yml` |
| DB-4 | La requête native des statistiques (`AS month`) **fonctionne sous PostgreSQL** (vérifié en lecture seule) mais échoue sous H2 (`month` y est réservé). L'échec « financial statistics 500 » de l'audit fonctionnel est donc un **artefact H2**. Conséquence : aucun test automatisé ne couvre ce endpoint sur une vraie base. | CONFIRMÉ (lacune de test, pas un bug de production) | P2 | `server.log` (H2 : `Syntax error ... as [*]month`) ; psql sur la base d'audit : 0 ligne, pas d'erreur |
| DB-5 | `CategoryResponse.from()` appelle `getTransactions().size()` : chargement complet des transactions (N+1) | RISQUE | P3 | [CategoryResponse.java:25](backend/src/main/java/com/financetracker/dto/CategoryResponse.java#L25) |
| DB-6 | `Category.transactions` en `cascade = ALL` côté inverse | RISQUE | P3 | `Category.java:39` |
| DB-7 | Aucune pagination sur `/transactions` ; exports chargés intégralement en mémoire | RISQUE | P3 | `TransactionController`, `export/*` |

---

## 6. Frontend

| ID | Constat | Statut | Prio | Preuve |
| --- | --- | --- | --- | --- |
| FE-1 | **Fuite entre comptes sur un même navigateur** : Notes, Habitudes, Lectures, Langues et le profil Fitness sont stockés dans `localStorage` sous des clés globales (`aura_notes`…), et `logout()` ne les efface pas | CONFIRMÉ | **P1** | Navigateur : `Alice note visible to Bob=true` ; [NotesPage.jsx:6](frontend/src/pages/NotesPage.jsx#L6), [AuthContext.jsx:17-20](frontend/src/context/AuthContext.jsx#L17-L20) |
| FE-2 | Le tableau de bord Student affiche des **données fictives** identiques pour tous (`name: 'Malek'`, Life Score, XP, événements) | CONFIRMÉ | **P1** | Navigateur : `expected Audit Alice; hardcoded Malek=true` ; [StudentContext.jsx:6](frontend/src/context/StudentContext.jsx#L6) |
| FE-3 | Les données de ces modules ne sont **pas persistées côté serveur** : perte au changement d'appareil ou au nettoyage du navigateur | CONFIRMÉ (conception) | P1 | Pages concernées : aucun appel API |
| FE-4 | Pomodoro : à la fin du focus, le timer passe à 05:00 mais le mode reste « Focus » (anneau et libellé faux, sessions de pause comptées) | CONFIRMÉ | P2 | Navigateur : `05:00 \| Focus` ; [StudyPage.jsx:44](frontend/src/pages/StudyPage.jsx#L44) ne change pas `mode` |
| FE-5 | Une erreur API sur les objectifs s'affiche comme un **état vide** (« aucun objectif ») : l'erreur est masquée | CONFIRMÉ | P2 | Navigateur : `500 response displays empty state=true` ; [GoalsPage.jsx:22](frontend/src/pages/GoalsPage.jsx#L22) `.catch(console.error)` |
| FE-6 | Sélecteur de devise : seul le symbole change, sans conversion (45 000 DZD affichés « 45 000 € ») ; les exports codent « DZD » en dur | CONFIRMÉ (code) | P2 | `CurrencyContext.jsx`, [ExcelExportService.java:80](backend/src/main/java/com/financetracker/export/ExcelExportService.java#L80) |
| FE-7 | Débordement horizontal sur mobile (viewport 390 px) | CONFIRMÉ | P3 | `/dashboard` 678 px, `/study` 674, `/notes` 480, `/fitness` 442 ; capture `mobile-fitness.png` |
| FE-8 | 3 boutons-icônes sans nom accessible (planning, layout) | CONFIRMÉ | P3 | `browser-results.json` |
| FE-9 | Note modifiée puis rechargement de la page dans les 800 ms → modification perdue (debounce non vidé) | CONFIRMÉ (rechargement complet seulement) | P3 | `feature-results` ; `NotesPage.jsx:54-55` |
| FE-10 | Bundle unique de 885 kB (235 kB gzip). Le découpage par route testé le ramène à 64 kB + chunk graphiques. | CONFIRMÉ | P3 | `frontend-build.log`, `bundle-comparison.json` |
| FE-11 | Seulement 6 tests frontend (rendu sûr des messages IA) ; ni ESLint ni tests de composants | CONFIRMÉ | P3 | `frontend-tests.log` |
| FE-12 | Échecs UI « transaction create/update/delete » et « language create/vocabulary » (timeout de sélecteur) | **NON CONCLUANT** | — | Sélecteurs fragiles (`button.last()`, regex `/Vocabulaire/` qui correspond à plusieurs boutons). L'API transactions est couverte et verte par ailleurs. À rejouer avec des `data-testid`. |

**Vérifié correct** :
- rendu IA sûr (le HTML injecté par le fournisseur est affiché comme du texte, aucun `<img>` créé) ;
- les 14 routes protégées s'affichent ;
- redirection anonyme vers `/login` ;
- connexion réelle par l'interface ;
- CRUD des catégories et des tâches d'étude via l'interface, avec persistance.

---

## 7. E-mails

| ID | Constat | Statut | Prio |
| --- | --- | --- | --- |
| MAIL-1 | Échec d'envoi silencieux → impasse d'inscription (voir AUTH-3) | CONFIRMÉ | P1 |
| MAIL-2 | Envoi synchrone dans la requête HTTP : latence et fuite de timing (AUTH-11), et un SMTP lent bloque l'inscription | RISQUE | P2 |
| MAIL-3 | L'expéditeur par défaut `onboarding@resend.dev` ne délivre qu'à l'adresse du propriétaire du compte Resend : en dev, les autres destinataires ne reçoivent rien | RISQUE | P2 |
| MAIL-4 | Le texte du mail promet une expiration de 24 h qui n'existe pas (AUTH-4) | CONFIRMÉ | P1 |
| MAIL-5 | Liens bien construits (verify → backend, reset → frontend) et absents des logs | Vérifié | — |
| MAIL-6 | Livraison réelle via Resend (SMTP 465), rendu dans les clients mail, SPF/DKIM du domaine expéditeur | **NON TESTÉ** | — |

---

## 8. Assistant IA

État très amélioré depuis la revue initiale. Vérifié par le code et les tests `AIControllerSecurityTest` (17), `AIServiceTest` (5), `AIRateLimiterTest` (2) et `AIRequestSizeFilterTest` (2), tous verts :
- DTO validé (20 messages au maximum, 8 000 caractères par message, 32 000 au total) ;
- filtre de 256 KiB appliqué avant la désérialisation ;
- prompt système fixé côté serveur ;
- clé transmise dans le header `x-goog-api-key` ;
- timeouts de 5 s (connexion) et 30 s (lecture) ;
- erreurs du fournisseur converties en 429/502 sans fuite d'information ;
- quota par compte.

| ID | Constat | Statut | Prio |
| --- | --- | --- | --- |
| AI-1 | Limiteur en mémoire : remis à zéro au redémarrage, non partagé entre instances | RISQUE | P3 |
| AI-2 | Au-delà de 10 000 utilisateurs actifs dans la fenêtre, tout nouvel utilisateur est refusé (429 global) | RISQUE | P3 |
| AI-3 | Appel réel à Gemini (qualité, quotas du fournisseur, coût) | **NON TESTÉ** | — |
| AI-4 | Historique de conversation non persisté (perdu au rechargement) | CONFIRMÉ (conception) | P3 |

---

## 9. Docker et déploiement

Points forts vérifiés :
- secrets montés en fichiers (`/run/secrets`), jamais en variables d'environnement ;
- réseau `database` en `internal` ;
- conteneurs `read_only`, `cap_drop: ALL`, `no-new-privileges`, utilisateurs non-root (UID 10001 / nginx) ;
- healthchecks de readiness avec actuator sur un port séparé (8081), bloqué par nginx (`/actuator/health` → 404, vérifié) ;
- port frontend lié à `127.0.0.1` ;
- `.secrets/`, `.env.docker`, `.validation-tools/` et `backend/.maven-cache/` bien ignorés par git (`git check-ignore` vérifié, aucun fichier sensible suivi).

| ID | Constat | Statut | Prio |
| --- | --- | --- | --- |
| DOCK-1 | Schéma initialisé seulement sur un volume vide, sans migrations (voir DB-3) | RISQUE | P1 |
| DOCK-2 | Pas de `Content-Security-Policy` ni de `Strict-Transport-Security` dans nginx (seuls nosniff, Referrer-Policy et X-Frame-Options sont présents, vérifié en direct) | CONFIRMÉ | P2 |
| DOCK-3 | Pas de TLS dans la stack : il faudra un reverse proxy HTTPS en production | RISQUE | P2 |
| DOCK-4 | Sauvegarde et restauration du volume `postgres_data` non documentées ni testées | **NON TESTÉ** | P2 |
| DOCK-5 | Le build backend Docker relance les tests (H2), donc DB-4 n'y est pas couvert non plus | RISQUE | P3 |

---

## 10. Dépendances

Résultats bruts des scanners. Ils signalent des avis publiés ; leur exploitabilité dans ce projet n'a pas été vérifiée individuellement.

- **npm** : 14 vulnérabilités (8 high, 5 moderate, 1 low, 0 critical).
  - Directes : `axios` (high, correctif disponible sans rupture), `react-router-dom` (moderate), `vite` (high, correctif seulement en version majeure 8.x ; ne concerne que le serveur de dev et le build).
- **Maven (OSV)** : 18 artefacts concernés, dont `tomcat-embed-core` 10.1.54 (10 avis), `spring-webmvc` 6.2.18 (9), `jackson-databind` 2.21.2 (16), `spring-security-web` 6.5.10 (2), `postgresql` 42.7.10 (2), `poi-ooxml` 5.2.5 et `commons-compress` 1.25.0. La plupart se corrigent en montant de version de patch de Spring Boot 3.5.x et en mettant à jour POI.
- `itext7-core` 8.0.4 est relocalisé vers `itext-core` (avertissement Maven). La licence AGPL d'iText est à valider pour un usage non open-source.

| ID | Constat | Statut | Prio |
| --- | --- | --- | --- |
| DEP-1 | Dépendances backend avec avis connus (Tomcat, Spring MVC, Jackson) | RISQUE | P1 |
| DEP-2 | `axios` direct en high | RISQUE | P1 |
| DEP-3 | `vite` 5 (high, dev uniquement), migration majeure nécessaire | RISQUE | P3 |

---

## 11. Constats de la revue initiale désormais corrigés (vérifiés)

| Constat initial | Preuve de correction |
| --- | --- |
| Exports Excel/PDF contenant les données de tous les utilisateurs | `ExportIsolationTest` (3 tests verts) |
| Transaction liable à la catégorie d'un autre utilisateur | `findByIdAndUserId` + `TransactionServiceTest` et `PersistenceIsolationTest` |
| XSS dans l'assistant IA | `SafeMessageContent` + tests front + scénario navigateur |
| Proxy Gemini ouvert, prompt système fourni par le client | `AIChatRequest`, `AIRateLimiter`, `AIRequestSizeFilter` |
| Secret JWT par défaut | `JwtUtil.initialize()` refuse un secret vide ou de moins de 32 octets hors dev/test ; `ProductionConfigurationTest` |
| Compte démo créé en production | `@Profile("dev & !prod & !test")` |
| Messages d'exception renvoyés au client | Handler générique → « Internal server error » |
| CORS codé en dur | Dérivé de `app.frontend-url`, origine validée |
| Liens de vérification et de reset dans les logs | Messages de log neutres, format nginx `safe` |

---

## 12. Fonctionnalités non testées

- Livraison réelle des e-mails (Resend) et rendu dans les clients mail.
- Appels réels à Gemini.
- Contenu des exports Excel/PDF sur de gros volumes, et accents dans le PDF (polices standard Helvetica).
- Endpoint `/statistics/dashboard` sur PostgreSQL de bout en bout via l'API. Seule la requête SQL a été validée.
- Exécution de la CI GitHub Actions (`.github/workflows/ci.yml`) sur GitHub.
- Concurrence (double soumission, modifications simultanées).
- Sauvegarde et restauration de la base.
- Accessibilité complète (clavier, lecteurs d'écran) au-delà du contrôle des noms de boutons.

---

## 13. Synthèse par priorité

| Prio | Constats confirmés | Risques |
| --- | --- | --- |
| **P0** | AUTH-1 (JWT valide après désactivation), AUTH-2 (JWT valide après reset) | — |
| **P1** | AUTH-3 (impasse d'inscription), AUTH-4 (vérification sans expiration), AUTH-5 (énumération via login), VAL-1 (pas de validation Student), VAL-2 (500 SQL sur champ manquant), FE-1 (fuite localStorage entre comptes), FE-2 (dashboard fictif), FE-3 (modules non persistés), MAIL-4 | AUTH-10 (pas de rate-limit auth), DB-3/DOCK-1 (pas de migrations), DEP-1, DEP-2 |
| **P2** | AUTH-6, AUTH-7, AUTH-15, VAL-3, VAL-4, VAL-8, DB-1, DB-2, DB-4 (lacune de test), FE-4, FE-5, FE-6, DOCK-2 | AUTH-11, AUTH-12, AUTH-13, MAIL-2, MAIL-3, DOCK-3, DOCK-4 |
| **P3** | AUTH-8, AUTH-9, VAL-5, FE-7, FE-8, FE-9, FE-10, FE-11 | AUTH-14, AUTH-16, VAL-6, VAL-7, DB-5, DB-6, DB-7, AI-1, AI-2, DOCK-5, DEP-3 |

Le plan de correction se trouve dans [PLAN_CORRECTIONS.md](PLAN_CORRECTIONS.md).
