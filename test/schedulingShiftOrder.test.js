const assert = require('assert')
const sortDailyShiftCounts = require('../src/utils/schedulingShiftOrder')

const ordered = sortDailyShiftCounts([
  { classes: '白', count: 1 },
  { classes: '责2*', count: 1 },
  { classes: '总务*', count: 1 },
  { classes: '活动', count: 1 },
  { classes: '责1', count: 1 },
  { classes: '责1*', count: 1 },
  { classes: '总务', count: 1 },
  { classes: '巡回', count: 1 }
])

assert.deepStrictEqual(ordered.map(item => item.classes), [
  '总务',
  '总务*',
  '责1',
  '责1*',
  '责2*',
  '巡回',
  '白',
  '活动'
])
