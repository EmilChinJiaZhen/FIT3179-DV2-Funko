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
      <p class="pictogram-chart__subtitle">Top six product types by number of products</p>
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


/* ---------- Interactive convention-linked product dot map ---------- */

const CONVENTION_COUNTRIES = {
  "United States": {
    projection: { type: "albersUsa" },
    jitter: 0.06,
    base: "us"
  },
  "Canada": {
    projection: { type: "mercator", center: [-106, 56], scale: 520 },
    jitter: 0.07,
    base: "naturalEarth"
  },
  "United Kingdom": {
    projection: { type: "mercator", center: [-3.2, 55.2], scale: 3000 },
    jitter: 0.035,
    base: "naturalEarth"
  },
  "Japan": {
    projection: { type: "mercator", center: [138.2, 37.2], scale: 1900 },
    jitter: 0.03,
    base: "naturalEarth"
  },
  "Philippines": {
    projection: { type: "mercator", center: [122.2, 12.3], scale: 2300 },
    jitter: 0.028,
    base: "naturalEarth"
  },
  "Singapore": {
    projection: { type: "mercator", center: [103.82, 1.35], scale: 65000 },
    jitter: 0.0025,
    base: "naturalEarth"
  }
};

const CONVENTION_LOOKUP = [
  { Convention: "Emerald City Comic Con", City: "Seattle", Region: "Washington", Country: "United States", Latitude: 47.6062, Longitude: -122.3321 },
  { Convention: "San Diego Comic-Con", City: "San Diego", Region: "California", Country: "United States", Latitude: 32.7157, Longitude: -117.1611 },
  { Convention: "Funko Fundays", City: "San Diego", Region: "California", Country: "United States", Latitude: 32.7157, Longitude: -117.1611 },
  { Convention: "WonderCon", City: "Anaheim", Region: "California", Country: "United States", Latitude: 33.8366, Longitude: -117.9143 },
  { Convention: "D23 Expo", City: "Anaheim", Region: "California", Country: "United States", Latitude: 33.8366, Longitude: -117.9143 },
  { Convention: "DesignerCon", City: "Anaheim", Region: "California", Country: "United States", Latitude: 33.8366, Longitude: -117.9143 },
  { Convention: "E3", City: "Los Angeles", Region: "California", Country: "United States", Latitude: 34.0522, Longitude: -118.2437 },
  { Convention: "Anime Expo", City: "Los Angeles", Region: "California", Country: "United States", Latitude: 34.0522, Longitude: -118.2437 },
  { Convention: "Los Angeles Comic Con", City: "Los Angeles", Region: "California", Country: "United States", Latitude: 34.0522, Longitude: -118.2437 },
  { Convention: "New York Comic Con", City: "New York City", Region: "New York", Country: "United States", Latitude: 40.7128, Longitude: -74.0060 },
  { Convention: "New York Toy Fair", City: "New York City", Region: "New York", Country: "United States", Latitude: 40.7128, Longitude: -74.0060 },
  { Convention: "Fan Expo Canada", City: "Toronto", Region: "Ontario", Country: "Canada", Latitude: 43.6532, Longitude: -79.3832 },
  { Convention: "MCM London Comic Con", City: "London", Region: "England", Country: "United Kingdom", Latitude: 51.5074, Longitude: -0.1278 },
  { Convention: "London Toy Fair", City: "London", Region: "England", Country: "United Kingdom", Latitude: 51.5074, Longitude: -0.1278 },
  { Convention: "Galactic Convention 2016", City: "London", Region: "England", Country: "United Kingdom", Latitude: 51.5074, Longitude: -0.1278 },
  { Convention: "Galactic Convention 2017", City: "Orlando", Region: "Florida", Country: "United States", Latitude: 28.5383, Longitude: -81.3792 },
  { Convention: "Galactic Convention 2019", City: "Chicago", Region: "Illinois", Country: "United States", Latitude: 41.8781, Longitude: -87.6298 },
  { Convention: "Tokyo Comic Con", City: "Chiba", Region: "Chiba", Country: "Japan", Latitude: 35.6074, Longitude: 140.1065 },
  { Convention: "AsiaPOP Comicon Manila", City: "Manila", Region: "Metro Manila", Country: "Philippines", Latitude: 14.5995, Longitude: 120.9842 },
  { Convention: "Singapore Toy Game Comic Convention", City: "Singapore", Region: "Singapore", Country: "Singapore", Latitude: 1.3521, Longitude: 103.8198 }
];

