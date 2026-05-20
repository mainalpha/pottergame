/** Server-side duel engine вЂ” authoritative game state. */

'use strict';

const dbBridge = require('./db-bridge');
const dbPool = require('./db');

// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Constants
// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

const STARTING_HP = 20;
const CARDS_PER_HAND = 5;
const TURN_TIME_LIMIT_MS = 30_000;
const PRE_GAME_COUNTDOWN_MS = 3_000;
const COIN_ANIMATION_MS = 3_500;
const FACTION_PICK_TIMEOUT_MS = 15_000;
const CRITICAL_HIT_CHANCE = 0.10;
const BOT_USER_ID = 'BOT_WIZARD';

// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// Room Class вЂ” Manages a single game instance
// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

class Room {
  /**
   * @param {string}   id        Unique room / match ID.
   * @param {'1v1'|'2v2'} mode   Game mode.
   * @param {string[]} playerIds Array of player user-IDs.
   */
  constructor(id, mode, playerIds) {
    this.id = id;
    this.mode = mode;
    this.players = playerIds.map((id) => String(id));

    this.hp = {};
    this.players.forEach((pid) => {
      this.hp[pid] = STARTING_HP;
    });

    this.factions = {};
    this.turnOrder = [];
    this.profiles = {};
    this.hands = {};
    this.decks = {};
    this.coinToss = null;
    this.factionChooserId = null;

    // Per-round card submissions
    this.submissions = {};  // { [playerId]: cardId | [cardId, cardId] }

    // Turn management
    this.currentTurnIndex = 0;
    this.turnTimerId = null;
    this.roundNumber = 0;
    this.active = false;
    this.playerSockets = {};
    this.dbMatchId = null;
  }

  /** The player whose turn it currently is. */
  get currentTurnPlayer() {
    return this.turnOrder[this.currentTurnIndex % this.turnOrder.length];
  }

  /** Clean up interval to prevent memory leaks. */
  clearTurnTimer() {
    if (this.turnTimerId !== null) {
      clearInterval(this.turnTimerId);
      this.turnTimerId = null;
    }
  }
}

// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
// GameEngine Class
// в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

