'use strict';
'require view';
'require fs';
'require poll';
'require dom';
'require ui';

/* LuCI: Status -> Speed test. Runs /usr/bin/speedtest.sh in the background and polls its JSON state. */

var CMD = '/usr/bin/speedtest.sh';

var STEPS = {
	start: 'Запуск…',
	ip: 'Определение внешнего IP…',
	ping: 'Пинг…',
	done: 'Готово'
};

var NAMES = { main: 'Основной интернет', lte: 'LTE (модем)' };

var SIZES = [
	[ 10, '10 МБ', 'быстро' ],
	[ 100, '100 МБ', 'точнее' ],
	[ 1000, '1 ГБ', 'высокая точность' ],
	[ 10000, '10 ГБ', 'для быстрой оптики, несколько минут; только основной интернет' ]
];

var MODES = [
	[ 'both', 'Скачивание и отдача' ],
	[ 'dl', 'Только скачивание' ],
	[ 'up', 'Только отдача' ]
];

var STREAMS = [ 1, 4, 8, 16, 32 ];

/* test key: d<N> = download, u<N> = upload over N parallel streams */
function testName(k) {
	var n = +k.slice(1);
	return (k.charAt(0) == 'd' ? 'Скачивание' : 'Отдача') + ', ' + n + ' ' + plural(n, 'поток', 'потока', 'потоков');
}

function testShort(k) {
	return (k.charAt(0) == 'd' ? '↓ ' : '↑ ') + k.slice(1);
}

function sortKeys(keys) {
	return keys.sort(function(a, b) {
		return a.charAt(0) != b.charAt(0) ? (a.charAt(0) == 'd' ? -1 : 1) : a.slice(1) - b.slice(1);
	});
}

function stepName(step) {
	return STEPS[step] || (/^[du]\d+$/.test(step) ? testName(step) + '…' : step);
}

/* state -> { keys: [ 'd1', ... ], res: { d1: { v, t, b } } }; states from before the stream choice had fixed fields */
function tests(s) {
	var r = { keys: [], res: {} };
	if (s.tests != null) {
		r.keys = s.tests ? s.tests.split(' ') : [];
		(s.res || []).forEach(function(x) { r.res[x.k] = x; });
	} else if (s.iface) {
		r.keys = [ 'd1', 'd4', 'u4' ];
		r.res = { d1: { v: s.dl1, t: s.t_dl1, b: s.b_dl1 }, d4: { v: s.dl4, t: s.t_dl4, b: s.b_dl4 }, u4: { v: s.up, t: s.t_up, b: s.b_up } };
	}
	return r;
}

/* history line -> { f: fields, keys, res }; old lines have only the dl1|dl4|up columns */
function parseRow(l) {
	var f = l.split('|'), r = { f: f, keys: [], res: {} };
	if (f[15])
		f[15].split(',').forEach(function(x) {
			var p = x.split(':');
			r.keys.push(p[0]);
			r.res[p[0]] = { v: p[1], t: p[2], b: p[3] };
		});
	else
		[ [ 'd1', 4, 10 ], [ 'd4', 5, 11 ], [ 'u4', 6, 12 ] ].forEach(function(m) {
			if (f[m[1]] != null && f[m[1]] !== '') {
				r.keys.push(m[0]);
				r.res[m[0]] = { v: f[m[1]], t: f[m[2]] };
			}
		});
	return r;
}

function parseHist(text) {
	return (text || '').trim().split('\n').filter(function(l) { return l; }).map(parseRow);
}

/* LTE band -> frequency */
var BANDS = { 1: '2100', 3: '1800', 7: '2600', 8: '900', 20: '800', 28: '700', 31: '450',
	38: '2600 TDD', 40: '2300 TDD', 41: '2500 TDD', 42: '3500 TDD' };

