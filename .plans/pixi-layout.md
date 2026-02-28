# PixiJS Layout (Documentation)

## Overview

  PixiJS Layout brings a powerful, declarative, and responsive layout model to the 2D rendering power of PixiJS. Built on top of Facebook's Yoga Flexbox layout engine, it allows developers to create dynamic UIs, responsive game interfaces, and fluid application components — all inside PixiJS.

  This guide covers the foundational principles behind the @pixi/layout system. It explains how layout is applied, how nodes are measured and styled, and how the system integrates flexibly into PixiJS projects.

## Concepts

### Yoga + Flexbox Model

  PixiJS Layout is powered by Yoga, a cross-platform layout engine that implements a subset of the CSS Flexbox specification. If you're familiar with how Flexbox works in HTML/CSS, you'll find many parallels in how layout rules work here.

  For example, key properties such as flexDirection, justifyContent, alignItems, gap, and flexWrap work as expected and follow the same logic as in web development.

  As a general rule, PixiJS Layout uses the same property names as CSS, however, the name is converted to camelCase. For example:

  | PixiJS Layout property          | CSS property                     |
  |---------------------------------|----------------------------------|
  | marginLeft, marginRight         | margin-left, margin-right        |
  | marginTop, marginBottom         | margin-top, margin-bottom        |
  | paddingLeft, paddingRight       | padding-left, padding-right      |
  | paddingTop, paddingBottom       | padding-top, padding-bottom      |
  | flexGrow, flexShrink            | flex-grow, flex-shrink           |
  | flexDirection, flexWrap         | flex-direction, flex-wrap        |
  | justifyContent, alignItems      | justify-content, align-items     |
  | alignContent, alignSelf         | align-content, align-self        |
  | backgroundColor, borderRadius   | background-color, border-radius  |

### Everything is a Box

  In PixiJS Layout, everything is conceptually a box. This reflects the CSS box model:

  Containers represent layout groups, analogous to HTML <div> elements. They do not render visual content directly, but define layout regions that arrange and position children.

  Leaf nodes such as Sprite, Graphics, Text, BitmapText, and TilingSprite are analogous to HTML <img> elements. These nodes are visual and content-bearing.

  Each node in the tree has a virtual layout box, and the position and size of that box is calculated by the layout engine. Visual elements can additionally scale or crop their internal content using style properties like objectFit and objectPosition.

  ```javascript
  const container = new Container({
      layout: {
          width: 500,
          height: 300,
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignContent: 'center',
      },
  });

  const sprite = new Sprite({ texture });
  sprite.layout = {
      width: 100,
      height: 100,
      objectFit: 'contain',
      objectPosition: 'center',
  };

  container.addChild(sprite);
  ```

### Opt-in Layout and Mixed Modes

  One of the defining strengths of @pixi/layout is its non-invasive, opt-in design. Layout logic is only applied when explicitly requested. This enables seamless integration into existing PixiJS projects and flexibility:

  - A parent will only apply layout to children that have layout enabled (layout property).
  - Children without layout are unaffected and behave just like standard PixiJS objects.
  - This makes the system safe by default and easy to adopt incrementally.

  ```javascript
  const container = new Container({
    layout: {
        width: 500,
        height: 500,
        justifyContent: 'center',
    },
  });

  const managed = new Sprite({ texture, layout: true });
  const unmanaged = new Sprite(texture); // not in layout

  container.addChild(managed, unmanaged);
  ```

