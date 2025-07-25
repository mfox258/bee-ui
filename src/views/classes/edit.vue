<template>
  <div class="app-container">

    <el-form :model="form" ref="form" label-width="200px" v-loading="formLoading" :rules="rules">
      <el-form-item label="班次："  prop="classes" required>
        <el-input v-model="form.classes"></el-input>
      </el-form-item>
      <el-form-item label="是否展示在统计列表：" prop="isCount" >
        <el-radio-group v-model="form.isCount">
          <el-radio :label="1">是</el-radio>
          <el-radio :label="0">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="是否标红：" prop="color" >
        <el-radio-group v-model="form.color">
          <el-radio :label="1">是</el-radio>
          <el-radio :label="0">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <!-- 新增是否启用字段 -->
      <el-form-item label="是否启用：" prop="status" >
        <el-radio-group v-model="form.status">
          <el-radio :label="1">是</el-radio>
          <el-radio :label="0">否</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm">提交</el-button>
        <el-button @click="resetForm">重置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import { mapGetters, mapState, mapActions } from 'vuex'
import classesApi from '@/api/classes'

export default {
  data () {
    return {
      form: {
        id: null,
        classes: '',
        color: 0,
        isCount: 0,
        status: 0 // 新增状态字段默认值
      },
      formLoading: false,
      rules: {
        classes: [
          { required: true, message: '请输入班次', trigger: 'blur' }
        ],
        isCount: [
          { required: true, message: '请选择是否展示在统计列表', trigger: 'change' }
        ],
        color: [
          { required: true, message: '请选择是否标红', trigger: 'change' }
        ],
        // 新增状态字段验证规则
        status: [
          { required: true, message: '请选择是否启用', trigger: 'change' }
        ]
      }
    }
  },
  created () {
    let id = this.$route.query.id
    let _this = this
    if (id && parseInt(id) !== 0) {
      _this.formLoading = true
      classesApi.selectClasses(id).then(re => {
        // 将字符串转换为数值类型
        _this.form = {
          ...re.response,
          isCount: Number(re.response.isCount),
          color: Number(re.response.color),
          status: Number(re.response.status) // 新增状态字段类型转换
        }
        _this.formLoading = false
      })
    }
  },
  methods: {
    submitForm () {
      let _this = this
      this.$refs.form.validate((valid) => {
        if (valid) {
          this.formLoading = true
          classesApi.classesEdit(this.form).then(data => {
            if (data.code === 1) {
              _this.$message.success(data.message)
              _this.delCurrentView(_this).then(() => {
                _this.$router.push('/classes/list')
              })
            } else {
              _this.$message.error(data.message)
              _this.formLoading = false
            }
          }).catch(e => {
            _this.formLoading = false
          })
        } else {
          return false
        }
      })
    },
    resetForm () {
      let lastId = this.form.id
      this.$refs['form'].resetFields()
      this.form = {
        id: lastId,
        classes: '',
        isCount: 0,
        color: 0,
        status: 0 // 新增状态字段重置
      }
      this.form.id = lastId
    },
    ...mapActions('tagsView', { delCurrentView: 'delCurrentView' })
  }
}
</script>
