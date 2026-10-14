const embedOptions = {
  actions: true,
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
    const embedResult = await vegaEmbed(container, spec, (["#idiom01","#idiom02","#idiom12","#idiom08","#idiom09","#idiom18","#idiom14","#idiom06","#idiom15","#idiom20","#idiom21","#idiom22"].includes(selector)) ? { ...embedOptions, tooltip: false } : embedOptions);
    if (selector === "#idiom01") setupLicenseShareTooltip(embedResult.view);
    if (selector === "#idiom02") setupTreemapDetailTooltip(embedResult.view);
    if (selector === "#idiom12") setupChordRelationshipTooltip(embedResult.view);
    if (["#idiom08","#idiom09","#idiom18"].includes(selector)) setupMapTooltip(embedResult.view, selector);
    if (["#idiom14","#idiom06","#idiom15","#idiom20","#idiom21","#idiom22"].includes(selector)) setupAnalyticsTooltip(embedResult.view, selector);
  } catch (error) {
    console.error(`Failed to load ${specPath}`, error);
  }
});






/* Pricing and Time tooltip cards, built from the marks' own data. */
function setupAnalyticsTooltip(view, selector) {
  const tip=document.createElement("div");
  tip.className="analytics-tooltip";
  tip.hidden=true;
  tip.setAttribute("role","tooltip");
  document.body.appendChild(tip);
  const productColors={"Pop!":"#4E79A7","Apparel":"#76B7B2","Keychains":"#F28E2B","Vinyl GOLD":"#957500","Plush":"#B07AA1","Board Games":"#777777"};
  const regionColors={"United States":"#5C4FA3","Europe":"#C05792","Other International":"#1F8C83"};
  const saleData={
    2021:1029.293,2022:1322.706,2023:1096.086,2024:1049.850,2025:908.209
  };
  const geo={
    2021:{"United States":743.846,"Europe":214.732,"Other International":70.715},
    2022:{"United States":966.324,"Europe":260.557,"Other International":95.825},
    2023:{"United States":755.620,"Europe":268.496,"Other International":71.970},
    2024:{"United States":681.986,"Europe":283.792,"Other International":84.072},
    2025:{"United States":546.328,"Europe":288.348,"Other International":73.533}
  };
  const add=(parent,tag,value,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    if(value!==undefined)el.textContent=String(value);
    parent.appendChild(el);return el;
  };
  const cash=value=>Number.isFinite(Number(value))?"$"+Number(value).toFixed(2):"—";
  const moneyM=value=>"$"+Number(value).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1})+"M";
  const signed=value=>(value>=0?"+":"")+value.toFixed(1)+"%";
  let current="";
  function makeCard(d) {
    tip.replaceChildren();
    tip.style.setProperty("--analytics-accent","#277A4D");
    const head=(name,desc)=>{
      add(tip,"strong",name,"analytics-tooltip__heading");
      if(desc)add(tip,"p",desc,"analytics-tooltip__subtitle");
    };
    const stat=(label,value,cls)=>{
      const box=add(tip,"div",undefined,"analytics-tooltip__stat");
      add(box,"span",label);add(box,"strong",value,cls);
      return box;
    };
    const row=(label,value)=>{
      const el=add(tip,"div",undefined,"analytics-tooltip__row");
      add(el,"span",label);add(el,"strong",value);
    };
    const bar=(value)=>{
      const track=add(tip,"div",undefined,"analytics-tooltip__track");
      const fill=add(track,"div",undefined,"analytics-tooltip__fill");
      fill.style.width=Math.max(0,Math.min(100,value))+"%";
    };
    if(selector==="#idiom20"){
      const year=Number(d.year), value=Number(d.SalesMillions);
      if(!Number.isFinite(year)||!Number.isFinite(value))return false;
      head(String(year),"Funko annual net sales");
      stat("Net sales (USD)",moneyM(value));
      if(saleData[year-1]){
        const change=100*(value/saleData[year-1]-1);
        row("Year-over-year change",signed(change));
        add(tip,"p",change<0?"Sales decreased from the previous year.":"Sales increased from the previous year.","analytics-tooltip__note");
      }else add(tip,"p","First year in the displayed series.","analytics-tooltip__note");
      return true;
    }
    if(selector==="#idiom21"){
      const year=Number(d.year),region=d.region;
      if(!geo[year]||!geo[year][region])return false;
      const value=geo[year][region],share=100*value/saleData[year];
      tip.style.setProperty("--analytics-accent",regionColors[region]||"#277A4D");
      head(region,"Regional sales in "+year);
      stat("Share of annual sales",share.toFixed(1)+"%");
      row("Regional net sales",moneyM(value));
      const base=100*geo[2021][region]/saleData[2021];
      row("Change from 2021",(share-base>=0?"+":"")+(share-base).toFixed(1)+" percentage points");
      bar(share);
      return true;
    }
    if(selector==="#idiom22"){
      const year=Number(d.yr)||2021,brand=d.reported_brand_category;
      const index=Number(d.index);
      const values=[["Core Collectible",d.coreM],["Loungefly",d.loungeflyM],["Other",d.otherM]];
      const found=values.find(([name])=>name===brand);
      tip.style.setProperty("--analytics-accent",brand==="Loungefly"?"#3A9C68":"#7f8997");
      head(brand||"All brand groups","Sales performance in "+year);
      if(found&&Number.isFinite(Number(found[1]))){
        stat("Net sales",moneyM(found[1]));
        if(Number.isFinite(index)){row("Sales index (2021 = 100)",index.toFixed(1));row("Change from 2021",signed(index-100));}
      }
      for(const [name,v] of values)if(Number.isFinite(Number(v)))row(name,moneyM(v));
      return true;
    }
    if(selector==="#idiom06"){
      if(!d.product_type)return false;
      tip.style.setProperty("--analytics-accent","#A47B00");
      head(d.product_type,"Exclusive vs. non-exclusive pricing");
      const exclusive=Number(d.Exclusive_Average);
      const regular=Number(d.No_Exclusive_Average);
      if(Number.isFinite(exclusive)&&Number.isFinite(regular)) {
        const compare=add(tip,"div",undefined,"analytics-tooltip__bar-chart");
        const maxValue=Math.max(exclusive,regular,1);
        const chart=add(compare,"div",undefined,"analytics-tooltip__bar-columns");
        for(const [label,value,color] of [["No exclusive tag",regular,"#B8B8B8"],["Exclusive-tagged",exclusive,"#C9A227"]]){
          const column=add(chart,"div",undefined,"analytics-tooltip__bar-column");
          add(column,"strong",cash(value),"analytics-tooltip__bar-value");
          const slot=add(column,"div",undefined,"analytics-tooltip__bar-slot");
          const rect=add(slot,"div",undefined,"analytics-tooltip__bar-rect");
          rect.style.height=(100*value/maxValue)+"%";
          rect.style.backgroundColor=color;
          add(column,"span",label,"analytics-tooltip__bar-category");
        }
        add(compare,"p","Average listed price (USD)","analytics-tooltip__bar-axis");
      }
      const diff=Number(d.Exclusive_Average)-Number(d.No_Exclusive_Average);
      if(Number.isFinite(diff))row("Exclusive premium",(diff>=0?"+":"-")+cash(Math.abs(diff)));
      if(d.Difference_Percent_Label)row("Relative difference",d.Difference_Percent_Label);
      return true;
    }
    if(selector==="#idiom15"){
      const type=d.ProductType;
      if(!type)return false;
      tip.style.setProperty("--analytics-accent",productColors[type]||"#A47B00");
      head(type,"Listed price distribution (USD)");
      if(Number.isFinite(Number(d.MedianPrice)))stat("Median listed price",cash(d.MedianPrice));
      if(Number.isFinite(Number(d.Q1))&&Number.isFinite(Number(d.Q3)))row("Middle 50% (Q1–Q3)",cash(d.Q1)+" – "+cash(d.Q3));
      if(Number.isFinite(Number(d.MinPrice)))row("Minimum",cash(d.MinPrice));
      if(Number.isFinite(Number(d.MaxPrice)))row("Maximum",cash(d.MaxPrice));
      if(d.ProductCount!=null)row("Products",Number(d.ProductCount).toLocaleString());
      if(d.title&&d.PriceValue!=null)row("Selected product",d.title+" · "+cash(d.PriceValue));
      return true;
    }
    if(selector==="#idiom14"){
      const group=d.ProductGroup||d.PriceBand||d.ExclusiveStatus;
      if(!group)return false;
      const type=d.ProductGroup;
      tip.style.setProperty("--analytics-accent",productColors[type]||"#A47B00");
      head(type||d.PriceBand||d.ExclusiveStatus,"Price pathway");
      if(d.PriceBand)row("Price band",d.PriceBand);
      if(d.ExclusiveStatus)row("Exclusive status",d.ExclusiveStatus);
      if(d.MinPrice!=null&&d.MaxPrice!=null)row("Price range",cash(d.MinPrice)+" – "+cash(d.MaxPrice));
      const count=d.FlowCount??d.ProductCount??d.Count;
      if(count!=null)stat("Products",Number(count).toLocaleString());
      if(d.SourceShare!=null)row("Share of source",(100*Number(d.SourceShare)).toFixed(1)+"%");
      if(d.TargetShare!=null)row("Share of target",(100*Number(d.TargetShare)).toFixed(1)+"%");
      return true;
    }
    return false;
  }
  view.addEventListener("mousemove",(event,item)=>{
    // These line charts have interactive points, but the connecting strokes
    // must not trigger the custom tooltip.
    if((selector==="#idiom20" || selector==="#idiom22") && item?.mark?.marktype!=="symbol"){
      tip.hidden=true;current="";return;
    }
    const d=item?.datum;
    if(!d){tip.hidden=true;current="";return;}
    const key=JSON.stringify(d);
    if(current!==key){current=key;if(!makeCard(d)){tip.hidden=true;return;}}
    tip.hidden=false;
    const bounds=tip.getBoundingClientRect(),gap=12;
    tip.style.left=Math.max(gap,Math.min(event.clientX+16,window.innerWidth-bounds.width-gap))+"px";
    tip.style.top=Math.max(gap,Math.min(event.clientY+16,window.innerHeight-bounds.height-gap))+"px";
  });
  view.addEventListener("mouseout",()=>{tip.hidden=true;current="";});
}

