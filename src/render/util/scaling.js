export function scaleToWidth(sprite, targetWidth) {
    // Scale to width while maintaining aspect ratio
    const scale = targetWidth / sprite.width;
    sprite.scale.set(scale);
}

export function scaleToHeight(sprite, targetHeight) {
    // Scale to height while maintaining aspect ratio
    // Use texture height if available to be independent of current sprite scale
    const baseHeight = sprite.texture ? sprite.texture.height : sprite.height;
    if (baseHeight === 0) return;
    const scale = targetHeight / baseHeight;
    sprite.scale.set(scale);
}

export function scaleByMinDimension(displayObject, targetSize) {
    // Scale to the maximum dimension while maintaining aspect ratio
    const bounds = displayObject.getLocalBounds();
    const smallest = Math.min(bounds.width, bounds.height);

    if (smallest === 0) return;

    const scale = targetSize / smallest;
    displayObject.scale.set(scale);
}
