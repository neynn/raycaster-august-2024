import { Camera } from "./camera/camera.js";
import { Vec2 } from "./math/vec2.js";

/**
 * Takes an angle in degrees and return it in radians.
 * 
 * @param {float} degree 
 * @returns {float} radian
 */
export const toRadian = function(degree) {
	return degree * Math.PI / 180;
}

/**
 * Takes an angle in radians and return it in degrees.
 * 
 * @param {float} radian 
 * @returns {float} degree
 */
export const toAngle = function(radian) {
	return radian * 180 / Math.PI;
}

/**
 * Normalizes an angle in degrees. Range: 0-360
 * 
 * @param {float} degree 
 * @returns {float} degree
 */
export const normalizeAngle = function(degree) {
	return ((degree % 360) + 360) % 360;
}

/**
 * 
 * @param {*} value 
 * @param {*} upperLimit 
 * @param {*} lowerLimit 
 */
export const normalizeValue = function(value, upperLimit, lowerLimit) {
	if(value > upperLimit) {
		return upperLimit;
	} else if (value < lowerLimit) {
		return lowerLimit;
	}

	return value;
}

/**
 * Generates a random number between minVal and maxVal.
 * 
 * @param {int} param_minVal 
 * @param {int} param_maxVal 
 * @returns {int}
 */
export const getRandomNumber = function(param_minVal, param_maxVal) {
	param_maxVal -= param_minVal;
	param_maxVal++;

	let val = Math.random() * param_maxVal;
	val = Math.trunc(val);
	val += param_minVal;

	return val;
}

export const getDistance = function(x1, y1, x2, y2) {
	return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

export const getDistanceVec = function(vec_1, vec_2) {
	return Math.sqrt((vec_1.x - vec_2.x) ** 2 + (vec_1.y - vec_2.y) ** 2);
}

export const getViewportTile = function(positionVector, viewportX, viewportY) {
  const renderWidth = Camera.TILE_WIDTH;
  const renderHeight = Camera.TILE_HEIGHT;

  const tileX = Math.floor((positionVector.x / Camera.SCALE + viewportX) / renderWidth);
  const tileY = Math.floor((positionVector.y / Camera.SCALE + viewportY) / renderHeight);
  
  return {
    "x": tileX,
    "y": tileY
  };
}

export const getViewportPosition = function(positionVector, viewportX, viewportY) {
    const positionX = positionVector.x / Camera.SCALE + viewportX;
    const positionY = positionVector.y / Camera.SCALE + viewportY;

    return {
      "x": positionX,
      "y": positionY
    }
}

export const saveTemplateAsFile = (filename, dataObjToWrite) => {
  const blob = new Blob([dataObjToWrite], { type: "text/json" });
  const link = document.createElement("a");

  link.download = filename;
  link.href = window.URL.createObjectURL(blob);
  link.dataset.downloadurl = ["text/json", link.download, link.href].join(":");

  const evt = new MouseEvent("click", {
      view: window,
      bubbles: true,
      cancelable: true,
  });

  link.dispatchEvent(evt);
  link.remove();
};

export const tileToPosition_center = function(tileX, tileY) {
  const renderWidth = Camera.TILE_WIDTH;
  const renderHeight = Camera.TILE_HEIGHT;

  const positionX = tileX * renderWidth + renderWidth / 2;
  const positionY = tileY * renderHeight + renderHeight / 2;

  const pixelPosition = new Vec2(positionX, positionY);

  return pixelPosition;
}

export const tileToPosition_corner = function(tileX, tileY) {
  const renderWidth = Camera.TILE_WIDTH;
  const renderHeight = Camera.TILE_HEIGHT;

  const positionX = tileX * renderWidth;
  const positionY = tileY * renderHeight;

  const pixelPosition = new Vec2(positionX, positionY);

  return pixelPosition;
}

export const positionToTile = function(positionX, positionY) {
  const renderWidth = Camera.TILE_WIDTH;
  const renderHeight = Camera.TILE_HEIGHT;

  const tileX = Math.trunc(positionX / renderWidth);
  const tileY = Math.trunc(positionY / renderHeight);

  return {
    "x": tileX,
    "y": tileY 
  }
}