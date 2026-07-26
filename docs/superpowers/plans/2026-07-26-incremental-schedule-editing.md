# Incremental Schedule Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace full-page schedule rewrites with one-cell updates, allow clearing a shift, and show live counts for the selected date.

**Architecture:** The existing `/api/admin/scheduling/edit` endpoint remains, but its request becomes a single-cell DTO. The service deletes by `userName + date` and conditionally inserts one replacement row in one transaction. The Vue page submits only the changed cell, restores it on failure, and derives the selected-day summary directly from loaded table data.

**Tech Stack:** Spring Boot 2.1, MyBatis-Plus 3.2, Java 8, Vue 2.7, VXE Table 3.13, Element UI 2.

---

## File structure

- Modify: `D:/工程/mfox/bee/src/main/java/com/mindskip/xzs/viewmodel/scheduling/SchedulingEditRequest.java` — single-cell request DTO.
- Modify: `D:/工程/mfox/bee/src/main/java/com/mindskip/xzs/service/impl/SchedulingInfoServiceImpl.java` — transactional replacement/delete of one schedule row.
- Modify: `D:/工程/mfox/bee-ui/src/views/zyz/paiban/index.vue` — compact daily summary, header selection, clearable select, and cell-only API call.
- Modify: `D:/工程/mfox/bee-ui/src/api/scheduling.js` — preserve endpoint while making its caller’s single-cell payload explicit.
- Create: `D:/工程/mfox/bee/src/test/java/com/mindskip/xzs/service/impl/SchedulingInfoServiceImplTest.java` — verifies non-empty insert and blank delete behavior.

### Task 1: Lock down one-cell backend behavior

**Files:**
- Create: `D:/工程/mfox/bee/src/test/java/com/mindskip/xzs/service/impl/SchedulingInfoServiceImplTest.java`
- Modify: `D:/工程/mfox/bee/src/main/java/com/mindskip/xzs/viewmodel/scheduling/SchedulingEditRequest.java`
- Modify: `D:/工程/mfox/bee/src/main/java/com/mindskip/xzs/service/impl/SchedulingInfoServiceImpl.java`

- [ ] **Step 1: Write failing service tests for replace and delete-only requests.**

```java
@ExtendWith(MockitoExtension.class)
class SchedulingInfoServiceImplTest {
    @Mock private SchedulingInfoMapper schedulingInfoMapper;
    @Mock private UserMapper userMapper;
    @Mock private ClassesRuleService classesRuleService;
    @Mock private ClassesService classesService;
    @Mock private ClassesStatisticRuleMapper classesStatisticRuleMapper;
    @Mock private ClassesAttendanceMappingMapper classesAttendanceMappingMapper;
    @InjectMocks private SchedulingInfoServiceImpl service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "baseMapper", schedulingInfoMapper);
    }

    @Test
    void edit_replacesOnlyTheRequestedCellWhenClassesIsPresent() {
        SchedulingEditRequest request = request("张义芝", "2026-07-09", "2026-07", "活动");
        service.edit(request);
        verify(schedulingInfoMapper).delete(any());
        verify(schedulingInfoMapper).insert(argThat(info ->
            "张义芝".equals(info.getUserName()) && "2026-07-09".equals(info.getDate()) &&
            "2026-07".equals(info.getMonth()) && "活动".equals(info.getClasses())));
    }

    @Test
    void edit_deletesOnlyTheRequestedCellWhenClassesIsBlank() {
        service.edit(request("张义芝", "2026-07-09", "2026-07", ""));
        verify(schedulingInfoMapper).delete(any());
        verify(schedulingInfoMapper, never()).insert(any(SchedulingInfo.class));
    }
}
```

- [ ] **Step 2: Run the test to establish the current request shape cannot support it.**

Run: `D:\工程\mfox\bee\mvnw.cmd -DskipTests=false -Dtest=SchedulingInfoServiceImplTest test`

Expected: compilation failure because `SchedulingEditRequest` has no `userName`, `date`, `month`, or `classes` fields.

- [ ] **Step 3: Replace the batch request fields and implement transactional cell replacement.**

```java
// SchedulingEditRequest.java
@Data
public class SchedulingEditRequest {
    private String userName;
    private String date;
    private String month;
    private String classes;
}

// SchedulingInfoServiceImpl.edit
this.baseMapper.delete(Wrappers.<SchedulingInfo>lambdaQuery()
        .eq(SchedulingInfo::getUserName, request.getUserName())
        .eq(SchedulingInfo::getDate, request.getDate()));
if (StringUtils.isNotBlank(request.getClasses())) {
    SchedulingInfo schedulingInfo = new SchedulingInfo();
    schedulingInfo.setUserName(request.getUserName());
    schedulingInfo.setDate(request.getDate());
    schedulingInfo.setMonth(request.getMonth());
    schedulingInfo.setClasses(request.getClasses());
    this.baseMapper.insert(schedulingInfo);
}
```

Keep `@Transactional` on `edit`. The controller and URL remain unchanged, so no routing change is needed.

- [ ] **Step 4: Run the targeted backend test.**

Run: `D:\工程\mfox\bee\mvnw.cmd -DskipTests=false -Dtest=SchedulingInfoServiceImplTest test`

Expected: `Tests run: 2, Failures: 0, Errors: 0`.

- [ ] **Step 5: Commit the backend change.**

