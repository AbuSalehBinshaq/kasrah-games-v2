/**
 * Kasrah SDK Inspector v1.0.0
 * Developer tool for testing and debugging SDK integration
 */

(function(global) {
  'use strict';

  class KasrahSDKInspector {
    constructor() {
      this.isOpen = false;
      this.logs = [];
      this.maxLogs = 100;
      this.events = [];
      this.maxEvents = 50;
      this.init();
    }

    init() {
      // Intercept console methods
      this._interceptConsole();
      
      // Create inspector UI
      this._createUI();
      
      // Listen for SDK events
      this._setupEventListeners();
      
      console.log('%c[Kasrah Inspector] Initialized', 'color: #00d4ff; font-weight: bold;');
    }

    /**
     * Create Inspector UI
     */
    _createUI() {
      // Create container
      const container = document.createElement('div');
      container.id = 'kasrah-inspector-container';
      container.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 400px;
        height: 500px;
        background: #1e1e1e;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        z-index: 2147483646;
        display: none;
        flex-direction: column;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        color: #e0e0e0;
        border: 1px solid #333;
      `;

      // Header
      const header = document.createElement('div');
      header.style.cssText = `
        padding: 12px 16px;
        background: #2a2a2a;
        border-bottom: 1px solid #333;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 12px 12px 0 0;
        cursor: move;
      `;

      const title = document.createElement('span');
      title.textContent = '🔍 Kasrah SDK Inspector';
      title.style.cssText = 'font-weight: bold; font-size: 13px;';
      header.appendChild(title);

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '✕';
      closeBtn.style.cssText = `
        background: transparent;
        border: none;
        color: #e0e0e0;
        cursor: pointer;
        font-size: 18px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      closeBtn.onclick = () => this.close();
      header.appendChild(closeBtn);

      container.appendChild(header);

      // Tabs
      const tabs = document.createElement('div');
      tabs.style.cssText = `
        display: flex;
        border-bottom: 1px solid #333;
        background: #252525;
      `;

      const tabNames = ['Console', 'Events', 'Network', 'Settings'];
      const tabButtons = {};

      tabNames.forEach((name) => {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.style.cssText = `
          flex: 1;
          padding: 8px;
          background: transparent;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 12px;
          border-bottom: 2px solid transparent;
          transition: 0.2s;
        `;
        btn.onclick = () => this._switchTab(name, tabButtons);
        tabs.appendChild(btn);
        tabButtons[name] = btn;
      });

      container.appendChild(tabs);

      // Content area
      const content = document.createElement('div');
      content.id = 'kasrah-inspector-content';
      content.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 12px;
        background: #1e1e1e;
      `;

      // Console tab
      const consoleTab = document.createElement('div');
      consoleTab.id = 'tab-console';
      consoleTab.style.cssText = 'display: block;';
      consoleTab.innerHTML = '<div id="kasrah-console-logs" style="font-size: 11px; line-height: 1.5;"></div>';
      content.appendChild(consoleTab);

      // Events tab
      const eventsTab = document.createElement('div');
      eventsTab.id = 'tab-events';
      eventsTab.style.cssText = 'display: none;';
      eventsTab.innerHTML = '<div id="kasrah-events-logs" style="font-size: 11px; line-height: 1.5;"></div>';
      content.appendChild(eventsTab);

      // Network tab
      const networkTab = document.createElement('div');
      networkTab.id = 'tab-network';
      networkTab.style.cssText = 'display: none;';
      networkTab.innerHTML = '<div id="kasrah-network-logs" style="font-size: 11px; line-height: 1.5;"></div>';
      content.appendChild(networkTab);

      // Settings tab
      const settingsTab = document.createElement('div');
      settingsTab.id = 'tab-settings';
      settingsTab.style.cssText = 'display: none;';
      settingsTab.innerHTML = `
        <div style="font-size: 12px;">
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; color: #00d4ff;">Game ID</label>
            <input type="text" id="kasrah-game-id" style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 4px;" readonly />
          </div>
          <div style="margin-bottom: 12px;">
            <label style="display: block; margin-bottom: 4px; color: #00d4ff;">Player ID</label>
            <input type="text" id="kasrah-player-id" style="width: 100%; padding: 6px; background: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 4px;" readonly />
          </div>
          <button id="kasrah-test-interstitial" style="width: 100%; padding: 8px; background: #667eea; border: none; color: white; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">Test Interstitial Ad</button>
          <button id="kasrah-test-rewarded" style="width: 100%; padding: 8px; background: #764ba2; border: none; color: white; border-radius: 4px; cursor: pointer; margin-bottom: 8px;">Test Rewarded Ad</button>
          <button id="kasrah-test-banner" style="width: 100%; padding: 8px; background: #f093fb; border: none; color: white; border-radius: 4px; cursor: pointer;">Test Banner</button>
        </div>
      `;
      content.appendChild(settingsTab);

      container.appendChild(content);

      // Footer with clear button
      const footer = document.createElement('div');
      footer.style.cssText = `
        padding: 8px 12px;
        border-top: 1px solid #333;
        display: flex;
        gap: 8px;
        background: #252525;
        border-radius: 0 0 12px 12px;
      `;

      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Clear';
      clearBtn.style.cssText = `
        flex: 1;
        padding: 6px;
        background: #444;
        border: none;
        color: #e0e0e0;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      `;
      clearBtn.onclick = () => this._clearLogs();
      footer.appendChild(clearBtn);

      const exportBtn = document.createElement('button');
      exportBtn.textContent = 'Export';
      exportBtn.style.cssText = `
        flex: 1;
        padding: 6px;
        background: #444;
        border: none;
        color: #e0e0e0;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      `;
      exportBtn.onclick = () => this._exportLogs();
      footer.appendChild(exportBtn);

      container.appendChild(footer);

      document.body.appendChild(container);

      // Make draggable
      this._makeDraggable(container, header);

      // Store references
      this.container = container;
      this.tabButtons = tabButtons;
      this.consoleLogs = document.getElementById('kasrah-console-logs');
      this.eventLogs = document.getElementById('kasrah-events-logs');
      this.networkLogs = document.getElementById('kasrah-network-logs');

      // Setup test buttons
      document.getElementById('kasrah-test-interstitial').onclick = () => {
        if (window.KasrahSDK) {
          window.KasrahSDK.showInterstitial({
            onComplete: () => this._log('✓ Interstitial completed', 'success'),
            onError: (err) => this._log(`✗ Interstitial error: ${err}`, 'error'),
          });
        }
      };

      document.getElementById('kasrah-test-rewarded').onclick = () => {
        if (window.KasrahSDK) {
          window.KasrahSDK.showRewarded({
            onReward: () => this._log('✓ Reward granted', 'success'),
            onError: (err) => this._log(`✗ Rewarded error: ${err}`, 'error'),
          });
        }
      };

      document.getElementById('kasrah-test-banner').onclick = () => {
        if (window.KasrahSDK) {
          window.KasrahSDK.requestBanner('kasrah-test-banner-container', '300x250');
          this._log('✓ Banner requested', 'success');
        }
      };
    }

    /**
     * Switch tab
     */
    _switchTab(tabName, tabButtons) {
      // Hide all tabs
      document.querySelectorAll('#kasrah-inspector-content > div').forEach(tab => {
        tab.style.display = 'none';
      });

      // Show selected tab
      document.getElementById(`tab-${tabName.toLowerCase()}`).style.display = 'block';

      // Update button styles
      Object.entries(tabButtons).forEach(([name, btn]) => {
        if (name === tabName) {
          btn.style.color = '#00d4ff';
          btn.style.borderBottomColor = '#00d4ff';
        } else {
          btn.style.color = '#888';
          btn.style.borderBottomColor = 'transparent';
        }
      });
    }

    /**
     * Intercept console
     */
    _interceptConsole() {
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;

      console.log = (...args) => {
        originalLog(...args);
        this._log(args.join(' '), 'log');
      };

      console.error = (...args) => {
        originalError(...args);
        this._log(args.join(' '), 'error');
      };

      console.warn = (...args) => {
        originalWarn(...args);
        this._log(args.join(' '), 'warn');
      };
    }

    /**
     * Setup event listeners
     */
    _setupEventListeners() {
      if (window.KasrahSDK) {
        window.KasrahSDK.on('AdStart', () => {
          this._logEvent('Ad Started', 'info');
        });

        window.KasrahSDK.on('AdComplete', () => {
          this._logEvent('Ad Completed', 'success');
        });

        window.KasrahSDK.on('AdError', (data) => {
          this._logEvent(`Ad Error: ${data.error}`, 'error');
        });
      }
    }

    /**
     * Log message
     */
    _log(message, type = 'log') {
      const timestamp = new Date().toLocaleTimeString();
      const colors = {
        log: '#888',
        error: '#ff6b6b',
        warn: '#ffd93d',
        success: '#51cf66',
        info: '#00d4ff',
      };

      const color = colors[type] || colors.log;
      const entry = `<span style="color: #666;">[${timestamp}]</span> <span style="color: ${color};">${message}</span>`;

      this.logs.push(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.shift();
      }

      if (this.consoleLogs) {
        this.consoleLogs.innerHTML = this.logs.map(log => `<div>${log}</div>`).join('');
        this.consoleLogs.scrollTop = this.consoleLogs.scrollHeight;
      }
    }

    /**
     * Log event
     */
    _logEvent(message, type = 'info') {
      const timestamp = new Date().toLocaleTimeString();
      const colors = {
        info: '#00d4ff',
        success: '#51cf66',
        error: '#ff6b6b',
      };

      const color = colors[type] || colors.info;
      const entry = `<span style="color: #666;">[${timestamp}]</span> <span style="color: ${color};">${message}</span>`;

      this.events.push(entry);
      if (this.events.length > this.maxEvents) {
        this.events.shift();
      }

      if (this.eventLogs) {
        this.eventLogs.innerHTML = this.events.map(log => `<div>${log}</div>`).join('');
        this.eventLogs.scrollTop = this.eventLogs.scrollHeight;
      }
    }

    /**
     * Clear logs
     */
    _clearLogs() {
      this.logs = [];
      this.events = [];
      if (this.consoleLogs) this.consoleLogs.innerHTML = '';
      if (this.eventLogs) this.eventLogs.innerHTML = '';
    }

    /**
     * Export logs
     */
    _exportLogs() {
      const data = {
        timestamp: new Date().toISOString(),
        logs: this.logs,
        events: this.events,
        gameId: window.KasrahSDK?.gameId,
        playerId: window.KasrahSDK?.playerId,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kasrah-inspector-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    /**
     * Make draggable
     */
    _makeDraggable(element, handle) {
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

      handle.onmousedown = (e) => {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = () => {
          document.onmouseup = null;
          document.onmousemove = null;
        };
        document.onmousemove = (e) => {
          e.preventDefault();
          pos1 = pos3 - e.clientX;
          pos2 = pos4 - e.clientY;
          pos3 = e.clientX;
          pos4 = e.clientY;
          element.style.top = (element.offsetTop - pos2) + "px";
          element.style.left = (element.offsetLeft - pos1) + "px";
        };
      };
    }

    /**
     * Open inspector
     */
    open() {
      this.container.style.display = 'flex';
      this.isOpen = true;

      // Update settings
      if (window.KasrahSDK) {
        document.getElementById('kasrah-game-id').value = window.KasrahSDK.gameId || 'Not initialized';
        document.getElementById('kasrah-player-id').value = window.KasrahSDK.playerId || 'Not initialized';
      }
    }

    /**
     * Close inspector
     */
    close() {
      this.container.style.display = 'none';
      this.isOpen = false;
    }

    /**
     * Toggle inspector
     */
    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }
  }

  // Create global instance
  global.KasrahSDKInspector = new KasrahSDKInspector();

  // Keyboard shortcut: Ctrl+Shift+I
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      global.KasrahSDKInspector.toggle();
    }
  });

})(window);
