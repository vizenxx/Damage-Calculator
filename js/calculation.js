// js/calculation.js

function getAggregatedBuffValue(targetCharIndex, buffKey, isPercentage = true, isDebuffOnEnemy = false) {
    let totalBuffValue = 0;
    const targetCharData = characters[targetCharIndex];

    if (!targetCharData && !isDebuffOnEnemy) {
        return 0;
    }

    if (isDebuffOnEnemy) {
        characters.forEach(sourceChar => {
            if (!sourceChar) return;
            const debuffArrayName = buffKey.endsWith('Bonuses') ? buffKey : buffKey + "Bonuses";
            const debuffArray = sourceChar[debuffArrayName];
            debuffArray?.forEach(debuff => {
                if (debuff.isTriggered) {
                    totalBuffValue += (parseFloat(debuff.value) || 0);
                }
            });
        });
        return isPercentage ? totalBuffValue / 100 : totalBuffValue;
    }

    characters.forEach((sourceCharData, sourceCharIndex) => {
        if (!sourceCharData) return;
        const isSelf = sourceCharIndex === targetCharIndex;
        
        let buffArrayKeyToUse = buffKey;
        if ( !buffKey.endsWith('Bonuses') ) {
             buffArrayKeyToUse = buffKey + "Bonuses";
        }

        const buffArray = sourceCharData[buffArrayKeyToUse];
        if (Array.isArray(buffArray)) {
            buffArray.forEach(buff => {
                if (buff.isTriggered) {
                    if (buff.appliesTo === 'all' ||
                        (isSelf && buff.appliesTo === 'self_only') ||
                        (!isSelf && buff.appliesTo === 'team_only')) {
                        totalBuffValue += (parseFloat(buff.value) || 0);
                    }
                }
            });
        }
    });
    return isPercentage ? totalBuffValue / 100 : totalBuffValue;
}

function getCasterReferenceValue(sourceCharData, statType, isFinal) {
    if (!sourceCharData || !sourceCharData.baseStats) {
        return 0;
    }
    let refValue = parseFloat(sourceCharData.baseStats[statType]) || 0;

    if (isFinal) {
        const actualLevel = parseInt(sourceCharData.actualBreakthroughLevel) || 0;
        
        let effectiveCalcLevel = actualLevel; 

        if (effectiveCalcLevel > 0) {
            refValue = refValue * (1 + (effectiveCalcLevel * 0.02));
            if (statType === 'attack' && effectiveCalcLevel >= 1 && effectiveCalcLevel <= 3) {
                refValue += effectiveCalcLevel * 40;
            }
        }
        
        let ownStatSpecificIncreasePercent = 0;
        if (statType === 'attack' && sourceCharData.attackUpBonuses) {
            sourceCharData.attackUpBonuses.forEach(b => {
                if(b.isTriggered && (b.appliesTo === 'all' || b.appliesTo === 'self_only')) {
                    ownStatSpecificIncreasePercent += (parseFloat(b.value) / 100 || 0);
                }
            });
        }
        refValue *= (1 + ownStatSpecificIncreasePercent);
    }
    return refValue;
}

function getAggregatedCasterFlatAttack(targetCharIndex) {
    let totalFlatCasterAttack = 0;
    if (targetCharIndex < 0 || targetCharIndex >= characters.length || !characters[targetCharIndex]) {
        return 0;
    }

    characters.forEach((sourceCharData, sourceCharIndex) => {
        if (!sourceCharData || !sourceCharData.casterEffects) return;

        sourceCharData.casterEffects.forEach(effect => {
            if (!effect.isTriggered) return;
            let appliesToTarget = false;
            const isSelfEffectSource = sourceCharIndex === targetCharIndex;
            
            if (effect.appliesTo === 'all') appliesToTarget = true;
            else if (isSelfEffectSource && effect.appliesTo === 'self_only') appliesToTarget = true;
            else if (!isSelfEffectSource && effect.appliesTo === 'team_only') appliesToTarget = true;

            if (appliesToTarget) {
                const referenceValue = getCasterReferenceValue(sourceCharData, effect.refStatType, effect.isFinal);
                const effectRate = parseFloat(effect.effectMultiplier) / 100 || 0;
                totalFlatCasterAttack += referenceValue * effectRate;
            }
        });
    });
    return totalFlatCasterAttack;
}

