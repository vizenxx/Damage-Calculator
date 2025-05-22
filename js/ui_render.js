// js/ui_render.js

// Assumes ui_helpers.js (with createAppliesToHTML, createTriggerHTML etc.) is loaded BEFORE this file.
// Assumes config.js (with characters array) is loaded.
// Assumes data_manager.js (for addBonusItemWrapper being callable from HTML) is loaded.

function createCharacterPanelHTML(charIndex) {
    console.log(`[ui_render.js] createCharacterPanelHTML called for charIndex ${charIndex}`);
    const charData = characters[charIndex];
    if (!charData) {
        console.error(`[ui_render.js] CRITICAL: charData for ${charIndex} is UNDEFINED. Panel cannot be created.`);
        const errorPanel = document.createElement('div');
        errorPanel.classList.add('character-panel');
        errorPanel.id = `character-panel-${charIndex}`;
        errorPanel.innerHTML = `<p style="color:red; font-weight:bold; padding:20px;">PANEL CREATION FAILED FOR CHARACTER ${charIndex + 1} - DATA MISSING AT UI RENDER STAGE</p>`;
        return errorPanel;
    }
    if (!charData.superiorityUp) {
        console.warn(`[ui_render.js] charData.superiorityUp missing for char ${charIndex}. Initializing.`);
        charData.superiorityUp = { isBaseTriggered: false, baseValueReadOnly: 0.1 };
    }
    if (!charData.critDamageUp) { // Ensure critDamageUp object exists
        console.warn(`[ui_render.js] charData.critDamageUp missing for char ${charIndex}. Initializing.`);
        charData.critDamageUp = { value: 0, isTriggered: false, appliesTo: 'all' };
    }
     if (!charData.chargeUpBase) { // Ensure chargeUpBase object exists
        console.warn(`[ui_render.js] charData.chargeUpBase missing for char ${charIndex}. Initializing.`);
        charData.chargeUpBase = { value: 1, isTriggered: true };
    }


    if (charData.skillMultipliers && charData.skillMultipliers.length > 0) {
        if (!charData.skillMultipliers.find(sm => sm.id === charData.selectedSkillMultiplierId)) {
            charData.selectedSkillMultiplierId = charData.skillMultipliers[0].id;
        }
    } else {
        charData.selectedSkillMultiplierId = '';
    }

    const panel = document.createElement('div');
    panel.classList.add('character-panel');
    panel.dataset.charIndex = charIndex;
    panel.id = `character-panel-${charIndex}`;

    const coreDamageBaseActualTriggerHTML = createTriggerHTML('coreDamageBaseChoiceTriggered', charData.coreDamageBaseChoiceTriggered);

    const superiorityBaseTriggerDirectHTML = `
        <label class="trigger-label">
            <input type="checkbox"
                   data-field-name="superiorityUp_isBaseTriggered_isTriggered"
                   ${charData.superiorityUp.isBaseTriggered ? 'checked' : ''}>
            触发基础优越 (+${(charData.superiorityUp.baseValueReadOnly * 100).toFixed(0)}%)
        </label>
    `;


    try {
        panel.innerHTML = `
            <div class="character-header">
                <input type="text" data-field-name="characterName" value="${charData.name}" class="character-name-input">
                <div class="header-right-content">
                    <div class="damage-and-conditional-bonuses">
                        <span class="final-damage-output-display" id="finalDamageResult_char${charIndex}">伤害: -</span>
                        <div class="conditional-triggers">
                            <label><input type="checkbox" data-field-name="distanceUp_isTriggered" ${charData.distanceUp.isTriggered ? 'checked' : ''}> 距离UP (+30%)</label>
                            <label><input type="checkbox" data-field-name="burstUp_isTriggered" ${charData.burstUp.isTriggered ? 'checked' : ''}> 爆裂UP (+50%)</label>
                        </div>
                    </div>
                    <div class="formula-trace-area" id="formulaTrace_char${charIndex}"></div> <!-- Trace area is now part of header right content -->
                </div>
            </div>
            <div class="character-panel-content">
                <div class="input-section">
                    <h4><span class="intermediate-result-display" id="ir_modifiedBaseValue_char${charIndex}">-</span>基础属性</h4>
                    <label>面值攻击力: <input type="number" data-field-name="baseAttack" value="${charData.baseStats.attack}"></label>
                    <label>面值防御力: <input type="number" data-field-name="baseDefense" value="${charData.baseStats.defense}"></label>
                    <label>面值体力: <input type="number" data-field-name="baseHp" value="${charData.baseStats.hp}"></label>
                    <label>突破等级: <select data-field-name="breakthroughLevel">
                        <option value="initial" ${charData.breakthroughLevel === 'initial' ? 'selected' : ''}>初始 (1x)</option>
                        ${[...Array(10)].map((_, k) => `<option value="${k+1}" ${charData.breakthroughLevel == (k+1) ? 'selected' : ''}>${k<3 ? (k+1)+'星' : 'C'+(k-2)} (${k+1}级)</option>`).join('')}
                    </select></label>
                </div>
                ${generateBonusSectionHTML(charIndex, 'attackUpBonuses', '攻击力UP (%)', true, 'ir_totalAttackUpMultiplier_char')}
                ${generateBonusSectionHTML(charIndex, 'casterEffects', '施展者攻UP', false, 'ir_casterAttackUpFlat_char')}
                ${generateBonusSectionHTML(charIndex, 'defenseDownBonuses', '防御DOWN (%)', true, 'ir_effectiveEnemyDefense_char')}
                <div class="input-section"><h4><span class="intermediate-result-display" id="ir_termA_char${charIndex}">-</span>攻击项 - 防御项 (Term A)</h4></div>
                ${generateBonusSectionHTML(charIndex, 'skillMultipliers', '武器/技能倍率 (%)', false, 'ir_weaponSkillMultiplier_char')}
                
                <div class="input-section">
                    <h4><span class="intermediate-result-display" id="ir_additiveDamageBonusesSum_char${charIndex}">-</span>加算类增伤 (核/暴/距/爆)</h4>
                    
                    <div class="input-section"> <!-- Core Damage Section -->
                        <h5><span class="intermediate-result-display" id="ir_coreDamageTotalPercent_char${charIndex}">-</span>核心伤UP (需敌方有核心)</h5>
                        <div class="bonus-item" data-item-id="char${charIndex}_staticCoreBase">
                            <span class="intermediate-result-display" id="ir_coreBaseChoiceVal_char${charIndex}">-</span>
                            <label class="bonus-label with-intermediate">基础核心增伤:</label>
                            <select data-field-name="coreDamageBaseChoice" class="bonus-value-input">
                                <option value="2" ${charData.coreDamageBaseChoice == 2 ? 'selected':''}>+200%</option>
                                <option value="2.5" ${charData.coreDamageBaseChoice == 2.5 ? 'selected':''}>+250%</option>
                            </select>
                            <span class="input-suffix"></span> <!-- Empty suffix for select if not needed, or style it out -->
                            <span class="applies-to-group" style="visibility:hidden;"></span>
                            <span style="visibility:hidden;"><button type="button" class="remove-bonus">X</button></span>
                            ${coreDamageBaseActualTriggerHTML}
                        </div>
                        <div id="coreDamageUpBonusesContainer_char${charIndex}">
                            ${(charData.coreDamageUpBonuses || []).map(b => createBonusItemHTML(charIndex, 'coreDamageUpBonuses', b, '额外核心伤 (%)', true).outerHTML).join('')}
                        </div>
                        <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'coreDamageUpBonuses', true)">添加额外核心伤</button>
                    </div>

                    <div class="input-section bonus-item" data-item-id="char${charIndex}_staticCrit">
                        <span class="intermediate-result-display" id="ir_critDamageUpPercent_char${charIndex}">-</span>
                        <label class="bonus-label with-intermediate">暴伤UP:</label>
                        <input type="number" class="bonus-value-input" data-field-name="critDamageUp_value" value="${charData.critDamageUp.value}">
                        <span class="input-suffix">%</span>
                        ${createAppliesToHTML('critDamageUp', `char${charIndex}_staticCrit`, charData.critDamageUp.appliesTo)}
                        <span style="visibility:hidden;"><button type="button" class="remove-bonus">X</button></span>
                        ${createTriggerHTML('critDamageUp', charData.critDamageUp.isTriggered)}
                    </div>
                </div>
                
                ${generateBonusSectionHTML(charIndex, 'specialDamageUpBonuses', '特殊伤害UP (%)', true, 'ir_totalSpecialDamageUpMultiplier_char')}
                
                <div class="input-section"> <!-- Charge Up Section -->
                    <h4><span class="intermediate-result-display" id="ir_totalChargeUpMultiplier_char${charIndex}">-</span>蓄力UP</h4>
                    <div class="bonus-item" data-item-id="char${charIndex}_staticChargeBase">
                        <span class="intermediate-result-display" id="ir_baseChargeMultiplier_char${charIndex}">-</span>
                        <label class="bonus-label with-intermediate">基础蓄力:</label>
                        <select data-field-name="chargeUpBase_value" class="bonus-value-input">
                            <option value="1" ${charData.chargeUpBase.value == 1 ? 'selected':''}>无 (1x)</option>
                            <option value="2" ${charData.chargeUpBase.value == 2 ? 'selected':''}>2x</option>
                            <option value="2.5" ${charData.chargeUpBase.value == 2.5 ? 'selected':''}>2.5x</option>
                            <option value="3.5" ${charData.chargeUpBase.value == 3.5 ? 'selected':''}>3.5x</option>
                        </select>
                        <span class="input-suffix"></span> <!-- Empty suffix for select -->
                        <span class="applies-to-group" style="visibility:hidden;"></span>
                        <span style="visibility:hidden;"><button type="button" class="remove-bonus">X</button></span>
                        ${createTriggerHTML('chargeUpBase', charData.chargeUpBase.isTriggered)}
                    </div>
                    <div id="chargeUpBonusesContainer_char${charIndex}">
                        ${(charData.chargeUpBonuses || []).map(b => createBonusItemHTML(charIndex, 'chargeUpBonuses', b, '额外蓄力UP (%)', true).outerHTML).join('')}
                    </div>
                    <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'chargeUpBonuses', true)">添加额外蓄力UP</button>
                </div>

                <div class="input-section"> <!-- Superiority Up Section -->
                    <h4>
                        <span class="intermediate-result-display" id="ir_totalSuperiorityUpMultiplier_char${charIndex}">-</span>
                        优越UP
                    </h4>
                    <div class="bonus-item" data-item-id="char${charIndex}_staticSuperiorityBaseTrigger">
                        ${superiorityBaseTriggerDirectHTML}
                        <span class="bonus-label with-intermediate" style="visibility:hidden;"></span>
                        <span class="bonus-value-input" style="visibility:hidden;"></span>
                        <span class="input-suffix" style="visibility:hidden;"></span>
                        <span class="applies-to-group" style="visibility:hidden;"></span>
                        <span style="visibility:hidden;"><button type="button" class="remove-bonus">X</button></span>
                         <!-- Placeholder columns to match grid, actual trigger uses fewer -->
                    </div>
                    <div id="superiorityUpBonusesContainer_char${charIndex}">
                        ${(charData.superiorityUpBonuses || []).map(item => createBonusItemHTML(charIndex, 'superiorityUpBonuses', item, '额外优越UP (%)', true).outerHTML).join('')}
                    </div>
                    <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'superiorityUpBonuses', true)">添加额外优越UP</button>
                </div>

                ${generateBonusSectionHTML(charIndex, 'damageTakenUpBonuses', '受伤UP (%)', true, 'ir_totalDamageTakenUpMultiplier_char')}
            </div>
        `;
    } catch (e) {
        console.error(`[ui_render.js] Error setting innerHTML for panel char ${charIndex}:`, e, "charData was:", JSON.parse(JSON.stringify(charData)));
        panel.innerHTML = `<div class="character-header" style="background-color: #f0f0f0; padding: 10px; border-bottom: 1px solid #ccc;">PANEL ERROR</div><div class="character-panel-content"><p style="color:red; font-weight:bold; padding:20px;">Error rendering full panel ${charIndex + 1}. Message: ${e.message}</p></div>`;
    }
    return panel;
}

