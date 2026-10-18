import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores:['node_modules/**','dist/**','server/uploads/**','server/index.js'] },
  js.configs.recommended,
  { files:['**/*.js','**/*.mjs'], languageOptions:{globals:globals.node} },
  ...tseslint.configs.recommended,
  { files:['**/*.{ts,tsx}'], languageOptions:{globals:{...globals.browser,...globals.node}}, rules:{'@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':'off','no-unused-vars':'off'} },
  { files:['src/**/*.{ts,tsx}'], plugins:{'react-hooks':reactHooks,'react-refresh':reactRefresh}, rules:{'react-hooks/rules-of-hooks':'error','react-hooks/exhaustive-deps':'warn','react-refresh/only-export-components':'off'} },
);
