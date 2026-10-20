const embedOptions = {
  actions: true,
  renderer: "svg"
};

const visualisations = [
  ["#idiom01", "js/idiom01_top_licenses.json"],
  ["#idiom02", "js/idiom02_product_types_treemap.json"],
  ["#idiom19", "js/idiom19_product_type_pictogram.json"],
  ["#idiom12", "js/idiom12_license_product_type_chord.json"],

  ["#idiom20", "js/idiom20_annual_net_sales.json"],
  ["#idiom21", "js/idiom21_geographic_sales.json"],
  ["#idiom22", "js/idiom22_brand_sales_mix.json"],
  ["#idiom06", "js/idiom06_exclusive_price_dumbbell.json"],
  ["#idiom14", "js/idiom14_product_price_exclusive_sankey.json"],
  ["#idiom15", "js/idiom15_product_type_price_raincloud.json"],

  ["#idiom08", "js/idiom08_funko_search_interest_choropleth.json"],
  ["#idiom09", "js/idiom09_global_convention_map.json"],
  ["#idiom18", "js/idiom18_pop_culture_convention_attendance_proportional_symbol_map.json"],
  ["#idiom23", "js/idiom23_documented_funko_trade_flow_map.json"]
];

// One shared product-type selection across Sections 1 and 3.
// A chart without the selected category stays unchanged, rather than dimming all marks.
const productViewConfig = {
  "#idiom02": {signal:"selectedTreeType", data:"product_types", field:"key"},
  "#idiom19": {signal:"selectedPictogramType", data:"types", field:"product_type"},
  "#idiom12": {signal:"selectedChord", data:"type_nodes", field:"product_type"},
  "#idiom14": {signal:"selectedFlow", data:"nodes1", field:"ProductGroup"},
  "#idiom15": {signal:"linkedPriceType", data:"stats", field:"ProductType"},
  "#idiom06": {signal:"linkedProductType", data:null, field:"product_type"}
};
const productViews = new Map();
let activeProductType = "";
function chartContainsType(selector, view, type) {
  if (!type) return true;
  const config = productViewConfig[selector];
  if (selector === "#idiom06") {
    // Vega-Lite compiles intermediate dataset names; inspect loaded rows instead
    // of assuming a particular generated name.
    try {
      const state = view.getState({data: () => true});
      const rows = Object.values(state.data || {}).flatMap(v =>
        Array.isArray(v) ? v : Array.isArray(v?.values) ? v.values : []);
      return rows.some(row => row.product_type === type);
    } catch (_) {
      return false;
    }
  }
  try {
    return view.data(config.data).some(row => row[config.field] === type);
  } catch (_) { return false; }
}
function syncProductView(selector, view) {
  const config = productViewConfig[selector];
  const target = chartContainsType(selector, view, activeProductType) ? activeProductType : "";
  view.signal(config.signal, target).runAsync().catch(console.error);
}
function updateLinkedProductType(type) {
  activeProductType = type || "";
  const select = document.getElementById("global-product-type");
  if (select) {
    // Keep the dropdown consistent with selections made directly on charts.
    if ([...select.options].some(option => option.value === activeProductType)) select.value = activeProductType;
    else select.value = "";
  }
  const resetButton = document.getElementById("global-product-reset");
  if (resetButton) resetButton.hidden = !activeProductType;
  for (const [selector, view] of productViews) syncProductView(selector, view);
}
function registerLinkedProductView(selector, view) {
  productViews.set(selector, view);
  syncProductView(selector, view);
}
document.getElementById("global-product-type")?.addEventListener("change", event => {
  updateLinkedProductType(event.target.value);
});
document.getElementById("global-product-reset")?.addEventListener("click", () => updateLinkedProductType(""));

// Screen-space flows deliberately use a schematic arc rather than a geographic
// great-circle: an Atlantic-centred world cannot show a continuous Pacific route.
// Keep the original, correctly-sized trade-map projection. Unlike bound
// projection signals, these controls re-embed with literal geographic values.
// This avoids Vega's projection auto-fit making the map tiny.
function setupTradeMapControls(container, view, flow) {
  const panel=document.getElementById("trade-map-navigation");
  if(!panel)return;
  const zoom=panel.querySelector("#trade-nav-zoom"),region=panel.querySelector("#trade-nav-region");
  const output=panel.querySelector("#trade-nav-value"),reset=panel.querySelector("#trade-nav-reset");
  const filter=panel.querySelector("#trade-nav-filter");
  const centers={World:[0,0],Americas:[-95,15],Europe:[15,48],"Asia-Pacific":[105,5]};
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const svg=container.querySelector("svg.marks");
  if(!svg)return;
  svg.classList.add("draggable-funko-map");
  let drag=null, pending=null, frame=null, running=false;
  const queue=()=>{
    if(frame!==null)return;
    frame=requestAnimationFrame(async()=>{
      frame=null;
      if(running||!pending)return;
      running=true;
      const next=pending;pending=null;
      try {
        view.signal("trade_pan_center",next.center);
        view.signal("trade_zoom",next.scale);
        await view.runAsync();
        flow.redraw();
      } catch(e){console.error("Trade map update failed",e);}
      finally{running=false;if(pending)queue();}
    });
  };
  const apply=()=>{
    if(output)output.textContent=zoom.value+"%";
    pending={center:view.signal("trade_pan_center"),scale:94*Number(zoom.value)/100};
    queue();
  };
  svg.addEventListener("pointerdown",event=>{
    if(event.button!==0||!event.isPrimary)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,center:[...view.signal("trade_pan_center")]};
    svg.setPointerCapture(event.pointerId);svg.classList.add("is-dragging");event.preventDefault();
  });
  svg.addEventListener("pointermove",event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const rect=svg.getBoundingClientRect(),factor=180/(Math.PI*(94*Number(zoom.value)/100));
    const ratio=Number(view.width())/Math.max(rect.width,1);
    const center=[clamp(drag.center[0]-(event.clientX-drag.x)*factor*ratio,-180,180),
                  clamp(drag.center[1]+(event.clientY-drag.y)*factor*ratio,-85,85)];
    pending={center,scale:94*Number(zoom.value)/100};queue();event.preventDefault();
  });
  const stop=event=>{if(!drag||event.pointerId!==drag.id)return;drag=null;svg.classList.remove("is-dragging");if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);};
  svg.addEventListener("pointerup",stop);svg.addEventListener("pointercancel",stop);
  zoom.addEventListener("input",apply);
  region.addEventListener("change",()=>{pending={center:centers[region.value]||centers.World,scale:94*Number(zoom.value)/100};queue();});
  reset.addEventListener("click",()=>{zoom.value="100";region.value="World";if(filter)filter.value="1";flow.applyFilter();pending={center:[0,0],scale:94};queue();apply();});
}

