/* ===== Zoom Controls ===== */
var INITIAL_ZOOM = 1.4;
function applyZoom(wrap, level) {
  var target = wrap.querySelector('.mermaid');
  target.dataset.zoom = level;
  target.style.transform = 'scale(' + level + ')';
  var svg = target.querySelector('svg');
  if (svg) { var rect = svg.getBoundingClientRect(); target.style.width = (rect.width / level * level) + 'px'; target.style.height = (rect.height / level * level) + 'px'; }
  var indicator = wrap.querySelector('.zoom-level');
  if (indicator) indicator.textContent = Math.round(level * 100) + '%';
}
function zoomDiagram(btn, factor) { var wrap = btn.closest('.mermaid-wrap'); var target = wrap.querySelector('.mermaid'); var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM); applyZoom(wrap, Math.min(Math.max(current * factor, 0.3), 30)); }
function resetZoom(btn) { applyZoom(btn.closest('.mermaid-wrap'), INITIAL_ZOOM); }
function toggleFullscreen(btn) { var wrap = btn.closest('.mermaid-wrap'); wrap.classList.toggle('is-fullscreen'); document.body.style.overflow = wrap.classList.contains('is-fullscreen') ? 'hidden' : ''; }
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { var fs = document.querySelector('.mermaid-wrap.is-fullscreen'); if (fs) { fs.classList.remove('is-fullscreen'); document.body.style.overflow = ''; } } });

document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  wrap.addEventListener('wheel', function(e) { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); var target = wrap.querySelector('.mermaid'); var current = parseFloat(target.dataset.zoom || INITIAL_ZOOM); var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15; applyZoom(wrap, Math.min(Math.max(current * factor, 0.3), 30)); }, { passive: false });
  var startX, startY, scrollLeft, scrollTop;
  wrap.addEventListener('mousedown', function(e) { if (e.target.closest('.zoom-controls')) return; wrap.classList.add('is-panning'); startX = e.pageX - wrap.offsetLeft; startY = e.pageY - wrap.offsetTop; scrollLeft = wrap.scrollLeft; scrollTop = wrap.scrollTop; });
  wrap.addEventListener('mousemove', function(e) { if (!wrap.classList.contains('is-panning')) return; e.preventDefault(); wrap.scrollLeft = scrollLeft - (e.pageX - wrap.offsetLeft - startX); wrap.scrollTop = scrollTop - (e.pageY - wrap.offsetTop - startY); });
  document.addEventListener('mouseup', function() { wrap.classList.remove('is-panning'); });
});
document.addEventListener('keydown', function(e) { if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return; var wrap = document.querySelector('.mermaid-wrap:hover'); if (!wrap) return; if (e.key === '+' || e.key === '=') { e.preventDefault(); var t = wrap.querySelector('.mermaid'); applyZoom(wrap, Math.min(parseFloat(t.dataset.zoom || INITIAL_ZOOM) * 1.3, 30)); } else if (e.key === '-') { e.preventDefault(); var t = wrap.querySelector('.mermaid'); applyZoom(wrap, Math.max(parseFloat(t.dataset.zoom || INITIAL_ZOOM) / 1.3, 0.3)); } });

/* ===== Initial Zoom: apply after Mermaid renders SVGs ===== */
document.querySelectorAll('.mermaid').forEach(function(el) {
  new MutationObserver(function(mutations, obs) {
    if (el.querySelector('svg')) {
      var wrap = el.closest('.mermaid-wrap');
      if (wrap) applyZoom(wrap, INITIAL_ZOOM);
      obs.disconnect();
    }
  }).observe(el, { childList: true });
});

/* ===== Scroll Spy ===== */
(function() {
  var toc = document.getElementById('toc'); var links = toc.querySelectorAll('a'); var sections = [];
  links.forEach(function(link) { var id = link.getAttribute('href').slice(1); var el = document.getElementById(id); if (el) sections.push({ id: id, el: el, link: link }); });
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) { links.forEach(function(l) { l.classList.remove('active'); }); var match = sections.find(function(s) { return s.el === entry.target; }); if (match) { match.link.classList.add('active'); if (window.innerWidth <= 1000) match.link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } }
    });
  }, { rootMargin: '-10% 0px -80% 0px' });
  sections.forEach(function(s) { observer.observe(s.el); });
  links.forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); var id = link.getAttribute('href').slice(1); var el = document.getElementById(id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); history.replaceState(null, '', '#' + id); } }); });
})();

