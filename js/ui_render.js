// js/ui_render.js
function createCharacterPanelHTML(charIndex) {
    const charData = characters[charIndex];
    if (!charData) {
        const errorPanel = document.createElement('div');
        errorPanel.className = 'character-panel';
        errorPanel.innerHTML = `<p style="color:red;">Error: Character data for index ${charIndex} not found.</p>`;
        return errorPanel;
    }

    // Ensure defaults for all fields, including new ones
    charData.baseStats = charData.baseStats || { attack: 1000, defense: 500, hp: 5000 };
    charData.actualBreakthroughLevel = charData.actualBreakthroughLevel || 'initial';
    charData.breakthroughLevel = charData.breakthroughLevel || 'initial';
    // attackCount is now primarily managed in the overview panel and charData directly, not duplicated in base-stats grid here.
    charData.attackCount = charData.attackCount || 1;


    charData.skillMultipliers = charData.skillMultipliers || [];
    if (charData.skillMultipliers.length === 0) {
        const defaultSkillId = generateUniqueId(`char${charIndex}_skillDef`);
        charData.skillMultipliers.push({ id: defaultSkillId, value: 100, isTriggered: true });
        charData.selectedSkillMultiplierId = defaultSkillId;
    } else {
        let foundSelected = false;
        charData.skillMultipliers.forEach(sm => {
            if (sm.id === charData.selectedSkillMultiplierId) {
                sm.isTriggered = true;
                foundSelected = true;
            } else {
                sm.isTriggered = false;
            }
        });
        if (!foundSelected && charData.skillMultipliers.length > 0) {
            charData.selectedSkillMultiplierId = charData.skillMultipliers[0].id;
            charData.skillMultipliers[0].isTriggered = true;
        } else if (charData.skillMultipliers.length === 0) { 
            charData.selectedSkillMultiplierId = '';
        }
    }

    charData.critDamageUp = charData.critDamageUp || { isTriggered: false };
    charData.distanceUp = charData.distanceUp || { value: 30, isTriggered: false };
    charData.burstUp = charData.burstUp || { value: 50, isTriggered: false };
    charData.coreDamageBaseChoice = charData.coreDamageBaseChoice || 2;
    charData.coreDamageBaseChoiceTriggered = typeof charData.coreDamageBaseChoiceTriggered === 'boolean' ? charData.coreDamageBaseChoiceTriggered : true;
    charData.chargeUpBase = charData.chargeUpBase || { value: 1, isTriggered: false }; 
    charData.superiorityUp = charData.superiorityUp || { isBaseTriggered: false, baseValueReadOnly: 0.1 };

    const bonusKeys = [
        'attackUpBonuses', 'casterEffects', 'defenseDownBonuses', 'coreDamageUpBonuses',
        'specialDamageUpBonuses', 'chargeUpBonuses', 'superiorityUpBonuses', 
        'damageTakenUpBonuses', 'critDamageUpBonuses', 'skillMultiplierUpBonuses'
    ];
    bonusKeys.forEach(key => {
        charData[key] = charData[key] || [];
    });
    if (charData.specialDamageUpBonuses) {
        charData.specialDamageUpBonuses.forEach(item => {
            item.type = item.type || '攻击伤害UP';
            item.customType = item.customType || '';
        });
    }


    const panel = document.createElement('div');
    panel.className = 'character-panel';
    panel.dataset.charIndex = charIndex;
    panel.id = `character-panel-${charIndex}`;
    
    const breakthroughOptionsHTML = (selectedValue) => {
        let html = `<option value="initial" ${selectedValue === 'initial' ? 'selected' : ''}>初始 (0)</option>`;
        html += [...Array(10)].map((_, k) => {
            const val = k + 1;
            const label = k < 3 ? `${val}星` : `C${k-2}`;
            return `<option value="${val}" ${selectedValue == val ? 'selected' : ''}>${label} (${val}级)</option>`;
        }).join('');
        return html;
    };

    panel.innerHTML = `
        <div class="character-panel-content">
            <div class="input-section">
                <h4><span class="intermediate-result-display" id="ir_modifiedBaseValue_char${charIndex}">-</span>基础属性</h4>
                <div class="base-stats-grid">
                    <div class="input-group">
                        <label>面值攻击力:</label>
                        <input type="number" data-field-name="baseAttack" value="${charData.baseStats.attack}">
                    </div>
                    <div class="input-group">
                        <label>面值防御力:</label>
                        <input type="number" data-field-name="baseDefense" value="${charData.baseStats.defense}">
                    </div>
                     <div class="input-group">
                        <label>面值体力:</label>
                        <input type="number" data-field-name="baseHp" value="${charData.baseStats.hp}">
                    </div>
                    <div class="input-group">
                        <label>实际突破等级:</label>
                        <select data-field-name="actualBreakthroughLevel">
                            ${breakthroughOptionsHTML(charData.actualBreakthroughLevel)}
                        </select>
                    </div>
                    <div class="input-group">
                        <label>预测突破等级:</label>
                        <select data-field-name="breakthroughLevel">
                             ${breakthroughOptionsHTML(charData.breakthroughLevel)}
                        </select>
                    </div>
                    ${'' /* Attack Count removed from here, managed in overview and charData directly */}
                </div>
            </div>
            
            <div class="input-section">
                <h4><span class="intermediate-result-display" id="ir_weaponSkillMultiplier_char${charIndex}">-</span>武器/技能倍率 (%)</h4>
                 <div id="skillMultipliersContainer_char${charIndex}">
                    ${(charData.skillMultipliers || []).map(item => createSkillMultiplierItemHTML(charIndex, charData, item).outerHTML).join('')}
                </div>
                <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'skillMultipliers', false)">添加新倍率</button>
            </div>

            ${generateBonusSectionHTML(charIndex, 'skillMultiplierUpBonuses', '倍率UP (%)', true, 'ir_skillMultiplierUpBonuses_char')}

            ${generateBonusSectionHTML(charIndex, 'attackUpBonuses', '攻击力UP (%)', true, 'ir_totalAttackUpMultiplier_char')}
            ${generateBonusSectionHTML(charIndex, 'casterEffects', '施展者攻UP', false, 'ir_casterAttackUpFlat_char')}
            ${generateBonusSectionHTML(charIndex, 'defenseDownBonuses', '防御DOWN (%)', true, 'ir_effectiveEnemyDefense_char')}
            <div class="input-section"><h4><span class="intermediate-result-display" id="ir_termA_char${charIndex}">-</span>攻击项 - 防御项 (Term A)</h4></div>

            <div class="input-section">
                <h4><span class="intermediate-result-display" id="ir_additiveDamageBonusesSum_char${charIndex}">-</span>加算类增伤 (额外部分)</h4>
                <p style="font-size:0.9em; color: #666;"><i>提示: 距离、爆裂、基础优越、基础核心伤的<u>基础部分</u>主要通过顶部概览面板为当前角色配置。此处的“额外核心伤”等为此基础之上的叠加。暴击触发和基础50%暴伤也在概览面板控制。</i></p>
                <div class="input-section">
                    <h5><span class="intermediate-result-display" id="ir_coreDamageTotalPercent_char${charIndex}">-</span>额外核心伤UP</h5>
                    <div id="coreDamageUpBonusesContainer_char${charIndex}">
                        ${(charData.coreDamageUpBonuses || []).map(b => createBonusItemHTML(charIndex, 'coreDamageUpBonuses', b, '额外核心伤 (%)', true).outerHTML).join('')}
                    </div>
                    <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'coreDamageUpBonuses', true)">添加额外核心伤</button>
                </div>
                 ${generateBonusSectionHTML(charIndex, 'critDamageUpBonuses', '额外暴伤UP (%)', true, 'ir_critDamageUpValue_char')}
            </div>
            ${generateBonusSectionHTML(charIndex, 'specialDamageUpBonuses', '特殊伤害UP (%)', true, 'ir_totalSpecialDamageUpMultiplier_char')}
            ${generateBonusSectionHTML(charIndex, 'chargeUpBonuses', '额外蓄力UP (%)', true, 'ir_totalChargeUpMultiplier_char')}
            <div class="input-section">
                <h4>
                    <span class="intermediate-result-display" id="ir_totalSuperiorityUpMultiplier_char${charIndex}">-</span>
                    额外优越UP
                </h4>
                 <p style="font-size:0.9em; color: #666;"><i>提示: 基础的+10%优越触发在顶部概览面板控制。此处添加的是在那之上的额外优越加成。</i></p>
                <div id="superiorityUpBonusesContainer_char${charIndex}">
                    ${(charData.superiorityUpBonuses || []).map(item => createBonusItemHTML(charIndex, 'superiorityUpBonuses', item, '额外优越UP (%)', true).outerHTML).join('')}
                </div>
                <button type="button" onclick="addBonusItemWrapper(${charIndex}, 'superiorityUpBonuses', true)">添加额外优越UP</button>
            </div>
            ${generateBonusSectionHTML(charIndex, 'damageTakenUpBonuses', '受伤UP (%)', true, 'ir_totalDamageTakenUpMultiplier_char')}
        </div>`;
    return panel;
}

