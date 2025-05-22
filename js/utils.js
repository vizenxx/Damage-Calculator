// js/utils.js
let uniqueIdCounter = Date.now(); // Initialize with timestamp for better initial uniqueness

function generateUniqueId(prefix = 'uid') {
    uniqueIdCounter++;
    return `${prefix}_${uniqueIdCounter}`;
}