# Belot Card Game

A React web implementation of the popular Bulgarian card game Belot, following the official rules from [belot.bg](https://belot.bg/en/rules-belot/).

## Features

- Full 4-player Belot game implementation
- 4-player gameplay (you + 3 AI opponents)
- Complete bidding system with all contract types:
  - Trump color (Hearts, Diamonds, Clubs, Spades)
  - No trumps
  - All trumps
  - Double and Redouble options
- Card playing mechanics with proper trick-taking rules
- Scoring system with:
  - Card point values
  - Combination premiums (Tierce, Quarte, Quint, Four Equals, Belot)
  - Last 10 points
  - Valat bonus
- Beautiful, modern UI with card animations
- Real-time game state management

## Game Rules

Belot is played with 4 players in two teams. The game uses a 32-card deck (7, 8, 9, 10, J, Q, K, A of all suits).

### Phases

1. **Dealing**: Each player receives 5 cards (3 + 2)
2. **Bidding**: Players bid on contracts, then receive 3 more cards
3. **Playing**: 8 tricks are played following suit and trump rules
4. **Scoring**: Points are calculated and added to team scores

### Winning

The game ends when a team reaches 151 points. The team with the higher score wins.

## Installation

```bash
npm install
```

## Running

```bash
npm run dev
```

The game will open in your browser at `http://localhost:5173`

## Building

```bash
npm run build
```

## Game Controls

- **Bidding Phase**: Click on contract buttons or "Pass" to make your bid
- **Playing Phase**: Click on playable cards (highlighted in green) to play them
- **Combinations**: Announce combinations when it's your turn to play the first card of a trick

## Technical Details

- Built with React 18 and Vite
- Pure JavaScript game logic (no external game engines)
- Responsive design with CSS animations
- Modular component architecture

## License

This is a personal project for educational purposes.

