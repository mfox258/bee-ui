<template>
  <div class="app-container">
    <el-form :model="queryParam" ref="queryForm" :inline="true">
      <el-form-item label="关键字：">
        <el-input v-model="queryParam.keyword"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm">查询</el-button>
        <router-link :to="{path:'/classes/edit'}" class="link-left">
          <el-button type="primary">添加</el-button>
        </router-link>
      </el-form-item>
    </el-form>

    <el-table v-loading="listLoading" :data="tableData" border fit highlight-current-row style="width: 100%">
      <el-table-column prop="id" label="Id" />
      <el-table-column prop="classes" label="班次"/>
      <el-table-column prop="isCount" label="是否展示在统计列表">
        <template slot-scope="scope">
          {{ scope.row.isCount === 1 ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column prop="color" label="是否标红">
        <template slot-scope="scope">
          {{ scope.row.color === 1 ? '是' : '否' }}
        </template>
      </el-table-column>
      <!-- 新增是否启用列 -->
      <el-table-column prop="status" label="是否启用">
        <template slot-scope="scope">
          {{ scope.row.status === 1 ? '是' : '否' }}
        </template>
      </el-table-column>
      <el-table-column width="270px" label="操作" align="center">
        <template slot-scope="{row}">
          <router-link :to="{path:'/classes/edit', query:{id:row.id}}" class="link-left">
            <el-button size="mini" >编辑</el-button>
          </router-link>
          <el-button  size="mini" type="danger" @click="deleteClasses(row)" class="link-left">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total>0" :total="total" :page.sync="queryParam.pageIndex" :limit.sync="queryParam.pageSize"
                @pagination="search"/>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'
import Pagination from '@/components/Pagination'
import classesApi from '@/api/classes'

export default {
  components: { Pagination },
  data () {
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
  created () {
    this.search()
  },
  methods: {
    search () {
      this.listLoading = true
      classesApi.getClassesPage(this.queryParam).then(data => {
        const re = data.response
        // 转换所有状态字段为数值类型
        this.tableData = re.list.map(item => ({
          ...item,
          isCount: Number(item.isCount),
          color: Number(item.color),
          status: Number(item.status)
        }))
        this.total = re.total
        this.queryParam.pageIndex = re.pageNum
        this.listLoading = false
      })
    },
    deleteClasses (row) {
      let _this = this
      classesApi.deleteClasses(row.id).then(re => {
        if (re.code === 1) {
          _this.search()
          _this.$message.success(re.message)
        } else {
          _this.$message.error(re.message)
        }
      })
    },
    submitForm () {
      this.queryParam.pageIndex = 1
      this.search()
    }
  }
}
</script>
