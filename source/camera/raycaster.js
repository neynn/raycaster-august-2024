import { ImageBuffer } from "../graphics/imageBuffer.js";
import { normalizeAngle, normalizeValue, toAngle, toRadian } from "../helpers.js";
import { ResourceLoader } from "../resourceLoader.js";
import { Camera } from "./camera.js";
import { Canvas } from "./canvas.js";
import { Minimap } from "./minimap.js";

export const Raycaster = function() {
    this.fov = 60;
    this.positionX = 0;
    this.positionY = 0;
    this.positionZ = 0;
    this.rotation = 0;
    this.pitch = 0;
    this.pitchOffset = 0;

    this.rayAngles = [];
    this.rayAnglesDegrees = [];
    this.fishEyeFixes = [];
    this.inverseFishEyeFixes = [];
    this.bytesPerPixel = 4;
    this.distanceToPlane = 1;

    this.width = 0;
    this.height = 0;
    this.PROJECTION_WIDTH = 0;
    this.PROJECTION_HEIGHT = 0;

    this.skybox = null;
    this.ambient = { r: 0.5, g: 0.5, b: 0.5 };
    this.fogColor = { r: 0, g: 0, b: 0, distance: 750 };

    this.minimap = new Minimap();
    this.minimap.setViewport(10, 10);
    this.minimap.setScale(Camera.TILE_WIDTH, Camera.TILE_HEIGHT);
    this.display = new Canvas().createNewElement(320 * 1, 180 * 1).getImageData();
    ResourceLoader.promiseImage("assets/sky.png").then(image => this.skybox = new ImageBuffer(image));
}

Raycaster.RAY_DIRECTION_NORTH = 1 << 0;
Raycaster.RAY_DIRECTION_SOUTH = 1 << 1;
Raycaster.RAY_DIRECTION_EAST = 1 << 2;
Raycaster.RAY_DIRECTION_WEST = 1 << 3;
Raycaster.RAY_QUADRANT_NE = Raycaster.RAY_DIRECTION_NORTH + Raycaster.RAY_DIRECTION_EAST;
Raycaster.RAY_QUADRANT_NW = Raycaster.RAY_DIRECTION_NORTH + Raycaster.RAY_DIRECTION_WEST;
Raycaster.RAY_QUADRANT_SE = Raycaster.RAY_DIRECTION_SOUTH + Raycaster.RAY_DIRECTION_EAST;
Raycaster.RAY_QUADRANT_SW = Raycaster.RAY_DIRECTION_SOUTH + Raycaster.RAY_DIRECTION_WEST;
Raycaster.DOOR_TYPE_HORIZONTAL = 0;
Raycaster.DOOR_TYPE_VERTICAL = 1;
Raycaster.WALL_FACE_NORTH = 0;
Raycaster.WALL_FACE_SOUTH = 1;
Raycaster.WALL_FACE_EAST = 2;
Raycaster.WALL_FACE_WEST = 3;
Raycaster.WALL_FACE_TOP = 4;
Raycaster.WALL_FACE_BOTTOM = 5;

Raycaster.prototype.handleCameraBelowWall = function(tileData) {
    const { height, flags } = tileData;
    const tileWorldHeight = Camera.TILE_HEIGHT * height;

    if(tileWorldHeight < Camera.TILE_HEIGHT) { 
        return false;
    }

    if(flags["IS_DOOR"]) {
        const { door } = tileData;
        const { shift } = door;

        if(shift !== 0) {
            return false;
        }
    }

    return true;
}

Raycaster.prototype.handleCameraAboveWall = function(tileData) {
    return false;
}   

