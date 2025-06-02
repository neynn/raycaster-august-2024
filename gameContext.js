import { Camera } from "./source/camera/camera.js";
import { Client } from "./source/client.js";
import { Cursor } from "./source/client/cursor.js";
import { Keyboard } from "./source/client/keyboard.js";
import { EntityManager } from "./source/entity/entityManager.js";
import { EventEmitter } from "./source/events/eventEmitter.js";
import { SpriteManager } from "./source/graphics/spriteManager.js";
import { UIManager } from "./source/ui/uiManager.js";
import { getViewportTile, normalizeAngle, normalizeValue, saveTemplateAsFile, tileToPosition_corner } from "./source/helpers.js";
import { MapLoader } from "./source/map/mapLoader.js";
import { StateMachine } from "./source/state/stateMachine.js";
import { TileManager } from "./source/tile/tileManager.js";
import { Timer } from "./source/timer.js";
import { MainMenuState } from "./states/gameContext/mainMenu.js";
import { MapEditorState } from "./states/gameContext/mapEditor.js";
import { ActionQueue } from "./source/action/actionQueue.js";
import { UIElement } from "./source/ui/uiElement.js";
import { PlayGameState } from "./states/gameContext/playGame.js";
import { PositionComponent } from "./components/position.js";
import { SpriteComponent } from "./components/sprite.js";
import { Entity } from "./source/entity/entity.js";
import { MoveComponent } from "./components/move.js";
import { MorphSystem } from "./systems/morph.js";
import { Position3DComponent } from "./components/position3D.js";
import { Move3DComponent } from "./components/move3D.js";
import { PlayerDefault } from "./states/playerDefault.js";
import { CONTROLLER } from "./enums.js";
import { Controller } from "./source/controller.js";
import { ControllerIdleState } from "./states/controller/idle.js";
import { ControllerBuildState } from "./states/controller/build.js";
import { GameOverState } from "./states/gameContext/gameOver.js";
import { PlayerJumpState } from "./states/playerJump.js";
import { PlayerSneakState } from "./states/playerSneak.js";

export const GameContext = function() {
    this.types = {};
    this.client = new Client();
    this.controller = new Controller();
    this.renderer = new Camera(window.innerWidth, window.innerHeight);
    this.timer = new Timer(60);
    this.mapLoader = new MapLoader();
    this.entityManager = new EntityManager();
    this.tileManager = new TileManager();
    this.spriteManager = new SpriteManager();
    this.uiManager = new UIManager();
    this.actionQueue = new ActionQueue();
    this.events = new EventEmitter();
    this.states = new StateMachine(this);
    
    this.states.addState(GameContext.STATE_MAIN_MENU, new MainMenuState());
    this.states.addState(GameContext.STATE_MAP_EDITOR, new MapEditorState());
    this.states.addState(GameContext.STATE_PLAY_GAME, new PlayGameState());
    this.states.addState(GameContext.STATE_GAME_OVER, new GameOverState());

    this.timer.inputFunction = () => {
        this.client.update(this);
    }

    this.timer.updateFunction = () => {
        this.controller.update(this);
        this.actionQueue.update(this);
        this.entityManager.update(this);

        //3D logic.
        if(GameContext.USE_RAYCAST) {
            this.player.update(this);
        }
    }

    this.timer.renderFunction = () => {
        this.spriteManager.update(this);
        this.uiManager.update(this);
        this.renderer.update(this);
    }

    if(GameContext.USE_RAYCAST) {
        this.setupPlayer3D();
    }

    this.setupController();
}

GameContext.USE_RAYCAST = 1;
GameContext.STATE_MAIN_MENU = 0;
GameContext.STATE_MAP_EDITOR = 1;
GameContext.STATE_PLAY_GAME = 2;
GameContext.STATE_GAME_OVER = 3;

