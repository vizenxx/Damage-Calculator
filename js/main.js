// js/main.js
// 主要关注 updateShowcaseHeight 函数的准确性。其他函数保持不变。

function populateSimplifiedTriggers() {
    const container = document.getElementById('simplifiedTriggersContainer');
    if (!container) return;

    const triggers = [
        { id: 's_crit', label: '暴', fieldName: 'critDamageUp_isTriggered_QUICKVIEW', title: '暴击触发' },
        { id: 's_dist', label: '距', fieldName: 'distanceUp_isTriggered_QUICKVIEW', title: '距离UP' },
        { id: 's_burst', label: '爆', fieldName: 'burstUp_isTriggered_QUICKVIEW', title: '爆裂UP' },
        { id: 's_sup', label: '优', fieldName: 'superiorityUp_isBaseTriggered_isTriggered_QUICKVIEW', title: '优越UP(基础)' },
        { id: 's_core', label: '核', fieldName: 'coreDamageBaseChoiceTriggered_isTriggered_QUICKVIEW', title: '核心伤触发' },
        { id: 's_charge_trig', label: '蓄', fieldName: 'chargeUpBase_isTriggered_QUICKVIEW', title: '蓄力基础触发'}
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
        if (el) el.addEventListener('change', handleGlobalNonPanelInput);
    });
    const simplifiedChargeSelect = document.getElementById('s_chargeValue_simplified');
    if (simplifiedChargeSelect) {
        simplifiedChargeSelect.addEventListener('change', handleGlobalNonPanelInput);
    }
}