const CONVENTION_MATCH_EXPRESSION =
  "indexof(datum.SeriesLower, 'emerald city comic con') >= 0 || indexof(datum.SeriesLower, 'spring convention') >= 0 ? 'Emerald City Comic Con' : " +
  "indexof(datum.SeriesLower, 'san diego comic') >= 0 || indexof(datum.SeriesLower, 'sdcc') >= 0 || indexof(datum.SeriesLower, 'summer convention') >= 0 ? 'San Diego Comic-Con' : " +
  "indexof(datum.SeriesLower, 'new york comic con') >= 0 || indexof(datum.SeriesLower, 'nycc') >= 0 || indexof(datum.SeriesLower, 'fall convention') >= 0 ? 'New York Comic Con' : " +
  "indexof(datum.SeriesLower, 'wondercon') >= 0 ? 'WonderCon' : " +
  "indexof(datum.SeriesLower, 'd23') >= 0 ? 'D23 Expo' : " +
  "indexof(datum.SeriesLower, 'e3 201') >= 0 || datum.SeriesLower == 'e3' ? 'E3' : " +
  "indexof(datum.SeriesLower, 'fundays') >= 0 ? 'Funko Fundays' : " +
  "indexof(datum.SeriesLower, 'fan expo canada') >= 0 ? 'Fan Expo Canada' : " +
  "indexof(datum.SeriesLower, 'new york toy fair') >= 0 ? 'New York Toy Fair' : " +
  "indexof(datum.SeriesLower, 'london toy fair') >= 0 ? 'London Toy Fair' : " +
  "indexof(datum.SeriesLower, 'mcm') >= 0 && indexof(datum.SeriesLower, 'comic con') >= 0 ? 'MCM London Comic Con' : " +
  "indexof(datum.SeriesLower, 'tokyo comic con') >= 0 ? 'Tokyo Comic Con' : " +
  "indexof(datum.SeriesLower, 'asia pop comic') >= 0 || indexof(datum.SeriesLower, 'asiapop comicon') >= 0 || indexof(datum.SeriesLower, 'asia pop comicon') >= 0 ? 'AsiaPOP Comicon Manila' : " +
  "indexof(datum.SeriesLower, 'singapore toy') >= 0 || indexof(datum.SeriesLower, 'stgcc') >= 0 ? 'Singapore Toy Game Comic Convention' : " +
  "indexof(datum.SeriesLower, 'anime expo') >= 0 ? 'Anime Expo' : " +
  "indexof(datum.SeriesLower, 'los angeles comic con') >= 0 || indexof(datum.SeriesLower, 'la comic con') >= 0 ? 'Los Angeles Comic Con' : " +
  "indexof(datum.SeriesLower, 'designercon') >= 0 || indexof(datum.SeriesLower, 'designer con') >= 0 ? 'DesignerCon' : " +
  "indexof(datum.SeriesLower, 'galactic convention 2016') >= 0 || indexof(datum.SeriesLower, 'star wars celebration 2016') >= 0 ? 'Galactic Convention 2016' : " +
  "indexof(datum.SeriesLower, 'galactic convention 2017') >= 0 || indexof(datum.SeriesLower, 'star wars celebration 2017') >= 0 ? 'Galactic Convention 2017' : " +
  "indexof(datum.SeriesLower, 'galactic convention 2019') >= 0 || indexof(datum.SeriesLower, 'star wars celebration 2019') >= 0 ? 'Galactic Convention 2019' : 'Not convention'";

function conventionBaseLayers(country, config) {
  if (config.base === "us") {
    return [
      {
        data: {
          url: "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json",
          format: { type: "topojson", feature: "states" }
        },
        mark: { type: "geoshape", fill: "#D5D5D5", stroke: "#FFFFFF", strokeWidth: 0.9 }
      },
      {
        data: {
          url: "https://cdn.jsdelivr.net/npm/us-atlas@3/nation-10m.json",
          format: { type: "topojson", feature: "nation" }
        },
        mark: { type: "geoshape", fill: null, stroke: "#B9B9B9", strokeWidth: 0.8 }
      }
    ];
  }

  const mapName = country === "United States" ? "United States of America" : country;

  return [
    {
      data: {
        url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson",
        format: { type: "json", property: "features" }
      },
      transform: [{ filter: `datum.properties.NAME == '${mapName}'` }],
      mark: { type: "geoshape", fill: "#D5D5D5", stroke: "#FFFFFF", strokeWidth: 1.0 }
    },
    {
      data: {
        url: "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson",
        format: { type: "json", property: "features" }
      },
      transform: [{ filter: `datum.properties.adm0_name == '${mapName}'` }],
      mark: { type: "geoshape", fillOpacity: 0, stroke: "#FFFFFF", strokeWidth: 0.65, opacity: 0.95 }
    }
  ];
}

