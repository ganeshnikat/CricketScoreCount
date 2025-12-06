const pageFlow = [
  'page-landing',
  'page-team-setup',
  'page-toss',
  'page-innings1',
  'page-target-mode',
  'page-innings2',
  'page-summary'
];

let currentPageIndex = 0;

function setCurrentPage(id) {
  const idx = pageFlow.indexOf(id);
  if (idx !== -1) currentPageIndex = idx;
}

function goToPageWithNav(id) {
  goToPage(id);
  setCurrentPage(id);
  updateNavBar();
}

function updateNavBar() {
  const label = document.getElementById('nav-step-label');
  const backBtn = document.getElementById('nav-back');
  const nextBtn = document.getElementById('nav-next');

  if (!label || !backBtn || !nextBtn) return;

  label.textContent = `Step ${currentPageIndex + 1} of ${pageFlow.length}`;

  backBtn.disabled = currentPageIndex === 0;
  nextBtn.disabled = currentPageIndex === pageFlow.length - 1;
}
const id = document.getElementById.bind(document);

function on(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
}

function goToPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(id);
  if (page) page.classList.add('active');
}

let state = {
  oversPerInnings: parseInt(localStorage.getItem('oversPerInnings'), 10) || 20,
  teamA: localStorage.getItem('teamA') || '', teamB: localStorage.getItem('teamB') || '',
  playersA: parseInt(localStorage.getItem('playersA'), 10) || 11,
  playersB: parseInt(localStorage.getItem('playersB'), 10) || 11,
  runs1: 0, wickets1: 0, balls1: 0, innings1Ended: false,
  runs2: 0, wickets2: 0, balls2: 0, target: 0,
  overSummaries1: [{ runs: 0, wickets: 0, balls: 0, events: [] }],
  overSummaries2: [{ runs: 0, wickets: 0, balls: 0, events: [] }],
  ballHistory1: [], ballHistory2: [],
  tossWinner: ''
};

