import tensorflow as tf
import numpy as np
from csv_dataset import get_data, to_wx_wy
import tensorflowjs as tfjs

training_data, training_labels = get_data(is_train=True)
validation_data, validation_labels = get_data(is_train=False)

BATCH_SIZE = 50
EPOCHS = 250
LR = 1e-3

model = tf.keras.Sequential([
    tf.keras.layers.Dense(4, activation="relu"),
    tf.keras.layers.Dense(32, activation="relu"),
    tf.keras.layers.Dense(32, activation="relu"),
    tf.keras.layers.Dense(1)
])

model.compile(loss=tf.keras.losses.MeanAbsoluteError(),
              optimizer=tf.keras.optimizers.experimental.AdamW(learning_rate=LR))

model.build(input_shape=(None, 4))
model.load_weights("nn/model.h5")

model.fit(training_data,
          training_labels,
          epochs=EPOCHS,
          batch_size=BATCH_SIZE,
          shuffle=True,
          validation_data=(validation_data, validation_labels),
          validation_batch_size=BATCH_SIZE,
          validation_freq=2)

# ToDo: add test data
# print("eval:")
# model.evaluate(test_data, test_labels)

model.save("nn/model.h5")

tfjs.converters.save_keras_model(model, "nn/tfjs_model")

#                 h,  t,  w,   dir
data = np.array([[12, 18, 6.7, 274]]) # score 4
wx, wy = to_wx_wy(data[0][2], data[0][3])

run_data = np.array([[12, 18.3, wx, wy]])

res = model(run_data)
print("res: ", res)

for i in range(360):
    wx, wy = to_wx_wy(10, i)
    run_data = np.array([[12, 10, wx, wy]])
    res = model(run_data)
    print(i, res.numpy()[0][0])