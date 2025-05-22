// js/ui_render.js

// Assumes ui_helpers.js (with createAppliesToHTML, etc.) is loaded BEFORE this file.
// Assumes config.js (with characters array) is loaded.
// Assumes data_manager.js (for addBonusItemWrapper being callable from HTML) is loaded.

function createCharacterPanelHTML(charIndex) {
    console.log(`[ui_render.js] createCharacterPanelHTML called for charIndex ${charIndex} (FULL VERSION)`);
    const charData = characters[charIndex]; 
    if (!charData) { 
        console.error(`[ui_render.js] CRITICAL: charData for ${charIndex} is UNDEFINED. Panel cannot be created.`);
        const errorPanel = document.createElement('div');
        errorPanel.classList.add('character-panel'); 
        errorPanel.id = `character-panel-${charIndex}`;
        errorPanel.innerHTML = `<p style="color:red; font-weight:bold; padding:20px;">PANEL CREATION FAILED FOR CHARACTER ${charIndex + 1} - DATA MISSING AT UI RENDER STAGE</p>`;
        return errorPanel;
    } 
    
    // Ensure selectedSkillMultiplierId is valid
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

    // Use the createTriggerHTML from ui_helpers.js for the core damage base choice trigger
    const coreDamageBaseActualTriggerHTML = createTriggerHTML('coreDamageBaseChoiceTriggered', charData.coreDamageBaseChoiceTriggered);


    try {
        // THIS IS THE FULL INNERHTML, incorporating all latest details
        panel.innerHTML = `
            <div class="character-header">
                <input type="text" data-field-name="characterName" value="${charData.name}" class="character-name-input">
                <div class="header-right-content">
                    <div class="damage-and-conditional-bonuses">
                        <span class="final-damage-output-display" id="finalDamageResult_char${charIndex}">伤害: -</span>
                        <div class="conditional-triggers">
                            <label><input type="checkbox" data-field-name="distanceUp_isTriggered" ${charData.distanceUp.isTriggered ? 'checked' : ''}> 距离UP (Value: 0.3)</label>
                            <label><input type="checkbox" data-field-name="burstUp_isTriggered" ${charData.burstUp.isTriggered ? 'checked' : ''}> 爆裂UP (Value: 0.5)</label>
                        </div>
                    </div>
                    <div class="formula-trace-area" id="formulaTrace_char${charIndex}"></div>
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
                ${generateBonusSectionHTML(charIndex, 'attackUpBonuses', '攻击力UP (默认1x)', true, 'ir_totalAttackUpMultiplier_char')}
                ${generateBonusSectionHTML(charIndex, 'casterEffects', '施展者攻UP', false, 'ir_casterAttackUpFlat_char')}
                ${generateBonusSectionHTML(charIndex, 'defenseDownBonuses', '防御DOWN (默认0%)', true, 'ir_effectiveEnemyDefense_char')}
                <div class="input-section"><h4><span class="intermediate-result-display" id="ir_termA_char${charIndex}">-</span>攻击项 - 防御项 (Term A)</h4></div>
                ${generateBonusSectionHTML(charIndex, 'skillMultipliers', '武器/技能倍率', false, 'ir_weaponSkillMultiplier_char')}
                <div class="input-section"> 
                    <h4><span class="intermediate-result-display" id="ir_additiveDamageBonusesSum_char${charIndex}">-</span>加算类增伤 (核/暴/距/爆)</h4>
                    <div class="input-section">
                        <h5><span class="intermediate-result-display" id="ir_coreDamageTotalPercent_char${charIndex}">-</span>核心伤UP (默认1x, 需敌方有核心)</h5>
                        <div class="bonus-item" data-item-id="char${charIndex}_staticCoreBase">
                            <span class="intermediate-result-display" id="ir_coreBaseChoiceVal_char${charIndex}">-</span>
                            <label class="bonus-label with-intermediate">基础核心增伤选择:</label>
                            <select data-field-name="coreDamageBaseChoice" class="bonus-value-input">
                                <option value="2" ${charData.coreDamageBaseChoice == 2 ? 'selected':''}>+200% (总计3x)</option>
                                <option value="2.5" ${charData.coreDamageBaseChoice == 2.5 ? 'selected':''}>+250% (总计3.5x)</option>
                            </select>
                            <span class="applies-to-group" style="visibility:hidden;"></span>
                            <span style="visibility:hidden;"><button type="button" class="remove-bonus">X</button></span>
                            ${coreDamageBaseActualTriggerHTML} <!-- Using the generated trigger HTML -->
                        </div>
                        <div id="coreDamageUpBonusesContainer_char${charIndex}">
                            ${(charData.coreDamageUpBonuses || []).map(b => createBonusItemHTML(charIndex, 'coreDamageUpBonuses', b, '额外核心伤 (%)', true).outerHTML).join('')}
                        </div>
                        <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'coreDamageUpBonuses', true)">添加额外核心伤</button>
                    </div>
                    <div class="input-section bonus-item" data-item-id="char${charIndex}_staticCrit">
                        <span class="intermediate-result-display" id="ir_critDamageUpPercent_char${charIndex}">-</span>
                        <label class="bonus-label with-intermediate">暴伤UP (%):</label>
                        <input type="number" class="bonus-value-input" data-field-name="critDamageUp_value" value="${charData.critDamageUp.value}">
                        ${createAppliesToHTML('critDamageUp', `char${charIndex}_staticCrit`, charData.critDamageUp.appliesTo)}
                        <span></span> ${createTriggerHTML('critDamageUp', charData.critDamageUp.isTriggered)}
                    </div>
                </div>
                ${generateBonusSectionHTML(charIndex, 'specialDamageUpBonuses', '特殊伤害UP (默认1x)', true, 'ir_totalSpecialDamageUpMultiplier_char')}
                <div class="input-section">
                    <h4><span class="intermediate-result-display" id="ir_totalChargeUpMultiplier_char${charIndex}">-</span>蓄力UP</h4>
                    <div class="bonus-item" data-item-id="char${charIndex}_staticChargeBase">
                        <span class="intermediate-result-display" id="ir_baseChargeMultiplier_char${charIndex}">-</span>
                        <label class="bonus-label with-intermediate">基础蓄力选择:</label>
                        <select data-field-name="chargeUpBase_value" class="bonus-value-input">
                            <option value="1" ${charData.chargeUpBase.value == 1 ? 'selected':''}>无 (1x)</option>
                            <option value="2" ${charData.chargeUpBase.value == 2 ? 'selected':''}>2x</option>
                            <option value="2.5" ${charData.chargeUpBase.value == 2.5 ? 'selected':''}>2.5x</option>
                            <option value="3.5" ${charData.chargeUpBase.value == 3.5 ? 'selected':''}>3.5x</option>
                        </select>
                        <span class="applies-to-group" style="visibility:hidden;"></span><span></span> 
                        ${createTriggerHTML('chargeUpBase', charData.chargeUpBase.isTriggered)}
                    </div>
                    <div id="chargeUpBonusesContainer_char${charIndex}">
                        ${(charData.chargeUpBonuses || []).map(b => createBonusItemHTML(charIndex, 'chargeUpBonuses', b, '额外蓄力UP (%)', true).outerHTML).join('')}
                    </div>
                    <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'chargeUpBonuses', true)">添加额外蓄力UP</button>
                </div>
                ${generateBonusSectionHTML(charIndex, 'superiorityUpBonuses', '优越UP (默认1.1x)', true, 'ir_totalSuperiorityUpMultiplier_char')}
                ${generateBonusSectionHTML(charIndex, 'damageTakenUpBonuses', '受伤UP (默认1x)', true, 'ir_totalDamageTakenUpMultiplier_char')}
            </div> 
        `;
    } catch (e) {
        console.error(`[ui_render.js] Error setting innerHTML for panel char ${charIndex}:`, e, "charData was:", JSON.parse(JSON.stringify(charData))); // Log charData on error
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
        charData[bonusArrayKey] = bonuses; 
    }
    
    let itemsHTML = '';
    try {
        // Ensure create...ItemHTML functions are correctly defined (e.g., in ui_helpers.js) and globally accessible
        if (bonusArrayKey === 'casterEffects') {
            itemsHTML = bonuses.map(item => createCasterEffectItemHTML(charIdx, item).outerHTML).join('');
        } else if (bonusArrayKey === 'skillMultipliers') {
            itemsHTML = bonuses.map(item => createSkillMultiplierItemHTML(charIdx, charData, item).outerHTML).join('');
        } else { 
            const typeLabelBase = sectionTitle.replace(/UP| \(施加给敌人\)|Bonuses|\(.*\)/gi, '').trim();
            const actualTypeLabel = bonusArrayKey === 'chargeUpBonuses' ? '额外蓄力UP (%)' : `${typeLabelBase} (%)`;
            itemsHTML = bonuses.map(item => createBonusItemHTML(charIdx, bonusArrayKey, item, actualTypeLabel, isPercentageDefault).outerHTML).join('');
        }
    } catch (e) {
        console.error(`[ui_render.js] Error generating items HTML for section ${bonusArrayKey}, char ${charIdx}:`, e);
        itemsHTML = `<p style="color:red;">Error rendering items for ${sectionTitle}: ${e.message}</p>`;
    }
    const sectionIntermediateResultHTML = intermediateResultIdBase ? `<span class="intermediate-result-display" id="${intermediateResultIdBase}${charIdx}">-</span>` : '';
    return `
        <div class="input-section">
            <h4>${sectionIntermediateResultHTML}${sectionTitle}</h4>
            <div id="${bonusArrayKey}Container_char${charIdx}">
                ${itemsHTML}
            </div>
            <button type="button" onclick="addBonusItemWrapper(${charIdx}, '${bonusArrayKey}', ${isPercentageDefault})">添加${sectionTitle.split(' ')[0]}</button>
        </div>`;
}

