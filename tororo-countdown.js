/* TororoCountdown - ホームページにカウントダウンを表示するツール
   by とろろぉーーーー (tr3131kami)
   https://tr3131kami.github.io/tools/countdown.html

   使い方:
     <script src="https://tr3131kami.github.io/tools/tororo-countdown.js"></script>
     <div id="myCountdown"></div>
     <script>
       TororoCountdown.show({
         to: "2027-01-01T00:00:00",   // 目標の日時（必須）
         target: "#myCountdown",      // 表示する場所（必須）
         label: "お正月まで",         // タイトル（任意）
         doneText: "当日です！"        // 日時を過ぎたときの文（任意）
       });
     </script>
*/
(function (global) {
  'use strict';

  var styleInjected = false;

  function injectStyle() {
    if (styleInjected) return;
    styleInjected = true;
    var css = [
      '.tcd-card{background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(180,170,200,.18);padding:22px 20px;text-align:center;font-family:inherit;color:#4a4553;max-width:460px;margin:0 auto;}',
      '.tcd-label{font-weight:900;font-size:1.05rem;margin-bottom:14px;}',
      '.tcd-nums{display:flex;gap:10px;justify-content:center;}',
      '.tcd-unit{background:#faf8ff;border-radius:14px;padding:10px 0 8px;min-width:64px;flex:1;}',
      '.tcd-val{display:block;font-size:1.7rem;font-weight:900;line-height:1.1;color:#8b7fd4;font-variant-numeric:tabular-nums;}',
      '.tcd-unit-label{display:block;font-size:.72rem;color:#a8a2b3;margin-top:3px;}',
      '.tcd-done{font-size:1.3rem;font-weight:900;padding:10px 0 4px;background:linear-gradient(90deg,#ff9ec4,#a78bfa,#7eddd0);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}',
      '.tcd-credit{margin-top:14px;font-size:.72rem;color:#a8a2b3;}',
      '.tcd-credit a{color:#a8a2b3;}'
    ].join('\n');
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function unitHtml(u, label) {
    return '<div class="tcd-unit"><span class="tcd-val" data-u="' + u + '">0</span><span class="tcd-unit-label">' + label + '</span></div>';
  }

  function show(opts) {
    opts = opts || {};
    var el = typeof opts.target === 'string' ? document.querySelector(opts.target) : opts.target;
    if (!el) return;
    injectStyle();
    var target = new Date(opts.to);
    if (isNaN(target.getTime())) {
      el.innerHTML = '<div class="tcd-card"><div class="tcd-done">日時が正しくありません</div></div>';
      return;
    }
    var doneText = opts.doneText || '当日です！';

    el.innerHTML =
      '<div class="tcd-card">' +
      '<div class="tcd-label" style="display:none"></div>' +
      '<div class="tcd-body">' +
      '<div class="tcd-nums">' +
      unitHtml('d', '日') + unitHtml('h', '時間') + unitHtml('m', '分') + unitHtml('s', '秒') +
      '</div>' +
      '</div>' +
      '<div class="tcd-credit">TororoCountdown by <a href="https://youtube.com/@t-o-r-o-r-o-r-o-r-o" target="_blank" rel="noopener">とろろぉーーーー</a></div>' +
      '</div>';

    if (opts.label) {
      var labelEl = el.querySelector('.tcd-label');
      labelEl.textContent = opts.label;
      labelEl.style.display = '';
    }
    var bodyEl = el.querySelector('.tcd-body');
    var vals = {
      d: el.querySelector('[data-u="d"]'),
      h: el.querySelector('[data-u="h"]'),
      m: el.querySelector('[data-u="m"]'),
      s: el.querySelector('[data-u="s"]')
    };

    var timer = null;
    function render() {
      var diff = target.getTime() - Date.now();
      if (diff <= 0) {
        bodyEl.innerHTML = '';
        var done = document.createElement('div');
        done.className = 'tcd-done';
        done.textContent = doneText;
        bodyEl.appendChild(done);
        if (timer) clearInterval(timer);
        return;
      }
      var totalSec = Math.floor(diff / 1000);
      vals.d.textContent = Math.floor(totalSec / 86400);
      vals.h.textContent = pad(Math.floor(totalSec % 86400 / 3600));
      vals.m.textContent = pad(Math.floor(totalSec % 3600 / 60));
      vals.s.textContent = pad(totalSec % 60);
    }
    render();
    timer = setInterval(render, 250);
  }

  global.TororoCountdown = { show: show };
})(window);
