const embedOptions = {
  actions: false,
  renderer: "svg"
};

const visualisations = [
  ["#idiom01", "js/idiom01_top_licenses.json"],
  ["#idiom02", "js/idiom02_product_types_treemap.json"],
  ["#idiom12", "js/idiom12_license_product_type_chord.json"],

  ["#idiom20", "js/idiom20_annual_net_sales.json"],
  ["#idiom21", "js/idiom21_geographic_sales.json"],
  ["#idiom22", "js/idiom22_brand_sales_mix.json"],
  ["#idiom06", "js/idiom06_exclusive_price_dumbbell.json"],
  ["#idiom14", "js/idiom14_product_price_exclusive_sankey.json"],
  ["#idiom15", "js/idiom15_product_type_price_raincloud.json"],

  ["#idiom08", "js/idiom08_funko_search_interest_choropleth.json"],
  ["#idiom09", "js/idiom09_global_convention_map.json"],
  ["#idiom18", "js/idiom18_pop_culture_convention_attendance_proportional_symbol_map.json"]
];

// Render chart titles as normal HTML, outside the SVG. This keeps their
// typography consistent even when wide maps and custom diagrams are scaled.
visualisations.forEach(async ([selector, specPath]) => {
  const container = document.querySelector(selector);
  if (!container) return;

  try {
    const response = await fetch(specPath);
    if (!response.ok) throw new Error(`Could not load ${specPath}: ${response.status}`);
    const spec = await response.json();
    const title = spec.title;
    const titleText = typeof title === "string" ? title : title?.text;

    // The chord chart already has its title in HTML.
    if (titleText && !container.previousElementSibling?.classList.contains("pictogram-chart__title")) {
      const heading = document.createElement("h4");
      heading.className = "pictogram-chart__title idiom-html-title";
      heading.textContent = Array.isArray(titleText) ? titleText.join(" ") : titleText;
      container.before(heading);

      const subtitle = title && typeof title === "object" ? title.subtitle : null;
      if (subtitle) {
        const subtitleElement = document.createElement("p");
        subtitleElement.className = "idiom-html-subtitle";
        subtitleElement.textContent = Array.isArray(subtitle) ? subtitle.join(" ") : subtitle;
        container.before(subtitleElement);
      }
    }

    // Preserve the chart itself, but never draw a second title inside Vega SVG.
    delete spec.title;
    const embedResult = await vegaEmbed(container, spec, (selector === "#idiom01" || selector === "#idiom02") ? { ...embedOptions, tooltip: false } : embedOptions);
    if (selector === "#idiom01") setupLicenseShareTooltip(embedResult.view);
    if (selector === "#idiom02") setupTreemapDetailTooltip(embedResult.view);
  } catch (error) {
    console.error(`Failed to load ${specPath}`, error);
  }
});




/* Rich treemap tooltip; uses the same precomputed count/share/price fields
   as the original tooltip and does not modify the treemap's dataset. */
