function getDate(element) {
    let dateFormat = "yy-mm-dd";
    let date;
    try {
        date = $.datepicker.parseDate(dateFormat, element.value);
    } catch (error) {
        date = null;
    }

    return date;
}

function makeMapper(sourceLimits, targetLimits) {
    // Special case: (x1 == x2, vertical line), use targetLimits average
    if (sourceLimits.min === sourceLimits.max) {
        let avg = (targetLimits.min + targetLimits.max) / 2;
        return (_) => avg;
    }
    let TM = targetLimits.max;
    let Tm = targetLimits.min;
    let SM = sourceLimits.max;
    let Sm = sourceLimits.min;
    let m = (TM - Tm) / (SM - Sm);
    let y0 = ((Sm * (Tm - TM)) / (SM - Sm)) + Tm;
    return (x) => m * x + y0;
}

function mapSeasonFactor(isSeasonDefault, seasonFactor) {
    if (isSeasonDefault) {
        return '0, 0, 255'; // blue
    }
    if (seasonFactor === 1.5) {
        return '255, 255, 0'; // yellow
    }
    if (seasonFactor === 2.0) {
        return '255, 128, 0'; // orange
    }
    if (seasonFactor === 2.5) {
        return '255, 0, 0'; // red
    }
    if (seasonFactor === 3) {
        return '0, 0, 0'; // black
    }
    alert(`Unexpected season factor: ${seasonFactor}`);
}

function mapSeasonAndWind(mapWindSpeed, doc) {
    return `rgba(${mapSeasonFactor(doc.seasonDefault, doc.season)}, ${mapWindSpeed(doc.wnd)})`;
}

function getLimits(docs, getField, initialValue) {
    if (initialValue === undefined) {
        initialValue = { min: 1000, max: -1000 };
    }
    return docs.reduce((prev, doc) => {
        let val = getField(doc);
        prev.min = Math.min(val, prev.min);
        prev.max = Math.max(val, prev.max);
        return prev;
    }, initialValue);
}