function generateBonusSectionHTML(charIdx, bonusArrayKey, sectionTitle, isPercentageDefault, intermediateResultIdBase = '') {
    const charData = characters[charIdx];
    let bonuses = charData[bonusArrayKey];
    if (!bonuses) {
        console.warn(`[ui_render.js] generateBonusSectionHTML: Bonus array key "${bonusArrayKey}" for char ${charIdx} was undefined. Defaulting to empty array.`);
        bonuses = [];
        charData[bonusArrayKey] = bonuses; // Initialize if missing
    }

    let itemsHTML = '';
    try {
        if (bonusArrayKey === 'casterEffects') {
            itemsHTML = bonuses.map(item => createCasterEffectItemHTML(charIdx, item).outerHTML).join('');
        } else if (bonusArrayKey === 'skillMultipliers') {
            itemsHTML = bonuses.map(item => createSkillMultiplierItemHTML(charIdx, charData, item).outerHTML).join('');
        } else {
            // Use the sectionTitle directly as typeLabel for items if it includes (%)
            // or determine based on isPercentageDefault
            const typeLabelForItem = sectionTitle.includes('(%)') ? sectionTitle :
                                  (isPercentageDefault ? `${sectionTitle.replace(/\(.*\)/, '').trim()} (%)` : sectionTitle);
            itemsHTML = bonuses.map(item => createBonusItemHTML(charIdx, bonusArrayKey, item, typeLabelForItem, isPercentageDefault).outerHTML).join('');
        }
    } catch (e) {
        console.error(`[ui_render.js] Error generating items HTML for section ${bonusArrayKey}, char ${charIdx}:`, e);
        itemsHTML = `<p style="color:red;">Error rendering items for ${sectionTitle}: ${e.message}</p>`;
    }
    const sectionIntermediateResultHTML = intermediateResultIdBase ? `<span class="intermediate-result-display" id="${intermediateResultIdBase}${charIdx}">-</span>` : '';

    // This function is now generic again, superiorityUp specific rendering is done in createCharacterPanelHTML
    return `
        <div class="input-section">
            <h4>${sectionIntermediateResultHTML}<span>${sectionTitle}</span></h4>
            <div id="${bonusArrayKey}Container_char${charIdx}">
                ${itemsHTML}
            </div>
            <button type="button" onclick="addBonusItemWrapper(${charIdx}, '${bonusArrayKey}', ${isPercentageDefault})">添加${sectionTitle.split(' ')[0].replace('(%)','').trim()}</button>
        </div>`;
}

