require('dotenv').config();
   const { Pool } = require('pg');

   console.log('DATABASE_URL:', process.env.DATABASE_URL);
   console.log('NODE_ENV:', process.env.NODE_ENV);
   console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

   const connectionString = process.env.DATABASE_URL.includes('?sslmode=')
     ? process.env.DATABASE_URL
     : `${process.env.DATABASE_URL}?sslmode=require`;

   const pool = new Pool({
     connectionString,
     ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
   });

   module.exports = pool;