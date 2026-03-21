import { Color } from 'pixi.js';

/**
 * Text Edit Behavior
 * Attaches interactive text editing to a Pixi.Text object via a DOM input overlay.
 * 
 * Boundary:
 * - Renderers: Create the Pixi Text.
 * - Behavior: Handles pointer interaction, mechanical DOM state (input visibility, focus).
 * - Controllers: Respond to confirmed changes.
 * 
 * @param {import('pixi.js').Text} textObject - The Pixi Text element to make editable.
 * @param {object} options - Configuration options.
 * @param {function} options.onConfirm - Callback when editing is completed (Enter or Blur).
 * @param {number} [options.maxLength=16] - Maximum characters.
 */
export function attachTextEditBehavior(textObject, { onConfirm, maxLength = 16 } = {}) {
    if (!textObject) return null;

    // 1. Configure Pixi interaction
    textObject.eventMode = 'static';
    textObject.cursor = 'pointer';

    // 2. Create DOM elements
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = maxLength;
    input.style.position = 'absolute';
    input.style.display = 'none';
    input.style.zIndex = '1000';
    
    // Attempt to match style
    input.style.fontFamily = textObject.style.fontFamily;
    input.style.fontSize = `${textObject.style.fontSize}px`;
    
    // Safe color conversion
    try {
        const pixiColor = new Color(textObject.style.fill);
        input.style.color = pixiColor.toRgbaString();
    } catch (e) {
        input.style.color = '#ffffff';
    }

    input.style.backgroundColor = 'rgba(0,0,0,0.8)';
    input.style.border = '1px solid #ffffff';
    input.style.padding = '2px 5px';
    input.style.outline = 'none';
    
    document.body.appendChild(input);

    let isEditing = false;

    // 3. Mechanical state handlers
    const startEditing = (event) => {
        if (isEditing) return;
        isEditing = true;

        // Mask the Pixi text
        textObject.visible = false;

        // Position over the text object
        const bounds = textObject.getGlobalPosition();
        const scale = textObject.worldTransform.a; // Global scale
        
        input.style.display = 'block';
        input.style.top = `${bounds.y}px`;
        input.style.left = `${bounds.x}px`;
        input.style.width = `${Math.max(100, textObject.width)}px`;
        input.value = textObject.text;
        
        input.focus();
        input.select();
    };

    const stopEditing = (save = true) => {
        if (!isEditing) return;
        isEditing = false;

        const newVal = input.value.trim();
        input.style.display = 'none';
        textObject.visible = true;

        if (save && onConfirm) {
            onConfirm(newVal);
        }
    };

    // 4. Bind listeners
    textObject.on('pointertap', startEditing);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            stopEditing(true);
        } else if (e.key === 'Escape') {
            stopEditing(false);
        }
    });

    input.addEventListener('blur', () => {
        stopEditing(true);
    });

    // Lifecycle: Ensure DOM elements are removed when Pixi object is destroyed
    textObject.on('destroyed', () => {
        if (input.parentNode) {
            input.parentNode.removeChild(input);
        }
    });

    return {
        setEnabled: (enabled) => {
            textObject.interactive = enabled;
            if (!enabled && isEditing) stopEditing(false);
        },
        destroy: () => {
            textObject.off('pointertap', startEditing);
            stopEditing(false);
            if (input.parentNode) input.parentNode.removeChild(input);
        }
    };
}
