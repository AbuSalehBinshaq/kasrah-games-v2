(function() {
    // Kasrah Games SDK - Cloud Edition v2.3.0 (Pre-Ad Alerts & Auto-Close)
    // Added: Pre-ad notification system and fully automatic ad closing.
    
    const SDK_VERSION = '2.3.0';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    const MAIN_SITE_URL = 'https://kasrah-games.onrender.com';

    // --- CENTRAL CONTROL PANEL (CONFIG) ---
    const SDK_CONFIG = {
        showAds: true,
        adKey: '49ac472dc3a5486324fd7f45c712a6ec',
        loadSpeed: 10,
        showStartButton: true,
        adDuration: 5,              // Duration of the ad in seconds
        preAdNoticeTime: 10,        // Time to show the "Ad coming soon" notice (seconds)
        adFrequency: 3,             // Show ad every X times the function is called
        debugMode: false
    };
    
    const KasrahSDK = {
        user: null,
        gameId: window.location.pathname.split('/').filter(Boolean).pop() || 'unknown',
        saveQueue: {},
        saveTimeout: null,
        isAuthChecked: false,
        adCallCount: 0,

        init: function() {
            if (SDK_CONFIG.debugMode) console.log(`%c 🎮 ${PLATFORM_NAME} SDK v${SDK_VERSION} Active `, `background: ${PRIMARY_COLOR}; color: white; font-weight: bold; padding: 4px; border-radius: 4px;`);
            this.injectStyles();
            this.createSplashScreen();
            this.checkAuth();
            this.handleUnload();
        },

        injectStyles: function() {
            const styles = `
                #kasrah-splash, #kasrah-timed-ad, #kasrah-pre-ad-notice {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(15, 15, 15, 0.98); display: flex; flex-direction: column;
                    justify-content: center; align-items: center; z-index: 999999;
                    transition: opacity 0.5s ease-out; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                }
                #kasrah-pre-ad-notice {
                    background: rgba(0, 0, 0, 0.7); height: auto; top: 20px; left: 50%;
                    transform: translateX(-50%); width: auto; padding: 15px 30px;
                    border-radius: 50px; border: 1px solid ${PRIMARY_COLOR};
                    backdrop-filter: blur(10px); pointer-events: none;
                }
                .kasrah-logo {
                    font-size: 48px; font-weight: bold; color: white; margin-bottom: 20px;
                    text-shadow: 0 0 20px ${PRIMARY_COLOR}; letter-spacing: 2px;
                }
                .kasrah-ad-container {
                    width: 300px; height: 250px; background: #1a1a1a; margin-bottom: 20px;
                    border: 1px solid #333; display: flex; justify-content: center; align-items: center;
                    position: relative; overflow: hidden; border-radius: 8px;
                }
                .kasrah-ad-label {
                    position: absolute; top: 5px; right: 5px; font-size: 10px; color: #555;
                    text-transform: uppercase; letter-spacing: 1px; z-index: 10;
                }
                .kasrah-loader {
                    width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;
                }
                .kasrah-progress {
                    width: 0%; height: 100%; background: ${PRIMARY_COLOR};
                    box-shadow: 0 0 10px ${PRIMARY_COLOR};
                    transition: width 0.3s ease;
                }
                .kasrah-btn {
                    margin-top: 20px; padding: 12px 40px; background: ${PRIMARY_COLOR};
                    color: white; border: none; border-radius: 30px; cursor: pointer;
                    font-weight: bold; font-size: 16px; letter-spacing: 1px;
                    box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
                    transition: all 0.3s;
                }
                .kasrah-start-btn { opacity: 0; transform: translateY(10px); }
                .kasrah-start-btn.visible { opacity: 1; transform: translateY(0); }
                
                .kasrah-countdown {
                    color: #888; font-size: 14px; margin-top: 10px; font-weight: bold;
                }
                .kasrah-notice-text {
                    color: white; font-size: 14px; font-weight: bold;
                }
            `;
            const styleSheet = document.createElement("style");
            styleSheet.innerText = styles;
            document.head.appendChild(styleSheet);
        },

        createSplashScreen: function() {
            const splash = document.createElement('div');
            splash.id = 'kasrah-splash';
            let adHtml = SDK_CONFIG.showAds ? `<div class="kasrah-ad-container" id="kasrah-ad-box"><span class="kasrah-ad-label">Advertisement</span><div id="kasrah-ad-content"></div></div>` : '';
            splash.innerHTML = `<div class="kasrah-logo">KASRAH</div>${adHtml}<div class="kasrah-loader"><div class="kasrah-progress" id="kasrah-p-bar"></div></div><button id="kasrah-start-btn" class="kasrah-btn kasrah-start-btn">PLAY NOW</button>`;
            document.body.appendChild(splash);
            if (SDK_CONFIG.showAds) this.injectAdCode('kasrah-ad-content');
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * SDK_CONFIG.loadSpeed;
                if (progress > 100) progress = 100;
                const pBar = document.getElementById('kasrah-p-bar');
                if (pBar) pBar.style.width = progress + '%';
                if (progress === 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        const startBtn = document.getElementById('kasrah-start-btn');
                        if (startBtn) {
                            startBtn.classList.add('visible');
                            startBtn.onclick = () => {
                                splash.style.opacity = '0';
                                setTimeout(() => splash.remove(), 500);
                            };
                        }
                    }, 500);
                }
            }, 300);
        },

        // --- UPDATED: Timed Ad with Pre-notice and Auto-close ---
        showTimedAd: function(callback) {
            this.adCallCount++;
            if (!SDK_CONFIG.showAds || (this.adCallCount % SDK_CONFIG.adFrequency !== 0)) {
                if (callback) callback();
                return;
            }

            // Step 1: Show Pre-ad Notice
            const notice = document.createElement('div');
            notice.id = 'kasrah-pre-ad-notice';
            notice.innerHTML = `<div class="kasrah-notice-text">📺 Ad starting in <span id="kasrah-notice-timer">${SDK_CONFIG.preAdNoticeTime}</span>s...</div>`;
            document.body.appendChild(notice);

            let noticeTimeLeft = SDK_CONFIG.preAdNoticeTime;
            const noticeInterval = setInterval(() => {
                noticeTimeLeft--;
                const timerEl = document.getElementById('kasrah-notice-timer');
                if (timerEl) timerEl.innerText = noticeTimeLeft;
                
                if (noticeTimeLeft <= 0) {
                    clearInterval(noticeInterval);
                    notice.remove();
                    this.triggerActualAd(callback);
                }
            }, 1000);
        },

        triggerActualAd: function(callback) {
            const adOverlay = document.createElement('div');
            adOverlay.id = 'kasrah-timed-ad';
            adOverlay.innerHTML = `
                <div class="kasrah-logo" style="font-size: 24px;">KASRAH</div>
                <div class="kasrah-ad-container" id="kasrah-timed-ad-content">
                    <span class="kasrah-ad-label">Advertisement</span>
                </div>
                <div class="kasrah-countdown" id="kasrah-ad-timer">Game resumes in ${SDK_CONFIG.adDuration}s...</div>
            `;
            document.body.appendChild(adOverlay);
            this.injectAdCode('kasrah-timed-ad-content');

            let timeLeft = SDK_CONFIG.adDuration;
            const countdown = setInterval(() => {
                timeLeft--;
                const timerElement = document.getElementById('kasrah-ad-timer');
                if (timerElement) timerElement.innerText = `Game resumes in ${timeLeft}s...`;
                
                if (timeLeft <= 0) {
                    clearInterval(countdown);
                    adOverlay.style.opacity = '0';
                    setTimeout(() => {
                        adOverlay.remove();
                        if (callback) callback();
                    }, 500);
                }
            }, 1000);
        },

        injectAdCode: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            window.atOptions = { 'key' : SDK_CONFIG.adKey, 'format' : 'iframe', 'height' : 250, 'width' : 300, 'params' : {} };
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = `https://www.highperformanceformat.com/${SDK_CONFIG.adKey}/invoke.js`;
            container.appendChild(script);
        },

        checkAuth: async function() {
            try {
                const response = await fetch(`${MAIN_SITE_URL}/api/auth/profile`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    if (data && (data.username || data.email)) {
                        this.user = data;
                        this.showUserBadge();
                    }
                }
            } catch (e) {}
        },

        showUserBadge: function() {
            if (!this.user) return;
            const badge = document.createElement('div');
            badge.className = 'kasrah-user-badge';
            const displayName = this.user.username || this.user.email.split('@')[0];
            badge.innerHTML = `<span style="color: ${PRIMARY_COLOR}">●</span> <span>${displayName}</span>`;
            document.body.appendChild(badge);
            setTimeout(() => badge.style.opacity = '0.4', 5000);
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
                    body: JSON.stringify({ gameId: this.gameId, data: dataToSync })
                });
            } catch (e) {}
        },

        handleUnload: function() {
            window.addEventListener('beforeunload', () => {
                if (this.user && Object.keys(this.saveQueue).length > 0) {
                    const payload = JSON.stringify({ gameId: this.gameId, data: this.saveQueue });
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
