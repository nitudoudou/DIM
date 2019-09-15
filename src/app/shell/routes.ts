import { RouteConfig } from 'react-router-config';
import About from './About';
import Privacy from './Privacy';

export const states: RouteConfig[] = [
  {
    name: 'about',
    component: About,
    url: '/about'
  },
  {
    name: 'privacy',
    component: Privacy,
    url: '/privacy'
  }
];
