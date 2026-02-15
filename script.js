/**
 * ═══════════════════════════════════════════════════════════
 *  REGNUM CHESS · script.js
 *  Premium chess experience — game logic, AI, UI, animations
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   0. PROTECTION - Disable right-click, inspect, text selection
───────────────────────────────────────────────────────────── */
(function() {
  // Disable right-click
  document.addEventListener('contextmenu', e => e.preventDefault());
  
  // Disable text selection
  document.addEventListener('selectstart', e => e.preventDefault());
  
  // Disable common DevTools shortcuts
  document.addEventListener('keydown', e => {
    // F12
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (DevTools)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && 
        (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === 'U') {
      e.preventDefault();
      return false;
    }
    // Ctrl+S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key === 'S') {
      e.preventDefault();
      return false;
    }
  });
  
  // Prevent drag selection
  document.addEventListener('dragstart', e => e.preventDefault());
  
  // Additional DevTools detection (optional - makes it harder to open DevTools)
  const devToolsCheck = () => {
    const threshold = 160;
    if (window.outerWidth - window.innerWidth > threshold || 
        window.outerHeight - window.innerHeight > threshold) {
      // DevTools might be open - you can add custom handling here
      document.body.innerHTML = '';
    }
  };
  
  // Check on resize
  window.addEventListener('resize', devToolsCheck);
  
  // Disable copy
  document.addEventListener('copy', e => e.preventDefault());
})();

/* ─────────────────────────────────────────────────────────────
   1. PIECE DEFINITIONS
   Unicode pieces with white/black colour classes
───────────────────────────────────────────────────────────── */
const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

/** Positional tables for AI evaluation (from White's perspective) */
const PAWN_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0,
];
const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];
const BISHOP_TABLE = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  5,  0,  0,  0,  0,  5,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];
const ROOK_TABLE = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10, 10, 10, 10, 10,  5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   0,  0,  0,  5,  5,  0,  0,  0,
];
const QUEEN_TABLE = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];
const KING_MID_TABLE = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

function getPieceTable(type) {
  switch(type) {
    case 'p': return PAWN_TABLE;
    case 'n': return KNIGHT_TABLE;
    case 'b': return BISHOP_TABLE;
    case 'r': return ROOK_TABLE;
    case 'q': return QUEEN_TABLE;
    case 'k': return KING_MID_TABLE;
    default: return [];
  }
}

/* ─────────────────────────────────────────────────────────────
   2. AUDIO ENGINE  (Web Audio API — no external files needed)
───────────────────────────────────────────────────────────── */
const Audio = (() => {
  let ctx = null;
  let enabled = true;

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function play(type) {
    if (!enabled) return;
    try {
      init();
      if (ctx.state === 'suspended') ctx.resume();
      const now = ctx.currentTime;

      if (type === 'move') {
        // Soft wooden click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now); osc.stop(now + 0.1);
      } else if (type === 'capture') {
        // Heavier thud
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.12);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now); osc.stop(now + 0.2);
      } else if (type === 'check') {
        // Alert chord
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          const t = now + i * 0.06;
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.start(t); osc.stop(t + 0.35);
        });
      } else if (type === 'gameover') {
        // Descending notes
        [659, 523, 392, 261].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = freq;
          const t = now + i * 0.2;
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.start(t); osc.stop(t + 0.4);
        });
      } else if (type === 'illegal') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.15);
      }
    } catch(e) { /* silent fail */ }
  }

  return { play, setEnabled: v => { enabled = v; } };
})();

/* ─────────────────────────────────────────────────────────────
   3. BACKGROUND CANVAS  (animated gradient mesh)
───────────────────────────────────────────────────────────── */
const BgCanvas = (() => {
  let canvas, ctx, W, H, t = 0;
  const blobs = [];

  function init() {
    canvas = document.getElementById('bgCanvas');
    ctx = canvas.getContext('2d');
    resize();
    // Create blobs
    const colors = [
      [212, 175, 55],  // gold
      [80, 100, 160],  // blue
      [60, 80, 140],   // indigo
      [100, 60, 100],  // purple
    ];
    for (let i = 0; i < 4; i++) {
      blobs.push({
        x: Math.random(), y: Math.random(),
        r: 0.3 + Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 0.0003,
        vy: (Math.random() - 0.5) * 0.0003,
        color: colors[i],
        phase: Math.random() * Math.PI * 2,
      });
    }
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function frame() {
    t += 0.005;
    ctx.clearRect(0, 0, W, H);

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const alpha = isDark ? 0.06 : 0.08;

    blobs.forEach(b => {
      b.x += b.vx + Math.sin(t * 0.3 + b.phase) * 0.0002;
      b.y += b.vy + Math.cos(t * 0.25 + b.phase) * 0.0002;
      if (b.x < 0 || b.x > 1) b.vx *= -1;
      if (b.y < 0 || b.y > 1) b.vy *= -1;
      b.x = Math.max(0, Math.min(1, b.x));
      b.y = Math.max(0, Math.min(1, b.y));

      const grd = ctx.createRadialGradient(
        b.x * W, b.y * H, 0,
        b.x * W, b.y * H, b.r * Math.min(W, H)
      );
      const [r, g, bl] = b.color;
      grd.addColorStop(0, `rgba(${r},${g},${bl},${alpha})`);
      grd.addColorStop(1, `rgba(${r},${g},${bl},0)`);
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);
    });

    requestAnimationFrame(frame);
  }

  return { init };
})();

