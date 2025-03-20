import { post } from '@/utils/request'

export default {
  test: query => post('/api/temp/test', query)
  }
