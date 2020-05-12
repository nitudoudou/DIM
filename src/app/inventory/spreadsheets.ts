import { DimGridNode, DimItem, DimSockets } from './item-types';
import { ItemInfos, getNotes, getTag, tagConfig } from './dim-item-info';
import { setItemNote, setItemTagsBulk } from './actions';

import { D2EventInfo } from 'data/d2/d2-event-info';
import { D2SeasonInfo } from './d2-season-info';
import D2Sources from 'data/d2/source-info';
import { DestinyClass } from 'bungie-api-ts/destiny2';
import { DimStore } from './store-types';
import { DtrRating } from '../item-review/dtr-api-types';
import Papa from 'papaparse';
import { ThunkResult } from 'app/store/reducers';
import _ from 'lodash';
import { getActivePlatform } from '../accounts/platforms';
import { getClass } from './store/character-utils';
import { download } from 'app/utils/util';
import { getRating } from '../item-review/reducer';
import { getSpecialtySocketMetadata } from 'app/utils/item-utils';
import store from '../store/store';
import { t } from 'app/i18next-t';

// step node names we'll hide, we'll leave "* Chroma" for now though, since we don't otherwise indicate Chroma
const FILTER_NODE_NAMES = [
  'Upgrade Defense',
  'Ascend',
  'Infuse',
  'Increase Intellect',
  'Increase Discipline',
  'Increase Strength',
  'Twist Fate',
  'The Life Exotic',
  'Reforge Artifact',
  'Reforge Shell',
  'Deactivate Chroma',
  'Kinetic Damage',
  'Solar Damage',
  'Arc Damage',
  'Void Damage',
  'Default Shader',
  'Default Ornament',
  'Empty Mod Socket',
  'No Projection'
];

// ignore raid sources in favor of more detailed sources
delete D2Sources.raid;

export function downloadCsvFiles(
  stores: DimStore[],
  itemInfos: ItemInfos,
  type: 'Weapons' | 'Armor' | 'Ghost'
) {
  // perhaps we're loading
  if (stores.length === 0) {
    alert(t('Settings.ExportSSNoStores'));
    return;
  }
  const nameMap = {};
  let allItems: DimItem[] = [];
  stores.forEach((store) => {
    allItems = allItems.concat(store.items);
    nameMap[store.id] =
      store.id === 'vault'
        ? 'Vault'
        : `${capitalizeFirstLetter(getClass(store.classType))}(${store.powerLevel})`;
  });
  const items: DimItem[] = [];
  allItems.forEach((item) => {
    if (!item.primStat && type !== 'Ghost') {
      return;
    }

    if (type === 'Weapons') {
      if (
        item.primStat &&
        (item.primStat.statHash === 368428387 || item.primStat.statHash === 1480404414)
      ) {
        items.push(item);
      }
    } else if (type === 'Armor') {
      if (item.primStat?.statHash === 3897883278) {
        items.push(item);
      }
    } else if (type === 'Ghost' && item.bucket.hash === 4023194814) {
      items.push(item);
    }
  });
  switch (type) {
    case 'Weapons':
      downloadWeapons(items, nameMap, itemInfos);
      break;
    case 'Armor':
      downloadArmor(items, nameMap, itemInfos);
      break;
    case 'Ghost':
      downloadGhost(items, nameMap, itemInfos);
      break;
  }
}

interface CSVRow {
  Notes: string;
  Tag: string;
  Hash: string;
  Id: string;
}

