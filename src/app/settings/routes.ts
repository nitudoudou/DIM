import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'settings.**',
    url: '/settings',
    lazyLoad: () => import(/* webpackChunkName: "settings" */ './routes.lazy')
  }
];
