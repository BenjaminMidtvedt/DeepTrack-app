import sys
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import tensorflow as tf
import tensorflow.keras as keras
import PIL.Image as Image 
import numpy as np
import scipy.ndimage.measurements as M
import deeptrack.optics, deeptrack.scatterers
import json

load_model = keras.models.load_model

DEFAULT_MODEL = "./python_src/tracker.h5"

FEATURES = {
    "Brightfield": deeptrack.optics.Brightfield,
    "Fluorescence": deeptrack.optics.Fluorescence,
    "Sphere": deeptrack.scatterers.Sphere,
}


def cached_function(function):

    values = {
        "args": None,
        "kwargs": None,
        "previous_output": None,
    }

    def caller(self, *args, **kwargs):

        if values["kwargs"] is None and values["args"] is None:
            new_value = function(self, *args, **kwargs)
        elif values["kwargs"] == kwargs and values["args"] == args:
            new_value = values["previous_output"]
        else: 
            new_value = function(self, *args, **kwargs)
        
        values["kwargs"] = kwargs
        values["args"] = args
        values["previous_output"] =  new_value

        return new_value
    return caller


def extract_property(item):
    key = item["name"].lower().replace(" ", "_")
    value = item["value"]

    if isinstance(value, list):
        return key, lambda: ((value[0] + 
                                    np.random.rand() * (value[1] - value[0])
                                    ) * item.get("scale", 1))
    else:
        return key, value * item.get("scale", 1)

class PyAPI(object):

    @cached_function
    def echo(self, text):
        '''echo any text'''
        return text

    @cached_function
    def load_model(self, path):
        return load_model(path, compile=False)

    @cached_function
    def get_feature(self, feature_config): 
        config = json.loads(feature_config)

        image_size = config["image_size"]

        optics_selection = config["optics"][0]
        optics_properties = self.get_properties(optics_selection["properties"])
        optics = FEATURES[optics_selection["type"]](
            magnification=1,
            output_region=(0, 0, *image_size),
            resolution=optics_properties["pixel_size"],
            NA=optics_properties["na"],
            **optics_properties 
        )  

        particle = config["sample"][0]
        particle_properties = self.get_properties(particle["properties"])
        
        sample =  FEATURES[particle["type"]](
                            **particle_properties,
                            position=lambda: np.random.rand(2) * image_size,
                            position_unit="pixel"
                        ) ** self.get_number_of_particles(particle["properties"]) 
        
        feature = optics(sample)

        

        return feature


    
    def sample_feature(self, feature_config):
        feature = self.get_feature(feature_config)
        feature.update()
        sample_image = np.squeeze(feature.resolve())
        self.save_image(sample_image, "./tmp/feature.bmp")
        return os.path.abspath("./tmp/feature.bmp")

    def get_properties(self, property_list):
        properties = {

        }

        for item in property_list:
            key, property = extract_property(item)
            properties[key] = property

            
        return properties


    def get_number_of_particles(self, property_list):
        for prop in property_list:
            if prop["name"] == "Count":
                value = prop["value"]
                if isinstance(value, list):
                    return lambda: np.random.randint(prop["value"][0], prop["value"][1] + 1)
                else:
                    return prop["value"]


    def track_image(self, path, segmentation_thr, min_area, max_area):

        tracker = self.load_model(DEFAULT_MODEL)

        result = self.predict(tracker, path)

        result = self.segment_image(result, segmentation_thr, min_area, max_area)

        self.save_image(result, "./tmp/res.jpg")

        return os.path.abspath("./tmp/res.jpg")

    @cached_function
    def predict(self, model, path):
        image = self.load_image(path)
        return model.predict(image)[0, :, :, 0]
    

    def segment_image(self, image, value, min_area, max_area):

        binary_image = (image > value) * 1.0

        labeled_image, ncomp = M.label(binary_image)

        for label in range(1, ncomp + 1):
            lab_bool = labeled_image == label
            area = np.sum(lab_bool) 
            if area < min_area or area > max_area:
                binary_image[lab_bool] = 0

        return binary_image


    @cached_function
    def load_image(self, path_to_image):
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
        
        image = self.crop_to_divisible(image, 16)
        image = np.expand_dims(image, axis=0)
        image = image - np.min(image)
        image = image / np.max(image)

        return np.expand_dims(np.array(image), axis=-1)

    def save_image(self, image, name):
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

    def crop_to_divisible(self, image, divisor):
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

