<template>
  <div class="container">
    <!-- 年月选择器 -->
    <el-date-picker
      v-model="selectedMonth"
      type="month"
      format="yyyy-MM"
      value-format="yyyy-MM"
      @change="handleMonthChange"
      placeholder="选择年月"
    ></el-date-picker>
    <!-- 导出按钮 -->
    <el-button type="primary" @click="exportExcel" style="float: right"
      >导出 Excel</el-button
    >
    <!-- 表格 -->
    <el-table :data="tableData" border style="width: 100%">
      <el-table-column label="姓名" prop="userName" fixed width="80">
        <template #header>
          <div>姓名</div>
          <div></div>
        </template>
      </el-table-column>
      <el-table-column
        v-for="date in dates"
        :key="date"
        :prop="date"
        width="100"
      >
        <template #header>
          <div>{{ date }}</div>
          <div>{{ getWeekday(date) }}</div>
        </template>
        <template #default="{ row }">
          <el-select
            v-model="row[date]"
            filterable
            placeholder="请选择班次"
            @change="handleSelectChange(row, date)"
            class="hide-select-arrow"
          >
            <el-option
              v-for="(option,index) in classOptions"
              :key="index"
              :label="option"
              :value="option"
            ></el-option>
          </el-select>
        </template>
      </el-table-column>
    </el-table>
    <!-- 按钮组 -->
    <div class="button-group">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSubmit">提交</el-button>
    </div>
     <!-- 统计表格 -->
    <el-table :data="stasticTableData" border style="width: 100%; margin-top: 20px">
      <el-table-column label="姓名" prop="userName" fixed width="100">
        <template #header>
          <div>姓名</div>
        </template>
      </el-table-column>
      <el-table-column
        v-for="header in stasticTableHeaders"
        :key="header"
        :label="header"
        :prop="header"
      >
        <template #header>
          <div>{{ header }}</div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
import userApi from "@/api/user";
import classesApi from "@/api/classes";
import schedulingApi from "@/api/scheduling";
import axios from 'axios'

export default {
  data() {
    return {
      selectedMonth: new Date().toISOString().slice(0, 7),
      tableData: [],
      dates: [],
      classOptions: [],
      listLoading: true,
      stasticTableHeaders: [],
      stasticTableData: []
    };
  },
  created() {
    this.initPage();
    this.refreshNewTable();
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
            console.error("获取的班次选项数据结构不符合预期:", response);
          }
        })
        .catch((error) => {
          console.error("获取班次选项失败:", error);
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
      // 可以在这里添加额外的逻辑，例如验证等
    },
    // 处理取消按钮点击
    handleCancel() {
      // 可以在这里添加取消操作的逻辑
    },
    // 处理提交按钮点击
    handleSubmit() {
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
        url: '/api/admin/scheduling/export',
        responseType: 'blob',
        params: param
      }).then(res => {
        console.log(res.data)
        const blob = new Blob([res.data])
        const blobUrl = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = blobUrl
        a.download = 'aaa.xls'
        a.click()
      })
    },
    // 刷新新表格
    refreshNewTable() {
      // 获取新表格的表头
      classesApi.getClassesList({ isCount: 1 }).then((data) => {
        if (data && Array.isArray(data.response)) {
          this.stasticTableHeaders = data.response;
          // 获取新表格的数据
          schedulingApi.schedulingStastic({month :this.selectedMonth}).then((res) => {
            if (res && Array.isArray(res.response)) {
              const userMap = new Map();
              res.response.forEach((item) => {
                const { userName, classes, count } = item;
                if (!userMap.has(userName)) {
                  userMap.set(userName, {
                    userName,
                    ...Object.fromEntries(this.stasticTableHeaders.map((header) => [header, 0]))
                  });
                }
                userMap.get(userName)[classes] = count;
              });
              this.stasticTableData = Array.from(userMap.values());
            } else {
              console.error("获取的统计数据结构不符合预期:", res);
            }
          }).catch((error) => {
            console.error("获取统计数据失败:", error);
          });
        } else {
          console.error("获取的表头数据结构不符合预期:", data);
        }
      }).catch((error) => {
        console.error("获取表头数据失败:", error);
      });
    }
  },
};
</script>

<style scoped>
.container {
  padding: 20px;
}

.button-group {
  margin-top: 20px;
  text-align: right;
}

/* 隐藏下拉箭头的样式 */
::v-deep .el-input__suffix {
  display: none;
}
::v-deep .el-input--suffix .el-input__inner {
  padding-right: 4px;
}

/* 让表头不换行 */
.el-table__header th {
  white-space: nowrap;
}
</style>
