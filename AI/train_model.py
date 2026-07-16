import pandas as pd
from sklearn.preprocessing import LabelEncoder
from sklearn.tree import DecisionTreeClassifier
import pickle

data = pd.read_csv("crowdData.csv")

le_station = LabelEncoder()
le_day = LabelEncoder()
le_crowd = LabelEncoder()

data["station"] = le_station.fit_transform(data["station"])
data["day"] = le_day.fit_transform(data["day"])
data["crowd"] = le_crowd.fit_transform(data["crowd"])

X = data[["station", "day", "hour"]]
y = data["crowd"]

model = DecisionTreeClassifier()
model.fit(X, y)

pickle.dump(model, open("metro_model.pkl", "wb"))

print("Crowd prediction model trained successfully!")