/* [threshold, label, colour, fill %] - first matching row wins */
var RSRP_LEVELS = [
	[ -80, 'отличный', '#22c55e', 100 ],
	[ -90, 'хороший', '#84cc16', 75 ],
	[ -100, 'средний', '#eab308', 50 ],
	[ -110, 'слабый', '#f97316', 25 ],
	[ -999, 'очень слабый', '#ef4444', 10 ]
];
var SINR_LEVELS = [
	[ 20, 'отлично', '#22c55e', 100 ],
	[ 13, 'хорошо', '#84cc16', 75 ],
	[ 5, 'средне', '#eab308', 50 ],
	[ 0, 'плохо', '#f97316', 25 ],
	[ -999, 'очень плохо', '#ef4444', 10 ]
];

function level(table, v) {
	v = parseFloat(v);
	if (isNaN(v)) return null;
	for (var i = 0; i < table.length; i++)
		if (v >= table[i][0]) return table[i];
	return table[table.length - 1];
}

function run(args) {
	return L.resolveDefault(fs.exec(CMD, args), {}).then(function(r) {
		return (r && r.stdout) || '';
	});
}

function json(t) {
	try { return JSON.parse(t); } catch (e) { return {}; }
}

function num(v, unit) {
	return (v === undefined || v === null || v === '') ? '—' : v + (unit ? ' ' + unit : '');
}

function round(v) {
	var n = parseFloat(v);
	return isNaN(n) ? '—' : (n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, ''));
}

