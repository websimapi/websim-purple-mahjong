/**
 * CONFIGURATION & LEVELS
 */
const LAYOUTS = {
  classic: (x, y, z) => {
    // Standard pyramid/block structure
    if (z === 0) return x >= 0 && x < 8 && y >= 0 && y < 6;
    if (z === 1) return x >= 1 && x < 7 && y >= 1 && y < 5;
    if (z === 2) return x >= 2 && x < 6 && y >= 2 && y < 4;
    if (z === 3) return x >= 3 && x < 5 && y >= 2 && y < 4; // Top peak
    return false;
  },
  pyramid: (x, y, z) => {
    // Perfect pyramid
    const size = 8;
    const center = size / 2;
    if (z > 4) return false;
    const margin = z; // shrink by 1 each layer
    return x >= margin && x < size - margin && y >= margin && y < size - margin - 2;
  },
  walls: (x, y, z) => {
    // High walls on sides
    if (z === 0) return x >= 0 && x < 8 && y >= 0 && y < 6;
    if (z > 0 && z < 4) return (x === 0 || x === 7 || y === 0 || y === 5);
    return false;
  },
  arena: (x, y, z) => {
    // Hollow center
    if (z === 0) return x >= 0 && x < 8 && y >= 0 && y < 6;
    if (z > 0) return (x < 2 || x > 5 || y < 2 || y > 3);
    return false;
  }
};

const LEVELS = [
  { id: 1, name: "Novice Steps", layout: 'classic', time: 300, points: 100 },
  { id: 2, name: "The Arena", layout: 'arena', time: 400, points: 120, unlockTheme: 'nature' },
  { id: 3, name: "Great Walls", layout: 'walls', time: 500, points: 150, unlockTheme: 'sunset' },
  { id: 4, name: "Golden Pyramid", layout: 'pyramid', time: 600, points: 200, unlockTheme: 'ocean' }
];

const THEMES = {
  default: { name: "Royal Purple", class: "theme-default" },
  nature: { name: "Bamboo Forest", class: "theme-nature" },
  sunset: { name: "Crimson Sunset", class: "theme-sunset" },
  ocean: { name: "Deep Ocean", class: "theme-ocean" }
};

/**
 * GAME CLASSES
 */

class MahjongTile {
  constructor(symbol, x, y, z) {
    this.symbol = symbol;
    this.x = x;
    this.y = y;
    this.z = z;
    this.element = null;
    this.isMatched = false;
  }

  // Returns { blocked: boolean, blockers: Array<Tile> }
  checkBlocked(board) {
    // A tile is blocked if it has a tile directly above
    const tileAbove = board.tiles.find(t => 
      t.x === this.x && t.y === this.y && t.z === this.z + 1 && !t.isMatched
    );
    
    if (tileAbove) return { blocked: true, blockers: [tileAbove] };

    // Or if blocked on BOTH sides (Left and Right)
    // Left
    const hasLeft = board.tiles.some(t =>
      t.x === this.x - 1 && t.y === this.y && t.z === this.z && !t.isMatched
    );
    // Right
    const hasRight = board.tiles.some(t =>
      t.x === this.x + 1 && t.y === this.y && t.z === this.z && !t.isMatched
    );

    if (hasLeft && hasRight) {
       // Find visual blockers for feedback
       const leftBlocker = board.tiles.find(t => t.x === this.x - 1 && t.y === this.y && t.z === this.z && !t.isMatched);
       const rightBlocker = board.tiles.find(t => t.x === this.x + 1 && t.y === this.y && t.z === this.z && !t.isMatched);
       return { blocked: true, blockers: [leftBlocker, rightBlocker].filter(Boolean) };
    }

    return { blocked: false, blockers: [] };
  }
}

class MahjongBoard {
  hasMoves() {
    const active = this.tiles.filter(t => !t.isMatched);
    const free = active.filter(t => !t.checkBlocked(this).blocked);
    const counts = {};
    for (const t of free) {
      counts[t.symbol] = (counts[t.symbol] || 0) + 1;
      if (counts[t.symbol] >= 2) return true;
    }
    return false;
  }

  shuffleActiveTiles() {
    const active = this.tiles.filter(t => !t.isMatched);
    const symbols = active.map(t => t.symbol);
    // Shuffle symbols
    for (let i = symbols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }
    // Reassign
    active.forEach((t, i) => t.symbol = symbols[i]);
  }

  constructor(layoutType = 'classic') {
    this.tiles = [];
    this.layoutFn = LAYOUTS[layoutType] || LAYOUTS.classic;
    this.generateBoard();
  }

