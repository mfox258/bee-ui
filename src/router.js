import Vue from 'vue'
import Router from 'vue-router'
import Layout from '@/layout'

Vue.use(Router)

const constantRoutes = [
  {
    path: '/redirect',
    component: Layout,
    hidden: true,
    children: [
      {
        path: '/redirect/:path*',
        component: () => import('@/views/redirect/index')
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    hidden: true,
    component: () => import('@/views/login/index'),
    meta: { title: '登录' }
  },
  {
    path: '/',
    component: Layout,
    // redirect: '/dashboard',
    redirect: '/zyz/paiban/index',
    children: [
    ]
  },
  {
    path: '/user',
    component: Layout,
    name: 'UserPage',
    meta: {
      title: '用户管理',
      icon: 'users'
    },
    children: [
      {
        path: 'guest/list',
        component: () => import('@/views/user/guest/list'),
        name: 'UserGuestPageList',
        meta: { title: '用户列表', noCache: true }
      },
      {
        path: 'guest/edit',
        component: () => import('@/views/user/guest/edit'),
        name: 'UserGuestEdit',
        meta: { title: '用户编辑', noCache: true, activeMenu: '/user/guest/list' },
        hidden: true
      },
      {
        path: 'admin/list',
        component: () => import('@/views/user/admin/list'),
        name: 'UserAdminPageList',
        meta: { title: '管理员列表', noCache: true }
      },
      {
        path: 'admin/edit',
        component: () => import('@/views/user/admin/edit'),
        name: 'UserAdminEdit',
        meta: { title: '管理员编辑', noCache: true, activeMenu: '/user/admin/list' },
        hidden: true
      }
    ]
  },
  {
    path: '/zyz',
    component: Layout,
    name: 'TempPage',
    isAuth: true, // 判断权限
    meta: {
      title: '芝芝小助手',
      icon: 'exam'
    },
    children: [
      {
        path: 'word/index',
        component: () => import('@/views/zyz/word/index'),
        name: 'Temp',
        meta: { title: '会议文档', noCache: true }
      },
      {
        path: 'paiban/index',
        component: () => import('@/views/zyz/paiban/index'),
        name: 'Temp',
        meta: { title: '排班管理', noCache: true }
      },
      {
        path: 'paiban/statistic',
        component: () => import('@/views/zyz/paiban/statistic'),
        name: 'Temp',
        meta: { title: '排班统计', noCache: true }
      }
    ]
  },
  {
    path: '/classes',
    component: Layout,
    name: 'ClassesPage',
    meta: {
      title: '班次管理',
      icon: 'exam'
    },
    children: [
      {
        path: 'list',
        component: () => import('@/views/classes/list'),
        name: 'ClassesPagePage',
        meta: { title: '班次列表', noCache: true }
      },
      {
        path: 'edit',
        component: () => import('@/views/classes/edit'),
        name: 'ClassesEditPage',
        meta: { title: '班次编辑', noCache: true , activeMenu: '/classes/list'},
        hidden: true
      },{
        path: 'rule/list',
        component: () => import('@/views/classes/rule/list'),
        name: 'RulePagePage',
        meta: { title: '规则列表', noCache: true }
      },
      {
        path: 'rule/edit',
        component: () => import('@/views/classes/rule/edit'),
        name: 'RuleEditPage',
        meta: { title: '规则编辑', noCache: true , activeMenu: '/classes/rule/list'},
        hidden: true
      }
    ]
  },
  
  {
    path: '/profile',
    component: Layout,
    hidden: true,
    children: [
      {
        path: 'index',
        component: () => import('@/views/profile/index'),
        name: 'Profile',
        meta: { title: '个人简介', icon: 'user', noCache: true }
      }
    ]
  },
  { path: '*',
    hidden: true,
    component: () => import('@/views/error-page/404'),
    meta: { title: '404', noCache: true }
  }
]

const router = new Router({
  routes: constantRoutes
})

export {
  constantRoutes,
  router
}
