<template>
  <div class="container">
    <div class="flexBox schedule-toolbar">
      <!-- 月份范围选择器 -->
      <el-date-picker
        v-model="monthRange"
        type="monthrange"
        range-separator="至"
        start-placeholder="开始月份"
        end-placeholder="结束月份"
        format="yyyy-MM"
        value-format="yyyy-MM"
        @change="handleMonthRangeChange"
        placeholder="选择月份区间">
      </el-date-picker>
      <div class="daily-shift-summary" v-if="selectedDayClassCounts.length">
        <span v-for="item in selectedDayClassCounts" :key="item.classes" class="daily-shift-chip"
          :class="{ 'daily-shift-chip--red': redClassOptions.includes(item.classes) }">
          {{ item.classes }} <b>{{ item.count }}</b>
        </span>
      </div>
      <div class="action-buttons">
        <el-button v-if="userName === 'admin'" type="primary" @click="openBatchEditDialog">批量排班</el-button>
        <el-button type="primary" @click="dialogVisible=true">打印</el-button>
        <el-button type="primary" @click="exportExcel">导出 Excel</el-button>
      </div>
    </div>
    <!-- 表格 -->
    <vxe-table ref="tableRef" :data="tableData" border :height="scheduleTableHeight" style="width: 100%;margin-top:5px" :edit-config="this.userName==='admin'?{
      trigger: 'manual',
      mode: 'cell'
    }:undefined" :row-config="{isCurrent: true}" :mouse-config="{highlight: true}" :cell-class-name="getCellClassName" :header-cell-class-name="getHeaderCellClassName" @cell-click="handleCellClick" @header-cell-click="handleHeaderCellClick">
      <vxe-table-column field="userName" title="姓名" fixed="left" width="80">
        <template #header>
          <div>姓名</div>
        </template>
      </vxe-table-column>
      <vxe-table-column v-for="date in dates" :key="date" :field="date" width="100" :title="formatDate(date)+'<br/>'+getWeekday(date)" :edit-render="{}">
        <template #header>
          <span>{{ getWeekday(date) }}</span>
          <br>
          <span>{{ formatDate(date) }}</span>
        </template>
        <template #default="scope">
          <span v-html="highlightText(scope.row[date])"></span>
        </template>
        <template #edit="scope">
          <vxe-select v-model="scope.row[date]" clearable filterable placeholder="请选择班次"
            @change="handleSelectChange(scope.row, date)">
            <vxe-option v-for="option in classOptions" :key="option" :label="option" :value="option"></vxe-option>
          </vxe-select>
        </template>
      </vxe-table-column>
    </vxe-table>
    <!-- 按钮组 -->
    <div class="count_title">
      <div>以下为实时统计：</div>
    </div>
    <!-- 统计表格 -->
    <vxe-table :data="stasticTableData" border style="width: 100%; margin-top: 20px">
      <vxe-table-column field="userName" title="姓名" fixed="left" width="100">
        <template #header>
          <div>姓名</div>
        </template>
      </vxe-table-column>
      <vxe-table-column v-for="header in stasticTableHeaders" :key="header" :field="header" :title="header">
        <template #header>
          <div>{{ header }}</div>
        </template>
        <template #default="scope">
          <span :class="{'red-cell': scope.row[header] > 0}">{{ scope.row[header] }}</span>
        </template>
      </vxe-table-column>
    </vxe-table>
    <el-dialog title="请选择打印的日期区间" :visible.sync="dialogVisible" width="30%">
      <el-date-picker
        v-model="printDateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="yyyy-MM-dd"
        value-format="yyyy-MM-dd"
        :picker-options="disabledDateRange"
        style="width: 100%">
      </el-date-picker>
      <!-- 新增备注输入区域 -->
      <div style="margin-top: 15px;">
        <el-form>
          <el-form-item label="备注">
            <el-input v-model="printRemark" type="textarea" rows="3" placeholder="请输入打印备注内容"></el-input>
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="printPaper">确定</el-button>
      </span>
    </el-dialog>
    <el-dialog title="单人批量排班" :visible.sync="batchEditDialogVisible" width="560px" @closed="resetBatchEditForm">
      <el-form label-width="92px">
        <el-form-item label="排班人员">
          <el-select v-model="batchEditForm.userName" filterable placeholder="请选择人员" style="width: 100%">
            <el-option v-for="user in batchUserOptions" :key="user" :label="user" :value="user"></el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <el-tabs v-model="batchEditMode" type="border-card">
        <el-tab-pane label="按日期范围填写" name="range">
          <el-form label-width="92px">
            <el-form-item label="日期范围">
              <el-date-picker
                v-model="batchEditForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="yyyy-MM-dd"
                value-format="yyyy-MM-dd"
                style="width: 100%">
              </el-date-picker>
            </el-form-item>
            <el-form-item label="班次">
              <el-select v-model="batchEditForm.classes" filterable placeholder="请选择班次" style="width: 100%">
                <el-option v-for="option in classOptions" :key="option" :label="option" :value="option"></el-option>
              </el-select>
            </el-form-item>
          </el-form>
          <div class="batch-edit-tip">例如选择 8 月 1 日至 8 月 30 日并填写“休”，将一次性覆盖该人员这 30 天的班次。</div>
        </el-tab-pane>
        <el-tab-pane label="从 Excel 粘贴" name="paste">
          <el-form label-width="92px">
            <el-form-item label="开始日期">
              <el-select v-model="batchEditForm.pasteStartDate" filterable placeholder="单列粘贴时从此日期开始" style="width: 100%">
                <el-option v-for="date in dates" :key="date" :label="date" :value="date"></el-option>
              </el-select>
            </el-form-item>
            <el-form-item label="粘贴内容">
              <el-input v-model="batchEditForm.pasteText" type="textarea" :rows="8" placeholder="可直接从 Excel 复制：\n单列班次：休,休，休……（中英文逗号均可，从开始日期依次填写）\n两列日期和班次：2026-08-01 [Tab] 休"></el-input>
            </el-form-item>
          </el-form>
          <div class="batch-edit-tip">单列用英文逗号或中文逗号分隔，按顺序填入；两列的第一列为日期、第二列为班次。空白班次会清空对应日期的已有班次。</div>
        </el-tab-pane>
      </el-tabs>
      <span slot="footer">
        <el-button :disabled="batchSubmitting" @click="batchEditDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchSubmitting" @click="submitBatchEdit">保存批量排班</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import userApi from "@/api/user";
