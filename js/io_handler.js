// js/io_handler.js

function setupSimplifiedExportImportListeners() {
    const exportButton = document.getElementById('exportConfigButton');
    const importFileElement = document.getElementById('importConfigFile');

    if (exportButton) {
        exportButton.addEventListener('click', () => {
            if (!characters || characters.length === 0) {
                alert("没有角色数据可导出。");
                return;
            }
            const dataToExport = { 
                enemy: JSON.parse(JSON.stringify(enemy)), 
                characters: JSON.parse(JSON.stringify(characters)), 
                version: "1.4.0" // Incremental version for attack count, skill mult up, special damage type
            };
            try {
                const jsonString = JSON.stringify(dataToExport, null, 2);
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const timestamp = new Date().toISOString().slice(0, 19).replace(/-/g,'').replace(/:/g,'').replace('T','_');
                a.download = `damage_calc_config_${timestamp}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert("配置已导出！");
            } catch (error) { 
                console.error("[IO_HANDLER] Error exporting data:", error);
                alert("导出配置时发生错误: " + error.message); 
            }
        });
    }

    if (importFileElement) {
        importFileElement.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return; 
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedText = e.target.result;
                    if (!importedText || typeof importedText !== 'string') {
                        throw new Error("文件内容为空或读取失败。");
                    }
                    const importedData = JSON.parse(importedText);
                    
                    if (!importedData || typeof importedData.enemy !== 'object' || !Array.isArray(importedData.characters)) {
                        throw new Error("导入的数据格式无效。");
                    }
                    
                    enemy = JSON.parse(JSON.stringify(importedData.enemy));
                    let tempImportedChars = JSON.parse(JSON.stringify(importedData.characters));
                    characters = []; 

                    const enemyDefenseEl = document.getElementById('enemyDefenseGlobal');
                    const enemyHasCoreEl = document.getElementById('enemyHasCoreGlobal');
                    if(enemyDefenseEl && enemy.defense !== undefined) enemyDefenseEl.value = enemy.defense;
                    if(enemyHasCoreEl && enemy.hasCore !== undefined) enemyHasCoreEl.checked = enemy.hasCore;

                    const characterPanelsContainer = document.getElementById('character-panels-container');
                    const characterTabsContainer = document.querySelector('.character-tabs');
                    if (characterPanelsContainer) characterPanelsContainer.innerHTML = '';
                    if (characterTabsContainer) characterTabsContainer.innerHTML = '';

                    const numToImport = Math.min(tempImportedChars.length, NUM_CHARACTERS);
                    
                    for (let i = 0; i < numToImport; i++) {
                        let charDataToImport = tempImportedChars[i];
                        let defaultChar = createDefaultCharacterData(i); // This now includes new fields with defaults
                        
                        // Deep merge for nested objects, ensure new top-level fields are present
                        charDataToImport = { ...defaultChar, ...charDataToImport };
                        charDataToImport.baseStats = { ...defaultChar.baseStats, ...charDataToImport.baseStats };
                        charDataToImport.critDamageUp = { ...defaultChar.critDamageUp, ...charDataToImport.critDamageUp };
                        charDataToImport.distanceUp = { ...defaultChar.distanceUp, ...charDataToImport.distanceUp };
                        charDataToImport.burstUp = { ...defaultChar.burstUp, ...charDataToImport.burstUp };
                        charDataToImport.chargeUpBase = { ...defaultChar.chargeUpBase, ...charDataToImport.chargeUpBase };
                        charDataToImport.superiorityUp = { ...defaultChar.superiorityUp, ...charDataToImport.superiorityUp };
                        
                        // Ensure all bonus arrays exist and items within specialDamageUpBonuses have type/customType
                        const bonusArrayKeys = [
                            'attackUpBonuses', 'casterEffects', 'defenseDownBonuses', 'coreDamageUpBonuses', 
                            'specialDamageUpBonuses', 'chargeUpBonuses', 'superiorityUpBonuses', 
                            'damageTakenUpBonuses', 'critDamageUpBonuses', 'skillMultipliers',
                            'skillMultiplierUpBonuses' // New array
                        ];
                        bonusArrayKeys.forEach(key => {
                            charDataToImport[key] = Array.isArray(charDataToImport[key]) ? charDataToImport[key] : defaultChar[key];
                            if (key === 'specialDamageUpBonuses' && Array.isArray(charDataToImport[key])) {
                                charDataToImport[key].forEach(item => {
                                    item.type = item.type || '攻击伤害UP'; // Default if missing
                                    item.customType = item.customType || '';
                                });
                            }
                        });
                        
                        if (!charDataToImport.skillMultipliers || charDataToImport.skillMultipliers.length === 0) {
                            const newSkillId = generateUniqueId(`char${i}_skillImp`);
                            charDataToImport.skillMultipliers = [{ id: newSkillId, value: 100, isTriggered: true }];
                            charDataToImport.selectedSkillMultiplierId = newSkillId;
                        } else {
                            let foundSelected = charDataToImport.skillMultipliers.some(sm => sm.id === charDataToImport.selectedSkillMultiplierId);
                            if (!foundSelected) {
                                charDataToImport.selectedSkillMultiplierId = charDataToImport.skillMultipliers[0].id;
                            }
                            charDataToImport.skillMultipliers.forEach(sm => {
                                sm.isTriggered = (sm.id === charDataToImport.selectedSkillMultiplierId);
                            });
                        }
                        characters.push(charDataToImport);
                    }

                    reassignItemIDs(); 

                    characters.forEach((charData, i) => {
                        const panel = createCharacterPanelHTML(i); 
                        if (panel && characterPanelsContainer) characterPanelsContainer.appendChild(panel);
                        
                        const tabButton = document.createElement('button');
                        tabButton.className = 'tab-button'; 
                        tabButton.id = `tab_char_btn_${i}`;
                        tabButton.dataset.charIndex = i;
                        tabButton.setAttribute('role', 'tab');
                        tabButton.setAttribute('aria-controls', `character-panel-${i}`);
                        
                        const nameSpan = document.createElement('span');
                        nameSpan.className = 'tab-char-name-display';
                        nameSpan.textContent = charData.name || `角色 ${i+1}`;
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
                            input.focus(); input.select();
                            const saveName = () => {
                                if (!tabButton.classList.contains('editing-name')) return;
                                const newName = input.value.trim() || `角色 ${i + 1}`;
                                characters[i].name = newName;
                                nameSpan.textContent = newName;
                                if (tabButton.contains(input)) { tabButton.removeChild(input); }
                                nameSpan.style.display = 'inline-block';
                                tabButton.classList.remove('editing-name');
                                if (i === activeCharacterIndex) { updateOverviewPanel(activeCharacterIndex); }
                            };
                            input.addEventListener('blur', saveName);
                            input.addEventListener('keydown', (keyEvent) => {
                                if (keyEvent.key === 'Enter') { keyEvent.preventDefault(); saveName(); }
                                else if (keyEvent.key === 'Escape') { 
                                    keyEvent.preventDefault(); 
                                    if (tabButton.contains(input)) { tabButton.removeChild(input); }
                                    nameSpan.style.display = 'inline-block';
                                    tabButton.classList.remove('editing-name');
                                }
                            });
                        });
                        if (characterTabsContainer) characterTabsContainer.appendChild(tabButton);
                    });
                    
                    activeCharacterIndex = 0; 
                    if (characters.length > 0) {
                        switchTab(activeCharacterIndex);
                    } else {
                        if(typeof updateOverviewPanel === 'function') updateOverviewPanel(-1);
                        if(typeof recalculateAllCharacterDamages === 'function') recalculateAllCharacterDamages();
                    }
                    
                    alert("配置已成功导入！");

                } catch (error) {
                    console.error("[IO_HANDLER] Error importing data:", error);
                    alert("导入配置时发生错误: " + error.message);
                } finally {
                    if (event.target) event.target.value = null;
                }
            };
            reader.onerror = () => {
                alert("读取导入文件时发生错误。");
                if (event.target) event.target.value = null;
            };
            reader.readAsText(file);
        });
    }
}

function reassignItemIDs() {
    if (!characters || !Array.isArray(characters)) return;

    characters.forEach((charData, charIndex) => {
        if (!charData) return;
        const charIdPrefix = `char${charIndex}_`; 
        
        const reIdArray = (arr, itemPrefix) => {
            if (Array.isArray(arr)) {
                arr.forEach(item => { 
                    if (item && typeof item === 'object' && item.hasOwnProperty('id')) {
                        item.id = generateUniqueId(charIdPrefix + itemPrefix); 
                    }
                });
            }
        };

        const keysToReId = [
            'attackUpBonuses', 'casterEffects', 'defenseDownBonuses', 'coreDamageUpBonuses', 
            'specialDamageUpBonuses', 'chargeUpBonuses', 'superiorityUpBonuses', 
            'damageTakenUpBonuses', 'critDamageUpBonuses', 'skillMultipliers',
            'skillMultiplierUpBonuses' // New array
        ];
        
        keysToReId.forEach(key => {
            const prefix = key.replace('Bonuses', '').replace('Effects','Eff').replace('Multipliers','SkillM');
            reIdArray(charData[key], prefix);
        });
        
        if (charData.skillMultipliers && charData.skillMultipliers.length > 0) {
            const currentSelectionIsValid = charData.skillMultipliers.some(skill => skill.id === charData.selectedSkillMultiplierId);
            if (!currentSelectionIsValid) {
                charData.selectedSkillMultiplierId = charData.skillMultipliers[0].id;
            }
            charData.skillMultipliers.forEach(sm => sm.isTriggered = (sm.id === charData.selectedSkillMultiplierId));
        } else if (charData.skillMultipliers) { // Ensure it's not undefined
            charData.selectedSkillMultiplierId = '';
        }
    });
}