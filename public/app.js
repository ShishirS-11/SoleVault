const $ = id => document.getElementById(id);
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN');

let products = [];
let filter = 'All';
let selected = null;
let selectedSize = 9;
let cart = JSON.parse(localStorage.getItem('sv-cart') || '[]');
let wish = JSON.parse(localStorage.getItem('sv-wish') || '[]');
let compare = JSON.parse(localStorage.getItem('sv-compare') || '[]');
let orders = JSON.parse(localStorage.getItem('sv-orders') || '[]');
let member = JSON.parse(localStorage.getItem('sv-member') || 'null');

const demo = [
  ['Air Motion X1','Sneakers',7999,4.9,25,'6,7,8,9,10,11,12','https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=90','Responsive cushioning and a lightweight street-ready build.'],
  ['Velocity Runner','Running',6499,4.8,30,'6,7,8,9,10,11,12','https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=90','Light, breathable and built for daily miles.'],
  ['Court Classic','Casual',4999,4.7,20,'6,7,8,9,10,11','https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1000&q=90','A clean low-top silhouette for almost everything.'],
  ['Urban Trek','Boots',8999,4.8,15,'7,8,9,10,11,12','https://images.unsplash.com/photo-1520639888713-7851133b1ed0?auto=format&fit=crop&w=1000&q=90','Rugged traction with a refined city profile.'],
  ['Cloud Pace','Running',7299,4.9,18,'6,7,8,9,10,11,12','https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=1000&q=90','Soft landings and a stable training platform.'],
  ['Mono Street','Sneakers',5599,4.6,22,'6,7,8,9,10,11','https://images.unsplash.com/photo-1600269452121-4f2416e55c28?auto=format&fit=crop&w=1000&q=90','Minimal styling with maximum versatility.'],
  ['Trail Force','Boots',9499,4.9,12,'7,8,9,10,11,12','https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1000&q=90','High-grip outsole and protective construction.'],
  ['Daily Ease','Casual',4299,4.7,28,'6,7,8,9,10,11','https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=90','Simple, comfortable and easy to style.'],
  ['Aero Pulse','Running',8499,4.9,14,'6,7,8,9,10,11,12','https://images.unsplash.com/photo-1551107696-a4b0c5a0d9a2?auto=format&fit=crop&w=1000&q=90','A springy training shoe with a fast energetic feel.'],
  ['Studio Low','Sneakers',6799,4.8,19,'6,7,8,9,10,11','https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1000&q=90','Clean lines and all-day city comfort.'],
  ['Summit Hiker','Boots',10999,4.9,9,'7,8,9,10,11,12','https://images.unsplash.com/photo-1542840843-3349799ade7b?auto=format&fit=crop&w=1000&q=90','Confident grip and weather-ready construction.'],
  ['Canvas Day','Casual',3899,4.5,32,'6,7,8,9,10,11','https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=1000&q=90','Relaxed everyday comfort with a timeless profile.']
].map((x,i) => ({id:i+1,name:x[0],category:x[1],price:x[2],rating:x[3],stock:x[4],sizes:x[5],image:x[6],description:x[7]}));

function save(){
  localStorage.setItem('sv-cart',JSON.stringify(cart));
  localStorage.setItem('sv-wish',JSON.stringify(wish));
  localStorage.setItem('sv-compare',JSON.stringify(compare));
  localStorage.setItem('sv-orders',JSON.stringify(orders));
  localStorage.setItem('sv-member',JSON.stringify(member));
  updateCounts();
}

function updateCounts(){
  if($('bagCount')) $('bagCount').textContent = cart.reduce((a,x)=>a+x.qty,0) || '';
  if($('wishCount')) $('wishCount').textContent = wish.length || '';
  if($('compareCount')) $('compareCount').textContent = compare.length || '';
}

function toast(text){
  if(!$('toast')) return;
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(window.svToast);
  window.svToast = setTimeout(()=>$('toast').classList.remove('show'),1800);
}

async function load(){
  try{
    const response = await fetch('/api/products?category=All', {cache:'no-store'});
    if(response.ok){
      const data = await response.json();
      if(Array.isArray(data) && data.length) products = data;
    }
  }catch(error){
    console.info('Using local demo catalogue:', error.message);
  }
  if(!products.length) products = demo;
  render();
}

