import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'destiny2.progress.**',
    url: '/progress',
    lazyLoad: async () => {
      const module = await import(/* webpackChunkName: "progress" */ './Progress');
      return {
        states: [
          {
            name: 'destiny2.progress',
            url: '/progress',
            component: module.default
          }
        ]
      };
    }
  }
];