async function plot(from, to) {
    let julio = await (await fetch('../data/julio.json')).json();
    let rdf = await (await fetch('../data/rdf.json')).json();
    let rdfData = await (await fetch('../data/data.rdf.json')).json();
    let wildfire = await (await fetch('../data/wildfiresZ3.json')).json();

    // Filter function
    function b(doc) {
        let dts = new Date(doc.ts);
        return dts >= from && dts <= to;
    }

    // Needed for wildfire detection
    julio.sort((d1, d2) => new Date(d1.ts) - new Date(d2.ts));
    rdf.sort((d1, d2) => new Date(d1.ts) - new Date(d2.ts));

    // Define drought to size mapper
    let mapJulioDrought = makeMapper(getLimits(julio.filter(b), doc => doc.drought), { min: 24, max: 48 });

    // Define wind speed to transparency mapper
    let mapJulioWindSpeed = makeMapper(getLimits(julio.filter(b), doc => doc.wnd), { min: 0.1, max: 1.0 });

    let julioTrace = {
        name: 'Julio',
        x: julio.filter(b).map(doc => doc.tmp),
        y: julio.filter(b).map(doc => doc.hum),
        z: julio.filter(b).map(doc => doc.julio),
        text: julio.filter(b).map(doc => doc.ts),
        mode: 'markers',
        marker: {
            size: julio.filter(b).map(doc => mapJulioDrought(doc.drought)),
            color: julio.filter(b).map(doc => mapSeasonAndWind(mapJulioWindSpeed, doc))
        },
        type: 'scatter3d'
    };

    for (let doc of rdf) {
        doc.tmp = rdfData[doc.ts].tmp;
        doc.hum = rdfData[doc.ts].hum;
    }

    // Define PSE to size mapper
    let mapPse = makeMapper(getLimits(rdf.filter(b), doc => doc.pse), { min: 24, max: 48 });

    // Color will represent A in the future. Now it is not necessary as all documents have A=1.5

    let rdfTrace = {
        name: 'Risco',
        x: rdf.filter(b).map(doc => doc.tmp),
        y: rdf.filter(b).map(doc => doc.hum),
        z: rdf.filter(b).map(doc => {
            if (doc.rf > 1) {
                return 100;
            }
            return doc.rf * 100;
        }),
        text: rdf.filter(b).map(doc => doc.ts),
        mode: 'markers',
        marker: {
            size: rdf.filter(b).map(doc => mapPse(doc.pse))
        },
        type: 'scatter3d'
    };

    function wb(doc) {
        let dts = new Date(doc.start);
        return dts >= from && dts <= to;
    }

    wildfire.sort((w1, w2) => new Date(w1.start) - new Date(w2.start));

    let lastJ = 0;
    let lastR = 0;
    let w = wildfire.filter(wb).map(doc => {
        let data = {
            ts: doc.start
        };
        for (; lastJ < julio.length; lastJ++) {
            if (new Date(julio[lastJ].ts) >= new Date(doc.start)) {
                data.julio = {
                    ts: julio[lastJ].ts,
                    tmp: julio[lastJ].tmp,
                    hum: julio[lastJ].hum,
                    ind: julio[lastJ].julio,
                    wnd: julio[lastJ].wnd,
                    season: julio[lastJ].season,
                    seasonDefault: julio[lastJ].seasonDefault,
                    drought: julio[lastJ].drought
                };
                break;
            }
        }
        for (; lastR < rdf.length; lastR++) {
            if (new Date(rdf[lastR].ts) >= new Date(doc.start)) {
                data.rdf = {
                    ts: rdf[lastR].ts,
                    tmp: rdf[lastR].tmp,
                    hum: rdf[lastR].hum,
                    ind: (rdf[lastR].rf > 1) ? 100 : rdf[lastR].rf * 100,
                    pse: rdf[lastR].pse
                };
                break;
            }
        }
        return data;
    });

    // Define drought to size mapper
    let mapJulioWFDrought = makeMapper(getLimits(w.filter(b), doc => doc.julio.drought), { min: 24, max: 48 });

    // Define wind speed to transparency mapper
    let mapJulioWFWindSpeed = makeMapper(getLimits(w.filter(b), doc => doc.julio.wnd), { min: 0.1, max: 1.0 });


    let wildfireJulioTrace = {
        name: 'Wildfire - Julio',
        x: w.filter(b).map(d => d.julio.tmp),
        y: w.filter(b).map(d => d.julio.hum),
        z: w.filter(b).map(d => d.julio.ind),
        text: w.filter(b).map(d => `Wildfire: ${d.ts} | Sensor: ${d.julio.ts}`),
        mode: 'markers',
        marker: {
            size: w.filter(b).map(d => mapJulioWFDrought(d.julio.drought)),
            color: w.filter(b).map(d => mapSeasonAndWind(mapJulioWFWindSpeed, d.julio))
        },
        type: 'scatter3d'
    };

    console.log(wildfireJulioTrace);

    // Define PSE to size mapper
    let mapRdfWFPse = makeMapper(getLimits(w.filter(b), doc => doc.rdf.pse), { min: 24, max: 48 });

    let wildfireRiscoTrace = {
        name: 'Wildfire - RDF',
        x: w.filter(b).map(d => d.rdf.tmp),
        y: w.filter(b).map(d => d.rdf.hum),
        z: w.filter(b).map(d => d.rdf.ind),
        text: w.filter(b).map(d => `Wildfire: ${d.ts} | Sensor: ${d.rdf.ts}`),
        mode: 'markers',
        marker: {
            size: w.filter(b).map(d => mapRdfWFPse(d.rdf.pse))
            /*line: {
                color: 'rgba(255, 0, 0, 0.14)',
                width: 0.5
            },
            opacity: 0.8*/
        },
        type: 'scatter3d'
    };

    let traces = [julioTrace, rdfTrace, wildfireJulioTrace, wildfireRiscoTrace];

    let layout = {
        margin: {
            l: 0,
            r: 0,
            b: 0,
            t: 20
        },
        scene: {
            xaxis: {
                title: 'T [&deg;C]'
            },
            yaxis: {
                title: 'H [%]'
            },
            zaxis: {
                title: 'I'
            }
        },
        orientation: 'h'
    };

    Plotly.newPlot('test5d', traces, layout);
}

$(() => {
    const defaultOptions = {
        dateFormat: 'yy-mm-dd',
        changeMonth: true,
        changeYear: true,
        minDate: new Date('2013-01-01'),
        maxDate: new Date('2017-12-31')
    }

    let from = $('#frompicker')
        .datepicker(defaultOptions)
        .on('change', function () {
            to.datepicker('option', 'minDate', getDate(this));
        });
    let to = $('#topicker')
        .datepicker(defaultOptions)
        .on('change', function () {
            from.datepicker('option', 'maxDate', getDate(this));
        });

    $('#filter').click(() =>
        plot(new Date(from.val()), new Date(to.val())));
})