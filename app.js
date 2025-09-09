// 立即執行的匿名函數，用於保護頁面和歡迎使用者
(function guardAndWelcome(){
  // 從 sessionStorage 中獲取 'auth' 的原始值
  const raw = sessionStorage.getItem('auth');
  // 如果 'auth' 不存在，表示未登入，重新導向到登入頁面
  if (!raw) { location.replace('login.html'); return; }

  let auth;
  try {
    // 嘗試將 'auth' 的 JSON 字串解析為物件
    auth = JSON.parse(raw);
  } catch {
    // 如果解析失敗，將 auth 設為 null
    auth = null;
  }
  // 檢查 auth 物件是否有效（是否存在、使用者名稱是否為字串、權限是否為 0 或 1）
  if (!auth || typeof auth.user!=='string' || (auth.perm!==0 && auth.perm!==1)) {
    // 如果驗證失敗，從 sessionStorage 中移除 'auth'
    sessionStorage.removeItem('auth');
    // 重新導向到登入頁面
    location.replace('login.html');
    return;
  }

  // 定義六小時的毫秒數
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  // 檢查登入時間是否已超過六小時
  if (Date.now() - (auth.loginAt||0) > SIX_HOURS) {
    // 如果登入已過期，彈出提示
    alert('登入已過期，請重新登入。');
    // 從 sessionStorage 中移除 'auth'
    sessionStorage.removeItem('auth');
    // 重新導向到登入頁面
    location.replace('login.html');
    return;
  }

  // 獲取 ID 為 'welcomeHeader' 的元素
  const header = document.getElementById('welcomeHeader');
  // 如果該元素存在，則設定其文字內容以歡迎使用者
  if (header) header.textContent = `歡迎! ${auth.user}（${auth.perm===0?'清潔工':'檢查員'}）`;
  // 將驗證物件 'auth' 賦值給全域變數 __AUTH__，方便在其他地方使用
  window.__AUTH__ = auth;
})();
// 函式 guardAndWelcome 結束

// 為 ID 為 'logoutBtn' 的元素（如果存在）添加點擊事件監聽器
document.getElementById('logoutBtn')?.addEventListener('click', ()=>{
  // 從 sessionStorage 中移除 'auth'
  sessionStorage.removeItem('auth');
  // 重新導向到登入頁面
  location.replace('login.html');
});

// ===== 小工具函式 =====
const pad = n => String(n).padStart(2, '0'); // 將數字轉為兩位數的字串（例如 5 -> "05"）
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; // 將 Date 物件格式化為 "YYYY-MM-DD"
const startOfMonth = d => new Date(d.getFullYear(), d.getMonth(), 1); // 獲取某個日期所在月份的第一天
const addMonths = (d, k) => new Date(d.getFullYear(), d.getMonth() + k, 1); // 將日期增加或減少 k 個月
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate(); // 獲取某年某月的天數

// ===== 狀態 =====
const today = new Date(); // 獲取今天的日期
let cursor = startOfMonth(today); // 設定日曆當前顯示的月份，初始為本月

// ===== DOM 元素提取 =====
const cal = document.getElementById('cal');         // 獲取日曆表格的元素
const prev = document.getElementById('prev');       // 獲取「上個月」按鈕的元素
const next = document.getElementById('next');       // 獲取「下個月」按鈕的元素
const monthSel = document.getElementById('month');  // 獲取月份選擇下拉選單的元素
const yearSel  = document.getElementById('year');   // 獲取年份選擇下拉選單的元素
const btnToday = document.getElementById('today');  // 獲取「今天」按鈕的元素

/**
 * 填充年份下拉選單。
 * @param {number} center - 中心年份。
 * 這個函數會：
 * 1. 清空年份下拉選單（yearSel）的現有選項。
 * 2. 以 center 年份為中心，生成前後各 12 年的年份選項。
 * 3. 將這些選項添加到下拉選單中。
 */
function fillYears(center) {
  // 清空下拉選單
  yearSel.innerHTML = '';
  // 循環生成年份選項
  for (let y = center - 12; y <= center + 12; y++) {
    const opt = document.createElement('option');
    opt.value = y; // 選項的值
    opt.textContent = y; // 選項的顯示文字
    yearSel.appendChild(opt); // 添加到下拉選單
  }
}
// 函式 fillYears 結束

/**
 * 根據 cursor 的值繪製日曆。
 * 這個函數會：
 * 1. 獲取 cursor 的年份和月份。
 * 2. 同步更新年份和月份的下拉選單。
 * 3. 清空日曆表格（cal）。
 * 4. 創建表頭（Sun, Mon, ..., Sat）。
 * 5. 計算該月的第一天是星期幾，以及總共有幾天。
 * 6. 遍歷 5 週 x 7 天的網格，填充日期。
 * 7. 為當天的日期添加 'today' class。
 * 8. 為每個日期儲存格添加點擊事件。
 */
function draw() {
  // 獲取當前 cursor 的年份和月份
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  // 如果年份下拉選單中沒有當前年份，則重新填充
  if (![...yearSel.options].some(o => Number(o.value) === y)) fillYears(y);
  // 設定下拉選單的值
  yearSel.value = y;
  monthSel.value = m;

  // 清空日曆表格
  cal.innerHTML = '';

  // 創建表頭
  const head = cal.insertRow();
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(txt => {
    const th = document.createElement('th');
    th.textContent = txt;
    head.appendChild(th);
  });

  // 獲取該月的總天數
  const totalDays = daysInMonth(y, m);
  // 獲取該月第一天是星期幾 (0=Sun, 1=Mon, ...)
  const firstDay = new Date(y, m, 1).getDay();
  // 日期計數器，從 1 開始
  let dayCounter = 1;

  // 繪製 5 週
  for (let w = 0; w < 5; w++) {
    const row = cal.insertRow();
    // 繪製 7 天
    for (let d = 0; d < 7; d++) {
      const td = row.insertCell();
      const cellIndex = w * 7 + d;
      // 判斷儲存格是否應該填入日期
      if (cellIndex >= firstDay && dayCounter <= totalDays) {
        const thisDate = new Date(y, m, dayCounter);
        td.textContent = dayCounter; // 顯示日期
        td.className = 'cell'; // 添加 class
        // 如果是今天，添加 'today' class
        if (ymd(thisDate) === ymd(today)) td.classList.add('today');
        // 添加點擊事件
        td.onclick = () => alert('Selected: ' + ymd(thisDate));
        dayCounter++; // 日期計數器加一
      } else {
        // 非本月日期的儲存格留空
        td.textContent = '';
      }
    }
  }
}
// 函式 draw 結束

// ===== 事件監聽器 =====
// 上個月按鈕
prev.onclick = () => { cursor = addMonths(cursor, -1); draw(); };
// 下個月按鈕
next.onclick = () => { cursor = addMonths(cursor,  1); draw(); };
// 月份下拉選單變更
monthSel.onchange = e => { cursor = new Date(cursor.getFullYear(), Number(e.target.value), 1); draw(); };
// 年份下拉選單變更
yearSel.onchange  = e => { cursor = new Date(Number(e.target.value), cursor.getMonth(), 1); draw(); };
// 今天按鈕
btnToday.onclick  = () => { cursor = startOfMonth(new Date()); draw(); };

// ===== 啟動 =====
// 頁面載入後，立即填充年份下拉選單
fillYears(cursor.getFullYear());
// 繪製初始日曆
draw();
