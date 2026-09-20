// 掃描頁設定。改這裡就好，不用動 index.html。
window.SCAN_CONFIG = {
  // 頁面頂端的小標題
  SITE_TITLE: '拍貼取件',

  // 照片還沒上傳時顯示的大字
  READY_TEXT: '今晚 8 點前上線',

  // 照片放在哪。頁面會去讀 <PHOTO_BASE>/<編號>/manifest.json
  //   '/data'                       → 跟網站放在一起（照片跟網站一起部署）
  //   'https://xxxx.r2.dev/photos'  → 放在外部儲存空間（需設定 CORS 允許這個網站讀取）
  PHOTO_BASE: '/data',
};
