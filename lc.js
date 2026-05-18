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

export function getLCStats(lc) {
    // 1. 넘겨받은 광추 객체(lc)가 유효한지 검사
    if (!lc || !lc.id) return null;

    // 2. gameData.lightCones 객체 또는 배열에서 해당 ID의 광추 데이터 가져오기
    // (lightCones가 객체 맵 구조라면 gameData.lightCones[lc.id]로 바로 접근해도 됩니다.)
    const lcData = gameData.lightCones[lc.id] ?? Object.values(gameData.lightCones).find(item => String(item.id) === String(lc.id));
    
    if (!lcData || !lcData.superimpositions) return null;

    // 3. lc.superimposition(중첩 단계) 값 가져오기 (없으면 기본값 1)
    const currentRank = lc.superimposition;

    // 4. 해당 중첩 단계의 스탯 객체를 매칭하여 반환
    // 예: currentRank가 1이면 { "DefenceAddedRatio": 0.24, "StatusProbabilityBase": 0.24 } 가 반환됨
    return lcData.superimpositions[currentRank];
}