Raycaster.prototype.raycast = function(gameContext, gameMap) {
    const STACK = 64; //Camera.TILE_HEIGHT * ++index;
    const wallHandler = this.positionZ >= STACK ? this.handleCameraAboveWall : this.handleCameraBelowWall;

    gameMap.doors.forEach(door => {
        const { tileX, tileY } = door;
        const tile = gameMap.getTile(tileX, tileY);

        door.shift = normalizeValue(door.shift - door.shiftSpeed * gameContext.timer.getDeltaTime(), 1, 0);

        if(door.shift <= 0) {
            door.shift = 1;
        }
    });

    for(let pixelColumn = 0; pixelColumn < this.width; pixelColumn++) {
        const rayAngleDegrees = this.rotation + this.rayAnglesDegrees[pixelColumn];
        const rayAngleRadians = toRadian(rayAngleDegrees);
        const rayIntersections = this.checkRayIntersections(rayAngleRadians, gameMap.width, gameMap.height, gameMap.tiles, wallHandler);
        const rayIntersectionsSorted = rayIntersections.sort((a, b) => b.distance - a.distance);

        this.drawRays(gameContext, rayIntersectionsSorted, pixelColumn, gameMap, rayAngleRadians, rayAngleDegrees);
    }   

    this.display.context.putImageData(this.display.imageData, 0, 0);
}

Raycaster.prototype.onHorizontalIntersection = function(tileData, mapX, mapY, isRayDown, nextHorizontalX, nextHorizontalY, horizontalStepX, horizontalStepY, horizontalWallFace) {
    const { flags } = tileData;

    if(!flags["IS_VISIBLE"]) {
        return null; 
    }

    if(flags["IS_DOOR"]) {
        const { depth, type, shift } = tileData.door;

        if(type !== Raycaster.DOOR_TYPE_HORIZONTAL) {
            return null;
        }

        const doorDepth = isRayDown ? depth : 1 - depth;
        const doorShiftX = shift * Camera.TILE_WIDTH;

        const nextDoorX = nextHorizontalX + horizontalStepX * doorDepth;
        const nextDoorY = nextHorizontalY + horizontalStepY * doorDepth;
            
        const doorTileX = Math.floor((nextDoorX + doorShiftX) / Camera.TILE_WIDTH);
        const doorTileY = Math.floor(nextDoorY / Camera.TILE_HEIGHT);
            
        if(doorTileX !== mapX || doorTileY !== mapY) {
            return null;
        }

        const horizontalDistance = Math.sqrt((nextDoorX - this.positionX) ** 2 + (nextDoorY - this.positionY) ** 2);
        const horizontalHitX = nextDoorX + doorShiftX;
        const horizontalHitY = nextDoorY;
        const horizontalTextureOffset = isRayDown ? Math.floor(Camera.TILE_HEIGHT - horizontalHitX % Camera.TILE_HEIGHT) : Math.floor(horizontalHitX % Camera.TILE_HEIGHT);
                
        return {
            "tileX": mapX,
            "tileY": mapY,
            "hitX": horizontalHitX,
            "hitY": horizontalHitY,
            "wallFace": horizontalWallFace,
            "distance": horizontalDistance,
            "hasBack": false,
            "backDistance": horizontalDistance,
            "textureX": horizontalTextureOffset
        };
    }

    const horizontalDistance = Math.sqrt((nextHorizontalX - this.positionX) ** 2 + (nextHorizontalY - this.positionY) ** 2);
    const horizontalHitX = nextHorizontalX;
    const horizontalHitY = nextHorizontalY;
    const horizontalTextureOffset = isRayDown ? Math.floor(Camera.TILE_HEIGHT - horizontalHitX % Camera.TILE_HEIGHT) : Math.floor(horizontalHitX % Camera.TILE_HEIGHT);

    return {
        "tileX": mapX,
        "tileY": mapY,
        "hitX": horizontalHitX,
        "hitY": horizontalHitY,
        "wallFace": horizontalWallFace,
        "distance": horizontalDistance,
        "hasBack": true,
        "backDistance": horizontalDistance,
        "textureX": horizontalTextureOffset
    }
}

