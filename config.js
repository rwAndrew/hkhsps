// 掃描頁設定。改這裡就好，不用動 index.html。
window.SCAN_CONFIG = {
  // 頁面頂端的小標題
  SITE_TITLE: '拍貼取件',

  // 照片還沒上傳時顯示的大字
  READY_TEXT: '今晚 8 點前上線',

  // 照片放在哪。頁面會去讀 <PHOTO_BASE>/<編號>/manifest.json
  //   '/data'                                  照片跟這個網站放在一起
  //   'https://hkhsps-photos.vercel.app/data'  照片放在另一個 Vercel 專案（建議，見 README）
  // 放在另一個網站時，那邊要允許這個網站讀取（CORS）。
  // 匯出工具產生的 vercel.json 已經設好了，上傳後用 `node export-web.js --check` 驗證。
  PHOTO_BASE: '/data',

  // 照片過了保留期限、已經刪除之後，改成 true 再推上去。
  // 不改的話，客人掃 QR 會看到「今晚 8 點前上線」，但其實永遠不會有了。
  EXPIRED: false,
  EXPIRED_TEXT: '照片已經到期刪除',
};
