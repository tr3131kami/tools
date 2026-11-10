/*!
 * ScratchRankingSystem
 * Scratchゲームのスコアランキングをホームページに表示するツール
 * 共同制作: suzunokana × とろろぉーーーー（tr3131kami）
 * https://tr3131kami.github.io/tools/ranking.html
 *
 * 仕組み:
 * スコア受付用のScratchプロジェクトに、プレイヤーが
 * 「SRS: スコア」の形式でコメントすると、このライブラリが
 * コメントを読み取って自動で集計し、ランキングを表示します。
 * 同じ人のコメントが複数ある場合は、いちばん高いスコアだけを採用します。
 *
 * データの取得について:
 * api.scratch.mit.edu は外部サイトからの読み取りを許可していないため、
 * scratch.mit.edu の site-api（プロジェクトのコメント）から取得します。
 * スコアは自己申告制です。コメントを書き換えること自体は防げません。
 */
(function (global) {
  'use strict';

  var TOOL_URL = 'https://tr3131kami.github.io/tools/ranking.html';
  var DEFAULT_LIMIT = 10;
  var DEFAULT_MAX_PAGES = 5;

  function projectUrl(id) {
    return 'https://scratch.mit.edu/projects/' + id + '/';
  }
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

  // 全角数字を半角にそろえる
  function normalizeText(text) {
    return String(text || '').replace(/[０-９]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });
  }

  // コメント本文からスコアを取り出す。「SRS: 12345」「SRS 12345」形式のみ対象
  function parseScore(text) {
    var m = normalizeText(text).match(/^\s*SRS\s*[:：]?\s*(\d{1,10})\s*$/i);
    if (!m) return null;
    var n = parseInt(m[1], 10);
    return isNaN(n) ? null : n;
  }

  function fetchCommentsPage(projectId, page) {
    var url = 'https://scratch.mit.edu/site-api/comments/project/' + projectId + '/?page=' + page + '&_=' + Date.now();
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) throw new Error('comments failed');
      return res.text();
    });
  }

  // 1ページ分のHTMLからスコア投稿を抜き出す
  function scoresInPage(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var comments = doc.querySelectorAll('.comment');
    var found = [];
    for (var i = 0; i < comments.length; i++) {
      var contentEl = comments[i].querySelector('.content');
      var userEl = comments[i].querySelector('[data-comment-user]');
      if (!contentEl || !userEl) continue;
      var score = parseScore(contentEl.textContent);
      if (score === null) continue;
      var username = userEl.getAttribute('data-comment-user');
      if (!username) continue;
      var time = 0;
      var timeEl = comments[i].querySelector('.time');
      if (timeEl && timeEl.getAttribute('title')) {
        var t = Date.parse(timeEl.getAttribute('title'));
        if (!isNaN(t)) time = t;
      }
      found.push({ username: username, score: score, time: time });
    }
    return { count: comments.length, scores: found };
  }

  // 受付プロジェクトのコメントを集計して、ランキング順の配列を返す
  function fetchScores(projectId, options) {
    var opts = options || {};
    var maxPages = opts.maxPages || DEFAULT_MAX_PAGES;
    var byUser = {};
    var page = 1;
    function next() {
      if (page > maxPages) return Promise.resolve();
      return fetchCommentsPage(projectId, page).then(function (html) {
        var r = scoresInPage(html);
        for (var i = 0; i < r.scores.length; i++) {
          var s = r.scores[i];
          var cur = byUser[s.username];
          if (!cur || s.score > cur.score || (s.score === cur.score && s.time < cur.time)) {
            byUser[s.username] = s;
          }
        }
        if (r.count === 0) return; // これ以上コメントがない
        page++;
        return next();
      });
    }
    return next().then(function () {
      var list = Object.keys(byUser).map(function (k) { return byUser[k]; });
      list.sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return a.time - b.time;
      });
      return list;
    });
  }

  var CARD_STYLE = 'font-family:\'Zen Maru Gothic\',\'Hiragino Maru Gothic ProN\',sans-serif;' +
    'background:#fff;border-radius:24px;box-shadow:0 8px 30px rgba(180,170,200,.18);' +
    'padding:22px;max-width:430px;color:#4a4553;text-align:left;line-height:1.7;';
  var TITLE_STYLE = 'font-weight:900;font-size:1.15rem;margin-bottom:6px;';
  var BTN_STYLE = 'display:block;text-align:center;text-decoration:none;color:#fff;font-weight:700;' +
    'border-radius:999px;padding:10px;margin-top:14px;font-size:.9rem;' +
    'background:linear-gradient(135deg,#ffb8d1,#c4b5fd,#a5e8e0,#ffb8d1);background-size:300% 300%;';

  function rankBadgeStyle(rank) {
    var bg = '#efeaf7';
    var color = '#4a4553';
    if (rank === 1) { bg = 'linear-gradient(135deg,#ffd66e,#ffb347)'; color = '#fff'; }
    if (rank === 2) { bg = 'linear-gradient(135deg,#d9dee8,#aebdd1)'; color = '#fff'; }
    if (rank === 3) { bg = 'linear-gradient(135deg,#f0b28c,#d98a5f)'; color = '#fff'; }
    return 'flex:none;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;' +
      'font-weight:900;font-size:.95rem;background:' + bg + ';color:' + color + ';';
  }

  function formatDate(time) {
    if (!time) return '';
    var d = new Date(time);
    return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
  }

  function makeBox(el, text) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);
    box.textContent = text;
    el.appendChild(box);
    return box;
  }

  function renderRanking(el, projectId, list, opts) {
    el.innerHTML = '';
    var box = document.createElement('div');
    box.setAttribute('style', CARD_STYLE);

    var title = document.createElement('div');
    title.setAttribute('style', TITLE_STYLE);
    title.textContent = opts.title || 'ランキング';
    box.appendChild(title);

    if (!list.length) {
      var empty = document.createElement('p');
      empty.setAttribute('style', 'font-size:.9rem;margin:8px 0 0;');
      empty.textContent = 'まだスコアがありません。最初の投稿を待っています！';
      box.appendChild(empty);
    } else {
      var limit = opts.limit || DEFAULT_LIMIT;
      var shown = list.slice(0, limit);
      for (var i = 0; i < shown.length; i++) {
        var s = shown[i];
        var row = document.createElement('div');
        row.setAttribute('style', 'display:flex;align-items:center;gap:12px;padding:9px 2px;' +
          (i > 0 ? 'border-top:1px solid #f1ecf8;' : ''));
        var badge = document.createElement('div');
        badge.setAttribute('style', rankBadgeStyle(i + 1));
        badge.textContent = String(i + 1);
        var mid = document.createElement('div');
        mid.setAttribute('style', 'flex:1;min-width:0;');
        var name = document.createElement('a');
        name.href = profileUrl(s.username);
        name.target = '_blank';
        name.rel = 'noopener';
        name.setAttribute('style', 'font-weight:700;color:#4a4553;text-decoration:none;font-size:.95rem;');
        name.textContent = '@' + s.username;
        var date = document.createElement('div');
        date.setAttribute('style', 'font-size:.72rem;color:#a8a2b3;');
        date.textContent = formatDate(s.time);
        mid.appendChild(name);
        if (s.time) mid.appendChild(date);
        var score = document.createElement('div');
        score.setAttribute('style', 'font-weight:900;font-size:1.05rem;white-space:nowrap;');
        score.textContent = s.score.toLocaleString('ja-JP');
        row.appendChild(badge);
        row.appendChild(mid);
        row.appendChild(score);
        box.appendChild(row);
      }
      if (list.length > shown.length) {
        var more = document.createElement('div');
        more.setAttribute('style', 'font-size:.78rem;color:#a8a2b3;margin-top:6px;');
        more.textContent = 'ほか ' + (list.length - shown.length) + ' 人のスコアがあります';
        box.appendChild(more);
      }
    }

    var link = document.createElement('a');
    link.href = projectUrl(projectId);
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('style', BTN_STYLE);
    link.textContent = 'スコアを投稿する（Scratchへ）';
    box.appendChild(link);

    var credit = document.createElement('div');
    credit.setAttribute('style', 'margin-top:10px;text-align:right;font-size:.68rem;color:#a8a2b3;');
    var ca = document.createElement('a');
    ca.href = TOOL_URL;
    ca.target = '_blank';
    ca.rel = 'noopener';
    ca.setAttribute('style', 'color:#a8a2b3;text-decoration:none;');
    ca.textContent = 'ScratchRankingSystem';
    credit.appendChild(ca);
    box.appendChild(credit);

    el.appendChild(box);
  }

  function show(options) {
    var opts = options || {};
    var el = resolveTarget(opts.target);
    if (!el || !opts.projectId) return;
    var projectId = String(opts.projectId);
    makeBox(el, '読み込み中…');
    fetchScores(projectId, opts).then(function (list) {
      renderRanking(el, projectId, list, opts);
    }).catch(function () {
      makeBox(el, 'ランキングを取得できませんでした。プロジェクトIDを確かめてください。');
    });
  }

  global.ScratchRanking = { show: show, fetchScores: fetchScores };
})(window);
