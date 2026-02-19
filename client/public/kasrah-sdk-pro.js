/**
 * Kasrah SDK Pro v1.0.0
 * Advanced Ad & Analytics Platform for Web Games
 * 
 * Features:
 * - Auto-detection of Game ID from domain/referrer
 * - Interstitial & Rewarded Video Ads
 * - Responsive Banner Ads
 * - Cloud Save System
 * - Event Tracking & Analytics
 * - Zero dependencies, lightweight, production-ready
 */

(function(global) {
  'use strict';

  const SDK_VERSION = '1.0.0';
  const SDK_NAME = 'KasrahSDK';
  const DEFAULT_API_URL = 'https://kasrah-sdk-pro.manus.space';
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
          throw new Error('Could not detect Game ID. Please provide it manually.');
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

        // Verify game exists on backend
        const gameResponse = await this._fetch(`/api/sdk/games/${this.gameId}`);
        if (!gameResponse.success) {
          throw new Error(`Game not found: ${this.gameId}`);
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
        this._fireCallback('onAdError', { error: error.message });
        return false;
      }
    }

    /**
     * Show Interstitial Ad (Commercial Break)
     */
    async showInterstitial(options = {}) {
      if (!this.isInitialized) {
        this._logWarn('SDK not initialized');
        return false;
      }

      // Check ad frequency
      const now = Date.now();
      if (now - this.lastAdTime < MIN_AD_INTERVAL) {
        this._logInfo('Ad frequency limit not reached');
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
        await this._trackEvent('impression', adResponse.ad.id);

        // Render ad
        this._renderAdUI(adResponse.ad, {
          type: 'interstitial',
          onClose: async () => {
            this.isLoading = false;
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
        return false;
      }
    }

    /**
     * Show Rewarded Ad
     */
    async showRewarded(options = {}) {
      if (!this.isInitialized) {
        this._logWarn('SDK not initialized');
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
        await this._trackEvent('impression', adResponse.ad.id);

        // Render ad
        this._renderAdUI(adResponse.ad, {
          type: 'rewarded',
          onClose: async (completed) => {
            this.isLoading = false;
            if (completed) {
              await this._trackEvent('complete', adResponse.ad.id);
              this._fireCallback('onAdComplete');
              if (options.onReward) options.onReward();
            } else {
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
        return false;
      }
    }

    /**
     * Request Banner Ad
     */
    async requestBanner(containerId, size = '300x250') {
      if (!this.isInitialized) {
        this._logWarn('SDK not initialized');
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
        await this._trackEvent('impression', adResponse.ad.id);

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

        // Queue event
        this.eventQueue.push(event);

        // Fire callback if exists
        const callbackName = `onGameplayStart`;
        if (this.callbacks[callbackName]) {
          this.callbacks[callbackName](metadata);
        }

        this._logInfo(`Event fired: ${eventType}`);
      } catch (error) {
        this._logError(`Event fire failed: ${eventType}`, error);
      }
    }

    /**
     * Save Player Data
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

        return response.success;
      } catch (error) {
        this._logError('Save data failed', error);
        return false;
      }
    }

    /**
     * Load Player Data
     */
    async loadData() {
      if (!this.isInitialized || !this.config.enableCloudSave) {
        return null;
      }

      try {
        const response = await this._fetch(`/api/sdk/cloud-save?gameId=${this.gameId}&playerId=${this.playerId}`);
        return response.success ? response.data : null;
      } catch (error) {
        this._logError('Load data failed', error);
        return null;
      }
    }

    /**
     * Register Callback
     */
    on(eventName, callback) {
      if (this.callbacks.hasOwnProperty(`on${eventName}`)) {
        this.callbacks[`on${eventName}`] = callback;
      }
    }

    /**
     * Remove Callback
     */
    off(eventName) {
      if (this.callbacks.hasOwnProperty(`on${eventName}`)) {
        this.callbacks[`on${eventName}`] = null;
      }
    }

    // ============ PRIVATE METHODS ============

    /**
     * Auto-detect Game ID from domain/referrer
     */
    _detectGameId() {
      // Try URL params first
      const params = new URLSearchParams(window.location.search);
      const gameId = params.get('gameId');
      if (gameId) return gameId;

      // Try from pathname
      const pathSegments = window.location.pathname.split('/').filter(s => s);
      if (pathSegments.length > 0) {
        return pathSegments[pathSegments.length - 1];
      }

      // Try from domain
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      if (parts.length > 2) {
        return parts[0];
      }

      return null;
    }

    /**
     * Generate unique player ID
     */
    _generatePlayerId() {
      let playerId = localStorage.getItem('kasrah_player_id');
      if (!playerId) {
        playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('kasrah_player_id', playerId);
      }
      return playerId;
    }

    /**
     * Fetch helper
     */
    async _fetch(endpoint, options = {}) {
      const url = `${this.apiUrl}${endpoint}`;
      const fetchOptions = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Game-ID': this.gameId,
          'X-Player-ID': this.playerId,
          'X-SDK-Version': SDK_VERSION,
        },
      };

      if (options.body) {
        fetchOptions.body = JSON.stringify(options.body);
      }

      try {
        const response = await fetch(url, fetchOptions);
        return await response.json();
      } catch (error) {
        this._logError(`Fetch failed: ${endpoint}`, error);
        throw error;
      }
    }

    /**
     * Track ad event
     */
    async _trackEvent(eventType, adId) {
      try {
        await this._fetch('/api/sdk/ad-events', {
          method: 'POST',
          body: {
            gameId: this.gameId,
            adId: adId,
            eventType: eventType,
            playerId: this.playerId,
            userAgent: navigator.userAgent,
          }
        });
      } catch (error) {
        this._logError(`Track event failed: ${eventType}`, error);
      }
    }

    /**
     * Render Ad UI
     */
    _renderAdUI(ad, options = {}) {
      const overlay = document.createElement('div');
      overlay.id = 'kasrah-ad-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(8px);
      `;

      const adBox = document.createElement('div');
      adBox.style.cssText = `
        position: relative;
        width: 90%;
        max-width: 400px;
        background: white;
        border-radius: 24px;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        color: #333;
        text-align: center;
        animation: kasrahPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      `;

      const imageContainer = document.createElement('div');
      imageContainer.style.cssText = `
        height: 220px;
        background: #f8f9fa;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      const img = document.createElement('img');
      img.src = ad.imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="180"%3E%3Crect fill="%23ddd" width="180" height="180"/%3E%3C/svg%3E';
      img.style.cssText = 'max-width: 180px; filter: drop-shadow(0 5px 15px rgba(0,0,0,0.1));';
      imageContainer.appendChild(img);
      adBox.appendChild(imageContainer);

      const content = document.createElement('div');
      content.style.cssText = 'padding: 30px;';
      content.innerHTML = `
        <h3 style="margin: 0 0 12px 0; font-size: 22px; color: #1a1a1a;">${ad.title}</h3>
        <p style="margin: 0 0 25px 0; color: #666; font-size: 15px; line-height: 1.6;">${ad.description || 'Click to continue'}</p>
      `;
      adBox.appendChild(content);

      const button = document.createElement('a');
      button.href = ad.clickUrl || '#';
      button.target = '_blank';
      button.style.cssText = `
        display: block;
        background: linear-gradient(135deg, #e67e22, #d35400);
        color: white;
        padding: 14px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: bold;
        font-size: 17px;
        box-shadow: 0 4px 15px rgba(230, 126, 34, 0.3);
        margin: 0 30px 30px;
        cursor: pointer;
      `;
      button.textContent = options.type === 'rewarded' ? 'Watch for Reward' : 'Continue';
      button.onclick = (e) => {
        if (options.type === 'rewarded') {
          e.preventDefault();
          setTimeout(() => {
            overlay.remove();
            if (options.onClose) options.onClose(true);
          }, 3000);
        } else {
          setTimeout(() => {
            overlay.remove();
            if (options.onClose) options.onClose(true);
          }, 1000);
        }
      };
      adBox.appendChild(button);

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.style.cssText = `
        position: absolute;
        top: 15px;
        left: 15px;
        background: #f1f2f6;
        border: none;
        color: #2f3542;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 22px;
        cursor: pointer;
        transition: 0.2s;
      `;
      closeBtn.onclick = () => {
        overlay.remove();
        if (options.onClose) options.onClose(false);
      };
      closeBtn.onmouseover = () => closeBtn.style.background = '#dfe4ea';
      closeBtn.onmouseout = () => closeBtn.style.background = '#f1f2f6';
      adBox.appendChild(closeBtn);

      overlay.appendChild(adBox);
      document.body.appendChild(overlay);

      // Add animation
      const style = document.createElement('style');
      style.textContent = `
        @keyframes kasrahPop {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    /**
     * Render Banner
     */
    _renderBanner(container, ad, size) {
      const banner = document.createElement('div');
      banner.style.cssText = `
        width: 100%;
        max-width: ${size === '728x90' ? '728px' : size === '320x50' ? '320px' : '300px'};
        height: ${size === '728x90' ? '90px' : size === '320x50' ? '50px' : '250px'};
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: hidden;
        position: relative;
      `;

      const link = document.createElement('a');
      link.href = ad.clickUrl || '#';
      link.target = '_blank';
      link.style.cssText = 'position: absolute; width: 100%; height: 100%; top: 0; left: 0;';
      link.onclick = async () => {
        await this._trackEvent('click', ad.id);
      };

      banner.appendChild(link);

      const content = document.createElement('div');
      content.style.cssText = 'color: white; text-align: center; font-weight: bold; pointer-events: none;';
      content.textContent = ad.title || 'Advertisement';
      banner.appendChild(content);

      container.appendChild(banner);
    }

    /**
     * Show Fallback Ad
     */
    _showFallbackAd(options = {}) {
      const fallbackAd = {
        title: 'Kasrah Games',
        description: 'Play amazing games on Kasrah Games platform!',
        imageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="180" height="180"%3E%3Crect fill="%23667eea" width="180" height="180"/%3E%3Ctext x="50%25" y="50%25" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle"%3EKasrah%3C/text%3E%3C/svg%3E',
        clickUrl: 'https://kasrah-games.com',
      };

      this._renderAdUI(fallbackAd, {
        type: 'interstitial',
        onClose: () => {
          this.isLoading = false;
          if (options.onComplete) options.onComplete();
        }
      });

      return true;
    }

    /**
     * Start event queue processor
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
     * Fire callback
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
      console.log(`%c[Kasrah SDK] ${message}`, 'color: #667eea; font-weight: bold;');
    }

    _logWarn(message) {
      console.warn(`%c[Kasrah SDK] ${message}`, 'color: #f39c12; font-weight: bold;');
    }

    _logError(message, error) {
      console.error(`%c[Kasrah SDK] ${message}`, 'color: #e74c3c; font-weight: bold;', error);
    }
  }

  // Create singleton instance
  global.KasrahSDK = new KasrahSDK();

})(window);
