/*!
 * ScratchProfileCard
 * ホームページにScratchのプロフィールカードを表示するツール
 * 共同制作: suzunokana × とろろぉーーーー（tr3131kami）
 * https://tr3131kami.github.io/tools/profile.html
 */
(function (global) {
  'use strict';

  var API = 'https://api.scratch.mit.edu/users/';
  var TOOL_URL = 'https://tr3131kami.github.io/tools/profile.html';

  function profileUrl(username) {
    return 'https://scratch.mit.edu/users/' + encodeURIComponent(username) + '/';
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      return document.querySelector(target) || document.getElementById(target);
    }
    if (target.nodeType === 1) return target;
    return null;
  }

  function fetchUser(username) {
    return fetch(API + encodeURIComponent(username), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('user not found');
      return res.json();
    });
  }

  function fetchFollowerCount(username) {
    var base = API + encodeURIComponent(username) + '/followers';
    return fetch(base + '?limit=1', { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('followers failed');
      var total = res.headers.get('x-total-count');
      if (total !== null && total !== '') return parseInt(total, 10);
      // ヘッダーが読めない環境ではページをたどって数える（最大30ページまで）
      var count = 0;
      function page(offset) {
        return fetch(base + '?limit=40&offset=' + offset, { cache: 'no-store' })
          .then(function (r) { return r.ok ? r.json() : []; })
          .then(function (list) {
            count += list.length;
            if (list.length === 40 && offset < 40 * 29) return page(offset + 40);
            return count;
          });
      }
      return page(0);
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  function shorten(text, max) {
    if (!text) return '';
    var t = String(text).replace(/\s+/g, ' ').trim();
    if (t.length > max) t = t.slice(0, max) + '…';
    return t;
  }

  var CARD_STYLE = 'font-family:\'Zen Maru Gothic\',\'Hiragino Maru Gothic ProN\',sans-serif;' +
    'background:#fff;border-radius:24px;box-shadow:0 8px 30px rgba(180,170,200,.18);' +
    'padding:22px;max-width:340px;color:#4a4553;text-align:left;line-height:1.7;';
  var BTN_STYLE = 'display:block;text-align:center;text-decoration:none;color:#fff;font-weight:700;' +
    'border-radius:999px;padding:10px;margin-top:14px;font-size:.9rem;' +
    'background:linear-gradient(135deg,#ffb8d1,#c4b5fd,#a5e8e0,#ffb8d1);background-size:300% 300%;';

  function renderLoading(el) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);
    box.textContent = '読み込み中…';
    el.appendChild(box);
    return box;
  }

  function renderError(el) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);
    box.textContent = 'プロフィールを取得できませんでした。ユーザー名を確かめてください。';
    el.appendChild(box);
  }

  function renderCard(el, user, followerCount) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);

    var head = document.createElement('div');
    head.setAttribute('style', 'display:flex;align-items:center;gap:14px;');
    var img = document.createElement('img');
    var images = (user.profile && user.profile.images) || {};
    img.src = images['90x90'] || '';
    img.alt = user.username;
    img.setAttribute('style', 'width:64px;height:64px;border-radius:50%;flex:none;background:#f3efff;');
    var nameWrap = document.createElement('div');
    var name = document.createElement('div');
    name.setAttribute('style', 'font-weight:900;font-size:1.15rem;');
    name.textContent = '@' + user.username;
    var joined = document.createElement('div');
    joined.setAttribute('style', 'color:#a8a2b3;font-size:.78rem;font-weight:700;');
    var joinedText = formatDate(user.history && user.history.joined);
    joined.textContent = joinedText ? joinedText + ' に参加' : '';
    nameWrap.appendChild(name);
    nameWrap.appendChild(joined);
    head.appendChild(img);
    head.appendChild(nameWrap);
    box.appendChild(head);

    var bio = shorten(user.profile && user.profile.bio, 90);
    if (bio) {
      var bioEl = document.createElement('p');
      bioEl.setAttribute('style', 'margin:12px 0 0;font-size:.88rem;');
      bioEl.textContent = bio;
      box.appendChild(bioEl);
    }

    if (typeof followerCount === 'number' && !isNaN(followerCount)) {
      var fol = document.createElement('div');
      fol.setAttribute('style', 'margin-top:10px;font-size:.85rem;font-weight:700;');
      fol.textContent = 'フォロワー ' + followerCount + '人';
      box.appendChild(fol);
    }

    var link = document.createElement('a');
    link.href = profileUrl(user.username);
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('style', BTN_STYLE);
    link.textContent = 'Scratchで見る';
    box.appendChild(link);

    var credit = document.createElement('div');
    credit.setAttribute('style', 'margin-top:10px;text-align:right;font-size:.68rem;color:#a8a2b3;');
    var ca = document.createElement('a');
    ca.href = TOOL_URL;
    ca.target = '_blank';
    ca.rel = 'noopener';
    ca.setAttribute('style', 'color:#a8a2b3;text-decoration:none;');
    ca.textContent = 'ScratchProfileCard';
    credit.appendChild(ca);
    box.appendChild(credit);

    el.appendChild(box);
  }

  function card(options, targetArg) {
    var opts = {};
    if (typeof options === 'string') {
      opts.username = options;
      opts.target = targetArg;
    } else if (options) {
      opts = options;
    }
    var el = resolveTarget(opts.target);
    if (!el || !opts.username) return;
    renderLoading(el);
    var username = String(opts.username);
    fetchUser(username).then(function (user) {
      renderCard(el, user, null);
      fetchFollowerCount(username).then(function (count) {
        renderCard(el, user, count);
      }).catch(function () { /* フォロワー数が取れなくてもカードは表示する */ });
    }).catch(function () {
      renderError(el);
    });
  }

  global.ScratchProfile = { card: card };
})(window);
