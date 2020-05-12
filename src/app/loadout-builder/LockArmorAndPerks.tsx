import React, { useState } from 'react';
import { t } from 'app/i18next-t';
import _ from 'lodash';
import { isLoadoutBuilderItem, addLockedItem, removeLockedItem } from './generated-sets/utils';
import {
  LockableBuckets,
  LockedItemType,
  LockedExclude,
  LockedBurn,
  LockedItemCase,
  ItemsByBucket,
  LockedPerk,
  LockedMap,
  LockedMod,
  LockedArmor2ModMap,
  LockedArmor2Mod,
  ModPickerCategories
} from './types';
import { InventoryBuckets } from 'app/inventory/inventory-buckets';
import { DimItem } from 'app/inventory/item-types';
import { connect } from 'react-redux';
import { storesSelector } from 'app/inventory/selectors';
import { RootState } from 'app/store/reducers';
import { DimStore } from 'app/inventory/store-types';
import { AppIcon, addIcon, faTimesCircle } from 'app/shell/icons';
import LoadoutBucketDropTarget from './locked-armor/LoadoutBucketDropTarget';
import { showItemPicker } from 'app/item-picker/item-picker';
import PerkPicker from './PerkPicker';
import ReactDOM from 'react-dom';
import styles from './LockArmorAndPerks.m.scss';
import LockedItem from './LockedItem';
import { D2ManifestDefinitions } from 'app/destiny2/d2-definitions';
import { settingsSelector } from 'app/settings/reducer';
import LockedArmor2ModIcon from './LockedArmor2ModIcon';
import ModPicker from './ModPicker';

interface ProvidedProps {
  selectedStore: DimStore;
  items: ItemsByBucket;
  lockedMap: LockedMap;
  lockedArmor2Mods: LockedArmor2ModMap;
  onLockedMapChanged(lockedMap: ProvidedProps['lockedMap']): void;
  onArmor2ModsChanged(mods: LockedArmor2ModMap): void;
}

interface StoreProps {
  buckets: InventoryBuckets;
  stores: DimStore[];
  isPhonePortrait: boolean;
  language: string;
  defs: D2ManifestDefinitions;
}

type Props = ProvidedProps & StoreProps;

function mapStateToProps() {
  return (state: RootState): StoreProps => ({
    buckets: state.inventory.buckets!,
    stores: storesSelector(state),
    isPhonePortrait: state.shell.isPhonePortrait,
    language: settingsSelector(state).language,
    defs: state.manifest.d2Manifest!
  });
}

/**
 * A control section that allows for locking items and perks, or excluding items from generated sets.
 */
