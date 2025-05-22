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
        
        const staticBuff = sourceCharData[buffKey];
        if (staticBuff && typeof staticBuff.value !== 'undefined' && staticBuff.isTriggered) {
            if (staticBuff.appliesTo === 'all' || 
                (isSelf && staticBuff.appliesTo === 'self_only') || 
                (!isSelf && staticBuff.appliesTo === 'team_only')) {
                totalBuffValue += (parseFloat(staticBuff.value) || 0);
            }
        }

        let buffArrayKeyToUse = buffKey;
        if ( buffKey !== 'skillMultipliers' && 
             buffKey !== 'casterEffects' && 
            !buffKey.endsWith('Bonuses') &&  
            !buffKey.endsWith('s')          
           ) {
             buffArrayKeyToUse = buffKey + "Bonuses";
        }
        
        const buffArray = sourceCharData[buffArrayKeyToUse];
        buffArray?.forEach(buff => {
            if (buff.isTriggered) {
                if (buff.appliesTo === 'all' || 
                    (isSelf && buff.appliesTo === 'self_only') || 
                    (!isSelf && buff.appliesTo === 'team_only')) {
                    totalBuffValue += (parseFloat(buff.value) || 0);
                }
            }
        });
    });
    return isPercentage ? totalBuffValue / 100 : totalBuffValue;
}

