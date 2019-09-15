import Login from './Login';
import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    key: 'login',
    path: '/login',
    component: Login,
    params: {
      reauth: false
    }
  }
];
