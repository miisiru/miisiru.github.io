import subStatData from './data/relic_sub_affixes.json' with { type: 'json' };
import mainStatData from './data/relic_main_affixes.json' with { type: 'json' };
import gameData from './data/game_data.json' with { type: 'json' };

import { LightCone } from './config.js';

export function getBaseLCId(id) {
    const idMap = {
        1507: 23059,
        1506: 23057,
        1505: 23058,
        1504: 23056,
        1502: 23054,
        1501: 23053,
        8009: 24006,
        8010: 24006,
        1321: 23050,
        1415: 23052,
        1412: 23048,
        1413: 23049,
        1410: 23047,
        1014: 23045,
        1015: 23056,
        1408: 23044,
        1406: 23043,
        1409: 23042,
        1405: 23041,
        1407: 23040,
        1404: 23039,
        1403: 23038,
        1402: 23036,
        1401: 23037,
        8007: 22006,
        8008: 22006,
        1225: 23035,
        1313: 23034,
        1317: 23033,
        1222: 23032,
        1220: 23031,
        1309: 23026,
        1217: 23017
    }

    return idMap[id] ?? 0;
}