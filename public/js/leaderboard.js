// public/js/leaderboard.js
document.addEventListener('DOMContentLoaded', () => {
    const leaderboardPopup = document.getElementById('leaderboard-popup');
    const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
    const leaderboardContent = document.getElementById('leaderboard-content');

    const LEADERBOARD_COOKIE_NAME = 'leaderboardHiddenUntil';
    const HIDE_DURATION_MS = 1000; // 5 phút

    // Hàm để lấy dữ liệu và hiển thị bảng xếp hạng
    async function fetchAndDisplayLeaderboard() {
        if (!leaderboardPopup || !leaderboardContent) return;

        leaderboardContent.innerHTML = '<p class="leaderboard-loading">Đang tải bảng xếp hạng...</p>';
        leaderboardPopup.style.display = 'flex'; // Hiển thị popup

        try {
            const response = await fetch('/api/leaderboard'); // Gọi API đã tạo ở backend
            if (!response.ok) {
                throw new Error(`Lỗi HTTP: ${response.status}`);
            }
            const users = await response.json();

            if (users && users.length > 0) {
                leaderboardContent.innerHTML = ''; // Xóa loading
                users.forEach((user, index) => {
                    const item = document.createElement('div');
                    item.classList.add('leaderboard-item');

                    const rank = document.createElement('span');
                    rank.classList.add('leaderboard-rank');
                    rank.textContent = `${index + 1}.`;

                    const avatar = document.createElement('img');
                    avatar.classList.add('leaderboard-avatar');
                    avatar.src = user.avatar_url || '/images/default-avatar.png'; // Ảnh mặc định nếu không có
                    avatar.alt = user.full_name || user.username;

                    const userInfo = document.createElement('div');
                    userInfo.classList.add('leaderboard-user-info');

                    const name = document.createElement('span');
                    name.classList.add('name');
                    name.textContent = user.full_name || user.username;

                    const points = document.createElement('span');
                    points.classList.add('points');
                    points.innerHTML = `Điểm: <strong>${user.volunpoints || 0}</strong>`;

                    userInfo.appendChild(name);
                    userInfo.appendChild(points);

                    item.appendChild(rank);
                    item.appendChild(avatar);
                    item.appendChild(userInfo);
                    leaderboardContent.appendChild(item);
                });
            } else {
                leaderboardContent.innerHTML = '<p class="leaderboard-error">Chưa có dữ liệu bảng xếp hạng.</p>';
            }
        } catch (error) {
            console.error('Lỗi khi tải bảng xếp hạng:', error);
            leaderboardContent.innerHTML = '<p class="leaderboard-error">Không thể tải bảng xếp hạng. Vui lòng thử lại sau.</p>';
        }
    }

    // Hàm kiểm tra xem có nên hiển thị popup không
    function shouldShowLeaderboard() {
        const hiddenUntilTimestamp = localStorage.getItem(LEADERBOARD_COOKIE_NAME);
        if (hiddenUntilTimestamp) {
            if (Date.now() < parseInt(hiddenUntilTimestamp, 10)) {
                return false; // Vẫn đang trong thời gian ẩn
            } else {
                localStorage.removeItem(LEADERBOARD_COOKIE_NAME); // Hết hạn, xóa đi
            }
        }
        return true; // Mặc định là hiển thị
    }

    // Hàm ẩn popup và đặt thời gian ẩn
    function hideLeaderboard() {
        if (leaderboardPopup) {
            leaderboardPopup.style.display = 'none';
        }
        const hideUntil = Date.now() + HIDE_DURATION_MS;
        localStorage.setItem(LEADERBOARD_COOKIE_NAME, hideUntil.toString());
        console.log(`Bảng xếp hạng sẽ bị ẩn cho đến: ${new Date(hideUntil).toLocaleTimeString()}`);
        // Thiết lập timer để tự động hiển thị lại (nếu người dùng không F5 trang)
        setTimeout(() => {
            if (shouldShowLeaderboard()) { // Kiểm tra lại một lần nữa
                fetchAndDisplayLeaderboard();
            }
        }, HIDE_DURATION_MS + 1000); // Thêm 1 giây buffer
    }

    // Gắn sự kiện cho nút đóng
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', hideLeaderboard);
    }

    // Hiển thị bảng xếp hạng ban đầu nếu cần
    if (shouldShowLeaderboard()) {
        fetchAndDisplayLeaderboard();
    } else {
        // Nếu đang trong thời gian ẩn, cũng thiết lập timer để hiển thị lại sau
         const hiddenUntilTimestamp = parseInt(localStorage.getItem(LEADERBOARD_COOKIE_NAME), 10);
         const timeLeftToReShow = hiddenUntilTimestamp - Date.now();
         if (timeLeftToReShow > 0) {
             console.log(`Bảng xếp hạng đang ẩn, sẽ thử hiển thị lại sau ${Math.round(timeLeftToReShow / 1000)} giây.`);
             setTimeout(() => {
                if (shouldShowLeaderboard()) {
                    fetchAndDisplayLeaderboard();
                }
             }, timeLeftToReShow + 1000); // Thêm 1 giây buffer
         }
    }
});