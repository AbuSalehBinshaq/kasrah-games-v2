# Kasrah SDK Pro - Complete Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-02-19

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Initialization](#initialization)
4. [API Reference](#api-reference)
5. [Ad System](#ad-system)
6. [Cloud Save](#cloud-save)
7. [Events & Analytics](#events--analytics)
8. [SDK Inspector](#sdk-inspector)
9. [Examples](#examples)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### HTML5 Games

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-pro.js"></script>
  <script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-inspector.js"></script>
</head>
<body>
  <div id="game-container"></div>

  <script>
    // Initialize SDK
    KasrahSDK.init({
      gameId: 'my-awesome-game', // Optional - auto-detected
      callbacks: {
        onAdStart: () => console.log('Ad started'),
        onAdComplete: () => console.log('Ad completed'),
      }
    });

    // Show interstitial ad
    async function showAd() {
      await KasrahSDK.showInterstitial({
        onComplete: () => console.log('Ad finished'),
        onError: (err) => console.error('Ad error:', err),
      });
    }

    // Show rewarded ad
    async function showRewardedAd() {
      await KasrahSDK.showRewarded({
        onReward: () => {
          console.log('Player earned reward!');
          playerScore += 100;
        },
        onError: (err) => console.error('Error:', err),
      });
    }

    // Save player data
    async function saveGame() {
      await KasrahSDK.saveData({
        level: currentLevel,
        score: playerScore,
        inventory: playerInventory,
      });
    }

    // Load player data
    async function loadGame() {
      const data = await KasrahSDK.loadData();
      if (data) {
        currentLevel = data.level;
        playerScore = data.score;
      }
    }
  </script>
</body>
</html>
```

---

## Installation

### 1. Include SDK Script

Add the SDK to your game's HTML:

```html
<script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-pro.js"></script>
```

### 2. Include Inspector (Optional - Development Only)

For debugging and testing:

```html
<script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-inspector.js"></script>
```

**Note:** The SDK is **zero-dependency** and works with any JavaScript framework (Vanilla JS, React, Vue, Angular, etc.).

---

## Initialization

### Basic Initialization

```javascript
await KasrahSDK.init();
```

### With Options

```javascript
await KasrahSDK.init({
  gameId: 'my-game', // Optional - auto-detected from domain
  apiUrl: 'https://kasrah-sdk-pro.manus.space', // Optional - default
  config: {
    adFrequency: 30, // Seconds between ads
    enableBanners: true,
    enableInterstitial: true,
    enableRewarded: true,
    enableCloudSave: true,
  },
  callbacks: {
    onAdStart: () => {},
    onAdComplete: () => {},
    onAdError: (error) => {},
    onAdClose: () => {},
    onGameplayStart: () => {},
    onGameplayStop: () => {},
  }
});
```

### Return Value

```javascript
{
  success: true,
  game: {
    id: 'my-game',
    title: 'My Awesome Game',
    slug: 'my-awesome-game'
  },
  config: {
    adFrequency: 30,
    enableBanners: true,
    enableInterstitial: true,
    enableRewarded: true,
    enableCloudSave: true,
  }
}
```

---

## API Reference

### Core Methods

#### `KasrahSDK.init(options)`

Initialize the SDK. Must be called before using other methods.

**Parameters:**
- `options` (Object, optional)
  - `gameId` (String) - Game identifier
  - `apiUrl` (String) - API endpoint
  - `config` (Object) - Configuration options
  - `callbacks` (Object) - Event callbacks

**Returns:** Promise<boolean>

---

#### `KasrahSDK.showInterstitial(options)`

Display an interstitial ad (full-screen ad between game sessions).

**Parameters:**
- `options` (Object, optional)
  - `onComplete` (Function) - Called when ad closes
  - `onError` (Function) - Called on error

**Example:**
```javascript
await KasrahSDK.showInterstitial({
  onComplete: () => {
    console.log('Ad finished, continue game');
    startNextLevel();
  },
  onError: (error) => {
    console.error('Ad failed:', error);
    startNextLevel(); // Fallback
  }
});
```

---

#### `KasrahSDK.showRewarded(options)`

Display a rewarded ad (player watches ad to earn reward).

**Parameters:**
- `options` (Object, optional)
  - `onReward` (Function) - Called when reward is earned
  - `onError` (Function) - Called on error

**Example:**
```javascript
await KasrahSDK.showRewarded({
  onReward: () => {
    playerCoins += 100;
    showNotification('You earned 100 coins!');
  },
  onError: (error) => {
    showNotification('Ad not available');
  }
});
```

---

#### `KasrahSDK.requestBanner(containerId, size)`

Request a banner ad.

**Parameters:**
- `containerId` (String) - HTML element ID for banner
- `size` (String) - Banner size: `'300x250'`, `'728x90'`, `'320x50'`

**Example:**
```html
<div id="banner-container"></div>

<script>
  KasrahSDK.requestBanner('banner-container', '300x250');
</script>
```

---

#### `KasrahSDK.fireEvent(eventType, metadata)`

Track game events.

**Parameters:**
- `eventType` (String) - Event type: `'gameplayStart'`, `'gameplayStop'`, `'gameLoadingFinished'`, `'happyTime'`
- `metadata` (Object, optional) - Additional data

**Example:**
```javascript
// Game started
KasrahSDK.fireEvent('gameplayStart', {
  difficulty: 'hard',
  mode: 'multiplayer'
});

// Game ended
KasrahSDK.fireEvent('gameplayStop', {
  duration: 300, // seconds
  score: 5000,
  levelReached: 10
});

// Loading finished
KasrahSDK.fireEvent('gameLoadingFinished');

// Happy time (special moment)
KasrahSDK.fireEvent('happyTime', {
  reason: 'first_win',
  value: 1000
});
```

---

#### `KasrahSDK.saveData(data, options)`

Save player data to cloud.

**Parameters:**
- `data` (Object) - Player data to save
- `options` (Object, optional)
  - `isEncrypted` (Boolean) - Encrypt data

**Example:**
```javascript
await KasrahSDK.saveData({
  level: 5,
  score: 10000,
  inventory: ['sword', 'shield', 'potion'],
  lastPlayedAt: new Date().toISOString(),
});
```

---

#### `KasrahSDK.loadData()`

Load player data from cloud.

**Returns:** Promise<Object|null>

**Example:**
```javascript
const playerData = await KasrahSDK.loadData();
if (playerData) {
  currentLevel = playerData.level;
  playerScore = playerData.score;
}
```

---

#### `KasrahSDK.on(eventName, callback)`

Register event callback.

**Parameters:**
- `eventName` (String) - Event name
- `callback` (Function) - Callback function

**Example:**
```javascript
KasrahSDK.on('AdStart', () => {
  pauseGame();
});

KasrahSDK.on('AdComplete', () => {
  resumeGame();
});
```

---

#### `KasrahSDK.off(eventName)`

Remove event callback.

**Example:**
```javascript
KasrahSDK.off('AdStart');
```

---

## Ad System

### Interstitial Ads

Full-screen ads shown between game sessions.

**Best Practices:**
- Show after level completion
- Show after game over
- Show after 5-10 minutes of gameplay
- Always provide a fallback (continue game anyway)

```javascript
// After level complete
async function onLevelComplete() {
  showLoadingScreen();
  
  await KasrahSDK.showInterstitial({
    onComplete: () => {
      hideLoadingScreen();
      startNextLevel();
    },
    onError: () => {
      hideLoadingScreen();
      startNextLevel(); // Continue anyway
    }
  });
}
```

### Rewarded Ads

Ads that reward players for watching.

**Best Practices:**
- Offer rewards: coins, gems, extra lives, power-ups
- Make rewards valuable but not essential
- Allow multiple rewards per session
- Show in-game currency earned

```javascript
// In-game shop
async function buyWithAd() {
  await KasrahSDK.showRewarded({
    onReward: () => {
      playerCoins += 50;
      updateUI();
      showNotification('✓ You earned 50 coins!');
    },
    onError: () => {
      showNotification('Ad not available. Try again later.');
    }
  });
}
```

### Banner Ads

Persistent ads displayed in corners or edges.

**Sizes:**
- `300x250` - Medium Rectangle (sidebar)
- `728x90` - Leaderboard (top/bottom)
- `320x50` - Mobile Banner

```html
<!-- Top banner -->
<div id="top-banner" style="text-align: center; margin-bottom: 20px;"></div>

<!-- Side banner -->
<div id="side-banner" style="float: right; margin-left: 20px;"></div>

<script>
  KasrahSDK.requestBanner('top-banner', '728x90');
  KasrahSDK.requestBanner('side-banner', '300x250');
</script>
```

---

## Cloud Save

### Auto-Save Pattern

```javascript
// Auto-save every 30 seconds
setInterval(async () => {
  await KasrahSDK.saveData({
    level: currentLevel,
    score: playerScore,
    position: { x: player.x, y: player.y },
    inventory: playerInventory,
    timestamp: Date.now(),
  });
}, 30000);
```

### Manual Save

```javascript
// Save on specific events
async function onGameOver() {
  await KasrahSDK.saveData({
    lastLevel: currentLevel,
    bestScore: Math.max(bestScore, playerScore),
    totalPlayTime: totalPlayTime + (Date.now() - sessionStart),
  });
}
```

### Load and Resume

```javascript
// On game start
async function initializeGame() {
  const savedData = await KasrahSDK.loadData();
  
  if (savedData) {
    // Resume from saved state
    currentLevel = savedData.level;
    playerScore = savedData.score;
    playerInventory = savedData.inventory;
  } else {
    // Start fresh
    currentLevel = 1;
    playerScore = 0;
  }
  
  startGame();
}
```

---

## Events & Analytics

### Game Events

Track important game moments:

```javascript
// Game started
KasrahSDK.fireEvent('gameplayStart', {
  difficulty: 'normal',
  mode: 'single_player'
});

// Level completed
KasrahSDK.fireEvent('levelComplete', {
  level: 5,
  score: 1000,
  time: 120 // seconds
});

// Game over
KasrahSDK.fireEvent('gameOver', {
  reason: 'health_depleted',
  score: 5000,
  level: 10
});

// Game stopped
KasrahSDK.fireEvent('gameplayStop', {
  duration: 600, // seconds
  score: 5000,
  levelReached: 10
});
```

### Event Callbacks

```javascript
// Setup callbacks
KasrahSDK.init({
  callbacks: {
    onGameplayStart: (metadata) => {
      console.log('Game started:', metadata);
      pauseBackgroundMusic();
    },
    onGameplayStop: (metadata) => {
      console.log('Game stopped:', metadata);
      resumeBackgroundMusic();
    },
  }
});
```

---

## SDK Inspector

Developer tool for testing and debugging.

### Activation

**Keyboard Shortcut:** `Ctrl + Shift + I` (Windows/Linux) or `Cmd + Shift + I` (Mac)

### Features

1. **Console Tab**
   - View all console logs
   - Filter by type (log, error, warn)
   - Real-time output

2. **Events Tab**
   - Track SDK events
   - View event timestamps
   - Monitor callbacks

3. **Network Tab**
   - Monitor API requests
   - View request/response data
   - Check response times

4. **Settings Tab**
   - View Game ID and Player ID
   - Test ad types
   - Verify SDK configuration

### Test Buttons

- **Test Interstitial Ad** - Show sample interstitial
- **Test Rewarded Ad** - Show sample rewarded ad
- **Test Banner** - Request sample banner

### Export Logs

Click "Export" to download logs as JSON for debugging.

---

## Examples

### Complete HTML5 Game Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Game</title>
  <script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-pro.js"></script>
  <script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-inspector.js"></script>
  <style>
    body { margin: 0; overflow: hidden; }
    #game { width: 100vw; height: 100vh; }
    #banner { text-align: center; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div id="banner"></div>
  <canvas id="game"></canvas>

  <script>
    let game = {
      level: 1,
      score: 0,
      isPlaying: false,
      sessionStart: null,
    };

    // Initialize SDK
    async function initSDK() {
      await KasrahSDK.init({
        callbacks: {
          onAdStart: () => {
            game.isPlaying = false;
          },
          onAdComplete: () => {
            game.isPlaying = true;
          },
        }
      });

      // Request banner
      KasrahSDK.requestBanner('banner', '728x90');

      // Load saved game
      const saved = await KasrahSDK.loadData();
      if (saved) {
        game.level = saved.level;
        game.score = saved.score;
      }

      startGame();
    }

    function startGame() {
      game.isPlaying = true;
      game.sessionStart = Date.now();

      KasrahSDK.fireEvent('gameplayStart', {
        level: game.level,
        difficulty: 'normal'
      });

      // Auto-save every 30 seconds
      setInterval(autoSave, 30000);

      // Show ads periodically
      setInterval(showAdIfNeeded, 300000); // Every 5 minutes
    }

    async function autoSave() {
      await KasrahSDK.saveData({
        level: game.level,
        score: game.score,
        sessionDuration: Date.now() - game.sessionStart,
      });
    }

    async function showAdIfNeeded() {
      if (game.isPlaying && Math.random() > 0.5) {
        await KasrahSDK.showInterstitial({
          onComplete: () => {
            game.isPlaying = true;
          }
        });
      }
    }

    async function onLevelComplete() {
      game.level++;
      game.score += 1000;

      // Show rewarded ad opportunity
      await KasrahSDK.showRewarded({
        onReward: () => {
          game.score += 500;
          updateUI();
        }
      });

      startGame();
    }

    function updateUI() {
      document.title = `Level ${game.level} - Score ${game.score}`;
    }

    // Start
    initSDK();
  </script>
</body>
</html>
```

### Phaser.js Integration

```javascript
// In Phaser scene
class GameScene extends Phaser.Scene {
  async create() {
    // Initialize SDK
    await KasrahSDK.init();

    // Fire event
    KasrahSDK.fireEvent('gameplayStart', {
      scene: this.scene.key
    });

    // Setup ad pause
    KasrahSDK.on('AdStart', () => {
      this.physics.pause();
    });

    KasrahSDK.on('AdComplete', () => {
      this.physics.resume();
    });
  }

  async showRewardedAd() {
    await KasrahSDK.showRewarded({
      onReward: () => {
        this.addCoins(100);
      }
    });
  }

  async saveProgress() {
    await KasrahSDK.saveData({
      level: this.level,
      score: this.score,
      coins: this.coins,
    });
  }
}
```

---

## Troubleshooting

### SDK Not Initializing

**Problem:** `KasrahSDK is not defined`

**Solution:**
- Ensure script is loaded: `<script src="https://kasrah-sdk-pro.manus.space/kasrah-sdk-pro.js"></script>`
- Check browser console for errors
- Verify game domain is whitelisted

### Ads Not Showing

**Problem:** No ads display

**Solution:**
- Check SDK Inspector (Ctrl+Shift+I)
- Verify game is initialized: `KasrahSDK.isInitialized`
- Check ad frequency limit (30 seconds minimum)
- Verify ad containers exist in DOM

### Cloud Save Not Working

**Problem:** Data not persisting

**Solution:**
- Ensure `enableCloudSave` is true in config
- Check player ID: `KasrahSDK.playerId`
- Verify data is serializable (no functions)
- Check network requests in Inspector

### Performance Issues

**Problem:** Game slows down with ads

**Solution:**
- Use `onAdStart` to pause heavy processes
- Reduce animation complexity during ads
- Check console for JavaScript errors
- Profile with browser DevTools

### Inspector Not Opening

**Problem:** Ctrl+Shift+I doesn't work

**Solution:**
- Ensure inspector script is loaded
- Try different keyboard shortcut
- Check if browser has conflicting shortcuts
- Use `KasrahSDKInspector.open()` in console

---

## Support

For issues, questions, or feature requests:
- **Email:** support@kasrah-games.com
- **Discord:** [Join Community](https://discord.gg/kasrah)
- **GitHub:** [Report Issue](https://github.com/AbuSalehBinshaq/Kasrah-SDK-Pro)

---

**Happy Game Development! 🎮**
