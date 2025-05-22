// js/data_manager.js

function createDefaultCharacterData(index) {
    const charIdPrefix = `char${index}_`;
    const defaultSkillId = generateUniqueId(charIdPrefix + 'skillDef');
    return {
        id: `char${index}`,
        name: `角色 ${index + 1}`,
        baseStats: { attack: 1000, defense: 500, hp: 5000 },
        actualBreakthroughLevel: 'initial', 
        breakthroughLevel: 'initial',       
        
        attackUpBonuses: [],
        casterEffects: [],
        defenseDownBonuses: [],
        coreDamageUpBonuses: [],
        specialDamageUpBonuses: [], // Items will have: { id, value, type, customType, isTriggered, appliesTo }
        chargeUpBonuses: [],
        superiorityUpBonuses: [],
        damageTakenUpBonuses: [],
        critDamageUpBonuses: [],
        skillMultiplierUpBonuses: [], // New: For 倍率UP
        
        skillMultipliers: [{ id: defaultSkillId, value: 100, isTriggered: true }],
        selectedSkillMultiplierId: defaultSkillId,

        critDamageUp: { isTriggered: false },
        distanceUp: { value: 30, isTriggered: false },
        burstUp: { value: 50, isTriggered: false },
        
        coreDamageBaseChoice: 2,
        coreDamageBaseChoiceTriggered: true,
        
        chargeUpBase: { value: 1, isTriggered: false },
        
        superiorityUp: { isBaseTriggered: false, baseValueReadOnly: 0.1 },

        attackCount: 1, // New: Attack count
        
        outputDamage: 0,
        intermediateResults: {}
    };
}

function updateCharacterDataFromInput(charIndex, inputElement) {
    const charData = characters[charIndex];
    if (!charData) return false;

    const fieldNameAttribute = inputElement.dataset.fieldName;
    const nameAttribute = inputElement.name;
    let currentFieldName = fieldNameAttribute || nameAttribute;

    const itemIdFromContainer = inputElement.closest('[data-item-id]')?.dataset.itemId;
    const itemId = itemIdFromContainer || inputElement.dataset.itemId; 

    let changed = true;

    if (currentFieldName === 'baseAttack') charData.baseStats.attack = parseFloat(inputElement.value) || 0;
    else if (currentFieldName === 'baseDefense') charData.baseStats.defense = parseFloat(inputElement.value) || 0;
    else if (currentFieldName === 'baseHp') charData.baseStats.hp = parseFloat(inputElement.value) || 0;
    else if (currentFieldName === 'actualBreakthroughLevel') charData.actualBreakthroughLevel = inputElement.value; 
    else if (currentFieldName === 'breakthroughLevel') charData.breakthroughLevel = inputElement.value;
    else if (currentFieldName === 'attackCount') charData.attackCount = parseFloat(inputElement.value) || 1; // Handle attackCount
        
    else if (itemId && currentFieldName && currentFieldName.includes('_')) {
        const [itemTypeBase, property] = currentFieldName.split('_', 2);
        let itemArrayKey = itemTypeBase.endsWith('Bonuses') ? itemTypeBase : itemTypeBase + "Bonuses";
        if (itemTypeBase === "casterEffect") itemArrayKey = "casterEffects";
        else if (itemTypeBase === "skillMultiplier") itemArrayKey = "skillMultipliers";
        // Ensure new skillMultiplierUpBonuses is handled
        else if (itemTypeBase === "skillMultiplierUp") itemArrayKey = "skillMultiplierUpBonuses";


        let itemArray = charData[itemArrayKey];
        
        if (!itemArray) {
            console.warn(`Array key ${itemArrayKey} not found on charData for ${itemTypeBase}`);
            changed = false;
        }

        const item = itemArray?.find(b => b.id === itemId);
        if (item && changed) {
            if (property === 'value') {
                item.value = parseFloat(inputElement.value) || 0;
            }
            else if (property === 'isTriggered') {
                if (itemArrayKey !== 'skillMultipliers') { 
                    item.isTriggered = inputElement.checked;
                }
            }
            else if (property === 'appliesTo') item.appliesTo = inputElement.value;
            else if (itemTypeBase === 'chargeUp' && property === 'isSpecialBaseBuff') {
                 item.isSpecialBaseBuff = inputElement.checked;
            }
            else if (itemTypeBase === 'casterEffect') {
                if (property === 'refStatType') item.refStatType = inputElement.value;
                else if (property === 'effectMultiplier') item.effectMultiplier = parseFloat(inputElement.value) || 0;
                else if (property === 'isFinal') item.isFinal = inputElement.checked;
            }
            else if (itemArrayKey === 'specialDamageUpBonuses') { // Handle specialDamageUpBonuses specific fields
                if (property === 'type') {
                    item.type = inputElement.value;
                    if (item.type !== "自定义...") {
                        item.customType = ""; // Clear custom type if a predefined one is selected
                        // Optionally: hide the custom input field via JS if needed, though CSS handles initial state
                        const customWrapper = document.getElementById(`customTypeWrapper_${item.id}`);
                        if (customWrapper) customWrapper.classList.add('hidden');
                        const customInput = customWrapper?.querySelector('input');
                        if (customInput) customInput.value = "";

                    } else {
                         const customWrapper = document.getElementById(`customTypeWrapper_${item.id}`);
                         if (customWrapper) customWrapper.classList.remove('hidden');
                    }
                } else if (property === 'customType') {
                    item.customType = inputElement.value;
                }
            }
             else {
                changed = false;
             }
        } else {
            if (itemArray && !item && changed) {
                 console.warn(`Item with ID ${itemId} not found in ${itemArrayKey}`);
                 changed = false;
            }
        }
    } 
    else if (inputElement.type === 'radio' && nameAttribute && nameAttribute.startsWith('skillMultiplierRadio_char')) {
        // This is handled by handleSkillMultiplierSelection, but mark as changed for recalc
        if (inputElement.checked) {
             changed = true; 
        }
    }
    else {
        changed = false;
    }
    return changed;
}

