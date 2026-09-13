const LIFF_ID = "2010801069-26iRMu35";
const NUTRITION_WEBHOOK_URL = "https://20260419.zeabur.app/webhook/health-profile";
const form = document.querySelector("#nutritionForm");
const toast = document.querySelector("#toast");
const servings = { vegetables: 0, starch: 0, protein: 0 };
let lineProfile = null;

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
}

function scoreFor(value, target) {
  if (value === 0) return 0;
  return Math.max(0, 1 - Math.abs(value - target) / target);
}

function updateFeedback() {
  const score = Math.round((scoreFor(servings.vegetables, 2) * 0.5 + scoreFor(servings.starch, 1) * 0.25 + scoreFor(servings.protein, 1) * 0.25) * 100);
  document.querySelector("#balanceScore").textContent = score;
  let title = "從這一餐開始覺察";
  let text = "調整份數後，這裡會提供溫和的下一步建議。";
  if (Object.values(servings).some(value => value > 0)) {
    const tips = [];
    if (servings.vegetables < 2) tips.push("下一餐多補一個拳頭的蔬菜");
    if (servings.starch < 1) tips.push("加入適量全穀澱粉，讓能量更穩定");
    if (servings.protein < 1) tips.push("補上一掌心豆魚蛋肉");
    if (servings.starch > 1.5) tips.push("澱粉可先減少半個拳頭觀察飽足感");
    if (servings.protein > 1.5) tips.push("蛋白質足夠了，下一口可以留給蔬菜");
    if (!tips.length) { title = "這餐很接近 211"; text = "你已經把蔬菜、澱粉和蛋白質照顧得很均衡。"; }
    else { title = "已經做得很好"; text = tips[0] + "，不用一次改很多。"; }
  }
  document.querySelector("#feedbackTitle").textContent = title;
  document.querySelector("#feedbackText").textContent = text;
}

document.querySelectorAll(".serving-control").forEach(control => {
  const name = control.dataset.name;
  control.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    servings[name] = Math.min(4, Math.max(0, servings[name] + Number(button.dataset.step)));
    control.querySelector("output").textContent = Number.isInteger(servings[name]) ? servings[name] : servings[name].toFixed(1);
    setError("servings");
    updateFeedback();
  }));
});

form.addEventListener("change", event => {
  if (event.target.name === "mealType") setError("mealType");
  if (event.target.name === "privacy") setError("privacy");
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  let valid = true;
  if (!form.mealType.value) { setError("mealType", "請選擇餐別"); valid = false; }
  if (!Object.values(servings).some(value => value > 0)) { setError("servings", "請至少記錄一類食物份數"); valid = false; }
  if (!form.privacy.checked) { setError("privacy", "請先閱讀並同意資料使用說明"); valid = false; }
  if (!valid) return;

  const payload = {
    recordType: "nutritionGuide",
    mealType: form.mealType.value,
    servings: { ...servings },
    balanceScore: Number(document.querySelector("#balanceScore").textContent),
    lineUserId: lineProfile?.userId ?? null,
    displayName: lineProfile?.displayName ?? null,
    recordedAt: new Date().toISOString()
  };
  const button = document.querySelector("#submitButton");
  button.disabled = true;
  button.textContent = "儲存中…";
  try {
    const response = await fetch(NUTRITION_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Webhook request failed: ${response.status}`);
    const result = await response.json();
    if (!result.ok || result.recordType !== "nutritionGuide") throw new Error("n8n did not confirm nutrition record");
    localStorage.setItem("latestNutritionRecord", JSON.stringify(payload));
    showToast("這一餐已記錄，謝謝你照顧自己");
  } catch (error) {
    console.error(error);
    localStorage.setItem("nutritionDraft", JSON.stringify(payload));
    showToast("已保留在這台裝置，連線後再同步");
  } finally {
    button.disabled = false;
    button.innerHTML = "儲存這一餐 <span>→</span>";
  }
});

initialiseLiff();
