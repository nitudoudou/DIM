import { getPlatforms, getActivePlatform } from '../accounts/platforms';
import { RouteConfig } from 'react-router-config';

/**
 * A config function that will create the default account route, which is used to redirect
 * when we don't know what to do.
 */
export const defaultAccountRoute: RouteConfig = {
  name: 'default-account',
  async redirectTo() {
    await getPlatforms();
    const activeAccount = getActivePlatform();
    if (activeAccount) {
      return {
        state: `destiny${activeAccount.destinyVersion}.inventory`,
        params: activeAccount
      };
    }
  }
};
