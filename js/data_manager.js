// js/data_manager.js

function createDefaultCharacterData(index) {
    const charIdPrefix = `char${index}_`;
    return {
        id: `char${index}`,
        name: `角色 ${index + 1}`,
        baseStats: { attack: 1000, defense: 500, hp: 5000 },
        breakthroughLevel: 'initial',
        attackUpBonuses: [],
        casterEffects: [],
        defenseDownBonuses: [],
        coreDamageBaseChoice: 2,
        coreDamageBaseChoiceTriggered: true,
        coreDamageUpBonuses: [],
        skillMultipliers: [{ id: generateUniqueId(charIdPrefix+'skillDef'), value: 100, isTriggered: false }],
        selectedSkillMultiplierId: '',
        critDamageUp: { value: 0, isTriggered: false, appliesTo: 'all' },
        distanceUp: { value: 30, isTriggered: false },
        burstUp: { value: 50, isTriggered: false },
        specialDamageUpBonuses: [],
        chargeUpBase: { value: 1, isTriggered: true },
        chargeUpBonuses: [],
        superiorityUp: { isBaseTriggered: false, baseValueReadOnly: 0.1 }, // For the base 10% part (contributes to 1.1x if triggered)
        superiorityUpBonuses: [], // For additional user-added percentages
        damageTakenUpBonuses: [],
        outputDamage: 0,
        intermediateResults: {}
    };
}