function setupAtlanticTradeFlows(container, spec, view) {
  const routeFilter = document.getElementById("trade-nav-filter");
  const routeElements = [];
  const applyRouteFilter = () => {
    const minimum = Number(routeFilter?.value || 1);
    for (const {count, line, hit, arrow} of routeElements) {
      const visible = count >= minimum;
      for (const element of [line, hit, arrow]) element.style.display = visible ? "" : "none";
    }
  };
  routeFilter?.addEventListener("change", applyRouteFilter);

  const base = container.querySelector("svg.marks");
  const records = spec.layer.find(layer => layer.data?.values?.some(v => v.route_id && v.role))?.data?.values;
  if (!base || !records) return;
  const width = Number(spec.width), height = Number(spec.height);
  const ns = "http://www.w3.org/2000/svg";
  const endpoints = new Map();
  for (const rec of records) {
    if (!endpoints.has(rec.route_id)) endpoints.set(rec.route_id, {});
    endpoints.get(rec.route_id)[rec.role === "Exporting country" ? "from" : "to"] = rec;
  }
  const routes = new Map();
  for (const pair of endpoints.values()) {
    if (!pair.from || !pair.to) continue;
    const key = pair.from.country + " → " + pair.to.country;
    if (!routes.has(key)) routes.set(key,{from:pair.from,to:pair.to,count:0});
    routes.get(key).count++;
  }
  const countryStats = new Map();
  for (const row of records) {
    if (!countryStats.has(row.country)) countryStats.set(row.country, {imports:0,exports:0});
    const entry=countryStats.get(row.country);
    if (row.role === "Importing country") entry.imports++;
    else entry.exports++;
  }
  const tip=document.createElement("div");
  tip.className="trade-map-tooltip";
  tip.hidden=true;
  tip.setAttribute("role","tooltip");
  document.body.appendChild(tip);
  const escapeText = value => String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const positionTip = event => {
    const x=event.clientX,y=event.clientY;
    const left=Math.max(12,Math.min(window.innerWidth-274,x+18));
    const top=(y+18+tip.offsetHeight>window.innerHeight) ? Math.max(12,y-tip.offsetHeight-14):y+18;
    tip.style.left=left+"px";tip.style.top=top+"px";
  };
  const showCountry = (country,event) => {
    const counts=countryStats.get(country);
    if(!counts)return;
    tip.innerHTML=`<p class="trade-map-tooltip__eyebrow">Country trade profile</p><div class="trade-map-tooltip__title">${escapeText(country)}</div><div class="trade-map-tooltip__stat-row"><span>Exporting records</span><b>${counts.exports}</b></div><div class="trade-map-tooltip__stat-row"><span>Importing records</span><b>${counts.imports}</b></div><div class="trade-map-tooltip__muted">Counts cover the documented records in this dataset, not all national trade.</div>`;
    tip.hidden=false;positionTip(event);
  };
  const showRoute = (route,event) => {
    const from=route.from.country,to=route.to.country;
    tip.innerHTML=`<p class="trade-map-tooltip__eyebrow">Documented directional trade</p><div class="trade-map-tooltip__title">${escapeText(from)} <span class="trade-map-tooltip__route">→</span> ${escapeText(to)}</div><div class="trade-map-tooltip__stat-row"><span>Trade records</span><b>${route.count}</b></div><div class="trade-map-tooltip__muted">Line width represents records in this dataset, not product units or shipment value.</div>`;
    tip.hidden=false;positionTip(event);
  };
  const hideTip=()=>{tip.hidden=true;};
  view.addEventListener("mousemove",(event,item)=>{
    const country=item?.datum?.country;
    if(typeof country==="string" && countryStats.has(country))showCountry(country,event);
    else hideTip();
  });
  view.addEventListener("mouseout",hideTip);
  const overlay = document.createElementNS(ns,"svg");
  overlay.classList.add("atlantic-trade-flows");
  overlay.setAttribute("viewBox",`0 0 ${width} ${height}`);
  overlay.setAttribute("preserveAspectRatio","none");
  overlay.setAttribute("aria-label","Directional example trade links; width represents record count");
  overlay.style.cssText="position:absolute;pointer-events:none;overflow:hidden;z-index:2;";
  const wrapper=base.parentElement;
  wrapper.style.position="relative";
  wrapper.appendChild(overlay);
  // Render arrowheads after all flow paths so lines cannot obscure them.
  const arrowheads=[];
  const positions=new Map();
  const rect=base.getBoundingClientRect();
  for(const node of base.querySelectorAll("path[aria-label],circle[aria-label],symbol[aria-label]")) {
    const label=(node.getAttribute("aria-label")||"").toLowerCase();
    const country=[...new Set(records.map(r=>r.country))].find(name=>label.includes("country: "+name.toLowerCase()));
    if(!country)continue;
    const b=node.getBoundingClientRect();
    if(b.width<2||b.height<2||b.width>40||b.height>40)continue;
    positions.set(country,[(b.left+b.width/2-rect.left)/rect.width*width,(b.top+b.height/2-rect.top)/rect.height*height]);
  }
  if(positions.size<2){console.warn("Flow anchors unavailable");}
  // Opposite directions take opposite curve lanes, while parallel records share one line.
  for(const [key,r] of routes) {
    if(!positions.has(r.from.country)||!positions.has(r.to.country))continue;
    const [x1,y1]=positions.get(r.from.country),[x2,y2]=positions.get(r.to.country);
    const dx=x2-x1,dy=y2-y1,dist=Math.hypot(dx,dy)||1;
    const nx=-dy/dist,ny=dx/dist;
    // Signed offsets are consistent for both orientations so reverse connections separate.
    // Use the same signed offset in each route's OWN travel direction.
    // Reversing a route reverses its perpendicular, placing Malaysia → US
    // and US → Malaysia on opposite sides rather than on top of each other.
    const bend=Math.min(95,Math.max(25,dist*.19));
    const p1=[x1+dx*.33+nx*bend,y1+dy*.33+ny*bend];
    const p2=[x1+dx*.68+nx*bend,y1+dy*.68+ny*bend];
    const vx=x2-p2[0],vy=y2-p2[1],vlen=Math.hypot(vx,vy)||1;
    const ux=vx/vlen,uy=vy/vlen;
    // The line stops BEFORE the arrow, leaving its entire triangle unobstructed.
    // Keep the arrow tip clear of the destination circle as well.
    const tipGap=11,headLength=7,halfWidth=3.4;
    const tipX=x2-tipGap*ux,tipY=y2-tipGap*uy;
    const baseX=tipX-headLength*ux,baseY=tipY-headLength*uy;
    const endX=baseX,endY=baseY;
    const path=document.createElementNS(ns,"path");
    path.setAttribute("d",`M${x1.toFixed(2)},${y1.toFixed(2)} C${p1[0].toFixed(2)},${p1[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)} ${endX.toFixed(2)},${endY.toFixed(2)}`);
    path.setAttribute("fill","none");
    path.setAttribute("stroke","#C55358");
    path.setAttribute("stroke-width",String(Math.min(7.5,1.1+1.65*r.count)));
    path.setAttribute("opacity",".43");
    path.setAttribute("stroke-linecap","butt");
    const arrow=document.createElementNS(ns,"path");
    arrow.setAttribute("d",`M${tipX.toFixed(2)},${tipY.toFixed(2)} L${(baseX+halfWidth*uy).toFixed(2)},${(baseY-halfWidth*ux).toFixed(2)} L${(baseX-halfWidth*uy).toFixed(2)},${(baseY+halfWidth*ux).toFixed(2)} Z`);
    arrow.setAttribute("fill","#C55358");
    arrow.setAttribute("opacity",".48");
    arrowheads.push(arrow);
    const title=document.createElementNS(ns,"title");
    title.textContent=key+" — "+r.count+" selected record"+(r.count===1?"":"s");
    path.appendChild(title);
    overlay.appendChild(path);
    const hit=document.createElementNS(ns,"path");
    hit.setAttribute("d",path.getAttribute("d"));
    hit.setAttribute("fill","none");
    hit.setAttribute("stroke","transparent");
    hit.setAttribute("stroke-width",String(Math.max(13,8+1.65*r.count)));
    hit.style.pointerEvents="stroke";
    hit.addEventListener("mousemove",e=>{e.stopPropagation();showRoute(r,e);});
    hit.addEventListener("mouseleave",hideTip);
    overlay.appendChild(hit);
    routeElements.push({count:r.count,line:path,hit,arrow});
  }
  for(const arrow of arrowheads) overlay.appendChild(arrow);
  applyRouteFilter();
  const redraw=()=>{
    const rect=base.getBoundingClientRect();
    // Rebuild paths after Vega updates the projection, without moving the SVG
    // beyond the map viewport or recreating the chart.
    for(const el of routeElements.flatMap(r=>[r.line,r.hit,r.arrow]))el.remove();
    routeElements.length=0;
    const points=new Map();
    for(const node of base.querySelectorAll("path[aria-label],circle[aria-label],symbol[aria-label]")){
      const label=(node.getAttribute("aria-label")||"").toLowerCase();
      const country=[...new Set(records.map(r=>r.country))].find(c=>label.includes("country: "+c.toLowerCase()));
      if(!country)continue;
      const b=node.getBoundingClientRect();
      if(b.width<2||b.height<2||b.width>40||b.height>40)continue;
      points.set(country,[(b.left+b.width/2-rect.left)/rect.width*width,(b.top+b.height/2-rect.top)/rect.height*height]);
    }
    // Existing geometry only recalculated for visible endpoint pairs.
    for(const route of routes.values()){
      if(!points.has(route.from.country)||!points.has(route.to.country))continue;
      const [x1,y1]=points.get(route.from.country),[x2,y2]=points.get(route.to.country);
      const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,bend=Math.min(95,Math.max(25,L*.19));
      const p1=[x1+dx*.33+nx*bend,y1+dy*.33+ny*bend],p2=[x1+dx*.68+nx*bend,y1+dy*.68+ny*bend];
      const vx=x2-p2[0],vy=y2-p2[1],vlen=Math.hypot(vx,vy)||1,ux=vx/vlen,uy=vy/vlen;
      const tx=x2-11*ux,ty=y2-11*uy,bx=tx-7*ux,by=ty-7*uy;
      const d=`M${x1},${y1} C${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${bx},${by}`;
      const line=document.createElementNS(ns,"path");line.setAttribute("d",d);line.setAttribute("fill","none");line.setAttribute("stroke","#C55358");line.setAttribute("stroke-width",String(Math.min(7.5,1.1+1.65*route.count)));line.setAttribute("opacity",".43");
      const hit=document.createElementNS(ns,"path");hit.setAttribute("d",d);hit.setAttribute("fill","none");hit.setAttribute("stroke","transparent");hit.setAttribute("stroke-width","14");hit.style.pointerEvents="stroke";hit.addEventListener("mousemove",e=>{e.stopPropagation();showRoute(route,e);});hit.addEventListener("mouseleave",hideTip);
      const arrow=document.createElementNS(ns,"path"),half=3.4;arrow.setAttribute("d",`M${tx},${ty} L${bx+half*uy},${by-half*ux} L${bx-half*uy},${by+half*ux} Z`);arrow.setAttribute("fill","#C55358");arrow.setAttribute("opacity",".48");
      overlay.appendChild(line);overlay.appendChild(hit);overlay.appendChild(arrow);
      routeElements.push({count:route.count,line,hit,arrow});
    }
    applyRouteFilter();
  };
  const align=()=>{const cr=base.getBoundingClientRect(),pr=wrapper.getBoundingClientRect();overlay.style.left=(cr.left-pr.left)+"px";overlay.style.top=(cr.top-pr.top)+"px";overlay.style.width=cr.width+"px";overlay.style.height=cr.height+"px";};
  align();
  if(typeof ResizeObserver!=="undefined")new ResizeObserver(align).observe(base);
  window.addEventListener("resize",align);
  return {redraw:()=>{align();redraw();},applyFilter:applyRouteFilter};
}

