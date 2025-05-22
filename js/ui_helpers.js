// js/ui_helpers.js

function createAppliesToHTML(fieldPrefix, itemId, currentAppliesTo) {
    const nameSuffix = itemId && itemId.includes('static') ? itemId : `appliesTo_${itemId || generateUniqueId('appliesToFallback')}`;
    const baseFieldPrefixClean = String(fieldPrefix || 'unknownPrefix').split('_')[0];
    const checkedAll = currentAppliesTo === 'all' ? 'checked' : ''; 
    const checkedSelf = currentAppliesTo === 'self_only' ? 'checked' : ''; 
    const checkedTeam = currentAppliesTo === 'team_only' ? 'checked' : '';
    return `<span class="applies-to-group">
                <label><input type="radio" name="${baseFieldPrefixClean}_${nameSuffix}" value="all" ${checkedAll} data-field-name="${baseFieldPrefixClean}_appliesTo">所有人</label>
                <label><input type="radio" name="${baseFieldPrefixClean}_${nameSuffix}" value="self_only" ${checkedSelf} data-field-name="${baseFieldPrefixClean}_appliesTo">仅自己</label>
                <label><input type="radio" name="${baseFieldPrefixClean}_${nameSuffix}" value="team_only" ${checkedTeam} data-field-name="${baseFieldPrefixClean}_appliesTo">仅队友</label>
            </span>`;
}

function createTriggerHTML(fieldPrefix, isTriggered, isSkillMultiplierRelated = false) {
    if (isSkillMultiplierRelated) { return `<span class="trigger-placeholder"></span>`; } 
    const baseFieldPrefixClean = String(fieldPrefix || 'unknownPrefix').split('_')[0]; 
    const checked = isTriggered ? 'checked' : ''; 
    return `<label class="trigger-label"><input type="checkbox" data-field-name="${baseFieldPrefixClean}_isTriggered" ${checked}>触发</label>`;
}

function createGenericItemRowStructure(charIndex, bonusArrayKey, bonusItem, mainContentHTML, isSkillMultiplier = false) {
    const itemDiv = document.createElement('div');
    itemDiv.classList.add('bonus-item');
    const bonusTypeClass = bonusArrayKey ? bonusArrayKey.replace(/Bonuses$/, '').toLowerCase() + '-item' : 'generic-bonus-item';
    if (bonusArrayKey === 'skillMultiplierUpBonuses') { // Specific class for new type if needed
        itemDiv.classList.add('skill-multiplier-up-item');
    } else {
        itemDiv.classList.add(bonusTypeClass);
    }

    if (bonusItem && bonusItem.id) itemDiv.dataset.itemId = bonusItem.id;

    const irDisplay = `<span class="intermediate-result-display" id="ir_${bonusItem?.id || generateUniqueId('irFallback')}">-</span>`;
    
    let appliesToAndActionsHTML = '';
    if (!isSkillMultiplier) { // Skill multipliers handle their own actions/triggering via radio
        const appliesToContent = createAppliesToHTML(bonusArrayKey.replace('Bonuses', ''), bonusItem?.id, bonusItem?.appliesTo);
        const triggerContent = createTriggerHTML(bonusArrayKey.replace('Bonuses', ''), bonusItem?.isTriggered, false);
        appliesToAndActionsHTML = `
            <div class="item-actions">
                ${appliesToContent}
                <button type="button" class="remove-bonus" onclick="removeBonusItemWrapper(${charIndex}, '${bonusArrayKey}', '${bonusItem?.id}')">移除</button>
                ${triggerContent}
            </div>
        `;
    } else { // For Skill Multipliers (which use radio buttons for selection/triggering)
         appliesToAndActionsHTML = `
            <div class="item-actions">
                <button type="button" class="remove-bonus" onclick="removeBonusItemWrapper(${charIndex}, '${bonusArrayKey}', '${bonusItem?.id}')">移除</button>
            </div>
        `;
    }


    itemDiv.innerHTML = `
        ${irDisplay}
        <div class="item-main-content">
            ${mainContentHTML}
        </div>
        ${appliesToAndActionsHTML}
    `;
    return itemDiv;
}


