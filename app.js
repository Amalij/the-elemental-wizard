// Game Setup & Global Configurations
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');

const crosshair = document.getElementById('crosshair');
const scoreVal = document.getElementById('score-val');
const spellVal = document.getElementById('spell-val');
const hpBarFill = document.getElementById('hp-bar-fill');

const startOverlay = document.getElementById('start-overlay');
const gameoverOverlay = document.getElementById('gameover-overlay');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreVal = document.getElementById('final-score-val');

// Game State Variables
let score = 0;
let health = 100;
let gameActive = false;
let enemies = [];
let particles = [];
let spells = [];

// NEW: Double Fist Burst Tracking Variables to End Game
let fistBurstCount = 0;
let lastBurstTime = 0;
const BURST_TIME_WINDOW = 1200; // Time window allowed between two bursts (1.2 seconds)
let lastFistState = false; 

// Audio Engine Context initialization (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Resize Canvas responsively to cover viewport
function resizeCanvas() {
    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- SOUND EFFECTS GENERATOR ---
function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'fireball') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
    } else if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.4);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(); osc.stop(audioCtx.currentTime + 0.4);
    }
}

// --- ENTITY CLASSES ---
class Enemy {
    constructor() {
        this.x = Math.random() * (canvasElement.width - 60) + 30;
        this.y = -50;
        this.radius = Math.random() * 15 + 20;
        // INSTANT SPEED: enemies will spawn with a speed that is influenced by the current score, making the game progressively more challenging as the player scores higher.
        this.speed = Math.random() * 3 + 4.5 + (score * 0.1); 
        this.color = `hsl(${Math.random() * 40 + 280}, 80%, 50%)`;
    }

    update() {
        this.y += this.speed; // Freeze logic removed to maintain constant enemy movement, ensuring that the game remains challenging and dynamic even when the player is performing certain actions (like holding a fist), rather than halting all enemy activity which could reduce the game's intensity and engagement.
    }

    draw() {
        canvasCtx.save();
        canvasCtx.shadowBlur = 15;
        canvasCtx.shadowColor = this.color;
        canvasCtx.fillStyle = this.color;
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.restore();
    }
}

class SpellProjectile {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 12;
        this.speed = 22; //  INSTANT SPEED: spells will travel at a high speed immediately upon being cast, allowing for quick and responsive gameplay where players can see the immediate impact of their actions, rather than having a delayed or slow-moving projectile which could reduce the sense of power and immediacy in casting spells.
        const angle = Math.atan2(targetY - y, targetX - x);
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
    }

    draw() {
        canvasCtx.save();
        canvasCtx.shadowBlur = 20;
        canvasCtx.shadowColor = '#ff5500';
        canvasCtx.fillStyle = '#ffcc00';
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3 + 1;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.alpha = 1;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }

    draw() {
        canvasCtx.save();
        canvasCtx.globalAlpha = this.alpha;
        canvasCtx.fillStyle = this.color;
        canvasCtx.beginPath();
        canvasCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        canvasCtx.fill();
        canvasCtx.restore();
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// --- MEDIAPIPE GESTURE PROCESSING LOGIC ---
function processHandGestures(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        crosshair.style.display = 'none';
        spellVal.textContent = 'NONE';
        spellVal.style.color = '#fff';
        spellVal.className = 'value';
        lastFistState = false;
        return;
    }

    const landmarks = results.multiHandLandmarks[0];

    const indexTip = landmarks[8];
    const crosshairX = (1 - indexTip.x) * window.innerWidth;
    const crosshairY = indexTip.y * window.innerHeight;

    crosshair.style.display = 'block';
    crosshair.style.left = `${crosshairX}px`;
    crosshair.style.top = `${crosshairY}px`;

    const thumbTip = landmarks[4];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];
    const ringTip = landmarks[16];
    const ringPip = landmarks[14];
    const pinkyTip = landmarks[20];
    const pinkyPip = landmarks[18];

    // 1. Fist Detection (For emergency stop)
    const isFist = (indexTip.y > indexPip.y) && 
                   (middleTip.y > middlePip.y) && 
                   (ringTip.y > ringPip.y) && 
                   (pinkyTip.y > pinkyPip.y);

    // 2. Open Palm Check
    const isOpenPalm = (indexTip.y < indexPip.y) && 
                       (middleTip.y < middlePip.y) && 
                       (ringTip.y < ringPip.y) && 
                       (pinkyTip.y < pinkyPip.y);

    // 3. Gun/Fireball Gesture
    const isGunShape = (indexTip.y < indexPip.y) && 
                       (middleTip.y > middlePip.y) && 
                       (ringTip.y > ringPip.y) && 
                       (pinkyTip.y > pinkyPip.y);

    if (isOpenPalm) {
        spellVal.textContent = 'SHIELD ACTIVE';
        spellVal.style.color = '#00f0ff';
        spellVal.className = 'value modern-glow';
        
        drawShield(crosshairX, crosshairY);
        
        enemies.forEach((enemy, index) => {
            const dist = Math.hypot(enemy.x - crosshairX, enemy.y - crosshairY);
            if (dist < enemy.radius + 80) {
                createExplosion(enemy.x, enemy.y, '#00f0ff');
                playSound('hit');
                enemies.splice(index, 1);
                score += 5;
            }
        });

    } else if (isGunShape) {
        spellVal.textContent = 'FIREBALL CHARGING';
        spellVal.style.color = '#ff5500';

        const distanceBetweenTips = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);

        if (distanceBetweenTips < 0.04) { 
            spells.push(new SpellProjectile(window.innerWidth / 2, window.innerHeight, crosshairX, crosshairY));
            playSound('fireball');
            createExplosion(crosshairX, crosshairY, '#ffcc00');
            thumbTip.x = 999; 
        }

    } else if (isFist) {
        spellVal.textContent = 'MANA CONCENTRATING';
        spellVal.style.color = '#7000ff';
        lastFistState = true; 
    } else {
        if (lastFistState) {
            handleFistBurst(); // Emergency Game Over  
            lastFistState = false;
        }
        spellVal.textContent = 'READY';
        spellVal.style.color = '#fff';
    }

    if (Math.random() < 0.4) {
        particles.push(new Particle(crosshairX, crosshairY, '#7000ff'));
    }
}