// Optional story annotations for the annual-sales chart. These emphasise
// recorded values only; they do not change the timeline brush or infer causes.
function setupSalesStory(view) {
  const buttons = [...document.querySelectorAll(".sales-story__button[data-story-year]")];
  if (!buttons.length) return;
  let selectedYear = 2022;
  buttons.forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.storyYear) === selectedYear)));
  buttons.forEach(button => button.addEventListener("click", () => {
    const year = Number(button.dataset.storyYear);
    selectedYear = selectedYear === year ? 0 : year;
    buttons.forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.storyYear) === selectedYear)));
    view.signal("storyYear", selectedYear).runAsync().catch(console.error);
  }));
}

// Optional linked-to-the-data story annotations on the regional sales share chart.
// Regional sales annotations are HTML overlays, kept separate from the Vega-Lite
// specification so the original chart and its region selection remain intact.
function setupRegionStory(view) {
  const buttons = [...document.querySelectorAll(".region-story__button[data-region-year]")];
  const container = document.getElementById("idiom21");
  if (!container || !buttons.length) return;

  // Callout text lives below the entire plot/legend. Only a thin pointer
  // crosses the plotted area; it never obscures bars or axis labels.
  const note = document.createElement("div");
  note.className = "region-story-chart-note";
  note.setAttribute("role", "status");
  const pointer = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  pointer.classList.add("region-story-pointer");
  pointer.setAttribute("aria-hidden", "true");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "#C62828");
  line.setAttribute("stroke-width", "1.4");
  line.setAttribute("stroke-linecap", "round");
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "3");
  dot.setAttribute("fill", "#C62828");
  pointer.append(line, dot);
  container.append(pointer, note);
  let selectedYear = 2025;

  const render = () => {
    buttons.forEach(button => button.setAttribute("aria-pressed",
      String(Number(button.dataset.regionYear) === selectedYear)));
    note.hidden = pointer.hidden = !selectedYear;
    if (!selectedYear) return;

    note.textContent = selectedYear === 2021 ? "Europe: 20.9% (2021)" : "Europe: 31.8% (2025)";
    const svg = container.querySelector("svg.marks");
    if (!svg) return;
    const containerRect = container.getBoundingClientRect();
    const plotRect = svg.getBoundingClientRect();
    // Locate the actual pink Europe rectangles drawn by Vega, rather than
    // approximating the plot size from the SVG's outer dimensions.
    const europeBars = [...svg.querySelectorAll("path, rect")].filter(el => {
      const fill = (el.getAttribute("fill") || getComputedStyle(el).fill || "").toLowerCase();
      if (fill !== "#c05792" && fill !== "rgb(192, 87, 146)") return false;
      const box = el.getBoundingClientRect();
      return box.width > 18 && box.height > 18;
    }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    const yearIndex = selectedYear === 2021 ? 0 : 4;
    if (europeBars.length < 5) {
      note.hidden = pointer.hidden = true;
      return;
    }
    const barRect = europeBars[yearIndex].getBoundingClientRect();
    const x = (barRect.left + barRect.right) / 2 - containerRect.left;
    const y = (barRect.top + barRect.bottom) / 2 - containerRect.top;
    const labelY = Math.max(plotRect.bottom - containerRect.top + 16, container.clientHeight - 27);
    const labelX = Math.max(100, Math.min(container.clientWidth - 100, x));
    note.style.left = labelX + "px";
    note.style.top = labelY + "px";
    pointer.setAttribute("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`);
    pointer.setAttribute("width", container.clientWidth);
    pointer.setAttribute("height", container.clientHeight);
    line.setAttribute("d", `M ${labelX} ${labelY - 4} L ${x} ${y}`);
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
  };
  buttons.forEach(button => button.addEventListener("click", () => {
    const year = Number(button.dataset.regionYear);
    selectedYear = selectedYear === year ? 0 : year;
    render();
  }));
  window.addEventListener("resize", render);
  render();
}

function setupTreemapStory(view) {
  const buttons = [...document.querySelectorAll(".tree-story__button")];
  let selected = "nba-pop";
  buttons.forEach(button => button.addEventListener("click", () => {
    selected = selected === button.dataset.treeMoment ? "" : button.dataset.treeMoment;
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.treeMoment === selected)));
    view.signal("treeMoment", selected).runAsync().catch(console.error);
  }));
}

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
      if (selector === "#idiom23") container.parentElement.prepend(heading);
      else container.before(heading);

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
    const embedResult = await vegaEmbed(container, spec, (["#idiom01","#idiom02","#idiom12","#idiom08","#idiom09","#idiom18","#idiom14","#idiom06","#idiom15","#idiom20","#idiom21","#idiom22","#idiom19","#idiom23"].includes(selector)) ? { ...embedOptions, tooltip: false } : embedOptions);
    if (selector === "#idiom23") { const flow=setupAtlanticTradeFlows(container, spec, embedResult.view); setupTradeMapControls(container, embedResult.view, flow); }
    if (selector === "#idiom20") setupSalesStory(embedResult.view);
    if (selector === "#idiom21") setupRegionStory(embedResult.view);
    if (selector === "#idiom01") setupLicenseShareTooltip(embedResult.view);
    if (selector === "#idiom02") setupTreemapDetailTooltip(embedResult.view);
    if (selector === "#idiom02") setupTreemapStory(embedResult.view);
    if (selector === "#idiom19") setupPictogramPartialTooltip(embedResult.view);
    if (selector === "#idiom19") setupPictogramComparison(embedResult.view);
    if (selector === "#idiom12") setupChordRelationshipTooltip(embedResult.view);
    if (["#idiom08","#idiom09","#idiom18"].includes(selector)) setupMapTooltip(embedResult.view, selector);
    if (["#idiom08","#idiom09","#idiom18"].includes(selector)) setupDraggableMap(embedResult.view, container, selector);
    if (["#idiom08","#idiom09","#idiom18"].includes(selector)) setupMapControlPanel(embedResult.view, container, selector);
    if (["#idiom14","#idiom06","#idiom15","#idiom20","#idiom21","#idiom22"].includes(selector)) setupAnalyticsTooltip(embedResult.view, selector);
    if (["#idiom02","#idiom12","#idiom19","#idiom14","#idiom22"].includes(selector)) setupChartClickSelection(embedResult.view, container, selector);
    if (productViewConfig[selector]) registerLinkedProductView(selector, embedResult.view);

    if (selector === "#idiom06") {
      embedResult.view.addEventListener("click", (event, item) => {
        const type = item?.datum?.product_type || "";
        if (type) updateLinkedProductType(activeProductType === type ? "" : type);
      });
      // The existing dropdown filters the dumbbell; using it also coordinates
      // the highlight, without altering filters in other charts.
      const priceSelect = container.querySelector('.vega-bindings select');
      priceSelect?.addEventListener("change", () => {
        const type = priceSelect.value === "All" ? "" : priceSelect.value;
        updateLinkedProductType(type);
      });
    }
    if (selector === "#idiom15") {
      embedResult.view.addEventListener("click", (event, item) => {
        const type = item?.datum?.ProductType || "";
        if (type) updateLinkedProductType(activeProductType === type ? "" : type);
      });
    }
  } catch (error) {
    console.error(`Failed to load ${specPath}`, error);
  }
});








