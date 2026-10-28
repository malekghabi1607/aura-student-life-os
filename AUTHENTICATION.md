# Authentification Aura — diagnostic et validation du 27 octobre 2026

## Causes établies

- Le secret local `.secrets/resend_api_key` est vide. Le Compose le monte sous `RESEND_API_KEY`, utilisé comme mot de passe SMTP. Aucun secret n'a été affiché ou changé. Cela empêche l'authentification SMTP avec cette configuration ; l'état du compte Resend et de ses DNS n'a pas été interrogé.
- L'expéditeur local est `onboarding@resend.dev`. Ce domaine de test ne permet pas l'envoi général à tous les utilisateurs : [restriction officielle Resend](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain). Il faut un domaine vérifié pour envoyer aux autres destinataires.
- `EmailService` absorbait les erreurs et retournait `void`. L'interface annonçait un e-mail envoyé sans connaître le résultat SMTP. Le compte était déjà persisté par le repository : sa perte lors d'une erreur SMTP n'a pas été reproduite. Ce comportement de conservation est désormais explicitement testé.
- L'e-mail de confirmation annonçait 24 heures sans aucune expiration en base ni contrôle dans `verify`. Aucun endpoint ni bouton de renvoi n'existait. Un compte non validé restait ainsi bloqué si le premier envoi échouait.
- Spring vérifiait l'état désactivé avant le mot de passe : un mauvais mot de passe pour un compte en attente produisait 403 au lieu de la réponse générique 401. Le frontend masquait aussi les pannes réseau/serveur derrière un message de mauvais identifiants.
- `/api/auth/me` était public mais déréférençait un principal null : 500 anonyme reproduit. La déconnexion ne supprimait que les données locales ; le JWT restait utilisable jusqu'à son expiration.
- Le reset possédait déjà un UUID, une expiration d'une heure et l'incrément de `token_version` P0. Aucun défaut de BCrypt ou de signature JWT empêchant le parcours normal n'a été reproduit. L'ancien échec de fixture UTC/Paris reste expliqué dans `JWT_P0_VALIDATION.md`.

Ces conclusions concernent le code et les fichiers locaux inspectés. Aucun diagnostic de requête réelle d'un utilisateur, de livraison réelle ou d'une image déployée modifiée n'est revendiqué.

## Corrections

- Inscription : compte et échéance persistés avant l'appel SMTP ; HTTP 201 même en cas d'échec d'envoi, avec `emailSent` et un message honnête. Le frontend propose le renvoi et garde l'adresse.
- Confirmation : UUID aléatoire, échéance de 24 h stockée en `Instant`, contrôle strict, lien à usage unique. Les liens expirés et invalides conduisent à des messages distincts et à un formulaire de renvoi.
- Renvoi : réponse publique générique, rotation du token, une minute entre deux émissions par compte. Les comptes déjà validés puis désactivés ne sont jamais réactivés par cet endpoint. Après un échec SMTP, le compte existe et peut renouveler le lien après ce délai.
- Connexion : les identifiants erronés restent génériques ; le statut non validé/désactivé n'est détaillé qu'après vérification du mot de passe. Le contrat de succès JWT reste inchangé et inclut toujours `ver`.
- Session : `/me` et `/logout` exigent l'authentification. Logout incrémente `token_version`, donc révoque toutes les sessions du compte. Le navigateur efface sa session même si le serveur est inaccessible et explique alors la limite de révocation distante. Un stockage local corrompu ne bloque plus la page ; la session est vérifiée au chargement et synchronisée entre onglets.
- Mot de passe oublié : la réponse reste générique pour éviter l'énumération des comptes, y compris lorsque SMTP échoue. L'interface parle de demande enregistrée et permet une nouvelle demande. Une minute sépare deux émissions par compte. Le reset conserve son expiration, refuse la réutilisation et révoque les anciens JWT avant la nouvelle connexion.
- Persistance : transactions et verrous de ligne pour la consommation des tokens et la révocation ; pas de modification des données réelles.
- E-mails : délais SMTP bornés, vérification du nom du certificat TLS, noms échappés en HTML, URL publiques normalisées. Les logs ne contiennent ni destinataire, ni token, ni détail brut d'exception fournisseur. Les traces HTTP susceptibles d'imprimer les DTO/mots de passe/JWT sont désactivées par défaut.
- Frontend : API auth centralisée sans Bearer périmé sur les endpoints publics, messages de réseau/validation/serveur distincts, erreurs de reset persistantes et liens de récupération. Le bouton de démonstration n'apparaît qu'en développement, conformément au seeder dev.

## Migration et compatibilité

`V3__add_verification_token_expiry.sql` ajoute uniquement une colonne nullable `timestamp with time zone`. V1 et V2 sont inchangées. Aucun compte n'est supprimé ou activé automatiquement. Les anciennes confirmations sans échéance devront être renvoyées ; les comptes déjà validés restent utilisables. V3 est nécessaire avant le démarrage de cette version avec Hibernate validate.

La réponse d'inscription est maintenant `{email, emailSent, message}` ; les erreurs 403 de login exposent `{code, message}`. Les pages React de ce dépôt sont adaptées ; d'autres consommateurs de l'ancien champ `name` doivent être mis à jour. Les erreurs 401 conservent le format précédent.

Les échéances de reset existantes restent en `LocalDateTime` pour préserver les liens et le schéma P0. Garder un fuseau JVM cohérent entre les instances ; ne pas fabriquer les fixtures depuis une horloge SQL d'un autre fuseau. Les JWT restent dans localStorage : cette correction conserve le contrat existant, sans migration vers des cookies HttpOnly.

