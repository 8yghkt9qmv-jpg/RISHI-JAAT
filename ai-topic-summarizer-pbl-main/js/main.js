(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const STORAGE = {
    apiKey: 'edusynth.gemini_api_key',
    remember: 'edusynth.remember_key'
  };

  const MODEL = 'gemini-1.5-flash';

  const storage = (() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  })();

  function storageGet(key) {
    try {
      return storage ? storage.getItem(key) : null;
    } catch {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      if (storage) storage.setItem(key, value);
    } catch {
      // ignore
    }
  }

  function storageRemove(key) {
    try {
      if (storage) storage.removeItem(key);
    } catch {
      // ignore
    }
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function setStatus(el, msg) {
    if (!el) return;
    el.textContent = msg || '';
  }

  function setOutputText(el, text) {
    if (!el) return;
    el.textContent = text || '';
    el.classList.remove('muted');
  }

  function setOutputList(el, items) {
    if (!el) return;
    el.innerHTML = '';
    (items || []).forEach((item) => {
      const li = document.createElement('li');
      li.textContent = String(item);
      el.appendChild(li);
    });
    el.classList.remove('muted');
  }

  function safeTrim(s) {
    return String(s || '').trim();
  }

  function extractJsonObject(text) {
    const t = String(text || '');
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return t.slice(start, end + 1);
  }

  async function copyText(text) {
    const value = String(text || '');
    if (!value) return false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }

    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  }

  function buildOfflineDemo(topic, level) {
    const t = safeTrim(topic) || 'the topic';
    const tone =
      level === 'school'
        ? 'Use simple words and a familiar analogy.'
        : level === 'exam'
          ? 'Keep it tight and revision-friendly.'
          : 'Be clear and academic, but not too technical.';

    return {
      summary: `${t} is explained here in a short, structured format to help you revise quickly.`,
      explanation:
        `This is an offline sample (no API key used). ${tone}\n\n` +
        `In practice, EduSynth AI would research ${t}, then rewrite it as easy notes: what it is, why it matters, and how it works, with key terms defined.`,
      keyPoints: [
        `Definition: what "${t}" refers to in a syllabus context`,
        'Core idea: the main mechanism or principle',
        'Why it matters: common applications or exam relevance',
        'Common mistakes: typical misconceptions students have',
        'Quick revision: 2-3 lines you can memorize'
      ],
      conclusion: `Use the key points as a checklist. If you add a Gemini API key, you can generate real notes for "${t}" instantly.`
    };
  }

  async function generateWithGemini({ topic, level, apiKey }) {
    const prompt =
      `You are an academic tutor for students.\n` +
      `Topic: ${topic}\n` +
      `Audience: ${level}\n\n` +
      `Return ONLY valid JSON with exactly these keys:\n` +
      `summary (string)\n` +
      `explanation (string)\n` +
      `keyPoints (array of strings)\n` +
      `conclusion (string)\n\n` +
      `Constraints:\n` +
      `- Keep summary 3-5 sentences.\n` +
      `- Explanation should be simple and structured with short paragraphs.\n` +
      `- keyPoints should be 6-10 bullets.\n` +
      `- conclusion should be 2-3 sentences.\n`;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 25000);

    try {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            topP: 0.9,
            maxOutputTokens: 700
          }
        })
      });

      const text = await res.text();
      if (!res.ok) {
        const err = new Error(`Gemini request failed (${res.status}).`);
        err.details = text;
        throw err;
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }

      const candidateText =
        payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') || text;

      const jsonText = extractJsonObject(candidateText);
      if (!jsonText) throw new Error('Model response did not contain JSON.');

      const data = JSON.parse(jsonText);
      const out = {
        summary: safeTrim(data?.summary),
        explanation: safeTrim(data?.explanation),
        keyPoints: Array.isArray(data?.keyPoints) ? data.keyPoints.map((s) => safeTrim(s)).filter(Boolean) : [],
        conclusion: safeTrim(data?.conclusion)
      };

      if (!out.summary || !out.explanation || !out.conclusion || out.keyPoints.length === 0) {
        throw new Error('Model JSON was missing required fields.');
      }

      return out;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function initNav() {
    const header = $('.site-header');
    const toggle = $('[data-nav-toggle]');
    if (!header || !toggle) return;

    const setOpen = (open) => {
      header.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };

    toggle.addEventListener('click', () => {
      const open = !header.classList.contains('is-open');
      setOpen(open);
    });

    $$('.site-nav a').forEach((a) => {
      a.addEventListener('click', () => setOpen(false));
    });

    document.addEventListener('click', (e) => {
      if (!header.classList.contains('is-open')) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('.site-header')) return;
      setOpen(false);
    });
  }

  function initReveal() {
    const els = $$('.reveal');
    if (els.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '60px 0px -10% 0px', threshold: 0.12 }
    );

    els.forEach((el) => io.observe(el));
  }

  function initToTop() {
    const btn = $('[data-to-top]');
    if (!btn) return;

    const onScroll = () => {
      btn.classList.toggle('is-visible', window.scrollY > 700);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function initTimer() {
    const timeEl = $('[data-timer-time]');
    const startBtn = $('[data-timer-start]');
    const stopBtn = $('[data-timer-stop]');
    const resetBtn = $('[data-timer-reset]');
    if (!timeEl || !startBtn || !stopBtn || !resetBtn) return;

    let running = false;
    let startedAt = 0;
    let accumulated = 0;
    let raf = 0;

    const render = () => {
      const now = performance.now();
      const elapsed = accumulated + (running ? now - startedAt : 0);
      timeEl.textContent = formatTime(elapsed);
    };

    const tick = () => {
      render();
      if (!running) return;
      raf = window.requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      startedAt = performance.now();
      raf = window.requestAnimationFrame(tick);
    };

    const stop = () => {
      if (!running) return;
      running = false;
      accumulated += performance.now() - startedAt;
      window.cancelAnimationFrame(raf);
      render();
    };

    const reset = () => {
      running = false;
      accumulated = 0;
      startedAt = 0;
      window.cancelAnimationFrame(raf);
      timeEl.textContent = '00:00';
    };

    startBtn.addEventListener('click', start);
    stopBtn.addEventListener('click', stop);
    resetBtn.addEventListener('click', reset);
    render();
  }

  function initDemo() {
    const form = $('#demoForm');
    if (!form) return;

    const topicEl = $('#topic');
    const apiKeyEl = $('#apiKey');
    const rememberEl = $('#rememberKey');
    const levelEl = $('#level');
    const statusEl = $('[data-status]');
    const generateBtn = $('[data-generate]');
    const clearKeyBtn = $('[data-clear-key]');
    const sampleBtn = $('[data-load-sample]');

    const outSummary = $('[data-out="summary"]');
    const outExplanation = $('[data-out="explanation"]');
    const outKeyPoints = $('[data-out="keyPoints"]');
    const outConclusion = $('[data-out="conclusion"]');

    const remembered = storageGet(STORAGE.remember) === '1';
    const savedKey = storageGet(STORAGE.apiKey) || '';
    if (rememberEl) rememberEl.checked = remembered && !!savedKey;
    if (apiKeyEl && remembered && savedKey) apiKeyEl.value = savedKey;

    const renderOutput = (data) => {
      setOutputText(outSummary, data.summary);
      setOutputText(outExplanation, data.explanation);
      setOutputList(outKeyPoints, data.keyPoints);
      setOutputText(outConclusion, data.conclusion);
    };

    const getCurrentOutputText = (key) => {
      if (key === 'keyPoints') {
        const items = $$('li', outKeyPoints).map((li) => li.textContent || '').filter(Boolean);
        return items.length ? items.map((s) => `- ${s}`).join('\n') : '';
      }
      const map = {
        summary: outSummary,
        explanation: outExplanation,
        conclusion: outConclusion
      };
      const el = map[key];
      return el ? el.textContent || '' : '';
    };

    $$('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const key = btn.getAttribute('data-copy');
        const text = getCurrentOutputText(key);
        try {
          const ok = await copyText(text);
          btn.textContent = ok ? 'Copied' : 'Copy failed';
        } catch {
          btn.textContent = 'Copy failed';
        } finally {
          window.setTimeout(() => (btn.textContent = 'Copy'), 900);
        }
      });
    });

    if (clearKeyBtn) {
      clearKeyBtn.addEventListener('click', () => {
        storageRemove(STORAGE.apiKey);
        storageSet(STORAGE.remember, '0');
        if (apiKeyEl) apiKeyEl.value = '';
        if (rememberEl) rememberEl.checked = false;
        setStatus(statusEl, 'Saved key cleared.');
      });
    }

    if (sampleBtn) {
      sampleBtn.addEventListener('click', () => {
        const topic = safeTrim(topicEl?.value) || 'Photosynthesis';
        const level = levelEl?.value || 'college';
        renderOutput(buildOfflineDemo(topic, level));
        setStatus(statusEl, 'Loaded offline sample output.');
      });
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = safeTrim(topicEl?.value);
      const level = levelEl?.value || 'college';
      const apiKey = safeTrim(apiKeyEl?.value);
      const remember = !!rememberEl?.checked;

      if (!topic) {
        setStatus(statusEl, 'Please enter a topic.');
        topicEl?.focus();
        return;
      }

      if (remember && apiKey) {
        storageSet(STORAGE.apiKey, apiKey);
        storageSet(STORAGE.remember, '1');
      } else {
        storageRemove(STORAGE.apiKey);
        storageSet(STORAGE.remember, '0');
      }

      if (generateBtn) generateBtn.disabled = true;
      setStatus(statusEl, apiKey ? 'Generating with Gemini (live)...' : 'Generating offline sample...');

      try {
        let data;
        if (apiKey) {
          try {
            data = await generateWithGemini({ topic, level, apiKey });
            setStatus(statusEl, 'Done. Generated live notes.');
          } catch (err) {
            data = buildOfflineDemo(topic, level);
            const msg =
              err && err.message
                ? `${err.message} Showing offline sample instead.`
                : 'Live generation failed. Showing offline sample instead.';
            setStatus(statusEl, msg);
          }
        } else {
          data = buildOfflineDemo(topic, level);
          setStatus(statusEl, 'Done. Generated offline sample notes (add an API key for live output).');
        }

        renderOutput(data);
      } finally {
        if (generateBtn) generateBtn.disabled = false;
      }
    });
  }

  function init() {
    initNav();
    initReveal();
    initToTop();
    initTimer();
    initDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
