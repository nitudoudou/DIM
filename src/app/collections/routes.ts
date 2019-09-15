import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'destiny2.collections.**',
    url: '/collections',
    lazyLoad: async () => {
      const module = await import(/* webpackChunkName: "collections" */ './Collections');
      return {
        states: [
          {
            name: 'destiny2.collections',
            url: '/collections?{presentationNodeHash:int}',
            component: module.default
          }
        ]
      };
    }
  }
];
