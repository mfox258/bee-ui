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
      <!-- 下载考勤表按钮 -->
      <el-button type="primary" @click="downloadAttendanceDialogVisible=true" style="margin-left: 10px">下载考勤表</el-button>
      <!-- 下载加班情况表按钮 -->
      <el-button type="primary" @click="downloadOvertimeDialogVisible=true" style="margin-left: 10px">下载加班情况表</el-button>
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
    <!-- 下载考勤表对话框 -->
    <el-dialog title="选择年月" :visible.sync="downloadAttendanceDialogVisible" width="30%">
      <div style="margin-top: 15px;">
        <el-form>
          <el-form-item label="选择月份">
            <el-date-picker
              v-model="selectedMonthRange"
              type="month"
              placeholder="选择月份"
              format="yyyy-MM"
              value-format="yyyy-MM"
              style="width: 100%;"
            >
            </el-date-picker>
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer">
        <el-button @click="downloadAttendanceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="downloadAttendance">确定</el-button>
      </span>
    </el-dialog>
    <!-- 下载加班情况表对话框 -->
    <el-dialog title="选择年月" :visible.sync="downloadOvertimeDialogVisible" width="30%">
      <div style="margin-top: 15px;">
        <el-form>
          <el-form-item label="选择月份">
            <el-date-picker
              v-model="selectedOvertimeMonthRange"
              type="month"
              placeholder="选择月份"
              format="yyyy-MM"
              value-format="yyyy-MM"
              style="width: 100%;"
            >
            </el-date-picker>
          </el-form-item>
        </el-form>
      </div>
      <span slot="footer">
        <el-button @click="downloadOvertimeDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="downloadOvertime">确定</el-button>
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
      <vxe-table-column field="sumDays" title="总天数" width="80" :edit-visible="false">
        <template #header>
          <span class="blue-cell">总天数</span>
        </template>
        <template #default="scope">
          <span class="blue-cell">{{ scope.row.sumDays }}</span>
        </template>
      </vxe-table-column>

    </vxe-table>
  </div>
</template>

<script>
import schedulingApi from "@/api/scheduling";
import classesApi from "@/api/classes";
import XLSX from 'xlsx';
import { mapGetters } from 'vuex';
import axios from 'axios'; // 直接导入axios库

