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

function bar(mbit) {
	var v = parseFloat(mbit);
	if (isNaN(v)) return E('span', {}, '—');
	var pct = Math.min(100, Math.round(Math.log10(1 + v) / Math.log10(1001) * 100));
	return E('div', { 'class': 'cbi-progressbar', 'title': v + ' Мбит/с' },
		E('div', { 'style': 'width:' + pct + '%' }));
}

function resultTable(s) {
	var rows = [
		[ 'Канал', NAMES[s.iface] || '—' ],
		[ 'Пинг (77.88.8.8)', num(s.ping, 'мс') + (s.loss ? ', потери ' + s.loss + '%' : '') ],
		[ 'Скачивание, 1 поток', E('div', {}, [ E('strong', {}, num(s.dl1, 'Мбит/с')), bar(s.dl1) ]) ],
		[ 'Скачивание, 4 потока', E('div', {}, [ E('strong', {}, num(s.dl4, 'Мбит/с')), bar(s.dl4) ]) ],
		[ 'Отдача', E('div', {}, [ E('strong', {}, num(s.up, 'Мбит/с')), bar(s.up) ]) ]
	];
	if (s.iface == 'lte')
		rows.push([ 'Сигнал', num(s.rsrp, 'дБм RSRP') + (s.sinr ? ', SINR ' + s.sinr + ' дБ' : '') +
			(s.bands ? ' — ' + s.bands : '') ]);
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

	var head = [ 'Дата', 'Канал', 'Пинг, мс', '↓ 1 поток', '↓ 4 потока', '↑ отдача', 'RSRP' ];
	return E('table', { 'class': 'table' }, [
		E('tr', { 'class': 'tr table-titles' }, head.map(function(h) {
			return E('th', { 'class': 'th' }, h);
		}))
	].concat(lines.map(function(l) {
		var f = l.split('|');
		return E('tr', { 'class': 'tr' }, [
			f[0], NAMES[f[1]] || f[1], num(f[2]), num(f[4]), num(f[5]), num(f[6]), num(f[7])
		].map(function(v) { return E('td', { 'class': 'td' }, v); }));
	})));
}

return view.extend({
	load: function() {
		return Promise.all([ run([ 'status' ]), run([ 'history' ]) ]);
	},

	render: function(data) {
		var self = this;
		this.status = E('div', {});
		this.result = E('div', {});
		this.history = E('div', {});
		this.buttons = [ 'main', 'lte' ].map(function(i) {
			return E('button', {
				'class': 'cbi-button cbi-button-action',
				'style': 'margin-right:1em',
				'click': ui.createHandlerFn(self, 'start', i)
			}, 'Тест: ' + NAMES[i]);
		});

		this.update(json(data[0]), data[1]);

		poll.add(function() {
			return Promise.all([ run([ 'status' ]), run([ 'history' ]) ]).then(function(d) {
				self.update(json(d[0]), d[1]);
			});
		}, 2);

		return E('div', {}, [
			E('h2', {}, 'Тест скорости'),
			E('div', { 'class': 'cbi-map-descr' },
				'«Основной интернет» — через RB5009 (оптика, при аварии — LTE). «LTE» — напрямую через модем, ' +
				'основной канал при этом не отключается. Тест длится около минуты и расходует ~100–300 МБ трафика.'),
			E('div', { 'class': 'cbi-section' }, [ E('div', {}, this.buttons), this.status ]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'Последний результат'), this.result ]),
			E('div', { 'class': 'cbi-section' }, [ E('h3', {}, 'История'), this.history ])
		]);
	},

	update: function(s, hist) {
		if (hist != null) this.lastHist = hist;
		var busy = !!s.running;
		this.buttons.forEach(function(b) { b.disabled = busy; });

		var msg = s.error ? E('span', { 'style': 'color:#e74c3c' }, 'Ошибка: ' + s.error)
			: busy ? E('span', {}, [ E('span', { 'class': 'spinning' }, ' '), ' ', NAMES[s.iface] + ': ' + (STEPS[s.step] || s.step) ])
			: '';
		dom.content(this.status, E('p', { 'style': 'margin-top:1em' }, msg));
		dom.content(this.result, s.iface ? resultTable(s) : E('em', {}, 'Нажмите кнопку, чтобы запустить тест'));
		dom.content(this.history, historyTable(this.lastHist));
	},

	start: function(iface) {
		var self = this;
		return run([ 'start', iface ]).then(function(t) {
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