function fmtBytes(b) {
	b = +b || 0;
	/* "1 ГБ" / "10 ГБ" tests are 1000 / 10000 MiB, so a gigabyte here is 1000 MiB to match the buttons */
	if (b >= 1048576000) return (b / 1048576000).toFixed(2).replace(/\.?0+$/, '') + ' ГБ';
	if (b >= 1048576) return (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' МБ';
	return (b / 1024).toFixed(0) + ' КБ';
}

function fmtTime(sec) {
	sec = Math.max(0, Math.round(sec));
	var m = Math.floor(sec / 60), ss = sec % 60;
	return m + ':' + (ss < 10 ? '0' : '') + ss;
}

/* Live progress: built once and updated in place. Between the 1 s status samples the bar is
 * extrapolated at the measured rate on every animation frame, so it moves smoothly. */
function Progress() {
	this.spin = E('span', { 'class': 'spinning' }, ' ');
	this.title = E('span', {});
	this.inner = E('div', { 'style': 'width:0%' });
	this.barEl = E('div', { 'class': 'cbi-progressbar' }, this.inner);
	this.text = E('div', { 'style': 'margin-top:.4em;font-variant-numeric:tabular-nums' });
	this.box = E('div', { 'style': 'margin-top:1em' }, [
		E('div', { 'style': 'margin-bottom:.4em' }, [ this.spin, ' ', this.title ]),
		this.barEl, this.text
	]);
	this.sample = null;
	this.step = null;
	this.rate = 0;
	this.shown = 0;
	this.raf = null;
	this.lastText = 0;
}

Progress.prototype.set = function(s) {
	var order = [ 'ip', 'ping' ].concat(tests(s).keys), idx = order.indexOf(s.step), now = performance.now();
	dom.content(this.title, [
		E('strong', {}, NAMES[s.iface] + ' (' + sizeName(s.size) + ')'),
		': ' + stepName(s.step) + (idx >= 0 ? '  ·  шаг ' + (idx + 1) + ' из ' + order.length : '')
	]);

	if (s.step != this.step) {
		this.step = s.step;
		this.sample = null;
		this.rate = 0;
		this.shown = 0;
	}

	var has = s.p_total > 0;
	this.barEl.style.display = this.text.style.display = has ? '' : 'none';
	if (!has) return;

	var prev = this.sample;
	if (prev && now > prev.at) {
		var inst = (s.p_done - prev.done) / ((now - prev.at) / 1000);
		this.rate = this.rate > 0 ? this.rate * 0.6 + inst * 0.4 : inst;
	} else {
		this.rate = s.p_done / Math.max(0.5, s.p_el);
	}
	this.sample = { done: +s.p_done, total: +s.p_total, el: +s.p_el, at: now };

	if (!this.raf)
		this.raf = requestAnimationFrame(this.frame.bind(this));
};

Progress.prototype.frame = function() {
	this.raf = null;
	var s = this.sample;
	if (!s) return;

	var now = performance.now(),
	    dt = Math.min(1.5, (now - s.at) / 1000),	/* never run far ahead of the last real sample */
	    est = Math.min(s.total, s.done + Math.max(0, this.rate) * dt);
	this.shown = Math.max(this.shown, est);

	var pct = this.shown / s.total * 100;
	this.inner.style.width = pct.toFixed(2) + '%';

	if (now - this.lastText > 250) {
		this.lastText = now;
		var mbit = this.rate * 8 / 1e6,
		    left = this.rate > 0 ? (s.total - this.shown) / this.rate : 0;
		this.barEl.setAttribute('title', pct.toFixed(0) + '%');
		this.text.textContent = fmtBytes(this.shown) + ' из ' + fmtBytes(s.total) + ' (' + pct.toFixed(0) + '%)  ·  ' +
			round(mbit) + ' Мбит/с (' + (this.rate / 1048576).toFixed(1) + ' МБ/с)  ·  прошло ' + fmtTime(s.el + dt) +
			(pct < 100 && this.rate > 0 ? '  ·  осталось ~' + fmtTime(left) : '');
	}

	this.raf = requestAnimationFrame(this.frame.bind(this));
};

Progress.prototype.stop = function() {
	if (this.raf) cancelAnimationFrame(this.raf);
	this.raf = null;
	this.sample = null;
	this.step = null;
};

function fmtSec(t) {
	var n = parseFloat(t);
	if (isNaN(n)) return '';
	return n < 60 ? n.toFixed(1).replace('.', ',') + ' с' : fmtTime(n);
}

function speedCell(v, busy, bytes, secs) {
	var n = parseFloat(v);
	if (isNaN(n))
		return E('span', { 'style': 'opacity:.6' }, busy ? 'ожидание…' : '—');
	var took = (+bytes > 0 && secs) ? fmtBytes(bytes) + ' за ' + fmtSec(secs) : '';
	return E('div', {}, [
		E('strong', {}, round(n) + ' Мбит/с'),
		took ? E('span', { 'style': 'opacity:.7' }, '  ·  ' + took) : '',
		bar(n)
	]);
}

function sizeName(s) {
	for (var i = 0; i < SIZES.length; i++)
		if (String(SIZES[i][0]) == String(s)) return SIZES[i][1];
	return s ? s + ' МБ' : '—';
}

function bar(mbit) {
	var v = parseFloat(mbit);
	if (isNaN(v)) return E('span', {}, '—');
	var pct = Math.min(100, Math.round(Math.log10(1 + v) / Math.log10(1001) * 100));
	return E('div', { 'class': 'cbi-progressbar', 'title': round(v) + ' Мбит/с' },
		E('div', { 'style': 'width:' + pct + '%' }));
}

function chip(lv) {
	return E('span', {
		'style': 'display:inline-block;padding:.1em .6em;border-radius:999px;font-weight:600;' +
			'color:#fff;background:' + lv[2]
	}, lv[1]);
}

function meter(lv) {
	return E('div', { 'style': 'height:.5em;border-radius:999px;background:rgba(127,127,127,.25);margin-top:.35em;overflow:hidden' },
		E('div', { 'style': 'height:100%;width:' + lv[3] + '%;background:' + lv[2] }));
}

function signalBlock(s) {
	var r = level(RSRP_LEVELS, s.rsrp), q = level(SINR_LEVELS, s.sinr), parts = [];

	if (r)
		parts.push(E('div', { 'style': 'margin-bottom:.6em' }, [
			E('div', {}, [ 'Уровень сигнала: ', chip(r), E('small', { 'style': 'opacity:.7' }, '  ' + round(s.rsrp) + ' дБм') ]),
			meter(r)
		]));
	if (q)
		parts.push(E('div', { 'style': 'margin-bottom:.6em' }, [
			E('div', {}, [ 'Качество (помехи): ', chip(q), E('small', { 'style': 'opacity:.7' }, '  SINR ' + round(s.sinr) + ' дБ') ]),
			meter(q)
		]));

	var bands = (s.bands || '').split(',').map(function(b) {
		var m = b.match(/B(\d+)/);
		return m ? 'B' + m[1] + (BANDS[m[1]] ? ' (' + BANDS[m[1]] + ' МГц)' : '') : null;
	}).filter(function(b) { return b; });
	if (bands.length)
		parts.push(E('div', {}, bands.length > 1
			? 'Агрегация ' + bands.length + ' частот: ' + bands.join(' + ')
			: 'Частота: ' + bands[0]));

	if (r && q)
		parts.push(E('div', { 'style': 'margin-top:.4em;opacity:.8' }, verdict(r, q)));

	return parts.length ? E('div', {}, parts) : E('span', {}, '—');
}

function verdict(r, q) {
	var score = Math.min(r[3], q[3]);
	if (score >= 75) return '👍 Связь отличная, менять ничего не нужно.';
	if (score >= 50) return '👌 Связь нормальная. Можно попробовать чуть повернуть антенны.';
	if (score >= 25) return '⚠️ Связь слабая: поверните антенны или переставьте роутер ближе к окну.';
	return '❗ Связь очень плохая: нужна внешняя антенна или другое место для роутера.';
}

function ipCell(s) {
	if (!s.ip && !s.ip_cf)
		return E('span', { 'style': 'opacity:.6' }, s.running ? 'ожидание…' : '—');
	var parts = [ E('strong', {}, s.ip || s.ip_cf) ];
	if (s.ip && s.ip_cf && s.ip != s.ip_cf)
		parts.push(E('div', { 'style': 'margin-top:.3em;color:#f97316' },
			'⚠️ Сервер отдачи (Selectel) видит другой адрес: ' + s.ip_cf +
			'. Скорее всего, этот трафик идёт через прокси (mihomo), и отдача измеряет скорость прокси.'));
	return E('div', {}, parts);
}

function modeName(m) {
	for (var i = 0; i < MODES.length; i++)
		if (MODES[i][0] == m) return MODES[i][1].toLowerCase();
	return '';
}

function resultTable(s) {
	var t = tests(s), rows = [
		[ 'Канал', (NAMES[s.iface] || '—') + (s.size ? ', объём ' + sizeName(s.size) : '') +
			(s.mode && s.mode != 'both' ? ', ' + modeName(s.mode) : '') ],
		[ 'Пинг (77.88.8.8)', s.ping === '' || s.ping == null
			? E('span', { 'style': 'opacity:.6' }, s.running ? 'ожидание…' : '—')
			: E('span', {}, [ round(s.ping) + ' мс',
				(s.loss && s.loss != '0') ? E('span', { 'style': 'color:#f97316' }, ', потери ' + s.loss + '%') : ', без потерь' ]) ],
		[ 'Внешний IP', ipCell(s) ]
	].concat(t.keys.map(function(k) {
		var r = t.res[k] || {};
		return [ testName(k), speedCell(r.v, s.running, r.b, r.t) ];
	}));
	if (s.iface == 'lte')
		rows.push([ 'Сигнал LTE', signalBlock(s) ]);
	if (s.ts)
		rows.push([ 'Время', new Date(s.ts * 1000).toLocaleString() ]);

	return E('table', { 'class': 'table' }, rows.map(function(r) {
		return E('tr', { 'class': 'tr' }, [
			E('td', { 'class': 'td left', 'width': '33%' }, r[0]),
			E('td', { 'class': 'td left' }, r[1])
		]);
	}));
}

/* union of the tests in these rows, downloads first, then by stream count */
function allKeys(rows) {
	var seen = {};
	rows.forEach(function(r) { r.keys.forEach(function(k) { seen[k] = 1; }); });
	return sortKeys(Object.keys(seen));
}

function historyTable(text) {
	var rows = parseHist(text).reverse();
	if (!rows.length)
		return E('em', {}, 'Замеров пока нет');

	var keys = allKeys(rows),
	    head = [ 'Дата', 'Канал', 'Объём', 'Пинг, мс' ].concat(keys.map(function(k) {
		return testShort(k) + ' ' + plural(+k.slice(1), 'поток', 'потока', 'потоков');
	    })).concat([ 'Внешний IP', 'Сигнал' ]);
	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, head.map(function(h) {
			return E('th', { 'class': 'th' }, h);
		}))
	].concat(rows.map(function(r) {
		var f = r.f, lv = level(RSRP_LEVELS, f[7]);
		return E('tr', { 'class': 'tr' }, [
			f[0], NAMES[f[1]] || f[1], f[8] ? sizeName(f[8]) : '100 МБ', round(f[2])
		].concat(keys.map(function(k) {
			var x = r.res[k];
			if (!x || x.v === '' || x.v == null) return '—';
			return E('div', {}, [ round(x.v), x.t ? E('div', { 'style': 'opacity:.6;font-size:.85em' }, fmtSec(x.t)) : '' ]);
		})).concat([
			f[13] || '—',
			lv ? chip(lv) : '—'
		]).map(function(v) { return E('td', { 'class': 'td' }, v); }));
	})));
}

