# 🔮 The Elemental Wizard (Magic Caster)

An immersive, motion-controlled web game where you step into the shoes of an ancient wizard. Instead of using a traditional keyboard or mouse, you cast elemental spells using real-time **Hand Gestures** detected via your webcam!

Built natively for browsers using **HTML5 Canvas**, **Vanilla JavaScript**, and powered by Google's cutting-edge **MediaPipe Hands** library.

---

## 🎮 Game Concept & Spells

Bring your hand in front of the camera to activate your magical powers. Control the crosshair with your index finger and cast the following spells:

* **🔥 Fireball Spell:** Form a gun shape with your hand (extend Thumb & Index finger only). **Pinch them together** to shoot fireballs at incoming monsters!
* **🛡️ Shield Spell:** Open your entire palm flat. Move it around to create an arcane energy shield that instantly deflects and vaporizes enemies.
* **❄️ Freeze Spell:** Make a tight fist, then **burst it open quickly** to freeze time and halt all enemies for 3 seconds.
* **❌ Instant Game Over:** Want to stop playing immediately? **Burst your fist twice quickly** to instantly end the game session.

---

## 🛠️ Technical Magic (How it Works)

No heavy, server-side AI models needed! The game runs completely on the client side inside the browser.

* **Hand Tracking:** MediaPipe Hands extracts 21 structural 3D landmarks of your hand at 60 FPS.
* **Gesture Recognition:** Mathematical logic calculates the distances and relative positions between specific finger joints (e.g., fingertips collapsing below PIP joints triggers a *Fist* state).
* **Graphics Engine:** HTML5 Canvas handles smooth object rendering, projectile trajectories, and high-performance particle explosions.
* **Audio Engine:** Built using the native **Web Audio API** to generate synthesizer-based sound effects (*Whoosh, Blast, Damage*) without loading heavy external `.mp3` audio assets.
* **Smart Optimization:** Automatically terminates camera tracks upon Game Over to save user battery life and protect privacy.

---

## 💻 Tech Stack Used

* **Frontend:** HTML5, Modern CSS3 (Cyberpunk/Neon HUD Styling)
* **Logic:** Vanilla JavaScript (ES6)
* **AI/Vision:** Google MediaPipe Hands CDN
* **Audio:** Web Audio API

---

## 🚀 How to Run Locally

1. **Clone or Download** this repository.
2. Ensure all 3 core files (`index.html`, `style.css`, `app.js`) are in the same directory.
3. Open the project using a local development server (e.g., VS Code **Live Server** extension).
   > ⚠️ **Note:** Opening `index.html` directly via double-click in the browser may block camera permissions due to modern browser security policies regarding MediaPipe CDNs. Always use a local server!
4. Grant Camera permissions when prompted, click **"AWAKEN POWERS"**, and enjoy!

---

## 📂 Project Structure

```text
├── index.html       # Game UI, HUD indicators, and MediaPipe CDN links
├── style.css        # Neon glowing aesthetic designs & floating mirrored camera frame
├── app.js           # Core Game Loop, Gesture Math, Audio Synthesizer, and Collision logic
└── README.md        # Documentation (You are here!)
