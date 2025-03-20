import { post,get } from '@/utils/request'

export default {
  editScheduling: query => post('/api/admin/scheduling/edit', query),
  export: query => get('/api/admin/scheduling/export', query),
  schedulingStastic: query => get('/api/admin/scheduling/statistics/list', query)
} 