/* Pointer drag pans the Equal Earth projection; region choices reset its centre.
   Each map keeps its own Vega signal state and existing zoom slider. */
function setupDraggableMap(view, container, selector) {
  const prefix = {"#idiom08":"search","#idiom09":"event","#idiom18":"origin"}[selector];
  const svg = container.querySelector("svg.marks");
  if (!prefix || !svg) return;
  const panSignal=prefix+"_pan_center", regionSignal=prefix+"_center", zoomSignal=prefix+"_zoom";
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  let dragging=false, lastX=0,lastY=0, frame=null, pending=null;
  svg.classList.add("draggable-funko-map");
  const onRegion=(name,value)=>{
    if(!Array.isArray(value))return;
    view.signal(panSignal,[Number(value[0]),Number(value[1])]).runAsync().catch(console.error);
  };
  view.addSignalListener(regionSignal,onRegion);
  svg.addEventListener("pointerdown",event=>{
    if(event.button!==0 || !event.isPrimary)return;
    dragging=true;lastX=event.clientX;lastY=event.clientY;
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("is-dragging");
    event.preventDefault();
  });
  svg.addEventListener("pointermove",event=>{
    if(!dragging)return;
    const dx=event.clientX-lastX,dy=event.clientY-lastY;
    lastX=event.clientX;lastY=event.clientY;
    const zoom=Number(view.signal(zoomSignal))||130;
    const c=pending||view.signal(panSignal);
    if(!Array.isArray(c))return;
    const factor=180/(Math.PI*zoom);
    pending=[clamp(c[0]-dx*factor,-180,180),clamp(c[1]+dy*factor,-85,85)];
    if(frame===null)frame=requestAnimationFrame(()=>{
      frame=null;
      const next=pending;pending=null;
      if(next)view.signal(panSignal,next).runAsync().catch(console.error);
    });
    event.preventDefault();
  });
  const stop=()=>{
    dragging=false;svg.classList.remove("is-dragging");
  };
  svg.addEventListener("pointerup",stop);
  svg.addEventListener("pointercancel",stop);
  svg.addEventListener("lostpointercapture",stop);
}


