import { ResourceLoader } from "../resourceLoader.js";
import { GameMap } from "./gameMap.js";

export const MapLoader = function() {
    this.config = {};
    this.mapTypes = null;
    this.mapCache = {};
    this.loadedMaps = new Map();
    this.cachedMaps = new Map();
    this.activeMapID = null;
}

MapLoader.CONNECTION_TYPE_NORTH = "north";
MapLoader.CONNECTION_TYPE_EAST = "east";
MapLoader.CONNECTION_TYPE_SOUTH = "south";
MapLoader.CONNECTION_TYPE_WEST = "west";

MapLoader.prototype.loadMapTypes = function(mapTypes) {
    if(!mapTypes) {
        console.warn(`MapTypes cannot be undefined! Returning...`);
        return;
    }

    this.mapTypes = mapTypes;
}

MapLoader.prototype.loadConfig = function(config) {
    if(!config) {
        console.warn(`Config cannot be undefined! Returning...`);
        return;
    }

    this.config = config;
}

MapLoader.prototype.setActiveMap = function(mapID) {
    if(!this.loadedMaps.has(mapID)) {
        console.warn(`Map ${mapID} is not loaded! Returning...`);
        return;
    }

    this.activeMapID = mapID;
}

MapLoader.prototype.getActiveMap = function() {
    if(!this.loadedMaps.has(this.activeMapID)) {
        //console.warn(`Map ${this.activeMapID} is not loaded! Returning...`);
        return null;
    }

    return this.loadedMaps.get(this.activeMapID);
}

MapLoader.prototype.getActiveMapID = function() {
    return this.activeMapID;
}

MapLoader.prototype.clearActiveMap = function() {
    this.activeMapID = null;
}

MapLoader.prototype.loadMap = async function(mapID) {
    if(this.cachedMaps.has(mapID)) {
        const map = this.cachedMaps.get(mapID);

        this.loadedMaps.set(mapID, map);
        await this.loadConnectedMaps(map.connections);
        this.loadMapConnections(mapID);
        return;
    }

    if(!this.mapTypes[mapID]) {
        console.warn(`Map ${mapID} does not exist! Returning...`);
        return;
    }

    try {
        const mapData = this.mapTypes[mapID];
        const mapPath = `${mapData.directory}/${mapData.source}`;
        const mapFile = await ResourceLoader.loadJSON(mapPath);
        const gameMap = new GameMap(mapID, mapFile);

        this.loadedMaps.set(mapID, gameMap);
        this.cachedMaps.set(mapID, gameMap);

        await this.loadConnectedMaps(mapFile.connections);
        this.loadMapConnections(mapID);
    } catch (error) {
        console.error(error, `Error fetching map file! Returning...`);
        return;
    }
}

MapLoader.prototype.loadConnectedMaps = async function(connections) {
    for(const key in connections) {
        const connection = connections[key];

        if(!connection) {
            continue;
        }

        if(!this.mapTypes[connection.id]) {
            console.warn(`Map ${connection.id} does not exist! Returning...`);
            continue;
        }

        if(this.cachedMaps.has(connection.id)) {
            const map = this.cachedMaps.get(connection.id);
            this.loadedMaps.set(connection.id, map);
            continue;
        }

        try {
            const connectedMapData = this.mapTypes[connection.id];
            const connectedMapPath = `${connectedMapData.directory}/${connectedMapData.source}`;
            const connectedMapFile = await ResourceLoader.loadJSON(connectedMapPath);
            const gameMap = new GameMap(connection.id, connectedMapFile);

            this.loadedMaps.set(connection.id, gameMap);
            this.cachedMaps.set(connection.id, gameMap);

        } catch (error) {
            console.error(error, `Error fetching map file! Returning...`);
            return;
        }
    }
}

