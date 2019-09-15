import { RouteConfig } from 'react-router-config';
import RecordBooks from './RecordBooks';

export const states: RouteConfig[] = [
  {
    name: 'destiny1.record-books',
    component: RecordBooks,
    url: '/record-books'
  }
];
