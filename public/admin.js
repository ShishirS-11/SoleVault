let editing=null;
const $=x=>document.getElementById(x),money=n=>"₹"+Number(n).toLocaleString("en-IN");
async function refresh(){
 const [ps,os,st]=await Promise.all([fetch("/api/products").then(r=>r.json()),fetch("/api/orders").then(r=>r.json()),fetch("/api/stats").then(r=>r.json())]);
 window.products=ps;$("productsStat").textContent=st.products;$("stockStat").textContent=st.lowStock;$("ordersStat").textContent=st.orders;$("revenueStat").textContent=money(st.revenue);
 renderProducts();renderOrders(os);
}
function renderProducts(){
 const q=$("search").value.toLowerCase();
 $("productRows").innerHTML=products.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)).map(p=>`<tr><td><img src="${p.image}">${p.name}</td><td>${p.category}</td><td>${money(p.price)}</td><td>${p.stock}</td><td>${p.sizes}</td><td><button class="action" onclick="editProduct(${p.id})">EDIT</button><button class="action danger" onclick="deleteProduct(${p.id})">DELETE</button></td></tr>`).join("");
}
function renderOrders(os){$("orderRows").innerHTML=os.map(o=>`<tr><td>#${o.id}</td><td>${o.customer_name}<br><small>${o.email}</small></td><td>${money(o.total)}</td><td>${o.item_count}</td><td><select onchange="status(${o.id},this.value)">${["Pending","Confirmed","Shipped","Delivered","Cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></td><td>${new Date(o.created_at).toLocaleString()}</td></tr>`).join("")}
function openForm(p=null){editing=p;$("formTitle").textContent=p?"Edit shoe":"Add shoe";const f=$("form");["name","category","price","rating","stock","sizes","image","description"].forEach(k=>f.elements[k].value=p?p[k]:(k==="rating"?5:k==="sizes"?"6,7,8,9,10,11,12":""));$("modal").classList.add("open")}
$("form").onsubmit=async e=>{e.preventDefault();const body=Object.fromEntries(new FormData(e.target));let r=await fetch(editing?"/api/products/"+editing.id:"/api/products",{method:editing?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});let d=await r.json();if(!r.ok)return toast(d.error);$("modal").classList.remove("open");toast(editing?"Product updated":"Product added");refresh()};
async function editProduct(id){openForm(products.find(p=>p.id===id))}
async function deleteProduct(id){if(!confirm("Delete this shoe?"))return;let r=await fetch("/api/products/"+id,{method:"DELETE"});if(r.ok){toast("Product deleted");refresh()}}
async function status(id,status){await fetch("/api/orders/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});toast("Order updated");refresh()}
function toast(t){$("toast").textContent=t;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),1600)}
$("newBtn").onclick=()=>openForm();$("close").onclick=()=>$("modal").classList.remove("open");$("search").oninput=renderProducts;refresh();