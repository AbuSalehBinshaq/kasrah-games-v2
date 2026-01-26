(function() {
    // Kasrah Games SDK - Cloud Edition v1.9.1 (Ad-Integrated)
    // Fixed: Auth Logic for Admins/Users & Smart Redirect after Login
    // Added: Pre-roll Ads in Splash Screen & Interstitial Ad Support
    
    const SDK_VERSION = '1.9.1';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    const MAIN_SITE_URL = 'https://kasrah-games.onrender.com';
    
    const KasrahSDK = {
        user: null,
        gameId: window.location.pathname.split('/').filter(Boolean).pop() || 'unknown',
        saveQueue: {},
        saveTimeout: null,
        isAuthChecked: false,

        init: function() {
            console.log(`%c 🎮 ${PLATFORM_NAME} SDK v${SDK_VERSION} Active `, `background: ${PRIMARY_COLOR}; color: white; font-weight: bold; padding: 4px; border-radius: 4px;`);
            this.injectStyles();
            this.createSplashScreen();
            this.checkAuth();
            this.handleUnload();
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
                .kasrah-start-btn {
                    margin-top: 20px; padding: 12px 40px; background: ${PRIMARY_COLOR};
                    color: white; border: none; border-radius: 30px; cursor: pointer;
                    font-weight: bold; font-size: 16px; letter-spacing: 1px;
                    box-shadow: 0 4px 15px rgba(255, 71, 87, 0.3);
                    transition: all 0.3s; opacity: 0; transform: translateY(10px);
                }
                .kasrah-start-btn.visible { opacity: 1; transform: translateY(0); }
                .kasrah-start-btn:hover { transform: scale(1.05); box-shadow: 0 6px 20px rgba(255, 71, 87, 0.5); }
                
                .kasrah-splash-alert {
                    margin-top: 20px; color: #ff4757; font-size: 14px; font-weight: 500;
                    opacity: 0; transition: opacity 0.5s;
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
                .kasrah-save-status {
                    position: fixed; bottom: 20px; right: 20px; background: rgba(0,0,0,0.7);
                    color: white; padding: 6px 15px; border-radius: 20px; font-size: 11px;
                    z-index: 999997; border: 1px solid #444; backdrop-filter: blur(5px);
                    display: flex; align-items: center; gap: 8px; opacity: 0; transition: opacity 0.3s;
                    pointer-events: none; text-transform: uppercase; letter-spacing: 1px;
                }
                .kasrah-dot { width: 6px; height: 6px; border-radius: 50%; background: #888; }
                .kasrah-dot.saving { background: ${PRIMARY_COLOR}; animation: kasrah-pulse 1s infinite; }
                .kasrah-dot.saved { background: #2ecc71; }
                @keyframes kasrah-pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.5); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes kasrah-slide-up {
                    from { bottom: -60px; opacity: 0; }
                    to { bottom: 20px; opacity: 1; }
                }
                @media (max-width: 600px) {
                    .kasrah-logo { font-size: 32px; }
                    .kasrah-ad-container { width: 300px; height: 250px; }
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
                
                <!-- Ad Container for Pre-roll -->
                <div class="kasrah-ad-container" id="kasrah-ad-box">
                    <span class="kasrah-ad-label">Advertisement</span>
                    <div id="kasrah-ad-content"></div>
                </div>

                <div class="kasrah-loader"><div class="kasrah-progress" id="kasrah-p-bar"></div></div>
                <div id="kasrah-splash-alert" class="kasrah-splash-alert">⚠️ Login to save your progress!</div>
                
                <button id="kasrah-start-btn" class="kasrah-start-btn">PLAY NOW</button>
                
                <div style="color: #444; margin-top: 15px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Cloud Sync & Ad-Network Active</div>
            `;
            document.body.appendChild(splash);

            // Inject Real Adsterra Banner Code
            this.injectAdCode('kasrah-ad-content');

            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 10; // Slower progress to allow ad visibility
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
                                setTimeout(() => splash.remove(), 800);
                            };
                        }
                    }, 1000);
                }
            }, 300);
        },

        injectAdCode: function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Real Adsterra Banner Configuration
            window.atOptions = {
                'key' : '49ac472dc3a5486324fd7f45c712a6ec',
                'format' : 'iframe',
                'height' : 250,
                'width' : 300,
                'params' : {}
            };

            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = 'https://www.highperformanceformat.com/49ac472dc3a5486324fd7f45c712a6ec/invoke.js';
            container.appendChild(script);
        },

        showInterstitial: function(callback) {
            console.log("Kasrah SDK: Triggering Interstitial Ad...");
            // Replace the URL below with your Adsterra Smartlink
            const smartlink = "YOUR_ADSTERRA_SMARTLINK_HERE";
            if (smartlink !== "YOUR_ADSTERRA_SMARTLINK_HERE") {
                window.open(smartlink, '_blank');
            }
            if (callback) callback();
        },

        checkAuth: async function() {
            try {
                const response = await fetch(`${MAIN_SITE_URL}/api/auth/profile`, { credentials: 'include' });
                this.isAuthChecked = true;
                if (response.ok) {
                    const data = await response.json();
                    if (data && (data.username || data.email)) {
                        this.user = data;
                        this.showUserBadge();
                        const splashAlert = document.getElementById('kasrah-splash-alert');
                        if (splashAlert) splashAlert.style.display = 'none';
                        return;
                    }
                }
                const splashAlert = document.getElementById('kasrah-splash-alert');
                if (splashAlert) splashAlert.style.opacity = '1';
                setTimeout(() => this.showGuestAlert(), 4000);
            } catch (e) {
                console.warn("Kasrah SDK: Connection to main platform failed.");
            }
        },

        showUserBadge: function() {
            if (!this.user) return;
            const badge = document.createElement('div');
            badge.className = 'kasrah-user-badge';
            const displayName = this.user.username || this.user.email.split('@')[0];
            badge.innerHTML = `
                <span style="color: ${PRIMARY_COLOR}">●</span>
                <span>${displayName}</span>
            `;
            document.body.appendChild(badge);
            setTimeout(() => badge.style.opacity = '0.4', 5000);
        },

        showGuestAlert: function() {
            if (this.user || document.querySelector('.kasrah-guest-alert')) return;
            const alert = document.createElement('div');
            alert.className = 'kasrah-guest-alert';
            alert.innerHTML = `
                <span>⚠️</span>
                <span>Login to save your progress in the cloud!</span>
                <span style="text-decoration: underline; font-weight: bold; margin-left: 5px;">Login Now</span>
            `;
            const currentGameUrl = window.location.href;
            alert.onclick = () => window.open(`${MAIN_SITE_URL}/auth/login?callbackUrl=${encodeURIComponent(currentGameUrl)}`, '_self');
            document.body.appendChild(alert);
            setTimeout(() => {
                alert.style.opacity = '0';
                setTimeout(() => alert.remove(), 600);
            }, 10000);
        },

        updateSaveStatus: function(status) {
            let statusEl = document.getElementById('kasrah-save-status');
            if (!statusEl) {
                statusEl = document.createElement('div');
                statusEl.id = 'kasrah-save-status';
                statusEl.className = 'kasrah-save-status';
                document.body.appendChild(statusEl);
            }
            if (status === 'saving') {
                statusEl.innerHTML = `<div class="kasrah-dot saving"></div> Saving...`;
                statusEl.style.opacity = '1';
            } else if (status === 'saved') {
                statusEl.innerHTML = `<div class="kasrah-dot saved"></div> Saved`;
                statusEl.style.opacity = '1';
                setTimeout(() => {
                    if (statusEl.innerHTML.includes('Saved')) statusEl.style.opacity = '0';
                }, 2000);
            }
        },

        saveData: function(key, value) {
            localStorage.setItem('kasrah_' + key, JSON.stringify(value));
            if (!this.user) return;
            this.saveQueue[key] = value;
            this.updateSaveStatus('saving');
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.syncWithCloud(), 3000);
        },

        syncWithCloud: async function() {
            if (!this.user || Object.keys(this.saveQueue).length === 0) return;
            const dataToSync = { ...this.saveQueue };
            this.saveQueue = {};
            try {
                const response = await fetch(`${MAIN_SITE_URL}/api/games/save-data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        gameId: this.gameId,
                        data: dataToSync
                    })
                });
                if (response.ok) {
                    this.updateSaveStatus('saved');
                }
            } catch (e) {}
        },

        handleUnload: function() {
            window.addEventListener('beforeunload', () => {
                if (this.user && Object.keys(this.saveQueue).length > 0) {
                    const payload = JSON.stringify({
                        gameId: this.gameId,
                        data: this.saveQueue
                    });
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