/* ---- history chart: one small chart per channel (fibre and LTE differ ~15x, so no shared axis) ---- */

/* colour follows the stream count (validated palette, slots 1-5), so a series keeps its colour
 * whatever else was measured; upload is the same colour, dashed */
var STREAM_CLS = { 4: 's1', 1: 's2', 8: 's3', 16: 's4', 32: 's5' };

function series(keys) {
	return keys.map(function(k) {
		return { key: k, name: testShort(k) + ' ' + plural(+k.slice(1), 'поток', 'потока', 'потоков'),
			cls: STREAM_CLS[k.slice(1)] || 's1', dash: k.charAt(0) == 'u' ? '5 4' : null };
	});
}

var CHART_CSS =
	'.st-viz{--s1:#2a78d6;--s2:#eb6834;--s3:#1baf7a;--s4:#eda100;--s5:#e87ba4;--grid:rgba(127,127,127,.22);--surface:#fcfcfb}' +
	'@media (prefers-color-scheme:dark){.st-viz{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--surface:#1a1a19}}' +
	':root[data-darkmode="true"] .st-viz,:root[data-theme="dark"] .st-viz{--s1:#3987e5;--s2:#d95926;--s3:#199e70;--s4:#c98500;--s5:#d55181;--surface:#1a1a19}' +
	'.st-viz .s1{stroke:var(--s1);fill:var(--s1)} .st-viz .s2{stroke:var(--s2);fill:var(--s2)} .st-viz .s3{stroke:var(--s3);fill:var(--s3)}' +
	'.st-viz .s4{stroke:var(--s4);fill:var(--s4)} .st-viz .s5{stroke:var(--s5);fill:var(--s5)}' +
	'.st-viz .ln{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}' +
	'.st-viz .dot{stroke:var(--surface);stroke-width:2}' +
	'.st-viz .hit{fill:transparent;stroke:none;cursor:default}' +
	'.st-viz .ax{fill:currentColor;opacity:.65;font-size:11px}' +
	'.st-viz .gl{stroke:var(--grid);stroke-width:1}' +
	'.st-viz .lg{display:flex;flex-wrap:wrap;gap:.4em 1.4em;margin:.2em 0 .4em;font-size:.92em}' +
	'.st-viz .sw{display:inline-block;width:14px;height:3px;border-radius:2px;vertical-align:middle;margin-right:.4em}' +
	'.st-viz .cw{margin-bottom:1.2em}';