Raycaster.prototype.onVerticalIntersection = function(tileData, mapX, mapY, rayData) {
    const { nextX, nextY, stepX, stepY, faceType } = rayData;
    const { flags } = tileData;

    if(!flags["IS_VISIBLE"]) {
        return null; 
    }

    if(flags["IS_DOOR"]) {
        const { depth, type, shift } = tileData.door;

        if(type !== Raycaster.DOOR_TYPE_VERTICAL) {
            return null;
        }

        const doorDepth = faceType === Raycaster.WALL_FACE_WEST ? depth : 1 - depth;
        const doorShiftY = shift * Camera.TILE_HEIGHT;

        const nextDoorX = nextX + stepX * doorDepth;
        const nextDoorY = nextY + stepY * doorDepth;

        const doorTileX = Math.floor(nextDoorX / Camera.TILE_WIDTH);
        const doorTileY = Math.floor((nextDoorY - doorShiftY) / Camera.TILE_HEIGHT);

        if(doorTileX !== mapX || doorTileY !== mapY) {
            return null;
        }

        const verticalDistance = Math.sqrt((nextDoorX - this.positionX) ** 2 + (nextDoorY - this.positionY) ** 2);
        const verticalHitX = nextDoorX;
        const verticalHitY = nextDoorY - doorShiftY;
        const verticalTextureOffset = faceType === Raycaster.WALL_FACE_WEST ? Math.floor(verticalHitY % Camera.TILE_WIDTH) : Math.floor(Camera.TILE_WIDTH - verticalHitY % Camera.TILE_WIDTH);
        
        return {
            "tileX": mapX,
            "tileY": mapY,
            "hitX": verticalHitX,
            "hitY": verticalHitY,
            "wallFace": faceType,
            "distance": verticalDistance,
            "hasBack": false,
            "backDistance": verticalDistance,
            "textureX": verticalTextureOffset
        };
    }

    const verticalDistance = Math.sqrt((nextX - this.positionX) ** 2 + (nextY - this.positionY) ** 2);
    const verticalHitX = nextX;
    const verticalHitY = nextY;
    const verticalTextureOffset = faceType === Raycaster.WALL_FACE_WEST ? Math.floor(verticalHitY % Camera.TILE_WIDTH) : Math.floor(Camera.TILE_WIDTH - verticalHitY % Camera.TILE_WIDTH);

    return {
        "tileX": mapX,
        "tileY": mapY,
        "hitX": verticalHitX,
        "hitY": verticalHitY,
        "wallFace": faceType,
        "distance": verticalDistance,
        "hasBack": true,
        "backDistance": verticalDistance,
        "textureX": verticalTextureOffset
    };
}