function setupTreemapDetailTooltip(view) {
  const colors = {
    "Pop!": "#4E79A7", "Apparel": "#76B7B2",
    "Keychains": "#F28E2B", "Vinyl GOLD": "#EDC948",
    "Plush": "#B07AA1", "Board Games": "#7F7F7F"
  };
  const tip = document.createElement("div");
  tip.className = "treemap-detail-tooltip";
  tip.hidden = true;
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);
  let currentKey = "";

  function position(event) {
    const box = tip.getBoundingClientRect();
    const gap = 14;
    tip.style.left = Math.max(gap, Math.min(event.clientX + 16, window.innerWidth - box.width - gap)) + "px";
    tip.style.top = Math.max(gap, Math.min(event.clientY + 16, window.innerHeight - box.height - gap)) + "px";
  }
  const money = value => value == null || !Number.isFinite(Number(value))
    ? "N/A" : "$" + Number(value).toFixed(2);
  function make(tag, className, content) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (content != null) el.textContent = content;
    return el;
  }
  function show(datum, event) {
    const type = datum.product_type;
    const license = datum.license;
    if (!type || !license || !Number.isFinite(Number(datum.ProductCount))) {
      tip.hidden = true;
      currentKey = "";
      return;
    }
    const key = type + "|" + license;
    if (currentKey !== key) {
      currentKey = key;
      tip.replaceChildren();
      const accent = colors[type] || "#607D8B";
      tip.style.setProperty("--treemap-accent", accent);
      const head = make("div", "treemap-detail-tooltip__head");
      const text = make("div", null);
      text.append(make("strong", "treemap-detail-tooltip__license", license),
        make("span", "treemap-detail-tooltip__type", type));
      head.append(text, make("span", "treemap-detail-tooltip__icon", "▦"));
      tip.append(head);
      const share = Math.min(100, Math.max(0, Number(datum.ShareWithinDisplayedType) * 100 || 0));
      const metrics = make("div", "treemap-detail-tooltip__metrics");
      const countBlock = make("div", null);
      countBlock.append(make("strong", null, Number(datum.ProductCount).toLocaleString()),
        make("span", null, "Products"));
      const shareBlock = make("div", null);
      shareBlock.append(make("strong", null, share.toFixed(1) + "%"),
        make("span", null, "Of displayed " + type + " group"));
      metrics.append(countBlock, shareBlock);
      tip.append(metrics);
      const label = make("div", "treemap-detail-tooltip__progress-label");
      label.append(make("span", null, "Share within displayed " + type),
        make("b", null, share.toFixed(1) + "%"));
      const track = make("div", "treemap-detail-tooltip__track");
      const fill = make("span", "treemap-detail-tooltip__fill");
      fill.style.width = share + "%";
      track.append(fill);
      tip.append(label, track);
      tip.append(make("div", "treemap-detail-tooltip__price-label", "Listed price (USD)"));
      const prices = make("div", "treemap-detail-tooltip__prices");
      for (const [label, key] of [["Minimum", "MinimumPrice"], ["Average", "AveragePrice"], ["Maximum", "MaximumPrice"]]) {
        const cell = make("div", null);
        cell.append(make("span", null, label), make("strong", null, money(datum[key])));
        prices.append(cell);
      }
      tip.append(prices);
    }
    tip.hidden = false;
    position(event);
  }
  view.addEventListener("mousemove", (event, item) => {
    const datum = item?.datum;
    if (datum?.license && datum?.product_type) show(datum, event);
    else { tip.hidden = true; currentKey = ""; }
  });
  view.addEventListener("mouseout", () => { tip.hidden = true; currentKey = ""; });
}

/* Share of all license-associated catalogue records (not product-type mix). */
let licenseSharesPromise;
function getLicenseShares() {
  if (!licenseSharesPromise) {
    licenseSharesPromise = fetch("data/data_cleaned_wide.csv")
      .then(response => {
        if (!response.ok) throw new Error("Unable to load catalogue records");
        return response.text();
      })
      .then(csv => {
        const records = vega.read(csv, { type: "csv" });
        const counts = new Map();
        let total = 0;
        for (const record of records) {
          const license = String(record.license ?? "").trim();
          if (!license) continue;
          counts.set(license, (counts.get(license) || 0) + 1);
          total++;
        }
        return { counts, total };
      });
  }
  return licenseSharesPromise;
}

