const embedOptions = {
  actions: false
};

vegaEmbed(
  "#idiom01",
  "js/idiom01_top_licenses.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom02",
  "js/idiom02_product_types_treemap.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom03",
  "js/idiom03_release_timeline.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom04",
  "js/idiom04_release_seasonality_heatmap.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom05",
  "js/idiom05_product_mix_marimekko.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom06",
  "js/idiom06_exclusive_price_dumbbell.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom08",
  "js/idiom08_funko_search_interest_choropleth.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom09",
  "js/idiom09_global_convention_map.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom10",
  "js/idiom10_funko_2026_event_dot_map.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom13",
  "js/idiom13_top100_price_exclusive_waffle.json",
  embedOptions
).catch(console.error);

vegaEmbed(
  "#idiom15",
  "js/idiom15_product_type_price_raincloud.json",
  embedOptions
).catch(console.error);
