import { UnitKit, ActionConfig, EventListener, EventHook} from '../config.js';
import { getBaseLCId } from '../lc.js'
import { Unit } from '../character.js'

const evakit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, energy_cost: 240 })
);

export const Evanescia = new Unit({unit_id: 1505, kit: evakit, rotation: {initial: [], repeat: ['S']}});