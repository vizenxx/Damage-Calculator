// js/ui_helpers.js

function createAppliesToHTML(fieldPrefix, itemId, currentAppliesTo) {
    const nameSuffix = itemId.includes('static') ? itemId : `appliesTo_${itemId}`;
    return `
        <span class="applies-to-group">
            <label><input type="radio" name="${fieldPrefix}_${nameSuffix}" value="all" ${currentAppliesTo === 'all' ? 'checked' : ''} data-field-name="${fieldPrefix}_appliesTo">所有人</label>
            <label><input type="radio" name="${fieldPrefix}_${nameSuffix}" value="self_only" ${currentAppliesTo === 'self_only' ? 'checked' : ''} data-field-name="${fieldPrefix}_appliesTo">仅自己</label>
            <label><input type="radio" name="${fieldPrefix}_${nameSuffix}" value="team_only" ${currentAppliesTo === 'team_only' ? 'checked' : ''} data-field-name="${fieldPrefix}_appliesTo">仅队友</label>
        </span>
    `;
}

function createTriggerHTML(fieldPrefix, isTriggered) {
    return `<label class="trigger-label"><input type="checkbox" data-field-name="${fieldPrefix}_isTriggered" ${isTriggered ? 'checked' : ''}>触发</label>`;
}

function createBonusItemHTML(charIndex, bonusArrayKey, bonusItem, typeLabel, isPercentage = true) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('bonus-item');
    if (bonusArrayKey === 'chargeUpBonuses') {
        itemDiv.classList.add('charge-up-bonus-item');
    }
    itemDiv.dataset.itemId = bonusItem.id;

    // Corrected fieldPrefix derivation
    let fieldPrefixForDataAttr = bonusArrayKey;
    if (fieldPrefixForDataAttr.endsWith('Bonuses')) {
        fieldPrefixForDataAttr = fieldPrefixForDataAttr.slice(0, -7); // "specialDamageUpBonuses" -> "specialDamageUp"
    } 
    // Add other specific non-suffixed array keys here if they exist and are handled by this generic function
    // else if (fieldPrefixForDataAttr === 'someOtherArrayKey') { /* no change needed */ }

    
    let specialCheckboxHTML = '';
    if (bonusArrayKey === 'chargeUpBonuses') {
        specialCheckboxHTML = `
            <label class="special-base-buff-label">
                <input type="checkbox" data-field-name="${fieldPrefixForDataAttr}_isSpecialBaseBuff" ${bonusItem.isSpecialBaseBuff ? 'checked' : ''}> 基础倍率特殊加成
            </label>
        `;
    }
    
    let finalInnerHTML = `
        <span class="intermediate-result-display" id="ir_${bonusItem.id}">-</span>
        <label class="bonus-label with-intermediate">${typeLabel}:</label>
        <input type="number" class="bonus-value-input" data-field-name="${fieldPrefixForDataAttr}_value" value="${bonusItem.value}" placeholder="${isPercentage ? '%' : '数值'}">`;
    
    if (bonusArrayKey === 'chargeUpBonuses') {
        finalInnerHTML += specialCheckboxHTML;
    }
    finalInnerHTML += `
        ${createAppliesToHTML(fieldPrefixForDataAttr, bonusItem.id, bonusItem.appliesTo)}
        <button type="button" class="remove-bonus" onclick="removeBonusItemWrapper(${charIndex}, '${bonusArrayKey}', '${bonusItem.id}')">移除</button>
        ${createTriggerHTML(fieldPrefixForDataAttr, bonusItem.isTriggered)}
    `;
    itemDiv.innerHTML = finalInnerHTML;
    return itemDiv;
}

function createCasterEffectItemHTML(charIndex, effectItem) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('caster-effect-item', 'bonus-item');
    itemDiv.dataset.itemId = effectItem.id;
    const fieldPrefix = 'casterEffect';
    itemDiv.innerHTML = `
        <span class="intermediate-result-display" id="ir_${effectItem.id}">-</span>
        <label class="bonus-label with-intermediate">施法者攻:</label>
        <select data-field-name="${fieldPrefix}_refStatType" class="caster-ref-select">
            <option value="attack" ${effectItem.refStatType === 'attack' ? 'selected' : ''}>参考攻击力</option>
            <option value="defense" ${effectItem.refStatType === 'defense' ? 'selected' : ''}>参考防御力</option>
            <option value="hp" ${effectItem.refStatType === 'hp' ? 'selected' : ''}>参考体力</option>
        </select>
        <input type="number" class="bonus-value-input" data-field-name="${fieldPrefix}_effectMultiplier" value="${effectItem.effectMultiplier}" placeholder="效果倍率 (%)">
        <label class="caster-final-label"><input type="checkbox" data-field-name="${fieldPrefix}_isFinal" ${effectItem.isFinal ? 'checked' : ''}>最终值参考</label>
        ${createAppliesToHTML(fieldPrefix, effectItem.id, effectItem.appliesTo)}
        <button type="button" class="remove-bonus" onclick="removeBonusItemWrapper(${charIndex}, 'casterEffects', '${effectItem.id}')">移除</button>
        ${createTriggerHTML(fieldPrefix, effectItem.isTriggered)}
    `;
    return itemDiv;
}

function createSkillMultiplierItemHTML(charIndex, charData, skillItem) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('skill-multiplier-item', 'bonus-item');
    itemDiv.dataset.itemId = skillItem.id; 
    const fieldPrefix = 'skillMultiplier';
    itemDiv.innerHTML = `
        <span class="intermediate-result-display" id="ir_sm_${skillItem.id}">-</span> 
        <input type="radio" name="skillMultiplierRadio_char${charIndex}" data-field-name="${fieldPrefix}_selector" ${charData.selectedSkillMultiplierId === skillItem.id ? 'checked' : ''}>
        <input type="number" class="bonus-value-input" data-field-name="${fieldPrefix}_value" value="${skillItem.value}" placeholder="技能倍率 (%)">
        <span class="applies-to-group" style="visibility:hidden;"></span>
        <button type="button" class="remove-bonus" onclick="removeBonusItemWrapper(${charIndex}, 'skillMultipliers', '${skillItem.id}')">移除</button>
        ${createTriggerHTML(fieldPrefix, skillItem.isTriggered)}
    `;
    return itemDiv;
}