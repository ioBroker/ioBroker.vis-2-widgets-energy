/*!
 * ioBroker build tasks for the vis-2 energy widget set.
 *
 * Executed with `tsx` (see the `build` and `widget-*` scripts in package.json), so this file is type checked by
 * the root tsconfig.json like the rest of the repository instead of being an opaque JavaScript blob.
 */
import { deleteFoldersRecursive, npmInstall, buildReact, copyFiles } from '@iobroker/build-tools';
import { readFileSync, rmSync } from 'node:fs';

const { name } = JSON.parse(readFileSync(`${__dirname}/package.json`, 'utf8')) as { name: string };

/** Name of the adapter without the `iobroker.` prefix, e.g. `vis-2-widgets-energy` */
const adapterName = name.replace('iobroker.', '');

const SRC = 'src-widgets/';
const src = `${__dirname}/${SRC}`;

// zrender (the echarts renderer) had a minification bug: the minified `isFunction` was called by
// `var bind = protoFunction && isFunction(protoFunction.bind) ? ... : bindPolyfill` before it existed.
//
// Detection is by file *content*, not by chunk file name: Vite/Rollup chunk names are not
// stable, and a name-based check ("installSVGRenderer") silently stopped matching anything
// after the Vite migration - the workaround was applied to no file at all.
const ZRENDER_IS_FUNCTION_CALL = /\w+\s*=\s*\w+\s*&&\s*(\w+)\(\w+\.bind\)/;

/**
 * Is the call to `isFunction` really made before the function exists?
 *
 * The call alone proves nothing: with the current echarts the minifier emits `isFunction` as a hoisted
 * `function V(e) { return typeof e == "function" }`, which is available from the first line of the module, so
 * the call is perfectly fine. Only an assignment to a `var`/`let`/`const` that comes AFTER the call leaves the
 * identifier undefined at that moment. Patching the hoisted case would overwrite a symbol that the whole
 * echarts bundle uses - 84 times in the build this check was written against.
 *
 * @param code - content of the chunk
 * @param name - the minified name of `isFunction`, e.g. `V`
 * @param callPosition - where the call stands in the chunk
 * @returns true if the identifier is not defined yet at the position of the call
 */
function isDefinedTooLate(code: string, name: string, callPosition: number): boolean {
    // A function declaration is hoisted, so wherever it stands, it exists
    if (new RegExp(String.raw`function\s+${name}\s*\(`).test(code)) {
        return false;
    }

    const assignment = new RegExp(String.raw`(?:var|let|const)\s+${name}\s*=`, 'g');
    let match: RegExpExecArray | null;
    while ((match = assignment.exec(code)) !== null) {
        if (match.index < callPosition) {
            // Defined before it is used - nothing to repair
            return false;
        }
    }

    return assignment.lastIndex !== 0 || new RegExp(String.raw`\b${name}\s*=`).test(code);
}

/** Remove the Vite output and the published widget folder */
function clean(): void {
    deleteFoldersRecursive(`${src}build`);
    deleteFoldersRecursive(`${__dirname}/widgets`);
}

/** Run the Vite build of the widget sources */
function compile(): Promise<void> {
    return buildReact(src, { rootDir: __dirname, vite: true });
}

/** Copy the Vite output into `widgets/<adapter>/`, which is what vis-2 loads at runtime */
function copyAllFiles(): void {
    let zrenderPatched = 0;

    copyFiles(
        [
            `${SRC}build/**/*`,
            // Entry page of the stand-alone dev server, not part of the widget set
            `!${SRC}build/index.html`,
            // Statistics of the federation build. `mf-manifest.json` is NOT excluded: vis-2 reads it to see
            // which modules this widget set shares, and refuses a set that does not share `react/jsx-runtime`.
            `!${SRC}build/mf-stats.json`,
            `!${SRC}build/customWidgets.ssr.js`,
        ],
        `widgets/${adapterName}/`,
        {
            process: (fileData, fileName): string | undefined => {
                if (!fileName.endsWith('.js')) {
                    // returning undefined copies the file through unchanged
                    return undefined;
                }
                const code = fileData.toString();
                const match = code.match(ZRENDER_IS_FUNCTION_CALL);
                if (!match || match.index === undefined || !isDefinedTooLate(code, match[1], match.index)) {
                    return undefined;
                }
                zrenderPatched++;
                console.log(`Patched the zrender isFunction bug in "${fileName}"`);
                return code.replace(match[0], `${match[1]}=value=>typeof value === "function";${match[0]}`);
            },
        },
    );

    if (!zrenderPatched) {
        // Not an error: current echarts/zrender releases define `isFunction` as a hoisted function
        // declaration, so there is nothing to repair. Logged so that it stays visible instead of
        // failing silently - if this ever prints a patched file again, that is real information.
        console.log('zrender isFunction workaround matched no file - echarts seems not to need it any more.');
    }

    // Stub of the web adapter for the dev server (`public/_socket/info.js`), never used at runtime. It cannot
    // be dropped with a `!` pattern: `collectFiles()` strips a different base folder off an exclusion that
    // points into a subfolder, so its name never matches the one of the included file.
    rmSync(`${__dirname}/widgets/${adapterName}/_socket`, { recursive: true, force: true });

    // Keep the standalone i18n files alongside the widgets
    copyFiles([`${SRC}src/i18n/*.json`], `widgets/${adapterName}/i18n`);
}

/**
 * Report a failed stage and end the process with a non-zero exit code
 *
 * @param what - what did not work, e.g. `build`
 * @param e - the error that was thrown
 */
function fail(what: string, e: unknown): never {
    const message = e instanceof Error ? e.message : typeof e === 'string' ? e : JSON.stringify(e);
    console.error(`Cannot ${what}: ${message}`);
    process.exit(2);
}

if (process.argv.includes('--widget-0-clean')) {
    clean();
} else if (process.argv.includes('--widget-1-npm')) {
    npmInstall(src).catch((e: unknown) => fail('install npm modules', e));
} else if (process.argv.includes('--widget-2-compile')) {
    compile().catch((e: unknown) => fail('build', e));
} else if (process.argv.includes('--widget-3-copy')) {
    copyAllFiles();
} else {
    clean();
    npmInstall(src)
        .then(() => compile())
        .then(() => copyAllFiles())
        .catch((e: unknown) => fail('build the widgets', e));
}
