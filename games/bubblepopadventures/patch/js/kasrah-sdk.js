/**
 * Kasrah Games SDK v2.0.0
 * Professional Game Integration SDK - Simple & Secure
 * 
 * Usage:
 * <script src="https://kasrah-games.onrender.com/sdk/kasrah-sdk.js"></script>
 * <script>
 *   const sdk = new KasrahSDK({ apiUrl: 'https://kasrah-games.onrender.com' });
 *   await sdk.showVideoAd();
 * </script>
 */

class KasrahSDK {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || 'https://kasrah-games.onrender.com';
    this.debug = config.debug || false;
    this.sessionId = this._generateId();
    this.userId = config.userId || this._generateId();
    this.adInProgress = false;
    this.listeners = {};
    
    this._log('SDK initialized', { sessionId: this.sessionId, userId: this.userId });
  }

  /**
   * Show Video Advertisement
   */
  async showVideoAd() {
    if (this.adInProgress) {
      this._log('Ad already in progress');
      return false;
    }

    this.adInProgress = true;
    this._emit('adStart', { type: 'video' });

    try {
      const response = await fetch(`${this.apiUrl}/api/sdk/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to fetch video ad');

      const ad = await response.json();
      this._log('Video ad fetched', ad);

      // Simulate video playback (3-5 seconds)
      const duration = 3000 + Math.random() * 2000;
      await this._delay(duration);

      this._emit('adComplete', { type: 'video', ad });
      this.adInProgress = false;
      return true;
    } catch (error) {
      this._error('Video ad failed', error);
      this.adInProgress = false;
      return false;
    }
  }

  /**
   * Show Rewarded Advertisement
   */
  async showRewardedAd() {
    if (this.adInProgress) {
      this._log('Ad already in progress');
      return false;
    }

    this.adInProgress = true;
    this._emit('rewardedAdStart', { type: 'rewarded' });

    try {
      const response = await fetch(`${this.apiUrl}/api/sdk/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rewarded',
          sessionId: this.sessionId,
          userId: this.userId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to fetch rewarded ad');

      const ad = await response.json();
      this._log('Rewarded ad fetched', ad);

      // Simulate video playback (5-8 seconds)
      const duration = 5000 + Math.random() * 3000;
      await this._delay(duration);

      this._emit('rewardedAdComplete', { type: 'rewarded', ad, reward: true });
      this.adInProgress = false;
      return true;
    } catch (error) {
      this._error('Rewarded ad failed', error);
      this.adInProgress = false;
      return false;
    }
  }

  /**
   * Save Game Data (Cloud Storage)
   */
  async saveData(key, data) {
    try {
      const response = await fetch(`${this.apiUrl}/api/sdk/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          data,
          userId: this.userId,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to save data');

      const result = await response.json();
      this._log('Data saved', { key, result });
      this._emit('dataSaved', { key, data });
      return result;
    } catch (error) {
      this._error('Save data failed', error);
      return null;
    }
  }

  /**
   * Load Game Data (Cloud Storage)
   */
  async loadData(key) {
    try {
      const response = await fetch(`${this.apiUrl}/api/sdk/data?key=${key}&userId=${this.userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to load data');

      const result = await response.json();
      this._log('Data loaded', { key, result });
      this._emit('dataLoaded', { key, data: result });
      return result;
    } catch (error) {
      this._error('Load data failed', error);
      return null;
    }
  }

  /**
   * Track Game Event
   */
  async trackEvent(eventName, eventData = {}) {
    try {
      const response = await fetch(`${this.apiUrl}/api/sdk/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventData,
          userId: this.userId,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to track event');

      this._log('Event tracked', { eventName, eventData });
      this._emit('eventTracked', { eventName, eventData });
      return true;
    } catch (error) {
      this._error('Track event failed', error);
      return false;
    }
  }

  /**
   * Game Lifecycle Events
   */
  async gameStart() {
    return this.trackEvent('gameStart', { timestamp: Date.now() });
  }

  async gameEnd(score = 0) {
    return this.trackEvent('gameEnd', { score, timestamp: Date.now() });
  }

  async levelComplete(level, score) {
    return this.trackEvent('levelComplete', { level, score, timestamp: Date.now() });
  }

  /**
   * Event Listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  /**
   * Private Methods
   */
  _emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  _log(message, data = {}) {
    if (this.debug) {
      console.log(`[KasrahSDK] ${message}`, data);
    }
  }

  _error(message, error) {
    console.error(`[KasrahSDK] ${message}`, error);
    this._emit('error', { message, error });
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasrahSDK;
}
