const embedOptions = {
  actions: false,
  renderer: "svg"
};


// Idiom 01 - Top licenses
vegaEmbed(
  "#idiom01",
  "js/idiom01_top_licenses.json",
  embedOptions
)
.catch(console.error);


// Idiom 03 - Product release timeline
vegaEmbed(
  "#idiom03",
  "js/idiom03_release_timeline.json",
  embedOptions
)
.catch(console.error);


// Idiom 04 - Release seasonality
vegaEmbed(
  "#idiom04",
  "js/idiom04_release_seasonality_heatmap.json",
  embedOptions
)
.catch(console.error);
