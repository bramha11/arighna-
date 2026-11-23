// MySQL connection pool shared by the whole server.
const mysql = require("mysql2/promise");
const { config } = require("./config");

const pool = mysql.createPool({
  ...config.db,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
  dateStrings: true,
});

module.exports = pool;
