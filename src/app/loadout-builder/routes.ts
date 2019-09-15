import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'destiny2.loadoutbuilder.**',
    url: '/loadoutbuilder',
    lazyLoad: async () => {
      const module = await import(/* webpackChunkName: "loadoutBuilder" */ './LoadoutBuilder');
      return {
        states: [
          {
            name: 'destiny2.loadoutbuilder',
            url: '/loadoutbuilder',
            component: module.default
          }
        ]
      };
    }
  }
];
