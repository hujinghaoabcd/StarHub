import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

function normalizeBase(base: string): string {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

function baseAwareVueRuntimeLinks(base: string): Plugin {
  return {
    name: 'starhub-base-aware-runtime-links',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.vue')) {
        return null
      }

      const transformed = code.replace(
        /(["'])\/docs\/\1/g,
        `$1${base}docs/$1`
      )

      return transformed === code
        ? null
        : {
            code: transformed,
            map: null
          }
    }
  }
}

const appBase = normalizeBase(process.env.VITE_BASE_PATH || '/')

export default defineConfig({
  base: appBase,
  // vue-i18n v9 defaults to Function-constructor message compilation unless
  // JIT mode is enabled explicitly. JIT interprets message ASTs and remains
  // compatible with a strict CSP that intentionally omits 'unsafe-eval'.
  define: {
    __INTLIFY_JIT_COMPILATION__: true,
    __INTLIFY_DROP_MESSAGE_COMPILER__: false,
    __VUE_I18N_LEGACY_API__: false
  },
  plugins: [
    baseAwareVueRuntimeLinks(appBase),
    vue()
    // VitePWA plugin commented out for now to avoid issues
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
    //   },
    //   manifest: {
    //     name: 'Starflare Pro',
    //     short_name: 'Starflare',
    //     description: 'Professional GitHub Stars Management',
    //     theme_color: '#409EFF',
    //     icons: [
    //       {
    //         src: 'pwa-192x192.png',
    //         sizes: '192x192',
    //         type: 'image/png'
    //       },
    //       {
    //         src: 'pwa-512x512.png',
    //         sizes: '512x512',
    //         type: 'image/png'
    //       }
    //     ]
    //   }
    // })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler', // 使用新的 Sass API，消除 legacy-js-api 警告
        silenceDeprecations: ['legacy-js-api', 'import'], // 静默弃用警告
        additionalData: `@import "@/styles/variables.scss";\n`
      }
    }
  },
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 5173, // 使用 Vite 默认端口
    strictPort: false, // 如果端口被占用，自动尝试下一个可用端口
    open: false, // 不自动打开浏览器
    cors: true, // 启用 CORS
    hmr: {
      host: 'localhost', // HMR 使用 localhost
      port: 5173
    },
    // 本地开发时，/api 请求转发到 Wrangler Pages Functions
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // 30秒超时
        ws: false, // 禁用 WebSocket 代理
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.error('API 代理错误:', err.message)
          })
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`API 代理请求: ${req.method} ${req.url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`API 代理响应: ${req.url} -> ${proxyRes.statusCode}`)
          })
        }
      }
    }
  },
  build: {
    target: 'es2015',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 更保守的 chunk 分割策略，避免模块初始化顺序问题
          if (id.includes('node_modules')) {
            // 只分离 Element Plus，Vue 相关库保持在一起
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            // Vue 相关库（包括 vue、vue-router、pinia）打包在一起
            // 这样可以确保它们按正确顺序初始化
            if (id.includes('vue') || id.includes('pinia')) {
              return 'vue-vendor'
            }
            // 其他大型库
            if (id.includes('dexie') || id.includes('marked') || id.includes('highlight.js')) {
              return 'libs'
            }
          }
        }
      }
    }
  }
})