/* ─────────────────────────────────────────────────────────────
   4. MINI BOARD  (landing page decoration)
───────────────────────────────────────────────────────────── */
function buildMiniBoard() {
  const el = document.getElementById('miniBoard');
  if (!el) return;
  const startPos = [
    ['bR','bN','bB','bQ','bK','bB','bN','bR'],
    ['bP','bP','bP','bP','bP','bP','bP','bP'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['wP','wP','wP','wP','wP','wP','wP','wP'],
    ['wR','wN','wB','wQ','wK','wB','wN','wR'],
  ];
  el.innerHTML = '';
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement('div');
      const isLight = (r + c) % 2 === 0;
      sq.style.cssText = `
        background: ${isLight ? 'var(--sq-light)' : 'var(--sq-dark)'};
        display: flex; align-items: center; justify-content: center;
        font-size: clamp(10px, 2.5vw, 22px);
        line-height: 1;
        aspect-ratio: 1;
      `;
      const piece = startPos[r][c];
      if (piece) {
        sq.textContent = PIECES[piece];
        sq.style.filter = piece.startsWith('w')
          ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
          : 'drop-shadow(0 1px 2px rgba(0,0,0,0.7))';
        sq.style.color = piece.startsWith('w') ? '#f8f4ec' : '#1c1a17';
      }
      el.appendChild(sq);
    }
  }
}

/* ─────────────────────────────────────────────────────────────
   5. GAME STATE
───────────────────────────────────────────────────────────── */
const State = {
  chess: null,           // chess.js instance
  mode: 'single',        // 'single' | 'multi'
  difficulty: 'hard',    // 'easy' | 'medium' | 'hard'
  flipped: false,        // board orientation
  selectedSquare: null,  // currently selected square algebraic
  legalMoves: [],        // array of legal move objects from selected square
  lastMove: null,        // {from, to}
  dragPiece: null,       // {square, el} during drag
  dragGhost: null,       // ghost element during drag
  aiThinking: false,     // prevents double AI calls
  gameOver: false,       // flag
  soundEnabled: true,    // sound setting
  animEnabled: true,     // animation setting
  showCoords: true,      // coord setting

  // Timer
  timerEnabled: false,
  timerSeconds: 300,
  whiteTime: 300,
  blackTime: 300,
  timerInterval: null,

  // Stats
  moveCount: 0,
  captureCount: 0,
  gameStartTime: null,

  // Pending promotion
  pendingPromotion: null, // {from, to, callback}
};

