// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed (main.js)");
    try {
        initApplication(); 
        setupSimplifiedExportImportListeners(); // From io_handler.js
        
        if (NUM_CHARACTERS > 0 && characters.length > 0) { 
           console.log("[main.js] Attempting to switch to initial tab 0");
           switchTab(0); // From ui_render.js
        } else if (NUM_CHARACTERS === 0) {
            console.warn("[main.js] NUM_CHARACTERS is 0, no character tabs or panels will be created.");
        } else {
            console.warn("[main.js] Characters array is empty after initApplication. This is unexpected if NUM_CHARACTERS > 0. Cannot switch tab.");
        }
        recalculateAllCharacterDamages(); 
        console.log("Application initialized successfully (main.js).");
    } catch (error) {
        console.error("Error during application initialization (main.js):", error);
        const errorMsg = "页面初始化失败，请检查浏览器控制台获取更多信息。\nInitialization failed.\n\nError: " + error.message + (error.stack ? "\nStack: " + error.stack : "");
        alert(errorMsg);
    }
});

function initApplication() {
    console.log("initApplication started (main.js)");
    const enemyDefenseEl = document.getElementById('enemyDefenseGlobal');
    const enemyHasCoreEl = document.getElementById('enemyHasCoreGlobal');
    if(enemyDefenseEl) enemy.defense = parseFloat(enemyDefenseEl.value) || 500;
    if(enemyHasCoreEl) enemy.hasCore = enemyHasCoreEl.checked;

    const characterPanelsContainer = document.getElementById('character-panels-container');
    const characterTabsContainer = document.querySelector('.character-tabs');

    if (!characterPanelsContainer || !characterTabsContainer) {
        console.error("[main.js] Core HTML containers ('character-panels-container' or '.character-tabs') not found! Cannot proceed with UI setup."); 
        return; 
    }
    console.log("[main.js] Core containers found. Clearing previous content.");
    characterPanelsContainer.innerHTML = ''; 
    characterTabsContainer.innerHTML = '';   

    characters.length = 0; 

    for (let i = 0; i < NUM_CHARACTERS; i++) { 
        console.log(`[main.js] Initializing character ${i}`);
        let charDataInstance;
        try {
            charDataInstance = createDefaultCharacterData(i); // from data_manager.js
            if (!charDataInstance || typeof charDataInstance !== 'object') {
                throw new Error("createDefaultCharacterData returned invalid data");
            }
            characters.push(charDataInstance); 
            console.log(`[main.js] Character ${i} data created and pushed. Current characters length: ${characters.length}`);
        } catch(e) {
            console.error(`[main.js] Error creating default data for char ${i}:`, e);
            alert(`创建角色 ${i+1} 数据时出错: ${e.message}`);
            continue;
        }

        const currentCharacter = characters[i]; 
        if (!currentCharacter) {
            console.error(`[main.js] Character data for index ${i} is missing in the array after push. Skipping panel creation.`);
            continue;
        }

        if (currentCharacter.skillMultipliers && currentCharacter.skillMultipliers.length > 0) {
            currentCharacter.selectedSkillMultiplierId = currentCharacter.skillMultipliers[0].id;
        } else {
            currentCharacter.selectedSkillMultiplierId = '';
        }
        
        let panel;
        try {
            console.log(`[main.js] Attempting to create panel HTML for character ${i}`);
            panel = createCharacterPanelHTML(i); // from ui_render.js
        } catch (e) {
            console.error(`[main.js] CRITICAL ERROR in createCharacterPanelHTML for char ${i}:`, e);
            alert(`创建角色 ${i+1} 面板时发生严重错误: ${e.message}.`);
            continue; 
        }

        if (panel instanceof HTMLElement) {
            characterPanelsContainer.appendChild(panel);
            console.log(`[main.js] Panel for character ${i} appended.`);
        } else {
            console.error(`[main.js] Failed to create panel HTML for character ${i}. Panel was not an HTMLElement or was null:`, panel); 
            continue; 
        }

        const tab = document.createElement('button');
        tab.classList.add('tab-button');
        tab.id = `tab_char${i}`;
        tab.textContent = currentCharacter.name; 
        tab.dataset.charIndex = i;
        tab.addEventListener('click', () => switchTab(i)); 
        characterTabsContainer.appendChild(tab);
        console.log(`[main.js] Tab for character ${i} created and appended.`);
    }
    
    document.body.addEventListener('input', handleGlobalInput);
    document.body.addEventListener('change', handleGlobalInput);
    console.log("[main.js] Global event listeners attached.");
    console.log("initApplication finished (main.js).");
}

function handleGlobalInput(event) {
    const target = event.target;
    const charIndexStr = target.closest('.character-panel')?.dataset.charIndex;
    let dataUpdated = false;
    if (target.id === 'enemyDefenseGlobal') {
        enemy.defense = parseFloat(target.value) || 0; dataUpdated = true;
    } else if (target.id === 'enemyHasCoreGlobal') {
        enemy.hasCore = target.checked; dataUpdated = true;
    } else if (charIndexStr !== undefined) {
        const charIndex = parseInt(charIndexStr);
        if (charIndex >= 0 && charIndex < characters.length && characters[charIndex]) { 
            dataUpdated = updateCharacterDataFromInput(charIndex, target); 
        } else {
            console.warn(`[main.js] handleGlobalInput: Invalid charIndex ${charIndexStr}`);
        }
    }
    if (dataUpdated) recalculateAllCharacterDamages();
}

function recalculateAllCharacterDamages() {
    console.log("[main.js] recalculateAllCharacterDamages called.");
    if (!characters || characters.length === 0) {
        console.log("[main.js] No characters to calculate for.");
        return;
    }
    characters.forEach((charData, charIndex) => {
        if (!charData) {
             console.warn(`[main.js] recalculateAllCharacterDamages: charData undefined at index ${charIndex}`);
             const resultElement = document.getElementById(`finalDamageResult_char${charIndex}`);
             if (resultElement) resultElement.textContent = `错误`;
             updateIntermediateResultsUI(charIndex, { error: "Character data missing" }); 
             updateFormulaTraceUI(charIndex, [{expr: "Error: Character data missing"}]); 
             return; 
        }
        
        const formulaTrace = []; 
        const results = calculateCharacterDamage(charIndex, formulaTrace); 
        
        if (results && typeof results === 'object' && results.hasOwnProperty('finalDamage') && results.hasOwnProperty('intermediate')) {
            if (characters[charIndex]) { 
                characters[charIndex].outputDamage = results.finalDamage; 
                characters[charIndex].intermediateResults = results.intermediate; 
            }

            const resultElement = document.getElementById(`finalDamageResult_char${charIndex}`);
            if (resultElement) resultElement.textContent = `伤害: ${results.finalDamage.toFixed(0)}`;
            else console.warn(`[main.js] Result element for char ${charIndex} not found during recalc.`);
            
            updateIntermediateResultsUI(charIndex, results.intermediate); 
            updateFormulaTraceUI(charIndex, formulaTrace); 
        } else {
            console.error(`[main.js] recalculateAllCharacterDamages: calculateCharacterDamage for char ${charIndex} did not return a valid results object. Received:`, results);
            const resultElement = document.getElementById(`finalDamageResult_char${charIndex}`);
            if (resultElement) resultElement.textContent = `计算错误`;
            updateIntermediateResultsUI(charIndex, { error: "Invalid calculation result" });
            updateFormulaTraceUI(charIndex, [{expr: "Error: Invalid calculation result"}]);
        }
    });
    console.log("[main.js] recalculateAllCharacterDamages finished.");
}