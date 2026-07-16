const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({

    station: {
        type: String,
        required: true
    },

    day: {
        type: String,
        required: true
    },

    hour: {
        type: Number,
        required: true
    },

    crowd: {
        type: String,
        required: true
    },

    time: {
        type: Date,
        default: Date.now
    }

});

module.exports = mongoose.model(
    "Prediction",
    predictionSchema
);