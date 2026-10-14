# Balaji Pauva House — Real Order System (v2) · Setup Guide

Website se order ab **WhatsApp pe nahi** jaata. Order seedha shop ke **live dashboard** pe aata hai
(`/admin.html`), customer ko live status dikhta hai, aur payment **Cash on Delivery / Pay at counter**
ya **UPI QR (amount pre-filled)** se hoti hai.

```
Customer (website)  ──order──▶  Firestore  ──live──▶  Shop dashboard (admin.html)
       ▲                                                   │
       └──────── live status / payment verified ◀──────────┘
```

---

## 1. Firestore rules publish karo  (ZAROORI — iske bina dashboard nahi chalega)

1. https://console.firebase.google.com → project **balaji-pauva-house**
2. Left menu → **Firestore Database** → tab **Rules**
3. Jo bhi likha hai sab delete karo, aur is repo ki file **`firestore.rules`** ka poora content paste karo
4. **Publish** dabao

> Rules kya karte hain: customer sirf apna order dekh/create kar sakta hai; shop staff (admins) sab orders
> dekh/update kar sakte hain; `settings/store` public-read hai (website ko open/closed, UPI id chahiye).

## 2. Staff login banao

1. Firebase console → **Authentication** → **Sign-in method** → **Email/Password** = Enabled (pehle se hoga)
   · **Anonymous** bhi Enabled rehna chahiye (guest orders ke liye — pehle se ON hai)
2. **Authentication → Users → Add user** → shop ka email + strong password (e.g. `owner@balajipauva.com`)
3. **Firestore Database → Data → Start collection** → Collection ID: `admins`
   · Document ID: **exactly wahi email, lowercase** (e.g. `owner@balajipauva.com`)
   · Field: `role` (string) = `owner` → Save

Baaki staff baad mein dashboard ke **Settings → Staff accounts** se add ho sakte hain
(unka login phir Authentication → Users mein banana hoga).

## 3. Dashboard kholo

- URL: **https://balajipauvahouse.vercel.app/admin.html** (ya `/admin`)
- Login karo → **Live orders** board khulta hai
- Pehli baar browser **Notification allow** poochega → Allow (naya order aate hi alert + sound)
- Kitchen tablet/phone pe ye page khula rakho — screen awake rehti hai, naya order aane pe
  **ring hota rahega** jab tak Accept nahi karte

## 4. UPI online payment ON karo

1. Dashboard → **Settings → UPI payments**
2. **UPI ID (VPA)** daalo — jo aapke shop ke payment QR mein hai (e.g. `balajipauva@okaxis`, `9876543210@ybl`)
3. **Save settings** → neeche ₹1 ka **test QR** banta hai — apne phone se scan karo:
   GPay/PhonePe mein payee name + ₹1 pre-filled dikhna chahiye. Dikha = online payment LIVE.
4. Ab website pe customer ko "Pay online · UPI" option milta hai. Order place hote hi
   **QR with exact amount** (e.g. ₹161) + "Open UPI app" buttons dikhte hain.

> Jab tak UPI ID set nahi hai, website pe sirf Cash option dikhta hai ("UPI being set up").

### UPI payment verify kaise hota hai?
UPI QR se paisa **seedha aapke bank** mein jaata hai — website/dashboard ko bank automatically nahi batata.
Isliye:
- Customer pay karke **UTR / reference number** daal sakta hai → dashboard pe chip **"UPI · customer says paid"**
- Staff apne GPay/PhonePe business app mein dekhte hain: amount + note **"Balaji order 7K2M"**
- Match hua → card pe **"Verify ✓ mark paid"** dabao → customer ko "UPI paid ✓" dikhta hai
- Automatic verification chahiye to baad mein Razorpay/Cashfree jaisa payment gateway add karna hoga
  (order model usme bhi fit hai: `payment.method`, `payment.status`, `payment.utr`)

## 5. Roz ka use (Dominos style)

| Column | Matlab | Button |
|---|---|---|
| **New** | Customer ne abhi order kiya, ring ho raha hai | **Accept & start cooking** / Reject |
| **In the kitchen** | Ban raha hai | Pickup: **Ready for pickup** · Delivery: **Packed** → **Out for delivery** |
| **Ready / on the way** | Counter pe ready ya rider nikal gaya | **Collected ✓** / **Delivered ✓** (COD pe cash auto "received") |
| **Done today** | Complete/cancelled | Print · Delete |

- **Ready in (min)** dropdown → customer ko "Ready by ~time" dikhta hai
- **Outlet filter** (top bar) → har outlet apna board dekh sakta hai
- **Accepting orders** toggle → OFF karo to website pe "Online orders paused" (raat ko / rush mein)
- **All orders** → history, search (naam/phone/order id/UTR), date filter, **Export CSV** (hisaab ke liye)
- **Customers** → naam, phone (tap to call), address, kitne orders, kitna kharcha, private staff note
- **Print** → 72mm KOT/bill (thermal printer ya normal)

## 6. Customer side (website)

- Checkout: Delivery/Pickup → naam, mobile, address, **outlet**, note → **Payment: Cash / UPI** → Place order
- Order place hote hi **"Order placed!"** (COD) ya **payment QR screen** (UPI)
- **My Orders** (`#/orders`): live timeline *Order placed → Preparing → On the way/Ready → Delivered/Collected*,
  payment chip, **Pay now** (pending UPI), **Cancel order** (jab tak shop ne accept nahi kiya), Reorder
- Guest bhi order kar sakta hai (anonymous session) — same device pe My Orders mein dikhega;
  account banaye to har device pe

## 7. Firestore data (reference)

```
orders/BPH-251013-7K2M
  id, uid, items[{id,name,qty,price}], mode: delivery|pickup, name, phone, address, outlet, note
  subtotal, tax, delivery, roundOff, total, count, placedAt, eta
  status: received → preparing → ready → out → completed | cancelled
  payment: { method: cod|upi, status: pending|claimed|paid|failed, amount, utr, claimedAt, paidAt, verifiedBy, via }
  confirmedAt, readyAt, outAt, completedAt, cancelledAt, cancelReason, cancelledBy, customerKey (10-digit phone)
customers/9876543210   name, phone, email, orders, spend, lastOrderAt, lastAddress, addresses[], lastOutlet, note
settings/store         acceptingOrders, closedMessage, upiId, upiName, deliveryFee, freeDeliveryAbove, eta
admins/owner@email.com role
```

## 8. Purane test documents

Testing ke dauraan `orders` mein 3 probe docs bane the: `ZZTEST-probe2`, `ZZTEST-probe3`, `ZZTEST-probe4`
(name "Probe"). Rules publish hone ke baad dashboard → **All orders** → in cards pe 🗑 **Delete** dabao.

## Files

| File | Kya hai |
|---|---|
| `index.html` | Website (checkout v2 + cloud layer v2 + QR lib embedded) |
| `admin.html` | Shop dashboard (staff only) |
| `firestore.rules` | Security rules — console mein paste karo |
| `vercel.json` | `/admin` → `admin.html` rewrite, no-cache headers |
| `sw.js` | Service worker v3 (cache bump → purane users ko update milega) |
