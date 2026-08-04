// Simple multi-step wizard controller.
// Expects: a form with elements matching [data-step="N"] (N starting at 1),
// a progress bar container with [data-wizard-progress], and a step label
// element with [data-wizard-label]. Optional per-step titles come from the
// data-step-title attribute on each [data-step] element.
(function () {
  function initWizard(form) {
    const steps = Array.from(form.querySelectorAll('[data-step]'));
    const total = steps.length;
    let current = 0;

    const progress = form.querySelector('[data-wizard-progress]');
    const label = form.querySelector('[data-wizard-label]');
    const backBtn = form.querySelector('[data-wizard-back]');
    const nextBtn = form.querySelector('[data-wizard-next]');
    const submitBtn = form.querySelector('[data-wizard-submit]');

    if (progress) {
      steps.forEach(() => {
        const dot = document.createElement('div');
        dot.className = 'step-dot';
        progress.appendChild(dot);
      });
    }

    function render() {
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === current);
      });
      if (progress) {
        Array.from(progress.children).forEach((dot, i) => {
          dot.classList.toggle('active', i <= current);
        });
      }
      if (label) {
        const title = steps[current].getAttribute('data-step-title') || '';
        label.textContent = 'Step ' + (current + 1) + ' of ' + total + (title ? ' — ' + title : '');
      }
      if (backBtn) backBtn.style.visibility = current === 0 ? 'hidden' : 'visible';
      if (nextBtn) nextBtn.style.display = current === total - 1 ? 'none' : 'inline-flex';
      if (submitBtn) submitBtn.style.display = current === total - 1 ? 'inline-flex' : 'none';
      steps[current].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function stepIsValid() {
      const fields = steps[current].querySelectorAll('input, select, textarea');
      for (const field of fields) {
        if (!field.checkValidity()) {
          field.reportValidity();
          return false;
        }
      }
      return true;
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (!stepIsValid()) return;
        if (current < total - 1) {
          current++;
          render();
        }
      });
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (current > 0) {
          current--;
          render();
        }
      });
    }

    render();
  }

  document.querySelectorAll('form[data-wizard]').forEach(initWizard);
})();
