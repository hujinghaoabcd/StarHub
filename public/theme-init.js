(() => {
  const themeKey = 'app-theme'
  let theme = 'dark'

  try {
    const savedTheme = window.localStorage.getItem(themeKey)
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme = savedTheme
    }
    window.localStorage.setItem(themeKey, theme)
  } catch {
    // Keep the safe dark default when browser storage is unavailable.
  }

  const isDark = theme === 'dark'
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.classList.toggle('dark', isDark)
  document.body.classList.toggle('dark', isDark)

  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor) {
    themeColor.setAttribute('content', isDark ? '#1a1a1a' : '#ffffff')
  }
})()
