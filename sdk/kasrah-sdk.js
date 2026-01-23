(function() {
    // Kasrah Games SDK - Cloud Edition v1.2.0
    // Integrated with Kasrah Main Platform Authentication
    
    const SDK_VERSION = '1.2.0';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    const MAIN_SITE_URL = 'https://kasrah-games.onrender.com'; // رابط الموقع الأساسي
    
    const KasrahSDK = {
        user: null,
        gameId: window.location.pathname.split('/').filter(Boolean).pop(), // استخراج اسم اللعبة من الرابط

        init: function() {
            console.log(`%c 🎮 ${PLATFORM_NAME} SDK v${SDK_VERSION} Active `, `background: ${PRIMARY_COLOR}; color: white; font-weight: bold; padding: 4px; border-radius: 4px;`);
            this.injectStyles();
            this.createSplashScreen();
            this.checkAuth(); // التحقق من تسجيل الدخول عند التشغيل
        },

        injectStyles: function() {
            const styles = `
                #kasrah-splash {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: #0f0f0f; display: flex; flex-direction: column;
                    justify-content: center; align-items: center; z-index: 999999;
                    transition: opacity 0.8s ease-out; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
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
                progress += Math.random() * 25;
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

        // التحقق من حالة المستخدم من الموقع الأساسي
        checkAuth: async function() {
            try {
                // محاولة جلب الملف الشخصي من الموقع الأساسي (يعتمد على الكوكيز)
                const response = await fetch(`${MAIN_SITE_URL}/api/auth/profile`, { credentials: 'include' });
                if (response.ok) {
                    this.user = await response.json();
                    this.showUserBadge();
                    console.log("☁️ Cloud Save Enabled for: " + this.user.username);
                }
            } catch (e) {
                console.log("Offline mode: Cloud save disabled.");
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
            setTimeout(() => badge.style.opacity = '0.5', 3000);
        },

        // ميزة الحفظ السحابي
        saveData: async function(key, value) {
            // حفظ محلي دائماً
            localStorage.setItem('kasrah_' + key, JSON.stringify(value));
            
            // إذا كان المستخدم مسجلاً، نحفظ في السحاب
            if (this.user) {
                try {
                    await fetch(`${MAIN_SITE_URL}/api/games/save-data`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                            gameId: this.gameId,
                            data: { [key]: value }
                        })
                    });
                    console.log("☁️ Data synced to cloud.");
                } catch (e) {
                    console.error("Cloud sync failed.");
                }
            }
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
