const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function getSchema(config) {
  const poolConfig = config || {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  };

  // Ensure host is valid
  if (poolConfig.host === 'localhost') {
    poolConfig.host = '127.0.0.1';
  }
  
  console.log(`Attempting to connect to ${poolConfig.host}:${poolConfig.port}/${poolConfig.database} as user ${poolConfig.user}`);
  
  const tempPool = new Pool(poolConfig);
  let client;
  try {
    client = await tempPool.connect();
    console.log('Successfully connected to database');
    // ...
    // 1. Fetch tables and columns
    const columnsQuery = `
      SELECT 
          col.table_schema, 
          col.table_name, 
          col.ordinal_position AS column_id, 
          col.column_name, 
          col.data_type,
          col.is_nullable,
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM information_schema.key_column_usage kcu
              JOIN information_schema.table_constraints tco 
                ON kcu.constraint_name = tco.constraint_name 
                AND kcu.table_schema = tco.table_schema
              WHERE kcu.table_name = col.table_name 
                AND kcu.column_name = col.column_name 
                AND tco.constraint_type = 'PRIMARY KEY'
            ) THEN 'PK'
            ELSE NULL 
          END AS constraint_type
      FROM 
          information_schema.columns col
      WHERE 
          col.table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY 
          col.table_schema, col.table_name, column_id;
    `;

    // 2. Fetch foreign keys
    const fksQuery = `
      SELECT
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name 
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
      WHERE 
          tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema NOT IN ('information_schema', 'pg_catalog');
    `;

    const columnsRes = await client.query(columnsQuery);
    const fksRes = await client.query(fksQuery);

    return {
      columns: columnsRes.rows,
      foreignKeys: fksRes.rows,
    };
  } catch (err) {
    console.error('Error in getSchema:', err.message);
    throw err;
  } finally {
    if (client) client.release();
    await tempPool.end();
  }
}

async function testConnection(config) {
  if (config.host === 'localhost') {
    config.host = '127.0.0.1';
  }
  const testPool = new Pool(config);
  try {
    const res = await testPool.query('SELECT NOW()');
    return { success: true, time: res.rows[0].now };
  } catch (err) {
    console.error('Test connection error:', err.message);
    return { success: false, error: err.message };
  } finally {
    await testPool.end();
  }
}

module.exports = { getSchema, testConnection };