GameContext.prototype.setupController = function() {
    this.client.cursor.events.subscribe(Cursor.LEFT_MOUSE_DRAG, "GAME_CONTEXT", (deltaX, deltaY) => this.renderer.dragViewportBy(deltaX, deltaY));
    this.client.cursor.events.subscribe(Cursor.LEFT_MOUSE_CLICK, "GAME_CONTEXT", (event, cursor) => {
        const collidedElements = this.uiManager.checkCollisions(cursor.position.x, cursor.position.y, cursor.radius);
        const viewportTile = this.getViewportTile();

        if(collidedElements.length === 0) {
            if(!viewportTile) {
                return;
            }

            this.controller.states.onEventEnter(this, viewportTile);
            return;
        }   

        for(const element of collidedElements) {
            element.events.emit(UIElement.EVENT_CLICKED);
        }
    });

    this.controller.states.addState(CONTROLLER.STATE_IDLE, new ControllerIdleState());
    this.controller.states.addState(CONTROLLER.STATE_BUILD, new ControllerBuildState());
}

GameContext.prototype.loadResources = function(resources) {
    this.types = resources.types;
    this.uiManager.loadFontTypes(null);
    this.uiManager.loadIconTypes(null);
    this.uiManager.loadUserInterfaceTypes(resources.uiConfig);
    this.client.musicPlayer.loadMusicTypes(resources.music);
    this.entityManager.loadEntityTypes(resources.entities);
    this.tileManager.loadTileTypes(resources.tileTypes);
    this.mapLoader.loadMapTypes(resources.maps);
    this.mapLoader.loadConfig(resources.mapLoaderConfig);
    this.spriteManager.loadTileSprites(resources.tiles);
    this.spriteManager.loadSpriteTypes(resources.sprites);
    this.client.soundPlayer.soundList = resources.sounds;
    this.client.soundPlayer.loadAllSounds();
}

GameContext.prototype.exitGame = function() {
    this.actionQueue.workEnd();
    this.entityManager.workEnd();
    this.spriteManager.workEnd();
    this.tileManager.workEnd();
    //this.uiManager.workEnd();
}

GameContext.prototype.saveGame = function() {
    const entityData = [];
    const mapCache = {};
    
    for (const key in this.mapLoader.mapCache) {
        const cacheState = this.mapLoader.mapCache[key];
        mapCache[key] = cacheState;
    }
    
    for (const [entityID, entity] of this.entityManager.entities) {
        const positionComponent = entity.components.getComponent(PositionComponent);
        const spriteComponent = entity.components.getComponent(SpriteComponent);

        entityData.push({
            type: entity.config.id,
            map: positionComponent.mapID,
            tileX: positionComponent.tileX,
            tileY: positionComponent.tileY,
            spriteType: spriteComponent.spriteType
        });
    }
    
    const formattedEntityData = entityData.map(data => 
        `{ "type": "${data.type}", "map": "${data.map}", "tileX": ${data.tileX}, "tileY": ${data.tileY}, "spriteType": "${data.spriteType}" }`
    ).join(',\n        ');
    
    const formattedMapCache = Object.entries(mapCache)
        .map(([key, value]) => `"${key}": ${value}`)
        .join(', ');
    
    const jsonString = 
`{
    "entityData": [
        ${formattedEntityData}
    ],
    "mapCache": { ${formattedMapCache} },
    "mapID": "${this.mapLoader.getActiveMapID()}",
    "playerData": null
}`;
    
    saveTemplateAsFile("save.json", jsonString);
}

GameContext.prototype.loadGame = async function(gameData) {
    const { entityData, mapID, mapCache, playerData } = gameData;
    
    for(const entity of entityData) {
        const { type, map, tileX, tileY } = entity;

        if(!mapCache[map]) {
            console.warn(`Error loading entity! Entity is on map (${map}) that was never cached! Continuing...`);
            continue;
        }

        this.createEntity(map, type, tileX, tileY);
    }

    this.mapLoader.mapCache = mapCache;

    await this.loadMap(mapID);
    this.parseMap(mapID, false);
}

GameContext.prototype.newGame = function() {
    //1. Creates a new game with all the cutscenes, ect.
    //2. FUN
}

GameContext.prototype.loadMap = async function(mapID) {
    await this.mapLoader.loadMap(mapID);

    const gameMap = this.mapLoader.getLoadedMap(mapID);
    const oldActiveMapID = this.mapLoader.getActiveMapID();

    if(!gameMap) {
        console.warn(`Error loading map! Returning...`);
        return false;
    }

    if(oldActiveMapID) {
        if(oldActiveMapID === mapID) {
            console.warn(`Map ${mapID} is already loaded and active! Returning...`);
            return false;
        }
        
        this.unloadProcess(mapID);
    }

    for(const connection of gameMap.connections) {
        const connectedMap = this.mapLoader.getLoadedMap(connection.id);
        connectedMap.loadTiles();
    }

    gameMap.loadTiles();
    return true;
}

