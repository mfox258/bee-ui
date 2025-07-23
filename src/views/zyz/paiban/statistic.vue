<template>
  <div class="container">
    <div class="flexBox">
      <!-- 月份单选器 -->
      <el-date-picker
        v-model="monthRange"
        type="month"
        placeholder="选择月份"
        format="yyyy-MM"
        value-format="yyyy-MM"
        @change="handleMonthRangeChange"
        style="margin-right: 10px"
      >
      </el-date-picker>
      <el-button type="primary" @click="fetchStatisticData">刷新统计</el-button>
      <el-button type="primary" @click="exportExcel" style="margin-left: 10px">导出Excel</el-button>
      <!-- 打印按钮 -->
      <el-button type="primary" @click="dialogVisible=true" style="margin-left: 10px">打印</el-button>
    </div>
    <!-- 打印对话框 -->
    <el-dialog title="打印设置" :visible.sync="dialogVisible" width="30%">
      <!-- 备注输入区域 -->
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
    <!-- 统计表格 -->
     <vxe-table 
      ref="statisticTable"
      :data="statisticData"
      border 
      style="width: 100%; margin-top: 20px"
      :loading="listLoading"
      :edit-config="{trigger: 'click', mode: 'cell', showStatus: true}"
      @cell-change="handleCellChange"
    >
      <!-- 固定可编辑列 -->
      <vxe-table-column field="userName" title="姓名" fixed="left" width="100"></vxe-table-column>
      <!-- 动态班次列（只读） -->
      <vxe-table-column v-for="header in tableHeaders" :key="header" :field="header" :title="header" :edit-visible="false"></vxe-table-column>
      <!-- 固定可编辑列 -->
      <vxe-table-column field="total" title="总合计" width="80"></vxe-table-column>
      <vxe-table-column field="qualityControl" title="质控" width="80" :edit-render="{name: 'input'}"></vxe-table-column>
      <vxe-table-column field="jobRank" title="职称" width="80" :edit-render="{name: 'input'}"></vxe-table-column>
      <vxe-table-column field="nursingQuality" title="护理质量" width="100" :edit-render="{name: 'input'}"></vxe-table-column>
      <vxe-table-column field="leaveDays" title="休假" width="80" :edit-visible="false"></vxe-table-column>
    </vxe-table>
  </div>
</template>

<script>
import schedulingApi from "@/api/scheduling";
import classesApi from "@/api/classes";
import XLSX from 'xlsx';
import { mapGetters } from 'vuex';

