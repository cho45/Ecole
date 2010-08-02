Deferred.define();
DMP = new diff_match_patch();

Ecole = {};
Ecole.API_BASE = '';
Ecole.get = function (path) {
	return $.getJSON(Ecole.API_BASE + path);
};

Ecole.BufferArea = function () { this.init.apply(this, arguments) };
Ecole.BufferArea.prototype = {
	init : function (container) {
		this.$container = $(container);
		this.$pre       = this.$container.find('pre');
		this.$info      = this.$container.find('.info');
		this.$container.data('highlighter', new Ecole.SyntaxHighlighter(this.$pre[0]));
		this.buffer     = null;
	},

	update : function (buffer) {
		var self = this;
		var diffs = (self.buffer && self.buffer.name == buffer.name) ? DMP.diff_main(self.buffer.body, buffer.body) : null;
		self.buffer = buffer;
		self.$container.fadeOut('fast', function () {
			self.$info.text('File: ' + buffer.name + ' ');
			if (diffs) {
				var formatted = self.formatDiff(diffs);
				var changes = formatted.changes;
				for (var i = 0, len = changes.length; i < len; i++) (function (change) {
					$('<a class="change">L:' + change + '</a> ').click(function () {
						self.$pre.scrollTop(change * 12);
					}).appendTo(self.$info);
				})(changes[i]);
				self.$pre.html(formatted.html);
			} else {
				self.$pre.text(buffer.body);
			}
			// self.$container.data('highlighter').highlight();
		});
		self.$container.fadeIn('fast');
	},

	formatDiff : function (diffs) {
		var DIFF_DELETE = -1;
		var DIFF_INSERT = 1;
		var DIFF_EQUAL  = 0;

		var changes = [ 0 ];
		var ret     = [];
		var line    = 1;
		for (var i = 0, len = diffs.length; i < len; i++) {
			var op = diffs[i][0];
			var dt = diffs[i][1].replace(/[&<>]/g, function (_) { return {'&':'&amp;','<':'&lt;','>':'&gt;'}[_] });
			switch (op) {
				case DIFF_INSERT:
					if (line > changes[changes.length-1]) changes.push(line);
					ret.push('<ins>', dt, '</ins>');
					break;
				case DIFF_DELETE:
					if (line > changes[changes.length-1]) changes.push(line);
					ret.push('<del>', dt, '</del>');
					break;
				case DIFF_EQUAL:
					ret.push(dt);
					break;
			}
			diffs[i][1].replace(/\n/g, function (_) { line++; return _ });
		}
		
		changes.shift();

		return {
			changes : changes,
			html : ret.join('')
		};
	}
};

Ecole.BufferUpdater = {
	buffers    : [],
	names      : {},
	nextUpdate : 0,
	lastUpdate : 0,

	start : function () {
		this.buffers.push(new Ecole.BufferArea(document.getElementById('buffer1')));
		this.buffers.push(new Ecole.BufferArea(document.getElementById('buffer2')));
		return this.update();
	},
	
	update : function () {
		var self = this;
		return Ecole.get('/api/buffer?after=' + self.lastUpdate).next(function (buffers) {
			buffers.reverse();
			for (var i = 0, len = buffers.length; i < len; i++) {
				var buffer = buffers[i];
				self.lastUpdate = buffer.created_at;

				var area;
				if (self.names[buffer.name]) {
					area = self.names[buffer.name];
					self.nextUpdate = self.buffers.indexOf(self.names[buffer.name]) + 1;
				} else {
					area = self.buffers[self.nextUpdate % self.buffers.length];
					self.nextUpdate = (self.nextUpdate + 1) % 2;
				}
				area.update(buffer);
				self.names[buffer.name] = area;
			}
			return wait(2).next(function () { self.update() });
		});
	}
};

Ecole.SyntaxHighlighter = function () { this.init.apply(this, arguments) };
Ecole.SyntaxHighlighter.StringScanner = function () { this.init.apply(this, arguments) };
Ecole.SyntaxHighlighter.StringScanner.prototype = {
	init : function (str) {
		this.pos = 0;
		this.string = str;
		this.matched = false;
		this.eos = false;
		this.length = str.length;
		this.check_eos();
	},

	scan: function (regexp) {
		if (this.eos) return null;
		var m = regexp.exec(this.string.substring(this.pos));
		if (m && m.index == 0) {
			this.pos += m[0].length;
			this.matched = true;
			this.check_eos();
			return m[0];
		} else {
			this.matched = false;
			this.check_eos();
			return null;
		}
	},

	getChr: function () {
		if (this.eos) return null;
		this.pos += 1;
		this.check_eos();
		return this.string.charAt(this.pos-1);
	},

	check_eos: function () {
		if (this.length == this.pos) {
			this.eos = true;
		} else {
			this.eos = false;
		}
		return this.eos;
	}
};

