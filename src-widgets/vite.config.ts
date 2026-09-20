// @ts-expect-error no types
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { moduleFederationShared } from '@iobroker/types-vis-2/modulefederation.vis.config';
import { readFileSync } from 'node:fs';
import topLevelAwait from 'vite-plugin-top-level-await';

// The shared modules come from @iobroker/types-vis-2, so this widget set always uses exactly the copies that the
// vis-2 host provides: react, react-dom, the JSX runtime, moment, @emotion/react, @mui/private-theming,
// @mui/material and @mui/system as singletons. Passing package.json filters the list down to the packages this
// widget set really depends on.
//
// `react/jsx-runtime` is the entry that matters most: a widget set that bundles its own copy creates its
// elements with the element symbol of ITS react version, and since react 19 renamed that symbol, a vis-2 on
// react 19 rejects such a set outright (`visWidgetSetCompatibility.ts`) instead of loading it. That is why the
// hand-written `sharedModules` list this file used before had to go - it shared react but not its JSX runtime.
const pack = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

const config = {
    plugins: [
        federation({
            manifest: true,
            name: 'vis2energyWidgets',
            filename: 'customWidgets.js',
            exposes: {
                './Consumption': './src/Consumption',
                './ConsumptionComparison': './src/ConsumptionComparison',
                './Distribution': './src/Distribution',
                './IntervalSelector': './src/IntervalSelector',
                './SelfSufficiency': './src/SelfSufficiency',
                './Battery': './src/Battery',
                './EnergyCosts': './src/EnergyCosts',
                './DynamicPrice': './src/DynamicPrice',
                './translations': './src/translations',
            },
            remotes: {},
            shared: moduleFederationShared(pack),
            dts: false,
        }),
        topLevelAwait({
            promiseExportName: '__tla',
            promiseImportName: (i: number): string => `__tla_${i}`,
        }),
        react(),
    ],
    server: {
        port: 4173,
        proxy: {
            '/_socket': 'http://localhost:8082',
            '/vis.0': 'http://localhost:8082',
            '/adapter': 'http://localhost:8082',
            '/habpanel': 'http://localhost:8082',
            '/vis': 'http://localhost:8082',
            '/widgets': 'http://localhost:8082/vis',
            '/widgets.html': 'http://localhost:8082/vis',
            '/web': 'http://localhost:8082',
            '/state': 'http://localhost:8082',
        },
    },
    base: './',
    resolve: {
        // Same set as the shared modules above: the fallback copies inside the widget bundle must be unique too
        dedupe: ['react', 'react-dom', '@emotion/react', '@mui/material', '@mui/system', '@mui/icons-material'],
    },
    build: {
        target: 'chrome81',
        outDir: './build',
        rollupOptions: {
            onwarn(warning: { code: string }, warn: (warning: { code: string }) => void): void {
                // Suppress "Module level directives cause errors when bundled" warnings
                if (warning.code === 'MODULE_LEVEL_DIRECTIVE') {
                    return;
                }
                warn(warning);
            },
        },
    },
};

export default config;
