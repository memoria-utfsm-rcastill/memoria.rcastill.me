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

    julio.sort((d1, d2) => new Date(d1.ts) - new Date(d2.ts));

    let julioTrace = {
        name: 'Julio',
        x: julio.filter(b).map(doc => doc.tmp),
        y: julio.filter(b).map(doc => doc.hum),
        z: julio.filter(b).map(doc => doc.julio),
        text: julio.filter(b).map(doc => doc.ts),
        mode: 'markers',
        marker: {
            size: 12,
            line: {
                color: 'rgba(217, 217, 217, 0.14)',
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };

    for (let doc of rdf) {
        doc.tmp = rdfData[doc.ts].tmp;
        doc.hum = rdfData[doc.ts].hum;
    }

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
            size: 12,
            line: {
                color: 'rgba(217, 17, 17, 0.14)',
                width: 0.5
            },
            opacity: 0.8
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
                    ind: julio[lastJ].julio
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
                    ind: (rdf[lastR].rf > 1) ? 100 : rdf[lastR].rf * 100
                };
                break;
            }
        }
        return data;
    });

    let wildfireJulioTrace = {
        name: 'Wildfire - Julio',
        x: w.filter(b).map(d => d.julio.tmp),
        y: w.filter(b).map(d => d.julio.hum),
        z: w.filter(b).map(d => d.julio.ind),
        text: w.filter(b).map(d => `Wildfire: ${d.ts} | Sensor: ${d.julio.ts}`),
        mode: 'markers',
        marker: {
            size: 12,
            line: {
                color: 'rgba(255, 0, 0, 0.14)',
                width: 0.5
            },
            opacity: 0.8
        },
        type: 'scatter3d'
    };

    let wildfireRiscoTrace = {
        name: 'Wildfire - RDF',
        x: w.filter(b).map(d => d.rdf.tmp),
        y: w.filter(b).map(d => d.rdf.hum),
        z: w.filter(b).map(d => d.rdf.ind),
        text: w.filter(b).map(d => `Wildfire: ${d.ts} | Sensor: ${d.rdf.ts}`),
        mode: 'markers',
        marker: {
            size: 12,
            line: {
                color: 'rgba(255, 0, 0, 0.14)',
                width: 0.5
            },
            opacity: 0.8
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

    Plotly.newPlot('test3d', traces, layout);
}

$(() => {
    const defaultOptions = {
        dateFormat: 'yy-mm-dd',
        changeMonth: true,
        changeYear: true
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