/* Simple map tooltips; no decorative search/globe icons or illustrative labels. */
function setupMapTooltip(view, selector) {
  const tip=document.createElement("div");
  tip.className="map-info-tooltip";
  tip.setAttribute("role","tooltip");
  tip.hidden=true;
  document.body.appendChild(tip);
  const colors={"North America":"#5C4FA3","Europe":"#C05792","Asia-Pacific":"#1F8C83"};
  const add=(parent,tag,txt,cls)=>{
    const el=document.createElement(tag);
    if(cls)el.className=cls;
    el.textContent=String(txt??"");
    parent.appendChild(el);
    return el;
  };
  let previous="";
  view.addEventListener("mousemove",(event,item)=>{
    const d=item?.datum||{};
    const label=selector==="#idiom08"?(d.Country||d.properties?.NAME):selector==="#idiom09"?d.Event:d.Country;
    if(!label){tip.hidden=true;previous="";return;}
    if(selector!=="#idiom09")tip.classList.remove("map-info-tooltip--event");
    const key=selector+"|"+label;
    if(key!==previous) {
      previous=key;tip.replaceChildren();
      add(tip,"strong",label,"map-info-tooltip__heading");
      if(selector==="#idiom08") {
        const val=Number(d.Interest);
        if(!Number.isFinite(val)){tip.hidden=true;return;}
        add(tip,"span","Relative search interest","map-info-tooltip__muted");
        add(tip,"strong",val.toFixed(0)+" / 100","map-info-tooltip__value");
        const bar=add(tip,"div","","map-info-tooltip__track");
        const fill=add(bar,"span","","map-info-tooltip__fill");
        fill.style.width=Math.min(100,Math.max(0,val))+"%";
        tip.style.setProperty("--map-color","#7E57C2");
        add(tip,"small","Relative index, not a percentage of people searching.","map-info-tooltip__muted");
      } else if(selector==="#idiom09") {
        tip.classList.add("map-info-tooltip--event");
        const subtitle=add(tip,"div",d.VerifiedType||"Verified Funko location","map-event__subtitle");
        const main=add(tip,"div","","map-event__details");
        const line=(kind,primary,secondary)=>{
          if(!primary)return;
          const row=add(main,"div","","map-event__row");
          const holder=document.createElement("span");
          holder.className="map-event__icon";
          const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
          svg.setAttribute("viewBox","0 0 24 24");
          svg.setAttribute("fill","none");
          svg.setAttribute("stroke","currentColor");
          svg.setAttribute("stroke-width","1.8");
          svg.setAttribute("stroke-linecap","round");
          svg.setAttribute("stroke-linejoin","round");
          const shapes=kind==="pin"?
            ["M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z","M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5"]:
            kind==="calendar"?
            ["M4 6h16v15H4z","M8 3v6","M16 3v6","M4 11h16"]:
            ["M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0","m8.5 12 2.5 2.5 4.5-5"];
          for(const d of shapes){
            const p=document.createElementNS("http://www.w3.org/2000/svg","path");
            p.setAttribute("d",d);
            svg.appendChild(p);
          }
          holder.appendChild(svg);
          row.appendChild(holder);
          const text=document.createElement("div");
          add(text,"strong",primary);
          if(secondary)add(text,"span",secondary);
          row.appendChild(text);
        };
        line("pin",d.Venue||[d.City,d.Country].filter(Boolean).join(", "),d.Venue?[d.City,d.Country].filter(Boolean).join(", "):"");
        line("calendar",d.Dates);
        line("verify",d.Verification);
        add(tip,"p","Funko's participation and event details are shown for the selected location.","map-event__footer");
      } else {
        tip.style.setProperty("--map-color",colors[d.Region]||"#5C4FA3");
        if(d.Region)add(tip,"span",d.Region,"map-info-tooltip__muted");
        const metrics=add(tip,"div","","map-info-tooltip__metrics");
        for(const [value,label] of [[d.ProductCount,"Product records"],[d.LicenseCount,"Verified mapped licenses"]]) {
          const cell=add(metrics,"div","");
          add(cell,"strong",Number(value||0).toLocaleString());
          add(cell,"span",label);
        }
        if(d.CountryRank!=null) {
          const rank=add(tip,"p","","map-info-tooltip__rank");
          add(rank,"strong","Ranked #"+d.CountryRank);
          rank.append(" by product records among mapped countries.");
        }
      }
    }
    tip.hidden=false;
    const rect=tip.getBoundingClientRect(),gap=12;
    tip.style.left=Math.max(gap,Math.min(event.clientX+16,window.innerWidth-rect.width-gap))+"px";
    tip.style.top=Math.max(gap,Math.min(event.clientY+16,window.innerHeight-rect.height-gap))+"px";
  });
  view.addEventListener("mouseout",()=>{tip.hidden=true;previous="";});
}

