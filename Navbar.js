document.addEventListener("DOMContentLoaded", function () {

    // =========================
    // ROUTE FINDER
    // =========================

    const routeBtn =
        document.getElementById("findRouteBtn");

    const routeResult =
        document.getElementById("routeResult");

    if (routeBtn) {

        routeBtn.addEventListener(
            "click",
            async function () {

                const from =
                    document.getElementById("fromStation")
                    .value.trim();

                const to =
                    document.getElementById("toStation")
                    .value.trim();

                if (!from || !to) {

                    routeResult.innerText =
                        "Please enter both stations.";

                    return;
                }

                try {

                    const response =
                        await fetch(
                            "http://localhost:3000/route",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    from,
                                    to
                                })
                            }
                        );

                    const data =
                        await response.json();

                    if (data.error) {

                        routeResult.innerText =
                            data.error;

                    } else {

                        routeResult.innerHTML =
                            `
                            <p><strong>Metro Line:</strong> ${data.line}</p>
                            <p><strong>Route:</strong> ${data.route.join(" → ")}</p>
                            `;
                    }

                } catch (error) {

                    routeResult.innerText =
                        "Server not running.";
                }

            }
        );

    }

    // =========================
    // DARK MODE
    // =========================

    const toggleBtn =
        document.getElementById("themeToggle");

    if (toggleBtn) {

        const savedTheme =
            localStorage.getItem("theme");

        if (savedTheme === "dark") {

            document.body.classList.add("dark");

            toggleBtn.innerText =
                "☀️ Light Mode";
        }

        toggleBtn.addEventListener(
            "click",
            function () {

                document.body.classList.toggle("dark");

                if (
                    document.body.classList.contains("dark")
                ) {

                    toggleBtn.innerText =
                        "☀️ Light Mode";

                    localStorage.setItem(
                        "theme",
                        "dark"
                    );

                } else {

                    toggleBtn.innerText =
                        "🌙 Dark Mode";

                    localStorage.setItem(
                        "theme",
                        "light"
                    );
                }

            }
        );

    }

    // =========================
    // SOCKET.IO LIVE TRACKER
    // =========================

    if (typeof io !== "undefined") {

        const socket =
            io("http://localhost:3000");

        socket.on("connect", () => {

            console.log(
                "Connected to Socket.IO Server"
            );

        });

        socket.on(
            "metroUpdate",
            (data) => {

                document.getElementById(
                    "currentStation"
                ).innerText =
                    data.currentStation;

                document.getElementById(
                    "nextStation"
                ).innerText =
                    data.nextStation;

                document.getElementById(
                    "eta"
                ).innerText =
                    data.eta + " mins";

            }
        );

    } else {

        console.log(
            "Socket.IO not loaded"
        );

    }

    // =========================
    // TRAIN TABLE
    // =========================

    async function loadTrains() {

        try {

            const response =
                await fetch(
                    "http://localhost:3000/trains"
                );

            const trains =
                await response.json();

            const trainBody =
                document.getElementById(
                    "trainBody"
                );

            if (!trainBody) return;

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

            console.log(
                "Train API not running"
            );

        }

    }

    loadTrains();

    setInterval(
        loadTrains,
        3000
    );

    // =========================
    // FARE CALCULATOR
    // =========================

    const fareBtn =
        document.getElementById("fareBtn");

    if (fareBtn) {

        fareBtn.addEventListener(
            "click",
            async () => {

                const from =
                    document.getElementById("fareFrom")
                    .value.trim();

                const to =
                    document.getElementById("fareTo")
                    .value.trim();

                const fareResult =
                    document.getElementById(
                        "fareResult"
                    );

                if (!from || !to) {

                    fareResult.innerText =
                        "Please enter both stations.";

                    return;
                }

                try {

                    const response =
                        await fetch(
                            "http://localhost:3000/fare",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },
                                body: JSON.stringify({
                                    from,
                                    to
                                })
                            }
                        );

                    const data =
                        await response.json();

                    if (data.error) {

                        fareResult.innerText =
                            data.error;

                    } else {

                        fareResult.innerText =
                            "Fare: ₹" +
                            data.fare;
                    }

                } catch (error) {

                    fareResult.innerText =
                        "Server not running.";

                }

            }
        );

    }

    // =========================
    // SEARCH STATION
    // =========================

    const searchBtn =
        document.getElementById("searchBtn");

    if (searchBtn) {

        searchBtn.addEventListener(
            "click",
            function () {

                const station =
                    document
                    .getElementById("searchInput")
                    .value
                    .toLowerCase()
                    .trim();

                const routeInfo =
                    document.getElementById(
                        "routeInfo"
                    );

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

                if (
                    stations.includes(station)
                ) {

                    routeInfo.innerHTML =
                        "✅ Station Found: " +
                        station;

                } else {

                    routeInfo.innerHTML =
                        "❌ Station Not Found";

                }

            }
        );

    }

    // =========================
    // AI CROWD PREDICTION
    // =========================

    const predictBtn =
    document.getElementById("predictBtn");

