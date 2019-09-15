import { RouteConfig } from 'react-router-config';

export const states: RouteConfig[] = [
  {
    name: 'destiny1.**',
    url: '/:membershipId/d1',
    async lazyLoad() {
      const states = await import(/* webpackChunkName: "destiny1" */ './routes');
      return { states: states.states };
    }
  }
];
