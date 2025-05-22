// js/calculation.js

function getAggregatedBuffValue(targetCharIndex, buffKey, isPercentage = true, isDebuffOnEnemy = false) {
    let totalBuffValue = 0;
    const targetCharData = characters[targetCharIndex];

    if (!targetCharData && !isDebuffOnEnemy) {
        console.warn(`[calculation.js] getAggregatedBuffValue: Target character data missing for index ${targetCharIndex} and not a debuff check.`);
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

    // For self/team buffs
    characters.forEach((sourceCharData, sourceCharIndex) => {
        if (!sourceCharData) return;
        const isSelf = sourceCharIndex === targetCharIndex;

        // Handle static buff objects like charData.critDamageUp, charData.distanceUp etc.
        // This part is NOT for array-based bonuses like attackUpBonuses or superiorityUpBonuses.
        const staticBuff = sourceCharData[buffKey];
        if (staticBuff && typeof staticBuff.value !== 'undefined' && typeof staticBuff.isTriggered !== 'undefined') { // Check if it's a structured buff object
            if (staticBuff.isTriggered) {
                if (staticBuff.appliesTo === 'all' ||
                    (isSelf && staticBuff.appliesTo === 'self_only') ||
                    (!isSelf && staticBuff.appliesTo === 'team_only')) {
                    totalBuffValue += (parseFloat(staticBuff.value) || 0);
                }
            }
        }

        // Handle array-based bonuses (e.g., attackUpBonuses, superiorityUpBonuses)
        // If buffKey itself is the array name (e.g., "attackUpBonuses"), use it directly.
        // If buffKey is a base (e.g., "attackUp"), append "Bonuses".
        let buffArrayKeyToUse = buffKey;
        if ( buffKey !== 'skillMultipliers' &&
             buffKey !== 'casterEffects' &&
            !buffKey.endsWith('Bonuses') &&  // e.g. "attackUp" -> "attackUpBonuses"
            !buffKey.endsWith('s') // To avoid something like "casterEffects" -> "casterEffectsBonuses"
           ) {
             buffArrayKeyToUse = buffKey + "Bonuses";
        } else if (buffKey.endsWith('Up') && !buffKey.endsWith('Bonuses')) { // Catches "attackUp", "coreDamageUp" etc.
            buffArrayKeyToUse = buffKey + "Bonuses";
        }


        const buffArray = sourceCharData[buffArrayKeyToUse];
        if (Array.isArray(buffArray)) {
            buffArray.forEach(buff => {
                if (buff.isTriggered) {
                    // appliesTo check:
                    // 'all': always applies
                    // 'self_only': applies if sourceChar is targetChar
                    // 'team_only': applies if sourceChar is NOT targetChar (buffing others)
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
        if (sourceCharData.breakthroughLevel !== 'initial') {
            const level = parseInt(sourceCharData.breakthroughLevel);
            if (level > 0) {
                refValue = refValue * (1 + (level * 0.02));
                if (statType === 'attack' && level >= 1 && level <= 3) {
                    refValue += level * 40;
                }
            }
        }
        let ownStatSpecificIncreasePercent = 0;
        // Only consider self_only or all attackUpBonuses for this specific caster's final stat
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
    formulaTrace.length = 0; // Clear previous trace for this character

    if (!charData) {
        console.error(`[calculation.js] calculateCharacterDamage: Character data for index ${charIndex} not found.`);
        formulaTrace.push({desc: "ERROR", expr: `Character data for index ${charIndex} not found.`});
        return { finalDamage: 0, intermediate: { error: `Character data for index ${charIndex} not found.` }};
    }

    const intermediate = {};

    const safeToFixed = (val, precision = 3) => (typeof val === 'number' && !isNaN(val)) ? val.toFixed(precision) : 'NaN';

    const addTrace = (desc, value, comment = '', expr = null) => {
        const valueStr = safeToFixed(value, 3);
        const traceContent = expr ? expr : `${desc}: <span class="trace-value">${valueStr}</span>`;
        formulaTrace.push({ desc, value: (expr ? null : value), comment, expr: traceContent });
    };
    const addExprTrace = (desc, expressionString, resultValue, comment = '') => {
        const resultStr = safeToFixed(resultValue, 3);
        formulaTrace.push({ desc, expr: `${desc}: ${expressionString} = <span class="trace-value">${resultStr}</span>`, comment});
    };
    formulaTrace.push({desc: "--- 开始计算 ---", expr: "--- 开始计算 ---"});

    // 1. 面值*突破up
    let baseAttackInput = parseFloat(charData.baseStats.attack) || 0;
    addTrace("基础面值 (攻)", baseAttackInput);
    let baseAttackForFormula = baseAttackInput;
    intermediate.breakthroughMultiplier = 1; intermediate.breakthroughFlat = 0;
    if (charData.breakthroughLevel !== 'initial') {
        const level = parseInt(charData.breakthroughLevel);
        if (level > 0) {
            intermediate.breakthroughMultiplier = (1 + (level * 0.02));
            baseAttackForFormula *= intermediate.breakthroughMultiplier;
            addTrace("突破 %提升后", baseAttackForFormula, `等级 ${level} (x${safeToFixed(intermediate.breakthroughMultiplier)})`);
        }
        if (level >= 1 && level <= 3) {
            intermediate.breakthroughFlat = level * 40;
            baseAttackForFormula += intermediate.breakthroughFlat;
            addTrace("突破固定值提升后", baseAttackForFormula, `+${intermediate.breakthroughFlat}`);
        }
    }
    intermediate.modifiedBaseValue = baseAttackForFormula;
    addTrace("面值*突破up (A1)", intermediate.modifiedBaseValue);

    // 2. 攻击力up
    // For attackUp, we pass 'attackUp' and getAggregatedBuffValue will look for 'attackUpBonuses'
    const totalAttackUpPercent = getAggregatedBuffValue(charIndex, 'attackUp', true);
    intermediate.totalAttackUpMultiplier = 1 + totalAttackUpPercent;
    addTrace("攻击力UP倍率 (A2)", intermediate.totalAttackUpMultiplier, `(1 + ${safeToFixed(totalAttackUpPercent)})`);
    let currentTerm = intermediate.modifiedBaseValue * intermediate.totalAttackUpMultiplier;
    addExprTrace("(A1*A2)", `${safeToFixed(intermediate.modifiedBaseValue,0)} * ${safeToFixed(intermediate.totalAttackUpMultiplier)}`, currentTerm);

    // 3. 施展者攻up
    intermediate.casterAttackUpFlat = getAggregatedCasterFlatAttack(charIndex) || 0;
    addTrace("施展者攻up (A3)", intermediate.casterAttackUpFlat);
    let prevTermForLog1 = currentTerm;
    currentTerm += intermediate.casterAttackUpFlat;
    addExprTrace("(A1*A2)+A3", `${safeToFixed(prevTermForLog1,0)} + ${safeToFixed(intermediate.casterAttackUpFlat,0)}`, currentTerm);

    // 4. 敌防御力 * (1- 防御down倍率)
    // For defenseDown, pass 'defenseDown' and getAggregatedBuffValue will look for 'defenseDownBonuses'
    const totalDefenseDownPercent = getAggregatedBuffValue(charIndex, 'defenseDown', true, true); // true for isDebuffOnEnemy
    intermediate.totalDefenseDownPercent = totalDefenseDownPercent;
    intermediate.effectiveEnemyDefense = Math.max(0, (enemy.defense||0) * (1 - totalDefenseDownPercent));
    addTrace("有效敌防御 (B)", intermediate.effectiveEnemyDefense, `原防 ${enemy.defense||0}, 减防 ${safeToFixed(totalDefenseDownPercent*100,1)}%`);

    let prevTermForLog2 = currentTerm;
    intermediate.termA = currentTerm - intermediate.effectiveEnemyDefense;
    addExprTrace("Term A = ((A1*A2)+A3) - B", `${safeToFixed(prevTermForLog2,0)} - ${safeToFixed(intermediate.effectiveEnemyDefense,0)}`, intermediate.termA);
    if (intermediate.termA <=0) addTrace("警告", "Term A <= 0, 伤害将为0");

    // 5. 武器/技能倍率
    const selectedSkill = charData.skillMultipliers ? charData.skillMultipliers.find(sm => sm.id === charData.selectedSkillMultiplierId) : null;
    intermediate.weaponSkillMultiplier = (selectedSkill && selectedSkill.isTriggered) ? (parseFloat(selectedSkill.value) / 100 || 0) : 0;
    addTrace("武器/技能倍率 (C)", intermediate.weaponSkillMultiplier, selectedSkill ? `来自: ${selectedSkill.value}% (ID: ${selectedSkill.id}, Triggered: ${selectedSkill.isTriggered})` : "无/未触发");
    let damageSoFar = intermediate.termA * intermediate.weaponSkillMultiplier;
    addExprTrace("D = TermA * C", `${safeToFixed(intermediate.termA,0)} * ${safeToFixed(intermediate.weaponSkillMultiplier)}`, damageSoFar);

    // 6. (核心伤up + 暴伤up + 距离up + 爆裂up) - REVISED LOGIC
    let core_bonus_value = 0;
    if (enemy.hasCore && charData.coreDamageBaseChoiceTriggered) {
        // For coreDamageUp, pass 'coreDamageUp' for bonuses
        core_bonus_value = (parseFloat(charData.coreDamageBaseChoice) || 0) + (getAggregatedBuffValue(charIndex, 'coreDamageUp', true) || 0);
    }
    addTrace("核心伤提供的[额外增伤值] (E1_bonus)", core_bonus_value, enemy.hasCore ? (charData.coreDamageBaseChoiceTriggered ? "基础选择已触发" : "基础选择未触发") : "无核心");
    intermediate.coreDamage_bonus_part = core_bonus_value;

    let crit_bonus_value = 0;
    if (charData.critDamageUp.isTriggered) {
        // For critDamageUp, pass 'critDamageUp' (which is a static buff object, but getAggregatedBuffValue handles it)
        // The static buff part of getAggregatedBuffValue handles charData.critDamageUp.value
        // Additional critDamageUpBonuses would be handled if 'critDamageUpBonuses' key was used and existed.
        // Current structure uses charData.critDamageUp.value for the main part.
        // If there were charData.critDamageUpBonuses, it would be getAggregatedBuffValue(charIndex, 'critDamageUpBonuses', true)
        crit_bonus_value = 0.5 + ( (parseFloat(charData.critDamageUp.value) / 100) || 0); // Assuming critDamageUp.value is already %
    }
    addTrace("暴伤提供的[额外增伤值] (E2_bonus)", crit_bonus_value, charData.critDamageUp.isTriggered ? `触发 (0.5 + ${charData.critDamageUp.value}%)` : "未触发");
    intermediate.critDamage_bonus_part = crit_bonus_value;

    let dist_bonus_value = 0; if (charData.distanceUp.isTriggered) { dist_bonus_value = 0.3; } // distanceUp.value is 30, but here it's treated as fixed 0.3 multiplier
    addTrace("距离提供的[额外增伤值] (E3_bonus)", dist_bonus_value, charData.distanceUp.isTriggered ? "触发" : "未触发");
    intermediate.distance_bonus_part = dist_bonus_value;

    let burst_bonus_value = 0; if (charData.burstUp.isTriggered) { burst_bonus_value = 0.5; } // burstUp.value is 50, but here it's treated as fixed 0.5 multiplier
    addTrace("爆裂提供的[额外增伤值] (E4_bonus)", burst_bonus_value, charData.burstUp.isTriggered ? "触发" : "未触发");
    intermediate.burst_bonus_part = burst_bonus_value;

    intermediate.sum_of_just_additive_bonuses = (core_bonus_value||0) + (crit_bonus_value||0) + (dist_bonus_value||0) + (burst_bonus_value||0);
    addTrace("额外增伤值总和 (E_bonus_sum)", intermediate.sum_of_just_additive_bonuses);

    let actualAdditiveGroupMultiplier = 1;
    const isAnyCategoryTriggered = (enemy.hasCore && charData.coreDamageBaseChoiceTriggered) ||
                                  charData.critDamageUp.isTriggered ||
                                  charData.distanceUp.isTriggered ||
                                  charData.burstUp.isTriggered;
    if (isAnyCategoryTriggered) {
        actualAdditiveGroupMultiplier = 1 + intermediate.sum_of_just_additive_bonuses;
        addTrace("加算类组倍率 (E_mult = 1 + E_bonus_sum)", actualAdditiveGroupMultiplier, "任一类别触发");
    } else {
        addTrace("加算类组倍率 (E_mult)", actualAdditiveGroupMultiplier, "所有类别均未触发");
    }
    intermediate.additiveDamageBonusesSum = actualAdditiveGroupMultiplier;

    let prevDamageForLogF = damageSoFar;
    damageSoFar *= actualAdditiveGroupMultiplier;
    addExprTrace("F = D * E_mult", `${safeToFixed(prevDamageForLogF)} * ${safeToFixed(actualAdditiveGroupMultiplier)}`, damageSoFar);

    // 7. 特殊伤害up
    // For specialDamageUp, pass 'specialDamageUp'
    const specialDamageUpPercent = getAggregatedBuffValue(charIndex, 'specialDamageUp', true) || 0;
    intermediate.totalSpecialDamageUpMultiplier = 1 + specialDamageUpPercent;
    addTrace("特殊伤害up倍率 (G)", intermediate.totalSpecialDamageUpMultiplier, `1 + ${safeToFixed(specialDamageUpPercent)}`);
    let prevDamageForLogH = damageSoFar; damageSoFar *= intermediate.totalSpecialDamageUpMultiplier;
    addExprTrace("H = F * G", `${safeToFixed(prevDamageForLogH)} * ${safeToFixed(intermediate.totalSpecialDamageUpMultiplier)}`, damageSoFar);

    // 8. 蓄力up
    let baseChargeSelectedValue = charData.chargeUpBase.isTriggered ? (parseFloat(charData.chargeUpBase.value) || 1) : 1;
    intermediate.baseChargeMultiplierValue = baseChargeSelectedValue;
    let finalCalculatedChargeValue = baseChargeSelectedValue;
    let chargeTraceComment = `基础: ${safeToFixed(baseChargeSelectedValue,1)}`;

    // Aggregate self chargeUpBonuses
    (charData.chargeUpBonuses || []).forEach(bonus => {
        if (bonus.isTriggered && (bonus.appliesTo === 'all' || bonus.appliesTo === 'self_only')) { // Ensure self_only applies
            const bonusValueDecimal = parseFloat(bonus.value) / 100 || 0;
            if (bonus.isSpecialBaseBuff) {
                finalCalculatedChargeValue += baseChargeSelectedValue * bonusValueDecimal;
                chargeTraceComment += ` + (自基*${safeToFixed(bonusValueDecimal,2)})`;
            } else {
                finalCalculatedChargeValue += bonusValueDecimal; chargeTraceComment += ` + (自${safeToFixed(bonusValueDecimal,2)})`;
            }
        }
    });
    // Aggregate team chargeUpBonuses (from other characters)
    characters.forEach((sourceChar, sourceIdx) => {
        if (sourceIdx === charIndex || !sourceChar) return; // Skip self or null characters
        (sourceChar.chargeUpBonuses || []).forEach(bonus => {
            // Only non-SpecialBaseBuff team bonuses apply as flat additions from teammates
            if (bonus.isTriggered && bonus.appliesTo === 'team_only' && !bonus.isSpecialBaseBuff) {
                finalCalculatedChargeValue += (parseFloat(bonus.value) / 100 || 0);
                 chargeTraceComment += ` + (队${safeToFixed(parseFloat(bonus.value) / 100, 2)})`;
            }
        });
    });
    intermediate.totalChargeUpMultiplier = Math.max(1, finalCalculatedChargeValue);
    addTrace("蓄力up倍率 (I)", intermediate.totalChargeUpMultiplier, chargeTraceComment);
    let prevDamageForLogJ = damageSoFar; damageSoFar *= intermediate.totalChargeUpMultiplier;
    addExprTrace("J = H * I", `${safeToFixed(prevDamageForLogJ)} * ${safeToFixed(intermediate.totalChargeUpMultiplier)}`, damageSoFar);

    // 9. 优越up
    let supMultiplier = 1.0;
    let superiorityTraceComment = "未触发";
    if (charData.superiorityUp && charData.superiorityUp.isBaseTriggered) {
        // Pass 'superiorityUpBonuses' directly as it's the array key.
        // Or pass 'superiorityUp' and let getAggregatedBuffValue append 'Bonuses'.
        // The provided getAggregatedBuffValue will handle 'superiorityUpBonuses' correctly if items are self_only or all.
        const additionalSuperiorityPercent = getAggregatedBuffValue(charIndex, 'superiorityUpBonuses', true) || 0;
        supMultiplier = (charData.superiorityUp.baseValueReadOnly + 1) + additionalSuperiorityPercent; // 0.1 + 1 = 1.1
        superiorityTraceComment = `触发: ${(charData.superiorityUp.baseValueReadOnly + 1).toFixed(1)} (基础) + ${safeToFixed(additionalSuperiorityPercent)} (额外%)`;
    }
    intermediate.totalSuperiorityUpMultiplier = supMultiplier;
    addTrace("优越up总倍率 (K)", intermediate.totalSuperiorityUpMultiplier, superiorityTraceComment);
    let prevDamageForLogL = damageSoFar; damageSoFar *= intermediate.totalSuperiorityUpMultiplier;
    addExprTrace("L = J * K", `${safeToFixed(prevDamageForLogL)} * ${safeToFixed(intermediate.totalSuperiorityUpMultiplier)}`, damageSoFar);

    // 10. 受伤up
    // For damageTakenUp, pass 'damageTakenUp'
    intermediate.totalDamageTakenUpMultiplier = 1 + (getAggregatedBuffValue(charIndex, 'damageTakenUp', true) || 0); // Assuming this is enemy debuff, should it be (charIndex, 'damageTakenUp', true, true)?
                                                                                                                        // The original code doesn't set isDebuffOnEnemy=true here. If damageTakenUp is a debuff on enemy, it should.
                                                                                                                        // If it's a self-buff making character take more damage (unlikely for damage calc), then current is fine.
                                                                                                                        // Assuming it's a debuff applied by ANY char ON THE ENEMY that benefits THIS char's damage:
    const totalDamageTakenUpPercent = getAggregatedBuffValue(charIndex, 'damageTakenUp', true, true); // Set isDebuffOnEnemy to true
    intermediate.totalDamageTakenUpMultiplier = 1 + totalDamageTakenUpPercent;
    addTrace("受伤up倍率 (M)", intermediate.totalDamageTakenUpMultiplier, `1 + ${safeToFixed(totalDamageTakenUpPercent)}`);
    let prevDamageForLogFinal = damageSoFar; damageSoFar *= intermediate.totalDamageTakenUpMultiplier;
    addExprTrace("最终伤害 = L * M", `${safeToFixed(prevDamageForLogFinal)} * ${safeToFixed(intermediate.totalDamageTakenUpMultiplier)}`, damageSoFar);

    let finalDamage = damageSoFar;
    if (intermediate.termA <= 0 || intermediate.weaponSkillMultiplier <= 0) {
        finalDamage = 0; addTrace("修正", finalDamage, "TermA或技能倍率为0");
    }
    finalDamage = Math.max(0, finalDamage); // Ensure non-negative damage
    addTrace("最终伤害 (调整后)", finalDamage, "确保非负");
    formulaTrace.push({desc: "--- 计算结束 ---", expr: "--- 计算结束 ---"});

    charData.outputDamage = finalDamage; // Store final damage
    charData.intermediateResults = intermediate; // Store intermediate results

    return { finalDamage: finalDamage, intermediate: intermediate };
}