function LockArmorAndPerks({
  selectedStore,
  defs,
  lockedMap,
  lockedArmor2Mods,
  items,
  buckets,
  stores,
  isPhonePortrait,
  onLockedMapChanged,
  onArmor2ModsChanged
}: Props) {
  const [filterPerksOpen, setFilterPerksOpen] = useState(false);
  const [filterModsOpen, setFilterModsOpen] = useState(false);

  /**
   * Lock currently equipped items on a character
   * Recomputes matched sets
   */
  const lockEquipped = () => {
    const newLockedMap: { [bucketHash: number]: LockedItemType[] } = {};
    selectedStore.items.forEach((item) => {
      if (item.equipped && isLoadoutBuilderItem(item)) {
        newLockedMap[item.bucket.hash] = [
          {
            type: 'item',
            item,
            bucket: item.bucket
          }
        ];
      }
    });

    onLockedMapChanged({ ...lockedMap, ...newLockedMap });
  };

  /**
   * Reset all locked items and recompute for all sets
   * Recomputes matched sets
   */
  const resetLocked = () => {
    onLockedMapChanged({});
  };

  const chooseItem = (
    updateFunc: (item: DimItem) => void,
    filter?: (item: DimItem) => boolean
  ) => async (e: React.MouseEvent) => {
    e.preventDefault();

    const order = Object.values(LockableBuckets);
    try {
      const { item } = await showItemPicker({
        hideStoreEquip: true,
        filterItems: (item: DimItem) =>
          Boolean(
            isLoadoutBuilderItem(item) &&
              item.canBeEquippedBy(selectedStore) &&
              (!filter || filter(item))
          ),
        sortBy: (item) => order.indexOf(item.bucket.hash)
      });

      updateFunc(item);
    } catch (e) {}
  };

  const addLockedItemType = (item: LockedItemType) => {
    if (item.bucket) {
      onLockedMapChanged({
        ...lockedMap,
        [item.bucket.hash]: addLockedItem(item, lockedMap[item.bucket.hash])
      });
    }
  };

  const removeLockedItemType = (item: LockedItemType) => {
    if (item.bucket) {
      onLockedMapChanged({
        ...lockedMap,
        [item.bucket.hash]: removeLockedItem(item, lockedMap[item.bucket.hash])
      });
    }
  };

  const onArmor2ModClicked = (item: LockedArmor2Mod) => {
    onArmor2ModsChanged({
      ...lockedArmor2Mods,
      [item.category]: lockedArmor2Mods[item.category]?.filter(
        (ex) => ex.mod.hash !== item.mod.hash
      )
    });
  };

  const addLockItem = (item: DimItem) =>
    addLockedItemType({ type: 'item', item, bucket: item.bucket });
  const addExcludeItem = (item: DimItem) =>
    addLockedItemType({ type: 'exclude', item, bucket: item.bucket });

  const chooseLockItem = chooseItem(
    addLockItem,
    // Exclude types that already have a locked item represented
    (item) =>
      !lockedMap[item.bucket.hash] || !lockedMap[item.bucket.hash]!.some((li) => li.type === 'item')
  );
  const chooseExcludeItem = chooseItem(addExcludeItem);

  let flatLockedMap = _.groupBy(
    Object.values(lockedMap).flatMap((items) => items || []),
    (item) => item.type
  );

  const order = Object.values(LockableBuckets);
  flatLockedMap = _.mapValues(flatLockedMap, (items) =>
    _.sortBy(items, (i: LockedItemCase) => order.indexOf(i.bucket.hash))
  );

  const modOrder = Object.values(ModPickerCategories);
  const flatLockedArmor2Mods: LockedArmor2Mod[] = modOrder
    .flatMap((category) => lockedArmor2Mods[category])
    .filter(Boolean);

  const storeIds = stores.filter((s) => !s.isVault).map((s) => s.id);
  const bucketTypes = buckets.byCategory.Armor.map((b) => b.type!);
  const ghostType = buckets.byHash[LockableBuckets.ghost].type;
  ghostType && bucketTypes.push(ghostType);

  const anyLocked = Object.values(lockedMap).some((lockedItems) => Boolean(lockedItems?.length));

  return (
    <div>
      <div className={styles.area}>
        {(Boolean(flatLockedMap.perk?.length) ||
          Boolean(flatLockedMap.mod?.length) ||
          Boolean(flatLockedMap.burn?.length)) && (
          <div className={styles.itemGrid}>
            {(flatLockedMap.mod || []).map((lockedItem: LockedMod) => (
              <LockedItem
                key={`${lockedItem.bucket?.hash}.${lockedItem.mod.hash}`}
                lockedItem={lockedItem}
                defs={defs}
                onRemove={removeLockedItemType}
              />
            ))}
            {(flatLockedMap.perk || []).map((lockedItem: LockedPerk) => (
              <LockedItem
                key={`${lockedItem.bucket?.hash}.${lockedItem.perk.hash}`}
                lockedItem={lockedItem}
                defs={defs}
                onRemove={removeLockedItemType}
              />
            ))}
            {(flatLockedMap.burn || []).map((lockedItem: LockedBurn) => (
              <LockedItem
                key={`${lockedItem.bucket.hash}.${lockedItem.burn.dmg}`}
                lockedItem={lockedItem}
                defs={defs}
                onRemove={removeLockedItemType}
              />
            ))}
          </div>
        )}
        <div className={styles.buttons}>
          <button className="dim-button" onClick={() => setFilterPerksOpen(true)}>
            <AppIcon icon={addIcon} /> {t('LoadoutBuilder.LockPerk')}
          </button>
          {filterPerksOpen &&
            ReactDOM.createPortal(
              <PerkPicker
                classType={selectedStore.classType}
                items={items}
                lockedMap={lockedMap}
                onClose={() => setFilterPerksOpen(false)}
                onPerksSelected={onLockedMapChanged}
              />,
              document.body
            )}
        </div>
      </div>
      <div className={styles.area}>
        {Boolean(flatLockedArmor2Mods.length) && (
          <div className={styles.itemGrid}>
            {flatLockedArmor2Mods.map((item) => (
              <LockedArmor2ModIcon
                key={item.mod.hash}
                item={item}
                defs={defs}
                onModClicked={() => onArmor2ModClicked(item)}
              />
            ))}
          </div>
        )}
        <div className={styles.buttons}>
          <button className="dim-button" onClick={() => setFilterModsOpen(true)}>
            <AppIcon icon={addIcon} /> {t('LB.ModLockButton')}
          </button>
          {filterModsOpen &&
            ReactDOM.createPortal(
              <ModPicker
                classType={selectedStore.classType}
                lockedArmor2Mods={lockedArmor2Mods}
                onClose={() => setFilterModsOpen(false)}
                onArmor2ModsChanged={onArmor2ModsChanged}
              />,
              document.body
            )}
        </div>
      </div>
      <LoadoutBucketDropTarget
        className={styles.area}
        storeIds={storeIds}
        bucketTypes={bucketTypes}
        onItemLocked={addLockItem}
      >
        {!isPhonePortrait && (!flatLockedMap.item || flatLockedMap.item.length === 0) && (
          <div className={styles.dragHelp}>{t('LoadoutBuilder.DropToLock')}</div>
        )}
        {Boolean(flatLockedMap.item?.length) && (
          <div className={styles.itemGrid}>
            {(flatLockedMap.item || []).map((lockedItem: LockedItemCase) => (
              <LockedItem
                key={lockedItem.item.id}
                lockedItem={lockedItem}
                defs={defs}
                onRemove={removeLockedItemType}
              />
            ))}
          </div>
        )}
        <div className={styles.buttons}>
          <button className="dim-button" onClick={chooseLockItem}>
            <AppIcon icon={addIcon} /> {t('LoadoutBuilder.LockItem')}
          </button>
          <button className="dim-button" onClick={lockEquipped}>
            <AppIcon icon={addIcon} /> {t('LoadoutBuilder.LockEquipped')}
          </button>
        </div>
      </LoadoutBucketDropTarget>
      <LoadoutBucketDropTarget
        className={styles.area}
        storeIds={storeIds}
        bucketTypes={bucketTypes}
        onItemLocked={addExcludeItem}
      >
        {!isPhonePortrait && (!flatLockedMap.exclude || flatLockedMap.exclude.length === 0) && (
          <div className={styles.dragHelp}>{t('LoadoutBuilder.DropToExclude')}</div>
        )}
        {Boolean(flatLockedMap.exclude?.length) && (
          <div className={styles.itemGrid}>
            {(flatLockedMap.exclude || []).map((lockedItem: LockedExclude) => (
              <LockedItem
                key={lockedItem.item.id}
                lockedItem={lockedItem}
                defs={defs}
                onRemove={removeLockedItemType}
              />
            ))}
          </div>
        )}
        <div className={styles.buttons}>
          <button className="dim-button" onClick={chooseExcludeItem}>
            <AppIcon icon={faTimesCircle} /> {t('LoadoutBuilder.ExcludeItem')}
          </button>
        </div>
      </LoadoutBucketDropTarget>
      {anyLocked && (
        <button className="dim-button" onClick={resetLocked}>
          {t('LoadoutBuilder.ResetLocked')}
        </button>
      )}
    </div>
  );
}

export default connect<StoreProps>(mapStateToProps)(LockArmorAndPerks);
