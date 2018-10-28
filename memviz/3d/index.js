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

    // Filter function
    function b(doc) {
        let dts = new Date(doc.ts);
        return dts >= from && dts <= to;
    }

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

    let traces = [julioTrace, rdfTrace];

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