export function importTagsNotesFromCsv(files: File[]): ThunkResult<any> {
  return async (dispatch) => {
    const account = getActivePlatform();
    if (!account) {
      return;
    }

    let total = 0;

    for (const file of files) {
      const results = await new Promise<Papa.ParseResult>((resolve, reject) =>
        Papa.parse(file, {
          header: true,
          complete: resolve,
          error: reject
        })
      );
      if (
        results.errors &&
        results.errors.length &&
        !results.errors.every((e) => e.code === 'TooManyFields' || e.code === 'TooFewFields')
      ) {
        throw new Error(results.errors[0].message);
      }
      const contents: CSVRow[] = results.data;

      if (!contents || !contents.length) {
        throw new Error(t('Csv.EmptyFile'));
      }

      const row = contents[0];
      if (!('Id' in row) || !('Hash' in row) || !('Tag' in row) || !('Notes' in row)) {
        throw new Error(t('Csv.WrongFields'));
      }

      dispatch(
        setItemTagsBulk(
          _.compact(
            contents.map((row) => {
              if ('Id' in row && 'Hash' in row) {
                row.Tag = row.Tag.toLowerCase();
                row.Id = row.Id.replace(/"/g, ''); // strip quotes from row.Id
                return {
                  tag: row.Tag in tagConfig ? tagConfig[row.Tag].type : undefined,
                  itemId: row.Id
                };
              }
            })
          )
        )
      );

      for (const row of contents) {
        if ('Id' in row && 'Hash' in row) {
          row.Tag = row.Tag.toLowerCase();
          row.Id = row.Id.replace(/"/g, ''); // strip quotes from row.Id
          dispatch(
            setItemNote({
              note: row.Notes,
              itemId: row.Id
            })
          );
        }
      }

      total += contents.length;
    }

    return total;
  };
}

function capitalizeFirstLetter(str: string) {
  if (!str || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function downloadCsv(filename: string, csv: string) {
  download(csv, `${filename}.csv`, 'text/csv');
}

function buildSocketNames(sockets: DimSockets): string[] {
  const socketItems = sockets.sockets.map((s) =>
    s.plugOptions
      .filter((p) => !FILTER_NODE_NAMES.some((n) => n === p.plugItem.displayProperties.name))
      .map((p) =>
        s.plug?.plugItem.hash === p.plugItem.hash
          ? `${p.plugItem.displayProperties.name}*`
          : p.plugItem.displayProperties.name
      )
  );

  return socketItems.flat();
}

function buildNodeNames(nodes: DimGridNode[]): string[] {
  return _.compact(
    nodes.map((node) => {
      if (FILTER_NODE_NAMES.includes(node.name)) {
        return;
      }
      return node.activated ? `${node.name}*` : node.name;
    })
  );
}

function getMaxPerks(items: DimItem[]) {
  // We need to always emit enough columns for all perks
  return (
    _.max(
      items.map(
        (item) =>
          (item.talentGrid
            ? buildNodeNames(item.talentGrid.nodes)
            : item.isDestiny2() && item.sockets
            ? buildSocketNames(item.sockets)
            : []
          ).length
      )
    ) || 0
  );
}

function addPerks(row: object, item: DimItem, maxPerks: number) {
  const perks = item.talentGrid
    ? buildNodeNames(item.talentGrid.nodes)
    : item.isDestiny2() && item.sockets
    ? buildSocketNames(item.sockets)
    : [];

  _.times(maxPerks, (index) => {
    row[`Perks ${index}`] = perks[index];
  });
}

function downloadGhost(items: DimItem[], nameMap: { [key: string]: string }, itemInfos: ItemInfos) {
  // We need to always emit enough columns for all perks
  const maxPerks = getMaxPerks(items);

  const data = items.map((item) => {
    const row: any = {
      Name: item.name,
      Hash: item.hash,
      Id: `"${item.id}"`,
      Tag: getTag(item, itemInfos),
      Tier: item.tier,
      Source: source(item),
      Owner: nameMap[item.owner],
      Locked: item.locked,
      Equipped: item.equipped,
      Notes: getNotes(item, itemInfos)
    };

    addPerks(row, item, maxPerks);

    return row;
  });

  downloadCsv('destinyGhosts', Papa.unparse(data));
}

function equippable(item: DimItem) {
  return item.classType === DestinyClass.Unknown ? 'Any' : item.classTypeNameLocalized;
}

export function source(item: DimItem) {
  if (item.isDestiny2()) {
    return (
      Object.keys(D2Sources).find(
        (src) =>
          D2Sources[src].sourceHashes.includes(item.source) ||
          D2Sources[src].itemHashes.includes(item.hash)
      ) || ''
    );
  }
}

export const armorStatHashes = {
  Mobility: 2996146975,
  Resilience: 392767087,
  Recovery: 1943323491,
  Discipline: 1735777505,
  Intellect: 144602215,
  Strength: 4244567218,
  Total: -1000
};

function downloadArmor(items: DimItem[], nameMap: { [key: string]: string }, itemInfos: ItemInfos) {
  // We need to always emit enough columns for all perks
  const maxPerks = getMaxPerks(items);

  const data = items.map((item) => {
    const row: any = {
      Name: item.name,
      Hash: item.hash,
      Id: `"${item.id}"`,
      Tag: getTag(item, itemInfos),
      Tier: item.tier,
      Type: item.typeName,
      Source: source(item),
      Equippable: equippable(item),
      [item.isDestiny1() ? 'Light' : 'Power']: item.primStat?.value
    };
    if (item.isDestiny2()) {
      row['Masterwork Type'] = item.masterworkInfo?.statName;
      row['Masterwork Tier'] = item.masterworkInfo?.tier
        ? Math.min(10, item.masterworkInfo.tier)
        : undefined;
    }
    row.Owner = nameMap[item.owner];
    if (item.isDestiny1()) {
      row['% Leveled'] = (item.percentComplete * 100).toFixed(0);
    }
    if (item.isDestiny2()) {
      row['Armor2.0'] = Boolean(item.energy);
    }
    row.Locked = item.locked;
    row.Equipped = item.equipped;
    if (item.isDestiny1()) {
      row.Year = item.year;
    } else if (item.isDestiny2()) {
      row.Year = D2SeasonInfo[item.season].year;
    }
    if (item.isDestiny2()) {
      row.Season = item.season;
      row.Event = item.event ? D2EventInfo[item.event].name : '';
    }

    if ($featureFlags.reviewsEnabled) {
      const dtrRating = getDtrRating(item);

      if (dtrRating?.overallScore) {
        row['DTR Rating'] = dtrRating.overallScore;
        row['# of Reviews'] = dtrRating.ratingCount;
      } else {
        row['DTR Rating'] = 'N/A';
        row['# of Reviews'] = 'N/A';
      }
    }

    if (item.isDestiny1()) {
      row['% Quality'] = item.quality ? item.quality.min : 0;
    }
    const stats: { [name: string]: { value: number; pct: number; base: number } } = {};
    if (item.isDestiny1() && item.stats) {
      item.stats.forEach((stat) => {
        let pct = 0;
        if (stat.scaled?.min) {
          pct = Math.round((100 * stat.scaled.min) / (stat.split || 1));
        }
        stats[stat.statHash] = {
          value: stat.value,
          pct,
          base: 0
        };
      });
    } else if (item.isDestiny2() && item.stats) {
      item.stats.forEach((stat) => {
        stats[stat.statHash] = {
          value: stat.value,
          base: stat.base,
          pct: 0
        };
      });
    }
    if (item.isDestiny1()) {
      row['% IntQ'] = stats.Intellect ? stats.Intellect.pct : 0;
      row['% DiscQ'] = stats.Discipline ? stats.Discipline.pct : 0;
      row['% StrQ'] = stats.Strength ? stats.Strength.pct : 0;
      row.Int = stats.Intellect ? stats.Intellect.value : 0;
      row.Disc = stats.Discipline ? stats.Discipline.value : 0;
      row.Str = stats.Strength ? stats.Strength.value : 0;
    } else {
      const armorStats = Object.keys(armorStatHashes).map((statName) => ({
        name: statName,
        stat: stats[armorStatHashes[statName]]
      }));
      armorStats.forEach((stat) => {
        row[stat.name] = stat.stat ? stat.stat.value : 0;
      });
      armorStats.forEach((stat) => {
        row[`${stat.name} (Base)`] = stat.stat ? stat.stat.base : 0;
      });

      if (item.isDestiny2() && item.sockets) {
        row['Seasonal Mod'] = getSpecialtySocketMetadata(item)?.tag ?? '';
      }
    }

    row.Notes = getNotes(item, itemInfos);

    addPerks(row, item, maxPerks);

    return row;
  });
  downloadCsv('destinyArmor', Papa.unparse(data));
}

function getDtrRating(item: DimItem): DtrRating | undefined {
  return getRating(item, store.getState().reviews.ratings);
}

function downloadWeapons(
  items: DimItem[],
  nameMap: { [key: string]: string },
  itemInfos: ItemInfos
) {
  // We need to always emit enough columns for all perks
  const maxPerks = getMaxPerks(items);

  const data = items.map((item) => {
    const row: any = {
      Name: item.name,
      Hash: item.hash,
      Id: `"${item.id}"`,
      Tag: getTag(item, itemInfos),
      Tier: item.tier,
      Type: item.typeName,
      Source: source(item),
      [item.isDestiny1() ? 'Light' : 'Power']: item.primStat?.value,
      Category: item.bucket.type,
      Element: item.element?.displayProperties.name
    };
    if (item.isDestiny2()) {
      row['Masterwork Type'] = item.masterworkInfo?.statName;
      row['Masterwork Tier'] = item.masterworkInfo?.tier
        ? Math.min(10, item.masterworkInfo.tier)
        : undefined;
    }
    row.Owner = nameMap[item.owner];
    if (item.isDestiny1()) {
      row['% Leveled'] = (item.percentComplete * 100).toFixed(0);
    }
    row.Locked = item.locked;
    row.Equipped = item.equipped;
    if (item.isDestiny1()) {
      row.Year = item.year;
    } else if (item.isDestiny2()) {
      row.Year = D2SeasonInfo[item.season].year;
    }
    if (item.isDestiny2()) {
      row.Season = item.season;
      row.Event = item.event ? D2EventInfo[item.event].name : '';
    }

    const dtrRating = getDtrRating(item);

    if ($featureFlags.reviewsEnabled) {
      if (dtrRating?.overallScore) {
        row['DTR Rating'] = dtrRating.overallScore;
        row['# of Reviews'] = dtrRating.ratingCount;
      } else {
        row['DTR Rating'] = 'N/A';
        row['# of Reviews'] = 'N/A';
      }
    }

    const stats = {
      aa: 0,
      impact: 0,
      range: 0,
      stability: 0,
      rof: 0,
      reload: 0,
      magazine: 0,
      equipSpeed: 0,
      drawtime: 0,
      chargetime: 0,
      accuracy: 0,
      recoil: 0,
      blastRadius: 0,
      velocity: 0
    };

    if (item.stats) {
      item.stats.forEach((stat) => {
        if (stat.value) {
          switch (stat.statHash) {
            case 2715839340: // Recoil direction
              stats.recoil = stat.value;
              break;
            case 1345609583: // Aim Assist
              stats.aa = stat.value;
              break;
            case 4043523819: // Impact
              stats.impact = stat.value;
              break;
            case 1240592695: // Range
              stats.range = stat.value;
              break;
            case 155624089: // Stability
              stats.stability = stat.value;
              break;
            case 4284893193: // Rate of fire
              stats.rof = stat.value;
              break;
            case 4188031367: // Reload
              stats.reload = stat.value;
              break;
            case 3871231066: // Magazine
            case 925767036: // Energy
              stats.magazine = stat.value;
              break;
            case 943549884: // Equip Speed
              stats.equipSpeed = stat.value;
              break;
            case 447667954: // Draw Time
              stats.drawtime = stat.value;
              break;
            case 2961396640: // Charge Time
              stats.chargetime = stat.value;
              break;
            case 1591432999: // accuracy
              stats.accuracy = stat.value;
              break;
            case 3614673599: // Blast Radius
              stats.blastRadius = stat.value;
              break;
            case 2523465841: // Velocity
              stats.velocity = stat.value;
              break;
          }
        }
      });
    }

    row.Recoil = stats.recoil;
    row.AA = stats.aa;
    row.Impact = stats.impact;
    row.Range = stats.range;
    row['Blast Radius'] = stats.blastRadius;
    row.Velocity = stats.velocity;
    row.Stability = stats.stability;
    row.ROF = stats.rof;
    row.Reload = stats.reload;
    row.Mag = stats.magazine;
    row.Equip = stats.equipSpeed;
    row['Charge Time'] = stats.chargetime;
    if (item.isDestiny2()) {
      row['Draw Time'] = stats.drawtime;
      row.Accuracy = stats.accuracy;
    }
    row.Notes = getNotes(item, itemInfos);

    addPerks(row, item, maxPerks);

    return row;
  });
  downloadCsv('destinyWeapons', Papa.unparse(data));
}
