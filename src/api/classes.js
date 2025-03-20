import { post,get } from '@/utils/request'

export default {
  getClassesList: query => get('/api/admin/classes/list',query),
  getClassesPage: query => post('/api/admin/classes/page',query),
  classesEdit: query => post('/api/admin/classes/edit', query),
  selectClasses: id => post('/api/admin/classes/select/' + id),
  deleteClasses: id => post('/api/admin/classes/delete/' + id)
}
