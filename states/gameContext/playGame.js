import { State } from "../../source/state/state.js";

export const PlayGameState = function() {
    State.call(this);
}

PlayGameState.prototype = Object.create(State.prototype);
PlayGameState.prototype.constructor = PlayGameState;

PlayGameState.prototype.enter = async function(stateMachine) {
    const gameContext = stateMachine.getContext();
    const { uiManager, spriteManager, controller } = gameContext;

    await gameContext.loadMap("backrooms");
    uiManager.parseUI("PLAY_GAME", gameContext);
    gameContext.parseMap("backrooms", false);
    spriteManager.createSprite("items", true, "coin").setPositionRaw(0, 0);

    gameContext.renderer.display.canvas.addEventListener("click", () => {
        if(!gameContext.client.cursor.isLocked) {
            gameContext.renderer.display.canvas.requestPointerLock();
            return;
        }

        document.exitPointerLock();
    });
}

PlayGameState.prototype.exit = function(stateMachine) {
    const gameContext = stateMachine.getContext();
    const { uiManager, controller } = gameContext;

    uiManager.unparseUI("PLAY_GAME", gameContext);
    controller.states.reset();
}   