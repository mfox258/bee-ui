<template>
  <div class="app-container performance-accounting">
    <div class="toolbar">
      <el-date-picker
        v-model="month"
        type="month"
        format="yyyy-MM"
        value-format="yyyy-MM"
        placeholder="选择核算月份"
        :clearable="false"
        @change="loadData"
      />
      <el-button type="primary" :loading="loading" @click="loadData">查询</el-button>
      <el-button type="success" :loading="saving" @click="save">保存</el-button>
      <el-button type="primary" :loading="saving" @click="download">下载 Excel</el-button>
      <el-button type="danger" plain :loading="clearing" @click="clearMonth">清空本月数据</el-button>
    </div>

    <el-table ref="performanceTable" :data="items" border v-loading="loading" class="performance-table" :height="tableHeight" :fit="true">
      <el-table-column prop="userName" label="姓名" width="88" fixed="left" />
      <el-table-column prop="workload" label="岗位工作量（分）" min-width="130" />
      <el-table-column v-if="showFormulaColumns" label="岗位绩效奖金" min-width="110" class-name="formula-cell">
        <template slot-scope="scope">{{ formatNumber(positionBonus(scope.row)) }}</template>
      </el-table-column>
      <el-table-column label="考核系数" min-width="95">
        <template slot-scope="scope">
          <el-input-number v-model="scope.row.assessmentCoefficient" :precision="2" :controls="false" :min="0" class="cell-input" @input="markAssessmentCoefficientManual(scope.row)" @blur="autoSave" />
        </template>
      </el-table-column>
      <el-table-column v-if="showFormulaColumns" label="个人职称奖金" min-width="110" class-name="formula-cell">
        <template slot-scope="scope">{{ formatNumber(rankBonus(scope.row)) }}</template>
      </el-table-column>
      <el-table-column label="质量考评基础分" min-width="145">
        <template slot-scope="scope">
          <el-input-number v-model="scope.row.qualityBaseScore" :precision="2" :controls="false" :min="0" class="cell-input" @input="markQualityBaseScoreManual(scope.row)" @blur="autoSave" />
        </template>
      </el-table-column>
      <el-table-column label="质量考评系数" min-width="125">
        <template slot-scope="scope">
          <el-input-number v-model="scope.row.qualityCoefficient" :precision="2" :controls="false" :min="0" class="cell-input" @blur="autoSave" />
        </template>
      </el-table-column>
      <el-table-column v-if="showFormulaColumns" label="质量考评得分" min-width="110" class-name="formula-cell">
        <template slot-scope="scope">{{ formatNumber(qualityScore(scope.row)) }}</template>
      </el-table-column>
      <el-table-column v-if="showFormulaColumns" label="质量考评奖金" min-width="110" class-name="formula-cell">
        <template slot-scope="scope">{{ formatNumber(qualityBonus(scope.row)) }}</template>
      </el-table-column>
      <el-table-column label="120值班" min-width="96">
        <template slot-scope="scope">
          <el-input-number v-model="scope.row.duty120" :precision="2" :controls="false" class="cell-input" @blur="autoSave" />
        </template>
      </el-table-column>
      <el-table-column label="组长、科秘" min-width="110">
        <template slot-scope="scope">
          <el-input-number v-model="scope.row.departmentSecretary" :precision="2" :controls="false" class="cell-input" @blur="autoSave" />
        </template>
      </el-table-column>
      <el-table-column label="扣款" min-width="96">
        <template slot-scope="scope">
          <el-input-number v-model="scope.row.deduction" :precision="2" :controls="false" :min="0" class="cell-input" @blur="autoSave" />
        </template>
      </el-table-column>
      <el-table-column label="合计" min-width="105" class-name="formula-cell">
        <template slot-scope="scope">{{ formatNumber(total(scope.row)) }}</template>
      </el-table-column>
    </el-table>

    <div class="summary-inputs">
      <el-form inline label-width="165px">
        <el-form-item label="被套钱">
          <el-input-number v-model="coverAmount" :precision="2" :controls="false" @blur="autoSave" />
        </el-form-item>
        <el-form-item label="总额（总金额手动填写）">
          <el-input-number v-model="totalAmount" :precision="2" :controls="false" :min="0" @blur="autoSave" />
        </el-form-item>
      </el-form>
      <div class="summary-preview">绩效工资总额：{{ formatNumber(performanceAmount) }}；考核合计：{{ formatNumber(totalSum) }}；总额=合计+被套：{{ formatNumber(totalSum + number(coverAmount)) }}</div>
    </div>
  </div>