if (predictBtn) {

    predictBtn.addEventListener(
        "click",
        async () => {

            const station =
                document.getElementById("crowdStation").value;

            const day =
                document.getElementById("crowdDay").value;

            const hour =
                document.getElementById("crowdHour").value;

            console.log(station, day, hour);

            try {

                const response = await fetch(
                    "http://localhost:3000/predictCrowd",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            station,
                            day,
                            hour
                        })
                    }
                );

                console.log(response.status);

                const data = await response.json();

                console.log(data);

                document.getElementById("crowdResult").innerHTML =
    "Predicted Crowd : " +
    data.crowd.charAt(0).toUpperCase() +
    data.crowd.slice(1).toLowerCase();

            } catch (err) {

                console.log(err);

            }

        }
    );

}
    // =========================
    // CROWD CHART
    // =========================

    const ctx =
        document.getElementById(
            "crowdChart"
        );

    if (ctx) {

        new Chart(ctx, {

            type: "bar",

            data: {

                labels: [
                    "Majestic",
                    "Indiranagar",
                    "Whitefield",
                    "Yelahanka"
                ],

                datasets: [{
                    label: "Crowd Level",
                    data: [80, 60, 95, 40]
                }]

            }

        });

    }

});
async function loadAnalytics() {

    const response =
        await fetch(
            "http://localhost:3000/analytics"
        );

    const data =
        await response.json();

    let high = 0;
    let medium = 0;
    let low = 0;

    data.forEach(item => {

    const crowd = item.crowd.trim().toLowerCase();

    if (crowd === "high") {
        high++;
    }
    else if (crowd === "medium") {
        medium++;
    }
    else if (crowd === "low") {
        low++;
    }

});

    const ctx =
        document
        .getElementById(
            "analyticsChart"
        );

    new Chart(ctx, {

        type: "pie",

        data: {

            labels: [
                "High",
                "Medium",
                "Low"
            ],

            datasets: [{

                data: [
                    high,
                    medium,
                    low
                ]

            }]

        }

    });

}

loadAnalytics();
async function loadWeather(){

    const response =
        await fetch(
            "http://localhost:3000/weather"
        );

    const data =
        await response.json();

    document.getElementById(
        "weatherInfo"
    ).innerHTML =

        "Temperature: " +

        data.current_weather
        .temperature +

        "°C";

}

loadWeather();
async function loadAdmin(){

    const response =
        await fetch(
            "http://localhost:3000/adminStats"
        );

    const data =
        await response.json();

    document.getElementById(
        "adminStats"
    ).innerHTML =

        `
        <h3>
        Total Predictions:
        ${data.totalPredictions}
        </h3>

        <h3>
        Active Trains:
        ${data.activeTrains}
        </h3>
        `;

}

loadAdmin();
const delayBtn =
    document.getElementById("delayBtn");

if(delayBtn){

    delayBtn.addEventListener(
        "click",
        async () => {

            const passengers =
                document.getElementById(
                    "passengers"
                ).value;

            const weather =
                document.getElementById(
                    "weather"
                ).value;

            const peakHour =
                document.getElementById(
                    "peakHour"
                ).value;

            const response =
                await fetch(
                    "http://localhost:3000/predictDelay",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                            "application/json"
                        },
                        body: JSON.stringify({
                            passengers,
                            weather,
                            peakHour
                        })
                    }
                );

            const data =
                await response.json();

            document.getElementById(
                "delayResult"
            ).innerHTML =
                "Predicted Delay: " +
                data.delay +
                " minutes";

        }
    );

}