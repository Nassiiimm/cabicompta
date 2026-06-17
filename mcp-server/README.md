# cabicompta-mcp

Serveur **MCP** qui permet à **Claude Code** (sur la machine Windows du cabinet) d'injecter
des documents (PDF, images, Excel…) directement dans CabiCompta — sans interface web, sans
coût OCR serveur (c'est *ton* Claude qui lit et classe les PDFs).

## Outils exposés à Claude

| Outil | Rôle |
|---|---|
| `list_companies` | Liste les sociétés du cabinet (id, nom, **NEQ**, type, fin d'exercice) pour rattacher chaque document. |
| `upload_document` | Téléverse un fichier local et le rattache à une société (par NEQ ou companyId), avec catégorie, année fiscale et données extraites. |

## Installation (Windows)

1. **Node.js 18+** requis (`node --version`).
2. Copier ce dossier `mcp-server` sur la machine, par ex. `C:\cabicompta-mcp`.
3. Dans ce dossier :
   ```powershell
   npm install
   ```

## Configuration dans Claude Code

Ajouter le serveur à la config MCP de Claude Code. Le plus simple :

```powershell
claude mcp add cabicompta --env CABICOMPTA_API_KEY=cck_VOTRE_CLE --env CABICOMPTA_API_URL=https://cabicompta.vercel.app -- node C:\cabicompta-mcp\index.mjs
```

Ou manuellement dans `.mcp.json` (à la racine d'un projet) / la config globale :

```json
{
  "mcpServers": {
    "cabicompta": {
      "command": "node",
      "args": ["C:\\cabicompta-mcp\\index.mjs"],
      "env": {
        "CABICOMPTA_API_KEY": "cck_VOTRE_CLE",
        "CABICOMPTA_API_URL": "https://cabicompta.vercel.app"
      }
    }
  }
}
```

> 🔑 La **clé API** (`cck_…`) est fournie par l'administrateur du cabinet. Elle donne un accès
> d'**ingestion uniquement** (créer des documents), jamais d'accès aux mots de passe clients.
> Ne pas la committer ni la partager.

## Utilisation

Une fois configuré, dans Claude Code :

> « Voici un dossier de PDFs dans `C:\Scans\2024`. Pour chacun, identifie la société et la
> catégorie, puis injecte-le dans CabiCompta. »

Claude va : appeler `list_companies`, lire chaque PDF, en déduire la société (NEQ), la catégorie
et l'année, puis appeler `upload_document`. Les documents arrivent dans CabiCompta au statut
**PENDING** (à valider par le cabinet).

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `CABICOMPTA_API_KEY` | *(requis)* | Clé d'ingestion `cck_…` |
| `CABICOMPTA_API_URL` | `https://cabicompta.vercel.app` | URL de l'instance CabiCompta |
