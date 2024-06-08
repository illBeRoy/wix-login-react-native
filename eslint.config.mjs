import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import pluginPrettier from 'eslint-plugin-prettier/recommended';

export default [
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReactConfig,
  pluginPrettier,
  {
    rules: {
      'prettier/prettier': ['error', { singleQuote: true }],
      'react/react-in-jsx-scope': ['off'],
    },
  },
];
