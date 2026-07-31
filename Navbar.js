// ==========================================
// 1. LEAFLET MAP INITIALIZATION
// ==========================================
let map;
let trainMarker;

const mapContainer = document.getElementById("map");
if (mapContainer) {
    map = L.map("map").setView([12.9763, 77.5712], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    trainMarker = L.marker([12.9763, 77.5712])
        .addTo(map)
        .bindPopup("Metro Train")
        .openPopup();
}

// ==========================================
// 2. AUTHENTICATION CHECK
// ==========================================
console.log("Checking login...");
const token = localStorage.getItem("token");
console.log("Token:", token);

// Redirect to login if on a protected page (excluding login/register)
const currentPage = window.location.pathname.split("/").pop();
if (!token && currentPage !== "login.html" && currentPage !== "register.html") {
    alert("No token found. Redirecting to login...");
    window.location.href = "login.html";
}

// ==========================================
// 3. SOCKET.IO LIVE TRACKER (SINGLE INSTANCE)
// ==========================================
let socket = null;
if (typeof io !== "undefined") {
    socket = io("http://localhost:3000");

    socket.on("metroUpdate", (data) => {
        const curr = document.getElementById("currentStation");
        const next = document.getElementById("nextStation");
        const eta = document.getElementById("eta");

        if (curr) curr.innerText = data.currentStation;
        if (next) next.innerText = data.nextStation;
        if (eta) eta.innerText = data.eta + " mins";
    });
    socket.on("liveLocation", (trains) => {

    if(trainMarker){

        trainMarker.setLatLng([
            trains[0].lat,
            trains[0].lng
        ]);

    }

});
} else {
    console.log("Socket.IO client library not loaded.");
}

// ==========================================
// 4. DOM CONTENT LOADED HANDLERS
// ==========================================
document.addEventListener("DOMContentLoaded", function () {

    // --- ROUTE FINDER ---
    const routeBtn = document.getElementById("findRouteBtn");
    const routeResult = document.getElementById("routeResult");

    if (routeBtn && routeResult) {
        routeBtn.addEventListener("click", async function () {
            const from = document.getElementById("fromStation")?.value.trim();
            const to = document.getElementById("toStation")?.value.trim();

            if (!from || !to) {
                routeResult.innerText = "Please enter both stations.";
                return;
            }

            try {
                const response = await fetch("http://localhost:3000/route", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ from, to })
                });

                const data = await response.json();

                if (data.error) {
                    routeResult.innerText = data.error;
                } else {
                    routeResult.innerHTML = `
                        <p><strong>Metro Line:</strong> ${data.line}</p>
                        <p><strong>Route:</strong> ${data.route.join(" → ")}</p>
                    `;
                }
            } catch (error) {
                routeResult.innerText = "Server not running.";
            }
        });
    }

    // --- DARK MODE TOGGLE ---
    const toggleBtn = document.getElementById("themeToggle");
    if (toggleBtn) {
        const savedTheme = localStorage.getItem("theme");

        if (savedTheme === "dark") {
            document.body.classList.add("dark");
            toggleBtn.innerText = "☀️ Light Mode";
        }

        toggleBtn.addEventListener("click", function () {
            document.body.classList.toggle("dark");

            if (document.body.classList.contains("dark")) {
                toggleBtn.innerText = "☀️ Light Mode";
                localStorage.setItem("theme", "dark");
            } else {
                toggleBtn.innerText = "🌙 Dark Mode";
                localStorage.setItem("theme", "light");
            }
        });
    }

    // --- TRAIN TABLE AUTO-REFRESH ---
    async function loadTrains() {
        const trainBody = document.getElementById("trainBody");
        if (!trainBody) return;

        try {
            const response = await fetch("http://localhost:3000/trains");
            const trains = await response.json();

            trainBody.innerHTML = "";
            trains.forEach(train => {
                trainBody.innerHTML += `
                    <tr>
                        <td>${train.id}</td>
                        <td>${train.currentStation}</td>
                        <td>${train.nextStation}</td>
                    </tr>
                `;
            });
        } catch (error) {
            console.log("Train API not running");
        }
    }

    if (document.getElementById("trainBody")) {
        loadTrains();
        setInterval(loadTrains, 3000);
    }

    // --- FARE CALCULATOR ---
    const fareBtn = document.getElementById("fareBtn");
    if (fareBtn) {
        fareBtn.addEventListener("click", async () => {
            const from = document.getElementById("fareFrom")?.value.trim();
            const to = document.getElementById("fareTo")?.value.trim();
            const fareResult = document.getElementById("fareResult");

            if (!from || !to) {
                if (fareResult) fareResult.innerText = "Please enter both stations.";
                return;
            }

            try {
                const response = await fetch("http://localhost:3000/fare", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ from, to })
                });

                const data = await response.json();

                if (fareResult) {
                    if (data.error) {
                        fareResult.innerText = data.error;
                    } else {
                        fareResult.innerText = "Fare: ₹" + data.fare;
                    }
                }
            } catch (error) {
                if (fareResult) fareResult.innerText = "Server not running.";
            }
        });
    }

    // --- STATION SEARCH ---
    const searchBtn = document.getElementById("searchBtn");
    if (searchBtn) {
        searchBtn.addEventListener("click", function () {
            const stationInput = document.getElementById("searchInput");
            const routeInfo = document.getElementById("routeInfo");

            if (!stationInput || !routeInfo) return;

            const station = stationInput.value.toLowerCase().trim();
            const stations = [
                "majestic",
                "indiranagar",
                "whitefield",
                "nagasandra",
                "yelahanka",
                "rv road",
                "central college",
                "bommasandra"
            ];

            if (stations.includes(station)) {
                routeInfo.innerHTML = "✅ Station Found: " + station;
            } else {
                routeInfo.innerHTML = "❌ Station Not Found";
            }
        });
    }

    // --- AI CROWD PREDICTION ---
    const predictBtn = document.getElementById("predictBtn");
    if (predictBtn) {
        predictBtn.addEventListener("click", async () => {
            const station = document.getElementById("crowdStation")?.value;
            const day = document.getElementById("crowdDay")?.value;
            const hour = document.getElementById("crowdHour")?.value;
            const resultElem = document.getElementById("crowdResult");

            try {
                const response = await fetch("http://localhost:3000/predictCrowd", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ station, day, hour })
                });

                const data = await response.json();

                if (resultElem && data.crowd) {
                    resultElem.innerHTML =
                        "Predicted Crowd : " +
                        data.crowd.charAt(0).toUpperCase() +
                        data.crowd.slice(1).toLowerCase();
                }
            } catch (err) {
                console.log("Error predicting crowd:", err);
            }
        });
    }

    // --- CROWD BAR CHART ---
    const crowdCtx = document.getElementById("crowdChart");
    if (crowdCtx) {
        new Chart(crowdCtx, {
            type: "bar",
            data: {
                labels: ["Majestic", "Indiranagar", "Whitefield", "Yelahanka"],
                datasets: [{
                    label: "Crowd Level",
                    data: [80, 60, 95, 40]
                }]
            }
        });
    }

    // --- DELAY PREDICTION ---
    const delayBtn = document.getElementById("delayBtn");
    if (delayBtn) {
        delayBtn.addEventListener("click", async () => {
            const passengers = document.getElementById("passengers")?.value;
            const weather = document.getElementById("weather")?.value;
            const peakHour = document.getElementById("peakHour")?.value;
            const delayResult = document.getElementById("delayResult");

            try {
                const response = await fetch("http://localhost:3000/predictDelay", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ passengers, weather, peakHour })
                });

                const data = await response.json();

                if (delayResult) {
                    delayResult.innerHTML = "Predicted Delay: " + data.delay + " minutes";
                }
            } catch (err) {
                console.log("Error predicting delay:", err);
            }
        });
    }

    // --- AUTHENTICATION: REGISTER ---
    const registerBtn = document.getElementById("registerBtn");
    if (registerBtn) {
        registerBtn.addEventListener("click", async () => {
            const name = document.getElementById("name")?.value;
            const email = document.getElementById("email")?.value;
            const password = document.getElementById("password")?.value;

            try {
                const response = await fetch("http://localhost:3000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, password })
                });

                const data = await response.json();
                alert(data.message);
            } catch (err) {
                console.log("Registration error:", err);
            }
        });
    }

    // --- AUTHENTICATION: LOGIN ---
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async () => {
            const email = document.getElementById("email")?.value;
            const password = document.getElementById("password")?.value;
            const msgElem = document.getElementById("message");

            try {
                const response = await fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (msgElem) msgElem.innerHTML = data.message;

                if (data.token) {
                    localStorage.setItem("token", data.token);
                    window.location.href = "index.html";
                }
            } catch (err) {
                console.log("Login error:", err);
            }
        });
    }

    // --- LOGOUT ---
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.onclick = function () {
            localStorage.removeItem("token");
            window.location.href = "login.html";
        };
    }
});

