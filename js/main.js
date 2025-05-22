// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    try {
        initApplication();
        setupGlobalUITogglesAndInteractions();
        setupSimplifiedExportImportListeners();
        populateSimplifiedTriggers(); 

        if (NUM_CHARACTERS > 0 && characters.length > 0 && typeof switchTab === 'function') {
           switchTab(0); 
        } else { 
            if (typeof updateOverviewPanel === 'function') updateOverviewPanel(activeCharacterIndex);
        }
    } catch (error) { 
        console.error("Initialization Error:", error); 
        alert("页面初始化时发生严重错误: " + error.message);
    }
});

function populateSimplifiedTriggers() {
    const container = document.getElementById('simplifiedTriggersContainer');
    if (!container) return;

    const triggers = [
        { id: 's_crit', label: '暴', fieldName: 'critDamageUp_isTriggered_QUICKVIEW', title: '暴击触发' },
        { id: 's_dist', label: '距', fieldName: 'distanceUp_isTriggered_QUICKVIEW', title: '距离UP' },
        { id: 's_burst', label: '爆', fieldName: 'burstUp_isTriggered_QUICKVIEW', title: '爆裂UP' },
        { id: 's_sup', label: '优', fieldName: 'superiorityUp_isBaseTriggered_isTriggered_QUICKVIEW', title: '优越UP(基础)' },
        { id: 's_core', label: '核', fieldName: 'coreDamageBaseChoiceTriggered_isTriggered_QUICKVIEW', title: '核心伤触发' },
        { id: 's_charge_trig', label: '蓄触', fieldName: 'chargeUpBase_isTriggered_QUICKVIEW', title: '蓄力基础触发'}
    ];

    let html = '';
    triggers.forEach(trigger => {
        html += `
            <label class="checkbox-label" title="${trigger.title}">
                <input type="checkbox" id="${trigger.id}Trigger_simplified" data-field-name="${trigger.fieldName}"> ${trigger.label}
            </label>
        `;
    });
    html += `
        <label class="select-label" title="蓄力基础倍率">蓄值:
            <select id="s_chargeValue_simplified" data-field-name="chargeUpBase_value_QUICKVIEW" class="charge-value-select-simplified">
                <option value="1" hidden>1x</option>
                <option value="2">2x</option>
                <option value="2.5">2.5x</option>
                <option value="3.5">3.5x</option>
            </select>
        </label>
    `;
    container.innerHTML = html;

    triggers.forEach(trigger => {
        const el = document.getElementById(`${trigger.id}Trigger_simplified`);
        if (el) el.addEventListener('change', handleGlobalNonPanelInput); // Changed to specific handler
    });
    const simplifiedChargeSelect = document.getElementById('s_chargeValue_simplified');
    if (simplifiedChargeSelect) {
        simplifiedChargeSelect.addEventListener('change', handleGlobalNonPanelInput); // Changed to specific handler
    }
}


function setupGlobalUITogglesAndInteractions() {
    const showTraceCheckbox = document.getElementById('showFormulaTraceGlobal');
    const globalTraceArea = document.getElementById('formulaTrace_overview');
    if (showTraceCheckbox && globalTraceArea) {
        const toggleTraceVisibility = () => {
            globalTraceArea.classList.toggle('visible', showTraceCheckbox.checked);
        };
        showTraceCheckbox.addEventListener('change', toggleTraceVisibility);
        toggleTraceVisibility(); 
    }

    const toggleOverviewBtn = document.getElementById('toggleOverviewBtn');
    const overviewPanel = document.getElementById('overviewPanel');
    if (toggleOverviewBtn && overviewPanel) {
        overviewPanel.classList.remove('simplified');
        toggleOverviewBtn.textContent = '▲';
        toggleOverviewBtn.setAttribute('aria-label', '收起概览');

        toggleOverviewBtn.addEventListener('click', () => {
            const isSimplified = overviewPanel.classList.toggle('simplified');
            toggleOverviewBtn.textContent = isSimplified ? '▼' : '▲';
            toggleOverviewBtn.setAttribute('aria-label', isSimplified ? '展开概览' : '收起概览');
        });
    }
}