/* ===== Section Feedback System ===== */
(function() {
  var STORAGE_KEY = 'vp-feedback-' + location.pathname;
  var feedback = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  var sections = document.querySelectorAll('section[id]');
  var bar = document.getElementById('feedbackBar');
  var summaryEl = document.getElementById('feedbackSummary');

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  sections.forEach(function(sec) {
    sec.style.position = 'relative';

    var trigger = el('button', 've-feedback-trigger', '\u270E');
    trigger.title = 'Add feedback';
    sec.appendChild(trigger);

    var form = el('div', 've-feedback-form');
    var textarea = el('textarea');
    textarea.placeholder = 'Write feedback for this section...';
    form.appendChild(textarea);

    var actions = el('div', 've-feedback-actions');
    var btnOk = el('button', 've-feedback-btn ve-feedback-btn--ok', 'OK');
    btnOk.dataset.action = 'ok';
    var btnSave = el('button', 've-feedback-btn', 'Save');
    btnSave.dataset.action = 'save';
    var btnClear = el('button', 've-feedback-btn', 'Clear');
    btnClear.dataset.action = 'clear';
    actions.appendChild(btnOk);
    actions.appendChild(btnSave);
    actions.appendChild(btnClear);
    form.appendChild(actions);

    var heading = sec.querySelector('h2') || sec.firstElementChild;
    if (heading && heading.nextSibling) {
      heading.parentNode.insertBefore(form, heading.nextSibling);
    } else {
      sec.insertBefore(form, sec.firstChild);
    }

    if (feedback[sec.id]) {
      textarea.value = feedback[sec.id].text || '';
      if (feedback[sec.id].status === 'ok') trigger.classList.add('marked-ok');
      if (feedback[sec.id].text) trigger.classList.add('has-feedback');
    }

    trigger.addEventListener('click', function() {
      form.classList.toggle('is-open');
      if (form.classList.contains('is-open')) textarea.focus();
    });

    textarea.addEventListener('input', function() {
      save(sec.id, textarea.value, feedback[sec.id] ? feedback[sec.id].status : '');
      updateTrigger(trigger, textarea.value, feedback[sec.id] ? feedback[sec.id].status : '');
      updateBar();
    });

    [btnOk, btnSave, btnClear].forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.action;
        if (action === 'ok') {
          save(sec.id, textarea.value, 'ok');
          trigger.classList.add('marked-ok');
          trigger.classList.remove('has-feedback');
          form.classList.remove('is-open');
        } else if (action === 'save') {
          save(sec.id, textarea.value, textarea.value ? 'issue' : '');
          updateTrigger(trigger, textarea.value, textarea.value ? 'issue' : '');
          form.classList.remove('is-open');
        } else if (action === 'clear') {
          textarea.value = '';
          delete feedback[sec.id];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
          trigger.classList.remove('has-feedback', 'marked-ok');
          form.classList.remove('is-open');
        }
        updateBar();
      });
    });
  });

  function save(id, text, status) {
    feedback[id] = { text: text, status: status, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
  }

  function updateTrigger(trigger, text, status) {
    trigger.classList.toggle('has-feedback', !!text);
    trigger.classList.toggle('marked-ok', status === 'ok');
  }

  function updateBar() {
    var keys = Object.keys(feedback);
    var issues = keys.filter(function(k) { return feedback[k].status === 'issue'; }).length;
    var oks = keys.filter(function(k) { return feedback[k].status === 'ok'; }).length;
    var total = keys.length;
    if (total > 0) {
      bar.classList.add('is-visible');
      summaryEl.textContent = total + ' reviewed | ' + oks + ' OK | ' + issues + ' issues';
    } else {
      bar.classList.remove('is-visible');
    }
  }

  window._veFeedback = {
    export: function() {
      var data = {
        report_path: location.pathname,
        report_title: document.title,
        exported_at: new Date().toISOString(),
        sections: []
      };
      sections.forEach(function(sec) {
        var heading = sec.querySelector('h2');
        var entry = feedback[sec.id] || { text: '', status: '', timestamp: '' };
        data.sections.push({
          id: sec.id,
          title: heading ? heading.textContent.trim() : sec.id,
          status: entry.status || 'not-reviewed',
          feedback: entry.text || '',
          timestamp: entry.timestamp || ''
        });
      });
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'feedback.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }
  };

  updateBar();
})();
