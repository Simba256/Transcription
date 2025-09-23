
/* editor.js — Transcript Editor behaviour (frontend-only demo scaffolding)
 * Brand: Talk to Text Canada (navy + lavender)
 * NOTE: Replace PLACEHOLDER endpoints with your Flask routes.
 */

const $ = (sel, root=document)=> root.querySelector(sel);
const $$ = (sel, root=document)=> Array.from(root.querySelectorAll(sel));

const transcriptEl = $("#transcript");
const wordCountEl = $("#wordCount");
const speakerCountEl = $("#speakerCount");
const durationEl = $("#duration");
const autosaveStatus = $("#autosaveStatus");
const saveStatus = $("#saveStatus");
const serviceTypeEl = $("#serviceType");
const stylePresetEl = $("#stylePreset");
const serviceBadge = $("#serviceBadge");

const state = {
  service: "AI",           // "AI" | "Human" | "Hybrid" | "Legal"
  style: "intelligent",    // "intelligent" | "strict"
  fillerLevel: "none",     // none | light | moderate | aggressive
  timecodeCadence: 60,     // 0,30,60,300,600
  speakerMap: {},          // { SPEAKER_1: "Doctor", ... }
  customTerms: [],
  lastSavedHtml: "",
  autosaveTimer: null,
};

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  updateCounts();
  setupEditorToolbar();
  setupAudio();
  setupControls();
  startAutosave();
});

function updateCounts(){
  const text = transcriptEl.innerText.replace(/\s+/g, ' ').trim();
  wordCountEl.textContent = text ? text.split(' ').length : 0;

  const speakers = new Set($$(".speaker-chip").map(ch => ch.dataset.speaker || ch.textContent.replace(/:$/, '')));
  speakerCountEl.textContent = speakers.size;
}

function setupEditorToolbar(){
  $$(".toolbar [data-cmd]").forEach(btn => {
    btn.addEventListener("click", () => document.execCommand(btn.dataset.cmd, false));
  });
  $("#addParagraph").addEventListener("click", () => {
    const p = document.createElement("p");
    p.innerHTML = "<span class='speaker-chip' data-speaker='SPEAKER_1'>SPEAKER_1:</span> ";
    transcriptEl.appendChild(p);
    placeCaret(p);
    updateCounts();
  });
  transcriptEl.addEventListener("input", updateCounts);
  transcriptEl.addEventListener("drop", e => e.dataTransfer && e.preventDefault()); // avoid file drop into content
  transcriptEl.addEventListener("keydown", () => setDirty());
}

