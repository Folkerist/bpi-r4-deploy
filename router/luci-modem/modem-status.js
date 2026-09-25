'use strict';
'require view';
'require fs';
'require poll';
'require dom';

/* LuCI: Status -> Modem. Reads ModemManager via mmcli (-K key/value output). */

function kv(out) {
	var r = {};
	(out || '').split('\n').forEach(function(l) {
		var i = l.indexOf(':');
		if (i < 0) return;
		var k = l.slice(0, i).trim(), v = l.slice(i + 1).trim();
		if (k) r[k] = v;
	});
	return r;
}

function val(v) {
	return (v == null || v === '' || v === '--') ? null : v;
}

function list(d, key) {
	return Object.keys(d).filter(function(k) { return k.indexOf(key + '.value[') === 0; })
		.map(function(k) { return d[k]; }).filter(val);
}

function mmcli(args) {
	return fs.exec('/usr/bin/mmcli', args).then(function(r) { return kv(r.stdout); }).catch(function() { return {}; });
}

/* thresholds: [excellent, good, fair] - higher is better */
var LEVELS = {
	rsrp: [-80, -90, -100],
	rsrq: [-10, -15, -20],
	snr:  [20, 13, 0],
	rssi: [-65, -75, -85]
};

function badge(kind, v) {
	var n = parseFloat(v), t = LEVELS[kind], txt, color;
	if (isNaN(n) || !t) return E('span', {}, v);
	if (n >= t[0])      { txt = _('excellent'); color = '#2e7d32'; }
	else if (n >= t[1]) { txt = _('good');      color = '#689f38'; }
	else if (n >= t[2]) { txt = _('fair');      color = '#f9a825'; }
	else                { txt = _('poor');      color = '#c62828'; }
	return E('span', {}, [ n + ' ', E('span', { 'style': 'color:' + color + ';font-weight:bold' }, '(' + txt + ')') ]);
}

function bar(pct) {
	var p = Math.max(0, Math.min(100, parseInt(pct) || 0));
	var color = p >= 70 ? '#2e7d32' : p >= 40 ? '#f9a825' : '#c62828';
	return E('div', { 'style': 'display:flex;align-items:center;gap:8px' }, [
		E('div', { 'style': 'width:200px;height:12px;background:#ddd;border-radius:6px;overflow:hidden' },
			E('div', { 'style': 'width:' + p + '%;height:100%;background:' + color })),
		E('span', {}, p + '%')
	]);
}

function fmtDuration(s) {
	s = parseInt(s);
	if (isNaN(s)) return null;
	var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
	return (d ? d + 'd ' : '') + h + 'h ' + m + 'm';
}

function fmtBytes(b) {
	b = parseFloat(b);
	if (isNaN(b)) return null;
	var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
	while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
	return b.toFixed(i ? 2 : 0) + ' ' + u[i];
}

function table(title, rows) {
	rows = rows.filter(function(r) { return r[1] != null && r[1] !== ''; });
	if (!rows.length) return E([]);
	return E('div', { 'class': 'cbi-section' }, [
		E('h3', {}, title),
		E('table', { 'class': 'table' }, rows.map(function(r) {
			return E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'width': '33%' }, r[0]),
				E('td', { 'class': 'td left' }, r[1])
			]);
		}))
	]);
}

return view.extend({
	load: function() {
		return mmcli(['-m', 'any', '-K']).then(function(m) {
			var bearer = list(m, 'modem.generic.bearers')[0];
			return Promise.all([
				m,
				mmcli(['-m', 'any', '--signal-get', '-K']),
				mmcli(['-m', 'any', '--location-get', '-K']),
				bearer ? mmcli(['-b', bearer, '-K']) : {}
			]);
		});
	},

	build: function(data) {
		var m = data[0], s = data[1], l = data[2], b = data[3];

		if (!val(m['modem.generic.model']))
			return E('div', { 'class': 'alert-message warning' }, _('No modem found (mmcli -L is empty).'));

		var sig = [];
		[['lte', 'LTE'], ['5g', '5G NR'], ['umts', 'UMTS'], ['gsm', 'GSM']].forEach(function(t) {
			var p = 'modem.signal.' + t[0] + '.';
			[['rssi', 'RSSI', ' dBm'], ['rsrp', 'RSRP', ' dBm'], ['rsrq', 'RSRQ', ' dB'], ['snr', 'SINR', ' dB']].forEach(function(f) {
				var v = val(s[p + f[0]]);
				if (v != null) sig.push([t[1] + ' ' + f[1] + ' (' + f[2].trim() + ')', badge(f[0], v)]);
			});
		});
		if (!sig.length)
			sig.push([_('Details'), _('No data yet: signal polling is enabled on interface "mm" up (mmcli --signal-setup=10).')]);

		var cid = val(l['modem.location.3gpp.cid']);
		var tac = val(l['modem.location.3gpp.tac']) || val(l['modem.location.3gpp.lac']);

		return E([], [
			table(_('Connection'), [
				[_('State'), val(m['modem.generic.state'])],
				[_('Operator'), [val(m['modem.3gpp.operator-name']), val(m['modem.3gpp.operator-code'])].filter(Boolean).join(' / ') || null],
				[_('Registration'), val(m['modem.3gpp.registration-state'])],
				[_('Access technology'), list(m, 'modem.generic.access-technologies').join(', ') || null],
				[_('Signal quality'), val(m['modem.generic.signal-quality.value']) != null ? bar(m['modem.generic.signal-quality.value']) : null],
				[_('IPv4 address'), val(b['bearer.ipv4-config.address'])],
				[_('Connected for'), fmtDuration(b['bearer.stats.duration'])],
				[_('Received / sent (session)'), (val(b['bearer.stats.bytes-rx']) != null)
					? fmtBytes(b['bearer.stats.bytes-rx']) + ' / ' + fmtBytes(b['bearer.stats.bytes-tx']) : null]
			]),
			table(_('Signal'), sig),
			table(_('Cell'), [
				['MCC / MNC', [val(l['modem.location.3gpp.mcc']), val(l['modem.location.3gpp.mnc'])].filter(Boolean).join(' / ') || null],
				['TAC / LAC', tac ? tac + ' (' + parseInt(tac, 16) + ')' : null],
				['Cell ID', cid ? cid + ' (eNB ' + (parseInt(cid, 16) >> 8) + ', sector ' + (parseInt(cid, 16) & 255) + ')' : null],
				[_('Current bands'), list(m, 'modem.generic.current-bands').join(', ') || null]
			]),
			table(_('Modem'), [
				[_('Model'), [val(m['modem.generic.manufacturer']), val(m['modem.generic.model'])].filter(Boolean).join(' ')],
				[_('Firmware'), val(m['modem.generic.revision'])],
				[_('Power state'), val(m['modem.generic.power-state'])],
				[_('Own number'), list(m, 'modem.generic.own-numbers').join(', ') || null],
				[_('Device'), val(m['modem.generic.device'])]
			])
		]);
	},

	render: function(data) {
		var box = E('div', {}, this.build(data));
		poll.add(L.bind(function() {
			return this.load().then(L.bind(function(d) { dom.content(box, this.build(d)); }, this));
		}, this), 5);
		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, _('Modem')),
			E('div', { 'class': 'cbi-map-descr' }, _('ModemManager status, refreshed every 5 seconds.')),
			box
		]);
	},

	handleSaveApply: null,
	handleSave: null,
	handleReset: null
});
