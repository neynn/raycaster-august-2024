import { State } from "../../source/state/state.js";

export const ControllerIdleState = function() {
    State.call(this);
}

ControllerIdleState.prototype = Object.create(State.prototype);
ControllerIdleState.prototype.constructor = ControllerIdleState;

ControllerIdleState.prototype.onEventEnter = function(stateMachine, gameContext, viewportTile) {
    const controller = stateMachine.getContext();
    const entityID = viewportTile.getFirstEntity();

    if(!entityID) {
        return;
    }

    const entity = gameContext.entityManager.getEntity(entityID);

    entity.states.onEventEnter(gameContext);
}