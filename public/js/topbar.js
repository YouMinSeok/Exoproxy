// public/js/topbar.js

export function initTopBar() {
    const currentTimeElement = document.getElementById('currentTime');
    const currentDateElement = document.getElementById('currentDate');

    function updateCurrentTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    }

    function updateCurrentDate() {
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        currentDateElement.textContent = `${month}월 ${date}일`;
    }

    function updateTimeAndDate() {
        updateCurrentTime();
        updateCurrentDate();
    }

    updateTimeAndDate();
    setInterval(updateTimeAndDate, 1000);
}
