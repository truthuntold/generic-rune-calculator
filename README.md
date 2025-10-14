# Generic Rune Calculator

This is a game-agnostic rune calculator that you can reuse across different games by swapping out three JSON files. This allows you to quickly set up a customized rune calculator for your game without having to write any code.

## How to Use

To use the rune calculator for your own game, you need to provide three JSON files in the `/public` directory:

*   `runes.json`: This file contains the list of runes in your game.
*   `scales.json`: This file defines the number suffixes used in your game (e.g., K for thousand, M for million).
*   `game.config.json`: This file configures the calculator for your game, including the RPS mode, labels, and default values.

### `runes.json`

This file should be an array of `RuneRecord` objects. Here is an example:

```json
[
  {
    "id": "common",
    "name": "Common Rune",
    "chance": {
      "type": "oneInN",
      "n": 100
    },
    "source": "Anywhere"
  },
  {
    "id": "secret_rune",
    "name": "Secret Rune",
    "chance": {
      "type": "oneInN",
      "n": "1M"
    },
    "source": "Hidden Location",
    "tags": ["secret"]
  }
]
```

### `scales.json`

This file defines the suffixes for large numbers. Here is an example:

```json
{
  "K": 1e3,
  "M": 1e6,
  "B": 1e9
}
```

### `game.config.json`

This file configures the calculator. You can choose between two `rpsMode` options:

*   `raw`: The UI will have a single input for Runes Per Second (RPS).
*   `derived`: The UI will have inputs for Speed and Bulk, and RPS will be calculated as `Speed * Bulk`.

You can also customize the labels and default values for the inputs.

Here is an example of a `raw` mode configuration:

```json
{
  "displayName": "Sample (Raw RPS)",
  "rpsMode": "raw",
  "labels": { "rps": "Runes / Second", "luck": "Rune Luck (×)" },
  "defaults": { "rps": "1M", "luck": "1" },
  "luckRules": { "applyTo": "known" }
}
```

And here is an example of a `derived` mode configuration:

```json
{
  "displayName": "Sample (Derived RPS)",
  "rpsMode": "derived",
  "labels": { "speed": "Rune Speed (×/s)", "bulk": "Rune Bulk", "luck": "Rune Luck (×)" },
  "defaults": { "speed": "1", "bulk": "1", "luck": "1" },
  "luckRules": { "applyTo": "known" }
}
```

### Luck Rules

The `luckRules` property in `game.config.json` determines how luck is applied to runes:

*   `known` (default): Luck is applied to all runes except those with the `secret` or `noluck` tag.
*   `all`: Luck is applied to all runes except those with the `noluck` tag.
*   `none`: Luck is not applied to any runes.

## Development

To run the calculator in development mode, use the following commands:

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

To use a different config file, you can use the `VITE_GAME_CONFIG_URL` environment variable:

```bash
npm run dev -- --env.VITE_GAME_CONFIG_URL=/game.config.derived.json
```