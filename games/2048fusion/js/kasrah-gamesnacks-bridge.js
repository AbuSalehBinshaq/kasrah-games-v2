/**
 * Kasrah-GameSnacks Bridge for 2048 Fusion
 * ==========================================
 * يستبدل GameSnacks SDK بـ Kasrah SDK مع الحفاظ على توافق الواجهة الكاملة.
 *
 * الإصلاح v1.2:
 * - تقليل تكرار إعلانات المكافأة (Rewarded Ads).
 * - تخصيص إعلانات المكافأة فقط عند طلب اللاعب power-up أو استمرار اللعب.
 * - تحسين منطق الإعلانات البينية (Interstitial) لتظهر في الفواصل الطبيعية.
 */
(function () {
  'use strict';

  // ============================================================
  // متغيرات الحالة الداخلية
  // ============================================================
  var _kasrahReady = false;
  var _audioMuted = false;
  var _currentScore = 0;
  var _storageData = {};
  var _readyCalled = false;
  var _lastAdTime = 0;
  var _adCooldown = 45000; // 45 ثانية كحد أدنى بين الإعلانات البينية التلقائية

  // ============================================================
  // تهيئة التخزين الاحتياطي
  // ============================================================
  function _initFallbackStorage() {
    try {
      var saved = localStorage.getItem('kasrah_2048fusion_data');
      if (saved) {
        _storageData = JSON.parse(saved);
      }
    } catch (e) {
      _storageData = {};
    }
  }
  _initFallbackStorage();

  // ============================================================
  // واجهة GameSnacks الكاملة - محاكاة متكاملة
  // ============================================================
  var KasrahGameSnacksBridge = {
    _readyCalled: false,
    // --- game lifecycle ---
    game: {
      ready: function () {
        console.log('[Kasrah Bridge] game.ready() called');
        KasrahGameSnacksBridge._readyCalled = true;
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('gameLoadingFinished');
        }
      },
      levelComplete: function () {
        console.log('[Kasrah Bridge] game.levelComplete() called');
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('gameplayStop', { reason: 'levelComplete' });
          
          // عرض إعلان بيني فقط إذا مر وقت كافٍ
          var now = Date.now();
          if (now - _lastAdTime > _adCooldown) {
            setTimeout(function () {
              KasrahSDK.showInterstitial({
                onComplete: function () {
                  _lastAdTime = Date.now();
                  if (_kasrahReady && window.KasrahSDK) KasrahSDK.fireEvent('gameplayStart');
                }
              });
            }, 500);
          } else {
            if (_kasrahReady && window.KasrahSDK) KasrahSDK.fireEvent('gameplayStart');
          }
        }
      },
      gameOver: function () {
        console.log('[Kasrah Bridge] game.gameOver() called');
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('gameplayStop', { reason: 'gameOver', score: _currentScore });
          if (_currentScore > 0) {
            var bestScore = _storageData['bestScore'] || 0;
            if (_currentScore > bestScore) {
              _storageData['bestScore'] = _currentScore;
              _saveCloudData();
            }
          }
          
          // عرض إعلان بيني عند انتهاء اللعبة (بدون cooldown لأنها نهاية جولة)
          setTimeout(function () {
            KasrahSDK.showInterstitial({
              onComplete: function () {
                _lastAdTime = Date.now();
              }
            });
          }, 1000);
        }
      },
    },

    // --- audio management ---
    audio: {
      subscribe: function (callback) {
        if (typeof callback === 'function') {
          callback(!_audioMuted);
        }
      },
    },

    // --- ad system ---
    ad: {
      break: function (options) {
        options = options || {};
        var type = options.type || 'interstitial';
        console.log('[Kasrah Bridge] ad.break() requested:', type);

        // إذا كان إعلان مكافأة، نعرضه دائماً لأنه يُطلب يدوياً من اللاعب
        if (type === 'reward' || type === 'rewarded') {
          if (options.beforeAd) options.beforeAd();
          
          if (!_kasrahReady || !window.KasrahSDK) {
            if (options.afterAd) options.afterAd();
            if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'dismissed' });
            return;
          }

          KasrahSDK.showRewarded({
            onReward: function () {
              if (options.adViewed) options.adViewed();
              if (options.afterAd) options.afterAd();
              if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'viewed' });
            },
            onError: function () {
              if (options.afterAd) options.afterAd();
              if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'error' });
            }
          });
        } else {
          // إعلان بيني عادي - نتحقق من الـ cooldown لتجنب الإزعاج
          var now = Date.now();
          if (now - _lastAdTime < _adCooldown) {
            console.log('[Kasrah Bridge] Ad skipped due to cooldown');
            if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'dismissed' });
            return;
          }

          if (options.beforeAd) options.beforeAd();
          
          if (!_kasrahReady || !window.KasrahSDK) {
            if (options.afterAd) options.afterAd();
            if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'dismissed' });
            return;
          }

          KasrahSDK.showInterstitial({
            onComplete: function () {
              _lastAdTime = Date.now();
              if (options.adViewed) options.adViewed();
              if (options.afterAd) options.afterAd();
              if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'viewed' });
            },
            onError: function () {
              if (options.afterAd) options.afterAd();
              if (options.adBreakDone) options.adBreakDone({ breakType: type, breakStatus: 'error' });
            }
          });
        }
      },
    },

    // --- score system ---
    score: {
      update: function (score) {
        _currentScore = score || 0;
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('scoreUpdate', { score: _currentScore });
        }
      },
    },

    // --- storage system ---
    storage: {
      getItem: function (key) {
        if (_storageData.hasOwnProperty(key)) return JSON.stringify(_storageData[key]);
        try { return localStorage.getItem(key); } catch (e) { return null; }
      },
      setItem: function (key, value) {
        try { _storageData[key] = typeof value === 'string' ? JSON.parse(value) : value; } catch (e) { _storageData[key] = value; }
        try { localStorage.setItem(key, value); } catch (e) {}
        _debouncedSave();
      },
      removeItem: function (key) {
        delete _storageData[key];
        try { localStorage.removeItem(key); } catch (e) {}
      },
      clear: function () {
        _storageData = {};
        try { localStorage.clear(); } catch (e) {}
      },
    },
  };

  // تسجيل GameSnacks فوراً
  window.GameSnacks = KasrahGameSnacksBridge;

  // ============================================================
  // تهيئة Kasrah SDK
  // ============================================================
  function initKasrahSDK() {
    if (!window.KasrahSDK) return;

    KasrahSDK.init({
      gameId: '2048fusion',
      config: {
        adFrequency: 30,
        enableBanners: true,
        enableInterstitial: true,
        enableRewarded: true,
        enableCloudSave: true,
      }
    })
      .then(function (success) {
        _kasrahReady = true;
        console.log('[Kasrah Bridge] KasrahSDK initialized');
        
        KasrahSDK.loadData().then(function(data) {
          if (data) {
            _storageData = data;
            for (var key in data) {
              try { localStorage.setItem(key, JSON.stringify(data[key])); } catch(e) {}
            }
          }
        });

        setTimeout(_setupBannerAd, 2000);

        if (KasrahGameSnacksBridge._readyCalled) {
          KasrahSDK.fireEvent('gameLoadingFinished');
        }
      })
      .catch(function (err) {
        console.warn('[Kasrah Bridge] KasrahSDK init failed:', err);
      });
  }

  function _saveCloudData() {
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.saveData(_storageData).catch(function(e){});
    }
    try { localStorage.setItem('kasrah_2048fusion_data', JSON.stringify(_storageData)); } catch(e){}
  }

  var _saveTimer = null;
  function _debouncedSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(_saveCloudData, 2000);
  }

  function _setupBannerAd() {
    if (!_kasrahReady) return;
    var bannerId = 'kasrah-banner-2048fusion';
    if (!document.getElementById(bannerId)) {
      var div = document.createElement('div');
      div.id = bannerId;
      div.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:9999;width:320px;height:50px;';
      document.body.appendChild(div);
    }
    KasrahSDK.requestBanner(bannerId, '320x50').catch(function(e){});
  }

  // انتظار SDK
  var attempts = 0;
  var sdkCheck = setInterval(function() {
    attempts++;
    if (window.KasrahSDK) {
      clearInterval(sdkCheck);
      initKasrahSDK();
    } else if (attempts > 50) {
      clearInterval(sdkCheck);
    }
  }, 100);

  // واجهات عامة
  window.kasrahShowRewardedForPowerup = function(cb) {
    if (_kasrahReady) {
      KasrahSDK.showRewarded({ onReward: cb, onError: cb });
    } else if (cb) {
      cb();
    }
  };
})();