function updateCharacterDataFromInput(charIndex, inputElement) {
    const charData = characters[charIndex];
    if (!charData) {
        console.warn(`[data_manager.js] updateCharacterDataFromInput: charData missing for index ${charIndex}`);
        return false;
    }

    const fieldNameAttribute = inputElement.dataset.fieldName;
    const nameAttribute = inputElement.name;
    const currentFieldName = fieldNameAttribute || nameAttribute;

    const itemIdFromContainer = inputElement.closest('[data-item-id]')?.dataset.itemId;
    const itemId = itemIdFromContainer || inputElement.dataset.itemId;

    let changed = true;

    if (!currentFieldName && !(inputElement.type === 'radio' && nameAttribute && nameAttribute.startsWith('skillMultiplierRadio_char'))) {
        console.warn(`[data_manager.js] updateCharacterDataFromInput: currentFieldName is missing and not a skillMultiplierRadio for char ${charIndex}. Element:`, inputElement);
        return false;
    }

    if (currentFieldName === 'characterName') {
        charData.name = inputElement.value;
        const tabElement = document.getElementById(`tab_char${charIndex}`);
        if (tabElement) tabElement.textContent = charData.name;
    }
    else if (currentFieldName === 'baseAttack') charData.baseStats.attack = parseFloat(inputElement.value) || 0;
    else if (currentFieldName === 'baseDefense') charData.baseStats.defense = parseFloat(inputElement.value) || 0;
    else if (currentFieldName === 'baseHp') charData.baseStats.hp = parseFloat(inputElement.value) || 0;
    else if (currentFieldName === 'breakthroughLevel') charData.breakthroughLevel = inputElement.value;
    else if (currentFieldName === 'distanceUp_isTriggered') charData.distanceUp.isTriggered = inputElement.checked;
    else if (currentFieldName === 'burstUp_isTriggered') charData.burstUp.isTriggered = inputElement.checked;
    else if (currentFieldName === 'coreDamageBaseChoice') {
        charData.coreDamageBaseChoice = parseFloat(inputElement.value);
    }
    else if (currentFieldName === 'coreDamageBaseChoiceTriggered_isTriggered') {
        charData.coreDamageBaseChoiceTriggered = inputElement.checked;
    }
    // Expected HTML: <input type="checkbox" data-field-name="superiorityUp_isBaseTriggered_isTriggered" ... />
    else if (currentFieldName === 'superiorityUp_isBaseTriggered_isTriggered') {
        if(charData.superiorityUp) {
            charData.superiorityUp.isBaseTriggered = inputElement.checked;
        } else {
            console.warn("[data_manager.js] charData.superiorityUp object missing, cannot set isBaseTriggered");
            changed = false;
        }
    }
    else if (currentFieldName && currentFieldName.startsWith('critDamageUp_')) {
        const property = currentFieldName.substring('critDamageUp_'.length);
        if (charData.critDamageUp) {
            if (property === 'value') charData.critDamageUp.value = parseFloat(inputElement.value) || 0;
            else if (property === 'isTriggered') charData.critDamageUp.isTriggered = inputElement.checked;
            else if (property === 'appliesTo') charData.critDamageUp.appliesTo = inputElement.value;
            else changed = false;
        } else { console.warn(`[data_manager.js] charData.critDamageUp is undefined for char ${charIndex}`); changed = false;}
    }
    else if (currentFieldName && currentFieldName.startsWith('chargeUpBase_')) {
         const property = currentFieldName.substring('chargeUpBase_'.length);
         if (charData.chargeUpBase) {
            if (property === 'value') charData.chargeUpBase.value = parseFloat(inputElement.value) || 1;
            else if (property === 'isTriggered') charData.chargeUpBase.isTriggered = inputElement.checked;
            else changed = false;
         } else { console.warn(`[data_manager.js] charData.chargeUpBase is undefined for char ${charIndex}`); changed = false;}
    }
    // Handles bonus items like attackUpBonuses, superiorityUpBonuses, etc.
    // For superiorityUpBonuses items, expects HTML like:
    // Container: <div data-item-id="some_id_for_superiority_bonus_item">
    // Value input: <input data-field-name="superiorityUp_value" ... />
    // Trigger checkbox: <input data-field-name="superiorityUp_isTriggered" ... />
    else if (itemId && currentFieldName && currentFieldName.includes('_')) {
        const [itemTypeBase, property] = currentFieldName.split('_');
        let itemArray, actualItemType = itemTypeBase;

        if (itemTypeBase === 'casterEffect') { itemArray = charData.casterEffects; actualItemType = 'casterEffect'; }
        else if (itemTypeBase === 'skillMultiplier') { itemArray = charData.skillMultipliers; actualItemType = 'skillMultiplier'; }
        else {
            const arrayKey = itemTypeBase.endsWith('Bonuses') ? itemTypeBase : itemTypeBase + "Bonuses";
            itemArray = charData[arrayKey];
            if (!itemArray) {
                console.warn(`[data_manager.js] Array key ${arrayKey} (derived from ${itemTypeBase}) not found on char ${charIndex} for field ${currentFieldName}. Character data:`, JSON.parse(JSON.stringify(charData)));
                changed = false;
            }
        }

        const item = itemArray?.find(b => b.id === itemId);
        if (item && changed) {
            if (property === 'value') {
                item.value = parseFloat(inputElement.value) || 0;
            }
            else if (property === 'isTriggered') item.isTriggered = inputElement.checked;
            else if (property === 'appliesTo') item.appliesTo = inputElement.value;
            else if (itemTypeBase === 'chargeUp' && property === 'isSpecialBaseBuff') { // Note: itemTypeBase here would be 'chargeUp' for chargeUpBonuses
                 item.isSpecialBaseBuff = inputElement.checked;
            }
            else if (actualItemType === 'casterEffect') {
                if (property === 'refStatType') item.refStatType = inputElement.value;
                else if (property === 'effectMultiplier') item.effectMultiplier = parseFloat(inputElement.value) || 0;
                else if (property === 'isFinal') item.isFinal = inputElement.checked;
            } else if (actualItemType === 'skillMultiplier') { /* value handled by direct input */ }
             else {
                // If property is not 'value', 'isTriggered', or 'appliesTo' for a generic bonus item, mark as not changed.
                // Or if it's a specific property for a type not handled above.
                // This helps avoid unintended 'changed = true' if a fieldName is unexpected.
                // However, if itemTypeBase like 'superiorityUp' correctly maps to arrayKey 'superiorityUpBonuses',
                // and property is 'value' or 'isTriggered', it should be handled.
                // If it reaches here for a known item type, it means the property isn't recognized for that type.
                 if (itemArray) { // only consider it unchanged if we at least found an array
                    // console.warn(`[data_manager.js] Unhandled property '${property}' for itemTypeBase '${itemTypeBase}' (itemId: ${itemId})`);
                    // It's possible this is a valid case if not all items have all properties,
                    // but for typical bonus items, value/isTriggered/appliesTo are common.
                 }
                 // Let's assume if not explicitly handled, it might be an issue or an unhandled valid case.
                 // To be safe, if we found an item but didn't match a property, let's flag changed as false,
                 // unless we are sure all properties are covered.
                 // The original code implies only specific properties make 'changed' stay true.
                 // If no specific property setters are hit, 'changed' might need to be false.
                 // However, the initial 'changed = true' and only setting to false on errors means
                 // even unknown properties might pass through if not explicitly set to 'changed = false'.
                 // For now, let's keep original behavior: if a property isn't matched, it's effectively ignored but 'changed' might still be true.
                 // This is likely not the source of the superiorityUp issue if field names are correct.
             }
        } else {
            if(!item && itemArray && changed) console.warn(`[data_manager.js] Item with ID ${itemId} not found in array for ${itemTypeBase} on char ${charIndex}. Field: ${currentFieldName}. Available Ids:`, itemArray.map(i => i.id));
            if (itemArray && !item && changed) changed = false;
        }

        if (actualItemType === 'skillMultiplier' && inputElement.type === 'radio' && nameAttribute && nameAttribute.startsWith('skillMultiplierRadio_char')) {
             if (inputElement.checked && itemId) {
                 charData.selectedSkillMultiplierId = itemId;
                 changed = true;
             }
        }
    } else {
        // If it's not a recognized field name format or itemId is missing for item-specific fields
        changed = false;
    }
    return changed;
}