/* Make Vega-bound zoom/region controls readable and provide a one-click
   reset of zoom, region and drag position without reloading the page. */
function setupMapControlPanel(view, container, selector) {
  const prefix={"#idiom08":"search","#idiom09":"event","#idiom18":"origin"}[selector];
  if(!prefix)return;
  const bindings=container.querySelector(".vega-bindings");
  if(!bindings)return;
  bindings.classList.add("funko-map-controls");
  const wrappers=Array.from(bindings.querySelectorAll(".vega-bind"));
  for(const group of wrappers) {
    const input=group.querySelector("input[type=range], select");
    if(!input)continue;
    group.classList.add("funko-map-control");
    if(input.type==="range") {
      group.classList.add("funko-map-control--zoom");
      // Vega-Embed inserts its own numeric value beside the slider.
      // Replace only that readout with one styled percentage label.
      const nativeValue=Array.from(group.querySelectorAll("span, output"))
        .find(el=>el.textContent.trim()===input.value && !el.contains(input));
      if(nativeValue)nativeValue.classList.add("funko-map-native-zoom-value");
      const output=document.createElement("output");
      output.className="funko-map-zoom-value";
      const update=()=>{output.textContent=input.value+"%";};
      update();
      input.addEventListener("input",update);
      input.addEventListener("change",update);
      group.appendChild(output);
    } else {
      group.classList.add("funko-map-control--select");
    }
  }
  const reset=document.createElement("button");
  reset.type="button";
  reset.className="funko-map-reset";
  reset.textContent="↺ Reset view";
  reset.setAttribute("aria-label","Reset map zoom and position");
  reset.addEventListener("click",()=>{
    const range=bindings.querySelector('input[type="range"]');
    const region=bindings.querySelector("select");
    if(range){range.value="130";range.dispatchEvent(new Event("input",{bubbles:true}));range.dispatchEvent(new Event("change",{bubbles:true}));}
    if(region){region.selectedIndex=0;region.dispatchEvent(new Event("change",{bubbles:true}));}
    view.signal(prefix+"_zoom",130);
    view.signal(prefix+"_center",[0,0]);
    view.signal(prefix+"_pan_center",[0,0]);
    view.runAsync().catch(console.error);
  });
  bindings.appendChild(reset);
}

