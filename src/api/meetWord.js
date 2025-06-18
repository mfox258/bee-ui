import { post } from '@/utils/request'

export default {
  export: query => post('/api/meet/word/export', query)
  }