```powershell
git -C 'D:\工程\mfox\bee' add -- src/main/java/com/mindskip/xzs/viewmodel/scheduling/SchedulingEditRequest.java src/main/java/com/mindskip/xzs/service/impl/SchedulingInfoServiceImpl.java src/test/java/com/mindskip/xzs/service/impl/SchedulingInfoServiceImplTest.java
git -C 'D:\工程\mfox\bee' commit -m "feat: update one scheduling cell at a time"
```

### Task 2: Submit and recover a single Vue table cell

**Files:**
- Modify: `D:/工程/mfox/bee-ui/src/api/scheduling.js`
- Modify: `D:/工程/mfox/bee-ui/src/views/zyz/paiban/index.vue`

- [ ] **Step 1: Add a focused frontend payload check before editing the component.**

Use the browser network panel or a temporary `console.assert` in `handleSelectChange` to require exactly these keys before sending:

```js
const payload = {
  userName: row.userName,
  date,
  month: date.slice(0, 7),
  classes: row[date] || ''
}
console.assert(Object.keys(payload).length === 4 && !('schedulingInfos' in payload))
```

Expected before implementation: the existing method builds `schedulingInfos` from every user and every date.

- [ ] **Step 2: Make the endpoint method name describe a cell payload.**

```js
// src/api/scheduling.js
editSchedulingCell: payload => post('/api/admin/scheduling/edit', payload),
```

Remove the old `editScheduling` property after its only call site has changed.

- [ ] **Step 3: Capture the original cell value and replace the full-page submission.**

```js
// data()
editingCellValue: '',

// handleCellClick({ row, column })
if (column && this.dates.includes(column.field)) {
  this.editingCellValue = row[column.field] || '';
}

// handleSelectChange(row, date)
const previousClasses = this.editingCellValue;
const payload = { userName: row.userName, date, month: date.slice(0, 7), classes: row[date] || '' };
schedulingApi.editSchedulingCell(payload)
  .then(() => {
    this.editingCellValue = payload.classes;
    this.refreshNewTable();
  })
  .catch((error) => {
    this.$set(row, date, previousClasses);
    this.$message.error('保存失败，请重试！');
    console.error('提交单元格排班失败:', error);
  });
```

Do not rebuild `schedulingInfos` and do not call `refreshData()` in this method.

- [ ] **Step 4: Allow clearing the current shift.**

```vue
<vxe-select v-model="scope.row[date]" clearable filterable placeholder="请选择班次"
  @change="handleSelectChange(scope.row, date)">
```

The empty `classes` in Step 3 must reach the backend instead of being filtered out in the browser.

- [ ] **Step 5: Run lint for the two changed Vue/JavaScript files.**

Run: `npx eslint src/api/scheduling.js src/views/zyz/paiban/index.vue`

Expected: exit code `0`.

- [ ] **Step 6: Commit the frontend single-cell submission.**

```powershell
git add -- src/api/scheduling.js src/views/zyz/paiban/index.vue
git commit -m "feat: submit schedule edits per cell"
```

### Task 3: Render live counts for the selected date

**Files:**
- Modify: `D:/工程/mfox/bee-ui/src/views/zyz/paiban/index.vue`

- [ ] **Step 1: Add a failing manual UI check.**

Open the schedule page, click the `7月9日` header, and verify that no compact top summary is currently rendered. Then edit a `7月9日` cell and confirm no per-day count changes on screen.

- [ ] **Step 2: Add a computed count list and header selection handler.**

```js
selectedDayClassCounts() {
  if (!this.dates.includes(this.activeColumnField)) return [];
  const counts = {};
  this.tableData.forEach((row) => {
    const classes = row[this.activeColumnField];
    if (classes) counts[classes] = (counts[classes] || 0) + 1;
  });
  return Object.keys(counts).map((classes) => ({ classes, count: counts[classes] }));
},
handleHeaderCellClick({ column }) {
  this.activeColumnField = column && this.dates.includes(column.field) ? column.field : '';
}
```

Bind `@header-cell-click="handleHeaderCellClick"` to the schedule table. Keep `getCellClassName` and `getHeaderCellClassName` as the single source for the selected-column highlight.

- [ ] **Step 3: Insert the compact summary strip into the existing toolbar.**

```vue
<div class="daily-shift-summary" v-if="selectedDayClassCounts.length">
  <span v-for="item in selectedDayClassCounts" :key="item.classes" class="daily-shift-chip"
    :class="{ 'daily-shift-chip--red': redClassOptions.includes(item.classes) }">
    {{ item.classes }} <b>{{ item.count }}</b>
  </span>
</div>
```

Place it between the month picker and the action-button wrapper. Do not add a date prefix or title. Add scoped styles for `12px` chips, a pale-blue container, and `overflow-x: auto` so the buttons retain their width.

- [ ] **Step 4: Verify the complete UI behavior manually.**

Run: `npm run serve`

Verify: header click and body-cell click select the column; `7月9日` counts equal the visible non-empty entries; a red class retains red emphasis; editing and clearing a selected-day cell immediately changes the strip; a failed request restores the old cell value.

- [ ] **Step 5: Commit the daily-summary UI.**

```powershell
git add -- src/views/zyz/paiban/index.vue
git commit -m "feat: show counts for selected schedule day"
```

## Final verification

- [ ] Run `git diff --check` in both `D:/工程/mfox/bee` and `D:/工程/mfox/bee-ui`.
- [ ] Confirm browser request payload for a change contains only `userName`, `date`, `month`, and `classes`.
- [ ] Confirm a blank `classes` request deletes only the selected row and preserves all other dates for the same user.
- [ ] Confirm both repositories have no unintended tracked changes before handoff.