### Layout Components & Re-exports

  Some styles are only supported on specialized container components:

  `backgroundColor`
  `borderRadius`
  `overflow`

  These styles are not available on standard PixiJS containers / leaf nodes. If you need them, use:

  `LayoutContainer`
  `LayoutSprite`
  `LayoutTilingSprite`
  `LayoutNineSlicePlane`
  `LayoutAnimatedSprite`
  `LayoutGifSprite`
  `LayoutGraphics`
  `LayoutText`
  `LayoutBitmapText`
  `LayoutHTMLText`
  `LayoutMesh`
  `LayoutPerspectiveMesh`
  `LayoutMeshPlane`
  `LayoutMeshRope`
  `LayoutMeshSimple`

  These custom components simply wrap a leaf node inside of a standard PixiJS Container and add additional graphics to draw backgrounds and borders.

  Additionally, all PixiJS leaf nodes are re-exported in `@pixi/layout` with the `layout` property applied after initialization. This is essential for correct intrinsic sizing.

  ```javascript
  import { LayoutContainer } from '@pixi/layout/components';
  import { Sprite, Graphics, Text } from '@pixi/layout/components';

  const container = new LayoutContainer({
    layout: {
        width: 500,
        height: 300,
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        backgroundColor: 0x000000,
        borderRadius: 10,
    },
  });

  const sprite = new Sprite({ texture, layout: true });
  const graphics = new Graphics({ layout: true });
  const text = new Text({ text: 'Hello World', layout: true });

  container.addChild(sprite, graphics, text);
  ```

  It is not necessary to use the re-exports, but it is recommended as this is the safest way to ensure that the layout property is assigned last in the constructor.

### Intrinsic Sizing

  By default, all leaf nodes use the `'intrinsic'` property for `width/height` to size a node based on its current PixiJS Bounds

  ```javascript
  sprite.layout = true;
  // This is equivalent to:
  sprite.layout = {
      width: 'intrinsic',
      height: 'intrinsic',
  };
  ```
  Intrinsic sizing does have a performance impact as we have to check the bounds of the node periodically. This is not a problem for most use cases, but if you are using a lot of nodes, you may want to consider using fixed sizes instead.

  ```javascript
  sprite.layout = {
    width: sprite.width,
    height: sprite.height,
  };
  ```
  You can combine intrinsic sizing with other layout styles:

  ```javascript
  text.layout = {
    width: 200,
    height: 'intrinsic',
    objectFit: 'scale-down',
  };
  ```

### Transform Origin and Layout Transforms

  The transformOrigin property defines the pivot point for rotation/scaling, but applies to the layout box, not the PixiJS element.

  This is conceptually similar to transform-origin in CSS. Instead of modifying a sprite’s anchor or pivot, you should use transformOrigin to ensure the layout and visual transforms remain synchronized.

  ```javascript
  sprite.layout = {
    width: 300,
    height: 300,
    objectFit: 'cover',
    transformOrigin: 'center',
  };

  sprite.rotation = 0.2; // rotates around center of the layout box
  ```
  
  `anchor` and `pivot` will be ignored when a PixiJS object has layout enabled.

### Position and Scale Normalization

  Regardless of how the content is fit inside the layout box (e.g. using objectFit: 'cover'), the layout box’s transform is always normalized:

  - `position.x` and `position.y` are always 0
  - `scale.x` and `scale.y` are always 1

  The actual transform is handled by internal layout calculations, so that display objects remain animatable and decoupled from layout logic.

  This normalization simplifies transforms:

  - You can apply rotation, alpha, or even scale animations without worrying about internal layout state.
  - All content layout happens inside the box, and the visual content is internally scaled and positioned via computed layout data.

  ```javascript
  const sprite = new Sprite({ texture });
  sprite.layout = {
      width: 300,
      height: 300,
      objectFit: 'cover',
      transformOrigin: 'center',
  };

  sprite.scale = 2; // scales as if the box was 600x600
  sprite.rotation = 0.2; // rotates around center of the layout box
  ```

## Layout API

  This guide explains how to use the library, including enabling layout on objects, configuring styles, and using runtime APIs to inspect or adjust layouts.

### Enabling/Disabling Layout

  To enable layout on a PixiJS object, set the `layout` property to `true` or an object with layout styles. This can be done in the constructor or later in your code.
  
  ```javascript
  import { Sprite, Container } from 'pixi.js';

  const container = new Container({
    layout: {
      width: 500,
      height: 300,
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignContent: 'center',
    },
  });

  const sprite = new Sprite({ texture });
  sprite.layout = {
    width: 100,
    height: 100,
    objectFit: 'cover',
  };

  container.addChild(sprite);
  ```

  You can also enable/disable layout on existing objects.

  ```javascript
  sprite.layout = true; // enable layout
  sprite.layout = false; // disable layout
  sprite.layout = null; // disable layout
  ```