/* ─────────────────────────────────────────────────────────────
   6. AI ENGINE  (Minimax with alpha-beta pruning)
───────────────────────────────────────────────────────────── */
const AI = (() => {

  /** Evaluate position from White's perspective */
  function evaluate(chess) {
    let score = 0;
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (!sq) continue;
        const val = PIECE_VALUES[sq.type] || 0;
        const table = getPieceTable(sq.type);
        // For black pieces, mirror the table index
        const idx = sq.color === 'w' ? (r * 8 + c) : (56 - r * 8 + c);
        const posVal = table[idx] || 0;
        const total = val + posVal;
        score += sq.color === 'w' ? total : -total;
      }
    }
    return score;
  }

  /** Minimax with alpha-beta pruning */
  function minimax(chess, depth, alpha, beta, maximising) {
    if (depth === 0 || chess.game_over()) {
      if (chess.in_checkmate()) return maximising ? -99999 : 99999;
      if (chess.in_draw() || chess.in_stalemate() || chess.in_threefold_repetition()) return 0;
      return evaluate(chess);
    }

    const moves = chess.moves({ verbose: true });
    // Move ordering: captures first for better pruning
    moves.sort((a, b) => {
      const aCapture = a.captured ? PIECE_VALUES[a.captured] || 0 : 0;
      const bCapture = b.captured ? PIECE_VALUES[b.captured] || 0 : 0;
      return bCapture - aCapture;
    });

    if (maximising) {
      let best = -Infinity;
      for (const move of moves) {
        chess.move(move);
        best = Math.max(best, minimax(chess, depth - 1, alpha, beta, false));
        chess.undo();
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break; // prune
      }
      return best;
    } else {
      let best = Infinity;
      for (const move of moves) {
        chess.move(move);
        best = Math.min(best, minimax(chess, depth - 1, alpha, beta, true));
        chess.undo();
        beta = Math.min(beta, best);
        if (beta <= alpha) break; // prune
      }
      return best;
    }
  }

  function getBestMove(chess, difficulty) {
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return null;

    if (difficulty === 'easy') {
      // Random with slight preference for captures
      const captures = moves.filter(m => m.captured);
      if (captures.length && Math.random() < 0.5) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

    const depth = difficulty === 'medium' ? 2 : 3;
    // AI plays as black (minimising player when White is maximising)
    const isMaximising = chess.turn() === 'w';

    let bestScore = isMaximising ? -Infinity : Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
      chess.move(move);
      const score = minimax(chess, depth - 1, -Infinity, Infinity, !isMaximising);
      chess.undo();

      if (isMaximising ? score > bestScore : score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  return { getBestMove };
})();

/* ─────────────────────────────────────────────────────────────
   7. BOARD RENDERER
───────────────────────────────────────────────────────────── */
const Board = (() => {

  const boardEl = () => document.getElementById('chessboard');

  /** Build the complete 8×8 board */
  function build() {
    const el = boardEl();
    el.innerHTML = '';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('div');
        const rank = State.flipped ? r + 1 : 8 - r;
        const file = State.flipped ? 7 - c : c;
        const algFile = 'abcdefgh'[file];
        const algRank = rank;
        const algName = algFile + algRank;

        // a1 is dark: rank=1, file=0 → sum=1 (odd) → dark. Correct formula:
        sq.className = 'square ' + ((rank + file) % 2 === 0 ? 'light' : 'dark');
        sq.dataset.square = algName;
        el.appendChild(sq);
      }
    }

    // Re-apply event listeners
    setupSquareListeners();
    render();
  }

  /** Render pieces, highlights etc. */
  function render() {
    const el = boardEl();
    if (!el || !State.chess) return;

    const board = State.chess.board();

    el.querySelectorAll('.square').forEach(sq => {
      const algName = sq.dataset.square;
      const [file, rank] = [algName.charCodeAt(0) - 97, parseInt(algName[1]) - 1];

      // board[0]=rank8, board[7]=rank1; rank here is 0-indexed (0-7) → index = 7-rank
      const piece = board[7 - rank][file];

      // Clear previous piece + annotations
      sq.innerHTML = '';
      sq.classList.remove('selected', 'legal-move', 'legal-capture', 'last-move', 'in-check');

      // Last move highlight
      if (State.lastMove) {
        if (algName === State.lastMove.from || algName === State.lastMove.to) {
          sq.classList.add('last-move');
        }
      }

      // Selected highlight
      if (algName === State.selectedSquare) sq.classList.add('selected');

      // Legal move dots
      const lm = State.legalMoves.find(m => m.to === algName);
      if (lm) {
        if (lm.captured || lm.flags.includes('e')) {
          sq.classList.add('legal-capture');
        } else {
          sq.classList.add('legal-move');
        }
      }

      // Check highlight
      if (State.chess.in_check()) {
        const turn = State.chess.turn();
        if (piece && piece.type === 'k' && piece.color === turn) {
          sq.classList.add('in-check');
        }
      }

      // Place piece
      if (piece) {
        const pEl = document.createElement('div');
        const key = piece.color + piece.type.toUpperCase();
        pEl.className = `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`;
        pEl.textContent = PIECES[key];
        pEl.dataset.square = algName;
        pEl.dataset.color = piece.color;
        pEl.dataset.type = piece.type;
        sq.appendChild(pEl);
      }
    });
  }

  /** Update rank/file labels based on flip state */
  function updateCoords() {
    const ranks = document.querySelectorAll('.coord-ranks span');
    const files = document.querySelectorAll('.coord-files span');
    ranks.forEach((el, i) => {
      el.textContent = State.flipped ? i + 1 : 8 - i;
    });
    const fileLetters = 'abcdefgh';
    files.forEach((el, i) => {
      el.textContent = State.flipped ? fileLetters[7 - i] : fileLetters[i];
    });
  }

  function setupSquareListeners() {
    const el = boardEl();
    el.querySelectorAll('.square').forEach(sq => {
      sq.addEventListener('click', onSquareClick);
      sq.addEventListener('mousedown', onDragStart);
      sq.addEventListener('touchstart', onTouchStart, { passive: false });
    });
  }

  return { build, render, updateCoords };
})();

/* ─────────────────────────────────────────────────────────────
   8. MOVE HANDLING
───────────────────────────────────────────────────────────── */
function onSquareClick(e) {
  if (State.gameOver || State.aiThinking) return;
  const sq = e.currentTarget.dataset.square || e.target.closest('[data-square]')?.dataset.square;
  if (!sq) return;

  // In single-player mode, only move white pieces on white's turn
  if (State.mode === 'single' && State.chess.turn() === 'b') return;

  handleSquareInteraction(sq);
}