/* Optional comparison stays inside the pictogram; linked selections elsewhere remain unchanged. */
function setupPictogramComparison(view) {
  const toggle = document.getElementById("pictogram-compare-toggle");
  const panel = document.getElementById("pictogram-compare-panel");
  const aSelect = document.getElementById("pictogram-compare-a");
  const bSelect = document.getElementById("pictogram-compare-b");
  const result = document.getElementById("pictogram-compare-result");
  const close = document.getElementById("pictogram-compare-clear");
  const fields = Object.fromEntries(["a-name","a-count","a-fill","b-name","b-count","b-fill","difference","ratio"].map(key =>
    [key, document.getElementById("pictogram-compare-" + key)]));
  if (!toggle || !panel || !aSelect || !bSelect || !result || !close) return;
  const types = view.data("types").map(row => ({
    name: row.product_type, count: Number(row.Count)
  })).filter(row => row.name && Number.isFinite(row.count));
  if (types.length < 2) return;
  for (const select of [aSelect, bSelect]) {
    select.replaceChildren(...types.map(row => new Option(row.name, row.name)));
  }
  aSelect.value = types[0].name;
  bSelect.value = types[1].name;
  let enabled = false;
  const update = () => {
    const first = aSelect.value, second = bSelect.value;
    panel.hidden = !enabled;
    toggle.setAttribute("aria-expanded", String(enabled));
    toggle.classList.toggle("is-active", enabled);
    const a = types.find(t => t.name === first);
    const b = types.find(t => t.name === second);
    if (a && b && enabled) {
      const high = a.count >= b.count ? a : b;
      const low = a.count >= b.count ? b : a;
      const maxCount = Math.max(a.count, b.count, 1);
      const colors = {"Pop!":"#4E79A7","Apparel":"#76B7B2","Board Games":"#7F7F7F",
        "Keychains":"#F28E2B","Vinyl GOLD":"#EDC948","Plush":"#B07AA1"};
      for (const [key, type] of [["a", a], ["b", b]]) {
        fields[key + "-name"].textContent = type.name;
        fields[key + "-count"].textContent = type.count.toLocaleString();
        fields[key + "-fill"].style.width = (100 * type.count / maxCount) + "%";
        fields[key + "-fill"].style.backgroundColor = colors[type.name] || "#4E79A7";
      }
      fields.difference.textContent = (high.count - low.count).toLocaleString() + " products";
      fields.ratio.textContent = (high.count / Math.max(low.count, 1)).toFixed(1) + "×";
      result.textContent = high.name + " has more products than " + low.name + " in this sample.";
    }
    view.signal("comparePictogramA", enabled ? first : "");
    view.signal("comparePictogramB", enabled ? second : "");
    view.runAsync().catch(console.error);
  };
  const avoidSame = changed => {
    if (aSelect.value === bSelect.value) {
      const other = types.find(t => t.name !== changed.value);
      (changed === aSelect ? bSelect : aSelect).value = other.name;
    }
    update();
  };
  aSelect.addEventListener("change", () => avoidSame(aSelect));
  bSelect.addEventListener("change", () => avoidSame(bSelect));
  toggle.addEventListener("click", () => { enabled = !enabled; update(); });
  close.addEventListener("click", () => { enabled = false; update(); toggle.focus(); });
  update();
}

