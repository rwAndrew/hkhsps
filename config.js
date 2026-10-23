// 掃描頁設定。改這裡就好，不用動 index.html。
window.SCAN_CONFIG = {
  // 頁面頂端的標題，與標題上方的英文小標（留空字串就不顯示英文小標）
  SITE_TITLE: '拍貼取件',
  SITE_EN: 'PHOTO STRIP',

  // 照片還沒上傳時顯示的大字
  READY_TEXT: '今晚 8 點前上線',

  // 照片放在哪。頁面會去讀 <PHOTO_BASE>/<編號>/manifest.json
  //
  // 照片在另一個 GitHub repo（hkhsps-photos）。要寫「完整網址」，不能寫 '/hkhsps-photos/data'：
  // 這個頁面掛在自訂網域 www.hkhs.work.gd 底下，相對路徑會指到
  // www.hkhs.work.gd/hkhsps-photos/…，但照片 repo 不會跟著搬過來，結果永遠顯示「還沒上線」。
  //
  // 跨來源讀取沒問題：GitHub Pages 的 200 回應都帶 Access-Control-Allow-Origin: *。
  // 404 沒帶，頁面對這種情況有補救邏輯（見 index.html 的 probe）。
  // 上傳後用 `node export-web.js --check https://rwandrew.github.io/hkhsps-photos` 驗證。
  PHOTO_BASE: 'https://rwandrew.github.io/hkhsps-photos/data',

  // 意見箱：填了 Google 表單的連結（https 開頭），取件頁就會多一個「去填意見」的按鈕。
  // 留空字串 = 完全不顯示。表單怎麼建、怎麼接 Discord，看主系統資料夾的「意見箱\設定說明.md」。
  FEEDBACK_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSdVGIr9NuNEbbCYeJU7LWlm25H6AFhAaJKsX3TeaO6TiaHrXQ/viewform',
  FEEDBACK_ENTRY: '150516863',   // 表單那一題的欄位編號；留空就退回成「去填意見」按鈕
  // 首頁文案。只寫想改的項目就好，沒寫的用預設值。*星號* 包住的字變金色，\n 是換行。
  HOME: {
    title: '小港高中',
    subtitle: '校慶拍貼',
    gateQuestion: '按下快門，你會想起誰？',
    t1: '走過這裡的人，\n都會想起一個人',
    t2: '你——\n會想起*哪位老師*？',
    motto: '願這一格，替你記得。',
    signature: '港中攝影組 全體人員',
    ask: '如果只能選一位，\n你最想跟*哪位老師*合照？',
  },
  FEEDBACK_TITLE: '意見箱',
  FEEDBACK_TEXT: '想跟哪位老師合影？告訴我們。',
  FEEDBACK_BUTTON: '去填意見',

  // 照片過了保留期限、已經刪除之後，改成 true 再推上去。
  // 不改的話，客人掃 QR 會看到「今晚 8 點前上線」，但其實永遠不會有了。
  EXPIRED: false,
  EXPIRED_TEXT: '照片已經到期刪除',
};
