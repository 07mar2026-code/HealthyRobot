// 部署前請換成 LINE Developers 後台提供的 LIFF ID；留空時可在一般瀏覽器預覽。
const LIFF_ID = "";
// 若使用 n8n，填入 Webhook Production URL，例如：https://your-n8n/webhook/health-profile
const PROFILE_WEBHOOK_URL = "";

const form = document.querySelector("#profileForm");
const fields = ["age", "height", "weight"];
const toast = document.querySelector("#toast");
let lineProfile = null;

async function initialiseLiff() {
  if (!LIFF_ID || !window.liff) return;
  try {
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    lineProfile = await liff.getProfile();
    document.querySelector("#lineStatus").textContent = lineProfile.displayName;
  } catch (error) {
    console.warn("LIFF 初始化失敗：", error);
  }
}

function showToast(message) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800); }
function errorFor(name, message = "") { const target = document.querySelector(`[data-error="${name}"]`); if (target) target.textContent = message; const input = form.elements[name]; input?.closest(".field")?.classList.toggle("invalid", Boolean(message)); }
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
  for (const [name, [min,max,message]] of Object.entries(rules)) { const value = Number(form[name].value); if (!value || value < min || value > max) { errorFor(name,message); valid=false; } else errorFor(name); }
  if (!form.privacy.checked) { errorFor("privacy", "請先閱讀並同意隱私權政策"); valid=false; } else errorFor("privacy");
  return valid;
}
fields.forEach(name => form[name].addEventListener("input", () => { errorFor(name); calculateBmi(); }));
form.addEventListener("change", event => { if (event.target.name === "gender") errorFor("gender"); if (event.target.name === "privacy") errorFor("privacy"); });
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!validate()) return;
  const payload = { gender:form.gender.value, age:Number(form.age.value), heightCm:Number(form.height.value), weightKg:Number(form.weight.value), bmi:Number((Number(form.weight.value) / ((Number(form.height.value)/100)**2)).toFixed(1)), lineUserId:lineProfile?.userId ?? null, displayName:lineProfile?.displayName ?? null, updatedAt:new Date().toISOString() };
  const button = document.querySelector("#submitButton"); button.disabled=true; button.textContent="儲存中…";
  try {
    if (PROFILE_WEBHOOK_URL) { const response = await fetch(PROFILE_WEBHOOK_URL, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) }); if (!response.ok) throw new Error("Webhook request failed"); }
    localStorage.setItem("healthProfile", JSON.stringify(payload));
    showToast("健康檔案已儲存");
    // 下一步可導向健康目標設定頁，或改成 liff.sendMessages() 回傳摘要到聊天室。
  } catch (error) { console.error(error); showToast("儲存失敗，請稍後再試"); }
  finally { button.disabled=false; button.innerHTML="儲存並繼續 <span>→</span>"; }
});
initialiseLiff();
