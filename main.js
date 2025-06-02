import { ResourceLoader } from "./source/resourceLoader.js";
import { GameContext } from "./gameContext.js";
import { ImageSheet } from "./source/graphics/imageSheet.js";

const gameContext = new GameContext();

ResourceLoader.loadConfigFiles("assets/files.json").then(async files => {
  await ResourceLoader.loadImages(files.sprites, ((key, image, config) => {
    const imageSheet = new ImageSheet(image, config);
    imageSheet.defineAnimations();
    imageSheet.defineFrames();
    files.sprites[key] = imageSheet;
  }));
  await ResourceLoader.loadImages(files.tiles, ((key, image, config) => {
    const imageSheet = new ImageSheet(image, config);
    imageSheet.defineAnimations();
    imageSheet.defineFrames();
    files.tiles[key] = imageSheet;
  }));
  return files;
}).then(async resources => {
  gameContext.loadResources(resources);
  gameContext.timer.start();
  gameContext.states.setNextState(GameContext.STATE_MAIN_MENU);
  console.log(gameContext);
});

/**
{"id": "door_1", "tileX": 7, "tileY": 1, "depth": 0.5, "type": 1, "state": 0, "shift": 0.3, "shiftSpeed": 0.4},
{"id": "door_2", "tileX": 1, "tileY": 6, "depth": 0.5, "type": 0, "state": 0, "shift": 0.5, "shiftSpeed": 0.2}
 */