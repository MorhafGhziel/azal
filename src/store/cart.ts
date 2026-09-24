// The one place where cart state and every total is calculated. UI only reads from here.
// Persisted in localStorage; other tabs stay in sync through the storage event.
import { byId, DELIVERY, type Product, type Size } from '../data/products';

export type Line = { id: string; size: string; qty: number };
export type Cart = { lines: Line[]; gift: boolean; giftMsg: string };
export type Method = 'standard' | 'express';

const KEY = 'azal-cart';
const MAX_QTY = 10;
let cart: Cart = load();
const subs = new Set<(c: Cart) => void>();

function load(): Cart {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (c && Array.isArray(c.lines)) {
      // drop anything that no longer exists in the catalogue
      c.lines = c.lines.filter((l: Line) => resolve(l) && l.qty > 0);
      return { lines: c.lines, gift: !!c.gift, giftMsg: String(c.giftMsg || '').slice(0, 160) };
    }
  } catch {}
  return { lines: [], gift: false, giftMsg: '' };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {}
  subs.forEach((f) => f(cart));
}
addEventListener('storage', (e) => { if (e.key === KEY) { cart = load(); subs.forEach((f) => f(cart)); } });

export function resolve(l: Line): { product: Product; size: Size } | null {
  const product = byId(l.id);
  const size = product?.sizes.find((s) => s.id === l.size);
  return product && size ? { product, size } : null;
}

export const getCart = () => cart;
export function subscribe(f: (c: Cart) => void) { subs.add(f); f(cart); return () => subs.delete(f); }

export function add(id: string, size: string, qty = 1) {
  const l = cart.lines.find((x) => x.id === id && x.size === size);
  if (l) l.qty = Math.min(MAX_QTY, l.qty + qty);
  else cart.lines.push({ id, size, qty: Math.min(MAX_QTY, qty) });
  save();
}
export function setQty(id: string, size: string, qty: number) {
  const l = cart.lines.find((x) => x.id === id && x.size === size);
  if (!l) return;
  if (qty <= 0) cart.lines = cart.lines.filter((x) => x !== l);
  else l.qty = Math.min(MAX_QTY, Math.round(qty));
  save();
}
export const remove = (id: string, size: string) => setQty(id, size, 0);
export function setGift(on: boolean, msg?: string) { cart.gift = on; if (msg !== undefined) cart.giftMsg = msg.slice(0, 160); save(); }
export function clear() { cart = { lines: [], gift: false, giftMsg: '' }; save(); }

export const count = (c = cart) => c.lines.reduce((n, l) => n + l.qty, 0);

export function totals(method: Method | null = null, c = cart) {
  const subtotal = c.lines.reduce((s, l) => s + (resolve(l)?.size.price || 0) * l.qty, 0);
  let delivery: number | null = null; // null = not chosen yet
  if (method && subtotal > 0) {
    delivery = method === 'express' ? DELIVERY.express : subtotal >= DELIVERY.freeStandardOver ? 0 : DELIVERY.standard;
  }
  return { subtotal, delivery, gift: 0, total: subtotal + (delivery || 0), count: count(c) };
}

// ---- demo orders (kept on this device only; nothing is sent anywhere) ----
export type Order = {
  id: string; date: string; firstName: string; email: string; phone: string;
  address: { name: string; city: number; district: string; street: string; building: string; notes: string };
  method: Method; payment: string; lines: (Line & { price: number })[]; gift: boolean; giftMsg: string;
  totals: ReturnType<typeof totals>;
};
const OKEY = 'azal-orders';
export function placeOrder(data: Omit<Order, 'id' | 'date' | 'lines' | 'gift' | 'giftMsg' | 'totals'>): Order {
  const id = `AZ-${10000 + Math.floor(Math.random() * 89999)}`;
  const order: Order = {
    ...data, id, date: new Date().toISOString(),
    lines: cart.lines.map((l) => ({ ...l, price: resolve(l)!.size.price })),
    gift: cart.gift, giftMsg: cart.giftMsg, totals: totals(data.method),
  };
  try {
    const all = JSON.parse(localStorage.getItem(OKEY) || '{}');
    all[id] = order;
    localStorage.setItem(OKEY, JSON.stringify(all));
  } catch {}
  clear();
  return order;
}
export function getOrder(id: string): Order | null {
  try { return JSON.parse(localStorage.getItem(OKEY) || '{}')[id] || null; } catch { return null; }
}