function initApplication() {
    const enemyDefenseEl = document.getElementById('enemyDefenseGlobal');
    const enemyHasCoreEl = document.getElementById('enemyHasCoreGlobal');
    if(enemyDefenseEl) enemy.defense = parseFloat(enemyDefenseEl.value) || 500; else enemy.defense = 500;
    if(enemyHasCoreEl) enemy.hasCore = enemyHasCoreEl.checked; else enemy.hasCore = true;

    const characterPanelsContainer = document.getElementById('character-panels-container');
    const characterTabsContainer = document.querySelector('.character-tabs');
    if (!characterPanelsContainer || !characterTabsContainer) {
        alert("无法初始化角色面板，页面结构缺失！"); return;
    }
    characterPanelsContainer.innerHTML = ''; 
    characterTabsContainer.innerHTML = '';   
    characters.length = 0;                   

    for (let i = 0; i < NUM_CHARACTERS; i++) {
        try {
            const charDataInstance = createDefaultCharacterData(i);
            characters.push(charDataInstance);
            
            const panel = createCharacterPanelHTML(i);
            characterPanelsContainer.appendChild(panel);

            const tabButton = document.createElement('button');
            tabButton.className = 'tab-button'; 
            tabButton.id = `tab_char_btn_${i}`;
            tabButton.dataset.charIndex = i;
            tabButton.setAttribute('role', 'tab');
            tabButton.setAttribute('aria-controls', `character-panel-${i}`);
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'tab-char-name-display';
            nameSpan.textContent = characters[i].name || `角色 ${i+1}`;
            nameSpan.dataset.charIndex = i;
            tabButton.appendChild(nameSpan);
            
            tabButton.addEventListener('click', (e) => {
                if (e.target.nodeName !== 'INPUT' && !tabButton.classList.contains('editing-name')) {
                    switchTab(i);
                }
            });

            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if (tabButton.classList.contains('editing-name')) return;
                tabButton.classList.add('editing-name');

                const currentName = characters[i].name;
                nameSpan.style.display = 'none';

                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'tab-char-name-input-edit';
                input.value = currentName;
                input.dataset.charIndex = i;
                
                tabButton.appendChild(input);
                input.focus();
                input.select();

                const saveName = () => {
                    if (!tabButton.classList.contains('editing-name')) return;

                    const newName = input.value.trim() || `角色 ${i + 1}`;
                    characters[i].name = newName;
                    nameSpan.textContent = newName;
                    
                    if (tabButton.contains(input)) {
                        tabButton.removeChild(input);
                    }
                    nameSpan.style.display = 'inline-block';
                    tabButton.classList.remove('editing-name');
                    
                    if (i === activeCharacterIndex) {
                        updateOverviewPanel(activeCharacterIndex);
                    }
                };

                input.addEventListener('blur', saveName);
                input.addEventListener('keydown', (keyEvent) => {
                    if (keyEvent.key === 'Enter') {
                        keyEvent.preventDefault();
                        saveName();
                    } else if (keyEvent.key === 'Escape') {
                        keyEvent.preventDefault();
                        if (tabButton.contains(input)) {
                             tabButton.removeChild(input);
                        }
                        nameSpan.style.display = 'inline-block';
                        tabButton.classList.remove('editing-name');
                    }
                });
            });
            characterTabsContainer.appendChild(tabButton);
        } catch(e) { 
            console.error(`Error initializing character ${i}:`, e);
        }
    }
    
    document.getElementById('character-panels-container').addEventListener('input', handleCharacterPanelInput);
    document.getElementById('character-panels-container').addEventListener('change', handleCharacterPanelInput);
    
    document.body.addEventListener('input', handleGlobalNonPanelInput);
    document.body.addEventListener('change', handleGlobalNonPanelInput);
}

function handleCharacterPanelInput(event) {
    const target = event.target;
    const charPanel = target.closest('.character-panel');
    if (!charPanel) return;

    const charIndexToUpdate = parseInt(charPanel.dataset.charIndex);
    if (isNaN(charIndexToUpdate) || !characters[charIndexToUpdate]) return;

    let needsRecalc = false;
    if (typeof updateCharacterDataFromInput === 'function') {
        if (updateCharacterDataFromInput(charIndexToUpdate, target)) {
            needsRecalc = true;
        }
    }
    
    if (needsRecalc) {
        recalculateAllCharacterDamages();
    }
}

