const state = {
  oversPerInnings: parseInt(localStorage.getItem('oversPerInnings'), 10) || 10,
  teamA: localStorage.getItem('teamA') || '',
  teamB: localStorage.getItem('teamB') || '',
  playersA: parseInt(localStorage.getItem('playersA'), 10) || 11,
  playersB: parseInt(localStorage.getItem('playersB'), 10) || 11,
  runs1: 0, wickets1: 0, balls1: 0, innings1Ended: false,
  runs2: 0, wickets2: 0, balls2: 0, target: 0,
  // Per-over summaries: array of { runs, wickets, balls, events: [] }
  overSummaries1: [{ runs: 0, wickets: 0, balls: 0, events: [] }],
  overSummaries2: [{ runs: 0, wickets: 0, balls: 0, events: [] }],
  tossWinner: ''
};

// DOM helpers
const $ = (id) => document.getElementById(id);

// Safe event binding (won't throw errors if element doesn't exist)
function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

// Switch page visibility
function goToPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
  // Navigation buttons
  on('start-setup', 'click', () => goToPage('page-team-setup'));
  on('goto-target', 'click', () => goToPage('page-target-mode'));

  // Team setup / Toss / Innings buttons
  on('save-setup', 'click', saveTeamSetup);
  on('tossButton', 'click', performToss);
  on('endInnings1', 'click', endInnings1);
  on('startChase', 'click', startSecondInningsFromTarget);
  on('endMatch', 'click', endMatch);
  on('restart', 'click', () => location.reload());

  // Bat / bowl buttons (later dynamically updated)
  const batbowlButtons = document.querySelectorAll('#bat-bowl-section button');
  batbowlButtons.forEach((b) =>
    b.addEventListener('click', () => selectBatBowl(b.dataset.decision))
  );

  // Toss caller
  populateTossCaller();

  // Score buttons Innings 1
  document.querySelectorAll('#page-innings1 .button-grid button').forEach((btn) => {
    btn.addEventListener('click', () => handleInnings1Button(btn.dataset));
  });

  // Score buttons Innings 2
  document.querySelectorAll('#page-innings2 .button-grid button').forEach((btn) => {
    btn.addEventListener('click', () => handleInnings2Button(btn.dataset));
  });

  // Undo buttons
  on('undo1', 'click', undoLastBall);
  on('undo2', 'click', undoLastBall2);

  // Initialize displays
  updateInnings1Display();
  updateInnings2Display();
});

/* ---------------------------------------------------------
   TEAM SETUP
--------------------------------------------------------- */
function saveTeamSetup() {
  const teamAName = $('teamAName').value.trim();
  const teamBName = $('teamBName').value.trim();
  const overs = parseInt($('oversPerInnings').value, 10) || 10;
  const playersA = parseInt($('teamAPlayers').value, 10) || 11;
  const playersB = parseInt($('teamBPlayers').value, 10) || 11;
  const err = $('team-setup-error');

  err.textContent = '';

  if (!teamAName || !teamBName) {
    err.textContent = 'Both team names are required.';
    return;
  }

  state.oversPerInnings = overs;
  state.teamA = teamAName;
  state.teamB = teamBName;
  state.playersA = playersA;
  state.playersB = playersB;

  localStorage.setItem('oversPerInnings', overs);
  localStorage.setItem('teamA', teamAName);
  localStorage.setItem('teamB', teamBName);
  localStorage.setItem('playersA', playersA);
  localStorage.setItem('playersB', playersB);

  populateTossCaller();
  goToPage('page-toss');
}

function populateTossCaller() {
  const select = $('tossCaller');
  if (!select) return;

  select.innerHTML = '';

  if (state.teamA) {
    const opt = document.createElement('option');
    opt.value = 'A';
    opt.textContent = state.teamA;
    select.appendChild(opt);
  }

  if (state.teamB) {
    const opt = document.createElement('option');
    opt.value = 'B';
    opt.textContent = state.teamB;
    select.appendChild(opt);
  }

  validateTeamsBeforeToss();
}

function validateTeamsBeforeToss() {
  const err = $('toss-error');
  const btn = $('tossButton');

  if (!err || !btn) return;

  if (!state.teamA || !state.teamB) {
    err.innerText = '❗ Please enter both team names before proceeding to toss.';
    btn.disabled = true;
  } else {
    err.innerText = '';
    btn.disabled = false;
  }
}

