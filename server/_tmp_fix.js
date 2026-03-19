import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: 'postgres://ublfm8qk8lf0sa:p15554a38902dc7eff5195ec03a18d0a0ae47428c4b59fc1ba2df4d9ebe96bfdf@c427lq34qpebnl.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/da65f56ji8l4cq',
  ssl: { rejectUnauthorized: false },
});

const result = await pool.query(
  'UPDATE collections SET is_public = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING name, is_public',
  ['Gw7e_dor4my-zMW-3fHQ6']
);
console.log('Updated:', result.rows[0].name, '-> public:', result.rows[0].is_public);
await pool.end();
