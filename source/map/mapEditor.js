export const MapEditor = function() {
    this.availableBrushSizes = new Map([[MapEditor.BRUSH_SIZE_SMALL, 0], [MapEditor.BRUSH_SIZE_MEDIUM, 1], [MapEditor.BRUSH_SIZE_LARGE, 2], [MapEditor.BRUSH_SIZE_EXTRALARGE, 3], [MapEditor.BRUSH_SIZE_COLOSSAL, 4]]);
    this.currentBrushSizeIndex = 0;
    this.selectedBrush = null;
    this.tileSets = {};
    this.tileSetKeys = [];
    this.currentSetIndex = 0;
    this.brushModes = [ MapEditor.MODE_TYPE_TILE, MapEditor.MODE_TYPE_PATTERN, MapEditor.MODE_TYPE_ANIMATION ];
    this.currentBrushModeIndex = 0;
    this.allPageElements = [];
    this.currentPageIndex = 0;
}

MapEditor.MODE_TYPE_TILE = "TILE";
MapEditor.MODE_TYPE_PATTERN = "PATTERN";
MapEditor.MODE_TYPE_ANIMATION = "ANIMATION";
MapEditor.BRUSH_SIZE_SMALL = 0;
MapEditor.BRUSH_SIZE_MEDIUM = 1;
MapEditor.BRUSH_SIZE_LARGE = 2;
MapEditor.BRUSH_SIZE_EXTRALARGE = 3;
MapEditor.BRUSH_SIZE_COLOSSAL = 4;

MapEditor.prototype.getSelectedBrush = function() {
    return this.selectedBrush;
}

/**
 * Sets "this.selectedBrush" to the given parameter.
 * 
 * @param {*} brush Cannot be undefined. Is equal to an element yielded by "getPageElements"
 * @returns {void}
 */
MapEditor.prototype.setSelectedBrush = function(brush) {
    if(brush === undefined) {
        console.warn(`Brush cannot be undefined! Returning...`);
        return;
    }

    this.selectedBrush = brush;
}

/**
 * Takes a number of available slots and returns an array that represents these slots.
 * 
 * @param {int} availableSlots
 * @returns {array} 
 */
MapEditor.prototype.getPageElements = function(availableSlots) {
    const tileSetID = this.getCurrentSetID();
    const brushModeID = this.getBrushModeID();
    const lastElementIndex = this.allPageElements.length - 1;
    const pageElements = []; 

    for(let i = 0; i < availableSlots; i++) {
        const index = availableSlots * this.currentPageIndex + i;

        if(index > lastElementIndex) {
            pageElements.push(null);
            continue;
        }

        const tileAnimationID = this.allPageElements[index];

        pageElements.push([
            tileSetID,
            tileAnimationID,
            brushModeID
        ]);
    }

    return pageElements;
}

/**
 * Sets all page elements to match the brush mode.
 * Possible modes: "frames", "patterns", "animations".
 * 
 * @returns {void}
 */
MapEditor.prototype.reloadPageElements = function() {
    this.allPageElements = [];
    this.currentPageIndex = 0;

    const brushModeID = this.getBrushModeID();
    const tileSet = this.getCurrentSet();
    
    this.selectedBrush = undefined;
    
    if(!tileSet || !brushModeID) {
        console.warn(`Refreshing PageElements failed! Returning...`);
        return;
    }

    const brushTypes = ["frames", "patterns", "animations"]; //Hackity-Hack.
    const brushType = brushTypes[this.currentBrushModeIndex];
    const brushElements = tileSet[brushType];

    for(const key in brushElements) {
        this.allPageElements.push(key);
    }
}

MapEditor.prototype.loadTileSets = function(tileSets) {
    if(!tileSets) {
        console.warn(`TileSets cannot be undefined! Returning...`);
        return;
    }

    this.tileSets = tileSets;
    this.tileSetKeys = Object.keys(tileSets);

    this.reloadPageElements();
}

MapEditor.prototype.getCurrentSet = function() {
    if(!this.tileSetKeys[this.currentSetIndex]) {
        console.warn(`CurrentSetIndex cannot be undefined! Returning null...`);
        return null;
    }

    return this.tileSets[this.tileSetKeys[this.currentSetIndex]];
}

MapEditor.prototype.getCurrentSetID = function() {
    if(!this.tileSetKeys[this.currentSetIndex]) {
        console.warn(`CurrentSetIndex cannot be undefined! Returning null...`);
        return null;
    }

    return this.tileSetKeys[this.currentSetIndex];
}

MapEditor.prototype.getBrushModeID = function() {
    if(!this.brushModes[this.currentBrushModeIndex]) {
        console.warn(`currentBrushModeIndex cannot be undefined! Returning null...`);
        return null;
    }

    return this.brushModes[this.currentBrushModeIndex];
}

MapEditor.prototype.setBrushSize = function(brushSize) {
    if(!this.availableBrushSizes.has(brushSize)) {
        console.warn(`BrushSize ${brushSize} does not exist! Returning...`);
        return;
    }

    this.brushSize = this.availableBrushSizes.get(brushSize);
}

/**
 * Takes the amount of available slots per page and the amount of pages to scroll and updates "this.currentPageIndex".
 * 
 * @param {int} availableButtonSlots The amount of available slots per page.
 * @param {int} value How many pages are scrolled.
 * @returns {void}
 */
MapEditor.prototype.scrollPage = function(availableButtonSlots, value) {
    const maxPagesNeeded = Math.ceil(this.allPageElements.length / availableButtonSlots);
    let nextIndex = this.currentPageIndex + value;

    if(maxPagesNeeded === 0) {
        this.currentPageIndex = 0;
        return;
    }

    if(nextIndex < 0) {
        nextIndex = maxPagesNeeded - 1;
    } else if(nextIndex >= maxPagesNeeded) {
        nextIndex = 0;
    }

    if(nextIndex !== this.currentPageIndex) {
        this.currentPageIndex = nextIndex;
    }
}

/**
 * Takes a value and updates "this.currentBrushModeIndex" accordingly.
 * Also resets "this.currentPageIndex" back to 0.
 * 
 * @param {int} value How many modes are scrolled.
 */
MapEditor.prototype.scrollBrushMode = function(value) {
    this.currentBrushModeIndex += value;

    if(this.currentBrushModeIndex > this.brushModes.length - 1) {
        this.currentBrushModeIndex = 0;
    } else if(this.currentBrushModeIndex < 0) {
        this.currentBrushModeIndex = this.brushModes.length - 1;
    }

    this.currentPageIndex = 0;
}

/**
 * Takes a value and updates "this.currentSetIndex" accordingly.
 * Also resets "this.currentPageIndex" back to 0.
 * 
 * @param {int} value How many sets are scrolled.
 */
MapEditor.prototype.scrollCurrentSet = function(value) {
    this.currentSetIndex += value;

    if(this.currentSetIndex > this.tileSetKeys.length - 1) {
        this.currentSetIndex = 0;
    } else if(this.currentSetIndex < 0) {
        this.currentSetIndex = this.tileSetKeys.length - 1;
    }

    this.currentPageIndex = 0;
}