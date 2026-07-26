import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { analyzer } from 'vite-bundle-analyzer';
import tailwindcss from '@tailwindcss/vite';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));
const shouldAnalyzeBundle = process.env.ANALYZE_BUNDLE === 'true';
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            tailwindcss(),
            react(),
            shouldAnalyzeBundle
                ? analyzer({
                    analyzerMode: 'static',
                    fileName: () => 'bundle-analysis',
                    openAnalyzer: false,
                    summary: true,
                })
                : null,
        ].filter(Boolean),
        define: {
            __APP_VERSION__: JSON.stringify(pkg.version ?? '0.0.0'),
        },
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
                '@shared-types': fileURLToPath(new URL('./src/shared/types', import.meta.url)),
            },
        },
        server: {
            port: 3000,
            host: true,
            proxy: {
                '/api': {
                    target: env.VITE_BACKEND_URL || 'https://forum.shimmerday.top',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                },
            },
        },
        build: {
            cssTarget: 'chrome100',
            target: 'esnext',
            rollupOptions: {
                output: {
                    // Rolldown 只接受函数形式；用最终路径段匹配，兼容 pnpm 的嵌套目录结构
                    manualChunks: (id) => {
                        if (!id.includes('node_modules'))
                            return;
                        if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
                            return 'vendor-react';
                        }
                        if (id.includes('node_modules/@tanstack/'))
                            return 'vendor-query';
                        if (/node_modules\/(motion|motion-dom|motion-utils|framer-motion)\//.test(id)) {
                            return 'vendor-motion';
                        }
                    },
                },
            },
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/tests/setup.ts'],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
                exclude: ['node_modules/', 'src/tests/setup.ts'],
            },
        },
    };
});
