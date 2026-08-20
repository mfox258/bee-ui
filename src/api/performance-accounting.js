import { get, post } from '@/utils/request'

export default {
  get: month => get('/api/admin/performance-accounting', { month }),
  save: payload => post('/api/admin/performance-accounting/save', payload),
  clear: payload => post('/api/admin/performance-accounting/clear', payload)
}
