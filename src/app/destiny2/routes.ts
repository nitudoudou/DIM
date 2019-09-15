import { destinyAccountResolver } from '../accounts/destiny-account-resolver';
import { RouteConfig } from 'react-router-config';
import Destiny from '../shell/Destiny';
import Inventory from '../inventory/Inventory';

// Root state for Destiny 2 views
export const states: RouteConfig[] = [
  {
    name: 'destiny2',
    redirectTo: 'destiny2.inventory',
    url: '/:membershipId/d2',
    component: Destiny,
    resolve: [
      {
        token: 'account',
        deps: ['$transition$'],
        resolveFn: destinyAccountResolver(2)
      }
    ]
  },
  {
    name: 'destiny2.inventory',
    url: '/inventory',
    component: Inventory
  }
];
