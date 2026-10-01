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
	ping: 'Пинг…',
	dl1: 'Скачивание, 1 поток…',
	dl4: 'Скачивание, 4 потока…',
	up: 'Отдача…',
	done: 'Готово'
};

var NAMES = { main: 'Основной интернет', lte: 'LTE (модем)' };

var SIZES = [
	[ 10, '10 МБ', 'быстро, ~20 МБ трафика' ],
	[ 100, '100 МБ', 'точнее, ~200–300 МБ трафика' ],
	[ 1000, '1 ГБ', 'высокая точность, ~2,1 ГБ трафика' ],
	[ 10000, '10 ГБ', 'для быстрой оптики, ~20 ГБ трафика, несколько минут; только основной интернет' ]
];

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
	if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' ГБ';
	if (b >= 1048576) return (b / 1048576).toFixed(b >= 104857600 ? 0 : 1) + ' МБ';
	return (b / 1024).toFixed(0) + ' КБ';
}

function fmtTime(sec) {
	sec = Math.max(0, Math.round(sec));
	var m = Math.floor(sec / 60), ss = sec % 60;
	return m + ':' + (ss < 10 ? '0' : '') + ss;
}

var ORDER = [ 'ping', 'dl1', 'dl4', 'up' ];

function progressBlock(s) {
	var idx = ORDER.indexOf(s.step), parts = [];
	parts.push(E('div', { 'style': 'margin-bottom:.4em' }, [
		E('span', { 'class': 'spinning' }, ' '), ' ',
		E('strong', {}, NAMES[s.iface] + ' (' + sizeName(s.size) + ')'),
		': ' + (STEPS[s.step] || s.step) + (idx >= 0 ? '  ·  шаг ' + (idx + 1) + ' из ' + ORDER.length : '')
	]));

	if (s.p_total > 0) {
		var pct = Math.min(100, s.p_done / s.p_total * 100),
		    el = Math.max(1, s.p_el),
		    mbit = s.p_done * 8 / el / 1e6,
		    left = mbit > 0 ? (s.p_total - s.p_done) * 8 / 1e6 / mbit : 0;
		parts.push(E('div', { 'class': 'cbi-progressbar', 'title': pct.toFixed(0) + '%' },
			E('div', { 'style': 'width:' + pct.toFixed(1) + '%' })));
		parts.push(E('div', { 'style': 'margin-top:.4em;font-variant-numeric:tabular-nums' },
			fmtBytes(s.p_done) + ' из ' + fmtBytes(s.p_total) + ' (' + pct.toFixed(0) + '%)  ·  ' +
			round(mbit) + ' Мбит/с  ·  прошло ' + fmtTime(el) +
			(pct < 100 && mbit > 0 ? '  ·  осталось ~' + fmtTime(left) : '')));
	}
	return E('div', { 'style': 'margin-top:1em' }, parts);
}

function speedCell(v, busy) {
	var n = parseFloat(v);
	if (isNaN(n))
		return E('span', { 'style': 'opacity:.6' }, busy ? 'ожидание…' : '—');
	return E('div', {}, [ E('strong', {}, round(n) + ' Мбит/с'), bar(n) ]);
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

function resultTable(s) {
	var rows = [
		[ 'Канал', (NAMES[s.iface] || '—') + (s.size ? ', объём ' + sizeName(s.size) : '') ],
		[ 'Пинг (77.88.8.8)', s.ping === '' || s.ping == null
			? E('span', { 'style': 'opacity:.6' }, s.running ? 'ожидание…' : '—')
			: E('span', {}, [ round(s.ping) + ' мс',
				(s.loss && s.loss != '0') ? E('span', { 'style': 'color:#f97316' }, ', потери ' + s.loss + '%') : ', без потерь' ]) ],
		[ 'Скачивание, 1 поток', speedCell(s.dl1, s.running) ],
		[ 'Скачивание, 4 потока', speedCell(s.dl4, s.running) ],
		[ 'Отдача', speedCell(s.up, s.running) ]
	];
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

function historyTable(text) {
	var lines = (text || '').trim().split('\n').filter(function(l) { return l; }).reverse();
	if (!lines.length)
		return E('em', {}, 'Замеров пока нет');

	var head = [ 'Дата', 'Канал', 'Объём', 'Пинг, мс', '↓ 1 поток', '↓ 4 потока', '↑ отдача', 'Сигнал' ];
	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, head.map(function(h) {
			return E('th', { 'class': 'th' }, h);
		}))
	].concat(lines.map(function(l) {
		var f = l.split('|'), lv = level(RSRP_LEVELS, f[7]);
		return E('tr', { 'class': 'tr' }, [
			f[0], NAMES[f[1]] || f[1], f[8] ? sizeName(f[8]) : '100 МБ',
			round(f[2]), round(f[4]), round(f[5]), round(f[6]),
			lv ? chip(lv) : '—'
		].map(function(v) { return E('td', { 'class': 'td' }, v); }));
	})));
}