  generateBoard() {
    // Calculate how many positions are valid for this layout
    let positions = [];
    for (let z = 0; z < 5; z++) {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 10; x++) {
          if (this.layoutFn(x, y, z)) {
            positions.push({x, y, z});
          }
        }
      }
    }

    // Ensure even number of tiles for pairs
    if (positions.length % 2 !== 0) {
      positions.pop();
    }

    const symbols = this.generateSymbols(positions.length);
    
    positions.forEach((pos, i) => {
      this.tiles.push(new MahjongTile(symbols[i], pos.x, pos.y, pos.z));
    });
  }

  generateSymbols(count) {
    const pairsNeeded = count / 2;
    const basicSymbols = [];
    ['p', 's', 'm'].forEach(suit => {
      for (let i = 1; i <= 9; i++) basicSymbols.push(`${suit}-${i}`);
    });
    const winds = ['n', 's', 'e', 'w'].map(w => `wind-${w}`);
    const dragons = ['white', 'green', 'red'].map(d => `dragon-${d}`);
    const flowers = ['plum', 'orchid', 'bamboo', 'chrysanthemum'].map(f => `flower-${f}`);
    const seasons = ['spring', 'summer', 'autumn', 'winter'].map(s => `season-${s}`);

    const allTypes = [...basicSymbols, ...winds, ...dragons, ...flowers, ...seasons];
    
    let pool = [];
    for (let i = 0; i < pairsNeeded; i++) {
      // Loop through available symbols
      const sym = allTypes[i % allTypes.length];
      pool.push(sym, sym);
    }
    return this.shuffle(pool);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

class MahjongGame {
  constructor() {
    this.state = {
      level: 1,
      score: 0,
      unlockedLevels: [1],
      unlockedThemes: ['default'],
      activeTheme: 'default'
    };
    
    this.loadProgress();

    // DOM Elements
    this.boardElement = document.getElementById('board');
    this.boardContainer = document.getElementById('board-container');
    this.scoreElement = document.getElementById('score-value');
    this.timeElement = document.getElementById('time-value');
    this.levelDisplay = document.getElementById('level-display');
    
    // Screens
    this.screens = {
      menu: document.getElementById('main-menu'),
      level: document.getElementById('level-select'),
      theme: document.getElementById('theme-select'),
      gameover: document.getElementById('game-over')
    };

    // Game Variables
    this.board = null;
    this.selectedTiles = [];
    this.timer = null;
    this.timeLeft = 0;
    this.isProcessing = false;
    this.cameraAngle = { rotateX: 45, rotateZ: 45 };
    
    // Transform / Pan / Zoom state
    this.panZoom = {
      panX: 0, panY: 0, scale: 1,
      isPanning: false, isZooming: false, isRotating: false,
      startTouches: [], startPan: {x:0, y:0}, startRotation: {x:0, z:0},
      startDistance: 0, initialScale: 1
    };

    this.initUI();
    this.initControls();
    this.applyTheme(this.state.activeTheme);
  }

  loadProgress() {
    const saved = localStorage.getItem('mahjong_quest_save');
    if (saved) {
      this.state = JSON.parse(saved);
    }
  }

  saveProgress() {
    localStorage.setItem('mahjong_quest_save', JSON.stringify(this.state));
  }

  initUI() {
    // Main Menu
    document.getElementById('play-btn').onclick = () => this.startLevel(this.state.level);
    document.getElementById('levels-btn').onclick = () => this.showLevelSelect();
    document.getElementById('themes-btn').onclick = () => this.showThemeSelect();
    
    // In-game
    document.getElementById('menu-btn').onclick = () => {
      clearInterval(this.timer);
      this.showScreen('menu');
    };

    // Game Over
    document.getElementById('next-level-btn').onclick = () => {
      const nextId = this.state.level + 1;
      if (LEVELS.find(l => l.id === nextId)) {
        this.startLevel(nextId);
      } else {
        this.startLevel(1); // Loop back or handled nicely
      }
    };
    document.getElementById('retry-btn').onclick = () => this.startLevel(this.state.level);
    document.getElementById('home-btn').onclick = () => this.showScreen('menu');

    // Back buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
      btn.onclick = () => this.showScreen('menu');
    });

    // Mobile controls
    document.querySelectorAll('.control-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        const ROT_STEP = 15;
        if (action === 'up') this.cameraAngle.rotateX = Math.max(10, this.cameraAngle.rotateX - ROT_STEP);
        if (action === 'down') this.cameraAngle.rotateX = Math.min(80, this.cameraAngle.rotateX + ROT_STEP);
        if (action === 'left') this.cameraAngle.rotateZ -= ROT_STEP;
        if (action === 'right') this.cameraAngle.rotateZ += ROT_STEP;
        if (action === 'reset') { this.cameraAngle.rotateX = 45; this.cameraAngle.rotateZ = 45; this.panZoom.panX = 0; this.panZoom.panY = 0; this.panZoom.scale = 1; }
        this.updateBoardTransform();
      });
    });
  }

  showScreen(screenName) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    if (this.screens[screenName]) this.screens[screenName].classList.add('active');
  }

  showLevelSelect() {
    const grid = document.getElementById('levels-grid');
    grid.innerHTML = '';
    LEVELS.forEach(lvl => {
      const el = document.createElement('div');
      el.className = `grid-item ${this.state.unlockedLevels.includes(lvl.id) ? '' : 'locked'}`;
      el.innerHTML = `<h3>${lvl.name}</h3>`;
      if (this.state.unlockedLevels.includes(lvl.id)) {
        el.onclick = () => this.startLevel(lvl.id);
      }
      grid.appendChild(el);
    });
    this.showScreen('level');
  }

  showThemeSelect() {
    const grid = document.getElementById('themes-grid');
    grid.innerHTML = '';
    Object.keys(THEMES).forEach(key => {
      const theme = THEMES[key];
      const isUnlocked = this.state.unlockedThemes.includes(key);
      const el = document.createElement('div');
      el.className = `grid-item ${isUnlocked ? '' : 'locked'} ${this.state.activeTheme === key ? 'selected' : ''}`;
      el.innerHTML = `<h3>${theme.name}</h3>`;
      if (isUnlocked) {
        el.onclick = () => {
          this.applyTheme(key);
          this.showThemeSelect(); // Refresh UI
        };
      }
      grid.appendChild(el);
    });
    this.showScreen('theme');
  }

  applyTheme(themeKey) {
    this.state.activeTheme = themeKey;
    this.saveProgress();
    document.body.className = THEMES[themeKey].class;
  }

  startLevel(levelId) {
    const levelConfig = LEVELS.find(l => l.id === levelId) || LEVELS[0];
    this.state.level = levelId;
    this.showScreen('none'); // Hide all screens
    this.score = 0;
    this.timeLeft = levelConfig.time;
    
    this.updateHUD();
    
    this.board = new MahjongBoard(levelConfig.layout);
    this.renderBoard();
    
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateHUD();
      if (this.timeLeft <= 0) this.endGame(false);
    }, 1000);

    // Reset Camera
    this.panZoom.panX = 0;
    this.panZoom.panY = 0;
    this.panZoom.scale = window.innerWidth < 600 ? 0.8 : 1;
    this.cameraAngle = { rotateX: 45, rotateZ: 45 };
    this.updateBoardTransform();
  }

  updateHUD() {
    this.scoreElement.textContent = this.score;
    this.timeElement.textContent = this.timeLeft;
    this.levelDisplay.textContent = LEVELS.find(l => l.id === this.state.level).name;
    if (this.timeLeft < 30) this.timeElement.style.color = 'red';
    else this.timeElement.style.color = 'white';
  }

  renderBoard() {
    this.boardElement.innerHTML = '';
    this.board.tiles.forEach(tile => {
      const el = this.createTileElement(tile);
      tile.element = el;
      this.boardElement.appendChild(el);
    });
    this.updateTileStates();
  }

  createTileElement(tile) {
    const el = document.createElement('div');
    el.className = 'tile';
    el.innerHTML = this.createSymbolSVG(tile.symbol);
    el.style.zIndex = tile.z * 10;
    
    const w = 52; const h = 72; const d = 15;
    
    // Center the board roughly
    const offsetX = (8 * w) / 2;
    const offsetY = (6 * h) / 2;

    el.style.transform = `translate3d(${(tile.x * w) - offsetX}px, ${(tile.y * h) - offsetY}px, ${tile.z * d}px)`;
    
    el.onclick = (e) => {
      e.stopPropagation();
      this.handleTileClick(tile);
    };
    
    if (tile.isMatched) {
      el.style.display = 'none';
    }

    return el;
  }

  createSymbolSVG(symbol) {
    const [type, value] = symbol.split('-');
    const emojiMap = {
      m: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🙂", "😉"],
      p: ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍒", "🥝"],
      s: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨"],
      wind: { n: "⬆️", s: "⬇️", e: "➡️", w: "⬅️" },
      dragon: { red: "🐉", green: "🐲", white: "⚪" },
      flower: { plum: "🌸", orchid: "🌹", bamboo: "🌺", chrysanthemum: "🌼" },
      season: { spring: "🌱", summer: "🌞", autumn: "🍂", winter: "❄️" }
    };

    let emoji = "❓";
    if (['m','p','s'].includes(type)) {
      emoji = emojiMap[type][parseInt(value)-1] || emoji;
    } else if (emojiMap[type]) {
      emoji = emojiMap[type][value] || emoji;
    }

    return `<svg class="face" viewBox="0 0 100 100"><text x="50" y="55" text-anchor="middle" dominant-baseline="middle" font-size="65">${emoji}</text></svg>`;
  }

  handleTileClick(tile) {
    if (tile.isMatched || this.isProcessing) return;

    const status = tile.checkBlocked(this.board);
    if (status.blocked) {
      // Visual feedback on blockers
      status.blockers.forEach(b => {
        if (b.element) {
          b.element.classList.remove('blocked-feedback');
          void b.element.offsetWidth; // trigger reflow
          b.element.classList.add('blocked-feedback');
          
          // Remove class after animation to ensure it can happen again
          setTimeout(() => {
            if(b.element) b.element.classList.remove('blocked-feedback');
          }, 500);
        }
      });
      return;
    }

    // Toggle selection
    if (this.selectedTiles.includes(tile)) {
      tile.element.classList.remove('selected');
      this.selectedTiles = this.selectedTiles.filter(t => t !== tile);
      return;
    }

    if (this.selectedTiles.length >= 2) return;

    tile.element.classList.add('selected');
    this.selectedTiles.push(tile);

    if (this.selectedTiles.length === 2) {
      this.checkMatch();
    }
  }

  checkMatch() {
    this.isProcessing = true;
    const [t1, t2] = this.selectedTiles;
    
    if (t1.symbol === t2.symbol) {
      const points = 100 * (1 + (t1.z * 0.5));
      this.score += Math.floor(points);
      
      // Popup
      const pop = document.createElement('div');
      pop.className = 'score-popup';
      pop.textContent = `+${Math.floor(points)}`;
      // Position relative to screen for simplicity or board
      const rect = t1.element.getBoundingClientRect();
      pop.style.left = rect.left + 'px';
      pop.style.top = rect.top + 'px';
      document.body.appendChild(pop);
      setTimeout(() => pop.remove(), 800);

      t1.isMatched = t2.isMatched = true;
      t1.element.classList.add('matched');
      t2.element.classList.add('matched');
      
      setTimeout(() => {
        if(t1.element) t1.element.style.display = 'none';
        if(t2.element) t2.element.style.display = 'none';
        this.selectedTiles = [];
        this.updateTileStates();
        this.isProcessing = false;
        
        if (this.board.tiles.every(t => t.isMatched)) {
          this.endGame(true);
        } else if (!this.board.hasMoves()) {
          this.shuffleBoard();
        }
      }, 500);
      
      this.updateHUD();
    } else {
      setTimeout(() => {
        t1.element.classList.remove('selected');
        t2.element.classList.remove('selected');
        this.selectedTiles = [];
        this.isProcessing = false;
      }, 800);
    }
  }

  shuffleBoard() {
    // Popup notification
    const pop = document.createElement('div');
    pop.className = 'score-popup';
    pop.innerHTML = "No Moves!<br>Shuffling... 🔀";
    pop.style.top = '50%';
    pop.style.left = '50%';
    pop.style.transform = 'translate(-50%, -50%)';
    pop.style.width = '300px';
    pop.style.textAlign = 'center';
    pop.style.zIndex = '200';
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1500);

    // Shuffle until moves exist
    let attempts = 0;
    do {
      this.board.shuffleActiveTiles();
      attempts++;
    } while (!this.board.hasMoves() && attempts < 15);

    // Re-render
    setTimeout(() => {
      this.renderBoard();
      // Reset rotation/scale to defaults? No, keep user view.
    }, 500);
  }

  updateTileStates() {
    this.board.tiles.forEach(tile => {
      if (!tile.isMatched && tile.element) {
        const { blocked } = tile.checkBlocked(this.board);
        tile.element.classList.toggle('disabled', blocked);
      }
    });
  }

  endGame(win) {
    clearInterval(this.timer);
    const title = document.getElementById('game-over-title');
    const msg = document.getElementById('game-over-msg');
    const nextBtn = document.getElementById('next-level-btn');
    
    if (win) {
      title.textContent = "Level Complete! 🎉";
      msg.textContent = `Final Score: ${this.score}`;
      nextBtn.style.display = 'block';
      
      // Unlock next level
      const nextLvl = this.state.level + 1;
      if (!this.state.unlockedLevels.includes(nextLvl) && LEVELS.find(l => l.id === nextLvl)) {
        this.state.unlockedLevels.push(nextLvl);
      }

      // Unlock theme?
      const currentLvlConfig = LEVELS.find(l => l.id === this.state.level);
      if (currentLvlConfig && currentLvlConfig.unlockTheme) {
        if (!this.state.unlockedThemes.includes(currentLvlConfig.unlockTheme)) {
          this.state.unlockedThemes.push(currentLvlConfig.unlockTheme);
          msg.textContent += `\nNew Theme Unlocked: ${THEMES[currentLvlConfig.unlockTheme].name}!`;
        }
      }
      this.saveProgress();
    } else {
      title.textContent = "Time's Up! 😢";
      msg.textContent = "Try again!";
      nextBtn.style.display = 'none';
    }
    
    this.showScreen('gameover');
  }

  initControls() {
    const c = this.boardContainer;
    
    // Pan and Zoom
    c.addEventListener('mousedown', e => {
      if (e.button === 2) { // Right drag rotate
        this.panZoom.isRotating = true;
        this.panZoom.startTouches = [{x:e.clientX, y:e.clientY}];
        this.panZoom.startRotation = {...this.cameraAngle};
      } else if (e.button === 0) { // Left drag pan
        this.panZoom.isPanning = true;
        this.panZoom.startTouches = [{x:e.clientX, y:e.clientY}];
        this.panZoom.startPan = {x:this.panZoom.panX, y:this.panZoom.panY};
      }
    });

    window.addEventListener('mousemove', e => {
      if (this.panZoom.isRotating) {
        const dx = e.clientX - this.panZoom.startTouches[0].x;
        const dy = e.clientY - this.panZoom.startTouches[0].y;
        this.cameraAngle.rotateZ = this.panZoom.startRotation.z + (dx * 0.5);
        this.cameraAngle.rotateX = Math.max(10, Math.min(80, this.panZoom.startRotation.x - (dy * 0.5)));
        this.updateBoardTransform();
      } else if (this.panZoom.isPanning) {
        const dx = e.clientX - this.panZoom.startTouches[0].x;
        const dy = e.clientY - this.panZoom.startTouches[0].y;
        this.panZoom.panX = this.panZoom.startPan.x + dx;
        this.panZoom.panY = this.panZoom.startPan.y + dy;
        this.updateBoardTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      this.panZoom.isPanning = false;
      this.panZoom.isRotating = false;
    });
    
    // Wheel Zoom
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY * -0.001;
      this.panZoom.scale = Math.min(Math.max(.5, this.panZoom.scale + delta), 3);
      this.updateBoardTransform();
    }, {passive:false});

    // Touch
    c.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this.panZoom.isPanning = true;
        this.panZoom.startTouches = [{x:e.touches[0].clientX, y:e.touches[0].clientY}];
        this.panZoom.startPan = {x:this.panZoom.panX, y:this.panZoom.panY};
      } else if (e.touches.length === 2) {
        this.panZoom.isZooming = true;
        this.panZoom.startDistance = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        this.panZoom.initialScale = this.panZoom.scale;
      }
    }, {passive:false});

    c.addEventListener('touchmove', e => {
      e.preventDefault();
      if (this.panZoom.isPanning && e.touches.length === 1) {
        const dx = e.touches[0].clientX - this.panZoom.startTouches[0].x;
        const dy = e.touches[0].clientY - this.panZoom.startTouches[0].y;
        this.panZoom.panX = this.panZoom.startPan.x + dx;
        this.panZoom.panY = this.panZoom.startPan.y + dy;
        this.updateBoardTransform();
      } else if (this.panZoom.isZooming && e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        this.panZoom.scale = this.panZoom.initialScale * (dist / this.panZoom.startDistance);
        this.updateBoardTransform();
      }
    }, {passive:false});

    c.addEventListener('touchend', () => {
      this.panZoom.isPanning = false;
      this.panZoom.isZooming = false;
    });
  }

  updateBoardTransform() {
    this.boardElement.style.transform = 
      `translate3d(${this.panZoom.panX}px, ${this.panZoom.panY}px, 0) ` +
      `scale(${this.panZoom.scale}) ` +
      `rotateX(${this.cameraAngle.rotateX}deg) ` +
      `rotateZ(${this.cameraAngle.rotateZ}deg)`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.game = new MahjongGame();
});