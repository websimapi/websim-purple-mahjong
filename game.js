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
    
    const allSymbols = [...basicSymbols, ...winds, ...dragons];
    
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
        const winds = {n: '北', s: '南', e: '東', w: '西'};
        return `<svg class="face" viewBox="0 0 100 100">
          <text x="50" y="50" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-size="40">${winds[value]}</text>
        </svg>`;
      case 'dragon':
        const dragons = {white: '白', green: '發', red: '中'};
        return `<svg class="face" viewBox="0 0 100 100">
          <text x="50" y="50" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-size="40">${dragons[value]}</text>
        </svg>`;
    }
  }

  updateTileStates() {
    this.board.tiles.forEach(tile => {
      if (!tile.isMatched) {
        const isFree = tile.isFree(this.board);
        tile.element.classList.toggle('disabled', !isFree);
      }
    });
  }

  handleTileClick(tile) {
    // Block clicks if we're already processing a match check.
    if (this.isProcessing) return;
    if (tile.isMatched || !tile.isFree(this.board)) return;
    
    const element = tile.element;
    if (this.selectedTiles.includes(tile)) {
      element.classList.remove('selected');
      this.selectedTiles = this.selectedTiles.filter(t => t !== tile);
      return;
    }

    element.classList.add('selected');
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
    
    // Show floating score
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
      this.selectedTiles = [];
      this.updateTileStates();
      this.checkWin();
      this.isProcessing = false;
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
}

new MahjongGame();