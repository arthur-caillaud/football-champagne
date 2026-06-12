<div align="center">

```
        ███████╗ ██████╗  ██████╗ ████████╗██████╗  █████╗ ██╗     ██╗
        ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██║     ██║
        █████╗  ██║   ██║██║   ██║   ██║   ██████╔╝███████║██║     ██║
        ██╔══╝  ██║   ██║██║   ██║   ██║   ██╔══██╗██╔══██║██║     ██║
     ██║     ╚██████╔╝╚██████╔╝   ██║   ██████╔╝██║  ██║███████╗███████╗
     ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
 ██████╗██╗  ██╗ █████╗ ███╗   ███╗██████╗  █████╗  ██████╗ ███╗   ██╗███████╗
██╔════╝██║  ██║██╔══██╗████╗ ████║██╔══██╗██╔══██╗██╔════╝ ████╗  ██║██╔════╝
 ██║     ███████║███████║██╔████╔██║██████╔╝███████║██║  ███╗██╔██╗ ██║█████╗
 ██║     ██╔══██║██╔══██║██║╚██╔╝██║██╔═══╝ ██╔══██║██║   ██║██║╚██╗██║██╔══╝
╚██████╗██║  ██║██║  ██║██║ ╚═╝ ██║██║     ██║  ██║╚██████╔╝██║ ╚████║███████╗
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
```

**🥂 Prédictions de scores pour la Coupe du Monde 2026, générées par un agent IA.**

[![Bun](https://img.shields.io/badge/Bun-runtime-f9f1e1?logo=bun&logoColor=black)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Ink](https://img.shields.io/badge/Ink-TUI-5dbcd2?logo=react&logoColor=white)](https://github.com/vadimdemedes/ink)
[![OpenAI](https://img.shields.io/badge/OpenAI-gpt--5%20%2B%20web%20search-412991?logo=openai&logoColor=white)](https://platform.openai.com)

</div>

---

CLI avec interface terminal (TUI [Ink](https://github.com/vadimdemedes/ink)) qui prédit les scores des matchs de la Coupe du Monde 2026. Pour chaque match, un agent OpenAI (Responses API + outil `web_search`) parcourt le web — forme récente, blessures, compositions probables, pronostics d'experts, confrontations directes — puis écrit une prédiction argumentée dans un fichier markdown, avec son coût d'exécution détaillé.

## ✨ Fonctionnalités

- **Un dossier par match** : `predictions/YYYY-MM-DD_home-vs-away/prediction.md`, avec score prédit, résumé, niveau de confiance, analyse structurée, sources et coût.
- **Sélection intelligente** : au plus un match à venir par équipe, uniquement dans une fenêtre de 2 jours avant le coup d'envoi (pour maximiser les données disponibles).
- **Idempotent** : les matchs déjà prédits sont ignorés ; relancer le CLI ne coûte rien de plus.
- **Contexte de l'édition** : les résultats déjà joués dans le tournoi sont injectés dans le prompt de l'agent.
- **Interface en direct** : statut de chaque match (prêt, en cours, hors fenêtre, déjà prédit…), prochaine vague, et date à laquelle relancer le CLI.
- **Suivi des coûts** : coût OpenAI (tokens + recherches web) par prédiction et total de l'exécution.

## 🚀 Installation

```bash
git clone https://github.com/arthur-caillaud/football-champagne.git
cd football-champagne
bun install
cp .env.example .env
```

Renseigner les deux clés dans `.env` :

| Variable | Description |
| --- | --- |
| `OPENAI_API_KEY` | Clé [OpenAI](https://platform.openai.com/api-keys) |
| `FOOTBALL_DATA_API_KEY` | Clé gratuite [football-data.org](https://www.football-data.org/client/register) (le plan gratuit couvre la Coupe du Monde) |

## ⚽ Usage

```bash
bun run predict
```

Le CLI :

1. Récupère le calendrier de la Coupe du Monde via football-data.org.
2. Sélectionne le prochain match à venir de chaque équipe, dans la fenêtre de 2 jours.
3. Ignore les matchs déjà prédits.
4. Pour chaque match restant, lance l'agent OpenAI et écrit la prédiction en markdown.
5. Affiche quand relancer le CLI pour les prochaines prédictions.

### Exemple de sortie

```
        ███████╗ ██████╗  ██████╗ ████████╗██████╗  █████╗ ██╗     ██╗
        ██╔════╝██╔═══██╗██╔═══██╗╚══██╔══╝██╔══██╗██╔══██╗██║     ██║
        █████╗  ██║   ██║██║   ██║   ██║   ██████╔╝███████║██║     ██║
        ██╔══╝  ██║   ██║██║   ██║   ██║   ██╔══██╗██╔══██║██║     ██║
     ██║     ╚██████╔╝╚██████╔╝   ██║   ██████╔╝██║  ██║███████╗███████╗
     ╚═╝      ╚═════╝  ╚═════╝    ╚═╝   ╚═════╝ ╚═╝  ╚═╝╚══════╝╚══════╝
 ██████╗██╗  ██╗ █████╗ ███╗   ███╗██████╗  █████╗  ██████╗ ███╗   ██╗███████╗
██╔════╝██║  ██║██╔══██╗████╗ ████║██╔══██╗██╔══██╗██╔════╝ ████╗  ██║██╔════╝
 ██║     ███████║███████║██╔████╔██║██████╔╝███████║██║  ███╗██╔██╗ ██║█████╗
 ██║     ██╔══██║██╔══██║██║╚██╔╝██║██╔═══╝ ██╔══██║██║   ██║██║╚██╗██║██╔══╝
╚██████╗██║  ██║██║  ██║██║ ╚═╝ ██║██║     ██║  ██║╚██████╔╝██║ ╚████║███████╗
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝
🥂  Prédictions de scores · Coupe du Monde 2026  ⚽

╭───────────────────────────────────────────────╮
│ Quand relancer le CLI                         │
│ Vague actuelle : maintenant                   │
│ Prochaine vague : 16 juin 2026                │
│ → Relancer dès : maintenant                   │
╰───────────────────────────────────────────────╯

╭───────────────────────────────────────────────╮
│ Matchs à prédire (vague actuelle)             │
│ ✓ United States vs Paraguay (2026-06-13)      │
│   └ 1m 12s — $0.3679                          │
│ ⠹ Germany vs Curaçao (2026-06-14)             │
│   └ Recherches web en cours...                │
│ ↷ Canada vs Bosnia (2026-06-12)               │
│   └ Prédiction déjà générée                   │
╰───────────────────────────────────────────────╯
```

## 🏗️ Architecture

```
src/
├── index.tsx     # Point d'entrée : vérification de l'env, rendu Ink
├── App.tsx       # Interface TUI : panneaux, statuts, orchestration
├── fixtures.ts   # Client football-data.org + sélection des matchs
├── schedule.ts   # Raisons de blocage + dates de prochaine prédiction
├── predict.ts    # Agent OpenAI (Responses API + web_search, streaming)
├── cost.ts       # Estimation du coût (tokens + recherches web)
├── storage.ts    # Écriture des dossiers predictions/<slug>/
├── format.ts     # Formatage dates, durées, montants
└── logo.ts       # Logo ASCII
```

## 🧪 Tests

```bash
bun run test
```

Tests [vitest](https://vitest.dev) sur la logique pure : sélection des matchs, fenêtre de prédiction, vagues, coûts, formatage.

## 💸 Coûts

Chaque prédiction coûte environ **$0.20 à $0.40** (gpt-5 + ~10-20 recherches web). Le coût exact est affiché dans le CLI et détaillé à la fin de chaque fichier de prédiction.