document.addEventListener('DOMContentLoaded', () => {
  on('start-setup', 'click', () => goToPage('page-team-setup'));
  on('goto-target', 'click', () => goToPage('page-target-mode'));
  on('proceedSummary', 'click', proceedToSummary);
  on('fun-toss-btn', 'click', funToss);
  on('show-fun-toss', 'click', () => {
    const card = document.getElementById('fun-toss-card');
    if (!card) return;
    card.style.display = 'block';
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  on('fun-toss-btn', 'click', funToss);
  on('save-setup', 'click', saveTeamSetup);
  on('tossButton', 'click', performToss);
  on('endInnings1', 'click', endInnings1);
  on('startChase', 'click', startSecondInningsFromTarget);
  on('endMatch', 'click', endMatch);
  on('restart', 'click', () => { localStorage.clear(); location.reload(); });

  on('undo1', 'click', () => undoLastBall(1));
  on('undo2', 'click', () => undoLastBall(2));
  on('showOvers1', 'click', () => showRecentOvers(1));
  on('showOvers2', 'click', () => showRecentOvers(2));
  on('proceedInnings2', 'click', proceedToInnings2);

  document.addEventListener('click', (e) => {
    if (e.target.matches('#page-innings1 .button-grid button')) {
      handleInnings1Button(e.target.dataset);
    }
    if (e.target.matches('#page-innings2 .button-grid button')) {
      handleInnings2Button(e.target.dataset);
    }
    if (e.target.matches('#bat-bowl-section button')) {
      selectBatBowl(e.target.dataset.decision);
    }
  });
  on('nav-back', 'click', () => {
    if (currentPageIndex > 0) {
      const prevId = pageFlow[currentPageIndex - 1];
      goToPageWithNav(prevId);
    }
  });

  on('nav-next', 'click', () => {
    if (currentPageIndex >= pageFlow.length - 1) return;

    const currentId = pageFlow[currentPageIndex];
    const nextId = pageFlow[currentPageIndex + 1];

    if (!canNavigateForward(currentId)) {
      return;
    }

    goToPageWithNav(nextId);
  });

  on('start-setup', 'click', () => goToPageWithNav('page-team-setup'));
  on('goto-target', 'click', () => goToPageWithNav('page-target-mode'));

  on('save-setup', 'click', saveTeamSetup);
  on('tossButton', 'click', performToss);
  on('endInnings1', 'click', endInnings1);
  on('startChase', 'click', startSecondInningsFromTarget);
  on('endMatch', 'click', endMatch);
  on('restart', 'click', () => { localStorage.clear(); location.reload(); });

  goToPageWithNav('page-landing');
  localStorage.removeItem('innings1Complete');
  goToPage('page-landing');
  localStorage.removeItem('innings1Complete');
});

function saveTeamSetup() {
  const teamAName = document.getElementById('teamAName').value.trim();
  const teamBName = document.getElementById('teamBName').value.trim();
  const oversVal  = document.getElementById('oversPerInnings').value.trim();
  const playersAVal = document.getElementById('teamAPlayers').value.trim();
  const playersBVal = document.getElementById('teamBPlayers').value.trim();

  const err = document.getElementById('team-setup-error');

  const showErr = (msg) => {
    if (err) {
      err.textContent = msg;
      err.style.display = 'block';
    }
  };

  if (!teamAName || !teamBName || !oversVal || !playersAVal || !playersBVal) {
    showErr('All fields are mandatory. Please fill team names, players and overs.');
    return;
  }

  const overs    = parseInt(oversVal, 10);
  const playersA = parseInt(playersAVal, 10);
  const playersB = parseInt(playersBVal, 10);

  if (isNaN(overs) || overs <= 0 || isNaN(playersA) || playersA <= 1 || isNaN(playersB) || playersB <= 1) {
    showErr('Enter valid positive numbers: overs > 0 and players ≥ 2 for both teams.');
    return;
  }

  if (err) {
    err.textContent = '';
    err.style.display = 'none';
  }

  state.teamA = teamAName;
  state.teamB = teamBName;
  state.oversPerInnings = overs;
  state.playersA = playersA;
  state.playersB = playersB;

  localStorage.setItem('teamA', teamAName);
  localStorage.setItem('teamB', teamBName);
  localStorage.setItem('oversPerInnings', overs);
  localStorage.setItem('playersA', playersA);
  localStorage.setItem('playersB', playersB);

  populateTossCaller();
  goToPage('page-toss');
}


function populateTossCaller() {
  const select = document.getElementById('tossCaller');
  if (!select) return;
  select.innerHTML = '';

  if (state.teamA) {
    const opt = document.createElement('option');
    opt.value = 'A'; opt.textContent = state.teamA;
    select.appendChild(opt);
  }
  if (state.teamB) {
    const opt = document.createElement('option');
    opt.value = 'B'; opt.textContent = state.teamB;
    select.appendChild(opt);
  }
}

function performToss() {
  const tossBtn = document.getElementById('tossButton');
  if (!tossBtn) return;
  tossBtn.disabled = true;

  const callerKey = document.getElementById('tossCaller').value;
  const callerName = callerKey === 'A' ? state.teamA : state.teamB;
  const opponentName = callerKey === 'A' ? state.teamB : state.teamA;
  const callerChoice = document.getElementById('tossChoice').value.toLowerCase();

  const coin = document.getElementById('coin');
  const resultBox = document.getElementById('toss-result');
  const batBowlSection = document.getElementById('bat-bowl-section');

  resultBox.textContent = 'Flipping coin...';
  batBowlSection.style.display = 'none';

  coin.classList.remove('heads', 'tails', 'flipping');
  coin.textContent = '₹';

  void coin.offsetWidth;
  coin.classList.add('flipping');

  setTimeout(() => {
    coin.classList.remove('flipping');

    const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';

    coin.classList.remove('heads', 'tails');
    coin.classList.add(flipResult);
    coin.textContent = '₹';

    const winner = flipResult === callerChoice ? callerName : opponentName;
    state.tossWinner = winner;

    resultBox.innerHTML = `<strong>${winner}</strong> won the toss (${flipResult.toUpperCase()})!`;
    batBowlSection.style.display = 'block';
    tossBtn.disabled = false;
  }, 1100);
}


function selectBatBowl(decision) {
  const winner = state.tossWinner;
  if (!winner) return;

  if (decision === 'bat') {
    document.getElementById('innings1-title').textContent = `First Innings - ${winner}`;
  } else {
    document.getElementById('innings1-title').textContent = `First Innings - ${winner === state.teamA ? state.teamB : state.teamA}`;
  }

  goToPage('page-innings1');
  updateInnings1Display();
}

function recordEvent(innings, token, runs = 0, isLegalBall = false, wicket = false) {
  const overList = innings === 1 ? state.overSummaries1 : state.overSummaries2;
  const history = innings === 1 ? state.ballHistory1 : state.ballHistory2;

  history.push({ type: token, runs, wicket, isLegalBall });

  const cur = overList[overList.length - 1];
  cur.events.push(token);
  cur.runs += runs;
  if (wicket) cur.wickets++;
  if (isLegalBall) cur.balls++;

  if (cur.balls >= 6) {
    overList.push({ runs: 0, wickets: 0, balls: 0, events: [] });
  }

  updateHistoryDisplay(innings);
}

function undoLastBall(innings) {
  const history = innings === 1 ? state.ballHistory1 : state.ballHistory2;
  if (!history.length) return;

  const last = history[history.length - 1];
  let msg = `<p>You are about to undo: <strong>${last.type}</strong></p>`;
  if (last.runs) msg += `<p>Runs: <strong>${last.runs}</strong></p>`;
  if (last.wicket) msg += `<p>Wickets: <strong>1</strong></p>`;
  msg += `<p class="small text-muted mb-0">This will update score, balls and over history.</p>`;

  showUndoModal(msg, () => {
    history.pop();
    if (innings === 1) {
      state.runs1 -= last.runs || 0;
      if (last.wicket) state.wickets1--;
      if (last.isLegalBall) state.balls1--;
      rebuildOverSummaries(1);
      updateInnings1Display();
    } else {
      state.runs2 -= last.runs || 0;
      if (last.wicket) state.wickets2--;
      if (last.isLegalBall) state.balls2--;
      rebuildOverSummaries(2);
      updateInnings2Display();
    }
  });
}
function rebuildOverSummaries(innings) {
  const overList = innings === 1 ? state.overSummaries1 : state.overSummaries2;
  const history = innings === 1 ? state.ballHistory1 : state.ballHistory2;

  overList.length = 0;
  overList.push({ runs: 0, wickets: 0, balls: 0, events: [] });

  history.forEach(ev => {
    const cur = overList[overList.length - 1];
    cur.events.push(ev.type);
    cur.runs += ev.runs || 0;
    if (ev.wicket) cur.wickets++;
    if (ev.isLegalBall) cur.balls++;
    if (cur.balls >= 6) {
      overList.push({ runs: 0, wickets: 0, balls: 0, events: [] });
    }
  });
}

function getBallHTML(token) {
  const classes = {
    '6': 'ball-six',
    '4': 'ball-four',
    '3': 'ball-run',
    '2': 'ball-run',
    '1': 'ball-run',
    '0': 'ball-dot',
    'W': 'ball-wicket',
    'WD': 'ball-wide',
    'NB': 'ball-noball'
  };
  const cls = classes[token] || 'ball-run';
  return `<span class="ball-circle ${cls}">${token}</span>`;
}

function updateHistoryDisplay(innings) {
  const containerId = innings === 1 ? 'innings1-history' : 'innings2-history';
  const el = document.getElementById(containerId);
  if (!el) return;

  const overList = innings === 1 ? state.overSummaries1 : state.overSummaries2;
  if (!overList.length) {
    el.innerHTML = '<div class="text-muted text-center small">No balls bowled yet</div>';
    return;
  }
  const nonEmpty = overList.filter(o => o.events && o.events.length > 0);
  if (!nonEmpty.length) {
    el.innerHTML = '<div class="text-muted text-center small">No balls bowled yet</div>';
    return;
  }
  const currentOver = nonEmpty[nonEmpty.length - 1];
  const overNum = nonEmpty.length; // 1-based index for current over

  let html = `
    <div class="text-center text-muted mb-1 small">
      Current Over: ${overNum} (Runs: ${currentOver.runs}, Wkts: ${currentOver.wickets})
    </div>
    <div class="text-center">
      ${currentOver.events.map(getBallHTML).join('')}
    </div>
  `;
  el.innerHTML = html;
}

function showRecentOvers(innings) {
  const modalId = innings === 1 ? 'innings1RecentModal' : 'innings2RecentModal';
  const contentId = innings === 1 ? 'innings1RecentContent' : 'innings2RecentContent';
  const modalEl = document.getElementById(modalId);

  if (!modalEl) {
    alert('Recent overs modal not available');
    return;
  }
  const overList = innings === 1 ? state.overSummaries1 : state.overSummaries2;
  const effective = overList.filter(o => o.events.length > 0);
  let html = '';
  effective.forEach((over, idx) => {
    html += `<div class="mb-3 p-3 border rounded">
      <h6>Over ${idx + 1}: ${over.runs} runs, ${over.wickets} wkts (${over.balls}/6)</h6>
      <div class="d-flex flex-wrap">${over.events.map(getBallHTML).join('')}</div>
    </div>`;
  });
  document.getElementById(contentId).innerHTML = html || 'No overs completed yet';
  new bootstrap.Modal(modalEl).show();
}
function updateDisplay(innings) {
  if (innings === 1) updateInnings1Display();
  else updateInnings2Display();
  updateHistoryDisplay(innings);
}
function handleInnings1Button(dataset) {
  if (dataset.run !== undefined) {
    const runs = parseInt(dataset.run, 10);
    state.runs1 += runs;
    state.balls1++;
    recordEvent(1, runs.toString(), runs, true, false);
    if (runs === 6) celebrate(1, 'SIX!');
    updateInnings1Display();
  } else if (dataset.boundary !== undefined) {
    const runs = parseInt(dataset.boundary, 10);
    state.runs1 += runs;
    state.balls1++;
    const token = runs === 6 ? '6' : '4';
    recordEvent(1, token, runs, true, false);
    celebrate(1, runs === 6 ? 'SIX!' : 'FOUR!');
    updateInnings1Display();
  } else if (dataset.extra === 'wide') {
    state.runs1++;
    recordEvent(1, 'WD', 1, false, false);
    updateInnings1Display();
  } else if (dataset.extra === 'noball') {
    state.runs1++;
    recordEvent(1, 'NB', 1, false, false);
    updateInnings1Display();
  } else if (dataset.wicket !== undefined) {
    state.wickets1++;
    state.balls1++;
    recordEvent(1, 'W', 0, true, true);
    celebrate(1, 'WICKET!');
    updateInnings1Display();
  }
}

function scoreRun(innings, r) {
  state.runs1 += r;
  state.balls1++;
  recordEvent(1, r.toString(), r, true, false);
  if (r === 6) celebrate(1, '🎉 SIX!');
  else if (r === 4) celebrate(1, '🎉 FOUR!');
  updateDisplay(1);
}

function scoreBoundary(innings, r) {
  state.runs1 += r;
  state.balls1++;
  const token = r === 6 ? '6' : '4';
  recordEvent(1, token, r, true, false);
  celebrate(1, r === 6 ? '🎉 SIX!' : '🎉 FOUR!');
  updateDisplay(1);
}

function addWide(innings) {
  state.runs1++;
  recordEvent(1, 'WD', 1, false, false);
  updateDisplay(1);
}

function addNoBall(innings) {
  state.runs1++;
  recordEvent(1, 'NB', 1, false, false);
  updateDisplay(1);
}

function addWicket(innings) {
  state.wickets1++;
  state.balls1++;
  recordEvent(1, 'W', 0, true, true);
  const celebEl = document.getElementById('celebration');
  if (celebEl) {
    celebEl.textContent = '💥 WICKET!';
    celebEl.classList.add('celebrate');
    setTimeout(() => celebEl.classList.remove('celebrate'), 300);
  }

  updateInnings1Display();
}

function updateInnings1Display() {
  const scoreEl = document.getElementById('innings1-score');
  const oversEl = document.getElementById('innings1-overs');
  const rrEl = document.getElementById('innings1-rr');

  if (scoreEl) scoreEl.textContent = `${state.runs1}/${state.wickets1}`;
  if (oversEl) oversEl.textContent = `${Math.floor(state.balls1 / 6)}.${state.balls1 % 6} Overs`;

  const rr = state.balls1 === 0 ? 0 : (state.runs1 / (state.balls1 / 6)).toFixed(2);
  if (rrEl) rrEl.textContent = `RR ${rr}`;

  const maxBalls = state.oversPerInnings * 6;
  const maxWickets = Math.max(1, state.playersA);

  if (!state.innings1Ended) {
    if (state.balls1 >= maxBalls) {
      state.innings1Ended = true;
      showInningsEndModal(
        'Innings Break',
        `${state.teamA}: ${state.runs1}/${state.wickets1}<br>Overs completed: ${state.oversPerInnings}`,
        '🕒'
      );
    } else if (state.wickets1 >= maxWickets) {
      state.innings1Ended = true;
      showInningsEndModal(
        'All Out',
        `${state.teamA}: ${state.runs1}/${state.wickets1}`,
        '🏏'
      );
    }
  }
  updateHistoryDisplay(1);
}

function endInnings1() {
  const stats = `
    <strong>${state.teamA}</strong>: ${state.runs1}/${state.wickets1}<br>
    ${Math.floor(state.balls1 / 6)}.${state.balls1 % 6} overs | RR ${(state.runs1 / (state.balls1 / 6)).toFixed(2)}
  `;

  document.getElementById('innings1-stats').innerHTML = stats;
  const modal = new bootstrap.Modal(document.getElementById('innings1Modal'));
  modal.show();

  localStorage.setItem('innings1Complete', JSON.stringify({
    runs: state.runs1, wickets: state.wickets1, balls: state.balls1, team: state.teamA
  }));
}
function showInningsEndModal(title, message, emoji) {
  const body = document.getElementById('innings1-stats');
  if (!body) return;

  const overs = `${Math.floor(state.balls1 / 6)}.${state.balls1 % 6}`;
  const rr = state.balls1 === 0 ? 0 : (state.runs1 / (state.balls1 / 6)).toFixed(2);

  body.innerHTML = `
    <div class="text-center">
      <div class="display-4 mb-2">${emoji}</div>
      <h4 class="mb-2">${title}</h4>
      <div class="mb-2">${message}</div>
      <hr>
      <div class="small text-muted">Overs: ${overs} &nbsp; | &nbsp; RR: ${rr}</div>
    </div>
  `;

  const modal = new bootstrap.Modal(document.getElementById('innings1Modal'));
  modal.show();

  localStorage.setItem('innings1Complete', JSON.stringify({
    runs: state.runs1, wickets: state.wickets1, balls: state.balls1, team: state.teamA
  }));
}
function proceedToInnings2() {
  const innings1Data = JSON.parse(localStorage.getItem('innings1Complete') || '{}');
  state.target = (innings1Data.runs || state.runs1) + 1;

  const targetInput = document.getElementById('targetScore');
  if (targetInput) targetInput.value = state.target;

  const modal = bootstrap.Modal.getInstance(document.getElementById('innings1Modal'));
  if (modal) modal.hide();

  state.runs2 = 0;
  state.wickets2 = 0;
  state.balls2 = 0;
  state.overSummaries2 = [{ runs: 0, wickets: 0, balls: 0, events: [] }];
  state.ballHistory2 = [];

  goToPage('page-innings2');
  updateInnings2Display();
}

function startSecondInningsFromTarget() {
  const tInput = document.getElementById('targetScore');
  const oInput = document.getElementById('targetOvers');
  const wInput = document.getElementById('targetWickets');

  const tVal = tInput ? tInput.value.trim() : '';
  const oVal = oInput ? oInput.value.trim() : '';
  const wVal = wInput ? wInput.value.trim() : '';

  const errorBoxId = 'target-error';
  let errEl = document.getElementById(errorBoxId);
  if (!errEl) {
    errEl = document.createElement('div');
    errEl.id = errorBoxId;
    errEl.className = 'error mt-2';
    const page = document.getElementById('page-target-mode');
    if (page) page.insertBefore(errEl, page.firstChild.nextSibling);
  }

  if (!tVal || !oVal || !wVal) {
    errEl.textContent = 'Please fill Target Score, Max Overs and Available Wickets before starting 2nd innings.';
    return;
  }

  const t = parseInt(tVal, 10);
  const o = parseInt(oVal, 10);
  const w = parseInt(wVal, 10);

  if (isNaN(t) || t <= 0 || isNaN(o) || o <= 0 || isNaN(w) || w <= 0) {
    errEl.textContent = 'All values must be positive numbers.';
    return;
  }
  errEl.textContent = '';
  state.target = t;
  state.oversPerInnings = o;
  state.playersB = w + 1;
  state.runs2 = 0;
  state.wickets2 = 0;
  state.balls2 = 0;
  state.overSummaries2 = [{ runs: 0, wickets: 0, balls: 0, events: [] }];
  state.ballHistory2 = [];
  const title2 = document.getElementById('innings2-title');
  if (title2 && state.teamB) {
    title2.textContent = `Second Innings - ${state.teamB}`;
  }

  goToPage('page-innings2');
  updateInnings2Display();
}


function handleInnings2Button(dataset) {
  if (dataset.run2 !== undefined) {
    const r = parseInt(dataset.run2, 10);
    state.runs2 += r;
    state.balls2++;
    recordEvent(2, r.toString(), r, true, false);
    if (r === 6) celebrate(2, 'SIX!');
    else if (r === 4) celebrate(2, 'FOUR!');
    updateInnings2Display();
  } else if (dataset.boundary2 !== undefined) {
    const r = parseInt(dataset.boundary2, 10);
    state.runs2 += r;
    state.balls2++;
    const token = r === 6 ? '6' : '4';
    recordEvent(2, token, r, true, false);
    celebrate(2, r === 6 ? 'SIX!' : 'FOUR!');
    updateInnings2Display();
  } else if (dataset.extra2 === 'wide') {
    state.runs2++;
    recordEvent(2, 'WD', 1, false, false);
    updateInnings2Display();
  } else if (dataset.extra2 === 'noball') {
    state.runs2++;
    recordEvent(2, 'NB', 1, false, false);
    updateInnings2Display();
  } else if (dataset.wicket2 !== undefined) {
    state.wickets2++;
    state.balls2++;
    recordEvent(2, 'W', 0, true, true);
    celebrate(2, 'WICKET!');
    updateInnings2Display();
  }
}

function updateInnings2Display() {
  const scoreEl = document.getElementById('innings2-score');
  const oversEl = document.getElementById('innings2-overs');
  const rrrEl = document.getElementById('innings2-rrr');
  const neededEl = document.getElementById('innings2-needed');

  const totalBalls  = state.oversPerInnings * 6;
  const ballsBowled = state.balls2;
  const ballsLeft   = Math.max(0, totalBalls - ballsBowled);

  const needBallsEl = document.getElementById('innings2-needed-balls');
  if (scoreEl) scoreEl.textContent = `${state.runs2}/${state.wickets2}`;
  if (oversEl) oversEl.textContent = `${Math.floor(state.balls2 / 6)}.${state.balls2 % 6} Overs`;

  const target = state.target || 0;
  const needed = Math.max(0, target - state.runs2);
  if (neededEl) neededEl.textContent = `Runs Needed: ${needed}`;

  const oversBowled = state.balls2 / 6;
  const oversRemaining = Math.max(0, state.oversPerInnings - oversBowled);
  const rrr = oversRemaining <= 0 || needed <= 0
    ? 0
    : (needed / oversRemaining).toFixed(2);
  if (rrrEl) rrrEl.textContent = `RRR ${rrr}`;

  updateHistoryDisplay(2);

  const maxBalls = state.oversPerInnings * 6;
  const maxWickets = Math.max(1, state.playersB);
  if (state.balls2 > 0 || state.wickets2 > 0) {
    if (needed <= 0) {
      showInnings2ResultModal('Chase Completed');
    } else if (state.balls2 >= maxBalls || state.wickets2 >= maxWickets) {
      showInnings2ResultModal('Innings Complete');
    }
  }
  if (needBallsEl) {
      needBallsEl.textContent = `Need ${needed} run(s) from ${ballsLeft} ball(s)`;
    }
}

function scoreRun(innings, r) {
  state.runs2 += r;
  state.balls2++;
  recordEvent(2, r.toString(), r, true, false);
  if (r === 6) celebrate(2, '🎉 SIX!');
  else if (r === 4) celebrate(2, '🎉 FOUR!');
  updateDisplay(2);
}

function scoreBoundary(innings, r) {
  state.runs2 += r;
  state.balls2++;
  const token = r === 6 ? '6' : '4';
  recordEvent(2, token, r, true, false);
  celebrate(2, r === 6 ? '🎉 SIX!' : '🎉 FOUR!');
  updateDisplay(2);
}

function addWide(innings) {
  state.runs2++;
  recordEvent(2, 'WD', 1, false, false);
  updateDisplay(2);
}

function addNoBall(innings) {
  state.runs2++;
  recordEvent(2, 'NB', 1, false, false);
  updateDisplay(2);
}

function addWicket(innings) {
  state.wickets1++;  // Increment FIRST
  state.balls1++;
  recordEvent(1, 'W', 0, true, true);
  const celebEl = document.getElementById('celebration');
  if (celebEl) {
    celebEl.textContent = '💥 WICKET!';
    celebEl.classList.add('celebrate');
    setTimeout(() => celebEl.classList.remove('celebrate'), 300);
  }

  updateInnings1Display(); // Updates instantly
}

function endMatch() {
  const summaryContent = document.getElementById('summary-content');
  if (!summaryContent) {
    goToPage('page-summary');
    return;
  }
  const innings1Data = JSON.parse(localStorage.getItem('innings1Complete') || '{}');
  const runs1 = innings1Data.runs ?? state.runs1;
  const wickets1 = innings1Data.wickets ?? state.wickets1;
  const balls1 = innings1Data.balls ?? state.balls1;
  const overs1 = `${Math.floor((balls1 || 0) / 6)}.${(balls1 || 0) % 6}`;

  const runs2 = state.runs2;
  const wickets2 = state.wickets2;
  const overs2 = `${Math.floor(state.balls2 / 6)}.${state.balls2 % 6}`;

  let resultText;
  if (runs2 >= state.target) {
    const wktsInHand = (state.playersB - 1) - wickets2;
    resultText = `${state.teamB} won by ${wktsInHand} wicket(s).`;
  } else {
    const margin = state.target - runs2;
    resultText = `${state.teamA} won by ${margin} run(s).`;
  }

  const inn1Overs = state.overSummaries1.filter(o => o.events && o.events.length);
  const inn2Overs = state.overSummaries2.filter(o => o.events && o.events.length);

  let html = `
    <h3 class="text-center mb-3">${resultText}</h3>
    <div class="row text-center mb-3">
      <div class="col-md-6">
        <h5>${state.teamA}</h5>
        <div class="fs-4">${runs1}/${wickets1}</div>
        <small>${overs1} overs</small>
      </div>
      <div class="col-md-6">
        <h5>${state.teamB}</h5>
        <div class="fs-4">${runs2}/${wickets2}</div>
        <small>${overs2} overs (Target ${state.target})</small>
      </div>
    </div>
    <hr>
    <h5>${state.teamA} - Over by Over</h5>
  `;

  inn1Overs.forEach((o, i) => {
    html += `
      <div class="mb-1 small">
        <strong>Over ${i + 1}:</strong> ${o.runs} runs, ${o.wickets} wkts &nbsp;
        ${o.events.map(getBallHTML).join(' ')}
      </div>
    `;
  });

  html += `<hr><h5>${state.teamB} - Over by Over</h5>`;

  inn2Overs.forEach((o, i) => {
    html += `
      <div class="mb-1 small">
        <strong>Over ${i + 1}:</strong> ${o.runs} runs, ${o.wickets} wkts &nbsp;
        ${o.events.map(getBallHTML).join(' ')}
      </div>
    `;
  });
  summaryContent.innerHTML = html;
  goToPage('page-summary');
}


function showInningsEndModal(title, message, emoji) {
  document.getElementById('innings1-stats').innerHTML = `
    <div class="text-center">
      <div class="display-4 mb-3">${emoji}</div>
      <h4 class="text-primary mb-3">${title}</h4>
      <div class="fs-5">${message}</div>
      <hr>
      <div>${Math.floor(state.balls1 / 6)}.${state.balls1 % 6} overs | RR ${(state.runs1 / (state.balls1 / 6)).toFixed(2)}</div>
    </div>
  `;
  new bootstrap.Modal(document.getElementById('innings1Modal')).show();
}

function celebrate(innings, text) {
  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-text');
  if (!overlay || !content) return;
  content.textContent = text;
  overlay.style.display = 'flex';
  setTimeout(() => {
    overlay.style.display = 'none';
    content.textContent = '';
  }, 900);
}


function showUndoModal(message, onConfirm) {
  const bodyEl = document.getElementById('undoModal-body');
  const confirmBtn = document.getElementById('undoModal-confirm');
  const modalEl = document.getElementById('undoModal');
  if (!bodyEl || !confirmBtn || !modalEl) return;

  bodyEl.innerHTML = message;

  const handler = () => {
    confirmBtn.removeEventListener('click', handler);
    const inst = bootstrap.Modal.getInstance(modalEl);
    if (inst) inst.hide();
    if (typeof onConfirm === 'function') onConfirm();
  };
  confirmBtn.addEventListener('click', handler);

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

function showInnings2ResultModal(title) {
  const body = document.getElementById('innings2-stats');
  if (!body) return;

  const overs2 = `${Math.floor(state.balls2 / 6)}.${state.balls2 % 6}`;
  const rr2 = state.balls2 === 0 ? 0 : (state.runs2 / (state.balls2 / 6)).toFixed(2);

  const innings1Data = JSON.parse(localStorage.getItem('innings1Complete') || '{}');
  const runs1 = innings1Data.runs ?? state.runs1;
  const wickets1 = innings1Data.wickets ?? state.wickets1;
  const balls1 = innings1Data.balls ?? state.balls1;
  const overs1 = `${Math.floor((balls1 || 0) / 6)}.${(balls1 || 0) % 6}`;
  const rr1 = balls1 ? (runs1 / (balls1 / 6)).toFixed(2) : '0.00';

  let resultText;
  if (state.runs2 >= state.target) {
    const wktsInHand = (state.playersB - 1) - state.wickets2;
    resultText = `${state.teamB} won by ${wktsInHand} wicket(s).`;
  } else {
    const margin = state.target - state.runs2;
    resultText = `${state.teamA} won by ${margin} run(s).`;
  }

  body.innerHTML = `
    <div class="text-center">
      <h4 class="mb-2">${title}</h4>
      <p class="mb-2"><strong>Result:</strong> ${resultText}</p>
      <hr>
      <div class="row text-center">
        <div class="col-6">
          <h6>${state.teamA}</h6>
          <div>${runs1}/${wickets1}</div>
          <small>${overs1} overs, RR ${rr1}</small>
        </div>
        <div class="col-6">
          <h6>${state.teamB}</h6>
          <div>${state.runs2}/${state.wickets2}</div>
          <small>${overs2} overs, RR ${rr2}</small>
        </div>
      </div>
      <hr>
      <div class="small text-muted">Click Proceed to see full over-by-over summary.</div>
    </div>
    `;
  const modal = new bootstrap.Modal(document.getElementById('innings2Modal'));
  modal.show();
}

function proceedToSummary() {
  const modalEl = document.getElementById('innings2Modal');
  const inst = modalEl ? bootstrap.Modal.getInstance(modalEl) : null;
  if (inst) inst.hide();
  endMatch();
}
function canNavigateForward(currentId) {
  const showMsg = (text) => {
    let el = document.getElementById('global-validation');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-validation';
      el.className = 'error mt-2';
      const app = document.getElementById('app') || document.body;
      app.insertBefore(el, app.firstChild);
    }
    el.textContent = text;
    setTimeout(() => { el.textContent = ''; }, 2500);
  };

  if (currentId === 'page-landing') {
    return true;
  }

  if (currentId === 'page-team-setup') {
    if (!state.teamA || !state.teamB) {
      showMsg('Please complete team setup before proceeding.');
      return false;
    }
    return true;
  }

  if (currentId === 'page-toss') {
    if (!state.tossWinner) {
      showMsg('Please complete the toss and select bat/bowl before proceeding.');
      return false;
    }
    return true;
  }

  if (currentId === 'page-innings1') {
    if (!state.innings1Ended) {
      showMsg('First innings is not completed yet. End the innings before proceeding.');
      return false;
    }
    return true;
  }

  if (currentId === 'page-target-mode') {
    return true;
  }

  if (currentId === 'page-innings2') {
    const maxBalls = state.oversPerInnings * 6;
    const maxWickets = Math.max(1, state.playersB - 1);
    const targetSet = !!state.target;

    const inningsStarted = state.balls2 > 0 || state.wickets2 > 0;
    const chaseOver =
      (targetSet && state.runs2 >= state.target) ||
      state.balls2 >= maxBalls ||
      state.wickets2 >= maxWickets;

    if (!inningsStarted) {
      showMsg('Second innings has not started yet.');
      return false;
    }
    if (!chaseOver) {
      showMsg('Second innings is still in progress. Complete the innings before going to summary.');
      return false;
    }
    return true;
  }
  return true;
}

function funToss() {
  const coin = document.getElementById('fun-coin');
  const result = document.getElementById('fun-coin-result');
  const btn = document.getElementById('fun-toss-btn');
  if (!coin || !result || !btn) return;

  btn.disabled = true;
  result.textContent = 'Flipping coin...';

  coin.classList.remove('heads', 'tails', 'flipping');
  void coin.offsetWidth;            // restart CSS animation
  coin.classList.add('flipping');

  setTimeout(() => {
    coin.classList.remove('flipping');

    const isHeads = Math.random() < 0.5;
    const side = isHeads ? 'HEADS' : 'TAILS';

    coin.classList.remove('heads', 'tails');
    coin.classList.add(isHeads ? 'heads' : 'tails');
    coin.textContent = '₹';
    result.innerHTML = `
      Result:
      <span class="badge ${isHeads ? 'toss-heads-badge' : 'toss-tails-badge'}">
        ${side}
      </span>
    `;
    btn.disabled = false;
  }, 1100);
}




