/* =========================================================
   HerCycle – script.js
   Plain (vanilla) JavaScript – no frameworks, no backend.
   Data is saved in the browser using localStorage.

   Table of contents
   1. Settings & sample data
   2. Small helper functions
   3. Saving & loading data (localStorage)
   4. Navigation (switching between "pages")
   5. Browse Resources (cards, search, filters)
   6. Resource details modal & "I'm Interested"
   7. List a Resource form
   8. Savings Calculator
   9. Impact Dashboard
   10. Start-up code
   ========================================================= */


/* =========================================================
   1. SETTINGS & SAMPLE DATA
   ========================================================= */

// Keys used to store things in localStorage
const STORAGE_KEYS = {
  listings: "hercycle_listings",
  stats: "hercycle_stats",
  interests: "hercycle_interests"
};

// Categories (and an emoji used as the picture placeholder)
const CATEGORIES = {
  "Tailoring & Textiles": "🧵",
  "Food & Baking": "🍰",
  "Crafts & Art": "🎨",
  "Packaging": "📦",
  "Beauty & Wellness": "💆",
  "Other": "🛠️"
};

// Assumption used on the Impact Dashboard (clearly explained to the user)
const WASTE_KG_PER_REUSED_RESOURCE = 3;

// Starting (fictional) statistics for the demo
const DEFAULT_STATS = {
  reused: 14,     // demo number of resources reused
  saved: 18500    // demo amount of money saved in ₹
};

// Fictional sample listings for the prototype
const SAMPLE_LISTINGS = [
  {
    id: "demo-1", name: "Sewing machine", category: "Tailoring & Textiles",
    description: "Sturdy semi-automatic sewing machine, great for starting a tailoring or alteration business from home. Includes basic bobbins.",
    price: 500, unit: "month", type: "Rent", location: "Janakpuri, Delhi", image: "", demo: true
  },
  {
    id: "demo-2", name: "Fabric scraps bundle", category: "Tailoring & Textiles",
    description: "Colourful cotton and silk offcuts. Perfect for patchwork, scrunchies, potli bags and small craft products.",
    price: 150, unit: "bundle", type: "Buy", location: "Lajpat Nagar, Delhi", image: "", demo: true
  },
  {
    id: "demo-3", name: "Baking equipment set", category: "Food & Baking",
    description: "Oven-safe trays, mixing bowls, whisks and cake tins. Ideal for trying out a home bakery before investing.",
    price: 300, unit: "day", type: "Rent", location: "Dwarka, Delhi", image: "", demo: true
  },
  {
    id: "demo-4", name: "Reusable packaging", category: "Packaging",
    description: "Clean jars, cloth pouches and sturdy boxes for packing homemade food, candles and gifts.",
    price: 100, unit: "bundle", type: "Buy", location: "Rohini, Delhi", image: "", demo: true
  },
  {
    id: "demo-5", name: "Craft tools kit", category: "Crafts & Art",
    description: "Scissors, glue guns, cutters, brushes and measuring tools for handmade jewellery and decor.",
    price: 200, unit: "week", type: "Rent", location: "Noida Sector 62", image: "", demo: true
  },
  {
    id: "demo-6", name: "Embroidery hoops & thread box", category: "Tailoring & Textiles",
    description: "Assorted wooden hoops and a box of thread. Free to borrow for a few days, please return it clean.",
    price: 0, unit: "item", type: "Borrow", location: "Pitampura, Delhi", image: "", demo: true
  },
  {
    id: "demo-7", name: "Display shelf (foldable)", category: "Other",
    description: "Light foldable shelf for exhibition stalls and pop-up markets. Gently used.",
    price: 1200, unit: "item", type: "Buy", location: "Gurugram Sector 14", image: "", demo: true
  },
  {
    id: "demo-8", name: "Hair & mehendi starter kit", category: "Beauty & Wellness",
    description: "Cones, stencils, mixing bowls and a small cart organizer for beginners offering mehendi services.",
    price: 150, unit: "week", type: "Rent", location: "Karol Bagh, Delhi", image: "", demo: true
  }
];


