# Game Message Engine Plan

## Overview
Implement a client-side message engine for displaying game-immersive status updates in a running log format. The system will process socket traffic, generate player-friendly messages, and render them in configurable layouts (toast overlay or docked window) with smooth animations and interactions.

## Architecture ('public/js/features/messages/')
Following the MapSystem pattern, the message system consists of:
- **MessagesController.js**: Core logic for state processing and message generation
- **MessagesRenderer.js**: PIXI-based rendering with responsive layouts
- **MessagesBehaviors.js**: Interaction handling (scrolling, inactivity)
- **MessagesSystem.js**: Facade for scene integration
- **messageVocabulary.js**: Constants mapping socket events to messages
- **messageBuilder.js**: Utility for constructing formatted messages

## Phase 1: Basic Message Log

### Message Vocabulary Framework (`public/js/features/messages/messageVocabulary.js`)
Structured mapping system for socket events to player-friendly messages:
- **MESSAGE_TYPES**: Enum for event types (MOVEMENT, DAMAGE, TORPEDO, etc.)
- **MESSAGE_VOCABULARY**: Object mapping types to templates with filters
- Designed for future database migration

### Message Builder Utility (`public/js/utils/messageUtils.js`)
Helper function `buildMessage(type, data, playerSub, playerRole)`:
- Applies submarine and role filters
- Replaces placeholders in message templates
- Returns formatted message object with metadata

### Messages Controller (`public/js/features/messages/MessagesController.js`)
- Listens to `socketManager.on('stateUpdate')`
- Compares state changes to detect events (movement, damage, etc.)
- Generates messages using vocabulary and builder
- Filters by submarine and role (initially disabled for debugging)

### Messages Renderer (`public/js/features/messages/MessagesRenderer.js`)
PIXI-based renderer with two layouts:
- **Toast**: Overlay style with aggressive fade (only 1-2 messages visible)
- **Docked**: Windowed style in control panel with full visibility

Features:
- Responsive dimensions based on screen size
- Orbitron font with color coding by priority
- Smooth message insertion animations
- Relative ordering (no timestamps)
- New messages appear at the bottom of the list
- Oldest messages scroll up

### Messages Behaviors (`public/js/features/messages/MessagesBehaviors.js`)
Handles user interactions:
- **Toast**: Click to expand container (2x height, full alpha)
- **Docked**: Mouse wheel and touch scrolling
- **Both**: 3-5 second inactivity timer → smooth scroll back to latest

### Messages System Facade (`public/js/features/messages/MessagesSystem.js`)
Provides clean API for scenes:
- Constructor: `new MessagesSystem(app, assets, config)`
- Init: `init({ playerSub, playerRole, layout, parentDimensions })`
- Methods: `show()`, `hide()`, `destroy()`
- Exposes `container` for scene mounting

## UI/UX Specifications

### Positioning & Dimensions
- **Anchor**: Bottom-left corner of parent container
- **Responsive**: Width/height scale with parent and mobile breakpoints
- **Toast**: Compact by default (50% height), expands on click
- **Docked**: Full available space in control panel

### Styling
- **Colors**: Follow uiStyle.js system colors
  - Normal: `Colors.text` (green)
  - Warning: `Colors.caution` (orange)
  - Critical: `Colors.danger` (red)
- **Font**: Orbitron, sizes 12-18px based on priority
- **Layout**: Relative ordering, no timestamps for space efficiency

### Behaviors
- **Toast Mode**:
  - Aggressive vertical fade (alpha drops to zero quickly)
  - Click expands container with increased alpha
  - Unobtrusive overlay design
- **Docked Mode**:
  - Gradual fade, alpha drops to zero near top of list
  - Scrollable with mouse/touch inside message area
  - Simple drag scrolling for mobile
- **Common**:
  - Scrolling removes alpha fade for maximum legibility
  - Inactivity timer (3-5s) → smooth scroll to latest
  - Smooth animations for all transitions

### Animations
- **Message Insertion**: Smooth upward slide (0.3s)
- **Container Expansion**: Ease-in-out tween (0.3s)
- **Scroll Back**: Smooth interpolation (0.5s)
- **Fade Effects**: Real-time alpha updates via ticker

## Implementation Roadmap

### Phase 1A: Core Infrastructure
1. Create messageVocabulary.js and messageBuilder.js
2. Implement MessagesRenderer.js with basic layouts
3. Build MessagesController.js for state processing
4. Create MessagesSystem.js facade
5. Integrate into featureTestScene.js for testing

### Phase 1B: Enhanced UI/UX
1. Add responsive sizing and positioning
2. Implement toast vs docked behaviors
3. Add smooth animations and effects
4. Refine color schemes and typography

### Phase 2: Advanced Features
1. Implement submarine and role filtering
2. Add message persistence/caching
3. Expand vocabulary to all socket events
4. Migrate to database structure

### Phase 3: Integration
1. Add to all role-based scenes
2. Test multiplayer message visibility
3. Optimize performance for high message volume
4. Add sound effects and haptic feedback

## Testing Strategy

### Test Harness (featureTestScene.js)
- Mock socket events to trigger message generation
- Test both toast and docked layouts
- Verify responsive behavior on different screen sizes
- Validate filtering and message formatting

### Integration Testing
- Add to Conn scene first
- Test with real game state changes
- Verify message visibility across roles/submarines
- Performance testing with message floods

## Technical Considerations

### Performance
- Limit max messages (10-20) to prevent memory issues
- Pool PIXI.Text objects for reuse
- Debounce rapid state changes
- Efficient fade calculations

### Accessibility
- High contrast colors for readability
- Keyboard navigation for scrolling
- Screen reader support for critical messages

### Future Extensibility
- Message templates designed for i18n
- Pluggable renderers for different styles
- Event-driven message system for modding

## Dependencies
- PIXI.js for rendering and animations
- uiStyle.js for consistent theming
- socketManager for real-time updates
- Existing MapSystem as architectural reference

## Risk Mitigation
- Start with minimal feature set (basic log)
- Progressive enhancement (add animations, filtering later)
- Fallback to simple text display if advanced features fail
- Comprehensive error handling for message processing

## Success Criteria
- Messages appear in real-time during gameplay
- Clear distinction between toast and docked modes
- Smooth animations and responsive design
- No performance impact on core gameplay
- Easy integration into existing scenes