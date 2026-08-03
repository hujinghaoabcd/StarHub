<template>
  <div class="login-page">
    <!-- 星空背景 -->
    <div class="stars-background">
      <div class="stars stars-1"></div>
      <div class="stars stars-2"></div>
      <div class="stars stars-3"></div>
        </div>

    <!-- 顶部导航 -->
    <nav class="top-nav">
      <div class="nav-logo">
        <img src="/logo.svg" alt="StarHub" class="nav-logo-img" />
        <span class="nav-logo-text">StarHub</span>
      </div>
      <div class="nav-links">
        <a :href="docsUrl" target="_blank" class="nav-link">
          {{ currentLanguage === 'zh' ? '文档' : 'Docs' }}
        </a>
        <span class="nav-divider">|</span>
        <a href="https://github.com/hujinghaoabcd/StarHub" target="_blank" class="nav-link">
          GitHub
        </a>
        <span class="nav-divider">|</span>
        <span class="nav-lang" @click="toggleLanguage">
          {{ currentLanguage === 'zh' ? 'EN' : '中文' }}
        </span>
      </div>
    </nav>

    <!-- Hero 区域 - 左右结构 -->
    <div class="hero-section">
      <div class="hero-content">
        <!-- 左侧文字 -->
        <div class="hero-left">
          <h1 class="hero-title">
            {{ currentLanguage === 'zh' ? '轻松管理你的' : 'Organize Your' }}<br/>
            <span class="hero-highlight">GitHub Stars</span>
          </h1>
          <p class="hero-description">
            {{ currentLanguage === 'zh' 
              ? 'StarHub 让你告别杂乱无章的 Star 列表。当收藏数量达到数百甚至上千时，找到需要的项目变得异常困难——StarHub 正是为解决这个问题而生。智能标签、AI 分类、极速搜索，让你的技术收藏真正发挥价值。' 
              : 'Say goodbye to messy star lists. When you have hundreds or thousands of stars, finding what you need becomes incredibly hard. StarHub was built to solve this - smart tagging, AI classification, and lightning-fast search make your tech collection truly valuable.' }}
          </p>
          
          <div class="hero-actions">
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            <el-icon class="mr-2"><Link /></el-icon>
              {{ currentLanguage === 'zh' ? '使用 GitHub 登录' : 'Sign in with GitHub' }}
          </el-button>

            <a href="https://github.com/hujinghaoabcd/StarHub" target="_blank" class="github-link">
              <el-icon :size="20"><Link /></el-icon>
              {{ currentLanguage === 'zh' ? '查看源码' : 'View on GitHub' }}
            </a>
          </div>

          <el-alert
            v-if="error"
            :title="error"
            type="error"
            :closable="true"
            show-icon
            class="error-alert"
          />
          
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-value">Vue 3</span>
              <span class="stat-label">{{ currentLanguage === 'zh' ? '现代框架' : 'Modern Framework' }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">TypeScript</span>
              <span class="stat-label">{{ currentLanguage === 'zh' ? '类型安全' : 'Type Safe' }}</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">PWA</span>
              <span class="stat-label">{{ currentLanguage === 'zh' ? '离线可用' : 'Offline Ready' }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧 Logo -->
        <div class="hero-right">
          <div class="logo-container">
            <div class="logo-glow"></div>
            <div class="logo-wrapper">
              <img src="/logo.svg" alt="StarHub Logo" class="logo-image" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 介绍区域 -->
    <div class="intro-section">
      <div class="intro-container">
        <h2 class="intro-title">
          {{ currentLanguage === 'zh' ? '解决 Star 管理痛点' : 'Solving Star Management Pain Points' }}
        </h2>
        <p class="intro-description">
          {{ currentLanguage === 'zh' 
            ? '❌ Star 了很多优秀项目，但需要时找不到？❌ GitHub 原生列表只能按时间排序？❌ 手动整理太耗时？StarHub 提供智能标签系统、AI 自动分类、毫秒级搜索，让你的技术收藏真正井井有条。所有数据本地存储，隐私安全可控。' 
            : '❌ Starred great projects but can\'t find them when needed? ❌ GitHub\'s native list only sorts by time? ❌ Manual organization too time-consuming? StarHub offers smart tagging, AI auto-classification, and instant search. All data stored locally for privacy and security.' }}
        </p>
        
        <div class="intro-highlights">
          <div class="highlight-item">
            <div class="highlight-number">10,000+</div>
            <div class="highlight-text">{{ currentLanguage === 'zh' ? '支持仓库数量' : 'Repos Supported' }}</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-number">18</div>
            <div class="highlight-text">{{ currentLanguage === 'zh' ? '预设分类标签' : 'Preset Categories' }}</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-number">5</div>
            <div class="highlight-text">{{ currentLanguage === 'zh' ? '种 AI 服务支持' : 'AI Services' }}</div>
          </div>
          <div class="highlight-item">
            <div class="highlight-number">&lt;10ms</div>
            <div class="highlight-text">{{ currentLanguage === 'zh' ? '搜索响应时间' : 'Search Response' }}</div>
          </div>
        </div>
        </div>
      </div>

    <!-- 系统截图展示 -->
    <div class="screenshot-section">
      <div class="screenshot-container">
        <h2 class="section-title">{{ currentLanguage === 'zh' ? '界面预览' : 'Interface Preview' }}</h2>
        <div class="carousel-wrapper" style="margin-top: 40px; overflow: hidden; width: 100%;">
          <div class="carousel-track" style="display: flex; gap: 32px; animation: carousel-scroll 30s linear infinite; align-items: flex-start;">
            <!-- 4张卡片 -->
            <div class="preview-card" style="flex-shrink: 0; background: rgba(26, 31, 53, 0.95); border: 1px solid rgba(96, 165, 250, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); width: fit-content;">
              <div style="height: 32px; background: #1a1f35; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 12px; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></span>
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.7rem; flex: 1; text-align: center; padding-right: 40px;">{{ currentLanguage === 'zh' ? '登录界面' : 'Login Interface' }}</div>
              </div>
              <div style="padding: 0; background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6)); line-height: 0;">
                <img src="/screenshot-01.png" alt="Repos" style="height: 500px; width: auto;" />
              </div>
            </div>
            <div class="preview-card" style="flex-shrink: 0; background: rgba(26, 31, 53, 0.95); border: 1px solid rgba(96, 165, 250, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); width: fit-content;">
              <div style="height: 32px; background: #1a1f35; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 12px; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></span>
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.7rem; flex: 1; text-align: center; padding-right: 40px;">{{ currentLanguage === 'zh' ? '主界面' : 'Main Interface' }}</div>
              </div>
              <div style="padding: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6));">
                <img src="/screenshot-02.png" alt="Tags" style="display: block; width: auto; height: 500px;" />
              </div>
            </div>
            <div class="preview-card" style="flex-shrink: 0; background: rgba(26, 31, 53, 0.95); border: 1px solid rgba(96, 165, 250, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); width: fit-content;">
              <div style="height: 32px; background: #1a1f35; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 12px; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></span>
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.7rem; flex: 1; text-align: center; padding-right: 40px;">{{ currentLanguage === 'zh' ? '用户指南' : 'User Guide' }}</div>
              </div>
              <div style="padding: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6));">
                <img src="/screenshot-03.png" alt="AI" style="display: block; width: auto; height: 500px;" />
              </div>
            </div>
            <!-- 复制一组实现无缝循环 -->
            <div class="preview-card" style="flex-shrink: 0; background: rgba(26, 31, 53, 0.95); border: 1px solid rgba(96, 165, 250, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); width: fit-content;">
              <div style="height: 32px; background: #1a1f35; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 12px; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></span>
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.7rem; flex: 1; text-align: center; padding-right: 40px;">{{ currentLanguage === 'zh' ? '登录界面' : 'Login Interface' }}</div>
              </div>
              <div style="padding: 0; background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6)); line-height: 0;">
                <img src="/screenshot-01.png" alt="Repos" style="height: 500px; width: auto;" />
              </div>
            </div>
            <div class="preview-card" style="flex-shrink: 0; background: rgba(26, 31, 53, 0.95); border: 1px solid rgba(96, 165, 250, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); width: fit-content;">
              <div style="height: 32px; background: #1a1f35; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 12px; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></span>
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.7rem; flex: 1; text-align: center; padding-right: 40px;">{{ currentLanguage === 'zh' ? '主界面' : 'Main Interface' }}</div>
              </div>
              <div style="padding: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6));">
                <img src="/screenshot-02.png" alt="Tags" style="display: block; width: auto; height: 500px;" />
              </div>
            </div>
            <div class="preview-card" style="flex-shrink: 0; background: rgba(26, 31, 53, 0.95); border: 1px solid rgba(96, 165, 250, 0.3); overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); width: fit-content;">
              <div style="height: 32px; background: #1a1f35; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; padding: 0 12px; gap: 8px;">
                <div style="display: flex; gap: 6px;">
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ff5f56;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #ffbd2e;"></span>
                  <span style="width: 10px; height: 10px; border-radius: 50%; background: #27c93f;"></span>
                </div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.7rem; flex: 1; text-align: center; padding-right: 40px;">{{ currentLanguage === 'zh' ? '用户指南' : 'User Guide' }}</div>
              </div>
              <div style="padding: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6));">
                <img src="/screenshot-03.png" alt="AI" style="display: block; width: auto; height: 500px;" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能特点 -->
    <div class="features-section">
      <div class="features-container">
        <h2 class="section-title">{{ currentLanguage === 'zh' ? '核心功能' : 'Core Features' }}</h2>
        <p class="section-subtitle">{{ currentLanguage === 'zh' ? '专为开发者打造的 GitHub Stars 管理解决方案' : 'A complete GitHub Stars management solution built for developers' }}</p>
        <div class="features-grid">
          <div class="feature-item">
            <div class="feature-item-icon">
              <el-icon :size="32"><Collection /></el-icon>
            </div>
            <div class="feature-item-content">
              <h3>{{ currentLanguage === 'zh' ? '智能标签系统' : 'Smart Tagging System' }}</h3>
              <p>{{ currentLanguage === 'zh' 
                ? '18 种预设分类覆盖 Web、移动、AI、DevOps 等主流技术领域。支持自定义标签、Emoji 图标、18 种颜色。一个仓库多个标签，批量操作高效管理。' 
                : '18 presets cover Web, Mobile, AI, DevOps, and more. Custom tags with emoji icons and 18 colors. Multiple tags per repo, batch operations for efficiency.' }}</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-item-icon">
              <el-icon :size="32"><Search /></el-icon>
            </div>
            <div class="feature-item-content">
              <h3>{{ currentLanguage === 'zh' ? '全文即时搜索' : 'Full-text Instant Search' }}</h3>
              <p>{{ currentLanguage === 'zh' 
                ? '基于 IndexedDB 本地存储，搜索延迟小于 10ms。支持仓库名、描述、编程语言多维度搜索，配合标签筛选精准定位，支持 10000+ 仓库。' 
                : 'IndexedDB-based local storage with <10ms search latency. Multi-dimensional search across names, descriptions, languages. Tag filtering for precision. Supports 10,000+ repos.' }}</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-item-icon">
              <el-icon :size="32"><MagicStick /></el-icon>
            </div>
            <div class="feature-item-content">
              <h3>{{ currentLanguage === 'zh' ? 'AI 智能分类' : 'AI Smart Classification' }}</h3>
              <p>{{ currentLanguage === 'zh' 
                ? '支持 OpenAI、Claude、DeepSeek、通义千问、智谱 AI 五种服务。模型只能选择已有分类，结果经人工审核后写入，并支持撤销。'
                : 'Supports OpenAI, Claude, DeepSeek, Qwen, and Zhipu AI. Models can select only existing categories; results are reviewed before a reversible write.' }}</p>
            </div>
          </div>
          <div class="feature-item">
            <div class="feature-item-icon">
              <el-icon :size="32"><Reading /></el-icon>
            </div>
            <div class="feature-item-content">
              <h3>{{ currentLanguage === 'zh' ? 'README 即时预览' : 'README Instant Preview' }}</h3>
              <p>{{ currentLanguage === 'zh' 
                ? '完整 GFM Markdown 渲染，highlight.js 支持 100+ 种语言语法高亮。DOMPurify 安全过滤，图片表格完美显示，无需跳转即可了解项目。' 
                : 'Full GFM Markdown rendering, highlight.js supports 100+ languages. DOMPurify security filtering, perfect image/table display. Quick insights without leaving.' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 技术栈 -->
    <div class="tech-section">
      <div class="tech-container">
        <h2 class="section-title">{{ currentLanguage === 'zh' ? '现代化技术栈' : 'Modern Tech Stack' }}</h2>
        <p class="section-subtitle">{{ currentLanguage === 'zh' ? '采用 2024 年最新技术构建，确保极致性能与开发体验' : 'Built with cutting-edge 2024 technologies for optimal performance and DX' }}</p>
        <div class="tech-grid">
          <div class="tech-item">
            <div class="tech-icon">⚡</div>
            <div class="tech-content">
              <span class="tech-name">Vue 3</span>
              <span class="tech-desc">{{ currentLanguage === 'zh' ? '组合式 API' : 'Composition API' }}</span>
            </div>
          </div>
          <div class="tech-item">
            <div class="tech-icon">🔷</div>
            <div class="tech-content">
              <span class="tech-name">TypeScript</span>
              <span class="tech-desc">{{ currentLanguage === 'zh' ? '类型安全' : 'Type Safe' }}</span>
            </div>
          </div>
          <div class="tech-item">
            <div class="tech-icon">🚀</div>
            <div class="tech-content">
              <span class="tech-name">Vite</span>
              <span class="tech-desc">{{ currentLanguage === 'zh' ? '极速构建' : 'Fast Build' }}</span>
            </div>
          </div>
          <div class="tech-item">
            <div class="tech-icon">📦</div>
            <div class="tech-content">
              <span class="tech-name">Pinia</span>
              <span class="tech-desc">{{ currentLanguage === 'zh' ? '状态管理' : 'State Management' }}</span>
            </div>
          </div>
          <div class="tech-item">
            <div class="tech-icon">🎨</div>
            <div class="tech-content">
              <span class="tech-name">Element Plus</span>
              <span class="tech-desc">{{ currentLanguage === 'zh' ? 'UI 组件库' : 'UI Components' }}</span>
            </div>
          </div>
          <div class="tech-item">
            <div class="tech-icon">💾</div>
            <div class="tech-content">
              <span class="tech-name">Dexie.js</span>
              <span class="tech-desc">{{ currentLanguage === 'zh' ? '本地数据库' : 'IndexedDB' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 页脚 -->
    <div class="page-footer">
      <div class="footer-content">
        <!-- <div class="footer-logo">
          <img src="/logo.svg" alt="StarHub" class="footer-logo-img" />
          <span>StarHub</span>
        </div> -->
        <div class="footer-links">
          <a href="https://github.com/hujinghaoabcd/StarHub" target="_blank">GitHub</a>
          <a href="https://github.com/hujinghaoabcd/StarHub/issues" target="_blank">{{ currentLanguage === 'zh' ? '问题反馈' : 'Issues' }}</a>
          <a href="https://github.com/hujinghaoabcd/StarHub/blob/main/LICENSE" target="_blank">MIT License</a>
        </div>
        <p class="footer-copyright">&copy; 2024 StarHub. {{ currentLanguage === 'zh' ? '专业的 GitHub Stars 管理工具，让你的收藏井井有条。' : 'Professional GitHub Stars management tool. Organize your collection with ease.' }}</p>
        <p class="footer-made">{{ currentLanguage === 'zh' ? '用 ❤️ 和 Vue 3 + TypeScript + Vite 构建' : 'Made with ❤️ using Vue 3 + TypeScript + Vite' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import { githubApi } from '@/api/github'
import { AuthToken } from '@/utils/auth'
import { openWindowCenter } from '@/utils'
import { Link, Collection, Search, MagicStick, Reading } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'
import qs from 'query-string'
import { GITHUB_OAUTH_CONFIG } from '@/config/oauth'
import {
  clearOAuthRequest,
  consumeOAuthRequest,
  createOAuthRequest,
  getOAuthRedirectUri
} from '@/utils/oauth'


interface OAuthCallbackMessage {
  type: 'starhub:oauth-callback'
  code: string
  state: string
}

const { t, locale } = useI18n()
const themeStore = useThemeStore()
const currentLanguage = computed(() => themeStore.language)

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const error = ref('')

// 文档链接：开发环境用 5174 端口，生产环境用 /docs/
const docsUrl = computed(() => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5174'
  }
  return '/docs/'
})

// 处理 OAuth 回调（GitHub 回到应用根路径并附带 code/state）
onMounted(async () => {
  const query = qs.parse(location.search)
  const code = typeof query.code === 'string' ? query.code : ''
  const returnedState = typeof query.state === 'string' ? query.state : ''

  if (!code) {
    const reason = typeof route.query.reason === 'string'
      ? route.query.reason
      : ''

    if (reason === 'session-expired') {
      error.value = currentLanguage.value === 'zh'
        ? '登录会话已过期，请重新使用 GitHub 登录。'
        : 'Your login session expired. Please sign in with GitHub again.'
    } else if (reason === 'unauthorized') {
      error.value = currentLanguage.value === 'zh'
        ? 'GitHub 已拒绝当前凭据，请重新授权。'
        : 'GitHub rejected the current credentials. Please authorize again.'
    } else if (reason === 'logged-out') {
      error.value = currentLanguage.value === 'zh'
        ? '登录已在另一个标签页退出。'
        : 'You signed out in another tab.'
    }
    return
  }

  if (window.opener) {
  const message: OAuthCallbackMessage = {
    type: 'starhub:oauth-callback',
    code,
    state: returnedState
  }
  window.opener.postMessage(message, window.location.origin)
  window.close()
  return
}

  try {
    const codeVerifier = consumeOAuthRequest(returnedState)
    window.history.replaceState(
      {},
      document.title,
      `${location.pathname}#/login`
    )
    await login(code, codeVerifier)
  } catch {
    clearOAuthRequest()
    error.value = 'OAuth 状态校验失败，请重新发起登录。'
    loading.value = false
  }
})

// 登录处理函数
const login = async (code: string, codeVerifier: string) => {
  try {
    loading.value = true
    const res = await authApi.getToken({
      code,
      codeVerifier,
      redirectUri: getOAuthRedirectUri()
    })
    const { token_type, access_token } = res.data
    const ghToken = `${token_type} ${access_token}`
    
    AuthToken.setGithubToken(ghToken)
    
    const user = await githubApi.getLoginUser()
    userStore.setUser(user.data)
    
    const redirect = (route.query.redirect as string) || '/home'
    router.push(redirect)
  } catch (e: any) {
    console.error('Login error:', e)
    
    // 显示更详细的错误信息
    if (e.response) {
      // HTTP 错误
      const status = e.response.status
      const data = e.response.data
      
      if (status === 404) {
        error.value = 'API 端点未找到。请确保 Cloudflare Pages Functions 已部署，或使用本地开发服务器。\n\n错误详情：' + (data?.error || e.message)
      } else if (status === 500) {
        error.value = '服务器错误：' + (data?.error || 'OAuth token 交换失败')
      } else {
        error.value = `认证失败 (${status})：` + (data?.error || e.message)
      }
    } else if (e.request) {
      // 网络错误
      error.value = '无法连接到服务器。请检查：\n1. Cloudflare Pages Functions 是否已部署\n2. 网络连接是否正常\n3. 是否使用了本地开发服务器'
    } else {
      // 其他错误
      error.value = t('login.error')
    }
    
    AuthToken.clean()
  } finally {
    loading.value = false
  }
}

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  const clientId = GITHUB_OAUTH_CONFIG.CLIENT_ID
  if (!clientId) {
    error.value = t('login.configError')
    loading.value = false
    return
  }

  if (import.meta.env.PROD && !GITHUB_OAUTH_CONFIG.API_BASE_URL) {
    error.value = 'OAuth 后端尚未配置。请先设置 GitHub Actions 变量 VITE_API_BASE_URL。'
    loading.value = false
    return
  }

  try {
    const { state, codeChallenge } = await createOAuthRequest()
    const params = {
      client_id: clientId,
      redirect_uri: getOAuthRedirectUri(),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'read:user'
    }
    const url =
      'https://github.com/login/oauth/authorize?' + qs.stringify(params)
    const authWindow = openWindowCenter(url, 'authWindow', 600, 700)

    if (!authWindow) {
      clearOAuthRequest()
      error.value = '浏览器阻止了登录窗口，请允许弹出窗口后重试。'
      loading.value = false
      return
    }

    const handleOAuthMessage = async (
    event: MessageEvent<OAuthCallbackMessage>
  ) => {
    if (
      event.origin !== window.location.origin ||
      event.source !== authWindow ||
      event.data?.type !== 'starhub:oauth-callback'
    ) {
      return
    }

    window.removeEventListener('message', handleOAuthMessage)
    window.clearInterval(popupClosedTimer)
    authWindow.close()

    try {
      const codeVerifier = consumeOAuthRequest(event.data.state)
      await login(event.data.code, codeVerifier)
    } catch {
      clearOAuthRequest()
      error.value = 'OAuth 状态校验失败，请重新发起登录。'
      loading.value = false
    }
  }

  const popupClosedTimer = window.setInterval(() => {
    if (!authWindow.closed) {
      return
    }
    window.clearInterval(popupClosedTimer)
    window.removeEventListener('message', handleOAuthMessage)
    clearOAuthRequest()
    loading.value = false
  }, 500)

  window.addEventListener('message', handleOAuthMessage)
  } catch {
    clearOAuthRequest()
    error.value = '无法初始化安全登录，请刷新页面后重试。'
    loading.value = false
  }
}

const handleLanguageChange = (lang: 'zh' | 'en') => {
  themeStore.setLanguage(lang)
  locale.value = lang
}

const toggleLanguage = () => {
  const newLang = currentLanguage.value === 'zh' ? 'en' : 'zh'
  handleLanguageChange(newLang)
}
</script>

<style lang="scss" scoped>
.login-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-x: hidden;
  overflow-y: auto;
  background: linear-gradient(135deg, #1a1f35 0%, #2d3561 50%, #1e2a47 100%);
  z-index: 100;
}

// 星空背景动画
.stars-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 0;
}

.stars {
  position: absolute;
  top: 0;
  left: 0;
  width: 200%;
  height: 200%;
  background: transparent;
}

.stars-1 {
  background-image: 
    radial-gradient(2px 2px at 20px 30px, #eee, transparent),
    radial-gradient(2px 2px at 60px 70px, #fff, transparent),
    radial-gradient(1px 1px at 50px 50px, #ddd, transparent),
    radial-gradient(1px 1px at 130px 80px, #fff, transparent),
    radial-gradient(2px 2px at 90px 10px, #fff, transparent);
  background-size: 200px 200px;
  animation: stars-float 50s linear infinite;
  opacity: 0.5;
}

.stars-2 {
  background-image:
    radial-gradient(1px 1px at 100px 120px, #fff, transparent),
    radial-gradient(1px 1px at 150px 180px, #ddd, transparent),
    radial-gradient(1px 1px at 40px 130px, #fff, transparent);
  background-size: 250px 250px;
  animation: stars-float 100s linear infinite;
  opacity: 0.4;
}

.stars-3 {
  background-image:
    radial-gradient(1px 1px at 80px 90px, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(2px 2px at 180px 30px, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 120px 200px, rgba(255, 255, 255, 0.7), transparent);
  background-size: 300px 300px;
  animation: stars-float 150s linear infinite;
  opacity: 0.3;
}

@keyframes stars-float {
  from {
    transform: translateY(0) translateX(0);
  }
  to {
    transform: translateY(-100%) translateX(-50%);
  }
}

// 顶部导航
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 48px;
  z-index: 1000;
  background: rgba(26, 31, 53, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    padding: 0 24px;
  }
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-logo-img {
  width: 40px;
  height: 40px;
}

.nav-logo-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.5px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-link {
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: color 0.2s;

  &:hover {
    color: #60a5fa;
  }
}

.nav-divider {
  color: rgba(255, 255, 255, 0.2);
}

.nav-lang {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);

  &:hover {
    color: #60a5fa;
    background: rgba(255, 255, 255, 0.15);
  }
}

// Hero 区域
.hero-section {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px 48px 80px;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    padding: 100px 24px 60px;
  }
}

.hero-content {
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;

  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 60px;
    text-align: center;
  }
}

.hero-left {
  animation: fade-in-up 0.8s ease-out;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
  margin-bottom: 24px;
  letter-spacing: -1px;

  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
}

.hero-highlight {
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-description {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  margin-bottom: 24px;
  max-width: 540px;

  @media (max-width: 968px) {
    margin: 0 auto 24px;
  }
}

.hero-features {
  list-style: none;
  padding: 0;
  margin: 0 0 32px;
  
  li {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.8);
    line-height: 2;
    padding-left: 0;
  }

  @media (max-width: 968px) {
    text-align: left;
    display: inline-block;
  }
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 968px) {
    justify-content: center;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    gap: 16px;
  }
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: #60a5fa;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: rgba(255, 255, 255, 0.1);

  @media (max-width: 480px) {
    display: none;
  }
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 24px;

  @media (max-width: 968px) {
  justify-content: center;
    flex-wrap: wrap;
  }
}

.login-button {
  height: 52px;
  padding: 0 32px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  border: none;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px rgba(96, 165, 250, 0.4);
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  }
}

.github-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  font-size: 0.9375rem;
  font-weight: 500;
  transition: color 0.2s;

  &:hover {
    color: #60a5fa;
  }
}

  .error-alert {
  max-width: 500px;

  @media (max-width: 968px) {
    margin: 0 auto;
  }
}

// 右侧 Logo
.hero-right {
  display: flex;
  justify-content: center;
  animation: fade-in-up 0.8s ease-out 0.2s both;

  @media (max-width: 968px) {
    order: -1;
  }
}

.logo-container {
  position: relative;
  width: 320px;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    width: 240px;
    height: 240px;
  }
}

.logo-glow {
  position: absolute;
    width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%);
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.logo-wrapper {
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(96, 165, 250, 0.4);
  animation: logo-float 4s ease-in-out infinite;
  padding: 30px;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    width: 160px;
    height: 160px;
    padding: 24px;
  }
}

.logo-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

@keyframes logo-float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-15px);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 工具类
.mr-2 {
  margin-right: 8px;
}

.ml-2 {
  margin-left: 8px;
}

:deep(.el-dropdown-menu__item.is-selected) {
  color: var(--el-color-primary);
    font-weight: 500;
  }

// 介绍区域
.intro-section {
  width: 100%;
  max-width: 100vw;
  padding: 100px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 10;
  margin: 0;

  @media (max-width: 768px) {
    padding: 60px 24px;
  }
}

.intro-container {
  max-width: 900px;
  margin: 0 auto;
  text-align: center;
}

.intro-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 24px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
}

.intro-description {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  max-width: 800px;
  margin: 0 auto 60px;
}

.intro-highlights {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.highlight-item {
  text-align: center;
  padding: 24px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.highlight-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #60a5fa;
  margin-bottom: 8px;
}

.highlight-text {
    font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
}

// 截图展示区域
.screenshot-section {
  width: 100%;
  max-width: 100vw;
  padding: 80px 24px;
  position: relative;
  z-index: 10;
  margin: 0;
  overflow: visible;

  @media (max-width: 768px) {
    padding: 60px 24px;
  }
}

.screenshot-container {
  max-width: 1200px;
  margin: 0 auto;
}

// 浏览器框样式
.browser-frame {
  margin-top: 40px;
  background: rgba(26, 31, 53, 0.9);
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(96, 165, 250, 0.2);
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
}

.browser-header {
  height: 44px;
  background: rgba(26, 31, 53, 1);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}

.browser-dots {
  display: flex;
  gap: 8px;
  
  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    
    &.dot-red { background: #ff5f56; }
    &.dot-yellow { background: #ffbd2e; }
    &.dot-green { background: #27c93f; }
  }
}

.browser-title {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  flex: 1;
    text-align: center;
  padding-right: 60px;
}

.browser-content {
  padding: 24px;
  background: linear-gradient(135deg, rgba(45, 53, 97, 0.4), rgba(26, 31, 53, 0.6));
  min-height: 220px;
}

// 轮播
.carousel-wrapper {
  overflow: hidden;
  border-radius: 8px;
  width: 100%;
}

.carousel-track {
  display: flex;
  gap: 20px;
  animation: carousel-scroll 20s linear infinite;
  
  &:hover {
    animation-play-state: paused;
  }
}

@keyframes carousel-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-3328px);
  }
}

// 预览卡片

.preview-label {
  padding: 12px 16px;
  background: rgba(26, 31, 53, 0.8);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.85rem;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.preview-mock {
  padding: 20px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 31, 53, 0.4);
}

// Mock UI 元素
.mock-sidebar {
  width: 50px;
  height: 100px;
  background: rgba(96, 165, 250, 0.3);
  border-radius: 6px;
  flex-shrink: 0;
}

.mock-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 10px;
}

.mock-item {
  height: 24px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  width: 100%;
  
  &:last-child { width: 70%; }
}

// 标签模拟
.tags-mock {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  width: 100%;
}

.tag-item {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

// AI 圆环进度
.ai-mock {
  flex-direction: column;
  text-align: center;
}

.ai-circle {
  position: relative;
  width: 80px;
  height: 80px;
  margin-bottom: 8px;
  
  svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }
  
  .ai-bg {
    fill: none;
    stroke: rgba(255, 255, 255, 0.1);
    stroke-width: 8;
  }
  
  .ai-progress {
    fill: none;
    stroke: #60a5fa;
    stroke-width: 8;
    stroke-linecap: round;
    stroke-dasharray: 283;
    stroke-dashoffset: 14;
    animation: ai-circle-fill 2s ease-in-out infinite alternate;
  }
}

@keyframes ai-circle-fill {
  0% { stroke-dashoffset: 283; }
  100% { stroke-dashoffset: 14; }
}

.ai-percent {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #60a5fa;
  font-size: 1.1rem;
  font-weight: 700;
}

.ai-label {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.8rem;
}

// README 模拟
.readme-mock {
  flex-direction: column;
  width: 100%;
  align-items: flex-start;
}

.readme-title {
  width: 60%;
  height: 16px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 4px;
  margin-bottom: 12px;
}

.readme-line {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  margin-bottom: 6px;
  
  &.short { width: 65%; }
}

.readme-code {
  width: 100%;
  height: 36px;
  background: rgba(26, 31, 53, 0.8);
  border-radius: 6px;
  border-left: 3px solid #60a5fa;
  margin-top: 6px;
}

// 功能特点区域
.features-section {
  width: 100%;
  max-width: 100vw;
  padding: 100px 24px;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 10;
  margin: 0;

  @media (max-width: 768px) {
    padding: 60px 24px;
  }
}

.features-container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-align: center;
  margin-bottom: 16px;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
}

.section-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin-bottom: 64px;

  @media (max-width: 768px) {
    margin-bottom: 48px;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 48px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

@media (max-width: 768px) {
  .feature-item {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 16px;
  }
  
  .feature-item-icon {
    margin-bottom: 0;
  }
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  text-align: left;
}

.feature-item-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  background: rgba(96, 165, 250, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #60a5fa;
  transition: all 0.3s ease;

  .feature-item:hover & {
    background: rgba(96, 165, 250, 0.25);
    transform: scale(1.05);
  }
}

.feature-item-content {
  flex: 1;
}

.feature-item h3 {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: 12px;
  margin-top: 0;
}

.feature-item p {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.65);
  line-height: 1.7;
  margin: 0;
}

// 技术栈区域
.tech-section {
  width: 100%;
  max-width: 100vw;
  padding: 100px 24px;
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    padding: 60px 24px;
  }
}