function renderCharacterPanel(charIndex) {
    console.log(`[ui_render.js] renderCharacterPanel called for charIndex ${charIndex}`);
    const oldPanel = document.getElementById(`character-panel-${charIndex}`);
    if (!oldPanel) {
        console.warn(`[ui_render.js] renderCharacterPanel: oldPanel for charIndex ${charIndex} not found. Attempting to create and append.`);
        const newCreatedPanel = createCharacterPanelHTML(charIndex);
        if (newCreatedPanel instanceof HTMLElement) {
            const container = document.getElementById('character-panels-container');
            if(container) {
                container.appendChild(newCreatedPanel);
                if (activeCharacterIndex === charIndex) newCreatedPanel.classList.add('active');
            }
        }
        return;
    }
    const scrollTop = oldPanel.scrollTop; 
    const newPanel = createCharacterPanelHTML(charIndex);
    if (!(newPanel instanceof HTMLElement)) { 
        console.error(`[ui_render.js] renderCharacterPanel: createCharacterPanelHTML returned invalid element for charIndex ${charIndex}.`); 
        return; 
    }
    try {
        if (oldPanel.parentNode) oldPanel.parentNode.replaceChild(newPanel, oldPanel);
    } catch (e) { console.error("[ui_render.js] Error replacing child in renderCharacterPanel:", e); }
    const freshlyRenderedPanel = document.getElementById(`character-panel-${charIndex}`);
    if (activeCharacterIndex === charIndex && freshlyRenderedPanel) freshlyRenderedPanel.classList.add('active');
    if (freshlyRenderedPanel) freshlyRenderedPanel.scrollTop = scrollTop;
}

