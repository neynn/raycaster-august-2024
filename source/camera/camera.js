import { Position3DComponent } from "../../components/position3D.js";
import { GameContext } from "../../gameContext.js";
import { EventEmitter } from "../events/eventEmitter.js";
import { toRadian } from "../helpers.js";
import { Canvas } from "./canvas.js";
import { Raycaster } from "./raycaster.js";

export const Camera = function(screenWidth, screenHeight) {
    this.viewportX = 0;
    this.viewportY = 0;
    this.viewportWidth = screenWidth;
    this.viewportHeight = screenHeight;
    this.viewportX_limit = 0;
    this.viewportY_limit = 0;
    this.mapWidth = 0;
    this.mapHeight = 0;

    this.fps = 0;
    this.smoothedFPS = 60;
    this.smoothingFactor = 0.01;

    this.raycaster = null;
    this.display = new Canvas().useExistingElement(screenWidth, screenHeight, "canvas");

    this.events = new EventEmitter();
    this.events.listen(Camera.EVENT_SCREEN_RESIZE);
    this.events.listen(Camera.EVENT_MAP_RENDER_COMPLETE);

    window.addEventListener("resize", () => this.resizeViewport(window.innerWidth, window.innerHeight));
    this.initializeRaycaster(320 * 1, 180 * 1);
}

Camera.SCALE = 1;
Camera.TILE_WIDTH = 64;
Camera.TILE_HEIGHT = 64;
Camera.EVENT_SCREEN_RESIZE = 0;
Camera.EVENT_MAP_RENDER_COMPLETE = 1;

Camera.prototype.drawSprites = function(gameContext) {
    const { timer, spriteManager } = gameContext;
    const { rootSprites } = spriteManager;
    const realTime = timer.getRealTime();
    const timeStep = timer.getFixedDeltaTime();
    const visibleSprites = [];
    const length = rootSprites.length;
    const viewportLeftEdge = this.viewportX;
    const viewportTopEdge = this.viewportY;
    const viewportRightEdge = viewportLeftEdge + this.getViewportWidth();
    const viewportBottomEdge = viewportTopEdge + this.getViewportHeight();

    for(let i = 0; i < length; i++) {
        const sprite = rootSprites[i];
        const positionData = sprite.getPositionData(this.viewportX, this.viewportY, 0, 0);     
        const { spriteX, spriteY, sourceWidth, sourceHeight } = positionData;
        const inBounds = spriteX < viewportRightEdge && spriteX + sourceWidth > viewportLeftEdge && spriteY < viewportBottomEdge && spriteY + sourceHeight > viewportTopEdge;

        if(inBounds) {
            visibleSprites.push(sprite);
        }
    }

    visibleSprites.sort((a, b) => (a.position.y) - (b.position.y));

    for(let i = 0; i < visibleSprites.length; i++) {
        const sprite = visibleSprites[i];
        sprite.receiveUpdate(realTime, timeStep);
        sprite.draw(this.display.context, this.viewportX, this.viewportY, 0, -2);
    }
}

Camera.prototype.drawTile = function(gameContext, tileX, tileY, tileGraphics) {
    if(!tileGraphics) {
        return;
    }

    const { spriteManager } = gameContext;
    const renderY = tileY * Camera.TILE_HEIGHT - this.viewportY;
    const renderX = tileX * Camera.TILE_WIDTH - this.viewportX;
    const [tileSetID, tileSetAnimationID] = tileGraphics;
    const buffer = spriteManager.getTileBuffer(tileSetID, tileSetAnimationID);

    this.display.context.drawImage(
        buffer.bitmap, 
        0, 0, buffer.width, buffer.height,
        renderX + buffer.offset.x, renderY + buffer.offset.y, Camera.TILE_WIDTH, Camera.TILE_HEIGHT
    );
}

Camera.prototype.drawCollisionLayer = function(gameContext, gameMap, layerID, startX, startY, endX, endY) {
    const collisionTypes = gameContext.getType("collisionTypes");
    const layer = gameMap.layers[layerID];
    const opacity = gameMap.layerOpacity[layerID];

    if(!opacity || !collisionTypes) {
        return;
    }

    this.display.context.globalAlpha = opacity;
    this.display.context.font = "4px Arial";
    this.display.context.textBaseline = "middle";
    this.display.context.textAlign = "center";

    for(let i = startY; i <= endY; i++) {
        const tileRow = layer[i];
        
        if(tileRow === undefined) {
            continue;
        }
        
        for(let j = startX; j <= endX; j++) {
            const tileID = tileRow[j];

            if(tileID === undefined || tileID === null || !collisionTypes[tileID]) {
                continue;
            }

            const renderY = i * Camera.TILE_HEIGHT - this.viewportY + + Camera.TILE_HEIGHT / 2;
            const renderX = j * Camera.TILE_WIDTH - this.viewportX + Camera.TILE_WIDTH / 2;

            this.display.context.fillStyle = collisionTypes[tileID].color;
            this.display.context.fillText(collisionTypes[tileID].text, renderX, renderY);
        }
    }
}

