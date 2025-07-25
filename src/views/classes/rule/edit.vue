<template>
  <div class="app-container">
    <el-form :model="classInfo" ref="classForm" label-width="120px">
      <el-form-item label="目标班次">
        <el-select
          v-model="classInfo.targetClasses"
          placeholder="请选择目标班次"
          filterable
          remote
          :remote-method="filterTargetClasses"
          :loading="targetClassesLoading"
          @change="onTargetClassesChange"
        >
          <el-option
            v-for="option in filteredTargetCodeOptions"
            :key="option"
            :label="option"
            :value="option"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="班次">
        <el-select
          v-model="classInfo.classes"
          placeholder="请先选择目标班次"
          :disabled="!classInfo.targetClasses"
          filterable
          remote
          :remote-method="filterClasses"
          :loading="classesLoading"
        >
          <el-option
            v-for="option in filteredCodeOptions"
            :key="option"
            :label="option"
            :value="option"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="比例">
        <el-radio-group v-model="classInfo.ratio" class="same-width-input">
          <el-radio :label="0.5">50%</el-radio>
          <el-radio :label="1">100%</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitClass">提交</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import classesRuleApi from '@/api/classesRule'
import classesApi from '@/api/classes'

export default {
  data() {
    return {
      classInfo: {
        id: null,
        classes: '',
        targetClasses: '',
        ratio: 1 // 设置默认值为1(100%)
      },
      ratioDisplay: '',
      classOptions: [],
      targetClassOptions: [],
      filteredCodeOptions: [],
      filteredTargetCodeOptions: [],
      classesLoading: false,
      targetClassesLoading: false
    }
  },
  computed: {
    ratioToDecimal() {
      return parseFloat(this.ratioDisplay)
    }
  },
  watch: {
    // 移除ratio的watch监听，因为不再需要处理输入框的格式化
  },
  created() {
    const id = this.$route.query.id
    let _this = this
    this.getTargetClassesOptions();
    if (id && parseInt(id) !== 0) {
      _this.formLoading = true
      classesRuleApi.selectClassesRule(id).then(re => {
        _this.classInfo = re.response
        _this.formLoading = false
        // 编辑模式下自动加载班次数据
        if (_this.classInfo.targetClasses) {
          _this.getClassesOptions();
        }
      })
    }
  },
  methods: {
    getTargetClassesOptions() {
      classesApi.getClassesList({isCount:'1'}).then(response => {
        if (response.code === 1) {
          this.targetClassOptions = response.response
          this.filteredTargetCodeOptions = response.response
        }
      })
    },
    // 新增方法，监听目标班次的变化
    onTargetClassesChange() {
      this.getClassesOptions();
    },
    getClassesOptions() {
      // 添加调试日志
      console.log('获取班次数据，目标班次:', this.classInfo.targetClasses)
      classesApi.getClassesList({
        isCount:'0', 
        targetClasses: this.classInfo.targetClasses
      }).then(response => {
        if (response.code === 1) {
          this.classOptions = response.response
          this.filteredCodeOptions = response.response
          console.log('班次数据加载成功:', response.response)
        } else {
          console.error('班次数据加载失败:', response.message)
          this.$message.error('获取班次数据失败: ' + response.message)
        }
      }).catch(error => {
        console.error('班次API调用异常:', error)
        this.$message.error('获取班次数据时发生错误')
      })
    },
    filterClasses(query) {
      if (query) {
        this.classesLoading = true
        this.filteredCodeOptions = this.classOptions.filter(option => {
          return option.includes(query)
        })
        this.classesLoading = false
      } else {
        this.filteredCodeOptions = this.classOptions
      }
    },
    filterTargetClasses(query) {
      if (query) {
        this.targetClassesLoading = true
        this.filteredTargetCodeOptions = this.targetClassOptions.filter(option => {
          return option.includes(query)
        })
        this.targetClassesLoading = false
      } else {
        this.filteredTargetCodeOptions = this.targetClassOptions
      }
    },
    submitClass() {
      const submitData = {
        ...this.classInfo
      }
      classesRuleApi.classesRuleEdit(submitData).then(response => {
        if (response.code === 1) {
          this.$router.push({ path: '/classes/rule/list' })
          this.$message.success(response.message)
        } else {
          this.$message.error(response.message)
        }
      })
    }
  }
}
</script>

<style scoped>
.app-container {
  padding: 20px;
}

/* 设置输入框和下拉框等宽 */
.same-width-input{
  width: 200px;
}

.el-form-item .el-select {
  width: 200px;
}
</style>