// generateBonusSectionHTML, switchTab, updateIntermediateResultsUI, updateFormulaTraceUI (from previous correct version, no changes needed in these for this request beyond what was done)

function generateBonusSectionHTML(charIdx, bonusArrayKey, sectionTitle, isPercentageDefault, intermediateResultIdBase = '') {
    const charData = characters[charIdx];
    if (!charData) {
        return `<div class="input-section"><p style="color:red;">Error loading section: ${sectionTitle}</p></div>`;
    }
    let bonuses = charData[bonusArrayKey] || [];
    if (!charData[bonusArrayKey]) charData[bonusArrayKey] = bonuses; 

    let itemsHTML = '';
    try {
        if (bonusArrayKey === 'casterEffects') {
            itemsHTML = bonuses.map(item => createCasterEffectItemHTML(charIdx, item).outerHTML).join('');
        } else if (bonusArrayKey === 'skillMultipliers') {
            return ''; 
        } else if (bonusArrayKey === 'specialDamageUpBonuses') { 
             itemsHTML = bonuses.map(item => createSpecialDamageUpItemHTML(charIdx, item).outerHTML).join('');
        } else { 
            let typeLabelForItem = sectionTitle; 
             if (bonusArrayKey === 'coreDamageUpBonuses') typeLabelForItem = '额外核心伤 (%)';
             else if (bonusArrayKey === 'critDamageUpBonuses') typeLabelForItem = '额外暴伤 (%)';
             else if (bonusArrayKey === 'chargeUpBonuses') typeLabelForItem = '额外蓄力 (%)'; 
             else if (bonusArrayKey === 'superiorityUpBonuses') typeLabelForItem = '额外优越 (%)';
             else if (bonusArrayKey === 'skillMultiplierUpBonuses') typeLabelForItem = '倍率UP (%)';
             else typeLabelForItem = sectionTitle.replace(' (%)','').trim() + (isPercentageDefault ? ' (%)' : '');

            itemsHTML = bonuses.map(item => createBonusItemHTML(charIdx, bonusArrayKey, item, typeLabelForItem, isPercentageDefault).outerHTML).join('');
        }
    } catch (e) { 
        console.error(`Error rendering bonus items for ${sectionTitle}:`, e);
        itemsHTML = `<p style="color:red;">Error rendering bonus items for ${sectionTitle}.</p>`; 
    }

    const irHTML = intermediateResultIdBase ? `<span class="intermediate-result-display" id="${intermediateResultIdBase}${charIdx}">-</span>` : '';
    const btnLabel = sectionTitle.replace(/\(%\)/g, '').replace('UP','').trim();
    
    const addButtonHTML = bonusArrayKey !== 'skillMultipliers' ? 
        `<button type="button" onclick="addBonusItemWrapper(${charIdx}, '${bonusArrayKey}', ${isPercentageDefault})">添加${btnLabel}</button>` : '';

    return `
        <div class="input-section">
            <h4>${irHTML}<span>${sectionTitle}</span></h4>
            <div id="${bonusArrayKey}Container_char${charIdx}">${itemsHTML}</div>
            ${addButtonHTML}
        </div>`;
}

