import tensorflow as tf
import numpy as np
from csv_dataset import get_data
import tensorflowjs as tfjs

training_data, training_labels = get_data(is_train=True)
test_data, test_labels = get_data(is_train=False)

BATCH_SIZE  = 50
EPOCHS  = 1000
LR = 1e-3

model = tf.keras.Sequential([
    tf.keras.layers.Dense(64),
    tf.keras.layers.Dense(1)
])

model.compile(loss = tf.keras.losses.MeanSquaredError(),
                      optimizer = tf.keras.optimizers.experimental.AdamW(learning_rate=LR))

# model.build(input_shape=(None, 4))
# model.load_weights("model.h5")

model.fit(training_data, training_labels, epochs=EPOCHS, batch_size=BATCH_SIZE)


model.save("model.h5")

tfjs.converters.save_keras_model(model, "tfjs_model")


run_data = np.array([[11, 16, 1.5, 135]]) # score 1

res = model(run_data)
print("res: ", res)
print("Done!")
