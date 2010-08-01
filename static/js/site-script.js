Deferred.define();

Ecole = {};
Ecole.API_BASE = '';
Ecole.get = function (path) {
	return $.getJSON(Ecole.API_BASE + path);
};

Ecole.Updater = function () { this.init.apply(this, arguments) };
Ecole.Updater.prototype = {
	init : function () {
	}
};

$(function () {
	var bufferArea  = [$('#buffer1'), $('#buffer2')];
	var nextUpdate  = 0;
	var bufferName  = {};

	var last = 0;
	next(function update () {
		return Ecole.get('/api/buffer?after=' + last).next(function (buffers) {
			buffers.reverse();
			for (var i = 0, len = buffers.length; i < len; i++) {
				var buffer = buffers[i];
				last = buffer.created_at;

				if (bufferName[buffer.name]) {
					updateArea(bufferName[buffer.name], buffer);
					nextUpdate = bufferArea.indexOf(bufferName[buffer.name]) + 1;
				} else {
					var area = bufferArea[nextUpdate % 2];
					updateArea(area, buffer);
					nextUpdate = (nextUpdate + 1) % 2;
				}
			}
			return wait(1).next(update);

			function updateArea (area, buffer) {
				area.fadeOut('fast', function () {
					area.val(
						'### File: ' + buffer.name + "\n\n" +
						buffer.body
					);
				});
				bufferName[buffer.name] = area;
				area.fadeIn('fast');
				return area;
			}
		});
	}).
	error(function (e) {
		alert(e);
	});
});
