<template>
  <div class="app-container">
    <el-form :model="queryParam" ref="queryForm" :inline="true">
      <el-form-item label="筛选班次：">
        <el-input v-model="queryParam.keyword"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm">查询</el-button>
        <router-link :to="{ path: '/classes/rule/edit' }" class="link-left">
          <el-button type="primary">新增</el-button>
        </router-link>  
      </el-form-item>
    </el-form>

    <el-table v-loading="listLoading" :data="tableData" border fit highlight-current-row style="width: 100%">
      <el-table-column prop="classes" label="班次" />
      <el-table-column prop="targetClasses" label="目标班次" />
      <el-table-column label="比例">
        <template slot-scope="{ row }">{{ row.ratio*100 }}%</template>
      </el-table-column>
      <el-table-column width="270px" label="操作" align="center">
        <template slot-scope="{ row }">
          <router-link :to="{ path: '/classes/rule/edit', query: { id: row.id } }" class="link-left">
            <el-button size="mini">编辑</el-button>
          </router-link>
          <el-button size="mini" type="danger" @click="deleteClassRule(row)" class="link-left">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" :page.sync="queryParam.pageIndex" :limit.sync="queryParam.pageSize"
                @pagination="search" />
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import Pagination from '@/components/Pagination'
import classesRuleApi from '@/api/classesRule'

export default {
  components: { Pagination },
  data() {
    return {
      queryParam: {
        keyword: '',
        pageIndex: 1,
        pageSize: 10
      },
      listLoading: true,
      tableData: [],
      total: 0
    }
  },
  created() {
    this.search()
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
.link-left {
  margin-left: 10px;
}
</style>