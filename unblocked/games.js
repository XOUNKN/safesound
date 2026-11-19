// Catalog of every game bundled with Study Hub.
// Self-coded entries live at games/<slug>.html.
// Vendored entries live at games/<slug>/<entry_file>.
window.GAMES = [
  // --- Self-coded originals -----------------------------------------------
  { slug: 'snake',    name: 'Serpent',  category: 'arcade',     controls: 'Arrows or WASD, Space pauses', file: 'games/snake.html',    color: '#22c55e', license: 'MIT', repo_url: null, is_vendored: false },
  { slug: '2048',     name: '2048',     category: 'puzzle',     controls: 'Arrows or swipe',              file: 'games/2048.html',     color: '#f59e0b', license: 'MIT', repo_url: null, is_vendored: false },
  { slug: 'tetris',   name: 'Blocks',   category: 'arcade',     controls: 'Arrows, Up rotates',           file: 'games/tetris.html',   color: '#06b6d4', license: 'MIT', repo_url: null, is_vendored: false },
  { slug: 'pong',     name: 'Paddles',  category: 'arcade',     controls: 'W/S or mouse',                 file: 'games/pong.html',     color: '#ef4444', license: 'MIT', repo_url: null, is_vendored: false },
  { slug: 'breakout', name: 'Breaker',  category: 'arcade',     controls: 'Arrows or mouse',              file: 'games/breakout.html', color: '#a855f7', license: 'MIT', repo_url: null, is_vendored: false },
  { slug: 'flappy',   name: 'Flapper',  category: 'platformer', controls: 'Space or click',               file: 'games/flappy.html',   color: '#eab308', license: 'MIT', repo_url: null, is_vendored: false },

  // --- Vendored games -----------------------------------------------------
  { slug: 'centipede',       name: 'Centipede',       category: 'arcade',     controls: 'Arrows/WASD move, Space fire, P or Esc pause',  file: 'games/centipede/index.html',       color: '#ef4444', license: 'Unlicense',  repo_url: 'https://github.com/PerpetualBeta/Centipede',                        is_vendored: true },
  { slug: 'missile-command', name: 'Missile Command', category: 'arcade',     controls: 'Mouse: click to aim and fire',                  file: 'games/missile-command/index.html', color: '#f97316', license: 'MIT',        repo_url: 'https://github.com/andymason/Missile-Command-JavaScript-Clone',    is_vendored: true },
  { slug: 'tetris-canvas',   name: 'Tetris Classic',  category: 'arcade',     controls: 'Arrows move, Up rotates',                       file: 'games/tetris-canvas/index.html',   color: '#dc2626', license: 'MIT',        repo_url: 'https://github.com/dionyziz/canvas-tetris',                        is_vendored: true },
  { slug: 'pacman',          name: 'Pac-Man',         category: 'arcade',     controls: 'Enter to insert coin, arrows to move',          file: 'games/pacman/index.html',          color: '#facc15', license: 'MIT',        repo_url: 'https://github.com/nethan-k/pacman',                               is_vendored: true },
  { slug: 'frogger',         name: 'Frogger',         category: 'arcade',     controls: 'Arrows to move',                                file: 'games/frogger/index.html',         color: '#10b981', license: 'MIT',        repo_url: 'https://github.com/brianquach/html5-frogger-clone',                is_vendored: true },
  { slug: 'asteroids',       name: 'Asteroids',       category: 'arcade',     controls: 'Arrows turn and thrust, Space fires',           file: 'games/asteroids/index.html',       color: '#e11d48', license: 'MIT',        repo_url: 'https://github.com/dmcinnes/HTML5-Asteroids',                      is_vendored: true },

  { slug: 'fifteen',         name: '15 Puzzle',       category: 'puzzle',     controls: 'Click or drag tiles to slide',                  file: 'games/fifteen/index.html',         color: '#f59e0b', license: 'MIT',        repo_url: 'https://github.com/Kirilllive/Fifteen_puzzle_maker',               is_vendored: true },
  { slug: 'memory',          name: 'Memory Match',    category: 'puzzle',     controls: 'Click cards to flip, match pairs',              file: 'games/memory/index.html',          color: '#fbbf24', license: 'MIT',        repo_url: 'https://github.com/taniarascia/memory',                            is_vendored: true },
  { slug: 'lights-out',      name: 'Lights Out',      category: 'puzzle',     controls: 'Click a cell to toggle it and neighbors',       file: 'games/lights-out/index.html',      color: '#eab308', license: 'MIT',        repo_url: 'https://github.com/sepandhaghighi/lightsout',                      is_vendored: true },

  { slug: 'reversi',         name: 'Reversi',         category: 'board',      controls: 'Click a legal square to place a disc',          file: 'games/reversi/index.html',         color: '#06b6d4', license: 'MIT',        repo_url: 'https://github.com/alex-berson/reversi',                           is_vendored: true },
  { slug: 'tictactoe',       name: 'Tic Tac Toe',     category: 'board',      controls: 'Click a square',                                file: 'games/tictactoe/index.html',       color: '#0ea5e9', license: 'MIT',        repo_url: 'https://github.com/92181/tictactoe',                               is_vendored: true },

  { slug: 'solitaire',       name: 'Solitaire',       category: 'cards',      controls: 'Drag cards with mouse or touch',                file: 'games/solitaire/index.html',       color: '#a855f7', license: 'Apache-2.0', repo_url: 'https://github.com/0xe1f/solitaire',                               is_vendored: true },

  { slug: 'tower',           name: 'Tower Platformer', category: 'platformer', controls: 'Left/Right move, Space jump',                  file: 'games/tower/index.html',           color: '#22c55e', license: 'MIT',        repo_url: 'https://github.com/jakesgordon/javascript-tower-platformer',       is_vendored: true },

  { slug: 'bullet-hell',     name: 'Bullet Hell',     category: 'shmup',      controls: 'Arrows/WASD move, Z/Space fire, Shift focus',   file: 'games/bullet-hell/index.html',     color: '#ec4899', license: 'MIT',        repo_url: 'https://github.com/selenebun/bullethell',                          is_vendored: true },

  { slug: 'physics',         name: 'Physics Sandbox', category: 'physics',    controls: 'Click-and-hold to spawn circles',               file: 'games/physics/index.html',         color: '#3b82f6', license: 'MIT',        repo_url: 'https://github.com/MartinHeinz/physics-visual',                    is_vendored: true },

  { slug: 'codemonkey',      name: 'Codemonkey',      category: 'word',       controls: 'Type to start, Tab+Enter restart',              file: 'games/codemonkey/index.html',      color: '#14b8a6', license: 'MIT',        repo_url: 'https://github.com/fizzexual/Codemonkey',                          is_vendored: true },
  { slug: 'hangman',         name: 'Hangman',         category: 'word',       controls: 'Click letter buttons or type A-Z',              file: 'games/hangman/index.html',         color: '#2dd4bf', license: 'MIT',        repo_url: 'https://github.com/apache2op/HangmanJS',                           is_vendored: true },
];

// Category display metadata (order + label). Kept here so main.js and
// the service worker can share a single source of truth.
window.CATEGORIES = [
  { key: 'arcade',     label: 'Arcade' },
  { key: 'puzzle',     label: 'Puzzle' },
  { key: 'board',      label: 'Board' },
  { key: 'cards',      label: 'Cards' },
  { key: 'platformer', label: 'Platformer' },
  { key: 'shmup',      label: 'Shmup' },
  { key: 'physics',    label: 'Physics' },
  { key: 'word',       label: 'Word' },
];
