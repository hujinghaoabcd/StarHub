import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const sourceHtml = await readFile(path.resolve('index.html'), 'utf8')
const builtHtml = await readFile(path.resolve('dist/index.html'), 'utf8')

const requiredDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "script-src 'self'",
  "connect-src 'self' https:",
  "frame-src 'none'"
]

function verifyHtml(html, label) {
  if (!html.includes('http-equiv="Content-Security-Policy"')) {
    throw new Error(`${label} is missing the Content Security Policy meta tag`)
  }

  for (const directive of requiredDirectives) {
    if (!html.includes(directive)) {
      throw new Error(`${label} CSP is missing: ${directive}`)
    }
  }

  if (!html.includes('name="referrer" content="strict-origin-when-cross-origin"')) {
    throw new Error(`${label} is missing the strict referrer policy`)
  }

  const classicScripts = Array.from(
    html.matchAll(/<script(?![^>]*type=["']module["'])[^>]*>([\s\S]*?)<\/script>/gi)
  )
  const inlineClassicScripts = classicScripts.filter(match => {
    const openingTag = match[0].slice(0, match[0].indexOf('>') + 1)
    return !/\ssrc=["'][^"']+["']/i.test(openingTag) && match[1].trim()
  })

  if (inlineClassicScripts.length > 0) {
    throw new Error(`${label} contains an inline classic script blocked by the CSP`)
  }
}

verifyHtml(sourceHtml, 'Source index.html')
verifyHtml(builtHtml, 'Built dist/index.html')

if (!builtHtml.includes('/StarHub/theme-init.js')) {
  throw new Error('GitHub Pages build did not preserve the base-aware theme script path')
}

if (builtHtml.includes("script-src 'unsafe-inline'")) {
  throw new Error('The built CSP must not allow inline JavaScript')
}

console.log('Static security policy verified successfully.')
console.log(`Node ${process.version}`)