export default {
  name: 'NursingStatistic',
  data() {
    return {
      monthRange: new Date().toISOString().slice(0, 7), // 改为单个月份字符串
      selectedMonthRange: new Date().toISOString().slice(0, 7), // 下载考勤表用的月份选择
      selectedOvertimeMonthRange: new Date().toISOString().slice(0, 7), // 下载加班情况表用的月份选择
      tableHeaders: [], // 统计表头（班次类型）
      statisticData: [], // 统计数据
      listLoading: false,
      // 打印相关变量
      dialogVisible: false,
      printRemark: '',
      // 下载考勤表相关变量
      downloadAttendanceDialogVisible: false,
      // 下载加班情况表相关变量
      downloadOvertimeDialogVisible: false
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
            sumDays: 0,
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
        }else if (classes === '总天数') {
          userData.sumDays =  Number(count); // 匹配职称
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
          '休假': row.leaveDays,
          '总天数': row.sumDays
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
  
      // 解析选择的年月
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
  
          // 设置总天数列标题和内容为蓝色
          const thElements = dom.querySelectorAll('th');
          thElements.forEach(th => {
            if (th.textContent.trim() === '总天数') {
              th.style.color = 'blue';
            }
          });
  
          const tdElements = dom.querySelectorAll('td');
          tdElements.forEach(td => {
            // 检查该单元格是否属于总天数列
            const thIndex = Array.from(td.parentElement.children).indexOf(td);
            const correspondingTh = thElements[thIndex];
            if (correspondingTh && correspondingTh.textContent.trim() === '总天数') {
              td.style.color = 'blue';
            }
          });
  
          return dom.body.innerHTML;
        }
      });
      this.dialogVisible = false;
    },

    // 下载考勤表 - 修复版本
    downloadAttendance() {
      if (!this.selectedMonthRange) {
        this.$message.warning("请选择要下载的月份");
        return;
      }
      
      // 解析选择的年月
      const [year, month] = this.selectedMonthRange.split('-');
      
      try {
        // 直接使用导入的axios，并设置responseType为blob
        axios({
          url: '/api/admin/scheduling/download/attendance',
          method: 'get',
          responseType: 'blob',
          params: {
            year: parseInt(year),
            month: parseInt(month)
          },
          baseURL: process.env.VUE_APP_URL,
          withCredentials: true,
          timeout: 30000
        }).then(response => {
          // 检查响应是否成功
          if (response.status === 200) {
            // 尝试解析响应数据，检查是否是JSON格式的错误信息
            const blob = new Blob([response.data]);
            
            // 创建一个FileReader来读取blob内容
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                // 尝试将响应解析为JSON
                const errorData = JSON.parse(e.target.result);
                if (errorData.code === 500 && errorData.msg) {
                  // 如果是JSON格式且包含错误信息，显示错误
                  this.$message.error(errorData.msg);
                } else {
                  // 否则，正常处理文件下载
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = blobUrl;
                  a.download = `${year}年${month}月考勤表.xls`;
                  document.body.appendChild(a);
                  a.click();
                  
                  // 清理
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
                  
                  this.$message.success("考勤表下载成功");
                  this.downloadAttendanceDialogVisible = false;
                }
              } catch (jsonError) {
                // 如果解析JSON失败，说明是正常的文件流
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = `${year}年${month}月考勤表.xls`;
                document.body.appendChild(a);
                a.click();
                
                // 清理
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
                this.$message.success("考勤表下载成功");
                this.downloadAttendanceDialogVisible = false;
              }
            };
            reader.readAsText(blob);
          } else {
            // 状态码不是200，显示错误
            this.$message.error('下载失败，服务器返回错误状态码');
          }
        }).catch(error => {
          console.error("下载考勤表失败:", error);
          // 从错误响应中提取具体错误信息
          let errorMsg = '下载失败，请重试';
          if (error.response && error.response.data) {
            if (error.response.data.msg) {
              errorMsg = error.response.data.msg;
            } else if (error.response.data.message) {
              errorMsg = error.response.data.message;
            } else {
              // 尝试将错误数据转换为JSON字符串
              try {
                const errorData = JSON.parse(new TextDecoder().decode(error.response.data));
                if (errorData.msg) {
                  errorMsg = errorData.msg;
                }
              } catch (e) {
                // 转换失败，使用默认错误信息
              }
            }
          } else if (error.message) {
            errorMsg = error.message;
          }
          this.$message.error(errorMsg);
        });
      } catch (error) {
        console.error("下载考勤表过程中发生错误:", error);
        this.$message.error('下载过程中发生错误');
      }
    },

    // 下载加班情况表
    downloadOvertime() {
      if (!this.selectedOvertimeMonthRange) {
        this.$message.warning("请选择要下载的月份");
        return;
      }
      
      // 解析选择的年月
      const [year, month] = this.selectedOvertimeMonthRange.split('-');
      
      try {
        // 直接使用导入的axios，并设置responseType为blob
        axios({
          url: '/api/admin/scheduling/download/overtime',
          method: 'get',
          responseType: 'blob',
          params: {
            year: parseInt(year),
            month: parseInt(month)
          },
          baseURL: process.env.VUE_APP_URL,
          withCredentials: true,
          timeout: 30000
        }).then(response => {
          // 检查响应是否成功
          if (response.status === 200) {
            // 尝试解析响应数据，检查是否是JSON格式的错误信息
            const blob = new Blob([response.data]);
            
            // 创建一个FileReader来读取blob内容
            const reader = new FileReader();
            reader.onload = (e) => {
              try {
                // 尝试将响应解析为JSON
                const errorData = JSON.parse(e.target.result);
                if (errorData.code === 500 && errorData.msg) {
                  // 如果是JSON格式且包含错误信息，显示错误
                  this.$message.error(errorData.msg);
                } else {
                  // 否则，正常处理文件下载
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = blobUrl;
                  a.download = `${year}年${month}月加班情况表.xls`;
                  document.body.appendChild(a);
                  a.click();
                  
                  // 清理
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
                  
                  this.$message.success("加班情况表下载成功");
                  this.downloadOvertimeDialogVisible = false;
                }
              } catch (jsonError) {
                // 如果解析JSON失败，说明是正常的文件流
                const blobUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = blobUrl;
                a.download = `${year}年${month}月加班情况表.xls`;
                document.body.appendChild(a);
                a.click();
                
                // 清理
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
                this.$message.success("加班情况表下载成功");
                this.downloadOvertimeDialogVisible = false;
              }
            };
            reader.readAsText(blob);
          } else {
            // 状态码不是200，显示错误
            this.$message.error('下载失败，服务器返回错误状态码');
          }
        }).catch(error => {
          console.error("下载加班情况表失败:", error);
          // 从错误响应中提取具体错误信息
          let errorMsg = '下载失败，请重试';
          if (error.response && error.response.data) {
            if (error.response.data.msg) {
              errorMsg = error.response.data.msg;
            } else if (error.response.data.message) {
              errorMsg = error.response.data.message;
            } else {
              // 尝试将错误数据转换为JSON字符串
              try {
                const errorData = JSON.parse(new TextDecoder().decode(error.response.data));
                if (errorData.msg) {
                  errorMsg = errorData.msg;
                }
              } catch (e) {
                // 转换失败，使用默认错误信息
              }
            }
          } else if (error.message) {
            errorMsg = error.message;
          }
          this.$message.error(errorMsg);
        });
      } catch (error) {
        console.error("下载加班情况表过程中发生错误:", error);
        this.$message.error('下载过程中发生错误');
      }
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
.blue-cell {
  color: blue !important;
}
</style>