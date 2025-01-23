/*!
 * ioBroker tasks
 * Date: 2025-01-23
 */
'use strict';

const { existsSync, readdirSync, rmdirSync } = require('node:fs');
const adapterName = require('./package.json').name.replace('iobroker.', '');
const gulpHelper = require('@iobroker/vis-2-widgets-react-dev/gulpHelper');
const { deleteFoldersRecursive, npmInstall, buildReact, copyFiles } = require('@iobroker/build-tools');

const SRC = 'src-widgets/';
const src = `${__dirname}/${SRC}`;

async function copyAllFiles() {
    copyFiles([`${SRC}build/*.js`], `widgets/${adapterName}`);
    copyFiles([`${SRC}build/img/*`], `widgets/${adapterName}/img`);
    copyFiles([`${SRC}build/*.map`], `widgets/${adapterName}`);
    copyFiles([`${SRC}build/static/**/*`, ...gulpHelper.ignoreFiles(SRC)], `widgets/${adapterName}/static`);
    copyFiles(
        [
            ...gulpHelper.copyFiles(SRC),
            `${src}build/static/js/*node_modules_echarts-for-react_esm_index_js.*.*`,
            `${src}build/static/js/*echarts-for-react_esm_index_js-node_modules_babel_runtime_helpers_esm*.*.*`,
            `${src}build/static/js/*echarts-for-react_esm_index_js-node_modules_react*.*.*`,
        ],
        `widgets/${adapterName}/static/js`,
    );

    copyFiles([`${SRC}src/i18n/*.json`], `widgets/${adapterName}/i18n`);

    await new Promise(resolve =>
        setTimeout(() => {
            if (
                existsSync(`widgets/${adapterName}/static/media`) &&
                !readdirSync(`widgets/${adapterName}/static/media`).length
            ) {
                rmdirSync(`widgets/${adapterName}/static/media`);
            }
            resolve();
        }, 500),
    );
}

if (process.argv.includes('--widget-0-clean')) {
    deleteFoldersRecursive(`${src}build`);
    deleteFoldersRecursive(`${__dirname}/widgets`);
} else if (process.argv.includes('--widget-1-npm')) {
    npmInstall(src).catch(e => {
        console.error(`Cannot install npm modules: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--widget-2-compile')) {
    buildReact(src, { rootDir: src, craco: true }).catch(e => {
        console.error(`Cannot build: ${e}`);
        process.exit(2);
    });
} else if (process.argv.includes('--widget-3-copy')) {
    copyAllFiles().catch(e => {
        console.error(`Cannot build: ${e}`);
        process.exit(2);
    });
} else {
    deleteFoldersRecursive(`${src}build`);
    deleteFoldersRecursive(`${__dirname}/widgets`);
    npmInstall(src)
        .then(() => buildReact(src, { rootDir: src, craco: true }))
        .then(() => copyAllFiles())
        .catch(e => {
            console.error(`Cannot install npm modules: ${e}`);
            process.exit(2);
        });
}
