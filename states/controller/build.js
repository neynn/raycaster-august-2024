import { State } from "../../source/state/state.js";

export const ControllerBuildState = function() {
    State.call(this);
}

ControllerBuildState.prototype = Object.create(State.prototype);
ControllerBuildState.prototype.constructor = ControllerBuildState;

ControllerBuildState.prototype.onEventEnter = function(stateMachine, gameContext, viewportTile) {
    const { entityManager } = gameContext;

    const tileEntityID = viewportTile.getFirstEntity();

    if(tileEntityID) {
        const tileEntity = entityManager.getEntity(tileEntityID);

        tileEntity.states.onEventEnter(gameContext);
        return;
    }
}