function placeCaret(node){
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(node);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// --- Audio ---
function setupAudio(){
  const player = $("#player");
  const back5 = $("#back5");
  const fwd5 = $("#fwd5");
  const speed = $("#speed");
  const audioUrl = $("#audioUrl");
  const loadBtn = $("#loadAudio");
  const audioFile = $("#audioFile");

  back5.addEventListener("click", ()=> player.currentTime = Math.max(0, player.currentTime - 5));
  fwd5.addEventListener("click", ()=> player.currentTime = Math.min(player.duration||0, player.currentTime + 5));
  speed.addEventListener("input", ()=> player.playbackRate = parseFloat(speed.value));
  loadBtn.addEventListener("click", ()=> {
    if(audioUrl.value) player.src = audioUrl.value;
  });
  audioFile.addEventListener("change", ()=> {
    const f = audioFile.files[0];
    if(f){
      player.src = URL.createObjectURL(f);
    }
  });
  player.addEventListener("loadedmetadata", ()=> durationEl.textContent = toHMS(player.duration));
}

// --- Controls ---
function setupControls(){
  // Fillers
  $("#previewFillers").addEventListener("click", previewFillers);
  $("#applyFillers").addEventListener("click", applyFillers);
  $("#fillerLevel").addEventListener("change", (e)=> state.fillerLevel = e.target.value);

  // Timecodes
  $("#applyTimecodes").addEventListener("click", applyTimecodes);
  $("#timecodeCadence").addEventListener("change", (e)=> state.timecodeCadence = parseInt(e.target.value,10));

  // Speaker labels
  $("#toggleLabels").addEventListener("change", e => toggleLabels(e.target.checked));
  $("#mapSpeakers").addEventListener("click", openSpeakerMap);

  // Style & formatting
  $("#applyStyle").addEventListener("click", applyStyle);
  $("#styleSelect").addEventListener("change", e => {
    state.style = e.target.value;
    stylePresetEl.textContent = state.style === "intelligent" ? "Intelligent Verbatim" : "Strict Verbatim";
  });

  // Custom terms
  $("#saveCustomTerms").addEventListener("click", ()=> {
    const raw = $("#customTerms").value.trim();
    state.customTerms = raw ? raw.split(",").map(s=>s.trim()).filter(Boolean) : [];
    notify("Saved custom terms");
    setDirty();
  });

  // Sensitivity
  $("#maskProfanity").addEventListener("change", e => e.target.checked ? maskProfanity(true) : unmaskProfanity());
  $("#deidentify").addEventListener("change", e => e.target.checked ? deidentify() : restoreIdentifiable());

  // Save / Export
  $("#saveBtn").addEventListener("click", manualSave);
  $("#revertBtn").addEventListener("click", revertToLastSave);
  $("#compareBtn").addEventListener("click", compareToLastSave);
  $("#exportHtml").addEventListener("click", ()=> exportBlob(transcriptEl.innerHTML, "text/html", "transcript.html"));
  $("#exportTxt").addEventListener("click", ()=> exportBlob(transcriptEl.innerText, "text/plain", "transcript.txt"));

  // Backend actions (placeholders)
  $("#sendSave").addEventListener("click", sendSaveToApi);
  $("#lockPdf").addEventListener("click", ()=> {
    // Replace with window.location = `/download/pdf/${clientId}/${projectId}`;
    alert("This would call your Flask PDF route: /download/pdf/<client_id>/<project_id>");
  });
}

// --- Filler removal ---
const FILLER_SETS = {
  light: ["uh","um","er"],
  moderate: ["uh","um","er","like","you know","kinda","sort of"],
  aggressive: ["uh","um","er","like","you know","kinda","sort of","well","i mean","basically","literally","actually","just"]
};

function previewFillers(){
  clearPreview();
  if(state.fillerLevel === "none") return;

  const fillers = FILLER_SETS[state.fillerLevel];
  const walker = document.createTreeWalker(transcriptEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    const text = node.nodeValue;
    if(!text) return;
    let replaced = text;
    fillers.forEach(f => {
      const rx = new RegExp(`\\b${escapeRegex(f)}\\b`, 'gi');
      replaced = replaced.replace(rx, m => `[[PREVIEW:${m}]]`);
    });
    if(replaced !== text){
      const span = document.createElement("span");
      span.innerHTML = replaced
        .replace(/\[\[PREVIEW:(.*?)\]\]/g, "<span class='preview-highlight'>$1</span>");
      node.parentNode.replaceChild(span, node);
    }
  });
}

function clearPreview(){
  $$(".preview-highlight").forEach(n=> {
    const text = document.createTextNode(n.textContent);
    n.replaceWith(text);
  });
}

function applyFillers(){
  clearPreview();
  if(state.fillerLevel === "none") return;
  const fillers = FILLER_SETS[state.fillerLevel];
  const walker = document.createTreeWalker(transcriptEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    let t = node.nodeValue;
    if(!t) return;
    fillers.forEach(f => {
      const rx = new RegExp(`(^|\s)${escapeRegex(f)}(\s|[,.!?])`, 'gi');
      t = t.replace(rx, (match, a, b) => `${a}${b}`);
    });
    t = t.replace(/\s{2,}/g, ' ');
    node.nodeValue = t;
  });
  setDirty();
  updateCounts();
}

