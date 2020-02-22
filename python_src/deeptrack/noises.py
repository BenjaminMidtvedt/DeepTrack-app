import numpy as np
from deeptrack.features import Feature
from deeptrack.image import Image




class Noise(Feature):
    '''Base class for the Noise object.

    Creates an image of desired shape, as defined by the implementing class.

    Basic operators are overloaded to easily allow it to be added to an image
    without explicity generating a new image each time
    '''



class Offset(Noise):
    def get(self, image, offset=0, **kwargs):
        return image + offset


    
class Gaussian(Noise):
    '''Adds gaussian noise to image
    Implementation of the Noise class to generate IID gaussian pixels.

    Parameters
    ----------
    mu
        The mean of the distribution.
    sigma
        The root of the variance of the distribution.
    '''
    def __init__(self, *args, mu=0, sigma=1, **kwargs):
        super().__init__(*args, mu=mu, sigma=sigma, **kwargs)

    def get(self, image, mu=0, sigma=1, **kwargs):
        mu = np.ones(image.shape) * mu
        sigma = np.ones(image.shape) * sigma
        noisy_image = image + np.random.normal(mu, sigma)
        return noisy_image



class Poisson(Noise):
    def get(self, image, snr=None, **kwargs):
        image[image < 0] = 0
        peak = np.max(image)
        rescale = snr**2 / peak
        noisy_image = Image(np.random.poisson(image * rescale) / rescale)
        noisy_image.properties = image.properties
        return noisy_image
