// js/io_handler.js

function setupSimplifiedExportImportListeners() {
    const exportButton = document.getElementById('exportConfigButton');
    const importFileElement = document.getElementById('importConfigFile');

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            console.log("[IO_HANDLER] Exporting current configuration.");
            const dataToExport = { 
                enemy: JSON.parse(JSON.stringify(enemy)), 
                characters: JSON.parse(JSON.stringify(characters)), 
                version: "1.2.1" // Increment version with changes
            };
            try {
                const jsonString = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `damage_calc_config_${new Date().toISOString().slice(0,10).replace(/-/g,'')}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log("[IO_HANDLER] Configuration exported to file.");
            } catch (error) { 
                console.error("[IO_HANDLER] Error exporting data:", error);
                alert("导出配置时发生错误: " + error.message); 
            }
        });
    }

    if (importFileElement) {
        importFileElement.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) { return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedText = e.target.result;
                    if (!importedText || typeof importedText !== 'string') {
                        throw new Error("文件内容为空或读取失败。");
                    }
                    const importedData = JSON.parse(importedText);
                    
                    if (!importedData || typeof importedData.enemy !== 'object' || !Array.isArray(importedData.characters)) {
                        throw new Error("导入的数据格式无效或缺少必要部分 (enemy, characters)。");
                    }
                    
                    enemy = JSON.parse(JSON.stringify(importedData.enemy));
                    characters = JSON.parse(JSON.stringify(importedData.characters));
                    
                    console.log("[IO_HANDLER] Data parsed. Reassigning IDs.");
                    reassignItemIDs(); 

                    console.log("[IO_HANDLER] Refreshing UI from imported data.");
                    const characterPanelsContainer = document.getElementById('character-panels-container');
                    const characterTabsContainer = document.querySelector('.character-tabs');
                    if (characterPanelsContainer) characterPanelsContainer.innerHTML = ''; else console.error("Panels container missing!");
                    if (characterTabsContainer) characterTabsContainer.innerHTML = ''; else console.error("Tabs container missing!");

                    const enemyDefenseEl = document.getElementById('enemyDefenseGlobal');
                    const enemyHasCoreEl = document.getElementById('enemyHasCoreGlobal');
                    if(enemyDefenseEl) enemyDefenseEl.value = enemy.defense;
                    if(enemyHasCoreEl) enemyHasCoreEl.checked = enemy.hasCore;

                    const numToRender = Math.min(characters.length, NUM_CHARACTERS);
                    for (let i = 0; i < numToRender; i++) {
                        if (!characters[i]) {
                            console.warn(`[IO_HANDLER] Imported character data at index ${i} is missing. Skipping.`);
                            continue;
                        }
                        // Ensure default values for potentially new fields if importing older config
                        characters[i].coreDamageBaseChoice = characters[i].coreDamageBaseChoice || 2;
                        characters[i].coreDamageBaseChoiceTriggered = characters[i].hasOwnProperty('coreDamageBaseChoiceTriggered') ? characters[i].coreDamageBaseChoiceTriggered : true;
                        if (!characters[i].chargeUpBase) characters[i].chargeUpBase = { value: 1, isTriggered: true };
                        if (!characters[i].chargeUpBonuses) characters[i].chargeUpBonuses = [];
                         characters[i].chargeUpBonuses.forEach(b => {
                            if (!b.hasOwnProperty('isSpecialBaseBuff')) b.isSpecialBaseBuff = false;
                        });


                        if (characters[i].skillMultipliers && characters[i].skillMultipliers.length > 0) {
                           if (!characters[i].skillMultipliers.find(sm => sm.id === characters[i].selectedSkillMultiplierId)) {
                                characters[i].selectedSkillMultiplierId = characters[i].skillMultipliers[0].id;
                           }
                        } else characters[i].selectedSkillMultiplierId = '';

                        const panel = createCharacterPanelHTML(i); 
                        if (panel && characterPanelsContainer) characterPanelsContainer.appendChild(panel);
                        
                        const tab = document.createElement('button');
                        tab.classList.add('tab-button'); tab.id = `tab_char${i}`;
                        tab.textContent = characters[i].name; tab.dataset.charIndex = i;
                        tab.addEventListener('click', () => switchTab(i)); 
                        if (characterTabsContainer) characterTabsContainer.appendChild(tab);
                    }
                    
                    activeCharacterIndex = 0; 
                    if (numToRender > 0) {
                        switchTab(activeCharacterIndex);
                    } else {
                        console.warn("[IO_HANDLER] No characters rendered after import.");
                    }
                    
                    recalculateAllCharacterDamages();
                    alert("配置已成功导入！");

                } catch (error) {
                    console.error("[IO_HANDLER] Error importing data:", error);
                    alert("导入配置时发生错误: " + error.message);
                } finally {
                    if (event.target) event.target.value = null; 
                }
            };
            reader.readAsText(file);
        });
    }
}

function reassignItemIDs() {
    console.log("[IO_HANDLER] Reassigning item IDs.");
    uniqueIdCounter = 0; 
    if (!characters || !Array.isArray(characters)) {
        console.error("[IO_HANDLER] 'characters' array is not available for reassignItemIDs.");
        return;
    }
    characters.forEach((charData, charIndex) => {
        if (!charData) {
            console.warn(`[IO_HANDLER] charData at index ${charIndex} is null/undefined during reassignItemIDs.`);
            return;
        }
        const charIdPrefix = `char${charIndex}_`; 
        const reIdArray = (arr, itemPrefix) => {
            if (Array.isArray(arr)) {
                arr.forEach(item => { 
                    if (item && typeof item === 'object') { 
                        item.id = generateUniqueId(charIdPrefix + itemPrefix); 
                    }
                });
            }
        };

        reIdArray(charData.attackUpBonuses, 'atkUp');
        reIdArray(charData.casterEffects, 'casterEff');
        reIdArray(charData.defenseDownBonuses, 'defDown');
        reIdArray(charData.coreDamageUpBonuses, 'coreDmg');
        reIdArray(charData.skillMultipliers, 'skillM');
        reIdArray(charData.specialDamageUpBonuses, 'specDmg');
        reIdArray(charData.chargeUpBonuses, 'chargeUp');
        reIdArray(charData.superiorityUpBonuses, 'supUp');
        reIdArray(charData.damageTakenUpBonuses, 'dmgTaken');
        
        if (charData.skillMultipliers && charData.skillMultipliers.length > 0) {
            const currentSelectedSkill = charData.skillMultipliers.find(sm => sm.id === charData.selectedSkillMultiplierId);
            if (!currentSelectedSkill) { 
                charData.selectedSkillMultiplierId = charData.skillMultipliers[0].id;
            }
        } else {
            charData.selectedSkillMultiplierId = '';
        }
    });
    console.log("[IO_HANDLER] Item IDs reassigned. New uniqueIdCounter:", uniqueIdCounter);
}