// --- Timecodes ---
function applyTimecodes(){
  const cadence = state.timecodeCadence;
  // remove previous auto timecodes
  $$(".tc-auto").forEach(el => el.remove());
  if(!cadence) return;

  // naive sentence split by period/question/exclamation
  const paragraphs = $$("#transcript p");
  let elapsed = 0;
  paragraphs.forEach(p => {
    // Walk through sentences, insert timecode at cadence steps
    const text = p.innerText;
    // Rough estimate: 150 wpm -> 2.5 wps
    const words = text.trim().split(/\s+/).filter(Boolean);
    const estSeconds = Math.ceil(words.length / 2.5);
    const targetInsertTimes = [];
    let next = (Math.floor(elapsed / cadence) + 1) * cadence;
    while(next < elapsed + estSeconds){
      targetInsertTimes.push(next);
      next += cadence;
    }
    // Insert at start of paragraph if hits boundary
    targetInsertTimes.forEach(sec => {
      const tag = document.createElement("span");
      tag.className = "tc-auto";
      tag.textContent = ` [${toHMS(sec)}] `;
      p.insertBefore(tag, p.firstChild);
    });
    elapsed += estSeconds;
  });
  setDirty();
}

// --- Speaker labels ---
function toggleLabels(show){
  $$(".speaker-chip").forEach(ch => ch.style.display = show ? "" : "none");
}
function openSpeakerMap(){
  const modal = $("#mapModal");
  const list = $("#speakerList");
  list.innerHTML = "";
  const speakers = new Set($$(".speaker-chip").map(ch => ch.dataset.speaker || ch.textContent.replace(/:$/, "")));
  speakers.forEach(id => {
    const row = document.createElement("div");
    row.style = "display:flex; gap:8px; align-items:center; margin:8px 0;";
    row.innerHTML = `<span class="speaker-chip" data-speaker="${id}">${id}:</span>
      <input type="text" data-map="${id}" placeholder="Enter display name (e.g., Doctor)">`;
    list.appendChild(row);
  });
  modal.style.display = "flex";
  $("#cancelMap").onclick = ()=> modal.style.display = "none";
  $("#applyMap").onclick = ()=> {
    $$('input[data-map]', list).forEach(inp => {
      const from = inp.dataset.map;
      const to = (inp.value || "").trim();
      if(to){
        state.speakerMap[from] = to;
      }
    });
    applySpeakerMap();
    modal.style.display = "none";
  };
}
function applySpeakerMap(){
  $$(".speaker-chip").forEach(ch => {
    const id = ch.dataset.speaker || ch.textContent.replace(/:$/, "");
    const mapped = state.speakerMap[id];
    ch.textContent = (mapped || id) + ":";
  });
  setDirty();
}

// --- Style / formatting ---
function applyStyle(){
  if(state.style === "strict"){
    // Do not remove fillers automatically; ensure verbatim punctuation kept
    // Here we just avoid any auto transformations and ensure casing is not forced.
    notify("Applied Strict Verbatim preset");
  }else{
    // Intelligent: light cleanups
    normalizeWhitespace();
    if($("#autoNumerals").checked) autoNumerals();
    if($("#capitalize").checked) capitalizeSentences();
    if($("#bullets").checked) standardizeBullets();
    notify("Applied Intelligent Verbatim preset");
  }
  setDirty();
}
function normalizeWhitespace(){
  $$("#transcript p").forEach(p => p.innerHTML = p.innerHTML.replace(/\s{2,}/g, ' '));
}
function autoNumerals(){
  // Basic number formatting: 1,000 for thousands (naive)
  const walker = document.createTreeWalker(transcriptEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    n.nodeValue = n.nodeValue.replace(/\b(\d{1,3})(\d{3})(\b)/g, (m,a,b,c)=> `${a},${b}${c}`);
  });
}
function capitalizeSentences(){
  $$("#transcript p").forEach(p => {
    p.innerHTML = p.innerHTML.replace(/(^|[.!?]\s+)([a-z])/g, (m,a,b)=> a + b.toUpperCase());
  });
}
function standardizeBullets(){
  $$("#transcript p").forEach(p => {
    p.innerHTML = p.innerHTML.replace(/^\s*[-•]\s+/gm, "• ");
  });
}

