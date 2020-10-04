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
import dts_to_py
import google_api
import zerorpc
from deeptrack import *

try:
    os.makedirs("./tmp/models/", exist_ok=True)
except:
    pass
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
    "StructuralFeature",
]

IGNORED_CLASSES = ()

IGNORED_MODULES = ("sequences", "deeptrack")

import time


class Job(dict):
    def __setitem__(self, key, item):
        if key == "timestamp":
            return super().__setitem__(key, item)
        else:
            ts = int(round(time.time() * 1000))
            self["timestamp"] = ts
            return super().__setitem__(key, item)


def safe_issubclass(v1, v2):
    try:
        return issubclass(v1, v2)
    except:
        return False


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
        values["previous_output"] = new_value

        return new_value

    return caller


def extract_property(item):
    key = item["name"].lower().replace(" ", "_")
    value = item["value"]

    if isinstance(value, list):
        return key, lambda: (
            (value[0] + np.random.rand() * (value[1] - value[0])) * item.get("scale", 1)
        )
    else:
        return key, value * item.get("scale", 1)


import scipy
import tensorflow
import keras.backend as K
import itertools

AVAILABLE_PACKAGES = [np, skimage, PIL, scipy, tensorflow, K, deeptrack]

AVAILABLE_PACKAGES_NAMES = [
    "np",
    "skimage",
    "PIL",
    "scipy",
    "tensorflow",
    "K",
    "deeptrack",
]

PACKAGE_DICT = dict(
    [
        (name, package)
        for name, package in zip(AVAILABLE_PACKAGES_NAMES, AVAILABLE_PACKAGES)
    ]
)


class Bind(deeptrack.Feature):
    __distributed__ = False

    def __init__(self, feature, **kwargs):
        self.feature = feature
        super().__init__(**kwargs)

    def _update(self, **kwargs):
        super()._update(**kwargs)
        self.feature._update(**self.properties, **kwargs)

    def get(self, image, **kwargs):
        return self.feature.resolve(image, **kwargs)


