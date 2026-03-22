/* ===== Zoom Controls ===== */
var INITIAL_ZOOM = 1.0;

function applyZoom(wrap, level) {
  var svg = wrap.querySelector('svg');
  if (!svg) return;
  /* Store original SVG dimensions once from viewBox */
  if (!wrap.dataset.origW) {
    var vb = svg.viewBox.baseVal;
    var w = (vb && vb.width) || svg.clientWidth || 800;
    var h = (vb && vb.height) || svg.clientHeight || 400;
    wrap.dataset.origW = w;
    wrap.dataset.origH = h;
  }
  wrap.dataset.zoom = level;
  var origW = parseFloat(wrap.dataset.origW);
  var origH = parseFloat(wrap.dataset.origH);
  svg.style.width = Math.round(origW * level) + 'px';
  svg.style.height = Math.round(origH * level) + 'px';
  svg.style.maxWidth = 'none';
  svg.style.minWidth = 'unset';
  var indicator = wrap.querySelector('.zoom-level');
  if (indicator) indicator.textContent = Math.round(level * 100) + '%';
}

function zoomDiagram(btn, factor) {
  var wrap = btn.closest('.mermaid-wrap');
  var current = parseFloat(wrap.dataset.zoom || INITIAL_ZOOM);
  var next = Math.min(Math.max(current * factor, 0.3), 20);
  applyZoom(wrap, next);
}

function resetZoom(btn) { applyZoom(btn.closest('.mermaid-wrap'), INITIAL_ZOOM); }

function toggleFullscreen(btn) {
  var wrap = btn.closest('.mermaid-wrap');
  wrap.classList.toggle('is-fullscreen');
  document.body.style.overflow = wrap.classList.contains('is-fullscreen') ? 'hidden' : '';
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    var fs = document.querySelector('.mermaid-wrap.is-fullscreen');
    if (fs) { fs.classList.remove('is-fullscreen'); document.body.style.overflow = ''; }
  }
});

/* ===== Wheel Zoom (Ctrl/Cmd + scroll) ===== */
document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  wrap.addEventListener('wheel', function(e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    var current = parseFloat(wrap.dataset.zoom || INITIAL_ZOOM);
    var factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    applyZoom(wrap, Math.min(Math.max(current * factor, 0.3), 20));
  }, { passive: false });
});

/* ===== Mouse Drag Panning ===== */
document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  wrap.addEventListener('mousedown', function(e) {
    if (e.target.closest('.zoom-controls')) return;
    wrap.classList.add('is-panning');
    wrap._startX = e.clientX;
    wrap._startY = e.clientY;
    wrap._scrollL = wrap.scrollLeft;
    wrap._scrollT = wrap.scrollTop;
  });
  wrap.addEventListener('mousemove', function(e) {
    if (!wrap.classList.contains('is-panning')) return;
    e.preventDefault();
    wrap.scrollLeft = wrap._scrollL - (e.clientX - wrap._startX);
    wrap.scrollTop = wrap._scrollT - (e.clientY - wrap._startY);
  });
  document.addEventListener('mouseup', function() { wrap.classList.remove('is-panning'); });
});

/* ===== Keyboard Zoom (+/-) ===== */
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  var wrap = document.querySelector('.mermaid-wrap:hover');
  if (!wrap) return;
  var current = parseFloat(wrap.dataset.zoom || INITIAL_ZOOM);
  if (e.key === '+' || e.key === '=') { e.preventDefault(); applyZoom(wrap, Math.min(current * 1.3, 20)); }
  else if (e.key === '-') { e.preventDefault(); applyZoom(wrap, Math.max(current / 1.3, 0.3)); }
});

/* ===== Touch Gestures: pinch-to-zoom + touch drag ===== */
document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  wrap.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
      wrap._pinchDist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      wrap._pinchZoom = parseFloat(wrap.dataset.zoom || INITIAL_ZOOM);
    } else if (e.touches.length === 1) {
      wrap._touchX = e.touches[0].pageX; wrap._touchY = e.touches[0].pageY;
      wrap._touchSL = wrap.scrollLeft; wrap._touchST = wrap.scrollTop;
    }
  }, { passive: true });
  wrap.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2 && wrap._pinchDist) {
      e.preventDefault();
      var dist = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
      applyZoom(wrap, Math.min(Math.max(wrap._pinchZoom * (dist / wrap._pinchDist), 0.3), 20));
    } else if (e.touches.length === 1 && wrap._touchX !== undefined) {
      wrap.scrollLeft = wrap._touchSL - (e.touches[0].pageX - wrap._touchX);
      wrap.scrollTop = wrap._touchST - (e.touches[0].pageY - wrap._touchY);
    }
  }, { passive: false });
  wrap.addEventListener('touchend', function() { delete wrap._pinchDist; delete wrap._pinchZoom; delete wrap._touchX; delete wrap._touchY; });
});

