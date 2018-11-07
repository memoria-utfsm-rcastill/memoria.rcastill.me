function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function collectRdfSensorData(rdfData, label, sort = false) {
  let sensorData = [];
  for (let ts in rdfData) {
    if (rdfData.hasOwnProperty(ts)) {
      let o = { ts };
      o[label] = rdfData[ts][label];
      sensorData.push(o);
    }
  }
  if (sort) {
    sensorData.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  }
  return sensorData;
}

function prepareSharedSensorData(julio, rdfData, label) {
  // Filter only unique data
  let sensorData = julio.filter(doc => !rdfData.hasOwnProperty(doc.ts))
    .map(doc => {
      let o = { ts: doc.ts };
      o[label] = doc[label];
      return o;
    });
  sensorData.push(...collectRdfSensorData(rdfData, label));
  sensorData.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  return sensorData;
}

(async () => {
  let julio = await (await fetch('data/julio.json')).json();
  let julioPse = await (await fetch('data/julio_pse.json')).json();
  let julioOriginal = await (await fetch('data/julio_original.json')).json();
  let rdf = await (await fetch('data/rdf.json')).json();
  let rdfData = await (await fetch('data/data.rdf.json')).json();
  let wildfiresZ1 = await (await fetch('data/wildfiresZ1.json')).json();
  let wildfiresZ2 = await (await fetch('data/wildfiresZ2.json')).json();
  let wildfiresZ3 = await (await fetch('data/wildfiresZ3.json')).json();
  let wndDirMap = await (await fetch('data/wnd_dir.json')).json();

  // Sort wildfires
  wildfiresZ1.sort((a, b) => new Date(a.start) - new Date(b.start));
  wildfiresZ2.sort((a, b) => new Date(a.start) - new Date(b.start));
  wildfiresZ3.sort((a, b) => new Date(a.start) - new Date(b.start));

  // Temperature data
  let temperatureCombo = prepareSharedSensorData(julio, rdfData, 'tmp');
  let temperatureTrace = {
    x: temperatureCombo.map(t => t.ts),
    y: temperatureCombo.map(t => t.tmp),
    name: 'Temperature [C]',
    type: 'scatter'
  };

  // Humidity data
  let humidityCombo = prepareSharedSensorData(julio, rdfData, 'hum');
  let humidityTrace = {
    x: humidityCombo.map(h => h.ts),
    y: humidityCombo.map(h => h.hum),
    name: 'Humidity [%]',
    type: 'scatter'
  };

  // Wind data
  let windTrace = {
    x: julio.map(doc => doc.ts),
    y: julio.map(doc => doc.wnd),
    name: 'Wind [kt]',
    type: 'scatter'
  };

  // Precipitation data
  let rdfPrecipitationData = collectRdfSensorData(rdfData, 'prc', true);
  let precipitationTrace = {
    x: rdfPrecipitationData.map(p => p.ts),
    y: rdfPrecipitationData.map(p => p.prc),
    name: 'Precipitation [mm]',
    type: 'scatter'
  };

  // Julio's index
  let julioTrace = {
    x: julio.map(doc => doc.ts),
    y: julio.map(doc => doc.julio),
    name: "Julio's index",
    type: 'scatter'
  };

  // Julio's index using PSE (rdf) for draught calculation
  let julioPseTrace = {
    x: julioPse.map(doc => doc.ts),
    y: julioPse.map(doc => doc.julio),
    name: "Julio's index (PSE)",
    type: 'scatter'
  };

  // Julio's index using original table for draught calculation
  let julioOriginalTrace = {
    x: julioOriginal.map(doc => doc.ts),
    y: julioOriginal.map(doc => doc.julio),
    name: "Julio's index (original)",
    type: 'scatter'
  }

  // Risco do Fogo, complex
  let rfTrace = {
    x: rdf.map(doc => doc.ts),
    y: rdf.map(doc => {
      if (doc.rf > 1) {
        return 100;
      }
      return doc.rf * 100;
    }),
    name: 'RF',
    type: 'scatter'
  };

  // Risco do Fogo, basic
  let rbTrace = {
    x: rdf.map(doc => doc.ts),
    y: rdf.map(doc => {
      if (doc.rb > 1) {
        return 100;
      }
      return doc.rb * 100;
    }),
    name: 'RB',
    type: 'scatter'
  };

  // PSE (RdF)
  let pseTrace = {
    x: rdf.map(doc => doc.ts),
    y: rdf.map(doc => {
      if (doc.pse > 100) {
        return 100;
      }
      return doc.pse;
    }),
    name: 'PSE',
    type: 'scatter'
  };

  // Wildfires - Zone 1
  let wildfireZone1Trace = {
    x: wildfiresZ1.map(w => w.start),
    y: wildfiresZ1.map(_ => 100),
    text: wildfiresZ1.map(w => `Distance ${w.distance_to['330007'].toFixed(2)}m`),
    name: 'Wildfire - Zone 1',
    type: 'bar',
    width: 1000 * 3600,
    opacity: 0.9
  };

  // Wildfires - Zone 2
  let wildfireZone2Trace = {
    x: wildfiresZ2.map(w => w.start),
    y: wildfiresZ2.map(_ => 100),
    text: wildfiresZ2.map(w => `Distance ${w.distance_to['330007'].toFixed(2)}m`),
    name: 'Wildfire - Zone 2',
    type: 'bar',
    width: 1000 * 3600,
    opacity: 0.9
  };

  // Wildfires - Zone 3
  let wildfireZone3Trace = {
    x: wildfiresZ3.map(w => w.start),
    y: wildfiresZ3.map(_ => 100),
    text: wildfiresZ3.map(w => `Distance ${w.distance_to['330007'].toFixed(2)}m`),
    name: 'Wildfire - Zone 3',
    type: 'bar',
    width: 1000 * 3600,
    opacity: 0.9
  };

  // Register traces
  let traces = [
    temperatureTrace,
    humidityTrace,
    windTrace,
    precipitationTrace,
    julioTrace,
    julioPseTrace,
    julioOriginalTrace,
    rfTrace,
    rbTrace,
    pseTrace,
    wildfireZone1Trace,
    wildfireZone2Trace,
    wildfireZone3Trace
  ];

  // Plot
  let plot = Plotly.newPlot('memviz', traces, {
    yaxis: {
      range: [0, 100]
    },
    height: 500
  });

  // Bind hover
  let memviz = document.getElementById('memviz');
  let wndDir = $('#wnddir');
  let arrow = $("#arrow");
  memviz.on('plotly_hover', data => {
    let ts = `${data.points[0].x}:00`;
    let dir = wndDirMap[ts];
    if (dir !== undefined) {
      arrow.css('-webkit-transform', `rotate(${dir + 90}deg)`);
      arrow.css('-moz-transform', `rotate(${dir + 90}deg)`);
      arrow.css('-o-transform', `rotate(${dir + 90}deg)`);
      arrow.css('-ms-transform', `rotate(${dir + 90}deg)`);
      wndDir.html(`<b>${ts}</b> ${dir}&#176;`);
    }
  });

  await plot;
  $('#memviz .spinner:first').hide();
  $('#compass-container').show();
})();