/* ---------------------------------------------------------
   HELPERS: record events & render history
--------------------------------------------------------- */
function recordEvent(inning, token, runs = 0, isLegalBall = false, wicket = false) {
  const overList = inning === 1 ? state.overSummaries1 : state.overSummaries2;
  const cur = overList[overList.length - 1];
  cur.events.push(token);
  cur.runs += runs;
  if (wicket) cur.wickets++;
  if (isLegalBall) cur.balls++;
  // If over finished (6 legal balls) start a new over
  if (cur.balls >= 6) {
    overList.push({ runs: 0, wickets: 0, balls: 0, events: [] });
  }
  updateHistoryDisplay(inning);
}

function formatEventToken(token) {
  // token is simple string: '●1','●2','4','^','W','WD','NB'
  // you can render custom styling via CSS later; currently return token
  return token;
}

function updateHistoryDisplay(inning) {
  const id = inning === 1 ? 'innings1-history' : 'innings2-history';
  const el = $(id);
  if (!el) return;
  const overList = inning === 1 ? state.overSummaries1 : state.overSummaries2;
  // exclude last empty over if it has zero events
  const effective = overList.filter(o => o.events && o.events.length > 0);
  const last3 = effective.slice(-3);
  const rendered = last3.map(o => o.events.map(formatEventToken).join(' ')).join('  |  ');
  el.innerText = rendered || '';
}

/* ---------------------------------------------------------
   COIN TOSS
--------------------------------------------------------- */
function performToss() {
  validateTeamsBeforeToss();

  const tossBtn = $('tossButton');
  if (!tossBtn || tossBtn.disabled) return;

  const callerKey = $('tossCaller').value;
  const callerName = callerKey === 'A' ? state.teamA : state.teamB;
  const opponentName = callerKey === 'A' ? state.teamB : state.teamA;
  const callerChoice = ($('tossChoice').value || 'heads').toLowerCase();

  const coin = $('coin');
  const resultBox = $('toss-result');
  const batBowlSection = $('bat-bowl-section');
  tossBtn.disabled = true;
  resultBox.textContent = '';
  batBowlSection.style.display = 'none';
  coin.classList.remove('heads', 'tails');
  coin.classList.add('flipping');
  coin.textContent = 'FLIPPING';

  setTimeout(() => {
      coin.classList.remove('flipping');

      const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';

      // Add class for styling
      coin.classList.add(flipResult);

      // SET THE TEXT ON THE COIN
      coin.textContent = flipResult.toUpperCase();

      const winner = (flipResult === callerChoice) ? callerName : opponentName;

      // Save toss winner into state so bat/bowl buttons can access it
      state.tossWinner = winner;

      resultBox.innerHTML = `<b>${winner}</b> won the toss (${flipResult}).`;

      batBowlSection.style.display = 'block';
      tossBtn.disabled = false;

  }, 1000);
}

function selectBatBowl(decision, tossWinnerName) {
  // Use provided tossWinnerName if passed, otherwise fall back to state.tossWinner
  const winner = tossWinnerName || state.tossWinner;

  if (!winner) return;

  if (decision === 'bat') {
    localStorage.setItem('battingTeam', winner);
    localStorage.setItem('bowlingTeam', winner === state.teamA ? state.teamB : state.teamA);
  } else {
    localStorage.setItem('bowlingTeam', winner);
    localStorage.setItem('battingTeam', winner === state.teamA ? state.teamB : state.teamA);
  }
  goToPage('page-innings1');
  updateInnings1Display();
}
/* ---------------------------------------------------------
   INNINGS 1
--------------------------------------------------------- */
function handleInnings1Button(dataset) {
  if (dataset.run) return scoreRun(parseInt(dataset.run, 10));
  if (dataset.boundary) return scoreBoundary(parseInt(dataset.boundary, 10));
  if (dataset.extra) return dataset.extra === 'wide' ? addWide() : addNoBall();
  if (dataset.wicket) return addWicket();
}

function scoreRun(r) {
  state.runs1 += r;
  state.balls1++;
  recordEvent(1, `●${r}`, r, true, false);
  updateInnings1Display();
}