function addBonusItemWrapper(charIndex, bonusArrayKey, isPercentageIfApplicable = true) {
    const charData = characters[charIndex];
    if (!charData) return;
    
    if (!charData[bonusArrayKey]) {
        charData[bonusArrayKey] = [];
    }

    let newItem;
    let newItemElement;
    let containerId = `${bonusArrayKey}Container_char${charIndex}`;
    const charIdPrefix = `char${charIndex}_`;

    if (bonusArrayKey === 'casterEffects') {
        newItem = {id: generateUniqueId(charIdPrefix+'casterEff'), refStatType: 'attack', effectMultiplier: 0, isFinal: false, isTriggered: false, appliesTo: 'all' };
        charData.casterEffects.push(newItem);
        newItemElement = createCasterEffectItemHTML(charIndex, newItem);
    } else if (bonusArrayKey === 'skillMultipliers') {
        newItem = { id: generateUniqueId(charIdPrefix+'skillMulti'), value: 100, isTriggered: false };
        charData.skillMultipliers.push(newItem);
        if (charData.skillMultipliers.length === 1 || !charData.selectedSkillMultiplierId) {
            charData.selectedSkillMultiplierId = newItem.id;
            newItem.isTriggered = true; 
        } else { 
            charData.skillMultipliers.forEach(skill => {
                skill.isTriggered = (skill.id === charData.selectedSkillMultiplierId);
            });
        }
        // Full re-render of skill multipliers container
        const skillContainer = document.getElementById(`skillMultipliersContainer_char${charIndex}`);
        if (skillContainer) {
            skillContainer.innerHTML = charData.skillMultipliers.map(item => createSkillMultiplierItemHTML(charIndex, charData, item).outerHTML).join('');
             // Re-attach listeners if necessary, or rely on event delegation if setup in main.js for inputs
        }
    } else if (bonusArrayKey === 'specialDamageUpBonuses') {
        newItem = { 
            id: generateUniqueId(charIdPrefix + 'specialDmg'), 
            value: 0, 
            type: '攻击伤害UP', // Default type
            customType: '',
            isTriggered: false, 
            appliesTo: 'all' 
        };
        charData[bonusArrayKey].push(newItem);
        newItemElement = createSpecialDamageUpItemHTML(charIndex, newItem); // Use specific creator
    }
    else { // Generic bonuses including skillMultiplierUpBonuses
        newItem = { id: generateUniqueId(charIdPrefix+bonusArrayKey), value: 0, isTriggered: false, appliesTo: 'all' };
        if (bonusArrayKey === 'chargeUpBonuses') {
            newItem.isSpecialBaseBuff = false;
        }
        // No special properties for skillMultiplierUpBonuses beyond generic
        
        charData[bonusArrayKey].push(newItem);
        
        let typeLabelBase = "加成";
        const addButton = document.querySelector(`#character-panel-${charIndex} button[onclick*="addBonusItemWrapper(${charIndex}, '${bonusArrayKey}'"]`);

        if(addButton && addButton.textContent) {
            typeLabelBase = addButton.textContent.replace('添加','').trim();
        } else { 
            // Fallback labels (ensure new types are covered if not using button text)
            if (bonusArrayKey.includes('attackUp')) typeLabelBase = "攻击力UP";
            else if (bonusArrayKey.includes('coreDamageUp')) typeLabelBase = "额外核心伤";
            else if (bonusArrayKey.includes('critDamageUp')) typeLabelBase = "额外暴伤";
            else if (bonusArrayKey === 'skillMultiplierUpBonuses') typeLabelBase = "倍率UP";
        }
        const actualTypeLabel = typeLabelBase + (isPercentageIfApplicable && !typeLabelBase.includes('%') ? ' (%)' : '');
        newItemElement = createBonusItemHTML(charIndex, bonusArrayKey, newItem, actualTypeLabel, isPercentageIfApplicable);
    }

    if (bonusArrayKey !== 'skillMultipliers') { // skillMultipliers re-renders its whole container
        const container = document.getElementById(containerId);
        if (container && newItemElement) {
            container.appendChild(newItemElement);
        } else if (newItemElement) {
            console.error(`Container ${containerId} not found for ${bonusArrayKey}.`);
        }
    }
    recalculateAllCharacterDamages();
}

