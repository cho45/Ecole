
CREATE TABLE `session` (
	id INTEGER PRIMARY KEY,
	name TEXT,
	created_at DATETIME NOT NULL
);
CREATE INDEX session_created_at ON `session` (created_at);

CREATE TABLE buffer (
	id INTEGER PRIMARY KEY,
	session_id INTEGER,
	name TEXT,
	body TEXT,
	created_at DATETIME NOT NULL,
);
CREATE INDEX buffer_created_at ON buffer (created_at);