function scoreBoundary(r) {
  state.runs1 += r;
  state.balls1++;
  const token = r === 6 ? '^' : '4';
  recordEvent(1, token === '^' ? '^' : '4', r, true, false);
  celebrate(r === 6 ? '🎉 SIX!' : '🔥 FOUR!');
  updateInnings1Display();
}

function addWide() {
  state.runs1++;
  // wide does not count as legal ball
  recordEvent(1, 'WD', 1, false, false);
  updateInnings1Display();
}

function addNoBall() {
  state.runs1++;
  recordEvent(1, 'NB', 1, false, false);
  updateInnings1Display();
}

function addWicket() {
  state.wickets1++;
  state.balls1++;
  recordEvent(1, 'W', 0, true, true);
  celebrate('💥 WICKET!');
  updateInnings1Display();
}

function undoLastBall() {
  if (state.balls1 > 0) state.balls1--;
  // NOTE: for simplicity this undo does not fully revert per-over array counts precisely.
  updateInnings1Display();
}

function updateInnings1Display() {
  const maxOvers = state.oversPerInnings || 10;
  const maxBalls = maxOvers * 6;

  const scoreEl = $('innings1-score');
  const oversEl = $('innings1-overs');
  const rrEl = $('innings1-rr');

  if (scoreEl) scoreEl.innerText = `${state.runs1}/${state.wickets1}`;
  if (oversEl) oversEl.innerText = `${Math.floor(state.balls1 / 6)}.${state.balls1 % 6} / ${maxOvers}`;

  const rr = state.balls1 > 0 ? (state.runs1 / (state.balls1 / 6)).toFixed(2) : '0.00';
  if (rrEl) rrEl.innerText = `RR: ${rr}`;

  updateHistoryDisplay(1);

  // End innings if overs finished or all out
  const maxWickets = Math.max(1, state.playersA - 1);
  if (!state.innings1Ended && (state.balls1 >= maxBalls || state.wickets1 >= maxWickets)) {
    state.innings1Ended = true;
    endInnings1();
  }
}

function endInnings1() {
  // Build per-over summary HTML
  localStorage.setItem('score1', state.runs1);
  localStorage.setItem('score1_balls', state.balls1);

  const summaryEl = $('innings1-summary');
  if (summaryEl) {
    const effective = state.overSummaries1.filter(o => o.events && o.events.length > 0);
    let html = `<h4>First Innings - Over by Over</h4><div class="small">`;
    effective.forEach((o, idx) => {
      html += `<div>Over ${idx + 1}: Runs ${o.runs} &nbsp; Wickets ${o.wickets} &nbsp; (${o.events.join(' ')})</div>`;
    });
    html += `</div>`;
    html += `<div class="mt-2"><b>Total:</b> ${state.runs1}/${state.wickets1} in ${Math.floor(state.balls1/6)}.${state.balls1%6} overs</div>`;
    html += `<div class="mt-3"><button id="proceedSecond" class="btn btn-success">Proceed to Second Innings</button></div>`;
    summaryEl.innerHTML = html;

    // Prefill input targetScore with automatic target (runs + 1)
    const targetInput = $('targetScore');
    if (targetInput) targetInput.value = state.runs1 + 1;

    // Bind the proceed button to start second innings using the auto target
    const proceedBtn = $('proceedSecond');
    if (proceedBtn) {
      proceedBtn.addEventListener('click', () => {
        // use input if user edited it, otherwise default to state.runs1 + 1
        const tVal = parseInt($('targetScore').value, 10);
        state.target = isNaN(tVal) ? (state.runs1 + 1) : tVal;
        goToPage('page-innings2');
        updateInnings2Display();
      });
    }
  }

  goToPage('page-target-mode');
}

/* ---------------------------------------------------------
   INNINGS 2
--------------------------------------------------------- */
function startSecondInningsFromTarget() {
  // If user provided a target, use it; otherwise default to first innings + 1
  const t = parseInt($('targetScore').value, 10);
  state.target = isNaN(t) ? (state.runs1 + 1) : t;
  goToPage('page-innings2');
  updateInnings2Display();
}

function handleInnings2Button(dataset) {
  if (dataset.run2) return scoreRun2(parseInt(dataset.run2, 10));
  if (dataset.boundary2) return scoreBoundary2(parseInt(dataset.boundary2, 10));
  if (dataset.extra2) return dataset.extra2 === 'wide' ? addWide2() : addNoBall2();
  if (dataset.wicket2) return addWicket2();
}

