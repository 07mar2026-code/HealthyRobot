const LIFF_ID = "2010801069-26iRMu35";
const PROFILE_API = "https://xgggajmuqcwatbdmfjat.supabase.co/functions/v1/liff-health-profile";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_zEfObRt85Pgu3ibpZlzv0w_dU_FAxOd";
const CONSENT_VERSION = "2026-11-08";

const form = document.querySelector("#profileForm");
const fields = ["age", "height", "weight"];
const toast = document.querySelector("#toast");
const button = document.querySelector("#submitButton");
const buttonLabel = button.innerHTML;
const lineStatus = document.querySelector("#lineStatus");

async function initialiseLiff() {
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) {
      liff.login();
      return false;
    }
    if (!liff.getAccessToken()) {
      lineStatus.textContent = "請從 LINE 重新開啟";
      return false;
    }
    lineStatus.textContent = "LINE 已登入";
    button.disabled = false;
    return true;
  } catch {
    lineStatus.textContent = "LINE 登入失敗，請重新開啟";
    return false;
  }
}

function showToast(message) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800); }
function errorFor(name, message = "") {
  const target = document.querySelector(`[data-error="${name}"]`);
  if (target) target.textContent = message;

  // `form.elements.gender` is a RadioNodeList, not a single element, so it
  // doesn't provide `closest()`. Use the first matching control to locate the
  // surrounding field for both grouped radios and ordinary inputs.
  const input = form.querySelector(`[name="${name}"]`);
  input?.closest(".field")?.classList.toggle("invalid", Boolean(message));
}
function calculateBmi() {
  const height = Number(form.height.value), weight = Number(form.weight.value);
  const card = document.querySelector("#bmiCard");
  if (!height || !weight || height < 80 || weight < 20) { card.classList.add("hidden"); return; }
  const bmi = weight / ((height / 100) ** 2);
  let label = "體位適中", description = "維持目前的健康好習慣";
  if (bmi < 18.5) [label, description] = ["體重過輕", "可留意均衡飲食與營養攝取"];
  else if (bmi >= 24 && bmi < 27) [label, description] = ["體重過重", "可從日常活動與飲食開始調整"];
  else if (bmi >= 27) [label, description] = ["肥胖", "建議與專業醫療人員討論健康計畫"];
  document.querySelector("#bmiValue").textContent = bmi.toFixed(1);
  document.querySelector("#bmiLabel").textContent = label;
  document.querySelector("#bmiDescription").textContent = description;
  const markerPosition = Math.max(4, Math.min(96, ((bmi - 14) / 26) * 100));
  document.querySelector("#bmiMarker").style.left = `${markerPosition}%`;
  card.classList.remove("hidden");
}
function validate() {
  let valid = true;
  if (!form.gender.value) { errorFor("gender", "請選擇生理性別"); valid = false; } else errorFor("gender");
  const rules = { age:[1,120,"請輸入 1 至 120 歲"], height:[80,250,"請輸入 80 至 250 cm"], weight:[20,400,"請輸入 20 至 400 kg"] };
  for (const [name, [min, max, message]] of Object.entries(rules)) {
    const input = form[name];
    const value = input.valueAsNumber;
    const inRange = value >= min && value <= max;
    const precision = name === "age" ? "年齡請填整數" : "請填至小數點後一位";
    const error = inRange ? (input.validity.stepMismatch ? precision : "") : message;
    errorFor(name, error);
    if (error) valid = false;
  }
  if (!form.privacy.checked) { errorFor("privacy", "請先閱讀並同意隱私權政策"); valid=false; } else errorFor("privacy");
  return valid;
}
fields.forEach(name => form[name].addEventListener("input", () => { errorFor(name); calculateBmi(); }));
form.addEventListener("change", event => { if (event.target.name === "gender") errorFor("gender"); if (event.target.name === "privacy") errorFor("privacy"); });
const liffReady = initialiseLiff();
let saving = false;

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (saving || !validate()) return;

  saving = true;
  button.disabled = true;
  button.textContent = "儲存中…";
  let saved = false;
  try {
    const accessToken = (await liffReady) ? liff.getAccessToken() : null;
    if (!accessToken) {
      showToast("請從 LINE 重新開啟健康檔案後再儲存");
      return;
    }
    const response = await fetch(PROFILE_API, {
      method: "POST",
      redirect: "error",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "X-Line-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gender: form.gender.value,
        age: form.age.valueAsNumber,
        heightCm: form.height.valueAsNumber,
        weightKg: form.weight.valueAsNumber,
        consent: form.privacy.checked,
        consentVersion: CONSENT_VERSION,
      }),
    });
    if (response.status === 401) {
      showToast("LINE 登入已失效，請從 LINE 重新開啟");
      return;
    }
    if (!response.ok || (await response.json()).ok !== true) throw new Error("Save failed");

    saved = true;
    showToast("健康檔案已儲存");
    window.setTimeout(() => { window.location.href = "sleep.html"; }, 650);
  } catch {
    showToast("儲存失敗，請稍後再試");
  } finally {
    if (!saved) {
      saving = false;
      button.disabled = !(await liffReady);
      button.innerHTML = buttonLabel;
    }
  }
});
