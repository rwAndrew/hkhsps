# 拍貼取件頁

校慶拍貼攤位的 QR Code 掃描頁。客人掃紙上的 QR → 開啟 `https://hkhsps.vercel.app/p/編號` → 下載照片。

純靜態網站，沒有建置步驟、沒有後端。

## 運作方式

```
QR 內容:  https://www.hkhs.work.gd/#K7WHMX3B.金鑰
                                            └編號─┘ └─128 位元金鑰
              │
              │  # 之後的內容「不會」送給伺服器，GitHub 看不到金鑰
              ▼
index.html 讀 <PHOTO_BASE>/K7WHMX3B/manifest.json
              ├─ 404       → 「今晚 8 點前上線」（EXPIRED 時顯示「已到期刪除」）
              ├─ 連線失敗   → 「連線不太順」＋重試
              └─ 有資料     → 下載 .enc → 用金鑰解密 → 顯示、可下載
```

編號 8 碼，字母表不含 I L O 0 1。編號與金鑰一律轉大寫處理。

## 為什麼照片要加密

GitHub Pages 在免費方案**不支援私人 repo**（倉庫轉私人後，Pages 會自動取消發布）。
所以放照片的 repo 必須是公開的 —— 任何人都能在 github.com 上瀏覽完整的檔案清單。

因此上傳前每個檔案都用 **AES-128-GCM** 加密：

| | |
|---|---|
| 金鑰 | 每組一把，128 位元，在**印 QR 的當下**產生 |
| 金鑰在哪 | 只在客人手上那張紙的 QR 裡（網址 `#` 之後） |
| 金鑰推導 | `SHA-256(金鑰:編號)` 取前 16 bytes |
| 檔案格式 | `[12 bytes IV][密文 + 16 bytes 驗證標籤]` |
| 沒有金鑰 | 檔案就是亂碼。AES-GCM 會驗證內容，錯的金鑰解不開而不是吐垃圾 |

**金鑰弄丟 = 那組照片永遠解不開。** 攤位端存兩份：
`output/<編號>/金鑰.txt` 和 `output/紀錄.csv` 的最後一欄。這兩個都**絕對不能上傳**。

## 檔案

| 檔案 | 作用 |
|---|---|
| `index.html` | 整個頁面（樣式與邏輯都在裡面） |
| `config.js` | 可改的設定：標題、「上線時間」文字、照片放哪 |
| `robots.txt` | 同上，雙保險 |

## 介面

黑底花紋壁紙、香檳金宋體標題、奶油色內文。視覺語言參考驚喜製造《微醺大飯店》官網（花紋與圖案全部是自己畫的）。手機單欄；螢幕寬 880px 以上改兩欄（左圖右操作）。

| 裝飾 | 用在哪 |
|---|---|
| 飾線標題 `——◇ 原始照片 ◇——` | 章節標題 |
| 票根（兩側缺口、中間虛線） | 取件編號 |
| 三步進度（拍攝 ✓ → 整理中 → 取件） | 「還沒上線」畫面 |
| 雙層金框 | 成品圖 |

**操作優先於裝飾**：奶油色底黑字的主按鈕是整頁對比最高的元素；「下載拍貼圖」在 375×667、375×740、375×812 三種手機高度下都完整落在第一屏內（成品圖的高度會跟著螢幕高度縮放）。主要文字對比度都在 5:1 以上。

想換回白底簡約版：`git checkout 04fe168 -- index.html`（白底版的最後一個 commit，**有解密功能**）。
⚠ 不要用更早的 commit：`e06eba6` 之前的白底版沒有解密，換回去照片會全部打不開。

| 功能 | 說明 |
|---|---|
| 骨架載入 | 等資料時顯示灰色骨架，不是空白或轉圈 |
| 點圖放大 | 成品圖與每張原始照片都能點開放大，裡面也有下載鈕 |
| 存到相簿或分享 | 只在瀏覽器支援分享檔案時出現（多數手機），可直接「儲存影像」進相簿 |
| 全部下載 | 把原始照片打包成一個 zip（不壓縮，JPEG 本來就壓過了），不需要任何套件 |
| 重新檢查 | 還沒上線時按下去會有回饋（按鈕狀態、提示、檢查時間），不會像沒反應 |

字型用系統字型，沒有載入任何外部字型或腳本，所以不洩漏訪客的連線資訊給第三方。標題的宋體在各裝置上會略有不同：iPhone 用「宋體-繁」、Android 用 Noto Serif、Windows 用新細明體。

## 照片資料格式

每組一個資料夾，資料夾名稱就是取件編號（大寫）：

```
data/
└── 95CA6/
    ├── manifest.json
    ├── composite.jpg      成品圖
    ├── 1.jpg              原始照片
    ├── 2.jpg
    └── 3.jpg
```

`manifest.json`：

```json
{
  "composite": "composite.jpg",
  "photos": ["1.jpg", "2.jpg", "3.jpg"]
}
```