</template>

<script>
import performanceAccountingApi from '@/api/performance-accounting'

export default {
  name: 'PerformanceAccounting',
  data() {
    return {
      month: new Date().toISOString().slice(0, 7),
      title: '',
      items: [],
      coverAmount: 0,
      totalAmount: 0,
      loading: false,
      saving: false,
      clearing: false,
      autoSaveQueued: false,
      autoSaveRunning: false,
      autoSavePromise: null,
      // 仅临时隐藏中间公式列；合计列继续展示，后续改为 true 即可恢复。
      showFormulaColumns: false,
      tableHeight: Math.max(360, window.innerHeight - 185)
    }
  },
  computed: {
    workloadSum() { return this.items.reduce((sum, item) => sum + this.number(item.workload), 0) },
    rankSum() { return this.items.reduce((sum, item) => sum + this.number(item.assessmentCoefficient), 0) },
    qualityScoreSum() { return this.items.reduce((sum, item) => sum + this.qualityScore(item), 0) },
    departmentSecretarySum() { return this.items.reduce((sum, item) => sum + this.number(item.departmentSecretary), 0) },
    deductionSum() { return this.items.reduce((sum, item) => sum + this.number(item.deduction), 0) },
    performanceAmount() {
      return this.number(this.totalAmount) - this.number(this.coverAmount) - this.departmentSecretarySum + this.deductionSum
    },
    positionUnit() { return this.workloadSum ? this.performanceAmount * 0.3 / this.workloadSum : 0 },
    rankUnit() { return this.rankSum ? this.performanceAmount * 0.3 / this.rankSum : 0 },
    qualityUnit() { return this.qualityScoreSum ? this.performanceAmount * 0.4 / this.qualityScoreSum : 0 },
    totalSum() { return this.items.reduce((sum, item) => sum + this.total(item), 0) }
  },
  created() {
    this.loadData()
  },
  methods: {
    loadData() {
      if (!this.month) return
      this.loading = true
      performanceAccountingApi.get(this.month).then(res => {
        const data = res.response || {}
        this.title = data.title || ''
        this.items = data.items || []
        this.coverAmount = this.number(data.coverAmount)
        this.totalAmount = this.number(data.totalAmount)
        this.refreshTableLayout()
      }).catch(() => {
        this.$message.error('获取绩效核算数据失败')
      }).finally(() => {
        this.loading = false
      })
    },
    refreshTableLayout() {
      this.$nextTick(() => {
        if (this.$refs.performanceTable) this.$refs.performanceTable.doLayout()
      })
    },
    payload() {
      return {
        month: this.month,
        coverAmount: this.number(this.coverAmount),
        totalAmount: this.number(this.totalAmount),
        items: this.items.map(item => ({
          userName: item.userName,
          assessmentCoefficient: this.number(item.assessmentCoefficient),
          assessmentCoefficientManual: item.assessmentCoefficientManual === true,
          qualityBaseScore: this.number(item.qualityBaseScore),
          qualityBaseScoreManual: item.qualityBaseScoreManual === true,
          qualityCoefficient: this.number(item.qualityCoefficient),
          duty120: this.number(item.duty120),
          departmentSecretary: this.number(item.departmentSecretary),
          deduction: this.number(item.deduction)
        }))
      }
    },
    markAssessmentCoefficientManual(item) {
      item.assessmentCoefficientManual = true
      this.$nextTick(() => this.autoSave())
    },
    markQualityBaseScoreManual(item) {
      item.qualityBaseScoreManual = true
      this.$nextTick(() => this.autoSave())
    },
    save(silent) {
      this.saving = true
      return performanceAccountingApi.save(this.payload()).then(() => {
        if (!silent) this.$message.success('绩效核算数据已保存')
      }).finally(() => {
        this.saving = false
      })
    },
    autoSave() {
      if (this.loading || !this.month || this.items.length === 0) return
      this.autoSaveQueued = true
      this.flushAutoSave()
    },
    flushAutoSave() {
      if (!this.autoSaveQueued || this.autoSaveRunning) return
      this.autoSaveQueued = false
      this.autoSaveRunning = true
      this.autoSavePromise = performanceAccountingApi.save(this.payload()).catch(() => {
        this.$message.error('自动保存失败，请点击保存重试')
      }).finally(() => {
        this.autoSaveRunning = false
        this.flushAutoSave()
      })
    },
    clearMonth() {
      this.$confirm('将删除 ' + this.month + ' 的全部绩效录入数据（包括被套钱、总额及每个人的填写项），此操作不可恢复，确认清空吗？', '清空本月数据', {
        type: 'warning',
        confirmButtonText: '确认清空',
        cancelButtonText: '取消'
      }).then(() => {
        this.clearing = true
        this.autoSaveQueued = false
        return (this.autoSavePromise || Promise.resolve()).then(() => performanceAccountingApi.clear({ month: this.month }))
      }).then(() => {
        this.$message.success('本月绩效录入数据已清空')
        this.loadData()
      }).catch(() => {}).finally(() => {
        this.clearing = false
      })
    },
    download() {
      this.$confirm('下载前将自动保存当前填写的数据，确认下载吗？', '确认下载', { type: 'warning' }).then(() => {
        return this.save(true)
      }).then(() => {
        const baseUrl = process.env.VUE_APP_URL || ''
        window.open(baseUrl + '/api/admin/performance-accounting/export?month=' + encodeURIComponent(this.month), '_blank')
      }).catch(() => {})
    },
    number(value) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    },
    qualityScore(item) { return this.number(item.qualityBaseScore) * this.number(item.qualityCoefficient) },
    positionBonus(item) { return this.number(item.workload) * this.positionUnit },
    rankBonus(item) { return this.number(item.assessmentCoefficient) * this.rankUnit },
    qualityBonus(item) { return this.qualityScore(item) * this.qualityUnit },
    total(item) {
      return this.positionBonus(item) + this.rankBonus(item) + this.qualityBonus(item) + this.number(item.duty120) + this.number(item.departmentSecretary) - this.number(item.deduction)
    },
    formatNumber(value) { return this.number(value).toFixed(2) }
  }
}
</script>

<style scoped>
.performance-accounting { padding: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.performance-table { margin-top: 0; }
.cell-input { width: 100%; }
.summary-inputs { margin-top: 10px; padding: 10px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fff; }
.summary-inputs .el-form-item { margin-bottom: 0; }
.summary-preview { color: #606266; line-height: 20px; }
</style>

<style>
.performance-accounting .formula-cell { background: #fff8c6 !important; }
.performance-accounting .formula-cell .cell { color: #606266; }
.performance-accounting .performance-table .el-table__header th { height: 46px; padding: 7px 0; }
.performance-accounting .performance-table .el-table__body tr,
.performance-accounting .performance-table .el-table__fixed-body-wrapper tr { height: 52px; }
.performance-accounting .performance-table .el-table__body td,
.performance-accounting .performance-table .el-table__fixed-body-wrapper td { height: 52px; padding: 5px 0; box-sizing: border-box; }
.performance-accounting .performance-table .cell { padding-left: 8px; padding-right: 8px; line-height: 22px; white-space: nowrap; }
.performance-accounting .performance-table .el-input-number .el-input__inner { height: 32px; line-height: 32px; padding: 0 6px; }
</style>