function createBonusItemHTML(charIndex, bonusArrayKey, bonusItem, typeLabel, isPercentage = true) {
    let fieldPrefixForDataAttr = bonusArrayKey.replace('Bonuses', '');
    let specialCheckboxHTML = '';
    if (bonusArrayKey === 'chargeUpBonuses' && bonusItem.hasOwnProperty('isSpecialBaseBuff')) {
        specialCheckboxHTML = `<div class="item-row"><label class="checkbox-label"><input type="checkbox" data-field-name="${fieldPrefixForDataAttr}_isSpecialBaseBuff" ${bonusItem.isSpecialBaseBuff ? 'checked' : ''}> 基础倍率特殊加成</label></div>`;
    }
    
    let suffixText = isPercentage ? '%' : '';
    let placeholderText = isPercentage ? '百分比' : '数值';
    
    const mainContent = `
        <div class="item-row">
            <label class="bonus-label">${typeLabel.replace(' (%)', '')}:</label>
            <div class="input-with-suffix-wrapper">
                <input type="number" class="bonus-value-input" data-field-name="${fieldPrefixForDataAttr}_value" value="${bonusItem.value || 0}" placeholder="${placeholderText}">
                ${suffixText ? `<span class="input-suffix-internal">${suffixText}</span>` : ''}
            </div>
        </div>
        ${specialCheckboxHTML}
    `;
    return createGenericItemRowStructure(charIndex, bonusArrayKey, bonusItem, mainContent);
}

function createCasterEffectItemHTML(charIndex, effectItem) {
    const fieldPrefix = 'casterEffect';
    const mainContent = `
        <div class="item-row">
            <label class="caster-label">施法者攻:</label>
            <select data-field-name="${fieldPrefix}_refStatType" class="caster-ref-select">
                <option value="attack" ${effectItem.refStatType === 'attack' ? 'selected' : ''}>参考攻击力</option>
                <option value="defense" ${effectItem.refStatType === 'defense' ? 'selected' : ''}>参考防御力</option>
                <option value="hp" ${effectItem.refStatType === 'hp' ? 'selected' : ''}>参考体力</option>
            </select>
        </div>
        <div class="item-row">
            <label class="caster-label-spacer"></label>
            <div class="input-with-suffix-wrapper">
                <input type="number" class="bonus-value-input" data-field-name="${fieldPrefix}_effectMultiplier" value="${effectItem.effectMultiplier || 0}" placeholder="效果倍率">
                <span class="input-suffix-internal">%</span>
            </div>
        </div>
        <div class="item-row">
            <label class="caster-label-spacer"></label>
            <label class="checkbox-label caster-final-label"><input type="checkbox" data-field-name="${fieldPrefix}_isFinal" ${effectItem.isFinal ? 'checked' : ''}>最终值参考</label>
        </div>
    `;
    return createGenericItemRowStructure(charIndex, 'casterEffects', effectItem, mainContent);
}

function createSkillMultiplierItemHTML(charIndex, charData, skillItem) {
    const fieldPrefix = 'skillMultiplier'; 
    const isCurrentlySelected = charData.selectedSkillMultiplierId === skillItem.id;
    const labelText = isCurrentlySelected ? "【所选倍率】" : "【备选倍率】"; 
    const labelClass = isCurrentlySelected ? "selected-skill-label" : "alternate-skill-label";
    
    const mainContent = `
        <div class="item-row skill-multiplier-internal-row">
            <span class="skill-type-label ${labelClass}">${labelText}</span>
            <input type="radio" name="skillMultiplierRadio_char${charIndex}" data-field-name="${fieldPrefix}_selector" ${isCurrentlySelected ? 'checked' : ''} value="${skillItem.id}" onchange="handleSkillMultiplierSelection(${charIndex}, '${skillItem.id}')">
            <div class="input-with-suffix-wrapper">
                <input type="number" class="bonus-value-input" data-field-name="${fieldPrefix}_value" value="${skillItem.value || 0}" placeholder="技能倍率">
                <span class="input-suffix-internal">%</span>
            </div>
        </div>
    `;
    // For skill multipliers, actions (remove button) are handled differently, no appliesTo/trigger checkbox
    return createGenericItemRowStructure(charIndex, 'skillMultipliers', skillItem, mainContent, true);
}