class PyAPI(object):
    def __init__(self, *args, **kwargs):
        self.queuedModels = []
        self.completedModels = []
        self.paused = False
        self.training_thread = threading.Thread(
            target=self.train_queued_models, daemon=True
        )
        self.training_thread.start()
        self.lock = threading.Lock
        self.generator = None

    @zerorpc.stream
    def download(self, id, destination):
        iterator = google_api.load(id, destination)

        print(iterator)
        return iterator

    @cached_function
    def getAvailableFunctions(self, *args, **kwargs):
        tree = {
            "np": {"_suggestionData": {"class": "module"}},
            "skimage": {"_suggestionData": {"class": "module"}},
            "PIL": {"_suggestionData": {"class": "module"}},
            "scipy": {"_suggestionData": {"class": "module"}},
            "tensorflow": {"_suggestionData": {"class": "module"}},
            "K": {"_suggestionData": {"class": "module"}},
            "deeptrack": {"_suggestionData": {"class": "module"}},
            "itertools": {"_suggestionData": {"class": "module"}},
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
        for name, function in inspect.getmembers(
            module,
            lambda x: (
                inspect.isclass(x)
                or inspect.ismethod(x)
                or inspect.isbuiltin(x)
                or inspect.isfunction(x)
                or isinstance(x, np.ufunc)
            )
            and x.__name__.split(".")[0] != "_",
        ):

            try:
                if name[0] != "_":
                    branch[name] = {
                        "_suggestionData": {
                            "class": "function",
                            "signature": str(inspect.signature(function)),
                        }
                    }
                    didAdd = True
            except ValueError:
                try:
                    branch[name] = {
                        "_suggestionData": {
                            "class": "function",
                            "signature": "".join(function.__doc__.split("\n")[:2]),
                        }
                    }
                except:
                    pass

        if depth > maxdepth:
            return
        for name, submodule in inspect.getmembers(
            module,
            lambda x: inspect.ismodule(x)
            and x.__name__.find(module.__name__) != -1
            and x.__name__.split(".")[0] != "_",
        ):
            submodule = getattr(module, name, False)
            if name[0] != "_" and submodule:
                branch[name] = {"_suggestionData": {"class": "module"}}
                if not self.populateBranch(submodule, branch[name], depth + 1):
                    pass
                else:
                    didAdd = True

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
                    time.sleep(2)
                    continue

                # cp = keras.callbacks.ModelCheckpoint(next_model["model_path"], save_weights_only=True)

                logdir = (
                    "./logs/"
                    + next_model["model_name"]
                    + "/"
                    + datetime.datetime.now().strftime("%Y-%m-%d.%H-%M-%S")
                    + ".bs"
                    + str(next_model["batch_size"])
                )
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

                aux = self.get_features(
                    feature_config[feature_config[entrypoint]["items"][0]],
                    items=feature_config,
                    all_features=all_features,
                )

                feature = self.get_features(
                    feature_config[feature_config[entrypoint]["items"][1]],
                    items=feature_config,
                    all_features=all_features,
                )

                label_feature = self.get_features(
                    feature_config[feature_config[entrypoint]["items"][2]],
                    items=feature_config,
                    all_features=all_features,
                )

                if label_feature:
                    label_feature = feature + label_feature
                else:
                    label_feature = feature

                # Grab model
                for item in feature_config:
                    if "name" in item and item["name"] == "Model":
                        entrypoint = item["index"]
                        break

                preprocess = self.get_features(
                    feature_config[feature_config[entrypoint]["items"][0]],
                    feature_config,
                    all_features,
                )

                model = self.get_features(
                    feature_config[feature_config[entrypoint]["items"][1]],
                    feature_config,
                    all_features,
                )

                postprocess = self.get_features(
                    feature_config[feature_config[entrypoint]["items"][2]],
                    feature_config,
                    all_features,
                )

                if preprocess:
                    feature += preprocess

                generator = generators.ContinuousGenerator(
                    [feature, label_feature],
                    label_function=lambda image: image[1],
                    batch_function=lambda image: image[0],
                    feature_kwargs=[{}, {"is_label": True}],
                    batch_size=int(next_model["batch_size"]),
                    min_data_size=int(next_model["min_data_size"]),
                    max_data_size=int(next_model["max_data_size"]),
                )

                validation_generator = generators.ContinuousGenerator(
                    [
                        Bind(feature, is_validation=True),
                        Bind(label_feature, is_validation=True),
                    ],
                    label_function=lambda image: image[1],
                    batch_function=lambda image: image[0],
                    feature_kwargs=[{}, {"is_label": True}],
                    batch_size=int(next_model["batch_size"]),
                    min_data_size=int(next_model["validation_set_size"]) - 1,
                    max_data_size=int(next_model["validation_set_size"]),
                )

                test_generator = generators.ContinuousGenerator(
                    [Bind(feature, is_test=True), Bind(label_feature, is_test=True)],
                    label_function=lambda image: image[1],
                    batch_function=lambda image: image[0],
                    feature_kwargs=[{}, {"is_label": True}],
                    batch_size=int(next_model["batch_size"]),
                    min_data_size=int(next_model["test_set_size"]) - 1,
                    max_data_size=int(next_model["test_set_size"]),
                )

                next_model["status"] = "Generating validation set"
                with validation_generator:
                    validation_generator.on_epoch_end()
                    validation_data, validation_labels = zip(
                        *validation_generator.current_data
                    )
                    next_model["validation_size"] = len(
                        validation_generator.current_data
                    )

                next_model["status"] = "Generating test set"
                with test_generator:
                    test_generator.on_epoch_end()
                    test_set = test_generator.current_data
                    test_data, test_labels = zip(*test_set)
                    next_model["test_size"] = len(test_generator.current_data)

                print("Extracting properties")
                next_model["status"] = "Extracting properties"
                list_of_inputs = []
                list_of_labels = []

                for data, label in zip(validation_data, validation_labels):
                    if label.ndim < 3:
                        label_out = []
                        prediction_out = []
                        if label.ndim == 0:
                            label = [label]
                        for idx, lab in enumerate(label):
                            label_out.append({"name": str(idx), "value": repr(lab)})
                    else:
                        label_out = self.save_image(label, "")
                    list_of_labels.append(label_out)
                    list_of_inputs.append(self.save_image(data, ""))

                next_model["inputs"] = list_of_inputs
                next_model["targets"] = list_of_labels
                next_model["properties"] = [
                    [
                        dict([(key, repr(value)) for key, value in prop_dict.items()])
                        for prop_dict in image.properties
                    ]
                    for image in validation_data
                ]
                min_val = np.inf

                next_model["status"] = "Pre-filling generator"
                # for _ in range(int(next_model["min_data_size"])):
                #     label_feature.update()
                #     generator.data.append(
                #         (feature.resolve(), label_feature.resolve(is_label=True))
                #     )
                #     next_model["data_size"] = len(generator.data)

                with generator:
                    while (
                        next_model in self.queuedModels
                        and next_model["completed_epochs"] < next_model["epochs"]
                    ):
                        while self.paused:
                            next_model["status"] = "Paused"
                            time.sleep(0.1)

                        next_model["status"] = "Training"
                        next_model["data_size"] = len(generator.data)
                        h = model.fit(
                            generator,
                            epochs=int(next_model["validation_freq"]),
                            validation_data=(
                                np.array(validation_data),
                                np.array(validation_labels),
                            ),
                            use_multiprocessing=False,
                            workers=0,
                        )
                        next_model["data_size"] = len(generator.data)

                        while self.paused:
                            next_model["status"] = "Paused"
                            time.sleep(0.1)

                        if h.history["val_loss"][-1] < min_val:
                            try:
                                model.save("./tmp/models/" + next_model["id"] + ".h5")
                                min_val = h.history["val_loss"][-1]
                            except Exception as e:
                                # Likely tried to save while loading the model to predict.
                                print(e)
                                print(
                                    "Likely tried to save while loading the model to predict.\n This only means the checkpoint was skipped."
                                )
                        next_model["completed_epochs"] += 1
                        next_model["loss"] += [
                            (
                                dict(
                                    [
                                        (key, item[idx])
                                        for key, item in h.history.items()
                                    ]
                                )
                            )
                            for idx in range(int(next_model["validation_freq"]))
                        ]

                        next_model["status"] = "Evaluating"
                        predictions = model.predict(np.array(validation_data[:16]))

                        def tolist(a):
                            try:
                                b = a[0]
                                return a
                            except:
                                return [a]

                        evaluations = [
                            dict(
                                [
                                    (key, value)
                                    for key, value in zip(
                                        model.metrics_names,
                                        tolist(
                                            model.evaluate(
                                                np.array([image]),
                                                np.array([label]),
                                                verbose=0,
                                            )
                                        ),
                                    )
                                ]
                            )
                            for image, label, _ in zip(
                                validation_data, validation_labels, range(32)
                            )
                        ]

                        next_model["validations"].append(evaluations)
                        list_of_preds = []
                        for prediction in predictions:
                            if prediction.ndim < 3:
                                prediction_out = []
                                if prediction.ndim == 0:
                                    prediction = [prediction]
                                for idx, label in enumerate(prediction):
                                    prediction_out.append(
                                        {"name": str(idx), "value": repr(label)}
                                    )
                            else:
                                prediction_out = self.save_image(prediction, "")
                            list_of_preds.append(prediction_out)
                        next_model["predictions"].append(list_of_preds)

                next_model["status"] = "Evaluating test set"

                evaluations = [
                    dict(
                        [
                            (key, value)
                            for key, value in zip(
                                model.metrics_names,
                                tolist(
                                    model.evaluate(
                                        np.array([image]),
                                        np.array([label]),
                                        verbose=0,
                                    )
                                ),
                            )
                        ]
                    )
                    for image, label in test_set
                ]
                next_model["test_results"] = {
                    "evaluations": evaluations,
                    "scores": dict(
                        [
                            (
                                key,
                                np.mean([sub_score[key] for sub_score in evaluations]),
                            )
                            for key in model.metrics_names
                        ]
                    ),
                }

                next_model["status"] = "Done"

            except Exception as e:
                try:
                    next_model["status"] = str(e)
                    print(str(e))
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

        preprocess = self.get_features(
            feature_config[feature_config[entrypoint]["items"][0]],
            feature_config,
            all_features,
        )

        if model_id is None:
            model = self.get_features(
                feature_config[feature_config[entrypoint]["items"][1]],
                feature_config,
                all_features,
            )
        else:
            model = keras.models.load_model(
                os.path.abspath("./tmp/models/" + model_id + ".h5"), compile=False
            )

        postprocess = self.get_features(
            feature_config[feature_config[entrypoint]["items"][2]],
            feature_config,
            all_features,
        )

        image = deeptrack.features.LoadImage(path=file).resolve()

        if preprocess:
            image = preprocess.update().resolve(image)

        prediction = model.predict_on_batch(np.array([image]))

        if prediction.ndim < 3:
            prediction_out = []
            for idx, label in enumerate(prediction):
                prediction_out.append({"name": "", "value": repr(label)})
        else:
            prediction_out = self.save_image(prediction, "")

        return prediction_out

    @cached_function
    def echo(self, text):
        """echo any text"""
        return text

    @cached_function
    def get_available_features(self, for_frontend):

        features = {}

        modules = inspect.getmembers(deeptrack, inspect.ismodule) + inspect.getmembers(
            custom_features, inspect.ismodule
        )
        for module_name, module in modules:

            module_dict = {}
            classes = inspect.getmembers(
                module, lambda x: inspect.isclass(x) or inspect.isfunction(x)
            )
            if module_name in IGNORED_MODULES:
                continue
            for class_name, module_class in classes:
                if (
                    (
                        safe_issubclass(module_class, deeptrack.features.Feature)
                        or (module_name == "models" and class_name[0].isupper())
                    )
                    and class_name not in EXCEPTIONS
                    and not safe_issubclass(module_class, IGNORED_CLASSES)
                ):

                    if module_class.__doc__:
                        description = module_class.__doc__[
                            : module_class.__doc__.find("Parameters")
                        ]
                    else:
                        description = ""
                    if for_frontend:
                        module_dict[class_name] = {
                            "class": "feature",
                            "key": module_name,
                            "type": class_name,
                            "name": class_name,
                            "description": description,
                        }
                    else:
                        module_dict[class_name] = module_class

            if module_dict:
                features[module_name] = module_dict

        return features

    def to_py(self, config, target):

        dts_to_py.to_py(config["items"], open(target, "w"))
        return True

    @cached_function
    def get_feature_properties(self, feature_name):

        for feature_type, feature_dict in self.get_available_features(False).items():
            if feature_name in feature_dict:
                arg_dict = {}
                iterator = None
                if safe_issubclass(
                    feature_dict[feature_name], deeptrack.features.Feature
                ):
                    iterator = feature_dict[feature_name].mro()
                else:
                    iterator = [feature_dict[feature_name], deeptrack.models._compile]

                for feature_class in iterator:
                    if safe_issubclass(feature_class, deeptrack.features.Feature):
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

                        default = None

                        try:
                            pos = idx - (len(arglist) - len(defaultlist))
                            if pos >= 0:
                                default = defaultlist[pos]
                                if callable(default):
                                    default = None
                        except:
                            pass

                        regex = (
                            r"^( *)(?:.{0}|\S.*)("
                            + re.escape(arglist[idx])
                            + r")(?:(?:[, ][^:\n]*:|:) *(.*)| *)((?:(?:\n|\n\r|\r)^\1 +.*)+)"
                        )

                        docstring = re.search(
                            regex,
                            feature_class.__doc__.replace("\t", "    "),
                            flags=re.MULTILINE,
                        )

                        if docstring != None:
                            docstring = list(docstring.groups())[1:]

                        if arglist[idx] not in arg_dict:
                            arg_dict[arglist[idx]] = {"default": "", "annotation": ""}

                        if default is not None:
                            arg_dict[arglist[idx]]["default"] = repr(default)
                        if annotation:
                            arg_dict[arglist[idx]]["annotation"] = annotation
                        if docstring and "description" not in arg_dict[arglist[idx]]:
                            arg_dict[arglist[idx]]["description"] = docstring

                return arg_dict
        return {}

    def get_features(
        self,
        config,
        items,
        all_features,
        SVLT={"S": True, "V": True, "T": True, "L": True},
    ):
        if config["items"]:

            features = [
                self.get_feature(items[feature], items, all_features, SVLT)
                for feature in config["items"]
            ]
            if len(features) > 1:
                featureSet = sum(features)
            else:
                featureSet = features[0]
            return featureSet
        else:
            return None

    def get_feature(
        self, feature, items, all_features, SVTL, only_return_properties=False
    ):
        feature_class = self.get_available_features(False)[feature["key"]][
            feature["type"]
        ]

        properties = {}

        SVTL = SVTL.copy()

        for key in SVTL.keys():
            SVTL[key] = feature[key] and SVTL[key]

        for prop_index in feature["items"]:
            prop = items[prop_index]
            if prop["class"] == "property":
                prop_value = prop
                prop_dict = {}

                prop_dict["S"] = prop_value.get("S", "").strip().replace('"', "'")
                prop_dict["V"] = (
                    prop_value.get("V", "").strip().replace('"', "'")
                    if SVTL["V"]
                    else ""
                )
                prop_dict["T"] = (
                    (prop_value.get("T", "") or prop_value.get("V", ""))
                    .strip()
                    .replace('"', "'")
                    if SVTL["T"]
                    else ""
                )

                if any(prop_dict.values()):
                    properties[prop_value["name"]] = prop_dict

        all_keys = list(properties.keys()) + [
            "is_validation",
            "is_test",
        ]

        for key, prop_dict in properties.items():

            value = ""
            brackets = 0
            if prop_dict["T"] and SVTL["T"]:
                brackets += 1
                value = (value + "({0}").format(
                    "{0} if is_test else ".format(prop_dict["T"])
                )
            if prop_dict["V"] and SVTL["V"]:
                brackets += 1
                value = (value + "({0}").format(
                    "{0} if is_validation else ".format(prop_dict["V"])
                )

            if value and (not prop_dict["S"] or not SVTL["S"]):
                value = "".join(value.split("if")[:-1])

            value = value + prop_dict["S"]

            value = value + ")" * brackets

            correlated_properties = []

            for other_key in all_keys:

                if other_key not in correlated_properties and re.findall(
                    "(^|[^a-zA-Z0-9\.])" + other_key + "($|[^a-zA-Z0-9])", value
                ):
                    correlated_properties.append(other_key)

            if not safe_issubclass(feature_class, deeptrack.features.Feature) or (
                value.find("random") == -1
                and value.find("lambda") == -1
                and not correlated_properties
            ):
                property_string = value

            else:
                property_string = 'lambda {parameters}: eval("{value}", {{**all_features, **{more_locals}}})'.format(
                    parameters=", ".join(correlated_properties),
                    value=value,
                    more_locals="{"
                    + ", ".join(
                        [
                            '"' + s + '":' + s
                            for s in correlated_properties + AVAILABLE_PACKAGES_NAMES
                        ]
                    )
                    + "}",
                )
            try:

                properties[key] = eval(
                    property_string,
                    {"all_features": all_features, **all_features, **PACKAGE_DICT},
                )
            except SyntaxError:
                raise SyntaxError(
                    "Failed to parse string: {0}, \n belonging to property {1}, \n of feature {2}".format(
                        repr(property_string), key, feature["name"]
                    )
                )

        for prop_index in feature["items"]:
            prop = items[prop_index]
            if prop["class"] == "featureGroup":
                feature_property = self.get_features(prop, items, all_features, SVTL)
                if feature_property:
                    properties[prop["name"]] = feature_property

        if only_return_properties:
            return properties

        feature_instance = feature_class(**properties)

        all_features[feature["name"]] = feature_instance

        # Add conditional branch for label
        if SVTL["L"]:
            _items = []
            feature_item = {
                "key": "features",
                "type": "ConditionalSetProperty",
                "S": True,
                "V": True,
                "T": True,
                "L": True,
                "items": [],
                "name": "__ConditionalSetProperty__" + feature["name"],
                "class": "feature",
            }
            for prop_index in feature["items"]:
                prop = items[prop_index]
                if prop["class"] == "property" and "L" in prop and prop["L"]:
                    prop_dict = {
                        "S": prop["L"],
                        "V": "",
                        "T": "",
                        "L": "",
                        "class": "property",
                        "name": prop["name"],
                    }

                    _items.append(prop_dict)
                    feature_item["items"].append(len(feature_item["items"]))
            if _items:
                properties = self.get_feature(
                    feature_item,
                    _items,
                    all_features,
                    {"S": True, "V": False, "T": False, "L": False},
                    only_return_properties=True,
                )

                feature_instance = deeptrack.ConditionalSetProperty(
                    feature_instance, condition="is_label", **properties
                )

        if not (feature["S"] and feature["V"] and feature["T"] and feature["L"]):

            feature_instance = deeptrack.ConditionalSetFeature(
                on_false=feature_instance if not feature["L"] else None,
                on_true=feature_instance if feature["L"] else None,
                condition="is_label",
                _data_=lambda is_sample, is_validation, is_test: not (
                    feature["S"]
                    and is_sample
                    or feature["V"]
                    and is_validation
                    or feature["T"]
                    and is_test
                ),
                is_label=lambda _data_: _data_ if not feature["L"] else not _data_,
            )

        return feature_instance

    @cached_function
    def load_model(model):
        return self.get_feature(model, {})

    def get_label_feature(self, feature_config, base_feature, all_features):

        if feature_config["label_method"] == "default":
            label_feature = self.get_feature(feature_config["label_aux"], all_features)
            return (
                label_feature,
                lambda image: label_feature.properties.current_value_dict(),
            )
        elif feature_config["label_method"] == "conditional":
            label_feature = ResolveWithProperties(feature=base_feature, is_label=True)
            return label_feature, lambda image: label_feature.resolve()
        else:
            return base_feature, lambda image: base_feature.resolve(is_label=True)

    def enqueue_training(self, config):
        import base64

        job = Job(config)
        job["status"] = "Waiting"

        job["inputs"] = []
        job["targets"] = []
        job["predictions"] = []
        job["validations"] = []
        job["properties"] = []
        job["test_results"] = {}
        job["loss"] = []
        job["validation_size"] = 0
        job["data_size"] = 0
        job["test_size"] = 0
        job["test_set_size"] = 100

        if not "completed_epochs" in job:
            job["completed_epochs"] = 0
        job["epochs"] = int(job["epochs"]) - int(job["completed_epochs"])

        if not "id" in job:
            job["id"] = datetime.datetime.now().strftime("%Y%m%d-%H%M%S") + str(
                np.random.randint(10000)
            )

        if not "model_name" in job:
            job["model_name"] = job["name"]

        self.queuedModels.append(job)
        return self.queuedModels

    def get_queue(self, current=[]):
        output = []
        for job in self.queuedModels:
            for c in current:
                if c["id"] == self.queuedModels["id"]:
                    if c["timestamp"] != self.queuedModels["timestamp"]:
                        output.append(job)
                    else:
                        break
            output.append(job)

        return output

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

    def sample_feature(self, feature_config, state):

        all_features = {}

        entrypoint = None

        for feature in feature_config:
            if "name" in feature and feature["name"] == "Dataset":
                entrypoint = feature["index"]
                break

        aux = self.get_features(
            feature_config[feature_config[entrypoint]["items"][0]],
            items=feature_config,
            all_features=all_features,
        )

        feature = aux + self.get_features(
            feature_config[feature_config[entrypoint]["items"][1]],
            items=feature_config,
            all_features=all_features,
        )

        label_feature = self.get_features(
            feature_config[feature_config[entrypoint]["items"][2]],
            items=feature_config,
            all_features=all_features,
        )

        if label_feature:
            label_feature = feature + label_feature
        else:
            label_feature = feature

        print("=" * 10 + " Resolving " + "=" * 10)
        result_dict = {}
        for key, condition in [
            ("S", "is_sample"),
            ("V", "is_validation"),
            ("T", "is_test"),
        ]:
            if key in state and state[key]:

                kwargs = {}
                kwargs[condition] = True
                feature.update(get_one_random=True, **kwargs)
                label_feature.update(get_one_random=True, **kwargs)
                t1 = time.time()
                sample_image = deeptrack.image.Image(feature.resolve())
                t2 = time.time()
                print("Resolved image in {:06.4f} seconds".format(t2 - t1))

                t1 = time.time()
                labels = label_feature.resolve(is_label=True)
                t2 = time.time()
                print("Resolved label in {:06.4f} seconds".format(t2 - t1), "\n")

                result_dict[key] = [sample_image, labels]

        for r_key, r_list in result_dict.items():
            sample_image = r_list[0]
            labels = r_list[1]

            if sample_image.ndim >= 4:
                idx = np.random.randint(len(sample_image))
                sample_image = sample_image[idx]
                labels = labels[idx]

            print(labels.ndim)
            if sample_image.size > 2e7:
                raise EnvironmentError(
                    "Result too large! Image is {0}. If you are loading batches of data from storage, try setting the `ndim` property of LoadImage to 4.".format(
                        sample_image.shape
                    )
                )

            if labels.size > 2e7:
                raise EnvironmentError(
                    "Result too large! Label is {0}. If you are loading batches of data from storage, try setting the `ndim` property of LoadImage to 4.".format(
                        labels.shape
                    )
                )

            sample_image_file = self.save_image(
                np.squeeze(sample_image), "./tmp/feature.bmp"
            )
            if isinstance(
                labels, deeptrack.image.Image
            ) and "Label" in labels.get_property("name", False, []):
                for prop in labels.properties:
                    if "name" in prop and prop["name"] == "Label":
                        propdict = prop
                        break

                propdict.pop("hash_key", False)
                propdict.pop("is_label", False)
                propdict.pop("output_shape", False)
                propdict.pop("name", False)

                if len(propdict.keys()) == labels.size:
                    labels = [
                        {"name": key, "value": repr(value)}
                        for key, value in zip(propdict.keys(), labels)
                    ]
                else:
                    labels = [{"name": "N/A", "value": str(value)} for value in labels]
            elif labels.ndim == 1:
                labels = [{"name": "N/A", "value": str(value)} for value in labels]
            elif labels.ndim == 0:
                labels = [{"name": "N/A", "value": str(labels)}]
            elif not isinstance(labels, dict):
                labels = self.save_image(labels, "./tmp/feature.bmp")
            result_dict[r_key] = [sample_image_file, labels]

        return result_dict

    @cached_function
    def load_image(self, path_to_image):
        """Loads an image

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
        """

        _input = np.array(Image.open(os.path.abspath(path_to_image)))

        is_colored = len(_input.shape) == 3
        is_grayscaled = len(_input.shape) == 2

        if is_colored:
            image = np.mean(_input, axis=-1)
        elif is_grayscaled:
            image = _input
        else:
            raise RuntimeError(
                "Incorrect input image. The dimension of input image {0} is other than 2 or 3. Found {1}".format(
                    path_to_image, _input.shape
                )
            )

        image = self.crop_to_divisible(image, 16)
        image = np.expand_dims(image, axis=0)
        image = image - np.min(image)
        image = image / np.max(image)

        return np.expand_dims(np.array(image), axis=-1)

    def save_image(self, images, name):
        """Saves an image to disk

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
        """

        from PIL import Image
        import base64

        out = []
        while images.ndim < 3:
            images = np.expand_dims(images, axis=-1)

        for f in range(images.shape[-1]):
            image = images[..., f]

            image -= np.min(image)
            immax = np.max(image)
            if immax == 0:
                immax = 1
            image = image / immax * 255

            image = Image.fromarray(np.array(image).astype(np.uint8))

            tmpfile = io.BytesIO()

            image.save(tmpfile, format="bmp")

            tmpfile.seek(0)
            out.append(tmpfile.getvalue())
        return out

    def crop_to_divisible(self, image, divisor):
        """Crops the dimensions of an image

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
        """

        x_max = image.shape[0] // divisor * divisor
        y_max = image.shape[1] // divisor * divisor

        return image[:x_max, :y_max]
