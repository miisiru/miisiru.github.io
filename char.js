import { UnitKit, ActionConfig, ActionType, SkillType, Ability, Unit, LightCone } from './config.js';
import { getBaseLCId } from './lc.js'

const evakit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const sundaykit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ 
        name: "전투 스킬", 
        sp_cost: 1, 
        energy_gain: 30, 
        action_type: ActionType.SKILL, 
        skill_type: SkillType.SUPPORT, 
        ability_values: {aa: 1, ad: 0}, // 여기서 객체 형태로 주었기 때문에 위에서 .aa로 받아야 합니다.
        skill_ability: Ability.ActionGuageModification 
    }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const robinkit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const huokit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT })
);

const Evanescia = new Unit({unit_id: 1505, spd: 135, kit: evakit})
const Sunday = new Unit({unit_id: 1313, spd: 134, kit: sundaykit})
const Robin = new Unit({unit_id: 1309, spd: 134, kit: robinkit})
const Huohuo = new Unit({unit_id: 1217, spd: 134, kit: huokit})

export const availiableCharacters = [Evanescia, Sunday, Robin, Huohuo]

export const PRESET_UNITS = [
    Evanescia,
    Sunday,
    Robin,
    Huohuo
];