function getList(){
  let list = [...products];
  const checkedCats = [...document.querySelectorAll('.cat-filter:checked')].map(x=>x.value);
  if(checkedCats.length) list = list.filter(p=>checkedCats.includes(p.category));
  else if(filter !== 'All') list = list.filter(p=>p.category === filter);

  const price = document.querySelector('input[name="price"]:checked')?.value || 'all';
  if(price === 'under5000') list = list.filter(p=>p.price < 5000);
  if(price === '5000to8000') list = list.filter(p=>p.price >= 5000 && p.price <= 8000);
  if(price === 'over8000') list = list.filter(p=>p.price > 8000);

  const size = $('sizeFilter')?.dataset.value || 'all';
  if(size !== 'all') list = list.filter(p=>String(p.sizes || '').split(',').includes(String(size)));

  const query = ($('searchInput')?.value || '').trim().toLowerCase();
  if(query) list = list.filter(p=>(p.name+' '+p.category+' '+p.description).toLowerCase().includes(query));

  const sort = $('sort')?.value || 'featured';
  if(sort === 'low') list.sort((a,b)=>a.price-b.price);
  if(sort === 'high') list.sort((a,b)=>b.price-a.price);
  if(sort === 'rating') list.sort((a,b)=>b.rating-a.rating);
  if(sort === 'newest') list.sort((a,b)=>b.id-a.id);
  return list;
}

function render(){
  const list = getList();
  if($('resultCount')) $('resultCount').textContent = list.length + ' products';
  if(!$('products')) return;

  $('products').innerHTML = list.length ? list.map(p=>{
    const liked = wish.includes(p.id);
    const compared = compare.includes(p.id);
    return `<article class="card">
      <div class="pic" data-id="${p.id}">
        <button class="heart ${liked?'liked':''}" data-wish="${p.id}" aria-label="Wishlist">${liked?'♥':'♡'}</button>
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="image-hint">QUICK VIEW</span>
      </div>
      <div class="info">
        <small>${p.category}</small>
        <h3>${p.name}</h3>
        <div class="card-price"><b>${money(p.price)}</b><span>★ ${p.rating}</span></div>
        <div class="card-actions">
          <button class="quick-add" data-view="${p.id}">ADD TO BAG</button>
          <button class="compare-card ${compared?'active':''}" data-compare="${p.id}">${compared?'✓ COMPARE':'COMPARE'}</button>
        </div>
      </div>
    </article>`;
  }).join('') : '<div class="no-results">No pairs found. <button id="noResultsClear">CLEAR FILTERS</button></div>';
  updateCounts();
}

function openProduct(id){
  selected = products.find(p=>Number(p.id) === Number(id));
  if(!selected) return;
  selectedSize = Number(String(selected.sizes || '9').split(',')[0]);
  if($('mimg')) {$('mimg').src=selected.image; $('mimg').alt=selected.name;}
  if($('mcat')) $('mcat').textContent=selected.category;
  if($('mname')) $('mname').textContent=selected.name;
  if($('mrate')) $('mrate').textContent=`★★★★★  ${selected.rating} · Member favourite`;
  if($('mprice')) $('mprice').textContent=money(selected.price);
  if($('mdesc')) $('mdesc').textContent=selected.description;
  if($('stockNote')) $('stockNote').textContent=selected.stock < 11 ? `Only ${selected.stock} left — popular pair.` : 'In stock · Free delivery over ₹2,999';
  if($('sizes')) $('sizes').innerHTML=String(selected.sizes || '6,7,8,9,10,11,12').split(',').map(s=>`<button class="size ${Number(s)===selectedSize?'selected':''}" data-size="${s}">${s}</button>`).join('');
  if($('thumbs')) $('thumbs').innerHTML=`<img src="${selected.image}" alt="${selected.name}">`;
  if($('pmHeart')) $('pmHeart').textContent=wish.includes(Number(selected.id))?'♥':'♡';
  if($('productModal')) {$('productModal').classList.add('open');document.body.classList.add('locked');}
}