function calculateCharacterDamage(charIndex, formulaTrace = []) {
    const charData = characters[charIndex];
    formulaTrace.length = 0;

    if (!charData) { formulaTrace.push({desc: "错误", expr: `角色数据 (索引 ${charIndex}) 未找到.`}); return { finalDamage: 0, intermediate: { error: `角色数据 (索引 ${charIndex}) 未找到.` }}; }
    if (!enemy) { formulaTrace.push({desc: "错误", expr: "全局敌人数据未找到."}); return { finalDamage: 0, intermediate: { error: "全局敌人数据未找到." }}; }

    const intermediate = {};
    const safeToFixed = (val, precision = 3) => (typeof val === 'number' && !isNaN(val)) ? val.toFixed(precision) : 'NaN';
    const addTrace = (desc, value, comment = '', expr = null) => {
        const valueStr = (typeof value === 'number' && !isNaN(value)) ? safeToFixed(value, 3) : String(value);
        const traceContent = expr ? expr : `${desc}: <span class="trace-value">${valueStr}</span>`;
        formulaTrace.push({ desc, value: (expr ? null : value), comment, expr: traceContent });
    };
    const addExprTrace = (desc, expressionString, resultValue, comment = '') => {
        const resultStr = safeToFixed(resultValue, 3);
        formulaTrace.push({ desc, expr: `${desc}: ${expressionString} = <span class="trace-value">${resultStr}</span>`, comment});
    };
    formulaTrace.push({desc: "--- 开始计算 ---", expr: "--- 开始计算 ---"});

    let baseAttackInput = parseFloat(charData.baseStats.attack) || 0;
    addTrace("基础面值 (攻)", baseAttackInput);
    let baseAttackForFormula = baseAttackInput;
    
    const actualLevel = parseInt(charData.actualBreakthroughLevel) || 0;
    const predictedLevel = parseInt(charData.breakthroughLevel) || 0;
    
    let effectivePercentBonus = 0;
    let effectiveFlatBonus = 0;

    if (predictedLevel > actualLevel) {
        effectivePercentBonus = (predictedLevel - actualLevel) * 0.02;
        for (let lvl = actualLevel + 1; lvl <= predictedLevel; lvl++) {
            if (lvl >= 1 && lvl <= 3) {
                effectiveFlatBonus += 40;
            }
        }
        addTrace("预测突破有效提升(百分比)", effectivePercentBonus, `从${actualLevel}级到${predictedLevel}级`);
        addTrace("预测突破有效提升(固定值)", effectiveFlatBonus, `从${actualLevel}级到${predictedLevel}级`);
    } else {
        addTrace("预测突破等级未超过实际等级", 0, "无额外提升");
    }
    
    baseAttackForFormula = baseAttackForFormula * (1 + effectivePercentBonus) + effectiveFlatBonus;
    intermediate.modifiedBaseValue = baseAttackForFormula;
    addTrace("突破后攻击 (A1)", intermediate.modifiedBaseValue);

    const totalAttackUpPercent = getAggregatedBuffValue(charIndex, 'attackUp', true, false);
    intermediate.totalAttackUpMultiplier = 1 + totalAttackUpPercent;
    addTrace("攻击力UP倍率 (A2)", intermediate.totalAttackUpMultiplier, `(1 + ${safeToFixed(totalAttackUpPercent,3)})`);
    let currentTerm = intermediate.modifiedBaseValue * intermediate.totalAttackUpMultiplier;
    addExprTrace("(A1*A2)", `${safeToFixed(intermediate.modifiedBaseValue,0)} * ${safeToFixed(intermediate.totalAttackUpMultiplier,3)}`, currentTerm);

    intermediate.casterAttackUpFlat = getAggregatedCasterFlatAttack(charIndex) || 0;
    addTrace("施展者攻up (A3)", intermediate.casterAttackUpFlat);
    currentTerm += intermediate.casterAttackUpFlat;
    addExprTrace("(A1*A2)+A3", `${safeToFixed(intermediate.modifiedBaseValue * intermediate.totalAttackUpMultiplier,0)} + ${safeToFixed(intermediate.casterAttackUpFlat,0)}`, currentTerm);

    const totalDefenseDownPercent = getAggregatedBuffValue(charIndex, 'defenseDown', true, true);
    intermediate.totalDefenseDownPercent = totalDefenseDownPercent;
    intermediate.effectiveEnemyDefense = Math.max(0, (enemy.defense||0) * (1 - totalDefenseDownPercent));
    addTrace("有效敌防御 (B)", intermediate.effectiveEnemyDefense, `原防 ${enemy.defense||0}, 减防 ${safeToFixed(totalDefenseDownPercent*100,1)}%`);

    intermediate.termA = currentTerm - intermediate.effectiveEnemyDefense;
    addExprTrace("Term A = ((A1*A2)+A3) - B", `${safeToFixed(currentTerm,0)} - ${safeToFixed(intermediate.effectiveEnemyDefense,0)}`, intermediate.termA);
    if (intermediate.termA <=0) addTrace("警告", "Term A <= 0, 伤害可能为0", "Term A值过低");

    const selectedSkill = charData.skillMultipliers?.find(sm => sm.id === charData.selectedSkillMultiplierId);
    let baseSkillMultiplier = (selectedSkill && selectedSkill.isTriggered) ? (parseFloat(selectedSkill.value) / 100 || 0) : 0;
    
    const skillMultiplierUpBonuses = getAggregatedBuffValue(charIndex, 'skillMultiplierUpBonuses', true, false); // Sum of percentages
    intermediate.skillMultiplierUpBonuses = skillMultiplierUpBonuses;
    addTrace("额外倍率UP (来自倍率UP栏)", intermediate.skillMultiplierUpBonuses, `+${safeToFixed(skillMultiplierUpBonuses*100,1)}%`);
    
    intermediate.weaponSkillMultiplier = baseSkillMultiplier + intermediate.skillMultiplierUpBonuses;
    addTrace("武器/技能倍率 (C)", intermediate.weaponSkillMultiplier, selectedSkill ? `基础: ${selectedSkill.value}% (触发: ${selectedSkill.isTriggered}), 额外: ${safeToFixed(skillMultiplierUpBonuses*100,1)}%` : `无/未触发, 额外: ${safeToFixed(skillMultiplierUpBonuses*100,1)}%`);
    
    let damageSoFar = intermediate.termA * intermediate.weaponSkillMultiplier;
    addExprTrace("D = TermA * C", `${safeToFixed(intermediate.termA,0)} * ${safeToFixed(intermediate.weaponSkillMultiplier,3)}`, damageSoFar);

    let core_bonus_value = 0;
    if (enemy.hasCore && charData.coreDamageBaseChoiceTriggered) {
        core_bonus_value = (parseFloat(charData.coreDamageBaseChoice) || 0); // This is already a multiplier like 2 for 200%
        core_bonus_value += getAggregatedBuffValue(charIndex, 'coreDamageUpBonuses', true, false); // This adds percentages
    }
    intermediate.coreDamage_bonus_part = core_bonus_value;
    addTrace("核心伤提供的[额外增伤值] (E1_bonus)", core_bonus_value, enemy.hasCore ? (charData.coreDamageBaseChoiceTriggered ? `基础选择 ${charData.coreDamageBaseChoice} 已触发` : "未触发") : "无核心");
    
    let crit_bonus_value = 0;
    intermediate.critDamage_from_bonuses_part = 0;
    if (charData.critDamageUp && charData.critDamageUp.isTriggered) {
        crit_bonus_value = 0.5; // Base crit damage
        const additionalCritFromBonuses = getAggregatedBuffValue(charIndex, 'critDamageUpBonuses', true, false);
        crit_bonus_value += additionalCritFromBonuses;
        intermediate.critDamage_from_bonuses_part = additionalCritFromBonuses;
    }
    intermediate.critDamage_bonus_part = crit_bonus_value;
    addTrace("暴伤提供的[额外增伤值] (E2_bonus)", crit_bonus_value, charData.critDamageUp?.isTriggered ? `触发 (基础0.5 + ${safeToFixed(intermediate.critDamage_from_bonuses_part*100,0)}% from bonuses)` : "未触发");
    
    let dist_bonus_value = 0; if (charData.distanceUp && charData.distanceUp.isTriggered) { dist_bonus_value = (parseFloat(charData.distanceUp.value) / 100 || 0.3); }
    intermediate.distance_bonus_part = dist_bonus_value;
    addTrace("距离提供的[额外增伤值] (E3_bonus)", dist_bonus_value, charData.distanceUp?.isTriggered ? `触发 (+${charData.distanceUp.value}%)` : "未触发");

    let burst_bonus_value = 0; if (charData.burstUp && charData.burstUp.isTriggered) { burst_bonus_value = (parseFloat(charData.burstUp.value) / 100 || 0.5); }
    intermediate.burst_bonus_part = burst_bonus_value;
    addTrace("爆裂提供的[额外增伤值] (E4_bonus)", burst_bonus_value, charData.burstUp?.isTriggered ? `触发 (+${charData.burstUp.value}%)` : "未触发");

    intermediate.sum_of_just_additive_bonuses = (core_bonus_value||0) + (crit_bonus_value||0) + (dist_bonus_value||0) + (burst_bonus_value||0);
    addTrace("额外增伤值总和 (E_bonus_sum)", intermediate.sum_of_just_additive_bonuses);

    let actualAdditiveGroupMultiplier = 1;
    const isAnyAdditiveCategoryTriggered = (enemy.hasCore && charData.coreDamageBaseChoiceTriggered) ||
                                          (charData.critDamageUp && charData.critDamageUp.isTriggered) ||
                                          (charData.distanceUp && charData.distanceUp.isTriggered) ||
                                          (charData.burstUp && charData.burstUp.isTriggered);
    if (isAnyAdditiveCategoryTriggered) {
        actualAdditiveGroupMultiplier = 1 + intermediate.sum_of_just_additive_bonuses;
    }
    intermediate.additiveDamageBonusesSum = actualAdditiveGroupMultiplier;
    addTrace("加算类组倍率 (E_mult)", actualAdditiveGroupMultiplier, isAnyAdditiveCategoryTriggered ? "1 + E_bonus_sum" : "所有类别未触发, 视为x1");
    damageSoFar *= actualAdditiveGroupMultiplier;
    addExprTrace("F = D * E_mult", `${safeToFixed(intermediate.termA * intermediate.weaponSkillMultiplier,0)} * ${safeToFixed(actualAdditiveGroupMultiplier,3)}`, damageSoFar);

    const specialDamageUpPercent = getAggregatedBuffValue(charIndex, 'specialDamageUpBonuses', true, false); // Corrected key
    intermediate.totalSpecialDamageUpMultiplier = 1 + specialDamageUpPercent;
    addTrace("特殊伤害up倍率 (G)", intermediate.totalSpecialDamageUpMultiplier, `1 + ${safeToFixed(specialDamageUpPercent,3)}`);
    damageSoFar *= intermediate.totalSpecialDamageUpMultiplier;
    addExprTrace("H = F * G", `${safeToFixed(intermediate.termA * intermediate.weaponSkillMultiplier * actualAdditiveGroupMultiplier)} * ${safeToFixed(intermediate.totalSpecialDamageUpMultiplier,3)}`, damageSoFar);

    let baseChargeUsedInCalc;
    if (charData.chargeUpBase && charData.chargeUpBase.isTriggered) {
        baseChargeUsedInCalc = parseFloat(charData.chargeUpBase.value) || 1;
    } else {
        baseChargeUsedInCalc = 1; // Strictly 1x if not triggered
    }
    intermediate.baseChargeMultiplierValue = baseChargeUsedInCalc;
    let finalCalculatedChargeValue = baseChargeUsedInCalc;
    let chargeTraceComment = `基础选择: ${safeToFixed(baseChargeUsedInCalc,1)} (${charData.chargeUpBase && charData.chargeUpBase.isTriggered ? "触发, 使用下拉框值" : "未触发, 使用1x"})`;
    
    let additionalChargePercentTotal = 0;
    let baseModificationFactor = 0;

    characters.forEach((sourceChar, sourceIdx) => {
        if (!sourceChar || !sourceChar.chargeUpBonuses) return;
        const isSelfSource = sourceIdx === charIndex;
        sourceChar.chargeUpBonuses.forEach(bonus => {
            if (!bonus.isTriggered) return;
            const bonusValueDecimal = parseFloat(bonus.value) / 100 || 0;
            let applies = false;
            if (bonus.appliesTo === 'all') applies = true;
            else if (isSelfSource && bonus.appliesTo === 'self_only') applies = true;
            else if (!isSelfSource && bonus.appliesTo === 'team_only') applies = true;

            if (applies) {
                if (bonus.isSpecialBaseBuff && isSelfSource) {
                    baseModificationFactor += bonusValueDecimal;
                    chargeTraceComment += ` + (自基修*${safeToFixed(bonusValueDecimal,2)})`;
                } else {
                    additionalChargePercentTotal += bonusValueDecimal;
                    chargeTraceComment += isSelfSource ? ` + (自${safeToFixed(bonusValueDecimal,2)})` : ` + (队${safeToFixed(bonusValueDecimal,2)})`;
                }
            }
        });
    });
    
    finalCalculatedChargeValue = baseChargeUsedInCalc * (1 + baseModificationFactor);
    finalCalculatedChargeValue += additionalChargePercentTotal;

    intermediate.totalChargeUpMultiplier = Math.max(1, finalCalculatedChargeValue);
    addTrace("蓄力up倍率 (I)", intermediate.totalChargeUpMultiplier, chargeTraceComment);
    damageSoFar *= intermediate.totalChargeUpMultiplier;
    addExprTrace("J = H * I", `${safeToFixed(intermediate.termA * intermediate.weaponSkillMultiplier * actualAdditiveGroupMultiplier * intermediate.totalSpecialDamageUpMultiplier)} * ${safeToFixed(intermediate.totalChargeUpMultiplier,3)}`, damageSoFar);

    let supMultiplier = 1.0;
    let superiorityTraceComment = "未触发基础优越";
    if (charData.superiorityUp && charData.superiorityUp.isBaseTriggered) {
        supMultiplier = (1 + charData.superiorityUp.baseValueReadOnly);
        const additionalSuperiorityPercent = getAggregatedBuffValue(charIndex, 'superiorityUpBonuses', true, false) || 0;
        supMultiplier += additionalSuperiorityPercent;
        superiorityTraceComment = `基础触发: ${(1 + charData.superiorityUp.baseValueReadOnly).toFixed(1)}x + 额外 ${safeToFixed(additionalSuperiorityPercent*100,1)}%`;
    }
    intermediate.totalSuperiorityUpMultiplier = supMultiplier;
    addTrace("优越up总倍率 (K)", intermediate.totalSuperiorityUpMultiplier, superiorityTraceComment);
    damageSoFar *= intermediate.totalSuperiorityUpMultiplier;
    addExprTrace("L = J * K", `${safeToFixed(intermediate.termA * intermediate.weaponSkillMultiplier * actualAdditiveGroupMultiplier * intermediate.totalSpecialDamageUpMultiplier * intermediate.totalChargeUpMultiplier)} * ${safeToFixed(intermediate.totalSuperiorityUpMultiplier,3)}`, damageSoFar);

    const totalDamageTakenUpPercent = getAggregatedBuffValue(charIndex, 'damageTakenUpBonuses', true, true); // Corrected key
    intermediate.totalDamageTakenUpMultiplier = 1 + totalDamageTakenUpPercent;
    addTrace("受伤up倍率 (M)", intermediate.totalDamageTakenUpMultiplier, `1 + ${safeToFixed(totalDamageTakenUpPercent,3)} (来自敌方debuff)`);
    damageSoFar *= intermediate.totalDamageTakenUpMultiplier;
    let damageBeforeAttackCount = damageSoFar;
    addExprTrace("伤害 (攻击次数前) = L * M", `${safeToFixed(intermediate.termA * intermediate.weaponSkillMultiplier * actualAdditiveGroupMultiplier * intermediate.totalSpecialDamageUpMultiplier * intermediate.totalChargeUpMultiplier * intermediate.totalSuperiorityUpMultiplier)} * ${safeToFixed(intermediate.totalDamageTakenUpMultiplier,3)}`, damageBeforeAttackCount);
    
    intermediate.attackCount = parseFloat(charData.attackCount) || 1;
    addTrace("攻击次数 (N)", intermediate.attackCount);
    damageSoFar *= intermediate.attackCount;
    addExprTrace("最终伤害 = (L*M) * N", `${safeToFixed(damageBeforeAttackCount)} * ${safeToFixed(intermediate.attackCount,0)}`, damageSoFar);


    let finalDamage = damageSoFar;
    if (intermediate.termA <= 0 || intermediate.weaponSkillMultiplier <= 0) {
        finalDamage = 0; addTrace("修正", finalDamage, "TermA或技能倍率为0/负数");
    }
    finalDamage = Math.max(0, finalDamage);
    addTrace("最终伤害 (调整后)", finalDamage, "确保非负");
    formulaTrace.push({desc: "--- 计算结束 ---", expr: "--- 计算结束 ---"});

    charData.outputDamage = finalDamage;
    charData.intermediateResults = intermediate; 

    return { finalDamage: finalDamage, intermediate: intermediate };
}