// Double Fist Burst Evaluator to Trigger Early Game Over ONLY (No Freeze)
function handleFistBurst() {
    const currentTime = Date.now();
    
    if (currentTime - lastBurstTime < BURST_TIME_WINDOW) {
        fistBurstCount++;
    } else {
        fistBurstCount = 1; 
    }
    
    lastBurstTime = currentTime;

    if (fistBurstCount === 2) {
        playSound('damage');
        triggerGameOver();
        fistBurstCount = 0; 
    }
}

function drawShield(x, y) {
    canvasCtx.save();
    canvasCtx.beginPath();
    canvasCtx.arc(x, y, 80, 0, Math.PI * 2);
    canvasCtx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    canvasCtx.lineWidth = 5;
    canvasCtx.shadowBlur = 20;
    canvasCtx.shadowColor = '#00f0ff';
    canvasCtx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    canvasCtx.fill();
    canvasCtx.stroke();
    canvasCtx.restore();
}

// --- PRINCIPAL GAME LOOP RUN ENGINE ---
function gameLoop() {
    if (!gameActive) return;

    canvasCtx.fillStyle = 'rgba(5, 3, 10, 0.25)';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    scoreVal.textContent = String(score).padStart(3, '0');
    hpBarFill.style.width = `${health}%`;

    // HIGH ACTIVE SPAWN RATE: start spawning enemies immediately with a high probability to create an intense and engaging gameplay experience right from the start, rather than having a slow buildup which could reduce player engagement and excitement in the early stages of the game.
    if (Math.random() < 0.08 && enemies.length < 20) { 
        enemies.push(new Enemy());
    }

    enemies.forEach((enemy, eIdx) => {
        enemy.update();
        enemy.draw();

        if (enemy.y - enemy.radius > canvasElement.height) {
            enemies.splice(eIdx, 1);
            health -= 15;
            playSound('damage');
            if (health <= 0) triggerGameOver();
        }
    });

    spells.forEach((spell, sIdx) => {
        spell.update();
        spell.draw();

        if (spell.x < 0 || spell.x > canvasElement.width || spell.y < 0 || spell.y > canvasElement.height) {
            spells.splice(sIdx, 1);
            return;
        }

        enemies.forEach((enemy, eIdx) => {
            const dist = Math.hypot(enemy.x - spell.x, enemy.y - spell.y);
            if (dist < enemy.radius + spell.radius) {
                createExplosion(enemy.x, enemy.y, enemy.color);
                playSound('hit');
                enemies.splice(eIdx, 1);
                spells.splice(sIdx, 1);
                score += 10;
            }
        });
    });

    particles.forEach((part, pIdx) => {
        part.update();
        part.draw();
        if (part.alpha <= 0) particles.splice(pIdx, 1);
    });

    requestAnimationFrame(gameLoop);
}

function triggerGameOver() {
    gameActive = false;
    crosshair.style.display = 'none';
    finalScoreVal.textContent = score;
    gameoverOverlay.classList.remove('hidden');

    if (videoElement.srcObject) {
        const stream = videoElement.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop()); 
        videoElement.srcObject = null;         
        console.log("Webcam safely deactivated.");
    }
}

function resetGame() {
    score = 0;
    health = 100;
    enemies = [];
    spells = [];
    particles = [];
    fistBurstCount = 0; 
    
    // START TRIGGER:  pressing the start button will immediately populate the game with a few enemies to create an engaging and action-packed experience right from the beginning, rather than starting with an empty screen which could reduce player excitement and immersion in the early moments of the game.
    enemies.push(new Enemy());
    enemies.push(new Enemy());
    enemies.push(new Enemy());

    if (!videoElement.srcObject) {
        camera.start()
            .then(() => {
                gameActive = true;
                gameoverOverlay.classList.add('hidden');
                startOverlay.classList.add('hidden');
                if (audioCtx.state === 'suspended') audioCtx.context.resume();
                gameLoop();
            })
            .catch(err => alert("Webcam access required to restart. Error: " + err));
    } else {
        gameActive = true;
        gameoverOverlay.classList.add('hidden');
        startOverlay.classList.add('hidden');
        if (audioCtx.state === 'suspended') audioCtx.resume();
        gameLoop();
    }
}

// --- MEDIAPIPE INITIALIZATION HANDLERS INTERFACES ---
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.65
});

hands.onResults(processHandGestures);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        if (gameActive) {
            await hands.send({ image: videoElement });
        }
    },
    width: 640,
    height: 480
});

startBtn.addEventListener('click', () => {
    camera.start()
        .then(() => resetGame())
        .catch(err => alert("Webcam access required. Error: " + err));
});

restartBtn.addEventListener('click', resetGame);