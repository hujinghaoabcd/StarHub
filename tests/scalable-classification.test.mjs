import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('C3-A segments large tasks at storage, execution, review, and commit boundaries', async () => {
  const [database, tasks, enhancement, store, startDialog, reviewDialog, sideMenu] =
    await Promise.all([
      source('src/db/index.ts'),
      source('src/services/classificationTasks.ts'),
      source('src/services/classificationEnhancement.ts'),
      source('src/stores/classificationTask.ts'),
      source('src/pages/Home/components/ClassificationTaskStartDialog.vue'),
      source('src/pages/Home/components/ClassificationReviewDialog.vue'),
      source('src/pages/Home/components/SideMenu.vue')
    ])

  assert.match(database, /version\(6\)/)
  assert.match(database, /\[taskId\+segmentIndex\+status\]/)
  assert.match(database, /\[taskId\+segmentIndex\+accepted\]/)
  assert.match(database, /\[taskId\+segmentIndex\+committed\]/)

  assert.match(tasks, /Math\.floor\(index \/ segmentSize\)/)
  assert.match(tasks, /\? 'partial' : 'segment_ready'/)
  assert.match(tasks, /pausedBeforeSegmentFinished/)
  assert.match(tasks, /currentSegmentIndex: segmentIndex \+ 1/)
  assert.match(tasks, /segmentProcessedCount: 0/)
  assert.match(tasks, /\[taskId\+segmentIndex\+accepted\]/)
  assert.match(enhancement, /\[taskId\+segmentIndex\+status\]/)

  assert.match(startDialog, /segmentSize/)
  assert.match(startDialog, /autoEnhanceLowConfidence/)
  assert.match(store, /completedTask\.autoEnhanceLowConfidence/)
  assert.match(store, /executeClassificationEnhancement/)
  assert.match(reviewDialog, /reviewSuccessCount/)
  assert.match(reviewDialog, /reviewCommitSegment/)
  assert.match(sideMenu, /continueWithNextSegment/)
  assert.match(sideMenu, /startActiveClassification\(\)/)
})

function relativeLuminance(hex) {
  const channels = hex.match(/[a-f\d]{2}/gi).map(value => {
    const channel = Number.parseInt(value, 16) / 255
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

test('dark selected controls use a contrasting foreground instead of primary-on-primary', async () => {
  const styles = await source('src/styles/main.scss')
  const foreground = relativeLuminance('#0f172a')
  const background = relativeLuminance('#60a5fa')
  const ratio = (Math.max(foreground, background) + 0.05) /
    (Math.min(foreground, background) + 0.05)

  assert.ok(ratio >= 4.5, `expected WCAG AA contrast, received ${ratio}`)
  assert.match(styles, /--control-on-primary: #0f172a/)
  assert.match(
    styles,
    /\.el-pager li\.is-active \{[\s\S]*?color: var\(--control-on-primary\) !important;/
  )
  assert.match(
    styles,
    /\.el-button--primary \{[\s\S]*?color: var\(--control-on-primary\) !important;/
  )
  assert.doesNotMatch(
    styles,
    /\.el-pager li\.is-active \{\s*color: #60a5fa !important;/
  )
})
