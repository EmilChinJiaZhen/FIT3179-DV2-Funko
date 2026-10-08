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