function renderCharacterPanel(charIndex) {
    console.log(`[ui_render.js] renderCharacterPanel called for charIndex ${charIndex}`);
    const oldPanel = document.getElementById(`character-panel-${charIndex}`);

    const newPanel = createCharacterPanelHTML(charIndex);
    if (!(newPanel instanceof HTMLElement)) {
        console.error(`[ui_render.js] renderCharacterPanel: createCharacterPanelHTML returned invalid element for charIndex ${charIndex}.`);
        return;
    }

    if (!oldPanel) {
        console.warn(`[ui_render.js] renderCharacterPanel: oldPanel for charIndex ${charIndex} not found. Attempting to create and append.`);
        const container = document.getElementById('character-panels-container');
        if(container) {
            container.appendChild(newPanel);
            if (typeof activeCharacterIndex !== 'undefined' && activeCharacterIndex === charIndex) newPanel.classList.add('active');
        } else {
            console.error("[ui_render.js] Panels container not found for appending new panel.");
        }
        return;
    }

    const scrollTop = oldPanel.scrollTop; // Preserve scroll position for re-renders
    try {
        if (oldPanel.parentNode) {
            oldPanel.parentNode.replaceChild(newPanel, oldPanel);
        }
    } catch (e) { console.error("[ui_render.js] Error replacing child in renderCharacterPanel:", e); }

    const freshlyRenderedPanel = document.getElementById(`character-panel-${charIndex}`);
    if (typeof activeCharacterIndex !== 'undefined' && activeCharacterIndex === charIndex && freshlyRenderedPanel) {
        freshlyRenderedPanel.classList.add('active');
    }
    if (freshlyRenderedPanel) {
        freshlyRenderedPanel.scrollTop = scrollTop;
    }
}


