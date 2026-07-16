const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const { spawn } = require("child_process");
const axios = require("axios");

const app = express();
const server = http.createServer(app);

// ==========================
// DATABASE
// ==========================

mongoose
    .connect("mongodb://127.0.0.1:27017/metrodb")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Prediction Schema

const predictionSchema = new mongoose.Schema({
    station: String,
    crowd: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Prediction = mongoose.model(
    "Prediction",
    predictionSchema
);

// ==========================
// SOCKET.IO
// ==========================

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

console.log("Socket.IO initialized");

app.use(cors());
app.use(express.json());

// ==========================
// METRO ROUTES
// ==========================

const metroRoutes = {
    purple: [
        "majestic",
        "indiranagar",
        "whitefield"
    ],
    green: [
        "nagasandra",
        "majestic",
        "yelahanka"
    ],
    yellow: [
        "rv road",
        "central college",
        "bommasandra"
    ]
};

// ==========================
// STATIONS & TRAINS
// ==========================

const stations = [
    "majestic",
    "indiranagar",
    "whitefield"
];

let currentIndex = 0;

const trains = [
    {
        id: "P101",
        currentIndex: 0
    },
    {
        id: "P102",
        currentIndex: 1
    },
    {
        id: "P103",
        currentIndex: 2
    }
];

// ==========================
// SOCKET CONNECTION
// ==========================

io.on("connection", socket => {

    console.log("User Connected");

    socket.on("disconnect", () => {

        console.log("User Disconnected");

    });

});

// ==========================
// LIVE METRO MOVEMENT
// ==========================

setInterval(() => {

    currentIndex =
        (currentIndex + 1) %
        stations.length;

    trains.forEach(train => {

        train.currentIndex =
            (train.currentIndex + 1) %
            stations.length;

    });

    io.emit("metroUpdate", {

        currentStation:
            stations[currentIndex],

        nextStation:
            stations[
                (currentIndex + 1) %
                stations.length
            ],

        eta:
            Math.floor(Math.random() * 5) + 1

    });

}, 5000);

// ==========================
// ROUTE FINDER
// ==========================

app.post("/route", (req, res) => {

    let { from, to } = req.body;

    if (!from || !to) {

        return res.json({
            error: "Missing stations"
        });

    }

    from = from.toLowerCase();
    to = to.toLowerCase();

    for (let line in metroRoutes) {

        const routeStations =
            metroRoutes[line];

        if (
            routeStations.includes(from) &&
            routeStations.includes(to)
        ) {

            const start =
                routeStations.indexOf(from);

            const end =
                routeStations.indexOf(to);

            const route =
                routeStations.slice(
                    Math.min(start, end),
                    Math.max(start, end) + 1
                );

            return res.json({
                line,
                route
            });

        }

    }

    res.json({
        error: "No direct route found"
    });

});

// ==========================
// LIVE STATUS
// ==========================

app.get("/live-status", (req, res) => {

    res.json({

        currentStation:
            stations[currentIndex],

        nextStation:
            stations[
                (currentIndex + 1) %
                stations.length
            ],

        eta:
            Math.floor(Math.random() * 5) + 1

    });

});

// ==========================
// TRAINS
// ==========================

app.get("/trains", (req, res) => {

    console.log("Trains route called");

    const trainData = trains.map(train => ({
        id: train.id,
        currentStation: stations[train.currentIndex],
        nextStation: stations[(train.currentIndex + 1) % stations.length]
    }));

    console.log(trainData);

    res.json(trainData);

    console.log("Response sent");

});
// ==========================
// FARE CALCULATOR
// ==========================

app.post("/fare", (req, res) => {

    let { from, to } = req.body;

    from = from.toLowerCase();
    to = to.toLowerCase();

    const route =
        metroRoutes.purple;

    const start =
        route.indexOf(from);

    const end =
        route.indexOf(to);

    if (start === -1 || end === -1) {

        return res.json({
            error: "Invalid station"
        });

    }

    const fare =
        Math.abs(end - start) * 10;

    res.json({ fare });

});

// ==========================
// CROWD PREDICTION
// ==========================

app.post("/predictCrowd", (req, res) => {

    console.log("PredictCrowd API called");
    console.log(req.body);

    const { station, day, hour } = req.body;

    const python = spawn("python", [
        "AI/predict.py",
        station,
        day,
        hour
    ]);

    let result = "";

    python.stdout.on("data", (data) => {
        console.log("Python Output:", data.toString());
        result += data.toString();
    });

    python.stderr.on("data", (data) => {
        console.log("Python Error:", data.toString());
    });

    python.on("close", (code) => {
        console.log("Python exited with code:", code);
        console.log("Sending:", result.trim());

        res.json({
            crowd: result.trim()
        });
    });

});
// ==========================
// DELAY PREDICTION
// ==========================

// ==========================
// DELAY PREDICTION
// ==========================

app.post("/predictDelay", (req, res) => {

    const { passengers, weather, peakHour } = req.body;

    const python = spawn("python", [
        "AI/predict_delay.py",
        passengers.toString(),
        weather.toString(),
        peakHour.toString()
    ]);

    let result = "";

    python.stdout.on("data", (data) => {
        console.log("Python Output:", data.toString());
        result += data.toString();
    });

    python.stderr.on("data", (data) => {
        console.error("Python Error:", data.toString());
    });

    python.on("close", (code) => {

    console.log("Python exited with code:", code);
    console.log("Sending Delay:", result.trim());

    res.json({
        delay: result.trim()
    });

});
});

// ==========================
// WEATHER
// ==========================

app.get("/weather", async (req, res) => {

    try {

        const response =
            await axios.get(
                "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current_weather=true"
            );

        res.json(
            response.data
        );

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

// ==========================
// ANALYTICS
// ==========================

app.get("/analytics", async (req, res) => {

    const data =
        await Prediction.find();

    res.json(data);

});

// ==========================
// ADMIN STATS
// ==========================

app.get("/adminStats", async (req, res) => {

    const totalPredictions =
        await Prediction.countDocuments();

    res.json({

        totalPredictions,

        activeTrains:
            trains.length

    });

});

// ==========================
// START SERVER
// ==========================

server.listen(3000, () => {

    console.log(
        "Server running on port 3000"
    );

});