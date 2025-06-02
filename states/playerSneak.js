import { Move3DComponent } from "../components/move3D.js";
import { Position3DComponent } from "../components/position3D.js";
import { Camera } from "../source/camera/camera.js";
import { State } from "../source/state/state.js";
import { movePlayer } from "./playerFunctions.js";

export const PlayerSneakState = function() {
    State.call(this);
}

PlayerSneakState.prototype = Object.create(State.prototype);
PlayerSneakState.prototype.constructor = PlayerSneakState;

PlayerSneakState.prototype.enter = function(stateMachine) {
    const entity = stateMachine.getContext();
    const position3D = entity.components.getComponent(Position3DComponent);
    const move3D = entity.components.getComponent(Move3DComponent);

    position3D.height -= Camera.TILE_HEIGHT / 4;
    move3D.speed = move3D.sneakSpeed;
    move3D.isSneaking = true;
}

PlayerSneakState.prototype.exit = function(stateMachine) {
    const entity = stateMachine.getContext();
    const position3D = entity.components.getComponent(Position3DComponent);
    const move3D = entity.components.getComponent(Move3DComponent);

    position3D.height += Camera.TILE_HEIGHT / 4;
    move3D.speed = move3D.walkSpeed;
    move3D.isSneaking = false;
}

PlayerSneakState.prototype.onEventEnter = function(stateMachine, eventCode) {
    if(eventCode === "SNEAK") {
        stateMachine.setNextState(0);
    }

    if(eventCode === "JUMP") {
        stateMachine.setNextState(1);
    }
}

PlayerSneakState.prototype.update = function(stateMachine, gameContext) {
    const { timer, mapLoader } = gameContext; 
    const entity = stateMachine.getContext();
    const deltaTime = timer.getFixedDeltaTime();
    const gameMap = mapLoader.getActiveMap();

    if(!gameMap) {
        return;
    }

    movePlayer(entity, gameMap, deltaTime, gameContext);
}