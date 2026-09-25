/* LuCI statistics graph definition for the "modem" collectd exec plugin (modem_collectd.sh). */

'use strict';
'require baseclass';

return baseclass.extend({
	title: _('Modem'),

	rrdargs(graph, host, plugin, plugin_instance, dtype) {
		if (plugin_instance == 'status')
			return {
				title: "%H: Modem signal quality",
				vlabel: "%",
				y_min: "0",
				number_format: "%3.0lf%%",
				data: {
					types: [ "percent" ],
					instances: { percent: [ "quality" ] },
					options: {
						percent_quality: { title: "Quality", color: "0000ff", noarea: true }
					}
				}
			};

		const power = {
			title: "%H: %pi RSRP / RSSI",
			vlabel: "dBm",
			alt_autoscale: true,
			number_format: "%5.1lf dBm",
			data: {
				types: [ "signal_power" ],
				instances: { signal_power: [ "rsrp", "rssi" ] },
				options: {
					signal_power_rsrp: { title: "RSRP", color: "0000ff", overlay: true, noarea: true },
					signal_power_rssi: { title: "RSSI", color: "00a000", overlay: true, noarea: true }
				}
			}
		};

		const rsrq = {
			title: "%H: %pi RSRQ",
			vlabel: "dB",
			alt_autoscale: true,
			number_format: "%5.1lf dB",
			data: {
				types: [ "signal_power" ],
				instances: { signal_power: [ "rsrq" ] },
				options: {
					signal_power_rsrq: { title: "RSRQ", color: "ff8000", noarea: true }
				}
			}
		};

		const sinr = {
			title: "%H: %pi SINR",
			vlabel: "dB",
			alt_autoscale: true,
			number_format: "%5.1lf dB",
			data: {
				types: [ "gauge" ],
				instances: { gauge: [ "sinr" ] },
				options: {
					gauge_sinr: { title: "SINR", color: "c00000", noarea: true }
				}
			}
		};

		return [ power, rsrq, sinr ];
	}
});
