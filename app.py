import csv
import os
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, session, flash

app = Flask(__name__)
app.secret_key = 'your_very_secret_key_change_this'

LOG_DIR = 'log'

# --- User Management Functions (No Change) ---
def get_user_data():
    """從 CSV 檔案讀取使用者資料"""
    users = {}
    password = None
    try:
        with open('users.csv', mode='r', encoding='utf-8-sig') as infile:
            reader = csv.reader(infile)
            header = next(reader)
            
            first_row_line = infile.readline()
            if not first_row_line: return {}, None, []
            first_row = first_row_line.strip().split(',')
            password = first_row[2]
            
            infile.seek(0)
            next(reader) # Skip header again

            for row in reader:
                if row:
                    users[row[0]] = {'permission': int(row[1])}

    except (FileNotFoundError, StopIteration):
        return {}, None, []
        
    sorted_user_ids = sorted(users.keys())
    return users, password, sorted_user_ids

# --- New Task and Logging Functions ---

def get_cleaning_schedule():
    """讀取 cleaning.csv 的清潔計畫"""
    schedule = []
    with open('cleaning.csv', mode='r', encoding='utf-8-sig') as infile:
        reader = csv.DictReader(infile)
        for row in reader:
            schedule.append(row)
    return schedule

def check_task_for_date(task, check_date):
    """根據頻率規則，檢查某任務是否適用於某天"""
    freq = task['frequency'].lower().split('-')
    rule = freq[0]
    
    if rule == 'daily':
        return True # 每日任務
    
    if rule == 'every': # every-N-days
        # 這是一個簡化的計算，需要一個基準日來精確計算
        # 暫時用年份中的第幾天來做判斷
        day_of_year = check_date.timetuple().tm_yday
        interval = int(freq[1])
        return day_of_year % interval == 0

    if rule == 'weekly': # weekly-mon-1
        # 0=Mon, 1=Tue, ..., 6=Sun
        weekday_map = {'mon': 0, 'tue': 1, 'wed': 2, 'thu': 3, 'fri': 4, 'sat': 5, 'sun': 6}
        target_weekday = weekday_map.get(freq[1])
        return check_date.weekday() == target_weekday
        
    return False

def get_or_create_daily_log(date_str):
    """
    核心函數：取得或建立某一天的日誌。
    如果日誌不存在，則從 cleaning.csv 生成當天任務並寫入。
    """
    check_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    year = str(check_date.year)
    month_str = check_date.strftime('%Y%m')
    
    # 確保 log/YYYY/ 目錄存在
    year_dir = os.path.join(LOG_DIR, year)
    os.makedirs(year_dir, exist_ok=True)
    
    log_filepath = os.path.join(year_dir, f"{month_str}_log.csv")
    
    log_header = ['date', 'location_code', 'location_name', 'team', 'is_completed', 'completed_by', 'completion_time', 'is_verified', 'verified_by']
    
    # 讀取現有日誌到記憶體
    all_logs = []
    if os.path.exists(log_filepath):
        with open(log_filepath, 'r', encoding='utf-8-sig', newline='') as f:
            reader = csv.DictReader(f)
            all_logs = list(reader)

    # 檢查當天的任務是否已經生成過
    tasks_for_date_exist = any(row['date'] == date_str for row in all_logs)
    
    if not tasks_for_date_exist:
        # 如果不存在，則生成新任務
        schedule = get_cleaning_schedule()
        new_tasks = []
        for task in schedule:
            if check_task_for_date(task, check_date):
                # 根據頻率規則，將任務加入列表
                new_tasks.append({
                    'date': date_str,
                    'location_code': task['location_code'],
                    'location_name': task['location_name'],
                    'team': task['team'],
                    'is_completed': '0',
                    'completed_by': '',
                    'completion_time': '',
                    'is_verified': '0',
                    'verified_by': ''
                })
        
        if new_tasks:
            all_logs.extend(new_tasks)
            # 將新任務寫回檔案
            with open(log_filepath, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=log_header)
                writer.writeheader()
                writer.writerows(all_logs)

    # 從所有日誌中篩選出當天的任務並返回
    return [row for row in all_logs if row['date'] == date_str]


# --- Flask Routes ---

@app.route('/', methods=['GET', 'POST'])
def login():
    # 如果已經登入，直接導向日曆
    if 'userid' in session:
        return redirect(url_for('calendar'))

    users, global_password, sorted_user_ids = get_user_data()
    
    if not users:
        flash('系統錯誤: 找不到使用者資料 (users.csv)。')
        return render_template('login.html', users=[])

    if request.method == 'POST':
        userid = request.form['userid']
        password = request.form['password']
        user_info = users.get(userid)

        if not user_info:
            flash('無效的使用者')
            return redirect(url_for('login'))

        permission = user_info['permission']

        # 權限為 1 (檢查員) 需要驗證密碼
        if permission == 1:
            if password == global_password:
                session['userid'] = userid
                session['permission'] = permission
                return redirect(url_for('calendar'))
            else:
                flash('密碼錯誤')
                return redirect(url_for('login'))
        # 權限為 0 (清潔工) 直接登入
        else:
            session['userid'] = userid
            session['permission'] = permission
            return redirect(url_for('calendar'))

    return render_template('login.html', users=sorted_user_ids)

@app.route('/calendar')
def calendar():
    # 如果未登入，導向登入頁面
    if 'userid' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', user_permission=session.get('permission'))

@app.route('/tasks/<date_str>', methods=['GET', 'POST'])
def task_list(date_str):
    if 'userid' not in session:
        return redirect(url_for('login'))

    if request.method == 'POST':
        # --- 處理提交的任務 ---
        completed_codes = request.form.getlist('completed_tasks')
        userid = session['userid']
        completion_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # 讀取整個月份的日誌
        check_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        year = str(check_date.year)
        month_str = check_date.strftime('%Y%m')
        log_filepath = os.path.join(LOG_DIR, year, f"{month_str}_log.csv")
        
        all_logs = []
        if os.path.exists(log_filepath):
            with open(log_filepath, 'r', encoding='utf-8-sig', newline='') as f:
                reader = csv.DictReader(f)
                all_logs = list(reader)
        
        # 更新被提交的任務狀態
        for log in all_logs:
            if log['date'] == date_str and log['location_code'] in completed_codes:
                log['is_completed'] = '1'
                log['completed_by'] = userid
                log['completion_time'] = completion_time
        
        # 寫回整個檔案
        log_header = ['date', 'location_code', 'location_name', 'team', 'is_completed', 'completed_by', 'completion_time', 'is_verified', 'verified_by']
        with open(log_filepath, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=log_header)
            writer.writeheader()
            writer.writerows(all_logs)
            
        flash('任務已成功提交！')
        return redirect(url_for('task_list', date_str=date_str))

    # --- 顯示任務列表 (GET request) ---
    daily_tasks = get_or_create_daily_log(date_str)
    return render_template('tasks.html', date=date_str, tasks=daily_tasks)


@app.route('/logout')
def logout():
    session.pop('userid', None)
    session.pop('permission', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)
