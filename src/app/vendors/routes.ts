import { RouteConfig } from 'react-router-config';
import Vendors from './Vendors';
import SingleVendor from './SingleVendor';

export const states: RouteConfig[] = [
  {
    name: 'destiny2.vendors',
    component: Vendors,
    url: '/vendors?characterId'
  },
  {
    name: 'destiny2.vendor',
    component: SingleVendor,
    url: '/vendors/:id?characterId'
  }
];
