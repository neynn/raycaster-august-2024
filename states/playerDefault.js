import { Move3DComponent } from "../components/move3D.js";
import { Position3DComponent } from "../components/position3D.js";
import { State } from "../source/state/state.js";
import { movePlayer } from "./playerFunctions.js";

export const PlayerDefault = function() {
    State.call(this);

    this.bobbingTime = 0;
    this.BOBBING_AMPLITUDE = 3;
    this.BOBBING_FREQUENCY = 5;
}

PlayerDefault.prototype = Object.create(State.prototype);
PlayerDefault.prototype.constructor = PlayerDefault;

PlayerDefault.prototype.exit = function(stateMachine) {
    const entity = stateMachine.getContext();
    const position3D = entity.components.getComponent(Position3DComponent);

    position3D.height = position3D.baseHeight;
}

PlayerDefault.prototype.onEventEnter = function(stateMachine, eventCode) {
    if(eventCode === "INTERACT") {
        //interact with block before the player.
    }

    if(eventCode === "JUMP") {
        stateMachine.setNextState(1);
    }

    if(eventCode === "SNEAK") {
        stateMachine.setNextState(2);
    }
}

PlayerDefault.prototype.update = function(stateMachine, gameContext) {
    const { timer, mapLoader } = gameContext; 
    const entity = stateMachine.getContext();
    const deltaTime = timer.getFixedDeltaTime();
    const gameMap = mapLoader.getActiveMap();

    if(!gameMap) {
        return;
    }

    const position3D = entity.components.getComponent(Position3DComponent);
    const move3D = entity.components.getComponent(Move3DComponent);
    const entitySpeed = move3D.speed * deltaTime;
    
    if(!move3D.isMovingUp && !move3D.isMovingDown && !move3D.isMovingLeft && !move3D.isMovingRight) {
        this.bobbingTime = 0;
        position3D.height = position3D.baseHeight;
        return;
    }
    
    movePlayer(entity, gameMap, deltaTime, gameContext);

    this.bobbingTime += deltaTime * entitySpeed;
    position3D.height = position3D.baseHeight + this.BOBBING_AMPLITUDE * Math.sin(this.bobbingTime * this.BOBBING_FREQUENCY);
}