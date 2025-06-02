import { Raycaster } from "../camera/raycaster.js";
import { Vec2 } from "../math/vec2.js";
import { Tile } from "../tile/tile.js";

export const GameMap = function(id, config) {
    const { music, width, height, layerOpacity, layers, tiles, connections, entities, flags, backgroundLayers, foregroundLayers, metaLayers, doors } = config;

    this.id = id;
    this.music = null;
    this.width = 0;
    this.height = 0;
    this.layerOpacity = {};
    this.backgroundLayers = [];
    this.foregroundLayers = [];
    this.metaLayers = [];
    this.layers = {};
    this.tiles = [];
    this.connections = [];
    this.entities = [];
    this.flags = {};
    this.doors = [];
    this.config = config;

    if(music) {
        this.music = music;
    }

    if(width) {
        this.width = width;
    }

    if(height) {
        this.height = height;
    }

    if(layerOpacity) {
        this.layerOpacity = layerOpacity;
    }

    if(layers) {
        this.layers = layers;
    }
    
    if(tiles) {
        this.tiles = tiles;
    }

    if(connections) {
        this.connections = connections;
    }

    if(entities) {
        this.entities = entities;
    }

    if(flags) {
        this.flags = flags;
    }

    if(backgroundLayers) {
        this.backgroundLayers = backgroundLayers;
    }

    if(foregroundLayers) {
        this.foregroundLayers = foregroundLayers;
    }

    if(metaLayers) {
        this.metaLayers = metaLayers;
    }

    if(doors) {
        this.doors = doors;
    }
}

GameMap.prototype.generateEmptyLayer = function(layerID, fillID) {
    this.layers[layerID] = [];

    for(let i = 0; i < this.height; i++) {
        this.layers[layerID][i] = [];

        for(let j = 0; j < this.width; j++) {
            this.layers[layerID][i][j] = fillID;
        }
    }
}

GameMap.prototype.resizeLayer = function(layerID, width, height, fill) {
    if(!this.layers[layerID]) {
        return;
    }

    const layer = this.layers[layerID];

    if(height < this.height) {
        layer.length = height;
    }

    for(let i = 0; i < height; i++) {
        const row = layer[i];

        if(width < this.width) {
            row.length = width;
        }
    }

    for(let i = 0; i < height; i++) {
        if(layer[i] === undefined) {
            layer[i] = [];
        }

        const row = layer[i];

        for(let j = 0; j < width; j++) {
            if(row[j] === undefined) {
                row[j] = fill;
            }
        }   
    }
}

GameMap.prototype.placeTile = function(graphics, layerID, tileX, tileY) {
    if(!this.layers[layerID]) {
        console.warn(`Layer ${layerID} does not exist! Returning...`);
        return;
    }

    const layer = this.layers[layerID];
    
    if(layer[tileY] === undefined) {
        console.warn(`Row ${tileY} of layer ${layerID} does not exist! Returning...`);
        return;
    }

    const row = layer[tileY];

    if(row[tileX] === undefined) {
        console.warn(`Tile ${tileX} of row ${tileY} of layer ${layerID} does not exist! Returning...`);
        return;
    }

    row[tileX] = graphics;
}

GameMap.prototype.getConnections = function() {
    return this.connections;
}

GameMap.prototype.outOfBounds = function(tileX, tileY) {
    return tileX < 0 || tileX >= this.width || tileY < 0 || tileY >= this.width;
}

GameMap.prototype.getLayerTile = function(layerID, tileX, tileY) {
    if(!this.layers[layerID]) {
        console.warn(`Layer ${layerID} does not exist! Returning null...`);
        return null;
    }

    if(!this.layers[layerID][tileY]) {
        console.warn(`Row ${tileY} of layer ${layerID} does not exist! Returning null...`);
        return null;
    }

    return this.layers[layerID][tileY][tileX];
}

