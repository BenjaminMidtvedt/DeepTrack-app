import deeptrack
import numpy as np


class Threshold(deeptrack.features.Feature):
    """Thresholds the input using a constant value

    Parameters
    ----------
    thr : float
        All values less than this value will be set to zero, and all
        values above will be set to one.
    """

    def __init__(self, thr=0.95, **kwargs):
        super().__init__(thr=thr)

    def get(self, image, thr, **kwargs):
        return image > thr
