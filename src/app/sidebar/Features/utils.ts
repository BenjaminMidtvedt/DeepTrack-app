import store from '../../../store/store';
import Python from '../../../providers/PythonInterface';
import { StoreItem } from '../../../types/StoreTypes';

interface Branch {
    [key: string]: Branch | StoreItem;
}

type Trigger = Branch & { _suggestionData: StoreItem };

type Triggers = {
    [key: string]: Trigger;
};

export function getTriggersFromTree(tree: StoreItem[], blacklist: number[]): Triggers {
    const formatedTree: Triggers = {};

    tree = store.getState().undoable.present.items;

    const getTriggersFromFeature = (featureIndex) => {
        const feature = tree[featureIndex];
        switch (feature.class) {
            case 'featureGroup':
                feature.items.forEach((i) => getTriggersFromFeature(i));
                break;
            case 'feature':
                let branch: Triggers | Trigger = formatedTree;
                if (!blacklist.includes(feature.index)) {
                    const newFeature = { ...feature } as StoreItem;
                    newFeature.key = newFeature.name;
                    branch = {
                        _suggestionData: newFeature,
                    };
                    formatedTree[feature.name] = {
                        _suggestionData: newFeature,
                    };
                }

                feature.items.forEach((i: number) => {
                    const sub = tree[i];
                    if (sub.class === 'featureGroup') return getTriggersFromFeature(i);
                    if (!blacklist.includes(sub.index)) {
                        const newItem = { ...sub };
                        newItem.key = newItem.name;
                        branch[newItem.name] = { _suggestionData: newItem };
                    }
                });
                break;
            default:
                break;
        }
    };

    tree[0].items.forEach((i) => {
        tree[i].items.forEach((j) => getTriggersFromFeature(j));
    });

    return formatedTree;
}

/* =============================================================== */
export let available_functions: StoreItem[];

Python.getAvailableFunctions((err, res) => {
    if (res) {
        available_functions = res;
    }
});