/* Vega pictogram: only the clipped half-group has a hover card. */
function setupPictogramPartialTooltip(view) {
  const tip=document.createElement("div");
  tip.className="pictogram-partial-tooltip";
  tip.hidden=true;tip.setAttribute("role","tooltip");
  document.body.appendChild(tip);
  const colors={"Pop!":"#4E79A7","Apparel":"#76B7B2","Keychains":"#F28E2B","Vinyl GOLD":"#EDC948","Plush":"#B07AA1","Board Games":"#7F7F7F"};
  let current="";
  view.addEventListener("mousemove",(event,item)=>{
    const d=item?.datum;
    if(!d || d.partial!==true){tip.hidden=true;current="";return;}
    const type=d.product_type,remainder=Number(d.remainder);
    if(!type||!remainder){tip.hidden=true;current="";return;}
    if(current!==type) {
      current=type;tip.replaceChildren();
      tip.style.setProperty("--partial-color",colors[type]||"#7F7F7F");
      const h=document.createElement("strong");h.className="pictogram-partial-tooltip__heading";h.textContent=type+" · Incomplete final group";
      const n=document.createElement("div");n.className="pictogram-partial-tooltip__value";n.textContent=remainder+" of 25 products";
      const track=document.createElement("div");track.className="pictogram-partial-tooltip__track";
      const fill=document.createElement("span");fill.className="pictogram-partial-tooltip__fill";fill.style.width=(remainder/25*100)+"%";track.append(fill);
      const note=document.createElement("p");note.className="pictogram-partial-tooltip__note";note.textContent="This half icon represents the remaining "+remainder+" products, not another full group of 25.";
      tip.append(h,n,track,note);
    }
    tip.hidden=false;
    const box=tip.getBoundingClientRect(),gap=12;
    tip.style.left=Math.max(gap,Math.min(event.clientX+15,window.innerWidth-box.width-gap))+"px";
    tip.style.top=Math.max(gap,Math.min(event.clientY+15,window.innerHeight-box.height-gap))+"px";
  });
  view.addEventListener("mouseout",()=>{tip.hidden=true;current="";});
}

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
      const year=Number(d.year);
      // The compiled Vega-Lite point item may carry only the original CSV
      // fields rather than the calculated SalesMillions field.
      const value=Number.isFinite(Number(d.SalesMillions)) && d.SalesMillions != null
        ? Number(d.SalesMillions)
        : (d.net_sales_usd_thousands != null
          ? Number(d.net_sales_usd_thousands)/1000 : saleData[year]);
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
    // Vega-Lite can report point marks with different internal mark names,
    // especially when annotations are layered. Identify the sales datum
    // instead of relying on its implementation-specific mark type.
    const raw=item?.datum;
    const d=raw?.datum && raw.year == null ? raw.datum : raw;
    if(selector==="#idiom20"){
      // The Vega-Lite concat has one SVG containing both plots. Suppress
      // custom tooltips over the lower brush navigator without changing
      // hit testing or the working tooltip on the upper sales chart.
      const chartSvg = document.querySelector("#idiom20 svg.marks");
      const svgBounds = chartSvg?.getBoundingClientRect();
      const pointerRatio = svgBounds && svgBounds.height
        ? (event.clientY - svgBounds.top) / svgBounds.height : 0;
      if(!d || !Number.isFinite(Number(d.year)) ||
         (svgBounds && (pointerRatio < 0 || pointerRatio > 0.79))){
        tip.hidden=true;current="";return;
      }
    } else if((selector==="#idiom22") && item?.mark?.marktype!=="symbol"){
      tip.hidden=true;current="";return;
    }
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

// Official Funko product-photo assets are only displayed after their local PNG
// files are uploaded. Missing assets gracefully leave the existing tooltip intact.
const LICENSE_FIGURE_IMAGES = {
  "NBA": ["nba.png", "Michael Jordan"],
  "The Nightmare Before Christmas": ["nightmare-before-christmas.png", "Oogie Boogie"],
  "Five Nights at Freddy's": ["five-nights-at-freddys.png", "Freddy Fazbear"],
  "Star Wars": ["star-wars.png", "Darth Vader"],
  "Harry Potter": ["harry-potter.png", "Harry Potter"],
  "NFL": ["nfl.png", "Josh Allen"],
  "The Mandalorian": ["the-mandalorian.png", "Grogu"],
  "Batman": ["batman.png", "Classic Batman"],
  "Funko": ["funko.png", "Freddy Funko"],
  "My Hero Academia": ["my-hero-academia.png", "All Might"],
  "NHL": ["nhl.png", "Connor McDavid"],
  "The Office": ["the-office.png", "Dwight Schrute"]
};

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
      // Some catalogue license names contain literal surrounding quotes,
      // including "Five Nights at Freddy's". Keep the original label and
      // count untouched; normalize only the image mapping lookup.
      // Match picture identifiers independently of the original CSV spelling:
      // some licenses contain extra quote characters and punctuation.
      const imageLicense = String(license).normalize("NFKC")
        .replace(/[“”‘’]/g, "'").replace(/^["'\s]+|["'\s]+$/g, "").trim();
      const licenseKey = imageLicense.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      const figure = (licenseKey.includes("five nights at fredd")
          ? LICENSE_FIGURE_IMAGES["Five Nights at Freddy's"]
          : LICENSE_FIGURE_IMAGES[imageLicense])
        || Object.entries(LICENSE_FIGURE_IMAGES).find(([name]) =>
            name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim() === licenseKey)?.[1];
      if (figure) {
        const media = document.createElement("div");
        media.className = "license-share-tooltip__figure";
        media.hidden = true; // Never show an unverified or missing image.
        const image = document.createElement("img");
        image.alt = "Representative Funko Pop! figure: " + figure[1];
        image.loading = "eager";
        image.decoding = "async";
        image.onload = () => {
          if (current !== license) return;
          media.hidden = false;
          // Image loading changes tooltip height: place it back inside viewport.
          const rect = tip.getBoundingClientRect();
          const top = parseFloat(tip.style.top) || 12;
          tip.style.top = Math.max(12, Math.min(top, window.innerHeight - rect.height - 12)) + "px";
        };
        image.onerror = () => { media.hidden = true; };
        image.src = "assets/license-tooltips/" + figure[0] + (imageLicense === "Funko" ? "?v=de3366cb4a16" : "");
        const caption = document.createElement("small");
        caption.textContent = figure[1] + " · Representative Pop! figure";
        media.append(image, caption);
        tip.append(media);
      }
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

/* Animate the four summary numbers once per page load, using real KPI results. */
function animateKpiNumber(element, value, format, duration = 1350) {
  if (!element || !Number.isFinite(value)) return;
  const finalText = format(value);
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = finalText;
    return;
  }
  const start = performance.now();
  const render = now => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = progress >= 1 ? finalText : format(value * eased);
    if (progress < 1) requestAnimationFrame(render);
  };
  element.textContent = format(0);
  requestAnimationFrame(render);
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
    animateKpiNumber(productEl, products.length, n => Math.round(n).toLocaleString());
    animateKpiNumber(licensesEl, licenses.size, n => Math.round(n).toLocaleString());
    if (products.length) {
      animateKpiNumber(shareEl, 100 * pops / products.length, n => n.toFixed(1) + "%");
    } else {
      shareEl.textContent = "—";
    }
  } catch (error) {
    console.error("Failed to load dashboard KPIs", error);
    productEl.textContent = licensesEl.textContent = shareEl.textContent = "N/A";
  }
}
animateKpiNumber(document.getElementById("kpi-sales"), 908.2, n => "$" + n.toFixed(1) + "M");
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



