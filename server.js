const express=require('express');
const path=require('path');
const Database=require('better-sqlite3');
const app=express();
const PORT=process.env.PORT||3000;
const db=new Database(process.env.DB_PATH||'solevault.db');
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS products(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 category TEXT NOT NULL,
 gender TEXT DEFAULT 'Unisex',
 price INTEGER NOT NULL,
 rating REAL DEFAULT 5,
 image TEXT NOT NULL,
 description TEXT DEFAULT '',
 stock INTEGER DEFAULT 0,
 sizes TEXT DEFAULT '6,7,8,9,10,11,12',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_name TEXT NOT NULL,
 email TEXT NOT NULL,
 phone TEXT,
 address TEXT NOT NULL,
 total INTEGER NOT NULL,
 status TEXT DEFAULT 'Pending',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id INTEGER NOT NULL,
 product_id INTEGER NOT NULL,
 size INTEGER NOT NULL,
 qty INTEGER NOT NULL,
 price INTEGER NOT NULL
);`);
try{db.exec("ALTER TABLE products ADD COLUMN gender TEXT DEFAULT 'Unisex'")}catch(e){}
const count=db.prepare('SELECT COUNT(*) n FROM products').get().n;
if(!count){
 const add=db.prepare('INSERT INTO products(name,category,gender,price,rating,image,description,stock,sizes) VALUES(?,?,?,?,?,?,?,?,?)');
 [
 ['Air Motion X1','Sneakers','Men',7999,4.9,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85','A bold everyday sneaker with responsive cushioning and a lightweight street-ready build.',25,'6,7,8,9,10,11,12'],
 ['Velocity Runner','Running','Unisex',6499,4.8,'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=85','Light, breathable and built for daily miles with a smooth, supportive ride.',30,'6,7,8,9,10,11,12'],
 ['Court Classic','Casual','Women',4999,4.7,'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=85','A clean low-top silhouette designed to work with almost everything.',20,'6,7,8,9,10,11'],
 ['Urban Trek','Boots','Men',8999,4.8,'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=900&q=85','Rugged traction meets a refined city profile.',15,'7,8,9,10,11,12'],
 ['Cloud Pace','Running','Women',7299,4.9,'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=85','Soft landings and a stable platform for everyday training.',18,'6,7,8,9,10,11,12'],
 ['Mono Street','Sneakers','Unisex',5599,4.6,'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=900&q=85','Minimal styling with maximum versatility.',22,'6,7,8,9,10,11'],
 ['Trail Force','Boots','Men',9499,4.9,'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=85','High-grip outsole and protective construction for weekends.',12,'7,8,9,10,11,12'],
 ['Daily Ease','Casual','Unisex',4299,4.7,'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85','Simple, comfortable and easy to style.',28,'6,7,8,9,10,11']
 ].forEach(x=>add.run(...x));
}
app.use(express.json({limit:'2mb'}));
app.use(express.static(path.join(__dirname,'public')));
app.get('/api/products',(req,res)=>{
 const {category,gender,search,sort}=req.query;let sql='SELECT * FROM products WHERE 1=1',params=[];
 if(category&&category!=='All'){sql+=' AND category=?';params.push(category)}
 if(gender&&gender!=='All'){sql+=' AND gender=?';params.push(gender)}
 if(search){sql+=' AND (name LIKE ? OR category LIKE ? OR gender LIKE ?)';params.push('%'+search+'%','%'+search+'%','%'+search+'%')}
 if(sort==='low')sql+=' ORDER BY price ASC';else if(sort==='high')sql+=' ORDER BY price DESC';else if(sort==='rating')sql+=' ORDER BY rating DESC';else sql+=' ORDER BY id DESC';
 res.json(db.prepare(sql).all(...params));
});
app.get('/api/products/:id',(req,res)=>{const p=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);p?res.json(p):res.status(404).json({error:'Product not found'})});
app.post('/api/products',(req,res)=>{const {name,category,gender='Unisex',price,rating=5,image,description='',stock=0,sizes='6,7,8,9,10,11,12'}=req.body;if(!name||!category||!price||!image)return res.status(400).json({error:'name, category, price and image are required'});const info=db.prepare('INSERT INTO products(name,category,gender,price,rating,image,description,stock,sizes) VALUES(?,?,?,?,?,?,?,?,?)').run(name,category,gender,Number(price),Number(rating),image,description,Number(stock),sizes);res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(info.lastInsertRowid))});
app.put('/api/products/:id',(req,res)=>{const old=db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);if(!old)return res.status(404).json({error:'Product not found'});const p={...old,...req.body};db.prepare('UPDATE products SET name=?,category=?,gender=?,price=?,rating=?,image=?,description=?,stock=?,sizes=? WHERE id=?').run(p.name,p.category,p.gender||'Unisex',Number(p.price),Number(p.rating),p.image,p.description,Number(p.stock),p.sizes,req.params.id);res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id))});
app.delete('/api/products/:id',(req,res)=>{const info=db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);info.changes?res.json({ok:true}):res.status(404).json({error:'Product not found'})});
app.post('/api/orders',(req,res)=>{const {customer_name,email,phone='',address,items}=req.body;if(!customer_name||!email||!address||!Array.isArray(items)||!items.length)return res.status(400).json({error:'Missing order information'});try{const orderId=db.transaction(()=>{let total=0;const resolved=[];for(const i of items){const p=db.prepare('SELECT * FROM products WHERE id=?').get(i.product_id);if(!p)throw new Error('Product not found');const qty=Number(i.qty);if(!Number.isInteger(qty)||qty<1)throw new Error('Invalid quantity');if(p.stock<qty)throw new Error(`Insufficient stock for ${p.name}`);total+=p.price*qty;resolved.push({p,i,qty})}const order=db.prepare('INSERT INTO orders(customer_name,email,phone,address,total) VALUES(?,?,?,?,?)').run(customer_name,email,phone,address,total);const addItem=db.prepare('INSERT INTO order_items(order_id,product_id,size,qty,price) VALUES(?,?,?,?,?)');for(const x of resolved){addItem.run(order.lastInsertRowid,x.p.id,Number(x.i.size),x.qty,x.p.price);db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(x.qty,x.p.id)}return order.lastInsertRowid})() ;res.status(201).json({order_id:orderId})}catch(e){res.status(400).json({error:e.message})}});
app.get('/api/orders',(req,res)=>res.json(db.prepare('SELECT o.*,COUNT(oi.id) item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id GROUP BY o.id ORDER BY o.id DESC').all()));
app.get('/api/orders/:id',(req,res)=>{const o=db.prepare('SELECT id,customer_name,email,total,status,created_at FROM orders WHERE id=? AND lower(email)=lower(?)').get(req.params.id,req.query.email||'');o?res.json(o):res.status(404).json({error:'Order not found. Check your order number and email.'})});
app.put('/api/orders/:id',(req,res)=>{const {status}=req.body;const allowed=['Pending','Confirmed','Shipped','Delivered','Cancelled'];if(!allowed.includes(status))return res.status(400).json({error:'Invalid status'});const info=db.prepare('UPDATE orders SET status=? WHERE id=?').run(status,req.params.id);info.changes?res.json({ok:true}):res.status(404).json({error:'Order not found'})});
app.get('/api/stats',(req,res)=>res.json({products:db.prepare('SELECT COUNT(*) n FROM products').get().n,lowStock:db.prepare('SELECT COUNT(*) n FROM products WHERE stock<=5').get().n,orders:db.prepare('SELECT COUNT(*) n FROM orders').get().n,revenue:db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='Cancelled'").get().n}));
app.get('/admin',(req,res)=>res.sendFile(path.join(__dirname,'public','admin.html')));
app.listen(PORT,()=>console.log(`SoleVault running at http://localhost:${PORT}`));