Raycaster.prototype.checkRayIntersections = function(rayAngle, mapWidth, mapHeight, tileMap, onHit) {
    const rayHits = [];
    const isRayRight = Math.cos(rayAngle) > 0;
    const isRayDown = Math.sin(rayAngle) > 0;

    if(rayAngle === 0) {
        rayAngle = 0.001;
    }

    const rayGradient = Math.tan(rayAngle);
    const rayQuadrant = (isRayDown ? Raycaster.RAY_DIRECTION_SOUTH : Raycaster.RAY_DIRECTION_NORTH) + (isRayRight ? Raycaster.RAY_DIRECTION_EAST : Raycaster.RAY_DIRECTION_WEST);

    let horizontalStepX;
    let horizontalStepY;
    let nextHorizontalX;
    let nextHorizontalY;
    let horizontalWallFace;
    let horizontalAdjustmentY;
    let firstHorizontalAdjustmentY;

    if(isRayDown) {
        horizontalStepY = Camera.TILE_HEIGHT;
        horizontalWallFace = Raycaster.WALL_FACE_NORTH;
        horizontalAdjustmentY = 1;
        firstHorizontalAdjustmentY = Camera.TILE_HEIGHT;
    } else {
        horizontalStepY = -Camera.TILE_HEIGHT;
        horizontalWallFace = Raycaster.WALL_FACE_SOUTH;
        horizontalAdjustmentY = -1;
        firstHorizontalAdjustmentY = 0;
    }

    horizontalStepX = horizontalStepY / rayGradient;
    nextHorizontalY = Math.floor(this.positionY / Camera.TILE_HEIGHT) * Camera.TILE_HEIGHT + firstHorizontalAdjustmentY;
    nextHorizontalX = this.positionX + (nextHorizontalY - this.positionY) / rayGradient;

    while(true) {
        const mapX = Math.floor(nextHorizontalX / Camera.TILE_WIDTH);
        const mapY = Math.floor((nextHorizontalY + horizontalAdjustmentY) / Camera.TILE_HEIGHT);

        if(mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) {
            break;
        }

        const tileData = tileMap[mapY][mapX];
        const rayHit = this.onHorizontalIntersection(
            tileData, mapX, mapY, isRayDown,
            nextHorizontalX, nextHorizontalY, horizontalStepX, horizontalStepY,
            horizontalWallFace
        );

        if(rayHit !== null) {
            rayHits.push(rayHit);
            
            if(onHit(tileData)) {
                break;
            }
        }

        nextHorizontalX += horizontalStepX;
        nextHorizontalY += horizontalStepY;
    }

    let verticalStepX;
    let verticalStepY;
    let nextVerticalX;
    let nextVerticalY;
    let verticalWallFace;
    let verticalAdjustmentX;
    let firstVerticalAdjustmentX;

    if(isRayRight) {
        verticalStepX = Camera.TILE_WIDTH;
        verticalWallFace = Raycaster.WALL_FACE_WEST;
        verticalAdjustmentX = 1;
        firstVerticalAdjustmentX = Camera.TILE_WIDTH;
    } else {
        verticalStepX = -Camera.TILE_WIDTH;
        verticalWallFace = Raycaster.WALL_FACE_EAST;
        verticalAdjustmentX = -1;
        firstVerticalAdjustmentX = 0;
    }

    verticalStepY = verticalStepX * rayGradient;
    nextVerticalX = Math.floor(this.positionX / Camera.TILE_WIDTH) * Camera.TILE_WIDTH + firstVerticalAdjustmentX;
    nextVerticalY = this.positionY + (nextVerticalX - this.positionX) * rayGradient;

    while(true) {
        const mapX = Math.floor((nextVerticalX + verticalAdjustmentX) / Camera.TILE_WIDTH);
        const mapY = Math.floor(nextVerticalY / Camera.TILE_HEIGHT);

        if(mapX < 0 || mapX >= mapWidth || mapY < 0 || mapY >= mapHeight) {
            break;
        }

        const tileData = tileMap[mapY][mapX];
        const rayData = { nextX: nextVerticalX, nextY: nextVerticalY, stepX: verticalStepX, stepY: verticalStepY, faceType: verticalWallFace };
        const rayHit = this.onVerticalIntersection(tileData, mapX, mapY, rayData);

        if(rayHit !== null) {
            rayHits.push(rayHit);
            
            if(onHit(tileData)) {
                break;
            }
        }

        nextVerticalX += verticalStepX;
        nextVerticalY += verticalStepY;
    }

    for(const ray of rayHits) {
        const { tileX, tileY, hitX, hitY, hasBack } = ray;

        if(!hasBack) {
            continue;
        }

        const worldX = tileX * Camera.TILE_WIDTH;
        const worldY = tileY * Camera.TILE_HEIGHT;

        let exitX = worldX;
        let exitY = worldY;

        switch(rayQuadrant) {
            case Raycaster.RAY_QUADRANT_NE: {
                const top = hitX + (worldY - hitY) / rayGradient;
                const right = hitY + rayGradient * (worldX + Camera.TILE_WIDTH - hitX);
                const isRightExit = worldY <= right && right <= worldY + Camera.TILE_HEIGHT;
                const isTopExit = worldX <= top && top <= worldX + Camera.TILE_WIDTH;

                if(isRightExit) {
                    exitX = worldX + Camera.TILE_WIDTH;
                    exitY = right;
                } else if(isTopExit) {
                    exitX = top;
                    exitY = worldY;
                }

                break;
            }
            case Raycaster.RAY_QUADRANT_NW: {
                const top = hitX + (worldY - hitY) / rayGradient;
                const left = hitY + rayGradient * (worldX - hitX);
                const isLeftExit = worldY <= left && left <= worldY + Camera.TILE_HEIGHT;
                const isTopExit = worldX <= top && top <= worldX + Camera.TILE_WIDTH;

                if(isLeftExit) {
                    exitX = worldX;
                    exitY = left;
                } else if(isTopExit) {
                    exitX = top;
                    exitY = worldY;
                }

                break;
            }
            case Raycaster.RAY_QUADRANT_SE: {
                const bottom = hitX + (worldY + Camera.TILE_HEIGHT - hitY) / rayGradient;
                const right = hitY + rayGradient * (worldX + Camera.TILE_WIDTH - hitX);
                const isRightExit = worldY <= right && right <= worldY + Camera.TILE_HEIGHT;
                const isBottomExit = worldX <= bottom && bottom <= worldX + Camera.TILE_WIDTH;

                if(isRightExit) {
                    exitX = worldX + Camera.TILE_WIDTH;
                    exitY = right;
                } else if(isBottomExit) {
                    exitX = bottom;
                    exitY = worldY + Camera.TILE_HEIGHT;
                }

                break;
            }
            case Raycaster.RAY_QUADRANT_SW: {
                const bottom = hitX + (worldY + Camera.TILE_HEIGHT - hitY) / rayGradient;
                const left = hitY + rayGradient * (worldX - hitX);
                const isLeftExit = worldY <= left && left <= worldY + Camera.TILE_HEIGHT;
                const isBottomExit = worldX <= bottom && bottom <= worldX + Camera.TILE_WIDTH;
                
                if(isLeftExit) {
                    exitX = worldX;
                    exitY = left;
                } else if(isBottomExit) {
                    exitX = bottom;
                    exitY = worldY + Camera.TILE_HEIGHT;
                }

                break;
            }
        }

        ray.backDistance = Math.sqrt((exitX - this.positionX) ** 2 + (exitY - this.positionY) ** 2);;
    }
    
    return rayHits;
}

