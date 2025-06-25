document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const dariInput = form.querySelector("input[placeholder='Dari']");
  const keInput = form.querySelector("input[placeholder='Ke']");
  const routeInfo = document.getElementById("route-info");
  const loading = document.getElementById("loading");

  const map = L.map("map").setView([-6.914744, 107.60981], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);

  let routeLayer = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const asal = dariInput.value.trim();
    const tujuan = keInput.value.trim();

    if (!asal || !tujuan) {
      alert("Tolong isi kedua lokasi.");
      return;
    }

    try {
      loading.style.display = "block";
      routeInfo.innerHTML = "";

      const [from, to] = await Promise.all([geocode(asal), geocode(tujuan)]);
      if (!from || !to) {
        alert("Lokasi tidak ditemukan.");
        loading.style.display = "none";
        return;
      }

      if (routeLayer) map.removeLayer(routeLayer);

      const { geojson, summary } = await getRoute(from, to);
      routeLayer = L.geoJSON(geojson, {
        style: { color: "crimson", weight: 5 }
      }).addTo(map);
      map.fitBounds(routeLayer.getBounds());

      const jarakKm = (summary.distance / 1000).toFixed(2);
      const durasiMenit = Math.ceil(summary.duration / 60);
      const jam = Math.floor(durasiMenit / 60);
      const menit = durasiMenit % 60;

      routeInfo.innerHTML = `
        <strong>Jarak:</strong> ${jarakKm} km<br>
        <strong>Estimasi Waktu:</strong> ${
          jam > 0 ? `${jam} jam ${menit} menit` : `${menit} menit`
        }
      `;
    } catch (err) {
      console.error(err);
      alert("Gagal mendapatkan rute.");
    } finally {
      loading.style.display = "none";
    }
  });

  async function geocode(place) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}&countrycodes=id&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
  }

  async function getRoute(from, to) {
    const apiKey = "5b3ce3597851110001cf624822d011de9a7242d1b17f171e7ff8cf40";
    const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coordinates: [from, to]
      })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("ORS error:", err);
      throw new Error("Gagal dari OpenRouteService");
    }

    const data = await res.json();
    const summary = data.features[0].properties.segments[0];
    return { geojson: data, summary };
  }
});