// ==========================================
// 5. ASYNC DASHBOARD LOADERS
// ==========================================
async function loadAnalytics() {
    const ctx = document.getElementById("analyticsChart");
    if (!ctx) return;

    try {
        const response = await fetch("http://localhost:3000/analytics", {
            headers: {
                Authorization: "Bearer " + localStorage.getItem("token")
            }
        });

        const data = await response.json();

        if (!Array.isArray(data)) {
            alert(data.message || "Analytics data not found");
            return;
        }

        let high = 0, medium = 0, low = 0;

        data.forEach(item => {
            const crowd = item.crowd ? item.crowd.trim().toLowerCase() : "";
            if (crowd === "high") high++;
            else if (crowd === "medium") medium++;
            else if (crowd === "low") low++;
        });

        new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["High", "Medium", "Low"],
                datasets: [{
                    data: [high, medium, low],
                    backgroundColor: ["#ef4444", "#f59e0b", "#22c55e"]
                }]
            }
        });
    } catch (err) {
        console.log("Analytics loading error:", err);
    }
}

async function loadWeather() {
    const weatherElem = document.getElementById("weatherInfo");
    if (!weatherElem) return;

    try {
        const response = await fetch("http://localhost:3000/weather");
        const data = await response.json();

        weatherElem.innerHTML = "Temperature: " + data.current_weather.temperature + "°C";
    } catch (err) {
        console.log("Weather loading error:", err);
    }
}

async function loadAdmin() {
    const adminElem = document.getElementById("adminStats");
    if (!adminElem) return;

    try {
        const response = await fetch("http://localhost:3000/adminStats");
        const data = await response.json();

        adminElem.innerHTML = `
            <h3>Total Predictions: ${data.totalPredictions}</h3>
            <h3>Active Trains: ${data.activeTrains}</h3>
        `;
    } catch (err) {
        console.log("Admin stats loading error:", err);
    }
}

// Initial fetch execution
loadAnalytics();
loadWeather();
loadAdmin();