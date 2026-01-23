(function() {
    // Kasrah Games SDK - Cloud Edition v1.5.0
    // Optimized for Performance, Scalability & Data Integrity
    
    const SDK_VERSION = '1.5.0';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    const MAIN_SITE_URL = 'https://kasrah-games.onrender.com';
    
    const KasrahSDK = {
        user: null,
        gameId: window.location.pathname.split('/').filter(Boolean).pop() || 'unknown',
        saveQueue: {},
        saveTimeout: null,

        init: function() {
            console.log(`%c 🎮 ${PLATFORM_NAME} SDK v${SDK_VERSION} Active `, `background: ${PRIMARY_COLOR}; color: white; font-weight: bold; padding: 4px; border-radius: 4px;`);
            this.injectStyles();
            this.createSplashScreen();
            this.checkAuth();
            this.handleUnload(); // تفعيل الحفظ عند إغلاق الصفحة
        },

        injectStyles: function() {
            const styles = `
                #kasrah-splash {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: #0f0f0f; display: flex; flex-direction: column;
                    justify-content: center; align-items: center; z-index: 999999;
                    transition: opacity 0.8s ease-out; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    pointer-events: none;
                }
                .kasrah-logo {
                    font-size: 48px; font-weight: bold; color: white; margin-bottom: 20px;
                    text-shadow: 0 0 20px ${PRIMARY_COLOR}; letter-spacing: 2px;
                }
                .kasrah-loader {
                    width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;
                }
                .kasrah-progress {
                    width: 0%; height: 100%; background: ${PRIMARY_COLOR};
                    box-shadow: 0 0 10px ${PRIMARY_COLOR};
                    transition: width 0.3s ease;
                }
                .kasrah-user-badge {
                    position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.6);
                    color: white; padding: 5px 12px; border-radius: 15px; font-size: 12px;
                    display: flex; align-items: center; gap: 8px; z-index: 999998;
                    border: 1px solid ${PRIMARY_COLOR}; backdrop-filter: blur(5px);
                    transition: opacity 0.5s; pointer-events: none;
                }
                .kasrah-guest-alert {
                    position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
                    background: rgba(255, 71, 87, 0.95); color: white; padding: 12px 25px;
                    border-radius: 30px; font-size: 14px; font-weight: 500; z-index: 999998;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 12px;
                    cursor: pointer; transition: all 0.3s; animation: kasrah-slide-up 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .kasrah-guest-alert:hover { transform: translateX(-50%) scale(1.05); background: ${PRIMARY_COLOR}; }
                @keyframes kasrah-slide-up {
                    from { bottom: -60px; opacity: 0; }
                    to { bottom: 20px; opacity: 1; }
                }
                @media (max-width: 600px) {
                    .kasrah-logo { font-size: 32px; }
                    .kasrah-guest-alert { width: 90%; font-size: 12px; justify-content: center; padding: 10px; }
                }
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
        },

        createSplashScreen: function() {
            const splash = document.createElement('div');
            splash.id = 'kasrah-splash';
            splash.innerHTML = `
                <div class="kasrah-logo">KASRAH</div>
                <div class="kasrah-loader"><div class="kasrah-progress" id="kasrah-p-bar"></div></div>
                <div style="color: #888; margin-top: 15px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Cloud Sync Active</div>
            `;
            document.body.appendChild(splash);

            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 35;
                if (progress > 100) progress = 100;
                const pBar = document.getElementById('kasrah-p-bar');
                if (pBar) pBar.style.width = progress + '%';
                
                if (progress === 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        splash.style.opacity = '0';
                        setTimeout(() => splash.remove(), 800);
                    }, 400);
                }
            }, 100);
        },

        checkAuth: async function() {
            try {
                const response = await fetch(`${MAIN_SITE_URL}/api/auth/profile`, { credentials: 'include' });
                if (response.ok) {
                    this.user = await response.json();
                    this.showUserBadge();
                } else {
                    setTimeout(() => this.showGuestAlert(), 3000);
                }
            } catch (e) {
                console.warn("Kasrah SDK: Connection to main platform failed.");
            }
        },

        showUserBadge: function() {
            if (!this.user) return;
            const badge = document.createElement('div');
            badge.className = 'kasrah-user-badge';
            badge.innerHTML = `
                <span style="color: ${PRIMARY_COLOR}">●</span>
                <span>${this.user.username}</span>
            `;
            document.body.appendChild(badge);
            setTimeout(() => badge.style.opacity = '0.4', 5000);
        },

        showGuestAlert: function() {
            if (this.user) return;
            const alert = document.createElement('div');
            alert.className = 'kasrah-guest-alert';
            alert.innerHTML = `
                <span>⚠️</span>
                <span>Login to save your progress in the cloud!</span>
                <span style="text-decoration: underline; font-weight: bold; margin-left: 5px;">Login Now</span>
            `;
            alert.onclick = () => window.open(`${MAIN_SITE_URL}/login`, '_blank');
            document.body.appendChild(alert);
            
            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 600);
            }, 12000);
        },

        saveData: function(key, value) {
            localStorage.setItem('kasrah_' + key, JSON.stringify(value));
            if (!this.user) return;
            this.saveQueue[key] = value;
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.syncWithCloud(), 3000);
        },

        syncWithCloud: async function() {
            if (!this.user || Object.keys(this.saveQueue).length === 0) return;
            const dataToSync = { ...this.saveQueue };
            this.saveQueue = {};
            try {
                await fetch(`${MAIN_SITE_URL}/api/games/save-data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        gameId: this.gameId,
                        data: dataToSync
                    })
                });
            } catch (e) {}
        },

        // ميزة الحفظ عند إغلاق الصفحة باستخدام Beacon API لضمان وصول البيانات
        handleUnload: function() {
            window.addEventListener('beforeunload', () => {
                if (this.user && Object.keys(this.saveQueue).length > 0) {
                    const payload = JSON.stringify({
                        gameId: this.gameId,
                        data: this.saveQueue
                    });
                    // استخدام sendBeacon لضمان إرسال البيانات حتى بعد إغلاق المتصفح
                    navigator.sendBeacon(`${MAIN_SITE_URL}/api/games/save-data`, payload);
                }
            });
        },

        loadData: function(key) {
            return JSON.parse(localStorage.getItem('kasrah_' + key));
        }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        KasrahSDK.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => KasrahSDK.init());
    }

    window.KasrahSDK = KasrahSDK;
})();
