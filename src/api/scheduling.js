import { post, get } from '@/utils/request'

export default {
  editSchedulingCell: payload => post('/api/admin/scheduling/edit', payload),
  batchEditScheduling: payload => post('/api/admin/scheduling/batch-edit', payload),
  getActiveSchedulingUsers: () => get('/api/admin/scheduling/available-users'),
  getSchedulingOperationList: () => get('/api/admin/scheduling/operation/list'),
  getSchedulingOperationDetails: operationId => get(`/api/admin/scheduling/operation/${operationId}/details`),
  rollbackSchedulingOperation: operationId => post(`/api/admin/scheduling/operation/${operationId}/rollback`),
  export: query => get('/api/admin/scheduling/export', query),
  schedulingStastic: query => get('/api/admin/scheduling/statistics/list', query),
  schedulingStastic1: query => get('/api/admin/scheduling/statistic', query),
  schedulingDownloadAttendance: query => get('/api/admin/scheduling/download/attendance', query)
}
