export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const date = value => value ? new Date(`${value.length === 10 ? `${value}T12:00:00` : value}`).toLocaleDateString('en', {month:'short',day:'numeric',year:'numeric'}) : '—';
export const badge = value => `<span class="badge ${String(value).toLowerCase().replace(/[^a-z]+/g,'-')}">${esc(value)}</span>`;
export const button = (label,action,id='',kind='subtle') => `<button type="button" class="button ${kind}" data-action="${esc(action)}" data-id="${esc(id)}">${esc(label)}</button>`;
export const empty = message => `<div class="empty"><span aria-hidden="true">☘</span><h3>Nothing here yet</h3><p>${esc(message)}</p></div>`;
export const section = (title,body,action='') => `<section class="panel"><div class="panel-head"><h2>${esc(title)}</h2>${action}</div>${body}</section>`;
export const field = (label,name,value='',type='text',extra='') => `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
export const select = (label,name,options,value='',extra='') => `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}" ${extra}>${options.map(option=>{const item=typeof option==='object'?option:{value:option,label:option};return `<option value="${esc(item.value)}" ${item.value===value?'selected':''}>${esc(item.label)}</option>`;}).join('')}</select></label>`;
export const textarea = (label,name,value='',extra='') => `<label class="field"><span>${esc(label)}</span><textarea name="${esc(name)}" ${extra}>${esc(value)}</textarea></label>`;
export const check = (label,name,checked=false) => `<label class="check"><input type="checkbox" name="${esc(name)}" ${checked?'checked':''}><span>${esc(label)}</span></label>`;
export function table(headers,rows,filters=[]) {
  const filterUI=filters.map(f=>`<label class="field compact"><span>${esc(f.label)}</span><select data-table-filter="${esc(f.key)}"><option value="">All</option>${f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>`).join('');
  return `<div class="table-tools"><label class="search"><span class="sr-only">Search table</span><input data-table-search type="search" placeholder="Search records…" aria-label="Search records"></label>${filterUI}</div><div class="table-scroll"><table><thead><tr>${headers.map((h,i)=>`<th scope="col"><button type="button" data-sort="${i}" aria-label="Sort by ${esc(h)}">${esc(h)} <span aria-hidden="true">↕</span></button></th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div><p class="table-empty" hidden>No records match these filters. Try another search or filter.</p><div class="table-bottom"><p data-table-count></p><div class="pager"><button type="button" data-page-step="-1" aria-label="Previous page">←</button><span data-page-label></span><button type="button" data-page-step="1" aria-label="Next page">→</button></div></div>`;
}
export const row = (cells,attrs={}) => `<tr ${Object.entries(attrs).map(([k,v])=>`data-${esc(k)}="${esc(v)}"`).join(' ')}>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
export function renderTable(root=document) {
  const panels=[...(root.matches?.('.panel:has(table)')?[root]:[]),...root.querySelectorAll('.panel:has(table)')];
  panels.forEach(panel=>{
    const rows=[...panel.querySelectorAll('tbody tr')];
    const query=(panel.querySelector('[data-table-search]')?.value||'').toLowerCase();
    const filters=[...panel.querySelectorAll('[data-table-filter]')];
    const matched=rows.filter(r=>r.textContent.toLowerCase().includes(query)&&filters.every(f=>!f.value||r.dataset[f.dataset.tableFilter]===f.value));
    const page=Math.max(0,Math.min(Number(panel.dataset.page||0),Math.max(0,Math.ceil(matched.length/8)-1)));
    panel.dataset.page=page;
    rows.forEach(r=>r.hidden=!matched.includes(r)||matched.indexOf(r)<page*8||matched.indexOf(r)>=(page+1)*8);
    panel.querySelector('[data-table-count]').textContent=`${matched.length} record${matched.length===1?'':'s'}`;
    panel.querySelector('.table-empty').hidden=matched.length>0;
    panel.querySelector('[data-page-label]').textContent=`${matched.length? page+1:0} / ${Math.max(1,Math.ceil(matched.length/8))}`;
    panel.querySelector('[data-page-step="-1"]').disabled=page===0;
    panel.querySelector('[data-page-step="1"]').disabled=page>=(Math.ceil(matched.length/8)-1);
  });
}
export function sortTable(button) {
  const table=button.closest('table'), body=table.tBodies[0], index=Number(button.dataset.sort), direction=button.dataset.direction==='asc'?'desc':'asc';
  button.dataset.direction=direction;
  [...body.rows].sort((a,b)=>{
    const x=a.cells[index].textContent.trim(),y=b.cells[index].textContent.trim();
    const dates=/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(x)&&/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/.test(y);
    const result=dates?Date.parse(x)-Date.parse(y):/^\d+(?:\.\d+)?$/.test(x)&&/^\d+(?:\.\d+)?$/.test(y)?Number(x)-Number(y):x.localeCompare(y,undefined,{numeric:true});
    return result*(direction==='asc'?1:-1);
  }).forEach(r=>body.append(r));
  renderTable(button.closest('.panel'));
}
export function openDialog(title, body, onSubmit, submitLabel='Save', keepOpen=false) {
  const dialog=document.getElementById('editor-dialog'),form=document.getElementById('editor-form');
  if(dialog.open)dialog.close();
  document.getElementById('dialog-title').textContent=title;
  document.getElementById('dialog-body').innerHTML=body;
  document.getElementById('dialog-submit').textContent=submitLabel;
  const handleSubmit=event=>{event.preventDefault();if(!form.reportValidity())return;const result=onSubmit(new FormData(form));if(!keepOpen&&result!==false&&form.onsubmit===handleSubmit&&dialog.open)dialog.close();};
  form.onsubmit=handleSubmit;
  dialog.showModal();
  dialog.querySelector('input,select,textarea')?.focus();
}
export function confirmAction(message, yes) {
  openDialog('Please confirm',`<p>${esc(message)}</p>`,()=>yes(),'Confirm');
}
export function toast(message) {
  const el=document.getElementById('toast'); el.textContent=message;el.hidden=false;
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.hidden=true,4200);
}
export const contentHeader = (eyebrow,title,description,action='') => `<div class="content-header"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p>${esc(description)}</p></div>${action}</div>`;
export function bars(items, max=Math.max(1,...items.map(item=>item.value))) {
  return `<div class="bars">${items.map(item=>`<div class="bar-row"><span>${esc(item.label)}</span><div class="bar-track"><i style="width:${Math.max(2,Math.round(item.value/max*100))}%"></i></div><strong>${esc(item.value)}</strong></div>`).join('')}</div>`;
}