GameContext.prototype.parseMap = function(mapID, ignoreEntities) {
    const gameMap = this.mapLoader.getLoadedMap(mapID);

    this.mapLoader.setActiveMap(mapID);
    this.actionQueue.workStart();
    this.renderer.loadViewport(gameMap.width, gameMap.height);

    if(gameMap.music) {
        this.client.musicPlayer.loadTrack(gameMap.music);
        this.client.musicPlayer.swapTrack(gameMap.music);
    }
    
    if(ignoreEntities) {
        return;
    }

    if(!this.mapLoader.mapCache[mapID]) {
        for(const entityConfig of gameMap.entities) {
            this.createEntity(mapID, entityConfig.type, entityConfig.tileX, entityConfig.tileY);
        }

        this.mapLoader.mapCache[mapID] = 1;
    }

    for(const connection of gameMap.connections) {
        if(!this.mapLoader.mapCache[connection.id]) {
            const connectedMap = this.mapLoader.getLoadedMap(connection.id);

            for(const entityConfig of connectedMap.entities) {
                this.createEntity(connection.id, entityConfig.type, entityConfig.tileX, entityConfig.tileY);
            }

            this.mapLoader.mapCache[connection.id] = 1;
        }
    }

    for(const [entityID, entity] of this.entityManager.entities) {
        const positionComponent = entity.components.getComponent(PositionComponent);

        if(positionComponent.mapID === mapID) {
            this.enableEntity(entityID);
            this.updateEntityEvents(entityID, 0, 0);
            continue;
        }

        for(const connection of gameMap.connections) {
            if(connection.id === positionComponent.mapID) {
                const offsetX = Camera.TILE_WIDTH * connection.startX;
                const offsetY = Camera.TILE_HEIGHT * connection.startY;

                this.enableEntity(entityID);
                this.updateEntityEvents(entityID, offsetX, offsetY);
                break;
            }
        }
    }
}

GameContext.prototype.unloadProcess = function(mapID) {
    const coreMap = this.mapLoader.getLoadedMap(mapID);
    const keptMaps = new Set([mapID]);
    const removedMaps = new Set();

    for(const connection of coreMap.connections) {
        keptMaps.add(connection.id);
    }

    for(const [mapID, map] of this.mapLoader.loadedMaps) {
        if(keptMaps.has(mapID)) {
            continue;
        }

        this.mapLoader.unloadMap(mapID);
        removedMaps.add(mapID);
    }

    for(const [entityID, entity] of this.entityManager.entities) {
        const positionComponent = entity.components.getComponent(PositionComponent);

        if(!removedMaps.has(positionComponent.mapID)) {
            continue;
        }

        this.disableEntity(entityID);
    }
}

GameContext.prototype.removeEntity = function(mapID, entityID) {
    const gameMap = this.mapLoader.getCachedMap(mapID);

    if(!gameMap || !entityID) {
        console.warn(`Entity deletion failed! Returning...`);
        return;
    }

    const entity = this.entityManager.getEntity(entityID);

    if(!entity) {
        console.warn(`Entity deletion failed! Returning...`);
        return;
    }

    const positionComponent = entity.components.getComponent(PositionComponent);
    const spriteComponent = entity.components.getComponent(SpriteComponent);

    this.entityManager.removeEntity(entityID);
    this.spriteManager.removeSprite(spriteComponent.spriteID);
}

GameContext.prototype.createEntity = function(mapID, entityTypeID, tileX, tileY) {
    if(!this.mapLoader.mapTypes[mapID] || tileX === undefined || tileY === undefined || !this.entityManager.entityTypes[entityTypeID]) {
        console.warn(`Entity creation failed! Returning...`);
        return;
    }

    const entityType = this.entityManager.entityTypes[entityTypeID];
    const entity = this.entityManager.createEntity(entityTypeID);
    const entityID = entity.getID();
    const positionVector = tileToPosition_corner(tileX, tileY);

    const positionComponent = new PositionComponent();
    const spriteComponent = new SpriteComponent();

    positionComponent.positionX = positionVector.x;
    positionComponent.positionY = positionVector.y;
    positionComponent.tileX = tileX;
    positionComponent.tileY = tileY;
    positionComponent.dimX = entityType.dimX;
    positionComponent.dimY = entityType.dimY;
    positionComponent.mapID = mapID;
    spriteComponent.spriteType = entityType.defaultSprite;

    entity.components.addComponent(positionComponent);
    entity.components.addComponent(spriteComponent);  

    return entityID;
}