function scoreRun2(r) {
  state.runs2 += r;
  state.balls2++;
  recordEvent(2, `●${r}`, r, true, false);
  updateInnings2Display();
}

function scoreBoundary2(r) {
  state.runs2 += r;
  state.balls2++;
  const token = r === 6 ? '^' : '4';
  recordEvent(2, token === '^' ? '^' : '4', r, true, false);
  celebrate2(r === 6 ? '🎉 SIX!' : '🔥 FOUR!');
  updateInnings2Display();
}

function addWide2() {
  state.runs2++;
  recordEvent(2, 'WD', 1, false, false);
  updateInnings2Display();
}

function addNoBall2() {
  state.runs2++;
  recordEvent(2, 'NB', 1, false, false);
  updateInnings2Display();
}

function addWicket2() {
  state.wickets2++;
  state.balls2++;
  recordEvent(2, 'W', 0, true, true);
  celebrate2('💥 WICKET!');
  updateInnings2Display();
}

function undoLastBall2() {
  if (state.balls2 > 0) state.balls2--;
  updateInnings2Display();
}

function updateInnings2Display() {
  const scoreEl = $('innings2-score');
  const oversEl = $('innings2-overs');
  const rrrEl = $('innings2-rrr');
  const neededEl = $('innings2-needed');

  if (scoreEl) scoreEl.innerText = `${state.runs2}/${state.wickets2}`;
  if (oversEl) oversEl.innerText = `${Math.floor(state.balls2 / 6)}.${state.balls2 % 6}`;

  const needed = Math.max(0, state.target - state.runs2);
  if (neededEl) neededEl.innerText = `Runs Needed: ${needed}`;

  const remainingOvers = Math.max(0, state.oversPerInnings - state.balls2 / 6);
  const rrr = remainingOvers > 0 ? (needed / remainingOvers).toFixed(2) : '0.00';
  if (rrrEl) rrrEl.innerText = `RRR: ${rrr}`;

  updateHistoryDisplay(2);

  // End match if target reached or overs exhausted or all out
  const maxOvers = state.oversPerInnings || 10;
  const maxBalls = maxOvers * 6;
  const maxWickets = Math.max(1, state.playersB - 1);

  if (state.target > 0 && state.runs2 >= state.target) {
    endMatch();
  } else if (state.balls2 >= maxBalls || state.wickets2 >= maxWickets) {
    endMatch();
  }
}

/* ---------------------------------------------------------
   CELEBRATION
--------------------------------------------------------- */
function celebrate(text) {
  const el = $('celebration');
  if (!el) return;
  el.innerText = text;
  el.classList.add('celebrate');
  setTimeout(() => el.classList.remove('celebrate'), 600);
}

function celebrate2(text) {
  const el = $('celebration2');
  if (!el) return;
  el.innerText = text;
  el.classList.add('celebrate');
  setTimeout(() => el.classList.remove('celebrate'), 600);
}

/* ---------------------------------------------------------
   MATCH END
--------------------------------------------------------- */
function endMatch() {
  const winner =
    state.runs2 >= state.target ? 'Chasing Team Wins!' : 'Defending Team Wins!';

  $('summary-content').innerText = winner;

  // optionally include last over summaries in summary-content
  let details = '\n\nFirst Innings:\n';
  state.overSummaries1.filter(o => o.events.length).forEach((o, i) => {
    details += `Over ${i+1}: ${o.runs} runs, ${o.wickets} wkts (${o.events.join(' ')})\n`;
  });
  details += `\nSecond Innings:\n`;
  state.overSummaries2.filter(o => o.events.length).forEach((o, i) => {
    details += `Over ${i+1}: ${o.runs} runs, ${o.wickets} wkts (${o.events.join(' ')})\n`;
  });

  // append details as preformatted text
  const pre = document.createElement('pre');
  pre.className = 'small mt-2';
  pre.style.whiteSpace = 'pre-wrap';
  pre.innerText = details;
  const summaryContent = $('summary-content');
  if (summaryContent) {
    summaryContent.innerHTML = '';
    summaryContent.appendChild(document.createTextNode(winner));
    summaryContent.appendChild(pre);
  }
  goToPage('page-summary');
}