import pandas as pd
import numpy as np

def get_data(is_train: bool):
    dataset = None
    if is_train:
        dataset = pd.read_csv("train.csv", names=["Hour", "Temperature", "WindSpeed", "WindDirection", "Score"])
    else:
        dataset = pd.read_csv("val.csv", names=["Hour", "Temperature", "WindSpeed", "WindDirection", "Score"])
    dataset = dataset.copy()
    labels = dataset.pop("Score")
    return np.array(dataset), np.array(labels)