Raycaster.prototype.checkSingleRayIntersection = function(positionX, positionY, rayAngle, mapWidth, mapHeight, tileMap) {
    const rayIntersections = this.checkRayIntersections(positionX, positionY, rayAngle, mapWidth, mapHeight, tileMap, (tileData) => true);

    switch(rayIntersections.length) {
        case 0: return null;
        case 1: return rayIntersections[0];
        case 2: return rayIntersections[0].distance < rayIntersections[1].distance ? rayIntersections[0] : rayIntersections[1];
        default: return null;
    }
}

Raycaster.prototype.drawRays = function(gameContext, rayIntersectionsSorted, pixelColumn, gameMap, rayAngleRadians, rayAngleDegrees) {
    const { spriteManager } = gameContext;
    const cosAngle = Math.cos(rayAngleRadians);
    const sinAngle = Math.sin(rayAngleRadians);

    for(let i = 0; i < rayIntersectionsSorted.length; i++) {
        const ray = rayIntersectionsSorted[i];
        const { tileX, tileY, hitX, hitY, distance, backDistance, wallFace, hasBack } = ray;

        const tileData = gameMap.tiles[tileY][tileX];
        const wallFaceData = tileData.faces[wallFace];
        const topFaceData = tileData.faces[Raycaster.WALL_FACE_TOP];
        const tileHeight = Camera.TILE_HEIGHT * tileData.height;

        const distanceRatio = this.distanceToPlane / (distance * this.fishEyeFixes[pixelColumn]);
        const verticalScale = 1 / distanceRatio;        
    
        const wallHeight = tileHeight * distanceRatio;
        const wallBottom = distanceRatio * this.positionZ + this.PROJECTION_HEIGHT - this.pitchOffset;
        const wallTop = wallBottom - wallHeight;

        //Only draw floor/ceiling on the closest wall of a row.
        //if the ceiling finds null, draw the sky
        if(i === 0) {
            //this.drawSky(pixelColumn, rayAngleDegrees, 0, ~~wallTop);
            this.drawFloor(gameContext, pixelColumn, cosAngle, sinAngle, ~~wallBottom, this.height, gameMap.width, gameMap.height, gameMap.tiles);
            this.drawCeiling(gameContext, pixelColumn, cosAngle, sinAngle, 0, ~~wallTop, gameMap.width, gameMap.height, gameMap.tiles);
        }

        if(wallFaceData) {
            const buffer = spriteManager.getTileBuffer(wallFaceData[0], wallFaceData[1]);
            this.drawWall(pixelColumn, ~~wallTop, wallHeight, buffer, ray, verticalScale);
        }

        if(this.positionZ > tileHeight && hasBack) {
            const backDistanceRatio = this.distanceToPlane / (backDistance * this.fishEyeFixes[pixelColumn]);
            const backWallHeight = tileHeight * backDistanceRatio;
            const backWallBottom = backDistanceRatio * this.positionZ + this.PROJECTION_HEIGHT - this.pitchOffset;
            const backWallTop = backWallBottom - backWallHeight;

            if(topFaceData) {
                const topBuffer = spriteManager.getTileBuffer(topFaceData[0], topFaceData[1]);
                this.drawTopFace(pixelColumn, ~~backWallTop, ~~wallTop, tileHeight, cosAngle, sinAngle, topBuffer);
            }
            this.drawDebugLine(~~backWallBottom, pixelColumn, [255, 255, 0, 127]);
            this.drawDebugLine(~~backWallTop, pixelColumn, [0, 255, 0, 127]);
        }
        
        this.drawDebugLine(~~wallTop, pixelColumn, [255, 0, 0, 127]);
        this.drawDebugLine(~~wallBottom, pixelColumn, [0, 0, 255, 127]);
    }
}