### Visibility
  When a layout-enabled object is not visible, it will not be included in the layout calculations. Setting `visible` to `false` means the object will not affect the layout of its parent or siblings.

  ```javascript
  sprite.visible = false; // sprite will not be included in layout
  
  sprite.visible = true; // sprite will be included in layout
  ```

### Updating Styles
  You can update the layout styles of an object at any time. The layout system will automatically recalculate the layout when the styles change. 
  
  ```javascript
  sprite.layout = {
    width: 200,
    height: 200,
    objectFit: 'contain',
  };

  setTimeout(() => {
    sprite.layout = {
        width: 300,
        objectFit: 'cover',
    };
  }, 1000);
  ```
  
  You do not need to provide a full layout object each time — only the properties you want to change. The layout system will merge the new styles with the existing ones.

### Default Styles

  There is a set of default styles that are applied to all layout-enabled objects based on their type (container or leaf node). These default styles can be overridden by updating the `Layout.defaultStyles` property.

  ```javascript
  import { Layout } from '@pixi/layout';

  Layout.defaultStyle = {
    leaf: {
        width: 'intrinsic',
        height: 'intrinsic',
    },
    container: {
        width: 'auto',
        height: 'auto',
    },
    shared: {
        transformOrigin: '50%',
        objectPosition: 'center',
        flexShrink: 1,
        flexDirection: 'row',
        alignContent: 'stretch',
        flexWrap: 'nowrap',
        overflow: 'visible',
    },
  };
  ```
  Above are the current default styles. You can modify them to suit your needs.

### Runtime API

  When layout is active on an object, several runtime APIs are available to inspect or adjust the layout. These APIs can be used to get the current layout state or force a layout update.

### forceUpdate

  Forces the `layoutSystem` to recalculate immediately during the next frame. Useful if external modifications might have changed object bounds.

  ```javascript
  sprite.layoutSystem.forceUpdate();
  ```
  While the layout system does try to track changes, it may not always be able to detect them. This is especially true for changes made outside of the layout system.

### computedLayout

  Returns the raw layout engine result, including logical layout information such as `left`, `top`, `right`, `bottom`, `width`, and `height`. These values are computed bythe Yoga engine and define the layout box of the object.

  ```javascript
  const layoutBox = sprite.layout.computedLayout;
  console.log(layoutBox.left, layoutBox.top, layoutBox.width, layoutBox.height);
  ```

### computedPixiLayout

  Returns PixiJS-specific adjustments needed for rendering.

  ```javascript
  const pixiLayout = sprite.layout.computedPixiLayout;
  console.log(pixiLayout.offsetX, pixiLayout.offsetY, pixiLayout.scaleX, pixiLayout.scaleY);
  ```
  This includes PixiJS-specific adjustments such as:

  - `x`, `y`: The top-left corner of the layout box in PixiJS coordinates.
  - `offsetX`, `offsetY`: The offset from the top-left corner of the layout box to the top-left corner of the object.
  - `scaleX`, `scaleY`: The scale factor to apply when using `objectFit`.
  - `originX`, `originY`: The origin point of the layout box based on the `transformOrigin` property.

These values are used to adjust the position and scale of the object within the layout box.

### Real Position/Scale
  Properties such as `realX`, `realY`, `realScaleX`, and `realScaleY` return the actual position and scale of the PixiJS object after layout calculations have been applied.

  Unlike `position.x`, `position.y`, `scale.x`, and `scale.y`, which are always normalised to x/y `0,0` and scale `1,1` respectively, these properties reflect the actual position and scale of the object in the layout.

  ```javascript
  sprite.layout.realX;
  sprite.layout.realY;

  sprite.layout.realScaleX;
  sprite.layout.realScaleY;
  ```