function handleGlobalNonPanelInput(event) {
    const target = event.target;
    if (target.closest('.character-panel')) return; // Already handled

    let needsRecalc = false;
    const activeCharData = characters[activeCharacterIndex];

    if (target.id === 'enemyDefenseGlobal') {
        enemy.defense = parseFloat(target.value) || 0;
        needsRecalc = true;
    } else if (target.id === 'enemyHasCoreGlobal') {
        enemy.hasCore = target.checked;
        needsRecalc = true;
    } else {
        const fieldName = target.dataset.fieldName;
        if (fieldName && fieldName.endsWith('_QUICKVIEW')) {
            if (!activeCharData) return;

            const baseFieldName = fieldName.replace('_QUICKVIEW', '');
            
            if (baseFieldName === 'critDamageUp_isTriggered') {
                if(activeCharData.critDamageUp) activeCharData.critDamageUp.isTriggered = target.checked;
            } else if (baseFieldName === 'distanceUp_isTriggered') {
                if(activeCharData.distanceUp) activeCharData.distanceUp.isTriggered = target.checked;
            } else if (baseFieldName === 'burstUp_isTriggered') {
                if(activeCharData.burstUp) activeCharData.burstUp.isTriggered = target.checked;
            } else if (baseFieldName === 'superiorityUp_isBaseTriggered_isTriggered') {
                if (activeCharData.superiorityUp) activeCharData.superiorityUp.isBaseTriggered = target.checked;
            } else if (baseFieldName === 'coreDamageBaseChoiceTriggered_isTriggered') {
                activeCharData.coreDamageBaseChoiceTriggered = target.checked;
                if (target.checked && !enemy.hasCore) {
                    enemy.hasCore = true;
                    const enemyHasCoreEl = document.getElementById('enemyHasCoreGlobal');
                    if (enemyHasCoreEl) enemyHasCoreEl.checked = true;
                }
            } else if (baseFieldName === 'coreDamageBaseChoice') {
                activeCharData.coreDamageBaseChoice = parseFloat(target.value);
            } else if (baseFieldName === 'chargeUpBase_isTriggered') {
                if (activeCharData.chargeUpBase) activeCharData.chargeUpBase.isTriggered = target.checked;
            } else if (baseFieldName === 'chargeUpBase_value') {
                if (activeCharData.chargeUpBase) activeCharData.chargeUpBase.value = parseFloat(target.value);
            } else if (baseFieldName === 'attackCount') { 
                activeCharData.attackCount = parseFloat(target.value) || 1;
            }
            needsRecalc = true;
            
            if (target.id.includes('_simplified')) {
                updateFullOverviewFromSimplified(baseFieldName, target.type === 'checkbox' ? target.checked : target.value);
            } else {
                updateSimplifiedTriggerFromFull(baseFieldName, target.type === 'checkbox' ? target.checked : target.value, target.type);
            }
        }
    }

    if (needsRecalc) {
        recalculateAllCharacterDamages();
    }
}

function updateSimplifiedTriggerFromFull(baseFieldName, value, inputType) {
    const map = {
        'critDamageUp_isTriggered': 's_critTrigger_simplified',
        'distanceUp_isTriggered': 's_distTrigger_simplified',
        'burstUp_isTriggered': 's_burstTrigger_simplified',
        'superiorityUp_isBaseTriggered_isTriggered': 's_supTrigger_simplified',
        'coreDamageBaseChoiceTriggered_isTriggered': 's_coreTrigger_simplified',
        'chargeUpBase_isTriggered': 's_charge_trigTrigger_simplified',
        'chargeUpBase_value': 's_chargeValue_simplified'
    };
    const simplifiedId = map[baseFieldName];
    if (simplifiedId) {
        const simplifiedEl = document.getElementById(simplifiedId);
        if (simplifiedEl) {
            if (simplifiedEl.type === 'checkbox') simplifiedEl.checked = value;
            else simplifiedEl.value = value;
        }
    }
}

function updateFullOverviewFromSimplified(baseFieldName, value) {
    const map = {
        'critDamageUp_isTriggered': 'quickViewCritTrigger',
        'distanceUp_isTriggered': 'quickViewDistanceUp',
        'burstUp_isTriggered': 'quickViewBurstUp',
        'superiorityUp_isBaseTriggered_isTriggered': 'quickViewSuperiorityUpBase',
        'coreDamageBaseChoiceTriggered_isTriggered': 'quickViewCoreDamageBaseTrigger',
        'chargeUpBase_isTriggered': 'quickViewChargeUpBaseTrigger',
        'chargeUpBase_value': 'quickViewChargeUpBaseValue'
    };
    const fullId = map[baseFieldName];
    if (fullId) {
        const fullEl = document.getElementById(fullId);
        if (fullEl) {
            if (fullEl.type === 'checkbox') fullEl.checked = value;
            else fullEl.value = value;
        }
    }
}

