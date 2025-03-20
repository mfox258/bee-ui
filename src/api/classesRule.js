import { post,get } from '@/utils/request'

export default {
  getClassesRulePage: query => post('/api/admin/classes/rule/page',query),
  classesRuleEdit: query => post('/api/admin/classes/rule/edit', query),
  selectClassesRule: id => post('/api/admin/classes/rule/select/' + id),
  deleteClassesRule: id => post('/api/admin/classes/rule/delete/' + id)
}
