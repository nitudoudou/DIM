import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'whats-new.**',
    url: '/whats-new',
    lazyLoad: async () => {
      const module = await import(/* webpackChunkName: "whatsNew" */ './WhatsNew');
      return {
        states: [
          {
            name: 'whats-new',
            url: '/whats-new',
            component: module.default
          }
        ]
      };
    }
  }
];