/* =========================================================
   2. SMALL HELPER FUNCTIONS
   ========================================================= */

// Shortcuts so we type less
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Make text safe before putting it inside HTML (prevents HTML injection)
function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Format a number as Indian rupees, e.g. 18500 -> ₹18,500
function formatINR(amount) {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}

// Turn a listing into price text, e.g. { main: "₹500", unit: "/month" }
function getPriceParts(listing) {
  if (Number(listing.price) === 0) {
    return { main: "Free", unit: listing.type === "Borrow" ? " to borrow" : "" };
  }
  const perTime = ["day", "week", "month"].includes(listing.unit);
  return {
    main: formatINR(listing.price),
    unit: perTime ? "/" + listing.unit : " per " + listing.unit
  };
}

// Make Lucide icons appear (safe even if the icon library failed to load)
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// Show a small message at the bottom of the screen
let toastTimer;
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

// Which colour tone a card picture gets (just for variety)
function toneFor(listing) {
  const keys = Object.keys(CATEGORIES);
  const index = keys.indexOf(listing.category);
  return "tone-" + (((index < 0 ? 0 : index) % 4) + 1);
}

// Build the picture area of a card / modal (emoji placeholder + optional image)
function mediaHTML(listing) {
  const emoji = CATEGORIES[listing.category] || "🛠️";
  const demoTag = listing.demo ? '<span class="demo-tag">Demo listing</span>' : "";
  // If the image fails to load, the "onerror" removes it and the emoji shows instead
  const img = listing.image
    ? `<img src="${escapeHTML(listing.image)}" alt="${escapeHTML(listing.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
    : "";
  return `<div class="card-media ${toneFor(listing)}">
            <span class="media-emoji" aria-hidden="true">${emoji}</span>
            ${img}${demoTag}
          </div>`;
}


/* =========================================================
   3. SAVING & LOADING DATA (localStorage)
   ========================================================= */

// Read something from localStorage (returns "fallback" if missing or broken)
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

// Save something to localStorage
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    showToast("Could not save data in this browser.");
  }
}

// The app's data lives in these variables while the page is open
let listings = loadData(STORAGE_KEYS.listings, null);
if (!Array.isArray(listings)) {
  listings = SAMPLE_LISTINGS.map((item) => ({ ...item })); // copy of the samples
  saveData(STORAGE_KEYS.listings, listings);
}

let stats = loadData(STORAGE_KEYS.stats, null);
if (!stats || typeof stats.reused !== "number" || typeof stats.saved !== "number") {
  stats = { ...DEFAULT_STATS };
  saveData(STORAGE_KEYS.stats, stats);
}

let interests = loadData(STORAGE_KEYS.interests, []);
if (!Array.isArray(interests)) interests = [];

// Current filter choices on the Browse page
const filters = { search: "", category: "all", type: "all" };


/* =========================================================
   4. NAVIGATION (switching between "pages")
   The site is one HTML file. Each "page" is a <section class="view">.
   The part after # in the web address decides which one is shown.
   ========================================================= */

const VIEWS = ["home", "browse", "list", "calculator", "impact"];

function showView(name) {
  if (!VIEWS.includes(name)) name = "home";

  // Show only the chosen view
  $$(".view").forEach((section) => {
    section.classList.toggle("active", section.id === "view-" + name);
  });

  // Highlight the matching navigation link
  $$(".site-nav a").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === name);
  });

  // Close the mobile menu and jump to the top
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: "auto" });

  // Refresh the content of pages that show saved data
  if (name === "browse") renderBrowse();
  if (name === "impact") renderImpact();
  if (name === "home") renderHomeStats();
  if (name === "calculator") calculateSavings();

  refreshIcons();
}

function handleRoute() {
  const name = window.location.hash.replace("#", "") || "home";
  showView(name);
}

// Mobile menu open / close
function closeMobileMenu() {
  $("#site-nav").classList.remove("open");
  const toggle = $("#menu-toggle");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
}

function setupNavigation() {
  window.addEventListener("hashchange", handleRoute);

  $("#menu-toggle").addEventListener("click", () => {
    const nav = $("#site-nav");
    const isOpen = nav.classList.toggle("open");
    $("#menu-toggle").setAttribute("aria-expanded", String(isOpen));
    $("#menu-toggle").setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });
}

// Go to a view from JavaScript
function goTo(viewName) {
  if (window.location.hash === "#" + viewName) {
    showView(viewName); // same hash: hashchange will not fire, so refresh manually
  } else {
    window.location.hash = viewName;
  }
}


/* =========================================================
   5. BROWSE RESOURCES (cards, search, filters)
   ========================================================= */

// Fill the category drop-downs (filter on Browse page + form on List page)
function fillCategoryOptions() {
  const filterSelect = $("#category-filter");
  const formSelect = $("#f-category");
  Object.keys(CATEGORIES).forEach((category) => {
    filterSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`);
    formSelect.insertAdjacentHTML("beforeend", `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`);
  });
}