// --- Sensitivity: profanity & de-identification ---
const PROFANITY = ["damn","shit","fuck"]; // extend on server
function maskProfanity(on){
  if(!on) return;
  const walker = document.createTreeWalker(transcriptEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    let t = n.nodeValue;
    PROFANITY.forEach(w => {
      const rx = new RegExp(`\\b${escapeRegex(w)}\\b`, 'gi');
      t = t.replace(rx, m => "*".repeat(m.length));
    });
    n.nodeValue = t;
  });
  setDirty();
}
function unmaskProfanity(){
  // Irreversible client-side; real implementation should keep originals as spans with attributes.
  notify("Cannot restore originals client-side. Server should implement reversible masking.");
}
function deidentify(){
  // naive masks
  walkText(n => {
    let t = n.nodeValue;
    t = t.replace(/\b\w+@\w+\.[\w.]+\b/g, "[EMAIL]");
    t = t.replace(/\b\+?\d[\d\s().-]{7,}\b/g, "[PHONE]");
    t = t.replace(/\b\d{1,3}\s+[A-Za-z]{2,}\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr)\b/gi, "[ADDRESS]");
    t = t.replace(/\b(19|20)\d{2}-\d{2}-\d{2}\b/g, "[DATE]"); // YYYY-MM-DD
    n.nodeValue = t;
  });
  setDirty();
}
function restoreIdentifiable(){
  notify("Client view cannot restore de-identified text. Keep originals server-side.");
}
function walkText(fn){
  const walker = document.createTreeWalker(transcriptEl, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(fn);
}

// --- Save / Autosave / Versioning ---
function setDirty(){
  saveStatus.textContent = "Unsaved";
}
function manualSave(){
  state.lastSavedHtml = transcriptEl.innerHTML;
  saveStatus.textContent = "Saved";
  localStorage.setItem("ttc_editor_last", state.lastSavedHtml);
}
function revertToLastSave(){
  const html = localStorage.getItem("ttc_editor_last") || state.lastSavedHtml;
  if(html){
    transcriptEl.innerHTML = html;
    updateCounts();
    saveStatus.textContent = "Reverted";
  }
}
function compareToLastSave(){
  // Simple length diff message. Real diff should be server-side or a diff lib.
  const prev = (localStorage.getItem("ttc_editor_last") || state.lastSavedHtml || "");
  const now = transcriptEl.innerHTML;
  alert(`Previous length: ${prev.length}\nCurrent length: ${now.length}\n(Integrate a real diff viewer in production.)`);
}
function startAutosave(){
  setInterval(()=> {
    autosaveStatus.textContent = "Autosaving…";
    localStorage.setItem("ttc_editor_autosave", transcriptEl.innerHTML);
    setTimeout(()=> autosaveStatus.textContent = "Autosave: idle", 600);
  }, 5000);
}

// --- API placeholders ---
async function sendSaveToApi(){
  const payload = {
    transcript: {
      content_html: transcriptEl.innerHTML,
      style: state.style,
      filters: { filler_level: state.fillerLevel },
      timecodes: { mode: state.timecodeCadence, placement: "sentence" },
      speaker_map: state.speakerMap,
      custom_terms: state.customTerms
    }
  };
  // Replace clientId/projectId and URL with real Flask endpoint.
  try{
    const resp = await fetch(`/editor/save/CLIENT_ID/PROJECT_ID`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    notify("Saved to server");
  }catch(err){
    console.error(err);
    alert("Failed to save to server. Check endpoint.");
  }
}

// --- Utils ---
function toHMS(total){
  total = Math.floor(total||0);
  const h = Math.floor(total/3600).toString().padStart(2,'0');
  const m = Math.floor((total%3600)/60).toString().padStart(2,'0');
  const s = Math.floor(total%60).toString().padStart(2,'0');
  return `${h}:${m}:${s}`;
}
function exportBlob(content, mime, filename){
  const blob = new Blob([content], {type:mime});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function notify(msg){
  autosaveStatus.textContent = msg;
  setTimeout(()=> autosaveStatus.textContent = "Autosave: idle", 1500);
}
