# Customer Detail Page Revamp - Specification & Execution Plan
**Figma Design Node Reference:** [Figma Node 65-399](https://www.figma.com/design/RqeGM5NJD3CTeasfarP9iM/Kelak-Kembali-Tools?node-id=65-399&t=KlWRU0y3EjPbLoSM-11)

This document provides an exact, comprehensive technical specification and step-by-step implementation plan for AI agents (and human engineers) to revamp the Customer Detail view in `index.html`, `styles.css`, and `app.js`.

---

## 📋 1. Requirements & Architecture Summary

### 1.1 Page Routing & Views
- **Read-Only Customer View (`#/customer/:id`)**:
  - Displays the revamped retro interface matching Figma Node 65:399.
  - Contains top navigation header, hero customer name, quick status banners, retro black orders ledger, and footer.
  - Read-only; contact details, notes, and order creation buttons are omitted on this page for now per design scope.
- **Customer Edit View (`#/customer/:id/edit`)**:
  - Separate view for editing customer details (`name`, `phone`, `instagram`, `source`, `wedding_date`, `notes`, etc.).
  - Houses the "Mark as not proceeding" and "Reopen customer" action buttons.

### 1.2 Interactive Behavior & Visual Tokens
- **Pressed State Feedback (`.is-pressed`)**:
  - All banners (`.cust-banner`) and order cards (`.cust-order-card-wrap`) MUST support press feedback on `pointerdown`/`touchstart`/`keydown` matching homepage cards.
  - Order card bottom rail height dynamically shrinks from `12px` (default) to `4px` when pressed.
- **Banners Click Behavior**:
  - Banners render with press states for tactile feel. No navigation actions are triggered on banner click for now.
- **Order Cards Click Behavior**:
  - Clicking an order card navigates directly to `#/order/:orderId`.

---

## 🎨 2. Design Tokens & Color Palette

| Token / Layer | Color Code (Hex) | Purpose |
| :--- | :--- | :--- |
| `var(--primary-white)` | `#FEFAF1` | Page background, navigation container, order card face |
| `var(--primary-black)` | `#0D0D0D` | Dark ledger background, hero text, banner indicator rail |
| `var(--white-dark)` | `#E3E3E3` | Navigation button background/borders, order card shadow rail |
| `var(--stroke-dark)` | `#4C4C4C` | Ledger grid lines, borders, footer subtext |
| `var(--black-light)` | `#292929` | Wedding date banner background |
| `var(--secondary-orange)` | `#FF6A00` | Next event banner background (Indicator: `#DD5D01`) |
| `var(--pink)` | `#FC4FAC` | Fitting logs banner background (Indicator: `#E72A90`) |
| `var(--secondary-green---dark)` | `#23B620` | Quotations banner background (Indicator: `#19AA16`) |
| `var(--blue)` | `#1E72EF` | Invoices banner background (Indicator: `#1866DA`) |

### Status Badge Colors (Order Cards):
- **`In production`**: Pink text (`#E72A90`)
- **`Quote sent` & `Invoice sent`**: Blue text (`#1866DA`)
- **`Draft`, `Completed`, `Cancelled`**: Dark Gray text (`#4C4C4C`)

---

## 🧱 3. HTML Markup Specification (`index.html`)

Update `#viewCustomer` in `index.html` with the following explicit DOM structure:

```html
<!-- -------------------------- Customer detail -------------------------- -->
<section class="view" id="viewCustomer" hidden>

  <!-- Navigation Container -->
  <div class="cust-nav-bar">
    <a class="cust-nav-btn" id="custBackBtn" href="#/customers">
      <div class="cust-nav-btn__face">
        <svg class="cust-nav-btn__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Customers</span>
      </div>
      <div class="cust-nav-btn__rail"></div>
    </a>

    <a class="cust-nav-btn cust-nav-btn--icon-only" id="custEditBtn" href="#/customer/edit" aria-label="Edit Customer">
      <div class="cust-nav-btn__face">
        <svg class="cust-nav-btn__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="cust-nav-btn__rail"></div>
    </a>
  </div>

  <!-- Hero Customer Title -->
  <div class="cust-hero">
    <h1 class="cust-hero__name" id="custHeroName">—</h1>
  </div>

  <!-- Banners Stack -->
  <div class="cust-banners">
    <!-- Wedding Date Banner -->
    <div class="cust-banner cust-banner--wedding" id="custWeddingBanner">
      <div class="cust-banner__face">
        <div class="cust-banner__left">
          <svg class="cust-banner__icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span class="cust-banner__title">Wedding date</span>
        </div>
        <span class="cust-banner__value" id="custWeddingText">—</span>
      </div>
      <div class="cust-banner__rail"></div>
    </div>

    <!-- Next Event Banner -->
    <div class="cust-banner cust-banner--next" id="custNextBanner">
      <div class="cust-banner__face">
        <div class="cust-banner__left">
          <img src="assets/home-schedule-icon.svg" class="cust-banner__icon" alt="" />
          <span class="cust-banner__title" id="custNextLabel">Next: Fitting 1</span>
        </div>
        <span class="cust-banner__value" id="custNextDate">—</span>
      </div>
      <div class="cust-banner__rail"></div>
    </div>

    <!-- Fitting Logs Banner -->
    <div class="cust-banner cust-banner--fittings" id="custFittingBanner">
      <div class="cust-banner__face">
        <div class="cust-banner__left">
          <img src="assets/home-fitting-icon.svg" class="cust-banner__icon" alt="" />
          <span class="cust-banner__title">Fitting logs</span>
        </div>
      </div>
      <div class="cust-banner__rail"></div>
    </div>

    <!-- Split Banner Row (Quotations & Invoices) -->
    <div class="cust-banner-split">
      <div class="cust-banner cust-banner--quotation" id="custQuotationBanner">
        <div class="cust-banner__face">
          <div class="cust-banner__left">
            <img src="assets/home-quote-icon.svg" class="cust-banner__icon" alt="" />
            <span class="cust-banner__title">Quotations</span>
          </div>
        </div>
        <div class="cust-banner__rail"></div>
      </div>

      <div class="cust-banner cust-banner--invoice" id="custInvoiceBanner">
        <div class="cust-banner__face">
          <div class="cust-banner__left">
            <img src="assets/home-invoice-icon.svg" class="cust-banner__icon" alt="" />
            <span class="cust-banner__title">Invoices</span>
          </div>
        </div>
        <div class="cust-banner__rail"></div>
      </div>
    </div>
  </div>

  <!-- Orders Retro Ledger Section -->
  <section class="cust-orders-section">
    <!-- Top Vertical Grid Spacer -->
    <div class="cust-grid-vert">
      <div class="cust-grid-vert__line"></div>
      <div class="cust-grid-vert__line"></div>
    </div>

    <!-- Summary Header Bar -->
    <div class="cust-orders-summary">
      <span class="cust-orders-summary__count" id="custOrdersCount">0 orders</span>
      <span class="cust-orders-summary__total" id="custOrdersSum">Rp0</span>
    </div>

    <!-- Middle Vertical Grid Spacer -->
    <div class="cust-grid-vert">
      <div class="cust-grid-vert__line"></div>
      <div class="cust-grid-vert__line"></div>
    </div>

    <!-- Orders Cards List -->
    <div class="cust-orders-list" id="custOrderList">
      <!-- Order cards rendered dynamically via JS -->
    </div>

    <!-- Bottom Vertical Grid Spacer -->
    <div class="cust-grid-vert">
      <div class="cust-grid-vert__line"></div>
      <div class="cust-grid-vert__line"></div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="cust-footer">
    <p>Made with love for Ichaku</p>
  </footer>
</section>

<!-- Separate View: Customer Edit -->
<section class="view" id="viewCustomerEdit" hidden>
  <section class="card" id="customerEditCard">
    <!-- Form fields: Name, Phone, Instagram, Source, Wedding Date, Notes -->
    <!-- Buttons: Save, Cancel, Mark as not proceeding, Reopen customer -->
  </section>
</section>
```

---

## 🎨 4. CSS Rules & Styling Specification (`styles.css`)

Add the following CSS rules to `styles.css`:

```css
/* -------------------- Customer Detail Revamp (Figma 65:399) -------------------- */

.cust-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
  background: var(--primary-white, #FEFAF1);
}

.cust-nav-btn {
  display: inline-flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--primary-black, #0D0D0D);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 400;
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.48px;
  border: 1px solid var(--white-dark, #E3E3E3);
  border-radius: 4px;
  overflow: hidden;
  background: var(--primary-white, #FEFAF1);
}

.cust-nav-btn__face {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 48px;
  padding: 12px 16px;
}

.cust-nav-btn--icon-only { width: 56px; }
.cust-nav-btn--icon-only .cust-nav-btn__face { padding: 12px; }

.cust-nav-btn__rail {
  height: 7px;
  background: var(--white-dark, #E3E3E3);
  width: 100%;
}

.cust-nav-btn.is-pressed .cust-nav-btn__face {
  background: linear-gradient(180deg, transparent, rgba(0,0,0,.08));
}
.cust-nav-btn.is-pressed .cust-nav-btn__rail {
  height: 3px;
}

/* Hero Section */
.cust-hero {
  background: var(--primary-white, #FEFAF1);
  padding: 80px 24px 24px;
}

.cust-hero__name {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 32px;
  line-height: 40px;
  letter-spacing: -0.96px;
  color: var(--primary-black, #0D0D0D);
  word-break: break-word;
}

/* Banners Stack */
.cust-banners {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.cust-banner {
  display: flex;
  flex-direction: column;
  width: 100%;
  text-decoration: none;
  color: var(--primary-white, #FEFAF1);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  line-height: 20px;
  letter-spacing: -0.42px;
  user-select: none;
}

.cust-banner__face {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
}

.cust-banner__left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cust-banner__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.cust-banner__rail {
  height: 8px;
  width: 100%;
}

/* Banner Variations */
.cust-banner--wedding { background: var(--black-light, #292929); }
.cust-banner--wedding .cust-banner__rail { background: var(--primary-black, #0D0D0D); }

.cust-banner--next { background: var(--secondary-orange, #FF6A00); }
.cust-banner--next .cust-banner__rail { background: #DD5D01; }

.cust-banner--fittings { background: var(--pink, #FC4FAC); }
.cust-banner--fittings .cust-banner__rail { background: var(--pink-dark, #E72A90); }

.cust-banner-split {
  display: flex;
  width: 100%;
}

.cust-banner-split .cust-banner { flex: 1; min-width: 0; }

.cust-banner--quotation { background: var(--secondary-green---dark, #23B620); }
.cust-banner--quotation .cust-banner__rail { background: #19AA16; }

.cust-banner--invoice { background: var(--blue, #1E72EF); }
.cust-banner--invoice .cust-banner__rail { background: var(--blue-dark, #1866DA); }

/* Banner Press Feedback */
.cust-banner.is-pressed .cust-banner__face {
  background-image: linear-gradient(180deg, transparent, rgba(0,0,0,.15));
}
.cust-banner.is-pressed .cust-banner__rail {
  height: 3px;
}

/* Orders Retro Ledger Section */
.cust-orders-section {
  background: var(--primary-black, #0D0D0D);
  width: 100%;
  display: flex;
  flex-direction: column;
}

.cust-grid-vert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 24px;
}

.cust-grid-vert__line {
  width: 1px;
  height: 24px;
  background: var(--stroke-dark, #4C4C4C);
}

.cust-orders-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  border-top: 1px solid var(--stroke-dark, #4C4C4C);
  border-bottom: 1px solid var(--stroke-dark, #4C4C4C);
  color: var(--primary-white, #FEFAF1);
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 14px;
  font-weight: 400;
  letter-spacing: -0.42px;
}

.cust-orders-list {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.cust-order-card-wrap {
  display: flex;
  flex-direction: column;
  padding: 0 24px;
  border-top: 1px solid var(--stroke-dark, #4C4C4C);
  border-bottom: 1px solid var(--stroke-dark, #4C4C4C);
  text-decoration: none;
}

.cust-order-card {
  background: var(--primary-white, #FEFAF1);
  border-left: 1px solid var(--stroke-dark, #4C4C4C);
  border-right: 1px solid var(--stroke-dark, #4C4C4C);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  text-decoration: none;
  transition: padding 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

.cust-order-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.cust-order-card__title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 20px;
  line-height: 24px;
  letter-spacing: -0.6px;
  color: var(--primary-black, #0D0D0D);
}

.cust-order-card__status {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 12px;
  line-height: 16px;
  letter-spacing: -0.36px;
  white-space: nowrap;
}

.cust-status--pink { color: var(--pink-dark, #E72A90); }
.cust-status--blue { color: var(--blue-dark, #1866DA); }
.cust-status--gray { color: var(--stroke-dark, #4C4C4C); }

.cust-order-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 500;
  font-size: 13px;
  line-height: 20px;
  letter-spacing: -0.39px;
  color: var(--primary-black, #0D0D0D);
}

.cust-order-card__rail {
  height: 12px;
  background: var(--white-dark, #E3E3E3);
  border-left: 1px solid var(--stroke-dark, #4C4C4C);
  border-right: 1px solid var(--stroke-dark, #4C4C4C);
  transition: height 120ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* Card Pressed Animation */
.cust-order-card-wrap.is-pressed .cust-order-card {
  padding-top: 16px;
  padding-bottom: 16px;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,.06)), var(--primary-white, #FEFAF1);
}
.cust-order-card-wrap.is-pressed .cust-order-card__rail {
  height: 4px;
}

/* Footer */
.cust-footer {
  background: var(--primary-black, #0D0D0D);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cust-footer p {
  margin: 0;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 400;
  font-size: 14px;
  line-height: 24px;
  letter-spacing: -0.42px;
  color: var(--stroke-dark, #4C4C4C);
  text-align: center;
}
```

---

## ⚡ 5. JavaScript Logic Specification (`app.js`)

### 5.1 Route Mapping Update
Modify the router in `app.js` to support both customer read-only view and customer edit view:

```javascript
// Router logic
if (route.view === "customer") {
  // Read-only view (#/customer/:id)
  p.viewCustomer.hidden = false;
  p.viewCustomerEdit.hidden = true;
  await showCustomerDetail(route.id);
} else if (route.view === "customerEdit") {
  // Edit view (#/customer/:id/edit)
  p.viewCustomer.hidden = true;
  p.viewCustomerEdit.hidden = false;
  await showCustomerEdit(route.id);
}
```

### 5.2 Press State Event Handling
Add event listeners to handle press states (`.is-pressed`) for banners and order cards:

```javascript
// Register press state handler on customer detail view
p.viewCustomer.addEventListener("pointerdown", (e) => {
  const target = e.target.closest(".cust-banner, .cust-nav-btn, .cust-order-card-wrap");
  if (target) target.classList.add("is-pressed");
});

p.viewCustomer.addEventListener("pointerup", clearPresses);
p.viewCustomer.addEventListener("pointercancel", clearPresses);
p.viewCustomer.addEventListener("pointerleave", clearPresses);

function clearPresses() {
  p.viewCustomer.querySelectorAll(".is-pressed").forEach(el => el.classList.remove("is-pressed"));
}
```

### 5.3 `renderCustomerReadOnly(customer)` Implementation Detail
Implement date formatting, upcoming fitting stage lookup, order card mapping, and DOM population:

```javascript
function renderCustomerReadOnly(customer) {
  // 1. Set Hero Title
  const nameElement = document.getElementById("custHeroName");
  nameElement.textContent = customer.name || "Unnamed Customer";

  // 2. Format & Display Wedding Date
  const weddingTextEl = document.getElementById("custWeddingText");
  if (customer.wedding_date) {
    const days = daysUntil(customer.wedding_date);
    const dateFormatted = formatShortDate(customer.wedding_date); // e.g., "9 Jan"
    const relText = days >= 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
    weddingTextEl.textContent = `${dateFormatted} (${relText})`;
  } else {
    weddingTextEl.textContent = "Not set";
  }

  // 3. Compute & Display Next Event
  const nextEvent = findNextEvent(customer, w.customerOrders, w.overview ? w.overview.eventsByCustomer[customer.id] : []);
  const nextLabelEl = document.getElementById("custNextLabel");
  const nextDateEl = document.getElementById("custNextDate");

  if (nextEvent) {
    nextLabelEl.textContent = `Next: ${nextEvent.what}`;
    const days = daysUntil(nextEvent.date);
    const dateFormatted = formatShortDate(nextEvent.date);
    nextDateEl.textContent = `${dateFormatted} (${days >= 0 ? `in ${days} days` : 'today'})`;
  } else {
    nextLabelEl.textContent = "Next event";
    nextDateEl.textContent = "No upcoming dates";
  }

  // 4. Render Orders Ledger
  const orders = w.customerOrders || [];
  const totalAmount = orders.reduce((sum, ord) => sum + computeTotal(ord.items), 0);

  document.getElementById("custOrdersCount").textContent = `${orders.length} order${orders.length === 1 ? '' : 's'}`;
  document.getElementById("custOrdersSum").textContent = formatRupiah(totalAmount);

  const orderListEl = document.getElementById("custOrderList");
  if (orders.length === 0) {
    orderListEl.innerHTML = '<div class="empty">No orders for this customer yet.</div>';
    return;
  }

  orderListEl.innerHTML = orders.map(ord => {
    const itemCount = (ord.items || []).length;
    const ordTotal = computeTotal(ord.items);
    const statusText = ord.status || "Draft";

    // Determine status badge class
    let statusClass = "cust-status--gray";
    if (statusText === "In production") statusClass = "cust-status--pink";
    else if (statusText === "Quote sent" || statusText === "Invoice sent") statusClass = "cust-status--blue";

    return `
      <a class="cust-order-card-wrap" href="#/order/${ord.id}">
        <div class="cust-order-card">
          <div class="cust-order-card__header">
            <span class="cust-order-card__title">${escapeHtml(ord.name || "Untitled order")}</span>
            <span class="cust-order-card__status ${statusClass}">${escapeHtml(statusText)}</span>
          </div>
          <div class="cust-order-card__footer">
            <span>${itemCount} item${itemCount === 1 ? '' : 's'}</span>
            <span>${formatRupiah(ordTotal)}</span>
          </div>
        </div>
        <div class="cust-order-card__rail"></div>
      </a>
    `;
  }).join("");
}
```

---

## 🛠️ 6. Agent Execution Roadmap

When an execution agent begins work, execute the following steps in sequence:

1. **Step 1: HTML Structure Update**
   - Open `index.html`.
   - Update `#viewCustomer` to match the exact HTML structure in Section 3.
   - Ensure `#viewCustomerEdit` contains the form elements and non-proceeding / reopen buttons.

2. **Step 2: CSS Styles Implementation**
   - Open `styles.css`.
   - Append the Customer Detail styling rules specified in Section 4.

3. **Step 3: JavaScript Implementation**
   - Open `app.js`.
   - Update `renderCustomerReadOnly()` as specified in Section 5.3.
   - Wire route transitions for `#/customer/:id` and `#/customer/:id/edit`.
   - Attach press-state listeners to `#viewCustomer`.

4. **Step 4: Automated Syntax & Manual Verification**
   - Perform syntax check on `app.js` and `styles.css`.
   - Test navigation (`#/customer/:id` and `#/customer/:id/edit`).
   - Confirm banner rendering, countdown math, order card status colors, and press states.
