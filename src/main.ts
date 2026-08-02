import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import en from 'element-plus/dist/locale/en.mjs'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useThemeStore } from './stores/theme'
import { startAuthSessionLifecycle } from './utils/authLifecycle'
import './styles/main.scss'

const app = createApp(App)

// Register Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())

// Get theme store and sync locale
const themeStore = useThemeStore()
const currentLocale = i18n.global.locale.value === 'zh' ? zhCn : en

// Initialize theme (ensure dark theme is set by default)
themeStore.setTheme(themeStore.theme)

// Sync i18n with theme store
if (themeStore.language !== i18n.global.locale.value) {
  i18n.global.locale.value = themeStore.language
}

// Make i18n available globally for theme store
if (typeof window !== 'undefined') {
  ;(window as any).__VUE_I18N__ = i18n
}

app.use(router)
app.use(i18n)
app.use(ElementPlus, {
  locale: currentLocale
})

app.mount('#app')
startAuthSessionLifecycle()
