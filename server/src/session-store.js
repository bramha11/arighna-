// Stores admin login sessions in MySQL (table "sessions"), using the server's own pool.
const session = require("express-session");

class MySQLSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
    this.ready = pool.query(
      `CREATE TABLE IF NOT EXISTS sessions (
         sid     VARCHAR(128) NOT NULL PRIMARY KEY,
         expires BIGINT UNSIGNED NOT NULL,
         data    MEDIUMTEXT NOT NULL,
         INDEX idx_sessions_expires (expires)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    // remove expired sessions every 15 minutes
    setInterval(() => { this.pool.query("DELETE FROM sessions WHERE expires < ?", [Date.now()]).catch(() => {}); }, 15 * 60 * 1000).unref();
  }
  expiry(sess) {
    return sess && sess.cookie && sess.cookie.expires ? new Date(sess.cookie.expires).getTime() : Date.now() + 8 * 3600 * 1000;
  }
  get(sid, cb) {
    this.ready.then(() => this.pool.query("SELECT data, expires FROM sessions WHERE sid = ?", [sid]))
      .then(([rows]) => {
        if (!rows.length || rows[0].expires < Date.now()) return cb(null, null);
        cb(null, JSON.parse(rows[0].data));
      }).catch(cb);
  }
  set(sid, sess, cb) {
    this.ready.then(() => this.pool.query(
      "INSERT INTO sessions (sid, expires, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)",
      [sid, this.expiry(sess), JSON.stringify(sess)]))
      .then(() => cb && cb(null)).catch((e) => cb && cb(e));
  }
  touch(sid, sess, cb) {
    this.ready.then(() => this.pool.query("UPDATE sessions SET expires = ? WHERE sid = ?", [this.expiry(sess), sid]))
      .then(() => cb && cb(null)).catch((e) => cb && cb(e));
  }
  destroy(sid, cb) {
    this.ready.then(() => this.pool.query("DELETE FROM sessions WHERE sid = ?", [sid]))
      .then(() => cb && cb(null)).catch((e) => cb && cb(e));
  }
}

module.exports = MySQLSessionStore;
