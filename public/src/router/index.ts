import { createRouter, createWebHistory } from 'vue-router';
import { estErreurDeChunk, rechargerUneFois } from '@/lib/chunkReload';
import { useAuthStore } from '@/stores/auth';
import { useMeStore } from '@/stores/me';

const routes = [
  { path: '/', component: () => import('@/views/HomeView.vue'), meta: { requiresAuth: true, tabs: true } },
  { path: '/explorer', component: () => import('@/views/ExplorerView.vue'), meta: { requiresAuth: true, tabs: true } },
  { path: '/creer', component: () => import('@/views/CreateTableView.vue'), meta: { requiresAuth: true, requiresOnboarded: true, tabs: true } },
  { path: '/messages', component: () => import('@/views/MessagesView.vue'), meta: { requiresAuth: true, tabs: true } },
  { path: '/messages/:id', component: () => import('@/views/MessagesView.vue'), meta: { requiresAuth: true } },
  { path: '/profil', component: () => import('@/views/ProfileView.vue'), meta: { requiresAuth: true, tabs: true } },
  { path: '/tables/:id', component: () => import('@/views/TableDetailView.vue'), meta: { requiresAuth: true, tabs: true } },
  {
    path: '/tables/:id/participer',
    component: () => import('@/views/ContributionView.vue'),
    meta: { requiresAuth: true, requiresOnboarded: true },
  },
  {
    path: '/tables/:id/confirme',
    component: () => import('@/views/ConfirmedView.vue'),
    meta: { requiresAuth: true, tabs: true },
  },
  { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { requiresGuest: true } },
  { path: '/bienvenue', component: () => import('@/views/RegisterView.vue'), meta: { requiresGuest: true } },
  { path: '/email-sent', component: () => import('@/views/EmailSentView.vue') },
  { path: '/auth/finish', component: () => import('@/views/AuthFinishView.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({ history: createWebHistory(), routes });

// Une navigation vers un écran dont le chunk a disparu (nouveau déploiement) recharge
// la page au lieu d'afficher une erreur.
router.onError((erreur) => {
  if (estErreurDeChunk(erreur)) rechargerUneFois();
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();
  await authStore.waitForAuth();
  const signedIn = Boolean(authStore.user);
  if (to.meta.requiresAuth && !signedIn) {
    return { path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } };
  }
  if (to.meta.requiresGuest && signedIn) return '/';
  if (to.meta.requiresOnboarded && signedIn) {
    const meStore = useMeStore();
    await meStore.load();
    if (!meStore.isOnboarded) return '/profil';
  }
  return true;
});
export default router;
