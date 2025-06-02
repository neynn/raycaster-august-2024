import { SpriteComponent } from "../components/sprite.js";
import { Sprite } from "../source/graphics/sprite.js";

export const MorphSystem = function() {
    this.id = "MorphSystem";
}

/**
 * Morphs the sprite of an entity.
 * 
 * @param {object} gameContext - The game context.
 * @param {object} entity - The entity whose sprite will be morphed.
 * @param {string} spriteTypeID - The sprites key in config.sprites.
 * @param {object} config - The configuration object.
 * @param {boolean} [config.isStatic] - Whether the sprite is static.
 * @param {number} [config.frameIndex] - The frame index to set.
 * @returns {void}
 */
MorphSystem.morphSprite = function(gameContext, entity, spriteTypeID, config) {
    if(!entity) {
        console.warn(`Entity cannot be undefined! Returning...`);
        return;
    }

    if(!entity.config.sprites[spriteTypeID]) {
        console.warn(`SpriteType ${spriteTypeID} does not exist! Returning...`);
        return;
    }

    const { spriteManager } = gameContext;
    const spriteComponent = entity.components.getComponent(SpriteComponent);
    const spriteID = spriteComponent.spriteID;
    const spriteData = entity.config.sprites[spriteTypeID];

    const sprite = spriteManager.getSprite(spriteID);
    const [spriteSetID, spriteAnimationID] = spriteData;
    const currentSpriteSetID = sprite.getConfig().id;
    const currentSpriteConfigID = sprite.getAnimation().id;

    if(spriteSetID !== currentSpriteSetID || (spriteSetID === currentSpriteSetID && spriteAnimationID !== currentSpriteConfigID)) {
        spriteManager.updateSprite(spriteID, spriteSetID, spriteAnimationID);
    }

    if(config) {
        const isStatic = config["isStatic"];
        const frameIndex = config["frameIndex"];
        const onLoop = config["onLoop"];

        if(isStatic !== undefined) {
            sprite.setStatic(isStatic);
        }

        if(frameIndex !== undefined) {
            sprite.setFrame(frameIndex);
        }

        if(onLoop !== undefined) {
            sprite.events.subscribe(Sprite.LOOP_COMPLETE, "MORPH_SYSTEM_LOOP", sprite => {
                onLoop(sprite);
                sprite.events.unsubscribe(Sprite.LOOP_COMPLETE, "MORPH_SYSTEM_LOOP");
            });
        }
    }
}