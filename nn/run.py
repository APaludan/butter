from time import perf_counter
import torch
import numpy as np
from NeuralNetwork import NeuralNetwork

device = (
    "cuda"
    if torch.cuda.is_available()
    else "mps"
    if torch.backends.mps.is_available()
    else "cpu"
)

model = NeuralNetwork().to(device)
model.load_state_dict(torch.load("model.pth"))
model.eval()

data_in = torch.from_numpy(np.array([[14, 21, 4.0, 260]]).astype(np.float32))

with torch.no_grad():
    for i in range(1):
        start = perf_counter()
        data_in = data_in.to(device)
        pred = model(data_in)
        end = perf_counter()
        for i in range(len(data_in)):
            predicted = pred[i].item()
            print(f'Predicted: "{predicted}", Time: {end - start:0.4f}')