function createSpecialDamageUpItemHTML(charIndex, bonusItem) {
    const fieldPrefix = 'specialDamageUp'; // Will be used as specialDamageUpBonuses_type etc.
    const damageTypes = ["攻击伤害UP", "穿透伤害UP", "分摊伤害UP", "持续伤害UP", "无视防御力伤害UP", "爆裂伤害UP", "部位伤害UP", "阻挡部位伤害UP", "发射体伤害UP", "发射体粘贴伤害UP", "发射体爆炸伤害UP", "自定义..."];
    
    let optionsHTML = damageTypes.map(type => `<option value="${type}" ${bonusItem.type === type ? 'selected' : ''}>${type.replace('UP','')}</option>`).join('');
    const customInputDisplayClass = bonusItem.type === "自定义..." ? '' : 'hidden';

    const mainContent = `
         <div class="item-row">
            <label>类型:</label>
            <select class="special-damage-type-select" data-field-name="${fieldPrefix}_type" onchange="toggleCustomTypeInput(this, '${bonusItem.id}', ${charIndex})">
                ${optionsHTML}
            </select>
        </div>
        <div class="item-row custom-type-input-wrapper ${customInputDisplayClass}" id="customTypeWrapper_${bonusItem.id}">
            <label>自定义:</label>
            <input type="text" class="custom-type-input" data-field-name="${fieldPrefix}_customType" value="${bonusItem.customType || ''}" placeholder="自定义类型">
        </div>
        <div class="item-row">
            <label>数值:</label>
            <div class="input-with-suffix-wrapper">
                <input type="number" class="bonus-value-input" data-field-name="${fieldPrefix}_value" value="${bonusItem.value || 0}" placeholder="百分比">
                <span class="input-suffix-internal">%</span>
            </div>
        </div>
    `;
    return createGenericItemRowStructure(charIndex, 'specialDamageUpBonuses', bonusItem, mainContent);
}

function toggleCustomTypeInput(selectElement, itemId, charIndex) {
    const customWrapper = document.getElementById(`customTypeWrapper_${itemId}`);
    const charData = characters[charIndex];
    const item = charData?.specialDamageUpBonuses?.find(b => b.id === itemId);

    if (customWrapper && item) {
        if (selectElement.value === "自定义...") {
            customWrapper.classList.remove('hidden');
        } else {
            customWrapper.classList.add('hidden');
            item.customType = ""; // Clear data model
            const customInput = customWrapper.querySelector('input[data-field-name="specialDamageUp_customType"]');
            if(customInput) customInput.value = ""; // Clear input field
        }
    }
    // No direct recalculation needed here, actual value change triggers it
}

function handleSkillMultiplierSelection(charIndex, selectedSkillId) {
    const charData = characters[charIndex];
    if (!charData || !charData.skillMultipliers) return;

    charData.selectedSkillMultiplierId = selectedSkillId;
    charData.skillMultipliers.forEach(skill => {
        skill.isTriggered = (skill.id === selectedSkillId);
    });

    // Visually update labels (optional, CSS might handle this better with a full re-render or specific class changes)
    const skillContainer = document.getElementById(`skillMultipliersContainer_char${charIndex}`);
    if (skillContainer) {
        skillContainer.querySelectorAll('.skill-type-label').forEach(label => {
            const parentItem = label.closest('.bonus-item');
            if (parentItem && parentItem.dataset.itemId) {
                const isSelected = parentItem.dataset.itemId === selectedSkillId;
                label.textContent = isSelected ? "【所选倍率】" : "【备选倍率】";
                label.className = `skill-type-label ${isSelected ? 'selected-skill-label' : 'alternate-skill-label'}`;
            }
        });
    }
    
    if (typeof updateOverviewPanel === 'function' && charIndex === activeCharacterIndex) {
        updateOverviewPanel(activeCharacterIndex);
    }
    if (typeof recalculateAllCharacterDamages === 'function') {
        recalculateAllCharacterDamages();
    }
}