MapLoader.prototype.loadMapConnections = function(mapID) {
    if(!this.loadedMaps.has(mapID)) {
        console.warn(`Map ${mapID} is not loaded! Returning...`);
        return;
    }

    const connections = [];
    const gameMap = this.getLoadedMap(mapID);

    for(const connection of gameMap.connections) {
        if(!connection) {
            continue;
        }

        switch(connection.type) {
            case MapLoader.CONNECTION_TYPE_NORTH: {
                const connectedMap = this.getLoadedMap(connection.id);
                connection.startX = connection.scroll;
                connection.startY = -connectedMap.height;
                connection.endX = connectedMap.width + connection.scroll;
                connection.endY = 0;
                connection.attachX = connection.scroll;
                connection.attachY = 0;
                connection.height = connectedMap.height;
                connection.width = connectedMap.width;
                connections.push(connection);
                break;
            }
            case MapLoader.CONNECTION_TYPE_SOUTH: {
                const connectedMap = this.getLoadedMap(connection.id);
                connection.startX = connection.scroll;
                connection.startY = gameMap.height;
                connection.endX = connectedMap.width + connection.scroll;
                connection.endY = gameMap.height + connectedMap.height;
                connection.attachX = connection.scroll;
                connection.attachY = gameMap.height;
                connection.height = connectedMap.height;
                connection.width = connectedMap.width;
                connections.push(connection);
                break;
            }
            case MapLoader.CONNECTION_TYPE_EAST: {
                const connectedMap = this.getLoadedMap(connection.id);
                connection.startX = gameMap.width;
                connection.startY = connection.scroll;
                connection.endX = gameMap.width + connectedMap.width;
                connection.endY = connection.scroll + connectedMap.height;
                connection.attachX = gameMap.width;
                connection.attachY = connection.scroll;
                connection.height = connectedMap.height;
                connection.width = connectedMap.width;
                connections.push(connection);
                break;
            }
            case MapLoader.CONNECTION_TYPE_WEST: {
                const connectedMap = this.getLoadedMap(connection.id);
                connection.startX = -connectedMap.width;
                connection.startY = connection.scroll;
                connection.endX = 0;
                connection.endY = connectedMap.height + connection.scroll;
                connection.attachX = 0;
                connection.attachY = connection.scroll;
                connection.height = connectedMap.height;
                connection.width = connectedMap.width;
                connections.push(connection);
                break;
            }
        }
    }

    gameMap.connections = connections;
}

MapLoader.prototype.unloadMap = function(mapID) {
    if(!this.loadedMaps.has(mapID)) {
        console.warn(`Map ${mapID} is not loaded! Returning...`);
        return;
    }

    if(this.activeMapID === mapID) {
        this.activeMapID = null;
    }

    this.loadedMaps.delete(mapID);
}

MapLoader.prototype.getLoadedMap = function(mapID) {
    if(!this.loadedMaps.has(mapID)) {
        console.warn(`Map ${mapID} is not loaded! Returning...`);
        return null;
    }

    return this.loadedMaps.get(mapID);
}

MapLoader.prototype.getCachedMap = function(mapID) {
    if(!this.cachedMaps.has(mapID)) {
        console.warn(`Map ${mapID} is not cached! Returning...`);
        return null;
    }

    return this.cachedMaps.get(mapID);
}

MapLoader.prototype.cacheMap = function(map) {
    if(!map) {
        console.warn(`Map cannot be undefined! Returning...`);
        return; 
    }

    if(this.cachedMaps.has(map.id)) {
        console.warn(`Map ${map.id} is already cached! Returning...`);
        return;
    }

    this.cachedMaps.set(map.id, map);
}

MapLoader.prototype.uncacheMap = function(mapID) {
    if(!this.cachedMaps.has(mapID)) {
        console.warn(`Map ${mapID} is not cached! Returning...`);
        return;
    }

    this.cachedMaps.delete(mapID);
}

MapLoader.prototype.clearCache = function() {
    this.cachedMaps.clear();
}

MapLoader.prototype.clearLoadedMaps = function() {
    this.loadedMaps.clear();
}

MapLoader.prototype.hasLoadedMap = function(mapID) {
    return this.loadedMaps.has(mapID);
}

MapLoader.prototype.hasCachedMap = function(mapID) {
    return this.cachedMaps.has(mapID);
}