function addBonusItemWrapper(charIndex, bonusArrayKey, isPercentageIfApplicable = true) {
    const charData = characters[charIndex];
    if (!charData) { console.error(`addBonusItemWrapper: charData missing for charIndex ${charIndex}`); return; }
    let newItem;
    let newItemElement;
    let containerId = `${bonusArrayKey}Container_char${charIndex}`;

    if (bonusArrayKey === 'casterEffects') {
        newItem = {id: generateUniqueId(`char${charIndex}_casterEff`), refStatType: 'attack', effectMultiplier: 0, isFinal: false, isTriggered: false, appliesTo: 'all' };
        if (!charData.casterEffects) charData.casterEffects = []; charData.casterEffects.push(newItem);
        newItemElement = createCasterEffectItemHTML(charIndex, newItem);
    } else if (bonusArrayKey === 'skillMultipliers') {
        newItem = { id: generateUniqueId(`char${charIndex}_skillMulti`), value: 100, isTriggered: false };
        if (!charData.skillMultipliers) charData.skillMultipliers = []; charData.skillMultipliers.push(newItem);
        if (charData.skillMultipliers.length === 1 || !charData.selectedSkillMultiplierId) charData.selectedSkillMultiplierId = newItem.id;
        newItemElement = createSkillMultiplierItemHTML(charIndex, charData, newItem);
    } else {
        newItem = { id: generateUniqueId(`char${charIndex}_${bonusArrayKey}`), value: 0, isTriggered: false, appliesTo: 'all', isPercentage: isPercentageIfApplicable };
        if (bonusArrayKey === 'chargeUpBonuses') newItem.isSpecialBaseBuff = false;
        // For superiorityUpBonuses, appliesTo: 'all' and isPercentage: true (default) is correct.
        if (!charData[bonusArrayKey]) {
            charData[bonusArrayKey] = [];
        }
        charData[bonusArrayKey].push(newItem);
        let typeLabelBase = "加成";
        const addButton = document.querySelector(`button[onclick*="addBonusItemWrapper(${charIndex}, '${bonusArrayKey}'"]`);
        if(addButton) {
            typeLabelBase = addButton.textContent.replace('添加','').trim().split(' ')[0];
        } else {
            typeLabelBase = bonusArrayKey.replace(/UP|Bonuses|\(.*\)/gi, '').trim();
            if (!typeLabelBase) typeLabelBase = bonusArrayKey;
        }
        const actualTypeLabel = bonusArrayKey === 'chargeUpBonuses' ? '额外蓄力UP (%)' : `${typeLabelBase} (%)`;
        newItemElement = createBonusItemHTML(charIndex, bonusArrayKey, newItem, actualTypeLabel, isPercentageIfApplicable);
    }

    const container = document.getElementById(containerId);
    if (container && newItemElement) {
        container.appendChild(newItemElement);
    } else {
        console.error(`Container ${containerId} not found or newItemElement is null for ${bonusArrayKey}. Falling back to full render for panel ${charIndex}.`);
        renderCharacterPanel(charIndex); // Assumes renderCharacterPanel exists and can re-render
    }
    recalculateAllCharacterDamages(); // Assumes recalculateAllCharacterDamages exists
}

function removeBonusItemWrapper(charIndex, bonusArrayName, itemId) {
    const charData = characters[charIndex];
    if (!charData) { console.error(`removeBonusItemWrapper: charData missing for charIndex ${charIndex}`); return;}
    let arrayToModify, itemRemoved = false;

    if (bonusArrayName === 'casterEffects') {
        arrayToModify = charData.casterEffects;
        const initialLength = arrayToModify ? arrayToModify.length : 0;
        charData.casterEffects = arrayToModify ? arrayToModify.filter(item => item.id !== itemId) : [];
        itemRemoved = charData.casterEffects.length < initialLength;
    } else if (bonusArrayName === 'skillMultipliers') {
        arrayToModify = charData.skillMultipliers;
        const initialLength = arrayToModify ? arrayToModify.length : 0;
        charData.skillMultipliers = arrayToModify ? arrayToModify.filter(item => item.id !== itemId) : [];
        itemRemoved = charData.skillMultipliers.length < initialLength;
        if (itemRemoved && charData.selectedSkillMultiplierId === itemId) {
            charData.selectedSkillMultiplierId = charData.skillMultipliers[0]?.id || '';
            renderCharacterPanel(charIndex); // Assumes renderCharacterPanel exists
        }
        if (charData.skillMultipliers.length === 0 && itemRemoved) {
             addBonusItemWrapper(charIndex, 'skillMultipliers', false);
             return;
        }
    } else {
        arrayToModify = charData[bonusArrayName];
        if (arrayToModify) {
            const initialLength = arrayToModify.length;
            // *** FIXED TYPO HERE ***
            charData[bonusArrayName] = arrayToModify.filter(item => item.id !== itemId);
            itemRemoved = charData[bonusArrayName].length < initialLength;
        } else {
            // Ensure the array exists even if it was missing, to prevent errors if it's accessed later
            charData[bonusArrayName] = [];
        }
    }

    if (itemRemoved) {
        const itemElement = document.querySelector(`.bonus-item[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.remove();
        } else {
            // If element not found for direct removal, re-render the panel to reflect data change
            renderCharacterPanel(charIndex); // Assumes renderCharacterPanel exists
        }
    }
    recalculateAllCharacterDamages(); // Assumes recalculateAllCharacterDamages exists
}