import classesApi from "@/api/classes";
import schedulingApi from "@/api/scheduling";
import axios from "axios";
import "vxe-table/lib/style.css";
import { mapGetters, mapMutations } from 'vuex'
import sortDailyShiftCounts from '@/utils/schedulingShiftOrder'


export default {
  data() {
    return {
      // 月份范围选择，格式为["yyyy-MM", "yyyy-MM"]
      monthRange: [
        new Date().toISOString().slice(0, 7),
        new Date().toISOString().slice(0, 7)
      ],
      tableData: [],
      dates: [],
      viewportHeight: window.innerHeight,
      classOptions: [],
      // 需要标红的班次选项
      redClassOptions: [],
      listLoading: true,
      stasticTableHeaders: [],
      stasticTableData: [],
      activeColumnField: '',
      editingCellValue: '',
      columnHighlightFrame: null,

      batchEditDialogVisible: false,
      batchEditMode: 'range',
      batchSubmitting: false,
      batchUserOptions: [],
      batchEditForm: {
        userName: '',
        dateRange: [],
        classes: '',
        pasteStartDate: '',
        pasteText: ''
      },

      dialogVisible: false,
      printDateRange: [],
      printRemark: '',// 打印备注内容
      disabledDateRange:{
        // 改为箭头函数，确保this指向Vue组件实例
        disabledDate: (date) => {
          // 如果未选择月份区间，不禁用任何日期
          if (!this.monthRange || this.monthRange.length < 2) {
            return false;
          }
          console.info( this.monthRange)
          // 解析选中的月份区间（格式：yyyy-MM）
          const [startMonth, endMonth] = this.monthRange;
          // 解析年月
          const [startYear, startMonthNum] = startMonth.split('-').map(Number);
          const [endYear, endMonthNum] = endMonth.split('-').map(Number);
          // 使用UTC方法创建日期，确保时区一致性
          const start = new Date(Date.UTC(startYear, startMonthNum - 1, 0));
          console.info('UTC start:', start.getTime());
          // 转换为当月最后一天（UTC时间23:59:59）
          const end = new Date(Date.UTC(endYear, endMonthNum, -1, 23, 59, 59));
          console.info('UTC end:', end.getTime());
          // 统一转换为UTC时间戳比较
          const currentTime = new Date(date).getTime();
          console.info('currentTime:', currentTime);
          return currentTime < start.getTime() || currentTime > end.getTime();
        }
      }
    };
  },
  computed: {
    ...mapGetters([
      'sidebar',
      'device',
      'userName'
    ]),
    // 计算开始月份和结束月份
    startMonth() {
      return this.monthRange[0];
    },
    endMonth() {
      return this.monthRange[1];
    },
    selectedDayClassCounts() {
      if (!this.dates.includes(this.activeColumnField)) return [];
      const counts = {};
      this.tableData.forEach((row) => {
        const classes = row[this.activeColumnField];
        if (classes) {
          counts[classes] = (counts[classes] || 0) + 1;
        }
      });
      return sortDailyShiftCounts(Object.keys(counts).map((classes) => ({
        classes,
        count: counts[classes]
      })));
    },
    scheduleTableHeight() {
      return Math.max(360, this.viewportHeight - 220);
    }
  },
  created() {
    console.error("当前登录:", this.userName);
    this.initPage();
    this.refreshNewTable();
    this.fetchClassTagRed();
    if (this.userName === 'admin') {
      this.fetchBatchUserOptions();
    }
  },
  mounted() {
    this.viewportHeight = window.innerHeight;
    window.addEventListener('resize', this.updateScheduleTableHeight);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateScheduleTableHeight);
    if (this.columnHighlightFrame) {
      window.cancelAnimationFrame(this.columnHighlightFrame);
    }
  },
  methods: {
    fetchBatchUserOptions() {
      return userApi.getUserPageList({ role: 1, pageIndex: 1, pageSize: 1000 })
        .then((data) => {
          const users = data && data.response && Array.isArray(data.response.list)
            ? data.response.list
            : [];
          this.batchUserOptions = users
            .map((user) => user.realName)
            .filter((userName) => !!userName);
        })
        .catch((error) => {
          console.error('获取批量排班人员失败:', error);
          this.batchUserOptions = this.tableData.map((row) => row.userName);
        });
    },
    openBatchEditDialog() {
      this.batchEditForm.userName = '';
      this.batchEditDialogVisible = true;
    },
    resetBatchEditForm() {
      this.batchEditMode = 'range';
      this.batchSubmitting = false;
      this.batchEditForm = {
        userName: '',
        dateRange: [],
        classes: '',
        pasteStartDate: '',
        pasteText: ''
      };
    },
    getRangeBatchItems() {
      const dateRange = this.batchEditForm.dateRange;
      if (!dateRange || dateRange.length !== 2) {
        throw new Error('请选择日期范围');
      }
      if (!this.batchEditForm.classes) {
        throw new Error('请选择班次');
      }
      const items = this.dates
        .filter((date) => date >= dateRange[0] && date <= dateRange[1])
        .map((date) => ({ date, classes: this.batchEditForm.classes }));
      if (!items.length || items.length !== this.getDateCount(dateRange[0], dateRange[1])) {
        throw new Error('日期范围必须在当前展示的月份内');
      }
      return items;
    },
    getDateCount(startDate, endDate) {
      const start = new Date(`${startDate}T00:00:00`);
      const end = new Date(`${endDate}T00:00:00`);
      return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    },
    normalizePastedDate(value) {
      const match = String(value || '').trim().match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
      if (!match) return '';
      return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
    },
    getPasteBatchItems() {
      const text = this.batchEditForm.pasteText.replace(/\r/g, '');
      const lines = text.split('\n');
      while (lines.length && lines[lines.length - 1] === '') {
        lines.pop();
      }
      if (!lines.length) {
        throw new Error('请粘贴班次内容');
      }
      const hasDateColumn = lines.some((line) => line.includes('\t'));
      const items = [];
      if (hasDateColumn) {
        lines.forEach((line, index) => {
          const cells = line.split('\t');
          if (cells.length < 2) {
            throw new Error(`第 ${index + 1} 行需要“日期 + 班次”两列内容`);
          }
          const date = this.normalizePastedDate(cells[0]);
          if (!date || !this.dates.includes(date)) {
            throw new Error(`第 ${index + 1} 行日期不在当前展示范围内`);
          }
          items.push({ date, classes: cells[1].trim(), sourcePosition: `第 ${index + 1} 行` });
        });
      } else {
        const classesList = text.split(/[,，、\n]+/).map((classes) => classes.trim()).filter((classes) => classes);
        if (!classesList.length) {
          throw new Error('请粘贴班次内容');
        }
        const startIndex = this.dates.indexOf(this.batchEditForm.pasteStartDate);
        if (startIndex < 0) {
          throw new Error('请选择开始日期');
        }
        if (startIndex + classesList.length > this.dates.length) {
          throw new Error('粘贴的班次数量超出当前展示日期范围');
        }
        classesList.forEach((classes, index) => {
          items.push({ date: this.dates[startIndex + index], classes, sourcePosition: `第 ${index + 1} 个班次` });
        });
      }
      const dateSet = new Set(items.map((item) => item.date));
      if (dateSet.size !== items.length) {
        throw new Error('同一天只能填写一次班次');
      }
      const invalidItem = items.find((item) => item.classes && !this.classOptions.includes(item.classes));
      if (invalidItem) {
        throw new Error(`${invalidItem.sourcePosition}（${invalidItem.date}）填写的班次“${invalidItem.classes}”不存在或已停用`);
      }
      return items;
    },
    submitBatchEdit() {
      if (!this.batchEditForm.userName) {
        this.$message.warning('请选择排班人员');
        return;
      }
      let items;
      try {
        items = this.batchEditMode === 'range' ? this.getRangeBatchItems() : this.getPasteBatchItems();
      } catch (error) {
        this.$message.warning(error.message);
        return;
      }
      this.batchSubmitting = true;
      schedulingApi.batchEditScheduling({
        userName: this.batchEditForm.userName,
        items: items.map((item) => ({ date: item.date, classes: item.classes }))
      }).then(() => {
        this.$message.success(`已保存 ${items.length} 天排班`);
        this.batchEditDialogVisible = false;
        this.fetchScheduleData();
        this.refreshNewTable();
      }).catch((error) => {
        if (!error) {
          this.$message.error('批量保存失败，请重试！');
        }
        console.error('提交批量排班失败:', error);
      }).finally(() => {
        this.batchSubmitting = false;
      });
    },
    updateScheduleTableHeight() {
      this.viewportHeight = window.innerHeight;
    },
    // 获取两个月份之间的所有日期 - 修复版本
    getDatesBetweenMonths(startMonth, endMonth) {
      const dates = [];
      const start = new Date(startMonth + '-01');
      const end = new Date(endMonth + '-01');
      
      // 计算结束月份的最后一天
      const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
      
      // 循环遍历每个月
      for (let month = new Date(start); month <= end; month.setMonth(month.getMonth() + 1)) {
        const year = month.getFullYear();
        const monthNum = month.getMonth();
        let daysInMonth;
        
        // 如果是结束月份，使用计算出的最后一天
        if (month.getFullYear() === end.getFullYear() && month.getMonth() === end.getMonth()) {
          daysInMonth = lastDayOfEndMonth.getDate();
        } else {
          daysInMonth = new Date(year, monthNum + 1, 0).getDate();
        }
        
        // 获取当月的所有日期
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, monthNum, day+1);
          dates.push(date.toISOString().slice(0, 10));
        }
      }
      
      return dates;
    },
    // 初始化页面数据
    initPage() {
      if (!this.monthRange || this.monthRange.length < 2) return;
      
      const startMonth = this.startMonth;
      const endMonth = this.endMonth;
      this.dates = this.getDatesBetweenMonths(startMonth, endMonth);
      
      Promise.all([this.fetchScheduleData(), this.fetchClassOptions()]).then(
        () => {
          this.listLoading = false;
        }
      );
    },
    // 获取排班数据
    fetchScheduleData() {
      return userApi
        .getUserList({ 
          startMonth: this.startMonth, 
          endMonth: this.endMonth 
        })
        .then((data) => {
          if (data && Array.isArray(data.response)) {
            const { response } = data;
            const userMap = new Map();
            response.forEach((item) => {
              const { userName, date, classes } = item;
              if (!userMap.has(userName)) {
                userMap.set(userName, {
                  userName,
                  ...Object.fromEntries(this.dates.map((date) => [date, ""])),
                });
              }
              userMap.get(userName)[date] = classes;
            });
            this.tableData = Array.from(userMap.values());
          } else {
            console.error("获取的排班数据结构不符合预期:", data);
          }
        })
        .catch((error) => {
          console.error("获取排班数据失败:", error);
        });
    },
    // 获取班次选项
    fetchClassOptions() {
      return classesApi
        .getClassesList()
        .then((data) => {
          if (data && Array.isArray(data.response)) {
            this.classOptions = data.response;
          } else {
            console.error("获取的班次选项数据结构不符合预期:", data);
          }
        })
        .catch((error) => {
          console.error("获取班次选项失败:", error);
        });
    },
    // 获取班次标红
    fetchClassTagRed() {
      return classesApi
        .getClassesList({ color: 1 })
        .then((data) => {
          if (data && Array.isArray(data.response)) {
            this.redClassOptions = data.response;
          } else {
            console.error("获取标红的班次选项数据结构不符合预期:", data);
          }
        })
        .catch((error) => {
          console.error("获取标红班次选项失败:", error);
        });
    },
    // 处理月份范围选择变化
    handleMonthRangeChange() {
      if (!this.monthRange || this.monthRange.length < 2) return;
      
      const startMonth = this.startMonth;
      const endMonth = this.endMonth;
      this.dates = this.getDatesBetweenMonths(startMonth, endMonth);
      this.activeColumnField = '';
      this.editingCellValue = '';
      this.fetchScheduleData();
      this.refreshNewTable();
    },
    handleCellClick({ row, column }) {
      const field = column && column.field ? column.field : '';
      const dateField = this.dates.includes(field) ? field : '';
      if (dateField && row) {
        this.editingCellValue = row[dateField] || '';
        if (this.userName === 'admin' && this.$refs.tableRef) {
          this.$refs.tableRef.setEditCell(row, dateField);
        }
      }
      this.updateActiveColumn(dateField);
    },
    handleHeaderCellClick({ column }) {
      const field = column && column.field ? column.field : '';
      this.updateActiveColumn(this.dates.includes(field) ? field : '');
      this.editingCellValue = '';
    },
    updateActiveColumn(field) {
      if (this.columnHighlightFrame) {
        window.cancelAnimationFrame(this.columnHighlightFrame);
      }
      this.columnHighlightFrame = window.requestAnimationFrame(() => {
        this.activeColumnField = field;
        this.columnHighlightFrame = null;
      });
    },
    getCellClassName({ column }) {
      return this.activeColumnField && column && column.field === this.activeColumnField
        ? 'column-active-cell'
        : '';
    },
    getHeaderCellClassName({ column }) {
      return this.activeColumnField && column && column.field === this.activeColumnField
        ? 'column-active-cell'
        : '';
    },
    // 处理下拉选择变化
    handleSelectChange(row, date) {
      const previousClasses = this.editingCellValue;
      const payload = {
        userName: row.userName,
        date,
        month: date.slice(0, 7),
        classes: row[date] || ''
      };
      if (payload.classes === previousClasses) return;
      if (payload.classes && !this.classOptions.includes(payload.classes)) {
        this.$set(row, date, previousClasses);
        this.$message.warning(`日期 ${date} 填写的班次“${payload.classes}”不存在或已停用`);
        return;
      }

      schedulingApi
        .editSchedulingCell(payload)
        .then(() => {
          this.editingCellValue = payload.classes;
          this.refreshNewTable();
        })
        .catch((error) => {
          this.$set(row, date, previousClasses);
          if (!error) {
            this.$message.error("保存失败，请重试！");
          }
          console.error("提交单元格排班失败:", error);
        });
    },
    // 根据日期获取星期几
    getWeekday(date) {
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const d = new Date(date);
      return weekdays[d.getDay()];
    },
    // 导出 Excel
    exportExcel() {
      const param = {
        startMonth: this.startMonth,
        endMonth: this.endMonth
      };
      axios({
        url: "/api/admin/scheduling/export",
        responseType: "blob",
        params: param,
      }).then((res) => {
        const blob = new Blob([res.data]);
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = blobUrl;
        a.download = `${this.startMonth}至${this.endMonth}排班表.xls`;
        a.click();
      });
    },
    // 刷新新表格
    refreshNewTable() {
      if (!this.monthRange || this.monthRange.length < 2) return;
      
      const startMonth = this.startMonth;
      const endMonth = this.endMonth;
      
      // 获取新表格的表头
      classesApi
        .getClassesList({ isCount: 1 })
        .then((data) => {
          if (data && Array.isArray(data.response)) {
            this.stasticTableHeaders = data.response;
            // 获取新表格的数据
            schedulingApi
              .schedulingStastic({ 
                startMonth: startMonth, 
                endMonth: endMonth 
              })
              .then((res) => {
                if (res && Array.isArray(res.response)) {
                  const userMap = new Map();
                  res.response.forEach((item) => {
                    const { userName, classes, count } = item;
                    if (!userMap.has(userName)) {
                      userMap.set(userName, {
                        userName,
                        ...Object.fromEntries(
                          this.stasticTableHeaders.map((header) => [header, 0])
                        ),
                      });
                    }
                    userMap.get(userName)[classes] = count;
                  });
                  this.stasticTableData = Array.from(userMap.values());
                } else {
                  console.error("获取的统计数据结构不符合预期:", res);
                }
              })
              .catch((error) => {
                console.error("获取统计数据失败:", error);
              });
          } else {
            console.error("获取的表头数据结构不符合预期:", data);
          }
        })
        .catch((error) => {
          console.error("获取表头数据失败:", error);
        });
    },
    // 格式化日期为 M月d日 格式
    formatDate(date) {
      const d = new Date(date);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      return `${month}月${day}日`;
    },
    // 高亮文本，将需要标红的部分用红色字体显示
    highlightText(text) {
      let result = text;
      this.redClassOptions.forEach((option) => {
        // Add null check before using replace()
        if (!option) return;
        const escapedOption = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedOption, "g");
         if (result) {
          result = result.replace(
            regex,
            `<span style="color: red;">${option}</span>`
          );
        }
      });
      return result;
    },
    // 刷新页面数据
    refreshData() {
      this.initPage();
      this.refreshNewTable();
      this.fetchClassTagRed();
    },
    printPaper() {
      if (this.printDateRange.length === 0) {
        console.error("请选择日期区间");
        return;
      }
      const [startDate, endDate] = this.printDateRange;
      const columns = [{ field: "userName" }];
      const dateColumns = this.dates.filter(date => date >= startDate && date <= endDate).map(i => {
        return { field: i };
      });
      const printColuns = columns.concat(dateColumns);
  
      const $table = this.$refs.tableRef;
      if ($table) {
        $table.print({
          columns: printColuns,
          beforePrintMethod: ({ content }) => {
            let parser = new DOMParser();
            let dom = parser.parseFromString(content, "text/html");
            const [startYearMonth, endYearMonth] = this.monthRange;
            const title = `重庆市巴南区接龙镇中心卫生院${startDate}至${endDate}外科护士排班`;
            let titleElement = document.createElement('div');
            titleElement.textContent = title;
            titleElement.style.textAlign = 'center';
            titleElement.style.fontSize = '20px';
            titleElement.style.fontWeight = 'bold';
            titleElement.style.marginBottom = '10px';
            dom.body.insertBefore(titleElement, dom.body.firstChild);
            let divs = dom.querySelectorAll("td div");
  
            divs.forEach((div) => {
              this.redClassOptions.forEach((option) => {
                // 添加空值检查（修复核心代码）
                if (!option) return;
                // 添加正则特殊字符转义
                const escapedOption = option.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                // 使用转义后的选项创建正则表达式
                const regex = new RegExp(escapedOption, "g");
                div.innerHTML = div.innerHTML.replace(
                  regex,
                  `<span style="color:red">${option}</span>`
                );
              });
            });
  
            if (this.printRemark) {
              const remarkElement = document.createElement('div');
              remarkElement.style.marginTop = '20px';
              remarkElement.style.fontWeight = 'bold';
              remarkElement.innerHTML = `<div style="font-size: 16px; margin-bottom: 5px;">备注：</div><div style="white-space: pre-wrap;">${this.printRemark}</div>`;
              dom.body.appendChild(remarkElement);
            }
  
            const html = dom.body.innerHTML;
            return html;
          },
        });
      }
    },
  },
};
</script>

<style scoped>
.container {
  padding: 10px;
}

.count_title {
  margin-top: 10px;
  text-align: left;
  color: brown;
}

/* 让表头不换行 */
.vxe-table .vxe-table--header th {
  white-space: nowrap;
}
.flexBox {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.schedule-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  padding: 4px 0 8px;
  background: #fff;
}
.daily-shift-summary {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 6px 9px;
  overflow-x: auto;
  background: #f5faff;
  border: 1px solid #b8dcff;
  border-radius: 4px;
}
.daily-shift-chip {
  flex: 0 0 auto;
  padding: 2px 7px;
  color: #4a6077;
  font-size: 12px;
  line-height: 18px;
  background: #fff;
  border: 1px solid #dfebf7;
  border-radius: 10px;
}
.daily-shift-chip b {
  margin-left: 2px;
  color: #2774be;
}
.daily-shift-chip--red,
.daily-shift-chip--red b {
  color: red;
}
.action-buttons {
  flex: 0 0 auto;
}
.batch-edit-tip {
  color: #7a8491;
  font-size: 12px;
  line-height: 20px;
}
.red-cell {
  color: red;
}
::v-deep .vxe-table .column-active-cell {
  background-color: #e8f4ff !important;
}
</style>
