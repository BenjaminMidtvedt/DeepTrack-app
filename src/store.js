import { combineReducers, createStore, applyMiddleware } from "redux";
import undoable, { CLEAR, GROUPBEGIN, GROUPEND } from "easy-redux-undo";
import { items, logger } from "./reducers.js";
import { addItem, clearStore } from "./actions";

const fs = window.require("fs");
const path = window.require("path");

const { remote } = window.require("electron");
export const appPath = remote.app.getAppPath();

const CACHE = path.join(appPath, "/tmp/cache/");

let next_job = undefined;

const itemReducer = combineReducers({
    items,
});

const app = combineReducers({
    undoable: undoable(itemReducer),
    logger,
});

let c = 0;
const cache = (store) => (next) => (action) => {
    clearTimeout(c);
    c = setTimeout(() => {
        const state = JSON.stringify(store.getState());
        window.localStorage.setItem("_cached_store", state);
    }, 1000);
    return next(action);
};

function load() {
    const store = window.localStorage.getItem("_cached_store");
    if (store) {
        return JSON.parse(store);
    }
    return undefined;
}

export function reset() {
    store.dispatch(GROUPBEGIN());
    store.dispatch(clearStore());
    store.dispatch(
        addItem(0, {
            name: "Dataset",
            load: ".dts",
            class: "root",
            grabbable: false,
        })
    );
    store.dispatch(
        addItem(0, {
            name: "Model",
            load: ".dtm",
            class: "root",
            grabbable: false,
        })
    );
    store.dispatch(
        addItem(1, { name: "Config", class: "featureGroup", grabbable: false })
    );
    store.dispatch(
        addItem(1, { name: "Image", class: "featureGroup", grabbable: false })
    );
    store.dispatch(
        addItem(1, { name: "Label", class: "featureGroup", grabbable: false })
    );
    store.dispatch(
        addItem(2, {
            name: "Preprocess",
            class: "featureGroup",
            grabbable: false,
        })
    );
    store.dispatch(
        addItem(2, { name: "Network", class: "featureGroup", grabbable: false })
    );
    store.dispatch(
        addItem(2, {
            name: "Postprocess",
            class: "featureGroup",
            grabbable: false,
        })
    );
    store.dispatch(GROUPEND());
}

const initial_state = load();

const store = createStore(app, initial_state, applyMiddleware(...[cache]));

const root = {
    name: "Root",
    class: "featureGroup",
    grabbable: false,
};

if (!initial_state || initial_state.undoable.present.items.length < 8) {
    reset();
    store.dispatch(CLEAR());
}

export default store;

function queue_cache(job) {
    if (next_job) {
        next_job = job;
    } else {
        next_job = job;
        save(job);
    }
}

async function save(job) {
    const files = fs.readdirSync(CACHE);
    files.sort((a, b) => {
        return (
            fs.statSync(CACHE + a).mtime.getTime() -
            fs.statSync(CACHE + b).mtime.getTime()
        );
    });
    let target = "_cache_a";
    if (files.length === 1) {
        target = "_cache_b";
    } else if (files.length > 1) {
        target = files[0];
    }

    fs.writeFile(
        CACHE + target,
        JSON.stringify(job),
        () => (next_job = undefined)
    );
}