/* ===== PNG Export ===== */
function exportDiagramPng(btn) {
  var wrap = btn.closest('.mermaid-wrap');
  var svgEl = wrap.querySelector('svg');
  if (!svgEl) return;
  var scale = 4;
  var clone = svgEl.cloneNode(true);
  var w = svgEl.viewBox.baseVal.width || svgEl.clientWidth;
  var h = svgEl.viewBox.baseVal.height || svgEl.clientHeight;
  clone.setAttribute('width', w); clone.setAttribute('height', h);
  var svgData = new XMLSerializer().serializeToString(clone);
  var canvas = document.createElement('canvas');
  canvas.width = w * scale; canvas.height = h * scale;
  var ctx = canvas.getContext('2d');
  var img = new Image();
  img.onload = function() {
    ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#0d1117' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, h);
    var a = document.createElement('a');
    a.download = (document.title || 'diagram').replace(/[^a-zA-Z0-9\-_ ]/g, '') + '.png';
    a.href = canvas.toDataURL('image/png', 1.0);
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

/* ===== Zoom Button Delegation ===== */
document.querySelectorAll('.zoom-controls').forEach(function(controls) {
  controls.addEventListener('click', function(e) {
    var btn = e.target.closest('button');
    if (!btn || btn.classList.contains('export-png')) return;
    if (btn.classList.contains('zoom-in') || btn.textContent.trim() === '+') zoomDiagram(btn, 1.3);
    else if (btn.classList.contains('zoom-out') || btn.textContent.trim() === '\u2212' || btn.textContent.trim() === '-') zoomDiagram(btn, 1 / 1.3);
    else if (btn.classList.contains('zoom-reset') || btn.title === 'Reset') resetZoom(btn);
    else if (btn.title === 'Fullscreen' || btn.textContent.trim() === '\u26F6') toggleFullscreen(btn);
  });
  var exportBtn = document.createElement('button');
  exportBtn.className = 'export-png';
  exportBtn.textContent = '\u2913';
  exportBtn.title = 'Export PNG';
  exportBtn.onclick = function() { exportDiagramPng(exportBtn); };
  controls.appendChild(exportBtn);
});

/* ===== Mermaid ViewBox Correction ===== */
function fixMermaidViewBox(svg) {
  try {
    var vb = svg.viewBox.baseVal;
    if (!vb || vb.width === 0) return;
    var bbox = svg.getBBox();
    if (bbox.width > 0 && bbox.height > 0) {
      var pad = Math.max(bbox.width, bbox.height) * 0.04;
      var newW = bbox.width + 2 * pad;
      var newH = bbox.height + 2 * pad;
      if (newW < vb.width * 0.85 || newH < vb.height * 0.85) {
        svg.setAttribute('viewBox',
          (bbox.x - pad) + ' ' + (bbox.y - pad) + ' ' + newW + ' ' + newH);
      }
    }
  } catch(e) { /* getBBox can throw if SVG is not yet in DOM */ }
}

/* ===== Initial Zoom: apply after Mermaid renders SVGs ===== */
document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
  new MutationObserver(function(mutations, obs) {
    var svg = wrap.querySelector('svg');
    if (svg) {
      obs.disconnect();
      fixMermaidViewBox(svg);
      applyZoom(wrap, INITIAL_ZOOM);
    }
  }).observe(wrap, { childList: true, subtree: true });
});
/* Fallback: run after Mermaid rendering completes */
setTimeout(function() {
  document.querySelectorAll('.mermaid-wrap').forEach(function(wrap) {
    var svg = wrap.querySelector('svg');
    if (svg) {
      fixMermaidViewBox(svg);
      applyZoom(wrap, INITIAL_ZOOM);
    }
  });
}, 1500);

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
    var btnSave = el('button', 've-feedback-btn ve-feedback-btn--save', 'Save');
    btnSave.dataset.action = 'save';
    btnSave.title = 'Save feedback for this section';
    var btnClear = el('button', 've-feedback-btn ve-feedback-btn--clear', 'Clear');
    btnClear.dataset.action = 'clear';
    btnClear.title = 'Remove feedback for this section';
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
      if (feedback[sec.id].text) trigger.classList.add('has-feedback');
    }

    trigger.addEventListener('click', function() {
      form.classList.toggle('is-open');
      if (form.classList.contains('is-open')) textarea.focus();
    });

    textarea.addEventListener('input', function() {
      save(sec.id, textarea.value, textarea.value ? 'issue' : '');
      updateTrigger(trigger, textarea.value);
      updateBar();
    });

    [btnSave, btnClear].forEach(function(btn) {
      btn.addEventListener('click', function() {
        var action = btn.dataset.action;
        if (action === 'save') {
          save(sec.id, textarea.value, textarea.value ? 'issue' : '');
          updateTrigger(trigger, textarea.value);
          form.classList.remove('is-open');
        } else if (action === 'clear') {
          textarea.value = '';
          delete feedback[sec.id];
          localStorage.setItem(STORAGE_KEY, JSON.stringify(feedback));
          trigger.classList.remove('has-feedback');
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

  function updateTrigger(trigger, text) {
    trigger.classList.toggle('has-feedback', !!text);
  }

  function updateBar() {
    var keys = Object.keys(feedback);
    var issues = keys.filter(function(k) { return feedback[k].status === 'issue'; }).length;
    if (issues > 0) {
      bar.classList.add('is-visible');
      summaryEl.textContent = issues + ' issue' + (issues > 1 ? 's' : '');
    } else {
      bar.classList.remove('is-visible');
    }
  }

  function buildExportData() {
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
    return data;
  }

  window._veFeedback = {
    export: function() {
      var data = buildExportData();
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'feedback.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    },
    copyToClipboard: function() {
      var data = buildExportData();
      var text = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(text).then(function() {
        var btn = document.querySelector('.ve-feedback-bar__copy');
        if (btn) {
          var orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function() { btn.textContent = orig; }, 1500);
        }
      });
    }
  };

  updateBar();
})();
