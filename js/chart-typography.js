// Text sizes are screen-pixel targets. Compensate for CSS scaling of the SVG,
// while letting Vega lay out the larger labels (rather than stretching DOM text).
function prepareChartTypography(source, selector) {
  const spec = source.$schema?.includes('vega-lite')
    ? vegaLite.compile(source).spec : structuredClone(source);
  spec.signals = [...(spec.signals || []), {name: 'screenTextScale', value: 1}];
  const size = n => ({signal: `${n} / screenTextScale`});
  function visit(group) {
    for (const axis of group.axes || []) {
      Object.assign(axis, {labelFont: 'Inter', titleFont: 'Inter',
        labelFontSize: size(12), titleFontSize: size(12),
        labelFontWeight: 400, titleFontWeight: 400});
    }
    for (const legend of group.legends || []) {
      Object.assign(legend, {labelFont: 'Inter', titleFont: 'Inter',
        labelFontSize: size(11), titleFontSize: size(12),
        labelFontWeight: 400, titleFontWeight: 600});
    }
    for (const mark of group.marks || []) {
      if (mark.type === 'text') {
        mark.encode ||= {};
        const enter = mark.encode.enter ||= {};
        const update = mark.encode.update ||= {};
        const text = {...enter.text, ...update.text};
        const originalWeight = update.fontWeight || enter.fontWeight;
        const heading = ['bold', 600, 700].includes(originalWeight?.value);
        const mapLegend = ['#idiom08','#idiom09','#idiom18','#idiom23'].includes(selector);
        let target = mapLegend ? (heading ? 12 : 11) : 12;
        if (['#idiom01','#idiom06','#idiom20'].includes(selector)) target = 11;
        if (selector === '#idiom02' && !heading) target = 11;
        if (selector === '#idiom19' && text.field !== 'Count') target = 11;
        if (selector === '#idiom12' && !mark.from) target = 11;
        if (selector === '#idiom22' && text.signal) target = 11;
        // Triangle glyphs are legend symbols, not ordinary label text.
        if (text.value === '▲') target = 15;
        delete enter.fontSize;
        delete enter.lineHeight;
        Object.assign(update, {font: {value: 'Inter'}, fontSize: size(target),
          lineHeight: size(target + 3), fontWeight: {value: heading ? 600 : 400}});
      }
      visit(mark);
    }
  }
  visit(spec);
  return spec;
}

async function fitChartTypography(view, container) {
  let frame = 0;
  let running = false;
  const fit = async () => {
    if (running) return;
    running = true;
    try {
      for (let pass = 0; pass < 5; pass++) {
        const svg = container.querySelector('svg.marks');
        if (!svg) break;
        const intrinsic = Number(svg.getAttribute('width'));
        if (!intrinsic) break;
        const scale = svg.getBoundingClientRect().width / intrinsic;
        if (!(scale > 0) || Math.abs(view.signal('screenTextScale') - scale) < 0.002) break;
        await view.signal('screenTextScale', scale).runAsync();
      }
      container.dispatchEvent(new Event('charttypographychange'));
    } finally { running = false; }
  };
  await fit();
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => fit().catch(console.error));
  };
  // Observe the available column as well as the canvas: layout can change after
  // a webfont loads or when a desktop window is resized.
  const observer = new ResizeObserver(schedule);
  observer.observe(container);
  observer.observe(container.parentElement);
  document.fonts.ready.then(schedule);
}