Raycaster.prototype.drawWall = function(pixelColumn, wallTop, wallHeight, buffer, ray, verticalTextureScale) {
    const { textureX, distance } = ray;
    const bytesPerPixel = this.bytesPerPixel;
    const targetData = this.display.imageData.data;
    const targetHeight = this.height;
    const targetWidth = this.width;
    const sourceData = buffer.imageData.data;
    const textureWidth = buffer.bitmap.width;
    const textureHeight = buffer.bitmap.height;

    let drawStart = wallTop;
    let drawEnd = wallTop + wallHeight;

    if(drawStart < 0) {
        drawStart = 0;
    }

    if(drawEnd > targetHeight) {
        drawEnd = targetHeight;
    }

    for(let targetY = drawStart; targetY <= drawEnd; targetY++) {
        const yOffset = targetY - wallTop;
        const textureY = ~~((yOffset * verticalTextureScale) % textureHeight);
        const targetIndex = (targetY * targetWidth + pixelColumn) * bytesPerPixel;
        const sourceIndex = (textureY * textureWidth + textureX) * bytesPerPixel;

        this.drawPixel(targetData, targetIndex, sourceData, sourceIndex, distance);
    }
}

Raycaster.prototype.drawSky = function(pixelColumn, rayAngleDegrees, startRow, endRow) {
    const targetImageData = this.display.imageData.data;
    const sourceImageData = this.skybox.imageData.data;

    const pixelStep = this.bytesPerPixel * this.skybox.width;
    const xRatio = normalizeAngle(rayAngleDegrees) / 360;
    const sourceColumn = ~~(this.skybox.width * xRatio);

    let sourceIndex = sourceColumn * this.bytesPerPixel;

    const { r, g, b } = this.ambient;

    for(let row = startRow; row < endRow; row++, sourceIndex += pixelStep) {
        const targetIndex = (row * this.width + pixelColumn) * this.bytesPerPixel;

        const sourceR = sourceImageData[sourceIndex];
        const sourceG = sourceImageData[sourceIndex + 1];
        const sourceB = sourceImageData[sourceIndex + 2];
        const sourceA = sourceImageData[sourceIndex + 3];

        targetImageData[targetIndex] = ~~(sourceR * r);
        targetImageData[targetIndex + 1] = ~~(sourceG * g);
        targetImageData[targetIndex + 2] = ~~(sourceB * b);
        targetImageData[targetIndex + 3] = sourceA;
    }
}

Raycaster.prototype.drawTopFace = function(pixelColumn, drawStart, drawEnd, tileHeight, cosAngle, sinAngle, buffer) {
    const bytesPerPixel = this.bytesPerPixel;
    const pixelStep = bytesPerPixel * this.width;
    const fishEyeFix = this.inverseFishEyeFixes[pixelColumn];
    const targetData = this.display.imageData.data;
    const sourceData = buffer.imageData.data;
    const textureWidth = buffer.bitmap.width;
    const positionZ = this.positionZ - tileHeight;
    const positionY = this.pitchOffset - this.PROJECTION_HEIGHT;

    if(drawStart < 0) {
        drawStart = 0;
    }

    if(drawEnd > this.height) {
        drawEnd = this.height;
    }

    let targetY = drawStart;
    let targetIndex = this.bytesPerPixel * (drawStart * this.width + pixelColumn);

    while(targetY <= drawEnd) {
        const euclideanDistance = positionZ / (targetY + positionY) * this.distanceToPlane;
        const perpendicularDistance = euclideanDistance * fishEyeFix;
        const xEnd = ~~(perpendicularDistance * cosAngle + this.positionX);
        const yEnd = ~~(perpendicularDistance * sinAngle + this.positionY);
        const textureY = yEnd % Camera.TILE_WIDTH;
        const textureX = xEnd % Camera.TILE_HEIGHT;
        const sourceIndex = bytesPerPixel * (textureY * textureWidth + textureX);

        this.drawPixel(targetData, targetIndex, sourceData, sourceIndex, perpendicularDistance);

        targetY++;
        targetIndex += pixelStep;
    }
}