// Which listings match the current search + filters?
function getFilteredListings() {
  const text = filters.search.trim().toLowerCase();
  return listings.filter((item) => {
    const matchesText =
      !text ||
      item.name.toLowerCase().includes(text) ||
      item.description.toLowerCase().includes(text) ||
      item.location.toLowerCase().includes(text) ||
      item.category.toLowerCase().includes(text);
    const matchesCategory = filters.category === "all" || item.category === filters.category;
    const matchesType = filters.type === "all" || item.type === filters.type;
    return matchesText && matchesCategory && matchesType;
  });
}

// Draw the cards
function renderBrowse() {
  const grid = $("#resource-grid");
  const emptyState = $("#empty-state");
  const results = getFilteredListings();

  // Newest user-added listings first, then the demo ones
  const ordered = [...results].reverse();

  grid.innerHTML = ordered.map((item) => {
    const price = getPriceParts(item);
    return `
      <article class="resource-card">
        ${mediaHTML(item)}
        <div class="card-body">
          <div class="card-tags">
            <span class="badge badge-${escapeHTML(item.type)}">${escapeHTML(item.type)}</span>
            <span class="badge badge-cat">${escapeHTML(item.category)}</span>
          </div>
          <h3>${escapeHTML(item.name)}</h3>
          <p class="card-loc"><i data-lucide="map-pin"></i> ${escapeHTML(item.location)}</p>
          <p class="card-desc">${escapeHTML(item.description)}</p>
          <div class="card-foot">
            <span class="price">${price.main}<small>${escapeHTML(price.unit)}</small></span>
            <button type="button" class="btn btn-primary btn-sm" data-action="details" data-id="${escapeHTML(item.id)}">View details</button>
          </div>
        </div>
      </article>`;
  }).join("");

  // Result count text
  const total = listings.length;
  $("#result-count").textContent =
    results.length === total
      ? `Showing all ${total} resource${total === 1 ? "" : "s"}`
      : `Showing ${results.length} of ${total} resources`;

  // Empty state
  const isEmpty = results.length === 0;
  emptyState.hidden = !isEmpty;
  grid.hidden = isEmpty;

  refreshIcons();
}

function setupBrowse() {
  // Search box
  $("#search-input").addEventListener("input", (event) => {
    filters.search = event.target.value;
    renderBrowse();
  });

  // Category drop-down
  $("#category-filter").addEventListener("change", (event) => {
    filters.category = event.target.value;
    renderBrowse();
  });

  // Rent / Borrow / Buy buttons
  $("#type-filter").addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (!chip) return;
    filters.type = chip.dataset.type;
    $$("#type-filter .chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderBrowse();
  });

  // "Clear filters" button in the empty state
  $("#reset-filters").addEventListener("click", resetFilters);

  // One click listener for all "View details" buttons (event delegation)
  $("#resource-grid").addEventListener("click", (event) => {
    const button = event.target.closest('[data-action="details"]');
    if (button) openModal(button.dataset.id);
  });
}