function switchTab(charIndex) {
    console.log(`[ui_render.js] Attempting to switch to tab ${charIndex}`);
    activeCharacterIndex = charIndex; 
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
    const getEl = (id) => document.getElementById(`${id}${charIndex}`);
    const formatVal = (val, type = 'float', precision = 2) => {
        if (typeof val !== 'number' || isNaN(val)) return '-';
        if (type === 'percent_from_decimal') return (val * 100).toFixed(precision-1) + '%';
        if (type === 'multiplier') return 'x' + val.toFixed(precision);
        return val.toFixed(precision);
    };
    const formatInt = (val) => (typeof val === 'number' && !isNaN(val)) ? val.toFixed(0) : '-';

    if (results.error) {
        if(getEl('ir_termA_char')) getEl('ir_termA_char').textContent = `错误!`;
        const idsToClear = ['modifiedBaseValue_char', 'totalAttackUpMultiplier_char', 'casterAttackUpFlat_char', 
                            'effectiveEnemyDefense_char', 'weaponSkillMultiplier_char', 'additiveDamageBonusesSum_char',
                            'coreBaseChoiceVal_char', 'coreDamageTotalPercent_char', 'critDamageUpPercent_char',
                            'totalSpecialDamageUpMultiplier_char', 'baseChargeMultiplier_char', 'totalChargeUpMultiplier_char',
                            'totalSuperiorityUpMultiplier_char', 'totalDamageTakenUpMultiplier_char'];
        idsToClear.forEach(id => { const el = getEl(`ir_${id}`); if(el) el.textContent = `-`;});
        return;
    }
    // Update all intermediate display elements
    if (getEl('ir_modifiedBaseValue_char')) getEl('ir_modifiedBaseValue_char').textContent = `(${formatInt(results.modifiedBaseValue)})`;
    if (getEl('ir_totalAttackUpMultiplier_char')) getEl('ir_totalAttackUpMultiplier_char').textContent = `(${formatVal(results.totalAttackUpMultiplier, 'multiplier')})`;
    if (getEl('ir_casterAttackUpFlat_char')) getEl('ir_casterAttackUpFlat_char').textContent = `(+${formatInt(results.casterAttackUpFlat)})`;
    if (getEl('ir_effectiveEnemyDefense_char')) getEl('ir_effectiveEnemyDefense_char').textContent = `(-${formatInt(results.effectiveEnemyDefense)})`;
    if (getEl('ir_termA_char')) getEl('ir_termA_char').textContent = `(${formatInt(results.termA)})`;
    if (getEl('ir_weaponSkillMultiplier_char')) getEl('ir_weaponSkillMultiplier_char').textContent = `(${formatVal(results.weaponSkillMultiplier, 'percent_from_decimal', 1)})`;
    if (getEl('ir_additiveDamageBonusesSum_char')) getEl('ir_additiveDamageBonusesSum_char').textContent = `(x${formatVal(results.additiveDamageBonusesSum, 'float',3)})`;
    if (getEl('ir_coreBaseChoiceVal_char')) getEl('ir_coreBaseChoiceVal_char').textContent = `(+${(results.coreDamageBaseFromChoiceValue||0).toFixed(1)})`; // Use coreDamageBaseFromChoiceValue
    if (getEl('ir_coreDamageTotalPercent_char')) getEl('ir_coreDamageTotalPercent_char').textContent = `(x${formatVal(results.coreDamageTotalPercent, 'float',3)})`;
    if (getEl(`ir_critDamageUpPercent_char`)) getEl(`ir_critDamageUpPercent_char`).textContent = `(+${formatVal(results.critDamageUpPercent, 'percent_from_decimal',1)})`;
    if (getEl('ir_totalSpecialDamageUpMultiplier_char')) getEl('ir_totalSpecialDamageUpMultiplier_char').textContent = `(${formatVal(results.totalSpecialDamageUpMultiplier, 'multiplier')})`;
    if (getEl('ir_baseChargeMultiplier_char')) getEl('ir_baseChargeMultiplier_char').textContent = `(x${formatVal(results.baseChargeMultiplierValue, 'float',1)})`;
    if (getEl('ir_totalChargeUpMultiplier_char')) getEl('ir_totalChargeUpMultiplier_char').textContent = `(${formatVal(results.totalChargeUpMultiplier, 'multiplier')})`;
    if (getEl('ir_totalSuperiorityUpMultiplier_char')) getEl('ir_totalSuperiorityUpMultiplier_char').textContent = `(${formatVal(results.totalSuperiorityUpMultiplier, 'multiplier')})`;
    if (getEl('ir_totalDamageTakenUpMultiplier_char')) getEl('ir_totalDamageTakenUpMultiplier_char').textContent = `(${formatVal(results.totalDamageTakenUpMultiplier, 'multiplier')})`;
}

function updateFormulaTraceUI(charIndex, traceSteps) {
    if (!traceSteps) { console.warn(`updateFormulaTraceUI: traceSteps array is undefined for char ${charIndex}`); return; }
    const traceArea = document.getElementById(`formulaTrace_char${charIndex}`);
    if (traceArea) {
         traceArea.innerHTML = traceSteps.map(step => {
            let html = `<div class="trace-step">`;
            if (step.desc) html += `${step.desc}: `;
            if (typeof step.value === 'number' && !isNaN(step.value)) html += `<span class="trace-value">${step.value.toFixed(3)}</span>`;
            else if (step.expr) html += step.expr;
            else if (step.value !== undefined && step.value !== null) html += `<span class="trace-value">${String(step.value)}</span>`;
            else html += `-`; 
            if (step.comment) html += ` <span class="trace-comment">(${step.comment})</span>`;
            html += `</div>`;
            return html;
        }).join('');
        traceArea.scrollTop = traceArea.scrollHeight; 
    }
}