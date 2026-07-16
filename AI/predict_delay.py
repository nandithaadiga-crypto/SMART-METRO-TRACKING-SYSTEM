import os
import sys
import pickle

base_dir = os.path.dirname(__file__)

model = pickle.load(
    open(os.path.join(base_dir, "delay_model.pkl"), "rb")
)

passengers = int(sys.argv[1])
weather = int(sys.argv[2])
peakHour = int(sys.argv[3])

delay = model.predict([
    [
        passengers,
        weather,
        peakHour
    ]
])

print(round(delay[0], 2))