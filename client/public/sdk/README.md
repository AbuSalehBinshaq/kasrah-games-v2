# Kasrah SDK v1.0.0

Advanced Ad & Analytics Platform for Web Games

## Files

- **kasrah-sdk.js** - Main SDK file (20 KB, zero dependencies)
- **kasrah-sdk-inspector.js** - Developer debugging tool
- **DOCUMENTATION.md** - Complete API reference and examples

## Quick Start

```html
<script src="/sdk/kasrah-sdk.js"></script>

<script>
  // Initialize SDK
  await KasrahSDK.init({
    gameId: 'my-game',
    apiUrl: 'https://api.kasrah-games.com/api/sdk'
  });

  // Show interstitial ad
  await KasrahSDK.showInterstitial({
    onComplete: () => console.log('Ad finished')
  });

  // Save player data
  await KasrahSDK.saveData({
    level: 5,
    score: 1000,
    inventory: ['sword', 'shield']
  });

  // Load player data
  const data = await KasrahSDK.loadData();
</script>
```

## Features

✅ Auto-detection of Game ID
✅ Interstitial & Rewarded Ads
✅ Responsive Banner Ads (300x250, 728x90, 320x50)
✅ Cloud Save System with versioning
✅ Event Tracking (gameplayStart, gameplayStop, etc.)
✅ Analytics & Impressions Tracking
✅ Zero Dependencies
✅ SDK Inspector Tool (Ctrl+Shift+I)
✅ Fallback Ad System

## API Endpoints Required

Your backend should implement these endpoints:

```
POST /api/sdk/init
GET /api/sdk/ads/:type
POST /api/sdk/ad-events
POST /api/sdk/game-events
POST /api/sdk/cloud-save
GET /api/sdk/cloud-save/:gameId/:playerId
GET /api/sdk/analytics/:gameId
```

## Documentation

See `DOCUMENTATION.md` for:
- Complete API reference
- Integration examples (HTML5, Phaser.js, Unity WebGL)
- Best practices
- Troubleshooting

## Support

Email: support@kasrah-games.com
Discord: [Join Community]
GitHub: [Report Issues]
