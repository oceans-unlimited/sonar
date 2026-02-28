# Captain Sonar 2.0 (Digital Adaptation)

**Captain Sonar 2.0** is a digital reimagining of the board game *Captain Sonar*.  
This project explores real-time, networked submarine combat with asymmetric team roles, coordinated decision-making, and controlled interruptions to live play.

---

## 🎮 Design Concept

- **Game Map**:  
  A central server tracks two submarines on a **15×15 grid**, divided into **9 sectors (3×3 of 5×5 each)**.  

- **Submarine Roles / Panels**:  
  Each submarine has **four player control panels**, running as client apps:
  - **Captain (CONN)** → Master control; inputs direction (N/S/E/W) and manages pause/attack state.  
  - **Engineering (ENG)** → Resolves movement-related damage conditions and system integrity.  
  - **First Officer (XO)** → Manages charging of submarine systems (weapons, sonar, etc.).  
  - **Additional/Support** (future extension).  

- **Real-Time Flow**:  
  - Captain issues a move command → ENG + XO panels must respond before next move is allowed.  
  - ENG: resolves directional damage/repairs.  
  - XO: chooses a system to charge (only if chargeable).  
  - Once ENG & XO confirm, CONN panel may issue the next movement.  

- **Pause Actions**:  
  - CONN can pause to execute a single system action (e.g., fire torpedo).  
  - While paused, opposing sub is locked out of normal play.  
  - Optional **“return fire” mode**: both subs must confirm pause release before resuming live action.  
  - After action resolution, pause is disabled for the initiating (or responding) sub until at least one subsequent move.  

---

## 🖥️ Architecture

- **Server**:  
  - Runs on a **Raspberry Pi** or other local server.  
  - Hosts the **central game state** and logic.  
  - Serves a web client (PWA).  

- **Clients**:  
  - Phones, tablets, or laptops on the same local network.  
  - Connect to the server via **WebSockets** or **WebTransport** for real-time two-way communication.  
  - Installed as PWAs for app-like experience.  

- **Deployment Flow**:  
  1. Server runs with a static local IP.  
  2. Players navigate to the hosted URL to install the client app.  
  3. Client connects to local server and joins as a role (Captain, ENG, XO, etc.).  

---

## ⚙️ Gameplay Considerations

- **Manual vs Digital**: Preserve some of the tactile/manual fun of the original vs. automating flow.  
- **Action Resolution**:
  - Auto-resume after torpedo, or wait for both captains’ confirmation?  
  - Fire sequence: should second-to-fire action be queued or re-issued after resume?  
- **Randomization**:  
  - ENG panel could present randomized damage conditions for variety.  
  - Maps can be randomized within constraints.  

- **Main Challenges**:  
  - Enforcing **“Stop” states** that interrupt async real-time processes cleanly.  
  - Ensuring moves are properly registered and validated (not just spoken aloud).  
  - Coordinating countdown restarts and player confirmations.  

---

## 🚧 Roadmap

1. **MVP**:  
   - Central server + PWA clients (Captain, ENG, XO).  
   - Grid-based sub movement.  
   - Pause/stop enforcement with system action resolution.  

2. **Enhancements**:  
   - Randomized engineering challenges and maps.  
   - Optional return-fire mechanic.  
   - Expanded UI/UX polish for control panels.  

3. **Future Ideas**:  
   - Use a dedicated game framework (for learning and scalability).  
   - Support spectator/commander modes.  
   - AI-powered random events or adversaries.  

---

## 🚀 Getting Started

### 1. Start the Game Server
```bash
npm install
npm run dev
```

### 2. Start the Vite Client
```bash
# In a separate terminal
npm install -g vite (if not installed)
npm run vite:dev
```

### 3. Open in Browser
- **Direct Play**: `http://localhost:5173`
- **Director (Test) Mode**: `http://localhost:5173?mode=test`


---

## 🤝 Contributing

This is an experimental learning project — contributions, ideas, and playtest feedback are welcome.  
