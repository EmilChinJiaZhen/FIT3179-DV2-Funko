const embedOptions = {
  actions: false,
  renderer: "svg"
};

const visualisations = [
  ["#idiom01", "js/idiom01_top_licenses.json"],
  ["#idiom02", "js/idiom02_product_types_treemap.json"],
  ["#idiom12", "js/idiom12_license_product_type_chord.json"],

  ["#idiom03", "js/idiom03_release_timeline.json"],
  ["#idiom04", "js/idiom04_release_seasonality_heatmap.json"],
  ["#idiom05", "js/idiom05_product_mix_marimekko.json"],
  ["#idiom11", "js/idiom11_quarterly_license_rank_bump_chart.json"],

  ["#idiom06", "js/idiom06_exclusive_price_dumbbell.json"],
  ["#idiom14", "js/idiom14_product_price_exclusive_sankey.json"],
  ["#idiom15", "js/idiom15_product_type_price_raincloud.json"],
  ["#idiom17", "js/idiom17_license_price_ridgeline.json"],

  ["#idiom08", "js/idiom08_funko_search_interest_choropleth.json"],
  ["#idiom09", "js/idiom09_global_convention_map.json"],
  ["#idiom18", "js/idiom18_pop_culture_convention_attendance_proportional_symbol_map.json"]
];

visualisations.forEach(([selector, spec]) => {
  vegaEmbed(selector, spec, embedOptions).catch((error) => {
    console.error(`Failed to load ${spec}`, error);
  });
});


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

      const partialIconHtml = remainder > 0 ? `
        <span
          class="pictogram-chart__icon pictogram-chart__icon--half"
          style="--product-color: ${color}"
          aria-hidden="true"
          title="Incomplete final group: ${remainder} of ${unitValue} products"
        >
          ${icon}
          <span class="pictogram-chart__icon-fill">${icon}</span>
        </span>
      ` : "";

      return `
        <div class="pictogram-chart__category">
          <div class="pictogram-chart__label">${type}</div>
          <div class="pictogram-chart__icons">
            ${fullIconHtml}${partialIconHtml}
          </div>
          <div class="pictogram-chart__value">${count.toLocaleString()}</div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <h4 class="pictogram-chart__title">How Many Products Are in Each Product Type?</h4>
      <p class="pictogram-chart__subtitle">Top six product types by number of products</p>
      <div class="pictogram-chart__plot">
        ${categories}
      </div>
      <p class="pictogram-chart__legend">
        1 full icon = ${unitValue} products. A half icon marks an incomplete final group; the exact total is shown at right.</p>
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
