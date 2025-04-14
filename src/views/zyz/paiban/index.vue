<template>
  <div class="container">
    <div class="flexBox">
      <!-- 年月选择器 -->
      <el-date-picker v-model="selectedMonth" type="month" format="yyyy-MM" value-format="yyyy-MM"
        @change="handleMonthChange" placeholder="选择年月"></el-date-picker>
      <div>
        <el-button type="primary" @click="dialogVisible=true">打印</el-button>
        <!-- 导出按钮 -->
        <el-button type="primary" @click="exportExcel">导出 Excel</el-button>
      </div>
    </div>
    <!-- 表格 -->
    <vxe-table ref="tableRef" :data="tableData" border style="width: 100%;margin-top:5px" :edit-config="{
      trigger: 'click',
      mode: 'cell'
    }" :row-config="{isCurrent: true}" :mouse-config="{highlight: true}">
      <vxe-table-column field="userName" title="姓名" fixed="left" width="80">
        <template #header>
          <div>姓名</div>
          <div></div>
        </template>
      </vxe-table-column>
      <vxe-table-column v-for="date in dates" :key="date" :field="date" width="100" :title="formatDate(date)+' '+getWeekday(date)" :edit-render="{}">
        <template #header>
          <!-- 格式化日期显示 -->
          <span>{{ formatDate(date) }}</span>
          <div>{{ getWeekday(date) }}</div>
        </template>
        <!-- 默认渲染模板，使用 highlightText 方法处理单元格内容 -->
        <template #default="scope">
          <span v-html="highlightText(scope.row[date])"></span>
        </template>
        <template #edit="scope">
          <vxe-select v-model="scope.row[date]" filterable placeholder="请选择班次"
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
      </vxe-table-column>
    </vxe-table>
    <el-dialog title="请选择打印的列" :visible.sync="dialogVisible" width="30%">
      <el-select v-model="selectDates" multiple placeholder="请选择" style="width:100%" collapse-tags>
        <el-option v-for="item in dates" :key="item" :label="item" :value="item">
        </el-option>
      </el-select>
      <span slot="footer">
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="printPaper">确定</el-button>
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

export default {
  data() {
    return {
      selectedMonth: new Date().toISOString().slice(0, 7),
      tableData: [],
      dates: [],
      classOptions: [],
      // 需要标红的班次选项
      redClassOptions: [],
      listLoading: true,
      stasticTableHeaders: [],
      stasticTableData: [],

      dialogVisible: false,
      selectDates: [],
    };
  },
  created() {
    this.initPage();
    this.refreshNewTable();
    // 获取需要标红的班次选项
    this.fetchClassTagRed();
  },
  methods: {
    // 获取当前月的所有日期
    getDatesInMonth(year, month) {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dateArray = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(year, month, i + 1);
        const formattedDate = date.toISOString().slice(0, 10);
        dateArray.push(formattedDate);
      }
      return dateArray;
    },
    // 初始化页面数据
    initPage() {
      const [year, month] = this.selectedMonth.split("-");
      this.dates = this.getDatesInMonth(parseInt(year), parseInt(month) - 1);
      Promise.all([this.fetchScheduleData(), this.fetchClassOptions()]).then(
        () => {
          this.listLoading = false;
        }
      );
    },
    // 获取排班数据
    fetchScheduleData() {
      return userApi
        .getUserList({ queryMonth: this.selectedMonth })
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
    // 处理年月选择变化
    handleMonthChange() {
      const [year, month] = this.selectedMonth.split("-");
      this.dates = this.getDatesInMonth(parseInt(year), parseInt(month) - 1);
      this.fetchScheduleData();
      this.refreshNewTable();
    },
    // 处理下拉选择变化
    handleSelectChange(row, date) {
      const schedulingInfos = [];
      this.tableData.forEach((row) => {
        const { userName } = row;
        this.dates.forEach((date) => {
          if (row[date]) {
            schedulingInfos.push({
              classes: row[date],
              userName,
              date,
              month: this.selectedMonth,
            });
          }
        });
      });
      schedulingApi
        .editScheduling({
          month: this.selectedMonth,
          schedulingInfos,
        })
        .then(() => {
          console.log("提交成功");
          this.refreshNewTable();
        })
        .catch((error) => {
          Message.error("提交失败，请重试！");
          this.refreshData;
          console.error("提交失败:", error);
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
        month: this.selectedMonth,
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
        a.download = "aaa.xls";
        a.click();
      });
    },
    // 刷新新表格
    refreshNewTable() {
      // 获取新表格的表头
      classesApi
        .getClassesList({ isCount: 1 })
        .then((data) => {
          if (data && Array.isArray(data.response)) {
            this.stasticTableHeaders = data.response;
            // 获取新表格的数据
            schedulingApi
              .schedulingStastic({ month: this.selectedMonth })
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
        // 使用正则表达式匹配需要标红的班次选项
        const regex = new RegExp(option, "g");
        // 将匹配到的部分用红色字体包裹
        result = result.replace(
          regex,
          `<span style="color: red;">${option}</span>`
        );
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
      const columns = [{ field: "userName" }];
      const dateColumns = this.selectDates.map((i) => {
        return { field: i };
      });
      const printColuns = columns.concat(dateColumns);

      const $table = this.$refs.tableRef;
      if ($table) {
        $table.print({
          // 打印指定列
          columns: printColuns,
          // 打印之前拼接自定义模板
          beforePrintMethod: ({ content }) => {
            // 使用 DOMParser 来解析字符串
            let parser = new DOMParser();
            let dom = parser.parseFromString(content, "text/html");

            // 模糊查找所有包含 <div> 的元素
            let divs = dom.querySelectorAll("td div");

            // 遍历找到的所有 <div> 元素
            divs.forEach((div) => {
               this.redClassOptions.forEach((option) => {
              const regex = new RegExp(option, "g");
              div.innerHTML = div.innerHTML.replace(
                regex,
                `<span style="color:red">${option}</span>`
              );
               })
            });
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
  justify-content: space-between;
}
</style>
