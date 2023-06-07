import pandas as pd
import numpy as np

# class CsvDataset():
#     def __init__(self, is_train: bool) -> None:
#         super().__init__()
#         file_in = None
#         if is_train:
#             file_in = pd.read_csv("train.csv")
#         else:
#             file_in = pd.read_csv("val.csv")
#         x = file_in.iloc[:, :4].values
#         y = file_in.iloc[:, -1].values
#         self.x_train = torch.tensor(x, dtype=torch.float32)
#         self.y_train = torch.tensor(y, dtype=torch.float32)

#     def __len__(self):
#         return len(self.y_train)

#     def __getitem__(self, idx):
#         return self.x_train[idx], self.y_train[idx]

def get_data(is_train: bool):
    dataset = None
    if is_train:
        dataset = pd.read_csv("train.csv", names=["Hour", "Temperature", "WindSpeed", "WindDirection", "Score"])
    else:
        dataset = pd.read_csv("val.csv", names=["Hour", "Temperature", "WindSpeed", "WindDirection", "Score"])
    dataset = dataset.copy()
    labels = dataset.pop("Score")
    return np.array(dataset), np.array(labels)