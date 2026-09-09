const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. Configure your Supabase PostgreSQL connection string before deployment.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const initDb = (async () => {
  if (!process.env.DATABASE_URL) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products(
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      gender TEXT DEFAULT 'Unisex',
      price INTEGER NOT NULL,
      rating REAL DEFAULT 5,
      image TEXT NOT NULL,
      description TEXT DEFAULT '',
      stock INTEGER DEFAULT 0,
      sizes TEXT DEFAULT '6,7,8,9,10,11,12',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders(
      id SERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      address TEXT NOT NULL,
      total INTEGER NOT NULL,
      status TEXT DEFAULT 'Pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items(
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      size INTEGER NOT NULL,
      qty INTEGER NOT NULL,
      price INTEGER NOT NULL
    );
  `);

  const count = await pool.query('SELECT COUNT(*)::int AS n FROM products');
  if (count.rows[0].n === 0) {
    const products = [
      ['Air Motion X1','Sneakers','Men',7999,4.9,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85','A bold everyday sneaker with responsive cushioning and a lightweight street-ready build.',25,'6,7,8,9,10,11,12'],
      ['Velocity Runner','Running','Unisex',6499,4.8,'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=85','Light, breathable and built for daily miles with a smooth, supportive ride.',30,'6,7,8,9,10,11,12'],
      ['Court Classic','Casual','Women',4999,4.7,'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=85','A clean low-top silhouette designed to work with almost everything.',20,'6,7,8,9,10,11'],
      ['Urban Trek','Boots','Men',8999,4.8,'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=900&q=85','Rugged traction meets a refined city profile.',15,'7,8,9,10,11,12'],
      ['Cloud Pace','Running','Women',7299,4.9,'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85','Soft landings and a stable platform for everyday training.',18,'6,7,8,9,10,11,12'],
      ['Mono Street','Sneakers','Unisex',5599,4.6,'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=900&q=85','Minimal styling with maximum versatility.',22,'6,7,8,9,10,11'],
      ['Trail Force','Boots','Men',9499,4.9,'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=85','High-grip outsole and protective construction for weekends.',12,'7,8,9,10,11,12'],
      ['Daily Ease','Casual','Unisex',4299,4.7,'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85','Simple, comfortable and easy to style.',28,'6,7,8,9,10,11']
    ];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const p of products) {
        await client.query(
          `INSERT INTO products(name,category,gender,price,rating,image,description,stock,sizes)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, p
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
})();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(async (req, res, next) => {
  try {
    await initDb;
    next();
  } catch (err) {
    console.error('Database initialization failed:', err);
    res.status(500).json({ error: 'Database initialization failed' });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 AS ok');
    res.json({ ok: result.rows[0].ok === 1, service: 'SoleVault', database: 'postgres', time: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ ok: false, service: 'SoleVault', error: 'Database unavailable' });
  }
});

app.get('/api/products', async (req, res) => {
  try {
    const { category, gender, search, sort } = req.query;
    const params = [];
    let sql = 'SELECT * FROM products WHERE 1=1';
    if (category && category !== 'All') { params.push(category); sql += ` AND category=$${params.length}`; }
    if (gender && gender !== 'All') { params.push(gender); sql += ` AND gender=$${params.length}`; }
    if (search) {
      params.push(`%${search}%`);
      const n = params.length;
      params.push(`%${search}%`);
      const c = params.length;
      params.push(`%${search}%`);
      const g = params.length;
      sql += ` AND (name ILIKE $${n} OR category ILIKE $${c} OR gender ILIKE $${g})`;
    }
    if (sort === 'low') sql += ' ORDER BY price ASC';
    else if (sort === 'high') sql += ' ORDER BY price DESC';
    else if (sort === 'rating') sql += ' ORDER BY rating DESC';
    else sql += ' ORDER BY id DESC';
    res.json((await pool.query(sql, params)).rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unable to load products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    result.rows[0] ? res.json(result.rows[0]) : res.status(404).json({ error: 'Product not found' });
  } catch (err) { res.status(500).json({ error: 'Unable to load product' }); }
});

function validateProduct(body) {
  const name = String(body.name || '').trim();
  const category = String(body.category || '').trim();
  const image = String(body.image || '').trim();
  const price = Number(body.price);
  const rating = Number(body.rating ?? 5);
  const stock = Number(body.stock ?? 0);
  if (!name || !category || !image || !Number.isFinite(price) || price <= 0) return 'Valid name, category, price and image are required';
  if (!Number.isFinite(rating) || rating < 0 || rating > 5) return 'Rating must be between 0 and 5';
  if (!Number.isInteger(stock) || stock < 0) return 'Stock must be a non-negative integer';
  return null;
}

app.post('/api/products', async (req, res) => {
  const error = validateProduct(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const p = req.body;
    const result = await pool.query(
      `INSERT INTO products(name,category,gender,price,rating,image,description,stock,sizes)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [String(p.name).trim(), String(p.category).trim(), p.gender || 'Unisex', Number(p.price), Number(p.rating ?? 5), String(p.image).trim(), String(p.description || ''), Number(p.stock ?? 0), String(p.sizes || '6,7,8,9,10,11,12')]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Unable to create product' }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const oldResult = await pool.query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!oldResult.rows[0]) return res.status(404).json({ error: 'Product not found' });
    const p = { ...oldResult.rows[0], ...req.body };
    const error = validateProduct(p);
    if (error) return res.status(400).json({ error });
    const result = await pool.query(
      `UPDATE products SET name=$1,category=$2,gender=$3,price=$4,rating=$5,image=$6,description=$7,stock=$8,sizes=$9 WHERE id=$10 RETURNING *`,
      [String(p.name).trim(), String(p.category).trim(), p.gender || 'Unisex', Number(p.price), Number(p.rating), String(p.image).trim(), String(p.description || ''), Number(p.stock), String(p.sizes || '6,7,8,9,10,11,12'), req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Unable to update product' }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
    result.rowCount ? res.json({ ok: true }) : res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    if (err.code === '23503') return res.status(409).json({ error: 'Product is referenced by an order and cannot be deleted' });
    res.status(500).json({ error: 'Unable to delete product' });
  }
});

app.post('/api/orders', async (req, res) => {
  const { customer_name, email, phone = '', address, items } = req.body;
  if (!String(customer_name || '').trim() || !String(email || '').trim() || !String(address || '').trim() || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Missing order information' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    const resolved = [];
    for (const i of items) {
      const result = await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE', [i.product_id]);
      const p = result.rows[0];
      if (!p) throw new Error('Product not found');
      const qty = Number(i.qty);
      const size = Number(i.size);
      if (!Number.isInteger(qty) || qty < 1) throw new Error('Invalid quantity');
      if (!Number.isInteger(size) || !String(p.sizes).split(',').map(Number).includes(size)) throw new Error(`Size ${i.size} is unavailable for ${p.name}`);
      if (p.stock < qty) throw new Error(`Insufficient stock for ${p.name}`);
      total += p.price * qty;
      resolved.push({ p, qty, size });
    }
    const order = await client.query(
      `INSERT INTO orders(customer_name,email,phone,address,total) VALUES($1,$2,$3,$4,$5) RETURNING id`,
      [String(customer_name).trim(), String(email).trim(), String(phone || '').trim(), String(address).trim(), total]
    );
    const orderId = order.rows[0].id;
    for (const x of resolved) {
      await client.query('INSERT INTO order_items(order_id,product_id,size,qty,price) VALUES($1,$2,$3,$4,$5)', [orderId, x.p.id, x.size, x.qty, x.p.price]);
      await client.query('UPDATE products SET stock=stock-$1 WHERE id=$2', [x.qty, x.p.id]);
    }
    await client.query('COMMIT');
    res.status(201).json({ order_id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally { client.release(); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`SELECT o.*,COUNT(oi.id)::int AS item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id GROUP BY o.id ORDER BY o.id DESC`);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Unable to load orders' }); }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT id,customer_name,email,total,status,created_at FROM orders WHERE id=$1 AND lower(email)=lower($2)', [req.params.id, req.query.email || '']);
    result.rows[0] ? res.json(result.rows[0]) : res.status(404).json({ error: 'Order not found. Check your order number and email.' });
  } catch (err) { res.status(500).json({ error: 'Unable to load order' }); }
});

app.put('/api/orders/:id', async (req, res) => {
  const allowed = ['Pending','Confirmed','Shipped','Delivered','Cancelled'];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await pool.query('UPDATE orders SET status=$1 WHERE id=$2', [req.body.status, req.params.id]);
    result.rowCount ? res.json({ ok: true }) : res.status(404).json({ error: 'Order not found' });
  } catch (err) { res.status(500).json({ error: 'Unable to update order' }); }
});

app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM products)::int AS products,
        (SELECT COUNT(*) FROM products WHERE stock<=5)::int AS "lowStock",
        (SELECT COUNT(*) FROM orders)::int AS orders,
        COALESCE((SELECT SUM(total) FROM orders WHERE status!='Cancelled'),0)::int AS revenue
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Unable to load stats' }); }
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

if (require.main === module) {
  initDb.then(() => app.listen(PORT, () => console.log(`SoleVault running at http://localhost:${PORT}`)))
    .catch(err => { console.error('Startup failed:', err); process.exit(1); });
}

module.exports = app;
