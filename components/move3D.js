export const Move3DComponent = function() {
    this.isMovingUp = false;
    this.isMovingDown = false;
    this.isMovingLeft = false;
    this.isMovingRight = false;
    this.isJumping = false;
    this.isCrouching = false;
    this.isFalling = false;

    this.speed = 128;
    this.acceleration = 64 * 2;
    this.acceleration_default = 64 * 2;

    this.sneakSpeed = 64;
    this.walkSpeed = 128;
    this.runSpeed = 256;

    this.stepHeight = 0.25;
}