<template>
  <div class="app-container">
    <el-form :model="form" ref="form" label-width="100px" v-loading="formLoading" :rules="rules">
      <el-form-item label="标题" prop="fileName" required>
        <el-input v-model="form.fileName" style="width: 30%"></el-input>
      </el-form-item>
      <el-form-item label="时间" prop="time" required>
        <el-input v-model="form.time" style="width: 30%"></el-input>
      </el-form-item>
      <el-form-item label="地点" prop="location" required>
        <el-input v-model="form.location" style="width: 30%"></el-input>
      </el-form-item>
      <el-form-item label="图片" prop="fileList" required>
        <el-upload
          v-if="showUpload"
          class="upload-demo"
          action="#"
          :auto-upload="false"
          :on-change="handleFileChange"
          :show-file-list="true"
          :limit="2"
          :drag="true"
          multiple
          name="files"
          accept="image/*"
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">将图片拖到此处，或<em>点击上传</em>
            注意：图片必须为2张！
          </div>
        </el-upload>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm">提交</el-button>
        <el-form-item>
          <el-button type="warning" @click="resetFiles">重置图片</el-button>
        </el-form-item>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import tempApi from '@/api/meetWord'
import axios from 'axios'
export default {
  data() {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    const month = ('0' + (currentDate.getMonth() + 1)).slice(-2)
    const day = ('0' + currentDate.getDate()).slice(-2)
    return {
      form: {
        fileName: '',
        time: `${year}-${month}-${day}`,
        location: ''
      },
      fileList: [],
      formLoading: false,
      showUpload: true,
      rules: {
        fileName: [
          { required: true, message: '标题不可为空！', trigger: 'blur' }
        ],
        time: [
          { required: true, message: '时间不可为空！', trigger: 'blur' }
        ],
        location: [
          { required: true, message: '地点不可为空！', trigger: 'blur' }
        ],
        fileList: [
          { required: true, message: '图片必须上传2张！', trigger: 'change' }
        ]
      }
    }
  },
  methods: {
    handleFileChange(file, fileList) {
      this.fileList = fileList
    },
    submitForm() {
      const formData = new FormData()
      formData.append('fileName', this.form.fileName)
      formData.append('time', this.form.time)
      formData.append('location', this.form.location)
      this.fileList.forEach(file => {
        formData.append('files', file.raw)
      })
      tempApi.export(formData).then(response => {
        const blob = new Blob([response.data], { type: response.headers['content-type'] })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = this.form.fileName + '.docx' // 这里根据实际情况修改文件名
        a.click()
        window.URL.revokeObjectURL(url)
      }).catch(e => {
        console.error('下载文件失败', e)
      })
    },
    resetFiles() {
      this.showUpload = false
      this.$nextTick(() => {
        this.showUpload = true
      })
      this.fileList = []
    }
  },
  created() {
  }
}
</script>

<style scoped>
.upload-demo {
  width: 30%;
}
</style>