function resetFilters() {
  filters.search = "";
  filters.category = "all";
  filters.type = "all";
  $("#search-input").value = "";
  $("#category-filter").value = "all";
  $$("#type-filter .chip").forEach((c) => c.classList.toggle("active", c.dataset.type === "all"));
  renderBrowse();
}


/* =========================================================
   6. RESOURCE DETAILS MODAL & "I'M INTERESTED"
   ========================================================= */

let openListingId = null;     // which listing is open in the modal
let lastFocusedElement = null;

function openModal(id) {
  const item = listings.find((l) => l.id === id);
  if (!item) return;

  openListingId = id;
  lastFocusedElement = document.activeElement;
  renderModalContent(item);

  $("#modal").hidden = false;
  document.body.style.overflow = "hidden";
  $("#modal-close").focus();
}

function renderModalContent(item) {
  const price = getPriceParts(item);
  const alreadyInterested = interests.some((i) => i.listingId === item.id);

  // Only monthly / weekly / daily rentals can be sent to the calculator
  const canCompare = item.type === "Rent" && Number(item.price) > 0;

  const ownerText = item.demo
    ? "Fictional demo listing"
    : "Added by you in this browser";

  $("#modal-body").innerHTML = `
    ${mediaHTML(item)}
    <div class="modal-content">
      <div class="card-tags">
        <span class="badge badge-${escapeHTML(item.type)}">${escapeHTML(item.type)}</span>
        <span class="badge badge-cat">${escapeHTML(item.category)}</span>
      </div>
      <h2 id="modal-title">${escapeHTML(item.name)}</h2>
      <div class="modal-meta">
        <span><i data-lucide="map-pin"></i> ${escapeHTML(item.location)}</span>
        <span><i data-lucide="user"></i> ${ownerText}</span>
      </div>
      <span class="price modal-price">${price.main}<small>${escapeHTML(price.unit)}</small></span>
      <p>${escapeHTML(item.description)}</p>

      ${alreadyInterested
        ? `<div class="notice success"><strong>Interest recorded (simulated).</strong> You can see it on the Impact Dashboard.</div>`
        : ""}

      <div class="notice">
        <strong>Prototype notice:</strong> “I'm Interested” only creates a simulated request.
        No real payment, rental booking or transaction takes place, and the owner is not contacted.
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-primary" id="modal-interest" ${alreadyInterested ? "disabled" : ""}>
          <i data-lucide="${alreadyInterested ? "check" : "heart"}"></i>
          ${alreadyInterested ? "Interest recorded" : "I'm Interested"}
        </button>
        ${canCompare ? `<button type="button" class="btn btn-outline" id="modal-calc"><i data-lucide="calculator"></i> Compare with buying</button>` : ""}
        ${item.demo ? "" : `<button type="button" class="btn btn-danger" id="modal-delete"><i data-lucide="trash-2"></i> Remove my listing</button>`}
      </div>
    </div>`;

  // Hook up the modal buttons
  const interestBtn = $("#modal-interest");
  if (interestBtn && !alreadyInterested) {
    interestBtn.addEventListener("click", () => recordInterest(item));
  }
  const calcBtn = $("#modal-calc");
  if (calcBtn) calcBtn.addEventListener("click", () => sendToCalculator(item));
  const deleteBtn = $("#modal-delete");
  if (deleteBtn) deleteBtn.addEventListener("click", () => deleteListing(item.id));

  refreshIcons();
}

function closeModal() {
  $("#modal").hidden = true;
  document.body.style.overflow = "";
  openListingId = null;
  if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
    lastFocusedElement.focus();
  }
}

