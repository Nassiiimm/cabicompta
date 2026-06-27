# 📘 Injecter les documents dans CabiCompta avec Claude Code

Permet à **Claude Code** (sur le PC Windows du cabinet) de **lire les PDFs, les classer
automatiquement et les déposer dans CabiCompta**, rattachés à la bonne société. C'est Claude
qui lit et trie ; les documents arrivent dans l'app au statut **« à valider »**.

> ✅ **La clé d'accès est déjà incluse** dans le fichier `.env` de ce dossier. Rien à saisir.

---

## 1. Prérequis (une seule fois)
- **Claude Code** installé et fonctionnel.
- **Node.js 18 ou plus** — vérifier dans PowerShell : `node --version` (sinon : https://nodejs.org).

## 2. Installation (une seule fois)
1. Décompresser ce dossier où tu veux, ex. **`D:\cabicompta-mcp`** (peu importe le disque).
2. Repérer le **chemin exact** du dossier qui contient `index.mjs` : ouvre-le dans l'Explorateur,
   clique la **barre d'adresse** en haut, copie le chemin (ex. `D:\cabicompta-mcp\mcp-server`).
3. Ouvrir **PowerShell**, aller dans ce dossier et installer :
   ```powershell
   cd "D:\cabicompta-mcp\mcp-server"
   npm install
   ```
   > Si `cd` ne change pas de disque : tape `D:` (Entrée) d'abord. Vérifier : `dir index.mjs`.
4. Brancher l'outil dans Claude Code (**adapter le chemin** à celui copié à l'étape 2) :
   ```powershell
   claude mcp add cabicompta -s user -- node "D:\cabicompta-mcp\mcp-server\index.mjs"
   ```
   *(Pas besoin de mettre la clé ici : elle est lue depuis le fichier `.env` du dossier.)*

## 3. Vérifier
Lancer `claude`, taper `/mcp` : tu dois voir **cabicompta** avec `list_companies` et `upload_document`.
Ou demander : *« liste les sociétés du cabinet »*.

## 4. Utilisation
Ouvre le dossier de PDFs dans Claude Code et demande, par exemple :

> « Dans le dossier `D:\Scans\2024`, pour chaque PDF : lis-le, identifie la **société**
> (NEQ ou nom), la **catégorie** et l'**année fiscale**, puis **injecte-le dans CabiCompta**.
> Si tu n'es pas sûr de la société, mets une note et continue. »

Les documents apparaissent ensuite dans chaque fiche client, au statut **« à valider »**.

## Analyses fiscales (gratuit, via Claude du poste)

En plus du simple classement, Claude peut **analyser** les documents et en extraire les données
fiscales — c'est ton abonnement Claude qui fait le travail (gratuit), pas l'API payante.

Outils MCP disponibles :
- `list_analysis_types` — liste les analyses possibles (factures/CTI-RTI, relevé bancaire,
  paie/DAS, T4/RL-1, T4A, ventes, états financiers T2, bilan détaillé).
- `get_analysis_spec(type)` — donne la consigne experte (prompt + format JSON) pour un type.

Workflow d'analyse :
1. `get_analysis_spec("BANK_STATEMENT")` (par ex.) pour obtenir la consigne et le format attendu.
2. Lis le document, applique la consigne, produis le JSON demandé.
3. `upload_document` avec ce JSON dans `extractedData` et la bonne `category`.

Exemple de demande :
> « Pour chaque relevé bancaire de `D:\Releves\2024`, applique l'analyse BANK_STATEMENT et
> injecte le résultat dans CabiCompta. »

## Catégories reconnues
`DAS, TPS_TVQ, FINANCIAL_STATEMENT, T1, T2, T4_RL1, T4A, REQ_DOC, IMMOBILISATION,
BANK_STATEMENT, INVOICE, TAX_NOTICE, CORPORATE, CONTRACT, RECEIPT, OTHER`

## Sécurité
- La clé du fichier `.env` permet **uniquement de déposer des documents** — jamais d'accès aux
  mots de passe clients. Ne pas la publier. En cas de fuite : la faire **révoquer** par l'administrateur.
- Formats : PDF, images, Word, Excel, CSV. Taille max **10 Mo** par fichier.

## Dépannage
- *« CABICOMPTA_API_KEY manquante »* → le fichier `.env` est absent du dossier, ou pas à côté de `index.mjs`.
- *« Clé API invalide »* → clé modifiée ou révoquée.
- *« Société introuvable »* → le NEQ/nom ne correspond à aucune société (vérifier avec `list_companies`).
- Chemin refusé → vérifie avec `dir index.mjs` que tu es dans le bon dossier ; mets le chemin entre guillemets.
- Rien ne se passe → relancer Claude Code après le `claude mcp add`.
