/**
 * Kasrah SDK Pro v1.1.0
 * Advanced Ad & Analytics Platform for Web Games
 * 
 * Features:
 * - Auto-detection of Game ID from domain/referrer
 * - Interstitial & Rewarded Video Ads
 * - Responsive Banner Ads
 * - Cloud Save System
 * - Event Tracking & Analytics
 * - Zero dependencies, lightweight, production-ready
 * 
 * Usage:
 * <script src="https://kasrah-sdk.onrender.com/sdk/kasrah-sdk.js"></script>
 * <script>
 *   KasrahSDK.init({ gameId: 'your-game-slug' }).then(() => {
 *     console.log('SDK Ready!');
 *   });
 * </script>
 */

(function(global) {
  'use strict';

  const SDK_VERSION = '1.1.0';
  const SDK_NAME = 'KasrahSDK';
  const DEFAULT_API_URL = 'https://kasrah-sdk.onrender.com';
  const AD_TIMEOUT = 30000; // 30 seconds
  const MIN_AD_INTERVAL = 30000; // 30 seconds between ads

  /**
   * Core SDK Class
   */
  class KasrahSDK {
    constructor() {
      this.version = SDK_VERSION;
      this.apiUrl = DEFAULT_API_URL;
      this.gameId = null;
      this.playerId = this._generatePlayerId();
      this.isInitialized = false;
      this.isLoading = false;
      this.lastAdTime = 0;
      this.adContainers = new Map();
      this.eventQueue = [];
      this.callbacks = {
        onAdStart: null,
        onAdComplete: null,
        onAdError: null,
        onAdClose: null,
        onGameplayStart: null,
        onGameplayStop: null,
        onGameLoadingFinished: null,
        onHappyTime: null,
      };
      this.config = {
        adFrequency: 30,
        enableBanners: true,
        enableInterstitial: true,
        enableRewarded: true,
        enableCloudSave: true,
      };

      this._logInfo(`Kasrah SDK v${SDK_VERSION} Loaded`);
    }

    /**
     * Initialize SDK with auto-detection
     * @param {Object} options - { gameId, apiUrl, config, callbacks }
     */
    async init(options = {}) {
      if (this.isInitialized) {
        this._logWarn('SDK already initialized');
        return true;
      }

      try {
        // Auto-detect Game ID
        this.gameId = options.gameId || this._detectGameId();
        if (!this.gameId) {
          throw new Error('Could not detect Game ID. Please provide it manually via options.gameId');
        }

        // Set API URL
        this.apiUrl = options.apiUrl || DEFAULT_API_URL;

        // Merge config
        if (options.config) {
          this.config = { ...this.config, ...options.config };
        }

        // Merge callbacks
        if (options.callbacks) {
          this.callbacks = { ...this.callbacks, ...options.callbacks };
        }

        // Initialize with backend
        const initResponse = await this._fetch('/api/sdk/init', {
          method: 'POST',
          body: { gameId: this.gameId }
        });

        if (initResponse.success && initResponse.config) {
          // Merge server config
          this.config = { ...this.config, ...initResponse.config };
          this._logInfo(`Config loaded from server`);
        } else {
          // Try to verify game exists
          const gameResponse = await this._fetch(`/api/sdk/games/${this.gameId}`);
          if (!gameResponse.success) {
            this._logWarn(`Game not found on server: ${this.gameId}. Running in offline mode.`);
          }
        }

        this.isInitialized = true;
        this._logInfo(`SDK initialized for game: ${this.gameId}`);

        // Start event queue processor
        this._startEventProcessor();

        // Fire gameLoadingFinished event
        this.fireEvent('gameLoadingFinished');

        return true;
      } catch (error) {
        this._logError('Initialization failed', error);
        // Still mark as initialized to allow offline usage
        this.isInitialized = true;
        this._fireCallback('onAdError', { error: error.message });
        return false;
      }
    }

    /**
     * Show Interstitial Ad (Commercial Break)
     * @param {Object} options - { onComplete, onError }
     */
    async showInterstitial(options = {}) {
      if (!this.isInitialized) {
        this._logWarn('SDK not initialized. Call KasrahSDK.init() first.');
        if (options.onError) options.onError('SDK not initialized');
        return false;
      }

      if (!this.config.enableInterstitial) {
        this._logInfo('Interstitial ads disabled for this game');
        if (options.onComplete) options.onComplete();
        return false;
      }

      // Check ad frequency
      const now = Date.now();
      if (now - this.lastAdTime < (this.config.adFrequency * 1000 || MIN_AD_INTERVAL)) {
        this._logInfo('Ad frequency limit not reached');
        if (options.onComplete) options.onComplete();
        return false;
      }

      this.lastAdTime = now;

      try {
        this.isLoading = true;
        this._fireCallback('onAdStart');

        // Fetch ad from server
        const adResponse = await this._fetch('/api/sdk/ads', {
          method: 'POST',
          body: {
            gameId: this.gameId,
            type: 'interstitial',
            playerId: this.playerId,
          }
        });

        if (!adResponse.success || !adResponse.ad) {
          this._logInfo('No ad available, showing fallback');
          return this._showFallbackAd(options);
        }

        // Track impression
        await this._trackAdEvent('impression', adResponse.ad.id);

        // Render ad
        this._renderAdUI(adResponse.ad, {
          type: 'interstitial',
          onClose: async (completed) => {
            this.isLoading = false;
            await this._trackAdEvent('close', adResponse.ad.id);
            this._fireCallback('onAdComplete');
            if (options.onComplete) options.onComplete();
          },
          onError: (error) => {
            this.isLoading = false;
            this._fireCallback('onAdError', { error });
            if (options.onError) options.onError(error);
          }
        });

        return true;
      } catch (error) {
        this.isLoading = false;
        this._logError('Interstitial ad failed', error);
        this._fireCallback('onAdError', { error: error.message });
        if (options.onError) options.onError(error.message);
        return false;
      }
    }

    /**
     * Show Rewarded Ad
     * @param {Object} options - { onReward, onError }
     */
    async showRewarded(options = {}) {
      if (!this.isInitialized) {
        this._logWarn('SDK not initialized. Call KasrahSDK.init() first.');
        if (options.onError) options.onError('SDK not initialized');
        return false;
      }

      if (!this.config.enableRewarded) {
        this._logInfo('Rewarded ads disabled for this game');
        if (options.onError) options.onError('Rewarded ads disabled');
        return false;
      }

      try {
        this.isLoading = true;
        this._fireCallback('onAdStart');

        // Fetch rewarded ad
        const adResponse = await this._fetch('/api/sdk/ads', {
          method: 'POST',
          body: {
            gameId: this.gameId,
            type: 'rewarded',
            playerId: this.playerId,
          }
        });

        if (!adResponse.success || !adResponse.ad) {
          this._logInfo('No rewarded ad available');
          this.isLoading = false;
          if (options.onError) options.onError('No ad available');
          return false;
        }

        // Track impression
        await this._trackAdEvent('impression', adResponse.ad.id);

        // Render ad
        this._renderAdUI(adResponse.ad, {
          type: 'rewarded',
          onClose: async (completed) => {
            this.isLoading = false;
            if (completed) {
              await this._trackAdEvent('complete', adResponse.ad.id);
              this._fireCallback('onAdComplete');
              if (options.onReward) options.onReward();
            } else {
              await this._trackAdEvent('close', adResponse.ad.id);
              if (options.onError) options.onError('Ad not completed');
            }
          },
          onError: (error) => {
            this.isLoading = false;
            this._fireCallback('onAdError', { error });
            if (options.onError) options.onError(error);
          }
        });

        return true;
      } catch (error) {
        this.isLoading = false;
        this._logError('Rewarded ad failed', error);
        if (options.onError) options.onError(error.message);
        return false;
      }
    }

    /**
     * Request Banner Ad
     * @param {string} containerId - HTML element ID
     * @param {string} size - '300x250', '728x90', '320x50'
     */
    async requestBanner(containerId, size = '300x250') {
      if (!this.isInitialized) {
        this._logWarn('SDK not initialized');
        return false;
      }

      if (!this.config.enableBanners) {
        this._logInfo('Banner ads disabled for this game');
        return false;
      }

      try {
        const container = document.getElementById(containerId);
        if (!container) {
          throw new Error(`Container not found: ${containerId}`);
        }

        // Fetch banner ad
        const adResponse = await this._fetch('/api/sdk/ads', {
          method: 'POST',
          body: {
            gameId: this.gameId,
            type: 'banner',
            size: size,
            playerId: this.playerId,
          }
        });

        if (!adResponse.success || !adResponse.ad) {
          this._logInfo(`No banner available for size: ${size}`);
          return false;
        }

        // Track impression
        await this._trackAdEvent('impression', adResponse.ad.id);

        // Render banner
        this._renderBanner(container, adResponse.ad, size);
        this.adContainers.set(containerId, adResponse.ad.id);

        return true;
      } catch (error) {
        this._logError('Banner request failed', error);
        return false;
      }
    }

    /**
     * Fire Game Event
     * @param {string} eventType - 'gameplayStart', 'gameplayStop', 'gameLoadingFinished', 'happyTime'
     * @param {Object} metadata - Additional data
     */
    async fireEvent(eventType, metadata = {}) {
      if (!this.isInitialized) {
        return;
      }

      try {
        const event = {
          gameId: this.gameId,
          playerId: this.playerId,
          eventType: eventType,
          metadata: metadata,
          timestamp: Date.now(),
        };

        // Queue event for batch sending
        this.eventQueue.push(event);

        // Fire corresponding callback
        const callbackMap = {
          'gameplayStart': 'onGameplayStart',
          'gameplayStop': 'onGameplayStop',
          'gameLoadingFinished': 'onGameLoadingFinished',
          'happyTime': 'onHappyTime',
        };
        
        const callbackName = callbackMap[eventType];
        if (callbackName && this.callbacks[callbackName]) {
          this.callbacks[callbackName](metadata);
        }

        this._logInfo(`Event fired: ${eventType}`);
      } catch (error) {
        this._logError(`Event fire failed: ${eventType}`, error);
      }
    }

    /**
     * Save Player Data (Cloud Save)
     * @param {Object} data - Data to save
     * @param {Object} options - { isEncrypted }
     */
    async saveData(data, options = {}) {
      if (!this.isInitialized || !this.config.enableCloudSave) {
        return false;
      }

      try {
        const response = await this._fetch('/api/sdk/cloud-save', {
          method: 'POST',
          body: {
            gameId: this.gameId,
            playerId: this.playerId,
            data: data,
            isEncrypted: options.isEncrypted || false,
          }
        });

        if (response.success) {
          this._logInfo('Data saved to cloud');
        }

        return response.success;
      } catch (error) {
        this._logError('Save data failed', error);
        return false;
      }
    }

    /**
     * Load Player Data (Cloud Save)
     * @returns {Object|null} - Saved data or null
     */
    async loadData() {
      if (!this.isInitialized || !this.config.enableCloudSave) {
        return null;
      }

      try {
        const response = await this._fetch(`/api/sdk/cloud-save?gameId=${this.gameId}&playerId=${this.playerId}`);
        if (response.success && response.data) {
          this._logInfo('Data loaded from cloud');
          return response.data;
        }
        return null;
      } catch (error) {
        this._logError('Load data failed', error);
        return null;
      }
    }

    /**
     * Register Callback
     * @param {string} eventName - 'AdStart', 'AdComplete', 'AdError', 'AdClose', 'GameplayStart', 'GameplayStop'
     * @param {Function} callback
     */
    on(eventName, callback) {
      const key = `on${eventName}`;
      if (key in this.callbacks) {
        this.callbacks[key] = callback;
      } else {
        this._logWarn(`Unknown event: ${eventName}`);
      }
    }

    /**
     * Remove Callback
     */
    off(eventName) {
      const key = `on${eventName}`;
      if (key in this.callbacks) {
        this.callbacks[key] = null;
      }
    }

    /**
     * Get SDK version
     */
    getVersion() {
      return SDK_VERSION;
    }

    /**
     * Get player ID
     */
    getPlayerId() {
      return this.playerId;
    }

    /**
     * Get game ID
     */
    getGameId() {
      return this.gameId;
    }

    // ============ PRIVATE METHODS ============

    /**
     * Auto-detect Game ID from URL or domain
     */
    _detectGameId() {
      // Try URL params first
      const params = new URLSearchParams(window.location.search);
      const gameId = params.get('gameId') || params.get('game_id') || params.get('game');
      if (gameId) return gameId;

      // Try from pathname - e.g. /games/my-game/ -> my-game
      const pathSegments = window.location.pathname.split('/').filter(s => s);
      if (pathSegments.length > 0) {
        // If URL is like /games/my-game, return my-game
        const lastSegment = pathSegments[pathSegments.length - 1];
        if (lastSegment && lastSegment !== 'index.html') {
          return lastSegment;
        }
        // If URL is like /games/my-game/, return my-game
        if (pathSegments.length >= 2) {
          return pathSegments[pathSegments.length - 2];
        }
      }

      // Try from subdomain - e.g. mygame.kasrah.com -> mygame
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        return parts[0];
      }

      return null;
    }

    /**
     * Generate unique player ID (persisted in localStorage)
     */
    _generatePlayerId() {
      try {
        let playerId = localStorage.getItem('kasrah_player_id');
        if (!playerId) {
          playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('kasrah_player_id', playerId);
        }
        return playerId;
      } catch (e) {
        // localStorage not available (e.g. in iframes)
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }

    /**
     * Fetch helper with error handling
     */
    async _fetch(endpoint, options = {}) {
      const url = endpoint.startsWith('http') ? endpoint : `${this.apiUrl}${endpoint}`;
      const fetchOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Game-ID': this.gameId || '',
          'X-Player-ID': this.playerId,
          'X-SDK-Version': SDK_VERSION,
        },
      };

      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      try {
        const response = await fetch(url, fetchOptions);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        this._logError(`Fetch failed: ${endpoint}`, error);
        throw error;
      }
    }

    /**
     * Track ad event
     */
    async _trackAdEvent(eventType, adId) {
      try {
        // Skip fallback ads
        if (adId && adId.startsWith('fallback_')) return;
        
        await this._fetch('/api/sdk/ad-events', {
          method: 'POST',
          body: {
            gameId: this.gameId,
            adId: adId,
            eventType: eventType,
            playerId: this.playerId,
          }
        });
      } catch (error) {
        // Non-critical, don't throw
        this._logError(`Track ad event failed: ${eventType}`, error);
      }
    }

    /**
     * Render Ad UI (Interstitial / Rewarded)
     */
    _renderAdUI(ad, options = {}) {
      // Remove existing overlay if any
      const existing = document.getElementById('kasrah-ad-overlay');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'kasrah-ad-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.92);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      const adBox = document.createElement('div');
      adBox.style.cssText = `
        position: relative;
        width: 90%;
        max-width: 420px;
        background: #ffffff;
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.5);
        color: #333;
        text-align: center;
        animation: kasrahPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      `;

      // Ad image
      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = `
        height: 240px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      `;

      if (ad.imageUrl) {
        const img = document.createElement('img');
        img.src = ad.imageUrl;
        img.style.cssText = 'max-width: 100%; max-height: 100%; object-fit: cover;';
        img.onerror = () => {
          imageContainer.innerHTML = `<div style="color:#aaa;font-size:14px;font-weight:600;">إعلان</div>`;
        };
        imageContainer.appendChild(img);
      } else {
        imageContainer.innerHTML = `
          <div style="text-align:center;padding:20px;">
            <div style="font-size:48px;margin-bottom:12px;">📢</div>
            <div style="color:#666;font-size:16px;font-weight:600;">${ad.title || 'إعلان'}</div>
          </div>
        `;
      }
      adBox.appendChild(imageContainer);

      // Ad content
      const content = document.createElement('div');
      content.style.cssText = 'padding: 28px 28px 10px;';
      content.innerHTML = `
        <h3 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #1a1a1a; line-height: 1.3;">${ad.title || 'إعلان'}</h3>
        ${ad.description ? `<p style="margin: 0 0 20px 0; color: #666; font-size: 14px; line-height: 1.6;">${ad.description}</p>` : ''}
      `;
      adBox.appendChild(content);

      // CTA Button
      const button = document.createElement('a');
      button.href = ad.clickUrl || '#';
      button.target = '_blank';
      button.rel = 'noopener noreferrer';
      button.style.cssText = `
        display: block;
        background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: white;
        padding: 16px 24px;
        border-radius: 16px;
        text-decoration: none;
        font-weight: 800;
        font-size: 16px;
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.35);
        margin: 0 28px 28px;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      `;
      button.textContent = options.type === 'rewarded' ? '🎁 شاهد للحصول على المكافأة' : '🔗 زيارة الإعلان';
      button.onmouseover = () => { button.style.transform = 'scale(1.02)'; };
      button.onmouseout = () => { button.style.transform = 'scale(1)'; };
      
      if (options.type === 'rewarded') {
        // Rewarded: must watch for 5 seconds
        let countdown = 5;
        button.textContent = `⏱️ انتظر ${countdown} ثوانٍ...`;
        button.style.background = '#9ca3af';
        button.style.cursor = 'not-allowed';
        button.style.pointerEvents = 'none';
        
        const timer = setInterval(() => {
          countdown--;
          if (countdown > 0) {
            button.textContent = `⏱️ انتظر ${countdown} ثوانٍ...`;
          } else {
            clearInterval(timer);
            button.textContent = '🎁 احصل على مكافأتك!';
            button.style.background = 'linear-gradient(135deg, #059669, #047857)';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.onclick = (e) => {
              e.preventDefault();
              overlay.remove();
              if (options.onClose) options.onClose(true);
            };
          }
        }, 1000);
      } else {
        button.onclick = (e) => {
          // Track click
          this._trackAdEvent('click', ad.id);
          setTimeout(() => {
            overlay.remove();
            if (options.onClose) options.onClose(true);
          }, 500);
        };
      }
      adBox.appendChild(button);

      // Kasrah branding
      const branding = document.createElement('div');
      branding.style.cssText = 'padding: 0 28px 20px; color: #aaa; font-size: 11px; font-weight: 600;';
      branding.textContent = 'إعلان مقدم من Kasrah SDK';
      adBox.appendChild(branding);

      // Close button (for interstitial only, rewarded must watch)
      if (options.type !== 'rewarded') {
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
          position: absolute;
          top: 14px;
          right: 14px;
          background: rgba(0,0,0,0.5);
          border: none;
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          z-index: 1;
        `;
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(0,0,0,0.7)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(0,0,0,0.5)';
        closeBtn.onclick = () => {
          overlay.remove();
          if (options.onClose) options.onClose(false);
        };
        adBox.appendChild(closeBtn);
      }

      overlay.appendChild(adBox);
      document.body.appendChild(overlay);

      // Add animation styles
      if (!document.getElementById('kasrah-sdk-styles')) {
        const style = document.createElement('style');
        style.id = 'kasrah-sdk-styles';
        style.textContent = `
          @keyframes kasrahPop {
            from { opacity: 0; transform: scale(0.85) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `;
        document.head.appendChild(style);
      }
    }

    /**
     * Render Banner Ad
     */
    _renderBanner(container, ad, size) {
      const dimensions = {
        '728x90': { width: '728px', height: '90px' },
        '320x50': { width: '320px', height: '50px' },
        '300x250': { width: '300px', height: '250px' },
      };

      const dim = dimensions[size] || dimensions['300x250'];

      container.innerHTML = '';
      
      const banner = document.createElement('div');
      banner.style.cssText = `
        width: 100%;
        max-width: ${dim.width};
        height: ${dim.height};
        background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: hidden;
        position: relative;
        box-shadow: 0 4px 15px rgba(124, 58, 237, 0.25);
        transition: transform 0.2s;
      `;
      banner.onmouseover = () => banner.style.transform = 'scale(1.01)';
      banner.onmouseout = () => banner.style.transform = 'scale(1)';

      if (ad.imageUrl) {
        const img = document.createElement('img');
        img.src = ad.imageUrl;
        img.style.cssText = 'position: absolute; width: 100%; height: 100%; object-fit: cover;';
        banner.appendChild(img);
      }

      const link = document.createElement('a');
      link.href = ad.clickUrl || '#';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.cssText = 'position: absolute; width: 100%; height: 100%; top: 0; left: 0; z-index: 2;';
      link.onclick = async () => {
        await this._trackAdEvent('click', ad.id);
      };
      banner.appendChild(link);

      if (!ad.imageUrl) {
        const content = document.createElement('div');
        content.style.cssText = 'color: white; text-align: center; font-weight: 800; font-size: 14px; pointer-events: none; z-index: 1; padding: 10px;';
        content.textContent = ad.title || 'إعلان';
        banner.appendChild(content);
      }

      container.appendChild(banner);
    }

    /**
     * Show Fallback Ad (when no ads available)
     */
    _showFallbackAd(options = {}) {
      const fallbackAd = {
        id: `fallback_${Date.now()}`,
        title: 'Kasrah Games',
        description: 'العب أفضل الألعاب على منصة كسرة!',
        imageUrl: null,
        clickUrl: 'https://kasrah-games.onrender.com',
      };

      this._renderAdUI(fallbackAd, {
        type: 'interstitial',
        onClose: () => {
          this.isLoading = false;
          this._fireCallback('onAdComplete');
          if (options.onComplete) options.onComplete();
        }
      });

      return true;
    }

    /**
     * Start event queue processor (sends events in batches)
     */
    _startEventProcessor() {
      setInterval(() => {
        if (this.eventQueue.length > 0) {
          const events = this.eventQueue.splice(0, 10);
          this._fetch('/api/sdk/game-events', {
            method: 'POST',
            body: { events }
          }).catch(error => this._logError('Event batch failed', error));
        }
      }, 5000);
    }

    /**
     * Fire callback safely
     */
    _fireCallback(callbackName, data = {}) {
      if (this.callbacks[callbackName]) {
        try {
          this.callbacks[callbackName](data);
        } catch (error) {
          this._logError(`Callback error: ${callbackName}`, error);
        }
      }
    }

    /**
     * Logging methods
     */
    _logInfo(message) {
      console.log(`%c[Kasrah SDK] ${message}`, 'color: #7c3aed; font-weight: bold;');
    }

    _logWarn(message) {
      console.warn(`%c[Kasrah SDK] ${message}`, 'color: #f59e0b; font-weight: bold;');
    }

    _logError(message, error) {
      console.error(`%c[Kasrah SDK] ${message}`, 'color: #ef4444; font-weight: bold;', error || '');
    }
  }

  // Create singleton instance
  const instance = new KasrahSDK();
  
  // Expose to global scope
  global.KasrahSDK = instance;

  // Also support CommonJS/AMD
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
  }

})(typeof window !== 'undefined' ? window : global);
