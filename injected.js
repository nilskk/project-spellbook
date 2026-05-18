// Project Spellbook — Page-context script
// Intercepts D&D Beyond dice rolls to control crit behavior
(function () {
  'use strict';

  var settings = { critMode: 'normal' };

  // Receive settings from content script via postMessage bridge
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'SPELLBOOK_CRIT_SETTINGS') {
      settings = event.data.settings;
    }
  });
  window.postMessage({ type: 'SPELLBOOK_REQUEST_SETTINGS' }, '*');

  // Helper: generate a UUID-like id (same format D&D Beyond uses)
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function maxFace(dieType) {
    var m = dieType.match(/d(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  // Halve all die counts and slice the dice arrays to match.
  // Called for both disabled and perfect modes to undo crit doubling.
  function halveDiceNotation(roll) {
    var set = roll.diceNotation && roll.diceNotation.set;
    if (!set) return;
    for (var i = 0; i < set.length; i++) {
      var ds = set[i];
      ds.count = Math.floor(ds.count / 2);
      if (ds.dice && ds.dice.length > ds.count) {
        ds.dice = ds.dice.slice(0, ds.count);
      }
    }
  }

  // Update the diceNotationStr to reflect halved dice + possibly updated constant.
  // Socket messages have an existing string; broker dispatches build from the object.
  function updateNotationStr(roll) {
    if (roll.diceNotationStr) {
      // Socket: halve all die counts in the existing string (e.g. "2d8+4" → "1d8+4")
      roll.diceNotationStr = roll.diceNotationStr.replace(/(\d+)d/g, function (_, c) {
        return Math.floor(parseInt(c, 10) / 2) + 'd';
      });
    } else if (roll.diceNotation && roll.diceNotation.set) {
      // Broker: build from the set object
      roll.diceNotationStr = roll.diceNotation.set.map(function (s) {
        return s.count + s.dieType;
      }).join('+');
    }
    // Replace the trailing constant with the current diceNotation.constant value
    if (roll.diceNotation && roll.diceNotationStr) {
      var cnst = roll.diceNotation.constant;
      roll.diceNotationStr = roll.diceNotationStr.replace(/[+-]\d+$/, '');
      if (cnst > 0) roll.diceNotationStr += '+' + cnst;
      else if (cnst < 0) roll.diceNotationStr += cnst;
    }
  }

  // Slice result.values to the first half, recalculate total and text.
  function halveResult(roll) {
    if (!roll.result) return;
    var vals = roll.result.values || [];
    var half = Math.floor(vals.length / 2);
    roll.result.values = vals.slice(0, half);
    var sum = 0, parts = [];
    for (var i = 0; i < half; i++) {
      sum += vals[i];
      parts.push(vals[i]);
    }
    var cnst = roll.result.constant || 0;
    roll.result.total = sum + cnst;
    roll.result.text = parts.join('+');
    if (cnst !== 0) roll.result.text += (cnst > 0 ? '+' : '') + cnst;
  }

  // Intercept and modify a dice roll payload before it reaches the UI / server
  function modifyPayload(payload) {
    if (settings.critMode === 'normal') return;

    var rolls = payload.data && payload.data.rolls;
    if (!rolls || !rolls.length) return;

    for (var i = 0; i < rolls.length; i++) {
      var roll = rolls[i];
      // Detects standard crits (rollKind="critical hit") and context-menu
      // crits where DDB pre-doubles the dice but leaves rollKind undefined.
      var isCrit = roll.rollKind === 'critical hit';
      var isMenuCrit = roll.rollKind === undefined && roll.rollType === 'damage' && roll.diceNotation && roll.diceNotation.set &&
        roll.diceNotation.set.some(function (s) { return s.count > 1 && s.count % 2 === 0; });
      if (!isCrit && !isMenuCrit) continue;
      if (settings.critMode === 'disabled') {
        // Disabled: remove crit flag, halve everything back to base damage
        roll.rollKind = '';
        halveDiceNotation(roll);
        updateNotationStr(roll);
        halveResult(roll);

      } else if (settings.critMode === 'perfect') {
        // Perfect: halve dice, add max bonus, keep rolls intact
        roll.rollKind = '';

        // Calculate bonus = base_dice_count × max_face for each die type
        var bonus = 0;
        if (roll.diceNotation && roll.diceNotation.set) {
          for (var k = 0; k < roll.diceNotation.set.length; k++) {
            var ds = roll.diceNotation.set[k];
            var mf = maxFace(ds.dieType);
            if (mf) bonus += Math.floor(ds.count / 2) * mf;
          }
        }

        // Halve dice notation (undo crit doubling)
        halveDiceNotation(roll);

        // Add bonus to the constant (game log notation shows combined total)
        if (bonus > 0) {
          roll.diceNotation.constant = (roll.diceNotation.constant || 0) + bonus;
          if (roll.result) {
            var origMod = roll.result.constant || 0;
            roll.result.constant = origMod + bonus;
          }
        }

        // Update notation string with new constant
        updateNotationStr(roll);

        // Rebuild result with bonus and modifier shown as separate terms
        if (roll.result) {
          var vals = roll.result.values || [];
          var half = Math.floor(vals.length / 2);
          roll.result.values = vals.slice(0, half);
          var sum = 0, parts = [];
          for (var v = 0; v < half; v++) {
            sum += vals[v];
            parts.push(vals[v]);
          }
          roll.result.total = sum + roll.result.constant;
          // Format: "dieVal + bonus + modifier" for clarity
          var text = parts.join('+');
          if (bonus > 0) text += '+' + bonus;
          var modOnly = roll.result.constant - bonus;
          if (modOnly > 0) text += '+' + modOnly;
          else if (modOnly < 0) text += modOnly;
          roll.result.text = text;
        }
      }
    }
  }

  // Listen for custom roll requests from content script (context menu rolls)
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'SPELLBOOK_SEND_ROLL') {
      sendCustomRoll(event.data);
    }
  });

  function sendCustomRoll(opts) {
    if (!socket || socket.readyState !== 1) return;
    var rollId = uuid();
    var now = Date.now();

    // Parse notation: e.g. "1d4+8", "2d8+20"
    var notation = opts.notation;
    var diceSets = [];
    var constant = 0;
    notation.replace(/(\d+)d(\d+)/g, function (_, count, face) {
      diceSets.push({ count: parseInt(count, 10), face: parseInt(face, 10) });
    });
    var constMatch = notation.match(/([+-]\d+)$/);
    if (constMatch) constant = parseInt(constMatch[1], 10);

    // Build dice array with placeholder values (pending)
    var allDice = [];
    for (var i = 0; i < diceSets.length; i++) {
      for (var j = 0; j < diceSets[i].count; j++) {
        allDice.push({ dieType: 'd' + diceSets[i].face, dieValue: 0 });
      }
    }

    var pendingMsg = {
      id: uuid(),
      dateTime: String(now),
      gameId: opts.gameId,
      userId: opts.userId,
      source: 'web',
      data: {
        action: opts.action || 'custom',
        rolls: [{
          diceNotation: {
            set: [{
              count: allDice.length,
              dieType: 'd' + (diceSets[0] ? diceSets[0].face : 4),
              dice: allDice,
              operation: 0
            }],
            constant: constant
          },
          diceNotationStr: notation,
          rollType: 'damage',
          rollKind: ''
        }],
        context: {
          entityId: opts.entityId,
          entityType: 'character',
          name: opts.characterName,
          avatarUrl: opts.avatarUrl || '',
          messageScope: 'gameId',
          messageTarget: opts.gameId
        },
        setId: '00101',
        rollId: rollId
      },
      entityId: opts.entityId,
      entityType: 'character',
      eventType: 'dice/roll/pending',
      persist: false,
      messageScope: 'gameId',
      messageTarget: opts.gameId
    };

    // Roll actual values
    var rolledValues = [];
    for (var k = 0; k < allDice.length; k++) {
      var face = diceSets[0] ? diceSets[0].face : 4;
      var dieIdx = 0, remaining = 0;
      for (var m = 0; m < diceSets.length; m++) {
        if (k < remaining + diceSets[m].count) { face = diceSets[m].face; dieIdx = m; break; }
        remaining += diceSets[m].count;
      }
      var val = Math.floor(Math.random() * face) + 1;
      rolledValues.push(val);
      allDice[k].dieValue = val;
    }

    var total = rolledValues.reduce(function (a, b) { return a + b; }, 0) + constant;
    var text = rolledValues.join('+');
    if (constant !== 0) text += (constant > 0 ? '+' : '') + constant;

    var fulfilledMsg = {
      id: uuid(),
      dateTime: String(now + 1000),
      gameId: opts.gameId,
      userId: opts.userId,
      source: 'web',
      data: {
        action: opts.action || 'custom',
        rolls: [{
          diceNotation: {
            set: [{
              count: allDice.length,
              dieType: 'd' + (diceSets[0] ? diceSets[0].face : 4),
              dice: allDice,
              operation: 0
            }],
            constant: constant
          },
          diceNotationStr: notation,
          rollType: 'damage',
          rollKind: '',
          result: {
            constant: constant,
            values: rolledValues,
            total: total,
            text: text
          }
        }],
        context: {
          entityId: opts.entityId,
          entityType: 'character',
          name: opts.characterName,
          avatarUrl: opts.avatarUrl || '',
          messageScope: 'gameId',
          messageTarget: opts.gameId
        },
        setId: '00101',
        rollId: rollId
      },
      entityId: opts.entityId,
      entityType: 'character',
      eventType: 'dice/roll/fulfilled',
      persist: true,
      messageScope: 'gameId',
      messageTarget: opts.gameId
    };

    // Deferred to broker triggers 3D dice. Must include result so worker can display it.
    var deferredMsg = JSON.parse(JSON.stringify(fulfilledMsg));
    deferredMsg.eventType = 'dice/roll/deferred';
    var key = Symbol.for('@dndbeyond/message-broker-lib');
    var broker = window[key];
    if (broker) broker.dispatch(deferredMsg);

    // Socket: pending (game log entry) + fulfilled (result) after delay
    socket.send(JSON.stringify(pendingMsg));
    setTimeout(function () {
      socket.send(JSON.stringify(fulfilledMsg));
      if (broker) broker.dispatch(fulfilledMsg);
    }, 800);
  }
  var NativeWebSocket = window.WebSocket;
  var socket = null;
  function wrapSocket() {
    window.WebSocket = function () {
      var ws = new (Function.prototype.bind.apply(NativeWebSocket, [null].concat(Array.prototype.slice.call(arguments))))();
      if (!socket) socket = ws;
      var originalSend = ws.send.bind(ws);
      ws.send = function (data) {
        try {
          var parsed = JSON.parse(data);
          if (parsed.eventType === 'dice/roll/fulfilled' || parsed.eventType === 'dice/roll/pending') {
            modifyPayload(parsed);
            data = JSON.stringify(parsed);
          }
        } catch (e) {}
        return originalSend(data);
      };
      ws.addEventListener('close', function () {
        if (socket === ws) socket = null;
        wrapSocket();
      });
      window.WebSocket = NativeWebSocket;
      return ws;
    };
  }
  wrapSocket();

  // ─── Intercept D&D Beyond's message broker to modify local UI payloads ───
  function interceptBroker() {
    var key = Symbol.for('@dndbeyond/message-broker-lib');
    var broker = window[key];
    if (!broker) { setTimeout(interceptBroker, 200); return; }
    var originalDispatch = broker.dispatch.bind(broker);
    broker.dispatch = function (payload) {
      modifyPayload(payload);
      return originalDispatch(payload);
    };
  }
  interceptBroker();
})();
