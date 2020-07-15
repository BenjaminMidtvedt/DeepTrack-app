import sys
import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
sys.path.append(os.path.abspath("."))
sys.path.append(os.path.abspath("./python_src/"))
import tensorflow as tf
import keras as keras
import PIL
import PIL.Image as Image 
import numpy as np
import inspect
import scipy.ndimage.measurements as M
import threading
import datetime
import time
import deeptrack
import custom_features
import skimage
import json
import io
import re
import glob
from deeptrack import *
model_cache = glob.glob(os.path.abspath("./tmp/models/*.h5"))
[os.remove(f) for f in model_cache if os.path.isfile(f)]


load_model = keras.models.load_model

DEFAULT_MODEL = "./python_src/tracker.h5"

FEATURES = {
    "Brightfield": deeptrack.optics.Brightfield,
    "Fluorescence": deeptrack.optics.Fluorescence,
    "Sphere": deeptrack.scatterers.Sphere,
}

EXCEPTIONS = [
    "Feature",
    "Branch",
    "Scatterer",
    "Aberration",
    "Optics",
    "Load",
    "StructuralFeature"
]

IGNORED_CLASSES = (
)

IGNORED_MODULES = (
    "sequences"
)
    

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


import scipy
import tensorflow
import keras.backend as K
import itertools
        
AVAILABLE_PACKAGES = [
    np,
    skimage,
    PIL,
    scipy,
    tensorflow,
    K,
    deeptrack
]

AVAILABLE_PACKAGES_NAMES = [
    "np",
    "skimage",
    "PIL",
    "scipy",
    "tensorflow",
    "K",
    "deeptrack"
]

PACKAGE_DICT = dict([(name, package) for name, package in zip(AVAILABLE_PACKAGES_NAMES, AVAILABLE_PACKAGES)])

