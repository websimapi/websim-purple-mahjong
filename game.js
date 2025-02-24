const GAME_DURATION = 120; // seconds
const TILES_COUNT = 32;

class MahjongGame {
  constructor() {
    this.board = document.getElementById('board');
    this.scoreElement = document.getElementById('score-value');
    this.timeElement = document.getElementById('time-value');
    this.selectedTiles = [];
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.symbols = this.generateSymbols();
    this.initGame();
  }

  generateSymbols() {
    const basicSymbols = [
      'm-1', 'm-2', 'm-3', 'm-4', 'm-5', 'm-6', 'm-7', 'm-8', 'm-9',
      'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8', 'p-9',
      's-1', 's-2', 's-3', 's-4', 's-5', 's-6', 's-7', 's-8', 's-9',
      'wind-n', 'wind-s', 'wind-e', 'wind-w',
      'dragon-white', 'dragon-green', 'dragon-red'
    ];
    
    // Select 16 random symbols (we need pairs, so total 32 tiles)
    const selectedSymbols = [];
    while (selectedSymbols.length < TILES_COUNT / 2) {
      const symbol = basicSymbols[Math.floor(Math.random() * basicSymbols.length)];
      if (!selectedSymbols.includes(symbol)) {
        selectedSymbols.push(symbol);
      }
    }
    
    // Double the symbols and shuffle
    return this.shuffle([...selectedSymbols, ...selectedSymbols]);
  }

  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  createTile(symbol) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    tile.dataset.symbol = symbol;
    
    const svg = this.createSymbolSVG(symbol);
    tile.innerHTML = svg;
    
    tile.addEventListener('click', () => this.handleTileClick(tile));
    return tile;
  }

  createSymbolSVG(symbol) {
    const [type, value] = symbol.split('-');
    let color = '#fff';
    let path = '';
    
    // Generate SVG path based on tile type and value
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

  handleTileClick(tile) {
    if (tile.classList.contains('matched') || tile.classList.contains('selected')) {
      return;
    }

    tile.classList.add('selected');
    this.selectedTiles.push(tile);

    if (this.selectedTiles.length === 2) {
      this.checkMatch();
    }
  }

  checkMatch() {
    const [tile1, tile2] = this.selectedTiles;
    const match = tile1.dataset.symbol === tile2.dataset.symbol;

    if (match) {
      setTimeout(() => {
        tile1.classList.add('matched');
        tile2.classList.add('matched');
        this.score += 100;
        this.scoreElement.textContent = this.score;
        this.checkWin();
      }, 500);
    }

    setTimeout(() => {
      tile1.classList.remove('selected');
      tile2.classList.remove('selected');
      this.selectedTiles = [];
    }, 1000);
  }

  checkWin() {
    const matchedTiles = document.querySelectorAll('.matched').length;
    if (matchedTiles === TILES_COUNT) {
      alert(`Congratulations! You won with score ${this.score}!`);
      this.initGame();
    }
  }

  updateTimer() {
    this.timeLeft--;
    this.timeElement.textContent = this.timeLeft;
    
    if (this.timeLeft <= 0) {
      alert(`Time's up! Your score: ${this.score}`);
      this.initGame();
    }
  }

  initGame() {
    this.board.innerHTML = '';
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.scoreElement.textContent = this.score;
    this.timeElement.textContent = this.timeLeft;
    this.symbols = this.generateSymbols();
    
    this.symbols.forEach(symbol => {
      this.board.appendChild(this.createTile(symbol));
    });

    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.updateTimer(), 1000);
  }
}

new MahjongGame();