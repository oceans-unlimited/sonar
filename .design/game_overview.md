# Game Overview — Captain Sonar 2.0 (Planning Doc)

This document outlines the design concept for a digital adaptation of *Captain Sonar*, focused on real-time submarine combat with coordinated team roles and controlled interruptions to gameplay. Note: this is not a development guide, but rather a high-level overview of the game's ,mechanics, flow, and rules. 

---

## 🎯 Core Concept

- **Central Game Control**  
  A server (e.g., Raspberry Pi) maintains the **shared game state**, tracking position and status of two opposing submarines.  
  - Map: **15 rows × 15 columns**, divided into **9 sectors** (3×3 grid of 5×5 squares).  
  - Both submarines interact with the map via **four real-time control panels** per team.  
  - Certain actions trigger an **interrupt state**, temporarily locking out movement for both teams.  

---

## 🕹️ Control Panels

Each submarine uses four player panels, connected to the central game server:

- **Captain (co)**  
  - Master control panel.  
  - Issues movement commands (N/S/E/W).  
  - Manages paused/attack/surfaced state.  

- **Engineering (eng)**  
  - Resolves movement-related conditions.  
  - Handles **damage checks** or clearing based on captain’s chosen direction.  

- **First Officer (xo)**  
  - Manages **system charging**.  
  - Only partially charged systems can be selected.  
  - No action required if all systems are fully charged.  

- **SONAR (sonar)**  
  - Detection and tracking of enemy submarine.

---

## 🔄 Example Turn Flow

1. **Captain** selects **North (N)**.  Further movement is locked.
2. **Engineering Panel**:  
   - Displays corresponding **damage/clear check** for “N”.  
   - Player assigns a system to resolve the check. That system (and related subsystems) is locked.  
  **XO Panel** (simultaneously with ENG):  
   - Prompts player to choose a **system to charge**. 
   - Only valid if systems are not fully charged. If all systems are charged, no action is required. 
3. Once both ENG and XO confirm → 
   - **Captain panel is unlocked** for the next move.  

---

## ⏸️ Pause & System Actions

- **Manual Pause Toggle** (on Captain panel):  
  - Freezes all inputs for **both submarines**.  
  - All players ready-up to resume the game.   

- **Resolution Rules**:  
  - If the opposing submarine is not destroyed, no further system actions can be taken during this pause.  
  - Game resumes to live action after the system action resolves.  

---

## 🚧 Design Challenges

- Enforcing “stop” states cleanly in asynchronous, real-time play.  
- Confirming that moves are **registered by the system**, not just spoken aloud.  
- Balancing pause/response flow for fairness.  
- Avoiding predictable movement patterns — **randomization** may be added to:  
  - Engineering challenges.  
  - Map layouts (within constraints).  

---

## 📌 Notes

- Initial version should prioritize **core loop**:  
  - Movement → ENG/XO validation → Pause + system action → Resume play.  
- Randomization, return-fire, and additional role mechanics can be layered in later.  

---
