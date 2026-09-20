# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

An ioBroker adapter of type `visualization-widgets` (`onlyWWW: true`, `mode: none`) — it ships **no runtime Node.js code**. Everything it delivers is a set of React widgets that the `vis-2` adapter loads at runtime via **Vite module federation** (`@module-federation/vite`).

Eight widgets:

- `Distribution` — animated SVG energy flow diagram
- `Consumption` — echarts chart over history data
- `ConsumptionComparison` — bar or pie chart over live values
- `IntervalSelector` — day/week/month/year period picker that other widgets subscribe to
- `SelfSufficiency` — two hand-drawn SVG ring gauges (autarky / self-consumption quota)
- `Battery` — hand-drawn SVG battery symbol with SoC, power and remaining time
- `EnergyCosts` — kWh × price ± base fee and feed-in revenue, value-based or read from history
- `DynamicPrice` — echarts bar chart of hourly exchange prices, parses the JSON arrays of tibberlink/awattar/epex-spot

Shared, non-widget modules in `src-widgets/src/`: `Utils.ts` (pure helpers: period maths, number/arc formatting), `History.ts` (bucketed history reads), `TimeWidget.ts` (the interval-selector handshake), `SizeWatcher.ts` (ResizeObserver wrapper for the chart widgets).

## Commands

All commands run from the repo root unless stated otherwise.

```bash
npm run npm       # install both package trees (src-widgets needs `npm i -f`)
npm run build     # full build: clean -> npm install in src-widgets -> vite build -> copy to widgets/
npm run check     # type check (cd src-widgets && tsc)
npm run lint      # eslint src-widgets/src and tasks.ts
npm test          # mocha; boots js-controller + web + vis-2 and a headless browser (~3 min)
```

