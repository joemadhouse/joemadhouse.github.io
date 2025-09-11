document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('.grid');
    const yearSelect = document.getElementById('year-select');
    const monthSelect = document.getElementById('month-select');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const todayBtn = document.getElementById('today-btn');

    let currentDate = new Date();

    function renderCalendar(year, month) {
        grid.innerHTML = ''; // Clear previous calendar
        const firstDayOfMonth = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const startDayOfWeek = firstDayOfMonth.getDay();

        // Update selects
        yearSelect.value = year;
        monthSelect.value = month;

        // Add weekday headers
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.classList.add('weekday');
            dayHeader.textContent = day;
            grid.appendChild(dayHeader);
        });

        // Create empty cells for days before the 1st
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            grid.appendChild(emptyCell);
        }

        // Create buttons for each day
        for (let day = 1; day <= daysInMonth; day++) {
            const dayButton = document.createElement('button');
            dayButton.textContent = day;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            dayButton.dataset.date = dateStr;

            // 修改點擊事件：導向到任務頁面
            dayButton.addEventListener('click', (e) => {
                const clickedDate = e.target.dataset.date;
                window.location.href = `/tasks/${clickedDate}`; // 導向到新頁面
            });
            grid.appendChild(dayButton);
        }
    }

    function populateSelectors() {
        const currentYear = new Date().getFullYear();
        // Populate year select
        for (let i = currentYear - 10; i <= currentYear + 10; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            yearSelect.appendChild(option);
        }
        // Populate month select
        for (let i = 0; i < 12; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i + 1}月`;
            monthSelect.appendChild(option);
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    todayBtn.addEventListener('click', () => {
        currentDate = new Date();
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    yearSelect.addEventListener('change', () => {
        currentDate.setFullYear(parseInt(yearSelect.value));
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    monthSelect.addEventListener('change', () => {
        currentDate.setMonth(parseInt(monthSelect.value));
        renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
    });

    populateSelectors();
    renderCalendar(currentDate.getFullYear(), currentDate.getMonth());
});
