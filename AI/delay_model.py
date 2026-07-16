import pandas as pd
from sklearn.linear_model import LinearRegression
import pickle

data = pd.read_csv(
    "delayData.csv"
)

X = data[
    ["Passengers",
     "Weather",
     "PeakHour"]
]

y = data["Delay"]

model = LinearRegression()

model.fit(X, y)

pickle.dump(
    model,
    open(
        "delay_model.pkl",
        "wb"
    )
)

print("Delay Model Ready")