return view.extend({
	size: 100,

	load: function() {
		return Promise.all([ run([ 'status' ]), run([ 'history' ]) ]);
	},

	render: function(data) {
		var self = this;
		this.status = E('div', {});
		this.result = E('div', {});
		this.history = E('div', {});
		this.hint = E('div', { 'style': 'margin:.5em 0 1em;opacity:.75' });

		this.sizeButtons = SIZES.map(function(sz) {
			return E('button', {
				'class': 'cbi-button',
				'style': 'margin-right:.5em',
				'click': function(ev) { self.size = sz[0]; self.paintSizes(); return false; }
			}, sz[1]);
		});

		this.buttons = [ 'main', 'lte' ].map(function(i) {
			return E('button', {
				'class': 'cbi-button cbi-button-action',
				'style': 'margin-right:1em',
				'click': ui.createHandlerFn(self, 'start', i)
			}, 'Тест: ' + NAMES[i]);
		});

		this.paintSizes();
		this.update(json(data[0]), data[1]);

		/* status every second while a test runs; history only when a test has just finished */
		poll.add(function() {
			return run([ 'status' ]).then(function(t) {
				var st = json(t), finished = self.wasRunning && !st.running;
				self.wasRunning = !!st.running;
				if (!finished)
					return self.update(st, null);
				return run([ 'history' ]).then(function(h) { self.update(st, h); });
			});
		}, 1);

		return E('div', {}, [
			E('h2', {}, 'Тест скорости'),
			E('div', { 'class': 'cbi-map-descr' },
				'«Основной интернет» — через RB5009 (оптика, при аварии — LTE). «LTE» — напрямую через модем, ' +
				'основной канал при этом не отключается.'),
			E('div', { 'class': 'cbi-section' }, [
				E('div', { 'style': 'margin-bottom:.3em' }, [ E('strong', {}, 'Объём скачивания: ') ].concat(this.sizeButtons)),
				this.hint,
				E('div', {}, this.buttons),
				this.status
			]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'Последний результат'), this.result ]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'История'), this.history ])
		]);
	},

	paintSizes: function() {
		var self = this;
		this.sizeButtons.forEach(function(b, i) {
			b.className = 'cbi-button' + (SIZES[i][0] == self.size ? ' cbi-button-positive' : '');
		});
		var sz = SIZES.filter(function(s) { return s[0] == self.size; })[0];
		dom.content(this.hint, sz[2] + (self.size == 1000 ? '. На LTE тест займёт несколько минут.' : ''));
		if (this.buttons) this.buttons[1].disabled = (self.size == 10000);
	},

	update: function(s, hist) {
		if (hist != null) this.lastHist = hist;
		var busy = !!s.running;
		this.buttons.concat(this.sizeButtons).forEach(function(b) { b.disabled = busy; });
		if (this.size == 10000) this.buttons[1].disabled = true;

		var msg = s.error ? E('p', { 'style': 'margin-top:1em;color:#ef4444' }, 'Ошибка: ' + s.error)
			: busy ? progressBlock(s)
			: '';
		dom.content(this.status, msg);
		dom.content(this.result, s.iface ? resultTable(s) : E('em', {}, 'Выберите объём и нажмите кнопку теста'));
		dom.content(this.history, historyTable(this.lastHist));
	},

	start: function(iface) {
		var self = this;
		if (this.size == 10000 && iface == 'lte')
			return;
		if (this.size == 10000 &&
		    !confirm('Тест 10 ГБ скачает около 20 ГБ и займёт несколько минут. Продолжить?'))
			return;
		if (this.size == 1000 && iface == 'lte' &&
		    !confirm('Тест 1 ГБ через LTE израсходует около 2 ГБ мобильного трафика. Продолжить?'))
			return;
		return run([ 'start', iface, String(this.size) ]).then(function(t) {
			var r = json(t);
			if (r.error == 'busy')
				ui.addNotification(null, E('p', 'Тест уже идёт, дождитесь окончания.'));
			return run([ 'status' ]).then(function(st) { self.update(json(st), null); });
		});
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
