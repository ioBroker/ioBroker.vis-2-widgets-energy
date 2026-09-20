import config from '@iobroker/eslint-config';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
    ...config,
    {
        languageOptions: {
            parserOptions: {
                // No allowDefaultProject here: the root tsconfig.json already includes "*.mjs",
                // and listing the same files in both makes the project service refuse to parse
                // them ("was included by allowDefaultProject but also was found in the project
                // service").
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        // React widget sources. Add the React plugin config and relax a set of
        // rules that are too noisy for these (migrated) legacy sources.
        files: ['src-widgets/src/**/*.{ts,tsx}'],
        ...react.configs.flat.recommended,
        plugins: {
            react,
            'react-hooks': reactHooks,
        },
        languageOptions: {
            ...react.configs.flat.recommended.languageOptions,
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        settings: { react: { version: 'detect' } },
        rules: {
            ...react.configs.flat.recommended.rules,
            ...reactHooks.configs.recommended.rules,
            'react/react-in-jsx-scope': 'off',
            'react/prop-types': 'off',
            'react/no-unescaped-entities': 'off',
            'react/display-name': 'off',
            // Prettier formatting is not enforced on these (CRLF line endings,
            // hand-formatted). Lint focuses on code quality only.
            'prettier/prettier': 'off',
            // The migration is intentionally non-strict (lots of `any`), so the
            // type-aware "unsafe" rules would only produce noise for now.
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-floating-promises': 'off',
            '@typescript-eslint/no-misused-promises': 'off',
            // Legacy JSDoc comments still carry type annotations; don't fight them.
            'jsdoc/no-types': 'off',
            'jsdoc/require-returns-description': 'off',
            // The migration is deliberately non-strict: allow `any` and don't
            // require explicit return / boundary types yet (tighten incrementally).
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
        },
    },
    {
        ignores: [
            'src-admin/**/*',
            'admin/**/*',
            'node_modules/**/*',
            'src-widgets/node_modules/**/*',
            'src-widgets/build/**/*',
            // Dev-only stub of the web adapter, served verbatim - not a source file and not
            // covered by any tsconfig, so the project service cannot parse it.
            'src-widgets/public/**/*',
            'widgets/**/*',
            'test/**/*',
            'build/**/*',
            'tmp/**/*',
            '.**/*',
        ],
    },
    {
        // disable temporary the rule 'jsdoc/require-param' and enable 'jsdoc/require-jsdoc'
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',

            '@typescript-eslint/no-require-imports': 'off',
        },
    },
];