// Create a simulated interest request
function recordInterest(item) {
  interests.unshift({
    id: "i" + Date.now(),
    listingId: item.id,
    listingName: item.name,
    date: new Date().toISOString()
  });
  saveData(STORAGE_KEYS.interests, interests);
  renderModalContent(item);
  showToast("Interest recorded (simulated). No real booking was made.");
}

// Send a rental listing's price to the calculator
function sendToCalculator(item) {
  // Convert the rental price to an approximate monthly cost
  // (assumes the item is needed every day / week of the month)
  const multiplier = { month: 1, week: 4, day: 30 }[item.unit] || 1;
  $("#c-rent").value = Number(item.price) * multiplier;
  closeModal();
  goTo("calculator");
  const note = multiplier === 1
    ? "Monthly rent filled in from the listing."
    : `Monthly rent estimated as ${formatINR(item.price)} × ${multiplier} (${item.unit}s per month).`;
  showToast(note + " Now enter the price of buying new.");
  $("#c-buy").focus();
}

// Remove a listing the user added
function deleteListing(id) {
  const item = listings.find((l) => l.id === id);
  if (!item || item.demo) return;
  if (!window.confirm(`Remove "${item.name}" from your listings?`)) return;

  listings = listings.filter((l) => l.id !== id);
  saveData(STORAGE_KEYS.listings, listings);
  closeModal();
  renderBrowse();
  renderHomeStats();
  showToast("Listing removed.");
}

function setupModal() {
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-close-modal")) closeModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("#modal").hidden) closeModal();
  });
}


/* =========================================================
   7. LIST A RESOURCE FORM
   ========================================================= */

// Show or clear an error message under a field
function setFieldError(form, name, message) {
  const errorEl = form.querySelector(`[data-error-for="${name}"]`);
  if (!errorEl) return;
  errorEl.textContent = message || "";
  const field = errorEl.closest(".field");
  if (field) field.classList.toggle("invalid", Boolean(message));
}