function setupLicenseShareTooltip(view) {
  const tip = document.createElement("div");
  tip.className = "license-share-tooltip";
  tip.hidden = true;
  tip.setAttribute("role", "tooltip");
  document.body.appendChild(tip);

  let summary = null;
  let current = "";
  getLicenseShares().then(data => { summary = data; }).catch(console.error);

  function show(license, event) {
    if (!summary || !summary.total || !summary.counts.has(license)) return;
    const count = summary.counts.get(license);
    const share = 100 * count / summary.total;
    if (current !== license) {
      current = license;
      tip.replaceChildren();
      const heading = document.createElement("strong");
      heading.className = "license-share-tooltip__title";
      heading.textContent = license;
      const desc = document.createElement("p");
      desc.className = "license-share-tooltip__description";
      desc.textContent = "Share of all license-associated product records";
      const layout = document.createElement("div");
      layout.className = "license-share-tooltip__layout";
      const pie = document.createElement("div");
      pie.className = "license-share-tooltip__pie";
      pie.setAttribute("role", "img");
      pie.setAttribute("aria-label", license + ": " + share.toFixed(1) + "%; all other licenses: " + (100 - share).toFixed(1) + "%");
      pie.style.setProperty("--license-share", share + "%");
      // No native title attribute: it creates a second delayed browser tooltip.
      const stats = document.createElement("div");
      stats.className = "license-share-tooltip__stats";
      const value = document.createElement("strong");
      value.textContent = share.toFixed(1) + "%";
      const fraction = document.createElement("span");
      fraction.textContent = count.toLocaleString() + " of " + summary.total.toLocaleString() + " records";
      const other = document.createElement("small");
      other.textContent = "All other licenses: " + (100 - share).toFixed(1) + "%";
      stats.append(value, fraction, other);
      layout.append(pie, stats);
      tip.append(heading, desc, layout);
    }
    tip.hidden = false;
    const margin = 12;
    const rect = tip.getBoundingClientRect();
    tip.style.left = Math.max(margin, Math.min(event.clientX + 16, window.innerWidth - rect.width - margin)) + "px";
    tip.style.top = Math.max(margin, Math.min(event.clientY + 16, window.innerHeight - rect.height - margin)) + "px";
  }

  view.addEventListener("mousemove", (event, item) => {
    const license = item?.datum?.license;
    if (typeof license === "string" && license.trim()) show(license, event);
    else tip.hidden = true;
  });
  view.addEventListener("mouseout", () => { tip.hidden = true; current = ""; });
}

/* ---------- Dashboard KPIs from the same catalogue sample ---------- */
async function renderDashboardKpis() {
  const productEl = document.querySelector("#kpi-products");
  const licensesEl = document.querySelector("#kpi-licenses");
  const shareEl = document.querySelector("#kpi-pop-share");
  if (!productEl || !licensesEl || !shareEl) return;

  try {
    const response = await fetch("https://raw.githubusercontent.com/EmilChinJiaZhen/FIT3179-DV2-Funko/refs/heads/main/data/data_cleaned_wide.csv");
    if (!response.ok) throw new Error("Could not load catalogue KPI data");
    const rows = vega.read(await response.text(), { type: "csv" });
    const products = rows.filter(row => String(row.product_type || "").trim());
    const licenses = new Set(products.map(row => String(row.license || "").trim()).filter(Boolean));
    const pops = products.filter(row => String(row.product_type || "").trim() === "Pop!").length;
    productEl.textContent = products.length.toLocaleString();
    licensesEl.textContent = licenses.size.toLocaleString();
    shareEl.textContent = products.length ? (100 * pops / products.length).toFixed(1) + "%" : "—";
  } catch (error) {
    console.error("Failed to load dashboard KPIs", error);
    productEl.textContent = licensesEl.textContent = shareEl.textContent = "N/A";
  }
}
renderDashboardKpis();

/* ---------- Product type pictogram ---------- */

const PICTOGRAM_DATA_URL =
  "https://raw.githubusercontent.com/EmilChinJiaZhen/FIT3179-DV2-Funko/refs/heads/main/data/data_cleaned_wide.csv";

const PRODUCT_TYPE_COLORS = {
  "Pop!": "#4E79A7",
  "Apparel": "#76B7B2",
  "Keychains": "#F28E2B",
  "Vinyl GOLD": "#EDC948",
  "Plush": "#B07AA1",
  "Board Games": "#7F7F7F"
};

