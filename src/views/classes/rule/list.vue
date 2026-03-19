<template>
  <div class="rule-list-container">
    <div class="rule-list-header">
      <router-link :to="{ path: '/classes/rule/edit', query: { classes: classes } }">
        <el-button type="primary" size="small">新增</el-button>
      </router-link>
    </div>

    <el-table v-loading="listLoading" :data="tableData" border fit highlight-current-row style="width: 100%" class="rule-table">
      <el-table-column prop="classes" label="班次" width="120" align="center" />
      <el-table-column prop="targetClasses" label="目标班次" width="120" align="center" />
      <el-table-column label="比例" width="100" align="center">
        <template slot-scope="{ row }">{{ row.ratio*100 }}%</template>
      </el-table-column>
      <el-table-column width="160" label="操作" align="center">
        <template slot-scope="{ row }">
          <router-link :to="{ path: '/classes/rule/edit', query: { id: row.id, classes: classes } }" style="margin-right: 8px;">
            <el-button size="mini" type="primary" plain>编辑</el-button>
          </router-link>
          <el-button size="mini" type="danger" @click="deleteClassRule(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="pagination-container" v-show="total > 0">
      <pagination :total="total" :page.sync="queryParam.pageIndex" :limit.sync="queryParam.pageSize"
                  @pagination="search" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import Pagination from '@/components/Pagination'
import classesRuleApi from '@/api/classesRule'

export default {
  components: { Pagination },
  props: {
    classes: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      queryParam: {
        keyword: '',
        classes: '',
        pageIndex: 1,
        pageSize: 10
      },
      listLoading: true,
      tableData: [],
      total: 0
    }
  },
  created() {
    this.queryParam.classes = this.classes
  },
  watch: {
    classes: {
      handler(newVal) {
        this.queryParam.classes = newVal
        if (newVal) {
          this.search()
        } else {
          // 当classes为空时，设置listLoading为false，避免一直转圈
          this.listLoading = false
        }
      },
      immediate: true
    }
  },
  methods: {
    search() {
      this.listLoading = true
      classesRuleApi.getClassesRulePage(this.queryParam).then(data => {
        const re = data.response
        this.tableData = re.list
        this.total = re.total
        this.queryParam.pageIndex = re.pageNum
        this.listLoading = false
      })
    },
    deleteClassRule(row) {
      let _this = this
      // 假设存在删除接口
      classesRuleApi.deleteClassesRule(row.id).then(re => {
        if (re.code === 1) {
          _this.search()
          _this.$message.success(re.message)
        } else {
          _this.$message.error(re.message)
        }
      })
    },
    submitForm() {
      this.queryParam.pageIndex = 1
      this.search()
    }
  }
}
</script>

<style scoped>
.rule-list-container {
  padding: 15px;
  background-color: #ffffff;
  border-radius: 8px;
}

.rule-list-header {
  margin-bottom: 15px;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.rule-table {
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 表格头部样式 */
.rule-table .el-table__header-wrapper th {
  background-color: #f5f7fa;
  font-weight: bold;
  color: #303133;
}

/* 表格行样式 */
.rule-table .el-table__row {
  transition: background-color 0.3s;
}

.rule-table .el-table__row:hover {
  background-color: #f5f7fa;
}

.pagination-container {
  margin-top: 15px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

/* 响应式设计 */
@media screen and (max-width: 768px) {
  .rule-list-container {
    padding: 10px;
  }
  
  .rule-table {
    font-size: 12px;
  }
  
  .el-table-column {
    width: auto !important;
  }
}
</style>