# `@repo/i18n`

The texts of the Uallet apps in English (the base language) and Spanish, as one [Paraglide JS](https://paraglidejs.com) project. Paraglide's [monorepo "Pattern 1"](https://paraglidejs.com/monorepo#pattern-1-each-package-compiles-recommended): this package holds the project and the messages, and each app compiles them into its own `src/paraglide` (git-ignored). It doesn't compile anything itself.

- `project.inlang/settings.json`: the languages, and the message format plugin, loaded from this package's `node_modules` so compiling needs no network.
- `project.inlang/paraglide.config.ts`: compiler options for every app. The language is the one picked in the app (`localStorage`, `uallet:locale`), else the browser's if it's Spanish, else English.
- `messages/en.json`, `messages/es.json`: one catalog for all the apps.
- `@repo/i18n/locales`: `Locale`, each language's own name (for the language menu) and the tag `Intl` formats with (`en-US`, `es-ES`).

## Adding a text

1. Add the key to **both** `messages/en.json` and `messages/es.json`. The tests fail if a language misses one: Paraglide would fall back to English without saying so.
2. Name it after the app that uses it (`merchant_…`, `wallet_…`). Only texts that read the same in every app go without a prefix (`retry`, `cancel`, `theme_to_dark`…).
3. In the app, `m.<key>()` from `#/paraglide/messages.js` returns it in the current language. The Vite plugin recompiles on save; a misspelled key fails type-checking.

Plurals use [variants](https://paraglidejs.com/variants) (see `merchant_metrics_charge_count`). Values like amounts are formatted by the app and passed in as parameters.

## Adding a language

Add it to `locales` in `project.inlang/settings.json` and to `LOCALES`, `LANGUAGE_NAMES` and `INTL_LOCALES` in `src/locales.ts`, then translate every message. The tests check the settings and `LOCALES` match, and the apps fail type-checking if they compile a language `src/locales.ts` doesn't know.

```sh
aube run test --filter @repo/i18n
```
