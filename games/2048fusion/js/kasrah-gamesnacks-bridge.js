/**
 * Kasrah-GameSnacks Bridge for 2048 Fusion
 * ==========================================
 * يستبدل GameSnacks SDK بـ Kasrah SDK مع الحفاظ على توافق الواجهة الكاملة.
 *
 * المميزات المدعومة:
 * - الإعلانات البينية (Interstitial Ads) عبر GameSnacks['ad']['break']
 * - إعلانات المكافأة (Rewarded Ads) مع beforeReward / adViewed
 * - إعلانات البانر (Banner Ads) - 320x50 أسفل الشاشة
 * - الحفظ السحابي (Cloud Save) عبر GameSnacks storage API
 * - تتبع الأحداث (Analytics) عبر game.ready / game.gameOver
 * - إدارة الصوت (Audio) عبر GameSnacks['audio']
 * - تحديث النقاط (Score) عبر GameSnacks score.update
 * - دورة حياة اللعبة (Gameplay Start/Stop)
 *
 * الاستخدام: يُضاف هذا الملف قبل game.js في index.html
 */
(function () {
  'use strict';

  // ============================================================
  // متغيرات الحالة الداخلية
  // ============================================================
  var _kasrahReady = false;
  var _audioMuted = false;
  var _currentScore = 0;
  var _gameStarted = false;
  var _storageData = {};

  // ============================================================
  // انتظار تحميل Kasrah SDK
  // ============================================================
  function waitForKasrahSDK(callback, maxAttempts) {
    maxAttempts = maxAttempts || 80;
    var attempts = 0;
    var interval = setInterval(function () {
      attempts++;
      if (window.KasrahSDK) {
        clearInterval(interval);
        callback();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('[Kasrah Bridge] KasrahSDK not found - running in fallback mode');
        _kasrahReady = false;
        _initFallbackStorage();
      }
    }, 100);
  }

  // ============================================================
  // تهيئة Kasrah SDK
  // ============================================================
  function initKasrahSDK() {
    if (!window.KasrahSDK) {
      console.warn('[Kasrah Bridge] KasrahSDK not available');
      _initFallbackStorage();
      return;
    }

    KasrahSDK.init({
      gameId: '2048fusion',
      config: {
        adFrequency: 30,
        enableBanners: true,
        enableInterstitial: true,
        enableRewarded: true,
        enableCloudSave: true,
      },
      callbacks: {
        onAdStart: function () {
          console.log('[Kasrah Bridge] Ad started - game paused');
        },
        onAdComplete: function () {
          console.log('[Kasrah Bridge] Ad completed - game resumed');
        },
        onAdError: function (data) {
          console.warn('[Kasrah Bridge] Ad error:', data);
        },
        onAdClose: function () {
          console.log('[Kasrah Bridge] Ad closed');
        },
        onGameplayStart: function () {
          console.log('[Kasrah Bridge] Gameplay started');
        },
        onGameplayStop: function () {
          console.log('[Kasrah Bridge] Gameplay stopped');
        },
        onGameLoadingFinished: function () {
          console.log('[Kasrah Bridge] Game loading finished');
        },
        onHappyTime: function () {
          console.log('[Kasrah Bridge] Happy time!');
        },
      },
    })
      .then(function (success) {
        _kasrahReady = true;
        console.log('[Kasrah Bridge] KasrahSDK initialized successfully:', success);

        // تحميل البيانات السحابية
        _loadCloudData();

        // إعداد إعلان البانر بعد ثانيتين
        setTimeout(function () {
          _setupBannerAd();
        }, 2000);

        // إطلاق حدث gameLoadingFinished
        KasrahSDK.fireEvent('gameLoadingFinished');
      })
      .catch(function (err) {
        console.warn('[Kasrah Bridge] KasrahSDK init failed:', err);
        _kasrahReady = false;
        _initFallbackStorage();
      });
  }

  // ============================================================
  // تحميل البيانات السحابية
  // ============================================================
  function _loadCloudData() {
    if (!_kasrahReady || !window.KasrahSDK) return;

    KasrahSDK.loadData()
      .then(function (data) {
        if (data) {
          console.log('[Kasrah Bridge] Cloud data loaded:', data);
          _storageData = data || {};
          // مزامنة مع localStorage
          try {
            for (var key in _storageData) {
              if (_storageData.hasOwnProperty(key)) {
                localStorage.setItem(key, JSON.stringify(_storageData[key]));
              }
            }
          } catch (e) {}
        }
      })
      .catch(function (err) {
        console.warn('[Kasrah Bridge] Cloud load failed:', err);
        _initFallbackStorage();
      });
  }

  // ============================================================
  // حفظ البيانات السحابية
  // ============================================================
  function _saveCloudData() {
    if (!_kasrahReady || !window.KasrahSDK) {
      // حفظ محلي فقط
      try {
        localStorage.setItem('kasrah_2048fusion_data', JSON.stringify(_storageData));
      } catch (e) {}
      return;
    }

    KasrahSDK.saveData(_storageData)
      .then(function (success) {
        if (success) {
          console.log('[Kasrah Bridge] Game data saved to cloud');
        }
      })
      .catch(function (err) {
        console.warn('[Kasrah Bridge] Cloud save failed:', err);
      });
  }

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

  // ============================================================
  // إعداد إعلان البانر
  // ============================================================
  function _setupBannerAd() {
    if (!_kasrahReady || !window.KasrahSDK) return;

    var bannerId = 'kasrah-banner-2048fusion';
    var existing = document.getElementById(bannerId);

    if (!existing) {
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

    KasrahSDK.requestBanner(bannerId, '320x50')
      .then(function (success) {
        if (success) {
          console.log('[Kasrah Bridge] Banner ad loaded successfully');
        }
      })
      .catch(function (err) {
        console.warn('[Kasrah Bridge] Banner ad failed:', err);
      });
  }

  // ============================================================
  // واجهة GameSnacks الكاملة - محاكاة متكاملة
  // ============================================================
  var KasrahGameSnacksBridge = {
    // --- game lifecycle ---
    game: {
      ready: function () {
        console.log('[Kasrah Bridge] game.ready() called');
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('gameLoadingFinished');
        }
      },
      levelComplete: function () {
        console.log('[Kasrah Bridge] game.levelComplete() called');
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('gameplayStop', { reason: 'levelComplete' });
          // عرض إعلان بيني بعد اكتمال المستوى
          setTimeout(function () {
            KasrahSDK.showInterstitial({
              onComplete: function () {
                console.log('[Kasrah Bridge] Post-level interstitial completed');
                if (_kasrahReady && window.KasrahSDK) {
                  KasrahSDK.fireEvent('gameplayStart');
                }
              },
              onError: function (err) {
                console.warn('[Kasrah Bridge] Post-level interstitial error:', err);
              },
            });
          }, 500);
        }
      },
      gameOver: function () {
        console.log('[Kasrah Bridge] game.gameOver() called');
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('gameplayStop', { reason: 'gameOver', score: _currentScore });
          // حفظ النتيجة عند انتهاء اللعبة
          if (_currentScore > 0) {
            var bestScore = _storageData['bestScore'] || 0;
            if (_currentScore > bestScore) {
              _storageData['bestScore'] = _currentScore;
              _saveCloudData();
            }
          }
        }
      },
    },

    // --- audio management ---
    audio: {
      subscribe: function (callback) {
        console.log('[Kasrah Bridge] audio.subscribe() called');
        // إبلاغ اللعبة بحالة الصوت الحالية
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
        console.log('[Kasrah Bridge] ad.break() called with type:', type);

        // إيقاف الصوت قبل الإعلان
        if (options.beforeAd && typeof options.beforeAd === 'function') {
          options.beforeAd();
        }

        if (!_kasrahReady || !window.KasrahSDK) {
          // وضع احتياطي - استدعاء adBreakDone مباشرة
          console.log('[Kasrah Bridge] SDK not ready - skipping ad');
          if (options.afterAd && typeof options.afterAd === 'function') {
            options.afterAd();
          }
          if (options.adBreakDone && typeof options.adBreakDone === 'function') {
            options.adBreakDone({ breakType: type, breakStatus: 'dismissed' });
          }
          return;
        }

        // تحديد نوع الإعلان
        if (type === 'reward' || type === 'rewarded') {
          // إعلان مكافأة
          KasrahSDK.showRewarded({
            onReward: function () {
              console.log('[Kasrah Bridge] Rewarded ad completed - reward earned');
              if (options.adViewed && typeof options.adViewed === 'function') {
                options.adViewed();
              }
              if (options.afterAd && typeof options.afterAd === 'function') {
                options.afterAd();
              }
              if (options.adBreakDone && typeof options.adBreakDone === 'function') {
                options.adBreakDone({ breakType: 'reward', breakStatus: 'viewed' });
              }
            },
            onError: function (err) {
              console.warn('[Kasrah Bridge] Rewarded ad error:', err);
              if (options.adDismissed && typeof options.adDismissed === 'function') {
                options.adDismissed();
              }
              if (options.afterAd && typeof options.afterAd === 'function') {
                options.afterAd();
              }
              if (options.adBreakDone && typeof options.adBreakDone === 'function') {
                options.adBreakDone({ breakType: 'reward', breakStatus: 'dismissed' });
              }
            },
          });
        } else {
          // إعلان بيني (interstitial)
          KasrahSDK.showInterstitial({
            onComplete: function () {
              console.log('[Kasrah Bridge] Interstitial ad completed');
              if (options.adViewed && typeof options.adViewed === 'function') {
                options.adViewed();
              }
              if (options.afterAd && typeof options.afterAd === 'function') {
                options.afterAd();
              }
              if (options.adBreakDone && typeof options.adBreakDone === 'function') {
                options.adBreakDone({ breakType: 'interstitial', breakStatus: 'viewed' });
              }
            },
            onError: function (err) {
              console.warn('[Kasrah Bridge] Interstitial ad error:', err);
              if (options.afterAd && typeof options.afterAd === 'function') {
                options.afterAd();
              }
              if (options.adBreakDone && typeof options.adBreakDone === 'function') {
                options.adBreakDone({ breakType: 'interstitial', breakStatus: 'dismissed' });
              }
            },
          });
        }
      },
    },

    // --- score system ---
    score: {
      update: function (score) {
        _currentScore = score || 0;
        console.log('[Kasrah Bridge] score.update():', _currentScore);
        if (_kasrahReady && window.KasrahSDK) {
          KasrahSDK.fireEvent('scoreUpdate', { score: _currentScore });
        }
      },
    },

    // --- storage system (محاكاة localStorage عبر Cloud Save) ---
    storage: {
      getItem: function (key) {
        // أولاً من الذاكرة المحلية
        if (_storageData.hasOwnProperty(key)) {
          return JSON.stringify(_storageData[key]);
        }
        // ثم من localStorage
        try {
          return localStorage.getItem(key);
        } catch (e) {
          return null;
        }
      },
      setItem: function (key, value) {
        // حفظ في الذاكرة
        try {
          _storageData[key] = typeof value === 'string' ? JSON.parse(value) : value;
        } catch (e) {
          _storageData[key] = value;
        }
        // حفظ في localStorage
        try {
          localStorage.setItem(key, value);
        } catch (e) {}
        // حفظ في السحابة (مع throttle)
        _debouncedSave();
      },
      removeItem: function (key) {
        delete _storageData[key];
        try {
          localStorage.removeItem(key);
        } catch (e) {}
      },
      clear: function () {
        _storageData = {};
        try {
          localStorage.clear();
        } catch (e) {}
      },
    },
  };

  // ============================================================
  // Debounce للحفظ السحابي (تجنب الحفظ المتكرر)
  // ============================================================
  var _saveTimer = null;
  function _debouncedSave() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () {
      _saveCloudData();
    }, 2000);
  }

  // ============================================================
  // تسجيل GameSnacks في window
  // ============================================================
  window.GameSnacks = KasrahGameSnacksBridge;

  // ============================================================
  // واجهات عامة إضافية لـ Kasrah SDK
  // ============================================================

  /**
   * عرض إعلان مكافأة عند طلب اللاعب power-up
   */
  window.kasrahShowRewardedForPowerup = function (onReward) {
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.showRewarded({
        onReward: function () {
          console.log('[Kasrah Bridge] Power-up reward earned!');
          if (onReward) onReward();
        },
        onError: function (err) {
          console.warn('[Kasrah Bridge] Rewarded ad error:', err);
        },
      });
    } else if (onReward) {
      onReward();
    }
  };

  /**
   * حفظ بيانات اللعبة يدوياً
   */
  window.kasrahSaveGameData = function (data) {
    if (data) {
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          _storageData[key] = data[key];
        }
      }
    }
    _saveCloudData();
  };

  /**
   * تحميل بيانات اللعبة يدوياً
   */
  window.kasrahLoadGameData = function (callback) {
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.loadData()
        .then(function (data) {
          if (callback) callback(data);
        })
        .catch(function () {
          if (callback) callback(_storageData);
        });
    } else {
      if (callback) callback(_storageData);
    }
  };

  /**
   * تتبع حدث مخصص
   */
  window.kasrahTrackEvent = function (eventType, metadata) {
    if (_kasrahReady && window.KasrahSDK) {
      KasrahSDK.fireEvent(eventType, metadata || {});
    }
  };

  // ============================================================
  // تهيئة عند تحميل الصفحة
  // ============================================================
  console.log('[Kasrah Bridge] Kasrah-GameSnacks Bridge v1.0 loaded for 2048 Fusion');
  console.log('[Kasrah Bridge] Waiting for KasrahSDK...');

  // انتظار SDK وتهيئته
  waitForKasrahSDK(initKasrahSDK);

  // إعداد البانر بعد تهيئة SDK
  var bannerSetupInterval = setInterval(function () {
    if (_kasrahReady) {
      clearInterval(bannerSetupInterval);
      setTimeout(_setupBannerAd, 3000);
    }
  }, 500);
})();
