// Always resolve base (unscaled) dimensions
function getBaseSize(displayObject) {
    if (displayObject.texture) {
        return {
            width: displayObject.texture.width,
            height: displayObject.texture.height,
        };
    }

    const bounds = displayObject.getLocalBounds();
    return {
        width: bounds.width,
        height: bounds.height,
    };
}

/**
 * Scale to a target width (preserves aspect ratio)
 */
export function sizeToWidth(displayObject, targetWidth) {
    const { width: baseW, height: baseH } = getBaseSize(displayObject);
    if (!baseW || !baseH) return null;

    const ratio = baseH / baseW;

    return {
        width: targetWidth,
        height: targetWidth * ratio,
    };
}

/**
 * Scale to a target height (preserves aspect ratio)
 */
export function sizeToHeight(displayObject, targetHeight) {
    const { width: baseW, height: baseH } = getBaseSize(displayObject);
    if (!baseW || !baseH) return null;

    const ratio = baseW / baseH;

    return {
        width: targetHeight * ratio,
        height: targetHeight,
    };
}

/**
 * Scale so the SMALLEST dimension matches targetSize
 * (fits inside a square, like CSS "contain")
 */
export function sizeByMinDimension(displayObject, targetSize) {
    const { width: baseW, height: baseH } = getBaseSize(displayObject);
    if (!baseW || !baseH) return null;

    const scale = targetSize / Math.min(baseW, baseH);

    return {
        width: baseW * scale,
        height: baseH * scale,
    };
}

/**
 * Scale so the LARGEST dimension matches targetSize
 * (fills a square, like CSS "cover")
 */
export function sizeByMaxDimension(displayObject, targetSize) {
    const { width: baseW, height: baseH } = getBaseSize(displayObject);
    if (!baseW || !baseH) return null;

    const scale = targetSize / Math.max(baseW, baseH);

    return {
        width: baseW * scale,
        height: baseH * scale,
    };
}

// Row layout (height is fixed → derive width)
export function sizeFromHeight(displayObject, targetHeight) {
    const baseW = displayObject.texture?.width ?? displayObject.width;
    const baseH = displayObject.texture?.height ?? displayObject.height;
    if (!baseW || !baseH) return null;

    const ratio = baseW / baseH;

    return {
        width: targetHeight * ratio,
        height: targetHeight,
    };
}

// Column layout (width is fixed → derive height)
export function sizeFromWidth(displayObject, targetWidth) {
    const baseW = displayObject.texture?.width ?? displayObject.width;
    const baseH = displayObject.texture?.height ?? displayObject.height;
    if (!baseW || !baseH) return null;

    const ratio = baseH / baseW;

    return {
        width: targetWidth,
        height: targetWidth * ratio,
    };
}

// Shrink asset with inset for frame buttons
export function sizeToWidthWithInset(displayObject, targetWidth, inset = 0) {
    const base = sizeToWidth(displayObject, targetWidth);
    if (!base) return null;

    return {
        width: base.width - inset * 2,
        height: base.height - inset * 2,
    };
}