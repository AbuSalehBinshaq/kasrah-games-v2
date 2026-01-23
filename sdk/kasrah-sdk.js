(function() {
    // Kasrah Games SDK - Core Edition (Optimized)
    // Focused on Branding and Future Scalability
    
    const SDK_VERSION = '1.1.0';
    const PLATFORM_NAME = 'Kasrah Games';
    const PRIMARY_COLOR = '#ff4757';
    
    const KasrahSDK = {
        init: function() {
            console.log(`%c 🎮 ${PLATFORM_NAME} SDK v${SDK_VERSION} Active `, `background: ${PRIMARY_COLOR}; color: white; font-weight: bold; padding: 4px; border-radius: 4px;`);
            this.injectStyles();
            this.createSplashScreen();
            // Toolbar removed as per user request (handled by main site)
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
                @media (max-width: 600px) {
                    .kasrah-logo { font-size: 32px; }
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
                <div style="color: #888; margin-top: 15px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Powered by Kasrah Platform</div>
            `;
            document.body.appendChild(splash);

            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 20;
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
            }, 150);
        },

        /* --- FUTURE FEATURES (Ready to be activated) --- */
        
        // Call this to show an ad: KasrahSDK.showAd()
        showAd: function(callback) {
            console.log("Ads System: Ready for integration. Contact Ad provider.");
            if (callback) callback();
        },

        // Call this to save data: KasrahSDK.saveData('score', 100)
        saveData: function(key, value) {
            localStorage.setItem('kasrah_' + key, JSON.stringify(value));
            console.log("Cloud Save: Data saved locally. Ready for Server sync.");
        },

        // Call this to load data: KasrahSDK.loadData('score')
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