/* Click-to-select interactions for the custom Vega idioms.
   Selecting the same item, clicking empty chart space, or pressing Escape resets it. */
function setupChartClickSelection(view, container, selector) {
  const configs = {
    "#idiom02": {signal:"selectedTreeType", fields:["product_type"]},
    "#idiom12": {signal:"selectedChord", fields:["license","product_type"]},
    "#idiom19": {signal:"selectedPictogramType", fields:["product_type"]},
    "#idiom14": {signal:"selectedFlow", fields:["ProductGroup","PriceBand","ExclusiveStatus"]},
    "#idiom22": {signal:"selectedBrand", fields:["reported_brand_category"]}
  };
  const config=configs[selector];
  if(!config)return;
  const svg=container.querySelector("svg.marks");
  if(!svg)return;
  svg.classList.add("interactive-chart-selection");
  const linked = selector === "#idiom02" || selector === "#idiom12" || selector === "#idiom19";
  const update = next => linked ? updateLinkedProductType(next)
    : view.signal(config.signal, next).runAsync().catch(console.error);
  view.addEventListener("click", (event, item) => {
    const d = item?.datum;
    if (!d) { update(""); return; }
    let value = "";
    if (selector === "#idiom12") {
      // Product-type arcs and ribbons select across charts; license arcs keep
      // the original chord-only behaviour without mislabelling a license as a type.
      const isLicenseArc = item?.mark?.marktype === "arc" && d.license && !d.product_type;
      if (isLicenseArc) {
        updateLinkedProductType("");
        view.signal("selectedChord", d.license).runAsync().catch(console.error);
        return;
      }
      value = d.product_type || "";
      if (!value && d.license) {
        updateLinkedProductType("");
        view.signal("selectedChord", d.license).runAsync().catch(console.error);
        return;
      }
    } else if (selector === "#idiom14") {
      const dataName = item?.mark?.name || "";
      if (dataName.startsWith("nodes1")) value = d.ProductGroup || "";
      else if (dataName.startsWith("nodes2")) value = d.PriceBand || "";
      else if (dataName.startsWith("nodes3")) value = d.ExclusiveStatus || "";
      else value = d.ProductGroup || d.PriceBand || d.ExclusiveStatus || "";
    } else {
      for (const field of config.fields) if (d[field]) { value = String(d[field]); break; }
    }
    if (selector === "#idiom14" && value && item?.mark?.name?.startsWith("nodes1") && value !== "Other product types") {
      updateLinkedProductType(activeProductType === value ? "" : value);
    } else if (value) {
      if (selector === "#idiom14") updateLinkedProductType("");
      update((linked ? activeProductType : view.signal(config.signal)) === value ? "" : value);
    }
  });
  const reset = event => { if (event.key === "Escape") update(""); };
  container.addEventListener("keydown", reset);
  // Do not force keyboard focus onto the entire SVG: browsers draw an unwanted outline.
  svg.removeAttribute("tabindex");
}


// Keep the sticky chapter navigation in sync with clicks and manual scrolling.
function setupChapterNavigation() {
  const nav = document.querySelector(".chapter-nav");
  if (!nav) return;
  const links = [...nav.querySelectorAll('a[href^="#"]')];
  const items = links.map(link => ({
    link, section: document.getElementById(decodeURIComponent(link.hash.slice(1)))
  })).filter(item => item.section);
  if (!items.length) return;

  let selected = null;
  let scrollingTo = null;
  let unlockTimer = null;
  let raf = 0;
  const positionHighlight = () => {
    if (!selected) return;
    const rect = selected.getBoundingClientRect();
    const parent = nav.getBoundingClientRect();
    nav.style.setProperty("--chapter-highlight-left", `${rect.left - parent.left}px`);
    nav.style.setProperty("--chapter-highlight-top", `${rect.top - parent.top}px`);
    nav.style.setProperty("--chapter-highlight-width", `${rect.width}px`);
    nav.style.setProperty("--chapter-highlight-height", `${rect.height}px`);
    nav.style.setProperty("--chapter-highlight-opacity", "1");
  };
  const activate = link => {
    if (selected === link) return;
    selected = link;
    items.forEach(({link: item}) => {
      if (item === link) item.setAttribute("aria-current", "location");
      else item.removeAttribute("aria-current");
    });
    positionHighlight();
  };
  const updateFromScroll = () => {
    raf = 0;
    if (scrollingTo) {
      const target = scrollingTo.section.getBoundingClientRect();
      if (Math.abs(target.top - (nav.getBoundingClientRect().bottom + 12)) < 110) {
        scrollingTo = null;
        clearTimeout(unlockTimer);
      } else return;
    }
    const line = nav.getBoundingClientRect().bottom + 70;
    let current = items[0];
    for (const item of items) {
      if (item.section.getBoundingClientRect().top <= line) current = item;
    }
    activate(current.link);
  };
  items.forEach(item => item.link.addEventListener("click", () => {
    scrollingTo = item;
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(() => { scrollingTo = null; updateFromScroll(); }, 1500);
    activate(item.link);
  }));
  window.addEventListener("scroll", () => {
    if (!raf) raf = requestAnimationFrame(updateFromScroll);
  }, { passive: true });
  window.addEventListener("resize", () => {
    positionHighlight();
    updateFromScroll();
  });
  activate(items.find(item => item.link.hash === window.location.hash)?.link || items[0].link);
  requestAnimationFrame(() => { positionHighlight(); updateFromScroll(); });
}
setupChapterNavigation();