- 檔名不能含 `/` 或 `\`，頁面會直接忽略。
- **`manifest.json` 最後才上傳。** 頁面以它存不存在判斷「上線了沒」，
  所以它先於照片出現的話，客人會看到破圖。

## 架構：兩個公開的 GitHub repo

```
repo  hkhsps          網頁程式  → https://www.hkhs.work.gd/          （自訂網域，DNSExit）
repo  hkhsps-photos   加密照片  → https://rwandrew.github.io/hkhsps-photos/data/…
```

兩者**不同來源**，照片是跨來源讀取。這可行，因為 GitHub Pages 的 200 回應都帶
`Access-Control-Allow-Origin: *`；404 沒帶，頁面對這個情況有補救（見下方）。
所以 `config.js` 的 `PHOTO_BASE` 必須是完整網址，不能寫相對路徑。

### 自訂網域的來龍去脈（別重蹈覆轍）

- 用的是 **`www.hkhs.work.gd`**，不是 `hkhs.work.gd`。`hkhs.work.gd` 是 DNSExit 的**區域根**
  （自帶 NS/SOA 記錄），DNS 規定根上不能放 CNAME（DNSExit 的錯誤訊息：`CNAME and other data`），
  只能用 A 記錄，結果 GitHub 的憑證一直卡在 `dns_changed`。
- `www` 是真正的子網域，用 CNAME 指向 `rwandrew.github.io`，憑證很快就發下來。
  憑證涵蓋 `hkhs.work.gd` 與 `www.hkhs.work.gd`，根網域會 301 到 `www`。
- DNSExit 的 **Dynamic DNS 要保持關閉**，否則它會把記錄改回你家的 IP。
- ⚠ **自訂網域一旦設定，`rwandrew.github.io/hkhsps/` 會 301 轉到自訂網域，不能當備援。**
  `work.gd` 是 DNSExit 的免費網域，哪天它不解析了，印在紙上的 QR 就全部失效。

- **刪照片 = 刪 `hkhsps-photos` 這個 repo**，一個動作，頁面不受影響。
- **`hkhsps` 不要刪。** 刪掉之後這個網址很可能會被釋放（我沒查證 GitHub 的實際規則），
  別人就有機會註冊它，讓所有掃舊 QR 的人看到他想給的東西。
  這個 repo 只有程式碼，留著沒有任何隱私風險。
- 照片不進 `hkhsps`：`.gitignore` 擋掉了 `data/` 和所有圖片。

### 部署

兩個 repo 都要：**Settings → Pages → Source 選 `main` 分支的根目錄**。
照片 repo 由主系統的 `匯出上線.bat` 產生，裡面已經含 `.nojekyll`
（沒有它，GitHub Pages 會用 Jekyll 處理整個站）。

上傳後**一定要驗證**：

```
node export-web.js --check https://rwandrew.github.io/hkhsps-photos
```

這個檢查除了確認網址通、編號對，最重要的是**檢查檔案是不是真的加密過**。
萬一有明碼的 JPEG 被推上公開的 repo，它會跳 🚨 並要你立刻刪掉整個 repo。

## 保留期限到了之後

1. 到 GitHub 刪掉 `hkhsps-photos` 整個 repo
2. 把 `config.js` 的 `EXPIRED` 改成 `true`，推上 `hkhsps`
3. **不要刪 `hkhsps`**，理由見上面

## 頁面怎麼判斷「還沒上傳」

`manifest.json` 回 404 就是「還沒上傳」，連不上才是「網路有問題」。
兩個 repo 同源，所以不會有 CORS 造成的誤判；跨來源的備援探測仍然留著，
以後若把照片搬到別的主機也能用。

⚠️ **頁面裡的 `<script src>` 必須用相對路徑。** GitHub Pages 的專案站掛在
`/<repo>/` 底下，寫成 `/config.js` 會指到網域根目錄而 404。

## 部署到 Vercel

1. 登入 [vercel.com](https://vercel.com)（可用 GitHub 帳號）
2. **Add New → Project** → 匯入這個 repo
3. Framework Preset 選 **Other**，Build Command 和 Output Directory 都留空
4. Deploy
5. 到 **Settings → Domains** 確認網址是 `hkhsps.vercel.app`
   （子網域被別人用掉的話會不同，QR 內容要跟著改，見下方）

如果網址不是 `hkhsps.vercel.app`，要改主系統 `config.json` 的 `baseUrl`，
**而且要在印任何 QR 之前改**，印出去的就改不了了。

## 上線前檢查

- [x] 大寫路徑 `/P/XXXXXXXX`（QR 實際會用的形式）會到頁面，不是 Vercel 的 404
- [ ] 手機掃一張測試 QR，確認會到這個頁面
- [ ] 上傳一組真的資料，確認會顯示照片，且「下載」「全部下載」都有反應
- [ ] `node export-web.js --check https://<專案B網址>` 全部通過
- [ ] 用一個不存在的編號開，確認顯示「今晚 8 點前上線」而不是「連線不太順」
- [ ] iPhone 與 Android 各測一次「存到相簿或分享」
