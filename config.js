// 掃描頁設定。改這裡就好，不用動 index.html。
window.SCAN_CONFIG = {
  // 頁面頂端的小標題
  SITE_TITLE: '拍貼取件',

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

  // 照片過了保留期限、已經刪除之後，改成 true 再推上去。
  // 不改的話，客人掃 QR 會看到「今晚 8 點前上線」，但其實永遠不會有了。
  EXPIRED: false,
  EXPIRED_TEXT: '照片已經到期刪除',
};