Ecole.SyntaxHighlighter.SYNTAX = {
	javascript : [
		["COMMENT", /\/\/[^\r\n]*|\/\*[^*]*\*+([^\/][^*]*\*+)*\/|/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/[a-z]*|/],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?\b/],
		["KEYWORD", /(break|case|catch|continue|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|this|throw|try|typeof|var|void|while|with|abstract|boolean|byte|char|class|const|debugger|double|enum|export|extends|final|float|goto|implements|import|int|interface|long|native|package|private|protected|public|short|static|super|synchronized|throws|transient|volatile|null|true|false)\b/],
		["IDENTIFER", /[a-z$_][a-z0-9_]*\b/i]
	],

	ruby : [
		["STRING", /<<-?([`\"\'])?([a-z0-9_]+)\1(.|\n|\r)*?(\n|\r)\s*\2/i],
		["STRING", /%[QqxrwWs]?<(<.*?>|\\\\|\\>|[^>]|\n|\r)*>/],
		["STRING", /%[QqxrwWs]?\{(\{.*?\}|\\\\|\\\}|[^\}]|\n|\r)*\}/],
		["STRING", /%[QqxrwWs]?\[(\[.*?\]|\\\\|\\\]|[^\]]|\n|\r)*\]/],
		["STRING", /%[QqxrwWs]?\((\(.*?\)|\\\\|\\\)|[^\)]|\n|\r)*\)/],
		["STRING", /%[QqxrwWs]?([^A-Za-z0-9 ])(\\\\|\\\1|[^\1]|\n|\r)*?\1/i],
		["COMMENT", /=begin(.|\r|\n)+(\r|\n)=end/],
		["OPERATOR", /\||\^|&|<=>|>=|<=|===|==|=~|=|\+|-|%|\*\*|\*|<<|>>|>|<|~|::|\s\/\s/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|`(\\\\|\\\`|[^\`])*`|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/[imxoesum]*|/],
		["COMMENT", /#[^\r\n]*/],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?|0[bodx][0-9a-f]+|\?([a-z]|\\[MC]-[a-z]|\\M-\\C-[a-z])/],
		["KEYWORD", /(BEGIN|class|ensure|nil|self|when|END|def|false|not|super|while|alias|defined\?|for|or|then|yield|and|do|if|redo|true|begin|else|in|rescue|undef|break|elsif|module|retry|unless|case|end|next|return|until)\b/],
		["SYMBOL", /:("(\\\"|[^\"])*"|'(\\\'|[^\'])*'|(@|@@|\$)?[A-Za-z_][A-Za-z0-9_]*[!\?]?|[^\s;]+)/],
		["SPECIAL_VARIABLE", /(@|@@|\$)[A-Za-z_][A-Za-z0-9_]*|\$[0-9_&~`\'+?!@=\/\\,;.<>*$:\"]|__FILE__|__LINE__/],
		["CONSTANT", /[A-Z][A-Za-z0-9_]*\b/],
		["IDENTIFER", /[a-z_][a-z0-9_]*\b/i]
		],

	lisp : [
		["COMMENT", /;[^\r\n]*|/],
		["LITERAL", /#\\([a-z]+|.)|#x[a-f0-9]{2}/i],
		["STRING", /"(\\\\|\\\"|[^\"])*"/],
		["IDENTIFER", /[a-z0-9_\*\<>=+-]+/i]
		],

	xml : [
		["COMMENT", /<!--(?:(?!-->)(?:.|\r|\n))*-->/],
		["CDATA", /<!\[CDATA\[(?:(?!\]\]>)(?:.|\r|\n))*\]\]>/m],
		["TAG", /<[a-z][a-z0-9:_-]*|<\/[a-z][a-z0-9:_-]*>|\/?>/],
		["PI", /<\?[a-z][a-z0-9:_-]*|\?>/],
		["DTD", /<![^<]+/],
		["ATTRIBUTE_VAL", /"[^\">]*"|'[^\'>]*'/],
		["ATTRIBUTE_NAME", /\s+[a-z][a-z0-9:_-]*=/],
		["OTHER", /[^<>\s]+/i]
		],

	xpath : [
		["VARIABLE", /\$[a-z0-9_]+/i],
		["OPERATOR", /mod|div|or|and|!=|<=|>=|<|>|=|\|\/|\+|-/],
		["NODETEST", /processing-instruction\(("[^\"]*"|'[^\']*')\)|(node|text|comment)\(\)|([a-zA-Z0-9]+:)?\*\b/],
		["AXIS", /(ancestor|ancestor-or-self|attribute|child|descendant|descendant-or-self|following|following-sibling|namespace|parent|preceding|preceding-sibling|self|)::|@|\.|\.\./],
		["FUNCTION", /[a-z-_0-9]+\(|\)/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'/],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?\b/],
		["QName", /([a-z-_]+:)?[a-z][a-z0-9_]*|/i]
		],

	css : [
		["COMMENT", /\/\*[^*]*\*+([^\/][^*]*\*+)*\/|/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/|/],
		["AT_KEYWORD", /@[a-z][a-z0-9]*|/i],
		["IMPORTANT", /!\s*important\b/],
		["COLOR", /#[a-f0-9]{6}|#[a-f0-9]{3}/i],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?([a-z]+|%)?/i],
		["IDENTIFER", /[a-z][a-z0-9_]*\b/i]
		],

	php : [
		["COMMENT", /#[^\r\n]*|\/\/[^\r\n]*|\/\*[^*]*\*+([^\/][^*]*\*+)*\/|/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/|/],
		["VARIABLE", /\$[a-z0-9_]+/i],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?\b/],
		["KEYWORD", /(and|or|xor|__FILE__|exception|php_user_filter|__LINE__|array|as|break|case|cfunction|class|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|eval|exit|extends|for|foreach|function|global|if|include|include_once|isset|list|new|old_function|print|require|require_once|return|static|switch|unset|use|var|while|__FUNCTION__|__CLASS__|__METHOD__)\b/],
		["IDENTIFER", /[a-z][a-z0-9_]*\b/i]
		],

	io : [
		["COMMENT", /#[^\r\n]*|\/\/[^\r\n]*|\/\*[^*]*\*+([^\/][^*]*\*+)*\/|/],
		["STRING", /"""((?!""\")(?:.|\r|\n))*"""|"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/\b/],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?\b/],
		["KEYWORD", /(return|try|catch|pass|if|then|elseif|else|while|for|break|continue)\b/],
		["SPECIAL_VARIABLE", /(self|proto|sender|thisBlock|thisMessage|activate|method|block)\b/],
		["IDENTIFER", /[a-z][a-z0-9_]*\b/i]
		],

	perl : [
		["STRING", /<<-?([`\"\'])?([a-z0-9_]+)\1(.|\n|\r)*?(\n|\r)\s*\2/i],
		["COMMENT", /#[^\r\n]*|/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|`(\\\\|\\\`|[^\`])*`|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/[a-z]*\b/],
		["STRING", /(?:q|qq|qx|qw|m|s|tr|y)\s*\{((\{.*?\}|[^\r\n])*?\}){1,2}[a-z]*\b/i],
		["STRING", /(?:q|qq|qx|qw|m|s|tr|y)\s*\(((\(.*?\)|[^\r\n])*?\)){1,2}[a-z]*\b/i],
		["STRING", /(?:q|qq|qx|qw|m|s|tr|y)\s*\[((\[.*?\]|[^\r\n])*?\]){1,2}[a-z]*\b/i],
		["STRING", /(?:q|qq|qx|qw|m|s|tr|y)\s*([^a-z0-9\s])((\\\\|\\\1|[^\1\r\n])*?\1){1,2}[a-z]*\b/i],
		["VARIABLE", /(?:\$#?|@|%)[a-z0-9_]+/i],
		["KEYWORD", /(lt|gt|le|ge|eq|ne|cmp|not|and|or|xor|if|else|elsif|while|for|foreach|continue|abs|accept|alarm|atan2|bind|binmode|bless|caller|chdir|chmod|chomp|chop|chown|chr|chroot|close|closedir|connect|cos|crypt|dbmclose|dbmopen|defined|delete|die|do|dump|each|eof|eval|exec|exists|exit|exp|fcntl|fileno|flock|fork|formline|getc|getlogin|getpeername|getpgrp|getppid|getpriority|getpwnam|getgrnam|gethostbyname|getnetbyname|getprotobyname|getpwuid|getgrgid|getservbyname|gethostbyaddr|getnetbyaddr|getprotobynumber|getservbyport|getpwent|getgrent|gethostent|getnetent|getprotoent|getservent|setpwent|setgrent|sethostent|setnetent|setprotoent|setservent|endpwent|endgrent|endhostent|endnetent|endprotoent|endservent|getsockname|getsockopt|glob|gmtime|goto|grep|hex|import|index|int|ioctl|join|keys|kill|last|lc|lcfirst|length|link|listen|local|localtime|log|lstat|map|mkdir|msgctl|msgget|msgrcv|msgsnd|my|next|no|oct|open|opendir|ord|pack|pipe|pop|pos|print|printf|push|quotemeta|rand|read|readdir|readlink|recv|redo|ref|rename|require|reset|return|reverse|rewinddir|rindex|rmdir|scalar|seek|seekdir|select|semctl|semget|semop|send|setpgrp|setpriority|setsockopt|shift|shmctl|shmget|shmread|shmwrite|shutdown|sin|sleep|socket|socketpair|sort|splice|split|sprintf|sqrt|srand|stat|study|substr|symlink|syscall|sysread|system|syswrite|tell|telldir|tie|time|times|truncate|uc|ucfirst|umask|undef|unless|unlink|unpack|untie|unshift|use|utime|values|vec|wait|waitpid|wantarray|warn|write|sub)\b/],
		["SPECIAL_VARIABLE", /\$[0-9_&~`\'+?!@=\/\\,;.<>*$:\"]|<.*?>/],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?\b/],
		["IDENTIFER", /[a-z][a-z0-9_]*\b/i]
		],
	sh : [
		["VARIABLE", /\$[a-z0-9_]+/i],
		["COMMENT", /#[^\r\n]*|/],
		["STRING", /`(\\\\|\\\`|[^\`])*`|"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'/],
		["KEYWORD", /\b(for|while|do|until|select|if|then|else|case|switch|fi|esac|done|alias|continue|break|eval|test|export|in)\b/],
		["IDENTIFER", /[a-z][a-z0-9_]*\b/i]
	],
	fallback : [
		["COMMENT", /#[^\r\n]*|\/\/[^\r\n]*|\/\*[^*]*\*+([^\/][^*]*\*+)*\/|/],
		["STRING", /"(\\\\|\\\"|[^\"])*"|'(\\\\|\\\'|[^\'])*'|\/(\\\\|\\\/|[^\/])*\/|/],
		["NUMBER", /[+-]?[0-9]+?(\.[0-9]+)?\b/],
		["IDENTIFER", /[a-z][a-z0-9_]*\b/i]
	]
};
Ecole.SyntaxHighlighter.prototype = {
	init : function (element) {
		this.element = element;
	},

	highlight : function () {
		var target = this.element;
		if (target.childNodes.length != 1) return;

		var code = target.childNodes[0].nodeValue;

		var filetype = this.filetype();
		var syntax = Ecole.SyntaxHighlighter.SYNTAX[filetype] || Ecole.SyntaxHighlighter.SYNTAX.fallback;

		var ret    = document.createDocumentFragment();
		var s      = new Ecole.SyntaxHighlighter.StringScanner(code);
		var othertoken = [];
		var str;
		while (!s.eos) {
			for (var i = 0, len = syntax.length; i < len; i++) {
				if (str = s.scan(syntax[i][1])) {
					ret.appendChild(document.createTextNode(othertoken.join("")));
					othertoken = [];
					node = document.createElement("span");
					node.className = syntax[i][0].toLowerCase();
					node.appendChild(document.createTextNode(str));
					ret.appendChild(node);
					break;
				}
			}
			if (!s.matched) othertoken.push(s.getChr());
		}
		ret.appendChild(document.createTextNode(othertoken.join("")));
		target.replaceChild(ret, target.childNodes[0]);
	},

	filetype : function () {
		var target = this.element;
		var m = target.className.match(/lang-([^\s]+)/);
		if (m) return m[1].toLowerCase();
		var code = target.childNodes[0].nodeValue;
		if (code.indexOf('var ') != -1) {
			return 'javascript';
		} else
		if (code.indexOf('position') != -1) {
			return 'css';
		} else
		if (code.indexOf('<html') != -1) {
			return 'html';
		}
		return 'fallback';
	}
};

$(function () {
	Ecole.BufferUpdater.start().
	error(function (e) {
		alert(e);
	});
});