/* Relationship strength tooltip for hovered chord ribbons. */
function setupChordRelationshipTooltip(view) {
  const palette = {"Pop!":"#4E79A7","Apparel":"#76B7B2","Keychains":"#F28E2B","Vinyl GOLD":"#EDC948","Plush":"#B07AA1","Board Games":"#7F7F7F"};
  const tip = document.createElement("div");
  tip.className = "chord-relationship-tooltip";
  tip.setAttribute("role", "tooltip");
  tip.hidden = true;
  document.body.appendChild(tip);
  let previous = "";
  const make = (tag,cls,txt) => {
    const el=document.createElement(tag);
    if(cls) el.className=cls;
    if(txt!==undefined) el.textContent=txt;
    return el;
  };
  function display(d,event) {
    const license=d.license, type=d.product_type;
    const count=Number(d.Connection_Count), share=Number(d.License_Share);
    if(!license || !type || !Number.isFinite(count) || !Number.isFinite(share)) { tip.hidden=true; previous=""; return; }
    const key=license+"|"+type;
    if(previous!==key) {
      previous=key; tip.replaceChildren();
      tip.style.setProperty("--chord-accent",palette[type]||"#607D8B");
      const head=make("div","chord-relationship-tooltip__head");
      head.append(make("strong",null,license+" ↔ "+type),make("span",null,"License–product type relationship"));
      const metrics=make("div","chord-relationship-tooltip__metrics");
      const num=make("div",null); num.append(make("strong",null,count.toLocaleString()),make("span",null,"Linked products"));
      const pct=make("div",null); pct.append(make("strong",null,(share*100).toFixed(1)+"%"),make("span",null,"Share of displayed "+license+" links"));
      metrics.append(num,pct);
      const label=make("div","chord-relationship-tooltip__bar-label");
      label.append(make("span",null,license+" products represented by "+type),make("b",null,(share*100).toFixed(1)+"%"));
      const bar=make("div","chord-relationship-tooltip__bar");
      const fill=make("div","chord-relationship-tooltip__fill");
      fill.style.width=(Math.min(100,Math.max(0,share*100)))+"%";bar.append(fill);
      const foot=make("p","chord-relationship-tooltip__foot","Wider ribbons represent more linked products.");
      tip.append(head,metrics,label,bar,foot);
    }
    tip.hidden=false;
    const rect=tip.getBoundingClientRect(),gap=12;
    tip.style.left=Math.max(gap,Math.min(event.clientX+16,innerWidth-rect.width-gap))+"px";
    tip.style.top=Math.max(gap,Math.min(event.clientY+16,innerHeight-rect.height-gap))+"px";
  }
  view.addEventListener("mousemove",(event,item)=>display(item?.datum||{},event));
  view.addEventListener("mouseout",()=>{tip.hidden=true;previous="";});
}

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
      head.append(text);
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
          data-product-type="${type}"
          data-remainder="${remainder}"
          data-unit="${unitValue}"
          tabindex="0"
          role="img"
          aria-label="${type}: incomplete final group of ${remainder} out of ${unitValue} products"
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

    // HTML pictogram: provide an equivalent three-dot export menu.
    const actionMenu = document.createElement("details");
    actionMenu.className = "pictogram-actions";
    const trigger = document.createElement("summary");
    trigger.textContent = "•••";
    trigger.setAttribute("aria-label", "Pictogram actions");
    actionMenu.appendChild(trigger);
    const exportLink = document.createElement("a");
    exportLink.textContent = "Download pictogram (SVG)";
    exportLink.href = "#";
    exportLink.addEventListener("click", async event => {
      event.preventDefault();
      actionMenu.open = false;
      const svgNs = "http://www.w3.org/2000/svg";
      const target = container;
      const bounds = target.getBoundingClientRect();
      const width = Math.ceil(bounds.width), height = Math.ceil(bounds.height);
      const svg = document.createElementNS(svgNs, "svg");
      svg.setAttribute("xmlns", svgNs);
      svg.setAttribute("width", width);
      svg.setAttribute("height", height);
      const foreign = document.createElementNS(svgNs, "foreignObject");
      foreign.setAttribute("width", "100%");
      foreign.setAttribute("height", "100%");
      const copy = target.cloneNode(true);
      copy.querySelector(".pictogram-actions")?.remove();
      const styleText = [...document.styleSheets].flatMap(sheet => {
        try { return [...sheet.cssRules].map(rule => rule.cssText); } catch { return []; }
      }).join("\n");
      const style = document.createElement("style");
      style.textContent = styleText;
      copy.prepend(style);
      copy.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      copy.style.background = "#f4f0e8";
      foreign.appendChild(copy);
      svg.appendChild(foreign);
      const blob = new Blob([new XMLSerializer().serializeToString(svg)], {type:"image/svg+xml;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const download = document.createElement("a");
      download.href=url;
      download.download="funko-product-type-pictogram.svg";
      download.click();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    });
    actionMenu.appendChild(exportLink);
    container.appendChild(actionMenu);

    // Replace the browser's delayed title popup with a styled, accessible
    // tooltip, shown only on the incomplete icon of each product row.
    document.querySelectorAll(".pictogram-partial-tooltip").forEach(el => el.remove());
    const partialTip = document.createElement("div");
    partialTip.className = "pictogram-partial-tooltip";
    partialTip.hidden = true;
    partialTip.setAttribute("role", "tooltip");
    document.body.appendChild(partialTip);
    const placeTip = (event, target) => {
      const bounds = partialTip.getBoundingClientRect();
      const anchor = target.getBoundingClientRect();
      const x = event?.clientX || anchor.left + anchor.width / 2;
      const y = event?.clientY || anchor.top + anchor.height / 2;
      const margin = 12;
      partialTip.style.left = Math.max(margin, Math.min(x + 15, window.innerWidth - bounds.width - margin)) + "px";
      partialTip.style.top = Math.max(margin, Math.min(y + 15, window.innerHeight - bounds.height - margin)) + "px";
    };
    const showTip = (target, event) => {
      const type = target.dataset.productType;
      const remainder = Number(target.dataset.remainder);
      const unit = Number(target.dataset.unit);
      if (!type || !remainder || !unit) return;
      partialTip.replaceChildren();
      partialTip.style.setProperty("--partial-color", PRODUCT_TYPE_COLORS[type] || "#7F7F7F");
      const title = document.createElement("strong");
      title.className = "pictogram-partial-tooltip__heading";
      title.textContent = type + " · Incomplete final group";
      const count = document.createElement("div");
      count.className = "pictogram-partial-tooltip__value";
      count.textContent = remainder + " of " + unit + " products";
      const track = document.createElement("div");
      track.className = "pictogram-partial-tooltip__track";
      const fill = document.createElement("span");
      fill.className = "pictogram-partial-tooltip__fill";
      fill.style.width = (remainder / unit * 100) + "%";
      track.appendChild(fill);
      const description = document.createElement("p");
      description.className = "pictogram-partial-tooltip__note";
      description.textContent = "This icon represents the remaining " + remainder + " products, not another full group of " + unit + ".";
      partialTip.append(title, count, track, description);
      partialTip.hidden = false;
      placeTip(event, target);
    };
    const hideTip = () => { partialTip.hidden = true; };
    container.querySelectorAll(".pictogram-chart__icon--half").forEach(icon => {
      icon.addEventListener("mouseenter", event => showTip(icon, event));
      icon.addEventListener("mousemove", event => placeTip(event, icon));
      icon.addEventListener("mouseleave", hideTip);
      icon.addEventListener("focus", () => showTip(icon));
      icon.addEventListener("blur", hideTip);
    });
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