Camera.prototype.drawLayer = function(gameContext, gameMap, layerID, startX, startY, endX, endY) {
    const { mapLoader } = gameContext;
    const neighbors = gameMap.getConnections();
    const layer = gameMap.layers[layerID];
    const opacity = gameMap.layerOpacity[layerID];

    if(!opacity) {
        return;
    }

    this.display.context.globalAlpha = opacity;

    for(let i = startY; i <= endY; i++) {

        if(i < 0 || i >= gameMap.height) {
            for(let n = 0; n < neighbors.length; n++) {
                const neighbor = neighbors[n];

                if(i < neighbor.startY || i >= neighbor.endY) {
                    continue;
                }

                const neighborMap = mapLoader.getLoadedMap(neighbor.id);
                const neighborLayer = neighborMap.layers[layerID];
                const neighborRow = neighborLayer[i - neighbor.startY];

                for(let j = startX; j <= endX; j++) {
                    
                    if(j < neighbor.startX || j >= neighbor.endX) {
                        continue;
                    }

                    const neighborTile = neighborRow[j - neighbor.startX];
                    this.drawTile(gameContext, j, i, neighborTile);
                }
            }

            continue;
        }
        
        for(let j = startX; j <= endX; j++) {
            
            if(j < 0 || j >= gameMap.width) {
                for(let n = 0; n < neighbors.length; n++) {
                    const neighbor = neighbors[n];

                    if(j < neighbor.startX || j >= neighbor.endX || i < neighbor.startY || i >= neighbor.endY) {
                        continue;
                    }

                    const neighborMap = mapLoader.getLoadedMap(neighbor.id);
                    const neighborLayer = neighborMap.layers[layerID];
                    const neighborRow = neighborLayer[i - neighbor.startY];
                    const neighborTile = neighborRow[j - neighbor.startX];
                    
                    this.drawTile(gameContext, j, i, neighborTile);
                }

                continue;
            }

            this.drawTile(gameContext, j, i, layer[i][j]);
        }
    }

    this.display.context.globalAlpha = 1;
}

Camera.prototype.draw2DMapOutlines = function(gameContext) {
    const { mapLoader } = gameContext;
    const gameMap = mapLoader.getActiveMap();
    const lineColor = "#dddddd";

    if (!gameMap) {
        return;
    }

    this.display.context.fillStyle = lineColor;

    for (let i = 0; i <= gameMap.height; i++) {
        const renderY = i * Camera.TILE_HEIGHT * Camera.SCALE - this.viewportY * Camera.SCALE;
        this.display.context.fillRect(0, renderY, this.viewportWidth, 1);
    }

    for (let j = 0; j <= gameMap.width; j++) {
        const renderX = j * Camera.TILE_WIDTH * Camera.SCALE - this.viewportX * Camera.SCALE;
        this.display.context.fillRect(renderX, 0, 1, this.viewportHeight);
    }
}

Camera.prototype.draw2DMap = function(gameContext) {
    const { mapLoader } = gameContext;
    const gameMap = mapLoader.getActiveMap();

    if(!gameMap) {
        return;
    }

    const offsetX = 0;
    const offsetY = 1;
    const startX = Math.floor(this.viewportX / Camera.TILE_WIDTH);
    const startY = Math.floor(this.viewportY / Camera.TILE_HEIGHT);
    const endX = Math.floor((this.viewportX + this.getViewportWidth()) / Camera.TILE_WIDTH) + offsetX;
    const endY = Math.floor((this.viewportY + this.getViewportHeight()) / Camera.TILE_HEIGHT) + offsetY;

    this.display.context.save();
    this.display.context.scale(Camera.SCALE, Camera.SCALE);

    for(const layerID of gameMap.backgroundLayers) {
        this.drawLayer(gameContext, gameMap, layerID, startX, startY, endX, endY);
    }

    this.drawSprites(gameContext, startX, startY, endX, endY);

    for(const layerID of gameMap.foregroundLayers) {
        this.drawLayer(gameContext, gameMap, layerID, startX, startY, endX, endY);
    }

    for(const layerID of gameMap.metaLayers) {
        this.drawCollisionLayer(gameContext, gameMap, layerID, startX, startY, endX, endY);
    }

    this.display.context.restore();
}

Camera.prototype.drawUI = function(gameContext) {
    const { uiManager, timer } = gameContext;
    const { texts, drawableElements } = uiManager;
    const deltaTime = timer.getDeltaTime();

    drawableElements.forEach(element => element.drawDebug(this.display.context, 0, 0, 0, 0));
    drawableElements.forEach(element => element.draw(this.display.context, 0, 0, 0, 0));
    
    texts.forEach(text => text.receiveUpdate(deltaTime));
}

Camera.prototype.calculateFPS = function(passedTime) {
    const fps = 1 / passedTime;
    const smoothedFPS = (fps - this.smoothedFPS) * this.smoothingFactor;

    this.fps = fps;
    this.smoothedFPS += smoothedFPS;
}