GameContext.prototype.loadPlayer = function(entity) {
    const moveComponent = entity.components.getComponent(MoveComponent);

    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "w", (event, keyboard) => moveComponent.isMovingUp = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "a", (event, keyboard) => moveComponent.isMovingLeft = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "s", (event, keyboard) => moveComponent.isMovingDown = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "d", (event, keyboard) => moveComponent.isMovingRight = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "b", (event, keyboard) => {
        if(!moveComponent.hasBoots) {
            moveComponent.isRunning = !moveComponent.isRunning;
        }
    });
    
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED, "w", (event, keyboard) => moveComponent.isMovingUp = false);
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED, "a", (event, keyboard) => moveComponent.isMovingLeft = false);
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED, "s", (event, keyboard) => moveComponent.isMovingDown = false);
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED, "d", (event, keyboard) => moveComponent.isMovingRight = false);

    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "e", () => {
        const positionComponent = entity.components.getComponent(PositionComponent);
        const gameMap = this.mapLoader.getLoadedMap(positionComponent.mapID);

        if(!gameMap) {
            return;
        }

        const tileOffsetX = positionComponent.direction === PositionComponent.DIRECTION_EAST ? 1 : positionComponent.direction === PositionComponent.DIRECTION_WEST ? -1 : 0;
        const tileOffsetY = positionComponent.direction === PositionComponent.DIRECTION_SOUTH ? 1 : positionComponent.direction === PositionComponent.DIRECTION_NORTH ? -1 : 0;
        const interactionTile = gameMap.getTile(positionComponent.tileX + tileOffsetX, positionComponent.tileY + tileOffsetY);
        const entityIDs = Object.keys(interactionTile);

        if(entityIDs.length === 0) {
            return;
        }

        const interactedEntity = this.entityManager.getEntity(entityIDs[0]);
        interactedEntity.states.onEventEnter(this, entity);
    });

    this.player = entity;
}

GameContext.prototype.updateEntityEvents = function(entityID, mapOffsetX, mapOffsetY) {
    const entity = this.entityManager.getEntity(entityID);
    const positionComponent = entity.components.getComponent(PositionComponent);
    const spriteComponent = entity.components.getComponent(SpriteComponent);
    const sprite = this.spriteManager.getSprite(spriteComponent.spriteID);

    entity.events.unsubscribeAll("GAME_CONTEXT");

    entity.events.subscribe(Entity.EVENT_POSITION_UPDATE, "GAME_CONTEXT", (deltaX, deltaY) => {
        const positionX = positionComponent.positionX + deltaX;
        const positionY = positionComponent.positionY + deltaY;

        const spritePositionX = positionX + mapOffsetX;
        const spritePositionY = positionY + mapOffsetY;

        positionComponent.positionX = positionX;
        positionComponent.positionY = positionY;

        sprite.setPositionRaw(spritePositionX, spritePositionY);
    });

    entity.events.subscribe(Entity.EVENT_DIRECTION_UPDATE, "GAME_CONTEXT", direction => {
        positionComponent.direction = direction;
    });

    entity.events.subscribe(Entity.EVENT_SPRITE_UPDATE, "GAME_CONTEXT", (spriteData, config) => {
        MorphSystem.morphSprite(this, entity, spriteData, config);
    });

    entity.events.subscribe(Entity.EVENT_SOUND_PLAY, "GAME_CONTEXT", (soundList, volume) => {
        this.client.soundPlayer.playRandom(soundList, volume);
    });

    entity.events.emit(Entity.EVENT_POSITION_UPDATE, 0, 0);
}

