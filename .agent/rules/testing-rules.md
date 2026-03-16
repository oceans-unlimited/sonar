---
trigger: always_on
---

- Don't run automated browser tests via the Chrome plugin
- User will run all browser based tests manually
- For scenes and features, build an appropreate test scene and corrolated debug scenario using Director mode. Scenarios should include a 'pristine' state for basic layout and rendering. Follow-on scenarios should focus on one major functional blocks or milestone for the feature or scene. See `.plans/TEST_HARNESS_ARCHITECTURE.md` for details.

- scene functions are detailed in the following role-specific documents: `xo.md`, `engineer.md`, and `captain.md`. These are all located in `.plans/`