function switchTab(charIndex) {
    if (charIndex < 0 || charIndex >= characters.length) { console.error("Invalid charIndex for switchTab:", charIndex); return; }
    window.activeCharacterIndex = charIndex;

    document.querySelectorAll('.character-panel').forEach(p => p.classList.remove('active'));
    const newActivePanel = document.getElementById(`character-panel-${charIndex}`);
    if (newActivePanel) newActivePanel.classList.add('active');
    else console.error(`Panel character-panel-${charIndex} not found for switching.`);


    document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
    const newActiveTab = document.querySelector(`.tab-button[data-char-index="${charIndex}"]`) || document.getElementById(`tab_char_btn_${charIndex}`);
    if (newActiveTab) newActiveTab.classList.add('active');
    else console.error(`Tab button for charIndex ${charIndex} not found.`);

    if (typeof recalculateAllCharacterDamages === 'function') {
        recalculateAllCharacterDamages(); 
    } else {
        console.error("recalculateAllCharacterDamages is not defined in switchTab context.");
        if (typeof updateOverviewPanel === 'function') {
            updateOverviewPanel(activeCharacterIndex);
        }
    }
}

function updateIntermediateResultsUI(charIndex, results) {
    if (!results || !characters[charIndex]) return;

    const fVal = (v,t='f',p=2)=>(typeof v !=='number'||isNaN(v))?'-':(t==='p'?(v*100).toFixed(Math.max(0,p-1))+'%':(t==='m'?'x'+v.toFixed(p):v.toFixed(p)));
    const fInt = (v)=>(typeof v ==='number'&&!isNaN(v))?v.toFixed(0):'-';

    const updateText = (elIdSuffix, valueStr) => {
        const fullId = `ir_${elIdSuffix}${charIndex}`;
        const el = document.getElementById(fullId);
        if (el) el.textContent = valueStr;
    };

    if (results.error) { updateText('termA_char', `错误!`); return; }

    updateText('modifiedBaseValue_char', `(${fInt(results.modifiedBaseValue)})`);
    updateText('totalAttackUpMultiplier_char', `(${fVal(results.totalAttackUpMultiplier, 'm')})`);
    updateText('casterAttackUpFlat_char', `(+${fInt(results.casterAttackUpFlat)})`);
    updateText('effectiveEnemyDefense_char', `(-${fInt(results.effectiveEnemyDefense)})`);
    updateText('termA_char', `(${fInt(results.termA)})`);
    updateText('weaponSkillMultiplier_char', `(${fVal(results.weaponSkillMultiplier, 'p', 1)})`); 
    updateText('skillMultiplierUpBonuses_char', `(+${fVal(results.skillMultiplierUpBonuses, 'p', 1)})`);
    updateText('additiveDamageBonusesSum_char', `(x${fVal(results.additiveDamageBonusesSum, 'f', 3)})`);
    updateText('coreDamageTotalPercent_char', `(x${fVal(1 + (results.coreDamage_bonus_part || 0), 'f', 3)})`);
    updateText('critDamageUpValue_char', `(+${((results.critDamage_from_bonuses_part || 0) * 100).toFixed(0)}%)`);
    updateText('totalSpecialDamageUpMultiplier_char', `(${fVal(results.totalSpecialDamageUpMultiplier, 'm')})`);
    updateText('totalChargeUpMultiplier_char', `(${fVal(results.totalChargeUpMultiplier, 'm')})`);
    updateText('totalSuperiorityUpMultiplier_char', `(${fVal(results.totalSuperiorityUpMultiplier, 'm')})`);
    updateText('totalDamageTakenUpMultiplier_char', `(${fVal(results.totalDamageTakenUpMultiplier, 'm')})`);
}