GameContext.prototype.enableEntity = function(entityID) {
    const entity = this.entityManager.getEntity(entityID);

    if(!entity || this.entityManager.activeEntities.has(entityID)) {
        return;
    }

    this.entityManager.changeEntityState(entityID, true);

    const positionComponent = entity.components.getComponent(PositionComponent);
    const spriteComponent = entity.components.getComponent(SpriteComponent);

    const entityType = entity.config;
    const [spriteSetID, spriteAnimationID] = entityType.sprites[spriteComponent.spriteType];
    const sprite = this.spriteManager.createSprite(spriteSetID, true, spriteAnimationID);
    const spriteID = sprite.getID();

    spriteComponent.spriteID = spriteID;

    const gameMap = this.mapLoader.getCachedMap(positionComponent.mapID);
    gameMap.setPointers(positionComponent.tileX, positionComponent.tileY, positionComponent.dimX, positionComponent.dimY, entityID);
}

GameContext.prototype.disableEntity = function(entityID) {
    const entity = this.entityManager.getEntity(entityID);

    if(!entity || !this.entityManager.activeEntities.has(entityID)) {
        return;
    }

    const positionComponent = entity.components.getComponent(PositionComponent);
    const spriteComponent = entity.components.getComponent(SpriteComponent);

    this.entityManager.changeEntityState(entityID, false);
    this.spriteManager.removeSprite(spriteComponent.spriteID);

    spriteComponent.spriteID = null;

    entity.events.unsubscribeAll("GAME_CONTEXT");

    const gameMap = this.mapLoader.getCachedMap(positionComponent.mapID);
    gameMap.removePointers(positionComponent.tileX, positionComponent.tileY, positionComponent.dimX, positionComponent.dimY, entityID);
}

GameContext.prototype.getType = function(key) {
    if(!this.types[key]) {
        console.warn(`Types ${key} don't not exist! Returning null...`);
        return null;
    }

    return this.types[key];
}

GameContext.prototype.setupPlayer3D = function() {
    const PITCH_LIMIT = 20;
    this.player = new Entity("PLAYER", "PLAYER")

    const position3D = new Position3DComponent();
    const move3D = new Move3DComponent();

    this.player.components.addComponent(position3D);
    this.player.components.addComponent(move3D);

    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "Shift", (event, keyboard) => this.player.states.onEventEnter("SNEAK"));
    this.client.keyboard.subscribe(Keyboard.KEY_DOWN, " ", (event, keyboard) => this.player.states.onEventEnter("JUMP"));
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "w", (event, keyboard) => move3D.isMovingUp = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "a", (event, keyboard) => move3D.isMovingLeft = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "s", (event, keyboard) => move3D.isMovingDown = true);
    this.client.keyboard.subscribe(Keyboard.KEY_PRESSED, "d", (event, keyboard) => move3D.isMovingRight = true);

    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED,"w",  (event, keyboard) => move3D.isMovingUp = false);
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED,"a",  (event, keyboard) => move3D.isMovingLeft = false);
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED,"s",  (event, keyboard) => move3D.isMovingDown = false);
    this.client.keyboard.subscribe(Keyboard.KEY_RELEASED,"d",  (event, keyboard) => move3D.isMovingRight = false);

    this.client.cursor.events.subscribe(Cursor.MOVE, "PLAYER_LOOK", (event, cursor, deltaX, deltaY) => {
        if(!cursor.isLocked) {
            return;
        }

        position3D.rotation = normalizeAngle(position3D.rotation - deltaX / 16);
        position3D.pitch = normalizeValue(position3D.pitch - deltaY / 20, PITCH_LIMIT, -PITCH_LIMIT);
    });

    document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement === this.renderer.display.canvas) {
            this.client.cursor.isLocked = true;
            return;
        }

        this.client.cursor.isLocked = false;
    });

    this.player.states.addState(0, new PlayerDefault());
    this.player.states.addState(1, new PlayerJumpState());
    this.player.states.addState(2, new PlayerSneakState());
    this.player.states.setNextState(0);
}

GameContext.prototype.getViewportTile = function() {
    const gameMap = this.mapLoader.getActiveMap();

    if(!gameMap) {
        return null;
    }

    const viewportTilePosition = getViewportTile(this.client.cursor.position, this.renderer.viewportX, this.renderer.viewportY);
    const viewportTile = gameMap.getTile(viewportTilePosition.x, viewportTilePosition.y);

    return viewportTile;
}