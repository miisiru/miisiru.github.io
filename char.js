import { UnitKit, ActionConfig, ActionType, SkillType, Ability, Unit, LightCone, EventListener, EventHook } from './config.js';
import { getBaseLCId } from './lc.js'

const sundayBonusAbility2 = new EventListener({
    id: "sunday_bonus_ability_2",
    name: "선데이 추가 능력 2 (전투 시작 시 에너지 회복)",
    hook: EventHook.BATTLE_START,
    priority: -80, // 스크린샷과 동일
    condition: (context) => {
        // IF Compare: Variable: Wave Count = 1
        return true;
    },
    effect: (context) => {
        // THEN Update Energy: Caster, Flat: 25, Modified by: ERR
        context.caster.modifyEnergy(25, true); 
    }
});

const evakit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT, energy_cost: 240 })
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
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT, energy_cost: 130 })
);

const robinkit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT, energy_cost: 160 })
);

const huokit = new UnitKit(
    new ActionConfig({ name: "평타", sp_gain: 1, energy_gain: 20 }),
    new ActionConfig({ name: "전스", sp_cost: 1, energy_gain: 30 }),
    new ActionConfig({ name: "궁", energy_gain: 5, action_type: ActionType.ULT, energy_cost: 140 })
);

const Evanescia = new Unit({unit_id: 1505, kit: evakit})
const Sunday = new Unit({unit_id: 1313, kit: sundaykit})
const Robin = new Unit({unit_id: 1309, kit: robinkit})
const Huohuo = new Unit({unit_id: 1217, kit: huokit})

export const availableCharacters = {1505: Evanescia, 1313: Sunday, 1309: Robin, 1217: Huohuo}

export const PRESET_UNITS = [
    Evanescia,
    Sunday,
    Robin,
    Huohuo
];