class PyAPI(object):

    def __init__(self, *args, **kwargs):
        self.queuedModels = []
        self.completedModels = []
        self.paused = False
        self.training_thread = threading.Thread(target=self.train_queued_models, daemon=True)
        self.training_thread.start()
        self.lock = threading.Lock
        self.generator = None

    @cached_function
    def getAvailableFunctions(self, *args, **kwargs):
        print("called")
        tree = {
            "np":{"_suggestionData": {"class": "module"}},
            "skimage":{"_suggestionData": {"class": "module"}},
            "PIL":{"_suggestionData": {"class": "module"}},
            "scipy":{"_suggestionData": {"class": "module"}},
            "tensorflow":{"_suggestionData": {"class": "module"}},
            "K":{"_suggestionData": {"class": "module"}},
            "deeptrack":{"_suggestionData": {"class": "module"}},
            "itertools":{"_suggestionData": {"class": "module"}}

        }
        self.populateBranch(np, tree["np"], 0)
        self.populateBranch(skimage, tree["skimage"], 0)
        self.populateBranch(PIL, tree["PIL"], 0)
        self.populateBranch(scipy, tree["scipy"], 0)
        self.populateBranch(tensorflow, tree["tensorflow"], 0)
        self.populateBranch(K, tree["K"], 0)
        self.populateBranch(deeptrack, tree["deeptrack"], 0)
        self.populateBranch(itertools, tree["itertools"], 0)
        return tree


    def populateBranch(self, module, branch, depth, maxdepth=1):
        didAdd = False
        for name, function in inspect.getmembers(module, lambda x: (inspect.isclass(x) or inspect.ismethod(x) or inspect.isbuiltin(x) or inspect.isfunction(x) or isinstance(x, np.ufunc))
                                                                    and x.__name__.split(".")[0] != "_"):
            
            try: 
                if name[0] != "_":
                    branch[name] = {"_suggestionData": {"class": "function", "signature": str(inspect.signature(function))}}
                    didAdd = True
            except ValueError:
                try:
                    branch[name] = {"_suggestionData": {"class": "function", "signature": "".join(function.__doc__.split("\n")[:2])}}
                except:
                    print("still error", name, module)
        
        if depth > maxdepth:
            return
        for name, submodule in inspect.getmembers(module, lambda x: inspect.ismodule(x) and x.__name__.find(module.__name__) != -1 and x.__name__.split(".")[0] != "_"):
            submodule = getattr(module, name, False)
            if name[0] != "_" and submodule:
                branch[name] = {"_suggestionData": {"class": "module"}}
                if not self.populateBranch(submodule, branch[name], depth+1):
                    pass
                else:
                    didAdd = True
                if submodule == np.random:
                    print(branch[name])

        if not didAdd:
            return False
        return True
        

    def train_queued_models(self):
        while True:
            try:
                while not self.queuedModels or self.paused:
                    time.sleep(1)
            
                next_model = None
                for model in self.queuedModels:
                    if model["status"] == "Waiting":
                        next_model = model
                        break

                if next_model is None:
                    continue

                # cp = keras.callbacks.ModelCheckpoint(next_model["model_path"], save_weights_only=True)

                logdir = "./logs/" + next_model["model_name"] + "/" + datetime.datetime.now().strftime("%Y-%m-%d.%H-%M-%S") + ".bs" + str(next_model["batch_size"])
                logdir = logdir.replace(" ", "_")
                logdir = os.path.abspath(logdir)
                tb = keras.callbacks.TensorBoard(log_dir=logdir) 

                # Grab image and label
                feature_config = next_model["items"]
                for feature in feature_config:
                    if "name" in feature and feature["name"] == "Dataset":
                        entrypoint = feature["index"]
                        break

                all_features = {}

                aux = self.get_features(feature_config[feature_config[entrypoint]["items"][0]], items=feature_config, all_features=all_features)

                feature = aux + self.get_features(feature_config[feature_config[entrypoint]["items"][1]], items=feature_config, all_features=all_features)

                label_feature = self.get_features(feature_config[feature_config[entrypoint]["items"][2]], items=feature_config, all_features=all_features)

                if label_feature:
                    label_feature = feature + label_feature
                else: 
                    label_feature = feature

                # Grab model
                for item in feature_config:
                    if "name" in item and item["name"] == "Model":
                        entrypoint = item["index"]
                        break

                preprocess = self.get_features(feature_config[feature_config[entrypoint]["items"][0]], feature_config, all_features)

                model = self.get_features(feature_config[feature_config[entrypoint]["items"][1]], feature_config, all_features)

                postprocess = self.get_features(feature_config[feature_config[entrypoint]["items"][2]], feature_config, all_features)

                if preprocess:
                    feature += preprocess
                
                generator = generators.ContinuousGenerator([feature, label_feature], 
                                       label_function=lambda image: image[1], 
                                       batch_function=lambda image: image[0],
                                       feature_kwargs=[{}, {"is_label": True}], 
                                       batch_size=int(next_model["batch_size"]),
                                       min_data_size=int(next_model["min_data_size"]),
                                       max_data_size=int(next_model["max_data_size"]))
                
                
                next_model["status"] = "Generating validation set"

                validation_set = []

                for _ in range(64):
                    label_feature.update()
                    validation_set.append((
                        feature.resolve(is_validation=True), 
                        label_feature.resolve(is_label=True, is_validation=True)
                    ))
                    next_model["validation_size"] = len(validation_set)

                validation_data, validation_labels = zip(*validation_set)

                list_of_inputs = []
                list_of_labels = []
                
                for data, label in zip(validation_data, validation_labels):
                        if label.ndim < 3:
                            label_out = []
                            prediction_out = []
                            for idx, lab in enumerate(label):
                                label_out.append({"name":"", "value": repr(lab)})
                        else:
                            label_out = self.save_image(label, "")
                        list_of_labels.append(label_out)
                        list_of_inputs.append(self.save_image(data, ""))

                next_model["inputs"] = list_of_inputs
                next_model["targets"] = list_of_labels
                next_model["properties"] = [[dict([(key, repr(value)) for key, value in prop_dict.items()]) for prop_dict in image.properties] for image in validation_data]
                min_val = np.inf
                

                for _ in range(int(next_model["min_data_size"])):
                    label_feature.update()
                    generator.data.append((
                        feature.resolve(), 
                        label_feature.resolve(is_label=True)
                    ))
                    next_model["data_size"] = len(generator.data)

                with generator:
                    while next_model in self.queuedModels and next_model["completed_epochs"] < next_model["epochs"]:
                        while self.paused:
                            next_model["status"] = "Paused"
                            time.sleep(0.1)

                        next_model["status"] = "Training"
                        next_model["data_size"] = len(generator.data)
                        h = model.fit(generator, epochs=int(next_model["validation_freq"]),
                                validation_data=(np.array(validation_data), np.array(validation_labels)),
                                use_multiprocessing=False, 
                                workers=0)
                        next_model["data_size"] = len(generator.data)

                        while self.paused:
                            next_model["status"] = "Paused"
                            time.sleep(0.1)

                        if h.history["val_loss"][-1] < min_val:
                            model.save("./tmp/models/" + next_model["id"] + ".h5")
                            min_val = h.history["val_loss"][-1]

                        next_model["completed_epochs"] += 1
                        next_model["loss"] += [(dict([(key, item[idx]) for key, item in h.history.items()])) for idx in range(int(next_model["validation_freq"]))]

                        next_model["status"] = "Evaluating"
                        predictions = model.predict(np.array(validation_data[:16]))

                        def tolist(a):
                            try:
                                b = a[0]
                                return a
                            except:
                                return [a]

                        evaluations = [
                            dict([(key, value) for key, value in zip(
                                model.metrics_names,
                                tolist(model.evaluate(np.array([image]), np.array([label]), verbose=0)))
                            ]) for image, label in zip(validation_data, validation_labels)]

                        next_model["validations"].append(evaluations)
                        list_of_preds = []
                        for prediction in predictions:
                            if prediction.ndim < 3:
                                prediction_out = []
                                for idx, label in enumerate(prediction):
                                    prediction_out.append({"name":"", "value": repr(label)})
                            else:
                                prediction_out = self.save_image(prediction, "")
                            list_of_preds.append(prediction_out)
                        next_model["predictions"].append(list_of_preds)

                next_model["status"] = "Done"
                    
            except Exception as e:
                try: 
                    next_model["status"] = str(e)
                except:
                    pass


    def predict(self, file, feature_config, model_id=None):
        all_features = {}
        entrypoint = None
        # Grab model
        for item in feature_config:
            if "name" in item and item["name"] == "Model":
                entrypoint = item["index"]
                break


        preprocess = self.get_features(feature_config[feature_config[entrypoint]["items"][0]], feature_config, all_features)

        if model_id is None:
            model = self.get_features(feature_config[feature_config[entrypoint]["items"][1]], feature_config, all_features)
        else:
            model = keras.models.load_model(os.path.abspath("./tmp/models/" + model_id + ".h5"), compile=False)

        postprocess = self.get_features(feature_config[feature_config[entrypoint]["items"][2]], feature_config, all_features)

        image = deeptrack.features.LoadImage(path=file).resolve()
        
        if preprocess:
            image = preprocess.update().resolve(image)

        prediction = model.predict_on_batch(np.array([image]))

        if prediction.ndim < 3:
            prediction_out = []
            for idx, label in enumerate(prediction):
                prediction_out.append({"name":"", "value": repr(label)})
        else:
            prediction_out = self.save_image(prediction, "")
            
        return prediction_out

    @cached_function
    def echo(self, text):
        '''echo any text'''
        return text

    @cached_function
    def get_available_features(self, for_frontend):

        features = {}

        modules = inspect.getmembers(deeptrack, inspect.ismodule) + inspect.getmembers(custom_features, inspect.ismodule)
        for module_name, module in modules:

            module_dict = {}
            classes = inspect.getmembers(module, lambda x: inspect.isclass(x) or inspect.isfunction(x))
            if module_name in IGNORED_MODULES:
                continue
            for class_name, module_class in classes:
                if (issubclass(module_class, deeptrack.features.Feature) or (
                    module_name == "models" and class_name[0].isupper())) \
                    and class_name not in EXCEPTIONS \
                    and not issubclass(module_class, IGNORED_CLASSES):

                    if module_class.__doc__: 
                        description = module_class.__doc__[:module_class.__doc__.find("Parameters")]
                    else: 
                        description = ""
                    if for_frontend:
                        module_dict[class_name] = {
                            "class": "feature",
                            "key": module_name,
                            "type": class_name,
                            "name": class_name,
                            "description": description
                        }
                    else:
                        module_dict[class_name] = module_class
            
            if module_dict:
                features[module_name] = module_dict


        return features

    @cached_function
    def get_feature_properties(self, feature_name):

        for feature_type, feature_dict in self.get_available_features(False).items():
            if feature_name in feature_dict:
                arg_dict = {}
                iterator = None
                if issubclass(feature_dict[feature_name], deeptrack.features.Feature):
                    iterator = feature_dict[feature_name].mro()
                else:
                    iterator = [feature_dict[feature_name], deeptrack.models._compile]
                    

                for feature_class in iterator:
                    if issubclass(feature_class, deeptrack.features.Feature):
                        argspec = inspect.getfullargspec(feature_class.__init__)
                    elif callable(feature_class):
                        argspec = inspect.getfullargspec(feature_class)

                    arglist = argspec.kwonlyargs or argspec.args or []

                    if arglist and arglist[0] == "self":
                        arglist = arglist[1:]

                    defaultlist = argspec.kwonlydefaults or argspec.defaults or []

                    try:
                        defaultlist = list(defaultlist.values())
                    except:
                        pass
                    for idx in range(len(arglist)):
                        annotation = False

                        if arglist[idx] in argspec.annotations:
                            annotation = repr(argspec.annotations[arglist[idx]])
                        
                        default = False 

                        try:
                            pos = idx - (len(arglist) - len(defaultlist))
                            if pos >= 0:
                                default = defaultlist[pos]
                        except:
                            pass
                        
                        regex = r"^( *)(?:.{0}|\S.*)(" + re.escape(arglist[idx]) + r")(?:(?:[, ][^:\n]*:|:) *(.*)| *)((?:(?:\n|\n\r|\r)^\1 +.*)+)"

                        docstring = re.search(regex, feature_class.__doc__.replace("\t", "    "), flags=re.MULTILINE)

                        if docstring != None:
                            docstring = list(docstring.groups())[1:]
                        
                        if arglist[idx] not in arg_dict:
                            arg_dict[arglist[idx]] = {"default": "", "annotation": ""}

                        if default:
                            arg_dict[arglist[idx]]["default"] = repr(default)
                        if annotation:
                            arg_dict[arglist[idx]]["annotation"] = annotation
                        if docstring and "description" not in arg_dict[arglist[idx]]:
                            arg_dict[arglist[idx]]["description"] = docstring

                return arg_dict
        return {}


    def get_features(self, config, items, all_features): 
        if config["items"]:

            features = [self.get_feature(items[feature], items, all_features) for feature in config["items"]]
            if len(features) > 1:
                featureSet = sum(features) 
            else:
                featureSet = features[0]
            return featureSet
        else:
            return None

    def get_feature(self, feature, items, all_features):
        feature_class = self.get_available_features(False)[feature["key"]][feature["type"]]
    
        properties = {}

        for prop_index in feature["items"]:
            prop = items[prop_index]
            if prop["class"] == "property":
                prop_value = prop
                if "value" in prop_value and prop_value["value"]:
                    properties[prop_value["name"]] = prop_value["value"]
        
        all_keys = list(properties.keys()) + ["index"]

        for key, value in properties.items():
            
            correlated_properties = []
            for other_key in all_keys:
                if re.findall("(^|[^a-zA-Z0-9\.])"+other_key+"($|[^a-zA-Z0-9])", value):
                    correlated_properties.append(other_key)
            
            if not issubclass(feature_class, deeptrack.features.Feature) or \
                (value.find("random") == -1 and value.find("lambda") == -1 and not re.findall("\.[a-zA-z]", value) and not correlated_properties):
                property_string = value
                properties[key] = eval(property_string, {**all_features, **PACKAGE_DICT})
            else:
                property_string = ("lambda {parameters}: eval(\"{value}\", {{**all_features, **{more_locals}}})"
                                    .format(parameters=", ".join(correlated_properties),
                                            value=value,
                                            more_locals = "{" + ", ".join(["\"" + s + "\":" + s for s in correlated_properties + AVAILABLE_PACKAGES_NAMES])+ "}"))
                properties[key] = eval(property_string, {"all_features":all_features, **PACKAGE_DICT})

        for prop_index in feature["items"]:
            prop = items[prop_index]
            if prop["class"] == "featureGroup":
                feature_property = self.get_features(prop, items, all_features)
                if feature_property:
                    properties[prop["name"]] = feature_property

        feature_instance = feature_class(**properties)


        all_features[feature["name"]] = feature_instance

        return feature_instance


    @cached_function
    def load_model(model):
        return self.get_feature(model, {})


    def get_label_feature(self, feature_config, base_feature, all_features):
        
        
        if feature_config["label_method"] == "default":
            label_feature = self.get_feature(feature_config["label_aux"], all_features)
            return label_feature, lambda image: label_feature.properties.current_value_dict()
        elif feature_config["label_method"] == "conditional":
            label_feature = ResolveWithProperties(feature=base_feature, is_label=True) 
            return label_feature, lambda image: label_feature.resolve()
        else: 
            return base_feature, lambda image: base_feature.resolve(is_label=True)

    def enqueue_training(self, config):
        import base64

        config["status"] = "Waiting"
        
        config["inputs"] = []
        config["targets"] = []
        config["predictions"] = []
        config["validations"] = []
        config["properties"] = []
        config["loss"] = []
        config["validation_size"] = 0
        config["data_size"] = 0

        if not "completed_epochs" in config:
            config["completed_epochs"] = 0
        config["epochs"] = int(config["epochs"]) - int(config["completed_epochs"])

        if not "id" in config: 
            config["id"] = datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + str(np.random.randint(10000))

        if not "model_name" in config: 
            config["model_name"] = config["name"]

        self.queuedModels.append(config)
        return self.queuedModels

    def get_queue(self):
        return self.queuedModels

    def pause_queue(self):
        self.paused = True
        return self.queuedModels
    
    def unpause_queue(self):
        self.paused = False
        return self.queuedModels
    
    def pop_queue(self, id_key):
        self.pause_queue()
        for model in self.queuedModels:
            if model["id"] == id_key:
                self.queuedModels.remove(model)
        self.unpause_queue()
        return self.queuedModels

    
    def sample_feature(self, feature_config):

        all_features = {}

        entrypoint = None

        for feature in feature_config:
            if "name" in feature and feature["name"] == "Dataset":
                entrypoint = feature["index"]
                break

        aux = self.get_features(feature_config[feature_config[entrypoint]["items"][0]], items=feature_config, all_features=all_features)

        feature = aux + self.get_features(feature_config[feature_config[entrypoint]["items"][1]], items=feature_config, all_features=all_features)

        label_feature = self.get_features(feature_config[feature_config[entrypoint]["items"][2]], items=feature_config, all_features=all_features)

        if label_feature:
            label_feature = feature + label_feature
        else: 
            label_feature = feature

        label_feature.update()

        sample_image = np.squeeze(feature.resolve())
        labels = label_feature.resolve(is_label=True)

        sample_image_file = self.save_image(sample_image, "./tmp/feature.bmp")
        if "Label" in labels.get_property("name", False, []):
            for prop in labels.properties:
                if "name" in prop and prop["name"] == "Label":
                    propdict = prop
                    break
            
            propdict.pop("hash_key", False)
            propdict.pop("is_label", False)
            propdict.pop("output_shape", False)
            propdict.pop("name", False)

            labels = [{"name": key, "value": repr(value)} for key, value in propdict.items()]
        elif not isinstance(labels, dict):
            labels = self.save_image(labels, "./tmp/feature.bmp")

            

        return [sample_image_file, labels]




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

        from PIL import Image
        import base64

        image = np.squeeze(image)

        image -= np.min(image)
        immax = np.max(image)
        if immax == 0:
            immax = 1
        image  = image / immax  * 255

        image = Image.fromarray(np.array(image).astype(np.uint8))

        tmpfile = io.BytesIO()

        image.save(tmpfile, format='bmp')

        tmpfile.seek(0)
        
        return tmpfile.getvalue()

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

