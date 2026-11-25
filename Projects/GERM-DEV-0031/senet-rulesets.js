/* Senet rule sets. GERM-DEV-0031.
 * Each published reconstruction is one object. Field meanings: senet-engine.js.
 * Evidence tags: E evidenced (an ancient board, set, picture or text shows it),
 * I inferred (a reading of ancient material), X invented (a modern rule).
 * Sources: research.md in this folder.
 */
(function (root) {
  'use strict';
  const S = (typeof module !== 'undefined' && module.exports) ? require('./senet-engine.js') : root.Senet;
  const R = S.RULESETS;

  // Rows common to every rule set.
  const BOARD = [
    { s: 'E', rule: '30 squares in 3 rows of 10, played as one path: left to right, right to left, left to right.', note: 'Boards from Hesy-Re (Dynasty 3) to the Late Period. Middle Kingdom boards are turned 180 degrees. The 1 to 30 numbering comes from the Game Text and Papyrus Turin 1775.' },
    { s: 'E', rule: 'Marked squares near the end: 26 nfr (good), 27 water or X, 28 three, 29 two. Square 15 is often marked, and 30 from Dynasty 19.', note: 'Tutankhamun\'s ebony box (Carter 345) shows 15 and 26 to 29 marked and 30 plain. The Turin game text calls 15 the house of repeating life.' },
    { s: 'E', rule: 'Two players, cones against spools.', note: 'Tomb scenes show two players; Book of the Dead 17 shows the dead playing an unseen opponent.' },
    { s: 'E', rule: 'The lot is four two-sided throwsticks.', note: 'Hesy-Re shows 4 sticks with the board. Tutankhamun\'s boxes held pairs of sticks and pairs of knucklebones.' },
    { s: 'I', rule: 'The aim is to pass the opponent and take your pieces off the end.', note: 'Captions: "passing is mine" (Pepiankh, Dynasty 6); "I shall take my draughtsmen so that I may find my house" (Turin 1775).' }
  ];

  R.minimal = {
    id: 'minimal', name: 'Minimal (this project)', short: 'Minimal, fewest inventions',
    source: 'Built for GERM-DEV-0031 to test whether the evidence alone makes a game. It keeps every evidenced element and adds the fewest rules needed to finish. Pieces pass each other and never strike, following Piccione\'s reading of senet as "passing".',
    pieces: 5, start: 'offboard', lot: 'sticks', zero: 5, extra: [],
    capture: 'none', protectPairs: false, blockRun: 0, safe: [],
    mustStop26: true, water: 'to15', offFrom: 26, exactOff: true,
    backward: false, win: 'allOff',
    evidence: BOARD.concat([
      { s: 'E', rule: '5 pieces each.', note: 'Tutankhamun\'s box 585r, drawer unopened since burial: 5 red and 5 white pieces, "undoubtedly a complete set" (Carter\'s card).' },
      { s: 'X', rule: 'Count the light faces: 1 to 4 move that many; no light face moves 5. No extra throws.', note: 'No text gives throw values.' },
      { s: 'X', rule: 'Pieces start off the board and enter on the square equal to the throw.' },
      { s: 'X', rule: 'A piece may not land on any occupied square, and nothing is captured.', note: 'The simplest rule. Captions cut against it: "I shall cause you to see it taken away" (Pepiankh) and "capturing (pieces) in senet".' },
      { s: 'I', rule: 'Every piece must stop on 26, the good house, before going on.', note: 'From the nfr mark and "I shall hold him back from the per-nefer" (Turin 1775).' },
      { s: 'I', rule: 'Landing on 27 (water) sends the piece back to 15, the ankh square, or the nearest free square below it.' },
      { s: 'I', rule: 'From 28 a piece leaves on an exact 3, from 29 on a 2, from 30 on a 1, and from 26 on a 5.', note: 'Reads the "three" and "two" marks as the throw still needed.' },
      { s: 'X', rule: 'First to bear off all 5 pieces wins.' }
    ])
  };

  R.kendall = {
    id: 'kendall', name: 'Kendall (1978)', short: 'Kendall 1978',
    source: 'T. Kendall, Passing Through the Netherworld (Kirk Game Co., 1978): the rules booklet of a commercial game and the most copied reconstruction. Encoded from the Ludii summary (ruleset 922).',
    pieces: 7, start: 'alternate', lot: 'sticks', zero: 5, extra: [1, 4, 5],
    capture: 'swap', protectPairs: true, blockRun: 3, safe: [],
    mustStop26: true, water: 'to15', offFrom: 26, exactOff: true, anyOffFrom30: true,
    backward: true, noBackFrom: 28, win: 'allOff',
    evidence: BOARD.concat([
      { s: 'I', rule: '7 pieces each, alternating on squares 1 to 14.', note: '7 a side is the Old Kingdom count (Hesy-Re) and "my seven" in Turin 1775; New Kingdom sets have 5. Beni Hasan shows 2 x 7 pieces alternating.' },
      { s: 'X', rule: 'Count the light faces: 1 to 4 move that many; no light face moves 5. A 1, 4 or 5 throws again.', note: 'Adapted from tab, a stick game first recorded in 1310 CE, long after senet. No tab source scores zero as 5.' },
      { s: 'X', rule: 'Landing on an enemy piece swaps the two.', note: 'Captions show pieces taken: "capturing (pieces) in senet" (Old Kingdom, after Masters 2024). The swap itself is modern.' },
      { s: 'X', rule: 'Two pieces in a row cannot be struck; three in a row cannot be passed.' },
      { s: 'X', rule: 'With no forward move, a piece must move backward. Pieces on 28 to 30 never move backward.' },
      { s: 'I', rule: 'Every piece must land exactly on 26.' },
      { s: 'I', rule: 'Landing on 27 sends the piece back to 15.', note: 'Kendall also has the piece lose a turn or wait for a 4; this app only sends it back.' },
      { s: 'I', rule: 'A piece leaves from 26 on a 5, from 28 on a 3, from 29 on a 2, and from 30 on any throw.' },
      { s: 'X', rule: 'First to bear off all pieces wins. Cones throw first.', note: 'Kendall has the first player to throw a 1 start; the app gives cones the first throw.' }
    ])
  };

  R.jequier = {
    id: 'jequier', name: 'Jéquier', short: 'Jéquier',
    source: 'G. Jéquier, "Un jeu renouvelé des anciens", Chronique d\'Égypte 5 (1930) 124-127, encoded from the Ludii summary (ruleset 939). The article itself was not checked. Its throws are those of tab, the game E.W. Lane recorded in Cairo.',
    pieces: 5, start: 'alternate', lot: 'sticks', zero: 6, extra: [1, 4, 6],
    capture: 'rear', protectPairs: true, blockRun: 3, safe: [26, 28, 29, 30],
    mustStop26: false, water: 'rear', offFrom: 21, exactOff: false, allHomeToBearOff: true,
    backward: true, win: 'allOff',
    evidence: BOARD.concat([
      { s: 'I', rule: '5 pieces each, alternating on the first row.', note: 'The count is evidenced (Tutankhamun 585r). Alternating rows of pieces appear in tomb scenes.' },
      { s: 'X', rule: 'Count the light faces: 1 to 4 move that many; no light face moves 6. A 1, 4 or 6 throws again.', note: 'Exactly the scoring of tab as Lane recorded it in Cairo (1836). Tab is first named in 1310 CE and has no documented link to senet; Hyde (1694) swaps its 4 and 6.' },
      { s: 'I', rule: 'A struck piece goes to the rearmost empty square.', note: 'Captions show pieces taken: "capturing (pieces) in senet" (Old Kingdom, after Masters 2024). Where they go is modern.' },
      { s: 'X', rule: 'Two pieces in a row cannot be struck; three in a row cannot be passed.' },
      { s: 'I', rule: 'Squares 26, 28, 29 and 30 are safe.' },
      { s: 'I', rule: 'Landing on 27 sends the piece to the rearmost empty square.' },
      { s: 'X', rule: 'A piece may bear off only when all of its side is on the third row.' },
      { s: 'X', rule: 'With no forward move, a piece must move backward.' },
      { s: 'X', rule: 'First to bear off all pieces wins.', note: 'Jéquier also scores the pieces left on the board; the app does not.' }
    ])
  };

  R.bell = {
    id: 'bell', name: 'Bell (1960)', short: 'Bell 1960',
    source: 'R.C. Bell, Board and Table Games from Many Civilizations (OUP, 1960; 2nd ed. 1969, pp. 27-28, "Suggested rules for the game of thirty squares"), checked against the 1969 text. Bell uses one long four-sided die, so the sticks are not shown.',
    pieces: 10, start: 'alternate', lot: 'd4', zero: 0, extra: [],
    capture: 'remove', protectPairs: false, blockRun: 0, safe: [15, 26, 27, 28, 29, 30],
    mustStop26: false, water: 'none', offFrom: 26, exactOff: true,
    backward: false, win: 'mostOff',
    evidence: BOARD.concat([
      { s: 'X', rule: '10 pieces each, alternating on the first two rows.', note: 'No excavated set has 10 a side.' },
      { s: 'X', rule: 'A four-sided die, 1 to 4, no extra throws.', note: 'Departs from the evidenced throwsticks.' },
      { s: 'X', rule: 'A struck piece leaves the game. No backward moves.' },
      { s: 'I', rule: 'The marked squares 15 and 26 to 30 are safe.' },
      { s: 'X', rule: 'A piece bears off from 26 to 30 by the exact throw.' },
      { s: 'X', rule: 'The game ends when one side has nothing left in play. Most pieces wins, counting the other side\'s survivors as borne off.', note: 'Bell gives "most pieces borne off"; the count for survivors is this app\'s.' }
    ])
  };

  R.piccione = {
    id: 'piccione', name: 'Piccione (King Tut\'s Game)', short: 'Piccione',
    source: 'Peter Piccione\'s rules for the commercial King Tut\'s Game (Cadaco), encoded from the Ludii summary (ruleset 938). Piccione wrote the 1990 dissertation that edits the senet texts.',
    pieces: 5, start: 'offboard', enterOn: [1], enterAt: 1, lot: 'sticks', zero: 5, extra: [5], extraSquares: [15, 26],
    capture: 'none', protectPairs: false, blockRun: 0, safe: [],
    mustStop26: false, water: 'reserve', offFrom: 26, exactOff: true,
    backward: true, noBackFrom: 28, win: 'allOff',
    evidence: BOARD.concat([
      { s: 'I', rule: '5 pieces each, off the board at the start. A throw of 1 enters a piece on square 1.', note: 'The count is evidenced. Entry on a 1 comes from tab, a later game, where each piece needs a 1 to start. An Old Kingdom caption has zbi, "send out (the piece)".' },
      { s: 'X', rule: 'Count the light faces: 1 to 4 move that many; no light face moves 5. A 5 throws again.' },
      { s: 'I', rule: 'Landing on 15 or 26 throws again.', note: 'Piccione (1980) reads 15 as the house of repeating life and 26 as the good house.' },
      { s: 'I', rule: 'Two pieces never share a square, and nothing is captured.', note: 'Follows Piccione\'s reading of senet as "passing".' },
      { s: 'I', rule: 'Landing on 27 (water) takes the piece off the board; it must enter again.', note: 'A game text: "I throw him into the water" (Piccione 1980).' },
      { s: 'X', rule: 'With no forward move, a piece must move backward. Pieces on 28 to 30 never move backward.' },
      { s: 'X', rule: 'A piece bears off from 26 to 30 by the exact throw. First to bear off all pieces wins.' }
    ])
  };

  // The Germain Rules (Germain et al.): the smallest rules the evidence
  // suggests in place of the invented ones, built so every game ends.
  function germain(id, name, short, extra, evidence) {
    const rs = {
      id, name, short,
      source: 'Built for GERM-DEV-0031 (Germain et al.). A first-stage sweep of 13,312 rule sets found that unfinished games and most of the skill come from two invented rules: how a piece leaves and what a capture does. These rules replace both with the smallest rules the evidence suggests. Every move goes forward, and a struck piece falls back no further than 15 once past it, so every game ends.',
      pieces: 5, start: 'offboard', lot: 'sticks', zero: 5, extra: [],
      capture: 'to15', protectPairs: false, blockRun: 0, safe: [],
      mustStop26: true, water: 'to15', offFrom: 26, exactOff: true,
      backward: false, forced: false, win: 'allOff'
    };
    Object.assign(rs, extra);
    rs.evidence = BOARD.concat([
      { s: 'E', rule: '5 pieces each.', note: 'Tutankhamun\'s box 585r, drawer unopened since burial: 5 red and 5 white pieces.' },
      { s: 'I', rule: 'Count the light faces: 1 to 4 move that many; no light face moves 5. No extra throws.', note: 'The caption "playing five" (Old Kingdom). The sweep shows throw scoring and extra throws barely change the game.' },
      { s: 'I', rule: 'Pieces start off the board and enter on the square equal to the throw.', note: 'An Old Kingdom caption has zbi, "send out (the piece)".' },
      { s: 'I', rule: 'Landing on a lone enemy piece strikes it. A struck piece that had passed 15 goes back to 15, or the nearest free square below; otherwise it goes off the board and enters again.', note: 'Captions: "I shall cause you to see it taken away" and "capturing (pieces) in senet". The Turin game text calls 15 the house of repeating life.' },
      { s: 'I', rule: 'Every piece must stop on 26, the good house, before going on.', note: '"I shall hold him back from the per-nefer" (Turin 1775).' },
      { s: 'I', rule: 'Landing on 27 (water) sends the piece back to 15, or the nearest free square below it.', note: 'The water mark and the drowning text.' },
      { s: 'I', rule: 'A piece leaves from 26 on a 5, from 28 on a 3, from 29 on a 2 and from 30 on a 1, by the exact throw only.', note: 'Reads the "three" and "two" marks, and the Old Kingdom "one", as the throw still needed.' }
    ]).concat(evidence).concat([
      { s: 'X', rule: 'No backward moves. First to bear off all 5 pieces wins.', note: 'The aim is evidenced ("passing is mine"); the exact win rule is modern.' }
    ]);
    R[id] = rs;
  }

  germain('germain_fate', 'Germain Rules: Fate', 'Germain: Fate', { forced: true }, [
    { s: 'X', rule: 'No choice: the rearmost piece that can move must move.', note: 'For solo and ritual play, as in the Book of the Dead 17 vignette where the dead play an unseen opponent.' }
  ]);
  germain('germain_contest', 'Germain Rules: Contest', 'Germain: Contest', {}, [
    { s: 'X', rule: 'Free choice of which piece to move. A lone piece can always be struck.', note: 'For the two-player game of the tomb scenes.' }
  ]);
  germain('germain_master', 'Germain Rules: Master', 'Germain: Master', { protectPairs: true }, [
    { s: 'X', rule: 'Free choice of which piece to move. Two pieces side by side cannot be struck.', note: 'Modern protection rule, for keen players.' }
  ]);

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);

/* Text of the "What we know, and what we don't" panel. */
if (typeof window !== 'undefined') window.SENET_ABOUT =
  '<p><b>Known from the objects.</b> Senet was played in Egypt from about 3100 BCE (Abu Rawash, Dynasty 1) to at least the 6th century BCE, and in the Levant and Cyprus. The board is 30 squares in 3 rows, played as one snaking path. Squares 26 to 29 carry the same marks for over a thousand years: good, water, three, two. Each player had cones or spools, 7 a side in the Old Kingdom and 5 a side by the New Kingdom. Tutankhamun\'s ivory box 585r, unopened since burial, held exactly 5 red and 5 white pieces with 2 knucklebones. Four throwsticks served as the lot.</p>' +
  '<p><b>Known from the words.</b> Tomb captions record players talking: "It has alighted. Be happy my heart, for I shall cause you to see it taken away." "You speak as one weak of tongue, for passing is mine." A Dynasty 20 papyrus in Turin has the player hold the opponent back from the good house, pass to the house of repeating life, and "take my draughtsmen so that I may find my house". By then the game was also a passage of the soul, played against an unseen opponent in the Book of the Dead.</p>' +
  '<p><b>Not known.</b> No ancient source gives the throw values, the starting position, what happens when pieces meet, how a piece leaves the board, or who wins. Every modern rule set fills those gaps. Most fill them from tab, a stick game first recorded in Cairo in 1310 CE, some 2,000 years after the last dated senet board, with no documented link to it. The rules also changed over 2,500 years, so any one set is a composite.</p>' +
  '<p><b>Is it playable?</b> Only with invented rules. Computer-against-computer runs show all eight sets here finish every game. Kendall, Jéquier and Piccione are balanced. The minimal set, closest to the evidence, plays as a thin race with few decisions. Bell\'s set, as Ludii summarises it, is a short strike-out with a strong seat advantage. The Germain Rules replace the two invented rules that most shape the game, capture and leaving, with the smallest rules the evidence suggests. Full figures and sources: research.md.</p>';