function validateListingForm(form) {
  const data = {
    name: form.elements["name"].value.trim(),
    category: form.elements["category"].value,
    type: form.elements["type"].value,
    description: form.elements["description"].value.trim(),
    price: form.elements["price"].value.trim(),
    unit: form.elements["unit"].value,
    location: form.elements["location"].value.trim(),
    image: form.elements["image"].value.trim()
  };

  const errors = {};

  if (data.name.length < 3) errors.name = "Please enter a name (at least 3 characters).";
  if (!data.category) errors.category = "Please choose a category.";
  if (!data.type) errors.type = "Please choose Rent, Borrow or Buy.";
  if (data.description.length < 10) errors.description = "Please add a short description (at least 10 characters).";
  if (data.location.length < 2) errors.location = "Please enter a location.";

  const priceNumber = Number(data.price);
  if (data.price === "" || isNaN(priceNumber) || priceNumber < 0) {
    errors.price = "Please enter a price of 0 or more.";
  } else if (priceNumber === 0 && data.type !== "Borrow" && data.type !== "") {
    errors.price = "Price can only be 0 for items that are free to borrow.";
  }

  if (data.image && !/^https?:\/\/\S+$/i.test(data.image)) {
    errors.image = "Image link must start with http:// or https://";
  }

  // Show / clear the messages for every field
  ["name", "category", "type", "description", "price", "location", "image"].forEach((field) => {
    setFieldError(form, field, errors[field]);
  });

  return { data, isValid: Object.keys(errors).length === 0 };
}

 function setupListingForm() {
  const form = $("#listing-form");

  form.addEventListener("reset", () => {
    localStorage.removeItem(DRAFT_KEY);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const { data, isValid } = validateListingForm(form);
    if (!isValid) {
      showToast("Please fix the highlighted fields.");
      const firstInvalid = form.querySelector(".field.invalid input, .field.invalid select, .field.invalid textarea");
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    // Create the new listing and save it
    const newListing = {
      id: "user-" + Date.now(),
      name: data.name,
      category: data.category,
      description: data.description,
      price: Number(data.price),
      unit: data.unit,
      type: data.type,
      location: data.location,
      image: data.image,
      demo: false
    };
    listings.push(newListing);
    saveData(STORAGE_KEYS.listings, listings);

    form.reset();
    ["name", "category", "type", "description", "price", "location", "image"].forEach((f) => setFieldError(form, f, ""));

    // Make sure the new listing is visible on the Browse page
    resetFilters();
    showToast("Your resource was added!");
    goTo("browse");
  });

  // Clear error messages when the form is reset
  form.addEventListener("reset", () => {
    ["name", "category", "type", "description", "price", "location", "image"].forEach((f) => setFieldError(form, f, ""));
  });

  // Clear a field's error as soon as the user edits it
  form.addEventListener("input", (event) => {
    if (event.target.name) setFieldError(form, event.target.name, "");
  });
}


/* =========================================================
   8. SAVINGS CALCULATOR
   Formulas (as required):
     Total rental cost          = Monthly rental cost × Number of months
     Potential savings (rent)   = Purchase cost − Total rental cost
   Optional extra costs are only included if the user enters them.
   ========================================================= */

function readNumberInput(id, { min = 0, integer = false } = {}) {
  const input = $("#" + id);
  const raw = input.value.trim();
  const value = Number(raw);
  let message = "";

  if (raw === "" || isNaN(value)) message = "Please enter a number.";
  else if (value < min) message = min > 0 ? `Must be at least ${min}.` : "Cannot be negative.";
  else if (integer && !Number.isInteger(value)) message = "Please enter a whole number.";

  setFieldError($("#calc-form"), id, message);
  return { value, valid: message === "" };
}

function calculateSavings() {
  const buy = readNumberInput("c-buy", { min: 0.01 });
  const rent = readNumberInput("c-rent", { min: 0.01 });
  const months = readNumberInput("c-months", { min: 1, integer: true });
  const buyExtra = readNumberInput("c-buyextra", { min: 0 });
  const rentExtra = readNumberInput("c-rentextra", { min: 0 });

  const allValid = [buy, rent, months, buyExtra, rentExtra].every((x) => x.valid);

  $("#calc-empty").hidden = allValid;
  $("#calc-results").hidden = !allValid;
  if (!allValid) return;

  // ----- The calculation -----
  const totalBuy = buy.value + buyExtra.value;
  const totalRent = rent.value * months.value + rentExtra.value;
  const difference = totalBuy - totalRent; // positive = renting saves money

  // ----- Show the numbers -----
  $("#calc-buy-total").textContent = formatINR(totalBuy);
  $("#calc-rent-total").textContent = formatINR(totalRent);
  $("#bar-buy-val").textContent = formatINR(totalBuy);
  $("#bar-rent-val").textContent = formatINR(totalRent);

  const verdict = $("#calc-verdict");
  verdict.className = "verdict";
  let verdictText;

  if (difference > 0) {
    $("#calc-savings-label").textContent = "Potential savings from renting";
    $("#calc-savings").textContent = formatINR(difference);
    verdict.classList.add("good");
    verdictText = `Renting is cheaper for ${months.value} month${months.value === 1 ? "" : "s"}. You could save about ${formatINR(difference)}.`;
  } else if (difference < 0) {
    $("#calc-savings-label").textContent = "Additional cost of renting";
    $("#calc-savings").textContent = formatINR(Math.abs(difference));
    verdict.classList.add("bad");
    verdictText = `Buying is cheaper for ${months.value} month${months.value === 1 ? "" : "s"}. Renting would cost about ${formatINR(Math.abs(difference))} more.`;
  } else {
    $("#calc-savings-label").textContent = "Difference";
    $("#calc-savings").textContent = formatINR(0);
    verdict.classList.add("same");
    verdictText = "Both options cost the same for this period.";
  }
  verdict.innerHTML = `<i data-lucide="${difference > 0 ? "trending-down" : difference < 0 ? "shopping-cart" : "equal"}"></i><span>${verdictText}</span>`;

  // ----- Bar chart: widths are relative to the bigger cost -----
  const biggest = Math.max(totalBuy, totalRent, 1);
  $("#bar-buy").style.width = (totalBuy / biggest) * 100 + "%";
  $("#bar-rent").style.width = (totalRent / biggest) * 100 + "%";

  // ----- Break-even point: when renting stops being cheaper -----
  const breakEvenMonths = (totalBuy - rentExtra.value) / rent.value;
  const breakEvenEl = $("#calc-breakeven");
  if (breakEvenMonths > 0) {
    breakEvenEl.textContent =
      `Break-even: using your figures, renting costs the same as buying after about ${breakEvenMonths.toFixed(1)} months. ` +
      `If you need the equipment for longer, buying becomes cheaper.`;
  } else {
    breakEvenEl.textContent = "Break-even: renting costs more than buying from the very first month with these figures.";
  }

  refreshIcons();
}

function setupCalculator() {
  const form = $("#calc-form");
  form.addEventListener("input", calculateSavings);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateSavings();
  });
}


