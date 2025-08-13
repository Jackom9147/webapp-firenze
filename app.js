$(document).ready(function () {
    const map = L.map('map').setView([43.7696, 11.2558], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let preferiti = JSON.parse(localStorage.getItem("preferiti")) || [];

    // Funzione per salvare preferiti
    function salvaPreferiti() {
        localStorage.setItem("preferiti", JSON.stringify(preferiti));
    }

    // Carica sensori
    $.getJSON("https://www.snap4city.org/api/iot-search?model=ArpatSensor", function (data) {
        // Se non abbiamo preferiti salvati, prendiamo i primi 5
        if (preferiti.length === 0) {
            preferiti = data.slice(0, 5).map(s => s.id);
            salvaPreferiti();
        }

        data.forEach(sensor => {
            if (preferiti.includes(sensor.id)) {
                const marker = L.marker([sensor.latitude, sensor.longitude]).addTo(map);

                marker.on('click', function () {
                    caricaDatiSensore(sensor);
                });
            }
        });
    });

    // Funzione per caricare ultimi dati e grafico
    function caricaDatiSensore(sensor) {
        $.getJSON(`https://www.snap4city.org/api/device/${sensor.id}/lastdata`, function (lastData) {
            let infoHtml = `<h3>${sensor.name}</h3>`;
            let variabilePrincipale = null;

            lastData.forEach(d => {
                infoHtml += `<p>${d.variable}: ${d.value} ${d.unit} (${d.timestamp})</p>`;
                if (!variabilePrincipale) variabilePrincipale = d.variable;
            });

            $('#sensorDetails').html(infoHtml);

            if (variabilePrincipale) {
                caricaGraficoSettimanale(sensor.id, variabilePrincipale);
            }
        });
    }

    // Funzione per grafico settimanale
    function caricaGraficoSettimanale(sensorId, variabile) {
        const oggi = new Date();
        const inizio = new Date();
        inizio.setDate(oggi.getDate() - 7);

        const from = inizio.toISOString();
        const to = oggi.toISOString();

        $.getJSON(`https://www.snap4city.org/api/device/${sensorId}/history?variable=${variabile}&from=${from}&to=${to}`, function (historyData) {
            const labels = historyData.map(d => new Date(d.timestamp).toLocaleString());
            const values = historyData.map(d => d.value);

            const ctx = document.getElementById('weeklyChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: variabile,
                        data: values,
                        borderColor: 'blue',
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        x: { display: true },
                        y: { display: true }
                    }
                }
            });
        });
    }
});