export default {
  name: 'NursingStatistic',
  data() {
    return {
      monthRange: new Date().toISOString().slice(0, 7), // 改为单个月份字符串
      tableHeaders: [], // 统计表头（班次类型）
      statisticData: [], // 统计数据
      listLoading: false,
      // 打印相关变量
      dialogVisible: false,
      printRemark: ''
    };
  },
  computed: {
    ...mapGetters(['userName']),
    // 移除startMonth和endMonth，直接使用monthRange
  },
  created() {
    this.initPage();
  },
  methods: {
    initPage() {
      // 获取统计表头（班次类型）
      this.fetchTableHeaders();
      // 获取初始统计数据
      this.fetchStatisticData();
    },

    // 获取统计表头（班次类型）
    fetchTableHeaders() {
      classesApi.getClassesList({ isCount: 2 })
        .then((data) => {
          if (data && Array.isArray(data.response)) {
            this.tableHeaders = data.response;
          }
        })
        .catch((error) => {
          console.error("获取统计表头失败:", error);
          this.$message.error("获取班次类型失败");
        });
    },

    // 获取统计数据
    fetchStatisticData() {
      if (!this.monthRange) return;

      this.listLoading = true;
      schedulingApi.schedulingStastic1({
        startMonth: this.monthRange ,
        endMonth: this.monthRange
      })
        .then((res) => {
          this.listLoading = false;
          if (res && Array.isArray(res.response)) {
            this.formatStatisticData(res.response);
          }
        })
        .catch((error) => {
          this.listLoading = false;
          console.error("获取统计数据失败:", error);
          this.$message.error("获取统计数据失败");
        });
    },

    // 格式化统计数据（修改后）
    formatStatisticData(rawData) {
      const userMap = new Map();
      // 创建旧数据映射，用于保留固定列数据
      const oldUserDataMap = new Map(this.statisticData.map(user => [user.userName, user]));

      // 处理新数据
      rawData.forEach(item => {
        const { userName, classes, count } = item;
        
        // 初始化或更新用户数据
        if (!userMap.has(userName)) {
          // 从旧数据获取固定列值（如果存在）
          const oldUserData = oldUserDataMap.get(userName) || {};
      
          userMap.set(userName, {
            userName,
            // 当classes为'总合计'时直接将count赋值给total
            total: 0, // 确保count转为数字类型
            // 保留固定列数据
            qualityControl: oldUserData.qualityControl || '',
            jobRank: oldUserData.jobRank || '',
            nursingQuality: oldUserData.nursingQuality || '100',
            leaveDays: 0, // 休假列将刷新
            ...Object.fromEntries(this.tableHeaders.map(header => [header, 0]))
          });
        }
        
        // 更新动态列数据
        const userData = userMap.get(userName);
        if (userData[classes] !== undefined) {
          userData[classes] = count;
        }
        // 根据classes类型设置total和leaveDays
        if (classes === '总合计') {
          userData.total = Number(count); // 匹配总合计
        } else if (classes === '休假') {
          userData.leaveDays = Number(count); // 匹配休假
        }else if (classes === '职称') {
          userData.jobRank =  Number(count); // 匹配职称
        }
      });
        this.statisticData = Array.from(userMap.values());
      },

    // 月份范围变化处理
    handleMonthRangeChange() {
      this.fetchStatisticData();
    },

    // 导出Excel
    exportExcel() {
      if (this.statisticData.length === 0) {
        this.$message.warning("没有可导出的数据");
        return;
      }

      // 准备Excel数据
      const headers = ['姓名', ...this.tableHeaders, '总合计', '质控', '职称', '护理质量', '休假'];
      const excelData = this.statisticData.map(row => {
        const rowData = { 
          '姓名': row.userName,
          '总合计': row.total,
          '质控': row.qualityControl,
          '职称': row.jobRank,
          '护理质量': row.nursingQuality,
          '休假': row.leaveDays
        };
        // 添加各班次统计
        this.tableHeaders.forEach(header => {
          rowData[header] = row[header] || 0;
        });
        return rowData;
      });

      // 生成Excel文件
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, '护理工作量统计');
      XLSX.writeFile(workbook, `${this.monthRange}护理工作量统计.xlsx`); // 使用单个月份
    },

    // 打印方法
    printPaper() {
      const $table = this.$refs.statisticTable;
      if (!$table) return;
  
      // 解析选择的年月（修复错误，使用monthRange）
      const [selectedYear, selectedMonth] = this.monthRange.split('-');
      const monthText = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'][parseInt(selectedMonth) - 1];
      const title = `${selectedYear}年外科${monthText}护理工作量统计`;
  
      $table.print({
        // 打印之前拼接自定义模板
        beforePrintMethod: ({ content }) => {
          // 创建DOM解析器
          const parser = new DOMParser();
          const dom = parser.parseFromString(content, "text/html");

          // 创建标题元素
          const titleElement = document.createElement('div');
          titleElement.textContent = title;
          titleElement.style.textAlign = 'center';
          titleElement.style.fontSize = '20px';
          titleElement.style.fontWeight = 'bold';
          titleElement.style.marginBottom = '15px';

          // 添加备注信息
          if (this.printRemark) {
            const remarkElement = document.createElement('div');
            remarkElement.textContent = `备注: ${this.printRemark}`;
            remarkElement.style.textAlign = 'right';
            remarkElement.style.marginTop = '10px';
            dom.body.appendChild(remarkElement);
          }

          // 将标题插入到表格之前
          dom.body.insertBefore(titleElement, dom.body.firstChild);

          return dom.body.innerHTML;
        }
      });
      this.dialogVisible = false;
    },

    // 处理单元格编辑保存
    handleCellChange({ row, column, oldValue, newValue }) {
      // 只处理需要保存的固定列
      const editableFields = ['qualityControl', 'title', 'nursingQuality'];
      if (!editableFields.includes(column.property)) return;

      // 调用保存接口
      schedulingApi.statisticEdit({
        userName: row.userName,
        field: column.property,
        value: newValue,
        month: this.startMonth
      }).then(response => {
        if (response.success) {
          this.$message.success('保存成功');
        } else {
          this.$message.error('保存失败，请重试');
          // 恢复旧值
          row[column.property] = oldValue;
        }
      }).catch(error => {
        console.error('保存失败:', error);
        this.$message.error('保存失败，请重试');
        // 恢复旧值
        row[column.property] = oldValue;
      });
    }
  }
};
</script>

<style scoped>
.container {
  padding: 15px;
}
.flexBox {
  display: flex;
  margin-bottom: 15px;
  align-items: center;
}
</style>