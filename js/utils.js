// js/utils.js
let uniqueIdCounter = 0;

function generateUniqueId(prefix = 'uid') {
    return `${prefix}_${uniqueIdCounter++}`;
}