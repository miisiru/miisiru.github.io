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

const PRESET_UNITS = [
    new Unit(1505, "에바네시아", [135, 60], evakit),
    new Unit(1313, "선데이", [134, 50], sundaykit),
    new Unit(1309, "로빈", [134, 50], robinkit),
    new Unit(1217, "곽향", [134, 50], huokit)
];