GameMap.prototype.getTile = function(tileX, tileY) {
    if(!this.tiles[tileY]) {
        console.warn(`Row ${tileY} does not exist! Returning null...`);
        return null;
    }

    return this.tiles[tileY][tileX];
}

GameMap.prototype.removePointers = function(tileX, tileY, rangeX, rangeY, pointer) {
    for(let i = 0; i < rangeY; i++) {
        for(let j = 0; j < rangeX; j++) {
            const locationX = tileX + j;
            const locationY = tileY + i;
            const tile = this.getTile(locationX, locationY);
            
            if(!tile) {
                console.warn(`Tile [${locationY}][${locationX}] does not exist! Continuing...`);
                continue;
            }

            tile.removeEntity(pointer);
        }
    }
}

GameMap.prototype.setPointers = function(tileX, tileY, rangeX, rangeY, pointer) {
    for(let i = 0; i < rangeY; i++) {
        for(let j = 0; j < rangeX; j++) {
            const locationX = tileX + j;
            const locationY = tileY + i;
            const tile = this.getTile(locationX, locationY);
            
            if(!tile) {
                console.warn(`Tile [${locationY}][${locationX}] does not exist! Continuing...`);
                continue;
            }

            tile.addEntity(pointer);
        }
    }
}

GameMap.prototype.loadTiles = function() {
    if(this.tiles.length !== 0) {
        console.warn(`Tiles for map ${this.id} are already loaded!`);
        return;
    }
    
    for(let i = 0; i < this.height; i++) {
        this.tiles[i] = [];
        for(let j = 0; j < this.width; j++) {
            const tile = new Tile();
            const config = {};

            const height = this.getLayerTile("height", j, i);
            const collision = this.getLayerTile("collision", j, i);
            const floor = this.getLayerTile("bottom", j, i);
            const ceiling = this.getLayerTile("top", j, i);
            const face = this.getLayerTile("floor", j, i);

            tile.setPosition(new Vec2(j, i));
            tile.setConfig(config);

            tile.flags = {
                "IS_VISIBLE": false,
                "IS_DOOR": false,
                "IS_TRANSPARENT": false,
                "IS_FLOOR_OCCLUDED": false,
                "IS_CEILING_OCCLUDED": false,
            }

            tile.height = height;
            tile.collision = collision;
            tile.floor = floor;
            tile.ceiling = ceiling;
            tile.faces = [];

            tile.faces[Raycaster.WALL_FACE_NORTH] = face;
            tile.faces[Raycaster.WALL_FACE_SOUTH] = face;
            tile.faces[Raycaster.WALL_FACE_EAST] = face;
            tile.faces[Raycaster.WALL_FACE_WEST] = face;
            tile.faces[Raycaster.WALL_FACE_TOP] = ["backrooms", "ceiling"];
            tile.faces[Raycaster.WALL_FACE_BOTTOM] = ["backrooms", "floor"];

            if(face) {
                tile.flags["IS_VISIBLE"] = true;
                tile.flags["IS_FLOOR_OCCLUDED"] = true;

                if(height === 1) {
                    tile.flags["IS_CEILING_OCCLUDED"] = true;
                }
            }

            this.tiles[i][j] = tile;
        }
    }

    for(const door of this.doors) {
        const { id, tileX, tileY } = door;
        const tile = this.getTile(tileX, tileY);

        if(!tile) {
            console.warn(`Door ${id} cannot be placed on an undefined tile! Continuing...`);
            continue;
        }

        if(!tile.flags["IS_VISIBLE"]) {
            console.warn(`Door ${id} cannot be placed on a non-wall! Continuing...`);
            continue;
        }

        tile.flags["IS_DOOR"] = true;
        tile.flags["IS_FLOOR_OCCLUDED"] = false;
        tile.flags["IS_CEILING_OCCLUDED"] = false;
        tile.door = door;

        //also set faces of adjacent tiles if door. :P
    }
}