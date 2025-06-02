export const Minimap = function() {
    this.anchorX = 0;
    this.anchorY = 0;
    this.viewportX = 0;
    this.viewportY = 0;
    this.viewportWidth = 0;
    this.viewportHeight = 0;
    this.scaleX = 0;
    this.scaleY = 0;
}

Minimap.TILE_WIDTH = 16;
Minimap.TILE_HEIGHT = 16;

/**
 * Sets the anchor of the minimap.
 * 
 * @param {int} anchorX x-Coordinate of the minimap.
 * @param {int} anchorY y-Coordinate of the minimap.
 */
Minimap.prototype.setAnchor = function(anchorX, anchorY) {
    this.anchorX = anchorX;
    this.anchorY = anchorY;
}

/**
 * 
 * @param {*} tileWidth 
 * @param {*} tileHeight 
 */
Minimap.prototype.setScale = function(tileWidth, tileHeight) {
    this.scaleX = Minimap.TILE_WIDTH / tileWidth;
    this.scaleY = Minimap.TILE_HEIGHT / tileHeight;
}

/**
 * Sets the dimensions of the minimap.
 * 
 * @param {int} tileWidth How many tiles are displayed on the x-Axis.
 * @param {int} tileHeight How many tiles are displayed on the y-Axis.
 */
Minimap.prototype.setViewport = function(tileWidth, tileHeight) {
    this.viewportX = 0;
    this.viewportY = 0;
    this.viewportWidth = tileWidth * Minimap.TILE_WIDTH;
    this.viewportHeight = tileHeight * Minimap.TILE_HEIGHT;
}

Minimap.prototype.drawPlayer = function(playerRay, roationRadians, context) {
    const rayLength = playerRay ? playerRay.distance : 0;
    const rayStartX = this.viewportWidth / 2;
    const rayStartY = this.viewportHeight / 2;
    const rayEndX = rayStartX + rayLength * this.scaleX * Math.cos(roationRadians);
    const rayEndY = rayStartY + rayLength * this.scaleY * Math.sin(roationRadians);

    context.fillStyle = "#eeeeee";
    context.fillRect(this.viewportWidth / 2 - 2, this.viewportHeight / 2 - 2, 4, 4);

    context.strokeStyle = "#ffff00";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(rayStartX, rayStartY);
    context.lineTo(rayEndX, rayEndY);
    context.stroke();
}

Minimap.prototype.draw = function(gameContext, minimapLayer, context) {
    const { spriteManager } = gameContext;
    const startX = Math.floor(this.viewportX / Minimap.TILE_WIDTH);
    const startY = Math.floor(this.viewportY / Minimap.TILE_HEIGHT);
    const endX = Math.floor((this.viewportX + this.viewportWidth) / Minimap.TILE_WIDTH);
    const endY = Math.floor((this.viewportY + this.viewportHeight) / Minimap.TILE_HEIGHT);

    context.fillStyle = "#222222";
    context.fillRect(this.anchorX, this.anchorY, this.viewportWidth, this.viewportHeight);

    for(let i = startY; i <= endY; i++) {
        const row = minimapLayer[i];
        const renderY = i * Minimap.TILE_HEIGHT - this.viewportY;

        if(!row) {
            continue;
        }

        for(let j = startX; j <= endX; j++) {
            const tile = row[j];
            const renderX = j * Minimap.TILE_WIDTH - this.viewportX;

            if(tile === undefined || tile === null) {
                continue;
            }

            const [tileSetID, tileSetAnimationID] = tile;
            const buffer = spriteManager.getTileBuffer(tileSetID, tileSetAnimationID);

            context.drawImage(
                buffer.bitmap, 
                0, 0, buffer.width, buffer.height,
                renderX, renderY, Minimap.TILE_WIDTH, Minimap.TILE_HEIGHT
            );
        }
    }

    context.fillStyle = "#000000";
    context.fillRect(this.viewportWidth, 0, Minimap.TILE_WIDTH, this.viewportHeight);
    context.fillRect(0, this.viewportHeight, this.viewportWidth + Minimap.TILE_WIDTH, Minimap.TILE_HEIGHT);
}

/**
 * Centers the minimaps viewport on a position.
 * 
 * @param {float} positionX 
 * @param {float} positionY 
 */
Minimap.prototype.center = function(positionX, positionY) {
    const targetX = positionX * this.scaleX - this.viewportWidth / 2;
    const targetY = positionY * this.scaleY - this.viewportHeight / 2;

    this.viewportX = targetX;
    this.viewportY = targetY;
}