function handleSquareInteraction(square) {
  const chess = State.chess;

  // If a square is already selected, try to make the move
  if (State.selectedSquare) {
    const moveObj = State.legalMoves.find(m => m.to === square);
    if (moveObj) {
      // Check for pawn promotion
      if (moveObj.flags.includes('p')) {
        showPromotionModal(moveObj.from, moveObj.to, chess.turn(), (promo) => {
          executeMove({ from: moveObj.from, to: moveObj.to, promotion: promo });
        });
        return;
      }
      executeMove({ from: moveObj.from, to: moveObj.to });
      return;
    }
    // Deselect if clicking own piece
    const board = chess.board();
    const [file, rank] = [square.charCodeAt(0) - 97, parseInt(square[1]) - 1];
    const piece = board[8 - (rank + 1)][file];
    if (piece && piece.color === chess.turn()) {
      selectSquare(square);
      return;
    }
    deselectSquare();
    return;
  }

  // Select a piece
  const [file, rank] = [square.charCodeAt(0) - 97, parseInt(square[1]) - 1];
  const board = chess.board();
  const piece = board[7 - rank][file];
  if (piece && piece.color === chess.turn()) {
    selectSquare(square);
  }
}

function selectSquare(square) {
  State.selectedSquare = square;
  State.legalMoves = State.chess.moves({ square, verbose: true });
  Board.render();
  Audio.play('move');
}

function deselectSquare() {
  State.selectedSquare = null;
  State.legalMoves = [];
  Board.render();
}

function executeMove(move) {
  const chess = State.chess;
  const result = chess.move(move);
  if (!result) {
    Audio.play('illegal');
    deselectSquare();
    return;
  }

  State.lastMove = { from: result.from, to: result.to };
  State.selectedSquare = null;
  State.legalMoves = [];
  State.moveCount++;

  // Sound
  if (result.captured) {
    Audio.play('capture');
    State.captureCount++;
  } else {
    Audio.play('move');
  }

  if (chess.in_check()) Audio.play('check');

  Board.render();
  updateMoveHistory();
  updateCapturedPieces();
  updatePlayerStrips();
  updateStatus();

  // Check game over
  if (chess.game_over()) {
    setTimeout(() => endGame(), 500);
    return;
  }

  // Switch timer
  switchTimer();

  // Trigger AI if single-player and it's black's turn
  if (State.mode === 'single' && chess.turn() === 'b') {
    setTimeout(triggerAI, 400);
  }
}

/* ─────────────────────────────────────────────────────────────
   9. AI TRIGGER
───────────────────────────────────────────────────────────── */
function triggerAI() {
  if (State.gameOver || State.chess.turn() !== 'b') return;
  State.aiThinking = true;
  showAIThinking(true);

  // Use setTimeout to not block UI
  setTimeout(() => {
    const move = AI.getBestMove(State.chess, State.difficulty);
    State.aiThinking = false;
    showAIThinking(false);

    if (move && !State.gameOver) {
      executeMove(move);
    }
  }, State.difficulty === 'hard' ? 300 : 100);
}

function showAIThinking(show) {
  let el = document.getElementById('aiThinkingBadge');
  if (show && !el) {
    el = document.createElement('div');
    el.id = 'aiThinkingBadge';
    el.className = 'ai-thinking visible';
    el.innerHTML = '<span>AI thinking</span><span class="thinking-dots"><span></span><span></span><span></span></span>';
    document.querySelector('.board-area')?.prepend(el);
  } else if (!show && el) {
    el.remove();
  }
}

/* ─────────────────────────────────────────────────────────────
   10. DRAG AND DROP
───────────────────────────────────────────────────────────── */
function onDragStart(e) {
  if (e.button !== 0) return;
  const pEl = e.target.closest('.piece');
  if (!pEl) return;
  if (State.gameOver || State.aiThinking) return;

  const square = pEl.closest('[data-square]')?.dataset.square;
  if (!square) return;

  const chess = State.chess;
  const [file, rank] = [square.charCodeAt(0) - 97, parseInt(square[1]) - 1];
  const piece = chess.board()[7 - rank][file];
  if (!piece || piece.color !== chess.turn()) return;
  if (State.mode === 'single' && chess.turn() === 'b') return;

  e.preventDefault();
  startDrag(pEl, square, e.clientX, e.clientY, false);
}

function onTouchStart(e) {
  const pEl = e.target.closest('.piece');
  if (!pEl) return;
  if (State.gameOver || State.aiThinking) return;

  const square = pEl.closest('[data-square]')?.dataset.square;
  if (!square) return;

  const chess = State.chess;
  const [file, rank] = [square.charCodeAt(0) - 97, parseInt(square[1]) - 1];
  const piece = chess.board()[7 - rank][file];
  if (!piece || piece.color !== chess.turn()) return;
  if (State.mode === 'single' && chess.turn() === 'b') return;

  e.preventDefault();
  const t = e.touches[0];
  startDrag(pEl, square, t.clientX, t.clientY, true);
}

