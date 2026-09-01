const LIFF_ID = "2010801069-26iRMu35";
const form = document.querySelector("#sleepForm");
const toast = document.querySelector("#toast");
const bedTime = document.querySelector("#bedTime");
const wakeTime = document.querySelector("#wakeTime");
const durationCard = document.querySelector("#durationCard");
const durationText = document.querySelector("#durationText");
const durationHint = document.querySelector("#durationHint");
let lineProfile = null;
let durationMinutes = null;

async function initialiseLiff() {
  if (!LIFF_ID || !window.liff) return;
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    lineProfile = await liff.getProfile();
    document.querySelector("#lineStatus").textContent = lineProfile.displayName;
  } catch (error) { console.warn("LIFF 初始化失敗：", error); }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

function setError(name, message = "") {
  const target = document.querySelector(`[data-error="${name}"]`);
  if (target) target.textContent = message;
  form.querySelector(`[name="${name}"]`)?.closest(".field")?.classList.toggle("invalid", Boolean(message));
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function calculateDuration() {
  const start = timeToMinutes(bedTime.value);
  const end = timeToMinutes(wakeTime.value);
  if (start === null || end === null) {
    durationMinutes = null;
    durationText.textContent = "請選擇時間";
    durationHint.textContent = "自動計算";
    durationCard.classList.add("empty");
    return;
  }
  durationMinutes = end - start;
  if (durationMinutes <= 0) durationMinutes += 24 * 60;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  durationText.textContent = minutes ? `${hours} 小時 ${minutes} 分` : `${hours} 小時`;
  durationHint.textContent = `${(durationMinutes / 60).toFixed(1)} 小時`;
  durationCard.classList.remove("empty");
}

function validate() {
  let valid = true;
  if (!bedTime.value) { setError("bedTime", "請選擇入睡時間"); valid = false; } else setError("bedTime");
  if (!wakeTime.value) { setError("wakeTime", "請選擇起床時間"); valid = false; } else setError("wakeTime");
  if (!form.energyLevel.value) { setError("energyLevel", "請選擇今天的精神程度"); valid = false; } else setError("energyLevel");
  return valid;
}

[bedTime, wakeTime].forEach(input => input.addEventListener("input", () => { setError(input.name); calculateDuration(); }));
form.addEventListener("change", event => { if (event.target.name === "energyLevel") setError("energyLevel"); });
form.dreamNote.addEventListener("input", () => { document.querySelector("#dreamCount").textContent = form.dreamNote.value.length; });

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!validate()) return;
  calculateDuration();
  const payload = {
    bedTime: bedTime.value,
    wakeTime: wakeTime.value,
    durationMinutes,
    durationHours: Number((durationMinutes / 60).toFixed(2)),
    energyLevel: Number(form.energyLevel.value),
    dreamNote: form.dreamNote.value.trim(),
    lineUserId: lineProfile?.userId ?? null,
    recordedAt: new Date().toISOString()
  };
  localStorage.setItem("sleepQuality", JSON.stringify(payload));
  showToast("睡眠紀錄已儲存");
});

const saved = JSON.parse(localStorage.getItem("sleepQuality") || "null");
if (saved) {
  bedTime.value = saved.bedTime || "";
  wakeTime.value = saved.wakeTime || "";
  const energy = form.querySelector(`[name="energyLevel"][value="${saved.energyLevel}"]`);
  if (energy) energy.checked = true;
  form.dreamNote.value = saved.dreamNote || "";
  document.querySelector("#dreamCount").textContent = form.dreamNote.value.length;
  calculateDuration();
}
initialiseLiff();
