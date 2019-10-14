import { t } from 'app/i18next-t';
import React from 'react';
import './Account.scss';
import { DestinyAccount, PLATFORM_ICONS } from './destiny-account';
import clsx from 'clsx';
import { AppIcon, collapseIcon } from '../shell/icons';
import _ from 'lodash';

function Account(
  {
    account,
    selected,
    className,
    ...other
  }: {
    account: DestinyAccount;
    selected?: boolean;
    className?: string;
  } & React.HTMLAttributes<HTMLDivElement>,
  ref?: React.Ref<HTMLDivElement>
) {
  /*
    t('Accounts.PlayStation')
    t('Accounts.Xbox')
    t('Accounts.Blizzard')
    t('Accounts.Steam')
    t('Accounts.Stadia')
  */
  return (
    <div
      ref={ref}
      className={classNames('account', className, { 'selected-account': selected })}
      title={t(`Accounts.${account.platformLabel}`)}
      {...other}
      role="menuitem"
    >
      <div className="account-name">{account.displayName}</div>
      <div className="account-details">
        <b>{account.destinyVersion === 1 ? 'D1' : 'D2'}</b>
        {account.platforms.map((platformType, index) => (
          <AppIcon
            key={platformType}
            className={index === 0 ? 'first' : ''}
            icon={PLATFORM_ICONS[platformType]}
          />
        ))}
      </div>
      {selected && <AppIcon className="collapse" icon={collapseIcon} />}
    </div>
  );
}

export default React.forwardRef(Account);