.tech-container {
  max-width: 900px;
  margin: 0 auto;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 20px;
  margin-top: 48px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.tech-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 28px 16px;
  background: linear-gradient(135deg, rgba(96, 165, 250, 0.08), rgba(59, 130, 246, 0.05));
  border-radius: 16px;
  border: 1px solid rgba(96, 165, 250, 0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(59, 130, 246, 0.05));
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(59, 130, 246, 0.1));
    border-color: rgba(96, 165, 250, 0.4);
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 12px 32px rgba(96, 165, 250, 0.2);
    
    &::before {
      opacity: 1;
    }
    
    .tech-icon {
      transform: scale(1.15) rotate(5deg);
    }
  }
}

.tech-icon {
  font-size: 2.5rem;
  margin-bottom: 16px;
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 4px 8px rgba(96, 165, 250, 0.3));
}

.tech-content {
  display: flex;
  flex-direction: column;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.tech-name {
  display: block;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.3px;
}

.tech-desc {
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

// 页脚
.page-footer {
  width: 100%;
  max-width: 100vw;
  padding: 60px 24px;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.2);
  position: relative;
  z-index: 10;
  margin: 0;
}

.footer-content {
  max-width: 600px;
  margin: 0 auto;
}

.footer-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 24px;

  .footer-logo-img {
    width: 32px;
    height: 32px;
  }

  span {
    font-size: 1.25rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.9);
  }
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 24px;

  a {
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
    
    &:hover {
      color: #60a5fa;
    }
  }
}

.footer-copyright {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.875rem;
  margin-bottom: 8px;
}

.footer-made {
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.8125rem;
}
</style>

<!-- 全局样式，确保 keyframes 生效 -->
<style>
@keyframes carousel-scroll {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-3328px);
  }
}
</style>
