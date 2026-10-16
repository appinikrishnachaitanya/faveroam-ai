/** Real-browser/live-backend acceptance. Requires an isolated Chromium CDP profile. */
import fs from "node:fs/promises";
const appUrl = process.env.PASSPORT_TEST_URL ?? "http://127.0.0.1:3001";
const cdpUrl = process.env.PASSPORT_CDP_URL ?? "http://127.0.0.1:9231";
const artifactDir = process.env.PASSPORT_TEST_ARTIFACTS ?? "/tmp";
await fs.mkdir(artifactDir, { recursive: true });
import assert from "node:assert/strict";
const tabs = await (await fetch(cdpUrl + "/json")).json();
const ws = new WebSocket(
  tabs.find((t) => t.type === "page").webSocketDebuggerUrl,
);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const jobs = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id) {
    jobs.get(m.id)?.(m);
    jobs.delete(m.id);
  }
});
function call(method, params = {}) {
  return new Promise((r, j) => {
    const n = ++id;
    jobs.set(n, r);
    ws.send(JSON.stringify({ id: n, method, params }));
    setTimeout(() => {
      if (jobs.has(n)) {
        jobs.delete(n);
        j(Error("CDP timeout"));
      }
    }, 20000).unref();
  });
}
async function evaluate(expression) {
  const m = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (m.result?.exceptionDetails) throw Error("Browser evaluation failed");
  return m.result?.result?.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 220; i++) {
    if (await evaluate(expression)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw Error("UI state timed out");
}
async function input(selector, value, type = "HTMLInputElement") {
  await evaluate(
    `(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${type}.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`,
  );
  await new Promise((r) => setTimeout(r, 100));
}
async function clickText(text) {
  await evaluate(
    `[...document.querySelectorAll('button')].find(b=>b.textContent.includes(${JSON.stringify(text)})).click()`,
  );
}
async function settled() {
  await new Promise((r) => setTimeout(r, 200));
  await waitFor("!document.querySelector('.compact-progress')");
}
async function shot(path) {
  const s = await call("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(
    `${artifactDir}/${path.split("/").at(-1)}`,
    Buffer.from(s.result.data, "base64"),
  );
}
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1100,
  deviceScaleFactor: 1,
  mobile: false,
});
await call("Page.navigate", { url: appUrl });
await waitFor("Boolean(document.querySelector('#taste-input'))");
await new Promise((r) => setTimeout(r, 500));
assert.ok(
  !(await evaluate(
    "Boolean(document.querySelector('.agent-pane,.activity-feed,.persona-story,.assistant-launch,.cultural-reveal'))",
  )),
);
assert.equal(
  await evaluate("document.querySelectorAll('.primary-button').length"),
  1,
);
assert.equal(
  await evaluate("document.querySelector('.primary-button').disabled"),
  true,
);
await shot("/tmp/tastepassport-step1.png");
await input("#origin", "Bengaluru");
await input("#destination", "Toronto", "HTMLSelectElement");
for (const taste of ["A.R. Rahman", "Interstellar", "Indian cuisine"])
  await clickText(taste);