/**
 * Creates an empty map based on the mapSetup of "this.config".
 * 
 * @param {string} mapID 
 * @returns {void}
 */
MapLoader.prototype.createEmptyMap = function(mapID) {
    if(!this.config.mapSetup) {
        console.warn(`MapLoader: config.mapSetup is undefined! Returning...`);
        return;
    }

    const { layers, layerOpacity, backgroundLayers, foregroundLayers, metaLayers, width, height } = this.config.mapSetup;
    const gameMap = new GameMap(mapID, {});

    gameMap.width = width;
    gameMap.height = height;

    for(const layerID in layers) {
        const layerConfig = layers[layerID];
        const { id, fill } = layerConfig;
        gameMap.generateEmptyLayer(id, fill);
    }

    gameMap.backgroundLayers = backgroundLayers;
    gameMap.foregroundLayers = foregroundLayers;
    gameMap.metaLayers = metaLayers;
    gameMap.layerOpacity = layerOpacity;

    return gameMap;
}

MapLoader.prototype.saveMap = function(gameMapID) {
    const gameMap = this.getCachedMap(gameMapID);

    if(!gameMap) {
        console.warn(`No GameMap given! Returning...`);
        return `{ "ERROR": "NO_MAP_CACHED! USE CREATE!" }`;
    }

    const stringify2DArray = array => {
        if(!array) {
            return null;
        }

        const rows = array.map(row => JSON.stringify(row));
        return `[
            ${rows.join(`,
            `)}
        ]`;
    }

    const formattedEntities = gameMap.entities.map(data => 
        `{ "type": "${data.type}", "tileX": ${data.tileX}, "tileY": ${data.tileY} }`
    ).join(',\n        ');

    const formattedConnections = gameMap.connections.map(data => 
        `{ "type": "${data.type}", "id": "${data.id}", "scroll": ${data.scroll} }`
    ).join(',\n        ');

    const formattedOpacity = Object.keys(gameMap.layerOpacity).map(key => 
        `"${key}": 1`
    ).join(', ');

    const formattedBackground = gameMap.backgroundLayers.map(data =>
        `"${data}"`
    ).join(', ');

    const formattedForeground = gameMap.foregroundLayers.map(data =>
        `"${data}"`
    ).join(', ');

    const formattedMeta = gameMap.metaLayers.map(data =>
        `"${data}"`
    ).join(', ');

    const formattedLayers = Object.keys(gameMap.layers).map(key =>
        `"${key}": ${stringify2DArray(gameMap.layers[key])}`
    ).join(',\n        ');

    const downloadableString = 
`{
    "music": ${gameMap.music},
    "width": ${gameMap.width},
    "height": ${gameMap.height},
    "layerOpacity": { ${formattedOpacity} },
    "backgroundLayers": [ ${formattedBackground} ],
    "foregroundLayers": [ ${formattedForeground} ],
    "metaLayers": [ ${formattedMeta} ],
    "layers": {
        ${formattedLayers}
    },
    "connections": [
        ${formattedConnections}    
    ],
    "entities" : [
        ${formattedEntities}
    ],
    "flags" : {
        
    }
}`;

    return downloadableString;
}

/**
 * Resizes a map and updates the position of its neighbors.
 * 
 * @param {string} mapID 
 * @param {int} width 
 * @param {int} height 
 * @returns {void}
 */
MapLoader.prototype.resizeMap = function(mapID, width, height) {
    if(!this.cachedMaps.has(mapID)) {
        return;
    }

    const cachedMap = this.cachedMaps.get(mapID);

    for(const layerID in cachedMap.layers) {
        if(!this.config.mapSetup.layers[layerID]) {
            cachedMap.resizeLayer(layerID, width, height, null);
            continue;
        }

        const { fill } = this.config.mapSetup.layers[layerID];

        cachedMap.resizeLayer(layerID, width, height, fill);
    }

    cachedMap.width = width;
    cachedMap.height = height;

    this.loadMapConnections(mapID);
}