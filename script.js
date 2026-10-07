"use strict";
/* ---------- Config ----------
   Keep ORDER_ENDPOINT empty for now (demo mode: order is only logged to the console).
   Later put your Cloudflare Worker URL here. NEVER put a Telegram bot token in this file. */
const ORDER_ENDPOINT = "";
const CART_KEY = "novaeats_cart_v1";

const PRODUCTS = [
  { id: 1, name: "Nova Classic Burger",  price: 6.9, emoji: "🍔", desc: "Beef patty, cheddar, pickles and house sauce." },
  { id: 2, name: "Double Beef Burger",   price: 8.9, emoji: "🍔", desc: "Two patties, double cheese, smoky sauce." },
  { id: 3, name: "Crispy Chicken Burger",price: 7.5, emoji: "🐔", desc: "Crunchy chicken fillet, lettuce, light mayo." },
  { id: 4, name: "Loaded Fries",         price: 4.5, emoji: "🍟", desc: "Golden fries with cheese sauce and herbs." },
  { id: 5, name: "Chicken Wings",        price: 6.5, emoji: "🍗", desc: "Six wings tossed in spicy orange glaze." },
  { id: 6, name: "Beef Wrap",            price: 6.9, emoji: "🌯", desc: "Grilled beef, fresh vegetables, garlic sauce." },
  { id: 7, name: "Cola",                 price: 2.0, emoji: "🥤", desc: "Ice-cold, 0.5 L." },
  { id: 8, name: "Fresh Lemonade",       price: 2.5, emoji: "🍋", desc: "Squeezed lemons, mint and a little sugar." }
];

const $ = (id) => document.getElementById(id);
const money = (n) => "$" + n.toFixed(2);
let cart = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(i => PRODUCTS.some(p => p.id === i.id) && i.qty > 0) : [];
  } catch { return []; }
}
function save() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch {} }
const product = (id) => PRODUCTS.find(p => p.id === id);
const subtotal = () => cart.reduce((s, i) => s + product(i.id).price * i.qty, 0);

/* ---------- Menu ---------- */
$("menuGrid").innerHTML = PRODUCTS.map(p => `
  <article class="card">
    <div class="img" aria-hidden="true">${p.emoji}</div>
    <h3>${p.name}</h3><p>${p.desc}</p>
    <div class="row"><span class="price">${money(p.price)}</span>
    <button class="btn" data-add="${p.id}">Add to Cart</button></div>
  </article>`).join("");
$("menuGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-add]"); if (!b) return;
  const id = +b.dataset.add, item = cart.find(i => i.id === id);
  item ? item.qty++ : cart.push({ id, qty: 1 });
  update();
  b.textContent = "Added ✓"; setTimeout(() => b.textContent = "Add to Cart", 900);
});

/* ---------- Cart ---------- */
function update() {
  save();
  $("cartCount").textContent = cart.reduce((s, i) => s + i.qty, 0);
  $("subtotal").textContent = $("total").textContent = money(subtotal());
  $("checkoutBtn").disabled = !cart.length;
  $("cartList").innerHTML = cart.length ? cart.map(i => {
    const p = product(i.id);
    return `<li><div class="top"><span>${p.name}</span><span>${money(p.price * i.qty)}</span></div>
      <div class="qty"><button data-dec="${i.id}" aria-label="Decrease ${p.name}">−</button>
      <span aria-live="polite">${i.qty}</span>
      <button data-inc="${i.id}" aria-label="Increase ${p.name}">+</button>
      <button class="rm" data-rm="${i.id}">Remove</button></div></li>`;
  }).join("") : `<li class="empty">Your cart is empty. Add something from the menu.</li>`;
}
$("cartList").addEventListener("click", (e) => {
  const t = e.target.closest("button"); if (!t) return;
  const id = +(t.dataset.inc || t.dataset.dec || t.dataset.rm), item = cart.find(i => i.id === id);
  if (!item) return;
  if (t.dataset.inc) item.qty++;
  if (t.dataset.dec) item.qty--;
  if (t.dataset.rm || item.qty <= 0) cart = cart.filter(i => i.id !== id);
  update();
});

/* ---------- Drawer ---------- */
function show(view) {
  $("cartView").hidden = view !== "cart";
  $("orderForm").hidden = view !== "form";
  $("confirmView").hidden = view !== "done";
  $("drawerTitle").textContent = view === "form" ? "Checkout" : view === "done" ? "Thank you" : "Your cart";
}
function openDrawer(view = "cart") {
  show(view); $("drawer").classList.add("open"); $("drawer").setAttribute("aria-hidden", "false"); $("overlay").hidden = false;
  $("closeCart").focus();
}
function closeDrawer() {
  $("drawer").classList.remove("open"); $("drawer").setAttribute("aria-hidden", "true"); $("overlay").hidden = true;
  $("openCart").focus();
}
$("openCart").onclick = () => openDrawer();
$("closeCart").onclick = $("overlay").onclick = closeDrawer;
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
$("checkoutBtn").onclick = () => { renderSummary(); show("form"); $("name").focus(); };
$("backToCart").onclick = () => show("cart");
$("newOrder").onclick = () => { closeDrawer(); location.hash = "#menu"; };

/* ---------- Mobile nav ---------- */
$("burger").onclick = () => {
  const open = $("nav").classList.toggle("open");
  $("burger").setAttribute("aria-expanded", open);
};
$("nav").addEventListener("click", (e) => { if (e.target.tagName === "A") { $("nav").classList.remove("open"); $("burger").setAttribute("aria-expanded", false); } });

/* ---------- Order ---------- */
function renderSummary() {
  $("summary").innerHTML = cart.map(i => `<div>${i.qty} × ${product(i.id).name} — ${money(product(i.id).price * i.qty)}</div>`).join("")
    + `<div class="total">Total: ${money(subtotal())}</div>`;
}
/* The exact data a Worker will receive and forward to the Telegram Bot API. */
function buildOrderPayload(f) {
  return {
    customerName: f.name.trim(),
    phone: f.phone.trim(),
    address: f.address.trim(),
    products: cart.map(i => ({ name: product(i.id).name, quantity: i.qty, lineTotal: +(product(i.id).price * i.qty).toFixed(2) })),
    total: +subtotal().toFixed(2),
    comment: f.comment.trim(),
    createdAt: new Date().toISOString(),
    demo: true
  };
}
async function sendOrder(payload) {
  if (!ORDER_ENDPOINT) { console.log("DEMO order payload:", payload); return true; }
  const res = await fetch(ORDER_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return res.ok;
}
$("orderForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target, err = $("formError"); err.textContent = "";
  if (!cart.length) { err.textContent = "Your cart is empty."; return; }
  if (f.name.value.trim().length < 2) { err.textContent = "Enter your name."; f.name.focus(); return; }
  if (f.phone.value.replace(/\D/g, "").length < 9) { err.textContent = "Enter a valid phone number."; f.phone.focus(); return; }
  if (f.address.value.trim().length < 5) { err.textContent = "Enter your delivery address."; f.address.focus(); return; }
  const btn = $("placeOrder"); btn.disabled = true; btn.textContent = "Sending…";
  try {
    if (await sendOrder(buildOrderPayload(f))) {
      cart = []; update(); f.reset(); show("done");
    } else err.textContent = "Order could not be sent. Please try again.";
  } catch { err.textContent = "No connection. Please try again."; }
  btn.disabled = false; btn.textContent = "Place Order";
});

update();