### Layout events

  Each layout-enabled object emits a `layout` event when the layout is updated. This event provides the updated `Layout` object with the new layout state.

  ```javascript
  sprite.on('layout', (event) => {
    console.log('Layout updated:', event);
  });

  // or using the callback
  sprite.onLayout = (event) => {
    console.log('Layout updated:', event);
  };
  ```
  Using `computedLayout` and `computedPixiLayout`, you can inspect the new layout state of the object and apply any custom logic as needed.

  ```javascript
  sprite.on('layout', (event) => {
    const layoutBox = event.computedLayout;
    background.width = layoutBox.width;
    background.height = layoutBox.height;
    background.x = layoutBox.left;
    background.y = layoutBox.top;
  });
```

### LayoutSystem API
- Layout
  - Main entry point for layout configuration
  - Attaches to DisplayObject via layout property
  - Controls sizing, positioning, and flex behavior

- LayoutContent
  - Children containers
  - Text content
  - Nested layouts

- Layout Modes
  - Container mode (flexbox parent)
  - Leaf mode (sized element without children layout)

- Layout Events
  - layout:resize
  - layout:updated

- Layout Methods
  - recalc()
  - updateStyles()
  - getComputedLayout()

- Computed Layout
  - left, top, width, height
  - margin, border, padding
  - content area
  - scroll area (when overflow)

- Layout Tree Traversal
  - Root → children → nested
  - Yoga node mapping
  - Dirty flag propagation

### Styles
- Sizing and Dimensions
- Spacing (Margins, Padding and Borders)
- Flexbox Layout
- Background
- Object Fitting and Alignment
- Text Layout
- Overflow and Scrolling
- Debug

## Root Level Layout

  For the layout system to function effectively, it requires a "Root" node. This node serves as the entry point for all layout calculations. In a PixiJS application, the `app.stage` is typically the best candidate for the root layout.

### Configuring the Stage as Root

  When using `app.stage` as a root, you must provide it with explicit dimensions so that Yoga can calculate the relative positions and sizes of its children. Using absolute pixel values (e.g., from `window.innerWidth`) is recommended for the top-most node.

  ```javascript
  // inside your async main function
  const app = new Application();
  await app.init({ resizeTo: window });

  // 1. Initialize the Stage layout
  app.stage.layout = {
    width: window.innerWidth,
    height: window.innerHeight,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  // 2. Handle Resize
  window.addEventListener('resize', () => {
    app.stage.layout = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  });
  ```

### Key Behaviors & Gotchas

  1.  **Percentage-based Sizing**: Percentages (e.g., `width: '100%'`) only work if the parent node also has a layout and a defined size. For the very first node in your tree (the root), using pixels is often safer to ensure the engine has a solid base to calculate from.
  2.  **Explicit Layout Assignment**: In some environments, setting `layout` during the constructor of a `Container` might not trigger the mixin correctly if the library hasn't patched the object yet. It is often more reliable to set `.layout` *after* the object has been instantiated.
  3.  **Layout Order Matters**: If you set the layout on a parent *after* children have already been added with their own layouts, you may need to call `layoutSystem.update(parent)` or set the layout property again to trigger a full tree recalculation.
  4.  **Mixing Managed and Unmanaged**: Standard PixiJS `Container` objects can be used as layout nodes. A container becomes a "managed node" the moment you assign an object to its `.layout` property. You can also simply use the shorthand `.layout = true` to enable layout with default settings.

  5.  **Intrinsic Sizing**: If a child needs to size itself based on its content (like a Sprite or Text), ensure you use `width: 'intrinsic'` or `layout: true`.

### Boiling it Down: Standard Initializer

  ```javascript
  import { Container } from 'pixi.js';

  export function createScene() {
      // Create the main container
      const sceneContent = new Container();

      // Configure layout AFTER construction
      sceneContent.layout = {
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20
      };

      return sceneContent;
  }
  ```