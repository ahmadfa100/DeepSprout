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
const planDetails = {
  monthly: {
    title: 'Plus Monthly',
    price: '$3.99 per month',
    description: 'Includes extra sessions, advanced depth paths, AI-personalized content within a monthly quota, advanced insights, and garden customization.'
  },
  annual: {
    title: 'Plus Annual',
    price: '$29.99 per year · about $2.50/month',
    description: 'The same Plus features at the annual price shown in the supplied design. Annual billing offers the best value for long-term use.'
  }
};
document.querySelectorAll('[data-plan]').forEach(button => button.addEventListener('click', () => {
  const plan = planDetails[button.dataset.plan];
  dialogTitle.textContent = plan.title;
  dialogPrice.textContent = plan.price;
  dialogDescription.textContent = plan.description;
  planDialog.showModal();
}));
planDialog.addEventListener('click', event => { if (event.target === planDialog) planDialog.close(); });