const PRODUCT_TYPE_ICONS = {
  "Pop!": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4.3"></circle>
      <path d="M7.3 19c.5-3.1 2.2-4.9 4.7-4.9s4.2 1.8 4.7 4.9"></path>
    </svg>`,
  "Apparel": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.2 5.4 10.2 4h3.6l2 1.4 3 1.6-1.8 3.5-2-1V20H9V9.5l-2 1L5.2 7l3-1.6Z"></path>
    </svg>`,
  "Keychains": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.3" cy="7.5" r="3.2"></circle>
      <path d="M10.6 9.8 14.8 14"></path>
      <rect x="14" y="13" width="5.3" height="6.2" rx="1.1"></rect>
    </svg>`,
  "Vinyl GOLD": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="9" r="4.3"></circle>
      <path d="M9.5 13.1 8.1 20l3.9-2 3.9 2-1.4-6.9"></path>
      <path d="M10.5 9h3"></path>
    </svg>`,
  "Plush": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8.2" cy="7.3" r="2"></circle>
      <circle cx="15.8" cy="7.3" r="2"></circle>
      <circle cx="12" cy="11.2" r="5"></circle>
      <circle cx="10.2" cy="10.5" r=".55"></circle>
      <circle cx="13.8" cy="10.5" r=".55"></circle>
      <path d="M10.5 13.1c1 .7 2 .7 3 0"></path>
    </svg>`,
  "Board Games": `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="2"></rect>
      <circle cx="9" cy="9" r=".8"></circle>
      <circle cx="15" cy="9" r=".8"></circle>
      <circle cx="9" cy="15" r=".8"></circle>
      <circle cx="15" cy="15" r=".8"></circle>
    </svg>`
};

async function renderProductTypePictogram() {
  const container = document.querySelector("#idiom19");
  if (!container) return;

  // One complete icon represents 25 products.
  // A final partially filled icon represents the exact remainder, so no rounding is used.
  const unitValue = 25;

  try {
    const response = await fetch(PICTOGRAM_DATA_URL);
    if (!response.ok) throw new Error(`CSV request failed: ${response.status}`);

    const csvText = await response.text();
    const rows = vega.read(csvText, { type: "csv" });

    const counts = new Map();

    rows.forEach((row) => {
      const type = (row.product_type || "").trim();
      if (!type) return;
      counts.set(type, (counts.get(type) || 0) + 1);
    });

    const topSix = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count]) => ({ type, count }));

    const categories = topSix.map(({ type, count }) => {
      const color = PRODUCT_TYPE_COLORS[type] || "#7F7F7F";
      const icon = PRODUCT_TYPE_ICONS[type] || PRODUCT_TYPE_ICONS["Board Games"];

      const fullIcons = Math.floor(count / unitValue);
      const remainder = count % unitValue;

      const fullIconHtml = Array.from({ length: fullIcons }, () => `
        <span
          class="pictogram-chart__icon"
          style="--product-color: ${color}"
          aria-hidden="true"
        >${icon}</span>
      `).join("");

      const halfIconHtml = remainder > 0 ? `
        <span
          class="pictogram-chart__icon pictogram-chart__icon--half"
          style="--product-color: ${color}"
          aria-hidden="true"
          title="Incomplete final group: ${remainder} of ${unitValue} products"
        >${icon}</span>
      ` : "";

      return `
        <div class="pictogram-chart__category">
          <div class="pictogram-chart__icons">
            ${fullIconHtml}${halfIconHtml}
          </div>
          <div class="pictogram-chart__value">${count.toLocaleString()}</div>
        </div>
      `;
    }).join("");

    const keyHtml = topSix.map(({ type }) => {
      const color = PRODUCT_TYPE_COLORS[type] || "#7F7F7F";
      const icon = PRODUCT_TYPE_ICONS[type] || PRODUCT_TYPE_ICONS["Board Games"];

      return `
        <span class="pictogram-chart__key-item">
          <span
            class="pictogram-chart__key-icon"
            style="--product-color: ${color}"
            aria-hidden="true"
          >${icon}</span>
          <span>${type}</span>
        </span>
      `;
    }).join("");

    container.innerHTML = `
      <h4 class="pictogram-chart__title">How Many Products Are in Each Product Type?</h4>
      <div class="pictogram-chart__key" aria-label="Product type legend">
        ${keyHtml}
      </div>
      <div class="pictogram-chart__plot">
        ${categories}
      </div>
      <p class="pictogram-chart__legend">
        1 full icon = ${unitValue} products. A half icon marks an incomplete final group; counts at right are exact.
      </p>
    `;
  } catch (error) {
    console.error("Failed to render product type pictogram", error);
    container.innerHTML = `
      <p class="pictogram-chart__error">
        Product type pictogram could not be loaded.
      </p>
    `;
  }
}

renderProductTypePictogram();
