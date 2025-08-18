$(document).ready(function () {
    const map = L.map('map').setView([43.7696, 11.2558], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let preferiti = JSON.parse(localStorage.getItem("preferiti")) || [];

    function salvaPreferiti() {
        localStorage.setItem("preferiti", JSON.stringify(preferiti));
    }

    function formatUTC(dateString) {
        if (!dateString) return "Data non disponibile";
        const d = new Date(dateString);
        return `${String(d.getUTCDate()).padStart(2, '0')}/${
            String(d.getUTCMonth() + 1).padStart(2, '0')}/${
            d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2, '0')}:${
            String(d.getUTCMinutes()).padStart(2, '0')}`;
    }

    $.getJSON("https://servicemap.disit.org/WebAppGrafo/api/v1/iot-search/?model=ArpatSensor", function (data) {
        const features = data.features || [];

        // Filtra solo i sensori di Firenze (deviceName che inizia per FI-)
        const sensoriFirenze = features.filter(f => 
            f.properties?.deviceName && f.properties.deviceName.startsWith("FI-")
        );

        // Se preferiti è vuoto, inizializza con tutti i sensori di Firenze
        if (preferiti.length === 0) {
            preferiti = sensoriFirenze.map(f => f.properties.serviceUri);
            salvaPreferiti();
        }

        let bounds = [];

        sensoriFirenze.forEach(f => {
            const lat = f.geometry?.coordinates[1];
            const lon = f.geometry?.coordinates[0];
            const nome = f.properties.deviceName;
            const valori = f.properties.values || {};
            const dataAcquisizione = f.properties.date_time || f.properties.values?.dateObserved;

            let popupContent = `<h3>${nome}</h3>`;
            popupContent += `Data acquisizione: ${formatUTC(dataAcquisizione)}`;
            let variabilePrincipale = null;

            for (let key in valori) {
                if (valori[key] !== "" && key !== "validation" && key !== "dateObserved") {
                    popupContent += `<p>${key}: ${valori[key]}</p>`;
                    if (!variabilePrincipale) variabilePrincipale = key;
                }
            }

            const marker = L.marker([lat, lon]).addTo(map);
            bounds.push([lat, lon]);

            // --- LOGICA DIFFERENZIATA DESKTOP / MOBILE ---
            if (window.innerWidth >= 1024) {
                // DESKTOP: popup all'hover, sparisce all'uscita
                marker.bindPopup(nome, {
                    closeButton: false,
                    autoClose: false,
                    closeOnClick: false
                });

                marker.on('mouseover', function () {
                    marker.openPopup();
                });

                marker.on('mouseout', function () {
                    marker.closePopup();
                });

            } else {
                // MOBILE: popup al click, resta aperto con X
                marker.bindPopup(nome, {
                    closeButton: true,
                    autoClose: true,
                    closeOnClick: true
                });

                marker.on('click', function () {
                    marker.openPopup();
                });
            }

            // Click (sia desktop che mobile) per mostrare i dettagli nella sidebar
            marker.on('click', function () {
                $('#sensorDetails').html(popupContent);

                // Scroll automatico su mobile
                if (window.innerWidth < 1024) {
                    const infoDiv = document.getElementById('info');
                    if (infoDiv) {
                        infoDiv.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });

        });

        // Adatta la mappa a tutti i marker
        if (bounds.length > 0) {
            map.fitBounds(bounds);
        }
    });
});