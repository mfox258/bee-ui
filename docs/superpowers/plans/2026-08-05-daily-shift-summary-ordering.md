# Daily Shift Summary Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display selected-day shift count chips in the agreed operational order, with starred variants immediately following their base shift.

**Architecture:** A small pure CommonJS utility owns the ordering rules and is imported by the Vue component. The component continues to aggregate counts from `tableData`, then delegates only the ordering step to the utility.

**Tech Stack:** Vue 2.7, Node.js built-in `assert`, VXE Table.

---

### Task 1: Add the ordering utility with a regression test

**Files:**
- Create: `test/schedulingShiftOrder.test.js`
- Create: `src/utils/schedulingShiftOrder.js`

- [ ] **Step 1: Write the failing Node assertion test.**

```js
const assert = require('assert')
const sortDailyShiftCounts = require('../src/utils/schedulingShiftOrder')

const ordered = sortDailyShiftCounts([
  { classes: '白', count: 1 }, { classes: '责2*', count: 1 },
  { classes: '总务*', count: 1 }, { classes: '活动', count: 1 },
  { classes: '责1', count: 1 }, { classes: '责1*', count: 1 },
  { classes: '总务', count: 1 }, { classes: '巡回', count: 1 }
])

assert.deepStrictEqual(ordered.map(item => item.classes), [
  '总务', '总务*', '责1', '责1*', '责2*', '巡回', '活动', '白'
])
```

- [ ] **Step 2: Run the test and confirm the expected missing-module failure.**

Run: `node test/schedulingShiftOrder.test.js`

Expected: `Cannot find module '../src/utils/schedulingShiftOrder'`.

- [ ] **Step 3: Add `sortDailyShiftCounts` with the exact base order.**

```js
const priority = ['总务', '责1', '责2', '8-3/夜', '中', '起休', '休', '器械', '巡回']
const priorityIndex = priority.reduce((result, classes, index) => {
  result[classes] = index
  return result
}, {})

function sortDailyShiftCounts (counts) {
  return counts.slice().sort((left, right) => {
    const leftBase = left.classes.replace(/\\*$/, '')
    const rightBase = right.classes.replace(/\\*$/, '')
    const leftPriority = priorityIndex[leftBase]
    const rightPriority = priorityIndex[rightBase]
    if (leftPriority !== undefined || rightPriority !== undefined) {
      if (leftPriority === undefined) return 1
      if (rightPriority === undefined) return -1
      if (leftPriority !== rightPriority) return leftPriority - rightPriority
      return Number(left.classes.endsWith('*')) - Number(right.classes.endsWith('*'))
    }
    return left.classes.localeCompare(right.classes, 'zh-CN')
  })
}

module.exports = sortDailyShiftCounts
```

- [ ] **Step 4: Re-run the Node test.**

Run: `node test/schedulingShiftOrder.test.js`

Expected: exit code `0`.

### Task 2: Use the utility in the selected-day summary

**Files:**
- Modify: `src/views/zyz/paiban/index.vue`

- [ ] **Step 1: Import the utility.**

```js
import sortDailyShiftCounts from '@/utils/schedulingShiftOrder'
```

- [ ] **Step 2: Sort the computed count list.**

```js
return sortDailyShiftCounts(Object.keys(counts).map((classes) => ({
  classes,
  count: counts[classes]
})))
```

- [ ] **Step 3: Verify compile output.**

Run: `npx vue-cli-service build --mode dev --dest .tmp-build`

Expected: exit code `0`; remove `.tmp-build` after verification.
