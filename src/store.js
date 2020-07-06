import { combineReducers, createStore, applyMiddleware } from "redux"
import undoable, {CLEAR, GROUPBEGIN, GROUPEND} from 'easy-redux-undo'
import { items } from './reducers.js'
import { addItem, clearStore, CLEAR_STORE } from "./actions"

const fs = window.require('fs')


let next_job = undefined
const CACHE = "./tmp/cache/"

const itemReducer = combineReducers({
    items
})

const app = combineReducers({
    undoable: undoable(itemReducer)
})


const logger = store => next => action => {
    console.group(action.type)
    console.info('dispatching', action)
    let result = next(action)
    console.log('next state', store.getState())
    console.groupEnd()
    return result
}

const cache = store => next => action => {
    const next_state = store.getState()
    queue_cache(next_state)
    return next(action)
}

function load() {
    
    const files = fs.readdirSync(CACHE)
    files.sort((a, b) => {
        return fs.statSync(CACHE + a).mtime.getTime() - 
               fs.statSync(CACHE + b).mtime.getTime();
    });
    if (files.length > 0) {
        const target = files[0]
        const job = fs.readFileSync(CACHE + target)
        return JSON.parse(job)
    }
    return undefined
}

export function reset() {
    store.dispatch(GROUPBEGIN())
    store.dispatch(clearStore())
    store.dispatch(addItem(0, {name:"Dataset", load:".dts", class: "root", grabbable: false}))
    store.dispatch(addItem(0, {name:"Model", load:".dtm", class: "root", grabbable: false}))
    store.dispatch(addItem(1, {name:"Image", class: "featureGroup", grabbable: false}))
    store.dispatch(addItem(1, {name:"Label", class: "featureGroup", grabbable: false}))
    store.dispatch(addItem(2, {name:"Preprocess", class: "featureGroup", grabbable: false}))
    store.dispatch(addItem(2, {name:"Network", class: "featureGroup", grabbable: false}))
    store.dispatch(addItem(2, {name:"Postprocess", class: "featureGroup", grabbable: false}))
    store.dispatch(GROUPEND())
}

const initial_state = load();

const store = createStore(app, initial_state, applyMiddleware(...[logger, cache]))

const root = {
    name: "Root",
    class: "featureGroup",
    grabbable: false,
}


if (!initial_state || initial_state.undoable.present.items.length < 7) {
    reset()
    store.dispatch(CLEAR())
}



export default store



function queue_cache(job) {
    if (next_job) {
        next_job = job
    } else {
        next_job = job
        save(job)
    }
}

async function save(job) {
    
    const files = fs.readdirSync(CACHE)
    files.sort((a, b) => {
        return fs.statSync(CACHE + a).mtime.getTime() - 
               fs.statSync(CACHE + b).mtime.getTime();
    });
    let target = "_cache_a"
    if (files.length === 1) {
        target = "_cache_b"
    } else if (files.length > 1) {
        target = files[0]
    }
    
    fs.writeFileSync(CACHE + target, JSON.stringify(job))

    next_job = undefined
}

