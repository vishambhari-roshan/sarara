<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<title>SARARA — GHAR Calculator (Fixed)</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="SARARA">
<meta name="theme-color" content="#0b76ff">
<style>
  :root{font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;}
  body{margin:0;background:#f6f8fb;padding:18px;min-height:100vh;box-sizing:border-box}
  .card{background:#fff;border-radius:12px;padding:14px;box-shadow:0 6px 18px rgba(19,24,31,0.06);margin-bottom:12px}
  h1{margin:0 0 6px;font-size:20px}
  p.lead{margin:0;color:#556;font-size:13px}
  .controls{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  button{cursor:pointer;border:0;padding:8px 10px;border-radius:8px;background:#0b76ff;color:#fff;font-weight:600}
  button.ghost{background:#eef3ff;color:#0b76ff;border:1px solid #d7e6ff}
  table{width:100%;border-collapse:collapse;margin-top:12px}
  th,td{padding:8px 10px;text-align:center;border-bottom:1px solid #eef2f8;font-size:14px}
  input[type="text"], input[type="number"]{padding:6px;border-radius:8px;border:1px solid #e2e8f0;background:#fbfdff}
  input[type="number"]::-webkit-outer-spin-button,input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0;}
  .small{width:88px}
  .result-pay{color:#d9534f;font-weight:700}
  .result-rec{color:#1a9a6a;font-weight:700}
  .summary{margin-top:12px;display:flex;gap:10px;flex-wrap:wrap}
  .note{margin-top:8px;color:#995;color;font-size:13px}
  @media (max-width:640px){ .small{width:72px} th,td{font-size:13px} }
</style>
</head>
<body>
  <div class="card">
    <h1>SARARA — GHAR Calculator (Fixed)</h1>
    <p class="lead">Default GHAR & Points = 0. Add / Remove players. Shows are handled correctly so totals always balance.</p>

    <div class="controls">
      <button id="addPlayer">➕ Add Player</button>
      <button id="delPlayer" class="ghost">➖ Delete Player</button>
      <button id="calc" style="background:#1a9a6a">Calculate</button>
      <button id="export" class="ghost">Export CSV</button>
    </div>

    <form onsubmit="return false;">
      <table aria-describedby="playersDesc">
        <thead>
          <tr><th>Name</th><th>GHAR</th><th>Points</th><th>Show</th><th>Result</th></tr>
        </thead>
        <tbody id="tbody"></tbody>
      </table>
    </form>

    <div class="summary" id="summary" style="display:none">
      <div><strong>Total GHAR:</strong> <span id="sumGhar">0</span></div>
      <div><strong>Total Pays:</strong> <span id="sumPays">0</span></div>
      <div><strong>Total Receives:</strong> <span id="sumRec">0</span></div>
      <div><strong>Balanced:</strong> <span id="balanced">-</span></div>
    </div>

    <div class="note" id="adjustNote" style="display:none;color:#b36">
      (Small automatic adjustment applied to the show player's displayed value to guarantee exact balance.)
    </div>
  </div>

<script>
(function(){
  // --- Config
  const defaultNames = ["Roshan","Jayesh","Mayank","Bhawesh","Raunak"];
  const MAX_PLAYERS = 8;
  const MIN_PLAYERS = 2;

  // --- Helpers
  const $ = id => document.getElementById(id);
  const toInt = v => {
    // parse integer; treat empty or invalid as 0
    const n = parseInt(String(v).replace(/[^\d-]/g,''), 10);
    return Number.isFinite(n) ? n : 0;
  };

  // --- State
  let players = []; // { name, ghar (int), points (int), show (bool) }

  // --- DOM
  const tbody = $('tbody');
  const addBtn = $('addPlayer');
  const delBtn = $('delPlayer');
  const calcBtn = $('calc');
  const exportBtn = $('export');
  const sumGharEl = $('sumGhar');
  const sumPaysEl = $('sumPays');
  const sumRecEl = $('sumRec');
  const summaryEl = $('summary');
  const balancedEl = $('balanced');
  const adjustNote = $('adjustNote');

  // --- Render
  function render(){
    tbody.innerHTML = '';
    players.forEach((p, idx) => {
      const tr = document.createElement('tr');

      // Name
      const tdName = document.createElement('td');
      const inName = document.createElement('input');
      inName.type='text'; inName.value=p.name;
      inName.addEventListener('input', e => players[idx].name = e.target.value);
      tdName.appendChild(inName); tr.appendChild(tdName);

      // GHAR
      const tdG = document.createElement('td');
      const inG = document.createElement('input');
      inG.type='number'; inG.className='small';
      inG.value = p.ghar;
      inG.addEventListener('input', e => players[idx].ghar = toInt(e.target.value));
      tdG.appendChild(inG); tr.appendChild(tdG);

      // Points
      const tdP = document.createElement('td');
      const inP = document.createElement('input');
      inP.type='number'; inP.className='small';
      inP.value = p.points;
      inP.addEventListener('input', e => players[idx].points = toInt(e.target.value));
      // disable points input for show player visually
      if (p.show) { inP.disabled = true; inP.style.opacity = 0.6; }
      tdP.appendChild(inP); tr.appendChild(tdP);

      // Show
      const tdS = document.createElement('td');
      const inS = document.createElement('input');
      inS.type='radio'; inS.name='show';
      inS.checked = !!p.show;
      inS.addEventListener('change', () => {
        players.forEach(pl => pl.show = false);
        players[idx].show = true;
        render(); // re-render to disable points field for show player
      });
      tdS.appendChild(inS); tr.appendChild(tdS);

      // Result
      const tdR = document.createElement('td');
      tdR.id = 'res-' + idx;
      tdR.textContent = '-';
      tr.appendChild(tdR);

      tbody.appendChild(tr);
    });

    // ensure at least one show player
    if (!players.some(p => p.show) && players.length > 0) {
      players[0].show = true;
      render();
    }

    // disable add/del buttons depending on state
    addBtn.disabled = players.length >= MAX_PLAYERS;
    delBtn.disabled = players.length <= MIN_PLAYERS;
  }

  // --- Calculate (corrected)
  function calculate(){
    adjustNote.style.display = 'none';
    summaryEl.style.display = 'none';

    const n = players.length;
    if (n < MIN_PLAYERS) { alert('Need at least ' + MIN_PLAYERS + ' players'); return; }

    // convert to integers
    const gharArr = players.map(p => toInt(p.ghar));
    const ptsArr = players.map(p => toInt(p.points));
    const totalGhar = gharArr.reduce((s,v)=>s+v, 0);

    let showIndex = players.findIndex(p => p.show);
    if (showIndex === -1) showIndex = 0;

    // sum of others' points excluding show
    const sumOthersPoints = ptsArr.reduce((s, v, i) => i === showIndex ? s : s + v, 0);

    // compute raw nets (signed) using formula from your rules
    // For non-show: raw = points + totalGhar - (ownGhar * n)
    // For show: raw = sumOthersPoints + (ownGhar * n) - totalGhar
    const raw = new Array(n).fill(0);
    for (let i=0;i<n;i++){
      if (i === showIndex) continue;
      raw[i] = ptsArr[i] + totalGhar - (gharArr[i] * n);
    }
    raw[showIndex] = sumOthersPoints + (gharArr[showIndex] * n) - totalGhar;

    // Interpret amounts according to role:
    // - Non-show: raw>0 means they PAY raw; raw<0 means they RECEIVE abs(raw)
    // - Show: raw>0 means SHOW RECEIVES raw; raw<0 means SHOW PAYS abs(raw)
    let totalPays = 0, totalReceives = 0;
    const display = new Array(n);

    for (let i=0;i<n;i++){
      const r = raw[i];
      if (i === showIndex){
        if (r > 0){
          display[i] = {side: 'receive', amount: r};
          totalReceives += r;
        } else if (r < 0){
          display[i] = {side: 'pay', amount: Math.abs(r)};
          totalPays += Math.abs(r);
        } else {
          display[i] = {side: 'none', amount: 0};
        }
      } else {
        if (r > 0){
          display[i] = {side: 'pay', amount: r};
          totalPays += r;
        } else if (r < 0){
          display[i] = {side: 'receive', amount: Math.abs(r)};
          totalReceives += Math.abs(r);
        } else {
          display[i] = {side: 'none', amount: 0};
        }
      }
    }

    // Now totals should match. If a tiny discrepancy appears (shouldn't with integers),
    // we apply a small, transparent adjust to the show player's displayed amount to guarantee exact balance.
    // This prevents UI showing unbalanced totals due to any edge case.
    let diff = totalPays - totalReceives; // we want diff === 0

    if (diff !== 0){
      // apply adjustment to show player's display
      const s = display[showIndex];
      // If show currently receives, increase their receive by diff (if diff>0)
      // If show currently pays, decrease or increase appropriately.
      // We'll convert amounts to signed value and adjust by -diff so totals balance:
      // Let signedSum = totalPays - totalReceives. To zero it, subtract 'diff' from the show player's signed contribution.
      // Convert show signed:
      let showSigned = 0; // positive means pay (for internal math), negative means receive (we'll use display conventions later)
      // We will treat showSigned internal as: positive => increases totalPays; negative => increases totalReceives
      if (display[showIndex].side === 'pay') showSigned = display[showIndex].amount;
      else if (display[showIndex].side === 'receive') showSigned = -display[showIndex].amount;
      // subtract diff to balance
      let adjustedShowSigned = showSigned - diff;
      // Now convert back to display
      if (adjustedShowSigned > 0){
        display[showIndex] = { side: 'pay', amount: adjustedShowSigned };
      } else if (adjustedShowSigned < 0){
        display[showIndex] = { side: 'receive', amount: Math.abs(adjustedShowSigned) };
      } else {
        display[showIndex] = { side: 'none', amount: 0 };
      }
      // recompute totals for display
      totalPays = 0; totalReceives = 0;
      for (let i=0;i<n;i++){
        if (display[i].side === 'pay') totalPays += display[i].amount;
        else if (display[i].side === 'receive') totalReceives += display[i].amount;
      }
      // show adjustment note
      adjustNote.style.display = 'block';
      diff = totalPays - totalReceives; // should be 0 now (or extremely small)
    } else {
      adjustNote.style.display = 'none';
    }

    // Fill results into the table
    for (let i=0;i<n;i++){
      const cell = $('res-' + i);
      if (!cell) continue;
      const d = display[i];
      if (d.side === 'pay') cell.innerHTML = '<span class="result-pay">Pay ' + d.amount + '</span>';
      else if (d.side === 'receive') cell.innerHTML = '<span class="result-rec">Receive ' + d.amount + '</span>';
      else cell.textContent = '0';
    }

    // Update summary
    sumGharEl.textContent = totalGhar;
    sumPaysEl.textContent = totalPays;
    sumRecEl.textContent = totalReceives;
    balancedEl.textContent = (totalPays === totalReceives) ? 'Yes' : 'No';
    summaryEl.style.display = 'flex';
  }

  // --- CSV export (exports displayed amounts after any adjustment) ---
  function exportCSV(){
    calculate(); // ensure results are displayed & balanced
    let csv = 'Name,GHAR,Points,Show,Result\n';
    players.forEach((p, i) => {
      const resEl = $('res-' + i);
      const resText = resEl ? resEl.textContent.trim() : '';
      csv += `"${String(p.name).replace(/"/g,'""')}",${toInt(p.ghar)},${toInt(p.points)},${p.show ? 'Yes' : 'No'},"${resText.replace(/"/g,'""')}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sarara_results.csv'; document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 600);
  }

  // --- Add / Delete ---
  function addPlayer(){
    if (players.length >= MAX_PLAYERS) return;
    const idx = players.length;
    const name = defaultNames[idx] || ('Player' + (idx+1));
    players.push({ name, ghar:0, points:0, show:false });
    render();
  }
  function delPlayer(){
    if (players.length <= MIN_PLAYERS) return;
    // if deleting the show player, pick a new show index (first player)
    const showIdx = players.findIndex(p => p.show);
    players.pop();
    if (showIdx >= players.length){ // show was last and deleted
      players.forEach((p,i)=> p.show = (i === 0));
    }
    render();
  }

  // --- Wire events ---
  addBtn.addEventListener('click', addPlayer);
  delBtn.addEventListener('click', delPlayer);
  calcBtn.addEventListener('click', calculate);
  exportBtn.addEventListener('click', exportCSV);

  // --- Init with default names (all GHAR & Points = 0) ---
  players = defaultNames.map((n,i)=>({ name:n, ghar:0, points:0, show: i === 0 }));
  // ensure at least MIN_PLAYERS
  while (players.length < MIN_PLAYERS) players.push({ name:'Player' + (players.length+1), ghar:0, points:0, show:false });

  render();

  // Expose for debugging in console if wanted
  window.SARARA_APP = { players, calculate, render };

})();
</script>
</body>
</html>
