const priority = ['总务', '责1', '责2', '8-3/夜', '中', '起休', '休', '器械', '巡回']
const priorityIndex = priority.reduce((result, classes, index) => {
  result[classes] = index
  return result
}, {})

function sortDailyShiftCounts (counts) {
  return counts.slice().sort((left, right) => {
    const leftBase = left.classes.replace(/\*$/, '')
    const rightBase = right.classes.replace(/\*$/, '')
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
