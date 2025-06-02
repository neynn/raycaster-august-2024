import { Move3DComponent } from "../components/move3D.js";
import { Position3DComponent } from "../components/position3D.js";
import { Camera } from "../source/camera/camera.js";
import { toRadian } from "../source/helpers.js";

export const movePlayer = function(entity, gameMap, deltaTime, gameContext) {
    const position3D = entity.components.getComponent(Position3DComponent);
    const move3D = entity.components.getComponent(Move3DComponent);

    const entityRotation = position3D.rotation;
    const entitySpeed = move3D.speed * deltaTime;

    const mapWidth = gameMap.width * Camera.TILE_WIDTH;
    const mapHeight = gameMap.height * Camera.TILE_HEIGHT;

    let dirX = 0;
    let dirY = 0;

    if(move3D.isMovingUp) {
        dirX += Math.cos(toRadian(entityRotation));
        dirY += Math.sin(toRadian(entityRotation));
    }

    if(move3D.isMovingRight) {
        dirX += Math.cos(toRadian(entityRotation + 90));
        dirY += Math.sin(toRadian(entityRotation + 90));
    }

    if(move3D.isMovingDown) {
        dirX -= Math.cos(toRadian(entityRotation));
        dirY -= Math.sin(toRadian(entityRotation));
    }

    if(move3D.isMovingLeft) {
        dirX += Math.cos(toRadian(entityRotation - 90));
        dirY += Math.sin(toRadian(entityRotation - 90));
    }

    const normalizedDirection = Math.sqrt(dirX * dirX + dirY * dirY);

    if(normalizedDirection > 0) {
        dirX /= normalizedDirection;
        dirY /= normalizedDirection;
    }

    let nextPositionX = position3D.positionX + dirX * entitySpeed;
    let nextPositionY = position3D.positionY + dirY * entitySpeed;
    let nextPositionZ = position3D.positionZ;

    let tileX = Math.floor(nextPositionX / Camera.TILE_WIDTH);
    let tileY = Math.floor(nextPositionY / Camera.TILE_HEIGHT);

    if(!validatePosition(nextPositionX, nextPositionY, position3D.positionZ, mapWidth, mapHeight, gameMap.tiles, move3D.stepHeight)) {
        nextPositionX = position3D.positionX + dirX * entitySpeed;
        nextPositionY = position3D.positionY;
        tileX = Math.floor(nextPositionX / Camera.TILE_WIDTH);
        tileY = Math.floor(nextPositionY / Camera.TILE_HEIGHT);

        if(!validatePosition(nextPositionX, nextPositionY, position3D.positionZ, mapWidth, mapHeight, gameMap.tiles, move3D.stepHeight)) {
            nextPositionX = position3D.positionX;
            nextPositionY = position3D.positionY + dirY * entitySpeed;
            tileX = Math.floor(nextPositionX / Camera.TILE_WIDTH);
            tileY = Math.floor(nextPositionY / Camera.TILE_HEIGHT);

            if(!validatePosition(nextPositionX, nextPositionY, position3D.positionZ, mapWidth, mapHeight, gameMap.tiles, move3D.stepHeight)) {
                return;
            }
        }
    }

    position3D.positionX = nextPositionX;
    position3D.positionY = nextPositionY;
    position3D.positionZ = nextPositionZ;
}

export const validatePosition = function(positionX, positionY, positionZ, mapWidth, mapHeight, tileMap, stepHeight) {
    if(positionX > mapWidth || positionX < 0 || positionY > mapHeight || positionY < 0) {
        return false;
    }

    const tileX = Math.floor(positionX / Camera.TILE_WIDTH);
    const tileY = Math.floor(positionY / Camera.TILE_HEIGHT);
    const tileData = tileMap[tileY][tileX];

    if(tileData["collision"] !== 0) {
        if(positionZ + stepHeight * Camera.TILE_HEIGHT >= Camera.TILE_HEIGHT * tileData["height"]) {
            return true;
        }
        return false;
    }

    return true;
}