function buildConventionMapSpec(country) {
  const config = CONVENTION_COUNTRIES[country];

  const pointLayer = {
    data: {
      url: "https://raw.githubusercontent.com/EmilChinJiaZhen/FIT3179-DV2-Funko/refs/heads/main/data/funko_pop.csv",
      format: { type: "csv" }
    },
    transform: [
      { filter: "isValid(datum.series) && datum.series != ''" },
      { calculate: "replace(replace(replace(datum.series, '[', ''), ']', ''), '\\"', '')", as: "CleanSeries" },
      { calculate: "split(datum.CleanSeries, ';')", as: "SeriesArray" },
      { flatten: ["SeriesArray"], as: ["SeriesLabel"] },
      { calculate: "trim(datum.SeriesLabel)", as: "SeriesLabel" },
      { calculate: "lower(datum.SeriesLabel)", as: "SeriesLower" },
      { calculate: CONVENTION_MATCH_EXPRESSION, as: "Convention" },
      { filter: "datum.Convention != 'Not convention'" },
      {
        lookup: "Convention",
        from: {
          data: { values: CONVENTION_LOOKUP },
          key: "Convention",
          fields: ["City", "Region", "Country", "Latitude", "Longitude"]
        }
      },
      { filter: `datum.Country == '${country}'` },
      { calculate: "toNumber(datum.Longitude)", as: "BaseLongitude" },
      { calculate: "toNumber(datum.Latitude)", as: "BaseLatitude" },
      {
        joinaggregate: [{ op: "count", as: "ConventionCount" }],
        groupby: ["Convention"]
      },
      {
        window: [{ op: "row_number", as: "DotIndex" }],
        groupby: ["Convention"],
        sort: [{ field: "SeriesLabel", order: "ascending" }]
      },
      { calculate: "ceil(sqrt(datum.ConventionCount))", as: "GridWidth" },
      { calculate: "(datum.DotIndex - 1) % datum.GridWidth", as: "GridCol" },
      { calculate: "floor((datum.DotIndex - 1) / datum.GridWidth)", as: "GridRow" },
      { calculate: "(datum.GridWidth - 1) / 2", as: "GridCenterX" },
      { calculate: "(ceil(datum.ConventionCount / datum.GridWidth) - 1) / 2", as: "GridCenterY" },
      { calculate: `datum.BaseLongitude + (datum.GridCol - datum.GridCenterX) * ${config.jitter}`, as: "PlotLongitude" },
      { calculate: `datum.BaseLatitude - (datum.GridRow - datum.GridCenterY) * ${config.jitter}`, as: "PlotLatitude" }
    ],
    mark: {
      type: "circle",
      filled: true,
      size: 22,
      color: "#7D57C2",
      opacity: 0.72,
      stroke: "#FFFFFF",
      strokeWidth: 0.35
    },
    encoding: {
      longitude: { field: "PlotLongitude", type: "quantitative" },
      latitude: { field: "PlotLatitude", type: "quantitative" },
      tooltip: [
        { field: "Convention", type: "nominal", title: "Convention" },
        { field: "City", type: "nominal", title: "City" },
        { field: "Region", type: "nominal", title: "State / region" },
        { field: "SeriesLabel", type: "nominal", title: "Matched series" }
      ]
    }
  };

  return {
    $schema: "https://vega.github.io/schema/vega-lite/v6.json",
    width: "container",
    height: 390,
    title: {
      text: "Where Do Funko Convention-Associated Products Cluster?",
      subtitle: [
        `${country} · convention-linked product entries`,
        "Each dot represents exactly one product entry"
      ],
      anchor: "start",
      font: "Inter",
      fontSize: 20,
      fontWeight: "bold",
      subtitleFont: "Inter",
      subtitleFontSize: 13,
      subtitleFontWeight: "normal",
      subtitlePadding: 8
    },
    projection: config.projection,
    layer: [...conventionBaseLayers(country, config), pointLayer],
    config: {
      background: "transparent",
      view: { stroke: null, fill: null },
      title: {
        font: "Inter",
        fontWeight: "bold",
        subtitleFont: "Inter",
        subtitleFontWeight: "normal",
        fontSize: 20,
        subtitleFontSize: 13
      }
    },
    autosize: { type: "fit", contains: "padding", resize: true },
    background: "transparent"
  };
}

async function renderConventionDotMap() {
  const host = document.querySelector("#idiom09");
  if (!host) return;

  host.innerHTML = `
    <div class="convention-map-control">
      <label for="convention-country-select">Country</label>
      <select id="convention-country-select">
        ${Object.keys(CONVENTION_COUNTRIES)
          .map(country => `<option value="${country}">${country}</option>`)
          .join("")}
      </select>
    </div>
    <div id="convention-map-view"></div>
  `;

  const select = host.querySelector("#convention-country-select");
  const view = host.querySelector("#convention-map-view");

  async function draw() {
    const country = select.value;
    view.innerHTML = "";
    try {
      await vegaEmbed(view, buildConventionMapSpec(country), embedOptions);
    } catch (error) {
      console.error("Failed to render convention map", error);
      view.innerHTML = '<p class="map-error">Convention map could not be loaded.</p>';
    }
  }

  select.addEventListener("change", draw);
  await draw();
}

renderConventionDotMap();