function toggleWish(id){
  id=Number(id);
  wish = wish.includes(id) ? wish.filter(x=>x!==id) : [...wish,id];
  save();
  render();
  if(selected && Number(selected.id)===id && $('pmHeart')) $('pmHeart').textContent=wish.includes(id)?'♥':'♡';
  toast(wish.includes(id)?'Saved to wishlist':'Removed from wishlist');
}

function addToCart(close=true){
  if(!selected) return;
  const id=Number(selected.id);
  const existing=cart.find(x=>Number(x.id)===id && Number(x.size)===Number(selectedSize));
  if(existing) existing.qty += 1;
  else cart.push({id,size:Number(selectedSize),qty:1});
  save();
  toast('Added to bag');
  if(close) closeModal('productModal');
  openCart();
}

function openCart(){
  renderCart();
  $('cartDrawer')?.classList.add('open');
  $('drawerOverlay')?.classList.add('open');
  document.body.classList.add('locked');
}
function closeCart(){
  $('cartDrawer')?.classList.remove('open');
  $('drawerOverlay')?.classList.remove('open');
  document.body.classList.remove('locked');
}
function renderCart(){
  let total=0;
  if(!$('cartItems')) return;
  $('cartItems').innerHTML=cart.map(item=>{
    const p=products.find(x=>Number(x.id)===Number(item.id));
    if(!p) return '';
    total += p.price*item.qty;
    return `<div class="cart-row"><img src="${p.image}" alt="${p.name}"><div><b>${p.name}</b><span>Size ${item.size} · ${money(p.price)}</span><div class="qty"><button data-q="-1" data-id="${p.id}" data-size="${item.size}">−</button>${item.qty}<button data-q="1" data-id="${p.id}" data-size="${item.size}">+</button></div></div><button class="remove" data-remove="${p.id}" data-size="${item.size}">REMOVE</button></div>`;
  }).join('');
  if($('cartEmpty')) $('cartEmpty').style.display=cart.length?'none':'flex';
  if($('cartItems')) $('cartItems').style.display=cart.length?'block':'none';
  if($('total')) $('total').textContent=money(total);
}

function openWishlist(){
  if(!$('wishItems')) return;
  const valid=wish.map(id=>products.find(p=>Number(p.id)===Number(id))).filter(Boolean);
  $('wishItems').innerHTML=valid.length ? valid.map(p=>`<div class="saved-row"><img src="${p.image}" alt="${p.name}"><div><b>${p.name}</b><span>${money(p.price)}</span><button data-view="${p.id}">VIEW PRODUCT</button></div></div>`).join('') : '<div class="empty"><h3>Nothing saved yet.</h3><p>Tap ♡ on any pair.</p></div>';
  $('wishDrawer')?.classList.add('open');
  $('drawerOverlay')?.classList.add('open');
  document.body.classList.add('locked');
}

function openAccount(){
  if(!$('accountContent')) return;
  const content = member ? `<div class="account-box"><span class="avatar">${String(member.name||'M')[0].toUpperCase()}</span><span class="eyebrow">VAULT CLUB MEMBER</span><h2>${member.name}</h2><p>${member.email}</p><div class="account-actions"><button id="historyBtn">ORDER HISTORY</button><button id="accountWish">WISHLIST (${wish.length})</button><button id="accountReturns">RETURNS</button><button id="accountSizes">SAVED SIZES</button></div><button class="textbtn" id="signout">SIGN OUT</button></div>` : `<div class="account-box"><span class="eyebrow">THE VAULT CLUB</span><h2>Better as a<br><em>member.</em></h2><p>Save your rotation, unlock early drops and checkout faster.</p><button class="btn full" id="joinMember">JOIN FREE →</button></div>`;
  $('accountContent').innerHTML=content;
  $('accountDrawer')?.classList.add('open');
  $('drawerOverlay')?.classList.add('open');
  document.body.classList.add('locked');
  if($('joinMember')) $('joinMember').onclick=joinMember;
  if($('signout')) $('signout').onclick=()=>{member=null;save();openAccount();};
  if($('historyBtn')) $('historyBtn').onclick=()=>openSimple('ORDER HISTORY',orders.length?orders.map(o=>`<p><b>${o.id}</b> · ${money(o.total)} · ${o.status}</p>`).join(''):'No orders yet.');
  if($('accountWish')) $('accountWish').onclick=()=>{closeAccount();openWishlist();};
  if($('accountReturns')) $('accountReturns').onclick=()=>openSimple('RETURNS','Eligible unworn products can be returned within 30 days.');
  if($('accountSizes')) $('accountSizes').onclick=()=>openSimple('SAVED SIZES','Your preferred sizes are remembered on this device.');
}
function closeAccount(){
  $('accountDrawer')?.classList.remove('open');
  $('drawerOverlay')?.classList.remove('open');
  document.body.classList.remove('locked');
}
function joinMember(){
  const name=prompt('Your name');
  if(!name) return;
  const email=prompt('Your email');
  if(!email) return;
  member={name,email};
  save();
  toast('Welcome to the Vault Club');
  openAccount();
}

