'use strict';
'require baseclass';
'require fs';

/* Status -> Overview: live per-core CPU load and frequency (from /proc/stat and cpufreq). */

var prev = null;

function parseStat(text) {
	var cores = {};
	(text || '').split('\n').forEach(function(l) {
		var m = l.match(/^(cpu\d*)\s+(.+)$/);
		if (!m) return;
		var v = m[2].trim().split(/\s+/).map(Number);
		var idle = v[3] + (v[4] || 0);
		var total = v.slice(0, 8).reduce(function(a, b) { return a + b; }, 0);
		cores[m[1]] = { idle: idle, total: total };
	});
	return cores;
}

function bar(pct) {
	var color = pct >= 85 ? '#c62828' : pct >= 50 ? '#f9a825' : '#2e7d32';
	return E('div', { 'style': 'display:flex;align-items:center;gap:8px' }, [
		E('div', { 'style': 'flex:1;max-width:400px;height:12px;background:rgba(128,128,128,.25);border-radius:6px;overflow:hidden' },
			E('div', { 'style': 'width:' + pct + '%;height:100%;background:' + color + ';transition:width .5s' })),
		E('span', { 'style': 'min-width:3.5em;text-align:right' }, pct.toFixed(0) + '%')
	]);
}

return baseclass.extend({
	title: _('CPU'),

	load: function() {
		var reads = [ L.resolveDefault(fs.read('/proc/stat'), '') ];
		for (var i = 0; i < 8; i++)
			reads.push(L.resolveDefault(fs.read('/sys/devices/system/cpu/cpu' + i + '/cpufreq/scaling_cur_freq'), null));
		return Promise.all(reads);
	},

	render: function(data) {
		var cur = parseStat(data[0]), rows = [];
		var names = Object.keys(cur).filter(function(k) { return k != 'cpu'; })
			.sort(function(a, b) { return +a.slice(3) - +b.slice(3); });
		names.unshift('cpu');

		names.forEach(function(n) {
			var pct = 0;
			if (prev && prev[n]) {
				var dt = cur[n].total - prev[n].total, di = cur[n].idle - prev[n].idle;
				pct = dt > 0 ? Math.max(0, Math.min(100, 100 * (dt - di) / dt)) : 0;
			}
			var idx = n.slice(3), freq = idx !== '' ? data[1 + (+idx)] : null;
			var label = (n == 'cpu') ? _('All cores') : _('Core') + ' ' + idx;
			if (freq) label += ' (' + Math.round(parseInt(freq) / 1000) + ' MHz)';
			rows.push(E('tr', { 'class': 'tr' }, [
				E('td', { 'class': 'td left', 'width': '33%' }, n == 'cpu' ? E('strong', {}, label) : label),
				E('td', { 'class': 'td left' }, prev ? bar(pct) : E('em', {}, _('measuring…')))
			]));
		});

		prev = cur;
		return E('table', { 'class': 'table' }, rows);
	}
});