function removeBonusItemWrapper(charIndex, bonusArrayName, itemId) {
    const charData = characters[charIndex];
    if (!charData || !charData[bonusArrayName]) return;
    
    const arrayToModify = charData[bonusArrayName];
    const initialLength = arrayToModify.length;
    
    charData[bonusArrayName] = arrayToModify.filter(item => item.id !== itemId);
    const itemRemoved = charData[bonusArrayName].length < initialLength;

    if (itemRemoved) {
        const itemElement = document.querySelector(`#character-panel-${charIndex} [data-item-id="${itemId}"]`); // More robust selector
        if (itemElement) {
            itemElement.remove();
        }

        if (bonusArrayName === 'skillMultipliers') {
            let triggerRecalc = false;
            if (charData.selectedSkillMultiplierId === itemId) {
                if (charData.skillMultipliers.length > 0) {
                    charData.selectedSkillMultiplierId = charData.skillMultipliers[0].id;
                    charData.skillMultipliers[0].isTriggered = true; 
                } else {
                    charData.selectedSkillMultiplierId = ''; 
                }
                triggerRecalc = true; 
            }
            // Ensure at least one skill multiplier exists, or add a default one
            if (charData.skillMultipliers.length === 0) {
                 addBonusItemWrapper(charIndex, 'skillMultipliers', false); 
                 // addBonusItemWrapper calls recalculate, so return early
                 return; 
            }
            // Full re-render of skill multipliers container
            const skillContainer = document.getElementById(`skillMultipliersContainer_char${charIndex}`);
            if (skillContainer) {
                skillContainer.innerHTML = charData.skillMultipliers.map(item => createSkillMultiplierItemHTML(charIndex, charData, item).outerHTML).join('');
            }
            if (triggerRecalc) { 
                if (charIndex === activeCharacterIndex && typeof updateOverviewPanel === 'function') {
                    updateOverviewPanel(activeCharacterIndex); 
                }
            }
        }
    }
    recalculateAllCharacterDamages();
}