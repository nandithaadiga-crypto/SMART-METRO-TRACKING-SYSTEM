import sys
import pickle
import pandas as pd
from sklearn.preprocessing import LabelEncoder

# Load dataset
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

data = pd.read_csv(os.path.join(BASE_DIR, "crowdData.csv"))

# Encoders
le_station = LabelEncoder()
le_day = LabelEncoder()
le_crowd = LabelEncoder()

data["station"] = le_station.fit_transform(data["station"])
data["day"] = le_day.fit_transform(data["day"])
data["crowd"] = le_crowd.fit_transform(data["crowd"])

# Load model
model = pickle.load(
    open(os.path.join(BASE_DIR, "metro_model.pkl"), "rb")
)

# Get input from command line
station = sys.argv[1].lower().strip()
day = sys.argv[2].lower().strip()
hour = int(sys.argv[3])
# Encode inputs
station_encoded = le_station.transform([station])[0]
day_encoded = le_day.transform([day])[0]

# Predict
prediction = model.predict(
    [[station_encoded, day_encoded, hour]]
)

crowd = le_crowd.inverse_transform(prediction)

print(crowd[0])