const LIFF_ID = "2010801069-26iRMu35";
const DEMO_SUMMARY = { sleepAverage: 6.8, sleepDays: 5, balancedMeals: 11, mealGoal: 14, vegetableDays: 4 };
const toast = document.querySelector("#toast");
let lineProfile = null;

function finiteNumber(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function getSummary() {
  const params = new URLSearchParams(location.search);
  const fromQuery = {
    sleepAverage: finiteNumber(params.get("sleepAverage"), 0, 24),
    sleepDays: finiteNumber(params.get("sleepDays"), 0, 7),
    balancedMeals: finiteNumber(params.get("balancedMeals"), 0, 35),
    mealGoal: finiteNumber(params.get("mealGoal"), 1, 35),
    vegetableDays: finiteNumber(params.get("vegetableDays"), 0, 7)
  };
  if (Object.values(fromQuery).every(value => value !== null)) return { ...fromQuery, isDemo: false };

  try {
    const saved = JSON.parse(localStorage.getItem("weeklyHealthSummary") || "null");
    if (saved) {
      const clean = {
        sleepAverage: finiteNumber(saved.sleepAverage, 0, 24), sleepDays: finiteNumber(saved.sleepDays, 0, 7),
        balancedMeals: finiteNumber(saved.balancedMeals, 0, 35), mealGoal: finiteNumber(saved.mealGoal, 1, 35),
        vegetableDays: finiteNumber(saved.vegetableDays, 0, 7)
      };
      if (Object.values(clean).every(value => value !== null)) return { ...clean, isDemo: false };
    }
  } catch (error) { console.warn("無法讀取本週摘要：", error); }
  return { ...DEMO_SUMMARY, isDemo: true };
}

function getWeekRange() {
  const today = new Date();
  const day = today.getDay() || 7;
  const monday = new Date(today); monday.setDate(today.getDate() - day + 1);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const format = date => `${date.getMonth() + 1}/${date.getDate()}`;
  return `${format(monday)}－${format(sunday)} 的生活小結`;
}

function sleepFeedback(hours, days) {
  if (days < 3) return { status:"再多記幾天", detail:`目前有 ${days} 天紀錄，多一點資料會更了解自己的節奏。`, score:days / 7 };
  if (hours >= 7 && hours <= 9) return { status:"節奏很穩定", detail:"睡眠時間落在舒服的區間，這份照顧很值得延續。", score:1 };
  if (hours < 7) return { status:"需要多一點休息", detail:"幾個晚上似乎睡得少了些，身體可能正在等你慢下來。", score:hours / 7 };
  return { status:"睡得很充足", detail:"休息時間很充裕，也可以留意醒來後是否同樣有精神。", score:1 };
}

function foodFeedback(meals, goal, vegetableDays) {
  const ratio = Math.min(meals / goal, 1);
  if (ratio >= .8) return { status:"照顧得很不錯", detail:`有 ${meals} 餐吃得均衡，日常裡的每個選擇都算數。`, score:ratio };
  if (vegetableDays >= 3) return { status:"正在慢慢累積", detail:`已有 ${vegetableDays} 天記得吃蔬菜，不需要完美也能前進。`, score:ratio };
  return { status:"從一餐開始就好", detail:"忙碌時飲食很容易被擱後，下一餐補上一份蔬菜就很好。", score:ratio };
}

function buildTips(summary) {
  const tips = [];
  if (summary.sleepAverage < 7) tips.push(["☾","替休息留一個位置","挑兩天比平常早 20 分鐘放下手機，讓身體慢慢準備入睡。"]) ;
  else tips.push(["☾","把舒服的節奏留下來","試著維持現在的上床時間，你已經找到適合自己的步調。"]) ;
  if (summary.balancedMeals / summary.mealGoal < .8) tips.push(["🥬","先照顧下一餐","不必補償過去，只要在下一餐加一份蔬菜或一個原型食物。"]) ;
  else tips.push(["🥣","好好感受每一餐","延續均衡之外，也留意飽足感，舒服地吃完就是很好的照顧。"]) ;
  tips.push(["♡","把自己也放進行程裡","選一件五分鐘就能做到的小事：伸展、喝水，或安靜呼吸一下。"]) ;
  return tips;
}

function render(summary) {
  const sleep = sleepFeedback(summary.sleepAverage, summary.sleepDays);
  const food = foodFeedback(summary.balancedMeals, summary.mealGoal, summary.vegetableDays);
  document.querySelector("#dateRange").textContent = getWeekRange();
  document.querySelector("#demoNotice").hidden = !summary.isDemo;
  document.querySelector("#sleepHours").textContent = summary.sleepAverage.toFixed(1);
  document.querySelector("#sleepStatus").textContent = sleep.status;
  document.querySelector("#sleepDetail").textContent = sleep.detail;
  document.querySelector("#sleepProgress").style.width = `${Math.round(Math.min(sleep.score, 1) * 100)}%`;
  document.querySelector("#balancedMeals").textContent = summary.balancedMeals;
  document.querySelector("#foodStatus").textContent = food.status;
  document.querySelector("#foodDetail").textContent = food.detail;
  document.querySelector("#foodProgress").style.width = `${Math.round(food.score * 100)}%`;
  const needsRest = summary.sleepAverage < 7;
  const title = needsRest ? "你已經撐過忙碌的一週，今晚可以對自己溫柔一點。" : "你一點一點照顧自己的樣子，真的很值得肯定。";
  document.querySelector("#warmTitle").textContent = title;
  document.querySelector("#tipList").innerHTML = buildTips(summary).map(([icon, heading, copy]) => `<article class="tip"><span class="tip-icon" aria-hidden="true">${icon}</span><div><strong>${heading}</strong><p>${copy}</p></div></article>`).join("");
}

function showToast(message) { toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2800); }

async function initialiseLiff() {
  if (!LIFF_ID || !window.liff) return;
  try {
    await liff.init({ liffId: LIFF_ID });
    // LINE 內開啟時才觸發登入；一般瀏覽器仍可預覽週報畫面。
    if (!liff.isLoggedIn()) {
      if (liff.isInClient()) liff.login();
      return;
    }
    lineProfile = await liff.getProfile();
    document.querySelector("#lineStatus").textContent = lineProfile.displayName;
    document.querySelector("#greetingName").textContent = `${lineProfile.displayName}，嗨`;
  } catch (error) { console.warn("LIFF 初始化失敗：", error); }
}

document.querySelector("#shareButton").addEventListener("click", async () => {
  const message = document.querySelector("#warmTitle").textContent;
  try {
    if (window.liff?.isInClient() && liff.isApiAvailable("shareTargetPicker")) {
      await liff.shareTargetPicker([{ type:"text", text:`我的本週健康小結：\n${message}\n也提醒你，今天對自己溫柔一點 🌿` }]);
      showToast("鼓勵已分享");
    } else if (navigator.share) await navigator.share({ title:"本週健康小結", text:message, url:location.href });
    else { await navigator.clipboard.writeText(message); showToast("鼓勵文字已複製"); }
  } catch (error) { if (error?.name !== "AbortError") showToast("目前無法分享，請稍後再試"); }
});

render(getSummary());
initialiseLiff();
