import SettingsPage from './SettingsPage';
import { RouteConfig } from 'react-router-config';
import { settingsReady } from './settings';
import GDriveRevisions from '../storage/GDriveRevisions';

export const states: RouteConfig[] = [
  {
    name: 'settings',
    url: '/settings?gdrive',
    component: SettingsPage,
    resolve: {
      settings: () => settingsReady
    }
  },
  {
    name: 'gdrive-revisions',
    component: GDriveRevisions,
    url: '/settings/gdrive-revisions'
  }
];
