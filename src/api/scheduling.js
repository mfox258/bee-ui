import { post, get } from '@/utils/request'

export default {
  editSchedulingCell: payload => post('/api/admin/scheduling/edit', payload),
  export: query => get('/api/admin/scheduling/export', query),
  schedulingStastic: query => get('/api/admin/scheduling/statistics/list', query),
  schedulingStastic1: query => get('/api/admin/scheduling/statistic', query),
  schedulingDownloadAttendance: query => get('/api/admin/scheduling/download/attendance', query)
}
