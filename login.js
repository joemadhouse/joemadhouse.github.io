let STAFF = []; // 用於存儲從 Excel 讀取的所有員工資料
let GLOBAL_PWD = ''; // 用於存儲從 Excel 讀取的全域密碼

// ===== DOM 元素提取 =====
const userSel  = document.getElementById('userSel');   // 獲取使用者選擇下拉選單的元素
const pwdInput = document.getElementById('pwd');      // 獲取密碼輸入框的元素
const loginBtn = document.getElementById('loginBtn'); // 獲取登入按鈕的元素

/**
 * 非同步載入並解析 staff_permissions.xlsx 檔案。
 * 這個函數會：
 * 1. 使用 fetch API 讀取位於 './staff_list/staff_permissions.xlsx' 的 Excel 檔案。
 * 2. 使用 XLSX (js-xlsx) 函式庫解析檔案內容。
 * 3. 從表頭提取全域密碼 (GLOBAL_PWD)。
 * 4. 遍歷工作表中的每一行，將有效的員工資料（使用者名稱和權限）存入 STAFF 陣列。
 * 5. 動態填充使用者選擇下拉選單（userSel），並顯示員工姓名和權限等級。
 * 6. 如果讀取或解析失敗，則會捕獲錯誤，並在介面上顯示錯誤訊息。
 */
async function loadStaffExcel() {
  try {
    // 透過 fetch API 請求 Excel 檔案
    const res = await fetch('./staff_list/staff_permissions.xlsx');
    // 如果請求失敗（例如檔案不存在），則拋出錯誤
    if (!res.ok) throw new Error('讀取失敗');
    // 將回應內容轉換為 ArrayBuffer（二進位格式）
    const buf = await res.arrayBuffer();
    // 使用 XLSX 函式庫讀取 ArrayBuffer
    const wb = XLSX.read(buf, { type: 'array' });
    // 獲取第一個工作表
    const sheet = wb.Sheets[wb.SheetNames[0]];

    // 將工作表轉換為二維陣列（JSON 格式），header: 1 表示第一行為標頭
    const rowsA = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    // 獲取第一行（標頭行）
    const headerRow = rowsA[0] || [];
    // 從標頭行的第三個儲存格（索引為 2）提取全域密碼，並去除前後空白
    GLOBAL_PWD = String(headerRow[2] || '').trim();

    // 初始化員工資料陣列
    STAFF = [];
    // 從第二行開始遍歷所有行（第一行是標頭）
    for (let i = 1; i < rowsA.length; i++) {
      const row = rowsA[i];
      // 提取第一個儲存格（索引 0）作為使用者名稱，並去除空白
      const user = String((row[0] ?? '')).trim();
      // 提取第二個儲存格（索引 1）作為權限值，並轉為數字
      const perm = Number(row[1]);
      // 如果使用者名稱存在，且權限值為 0 或 1，則視為有效員工，加入 STAFF 陣列
      if (user && (perm===0 || perm===1)) STAFF.push({ user, perm });
    }

    // 清空使用者下拉選單的現有選項
    userSel.innerHTML = '';
    // 遍歷 STAFF 陣列，為每個員工創建一個下拉選項
    STAFF.forEach(({user, perm})=>{
      const opt = document.createElement('option');
      opt.value = user; // 選項的值設為使用者名稱
      // 選項的顯示文字，包含使用者名稱和權限描述
      opt.textContent = `${user}（perm=${perm}，${perm===0?'清潔工':'檢查員'}）`;
      userSel.appendChild(opt); // 將選項加入下拉選單
    });

    // 檢查是否有員工資料，以決定是否啟用相關 UI 元件
    const enabled = STAFF.length > 0;
    userSel.disabled = !enabled;  // 如果沒有員工，禁用下拉選單
    loginBtn.disabled = !enabled; // 如果沒有員工，禁用登入按鈕

  } catch (e) {
    // 如果 try 區塊中發生任何錯誤，則執行此處的程式碼
    console.error(e); // 在控制台輸出錯誤訊息
    userSel.innerHTML = ''; // 清空下拉選單
    const opt = document.createElement('option');
    // 在下拉選單中顯示錯誤訊息
    opt.textContent = '讀取失敗：請確認 staff_list/staff_permissions.xlsx 存在';
    userSel.appendChild(opt);
    // 禁用相關 UI 元件
    userSel.disabled = true;
    loginBtn.disabled = true;
  }
}
// 函式 loadStaffExcel 結束

/**
 * 處理登入成功後的頁面跳轉。
 * @param {object} auth - 包含使用者資訊和權限的驗證物件。
 * 這個函數會：
 * 1. 將驗證物件（auth）轉換為 JSON 字串。
 * 2. 將該字串存儲在 sessionStorage 中，鍵為 'auth'。
 * 3. 將頁面重新導向到 'index.html'。
 */
function goToIndex(auth) {
  // 使用 sessionStorage 存儲驗證資訊，以便在不同頁面間共享
  sessionStorage.setItem('auth', JSON.stringify(auth));
  // 頁面跳轉到主應用程式頁面
  location.href = 'index.html';
}
// 函式 goToIndex 結束

// 為登入按鈕（loginBtn）添加點擊事件監聽器
loginBtn.addEventListener('click', ()=>{
  // 從下拉選單（userSel）獲取當前選擇的使用者名稱
  const user = userSel.value;
  // 在 STAFF 陣列中查找與所選使用者名稱匹配的員工記錄
  const rec = STAFF.find(s=>s.user===user);
  // 如果找不到記錄，彈出提示並中止執行
  if (!rec) return alert('請選擇使用者');

  // 根據員工的權限（perm）值執行不同的登入邏輯
  if (rec.perm === 0) {
    // 權限為 0（清潔工），直接登入，不需密碼
    // 呼叫 goToIndex，傳入使用者資訊、權限和當前登入時間
    goToIndex({ user: rec.user, perm: rec.perm, loginAt: Date.now() });
  } else if (rec.perm === 1) {
    // 權限為 1（檢查員），需要驗證密碼
    // 如果全域密碼為空，或輸入的密碼與全域密碼匹配
    if (GLOBAL_PWD === '' || pwdInput.value === GLOBAL_PWD) {
      // 密碼正確，呼叫 goToIndex 進行登入
      goToIndex({ user: rec.user, perm: rec.perm, loginAt: Date.now() });
    } else {
      // 密碼錯誤，彈出提示
      alert('密碼錯誤');
    }
  } else {
    // 如果權限值不是 0 或 1，彈出錯誤提示
    alert('權限值錯誤：perm 只能為 0 或 1');
  }
});

// 頁面載入後，立即執行 loadStaffExcel 函數以初始化登入介面
loadStaffExcel();
