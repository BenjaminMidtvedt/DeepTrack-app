import sys
import inspect
import re
sys.path.append("..")

import deeptrack as dt

import argparse


# NEEDED FOR MACOS
def safe_issubclass(v1, v2):
    try:
        return issubclass(v1, v2)
    except:
        return False

# String constants
header = '''
### NOTICE
# This file was automatically generated using DeepTrack 2.0
# The GUI is available at https://github.com/BenjaminMidtvedt/DeepTrack-app/releases/latest
# The package is installed using `pip install deeptrack`
# You are free to remove this notice, but the authors prefer if you leave it in!


### IMPORTS
import deeptrack as dt


### FEATURES
# All features required by this code.
# If the section `CONFIG` exists, the values can be modified
# to suit the task at hand.

'''

MERGE = '''
model_input = Image + Preprocess

model_target = model_input + Label

'''

TRAIN = '''

def fit(epochs=100, **generator_inputs):
    generator = dt.generators.ContinuousGenerator(
        (model_input, model_target),
        label_function=lambda image: image[1], 
        batch_function=lambda image: image[0],
        feature_kwargs=[{}, {"is_label": True}], 
        **generator_inputs
    )

    with generator:
        Network.fit(generator, epochs=epochs)
    
    return Network
'''

MAIN = '''
if __name__ == "__main__":
    fit(batch_size=16, min_data_size=100, max_data_size=1000)
    filename = __file__.split(".")[0] + ".h5"
    Network.save_model("./{file}".format(filename))
    print("Saved model to ./{file}".format(filename))
'''

def to_py(config, output):
    output.write(header)
    
    root = config[0]

    for index in root["items"]:
        output.write(subsection(config[index], config))

    output.write('''
### COMBINE FEATURES

''')

    for index in root["items"]:
        output.write(merge(config[index], config))
    
    output.write(MERGE)
    output.write(TRAIN)
    output.write(MAIN)

    


subsection_header = '''
{depth} {section_name}
'''
def subsection(item, config, n=3):
    if not item["items"]:
        return ""

    string = subsection_header.format(section_name=item["name"], depth="#"*n)
    for index in item["items"]:
        subitem = config[index]
        if subitem["class"] == "featureGroup":
            string += subsection(subitem, config, n=n-1)
        if subitem["class"] == "feature":
            string += feature(subitem, config)
    
    
    return string


def merge(item, config):
    string = ""
    for index in item["items"]:
        subitem = config[index]
        
        string += subitem["name"] + " = " + (" + ".join(
                [config[subidx]["name"] for subidx in subitem["items"]]
            ) or "None") + "\n\n"
        
    return string


feature_struct = '''
{feature_name} = dt.{feature_type}({properties})

'''
property_struct = "{0}={1}"
property_separator = ",\n\t"
def feature(item, config):
    return get_feature(item, config, "")



def get_feature(feature, items, string):

    feature_class = available_features[feature["key"]][feature["type"]]

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
        
        if not safe_issubclass(feature_class, dt.features.Feature) or \
            (value.find("random") == -1 and value.find("lambda") == -1 and not correlated_properties):
            properties[key] = value
        else:
            property_string = ("lambda {parameters}: {value}"
                                .format(parameters=(", ".join(correlated_properties)),
                                        value=value))
            properties[key] = property_string
        
    additional_features = {}

    for prop_index in feature["items"]:
        prop = items[prop_index]
        if prop["class"] == "featureGroup":
            for index in prop["items"]:
                string = get_feature(items[index], items, string)
            
            properties[prop["name"]] = " + ".join(items[index]["name"] for index in prop["items"])

    properties_list = [property_struct.format(key, value) for key, value in properties.items() if value]
    properties_string = property_separator.join(properties_list)
    
    if properties_string:
        properties_string = "\n\t" + properties_string + "\n"

    if feature["type"] == "Microscope" and len(feature["items"]) == 2:
        my_string = feature["name"] + " = " + properties["objective"] + "(" + properties["sample"] + ")\n"
    elif feature["type"] == "Duplicate" and len(feature["items"]) == 2:
        my_string = feature["name"] + " = " + properties["feature"] + " ** (" + properties["num_duplicates"] + ")\n"
    else:
        ftype = feature["type"]
        print(feature["key"])
        if feature["key"] in ["models"]:
            ftype = feature["key"] + "." + ftype
        my_string = feature_struct.format(feature_name=feature["name"], feature_type=feature["type"], properties=properties_string)
    
    string += my_string 
    return string


def get_available_features(for_frontend):

    features = {}

    modules = inspect.getmembers(dt, inspect.ismodule)
    for module_name, module in modules:

        module_dict = {}
        classes = inspect.getmembers(module, lambda x: inspect.isclass(x) or inspect.isfunction(x))

        for class_name, module_class in classes:
            if (safe_issubclass(module_class, dt.features.Feature) or (
                module_name == "models" and class_name[0].isupper())):


                module_dict[class_name] = module_class
        
        if module_dict:
            features[module_name] = module_dict

    return features

available_features = get_available_features(False)