/**
 * Kasrah SDK Integration for Fishing Frenzy (Construct 2)
 */

window.kasrahSDK = null;
window.kasrahPlayerId = "fishing_player_" + Math.random().toString(36).substr(2, 9);

async function initKasrah() {
    console.log("Kasrah SDK: Initializing...");
    try {
        // Use the SDK global object
        if (typeof KasrahSDK === "undefined") {
            console.error("Kasrah SDK: Script not loaded!");
            return;
        }

        window.kasrahSDK = await KasrahSDK.init({
            gameId: "fishingfrenzy",
            apiKey: "key_AMFL0YdToFTH9J9xm1T_OcJrrRcc65Wa" // Using a known key from dashboard for now, or placeholder
        });

        if (window.kasrahSDK.success) {
            console.log("Kasrah SDK: Initialized successfully!");
            
            // Track game start
            window.kasrahSDK.analytics.track("game_start", { timestamp: Date.now() });

            // Load cloud save if enabled
            if (window.kasrahSDK.config.enableCloudSave) {
                const save = await window.kasrahSDK.cloudSave.load(window.kasrahPlayerId);
                if (save && save.data) {
                    console.log("Kasrah SDK: Loaded cloud save", save.data);
                    // In Construct 2, we might need to push this to a global variable
                    if (window.cr_getC2Runtime) {
                        const runtime = window.cr_getC2Runtime();
                        // Example: runtime.getVariableByName("HighScore").set_any(save.data.score);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Kasrah SDK: Initialization failed", e);
    }
}

// Hook into game events
window.kasrahHooks = {
    onGameOver: async function(score, level) {
        console.log("Kasrah SDK: Game Over", { score, level });
        if (!window.kasrahSDK) return;

        // Track event
        window.kasrahSDK.analytics.track("game_over", { score, level });

        // Save progress
        await window.kasrahSDK.cloudSave.save(window.kasrahPlayerId, { score, level, lastPlayed: Date.now() });

        // Show interstitial ad
        await window.kasrahSDK.ads.showInterstitial();
    },

    onLevelComplete: async function(level) {
        console.log("Kasrah SDK: Level Complete", level);
        if (!window.kasrahSDK) return;

        window.kasrahSDK.analytics.track("level_complete", { level });
        
        // Maybe show an ad every 3 levels
        if (level % 3 === 0) {
            await window.kasrahSDK.ads.showInterstitial();
        }
    },

    showRewardedAd: async function(callback) {
        console.log("Kasrah SDK: Requesting Rewarded Ad");
        if (!window.kasrahSDK) {
            if (callback) callback(false);
            return;
        }

        const result = await window.kasrahSDK.ads.showRewarded();
        if (result.earned) {
            console.log("Kasrah SDK: Reward earned!");
            if (callback) callback(true);
        } else {
            console.log("Kasrah SDK: Reward not earned.");
            if (callback) callback(false);
        }
    }
};

// Auto-detect Construct 2 events
function setupC2Hooks() {
    const runtime = window.cr_getC2Runtime ? window.cr_getC2Runtime() : null;
    if (!runtime) {
        setTimeout(setupC2Hooks, 1000);
        return;
    }

    console.log("Kasrah SDK: Construct 2 Runtime detected, setting up hooks...");

    // Hook into the tick or specific variable changes
    const originalTick = runtime.tick;
    let lastScore = 0;
    let lastLevel = 1;

    runtime.tick = function() {
        originalTick.apply(runtime, arguments);
        
        try {
            // Attempt to find score and level variables in C2
            const scoreVar = runtime.getVariableByName ? runtime.getVariableByName("Score") : null;
            const levelVar = runtime.getVariableByName ? runtime.getVariableByName("Level") : null;
            const isGameOverVar = runtime.getVariableByName ? (runtime.getVariableByName("GameOver") || runtime.getVariableByName("IsGameOver")) : null;

            if (scoreVar) {
                const currentScore = scoreVar.data;
                if (currentScore > lastScore) {
                    lastScore = currentScore;
                    // Optional: track small score increments
                }
            }

            if (levelVar) {
                const currentLevel = levelVar.data;
                if (currentLevel > lastLevel) {
                    lastLevel = currentLevel;
                    window.kasrahHooks.onLevelComplete(currentLevel);
                }
            }

            if (isGameOverVar && isGameOverVar.data === 1 && !window.gameOverTracked) {
                window.gameOverTracked = true;
                window.kasrahHooks.onGameOver(lastScore, lastLevel);
            } else if (isGameOverVar && isGameOverVar.data === 0) {
                window.gameOverTracked = false;
            }
        } catch (e) {
            // Silent fail for variable access
        }
    };
}

// Initialize when ready
if (document.readyState === "complete" || document.readyState === "interactive") {
    initKasrah();
    setupC2Hooks();
} else {
    document.addEventListener("DOMContentLoaded", () => {
        initKasrah();
        setupC2Hooks();
    });
}
