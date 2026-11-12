# Kyntus Workflow — Maintenance & Déploiement

## 1. Déployer après ces changements

```bash
cd ~/kyntus-workflow-main
git pull
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose ps
```

⚠️ **`--no-cache` est obligatoire pour le frontend.** Next.js « cuit » la cible du
proxy `/api` au moment du **build**, pas au runtime. Si tu changes `BACKEND_URL`
sans rebuild, rien ne change.

⚠️ **Avant le premier déploiement, ajuste `mem_limit` du service `backend`** dans
`docker-compose.yml` selon la RAM du serveur (laisse ~2 Go à l'OS) :

| RAM serveur | `mem_limit` |
|---|---|
| 8 Go  | `5g`  |
| 16 Go | `12g` |
| 32 Go | `26g` |

La JVM prend automatiquement 70 % de cette valeur (`-XX:MaxRAMPercentage=70`).

Vérifier la RAM du serveur :

```bash
free -h
```

## 2. Diagnostiquer « tout est en 500 »

Dans l'ordre :

```bash
docker compose ps
```

```bash
curl -s http://localhost:8082/api/health
```

```bash
curl -s http://localhost:8082/api/health/db
```

```bash
docker compose logs --tail=200 backend
```

Interprétation :

| Symptôme | Cause | Action |
|---|---|---|
| `/api/health` répond, `/api/health/db` → `503` | Postgres `10.10.10.50` injoignable ou pool saturé | vérifier le réseau / Postgres |
| `/api/health` ne répond pas, conteneur `unhealthy` | JVM bloquée | Docker la redémarre seul (30 s) |
| logs : `OutOfMemoryError` | fichiers Excel trop gros / `mem_limit` trop bas | augmenter `mem_limit` |
| logs : `Connection refused` vers `.50` | Postgres down | redémarrer Postgres |
| front : `Internal Server Error` non-JSON | le proxy Next.js ne joint pas le backend | voir les 2 premières lignes |

Suivre la RAM du backend en direct :

```bash
docker stats kyntus-backend
```

## 3. Règle d'or pour le code frontend

**Toujours des URL relatives `/api/...`.** Jamais `http://10.10.10.25:8082/...`
ni `http://${window.location.hostname}:8082/...` : ces appels partent du
**navigateur** et exigent que le port 8082 soit ouvert vers l'extérieur — c'est
ce qui faisait tomber certaines requêtes « merra merra ».

Un helper est disponible : `frontend/src/lib/api.ts` → `apiJson()` / `apiJsonOr()`.
Il vérifie `res.ok` avant de parser, ce qui évite le crash
`SyntaxError: Unexpected token 'I', "Internal S"...`.

Vérifier qu'aucune URL absolue n'est réapparue :

```bash
grep -rn "10\.10\.10\.\|:8082" frontend/src
```

## 4. Génération de facture

* Lecture des fichiers QA / TVC / Diag Wifi / Répéteur / Intervention en
  **streaming** (`FactureStreamSupport`) : RAM quasi constante quelle que soit
  la taille du fichier.
* Une seule génération à la fois par défaut (`FACTURE_MAX_CONCURRENT=1` dans
  `docker-compose.yml`). Les suivantes attendent en file, puis reçoivent un
  `429` avec un message clair au bout de 10 min.
* Les logs tracent chaque étape avec la RAM consommée :

```bash
docker compose logs -f backend | grep FACTURE
```

⚠️ **N'augmente `FACTURE_MAX_CONCURRENT` à 2 que si `mem_limit` ≥ 12g.**

⚠️ Si tu ajoutes un nouveau processor Excel, en mode streaming
`sheet.getRow(i)` et `sheet.getLastRowNum()` **ne fonctionnent pas** : il faut
itérer (`for (Row row : sheet)`).

## 5. Reste à faire (non traité ici)

* `FactureMasterService` lit encore le fichier « A VIDE » en `XSSFWorkbook`
  complet (nécessaire : il écrit dedans et conserve les styles). C'est le
  dernier gros consommateur de RAM de la chaîne.
* `GET /api/stats/dashboard-summary` charge **toutes** les tâches puis fait une
  requête par template (N+1). À réécrire en agrégation SQL quand le volume
  augmentera.
* `spring.servlet.multipart.location=/tmp/` : avec 6 fichiers de 500 Mo, surveiller
  l'espace disque du conteneur (`docker exec kyntus-backend df -h /tmp`).