function handleGlobalNonPanelInput(event) {
    const target = event.target;
    if (target.closest('.character-panel') || target.closest('.settings-footer')) return; 

    const currentActiveCharData = characters[window.activeCharacterIndex];

    let needsRecalc = false;

    if (target.id === 'enemyDefenseGlobal') {
        enemy.defense = parseFloat(target.value) || 0;
        needsRecalc = true;
    } else if (target.id === 'enemyHasCoreGlobal') {
        enemy.hasCore = target.checked;
        needsRecalc = true;
    } else {
        const fieldName = target.dataset.fieldName;
        if (fieldName && fieldName.endsWith('_QUICKVIEW')) {
            if (!currentActiveCharData) {
                return; 
            }

            const baseFieldName = fieldName.replace('_QUICKVIEW', '');
            
            if (baseFieldName === 'critDamageUp_isTriggered') {
                if(currentActiveCharData.critDamageUp) currentActiveCharData.critDamageUp.isTriggered = target.checked;
            } else if (baseFieldName === 'distanceUp_isTriggered') {
                if(currentActiveCharData.distanceUp) currentActiveCharData.distanceUp.isTriggered = target.checked;
            } else if (baseFieldName === 'burstUp_isTriggered') {
                if(currentActiveCharData.burstUp) currentActiveCharData.burstUp.isTriggered = target.checked;
            } else if (baseFieldName === 'superiorityUp_isBaseTriggered_isTriggered') {
                if (currentActiveCharData.superiorityUp) currentActiveCharData.superiorityUp.isBaseTriggered = target.checked;
            } else if (baseFieldName === 'coreDamageBaseChoiceTriggered_isTriggered') {
                currentActiveCharData.coreDamageBaseChoiceTriggered = target.checked;
                if (target.checked && !enemy.hasCore) {
                    enemy.hasCore = true;
                    const enemyHasCoreEl = document.getElementById('enemyHasCoreGlobal');
                    if (enemyHasCoreEl) enemyHasCoreEl.checked = true;
                }
            } else if (baseFieldName === 'coreDamageBaseChoice') {
                currentActiveCharData.coreDamageBaseChoice = parseFloat(target.value);
            } else if (baseFieldName === 'chargeUpBase_isTriggered') {
                if (currentActiveCharData.chargeUpBase) currentActiveCharData.chargeUpBase.isTriggered = target.checked;
            } else if (baseFieldName === 'chargeUpBase_value') {
                if (currentActiveCharData.chargeUpBase) currentActiveCharData.chargeUpBase.value = parseFloat(target.value);
            } else if (baseFieldName === 'attackCount') { 
                currentActiveCharData.attackCount = parseFloat(target.value) || 1;
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

document.addEventListener('DOMContentLoaded', () => {
    try {
        initApplication();
        setupGlobalUITogglesAndInteractions();
        setupSimplifiedExportImportListeners();
        populateSimplifiedTriggers(); 
        setupBackgroundControls(); 
        setupPanelOpacityControls(); 
        setupResponsiveShowcaseHeight(); // Sets up dynamic height for showcase area
        setupStickyTabsObserver(); // Sets up overview panel height var and calls showcase height update

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
        overviewPanel.classList.remove('simplified'); // Start expanded
        toggleOverviewBtn.textContent = '▲';
        toggleOverviewBtn.setAttribute('aria-label', '收起概览');

        toggleOverviewBtn.addEventListener('click', () => {
            const isSimplified = overviewPanel.classList.toggle('simplified');
            toggleOverviewBtn.textContent = isSimplified ? '▼' : '▲';
            toggleOverviewBtn.setAttribute('aria-label', isSimplified ? '展开概览' : '收起概览');
            // Wait for animation/transition to complete before updating heights
            setTimeout(() => {
                updateOverviewPanelHeightVar(); 
                updateShowcaseHeight(); // Ensure showcase height is also updated
            }, 50); // Adjust timeout if animation is longer
        });
    }
}

function setupBackgroundControls() {
    const backgroundImageInput = document.getElementById('backgroundImageInput');
    const backgroundOpacitySlider = document.getElementById('backgroundOpacitySlider');
    const backgroundOpacityValue = document.getElementById('backgroundOpacityValue');
    const backgroundLayer = document.getElementById('backgroundLayer');
    const resetButton = document.getElementById('resetBackgroundButton');

    let currentObjectURL = null; 

    if (backgroundImageInput && backgroundOpacitySlider && backgroundOpacityValue && backgroundLayer && resetButton) {
        backgroundImageInput.addEventListener('change', function(event) {
            const file = event.target.files[0];
            if (file) {
                if (currentObjectURL) {
                    URL.revokeObjectURL(currentObjectURL); 
                }
                currentObjectURL = URL.createObjectURL(file);
                
                backgroundLayer.style.backgroundImage = `url('${currentObjectURL}')`;
                backgroundLayer.style.backgroundSize = '100% auto'; 
                backgroundLayer.style.backgroundPosition = 'center top'; 
                backgroundLayer.classList.add('has-image'); 
                const currentOpacity = parseFloat(backgroundOpacitySlider.value) / 100;
                backgroundLayer.style.opacity = currentOpacity;

            }
        });

        backgroundOpacitySlider.addEventListener('input', function(event) {
            const opacity = event.target.value / 100;
            if (backgroundLayer.style.backgroundImage && backgroundLayer.style.backgroundImage !== 'none') {
                backgroundLayer.style.opacity = opacity;
            } else {
                 backgroundLayer.style.opacity = 1; 
            }
            backgroundOpacityValue.textContent = event.target.value;
        });

        resetButton.addEventListener('click', function() {
            if (currentObjectURL) {
                URL.revokeObjectURL(currentObjectURL);
                currentObjectURL = null;
            }
            backgroundLayer.style.backgroundImage = 'none';
            backgroundLayer.classList.remove('has-image'); 
            backgroundOpacitySlider.value = 100; 
            backgroundLayer.style.opacity = 1; 
            backgroundOpacityValue.textContent = 100;
            backgroundImageInput.value = null; 
        });
        
        backgroundOpacityValue.textContent = backgroundOpacitySlider.value;
        if (!backgroundLayer.style.backgroundImage || backgroundLayer.style.backgroundImage === 'none') {
            backgroundLayer.style.opacity = 1; 
        } else {
            backgroundLayer.style.opacity = parseFloat(backgroundOpacitySlider.value) / 100;
        }
    }
}

function setupPanelOpacityControls() {
    const panelOpacitySlider = document.getElementById('panelOpacitySlider');
    const panelOpacityValue = document.getElementById('panelOpacityValue');
    const root = document.documentElement;

    if (panelOpacitySlider && panelOpacityValue) {
        const applyOpacity = (value) => {
            const alpha = parseFloat(value) / 100;
            root.style.setProperty('--panel-bg-primary-alpha', alpha);
            root.style.setProperty('--panel-bg-secondary-alpha', alpha);
            root.style.setProperty('--panel-bg-tertiary-alpha', alpha); 
            panelOpacityValue.textContent = value;
        };

        panelOpacitySlider.addEventListener('input', (event) => {
            applyOpacity(event.target.value);
        });
        applyOpacity(panelOpacitySlider.value); // Initialize
    }
}

function updateOverviewPanelHeightVar() {
    const overviewPanel = document.getElementById('overviewPanel'); 
    if (overviewPanel) {
        requestAnimationFrame(() => { // Use rAF to get height after layout changes
            const overviewHeight = overviewPanel.offsetHeight;
            document.documentElement.style.setProperty('--overview-panel-height', `${overviewHeight}px`);
        });
    }
}

function updateShowcaseHeight() {
    const mainContainer = document.querySelector('.main-container');
    // const showcaseArea = document.getElementById('backgroundShowcaseArea'); // Not directly manipulating its style
    if (!mainContainer) return;

    const containerWidth = mainContainer.clientWidth; 
    let newHeight;

    if (window.matchMedia("(max-width: 768px)").matches) { 
        newHeight = containerWidth * (2 / 3); // 2/3 for narrow screens
    } else { 
        newHeight = containerWidth * (1 / 3); // 1/3 for wide screens
    }
    newHeight = Math.max(100, Math.min(newHeight, 350)); // Clamp height between 100px and 350px
    
    document.documentElement.style.setProperty('--dynamic-showcase-height', `${newHeight}px`);
}

function setupResponsiveShowcaseHeight() {
    updateShowcaseHeight(); // Initial call
    window.addEventListener('resize', updateShowcaseHeight);

    // Observe .main-container for size changes that are not window resizes
    const mainContainer = document.querySelector('.main-container');
    if (mainContainer) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) { // Though we only observe one element
                updateShowcaseHeight();
            }
        });
        resizeObserver.observe(mainContainer);
    }
}


function setupStickyTabsObserver() { 
    const overviewPanel = document.getElementById('overviewPanel');
    if (!overviewPanel) return;

    updateOverviewPanelHeightVar(); // Initial call

    const observer = new ResizeObserver(entries => {
        for (let entry of entries) {
            updateOverviewPanelHeightVar(); // Update overview panel height variable
            updateShowcaseHeight(); // Also update showcase height as layout might shift
        }
    });
    observer.observe(overviewPanel);
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
    }

    if (typeof updateOverviewPanel === 'function') {
        updateOverviewPanel(window.activeCharacterIndex);
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
    
    if (typeof updateOverviewPanel === 'function') {
        if (window.activeCharacterIndex >= 0 && window.activeCharacterIndex < characters.length) {
            updateOverviewPanel(window.activeCharacterIndex);
        } else if (characters.length === 0) {
            updateOverviewPanel(-1);
        }
    }
}
