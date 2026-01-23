(function() {
    // Kasrah Games SDK - Professional Edition
    // Created for kasrah-games-v2
    
    const SDK_VERSION = '1.0.0';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    
    const KasrahSDK = {
        init: function() {
            console.log(`%c 🎮 ${PLATFORM_NAME} SDK v${SDK_VERSION} Initialized `, `background: ${PRIMARY_COLOR}; color: white; font-weight: bold; padding: 4px; border-radius: 4px;`);
            this.injectStyles();
            this.createSplashScreen();
            this.createToolbar();
            this.handleEvents();
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
                #kasrah-toolbar {
                    position: fixed; bottom: 20px; right: 20px; display: flex; gap: 10px;
                    z-index: 999998; opacity: 0.5; transition: opacity 0.3s;
                }
                #kasrah-toolbar:hover { opacity: 1; }
                .kasrah-btn {
                    background: rgba(0,0,0,0.7); color: white; border: 1px solid #444;
                    padding: 8px 15px; border-radius: 20px; cursor: pointer; font-size: 14px;
                    display: flex; align-items: center; gap: 5px; backdrop-filter: blur(5px);
                    transition: all 0.2s;
                }
                .kasrah-btn:hover { background: ${PRIMARY_COLOR}; border-color: ${PRIMARY_COLOR}; transform: scale(1.05); }
                @media (max-width: 600px) {
                    .kasrah-logo { font-size: 32px; }
                    #kasrah-toolbar { bottom: 10px; right: 10px; }
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
                <div style="color: #888; margin-top: 15px; font-size: 12px; text-transform: uppercase;">Loading Awesome Game...</div>
            `;
            document.body.appendChild(splash);

            // Simulate loading
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 100) progress = 100;
                document.getElementById('kasrah-p-bar').style.width = progress + '%';
                
                if (progress === 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        splash.style.opacity = '0';
                        setTimeout(() => splash.remove(), 800);
                    }, 500);
                }
            }, 200);
        },

        createToolbar: function() {
            const toolbar = document.createElement('div');
            toolbar.id = 'kasrah-toolbar';
            toolbar.innerHTML = `
                <div class="kasrah-btn" onclick="window.location.href='/'">
                    <span>🏠</span> Home
                </div>
                <div class="kasrah-btn" id="kasrah-fs-btn">
                    <span>📺</span> Fullscreen
                </div>
            `;
            document.body.appendChild(toolbar);
            
            document.getElementById('kasrah-fs-btn').onclick = () => this.toggleFullScreen();
        },

        toggleFullScreen: function() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        },

        handleEvents: function() {
            // Prevent some default behaviors that might break game experience
            window.addEventListener('keydown', function(e) {
                if([32, 37, 38, 39, 40].indexOf(e.keyCode) > -1) {
                    // Allow game to handle these keys
                }
            }, false);
        }
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        KasrahSDK.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => KasrahSDK.init());
    }

    // Export to window
    window.KasrahSDK = KasrahSDK;
})();
