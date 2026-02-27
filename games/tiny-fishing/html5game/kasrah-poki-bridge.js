/**
 * Kasrah SDK - Poki Bridge for Tiny Fishing
 * ==========================================
 * يعمل هذا الملف كجسر بين Kasrah SDK وواجهة Poki SDK التي تستخدمها اللعبة.
 * يستبدل جميع استدعاءات Poki SDK بـ Kasrah SDK مع الحفاظ على توافق الواجهة.
 * 
 * المميزات المدعومة:
 * - الإعلانات البينية (Interstitial Ads)
 * - إعلانات المكافأة (Rewarded Ads)
 * - إعلانات البانر (Banner Ads)
 * - الحفظ السحابي (Cloud Save)
 * - تتبع الأحداث (Event Tracking / Analytics)
 * - إدارة دورة حياة اللعبة (Gameplay Start/Stop)
 */

(function() {
  'use strict';

  // ============================================================
  // متغيرات الحالة
  // ============================================================
  var _kasrahReady = false;
  var _pauseCallback = null;
  var _unpauseCallback = null;
  var _gameLoadingFinished = false;
  var _loadingProgress = 0;

  // ============================================================
  // انتظار تحميل Kasrah SDK ثم التهيئة
  // ============================================================
  function waitForKasrahSDK(callback, maxAttempts) {
    maxAttempts = maxAttempts || 50;
    var attempts = 0;
    var interval = setInterval(function() {
      attempts++;
      if (window.KasrahSDK) {
        clearInterval(interval);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('[Kasrah Bridge] KasrahSDK not found after ' + maxAttempts + ' attempts. Running in fallback mode.');
        _kasrahReady = false;
        // تشغيل اللعبة بدون SDK
        _runGameFallback();
      }
    }, 100);
  }

  function _runGameFallback() {
    console.log('[Kasrah Bridge] Running in fallback mode (no SDK)');
    // تهيئة اللعبة مباشرة
    if (!window.AudioContext && !window.webkitAudioContext) window.g_WebAudioContext = {};
    if (typeof GameMaker_Init === 'function') {
      GameMaker_Init();
    }
    if (!window.AudioContext && !window.webkitAudioContext) window.g_WebAudioContext = null;
  }

  // ============================================================
  // تهيئة Kasrah SDK
  // ============================================================
  function initKasrahSDK() {
    if (!window.KasrahSDK) {
      console.warn('[Kasrah Bridge] KasrahSDK not available');
      _runGameFallback();
      return;
    }

    KasrahSDK.init({
      gameId: 'tiny-fishing',
      config: {
        adFrequency: 30,
        enableBanners: true,
        enableInterstitial: true,
        enableRewarded: true,
        enableCloudSave: true,
      },
      callbacks: {
        onAdStart: function() {
          console.log('[Kasrah Bridge] Ad started - pausing game');
          if (_pauseCallback && window['gml_Script_' + _pauseCallback]) {
            window['gml_Script_' + _pauseCallback]();
          }
        },
        onAdComplete: function() {
          console.log('[Kasrah Bridge] Ad completed - resuming game');
          if (_unpauseCallback && window['gml_Script_' + _unpauseCallback]) {
            window['gml_Script_' + _unpauseCallback]();
          }
        },
        onAdError: function(data) {
          console.warn('[Kasrah Bridge] Ad error:', data);
          if (_unpauseCallback && window['gml_Script_' + _unpauseCallback]) {
            window['gml_Script_' + _unpauseCallback]();
          }
        },
        onAdClose: function() {
          console.log('[Kasrah Bridge] Ad closed');
        },
        onGameplayStart: function() {
          console.log('[Kasrah Bridge] Gameplay started');
        },
        onGameplayStop: function() {
          console.log('[Kasrah Bridge] Gameplay stopped');
        },
        onGameLoadingFinished: function() {
          console.log('[Kasrah Bridge] Game loading finished');
        },
        onHappyTime: function() {
          console.log('[Kasrah Bridge] Happy time!');
        }
      }
    }).then(function(success) {
      _kasrahReady = true;
      console.log('[Kasrah Bridge] KasrahSDK initialized successfully:', success);

      // تحميل البيانات السحابية عند البدء
      _loadCloudData();

      // تشغيل اللعبة
      if (!window.AudioContext && !window.webkitAudioContext) window.g_WebAudioContext = {};
      if (typeof GameMaker_Init === 'function') {
        GameMaker_Init();
      }
      if (!window.AudioContext && !window.webkitAudioContext) window.g_WebAudioContext = null;

    }).catch(function(err) {
      console.warn('[Kasrah Bridge] KasrahSDK init failed:', err);
      _kasrahReady = false;
      _runGameFallback();
    });
  }

  // ============================================================
  // تحميل البيانات السحابية
  // ============================================================
  function _loadCloudData() {
    if (!_kasrahReady || !window.KasrahSDK) return;
    KasrahSDK.loadData().then(function(data) {
      if (data) {
        console.log('[Kasrah Bridge] Cloud data loaded:', data);
        // حفظ البيانات في localStorage للوصول السريع
        try {
          if (data.highScore) {
            localStorage.setItem('kasrah_highScore', data.highScore);
          }
          if (data.coins) {
            localStorage.setItem('kasrah_coins', data.coins);
          }
          if (data.unlockedItems) {
            localStorage.setItem('kasrah_unlockedItems', JSON.stringify(data.unlockedItems));
          }
        } catch(e) {}
      }
    }).catch(function(err) {
      console.warn('[Kasrah Bridge] Failed to load cloud data:', err);
    });
  }

  // ============================================================
  // استبدال وظائف Poki SDK بـ Kasrah SDK
  // ============================================================

  /**
   * poki_init - تهيئة SDK
   * تُستدعى من اللعبة عند بدء التحميل
   */
  window.poki_init = function(callbackPause, callbackUnpause, prod) {
    console.log('[Kasrah Bridge] poki_init called');
    _pauseCallback = callbackPause;
    _unpauseCallback = callbackUnpause;

    // إشعار SDK بانتهاء التحميل (سيتم تحديثه لاحقاً عبر poki_loadbar)
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.fireEvent('gameLoadingFinished');
    }
  };

  /**
   * poki_gameplayStart - بدء الجلسة
   */
  window.poki_gameplayStart = function() {
    console.log('[Kasrah Bridge] poki_gameplayStart called');
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.fireEvent('gameplayStart');
    }
  };

  /**
   * poki_gameplayStop - إيقاف الجلسة
   */
  window.poki_gameplayStop = function() {
    console.log('[Kasrah Bridge] poki_gameplayStop called');
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.fireEvent('gameplayStop');
    }
  };

  /**
   * poki_happyTime - لحظة سعادة (عند إنجاز شيء مميز)
   */
  window.poki_happyTime = function(magnitude) {
    console.log('[Kasrah Bridge] poki_happyTime called, magnitude:', magnitude);
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.fireEvent('happyTime', { magnitude: magnitude || 1.0 });
    }
  };

  /**
   * poki_commercialBreak - عرض إعلان بيني (Interstitial)
   * تُستدعى من اللعبة عند نقاط التوقف (بين المراحل، بعد الموت، إلخ)
   */
  window.poki_commercialBreak = function(gmcallback_adComplete) {
    console.log('[Kasrah Bridge] poki_commercialBreak called');

    if (!_kasrahReady || !window.KasrahSDK) {
      // fallback: استدعاء الـ callback مباشرة
      if (gmcallback_adComplete && window['gml_Script_' + gmcallback_adComplete]) {
        window['gml_Script_' + gmcallback_adComplete]();
      }
      if (_unpauseCallback && window['gml_Script_' + _unpauseCallback]) {
        window['gml_Script_' + _unpauseCallback]();
      }
      return;
    }

    KasrahSDK.showInterstitial({
      onComplete: function() {
        console.log('[Kasrah Bridge] Interstitial completed');
        if (_unpauseCallback && window['gml_Script_' + _unpauseCallback]) {
          window['gml_Script_' + _unpauseCallback]();
        }
        if (gmcallback_adComplete && window['gml_Script_' + gmcallback_adComplete]) {
          window['gml_Script_' + gmcallback_adComplete]();
        }
      },
      onError: function(err) {
        console.warn('[Kasrah Bridge] Interstitial error:', err);
        if (_unpauseCallback && window['gml_Script_' + _unpauseCallback]) {
          window['gml_Script_' + _unpauseCallback]();
        }
        if (gmcallback_adComplete && window['gml_Script_' + gmcallback_adComplete]) {
          window['gml_Script_' + gmcallback_adComplete]();
        }
      }
    });
  };

  /**
   * poki_rewarded_break_raw - عرض إعلان مكافأة (Rewarded)
   * تُستدعى عند طلب اللاعب مكافأة مقابل مشاهدة إعلان
   */
  window.poki_rewarded_break_raw = function(fn) {
    console.log('[Kasrah Bridge] poki_rewarded_break_raw called');

    if (!_kasrahReady || !window.KasrahSDK) {
      setTimeout(function() { if (fn) fn(false); }, 0);
      return;
    }

    KasrahSDK.showRewarded({
      onReward: function() {
        console.log('[Kasrah Bridge] Rewarded ad completed - reward earned!');
        if (fn) fn(true);
      },
      onError: function(err) {
        console.warn('[Kasrah Bridge] Rewarded ad error:', err);
        if (fn) fn(false);
      }
    });
  };

  /**
   * poki_commercial_break_raw - نسخة raw من الإعلان البيني
   */
  window.poki_commercial_break_raw = function(fn) {
    console.log('[Kasrah Bridge] poki_commercial_break_raw called');

    if (!_kasrahReady || !window.KasrahSDK) {
      setTimeout(function() { if (fn) fn(false); }, 0);
      return;
    }

    KasrahSDK.showInterstitial({
      onComplete: function() {
        if (fn) fn(true);
      },
      onError: function() {
        if (fn) fn(false);
      }
    });
  };

  /**
   * poki_loadbar - شريط التحميل
   * يُستدعى أثناء تحميل اللعبة لتحديث شريط التقدم
   */
  window.poki_loadbar = function(ctx, width, height, total, current, image) {
    // تحديث تقدم التحميل
    _loadingProgress = total > 0 ? (current / total) : 0;

    // رسم شريط التحميل
    if (ctx) {
      var backgroundColor = '#1a1a2e';
      var barBackgroundColor = '#16213e';
      var barForegroundColor = '#7c3aed';
      var barBorderColor = '#4f46e5';

      var barWidth = Math.round(width * 0.6);
      var barHeight = 20;
      var barBorderWidth = 2;
      var barOffset = 10;

      // خلفية
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);

      // صورة التحميل
      var totalHeight, barTop;
      if (image != null) {
        var imgX = (width - image.width) >> 1;
        var imgY = (height - (image.height + barOffset + barHeight)) >> 1;
        ctx.drawImage(image, imgX, imgY);
        barTop = imgY + image.height + barOffset;
      } else {
        barTop = (height - barHeight) >> 1;
      }

      // إطار الشريط
      var barLeft = (width - barWidth) >> 1;
      ctx.fillStyle = barBorderColor;
      ctx.fillRect(barLeft, barTop, barWidth, barHeight);

      var barInnerLeft = barLeft + barBorderWidth;
      var barInnerTop = barTop + barBorderWidth;
      var barInnerWidth = barWidth - barBorderWidth * 2;
      var barInnerHeight = barHeight - barBorderWidth * 2;

      // خلفية الشريط
      ctx.fillStyle = barBackgroundColor;
      ctx.fillRect(barInnerLeft, barInnerTop, barInnerWidth, barInnerHeight);

      // تقدم الشريط
      var barLoadedWidth = Math.round(barInnerWidth * (total > 0 ? current / total : 0));
      ctx.fillStyle = barForegroundColor;
      ctx.fillRect(barInnerLeft, barInnerTop, barLoadedWidth, barInnerHeight);
    }

    // إشعار SDK بانتهاء التحميل
    if (current >= total && !_gameLoadingFinished) {
      _gameLoadingFinished = true;
      if (_kasrahReady && window.KasrahSDK) {
        KasrahSDK.fireEvent('gameLoadingFinished');
      }
    }
  };

  /**
   * poki_init_raw - تهيئة raw
   */
  window.poki_init_raw = function() {
    console.log('[Kasrah Bridge] poki_init_raw called');
    var ctr = document.getElementById('gm4html5_div_id');
    if (ctr && !ctr.frames) ctr.frames = [];
    return 0;
  };

  /**
   * poki_script_closure_raw
   */
  window.poki_script_closure_raw = function(self, other, script, custom) {
    return function(result) {
      if (window.gml_Script_gmcallback_poki_closure) {
        window.gml_Script_gmcallback_poki_closure(self, other, script, result, custom);
      }
    };
  };

  /**
   * poki_is_blocked - التحقق من حجب الإعلانات
   */
  window.poki_is_blocked = function() {
    return false; // Kasrah SDK يتعامل مع هذا داخلياً
  };

  /**
   * poki_gameplay_start - بديل raw
   */
  window.poki_gameplay_start = function() {
    window.poki_gameplayStart();
  };

  /**
   * poki_gameplay_stop - بديل raw
   */
  window.poki_gameplay_stop = function() {
    window.poki_gameplayStop();
  };

  // ============================================================
  // محاكاة PokiSDK object للتوافق
  // ============================================================
  window.PokiSDK = {
    init: function() {
      return Promise.resolve(true);
    },
    gameLoadingStart: function() {
      console.log('[Kasrah Bridge] PokiSDK.gameLoadingStart (proxied)');
    },
    gameLoadingFinished: function() {
      console.log('[Kasrah Bridge] PokiSDK.gameLoadingFinished (proxied)');
      if (_kasrahReady && window.KasrahSDK) {
        KasrahSDK.fireEvent('gameLoadingFinished');
      }
    },
    gameLoadingProgress: function(opts) {
      if (opts && opts.percentageDone !== undefined) {
        _loadingProgress = opts.percentageDone;
      }
    },
    gameplayStart: function() {
      window.poki_gameplayStart();
    },
    gameplayStop: function() {
      window.poki_gameplayStop();
    },
    happyTime: function(magnitude) {
      window.poki_happyTime(magnitude);
    },
    commercialBreak: function() {
      return new Promise(function(resolve) {
        window.poki_commercial_break_raw(function() { resolve(); });
      });
    },
    rewardedBreak: function() {
      return new Promise(function(resolve) {
        window.poki_rewarded_break_raw(function(earned) { resolve(earned); });
      });
    },
    setDebug: function(debug) {
      console.log('[Kasrah Bridge] PokiSDK.setDebug:', debug);
    },
    _loadState: 0,
  };
  window.PokiSDK_OK = true;
  window.PokiSDK_loadState = 0;

  // ============================================================
  // إعداد Banner Ads
  // ============================================================
  function setupBannerAd() {
    if (!_kasrahReady || !window.KasrahSDK) return;

    // إنشاء حاوية البانر إذا لم تكن موجودة
    var bannerId = 'kasrah-banner-container';
    var existingBanner = document.getElementById(bannerId);
    if (!existingBanner) {
      var bannerContainer = document.createElement('div');
      bannerContainer.id = bannerId;
      bannerContainer.style.cssText = [
        'position: fixed',
        'bottom: 0',
        'left: 50%',
        'transform: translateX(-50%)',
        'z-index: 9999',
        'width: 320px',
        'height: 50px',
        'pointer-events: auto',
      ].join(';');
      document.body.appendChild(bannerContainer);
    }

    // طلب إعلان البانر
    KasrahSDK.requestBanner(bannerId, '320x50').then(function(success) {
      if (success) {
        console.log('[Kasrah Bridge] Banner ad loaded successfully');
      }
    }).catch(function(err) {
      console.warn('[Kasrah Bridge] Banner ad failed:', err);
    });
  }

  // ============================================================
  // حفظ البيانات السحابي - واجهة عامة
  // ============================================================
  window.KasrahSaveGameData = function(data) {
    if (!_kasrahReady || !window.KasrahSDK) {
      // حفظ محلي فقط
      try {
        localStorage.setItem('kasrah_gameData', JSON.stringify(data));
      } catch(e) {}
      return;
    }
    KasrahSDK.saveData(data).then(function(success) {
      if (success) {
        console.log('[Kasrah Bridge] Game data saved to cloud:', data);
      }
    }).catch(function(err) {
      console.warn('[Kasrah Bridge] Cloud save failed:', err);
    });
  };

  window.KasrahLoadGameData = function(callback) {
    if (!_kasrahReady || !window.KasrahSDK) {
      // تحميل محلي فقط
      try {
        var localData = localStorage.getItem('kasrah_gameData');
        if (callback) callback(localData ? JSON.parse(localData) : null);
      } catch(e) {
        if (callback) callback(null);
      }
      return;
    }
    KasrahSDK.loadData().then(function(data) {
      if (callback) callback(data);
    }).catch(function(err) {
      console.warn('[Kasrah Bridge] Cloud load failed:', err);
      if (callback) callback(null);
    });
  };

  // ============================================================
  // تتبع الأحداث - واجهة عامة
  // ============================================================
  window.KasrahTrackEvent = function(eventType, metadata) {
    if (!_kasrahReady || !window.KasrahSDK) return;
    KasrahSDK.fireEvent(eventType, metadata || {}).catch(function(err) {
      console.warn('[Kasrah Bridge] Track event failed:', err);
    });
  };

  // ============================================================
  // تهيئة عند تحميل الصفحة
  // ============================================================
  console.log('[Kasrah Bridge] Kasrah-Poki Bridge loaded, waiting for KasrahSDK...');
  waitForKasrahSDK(initKasrahSDK);

  // إعداد البانر بعد تهيئة SDK
  var bannerSetupInterval = setInterval(function() {
    if (_kasrahReady) {
      clearInterval(bannerSetupInterval);
      setTimeout(setupBannerAd, 2000); // انتظر 2 ثانية بعد بدء اللعبة
    }
  }, 500);

})();