Raycaster.prototype.drawFloor = function(gameContext, pixelColumn, cosAngle, sinAngle, drawStart, drawEnd, mapWidth, mapHeight, tileMap) {
    const { spriteManager } = gameContext;
    const targetData = this.display.imageData.data;
    const pixelStep = this.bytesPerPixel * this.width;

    let targetIndex = this.bytesPerPixel * (drawStart * this.width + pixelColumn);

    for(let row = drawStart + 1; row <= drawEnd; row++, targetIndex += pixelStep) {
        const straightDistance = this.positionZ / (row - this.PROJECTION_HEIGHT + this.pitchOffset) * this.distanceToPlane;
        const actualDistance = straightDistance * this.inverseFishEyeFixes[pixelColumn];

        const xEnd = actualDistance * cosAngle + this.positionX;
        const yEnd = actualDistance * sinAngle + this.positionY;
        const cellX = ~~(xEnd / Camera.TILE_WIDTH);
        const cellY = ~~(yEnd / Camera.TILE_HEIGHT);

        if(cellX < 0 || cellX >= mapWidth || cellY < 0 || cellY >= mapHeight) {
            continue;
        }

        const { floor, flags, height } = tileMap[cellY][cellX];

        if(floor === null || flags["IS_FLOOR_OCCLUDED"]) {
            continue;
        }

        const tileRow = ~~yEnd % Camera.TILE_WIDTH;
        const tileColumn = ~~xEnd % Camera.TILE_HEIGHT;
        const sourceIndex = this.bytesPerPixel * (tileRow * Camera.TILE_HEIGHT + tileColumn);

        const buffer = spriteManager.getTileBuffer(floor[0], floor[1]);
        const sourceData = buffer.imageData.data;

        this.drawPixel(targetData, targetIndex, sourceData, sourceIndex, actualDistance);
    }
}

Raycaster.prototype.drawCeiling = function(gameContext, pixelColumn, cosAngle, sinAngle, drawStart, drawEnd, mapWidth, mapHeight, tileMap) {
    const { spriteManager } = gameContext;
    const targetData = this.display.imageData.data;
    const pixelStep = this.bytesPerPixel * this.width;

    const adjustedZ = Camera.TILE_HEIGHT - this.positionZ;

    let targetIndex = this.bytesPerPixel * (drawStart * this.width + pixelColumn);

    for(let row = drawStart; row < drawEnd; row++, targetIndex += pixelStep) {
        const straightDistance = adjustedZ / (this.PROJECTION_HEIGHT - row - this.pitchOffset) * this.distanceToPlane;
        const actualDistance = straightDistance * this.inverseFishEyeFixes[pixelColumn];

        const xEnd = actualDistance * cosAngle + this.positionX;
        const yEnd = actualDistance * sinAngle + this.positionY;
        const cellX = ~~(xEnd / Camera.TILE_WIDTH);
        const cellY = ~~(yEnd / Camera.TILE_HEIGHT);

        if(cellX < 0 || cellX >= mapWidth || cellY < 0 || cellY >= mapHeight) {
            continue;
        }

        const { ceiling, flags } = tileMap[cellY][cellX];

        if(ceiling === null || flags["IS_CEILING_OCCLUDED"]) {
            continue;
        }

        const buffer = spriteManager.getTileBuffer(ceiling[0], ceiling[1]);
        const sourceData = buffer.imageData.data;

        const tileRow = ~~yEnd % Camera.TILE_WIDTH;
        const tileColumn = ~~xEnd % Camera.TILE_HEIGHT;

        const sourceIndex = this.bytesPerPixel * (tileRow * Camera.TILE_HEIGHT + tileColumn);

        this.drawPixel(targetData, targetIndex, sourceData, sourceIndex, actualDistance);
    }
}

