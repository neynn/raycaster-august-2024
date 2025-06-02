import { Move3DComponent } from "../components/move3D.js";
import { Position3DComponent } from "../components/position3D.js";
import { Camera } from "../source/camera/camera.js";
import { State } from "../source/state/state.js";
import { movePlayer } from "./playerFunctions.js";

export const PlayerJumpState = function() {
    State.call(this);
}

PlayerJumpState.prototype = Object.create(State.prototype);
PlayerJumpState.prototype.constructor = PlayerJumpState;

PlayerJumpState.prototype.update = function(stateMachine, gameContext) {
    const MAX_JUMP_HEIGHT = Camera.TILE_HEIGHT * 0.5 - 2;
    const { timer, mapLoader } = gameContext; 
    const entity = stateMachine.getContext();
    const deltaTime = timer.getFixedDeltaTime();
    const gameMap = mapLoader.getActiveMap();

    if(!gameMap) {
        return;
    }

    const position3D = entity.components.getComponent(Position3DComponent);
    const move3D = entity.components.getComponent(Move3DComponent);
    const heightLayer = gameMap.layers["height"];
    const collisionLayer = gameMap.layers["collision"];
    const gravity = 10;
    
    movePlayer(entity, gameMap, deltaTime, gameContext);

    if(move3D.isFalling) {
        move3D.acceleration += gravity * deltaTime;
        position3D.positionZ -= move3D.acceleration * deltaTime;

        const tileX = Math.floor(position3D.positionX / Camera.TILE_WIDTH);
        const tileY = Math.floor(position3D.positionY / Camera.TILE_HEIGHT);
        const tileHeight = heightLayer[tileY][tileX];

        if(collisionLayer[tileY][tileX] !== 0) {
            if(position3D.positionZ <= Camera.TILE_HEIGHT * tileHeight) {
                position3D.positionZ = Camera.TILE_HEIGHT * tileHeight;
                move3D.isFalling = false;
                move3D.isJumping = false;
                move3D.acceleration = move3D.acceleration_default;
                stateMachine.setNextState(0);
            }
        } else {
            if(position3D.positionZ <= 0) {
                position3D.positionZ = 0;
                move3D.isFalling = false;
                move3D.isJumping = false;
                move3D.acceleration = move3D.acceleration_default;
                stateMachine.setNextState(0);
            }
        }
    } else {
        move3D.acceleration -= gravity * deltaTime;
        position3D.positionZ += move3D.acceleration * deltaTime;

        if(position3D.positionZ >= MAX_JUMP_HEIGHT) {
            move3D.isJumping = false;
            move3D.isFalling = true;
        }
    }
}