class GameEngine {
  constructor() {
    /** @type {Map<string, Room>} Active rooms keyed by room ID. */
    this.rooms = new Map();

    /** Matchmaking queues. */
    this.queue1v1 = [];   // Array of { socketId, userId }
    this.queue2v2 = [];
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Matchmaking в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Add a player to the appropriate matchmaking queue.
   * When enough players are queued, a Room is created automatically.
   *
   * @param {object}  socket   The player's Socket.io socket.
   * @param {string}  userId   Authenticated user ID.
   * @param {'1v1'|'2v2'} mode Desired game mode.
   * @param {object}  io       The Socket.io server instance.
   */
  async joinQueue(socket, userId, mode, io) {
    if (this.findRoomByPlayer(userId)) {
      return socket.emit('error', { message: 'You are already in a game.' });
    }

    const entry = { socketId: socket.id, userId };

    if (mode === '1v1') {
      if (this.queue1v1.some((e) => e.userId === userId)) return;
      this.queue1v1.push(entry);

      if (this.queue1v1.length >= 2) {
        const pair = this.queue1v1.splice(0, 2);
        const playerIds = pair.map((e) => e.userId);
        const sockets = pair.map((e) => e.socketId);
        await this._createAndStartRoom('1v1', playerIds, sockets, io);
      }
    } else if (mode === '2v2') {
      if (this.queue2v2.some((e) => e.userId === userId)) return;
      this.queue2v2.push(entry);

      if (this.queue2v2.length >= 4) {
        const group = this.queue2v2.splice(0, 4);
        const playerIds = group.map((e) => e.userId);
        const sockets = group.map((e) => e.socketId);
        await this._createAndStartRoom('2v2', playerIds, sockets, io);
      }
    }
  }

  /**
   * Add a player to a 1v1 match against the AI Bot.
   *
   * @param {object} socket  Player's socket.
   * @param {string} userId  Player's user ID.
   * @param {object} io      Socket.io server instance.
   */
  async joinBotMatch(socket, userId, io) {
    const playerIds = [userId, BOT_USER_ID];
    const sockets = [socket.id, null]; // Bot has no socket
    await this._createAndStartRoom('1v1', playerIds, sockets, io);
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Room Lifecycle в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Internal вЂ” create a Room, run the Sorting Phase, deal cards, start play.
   */
  async _createAndStartRoom(mode, playerIds, socketIds, io) {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const room = new Room(roomId, mode, playerIds);
    this.rooms.set(roomId, room);

    playerIds.forEach((pid, index) => {
      if (socketIds[index]) {
        room.playerSockets[pid] = socketIds[index];
      }
    });

    try {
      const matchDbId = await dbPool.createMatchRecord({ mode, playerIds });
      if (matchDbId) room.dbMatchId = matchDbId;
    } catch (err) {
      console.warn('Match DB record skipped:', err.message);
    }

    socketIds.forEach((sid) => {
      if (sid) {
        const sock = io.sockets.sockets.get(sid);
        if (sock) sock.join(roomId);
      }
    });

    for (const pid of room.players) {
      room.profiles[pid] = await dbBridge.fetchUser(pid);
    }

    io.to(roomId).emit('match_found', {
      roomId,
      mode,
      players: room.players.map((pid) => ({
        id: pid,
        username: room.profiles[pid]?.username || 'Wizard',
        avatar: room.profiles[pid]?.avatar || '/assets/avatars/default.png'
      }))
    });

    await this._coinTossPhase(room, io);

    // в”Ђв”Ђ Pre-game countdown (3 s) в”Ђв”Ђ
    io.to(roomId).emit('countdown', { roomId, seconds: 3 });
    await this._wait(PRE_GAME_COUNTDOWN_MS);

    // в”Ђв”Ђ 3. Deal cards в”Ђв”Ђ
    await this._dealCards(room, io);

    room.active = true;
    room.roundNumber = 1;
    this._broadcastState(room, io);
    this._startTurnTimer(room, io);
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Coin Toss & Faction Pick в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Phoenix / blank coin (like PokГ©mon TCG).
   * Phoenix в†’ flipper chooses faction; blank в†’ opponent chooses.
   */
  async _coinTossPhase(room, io) {
    const humanPlayers = room.players.filter((p) => p !== BOT_USER_ID);
    const flipperId =
      humanPlayers[Math.floor(Math.random() * humanPlayers.length)] ||
      room.players[0];
    const result = Math.random() < 0.5 ? 'phoenix' : 'blank';

    let chooserId;
    if (room.mode === '2v2') {
      const teamA = room.players.slice(0, 2);
      const teamB = room.players.slice(2, 4);
      const flipperTeam = teamA.includes(flipperId) ? teamA : teamB;
      const otherTeam = teamA.includes(flipperId) ? teamB : teamA;
      chooserId = result === 'phoenix' ? flipperTeam[0] : otherTeam[0];
    } else {
      const opponentId = room.players.find((p) => p !== flipperId);
      chooserId = result === 'phoenix' ? flipperId : opponentId;
    }

    room.coinToss = { flipperId, result, chooserId };
    room.factionChooserId = chooserId;

    io.to(room.id).emit('coin_toss', {
      roomId: room.id,
      flipperId,
      result,
      chooserId,
      profiles: room.profiles
    });

    await this._wait(COIN_ANIMATION_MS);

    if (chooserId === BOT_USER_ID) {
      const pick = Math.random() < 0.5 ? 'order' : 'death_eaters';
      await this._assignFactions(room, chooserId, pick, io);
      return;
    }

    io.to(room.id).emit('open_faction_pick', {
      roomId: room.id,
      chooserId: String(chooserId),
      chooserName: room.profiles[chooserId]?.username || 'Wizard'
    });

    const picked = await this._waitForFactionPick(room, chooserId);
    await this._assignFactions(room, chooserId, picked, io);
  }

  _waitForFactionPick(room, chooserId) {
    return new Promise((resolve) => {
      room._factionPickResolve = resolve;
      room._factionPickTimer = setTimeout(() => {
        if (room._factionPickResolve) {
          room._factionPickResolve('order');
          room._factionPickResolve = null;
        }
      }, FACTION_PICK_TIMEOUT_MS);
    });
  }

  async handlePickFaction(userId, faction, io) {
    const room = this.findRoomByPlayer(userId);
    if (!room || String(userId) !== String(room.factionChooserId)) return;

    const pick = faction === 'death_eaters' ? 'death_eaters' : 'order';
    if (room._factionPickResolve) {
      clearTimeout(room._factionPickTimer);
      room._factionPickResolve(pick);
      room._factionPickResolve = null;
    }
  }

  async _assignFactions(room, chooserId, chosenFaction, io) {
    const otherFaction = chosenFaction === 'order' ? 'death_eaters' : 'order';

    if (room.mode === '1v1') {
      const otherId = room.players.find((p) => p !== chooserId);
      room.factions[chooserId] = chosenFaction;
      room.factions[otherId] = otherFaction;
      room.turnOrder = [chooserId, otherId];
      this._randomizeTurnOrder(room);
    } else {
      const teamA = room.players.slice(0, 2);
      const teamB = room.players.slice(2, 4);
      const chooserOnA = teamA.includes(chooserId);

      if (chooserOnA) {
        teamA.forEach((p) => { room.factions[p] = chosenFaction; });
        teamB.forEach((p) => { room.factions[p] = otherFaction; });
        room.turnOrder = [...teamA, ...teamB];
      } else {
        teamB.forEach((p) => { room.factions[p] = chosenFaction; });
        teamA.forEach((p) => { room.factions[p] = otherFaction; });
        room.turnOrder = [...teamB, ...teamA];
      }
      this._randomizeTurnOrder(room);
    }

    const factionsPayload = {};
    for (const pid of room.players) {
      factionsPayload[String(pid)] = room.factions[pid];
    }

    io.to(room.id).emit('faction_ready', {
      roomId: room.id,
      factions: factionsPayload,
      turnOrder: room.turnOrder.map(String),
      firstPlayerId: String(room.currentTurnPlayer),
      profiles: room.profiles
    });
  }

  /**
   * Randomize who moves first (fair coin after factions are set).
   */
  _randomizeTurnOrder(room) {
    if (room.mode === '1v1' && room.turnOrder.length === 2) {
      if (Math.random() < 0.5) {
        room.turnOrder = [room.turnOrder[1], room.turnOrder[0]];
      }
    } else if (room.turnOrder.length > 1) {
      room.turnOrder = this._shuffle(room.turnOrder);
    }
    room.currentTurnIndex = 0;
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Card Management в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Deal 5 cards to hand; remaining shuffled cards go to the draw pile.
   */
  async _dealCards(room, io) {
    for (const pid of room.players) {
      const faction = room.factions[pid];
      const pool = await dbBridge.getPlayerDeck(pid, faction);
      const split = this._splitPoolIntoHandAndDeck(pool, CARDS_PER_HAND);
      room.hands[pid] = split.hand;
      room.decks[pid] = split.deck;

      if (pid !== BOT_USER_ID) {
        this._emitPlayerGameStart(room, pid, io);
      }
    }
  }

  _splitPoolIntoHandAndDeck(pool, handSize) {
    const shuffled = this._shuffle([...pool]);
    const hand = shuffled.splice(0, Math.min(handSize, shuffled.length));
    return { hand, deck: shuffled };
  }

  _emitPlayerGameStart(room, pid, io) {
    const socketId = room.playerSockets[pid];
    const sock = socketId ? io.sockets.sockets.get(socketId) : null;
    if (!sock) return;

    const faction = room.factions[pid];
    sock.emit('start_game', {
      roomId: room.id,
      faction: faction === 'order' ? 'Order of the Phoenix' : 'Death Eaters',
      firstTurn: String(room.currentTurnPlayer) === String(pid),
      currentTurn: room.currentTurnPlayer,
      hand: room.hands[pid],
      deckCount: room.decks[pid]?.length ?? 0,
      round: room.roundNumber,
      profiles: room.profiles
    });
  }

  /**
   * After combat: played cards go to the bottom of the deck; draw from the top
   * until the hand has CARDS_PER_HAND cards again.
   */
  _removePlayedCards(room) {
    for (const pid of room.players) {
      const used = room.submissions[pid];
      if (used === undefined) continue;
      const ids = Array.isArray(used) ? used : [used];
      if (!room.decks[pid]) room.decks[pid] = [];

      for (const cid of ids) {
        if (!cid) continue;
        const idx = room.hands[pid].findIndex((c) => String(c.id) === String(cid));
        if (idx < 0) continue;

        const [played] = room.hands[pid].splice(idx, 1);
        room.decks[pid].push(played);
      }

      this._refillHandToSize(room, pid);
    }
  }

  _refillHandToSize(room, playerId) {
    if (!room.hands[playerId]) room.hands[playerId] = [];
    if (!room.decks[playerId]) room.decks[playerId] = [];

    while (
      room.hands[playerId].length < CARDS_PER_HAND &&
      room.decks[playerId].length > 0
    ) {
      room.hands[playerId].push(room.decks[playerId].shift());
    }
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Turn Timer в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Start a strict 30-second server-side timer.
   * Every second it emits the remaining time.
   * When it reaches 0 the turn auto-passes.
   */
  _startTurnTimer(room, io) {
    room.clearTurnTimer(); // safety: prevent duplicate intervals

    let remaining = TURN_TIME_LIMIT_MS / 1000; // 30

    room.turnTimerId = setInterval(() => {
      remaining -= 1;

      io.to(room.id).emit('update_state', {
        roomId: room.id,
        currentTurn: room.currentTurnPlayer,
        hp: room.hp,
        round: room.roundNumber,
        timer: remaining
      });

      if (remaining <= 0) {
        // Time expired вЂ” auto-pass
        room.clearTurnTimer();
        this._handleTurnTimeout(room, io);
      }
    }, 1000);
  }

  /**
   * Called when the 30-second timer expires.
   * Auto-plays a random card for the current player.
   */
  async _handleTurnTimeout(room, io) {
    const skipped = room.currentTurnPlayer;
    console.log(`вЏ° Turn timeout for ${skipped} in room ${room.id}. Auto-playing...`);

    const hand = room.hands[skipped];
    if (hand && hand.length > 0) {
      const idx = Math.floor(Math.random() * hand.length);
      const randomCard = hand[idx].id;
      
      // Auto-play the card
      await this.handleCastSpell(room, skipped, randomCard, io);
    } else {
      // If no cards, just advance turn
      this._advanceTurn(room, io);
    }
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Combat в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Process a card submission from a player (via cast_spell).
   *
   * 1v1: each player submits 1 card ID.
   * 2v2: each player submits 2 card IDs.
   *
   * Once all players have submitted, combat is resolved.
   *
   * @param {Room}   room
   * @param {string} playerId
   * @param {string|string[]} cardIds  Single ID (1v1) or array of 2 (2v2).
   * @param {object} io
   */
  async handleCastSpell(room, playerId, cardIds, io) {
    if (!room.active) return;

    if (room.mode === '1v1' && String(playerId) !== String(room.currentTurnPlayer)) {
      return;
    }

    const ids = Array.isArray(cardIds) ? cardIds : [cardIds];
    for (const cid of ids) {
      const card = this._findCardInHand(room, playerId, cid);
      if (!card) {
        const sockId = room.playerSockets[playerId];
        const sock = sockId ? io.sockets.sockets.get(sockId) : null;
        sock?.emit('error', { message: 'Invalid card.' });
        return;
      }
    }

    room.submissions[playerId] = cardIds;

    // Check if all required submissions are in
    const allSubmitted = room.players.every(
      (pid) => room.submissions[pid] !== undefined
    );

    if (!allSubmitted) {
      // In 1v1, after the first player submits, move turn to opponent
      if (room.mode === '1v1') {
        this._advanceTurn(room, io);

        // If next player is the Bot, auto-play
        if (room.currentTurnPlayer === BOT_USER_ID) {
          await this._botPlay(room, io);
        }
      }
      return;
    }

    // в”Ђв”Ђ Resolve combat в”Ђв”Ђ
    room.clearTurnTimer();
    await this._resolveCombat(room, io);
  }

  /**
   * Resolve combat once all submissions are in.
   */
  async _resolveCombat(room, io) {
    let result;

    if (room.mode === '1v1') {
      result = this._resolve1v1(room);
    } else {
      result = this._resolve2v2(room);
    }

    const { winnerId, loserId, damage, isCritical, isDraw } = result;

    if (!isDraw) {
      const losers = result.losingPlayers || (loserId ? [loserId] : []);
      for (const pid of losers) {
        if (room.hp[pid] !== undefined) {
          room.hp[pid] = Math.max(0, room.hp[pid] - damage);
        }
      }
    }

    const matchRef = room.dbMatchId ? `db_${room.dbMatchId}` : room.id;
    for (const pid of room.players) {
      const used = room.submissions[pid];
      const ids = Array.isArray(used) ? used : [used];
      for (const cid of ids) {
        if (cid) await dbBridge.recordCardUsage(pid, cid, matchRef);
      }
    }

    const clashCards = this._buildClashCards(room);

    io.to(room.id).emit('turn_result', {
      roomId: room.id,
      round: room.roundNumber,
      clashCards,
      winnerId,
      loserId,
      damageDealt: damage,
      isCritical,
      isDraw,
      hp: room.hp
    });

    this._removePlayedCards(room);

    for (const pid of room.players) {
      if (pid === BOT_USER_ID) continue;
      const socketId = room.playerSockets[pid];
      const sock = socketId ? io.sockets.sockets.get(socketId) : null;
      if (sock) {
        sock.emit('hand_update', {
          hand: room.hands[pid],
          deckCount: room.decks[pid]?.length ?? 0
        });
      }
    }

    // Check for game over
    const gameOver = this._checkGameOver(room);
    if (gameOver.over) {
      await this._endGame(room, gameOver, io);
      return;
    }

    room.submissions = {};
    room.roundNumber += 1;
    this._randomizeTurnOrder(room);
    this._broadcastState(room, io);
    this._startTurnTimer(room, io);

    // If Bot goes first, auto-play
    if (room.currentTurnPlayer === BOT_USER_ID) {
      await this._botPlay(room, io);
    }
  }

  /**
   * 1v1: higher attack wins the clash.
   * Loser loses 2 HP; critical hit doubles to 4.
   */
  _resolve1v1(room) {
    const [p1, p2] = room.turnOrder;

    const card1 = this._getSubmittedCard(room, p1);
    const card2 = this._getSubmittedCard(room, p2);

    if (!card1 || !card2) {
      return { isDraw: true, damage: 0, isCritical: false };
    }

    const atk1 = card1.attack ?? card1.power ?? 0;
    const atk2 = card2.attack ?? card2.power ?? 0;

    if (atk1 === atk2) {
      return {
        isDraw: true,
        winnerId: null,
        loserId: null,
        damage: 0,
        isCritical: false
      };
    }

    const winnerIsP1 = atk1 > atk2;
    const isCritical = Math.random() < CRITICAL_HIT_CHANCE;
    let damage = 2;
    if (isCritical) damage = 4;

    return {
      isDraw: false,
      winnerId: winnerIsP1 ? p1 : p2,
      loserId: winnerIsP1 ? p2 : p1,
      damage,
      isCritical
    };
  }

  /**
   * 2v2 combat: Each player selects 2 cards.
   * Sum = Power_1 + Power_2.  Compare team sums.
   * Losing team members each lose 1 HP (2 on crit).
   */
  _resolve2v2(room) {
    // Teams: first 2 in turnOrder = Order, last 2 = Death Eaters
    const teamOrder = room.turnOrder.filter(
      (pid) => room.factions[pid] === 'order'
    );
    const teamDeath = room.turnOrder.filter(
      (pid) => room.factions[pid] === 'death_eaters'
    );

    const sumOrder = this._teamSum(room, teamOrder);
    const sumDeath = this._teamSum(room, teamDeath);

    if (sumOrder === sumDeath) {
      return {
        isDraw: true,
        winnerId: null,
        loserId: null,
        damage: 0,
        isCritical: false
      };
    }

    const isCritical = Math.random() < CRITICAL_HIT_CHANCE;
    const damage = isCritical ? 2 : 1;
    const winningTeam = sumOrder > sumDeath ? teamOrder : teamDeath;
    const losingTeam = sumOrder > sumDeath ? teamDeath : teamOrder;

    // Apply damage to each member of the losing team
    // (caller handles the actual HP reduction; we return all losers)
    return {
      isDraw: false,
      winnerId: winningTeam.join(','),
      loserId: losingTeam.join(','),
      damage,
      isCritical,
      // Extra data for 2v2 so the caller can apply damage per-player
      losingPlayers: losingTeam
    };
  }

  /**
   * Calculate the combined power of a team's submitted cards.
   */
  _teamSum(room, teamIds) {
    let sum = 0;
    for (const pid of teamIds) {
      const ids = room.submissions[pid] || [];
      const cardIds = Array.isArray(ids) ? ids : [ids];
      for (const cid of cardIds) {
        const card = this._findCardInHand(room, pid, cid);
        sum += card ? card.power : 0;
      }
    }
    return sum;
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ AI Bot в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Basic Bot opponent logic.
   * The bot picks a random card from its hand and submits it.
   */
  async _botPlay(room, io) {
    const hand = room.hands[BOT_USER_ID];
    if (!hand || hand.length === 0) return;

    let selection;

    if (room.mode === '1v1') {
      const idx = Math.floor(Math.random() * hand.length);
      selection = hand[idx].id;
    } else {
      const shuffled = this._shuffle([...hand]);
      selection = [shuffled[0].id, shuffled[1]?.id || shuffled[0].id];
    }

    // Small delay so the bot feels more "human"
    await this._wait(1500);

    await this.handleCastSpell(room, BOT_USER_ID, selection, io);
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Game Over в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Check if any player has reached 0 HP.
   * @returns {{ over: boolean, winnerId?: string, loserId?: string }}
   */
  _checkGameOver(room) {
    for (const pid of room.players) {
      if (room.hp[pid] <= 0) {
        // The other player(s) win
        const winner = room.players.find((p) => room.hp[p] > 0);
        return { over: true, winnerId: winner, loserId: pid };
      }
    }
    return { over: false };
  }

  /**
   * Finalize a match: emit game_over, persist results, clean up.
   */
  async _endGame(room, result, io) {
    room.active = false;
    room.clearTurnTimer();

    io.to(room.id).emit('game_over', {
      roomId: room.id,
      winnerId: result.winnerId,
      loserId: result.loserId,
      finalHp: room.hp,
      totalRounds: room.roundNumber,
      xpReward: 10
    });

    await dbBridge.saveMatchResult({
      matchId: room.dbMatchId ? `db_${room.dbMatchId}` : room.id,
      mode: room.mode,
      players: room.players,
      winnerId: result.winnerId,
      loserId: result.loserId,
      hp: room.hp
    });

    // Remove room from memory
    this.rooms.delete(room.id);
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Helpers в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Advance to the next player's turn and restart the timer.
   */
  _advanceTurn(room, io) {
    room.currentTurnIndex += 1;
    room.clearTurnTimer();
    this._broadcastState(room, io);
    this._startTurnTimer(room, io);
  }

  /**
   * Broadcast the current game state to all players in the room.
   */
  _broadcastState(room, io) {
    io.to(room.id).emit('update_state', {
      roomId: room.id,
      event: 'state_sync',
      currentTurn: room.currentTurnPlayer,
      hp: room.hp,
      round: room.roundNumber,
      factions: room.factions,
      profiles: room.profiles,
      timer: TURN_TIME_LIMIT_MS / 1000
    });
  }

  /**
   * Look up a card object from a player's hand by card ID.
   */
  _findCardInHand(room, playerId, cardId) {
    const hand = room.hands[playerId];
    if (!hand || cardId == null) return null;
    const cid = String(cardId);
    return hand.find((c) => String(c.id) === cid) || null;
  }

  /** Card played this round (still in hand until cleanup). */
  _getSubmittedCard(room, playerId) {
    const cards = this._getSubmittedCards(room, playerId);
    return cards[0] || null;
  }

  _getSubmittedCards(room, playerId) {
    const raw = room.submissions[playerId];
    if (raw === undefined) return [];
    const cardIds = Array.isArray(raw) ? raw : [raw];
    return cardIds
      .map((cid) => this._findCardInHand(room, playerId, cid))
      .filter(Boolean);
  }

  _serializeCard(card) {
    if (!card) return null;
    const avatar = card.avatar || card.imageUrl || card.image_url || null;
    return {
      id: String(card.id),
      name: card.name,
      alias: card.alias || card.name,
      avatar,
      attack: card.attack ?? card.power ?? 0,
      defense: card.defense ?? 0,
      cost: card.cost ?? 0,
      imageUrl: avatar
    };
  }

  _buildClashCards(room) {
    const clashCards = {};
    for (const pid of room.players) {
      const cards = this._getSubmittedCards(room, pid).map((c) => this._serializeCard(c));
      if (cards.length === 0) continue;
      clashCards[String(pid)] = room.mode === '2v2' ? cards : cards[0];
    }
    return clashCards;
  }

  /**
   * Fisher-Yates shuffle (immutable вЂ” returns a new array).
   */
  _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Promise-based delay.
   */
  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ Public: Remove from Queue в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ

  /**
   * Remove a player from any matchmaking queue (e.g. on disconnect).
   */
  removeFromQueue(socketId) {
    this.queue1v1 = this.queue1v1.filter((e) => e.socketId !== socketId);
    this.queue2v2 = this.queue2v2.filter((e) => e.socketId !== socketId);
  }

  leaveQueue(socketId, userId) {
    this.removeFromQueue(socketId);
    if (userId) {
      this.queue1v1 = this.queue1v1.filter((e) => e.userId !== userId);
      this.queue2v2 = this.queue2v2.filter((e) => e.userId !== userId);
    }
  }

  /**
   * Find the room a player is currently in.
   * @returns {Room|null}
   */
  findRoomByPlayer(userId) {
    const uid = String(userId);
    for (const [, room] of this.rooms) {
      if (room.players.some((p) => String(p) === uid)) return room;
    }
    return null;
  }

  /**
   * Handle a player surrendering.
   */
  async handleSurrender(userId, io) {
    const room = this.findRoomByPlayer(userId);
    if (!room || !room.active) return;

    const winner = room.players.find((p) => p !== userId);
    await this._endGame(room, { winnerId: winner, loserId: userId }, io);
  }

  /**
   * State Sync for Reconnecting Players
   */
  async handleReconnect(socket, userId, io) {
    const room = this.findRoomByPlayer(userId);
    if (!room || !room.active) {
      return;
    }

    room.playerSockets[userId] = socket.id;
    socket.join(room.id);

    socket.emit('match_found', { roomId: room.id, mode: room.mode });

    if (room.hands[userId]) {
      socket.emit('start_game', {
        roomId: room.id,
        faction: room.factions[userId] === 'order' ? 'Order of the Phoenix' : 'Death Eaters',
        firstTurn: String(room.currentTurnPlayer) === String(userId),
        hand: room.hands[userId],
        deckCount: room.decks[userId]?.length ?? 0,
        currentTurn: room.currentTurnPlayer,
        profiles: room.profiles
      });
    }

    socket.emit('state_sync', {
      hp: room.hp,
      currentTurn: room.currentTurnPlayer,
      myUserId: userId,
      profiles: room.profiles
    });
  }

  handleDisconnect(socketId, io) {
    for (const [, room] of this.rooms) {
      if (!room.active) continue;

      const disconnectedUserId = Object.entries(room.playerSockets).find(
        ([, sid]) => sid === socketId
      )?.[0];

      if (!disconnectedUserId || disconnectedUserId === BOT_USER_ID) continue;

      io.to(room.id).emit('opponent_disconnected', {
        message: 'Your opponent has disconnected.'
      });

      const winner = room.players.find((p) => p !== disconnectedUserId);
      this._endGame(room, { winnerId: winner, loserId: disconnectedUserId }, io);
      return;
    }
  }
}

module.exports = GameEngine;
