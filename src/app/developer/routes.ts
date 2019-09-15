import { RouteConfig } from 'react-router-config';
import Developer from './Developer';

export const states: RouteConfig[] =
  $DIM_FLAVOR === 'dev'
    ? [
        {
          name: 'developer',
          url: '/developer',
          component: Developer
        }
      ]
    : [];
