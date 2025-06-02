import { StateMachine } from "./state/stateMachine.js";

export const Controller = function() {
    this.selectedEntity = null;
    this.states = new StateMachine();
}

Controller.prototype.update = function(gameContext) {
    this.states.update(gameContext);
}