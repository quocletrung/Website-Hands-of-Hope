// public/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // Logic scroll header
    const header = document.querySelector('.site-header');
    if (header) {
        const scrollThreshold = 50; // Hoặc giá trị bạn muốn

        function updateHeaderOnScroll() {
            if (window.scrollY > scrollThreshold) {
                header.classList.remove('header-normal');
                header.classList.add('header-small');
            } else {
                header.classList.remove('header-small');
                header.classList.add('header-normal');
            }
        }
        window.addEventListener('scroll', updateHeaderOnScroll);
        updateHeaderOnScroll(); // Kiểm tra trạng thái ban đầu
    }

    // Logic scroll to top button (lấy từ trangchu.html)
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    if (scrollToTopBtn) {
        const scrollThresholdShowButton = 750;
        window.addEventListener('scroll', function() {
            if (window.scrollY > scrollThresholdShowButton) {
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });
        scrollToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
// public/js/trangchu_slider.js (ví dụ)
document.addEventListener('DOMContentLoaded', function() {
    const wheelContainer = document.querySelector('.wheel-container');
    if (!wheelContainer) return;
    // ... (toàn bộ code của hero-slider từ trangchu.html) ...
});

// public/js/partners_slider.js (ví dụ)
document.addEventListener('DOMContentLoaded', function() {
    const sliderWrapper = document.querySelector('.partners-slider-wrapper');
    if (sliderWrapper) {
        // ... (toàn bộ code của partners-slider từ trangchu.html) ...
    }
});
document.addEventListener('DOMContentLoaded', function() {
            const header = document.querySelector('.site-header');
            if (!header) return;

            const scrollThreshold = 170; 
            function updateHeaderOnScroll() {
                if (window.scrollY > scrollThreshold) {
                    header.classList.remove('header-normal');
                    header.classList.add('header-small');
                } else {
                    header.classList.remove('header-small');
                    header.classList.add('header-normal');
                }
            }
            window.addEventListener('scroll', updateHeaderOnScroll);
            updateHeaderOnScroll(); 
        });

        // THÊM SCRIPT CHO HOẠT ĐỘNG (NẾU CÓ)
        document.addEventListener('DOMContentLoaded', function() {
            const activityCards = document.querySelectorAll('.activity-card');
            activityCards.forEach(card => {
                card.addEventListener('mouseenter', () => {
                    card.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
                });
                card.addEventListener('mouseleave', () => {
                    card.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
                });
            });
        });