function startDrag(pEl, square, x, y, isTouch) {
  // Create ghost
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  ghost.textContent = pEl.textContent;
  ghost.style.color = pEl.style.color;
  ghost.style.webkitTextStroke = pEl.style.webkitTextStroke;
  ghost.style.filter = 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))';
  document.body.appendChild(ghost);

  State.dragPiece = { square, pEl };
  State.dragGhost = ghost;

  pEl.classList.add('dragging');
  pEl.style.opacity = '0.3';

  moveGhost(x, y);
  selectSquare(square);

  if (isTouch) {
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
  } else {
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }
}

function moveGhost(x, y) {
  if (!State.dragGhost) return;
  State.dragGhost.style.left = x + 'px';
  State.dragGhost.style.top = y + 'px';
}

function onMouseMove(e) { moveGhost(e.clientX, e.clientY); }
function onTouchMove(e) {
  e.preventDefault();
  moveGhost(e.touches[0].clientX, e.touches[0].clientY);
}

function getSquareAtPoint(x, y) {
  const els = document.elementsFromPoint(x, y);
  for (const el of els) {
    if (el.dataset && el.dataset.square) return el.dataset.square;
    const sq = el.closest ? el.closest('[data-square]') : null;
    if (sq) return sq.dataset.square;
  }
  return null;
}

function endDrag(x, y) {
  if (!State.dragPiece) return;
  const { pEl } = State.dragPiece;

  // Cleanup ghost
  if (State.dragGhost) {
    State.dragGhost.remove();
    State.dragGhost = null;
  }

  pEl.classList.remove('dragging');
  pEl.style.opacity = '';

  const dropSquare = getSquareAtPoint(x, y);
  if (dropSquare && dropSquare !== State.dragPiece.square) {
    handleSquareInteraction(dropSquare);
  } else {
    deselectSquare();
  }

  State.dragPiece = null;

  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.removeEventListener('touchmove', onTouchMove);
  document.removeEventListener('touchend', onTouchEnd);
}

function onMouseUp(e) { endDrag(e.clientX, e.clientY); }
function onTouchEnd(e) {
  const t = e.changedTouches[0];
  endDrag(t.clientX, t.clientY);
}

