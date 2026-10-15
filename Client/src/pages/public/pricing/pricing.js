document.documentElement.classList.add('js');

const reveals = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: .08, rootMargin: '0px 0px -25px 0px' });
  reveals.forEach(item => observer.observe(item));
} else {
  reveals.forEach(item => item.classList.add('visible'));
}

const comparison = document.getElementById('compare');
const differencesButton = document.getElementById('differences-toggle');
differencesButton.addEventListener('click', () => {
  const showDifferences = differencesButton.getAttribute('aria-pressed') !== 'true';
  differencesButton.setAttribute('aria-pressed', String(showDifferences));
  differencesButton.textContent = showDifferences ? 'Show all features' : 'Show differences only';
  comparison.classList.toggle('differences-only', showDifferences);
});

const planDialog = document.getElementById('plan-dialog');
const dialogTitle = document.getElementById('dialog-title');
const dialogPrice = document.getElementById('dialog-price');
const dialogDescription = document.getElementById('dialog-description');
const catalogue = import('../../../js/config/subscriptions.js');
catalogue.then(({planById,money})=>{
  document.querySelectorAll('[data-plan]').forEach(button=>{
    const plan=planById(button.dataset.plan);
    const card=button.closest('.plan-card');
    card.querySelector('.price strong').textContent=money(plan.amount);
    if(plan.interval==='year')card.querySelector('.annual-note').textContent=`About ${money(Math.round(plan.amount/12))}/mo, billed annually`;
    button.addEventListener('click',()=>{
      dialogTitle.textContent=plan.name;
      dialogPrice.textContent=`${money(plan.amount)} per ${plan.interval}`;
      dialogDescription.textContent='Plus includes extra sessions, advanced depth paths, advanced insights, and garden customisation. These are proposed features in this preview.';
      planDialog.showModal();
    });
  });
});
planDialog.addEventListener('click', event => { if (event.target === planDialog) planDialog.close(); });