## Configuration à fournir hors Git

| Variable / secret | Usage |
|---|---|
| `SPRING_PROFILES_ACTIVE=prod` | Profil de production, à ne pas combiner avec dev/test |
| `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD` | Base autorisée et identifiants, inchangés ici |
| `JWT_SECRET` / `.secrets/jwt_secret` | Secret indépendant de 32 octets UTF-8 minimum ; ne pas changer sans plan de reconnexion |
| `RESEND_API_KEY` / `.secrets/resend_api_key` | Clé Resend autorisée à envoyer ; le fichier Docker est actuellement vide |
| `APP_MAIL_FROM` | Adresse sur un domaine vérifié Resend pour les envois réels |
| `APP_FRONTEND_URL` | Origine publique du navigateur, CORS et reset |
| `APP_BACKEND_URL` | URL publique de l'API pour les confirmations ; jamais le nom Docker interne |

Le Compose existant utilise `SPRING_CONFIG_IMPORT=configtree:/run/secrets/`. En local dev, copier `backend/.env.example` vers `backend/.env`, démarrer depuis `backend` avec le profil dev. Les `.env` remplis et `.secrets` restent ignorés. Aucun fichier de secret n'a été rempli automatiquement.

SMTP existant : `smtp.resend.com`, port 465, utilisateur `resend`, SSL, clé API comme mot de passe ; ces paramètres correspondent à la [documentation Resend](https://resend.com/changelog/smtp-service). Vérifier dans le tableau de bord les droits de la clé, le domaine/DNS, les quotas et les événements de livraison. Une acceptation SMTP ne prouve pas la réception en boîte. Aucun e-mail réel n'a été envoyé pendant ces travaux.

## Tests et commandes exécutées

Avant correction, le nouveau test HTTP a reproduit 5 échecs fonctionnels sur 6 cas (après correction d'un problème de configuration du mock de healthcheck SMTP).

```powershell
# Java 17 et cache Maven locaux configurés dans le processus de test
./backend/mvnw.cmd -f backend/pom.xml -B -ntp -Dtest=AuthFlowIntegrationTest test
./backend/mvnw.cmd -f backend/pom.xml -B -ntp clean verify

# Sauvegarde existante vérifiée par son .sha256, restaurée uniquement dans un conteneur tmpfs neuf
./scripts/Test-JwtPostgres.ps1 -DumpFile ./backups/<sauvegarde>.dump -ResultsDirectory .validation-tools/auth/postgres

cd frontend
npm test
npm run build
# Depuis la racine, actionlint disponible localement
./.validation-tools/actionlint/actionlint.exe -shellcheck= .github/workflows/ci.yml
```

- Maven H2 : 149 découverts, 145 réussis, 4 PostgreSQL ignorés par défaut ; JAR compilé.
- Validation PostgreSQL 16 activée : 149 réussis, 0 échec, 0 ignoré, JAR compilé. Les 11 tests AuthFlow utilisent alors PostgreSQL avec le vrai EmailService et seulement JavaMailSender simulé. Les quatre tests P0 PostgreSQL passent aussi.
- SMTP simulé : succès, erreur temporaire, compte conservé, liens publics et HTML échappé, absence de contenu sensible dans les logs.
- HTTP : inscription 201, vérification 302, login 200, demande/reset 200, ancien JWT après reset 401, nouveau JWT 200, logout 204 puis JWT 401. Comptes non validés avec bon mot de passe 403, mauvais identifiants 401, /me anonyme 403, reset expiré/réutilisé 400. Renvoi 200 générique, anciens liens invalidés, expiration de confirmation distincte, compte désactivé non réactivé.
- Flyway V1/V2/V3 sur base vide ; baseline V1 puis V2/V3 sur copie restaurée. Empreintes des sept tables (hors nouvelles colonnes) et séquences préservées. Les données de vérification ajoutées restent dans la base temporaire.
- Frontend : 21 tests réussis, y compris les six cas de rendu des pages React ; build Vite réussi, avertissement existant de bundle supérieur à 500 kB.
- CI : `npm test` découvre désormais les nouveaux tests en conservant les anciens ; actionlint réussi.
- Contrôle des logs : pas de JWT complet/tronqué, de mots de passe synthétiques contrôlés ou de valeurs des secrets locaux. Aucun log brut n'est commité.

Les tests React couvrent le rendu et les fonctions/API ; ils ne constituent pas un parcours automatisé dans un navigateur avec une boîte e-mail réelle. La copie PostgreSQL correspond à la sauvegarde locale disponible, pas à un nouveau dump de la base réelle.

## Suite, uniquement après autorisation

1. Renseigner la clé et l'expéditeur vérifié hors Git ; confirmer les URL publiques finales.
2. Autoriser explicitement la préparation du déploiement réel et l'application de V3, avec sauvegarde vérifiée et fenêtre de verrou ALTER TABLE. Les procédures d'adoption Flyway existantes restent applicables.
3. Déployer ensuite une version backend/frontend cohérente, renouveler les anciennes confirmations sans échéance, puis effectuer un parcours réel avec une adresse de test autorisée et contrôler la réception.

Aucun push, déploiement, redémarrage de stack réelle, changement de base réelle ou manipulation des volumes existants. Les protections anti-abus restent limitées à la temporisation par compte sur renvoi/reset ; une protection globale de login/inscription à l'entrée réseau reste un chantier distinct.
