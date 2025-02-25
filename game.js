const GAME_DURATION = 120; // seconds
const BOARD_LAYERS = 4;
const LAYER_SIZE = { width: 8, height: 6 };
const TILE_TYPES = {
  DOTS: 'p',
  BAMBOO: 's',
  CHARACTERS: 'm',
  WINDS: 'wind',
  DRAGONS: 'dragon'
};

class MahjongTile {
  constructor(symbol, x, y, z) {
    this.symbol = symbol;
    this.x = x;
    this.y = y;
    this.z = z;
    this.element = null;
    this.isMatched = false;
  }

  isFree(board) {
    // A tile is free if it has no tile above it and at least one side exposed
    const hasAbove = board.tiles.some(t => 
      t.x === this.x && t.y === this.y && t.z === this.z + 1 && !t.isMatched
    );
    if (hasAbove) return false;

    // Check if either left or right side is exposed
    const hasLeft = board.tiles.some(t =>
      t.x === this.x - 1 && t.y === this.y && t.z === this.z && !t.isMatched
    );
    const hasRight = board.tiles.some(t =>
      t.x === this.x + 1 && t.y === this.y && t.z === this.z && !t.isMatched
    );

    return !hasLeft || !hasRight;
  }
}

class MahjongBoard {
  constructor() {
    this.tiles = [];
    this.generateBoard();
  }

  generateBoard() {
    const symbols = this.generateSymbols();
    let symbolIndex = 0;

    // Create layered board structure
    for (let z = 0; z < BOARD_LAYERS; z++) {
      const layerWidth = LAYER_SIZE.width - z;
      const layerHeight = LAYER_SIZE.height - z;
      
      for (let y = z; y < layerHeight; y++) {
        for (let x = z; x < layerWidth; x++) {
          if (symbolIndex < symbols.length) {
            this.tiles.push(new MahjongTile(symbols[symbolIndex], x, y, z));
            symbolIndex++;
          }
        }
      }
    }
  }

  generateSymbols() {
    const basicSymbols = [];
    // Generate tiles for each suit (dots, bamboo, characters)
    ['p', 's', 'm'].forEach(suit => {
      for (let i = 1; i <= 9; i++) {
        basicSymbols.push(`${suit}-${i}`);
      }
    });

    // Add winds and dragons
    const winds = ['n', 's', 'e', 'w'].map(w => `wind-${w}`);
    const dragons = ['white', 'green', 'red'].map(d => `dragon-${d}`);
    // Add additional unique symbols: flowers and seasons
    const flowers = ['plum', 'orchid', 'bamboo', 'chrysanthemum'].map(f => `flower-${f}`);
    const seasons = ['spring', 'summer', 'autumn', 'winter'].map(s => `season-${s}`);

    const allSymbols = [...basicSymbols, ...winds, ...dragons, ...flowers, ...seasons];
    // Create pairs
    const pairs = [...allSymbols, ...allSymbols];
    return this.shuffle(pairs);
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
    this.board = null;
    this.selectedTiles = [];
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.boardElement = document.getElementById('board');
    this.scoreElement = document.getElementById('score-value');
    this.timeElement = document.getElementById('time-value');
    this.isProcessing = false; // Prevent further tile clicks while checking matches
    this.initGame();
    this.initPanZoom();
  }

