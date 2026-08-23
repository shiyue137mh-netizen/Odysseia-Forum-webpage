import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// FSD 分层：shared < entities < features < widgets < pages < app
// 下层不得引用上层。现存违规见 docs/code-review-2026-08-23.md §4.3，
// 暂定为 warn，违规清零后升级为 error。
const upperLayers = {
  shared: ['@/entities/*', '@/features/*', '@/widgets/*', '@/pages/*', '@/app/*'],
  entities: ['@/features/*', '@/widgets/*', '@/pages/*', '@/app/*'],
  features: ['@/widgets/*', '@/pages/*', '@/app/*'],
  widgets: ['@/pages/*', '@/app/*'],
};

const layerRule = (layer) => ({
  files: [`src/${layer}/**/*.{ts,tsx}`],
  rules: {
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: upperLayers[layer],
            message: `FSD 违规：${layer} 层不得引用上层模块，请通过 props 注入或把公共部分下沉。`,
          },
        ],
      },
    ],
  },
});

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      '*.config.js',
      'public/**',
      'src/shared/types/openapi.d.ts',
    ],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',

      // 以下三条与本项目的动画/主题写法冲突较多，暂不启用
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/immutability': 'off',
      'react-refresh/only-export-components': 'off',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',

      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-useless-assignment': 'off',
      eqeqeq: ['warn', 'smart'],
    },
  },
  layerRule('shared'),
  layerRule('entities'),
  layerRule('features'),
  layerRule('widgets'),
  {
    // 根目录的构建配置与一次性脚本：走 TS 解析器 + Node 全局
    files: ['*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      'no-console': 'off',
    },
  },
);