function plural(n, one, few, many) {
	var m10 = n % 10, m100 = n % 100;
	return m10 == 1 && m100 != 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
}

function niceMax(v) {
	if (!(v > 0)) return 1;
	var e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e;
	return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e;
}

function esc(t) {
	return String(t).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

function chartFor(rows, title) {
	var W = 640, H = 210, L = 46, R = 12, T = 10, B = 26,
	    pw = W - L - R, ph = H - T - B, n = rows.length,
	    max = 0, ser = series(allKeys(rows)),
	    val = function(r, k) { return parseFloat((r.res[k] || {}).v); };

	rows.forEach(function(r) {
		ser.forEach(function(se) { var v = val(r, se.key); if (v > max) max = v; });
	});
	max = niceMax(max * 1.05);

	var x = function(i) { return L + (n > 1 ? i * pw / (n - 1) : pw / 2); },
	    y = function(v) { return T + ph - v / max * ph; },
	    svg = [];

	for (var g = 0; g <= 4; g++) {
		var gv = max * g / 4, gy = y(gv);
		svg.push('<line class="gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy + '" y2="' + gy + '"/>');
		svg.push('<text class="ax" x="' + (L - 6) + '" y="' + (gy + 4) + '" text-anchor="end">' + round(gv) + '</text>');
	}

	/* x labels: first, last and a few in between, never overlapping */
	var step = Math.max(1, Math.ceil(n / 5));
	rows.forEach(function(r, i) {
		if (i % step && i != n - 1) return;
		if (i != n - 1 && n - 1 - i < step / 2) return;
		var f = r.f, d = (f[0] || '').match(/\d{4}-(\d\d)-(\d\d) (\d\d:\d\d)/), lbl = d ? d[2] + '.' + d[1] + ' ' + d[3] : f[0];
		svg.push('<text class="ax" x="' + x(i) + '" y="' + (H - 6) + '" text-anchor="' +
			(n > 1 && i == 0 ? 'start' : i == n - 1 && n > 1 ? 'end' : 'middle') + '">' + esc(lbl) + '</text>');
	});

	ser.forEach(function(se) {
		var pts = [];
		rows.forEach(function(r, i) { var v = val(r, se.key); if (!isNaN(v)) pts.push([ x(i), y(v), v, r.f[0] ]); });
		if (pts.length > 1)
			svg.push('<polyline class="ln ' + se.cls + '"' + (se.dash ? ' stroke-dasharray="' + se.dash + '"' : '') +
				' points="' + pts.map(function(p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>');
		pts.forEach(function(p) {
			svg.push('<circle class="dot ' + se.cls + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4"/>');
			svg.push('<circle class="hit" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="11"><title>' +
				esc(p[3] + ' · ' + se.name + ': ' + round(p[2]) + ' Мбит/с') + '</title></circle>');
		});
	});

	var last = rows[n - 1];
	var legend = '<div class="lg">' + ser.map(function(se) {
		var v = val(last, se.key);
		return '<span><span class="sw ' + se.cls + '" style="background:var(--' + se.cls + ')' +
			(se.dash ? ';background:repeating-linear-gradient(90deg,var(--' + se.cls + ') 0 5px,transparent 5px 9px)' : '') +
			'"></span>' + esc(se.name) + (isNaN(v) ? '' : ' — <strong>' + round(v) + '</strong> Мбит/с') + '</span>';
	}).join('') + '</div>';

	return '<div class="cw"><div><strong>' + esc(title) + '</strong> <span style="opacity:.65">· Мбит/с, ' +
		(n == 1 ? 'один замер' : 'последние ' + n + ' ' + plural(n, 'замер', 'замера', 'замеров')) + '</span></div>' + legend +
		'<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + esc(title) + '">' + svg.join('') + '</svg></div>';
}

function historyChart(text) {
	var rows = parseHist(text),
	    html = [ 'main', 'lte' ].map(function(ch) {
		var r = rows.filter(function(x) { return x.f[1] == ch; });
		return r.length ? chartFor(r, NAMES[ch]) : '';
	    }).join('');
	var div = E('div', { 'class': 'st-viz' });
	div.innerHTML = html || '<em>Для графика пока нет замеров</em>';
	return div;
}

/* remembered choice of volume / mode / streams (per browser; the page works without it) */
var PREFS = 'luci-speedtest';

function loadPrefs() {
	try { return JSON.parse(localStorage.getItem(PREFS)) || {}; } catch (e) { return {}; }
}

function savePrefs(p) {
	try { localStorage.setItem(PREFS, JSON.stringify(p)); } catch (e) {}
}

return view.extend({
	size: 100,
	mode: 'both',
	streams: [ 1, 4 ],
	busy: false,

	load: function() {
		return Promise.all([ run([ 'status' ]), run([ 'history', '50' ]) ]);
	},

	render: function(data) {
		var self = this, p = loadPrefs();
		if (SIZES.some(function(s) { return s[0] == p.size; })) this.size = p.size;
		if (MODES.some(function(m) { return m[0] == p.mode; })) this.mode = p.mode;
		if (Array.isArray(p.streams)) {
			var st = p.streams.filter(function(n) { return STREAMS.indexOf(n) >= 0; });
			if (st.length) this.streams = st;
		}

		this.status = E('div', {});
		this.result = E('div', {});
		this.history = E('div', {});
		this.chart = E('div', {});
		if (!document.getElementById('st-viz-css'))
			document.head.appendChild(E('style', { 'id': 'st-viz-css' }, CHART_CSS));
		this.hint = E('div', { 'style': 'margin:.5em 0 1em;opacity:.75' });

		var pick = function(list, set) {
			return list.map(function(x) {
				return E('button', {
					'class': 'cbi-button',
					'style': 'margin:0 .5em .3em 0',
					'click': function(ev) { set(x[0]); self.paint(); return false; }
				}, x[1]);
			});
		};

		this.sizeButtons = pick(SIZES, function(v) { self.size = v; });
		this.modeButtons = pick(MODES, function(v) { self.mode = v; });
		this.streamButtons = pick(STREAMS.map(function(n) { return [ n, String(n) ]; }), function(n) {
			var i = self.streams.indexOf(n);
			if (i < 0) self.streams = self.streams.concat([ n ]).sort(function(a, b) { return a - b; });
			else if (self.streams.length > 1) self.streams.splice(i, 1);	/* at least one stays selected */
		});

		this.buttons = [ 'main', 'lte' ].map(function(i) {
			return E('button', {
				'class': 'cbi-button cbi-button-action',
				'style': 'margin-right:1em',
				'click': ui.createHandlerFn(self, 'start', i)
			}, 'Тест: ' + NAMES[i]);
		});

		this.paint();
		this.update(json(data[0]), data[1]);

		/* status every second while a test runs; history only when a test has just finished */
		poll.add(function() {
			return run([ 'status' ]).then(function(t) {
				var st = json(t), finished = self.wasRunning && !st.running;
				self.wasRunning = !!st.running;
				if (!finished)
					return self.update(st, null);
				return run([ 'history', '50' ]).then(function(h) { self.update(st, h); });
			});
		}, 1);

		var row = function(label, btns) {
			return E('div', { 'style': 'margin-bottom:.3em' }, [ E('strong', {}, label) ].concat(btns));
		};

		return E('div', {}, [
			E('h2', {}, 'Тест скорости'),
			E('div', { 'class': 'cbi-map-descr' },
				'«Основной интернет» — через RB5009 (оптика, при аварии — LTE). «LTE» — напрямую через модем, ' +
				'основной канал при этом не отключается.'),
			E('div', { 'class': 'cbi-section' }, [
				row('Режим: ', this.modeButtons),
				row('Потоки: ', this.streamButtons.concat([
					E('span', { 'style': 'opacity:.7' }, ' можно выбрать несколько — каждый вариант будет отдельным замером') ])),
				row('Объём: ', this.sizeButtons),
				this.hint,
				E('div', {}, this.buttons),
				this.status
			]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'Последний результат'), this.result ]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'Скорость по времени'), this.chart ]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'История'), this.history ])
		]);
	},

	/* expected traffic of the chosen test, MB: every stream count is a separate test of the full volume */
	traffic: function() {
		var n = this.streams.length;
		return {
			dl: this.mode != 'up' ? this.size * n : 0,
			up: this.mode != 'dl' ? this.size * n : 0
		};
	},

	paint: function() {
		var self = this, mark = function(btns, on) {
			btns.forEach(function(b, i) {
				b.className = 'cbi-button' + (on(i) ? ' cbi-button-positive' : '');
				b.disabled = self.busy;
			});
		};
		mark(this.sizeButtons, function(i) { return SIZES[i][0] == self.size; });
		mark(this.modeButtons, function(i) { return MODES[i][0] == self.mode; });
		mark(this.streamButtons, function(i) { return self.streams.indexOf(STREAMS[i]) >= 0; });
		this.buttons.forEach(function(b) { b.disabled = self.busy; });
		if (this.size == 10000) this.buttons[1].disabled = true;

		savePrefs({ size: this.size, mode: this.mode, streams: this.streams });

		var sz = SIZES.filter(function(s) { return s[0] == self.size; })[0], t = this.traffic(), parts = [ sz[2] ];
		parts.push('трафик ≈ ' + fmtBytes((t.dl + t.up) * 1048576) +
			(t.dl && t.up ? ' (↓ ' + fmtBytes(t.dl * 1048576) + ', ↑ ' + fmtBytes(t.up * 1048576) + ')' : ''));
		parts.push(this.streams.length + ' ' + plural(this.streams.length, 'замер', 'замера', 'замеров') +
			(this.mode == 'both' ? ' в каждую сторону' : ''));
		var hint = parts.join(', ') + '.';
		if (this.size == 10 && this.streams[this.streams.length - 1] >= 16)
			hint += ' На 10 МБ при 16–32 потоках каждому потоку достаётся слишком мало данных — тест покажет меньше реального, лучше взять 100 МБ или больше.';
		if (this.size == 1000)
			hint += ' На LTE тест займёт несколько минут.';
		dom.content(this.hint, hint);
	},

	update: function(s, hist) {
		if (hist != null) this.lastHist = hist;
		this.busy = !!s.running;
		this.paint();

		if (!this.prog) this.prog = new Progress();
		if (this.busy && !s.error) {
			this.prog.set(s);
			if (this.prog.box.parentNode !== this.status)
				dom.content(this.status, this.prog.box);
		} else {
			this.prog.stop();
			dom.content(this.status, s.error ? E('p', { 'style': 'margin-top:1em;color:#ef4444' }, 'Ошибка: ' + s.error) : '');
		}
		dom.content(this.result, s.iface ? resultTable(s) : E('em', {}, 'Выберите режим, потоки и объём и нажмите кнопку теста'));
		if (hist != null) {
			dom.content(this.history, historyTable((this.lastHist || '').trim().split('\n').slice(-20).join('\n')));
			dom.content(this.chart, historyChart(this.lastHist));
		}
	},

	start: function(iface) {
		var self = this, t = this.traffic(), total = fmtBytes((t.dl + t.up) * 1048576);
		if (this.size == 10000 && iface == 'lte')
			return;
		if (this.size == 10000 &&
		    !confirm('Тест 10 ГБ передаст около ' + total + ' и займёт несколько минут. Продолжить?'))
			return;
		if (iface == 'lte' && t.dl + t.up >= 1000 &&
		    !confirm('Тест через LTE израсходует около ' + total + ' мобильного трафика. Продолжить?'))
			return;
		return run([ 'start', iface, String(this.size), this.mode, this.streams.join(',') ]).then(function(r) {
			r = json(r);
			if (r.error == 'busy')
				ui.addNotification(null, E('p', 'Тест уже идёт, дождитесь окончания.'));
			else if (r.error)
				ui.addNotification(null, E('p', 'Не удалось запустить тест: ' + r.error +
					' (возможно, на роутере старая версия /usr/bin/speedtest.sh — переустановите)'));
			return run([ 'status' ]).then(function(st) { self.update(json(st), null); });
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
