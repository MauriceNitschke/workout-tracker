import { RouteId } from '../types';

export const PRIMARY_ROUTES: RouteId[] = ['today', 'plan', 'train', 'progress'];

const ROUTE_PATHS: Record<RouteId, string> = {
  today: '/today',
  plan: '/plan',
  train: '/train',
  progress: '/progress',
  streaks: '/streaks',
  exercises: '/exercises',
  recovery: '/recovery',
  account: '/account',
};

const LEGACY_ROUTES: Record<string, RouteId> = {
  dashboard: 'today',
  planner: 'plan',
  workout: 'train',
  review: 'progress',
  'life-in-weeks': 'streaks',
  exercises: 'exercises',
  recovery: 'recovery',
  account: 'account',
};

export function routeFromHash(hash = window.location.hash): RouteId {
  const path = hash.replace(/^#/, '').split('?')[0].replace(/\/+$/, '') || '/today';
  const match = (Object.entries(ROUTE_PATHS) as [RouteId, string][]).find(
    ([, routePath]) => routePath === path
  );
  return match?.[0] ?? 'today';
}

export function hashForRoute(route: RouteId): string {
  return `#${ROUTE_PATHS[route]}`;
}

export function routeFromLegacyId(id: string): RouteId {
  return LEGACY_ROUTES[id] ?? (id in ROUTE_PATHS ? (id as RouteId) : 'today');
}

export function navigateToRoute(route: RouteId, replace = false): void {
  const nextHash = hashForRoute(route);
  if (window.location.hash === nextHash) return;
  if (replace) {
    window.history.replaceState(null, '', nextHash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = nextHash;
  }
}
