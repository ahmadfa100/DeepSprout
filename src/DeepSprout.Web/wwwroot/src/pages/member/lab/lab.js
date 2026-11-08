/** Optional Lab assessments and preserved historical attempts. */
(()=>{
 if(window.DeepSproutPersonal?.denied()){try{window.DeepSproutPersonal.requireAccess();}catch{}return;}
 const Account=window.DeepSproutAccount,INSTRUMENTS=window.DeepSproutAssessments,$=id=>document.getElementById(id),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=Account.format;
 const dialog=$('detail-dialog');const link=(url,label,quiet=false)=>`<a class="btn ${quiet?'btn-ghost':'btn-primary'}" href="${esc(url)}">${esc(label)}</a>`;
 Account.load().then(account=>{
  const due=account.checkInWindow(),instruments=account.checkIns(),next=instruments.find(i=>account.checkInMode(i.id).mode==='official');
  $('lab-actions').innerHTML=(next?link(`assessment.html?test=${next.id}`,`Optional: ${next.title}`):'<span class="pill neutral">No reassessment scheduled</span>')+link('../insights/insights.html#checkins','Results in Insights',true);
  const box=$('ci-window');box.dataset.state=due.state;const title=(label,heading)=>`<p class="eyebrow">${esc(label)}</p><h2 id="ci-window-title">${esc(heading)}</h2>`;
  if(due.state==='optional')box.innerHTML=`<div>${title('Optional Lab','Explore a separate assessment')}<p>These tasks are optional. They do not determine your Journey Level or block your Recovery Plan. No weekly reassessment is scheduled.</p></div>${next?link(`assessment.html?test=${next.id}`,'Try '+next.title):''}`;
  const timeline=$('ci-timeline');
  timeline.innerHTML='<li class="ci-step"><b>Your choice</b><span>Take any available first official assessment, or use a practice round. Results stay separate from your setup answers and Journey Level.</span></li><li class="ci-step"><b>History</b><span>Previous baseline and reassessment attempts remain available below. No future official schedule is assumed.</span></li>';
  $('lab-grid').innerHTML=instruments.map(entry=>{
   const allowed=account.checkInMode(entry.id),instrument=INSTRUMENTS[entry.id],history=account.assessmentHistory(entry.id),latest=entry.latest;
   const result=latest?`<p>Latest valid result: <strong>${esc(latest.score)}${entry.scaleCompatible?esc(entry.scale.unit):''}</strong> · ${esc(fmt.date(latest.on,{year:true}))}</p>`:'<p>Not validly measured yet.</p>';
   const comparison=entry.comparison?`<p>Compatible comparison: ${esc(entry.comparison.from.score)} → ${esc(entry.comparison.to.score)}${esc(entry.scale.unit)}. Repetition can improve performance through practice alone.</p>`:`<p class="card-note">${esc(entry.comparisonReason)}</p>`;
   return `<article class="card lab-card" data-assessment="${esc(entry.id)}"><div class="card-head"><span class="badge-icon ${instrument.tone}"><svg><use href="#${instrument.icon}"/></svg></span><div><h3>${esc(entry.title)}</h3><p class="lab-kind">${esc(entry.kind)}</p></div></div><div class="lab-meta"><span class="evidence">${esc(entry.provenance.label)}</span><span class="pill neutral">~${entry.minutes} min</span></div><div class="lab-result">${result}${comparison}</div><div class="lab-card-actions">${allowed.mode==='official'?link(`assessment.html?test=${entry.id}`,history.some(a=>a.status==='Invalid')?'Retry optional assessment':'Take optional assessment'):''}${link(`assessment.html?test=${entry.id}&mode=practice`,'Practice round',true)}<button type="button" class="btn btn-quiet" data-history="${esc(entry.id)}">Attempt history (${history.length})</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-history]').forEach(button=>button.addEventListener('click',()=>{
   const id=button.dataset.history,history=account.assessmentHistory(id);$('detail-title').textContent=account.definition(id).title+' · original attempts';$('detail-eyebrow').textContent='Official history and unfinished runs';
   $('detail-body').innerHTML=history.length?history.map(a=>`<article class="lab-attempt" data-attempt-id="${esc(a.id)}"><h3>${esc(a.status||'Legacy record')} · ${esc(a.kind||'Legacy official')}</h3><p>${esc(a.id)} · ${esc(a.personId||'Original seeded story')}<br>${esc(a.startedAt||a.on||'Original date unavailable')} → ${esc(a.completedAt||a.endedAt||'Unfinished')}</p><p>Instrument: ${esc(a.version||'Not recorded')} · protocol: ${esc(a.protocolVersion||'Not recorded')} · scoring: ${esc(a.scoringVersion||'Not recorded')}<br>Variant: ${esc(a.variant||'Not recorded')} · difficulty: ${esc(a.difficulty||'Not recorded')} · conditions: ${esc(a.conditions||'Not recorded')}<br>Recorded context: ${esc(a.measurementContext?JSON.stringify(a.measurementContext):'Not recorded')}</p>${a.measurementContext?.presentation==='demo-scenario'||a.details?.some(d=>d.value==='Synthetic presentation scenario')?'<p><strong>Demo scenario · synthetic result created by the presentation builder.</strong></p>':''}<p>${esc(a.validity?.reason||a.reason||'Historical result; unrecorded protocol details are not inferred.')}</p>${a.valid===true?`<p>Result: ${esc(a.score)}</p>`:''}</article>`).join(''):'<p>No attempts yet. An unknown result is not zero.</p>';dialog.showModal();
  }));
  if(Account.devMode()){
   const dev=$('personal-lab-controls'),clock=account.personalClock();dev.hidden=false;
   $('personal-lab-source').textContent=`${clock.source} · ${clock.at} · ${clock.timezone}. Original seed as-of: ${clock.seedAsOf||'none'}. Operational Provider/Institution clocks are separate.`;
   dev.querySelector('[name=day]').value=account.todayKey;
   dev.querySelector('#personal-clock-form').addEventListener('submit',e=>{e.preventDefault();try{account.setDemoClock(new FormData(e.target).get('day')+'T12:00:00+03:00');location.reload();}catch(error){$('lab-demo-error').textContent=error.message;}});
  }
 }).catch(error=>{$('ci-window').textContent='Your Lab record could not load. '+error.message;});
 dialog.querySelectorAll('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>dialog.close()));dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
})();