function switchTab(charIndex) {
    console.log(`[ui_render.js] Attempting to switch to tab ${charIndex}`);
    window.activeCharacterIndex = charIndex; // Ensure activeCharacterIndex is global or properly scoped
    document.querySelectorAll('.character-panel').forEach(p => p.classList.remove('active'));
    const currentPanel = document.getElementById(`character-panel-${charIndex}`);
    if (currentPanel) {
        currentPanel.classList.add('active');
        console.log(`[ui_render.js] Panel for charIndex ${charIndex} (ID: ${currentPanel.id}) activated.`);
    } else {
        console.error(`[ui_render.js] switchTab: Panel for charIndex ${charIndex} (ID: character-panel-${charIndex}) NOT FOUND.`);
    }
    document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
    const currentTab = document.querySelector(`.tab-button[data-char-index="${charIndex}"]`);
    if (currentTab) currentTab.classList.add('active');
}

function updateIntermediateResultsUI(charIndex, results) {
    if (!results) { console.warn(`updateIntermediateResultsUI: results object is undefined for char ${charIndex}`); return; }
    const getEl = (id) => document.getElementById(`${id}${charIndex}`); // No _char suffix, it's part of the base id now
    const formatVal = (val, type = 'float', precision = 2) => {
        if (typeof val !== 'number' || isNaN(val)) return '-';
        if (type === 'percent_from_decimal') return (val * 100).toFixed(precision-1) + '%';
        if (type === 'multiplier') return 'x' + val.toFixed(precision);
        return val.toFixed(precision);
    };
    const formatInt = (val) => (typeof val === 'number' && !isNaN(val)) ? val.toFixed(0) : '-';

    const updateText = (elementId, value) => {
        const el = getEl(elementId);
        if (el) el.textContent = value;
        // else console.warn(`[UI Update] Element ${elementId}${charIndex} not found.`);
    };

    if (results.error) {
        updateText('ir_termA_char', `错误!`);
        const idsToClear = ['modifiedBaseValue_char', 'totalAttackUpMultiplier_char', 'casterAttackUpFlat_char',
                            'effectiveEnemyDefense_char', 'weaponSkillMultiplier_char', 'additiveDamageBonusesSum_char',
                            'coreBaseChoiceVal_char', 'coreDamageTotalPercent_char', 'critDamageUpPercent_char',
                            'totalSpecialDamageUpMultiplier_char', 'baseChargeMultiplier_char', 'totalChargeUpMultiplier_char',
                            'totalSuperiorityUpMultiplier_char', 'totalDamageTakenUpMultiplier_char'];
        idsToClear.forEach(idPrefix => updateText(`ir_${idPrefix}`, `-`));
        return;
    }

    updateText('ir_modifiedBaseValue_char', `(${formatInt(results.modifiedBaseValue)})`);
    updateText('ir_totalAttackUpMultiplier_char', `(${formatVal(results.totalAttackUpMultiplier, 'multiplier')})`);
    updateText('ir_casterAttackUpFlat_char', `(+${formatInt(results.casterAttackUpFlat)})`);
    updateText('ir_effectiveEnemyDefense_char', `(-${formatInt(results.effectiveEnemyDefense)})`);
    updateText('ir_termA_char', `(${formatInt(results.termA)})`);
    updateText('ir_weaponSkillMultiplier_char', `(${formatVal(results.weaponSkillMultiplier, 'percent_from_decimal', 1)})`);
    updateText('ir_additiveDamageBonusesSum_char', `(x${formatVal(results.additiveDamageBonusesSum, 'float',3)})`);

    let coreBaseValDisplay = characters[charIndex]?.coreDamageBaseChoiceTriggered ? (parseFloat(characters[charIndex]?.coreDamageBaseChoice) || 0) : 0;
    updateText('ir_coreBaseChoiceVal_char', `(+${coreBaseValDisplay.toFixed(1)})`);

    let coreTotalMultiplierDisplay = 1 + (results.coreDamage_bonus_part || 0);
    updateText('ir_coreDamageTotalPercent_char', `(x${formatVal(coreTotalMultiplierDisplay, 'float',3)})`);

    let critUpPercentVal = characters[charIndex]?.critDamageUp?.isTriggered ? (0.5 + (parseFloat(characters[charIndex]?.critDamageUp?.value) / 100 || 0)) : 0;
    updateText('ir_critDamageUpPercent_char', `(+${(critUpPercentVal*100).toFixed(0)}%)`);


    updateText('ir_totalSpecialDamageUpMultiplier_char', `(${formatVal(results.totalSpecialDamageUpMultiplier, 'multiplier')})`);
    updateText('ir_baseChargeMultiplier_char', `(x${formatVal(results.baseChargeMultiplierValue, 'float',1)})`);
    updateText('ir_totalChargeUpMultiplier_char', `(${formatVal(results.totalChargeUpMultiplier, 'multiplier')})`);
    updateText('ir_totalSuperiorityUpMultiplier_char', `(${formatVal(results.totalSuperiorityUpMultiplier, 'multiplier')})`);
    updateText('ir_totalDamageTakenUpMultiplier_char', `(${formatVal(results.totalDamageTakenUpMultiplier, 'multiplier')})`);
}

