# HealthyRobot：Flex Message、LIFF 與 n8n 串接

## 流程

1. LINE 將使用者事件送至 n8n 的 `line-health-bot` Webhook。
2. 使用者加入好友或輸入「設定資料／健康資料／建立檔案／開始設定」時，n8n 回覆 Flex Message。
3. Flex Message 的按鈕開啟 LIFF：`https://liff.line.me/2010801069-26iRMu35`。
4. 使用者送出表單後，LIFF 將資料 POST 至 n8n 的 `health-profile` Webhook。
5. n8n 依 `recordType` 驗證基本資料或睡眠品質，並回傳成功結果。

第二頁送出的睡眠欄位包含 `bedTime`、`wakeTime`、`durationMinutes`、`durationHours`、`energyLevel`、`dreamNote`、`lineUserId` 與 `recordedAt`，並使用 `recordType: "sleepQuality"` 與基本資料共用相同 Webhook。

## 匯入與設定

1. 在 n8n 選擇 **Import from File**，匯入 `n8n-flex-liff-workflow.json`。
2. 開啟「回覆 LINE Flex Message」節點。
3. 將 `Bearer REPLACE_WITH_CHANNEL_ACCESS_TOKEN` 改成 LINE Messaging API 的 Channel access token。正式環境建議改用 n8n Credential，不要把 token 寫入 workflow 或 GitHub。
4. 啟用 workflow，複製「LINE Webhook」的 Production URL。
5. 在 LINE Developers → Messaging API → Webhook URL 貼上該 Production URL，然後啟用 **Use webhook**。
6. 複製「LIFF 健康資料 Webhook」的 Production URL，格式通常為：

   `https://你的-n8n-網域/webhook/health-profile`

7. 將此 URL 填入 `app.js` 的 `PROFILE_WEBHOOK_URL`，再部署 GitHub Pages。

## 安全提醒

- 不要把 Channel secret 或 Channel access token 提交到 GitHub。
- 上線前應在 n8n 驗證 LINE 的 `x-line-signature`，避免偽造 Webhook 請求。
- 目前 workflow 只驗證並回傳健康資料，尚未永久寫入資料庫；可在「驗證健康資料」後加入 Supabase、PostgreSQL、Google Sheets 或 n8n Data Table 節點。
