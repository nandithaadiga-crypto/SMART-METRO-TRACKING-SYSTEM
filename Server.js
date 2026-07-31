// ==========================================
// IMPORTS & CONFIGURATION
// ==========================================
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { spawn } = require("child_process");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Local Modules & Middleware
const User = require("./models/User");
const auth = require("./middleware/auth");

const SECRET_KEY = process.env.JWT_SECRET || "smartmetro123";
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// Express Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// DATABASE CONNECTION & SCHEMAS
// ==========================================
mongoose
    .connect("mongodb://127.0.0.1:27017/metrodb")
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.error("MongoDB Connection Error:", err));

// Prediction Schema
const predictionSchema = new mongoose.Schema({
    station: String,
    crowd: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Prediction = mongoose.model("Prediction", predictionSchema);

// ==========================================
// SOCKET.IO & REAL-TIME TRAIN TRACKING
// ==========================================
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

console.log("Socket.IO initialized");

io.on("connection", (socket) => {
    console.log("Client Connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client Disconnected:", socket.id);
    });
});

// ==========================================
// METRO DATA & ROUTING CONFIGURATION
// ==========================================
const metroRoutes = {
    purple: ["majestic", "indiranagar", "whitefield"],
    green: ["nagasandra", "majestic", "yelahanka"],
    yellow: ["rv road", "central college", "bommasandra"]
};

const stations = ["majestic", "indiranagar", "whitefield"];
let currentIndex = 0;

const trains = [
    { id: "P101", lat: 12.9763, lng: 77.5712, speed: 40, currentIndex: 0 },
    { id: "P102", lat: 12.9800, lng: 77.5800, speed: 38, currentIndex: 1 },
    { id: "P103", lat: 12.9720, lng: 77.5650, speed: 45, currentIndex: 2 }
];

// Periodically update live location & broadcast to connected clients
setInterval(() => {
    trains.forEach((train) => {
    train.lat += 0.0002;
    train.lng += 0.00015;

    train.currentIndex =
        (train.currentIndex + 1) % stations.length;
});

    // Broadcast live locations and station updates
    io.emit("liveLocation", trains);
    
    io.emit("metroUpdate",{

currentStation:stations[currentIndex],

nextStation:stations[(currentIndex+1)%stations.length],

eta:Math.floor(Math.random()*5)+1,

lat:trains[0].lat,

lng:trains[0].lng

});

    // Advance station index periodically
    currentIndex = (currentIndex + 1) % stations.length;
}, 3000);

// ==========================================
// API ENDPOINTS
// ==========================================

// 1. ROUTE FINDER
app.post("/route", (req, res) => {
    let { from, to } = req.body;

    if (!from || !to) {
        return res.status(400).json({ error: "Missing source or destination stations" });
    }

    from = from.toLowerCase().trim();
    to = to.toLowerCase().trim();

    for (let line in metroRoutes) {
        const routeStations = metroRoutes[line];

        if (routeStations.includes(from) && routeStations.includes(to)) {
            const start = routeStations.indexOf(from);
            const end = routeStations.indexOf(to);
            const route = routeStations.slice(
                Math.min(start, end),
                Math.max(start, end) + 1
            );

            return res.json({ line, route });
        }
    }

    res.json({ error: "No direct route found" });
});

// 2. LIVE STATUS
app.get("/live-status", (req, res) => {
    res.json({
        currentStation: stations[currentIndex],
        nextStation: stations[(currentIndex + 1) % stations.length],
        eta: Math.floor(Math.random() * 5) + 1
    });
});

// 3. RUNNING TRAINS
app.get("/trains", (req, res) => {
    const trainData = trains.map((train) => ({
        id: train.id,
        currentStation: stations[train.currentIndex ?? 0],
        nextStation: stations[((train.currentIndex ?? 0) + 1) % stations.length]
    }));

    res.json(trainData);
});

// 4. FARE CALCULATOR
app.post("/fare", (req, res) => {
    let { from, to } = req.body;

    if (!from || !to) {
        return res.status(400).json({ error: "Missing source or destination station" });
    }

    from = from.toLowerCase().trim();
    to = to.toLowerCase().trim();

    let route = null;

for(let line in metroRoutes){

    if(
        metroRoutes[line].includes(from) &&
        metroRoutes[line].includes(to)
    ){
        route = metroRoutes[line];
        break;
    }

}

if(!route){

    return res.json({
        error:"No route found"
    });

}
    const start = route.indexOf(from);
    const end = route.indexOf(to);

    if (start === -1 || end === -1) {
        return res.status(400).json({ error: "Invalid station entered" });
    }

    const fare = Math.abs(end - start) * 10;
    res.json({ fare });
});

// 5. CROWD PREDICTION (AI Integration)
app.post("/predictCrowd", (req, res) => {
    const { station, day, hour } = req.body;

    if (!station || !day || !hour) {
        return res.status(400).json({ error: "Station, day, and hour are required" });
    }

    const python = spawn("python", ["AI/predict.py", station, day, hour]);
    let result = "";

    python.stdout.on("data", (data) => {
        result += data.toString();
    });

    python.stderr.on("data", (data) => {
        console.error("Python Crowd Prediction Error:", data.toString());
    });

    python.on("close", async () => {
        const crowdResult = result.trim() || "medium";

        try {
            const newPrediction = new Prediction({
                station,
                crowd: crowdResult
            });
            await newPrediction.save();
        } catch (err) {
            console.error("Failed to save prediction to DB:", err);
        }

        res.json({ crowd: crowdResult });
    });
});

// 6. DELAY PREDICTION (AI Integration)
app.post("/predictDelay", (req, res) => {
    const { passengers, weather, peakHour } = req.body;

    const python = spawn("python", [
        "AI/predict_delay.py",
        (passengers || 0).toString(),
        (weather || 0).toString(),
        (peakHour || 0).toString()
    ]);

    let result = "";

    python.stdout.on("data", (data) => {
        result += data.toString();
    });

    python.stderr.on("data", (data) => {
        console.error("Python Delay Prediction Error:", data.toString());
    });

    python.on("close", () => {
        res.json({ delay: result.trim() || "0" });
    });
});

// 7. WEATHER API
app.get("/weather", async (req, res) => {
    try {
        const response = await axios.get(
            "https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current_weather=true"
        );
        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 8. ADMIN STATS
app.get("/adminStats", async (req, res) => {
    try {
        const totalPredictions = await Prediction.countDocuments();
        res.json({
            totalPredictions,
            activeTrains: trains.length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 9. AUTHENTICATION: REGISTER
app.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });

        await user.save();
        res.status(201).json({ message: "Registration Successful" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 10. AUTHENTICATION: LOGIN
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ message: "Wrong Password" });
        }

        const token = jwt.sign({ id: user._id }, SECRET_KEY, { expiresIn: "1d" });
        res.json({ token, message: "Login Successful" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 11. PROTECTED ANALYTICS ENDPOINT
app.get("/analytics", auth, async (req, res) => {
    try {
        const data = await Prediction.find();
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// START SERVER
// ==========================================
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});