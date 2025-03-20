<template>
  <div class="app-container">
    <el-form :model="classInfo" ref="classForm" label-width="120px">
      <el-form-item label="班次">
        <el-select
          v-model="classInfo.classes"
          placeholder="请选择班次"
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
      <el-form-item label="目标班次">
        <el-select
          v-model="classInfo.targetClasses"
          placeholder="请选择目标班次"
          filterable
          remote
          :remote-method="filterTargetClasses"
          :loading="targetClassesLoading"
        >
          <el-option
            v-for="option in filteredTargetCodeOptions"
            :key="option"
            :label="option"
            :value="option"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="比例">
        <el-input v-model="ratioDisplay"></el-input>
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
        ratio: 0
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
      return parseFloat(this.ratioDisplay.replace('%', '')) / 100
    }
  },
  watch: {
    'classInfo.ratio': {
      immediate: true,
      handler(newValue) {
        this.ratioDisplay = newValue * 100 + '%'
      }
    }
  },
  created() {
    const id = this.$route.query.id
    let _this = this
    this.getClassesOptions();
    this.getTargetClassesOptions();
    if (id && parseInt(id) !== 0) {
      _this.formLoading = true
      classesRuleApi.selectClassesRule(id).then(re => {
        _this.classInfo = re.response
        _this.formLoading = false
      })
    }
  },
  methods: {
    getClassesOptions() {
      classesApi.getClassesList({isCount:'0'}).then(response => {
        if (response.code === 1) {
          this.classOptions = response.response
          this.filteredCodeOptions = response.response
        }
      })
    },
    getTargetClassesOptions() {
      classesApi.getClassesList({isCount:'1'}).then(response => {
        if (response.code === 1) {
          this.targetClassOptions = response.response
          this.filteredTargetCodeOptions = response.response
        }
      })
    },
    filterClasses(query) {
      if (query) {
        this.classesLoading = true
        this.filteredCodeOptions = this.codeOptions.filter(option => {
          return option.includes(query)
        })
        this.classesLoading = false
      } else {
        this.filteredCodeOptions = this.codeOptions
      }
    },
    filterTargetClasses(query) {
      if (query) {
        this.targetClassesLoading = true
        this.filteredTargetCodeOptions = this.codeOptions.filter(option => {
          return option.includes(query)
        })
        this.targetClassesLoading = false
      } else {
        this.filteredTargetCodeOptions = this.codeOptions
      }
    },
    submitClass() {
      const submitData = {
        ...this.classInfo,
        ratio: this.ratioToDecimal
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
</style>