/* ─────────────────────────────────────────────────────────────
   11. PROMOTION MODAL
───────────────────────────────────────────────────────────── */
function showPromotionModal(from, to, color, cb) {
  State.pendingPromotion = { from, to, cb };
  const pieces = ['q', 'r', 'b', 'n'];
  const labels = { q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' };
  const container = document.getElementById('promotionChoices');
  container.innerHTML = '';

  pieces.forEach(p => {
    const key = color + p.toUpperCase();
    const btn = document.createElement('button');
    btn.className = `promotion-piece ${color === 'w' ? 'white-piece' : 'black-piece'}`;
    btn.title = labels[p];
    btn.textContent = PIECES[key];
    btn.style.color = color === 'w' ? '#f8f4ec' : '#1c1a17';
    btn.addEventListener('click', () => {
      closeModal('promotionModal');
      cb(p);
      State.pendingPromotion = null;
    });
    container.appendChild(btn);
  });

  openModal('promotionModal');
}

/* ─────────────────────────────────────────────────────────────
   12. GAME STATUS UPDATES
───────────────────────────────────────────────────────────── */
function updateStatus() {
  const chess = State.chess;
  const statusText = document.getElementById('statusText');
  const statusIcon = document.getElementById('statusIcon');
  if (!statusText) return;

  const turn = chess.turn();
  const turnName = turn === 'w' ? 'White' : 'Black';

  if (chess.in_check()) {
    statusText.textContent = `${turnName} in Check!`;
    statusIcon.textContent = '⚠';
  } else if (chess.game_over()) {
    if (chess.in_checkmate()) {
      const winner = turn === 'w' ? 'Black' : 'White';
      statusText.textContent = `${winner} wins!`;
      statusIcon.textContent = '♛';
    } else {
      statusText.textContent = 'Draw';
      statusIcon.textContent = '🤝';
    }
  } else {
    statusText.textContent = `${turnName}'s Turn`;
    statusIcon.textContent = turn === 'w' ? '♔' : '♚';
  }
}

function updatePlayerStrips() {
  const turn = State.chess.turn();
  document.getElementById('whiteStrip')?.classList.toggle('active', turn === 'w');
  document.getElementById('blackStrip')?.classList.toggle('active', turn === 'b');
  document.getElementById('whiteDot')?.classList.toggle('active', turn === 'w');
  document.getElementById('blackDot')?.classList.toggle('active', turn === 'b');
}

function updateMoveHistory() {
  const history = State.chess.history({ verbose: true });
  const container = document.getElementById('moveHistory');
  if (!container) return;

  container.innerHTML = '';
  if (history.length === 0) {
    container.innerHTML = '<div class="history-placeholder">No moves yet</div>';
    return;
  }

  for (let i = 0; i < history.length; i += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';

    const num = document.createElement('span');
    num.className = 'move-num';
    num.textContent = Math.floor(i / 2) + 1 + '.';

    const white = document.createElement('span');
    white.className = 'move-cell' + (i === history.length - 1 ? ' current' : '');
    white.textContent = history[i].san;

    row.appendChild(num);
    row.appendChild(white);

    if (history[i + 1]) {
      const black = document.createElement('span');
      black.className = 'move-cell' + (i + 1 === history.length - 1 ? ' current' : '');
      black.textContent = history[i + 1].san;
      row.appendChild(black);
    }

    container.appendChild(row);
  }

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function updateCapturedPieces() {
  const history = State.chess.history({ verbose: true });
  const capturedByWhite = []; // pieces white captured (black pieces)
  const capturedByBlack = []; // pieces black captured (white pieces)

  history.forEach(move => {
    if (move.captured) {
      const key = (move.color === 'w' ? 'b' : 'w') + move.captured.toUpperCase();
      if (move.color === 'w') capturedByWhite.push(key);
      else capturedByBlack.push(key);
    }
  });

  function renderCaptured(containerId, pieces) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = '';
    const sortOrder = ['q', 'r', 'b', 'n', 'p'];
    pieces.sort((a, b) => sortOrder.indexOf(a[1].toLowerCase()) - sortOrder.indexOf(b[1].toLowerCase()));
    pieces.forEach(k => {
      const span = document.createElement('span');
      span.className = 'captured-piece';
      span.textContent = PIECES[k] || '';
      el.appendChild(span);
    });
  }

  renderCaptured('capturedByWhite', capturedByWhite);
  renderCaptured('capturedByBlack', capturedByBlack);

  // Material advantage score
  const advantage = calculateAdvantage(capturedByWhite, capturedByBlack);
  document.getElementById('whiteScore').textContent = advantage > 0 ? '+' + advantage : '';
  document.getElementById('blackScore').textContent = advantage < 0 ? '+' + Math.abs(advantage) : '';
}

function calculateAdvantage(capturedByWhite, capturedByBlack) {
  const sum = arr => arr.reduce((s, k) => s + (PIECE_VALUES[k[1].toLowerCase()] || 0), 0);
  return Math.round((sum(capturedByWhite) - sum(capturedByBlack)) / 100);
}

/* ─────────────────────────────────────────────────────────────
   13. TIMER
───────────────────────────────────────────────────────────── */
function initTimers() {
  clearInterval(State.timerInterval);
  State.whiteTime = State.timerSeconds;
  State.blackTime = State.timerSeconds;
  renderTimers();
}

function renderTimers() {
  const fmt = s => {
    if (s <= 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const wEl = document.getElementById('whiteTimer');
  const bEl = document.getElementById('blackTimer');
  if (!State.timerEnabled) {
    if (wEl) wEl.textContent = '—';
    if (bEl) bEl.textContent = '—';
    return;
  }
  if (wEl) {
    wEl.textContent = fmt(State.whiteTime);
    wEl.classList.toggle('urgent', State.whiteTime <= 30 && State.whiteTime > 0);
  }
  if (bEl) {
    bEl.textContent = fmt(State.blackTime);
    bEl.classList.toggle('urgent', State.blackTime <= 30 && State.blackTime > 0);
  }
}

function switchTimer() {
  if (!State.timerEnabled) return;
  clearInterval(State.timerInterval);
  if (State.chess.game_over() || State.gameOver) return;

  const turn = State.chess.turn();
  State.timerInterval = setInterval(() => {
    if (turn === 'w') State.whiteTime--;
    else State.blackTime--;

    renderTimers();

    if ((turn === 'w' && State.whiteTime <= 0) ||
        (turn === 'b' && State.blackTime <= 0)) {
      clearInterval(State.timerInterval);
      if (!State.gameOver) {
        const winner = turn === 'w' ? 'Black' : 'White';
        showGameOver('Time Out!', `${winner} wins on time`, '⏱');
      }
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(State.timerInterval);
}

/* ─────────────────────────────────────────────────────────────
   14. GAME OVER
───────────────────────────────────────────────────────────── */
function endGame() {
  const chess = State.chess;
  State.gameOver = true;
  stopTimer();
  Audio.play('gameover');

  let title = 'Game Over';
  let subtitle = '';
  let emblem = '♛';

  if (chess.in_checkmate()) {
    const winner = chess.turn() === 'w' ? 'Black' : 'White';
    title = 'Checkmate!';
    subtitle = `${winner} wins the game`;
    emblem = chess.turn() === 'w' ? '♚' : '♔';
  } else if (chess.in_stalemate()) {
    title = 'Stalemate';
    subtitle = 'The game is a draw';
    emblem = '⚖';
  } else if (chess.in_threefold_repetition()) {
    title = 'Draw';
    subtitle = 'Threefold repetition';
    emblem = '⚖';
  } else if (chess.insufficient_material()) {
    title = 'Draw';
    subtitle = 'Insufficient material';
    emblem = '⚖';
  } else {
    title = 'Draw';
    subtitle = '50-move rule';
    emblem = '⚖';
  }

  showGameOver(title, subtitle, emblem);
}

function showGameOver(title, subtitle, emblem) {
  State.gameOver = true;

  // Stats
  const elapsed = State.gameStartTime
    ? Math.floor((Date.now() - State.gameStartTime) / 1000)
    : 0;
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;

  document.getElementById('gameoverTitle').textContent = title;
  document.getElementById('gameoverSubtitle').textContent = subtitle;
  document.getElementById('gameoverEmblem').textContent = emblem;
  document.getElementById('statMoves').textContent = Math.ceil(State.moveCount / 2);
  document.getElementById('statTime').textContent = `${m}:${s.toString().padStart(2,'0')}`;
  document.getElementById('statCaptures').textContent = State.captureCount;

  setTimeout(() => openModal('gameoverModal'), 600);
}

/* ─────────────────────────────────────────────────────────────
   15. GAME INIT
───────────────────────────────────────────────────────────── */
function startGame(mode) {
  State.mode = mode;
  State.chess = new Chess();
  State.selectedSquare = null;
  State.legalMoves = [];
  State.lastMove = null;
  State.gameOver = false;
  State.aiThinking = false;
  State.moveCount = 0;
  State.captureCount = 0;
  State.gameStartTime = Date.now();

  // Board flip — black plays from bottom in multiplayer
  State.flipped = false;

  // Update UI labels
  const modeBadge = document.getElementById('modeBadge');
  const diffPanel = document.getElementById('difficultyPanel');
  const timerPanel = document.getElementById('timerPanel');
  const undoBtn = document.getElementById('undoBtn');

  if (mode === 'single') {
    modeBadge.textContent = `vs AI · ${State.difficulty.charAt(0).toUpperCase() + State.difficulty.slice(1)}`;
    diffPanel.style.display = '';
    timerPanel.style.display = 'none';
    undoBtn.style.display = '';
    document.getElementById('whiteName').textContent = 'You';
    document.getElementById('blackName').textContent = 'AI';
    State.timerEnabled = false;
  } else {
    modeBadge.textContent = 'Local Multiplayer';
    diffPanel.style.display = 'none';
    timerPanel.style.display = '';
    undoBtn.style.display = 'none';
    document.getElementById('whiteName').textContent = 'White';
    document.getElementById('blackName').textContent = 'Black';
  }

  Board.build();
  Board.updateCoords();
  updateStatus();
  updatePlayerStrips();
  updateMoveHistory();
  updateCapturedPieces();

  if (State.timerEnabled) {
    initTimers();
    switchTimer();
  } else {
    initTimers(); // just sets display to —
  }

  // Navigate to game page
  navigateTo('gamePage');
}

function restartGame() {
  startGame(State.mode);
}

/* ─────────────────────────────────────────────────────────────
   16. NAVIGATION
───────────────────────────────────────────────────────────── */
function navigateTo(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) {
    setTimeout(() => target.classList.add('active'), 50);
  }
}

/* ─────────────────────────────────────────────────────────────
   17. MODALS
───────────────────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

/* ─────────────────────────────────────────────────────────────
   18. SETTINGS
───────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const darkBtn = document.getElementById('darkModeToggle');
  if (darkBtn) darkBtn.classList.toggle('active', theme === 'dark');
}

function applyBoardTheme(theme) {
  document.documentElement.setAttribute('data-board', theme);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.board === theme);
  });
  Board.render();
}

/* ─────────────────────────────────────────────────────────────
   19. EVENT LISTENERS SETUP
───────────────────────────────────────────────────────────── */
function setupEvents() {
  // Landing navigation
  document.getElementById('playSingle')?.addEventListener('click', () => {
    State.mode = 'single';
    startGame('single');
  });

  document.getElementById('playMulti')?.addEventListener('click', () => {
    State.mode = 'multi';
    startGame('multi');
  });

  // Back button
  document.getElementById('backBtn')?.addEventListener('click', () => {
    if (!State.gameOver && State.chess?.history().length > 0) {
      showConfirm('Leave Game?', 'Your current game will be lost.', () => {
        stopTimer();
        navigateTo('landing');
      });
    } else {
      stopTimer();
      navigateTo('landing');
    }
  });

  // Undo
  document.getElementById('undoBtn')?.addEventListener('click', () => {
    if (State.gameOver || !State.chess) return;
    // Undo twice in single-player (undo AI move too)
    State.chess.undo();
    if (State.mode === 'single') State.chess.undo();
    State.lastMove = null;
    State.selectedSquare = null;
    State.legalMoves = [];
    State.gameOver = false;
    State.moveCount = Math.max(0, State.moveCount - (State.mode === 'single' ? 2 : 1));
    Board.render();
    updateMoveHistory();
    updateCapturedPieces();
    updateStatus();
    updatePlayerStrips();
  });

  // Flip board
  document.getElementById('flipBtn')?.addEventListener('click', () => {
    State.flipped = !State.flipped;
    const boardEl = document.getElementById('chessboard');
    boardEl.classList.add('flipping');
    setTimeout(() => {
      boardEl.classList.remove('flipping');
      Board.build();
      Board.updateCoords();
    }, 300);
  });

  // Restart
  document.getElementById('restartBtn')?.addEventListener('click', () => {
    showConfirm('Restart Game?', 'Your current game will be lost.', restartGame);
  });

  // Settings button
  document.getElementById('settingsBtn')?.addEventListener('click', () => openModal('settingsModal'));

  // Close modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Overlay click to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay && overlay.id !== 'promotionModal') {
        closeModal(overlay.id);
      }
    });
  });

  // Game Over actions
  document.getElementById('playAgainBtn')?.addEventListener('click', () => {
    closeModal('gameoverModal');
    restartGame();
  });

  document.getElementById('goHomeBtn')?.addEventListener('click', () => {
    closeModal('gameoverModal');
    stopTimer();
    navigateTo('landing');
  });

  // Theme toggle (landing + game)
  ['themeToggleLanding', 'themeToggleGame'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });

  // Settings dark mode toggle
  document.getElementById('darkModeToggle')?.addEventListener('click', (e) => {
    const btn = e.currentTarget;
    btn.classList.toggle('active');
    applyTheme(btn.classList.contains('active') ? 'dark' : 'light');
  });

  // Sound toggles
  const updateSound = (enabled) => {
    State.soundEnabled = enabled;
    Audio.setEnabled(enabled);
    document.body.classList.toggle('sound-off', !enabled);
    ['soundSettingToggle'].forEach(id => {
      document.getElementById(id)?.classList.toggle('active', enabled);
    });
  };

  document.getElementById('soundToggle')?.addEventListener('click', () => {
    updateSound(!State.soundEnabled);
  });
  document.getElementById('soundSettingToggle')?.addEventListener('click', (e) => {
    updateSound(!e.currentTarget.classList.contains('active'));
  });

  // Animation toggle
  document.getElementById('animToggle')?.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('active');
    State.animEnabled = e.currentTarget.classList.contains('active');
  });

  // Coord toggle
  document.getElementById('coordToggle')?.addEventListener('click', (e) => {
    e.currentTarget.classList.toggle('active');
    State.showCoords = e.currentTarget.classList.contains('active');
    document.body.classList.toggle('no-coords', !State.showCoords);
  });

  // Board theme swatches
  document.querySelectorAll('.swatch[data-board]').forEach(swatch => {
    swatch.addEventListener('click', () => applyBoardTheme(swatch.dataset.board));
  });

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.difficulty = btn.dataset.level;
      const badge = document.getElementById('modeBadge');
      if (badge && State.mode === 'single') {
        badge.textContent = `vs AI · ${State.difficulty.charAt(0).toUpperCase() + State.difficulty.slice(1)}`;
      }
    });
  });

  // Timer buttons (multiplayer)
  document.querySelectorAll('.timer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.timer-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const seconds = parseInt(btn.dataset.time);
      State.timerSeconds = seconds;
      State.timerEnabled = seconds > 0;
      initTimers();
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => {
        if (m.id !== 'promotionModal') closeModal(m.id);
      });
    }
    if (e.key === 'u' && !e.ctrlKey && document.getElementById('gamePage')?.classList.contains('active')) {
      document.getElementById('undoBtn')?.click();
    }
  });
}