function getCasterReferenceValue(sourceCharData, statType, isFinal) {
    if (!sourceCharData || !sourceCharData.baseStats) {
        console.warn("[calculation.js] getCasterReferenceValue: sourceCharData or baseStats undefined.");
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

    if (!charData) {
        console.error(`[calculation.js] calculateCharacterDamage: Character data for index ${charIndex} not found. Returning default error state.`);
        formulaTrace.push({desc: "ERROR", expr: `Character data for index ${charIndex} not found.`});
        return { 
            finalDamage: 0, 
            intermediate: { error: `Character data for index ${charIndex} not found.` }
        };
    }
    
    const intermediate = {};
    formulaTrace.length = 0; 

    const addTrace = (desc, value, comment = '', expr = null) => {
        let valueStr = '-'; 
        if (typeof value === 'number' && !isNaN(value)) {
            valueStr = value.toFixed(3);
        } else if (value !== undefined && value !== null) {
            valueStr = String(value);
        }
        const traceContent = expr ? expr : `${desc}: <span class="trace-value">${valueStr}</span>`;
        formulaTrace.push({ desc, value: (expr ? null : value), comment, expr: traceContent });
    };
    const addExprTrace = (desc, expressionString, resultValue, comment = '') => {
        let resultStr = '-';
        if (typeof resultValue === 'number' && !isNaN(resultValue)) {
            resultStr = resultValue.toFixed(3);
        }
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
            addTrace("突破 %提升后", baseAttackForFormula, `等级 ${level} (x${intermediate.breakthroughMultiplier.toFixed(3)})`);
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
    const totalAttackUpPercent = getAggregatedBuffValue(charIndex, 'attackUp', true);
    intermediate.totalAttackUpMultiplier = 1 + totalAttackUpPercent;
    addTrace("攻击力UP倍率 (A2)", intermediate.totalAttackUpMultiplier, `(1 + ${totalAttackUpPercent.toFixed(3)})`);
    let currentTerm = intermediate.modifiedBaseValue * intermediate.totalAttackUpMultiplier;
    addExprTrace("(A1*A2)", `${(intermediate.modifiedBaseValue||0).toFixed(0)} * ${(intermediate.totalAttackUpMultiplier||1).toFixed(3)}`, currentTerm);

    // 3. 施展者攻up
    intermediate.casterAttackUpFlat = getAggregatedCasterFlatAttack(charIndex) || 0;
    addTrace("施展者攻up (A3)", intermediate.casterAttackUpFlat);
    let prevTermForLog1 = currentTerm; 
    currentTerm += intermediate.casterAttackUpFlat;
    addExprTrace("(A1*A2)+A3", `${prevTermForLog1.toFixed(0)} + ${intermediate.casterAttackUpFlat.toFixed(0)}`, currentTerm);

    // 4. 敌防御力 * (1- 防御down倍率)
    const totalDefenseDownPercent = getAggregatedBuffValue(charIndex, 'defenseDown', true, true);
    intermediate.totalDefenseDownPercent = totalDefenseDownPercent;
    intermediate.effectiveEnemyDefense = Math.max(0, (enemy.defense||0) * (1 - totalDefenseDownPercent));
    addTrace("有效敌防御 (B)", intermediate.effectiveEnemyDefense, `原防 ${enemy.defense||0}, 减防 ${(totalDefenseDownPercent*100).toFixed(1)}%`);
    
    let prevTermForLog2 = currentTerm; 
    intermediate.termA = currentTerm - intermediate.effectiveEnemyDefense;
    addExprTrace("Term A = ((A1*A2)+A3) - B", `${prevTermForLog2.toFixed(0)} - ${intermediate.effectiveEnemyDefense.toFixed(0)}`, intermediate.termA);
    if (intermediate.termA <=0) addTrace("警告", "Term A <= 0, 伤害将为0");

    // 5. 武器/技能倍率
    const selectedSkill = charData.skillMultipliers ? charData.skillMultipliers.find(sm => sm.id === charData.selectedSkillMultiplierId) : null;
    intermediate.weaponSkillMultiplier = (selectedSkill && selectedSkill.isTriggered) ? (parseFloat(selectedSkill.value) / 100 || 0) : 0;
    addTrace("武器/技能倍率 (C)", intermediate.weaponSkillMultiplier, selectedSkill ? `来自: ${selectedSkill.value}%` : "无/未触发");
    let damageSoFar = intermediate.termA * intermediate.weaponSkillMultiplier;
    addExprTrace("D = TermA * C", `${intermediate.termA.toFixed(0)} * ${intermediate.weaponSkillMultiplier.toFixed(3)}`, damageSoFar);

    // --- REVISED ADDITIVE BONUSES LOGIC (核心伤 + 暴伤 + 距离 + 爆裂) ---
    let core_bonus_value = 0;
    if (enemy.hasCore && charData.coreDamageBaseChoiceTriggered) {
        core_bonus_value = (parseFloat(charData.coreDamageBaseChoice) || 0) + getAggregatedBuffValue(charIndex, 'coreDamageUp', true);
    }
    addTrace("核心伤提供的[额外增伤值] (E1_bonus)", core_bonus_value, enemy.hasCore ? (charData.coreDamageBaseChoiceTriggered ? "基础选择已触发" : "基础选择未触发") : "无核心");
    intermediate.coreDamage_bonus_part = core_bonus_value;

    let crit_bonus_value = 0;
    if (charData.critDamageUp.isTriggered) {
        crit_bonus_value = 0.5 + getAggregatedBuffValue(charIndex, 'critDamageUp', true);
    }
    addTrace("暴伤提供的[额外增伤值] (E2_bonus)", crit_bonus_value, charData.critDamageUp.isTriggered ? "触发" : "未触发");
    intermediate.critDamage_bonus_part = crit_bonus_value;

    let dist_bonus_value = 0;
    if (charData.distanceUp.isTriggered) {
        dist_bonus_value = 0.3;
    }
    addTrace("距离提供的[额外增伤值] (E3_bonus)", dist_bonus_value, charData.distanceUp.isTriggered ? "触发" : "未触发");
    intermediate.distance_bonus_part = dist_bonus_value;

    let burst_bonus_value = 0;
    if (charData.burstUp.isTriggered) {
        burst_bonus_value = 0.5;
    }
    addTrace("爆裂提供的[额外增伤值] (E4_bonus)", burst_bonus_value, charData.burstUp.isTriggered ? "触发" : "未触发");
    intermediate.burst_bonus_part = burst_bonus_value;
    
    intermediate.sum_of_just_additive_bonuses = core_bonus_value + crit_bonus_value + dist_bonus_value + burst_bonus_value;
    addTrace("额外增伤值总和 (E_bonus_sum = E1b+E2b+E3b+E4b)", intermediate.sum_of_just_additive_bonuses);

    let actualAdditiveGroupMultiplier = 1; 
    // Check if any of the individual components were active to apply the "1 +" logic
    const anyAdditiveBonusActive = (enemy.hasCore && charData.coreDamageBaseChoiceTriggered) || 
                                 charData.critDamageUp.isTriggered || 
                                 charData.distanceUp.isTriggered || 
                                 charData.burstUp.isTriggered;
    
    if (anyAdditiveBonusActive) {
        actualAdditiveGroupMultiplier = 1 + intermediate.sum_of_just_additive_bonuses;
        addTrace("加算类组倍率 (E_mult = 1 + E_bonus_sum)", actualAdditiveGroupMultiplier, "任一触发");
    } else {
        addTrace("加算类组倍率 (E_mult)", actualAdditiveGroupMultiplier, "全未触发则为1");
    }
    intermediate.additiveDamageBonusesSum_final_multiplier = actualAdditiveGroupMultiplier; // Renamed for clarity

    let prevDamageForLogF = damageSoFar; 
    damageSoFar *= actualAdditiveGroupMultiplier; 
    addExprTrace("F = D * E_mult", `${prevDamageForLogF.toFixed(3)} * ${actualAdditiveGroupMultiplier.toFixed(3)}`, damageSoFar);
    // --- END REVISED ADDITIVE BONUSES LOGIC ---

    // 7. 特殊伤害up
    const specialDamageUpPercent = getAggregatedBuffValue(charIndex, 'specialDamageUp', true); 
    intermediate.totalSpecialDamageUpMultiplier = 1 + specialDamageUpPercent; 
    addTrace("特殊伤害up倍率 (G)", intermediate.totalSpecialDamageUpMultiplier, `1 + ${specialDamageUpPercent.toFixed(3)}`);
    let prevDamageForLogH = damageSoFar; damageSoFar *= intermediate.totalSpecialDamageUpMultiplier;
    addExprTrace("H = F * G", `${prevDamageForLogH.toFixed(3)} * ${intermediate.totalSpecialDamageUpMultiplier.toFixed(3)}`, damageSoFar);

    // 8. 蓄力up
    let baseChargeSelectedValue = charData.chargeUpBase.isTriggered ? (parseFloat(charData.chargeUpBase.value) || 1) : 1;
    intermediate.baseChargeMultiplierValue = baseChargeSelectedValue;
    let finalCalculatedChargeValue = baseChargeSelectedValue;
    let chargeTraceComment = `基础: ${baseChargeSelectedValue.toFixed(1)}`;
    (charData.chargeUpBonuses || []).forEach(bonus => {
        if (bonus.isTriggered && (bonus.appliesTo === 'all' || bonus.appliesTo === 'self_only')) {
            const bonusValueDecimal = parseFloat(bonus.value) / 100 || 0;
            if (bonus.isSpecialBaseBuff) {
                finalCalculatedChargeValue += baseChargeSelectedValue * bonusValueDecimal;
                chargeTraceComment += ` + (基*${bonusValueDecimal.toFixed(2)})`;
            } else {
                finalCalculatedChargeValue += bonusValueDecimal; chargeTraceComment += ` + ${bonusValueDecimal.toFixed(2)}`;
            }
        }
    });
    characters.forEach((sourceChar, sourceIdx) => {
        if (sourceIdx === charIndex) return;
        (sourceChar.chargeUpBonuses || []).forEach(bonus => {
            if (bonus.isTriggered && bonus.appliesTo === 'team_only' && !bonus.isSpecialBaseBuff) {
                finalCalculatedChargeValue += (parseFloat(bonus.value) / 100 || 0);
                 chargeTraceComment += ` + (队友${bonus.value}%)`;
            }
        });
    });
    intermediate.totalChargeUpMultiplier = Math.max(1, finalCalculatedChargeValue); 
    addTrace("蓄力up倍率 (I)", intermediate.totalChargeUpMultiplier, chargeTraceComment);
    let prevDamageForLogJ = damageSoFar; damageSoFar *= intermediate.totalChargeUpMultiplier;
    addExprTrace("J = H * I", `${prevDamageForLogJ.toFixed(3)} * ${intermediate.totalChargeUpMultiplier.toFixed(3)}`, damageSoFar);
    
    // 9. 优越up
    let supMultiplier = 1; 
    if (charData.superiorityUp && charData.superiorityUp.isBaseTriggered) {
        supMultiplier = (1 + (charData.superiorityUp.baseValueReadOnly || 0.1) + getAggregatedBuffValue(charIndex, 'superiorityUpBonuses', true));
        addTrace("优越UP (触发)", supMultiplier, `基础1 + 固定0.1 + 额外%`);
    } else {
        addTrace("优越UP (未触发)", supMultiplier);
    }
    intermediate.totalSuperiorityUpMultiplier = supMultiplier; 
    let prevDamageForLogL = damageSoFar; damageSoFar *= intermediate.totalSuperiorityUpMultiplier;
    addExprTrace("L = J * K (K is Sup)", `${prevDamageForLogL.toFixed(3)} * ${intermediate.totalSuperiorityUpMultiplier.toFixed(3)}`, damageSoFar);
    
    // 10. 受伤up
    intermediate.totalDamageTakenUpMultiplier = 1 + getAggregatedBuffValue(charIndex, 'damageTakenUp', true); 
    addTrace("受伤up倍率 (M)", intermediate.totalDamageTakenUpMultiplier);
    let prevDamageForLogFinal = damageSoFar; damageSoFar *= intermediate.totalDamageTakenUpMultiplier;
    addExprTrace("最终伤害 = L * M", `${prevDamageForLogFinal.toFixed(3)} * ${intermediate.totalDamageTakenUpMultiplier.toFixed(3)}`, damageSoFar);
    
    let finalDamage = damageSoFar;
    if (intermediate.termA <= 0 || intermediate.weaponSkillMultiplier <= 0) {
        finalDamage = 0; addTrace("修正", finalDamage, "TermA或技能倍率为0");
    }
    finalDamage = Math.max(0, finalDamage);
    addTrace("最终伤害 (调整后)", finalDamage, "确保非负");
    formulaTrace.push({desc: "--- 计算结束 ---", expr: "--- 计算结束 ---"});
    
    return { finalDamage: finalDamage, intermediate: intermediate };
}