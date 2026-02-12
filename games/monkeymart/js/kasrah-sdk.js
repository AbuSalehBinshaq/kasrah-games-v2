(function() {
    // Kasrah Games SDK - Cloud Edition v2.6.0 (Enterprise Update)
    // Features: Advanced Error Handling, Analytics, Data Validation, and Enhanced DX.
    
    const SDK_VERSION = '2.6.0';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    const MAIN_SITE_URL = 'https://kasrah-games.onrender.com';

    // Default configuration
    let SDK_CONFIG = {
        showAds: true,
        adKey: '49ac472dc3a5486324fd7f45c712a6ec',
        loadSpeed: 10,
        showStartButton: true,
        autoPlayDelay: 5000,
        adDuration: 5,
        preAdNoticeTime: 10,
        adFrequency: 3,
        debugMode: false,
        autoPause: true,
        enableAnalytics: true
    };
    
    const KasrahSDK = {
        user: null,
        gameId: window.location.pathname.split('/').filter(Boolean).pop() || 'unknown',
        saveQueue: {},
        saveTimeout: null,
        isAuthChecked: false,
        adCallCount: 0,
        listeners: {},

        /**
         * Initialize the SDK with custom configuration
         */
        init: function(customConfig = {}) {
            try {
                SDK_CONFIG = { ...SDK_CONFIG, ...customConfig };
                
                this.log('info', `SDK v${SDK_VERSION} Initializing...`, SDK_CONFIG);

                this.injectStyles();
                this.createSplashScreen();
                this.checkAuth();
                this.handleUnload();
                
                this.track('sdk_init', { version: SDK_VERSION });
                this.emit('init', { version: SDK_VERSION });
            } catch (error) {
                this.log('error', 'Initialization failed', error);
            }
        },

        // --- Logger System ---
        log: function(level, message, data = '') {
            if (!SDK_CONFIG.debugMode && level !== 'error') return;
            
            const styles = {
                info: `background: #2f3542; color: #70a1ff; padding: 2px 5px; border-radius: 3px;`,
                success: `background: #2f3542; color: #7bed9f; padding: 2px 5px; border-radius: 3px;`,
                warn: `background: #2f3542; color: #eab543; padding: 2px 5px; border-radius: 3px;`,
                error: `background: ${PRIMARY_COLOR}; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold;`
            };

            console.log(`%c[Kasrah SDK] ${level.toUpperCase()}: ${message}`, styles[level] || styles.info, data);
        },

        // --- Analytics System ---
        track: function(eventName, eventData = {}) {
            if (!SDK_CONFIG.enableAnalytics) return;
            
            const payload = {
                gameId: this.gameId,
                event: eventName,
                data: eventData,
                timestamp: new Date().toISOString(),
                userId: this.user ? (this.user.id || this.user.username) : 'anonymous'
            };

            this.log('info', `Tracking Event: ${eventName}`, payload);
            
            // In a real scenario, you'd send this to your analytics endpoint
            // navigator.sendBeacon(`${MAIN_SITE_URL}/api/analytics/track`, JSON.stringify(payload));
        },

        // --- Event System ---
        on: function(event, callback) {
            if (typeof callback !== 'function') {
                this.log('error', `Listener for ${event} must be a function`);
                return;
            }
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        },

        emit: function(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        this.log('error', `Error in listener for ${event}`, e);
                    }
                });
            }
        },

        // --- Data Validation ---
        validateData: function(key, value) {
            if (!key || typeof key !== 'string') {
                this.log('error', 'Save failed: Key must be a non-empty string');
                return false;
            }
            if (value === undefined || value === null) {
                this.log('warn', `Save warning: Value for ${key} is empty`);
            }
            // Check size (max 2MB per key for safety)
            const size = new Blob([JSON.stringify(value)]).size;
            if (size > 2 * 1024 * 1024) {
                this.log('error', `Save failed: Data for ${key} exceeds 2MB limit`);
                return false;
            }
            return true;
        },

        injectStyles: function() {
            try {
                const styles = `
                    #kasrah-splash, #kasrah-timed-ad, #kasrah-pre-ad-notice {
                        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                        background: rgba(15, 15, 15, 0.98); display: flex; flex-direction: column;
                        justify-content: center; align-items: center; z-index: 999999;
                        transition: opacity 0.5s ease-out; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    }
                    #kasrah-pre-ad-notice {
                        background: rgba(0, 0, 0, 0.8); height: auto; top: 20px; left: 50%;
                        transform: translateX(-50%); width: auto; padding: 12px 25px;
                        border-radius: 50px; border: 1px solid ${PRIMARY_COLOR};
                        backdrop-filter: blur(10px); pointer-events: none;
                    }
                    .kasrah-logo {
                        font-size: 48px; font-weight: bold; color: white; margin-bottom: 20px;
                        text-shadow: 0 0 20px ${PRIMARY_COLOR}; letter-spacing: 2px;
                    }
                    .kasrah-ad-container {
                        width: 300px; height: 250px; background: #1a1a1a; margin-bottom: 20px;
                        border: 1px solid #333; display: none; justify-content: center; align-items: center;
                        position: relative; overflow: hidden; border-radius: 8px;
                    }
                    .kasrah-ad-container.has-ad { display: flex; }
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
                    .kasrah-start-btn { opacity: 0; transform: translateY(10px); pointer-events: none; }
                    .kasrah-start-btn.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
                    .kasrah-countdown { color: #888; font-size: 14px; margin-top: 10px; font-weight: bold; }
                    .kasrah-notice-text { color: white; font-size: 14px; font-weight: bold; }
                    .kasrah-auto-msg { color: #666; font-size: 12px; margin-top: 10px; }
                `;
                const styleSheet = document.createElement("style");
                styleSheet.innerText = styles;
                document.head.appendChild(styleSheet);
            } catch (e) {
                this.log('error', 'Failed to inject styles', e);
            }
        },

        createSplashScreen: function() {
            try {
                const splash = document.createElement('div');
                splash.id = 'kasrah-splash';
                let adHtml = SDK_CONFIG.showAds ? `<div class="kasrah-ad-container" id="kasrah-ad-box"><span class="kasrah-ad-label">Advertisement</span><div id="kasrah-ad-content"></div></div>` : '';
                splash.innerHTML = `
                    <div class="kasrah-logo">KASRAH</div>
                    ${adHtml}
                    <div class="kasrah-loader"><div class="kasrah-progress" id="kasrah-p-bar"></div></div>
                    <button id="kasrah-start-btn" class="kasrah-btn kasrah-start-btn">PLAY NOW</button>
                    <div id="kasrah-auto-play-msg" class="kasrah-auto-msg"></div>
                `;
                document.body.appendChild(splash);
                
                if (SDK_CONFIG.showAds) {
                    this.injectAdCode('kasrah-ad-content', 'kasrah-ad-box');
                }

                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * SDK_CONFIG.loadSpeed;
                    if (progress > 100) progress = 100;
                    const pBar = document.getElementById('kasrah-p-bar');
                    if (pBar) pBar.style.width = progress + '%';
                    
                    if (progress === 100) {
                        clearInterval(interval);
                        this.handleLoadComplete(splash);
                    }
                }, 300);
            } catch (e) {
                this.log('error', 'Failed to create splash screen', e);
            }
        },

        handleLoadComplete: function(splash) {
            const startBtn = document.getElementById('kasrah-start-btn');
            const autoMsg = document.getElementById('kasrah-auto-play-msg');
            
            if (startBtn) {
                startBtn.classList.add('visible');
                startBtn.onclick = () => this.closeSplash(splash);
            }

            let timeLeft = Math.floor(SDK_CONFIG.autoPlayDelay / 1000);
            if (autoMsg) autoMsg.innerText = `Starting automatically in ${timeLeft}s...`;

            const autoTimer = setInterval(() => {
                timeLeft--;
                if (autoMsg) autoMsg.innerText = `Starting automatically in ${timeLeft}s...`;
                if (timeLeft <= 0) {
                    clearInterval(autoTimer);
                    this.closeSplash(splash);
                }
            }, 1000);
        },

        closeSplash: function(splash) {
            if (!splash || !splash.parentNode) return;
            splash.style.opacity = '0';
            setTimeout(() => {
                if (splash.parentNode) splash.remove();
                this.track('game_start');
                this.emit('gameStart');
            }, 500);
        },

        showTimedAd: function(callback) {
            try {
                this.adCallCount++;
                if (!SDK_CONFIG.showAds || (this.adCallCount % SDK_CONFIG.adFrequency !== 0)) {
                    if (callback) callback();
                    return;
                }

                this.emit('adBeforeStart');

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
            } catch (e) {
                this.log('error', 'Failed to show timed ad notice', e);
                if (callback) callback();
            }
        },

        triggerActualAd: function(callback) {
            try {
                this.track('ad_start');
                this.emit('adStarted');
                
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
                
                this.injectAdCode('kasrah-timed-ad-content', 'kasrah-timed-ad');

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
                            this.track('ad_finish');
                            this.emit('adFinished');
                            if (callback) callback();
                        }, 500);
                    }
                }, 1000);
            } catch (e) {
                this.log('error', 'Failed to trigger actual ad', e);
                if (callback) callback();
            }
        },

        injectAdCode: function(containerId, parentId) {
            try {
                const container = document.getElementById(containerId);
                const parent = document.getElementById(parentId);
                if (!container) return false;

                window.atOptions = { 'key' : SDK_CONFIG.adKey, 'format' : 'iframe', 'height' : 250, 'width' : 300, 'params' : {} };
                const script = document.createElement('script');
                script.type = 'text/javascript';
                script.src = `https://www.highperformanceformat.com/${SDK_CONFIG.adKey}/invoke.js`;
                
                script.onload = function() {
                    if (parent) parent.classList.add('has-ad');
                };
                
                script.onerror = () => {
                    this.log('warn', 'Ad script failed to load');
                    if (parent) parent.style.display = 'none';
                    // إذا فشل السكريبت، نعتبر الإعلان انتهى لضمان عدم تعليق اللعبة
                    this.emit('adError');
                };

                container.appendChild(script);
                
                setTimeout(() => {
                    if (container.getElementsByTagName('iframe').length > 0) {
                        if (parent) parent.classList.add('has-ad');
                    } else {
                        if (parent) parent.style.display = 'none';
                    }
                }, 3000);
                
                return true;
            } catch (e) {
                this.log('error', 'Ad injection error', e);
                return false;
            }
        },

        checkAuth: async function() {
            try {
                const response = await fetch(`${MAIN_SITE_URL}/api/auth/profile`, { credentials: 'include' });
                if (response.ok) {
                    const data = await response.json();
                    if (data && (data.username || data.email)) {
                        this.user = data;
                        this.showUserBadge();
                        this.log('success', `User logged in: ${this.user.username || this.user.email}`);
                        this.emit('userLogin', data);
                    }
                }
            } catch (e) {
                this.log('warn', 'Auth check failed (User probably not logged in)');
            }
        },

        showUserBadge: function() {
            try {
                if (!this.user) return;
                const badge = document.createElement('div');
                badge.className = 'kasrah-user-badge';
                const displayName = this.user.username || this.user.email.split('@')[0];
                badge.innerHTML = `<span style="color: ${PRIMARY_COLOR}">●</span> <span>${displayName}</span>`;
                document.body.appendChild(badge);
                setTimeout(() => badge.style.opacity = '0.4', 5000);
            } catch (e) {}
        },

        saveData: function(key, value) {
            try {
                if (!this.validateData(key, value)) return;

                localStorage.setItem('kasrah_' + key, JSON.stringify(value));
                this.log('info', `Data saved locally: ${key}`);

                if (!this.user) return;
                
                this.saveQueue[key] = value;
                if (this.saveTimeout) clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => this.syncWithCloud(), 3000);
            } catch (e) {
                this.log('error', `Local save failed for ${key}`, e);
            }
        },

        syncWithCloud: async function() {
            if (!this.user || Object.keys(this.saveQueue).length === 0) return;
            
            const dataToSync = { ...this.saveQueue };
            this.saveQueue = {};
            
            try {
                this.log('info', 'Syncing with cloud...', dataToSync);
                const response = await fetch(`${MAIN_SITE_URL}/api/games/save-data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ gameId: this.gameId, data: dataToSync })
                });
                
                if (response.ok) {
                    this.log('success', 'Cloud sync complete');
                    this.track('cloud_sync', { keys: Object.keys(dataToSync) });
                    this.emit('saveComplete', dataToSync);
                } else {
                    throw new Error(`Server returned ${response.status}`);
                }
            } catch (e) {
                this.log('error', 'Cloud sync failed', e);
            }
        },

        handleUnload: function() {
            window.addEventListener('beforeunload', () => {
                if (this.user && Object.keys(this.saveQueue).length > 0) {
                    try {
                        const payload = JSON.stringify({ gameId: this.gameId, data: this.saveQueue });
                        navigator.sendBeacon(`${MAIN_SITE_URL}/api/games/save-data`, payload);
                    } catch (e) {}
                }
            });
        },

        loadData: function(key) {
            try {
                const data = localStorage.getItem('kasrah_' + key);
                return data ? JSON.parse(data) : null;
            } catch (e) {
                this.log('error', `Load failed for ${key}`, e);
                return null;
            }
        }
    };

    const autoInitTimeout = setTimeout(() => {
        if (!window.KasrahSDK_ManualInit) KasrahSDK.init();
    }, 1000);

    window.KasrahSDK = KasrahSDK;
    window.KasrahSDK.manualInit = function(config) {
        clearTimeout(autoInitTimeout);
        window.KasrahSDK_ManualInit = true;
        KasrahSDK.init(config);
    };
})();