/**
 * 
 * @param {array.<int>} targetData 
 * @param {int} targetIndex 
 * @param {array.<int>} sourceData 
 * @param {int} sourceIndex 
 * @param {float} distance
 */
Raycaster.prototype.drawPixel = function(targetData, targetIndex, sourceData, sourceIndex, distance) {
    const fogI = Math.min(1, distance / this.fogColor.distance);
    const fogR = this.fogColor.r;
    const fogG = this.fogColor.g;
    const fogB = this.fogColor.b;

    const sourceR = sourceData[sourceIndex];
    const sourceG = sourceData[sourceIndex + 1];
    const sourceB = sourceData[sourceIndex + 2];
    const sourceA = sourceData[sourceIndex + 3];

    const lightR = this.ambient.r + 0; //LIGHTMAP-R
    const lightG = this.ambient.g + 0; //LIGHTMAP-G
    const lightB = this.ambient.b + 0; //LIGHTMAP-B

    const nextR = (sourceR * lightR) * (1 - fogI) + fogR * fogI;
    const nextG = (sourceG * lightG) * (1 - fogI) + fogG * fogI;
    const nextB = (sourceB * lightB) * (1 - fogI) + fogB * fogI;

    targetData[targetIndex] = Math.min(255, ~~nextR);
    targetData[targetIndex + 1] = Math.min(255, ~~nextG);
    targetData[targetIndex + 2] = Math.min(255, ~~nextB);
    targetData[targetIndex + 3] = sourceA;
}

Raycaster.prototype.drawSprites = function() {
}

Raycaster.prototype.drawDebugLine = function(row, column, [r, g, b, a]) {
    return;
    const targetData = this.display.imageData.data;
    const targetIndex = this.bytesPerPixel * (~~row * this.width + column);

    targetData[targetIndex] = r;
    targetData[targetIndex + 1] = g;
    targetData[targetIndex + 2] = b;
    targetData[targetIndex + 3] = a;
}

Raycaster.prototype.resize = function(width, height) {
    this.display.resize(width, height);
    this.display.getImageData();

    this.width = Math.floor(this.display.width);
    this.height = Math.floor(this.display.height);

    this.PROJECTION_WIDTH = Math.floor(this.display.centerX);
    this.PROJECTION_HEIGHT = Math.floor(this.display.centerY);

    this.calculateRayData(this.fov);    
}

Raycaster.prototype.calculateRayData = function(fov) {
    const halfCameraFov = toRadian(fov / 2);
    const halfCameraFovTan = Math.tan(halfCameraFov);

    this.rayAngles = new Array(this.width);
    this.rayAnglesDegrees = new Array(this.width);
    this.fishEyeFixes = new Array(this.width);
    this.inverseFishEyeFixes = new Array(this.width);

    for(let i = 0; i < this.width; i++) {
        const screenX = (2 * i) / this.width - 1;
        const rayAngle = Math.atan(screenX * halfCameraFovTan);
        const rayAngleDegrees = toAngle(rayAngle);
        const fishEyeFix = Math.cos(rayAngle);
        const inverseFishEyeFix = 1 / fishEyeFix;

        this.rayAnglesDegrees[i] = rayAngleDegrees;
        this.rayAngles[i] = rayAngle;
        this.fishEyeFixes[i] = fishEyeFix;
        this.inverseFishEyeFixes[i] = inverseFishEyeFix;
    }

    this.distanceToPlane = this.PROJECTION_WIDTH / halfCameraFovTan;
}

Raycaster.prototype.copyPosition = function(position3D) {
    this.positionX = position3D.positionX;
    this.positionY = position3D.positionY;
    this.positionZ = position3D.positionZ + position3D.height;
    this.rotation = position3D.rotation;
    this.pitch = position3D.pitch;
    this.pitchOffset = Math.tan(toRadian(this.pitch)) * this.distanceToPlane;
}