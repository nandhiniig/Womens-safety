// server.js
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const PORT = 3000;

// ---------------- MIDDLEWARE ----------------
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // serve files from current folder

// ---------------- DATABASE CONNECTION ----------------
const db = mysql.createConnection({
  host: "localhost",
  user: "root",          // your MySQL username
  password: "Pragyan",   // your MySQL password
  database: "womensafety"
});

db.connect((err) => {
  if (err) throw err;
  console.log("✅ Connected to MySQL Database");
});

// ---------------- TABLE CREATION ----------------
db.query(`
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  firstname VARCHAR(100),
  lastname VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255)
)`);

db.query(`
CREATE TABLE IF NOT EXISTS contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  name VARCHAR(100),
  phone VARCHAR(15),
  FOREIGN KEY (user_id) REFERENCES users(id)
)`);

db.query(`
CREATE TABLE IF NOT EXISTS alerts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  address TEXT,
  ts BIGINT NOT NULL
)`);

// ---------------- ROUTES ----------------

// Serve login page as default
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

// ---- REGISTER ----
app.post("/register", async (req, res) => {
  const { firstname, lastname, email, password } = req.body;
  if (!firstname || !lastname || !email || !password)
    return res.status(400).send("All fields are required");

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (firstname, lastname, email, password) VALUES (?, ?, ?, ?)",
      [firstname, lastname, email, hashedPassword],
      (err, result) => {
        if (err) {
          console.error("❌ Registration error:", err);
          return res.status(400).send("Email already registered or invalid data");
        }

        const newUserId = result.insertId;
        console.log(`✅ User registered: ${firstname} (ID: ${newUserId})`);

        // Redirect to contacts.html with user_id in URL
        res.redirect(`/contacts.html?user_id=${newUserId}`);
      }
    );
  } catch (err) {
    console.error("❌ Hashing error:", err);
    res.status(500).send("Server error during registration");
  }
});

// ---- LOGIN ----
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).send("Missing email or password");

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).send("Database error");
    if (results.length === 0) return res.status(400).send("No user found");

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).send("Invalid credentials");

    console.log(`✅ User logged in: ${user.firstname}`);
    res.redirect(`/contacts.html?user_id=${user.id}`);
  });
});

// ---- SAVE CONTACTS ----
app.post("/save-contacts", (req, res) => {
  const { user_id, contacts } = req.body;
  if (!user_id || !contacts || !Array.isArray(contacts))
    return res.status(400).send("Invalid data format");

  // Delete previous contacts
  db.query("DELETE FROM contacts WHERE user_id = ?", [user_id], (err) => {
    if (err) return res.status(500).send("Error clearing old contacts");

    if (contacts.length === 0) return res.send("No contacts to save");

    // Insert new contacts
    const values = contacts.map(c => [user_id, c.name, c.phone]);
    db.query(
      "INSERT INTO contacts (user_id, name, phone) VALUES ?",
      [values],
      (err) => {
        if (err) return res.status(500).send("Error saving contacts");
        console.log(`✅ Saved ${contacts.length} contacts for user ${user_id}`);
        res.send("Contacts saved successfully!");
      }
    );
  });
});

// ---- SAVE ALERTS ----
app.post("/alerts", (req, res) => {
  let { latitude, longitude, address } = req.body;
  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);
  if (isNaN(latitude) || isNaN(longitude))
    return res.status(400).json({ ok: false, error: 'Invalid lat/lng' });

  const ts = Date.now();
  db.query(
    "INSERT INTO alerts (latitude, longitude, address, ts) VALUES (?, ?, ?, ?)",
    [latitude, longitude, address || null, ts],
    (err, result) => {
      if (err) return res.status(500).json({ ok: false, error: "DB error" });
      res.json({ ok: true, id: result.insertId, ts });
    }
  );
});

// ---- ADMIN VIEW ----
app.get("/admin", (req, res) => {
  db.query("SELECT * FROM alerts ORDER BY ts DESC LIMIT 500", (err, rows) => {
    if (err) return res.status(500).send("DB read error");

    const rowsHtml = rows.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.latitude}</td>
        <td>${r.longitude}</td>
        <td>${r.address ? r.address.replace(/</g,'&lt;') : ''}</td>
        <td>${new Date(r.ts).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <title>Admin — Alerts</title>
          <style>
            body { font-family: Arial; padding: 24px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border:1px solid #ddd; padding: 8px; }
            th { background: #f4f4f4; }
            tr:nth-child(even) { background: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Saved Alerts</h1>
          <p><a href="/">Back to site</a></p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;
    res.send(html);
  });
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
