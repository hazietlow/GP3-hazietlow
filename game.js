import * as T from "./CS559-Three/build/three.module.js"; // Use "three" if using importmap, or the full path
import * as ProtoModels from './models-proto.js';
import * as FullModels from './models-full.js';

// --- Configuration & State ---
let scene, camera, renderer;
let snake = [];
let food;
let floor;
let direction = new T.Vector3(1, 0, 0);
let nextDirection = new T.Vector3(1, 0, 0);
let gameActive = false;
let score = 0;
let lastMoveTime = 0;
const moveInterval = 150; 
let boardSize = 11;
const diffButtons = document.querySelectorAll('.diff-btn');
const gameHud = document.getElementById('ui-layer');

diffButtons.forEach(btn => {
    btn.onclick = () => {
        // Remove highlight from all, add to clicked
        diffButtons.forEach(b => b.style.background = "rgba(255,255,255,0.2)");
        btn.style.background = "#2196F3";
        
        // Update the board size variable
        boardSize = parseInt(btn.getAttribute('data-size'));
    };
});

// UI Elements
const modeToggle = document.getElementById('modeToggle');
const startBtn = document.getElementById('start-btn');
const homeScreen = document.getElementById('home-screen');
const scoreDisplay = document.getElementById('score');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const gameWinScreen = document.getElementById('game-win-screen');
const winRestartBtn = document.getElementById('win-restart-btn');
const maxScore = boardSize * boardSize - 1;


function init() {
    scene = new T.Scene();
    scene.background = new T.Color(0x111111);

    const aspect = (window.innerWidth) / (window.innerHeight);
    
    // FIX 1: Position Camera to look DOWN at the board from an angle
    camera = new T.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, boardSize + 70, boardSize + 70); 
    camera.lookAt(0, 0, 0);

    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // FIX 2: Correct Lighting
    const ambientLight = new T.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new T.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    setupControls();
    animate(0);

    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
    
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    
        renderer.setSize(width, height);
    });
}

// FIX 3: This function is local, so we call it directly later
function createFloor() {
    const group = new T.Group();

    const geometry = new T.PlaneGeometry(boardSize, boardSize);
    const material = new T.MeshStandardMaterial({ color: 0x1a1a1a });
    const mesh = new T.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);

    // boardSize as the first param (size) and second (divisions) 
    // ensures each grid square is exactly 1x1 unit.
    const grid = new T.GridHelper(boardSize, boardSize, 0x00ff00, 0x444444);
    grid.position.y = 0.01; 
    group.add(grid);

    return group;
}

function resetGame() {
    // 1. Clear scene
    snake.forEach(seg => scene.remove(seg));
    if (food) scene.remove(food);
    if (floor) scene.remove(floor);

    // 2. Adjust Camera distance based on board size
    // Using boardSize * 1.2 gives a nice padding around the edges
    camera.position.set(0, boardSize * 1.2, boardSize * 1.2);
    camera.lookAt(0, 0, 0);

    snake = [];
    score = 0;
    scoreDisplay.innerText = score;
    direction.set(1, 0, 0);
    nextDirection.set(1, 0, 0);

    // 3. Re-create floor with new size
    floor = createFloor(); 
    scene.add(floor);

    // 4. Set start position (using the 0.5 offset logic)
    const offset = (boardSize % 2 === 0) ? 0.5 : 0;
    const head = modeToggle.checked ? FullModels.createSnakeSegmentFull() : ProtoModels.createSnakeSegmentProto();
    head.position.set(offset, 0.5, offset);
    snake.push(head);
    scene.add(head);

    spawnFood();
}

function spawnFood() {
    if (food) {
        scene.remove(food);
        food = null;
    }

    // WIN CONDITION CHECK
    // If snake length equals total board tiles, player wins!
    if (snake.length >= boardSize * boardSize) {
        gameWin();
        return;
    }

    const offset = (boardSize % 2 === 0) ? 0.5 : 0;
    let x, z;
    let attempts = 0;

    // Pick a free cell
    do {
        x = Math.floor(Math.random() * boardSize) - Math.floor(boardSize / 2) + offset;
        z = Math.floor(Math.random() * boardSize) - Math.floor(boardSize / 2) + offset;
        attempts++;
        // Safety break to prevent infinite loops
        if (attempts > 100) break; 
    } while (snake.some(seg => 
        Math.abs(seg.position.x - x) < 0.1 && 
        Math.abs(seg.position.z - z) < 0.1
    ));

    // FIX: Reference the imported modules correctly
    const model = modeToggle.checked ? FullModels.createFoodFull() : ProtoModels.createFoodProto();
    
    // Create pivot
    const pivot = new T.Group();
    pivot.position.set(x, 0.5, z);
    pivot.add(model);

    scene.add(pivot);
    food = pivot;
}

