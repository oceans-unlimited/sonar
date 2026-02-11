# Color Control System: Analysis & Implementation Plan

## 1. Objective
Establish a flexible, modular, and simple system to update colors on PixiJS entities (`Sprite`, `Graphics`, `Container`) with support for:
- **Unified Interface**: A single way to set color regardless of object type.
- **Cascading Updates**: Applying color changes to a container that propagate to specific children.
- **Selective Targeting**: Filtering which children receive color updates.

## 2. Technical Analysis: PixiJS Color Primitives

### The `tint` Property
In PixiJS v8, the most performant way to recolor objects without regenerating geometry or textures is the `tint` property (`0xFFFFFF`).
- **Sprites**: Multiplies the texture color.
- **Graphics**: Multiplies the fill/stroke color.
- **Containers**: Do *not* have a visual `tint` property themselves; they act as groups.

### Updating `Graphics`
While `Graphics` are drawn with specific fills (e.g., `.fill('red')`), using `.tint = 0x0000FF` on a red circle will result in a black circle (mathematical multiplication).
*   **Best Practice**: Draw Graphics in **White** (`0xFFFFFF`) if they are intended to be fully dynamic via tint.
*   **Alternative**: Clear and redraw (Expensive).
*   **Selected Approach**: Use `tint` on White/Greyscale graphics for dynamic coloring.

## 3. Proposed Solution: The `ColorOps` Module

We will extend the pattern established in `visuals.js` into a more robust `ColorOps` utility. This keeps logic out of the `Scene` and `Components` classes, adhering to the functional/compositional architecture.

### 3.1. Unified Setter (`setColor`)
A smart function that invokes the correct color application method based on the object type.

```javascript
// src/render/util/colorOps.js

export const setColor = (target, color) => {
    if (!target) return;

    // 1. Component Protocol (Custom Methods)
    if (typeof target.setTint === 'function') {
        target.setTint(color);
        return;
    }

    // 2. Standard PixiJS Visuals (Sprite, Graphics, Text)
    if ('tint' in target) {
        target.tint = color;
    }
    
    // 3. Fallback/Special Cases
    if (target.background && 'tint' in target.background) {
        target.background.tint = color;
    }
}
```

### 3.2. Component Specific Methods
To handle complex objects (like Panels or Blocks), components should implement their own color methods that `setColor` can call.

- **`Button`**: `setTint(color)` updates both the background and frame.
- **`ButtonBlock`**: `setTint(color)` uses `cascadeColor` to update its `blockLabel` and `headerLine`.
- **`Panel`**: 
    - `setTint(color)`: Updates the `backgroundColor` layout property.
    - `setBorderColor(color)`: Updates the `borderColor` layout property.

### 3.4. Cascading Control (`cascadeColor`)
A recursive iterator to apply color to children based on a filter (label matching).

```javascript
export const cascadeColor = (container, color, matcher = null) => {
    if (!container?.children) return;

    container.children.forEach(child => {
        let isMatch = false;
        
        if (!matcher) {
            isMatch = true;
        } else if (typeof matcher === 'string') {
            isMatch = child.label === matcher;
        } else if (typeof matcher === 'function') {
            isMatch = matcher(child);
        }

        if (isMatch) {
            setColor(child, color);
        }

        cascadeColor(child, color, matcher);
    });
};
```

## 4. Implementation Steps

### Step 1: Standardize `Graphics` and `Text` Creation
Ensure all reusable `Graphics` and `Text` used for UI are drawn in `0xFFFFFF` (White) so `tint` or `fill` works predictably via multiplication.

### Step 2: Update Components
- **Button**: Implement `setTint(color)`.
- **ButtonBlock**: Implement `setTint(color)` using `cascadeColor` for header elements.
- **Panel**: Implement `setTint(color)` and `setBorderColor(color)` for layout updates.

...

## 7. Implementation Guide: Visual Registration & Control

To enable controller-driven visual updates for non-interactive elements:

### 1. Scene: Register the Visual
Assign unique IDs to your panels and blocks.

```javascript
// 1. Create a Panel
const myPanel = new Panel('control', { 
    label: 'main_panel',
    borderColor: Colors.text 
});
controller.registerVisual('main_panel', myPanel);

// 2. Create a ButtonBlock
const myBlock = new ButtonBlock(buttons, 'horizontal', { 
    label: 'systems_block',
    header: true,
    heading: 'Systems'
});
controller.registerVisual('systems_block', myBlock);
```

### 2. Controller: Targeting Examples
In your controller, use the registered IDs to apply colors.

#### Targeting a Panel's Background
```javascript
const panel = this.visuals['main_panel'];
setColor(panel, Colors.warning); // Calls panel.setTint()
```

#### Targeting a Panel's Border
```javascript
const panel = this.visuals['main_panel'];
if (panel.setBorderColor) {
    panel.setBorderColor(Colors.danger);
}
```

#### Targeting a ButtonBlock's Header
```javascript
const block = this.visuals['systems_block'];
setColor(block, Colors.success); // Calls block.setTint() which cascades
```

#### Selective Targeting (e.g. specific buttons inside a block)
```javascript
const block = this.visuals['systems_block'];
// Color all buttons with the label 'reactor_btn' red
cascadeColor(block, Colors.danger, 'reactor_btn');
```

