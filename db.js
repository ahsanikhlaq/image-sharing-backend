
const { Pool } = require('pg');

// Create a new pool of connections to the PostgreSQL database using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.message, err.stack);
    return;
  }
  console.log('Database connected successfully');
  release();
});

module.exports = pool;
