# Football Champagne

CLI Bun/TypeScript avec interface terminal (TUI [Ink](https://github.com/vadimdemedes/ink)) qui génère des prédictions de score pour les matchs de la Coupe du Monde 2026.

Pour chaque équipe, seul son **prochain match à venir** est prédit. Un agent OpenAI (Responses API avec l'outil `web_search`) parcourt le web pour récupérer analyses, forme récente, blessures et confrontations passées, puis écrit sa prédiction dans un fichier markdown. Les résultats déjà joués dans cette édition sont fournis en contexte à l'agent.

## Setup

```bash
bun install
cp .env.example .env
# Renseigner OPENAI_API_KEY et FOOTBALL_DATA_API_KEY dans .env
```

- `OPENAI_API_KEY` : clé [OpenAI](https://platform.openai.com/api-keys).
- `FOOTBALL_DATA_API_KEY` : clé gratuite [football-data.org](https://www.football-data.org/client/register) (le plan gratuit couvre la Coupe du Monde).

## Usage

```bash
bun run predict
```

Le CLI affiche une interface en direct avec l'état de chaque match (en attente, en cours avec sous-étapes, terminé avec coût, échec) :

1. Récupère le calendrier de la Coupe du Monde via football-data.org.
2. Sélectionne le prochain match à venir de chaque équipe (max 1 match par équipe), dans une fenêtre de 2 jours avant le coup d'envoi.
3. Ignore les matchs dont une prédiction existe déjà dans `predictions/`.
4. Pour chaque match restant, lance l'agent OpenAI qui écrit `predictions/YYYY-MM-DD_home-vs-away/prediction.md`.
5. Affiche la prochaine vague de matchs qui deviendront prédictibles, puis un résumé (durée, coût total).

Ré-exécuter le script plus tard prédit les matchs suivants, en s'appuyant sur les résultats déjà joués de l'édition.

## Tests

```bash
bun run test
```
