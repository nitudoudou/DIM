import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'destiny1.loadout-builder.**',
    url: '/loadout-builder',
    lazyLoad: async () => {
      const module = await import(/* webpackChunkName: "d1LoadoutBuilder" */ './D1LoadoutBuilder');
      return {
        states: [
          {
            name: 'destiny1.loadout-builder',
            url: '/loadout-builder',
            component: module.default
          }
        ]
      };
    }
  }
];