/* Confirm modal helper */
let _confirmCallback = null;
function showConfirm(title, subtitle, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmSubtitle').textContent = subtitle;
  _confirmCallback = cb;
  openModal('confirmModal');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('confirmYes')?.addEventListener('click', () => {
    closeModal('confirmModal');
    if (_confirmCallback) { _confirmCallback(); _confirmCallback = null; }
  });
  document.getElementById('confirmNo')?.addEventListener('click', () => closeModal('confirmModal'));
});

/* ─────────────────────────────────────────────────────────────
   20. LOADER
───────────────────────────────────────────────────────────── */
function runLoader() {
  const bar = document.getElementById('loaderBar');
  const loader = document.getElementById('loader');
  let progress = 0;

  const interval = setInterval(() => {
    progress += Math.random() * 18 + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      if (bar) bar.style.width = '100%';

      setTimeout(() => {
        loader.classList.add('fade-out');
        setTimeout(() => {
          loader.remove();
          document.getElementById('landing').classList.add('active');
        }, 600);
      }, 300);
    }
    if (bar) bar.style.width = progress + '%';
  }, 80);
}

/* ─────────────────────────────────────────────────────────────
   21. INIT
───────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize background
  BgCanvas.init();

  // Build decorative mini board
  buildMiniBoard();

  // Set up all event listeners
  setupEvents();

  // Set dark mode toggle initial state
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.getElementById('darkModeToggle')?.classList.toggle('active', isDark);

  // Run loader
  runLoader();
});

/* ─────────────────────────────────────────────────────────────
   22. UTILITY
───────────────────────────────────────────────────────────── */
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

window.addEventListener('resize', debounce(() => {
  if (document.getElementById('gamePage')?.classList.contains('active')) {
    Board.build();
    Board.updateCoords();
  }
}, 200));