function updateFormulaTraceUI(charIndex, traceSteps) {
    if (!traceSteps) { console.warn(`updateFormulaTraceUI: traceSteps array is undefined for char ${charIndex}`); return; }
    const traceArea = document.getElementById(`formulaTrace_char${charIndex}`);
    if (traceArea) {
         traceArea.innerHTML = traceSteps.map(step => {
            let html = `<div class="trace-step">`;
            const sanitize = (str) => {
                if (typeof str !== 'string') return String(str); // Ensure it's a string
                const temp = document.createElement('div');
                temp.textContent = str;
                return temp.innerHTML;
            };

            let stepDesc = step.desc;
            let stepExpr = step.expr;

            if (stepDesc) html += `${sanitize(stepDesc)} `; // Removed colon, let expr handle it

            if (stepExpr) {
                html += stepExpr;
            } else if (typeof step.value === 'number' && !isNaN(step.value)) {
                html += `<span class="trace-value">${step.value.toFixed(3)}</span>`;
            } else if (step.value !== undefined && step.value !== null) {
                html += `<span class="trace-value">${sanitize(String(step.value))}</span>`;
            } else {
                // html += `-`; // No output if no value and no expr
            }
            if (step.comment) html += ` <span class="trace-comment">(${sanitize(step.comment)})</span>`;
            html += `</div>`;
            // Only return html if it's not just an empty div tag (e.g. for separator lines)
            return html.length > `<div class="trace-step"></div>`.length ? html : "";
        }).join('');
        traceArea.scrollTop = traceArea.scrollHeight;
    }
}