function openCheckout(){
  if(!cart.length) return toast('Your bag is empty');
  let total=0;
  if($('checkoutItems')) $('checkoutItems').innerHTML=cart.map(item=>{const p=products.find(x=>Number(x.id)===Number(item.id));if(!p)return '';total+=p.price*item.qty;return `<div class="checkout-row"><span>${p.name} × ${item.qty}</span><b>${money(p.price*item.qty)}</b></div>`;}).join('');
  if($('checkoutTotal')) $('checkoutTotal').textContent=money(total);
  $('checkoutModal')?.classList.add('open');
  document.body.classList.add('locked');
}

async function placeOrder(event){
  event.preventDefault();
  const form=new FormData(event.target);
  const total=cart.reduce((sum,item)=>{const p=products.find(x=>Number(x.id)===Number(item.id));return sum+(p?p.price*item.qty:0);},0);
  const order={id:'SV-'+(1000+orders.length+1),date:new Date().toISOString(),status:'Confirmed',total,items:[...cart]};
  try{
    const response=await fetch('/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({customer_name:form.get('name'),email:form.get('email'),phone:form.get('phone'),address:`${form.get('address')}, ${form.get('pincode')}, ${form.get('state')}`,items:cart.map(i=>({product_id:i.id,size:i.size,qty:i.qty}))})});
    if(response.ok){const data=await response.json();if(data.order_id) order.id='SV-'+data.order_id;}
  }catch(error){console.info('Local order fallback:',error.message);}
  orders.unshift(order); cart=[]; save();
  closeModal('checkoutModal');
  openSimple('ORDER CONFIRMED',`<div class="success"><div>✓</div><span class="eyebrow">ORDER CONFIRMED</span><h2>You're all<br><em>set.</em></h2><p>Order <b>${order.id}</b> is confirmed.</p><button class="btn" id="trackAfter">TRACK ORDER</button></div>`);
  if($('trackAfter')) $('trackAfter').onclick=()=>{closeModal('simpleModal');openTrack();};
}

function openCompare(){
  if(compare.length<2) return toast('Select 2–3 pairs with Compare');
  const list=compare.map(id=>products.find(p=>Number(p.id)===Number(id))).filter(Boolean);
  if(!$('compareModal') || !$('compareTable')) return toast('Compare is ready on product cards');
  $('compareTable').innerHTML=`<table><tr><th></th>${list.map(p=>`<th><img src="${p.image}" alt="${p.name}"><b>${p.name}</b></th>`).join('')}</tr><tr><td>PRICE</td>${list.map(p=>`<td>${money(p.price)}</td>`).join('')}</tr><tr><td>RATING</td>${list.map(p=>`<td>★ ${p.rating}</td>`).join('')}</tr><tr><td>CATEGORY</td>${list.map(p=>`<td>${p.category}</td>`).join('')}</tr><tr><td>STOCK</td>${list.map(p=>`<td>${p.stock}</td>`).join('')}</tr></table>`;
  $('compareModal').classList.add('open');document.body.classList.add('locked');
}

function toggleCompare(id){
  id=Number(id);
  if(compare.includes(id)) compare=compare.filter(x=>x!==id);
  else if(compare.length<3) compare.push(id);
  else return toast('Compare up to 3 pairs');
  save();render();toast(compare.includes(id)?'Added to compare':'Removed from compare');
}

function openTrack(){
  openSimple('TRACK YOUR ORDER',`<form id="trackForm"><input name="id" placeholder="SV-1001" required><button class="btn full">TRACK ORDER</button></form><div id="trackResult"></div>`);
  if($('trackForm')) $('trackForm').onsubmit=e=>{e.preventDefault();const id=String(new FormData(e.target).get('id')).toUpperCase();const order=orders.find(x=>x.id===id);$('trackResult').innerHTML=order?`<div class="tracking"><b>${order.id}</b><p>${money(order.total)} · ${order.status}</p><div><span class="done">ORDERED</span><span class="done">CONFIRMED</span><span>SHIPPED</span><span>DELIVERED</span></div></div>`:'Order not found. Check the number.';};
}
function openSimple(title,body){
  if(!$('simpleContent') || !$('simpleModal')) return;
  $('simpleContent').innerHTML=`<span class="eyebrow">SOLEVAULT</span><h2>${title}</h2><div class="simple-body">${body}</div>`;
  $('simpleModal').classList.add('open');document.body.classList.add('locked');
}
function closeModal(id){$(id)?.classList.remove('open');if(!document.querySelector('.modal.open,.search-overlay.open,.drawer.open')) document.body.classList.remove('locked');}

function clearFilters(){
  filter='All';
  document.querySelectorAll('.cat-filter').forEach(x=>x.checked=false);
  const allPrice=document.querySelector('input[name="price"][value="all"]');if(allPrice)allPrice.checked=true;
  if($('sizeFilter')){$('sizeFilter').dataset.value='all';document.querySelectorAll('#sizeFilter button').forEach(x=>x.classList.toggle('selected',x.dataset.s==='all'));}
  render();
}

function bindEvents(){
  document.addEventListener('click',event=>{
    const wishBtn=event.target.closest('[data-wish]');
    if(wishBtn){event.preventDefault();event.stopPropagation();toggleWish(wishBtn.dataset.wish);return;}
    const compareBtn=event.target.closest('[data-compare]');
    if(compareBtn){event.preventDefault();event.stopPropagation();toggleCompare(compareBtn.dataset.compare);return;}
    const viewBtn=event.target.closest('[data-view]');
    if(viewBtn){event.preventDefault();openProduct(viewBtn.dataset.view);return;}
    const pic=event.target.closest('.pic');
    if(pic){openProduct(pic.dataset.id);return;}
    const category=event.target.closest('[data-category]');
    if(category){filter=category.dataset.category;document.querySelectorAll('.cat-filter').forEach(x=>x.checked=x.value===filter);$('shop')?.scrollIntoView({behavior:'smooth'});render();return;}
  });

  $('bagBtn')?.addEventListener('click',openCart);
  $('closeCart')?.addEventListener('click',closeCart);
  $('wishBtn')?.addEventListener('click',openWishlist);
  $('accountBtn')?.addEventListener('click',openAccount);
  $('drawerOverlay')?.addEventListener('click',()=>{closeCart();closeAccount();$('wishDrawer')?.classList.remove('open');$('drawerOverlay')?.classList.remove('open');document.body.classList.remove('locked');});
  $('checkout')?.addEventListener('click',openCheckout);
  $('checkoutForm')?.addEventListener('submit',placeOrder);
  $('checkoutClose')?.addEventListener('click',()=>closeModal('checkoutModal'));
  $('pdpClose')?.addEventListener('click',()=>closeModal('productModal'));
  $('simpleClose')?.addEventListener('click',()=>closeModal('simpleModal'));
  $('customBtn')?.addEventListener('click',()=>{$('customModal')?.classList.add('open');document.body.classList.add('locked');});
  $('customClose')?.addEventListener('click',()=>closeModal('customModal'));
  $('customAdd')?.addEventListener('click',()=>{cart.push({id:6,size:9,qty:1});save();closeModal('customModal');openCart();toast('Custom pair added');});
  $('trackBtn')?.addEventListener('click',openTrack);
  $('returnsBtn')?.addEventListener('click',()=>openSimple('RETURNS & EXCHANGES','Eligible unworn products can be returned within 30 days. Keep original packaging.'));
  $('sizeBtn')?.addEventListener('click',()=>openSimple('SIZE GUIDE','Measure heel to toe. If between sizes, choose the larger size for a relaxed fit.'));
  $('contactBtn')?.addEventListener('click',()=>openSimple('CONTACT','Email hello@solevault.example with your order number for support.'));
  $('compareBtn')?.addEventListener('click',openCompare);
  $('filterToggle')?.addEventListener('click',()=>$('filtersPanel')?.classList.toggle('open'));
  $('filterMobile')?.addEventListener('click',()=>$('filtersPanel')?.classList.toggle('open'));
  $('filterClose')?.addEventListener('click',()=>$('filtersPanel')?.classList.remove('open'));
  $('clearFilters')?.addEventListener('click',clearFilters);
  $('sort')?.addEventListener('change',render);
  document.querySelectorAll('.cat-filter').forEach(x=>x.addEventListener('change',render));
  document.querySelectorAll('input[name="price"]').forEach(x=>x.addEventListener('change',render));
  $('sizeFilter')?.addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;$('sizeFilter').dataset.value=b.dataset.s;document.querySelectorAll('#sizeFilter button').forEach(x=>x.classList.toggle('selected',x===b));render();});
  $('sizes')?.addEventListener('click',event=>{const b=event.target.closest('.size');if(!b)return;selectedSize=Number(b.dataset.size);document.querySelectorAll('#sizes .size').forEach(x=>x.classList.toggle('selected',x===b));});
  $('pmHeart')?.addEventListener('click',()=>{if(selected)toggleWish(selected.id);});
  $('add')?.addEventListener('click',()=>addToCart(true));
  $('buyNow')?.addEventListener('click',()=>{addToCart(false);closeModal('productModal');openCheckout();});
  $('searchBtn')?.addEventListener('click',()=>{$('searchOverlay')?.classList.add('open');$('searchInput')?.focus();});
  $('searchClose')?.addEventListener('click',()=>closeModal('searchOverlay'));
  $('searchInput')?.addEventListener('input',()=>{const q=$('searchInput').value.trim().toLowerCase();const matches=products.filter(p=>(p.name+' '+p.category+' '+p.description).toLowerCase().includes(q)).slice(0,8);$('searchResults').innerHTML=q?matches.map(p=>`<button class="search-result" data-view="${p.id}"><img src="${p.image}" alt=""><span>${p.name}<small>${p.category} · ${money(p.price)}</small></span></button>`).join(''):'<p>Try sneakers, running, casual or boots.</p>';});
  $('cartItems')?.addEventListener('click',event=>{const q=event.target.closest('[data-q]');if(q){const item=cart.find(i=>Number(i.id)===Number(q.dataset.id)&&Number(i.size)===Number(q.dataset.size));if(item){item.qty+=Number(q.dataset.q);if(item.qty<1)cart=cart.filter(x=>x!==item);save();renderCart();}}const remove=event.target.closest('[data-remove]');if(remove){cart=cart.filter(i=>!(Number(i.id)===Number(remove.dataset.remove)&&Number(i.size)===Number(remove.dataset.size)));save();renderCart();}});
  document.querySelectorAll('.modal,.search-overlay').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id);}));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelectorAll('.modal.open,.search-overlay.open').forEach(x=>x.classList.remove('open'));closeCart();closeAccount();document.body.classList.remove('locked');}});
}

function init(){
  if($('sizeFilter')) $('sizeFilter').innerHTML=['all',6,7,8,9,10,11,12].map(s=>`<button data-s="${s}" class="${s==='all'?'selected':''}">${s==='all'?'ALL':s}</button>`).join('');
  bindEvents();
  save();
  load();
  let countdown=2*86400+14*3600+37*60+10;
  setInterval(()=>{countdown=Math.max(0,countdown-1);const d=Math.floor(countdown/86400),h=Math.floor(countdown%86400/3600),m=Math.floor(countdown%3600/60),s=countdown%60;if($('cd'))$('cd').textContent=[d,h,m,s].map(x=>String(x).padStart(2,'0')).join(' : ');},1000);
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();