/* =========================================================
   9. IMPACT DASHBOARD
   ========================================================= */

// Estimated waste diverted, using the stated assumption (kg per reused resource)
function estimateWasteKg() {
  return stats.reused * WASTE_KG_PER_REUSED_RESOURCE;
}

// Home page "demo" statistics
function renderHomeStats() {
  $("#home-stat-listed").textContent = listings.length;
  $("#home-stat-reused").textContent = stats.reused;
  $("#home-stat-saved").textContent = formatINR(stats.saved);
  $("#home-stat-waste").textContent = estimateWasteKg().toLocaleString("en-IN") + " kg";
}

// Fill the "resource" drop-down in the simulation form
function fillSimulationOptions() {
  const select = $("#sim-listing");
  const previous = select.value;
  select.innerHTML = '<option value="">Select a resource</option>' +
    listings.map((l) => {
      const price = getPriceParts(l);
      return `<option value="${escapeHTML(l.id)}">${escapeHTML(l.name)} (${escapeHTML(l.type)}, ${escapeHTML(price.main + price.unit)})</option>`;
    }).join("");
  if (previous && listings.some((l) => l.id === previous)) select.value = previous;
}

function renderInterestList() {
  const list = $("#interest-list");
  $("#interest-empty").hidden = interests.length > 0;
  list.innerHTML = interests.slice(0, 6).map((entry) => {
    const date = new Date(entry.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return `<li>
              <span><strong>${escapeHTML(entry.listingName)}</strong><br><small>${escapeHTML(date)}</small></span>
              <span class="sim-tag">Simulated</span>
            </li>`;
  }).join("");
}

function renderImpact() {
  $("#imp-listed").textContent = listings.length;
  $("#imp-reused").textContent = stats.reused;
  $("#imp-saved").textContent = formatINR(stats.saved);
  $("#imp-waste").textContent = estimateWasteKg().toLocaleString("en-IN") + " kg";
  $("#waste-assumption").textContent = WASTE_KG_PER_REUSED_RESOURCE;
  fillSimulationOptions();
  renderInterestList();
}

function setupImpact() {
  const form = $("#sim-form");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const listingId = $("#sim-listing").value;
    const newCostRaw = $("#sim-newcost").value.trim();
    const periodsRaw = $("#sim-periods").value.trim();
    const newCost = Number(newCostRaw);
    const periods = Number(periodsRaw);

    // Validate
    const listing = listings.find((l) => l.id === listingId);
    setFieldError(form, "sim-listing", listing ? "" : "Please choose a resource.");
    setFieldError(form, "sim-newcost", newCostRaw !== "" && newCost > 0 ? "" : "Enter a cost greater than 0.");
    setFieldError(form, "sim-periods", periodsRaw !== "" && Number.isInteger(periods) && periods >= 1 ? "" : "Enter a whole number, 1 or more.");
    if (form.querySelector(".field.invalid")) return;

    // Calculate: amount paid on HerCycle vs buying new
    const quantity = listing.type === "Buy" ? 1 : periods;
    const amountPaid = Number(listing.price) * quantity;
    const saving = Math.max(0, newCost - amountPaid);

    // Update the statistics and save them
    stats.reused += 1;
    stats.saved += saving;
    saveData(STORAGE_KEYS.stats, stats);

    renderImpact();
    $("#sim-result").textContent =
      `Recorded! Simulated saving: ${formatINR(newCost)} − ${formatINR(amountPaid)} = ${formatINR(saving)}. (Demo only, no real transaction.)`;
    showToast("Simulated reuse recorded.");

    form.reset();
    $("#sim-periods").value = 1;
  });

  form.addEventListener("input", (event) => {
    if (event.target.id) setFieldError(form, event.target.id, "");
  });

  // Reset everything back to the original demo data
  $("#reset-demo").addEventListener("click", () => {
    if (!window.confirm("Reset all demo data? This removes the listings you added and restores the sample numbers.")) return;
    listings = SAMPLE_LISTINGS.map((item) => ({ ...item }));
    stats = { ...DEFAULT_STATS };
    interests = [];
    saveData(STORAGE_KEYS.listings, listings);
    saveData(STORAGE_KEYS.stats, stats);
    saveData(STORAGE_KEYS.interests, interests);
    $("#sim-result").textContent = "";
    renderImpact();
    renderHomeStats();
    renderBrowse();
    showToast("Demo data has been reset.");
  });
}