`tasks.ts` is **TypeScript executed with `tsx`** (same convention as `ioBroker.admin`'s `tasks.mts`), so the build script is type checked by the root `tsconfig.json` and linted like the rest of the repo. `npm run build` also supports single stages, each with its own npm script: `npm run widget-0-clean`, `widget-1-npm`, `widget-2-compile`, `widget-3-copy` (or `npx tsx tasks.ts --widget-2-compile`). Use `--widget-2-compile` + `--widget-3-copy` for a fast rebuild after source edits.

Widget dev server (from `src-widgets/`): `npm start` — Vite on **port 4173**. `npm run i18n` scans the sources for used translation keys and reports missing/unused entries in `src/i18n/*.json`.

`npm test` requires `widgets/` to exist, so run `npm run build` first. There is a single test file with a single case (`test/widgets.test.js`) that adds every widget from the palette and screenshots it into `tmp/screenshots/`; narrow it with `npx mocha ./test/widgets.test.js --grep "Check all widgets"`.

**The test refuses to run when an ioBroker instance is already running on the machine** ("Cannot initiate the first run of test, because one instance of application is running on this PC") — and it still exits 0, so a green exit code is not proof that the test ran. Check the output for the actual mocha summary.

The test installs the **published** vis-2 from npm. As long as that is 2.15.5 (react 18) it cannot load this widget set at all, because a react 19 build is rejected by the host and a react 18 host hands react 18 to a react 19 bundle. The integration test is therefore only meaningful once vis-2 2.20.1+ is on npm.

## Architecture

### Runtime loading model

`src-widgets/vite.config.ts` declares the federation remote: name `vis2energyWidgets`, filename `customWidgets.js`, one `exposes` entry per widget plus `./translations`. The bundle is registered in `io-package.json` under `common.visWidgets.vis2energyWidgets`.

**Three lists must stay in sync when adding or renaming a widget**: `exposes` in `vite.config.ts`, `common.visWidgets.vis2energyWidgets.components` in `io-package.json`, and the module file itself.

`common.visWidgets.vis2energyWidgets.bundlerType` **must be `"module"`** for the Vite build. The official template (`ioBroker.vis-2-widgets-react-template`) states the inverse rule for a CRA build: with craco/react-scripts the attribute must *not* be set. Getting this wrong means vis-2 loads the bundle with the wrong loader.

The shared-module list is **not hand-written**: `vite.config.ts` calls `moduleFederationShared(pack)` from `@iobroker/types-vis-2/modulefederation.vis.config`, which returns react, react-dom, `react/jsx-runtime`, `react/jsx-dev-runtime`, `@emotion/react`, `@mui/material`, `@mui/system`, `@mui/private-theming` and `moment` as singletons with `requiredVersion: '*'`, filtered down to what this package.json actually depends on. Never replace it with a literal list again — the old hand-written one shared `react` but **not** `react/jsx-runtime`, which is exactly what `visWidgetSetCompatibility.ts` in vis-2 checks the federation manifest for before it loads a widget set. A set without it is skipped outright on a react 19 vis-2.

The set is built with **react 19 and MUI 9**, and `@iobroker/gui-components` replaces `@iobroker/adapter-react-v5` (the latter is a react 18 / MUI 6 package and is no longer shared by vis-2). react, react-dom, MUI, emotion and gui-components live in `devDependencies` because the host provides them at runtime; only what is really bundled (`echarts`, `echarts-for-react`, `moment`) is a dependency. `window.visRxWidget` is likewise provided by vis-2; `Generic.tsx` types it via `@iobroker/types-vis-2` and every widget extends `Generic`. Never import a vis-2 base class directly.

`io-package.json` keeps `common.dependencies: [{ "vis-2": ">=2.12.8" }]` — same convention as `ioBroker.vis-2-widgets-material`, which is also a react 19 build. **The floor is deliberately not raised**, so do not "fix" it: the declared dependency does not describe what actually runs. In practice this set needs a vis-2 on react 19 (2.20.1+, the first one that shares `react/jsx-runtime`), because a react 19 bundle handed the react 18 of an older host produces elements the host does not accept (`react.element` vs `react.transitional.element`). The mismatch is documented in the README and in `docs/*/README.md` instead of being enforced by the dependency.

### Build output

`tasks.ts` compiles `src-widgets/` and copies the whole Vite output to `widgets/vis-2-widgets-energy/` (gitignored, but listed in `package.json` `files` — a publish artifact, generated at release time by the release script's `before_commit` hook). `index.html`, `mf-stats.json` and `customWidgets.ssr.js` are excluded. **`mf-manifest.json` is deliberately shipped**: that is the file vis-2 reads to decide whether the widget set may be loaded at all.

`copyAllFiles()` carries a workaround for a zrender (echarts renderer) minification bug that used `isFunction` before defining it. It detects the broken pattern **by file content, not by chunk name** — Vite/Rollup chunk names are not stable, and the original name-based check (`installSVGRenderer`) matched no file at all after the Vite migration. The call pattern alone is *not* proof of the bug: with echarts 6 the minifier emits `isFunction` as a hoisted `function V(e) { … }`, so the call is fine. `isDefinedTooLate()` therefore requires that the identifier is not a function declaration and is only assigned *after* the call. Without that check the workaround overwrote a symbol used ~84 times across the echarts bundle on a false positive.

The dev-only web-adapter stub (`public/_socket/info.js`) is removed with `rmSync` after the copy rather than with a `!` pattern: `collectFiles()` strips a different base folder off an exclusion that points into a subfolder, so the name never matches the included one and the exclusion silently does nothing.

Note the `copyFiles` `process` callback contract from `@iobroker/build-tools`: returning `undefined` copies the file through **unchanged**, `null`/`false` skips it (but the destination folder is created anyway), a string replaces the content.

### Widget contract

Each widget class implements:

- `static getWidgetInfo(): RxWidgetInfo` — returns `id` (`tplEnergy2*`), `visSet: 'vis-2-widgets-energy'`, `visWidgetLabel`, `visHelp`, `visDefaultStyle`, `visPrev` (path `widgets/vis-2-widgets-energy/img/prev_*.png`, sourced from `src-widgets/public/img/`), and `visAttrs`. Only `Distribution` carries `visSetLabel` — the set label belongs to exactly one widget.
- `visHelp` is the one- or two-sentence description the palette shows in the tooltip **under the preview image**. It is an i18n key like `visWidgetLabel` (the prefix is added by vis-2), and the tooltip is 260 px wide — keep it under roughly 180 characters. Every widget of this set has one; a new widget without it simply shows nothing there.
- `getWidgetInfo()` (instance) — must return the static one; vis-2 calls both.
- `renderWidgetBody(props)` — must call `super.renderWidgetBody(props)` first, and normally returns `this.wrapContent(content)` so the card/`noCard` handling comes from the base class.
- Optional `onRxDataChanged()`, `onStateUpdated(id, state)`. `componentDidMount`/`componentWillUnmount`/`componentDidUpdate` must call `super`.

`visAttrs` is a declarative schema rendered by the vis-2 attribute editor. Notable field mechanics used here:

- `hidden` accepts either a JS-expression string (`'data.type !== "pie"'`) or a function `data => bool`.
- A group with `indexFrom: 1, indexTo: 'devicesCount'` repeats its fields per index, producing `oid1`, `name1`, `color1`, … Read them as `this.state.rxData[`oid${i}`]`.
- `onChange: async (field, data, changeData, socket) => …` on `id`/`hid` fields auto-fills name and color from the selected object's `common`. The `common` of `getObject()` is a union in the current types — cast to `ioBroker.StateCommon` before reading `unit`.
- An `id` field that is unset arrives as the literal string `'nothing_selected'` — always check for it, not just falsiness. `Utils.cleanOid()` does that.
- Every field carries a `tooltip` key. When adding a field, add its tooltip to all 11 i18n files as well.
- A `static` member of a widget must not collide with one of `VisRxWidget` (`findField` does — hence `DynamicPrice.detectField`).

Data access inside a widget: resolved attributes live in `this.state.rxData`; subscribed state values in `this.state.values['<oid>.val']` (`Generic.getPropertyValue` wraps this). Everything else — `socket`, `theme`, `themeType`, `views`, `systemConfig`, `setValue`, `adapterName`, `instance`, `projectName` — comes from `this.props.context`.

### Cross-widget time synchronization

`Consumption` and `ConsumptionComparison` need the period selected in `IntervalSelector`. Two channels exist:

1. **Global vis-2 context** — `this.props.context.timeStart` / `timeInterval` with `setTimeStart` / `setTimeInterval`. Used when the selector has no OIDs bound.
2. **Direct DOM handshake** — `IntervalSelector` renders a `div.time-selector` and attaches `_addEventHandler` / `_removeEventHandler` to that DOM node in `propertiesUpdate()`. A consumer configured with the `timeWidget` attribute looks the node up by widget id and subscribes. Callbacks receive `('update', {start, interval})` or `('unmount')`.

Because widget mount order is not guaranteed, the retry-until-found and the re-subscribe-after-`'unmount'` live in **`TimeWidget.ts`** (`TimeSelectorSubscriber`). A consumer creates one, calls `connect(widgetId)` from `componentDidMount`/`componentDidUpdate` and `destroy()` from `componentWillUnmount`. Do not re-implement that loop per widget — that is how `Consumption` used to do it and it is easy to get silently wrong.

History reads live in **`History.ts`**: `getHistory()` wraps `socket.getHistory()` with a manual timeout because a missing history instance never rejects, and `readSeries()` turns a period into exactly `steps` buckets. `Utils.getFromToTime(timeStart, interval)` derives the from/to bounds — note `getDay() || 7` so weeks start on Monday and Sunday stays in its own week — and `Utils.getIntervalSteps()` the bucket count (`new Date(y, m + 1, 0)`; the missing `+ 1` used to give every February 31 bars). The `difference` attribute (for monotonically increasing counters) fetches one extra bucket before the range and diffs consecutive samples; the right edge of the **last** bucket is inclusive, otherwise the running hour/day is dropped.

### TypeScript and linting

Sources are TypeScript (`.tsx`/`.ts`). `src-widgets/tsconfig.json` is `strict: true` and is what `npm run check` and `src-widgets`' own `build` (`tsc && vite build`) use. The root `tsconfig.json` is `strict: false` and exists for the ESLint project service on the root-level `.mjs` config files.

The migration from JSX is deliberately not strict *in practice*: state interfaces carry `[key: string]: any`, widgets are typed `Generic<Record<string, any>, …>`, and `eslint.config.mjs` switches off every `@typescript-eslint/no-unsafe-*` plus `no-explicit-any` for `src-widgets/src/**`. Treat it as a syntactic migration to be tightened incrementally, not as type-safe code.

`prettier/prettier` is **off** for the widget sources, so formatting there is not enforced even though the rest of the repo follows the ioBroker prettier config.

### i18n

Keys in `src-widgets/src/i18n/*.json` are stored **unprefixed**; the prefix `vis_2_widgets_energy_` is added by `Generic.getI18nPrefix()` and declared in `src/translations.ts`. Labels/tooltips in `visAttrs` are plain keys and are translated by vis-2 (opt out per field with `noTranslation: true`). Eleven languages are maintained (en, de, ru, pt, nl, fr, it, es, pl, uk, zh-cn) — add a key to all of them.

`npm run i18n` (the `searchI18n` script of `@iobroker/vis-2-widgets-react-dev`) only scans `.jsx` and reports nothing for these TypeScript sources. To find missing keys, collect `label:`/`tooltip:`/`Generic.t('…')` out of `src/*.tsx` and diff against `en.json` — and remember that keys used dynamically (`Generic.t(period)`, ternaries) will show up as false "unused".

### Documentation

`docs/en/` and `docs/de/` hold one page per widget plus an index, linked from the README. When a `visAttrs` field is added, renamed or removed, the matching table in **both** languages has to follow.

The screenshots in `img/` are taken from a **running vis-2**, not drawn by hand. They come from a vis-2 project
called `energyDocs` with one view per widget (each view exactly as large as the widget it holds, so a cropped
screenshot of the runtime page is the screenshot of the widget) and demo data points under
`0_userdata.0.energyDocs.*`. Two things about that workflow are easy to trip over:

- `iobroker upload <adapter>` does **not** re-sync the widget files. vis-2 only copies them into its file
  storage when the generated `index.html` changes, which happens on a version bump — during development each
  file has to be written with `iobroker file write <local> vis-2/widgets/<adapter>/<path>`. Afterwards the
  browser still has the old `customWidgets.js` in its HTTP cache; `fetch(url, { cache: 'reload' })` on it,
  then reload.
- The views are drawn at roughly twice the default widget size so the capture has a usable resolution. That
  is also what surfaced three layout bugs that never showed at the default size, so it is worth re-checking
  the screenshots after changing anything that computes a font size from the widget size.

## Releasing

Use `npm run release-patch|release-minor|release-major` (`@alcalzone/release-script` with the iobroker plugin). It keeps `package.json`, `io-package.json` (`common.version` plus a new `common.news` entry in all 11 languages) and the README changelog in sync, and runs `npm run build` before committing. The `### **WORK IN PROGRESS**` section of the README changelog is what becomes the news entry — put user-facing notes there.

Do not hand-edit version numbers or add changelog/news entries manually — note that `src-widgets/package.json` carries its own version field that mirrors the root one.

The `2.0.0` release (shipped 2026-08) was a breaking one: the comparison widget no longer auto-converts W→Wh / kW→kWh nor divides Wh by 1000, so dashboards using Wh datapoints show values 1000× larger until the per-device `factor` is set. That is why the whole Vite/TypeScript modernization landed as a major. Current published version is `2.0.1`.

`Distribution` still carries that auto-conversion (a `Wh` datapoint is divided by 1000), on purpose — it is opt-out per widget via the `rawValues` attribute instead of a second breaking change. The unit label now follows the division, so a divided value is shown as `kWh` and no longer as `Wh`.

The next release is breaking again: with react 19 / MUI 9 the set cannot be loaded by a vis-2 that still runs on react 18, even though the declared `vis-2` dependency does not say so.

Dependency bumps arrive as Dependabot PRs against both `package.json` and `src-widgets/package.json` and are auto-merged; `npm run update-packages` does the same locally for both trees.
