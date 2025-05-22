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
        specialDamageUpBonuses: [], // <<<<< ENSURE THIS IS INITIALIZED
        chargeUpBase: { value: 1, isTriggered: true },
        chargeUpBonuses: [], 
        superiorityUp: { isBaseTriggered: false, baseValueReadOnly: 0.1 },
        superiorityUpBonuses: [], 
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
    else if (currentFieldName === 'superiorityUp_isBaseTriggered') { 
        if(charData.superiorityUp) charData.superiorityUp.isBaseTriggered = inputElement.checked;
        else { console.warn("charData.superiorityUp object missing"); changed = false; }
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
    else if (itemId && currentFieldName && currentFieldName.includes('_')) { 
        const [itemTypeBase, property] = currentFieldName.split('_');
        let itemArray, actualItemType = itemTypeBase; 

        if (itemTypeBase === 'casterEffect') { itemArray = charData.casterEffects; actualItemType = 'casterEffect'; }
        else if (itemTypeBase === 'skillMultiplier') { itemArray = charData.skillMultipliers; actualItemType = 'skillMultiplier'; }
        else { 
            const arrayKey = itemTypeBase.endsWith('Bonuses') ? itemTypeBase : itemTypeBase + "Bonuses";
            itemArray = charData[arrayKey];

            // *** SPECIFIC LOGGING FOR specialDamageUpBonuses ***
            if (itemTypeBase === 'specialDamageUp') {
                console.log(`[data_manager.js] updateCharacterDataFromInput: Targeting itemTypeBase='specialDamageUp'. Derived arrayKey='${arrayKey}'. Array found:`, !!itemArray);
                if(itemArray) console.log(`[data_manager.js] Current charData.specialDamageUpBonuses:`, JSON.parse(JSON.stringify(itemArray)));
            }
            // *** END LOGGING ***

            if (!itemArray) { 
                console.warn(`[data_manager.js] Array key ${arrayKey} (derived from ${itemTypeBase}) not found on char ${charIndex} for field ${currentFieldName}`); 
                changed = false; 
            }
        }
        
        const item = itemArray?.find(b => b.id === itemId);

        // *** SPECIFIC LOGGING FOR specialDamageUpBonuses ***
        if (itemTypeBase === 'specialDamageUp') {
            console.log(`[data_manager.js] For specialDamageUp: Item with ID '${itemId}' found in array:`, !!item, item ? JSON.parse(JSON.stringify(item)) : undefined);
        }
        // *** END LOGGING ***

        if (item && changed) { 
            if (property === 'value') {
                item.value = parseFloat(inputElement.value) || 0;
                if (itemTypeBase === 'specialDamageUp') console.log(`[data_manager.js] SUCCESS: Updated specialDamageUp item: ID=${itemId}, new value=${item.value}`);
            }
            else if (property === 'isTriggered') {
                item.isTriggered = inputElement.checked;
                 if (itemTypeBase === 'specialDamageUp') console.log(`[data_manager.js] SUCCESS: Updated specialDamageUp item: ID=${itemId}, new isTriggered=${item.isTriggered}`);
            }
            else if (property === 'appliesTo') {
                item.appliesTo = inputElement.value;
                if (itemTypeBase === 'specialDamageUp') console.log(`[data_manager.js] SUCCESS: Updated specialDamageUp item: ID=${itemId}, new appliesTo=${item.appliesTo}`);
            }
            else if (itemTypeBase === 'chargeUp' && property === 'isSpecialBaseBuff') {
                 item.isSpecialBaseBuff = inputElement.checked;
            }
            else if (actualItemType === 'casterEffect') { 
                if (property === 'refStatType') item.refStatType = inputElement.value;
                else if (property === 'effectMultiplier') item.effectMultiplier = parseFloat(inputElement.value) || 0;
                else if (property === 'isFinal') item.isFinal = inputElement.checked;
            } else if (actualItemType === 'skillMultiplier') { /* value/trigger handled by radio or direct value input already */ }
             else {
                changed = false; 
             }
        } else { 
            if(!item && itemArray && changed) console.warn(`[data_manager.js] Item with ID ${itemId} not found in array for ${itemTypeBase} on char ${charIndex}. Field: ${currentFieldName}`);
            if (itemArray && !item && changed) changed = false; // If array was found but item wasn't, it's not a change we made here.
            // If changed was already false (e.g. itemArray not found), keep it false.
        } 

        if (actualItemType === 'skillMultiplier' && inputElement.type === 'radio' && nameAttribute && nameAttribute.startsWith('skillMultiplierRadio_char')) {
             if (inputElement.checked && itemId) { 
                 charData.selectedSkillMultiplierId = itemId;
                 changed = true; 
             }
        }
    } else {
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
        if (!charData[bonusArrayKey]) { // Ensure the array exists on charData
            console.warn(`[data_manager.js] addBonusItemWrapper: Initializing missing array ${bonusArrayKey} on char ${charIndex}`);
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
        renderCharacterPanel(charIndex); 
    }
    recalculateAllCharacterDamages();
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
            renderCharacterPanel(charIndex); 
        }
        if (charData.skillMultipliers.length === 0 && itemRemoved) { 
             addBonusItemWrapper(charIndex, 'skillMultipliers', false); 
             return; 
        }
    } else { 
        arrayToModify = charData[bonusArrayName];
        if (arrayToModify) {
            const initialLength = arrayToModify.length;
            charData[bonusArrayName] = arrayToModify.filter(item => item.id !== itemId);
            itemRemoved = charData[bonusArrayName].length < initialLength;
        } else {
            charData[bonusArrayName] = [];
        }
    }

    if (itemRemoved) {
        const itemElement = document.querySelector(`.bonus-item[data-item-id="${itemId}"]`);
        if (itemElement) {
            itemElement.remove();
        } else {
            renderCharacterPanel(charIndex); 
        }
    }
    recalculateAllCharacterDamages();
}