function update(time) {
    if (!gameActive) return;

    if (time - lastMoveTime > moveInterval) {
        direction.copy(nextDirection);
        const head = snake[0];
        const newPos = head.position.clone().add(direction);

        // Wall Collision (Fixed boundary logic)
        const halfBoard = boardSize / 2;
        if (Math.abs(newPos.x) > halfBoard || Math.abs(newPos.z) > halfBoard) {
            gameOver();
            return;
        }

        // Self Collision Check
        if (snake.some(seg => seg.position.distanceTo(newPos) < 0.1)) {
            gameOver();
            return;
        }

        // FIX: Reference the imported modules correctly
        const newHead = modeToggle.checked ? FullModels.createSnakeSegmentFull() : ProtoModels.createSnakeSegmentProto();
        newHead.position.copy(newPos);
        
        // Correct rotation for cylinder segments
        if (direction.x !== 0) newHead.rotation.set(0, 0, Math.PI / 2);
        else if (direction.z !== 0) newHead.rotation.set(Math.PI / 2, 0, 0);

        snake.unshift(newHead);
        scene.add(newHead);

        if (food && newPos.distanceTo(food.position) < 0.8) {
            score++;
            scoreDisplay.innerText = score;
            spawnFood(); 
        } else {
            const tail = snake.pop();
            scene.remove(tail);
        }

        lastMoveTime = time;
    }
}

function gameOver() {
    gameActive = false;
    finalScoreDisplay.innerText = score;
    gameOverScreen.style.display = 'flex';
}

function gameWin() {
    gameActive = false;
    document.getElementById('win-score').innerText = score;
    gameWinScreen.style.display = 'flex';
    gameHud.style.display = 'none';
}

// Add the button listener at the bottom
winRestartBtn.onclick = () => {
    gameWinScreen.style.display = 'none';
    gameHud.style.display = 'block';
    resetGame();
    gameActive = true;
};

function animate(time) {
    requestAnimationFrame(animate);
    update(time);

    if (food) {
        // Floating effect
        const bobAmount = Math.sin(performance.now() * 0.003) * 0.15;
        food.position.y = 0.5 + bobAmount;
    
        // Rotate in place
        food.rotation.y += 0.03;
    }

    renderer.render(scene, camera);
}

function setupControls() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' && direction.z !== 1) nextDirection.set(0, 0, -1);
        if (e.key === 'ArrowDown' && direction.z !== -1) nextDirection.set(0, 0, 1);
        if (e.key === 'ArrowLeft' && direction.x !== 1) nextDirection.set(-1, 0, 0);
        if (e.key === 'ArrowRight' && direction.x !== -1) nextDirection.set(1, 0, 0);
    });

    // Mobile/On-Screen Button Controls
    // We use 'mousedown' or 'pointerdown' for faster response on mobile
    const btnUp = document.getElementById('btn-up');
    const btnDown = document.getElementById('btn-down');
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');

    if (btnUp) btnUp.onclick = (e) => { 
        e.preventDefault(); 
        if(direction.z !== 1) nextDirection.set(0, 0, -1); 
    };
    if (btnDown) btnDown.onclick = (e) => { 
        e.preventDefault(); 
        if(direction.z !== -1) nextDirection.set(0, 0, 1); 
    };
    if (btnLeft) btnLeft.onclick = (e) => { 
        e.preventDefault(); 
        if(direction.x !== 1) nextDirection.set(-1, 0, 0); 
    };
    if (btnRight) btnRight.onclick = (e) => { 
        e.preventDefault(); 
        if(direction.x !== -1) nextDirection.set(1, 0, 0); 
    };
}

// Button Events
startBtn.onclick = () => {
    homeScreen.style.display = 'none';
    resetGame();
    gameActive = true;
};

restartBtn.onclick = () => {
    gameOverScreen.style.display = 'none';
    resetGame();
    gameActive = true;
};

backToMenuBtn.onclick = () => {
    gameOverScreen.style.display = 'none';
    homeScreen.style.display = 'flex';
};

init();