function updateFormulaTraceUI(charIndex, traceSteps, isGlobalTrace = false) {
    const targetId = isGlobalTrace ? `formulaTrace_overview` : `formulaTrace_char${charIndex}`;
    const traceArea = document.getElementById(targetId);
    
    if (!traceArea) return;

    if (traceSteps && Array.isArray(traceSteps) && traceSteps.length > 0) {
        traceArea.innerHTML = traceSteps.map(step => {
            if (!step || (step.desc === undefined && step.expr === undefined && step.value === undefined)) return "";
            let html = `<div class="trace-step">`;
            // The `expr` field now often contains HTML, use it directly.
            // For `desc` and `value` if `expr` is not present, sanitize them.
            const sanitize = (s) => {
                if (typeof s !== 'string') s = String(s);
                return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
            };
            
            if (step.expr) {
                html += step.expr; 
            } else {
                if (step.desc) html += sanitize(step.desc) + " ";
                if (typeof step.value === 'number' && !isNaN(step.value)) {
                    html += `<span class="trace-value">${step.value.toFixed(3)}</span>`;
                } else if (step.value !== undefined && step.value !== null) {
                    html += `<span class="trace-value">${sanitize(String(step.value))}</span>`;
                }
            }
            
            if (step.comment) html += ` <span class="trace-comment">(${sanitize(step.comment)})</span>`;
            html += `</div>`;
            return html.length > `<div class="trace-step"></div>`.length ? html : "";
        }).join('');
        traceArea.scrollTop = traceArea.scrollHeight;
    } else if (traceArea) {
        traceArea.innerHTML = '<div class="trace-step">无计算步骤可显示。</div>';
    }
}