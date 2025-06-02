import { State } from "../../source/state/state.js";

export const GameOverState = function() {
    State.call(this);
}

GameOverState.prototype = Object.create(State.prototype);
GameOverState.prototype.constructor = GameOverState;