function updateOverviewPanel(charIndex) {
    const isInvalidChar = charIndex < 0 || charIndex >= characters.length || !characters[charIndex];
    const charData = isInvalidChar ? null : characters[charIndex];

    document.getElementById('simplifiedCharNameDisplay').textContent = charData?.name || '-';
    document.getElementById('simplifiedDamageDisplay').textContent = (typeof charData?.outputDamage === 'number') ? charData.outputDamage.toFixed(0) : '-';

    const simplifiedTriggersMap = [
        { id: 's_critTrigger_simplified', dataKey: 'critDamageUp', prop: 'isTriggered', type: 'checkbox' },
        { id: 's_distTrigger_simplified', dataKey: 'distanceUp', prop: 'isTriggered', type: 'checkbox' },
        { id: 's_burstTrigger_simplified', dataKey: 'burstUp', prop: 'isTriggered', type: 'checkbox' },
        { id: 's_supTrigger_simplified', dataKey: 'superiorityUp', prop: 'isBaseTriggered', type: 'checkbox' },
        { id: 's_coreTrigger_simplified', dataKey: null, prop: 'coreDamageBaseChoiceTriggered', type: 'checkbox' },
        { id: 's_charge_trigTrigger_simplified', dataKey: 'chargeUpBase', prop: 'isTriggered', type: 'checkbox'},
        { id: 's_chargeValue_simplified', dataKey: 'chargeUpBase', prop: 'value', type: 'select'}
    ];
    simplifiedTriggersMap.forEach(trigger => {
        const el = document.getElementById(trigger.id);
        if (el) {
            const val = charData ? (trigger.dataKey ? (charData[trigger.dataKey]?.[trigger.prop]) : (charData[trigger.prop])) : null;
            if (trigger.type === 'checkbox') {
                el.checked = val || false;
            } else if (trigger.type === 'select') {
                el.value = val !== null && val !== undefined ? val : (trigger.prop === 'value' ? '1' : '');
            }
        }
    });
    
    document.getElementById('currentQuickViewCharName').textContent = charData?.name || '-';
    
    const selectedSkill = charData?.skillMultipliers?.find(s => s.id === charData.selectedSkillMultiplierId && s.isTriggered);
    // Corrected IDs and property for span:
    const qvSkillMultValueEl = document.getElementById('quickViewSkillMultiplier_value_display');
    const qvSkillTriggerEl = document.getElementById('quickViewSkillMultiplier_isTriggered_display');

    if(qvSkillMultValueEl) qvSkillMultValueEl.textContent = selectedSkill ? selectedSkill.value : (charData ? '0' : '');
    if(qvSkillTriggerEl) qvSkillTriggerEl.checked = selectedSkill ? selectedSkill.isTriggered : false;
    
    document.getElementById('quickViewCritTrigger').checked = charData?.critDamageUp?.isTriggered || false;
    document.getElementById('quickViewDistanceUp').checked = charData?.distanceUp?.isTriggered || false;
    document.getElementById('quickViewBurstUp').checked = charData?.burstUp?.isTriggered || false;
    document.getElementById('quickViewSuperiorityUpBase').checked = charData?.superiorityUp?.isBaseTriggered || false;
    document.getElementById('quickViewCoreDamageBaseTrigger').checked = charData?.coreDamageBaseChoiceTriggered || false;
    document.getElementById('quickViewCoreDamageBaseChoice').value = charData?.coreDamageBaseChoice || '2';
    
    document.getElementById('quickViewChargeUpBaseTrigger').checked = charData?.chargeUpBase?.isTriggered || false;
    document.getElementById('quickViewChargeUpBaseValue').value = charData?.chargeUpBase?.value || '1';
    
    document.getElementById('quickViewAttackCount').value = charData?.attackCount || 1;

    document.getElementById('finalDamageResult_overview').textContent = (typeof charData?.outputDamage === 'number') ? charData.outputDamage.toFixed(0) : '-';

    const globalTraceArea = document.getElementById('formulaTrace_overview');
    if (globalTraceArea) {
        if (isInvalidChar || !charData.intermediateResults?.formulaTrace) {
            globalTraceArea.innerHTML = '<div class="trace-step">请先选择一个角色或无计算数据。</div>';
        } else {
            updateFormulaTraceUI(charIndex, charData.intermediateResults.formulaTrace, true);
        }
    }
}

function recalculateAllCharacterDamages() {
    if (!characters || characters.length === 0) {
        if (typeof updateOverviewPanel === 'function') updateOverviewPanel(-1);
        return;
    }

    characters.forEach((charData, charIndex) => {
        if (!charData) return;
        const currentFormulaTrace = [];
        const results = calculateCharacterDamage(charIndex, currentFormulaTrace);
        
        if (results && typeof results.finalDamage === 'number' && results.intermediate) {
            characters[charIndex].outputDamage = results.finalDamage;
            characters[charIndex].intermediateResults = results.intermediate;
            characters[charIndex].intermediateResults.formulaTrace = currentFormulaTrace; 

            if (typeof updateIntermediateResultsUI === 'function') {
                updateIntermediateResultsUI(charIndex, results.intermediate);
            }
        } else {
            characters[charIndex].outputDamage = 0;
            characters[charIndex].intermediateResults = { error: "Calc failed.", formulaTrace: [{expr:"Calc Error."}] };
        }
    });
    
    if (activeCharacterIndex >= 0 && activeCharacterIndex < characters.length && typeof updateOverviewPanel === 'function') {
        updateOverviewPanel(activeCharacterIndex);
    } else if (characters.length === 0 && typeof updateOverviewPanel === 'function') {
        updateOverviewPanel(-1);
    }
}