  initGame() {
    this.boardElement.innerHTML = '';
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.scoreElement.textContent = this.score;
    this.timeElement.textContent = this.timeLeft;
    this.board = new MahjongBoard();
    this.renderBoard();

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.updateTimer(), 1000);
  }

  renderBoard() {
    this.board.tiles.forEach(tile => {
      const element = this.createTileElement(tile);
      tile.element = element;
      this.boardElement.appendChild(element);
    });
    this.updateTileStates();
  }

  createTileElement(tile) {
    const element = document.createElement('div');
    element.className = 'tile';
    element.innerHTML = this.createSymbolSVG(tile.symbol);
    element.style.zIndex = tile.z * 10;  // Ensure higher-layer tiles appear on top
    
    // Position tile in 3D space
    const tileWidth = 62; // Slightly larger than CSS width for spacing
    const tileHeight = 82;
    const tileDepth = 20;
    
    element.style.transform = `
      translate3d(
        ${tile.x * tileWidth}px,
        ${tile.y * tileHeight}px,
        ${tile.z * tileDepth}px
      )
    `;
    
    element.addEventListener('click', () => this.handleTileClick(tile));
    return element;
  }

  createSymbolSVG(symbol) {
    const [type, value] = symbol.split('-');
    let color = '#fff';
    switch(type) {
      case 'm': // Character tiles
        return `<svg class="face" viewBox="0 0 100 100">
          <text x="50" y="50" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-size="40">${value}</text>
        </svg>`;
      case 'p': // Circle tiles
        return `<svg class="face" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${20 + parseInt(value) * 2}" stroke="${color}" fill="none" stroke-width="3"/>
        </svg>`;
      case 's': // Bamboo tiles
        return `<svg class="face" viewBox="0 0 100 100">
          <rect x="45" y="20" width="10" height="${60 - parseInt(value) * 3}" fill="${color}"/>
        </svg>`;
      case 'wind':
        const winds = { n: '北', s: '南', e: '東', w: '西' };
        return `<svg class="face" viewBox="0 0 100 100">
          <text x="50" y="50" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-size="40">${winds[value]}</text>
        </svg>`;
      case 'dragon':
        const dragons = { white: '白', green: '發', red: '中' };
        return `<svg class="face" viewBox="0 0 100 100">
          <text x="50" y="50" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-size="40">${dragons[value]}</text>
        </svg>`;
      case 'flower':
        const flowerColors = {
          plum: 'purple',
          orchid: 'blue',
          bamboo: 'green',
          chrysanthemum: 'orange'
        };
        let fill = flowerColors[value] || 'pink';
        return `<svg class="face" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="10" fill="yellow"/>
          <circle cx="30" cy="30" r="10" fill="${fill}"/>
          <circle cx="70" cy="30" r="10" fill="${fill}"/>
          <circle cx="30" cy="70" r="10" fill="${fill}"/>
          <circle cx="70" cy="70" r="10" fill="${fill}"/>
        </svg>`;
      case 'season':
        const seasonSymbols = {
          spring: 'S',
          summer: 'Su',
          autumn: 'A',
          winter: 'W'
        };
        let display = seasonSymbols[value] || value;
        return `<svg class="face" viewBox="0 0 100 100">
          <text x="50" y="50" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-size="40">${display}</text>
        </svg>`;
    }
  }

  updateTileStates() {
    this.board.tiles.forEach(tile => {
      if (!tile.isMatched && tile.element) {
        const isFree = tile.isFree(this.board);
        tile.element.classList.toggle('disabled', !isFree);
        tile.element.classList.toggle('free', isFree);  // Mark free tiles visually
      }
    });
  }

  handleTileClick(tile) {
    if (tile.isMatched) return;
    if (!tile.isFree(this.board)) {
      // If tile is not free, highlight the blocking (upper) tile to show what's on top
      const blockingTile = this.board.tiles.find(t => 
        t.x === tile.x && t.y === tile.y && t.z === tile.z + 1 && !t.isMatched
      );
      if (blockingTile && blockingTile.element) {
        blockingTile.element.classList.add('highlight');
        setTimeout(() => blockingTile.element.classList.remove('highlight'), 500);
      }
      return;
    }
    
    // Allow deselecting a tile if already selected
    if (this.selectedTiles.includes(tile)) {
      tile.element.classList.remove('selected');
      this.selectedTiles = this.selectedTiles.filter(t => t !== tile);
      return;
    }
    
    // Prevent selecting more than two tiles at a time
    if (this.selectedTiles.length >= 2) return;
    
    tile.element.classList.add('selected');
    this.selectedTiles.push(tile);
    
    if (this.selectedTiles.length === 2) {
      this.checkMatch();
    }
  }

  checkMatch() {
    this.isProcessing = true;
    const [tile1, tile2] = this.selectedTiles;
    const match = tile1.symbol === tile2.symbol;

    if (match) {
      this.handleMatch(tile1, tile2);
    } else {
      setTimeout(() => {
        tile1.element.classList.remove('selected');
        tile2.element.classList.remove('selected');
        this.selectedTiles = [];
        this.isProcessing = false;
      }, 1000);
    }
  }

  handleMatch(tile1, tile2) {
    const points = 100 + (tile1.z * 50); // More points for higher layers
    this.score += points;
    this.scoreElement.textContent = this.score;
    
    // Show floating score popup
    const popup = document.createElement('div');
    popup.className = 'score-popup';
    popup.textContent = `+${points}`;
    popup.style.left = `${tile1.element.offsetLeft}px`;
    popup.style.top = `${tile1.element.offsetTop}px`;
    this.boardElement.appendChild(popup);
    
    setTimeout(() => popup.remove(), 1000);

    // Mark tiles as matched
    tile1.isMatched = tile2.isMatched = true;
    
    setTimeout(() => {
      tile1.element.classList.add('matched');
      tile2.element.classList.add('matched');
      // Remove the tile elements completely after the fade-out animation
      setTimeout(() => {
        if (tile1.element && tile1.element.parentNode) tile1.element.parentNode.removeChild(tile1.element);
        if (tile2.element && tile2.element.parentNode) tile2.element.parentNode.removeChild(tile2.element);
        this.selectedTiles = [];
        this.updateTileStates();
        this.checkWin();
        this.isProcessing = false;
      }, 500);
    }, 500);
  }

  checkWin() {
    if (this.board.tiles.every(tile => tile.isMatched)) {
      clearInterval(this.timer);
      setTimeout(() => {
        alert(`Congratulations! You won with score ${this.score}!`);
        this.initGame();
      }, 500);
    }
  }

  updateTimer() {
    this.timeLeft--;
    this.timeElement.textContent = this.timeLeft;
    
    if (this.timeLeft <= 0) {
      clearInterval(this.timer);
      alert(`Time's up! Your score: ${this.score}`);
      this.initGame();
    }
  }

  initPanZoom() {
    const container = document.getElementById('board-container');
    const boardEl = document.getElementById('board');
    const initialRotation = 'rotateX(45deg) rotateZ(45deg)';
    const panZoom = {
      panX: 0,
      panY: 0,
      scale: 1,
      isPanning: false,
      isZooming: false,
      startTouches: [],
      startPan: { x: 0, y: 0 },
      startDistance: 0,
      initialScale: 1
    };

    const updateBoardTransform = () => {
      boardEl.style.transform = `translate(${panZoom.panX}px, ${panZoom.panY}px) scale(${panZoom.scale}) ${initialRotation}`;
    };

    container.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        panZoom.isPanning = true;
        panZoom.startTouches = [{ x: e.touches[0].clientX, y: e.touches[0].clientY }];
        panZoom.startPan = { x: panZoom.panX, y: panZoom.panY };
      } else if (e.touches.length === 2) {
        panZoom.isZooming = true;
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        panZoom.startDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        panZoom.initialScale = panZoom.scale;
      }
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
      if (panZoom.isPanning && e.touches.length === 1) {
        const dx = e.touches[0].clientX - panZoom.startTouches[0].x;
        const dy = e.touches[0].clientY - panZoom.startTouches[0].y;
        panZoom.panX = panZoom.startPan.x + dx;
        panZoom.panY = panZoom.startPan.y + dy;
        updateBoardTransform();
      } else if (panZoom.isZooming && e.touches.length === 2) {
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        panZoom.scale = panZoom.initialScale * (currentDistance / panZoom.startDistance);
        if (panZoom.scale < 0.5) panZoom.scale = 0.5;
        if (panZoom.scale > 3) panZoom.scale = 3;
        updateBoardTransform();
      }
      e.preventDefault();
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        panZoom.isZooming = false;
      }
      if (e.touches.length === 0) {
        panZoom.isPanning = false;
      }
    });

    // Mouse events for desktop panning
    container.addEventListener('mousedown', (e) => {
      panZoom.isPanning = true;
      panZoom.startTouches = [{ x: e.clientX, y: e.clientY }];
      panZoom.startPan = { x: panZoom.panX, y: panZoom.panY };
    });

    container.addEventListener('mousemove', (e) => {
      if (panZoom.isPanning) {
        const dx = e.clientX - panZoom.startTouches[0].x;
        const dy = e.clientY - panZoom.startTouches[0].y;
        panZoom.panX = panZoom.startPan.x + dx;
        panZoom.panY = panZoom.startPan.y + dy;
        updateBoardTransform();
      }
    });

    container.addEventListener('mouseup', () => {
      panZoom.isPanning = false;
    });

    container.addEventListener('mouseleave', () => {
      panZoom.isPanning = false;
    });

    // Wheel zoom for desktop
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      let zoomFactor = 1 - e.deltaY / 500;
      panZoom.scale *= zoomFactor;
      if (panZoom.scale < 0.5) panZoom.scale = 0.5;
      if (panZoom.scale > 3) panZoom.scale = 3;
      updateBoardTransform();
    });
  }
}

new MahjongGame();