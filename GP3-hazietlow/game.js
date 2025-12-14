import * as T from "./CS559-Three/build/three.module.js"; 
import * as ProtoModels from './models-proto.js';
import * as FullModels from './models-full.js';

let scene, camera, renderer;
let snake = [];
let food;
let floor;
let direction = new T.Vector3(1, 0, 0);
let nextDirection = new T.Vector3(1, 0, 0);
let gameActive = false;
let score = 0;
let lastMoveTime = 0;
const moveInterval = 175; 
let boardSize = 11;
const diffButtons = document.querySelectorAll('.diff-btn');
const gameHud = document.getElementById('ui-layer');

diffButtons.forEach(btn => {
    btn.onclick = () => {
        diffButtons.forEach(b => b.style.background = "rgba(255,255,255,0.2)");
        btn.style.background = "#2196F3";
        
        boardSize = parseInt(btn.getAttribute('data-size'));
    };
});

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
    
    camera = new T.PerspectiveCamera(45, aspect, 0.1, 1000);
    camera.position.set(0, boardSize + 70, boardSize + 70); 
    camera.lookAt(0, 0, 0);

    renderer = new T.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

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

function createFloor() {
    const group = new T.Group();

    const geometry = new T.PlaneGeometry(boardSize, boardSize);
    const material = new T.MeshStandardMaterial({ color: 0x1a1a1a });
    const mesh = new T.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    group.add(mesh);

    const grid = new T.GridHelper(boardSize, boardSize, 0x00ff00, 0x444444);
    grid.position.y = 0.01; 
    group.add(grid);

    return group;
}

function resetGame() {
    snake.forEach(seg => scene.remove(seg));
    if (food) scene.remove(food);
    if (floor) scene.remove(floor);

    camera.position.set(0, boardSize * 1.2, boardSize * 1.2);
    camera.lookAt(0, 0, 0);

    snake = [];
    score = 0;
    scoreDisplay.innerText = score;
    direction.set(1, 0, 0);
    nextDirection.set(1, 0, 0);

    floor = createFloor(); 
    scene.add(floor);

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

    if (snake.length >= boardSize * boardSize) {
        gameWin();
        return;
    }

    const offset = (boardSize % 2 === 0) ? 0.5 : 0;
    let x, z;
    let attempts = 0;

    do {
        x = Math.floor(Math.random() * boardSize) - Math.floor(boardSize / 2) + offset;
        z = Math.floor(Math.random() * boardSize) - Math.floor(boardSize / 2) + offset;
        attempts++;
        if (attempts > 100) break; 
    } while (snake.some(seg => 
        Math.abs(seg.position.x - x) < 0.1 && 
        Math.abs(seg.position.z - z) < 0.1
    ));

    const model = modeToggle.checked ? FullModels.createFoodFull() : ProtoModels.createFoodProto();
    
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

        const halfBoard = boardSize / 2;
        if (Math.abs(newPos.x) > halfBoard || Math.abs(newPos.z) > halfBoard) {
            gameOver();
            return;
        }

        if (snake.some(seg => seg.position.distanceTo(newPos) < 0.1)) {
            gameOver();
            return;
        }

        const newHead = modeToggle.checked ? FullModels.createSnakeSegmentFull() : ProtoModels.createSnakeSegmentProto();
        newHead.position.copy(newPos);
        
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
        const bobAmount = Math.sin(performance.now() * 0.003) * 0.15;
        food.position.y = 0.5 + bobAmount;
    
        food.rotation.y += 0.03;
    }

    renderer.render(scene, camera);
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' && direction.z !== 1) nextDirection.set(0, 0, -1);
        if (e.key === 'ArrowDown' && direction.z !== -1) nextDirection.set(0, 0, 1);
        if (e.key === 'ArrowLeft' && direction.x !== 1) nextDirection.set(-1, 0, 0);
        if (e.key === 'ArrowRight' && direction.x !== -1) nextDirection.set(1, 0, 0);
    });

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

window.addEventListener('DOMContentLoaded', () => {
    // Re-verify buttons are linked
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
});

init();