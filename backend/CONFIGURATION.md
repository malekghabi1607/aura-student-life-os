# Configuration des environnements

Le profil par défaut est **prod**. Pour le développement, sélectionner explicitement
`dev`. Ne jamais combiner `prod` avec `dev` ou `test` : le démarrage est refusé.
Les fichiers YAML versionnés ne contiennent aucun secret. La séparation des profils
utilise les [mécanismes Spring Boot](https://docs.spring.io/spring-boot/3.5/reference/features/external-config.html).

## Variables

| Variable | Production | Utilisation |
| --- | --- | --- |
| `SPRING_PROFILES_ACTIVE` | `prod` recommandé explicitement | `dev` pour le développement ; `test` réservé aux tests |
| `JWT_SECRET` | Obligatoire, non vide, au moins 32 octets UTF-8 | Secret aléatoire stable et indépendant pour chaque environnement |
| `DATABASE_URL` | Obligatoire | URL JDBC PostgreSQL, sans mot de passe dans l'URL |
| `DATABASE_USERNAME` | Obligatoire | Compte PostgreSQL de l'application |
| `DATABASE_PASSWORD` | Obligatoire | Mot de passe du compte PostgreSQL |
| `APP_FRONTEND_URL` | Obligatoire | Origine unique du frontend, par exemple `https://aura.example`, sans chemin, joker, query ou fragment ; utilisée aussi par CORS et les emails |
| `APP_BACKEND_URL` | Obligatoire | URL publique de l'API pour les liens de vérification |
| `APP_MAIL_FROM` | Obligatoire | Expéditeur autorisé chez le fournisseur email |
| `RESEND_API_KEY` | Requis pour envoyer les emails | Sans configuration valide, inscription/réinitialisation ne peuvent pas acheminer leurs emails |
| `GEMINI_API_KEY` | Requis pour utiliser l'IA | Sans clé, le chat affiche son état non configuré ; jamais de clé `VITE_*` |
| `GEMINI_MODEL` | Facultatif | Modèle existant conservé : `gemini-2.0-flash` ; vérifier sa disponibilité dans le compte fournisseur avant déploiement |
| `AI_RATE_LIMIT_REQUESTS` | Facultatif, défaut `10`, minimum `1` | Nombre maximal de requêtes IA par compte et fenêtre |
| `AI_RATE_LIMIT_WINDOW_SECONDS` | Facultatif, défaut `60`, de `1` à `86400` | Durée de la fenêtre de quota |
| `HIKARI_MAX_POOL` | Facultatif, défaut `10` | Taille maximale du pool JDBC |

Générer un secret avec un générateur cryptographique, par exemple `openssl rand -base64 48`,
puis le fournir via le gestionnaire de secrets ou l'environnement du processus.
Ne jamais copier un secret d'exemple ni le placer dans une commande versionnée.
La rotation du secret invalide les JWT déjà émis ; tous les exemplaires d'une même
application doivent utiliser la même clé.

## Développement

Depuis `backend/`, copier `.env.example` vers `.env` puis exécuter :

```powershell
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
```

Seul `dev` importe automatiquement `backend/.env` (format Java properties).
Le profil conserve la création du compte de démonstration et `ddl-auto: update`.
Il doit donc être utilisé uniquement avec une base de développement dédiée.
Sans `JWT_SECRET`, une clé aléatoire en mémoire est générée au démarrage : les
sessions deviennent invalides à chaque redémarrage. Aucun secret fixe de secours.
Les liens de vérification/réinitialisation ne sont plus écrits dans les logs,
même lorsqu'un email échoue.

## Production

Fournir les variables obligatoires au processus puis lancer le JAR avec
`--spring.profiles.active=prod`. Les fichiers `.env` locaux ne sont pas importés
automatiquement dans ce profil.

- Absence de secret JWT ou clé trop courte : échec du démarrage.
- Aucun `DataSeeder` : ni création ni réactivation automatique du compte de démonstration.
- `ddl-auto: validate` vérifie le schéma existant sans le modifier. Un schéma
  absent/incompatible empêche le démarrage ; son évolution nécessitera une procédure
  de migration séparée. Aucune migration n'est exécutée par cette modification.
- Les logs SQL et paramètres JDBC sont désactivés ; les services métier sont au
  niveau WARN pour éviter les traces INFO contenant montants, titres et emails.
- CORS autorise uniquement `APP_FRONTEND_URL` avec GET, POST, PUT, PATCH, DELETE et OPTIONS.

**Attention aux comptes existants :** un ancien compte de démonstration déjà enregistré
reste dans PostgreSQL. Le filtrage par profil ne le supprime pas et ne le désactive pas.
Il faudra décider séparément de son traitement avant publication.

## IA : contrat et limites

`POST /api/ai/chat` reçoit `{ "messages": [{ "role": "user", "content": "Bonjour" }] }`.
Seuls les rôles `user` et `assistant` sont acceptés. Un ancien champ client `system`
est ignoré : le prompt système est défini exclusivement dans `AIService`.
La clé fournisseur est envoyée dans `x-goog-api-key`, jamais dans l'URL.

- 1 à 20 messages, 8 000 caractères UTF-16 maximum par message, 32 000 au total.
- Corps HTTP limité à 256 Kio avant désérialisation, y compris sans Content-Length.
- Les entrées invalides renvoient 400 ; un corps trop grand renvoie 413.
- Quota par compte authentifié : 429 avec Retry-After ; appels refusés avant Gemini.
- Les erreurs Gemini sont neutralisées (502, ou 429 pour son quota) sans exposer
  sa réponse brute. Connexion limitée à 5 secondes et lecture à 30 secondes.
- Le frontend conserve l'affichage du chat mais envoie seulement le contexte récent
  qui respecte ces limites ; les anciens messages ne sont plus tous transmis à Gemini.

Le quota est **en mémoire et par instance** ; il se réinitialise au redémarrage.
Il ne remplace pas un quota distribué, une limite globale de budget fournisseur ou
les limites HTTP du futur reverse proxy. Le prompt serveur n'empêche pas à lui seul
les tentatives d'injection de prompt dans les messages utilisateur.

## Tests isolés

`application-test.yml` se trouve uniquement dans `src/test/resources`, hors du JAR
de production. Les tests Spring sélectionnent explicitement `test`, utilisent H2 en
mémoire et n'exécutent pas le seeder. Les tests de configuration prod n'instancient
aucune datasource : ils ne démarrent pas l'application métier sur PostgreSQL.

```powershell
cd backend
.\mvnw.cmd test
.\mvnw.cmd package -DskipTests
cd ../frontend
node --test --test-isolation=none src/components/SafeMessageContent.test.js src/utils/aiMessages.test.js
npm.cmd run build
```

Ces tests ne prouvent pas la disponibilité de Gemini, de l'email ou du schéma
PostgreSQL réel. Aucun appel externe réel à Gemini ou Resend n'est effectué.
