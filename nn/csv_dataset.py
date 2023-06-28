import pandas as pd
import numpy as np

def get_data(is_train: bool):
    dataset = None
    if is_train:
        dataset = pd.read_csv("nn/train.csv", names=["Hour", "Temperature", "WindSpeed", "WindDirection", "Score"])
    else:
        dataset = pd.read_csv("nn/val.csv", names=["Hour", "Temperature", "WindSpeed", "WindDirection", "Score"])
    dataset = dataset.copy()
    labels = dataset.pop("Score")

    dataset['sin_time'] = np.sin(2 * np.pi * dataset["Hour"] / 24)
    dataset['cos_time'] = np.cos(2 * np.pi * dataset["Hour"] / 24)
    dataset.pop('Hour')

    # convert wind and winddir to vector
    wv = dataset.pop('WindSpeed')
    # Convert to radians.
    wd_rad = dataset.pop('WindDirection') * np.pi / 180
    # Calculate the wind x and y components.
    dataset['wx'] = wv * np.cos(wd_rad)
    dataset['wy'] = wv * np.sin(wd_rad)

    return np.array(dataset), np.array(labels)

def to_wx_wy(windspeed, windDirection):
    # Convert to radians.
    wd_rad = windDirection * np.pi / 180

    # Calculate the wind x and y components.
    wx = windspeed * np.cos(wd_rad)
    wy = windspeed * np.sin(wd_rad)

    return wx, wy

def to_sint_cost(hour):
    return np.sin(2 * np.pi * hour / 24), np.cos(2 * np.pi * hour / 24)