assert.equal(
  await evaluate("document.querySelectorAll('.taste-chip').length"),
  3,
);
await clickText("Build my cultural map");
await waitFor(
  "Boolean(document.querySelector('.confirmation-list')) || Boolean(document.querySelector('.error-message'))",
);
assert.ok(
  !(await evaluate("Boolean(document.querySelector('.error-message'))")),
);
assert.equal(
  await evaluate("document.querySelectorAll('.confirmation-card').length"),
  3,
);
for (let i = 0; i < 3; i++) {
  const selected = await evaluate(
    `(()=>{const s=document.querySelectorAll('.inline-match select')[${i}];return [...s.options].find(o=>o.value${i === 1 ? "&&o.textContent.includes('2014')" : i === 2 ? "&&o.value==='urn:tag:cuisine:qloo:indian'" : ""}).value})()`,
  );
  await input(
    `.confirmation-card:nth-child(${i + 1}) select`,
    selected,
    "HTMLSelectElement",
  );
}
assert.equal(
  await evaluate(
    "document.querySelectorAll('.confirmation-card.confirmed').length",
  ),
  3,
);
await clickText("Help me explore");
await shot("/tmp/tastepassport-step2.png");
await clickText("Create my TastePassport");
await waitFor(
  "Boolean(document.querySelector('.passport-cover')) || Boolean(document.querySelector('.error-message'))",
);
await settled();
assert.ok(
  !(await evaluate("Boolean(document.querySelector('.error-message'))")),
);
assert.equal(
  await evaluate(
    "document.querySelector('#passport-title').innerText.replace(/\\s+/g,' ')",
  ),
  "Your Toronto TastePassport",
);
assert.ok(
  await evaluate("document.querySelectorAll('.discovery-card').length>0"),
);
assert.equal(
  await evaluate(
    "document.querySelector('.familiarity-options button:nth-child(3)').getAttribute('aria-pressed')",
  ),
  "true",
);
assert.ok(!(await evaluate("document.querySelector('.cultural-reveal').open")));
assert.ok(
  !(await evaluate("Boolean(document.querySelector('.why-section[open]'))")),
);
assert.ok(!(await evaluate("document.querySelector('#taste-concierge').open")));
await evaluate("document.querySelector('.weekend-reveal').open=true");
const weekendBefore = await evaluate("[...document.querySelectorAll('.weekend-stops select')].map(s=>s.value)");
assert.ok(weekendBefore.some(Boolean));
assert.ok(await evaluate("[...document.querySelectorAll('#weekend-Eat option')].length>2"));
await input("#weekend-Eat", await evaluate("document.querySelector('#weekend-Eat option:last-child').value"), "HTMLSelectElement");
const weekendAfter = await evaluate("[...document.querySelectorAll('.weekend-stops select')].map(s=>s.value)");
assert.deepEqual(weekendAfter.slice(0, 2), weekendBefore.slice(0, 2));
assert.notEqual(weekendAfter[2], weekendBefore[2]);
assert.ok(await evaluate("document.querySelector('.weekend-plan').textContent.includes('not a timed route or a reservation')"));
// Inspect the actual download payload without writing Qloo data into the repository.
await evaluate("window.__weekendBlob=null;window.__originalCreateObjectURL=URL.createObjectURL;URL.createObjectURL=(blob)=>{window.__weekendBlob=blob;return window.__originalCreateObjectURL(blob)}");
await evaluate("document.querySelector('.weekend-plan > button').click()");
assert.match(await evaluate("window.__weekendBlob.text()"), /My first weekend in Toronto/);
await evaluate("URL.createObjectURL=window.__originalCreateObjectURL;document.querySelector('.weekend-reveal').open=false");
assert.equal(
  await evaluate(
    "document.querySelector('#section-Eat').closest('section').querySelectorAll('.discovery-card').length",
  ),
  3,
);
await evaluate(
  "document.querySelector('#section-Eat').closest('section').querySelector('.category-more').click()",
);
assert.ok(
  await evaluate(
    "document.querySelector('#section-Eat').closest('section').querySelectorAll('.discovery-card').length>3",
  ),
);
await evaluate(
  "document.querySelector('#section-Eat').closest('section').querySelector('.category-more').click()",
);
await evaluate(
  "document.querySelector('#section-Eat').closest('section').querySelector('.feedback-actions button').click()",
);
await settled();
await evaluate(
  "document.querySelector('.discovery-view-tabs button:nth-child(2)').click()",
);
assert.equal(
  await evaluate(
    "document.querySelectorAll('.my-vibe .discovery-card').length",
  ),
  1,
);
await evaluate(
  "document.querySelector('.discovery-view-tabs button:first-child').click()",
);
await clickText("Sign in");
await waitFor("Boolean(document.querySelector('.account-dialog[open]'))");
assert.ok(
  await evaluate(
    "document.querySelector('.account-dialog').textContent.includes('Accounts are coming online')",
  ),
);
await evaluate(
  "document.querySelector('[aria-label=\"Close account\"]').click()",
);
await shot("/tmp/tastepassport-step3.png");
const initialIds = await evaluate(
  "[...document.querySelectorAll('.discovery-card')].map(c=>c.dataset.entityId)",
);
await clickText("Ask TastePassport");
await waitFor("document.querySelector('#taste-concierge').open");
await clickText("Refine manually");
assert.ok(
  await evaluate(
    "Boolean(document.querySelector('#manual-panel .guided-panel'))",
  ),
);
await evaluate(
  "document.querySelector('[aria-label=\"Close Taste Concierge\"]').click()",
);
await waitFor("!document.querySelector('#taste-concierge').open");
assert.deepEqual(
  await evaluate(
    "[...document.querySelectorAll('.discovery-card')].map(c=>c.dataset.entityId)",
  ),
  initialIds,
);
await evaluate(
  "document.querySelector('.why-section').open=true;document.querySelector('.qloo-evidence').open=true",
);
assert.ok(
  await evaluate(
    "document.querySelector('.qloo-evidence').textContent.includes('Toronto')",
  ),
);
await evaluate(
  "document.querySelector('.why-section').open=false;document.querySelector('.cultural-reveal').open=true",
);
assert.ok(
  await evaluate("document.querySelectorAll('.bridge-route').length>0"),
);
await evaluate("document.querySelector('.cultural-reveal').open=false");
const first = await evaluate(
  "document.querySelector('#section-Eat').closest('section').querySelectorAll('.discovery-card')[1].dataset.entityId",
);
const music = await evaluate(
  "document.querySelector('#section-Music').closest('section').innerText",
);
await evaluate(
  "document.querySelector('#section-Eat').closest('section').querySelectorAll('.discovery-card')[1].querySelectorAll('.feedback-actions button')[1].click()",
);
await waitFor("Boolean(document.querySelector('.match-dialog[open]'))");
await evaluate(
  "[...document.querySelectorAll('.feedback-reasons label')].find(l=>l.textContent.includes('Too mainstream')).querySelector('input').click()",
);
await new Promise((r) => setTimeout(r, 100));
await evaluate(
  "document.querySelector('.match-dialog .primary-button').click()",
);
await settled();
assert.ok(
  !(await evaluate(
    `Boolean(document.querySelector('[data-entity-id='+CSS.escape(${JSON.stringify(first)})+']'))`,
  )),
);
assert.equal(
  await evaluate(
    "document.querySelector('#section-Music').closest('section').innerText",
  ),
  music,
);
await clickText("Ask TastePassport");
await clickText("Refine manually");
await input(".guided-panel select", "Culture", "HTMLSelectElement");
await evaluate(
  "document.querySelector('.guided-panel .primary-button').click()",
);
await settled();
await evaluate(
  "document.querySelector('[aria-label=\"Close Taste Concierge\"]').click()",
);
assert.ok(
  await evaluate("Boolean(document.querySelector('#section-Culture'))"),
);
assert.equal(
  await evaluate(
    "document.querySelector('#section-Music').closest('section').innerText",
  ),
  music,
);
await clickText("Ask TastePassport");
await evaluate("document.querySelector('#ask-tab').click()");
await input(
  "#conversation-input",
  "Forget food. Show me something cultural.",
  "HTMLTextAreaElement",
);
await evaluate("document.querySelector('.composer button').click()");
await settled();
assert.ok(!(await evaluate("Boolean(document.querySelector('#section-Eat'))")));
await evaluate(
  "document.querySelector('[aria-label=\"Close Taste Concierge\"]').click()",
);
const comparisonAvailable = await evaluate(
  "Boolean(document.querySelector('.comparison-reveal'))",
);
if (comparisonAvailable) {
  assert.ok(
    !(await evaluate("document.querySelector('.comparison-reveal').open")),
  );
  await evaluate("document.querySelector('.comparison-reveal').open=true");
  await clickText("See what Qloo adds");
  await waitFor(
    "Boolean(document.querySelector('.comparison-panel')) || Boolean(document.querySelector('.compare-control [role=status]'))",
  );
  if (await evaluate("Boolean(document.querySelector('.comparison-panel'))")) {
    console.log("Live browser same-request comparison: PASS");
  } else {
    console.log("Live comparison generation unavailable; recovery displayed.");
  }
  await evaluate("document.querySelector('.comparison-reveal').open=false");
} else {
  console.log(
    "Live comparison UNRUN: Gemini returned unavailable; comparison hidden and guided fallback retained.",
  );
  assert.ok(
    !(await evaluate("Boolean(document.querySelector('.compare-control'))")),
  );
}
await evaluate(
  "document.querySelector('.discovery-view-tabs button:nth-child(2)').click()",
);
assert.equal(
  await evaluate(
    "document.querySelectorAll('.my-vibe .discovery-card').length",
  ),
  1,
);
await evaluate(
  "document.querySelector('.discovery-view-tabs button:first-child').click()",
);
await clickText("Ask TastePassport");
const beforeReset = await evaluate(
  "[...document.querySelectorAll('.discovery-card')].map(c=>c.dataset.entityId)",
);
await clickText("Reset conversation");
await settled();
assert.deepEqual(
  await evaluate(
    "[...document.querySelectorAll('.discovery-card')].map(c=>c.dataset.entityId)",
  ),
  beforeReset,
);
await evaluate(
  "document.querySelector('[aria-label=\"Close Taste Concierge\"]').click()",
);
await call("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
await evaluate("document.querySelector('.weekend-reveal').open=true");
assert.equal(
  await evaluate("document.documentElement.scrollWidth>innerWidth"),
  false,
);
await clickText("Ask TastePassport");
assert.ok(
  await evaluate(
    "document.querySelector('#taste-concierge').getBoundingClientRect().bottom<=innerHeight+1",
  ),
);
await shot("/tmp/tastepassport-assistant-mobile.png");
await evaluate(
  "document.querySelector('[aria-label=\"Close Taste Concierge\"]').click()",
);
await clickText("New Passport");
await waitFor("Boolean(document.querySelector('#taste-input'))");
assert.equal(
  await evaluate("document.querySelectorAll('.taste-chip').length"),
  0,
);
assert.equal(await evaluate("document.querySelector('#origin').value"), "");
assert.equal(
  await evaluate("document.querySelector('#destination').value"),
  "",
);
assert.ok(
  !(await evaluate(
    "Boolean(document.querySelector('.discovery-card,.assistant-launch,.cultural-reveal'))",
  )),
);
assert.equal(
  await evaluate("document.documentElement.scrollWidth>innerWidth"),
  false,
);
await shot("/tmp/tastepassport-onboarding-mobile.png");
console.log(
  "Production browser progressive UX: PASS. Three steps, curated previews, editable local weekend plan and download, My Vibe persistence, account setup fallback, initial Explore queries, collapsed evidence/bridge, drawer persistence, manual refinement, feedback, both resets, 390px layout.",
);
ws.close();