/* =========================================================
   10. START-UP CODE
   Runs once when the page has loaded.
   ========================================================= */

// Gently fade sections in as they scroll into view (optional extra polish)
function setupScrollReveal() {
  // Nothing is hidden by default, so if this fails the page still works.
  if (!("IntersectionObserver" in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.animate(
          [{ opacity: 0, transform: "translateY(16px)" }, { opacity: 1, transform: "none" }],
          { duration: 500, easing: "ease-out" }
        );
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  $$(".info-card, .step, .benefit, .stats-panel, .cta, .impact-card").forEach((el) => observer.observe(el));
}

function init() {
  fillCategoryOptions();
  setupNavigation();
  setupBrowse();
  setupModal();
  setupListingForm() 
  setupCalculator();
  setupImpact();
  setupScrollReveal();
  renderHomeStats();
  handleRoute(); // show the right page for the current web address
  refreshIcons();
}

document.addEventListener("DOMContentLoaded", init);

/* ===== OFFLINE DRAFT PROTECTION ===== */

const DRAFT_KEY = "hercycle_offline_draft";

function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    showOfflineStatus();
  } catch (error) {
    console.error("Could not save draft:", error);
  }
}

function recoverDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);

    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Could not recover draft:", error);
  }

  return null;
}

function showOfflineStatus() {
  let status = document.getElementById("offline-status");

  if (!status) {
    status = document.createElement("div");
    status.id = "offline-status";
    status.setAttribute("role", "status");
    status.style.cssText =
      "position:fixed;bottom:18px;right:18px;z-index:9999;" +
      "padding:12px 18px;border-radius:12px;background:#e1f5e8;" +
      "color:#205d40;font-size:14px;box-shadow:0 4px 16px #0002;";
    document.body.appendChild(status);
  }

  status.textContent = navigator.onLine
    ? "✓ Your draft is saved on this device"
    : "📴 You're offline — your draft is saved on this device";
}

window.addEventListener("offline", showOfflineStatus);
window.addEventListener("online", showOfflineStatus);
