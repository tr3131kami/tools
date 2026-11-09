/*!
 * ScratchProfileCard
 * ホームページにScratchのプロフィールカードを表示するツール
 * 共同制作: suzunokana × とろろぉーーーー（tr3131kami）
 * https://tr3131kami.github.io/tools/profile.html
 *
 * データの取得について:
 * api.scratch.mit.edu は外部サイトからの読み取りを許可していないため、
 * scratch.mit.edu の site-api（ユーザー基本情報と注目プロジェクト）と
 * 公開プロフィールページ（自己紹介・取り組んでいること）から取得します。
 * 参加日とフォロワー数は外部サイトから取得できないため表示しません。
 */
(function (global) {
  'use strict';

  var TOOL_URL = 'https://tr3131kami.github.io/tools/profile.html';

  function profileUrl(username) {
    return 'https://scratch.mit.edu/users/' + encodeURIComponent(username) + '/';
  }
  function projectUrl(id) {
    return 'https://scratch.mit.edu/projects/' + id + '/';
  }
  function absUrl(u) {
    if (!u) return '';
    return u.indexOf('//') === 0 ? 'https:' + u : u;
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      return document.querySelector(target) || document.getElementById(target);
    }
    if (target.nodeType === 1) return target;
    return null;
  }

  function fetchBasic(username) {
    var url = 'https://scratch.mit.edu/site-api/users/all/' + encodeURIComponent(username) + '/';
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('user not found');
      return res.json();
    }).then(function (data) {
      if (!data || !data.user || !data.user.username) throw new Error('user not found');
      return data;
    });
  }

  function fetchTexts(username) {
    return fetch(profileUrl(username), { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('profile failed');
      return res.text();
    }).then(function (html) {
      var doc = new DOMParser().parseFromString(html, 'text/html');
      var nodes = doc.querySelectorAll('p.overview');
      var texts = [];
      for (var i = 0; i < nodes.length; i++) {
        texts.push(nodes[i].textContent.replace(/\s+/g, ' ').trim());
      }
      // DOM順に「私について」「私が取り組んでいること」
      return { bio: texts[0] || '', status: texts[1] || '' };
    }).catch(function () {
      return { bio: '', status: '' };
    });
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
  var LABEL_STYLE = 'color:#a8a2b3;font-size:.72rem;font-weight:900;letter-spacing:.08em;margin-top:12px;';
  var TEXT_STYLE = 'font-size:.88rem;margin-top:2px;';

  function renderLoading(el) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);
    box.textContent = '読み込み中…';
    el.appendChild(box);
  }

  function renderError(el) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);
    box.textContent = 'プロフィールを取得できませんでした。ユーザー名を確かめてください。';
    el.appendChild(box);
  }

  function renderCard(el, basic, texts) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);
    var username = basic.user.username;

    var head = document.createElement('div');
    head.setAttribute('style', 'display:flex;align-items:center;gap:14px;');
    var img = document.createElement('img');
    img.src = absUrl(basic.thumbnail_url);
    img.alt = username;
    img.setAttribute('style', 'width:64px;height:64px;border-radius:50%;flex:none;background:#f3efff;object-fit:cover;');
    var name = document.createElement('div');
    name.setAttribute('style', 'font-weight:900;font-size:1.15rem;');
    name.textContent = '@' + username;
    head.appendChild(img);
    head.appendChild(name);
    box.appendChild(head);

    var bio = shorten(texts.bio, 90);
    if (bio) {
      var bioEl = document.createElement('p');
      bioEl.setAttribute('style', 'margin:12px 0 0;font-size:.88rem;');
      bioEl.textContent = bio;
      box.appendChild(bioEl);
    }

    var status = shorten(texts.status, 90);
    if (status) {
      var sLabel = document.createElement('div');
      sLabel.setAttribute('style', LABEL_STYLE);
      sLabel.textContent = '取り組んでいること';
      var sEl = document.createElement('div');
      sEl.setAttribute('style', TEXT_STYLE);
      sEl.textContent = status;
      box.appendChild(sLabel);
      box.appendChild(sEl);
    }

    var fp = basic.featured_project_data;
    if (fp && fp.id && fp.title) {
      var fLabel = document.createElement('div');
      fLabel.setAttribute('style', LABEL_STYLE);
      fLabel.textContent = '注目プロジェクト';
      var fRow = document.createElement('a');
      fRow.href = projectUrl(fp.id);
      fRow.target = '_blank';
      fRow.rel = 'noopener';
      fRow.setAttribute('style', 'display:flex;align-items:center;gap:10px;text-decoration:none;color:#4a4553;margin-top:4px;');
      var fImg = document.createElement('img');
      fImg.src = absUrl(fp.thumbnail_url);
      fImg.alt = '';
      fImg.setAttribute('style', 'width:64px;height:48px;border-radius:10px;flex:none;object-fit:cover;background:#f3efff;');
      var fTitle = document.createElement('span');
      fTitle.setAttribute('style', 'font-size:.85rem;font-weight:700;');
      fTitle.textContent = fp.title;
      fRow.appendChild(fImg);
      fRow.appendChild(fTitle);
      box.appendChild(fLabel);
      box.appendChild(fRow);
    }

    var link = document.createElement('a');
    link.href = profileUrl(username);
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
    fetchBasic(username).then(function (basic) {
      renderCard(el, basic, { bio: '', status: '' });
      fetchTexts(username).then(function (texts) {
        renderCard(el, basic, texts);
      });
    }).catch(function () {
      renderError(el);
    });
  }

  global.ScratchProfile = { card: card };
})(window);