Camera.prototype.update = function(gameContext) {
    const { timer } = gameContext; 
    const deltaTime = timer.getDeltaTime();

    this.display.clear();
    this.calculateFPS(deltaTime);
    
    if(GameContext.USE_RAYCAST) {
        this.drawRaycaster(gameContext);
    } else {
        this.draw2DMap(gameContext);
        this.events.emit(Camera.EVENT_MAP_RENDER_COMPLETE, this);
    }

    this.drawUI(gameContext);
}

Camera.prototype.drawRaycaster = function(gameContext) {
    const MINIMAP_SCALE = 1;
    const { mapLoader } = gameContext;
    const gameMap = mapLoader.getActiveMap();
    
    if(!this.raycaster || !gameContext.player || !gameMap) {
        return;
    }

    const playerPosition = gameContext.player.components.getComponent(Position3DComponent);
    const { positionX, positionY, rotation } = playerPosition;
    const roationRadians = toRadian(rotation);

    this.raycaster.copyPosition(playerPosition);
    this.raycaster.raycast(gameContext, gameMap);

    this.display.context.drawImage(this.raycaster.display.canvas, 0, 0, this.display.width, this.display.height);
    this.display.context.fillRect(this.display.centerX - 4, this.display.centerY - 4, 8, 8);

    this.raycaster.minimap.center(positionX, positionY);
    this.raycaster.minimap.draw(gameContext, gameMap.layers["floor"], this.display.context);

    //const playerRay = this.raycaster.checkSingleRayIntersection(positionX, positionY, roationRadians, gameMap.width, gameMap.height, gameMap.tiles);
    this.raycaster.minimap.drawPlayer(null, roationRadians, this.display.context);
}

Camera.prototype.limitViewport = function() {
    if(this.viewportX < 0) {
        this.viewportX = 0;
    }
  
    if(this.viewportY < 0) {
        this.viewportY = 0;
    }
  
    if(this.viewportX >= this.viewportX_limit) {
        this.viewportX = this.viewportX_limit;
    }
  
    if(this.viewportY >= this.viewportY_limit) {
        this.viewportY = this.viewportY_limit;
    }
}

Camera.prototype.shiftViewport = function(deltaX, deltaY) {
    this.viewportX += deltaX;
    this.viewportY += deltaY;
}

Camera.prototype.dragViewportBy = function(param_dragX, param_dragY) {
    this.viewportX += param_dragX / Camera.SCALE;
    this.viewportY += param_dragY / Camera.SCALE;
  
    //this.limitViewport();
}
  
Camera.prototype.snapViewportTo = function(param_snapX, param_snapY) {
    this.viewportX = param_snapX;
    this.viewportY = param_snapY;

    this.limitViewport();
}

Camera.prototype.loadViewport = function(mapWidth, mapHeight) {
    const width = mapWidth * Camera.TILE_WIDTH;
    const height = mapHeight * Camera.TILE_HEIGHT;

    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;

    if(width <= this.getViewportWidth()) {
        this.viewportX_limit = 0;
    } else {
        this.viewportX_limit = width - this.getViewportWidth();
    }

    if(height <= this.getViewportHeight()) {
        this.viewportY_limit = 0;
    } else {
        this.viewportY_limit = height - this.getViewportHeight();  
    }

    this.limitViewport();
}

Camera.prototype.initializeRaycaster = function(resolutionWidth, resolutionHeight) {
    this.raycaster = new Raycaster();
    this.raycaster.resize(resolutionWidth, resolutionHeight);
}

Camera.prototype.clearRaycaster = function() {
    this.raycaster = null;
}

Camera.prototype.resizeViewport = function(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;

    this.loadViewport(this.mapWidth, this.mapHeight);
    this.display.resize(width, height);
    this.events.emit(Camera.EVENT_SCREEN_RESIZE, this.viewportWidth, this.viewportHeight);
}

Camera.prototype.getViewportWidth = function() {
    return this.viewportWidth / Camera.SCALE;
}

Camera.prototype.getViewportHeight = function() {
    return this.viewportHeight / Camera.SCALE;
}

Camera.prototype.follow = function(positionX, positionY, smoothFactor, threshold) {
    const targetX = positionX - this.getViewportWidth() / 2;
    const targetY = positionY - this.getViewportHeight() / 2;

    const distanceX = targetX - this.viewportX;
    const distanceY = targetY - this.viewportY;

    if(Math.abs(distanceX) < threshold && Math.abs(distanceY) < threshold) {
        this.viewportX = targetX;
        this.viewportY = targetY;
        return;
    }

    if(smoothFactor) {
        this.viewportX += (targetX - this.viewportX) * smoothFactor;
        this.viewportY += (targetY - this.viewportY) * smoothFactor;
        return;
    }

    this.viewportX = targetX;
    this.viewportY = targetY;
}
