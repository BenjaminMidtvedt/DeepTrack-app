import sys
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import tensorflow as tf
import tensorflow.keras as keras
import PIL.Image as Image 
import numpy as np

load_model = keras.models.load_model

DEFAULT_MODEL = "./python_src/tracker.h5"

class PyAPI(object):

    def __init__(self):
        self.active_image = None
        self.model = self.load_model(DEFAULT_MODEL)

    def echo(self, text):
        '''echo any text'''
        return text

    def load_model(self, path):
        return load_model(path, compile=False)

    def track_image(self, path):

        tracker = self.model

        image = load_image(path)

        image = crop_to_divisible(image, 16)
        image = np.expand_dims(image, axis=0)
        image = image - np.min(image)
        image = image / np.max(image)

        result = tracker.predict(image)[0, :, :, 0]

        save_image(result, "./tmp/res.jpg")

        self.active_image = result

        return os.path.abspath("./tmp/res.jpg")
    
    def segment_image(self, value):

        image = self.active_image
        value = float(value)
        binary_image = (image > value) * 1.0

        save_image(binary_image, "./tmp/res.jpg")

        return os.path.abspath("./tmp/res.jpg")

def load_image(path_to_image):
    '''Loads an image

    Loads an image from storage and converts it to grayscale. For 
    multi-channel images, the channels are averaged. 

    Accepts .czi, .jpg, .png, .bmp, .eps, .tif, and more

    PARAMETERS
    ----------
    path_to_image : str
        Path to the image

    RETURNS
    -------
        np.array
            A 2d numpy array with one channel. Channels are averaged. 
    '''


    
    _input = np.array(Image.open(os.path.abspath(path_to_image)))


    is_colored = len(_input.shape) == 3
    is_grayscaled = len(_input.shape) == 2

    if is_colored:
        image = np.mean(_input, axis=-1)
    elif is_grayscaled:
        image = _input
    else:
        raise RuntimeError("Incorrect input image. The dimension of input image {0} is other than 2 or 3. Found {1}".format(path_to_image, _input.shape))

    return np.expand_dims(np.array(image), axis=-1)

def save_image(image, name):
    ''' Saves an image to disk

    Stores an image in the tmp folder. The image is converted to 
    8 bit and the intensity is mapped to span the values 0 to 255.

    The file name is formated using the current date, and a random 
    integer to avoid cache duplication.

    PARAMATERS
    ----------
    image : np.ndarray
        A 2d, single channel ndarray.
    name : str
        Name struct of the file
    
    RETURNS
    -------
    str
        Name of the file
    '''

    import scipy.misc


    image -= np.min(image)
    immax = np.max(image)
    if immax == 0:
        immax = 1
    image  = image / immax  * 255

    
    image = np.array(image).astype(np.uint8)

    scipy.misc.imsave(name, image)
    
    return name

def crop_to_divisible(image, divisor):
    ''' Crops the dimensions of an image

    Crops first two axes of an image to be divisible by a certain number.
    Crops from the end of each axis.
    
    PARAMETERS
    ----------
    image : np.ndarray
        Image to be cropped
    divisor : int
        The number the dimensions should be divisible by
    
    RETURNS
    -------
    np.ndarray
        Cropped image
    '''

    x_max = image.shape[0] // divisor * divisor
    y_max = image.shape[1] // divisor * divisor

    return image[:x_max, :y_max]






print(os.path.abspath("./tmp/res.jpg"))
sys.stdout.flush()
