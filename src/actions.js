export const ADD_ITEM = "ADD_ITEM"
export const TOGGLE_EXPAND = "TOGGLE_EXPAND"
export const SET_NAME = "SET_NAME"
export const SET_VALUE = "SET_VALUE"
export const GRAB_ITEM = "GRAB_ITEM"
export const DROP_ITEM = "DROP_ITEM"
export const DELETE_ITEM = "DELETE_ITEM"
export const SAVE_ITEM = "SAVE_ITEM"
export const LOAD_ITEMS = "LOAD_ITEMS"
export const CLEAR_STORE = "CLEAR_STORE"
export const INJECT_ITEMS = "INJECT_ITEMS"

export function addItem(target, item) {
    return {type: ADD_ITEM, target, item}
}

export function toggleExpand(target) {
    return {type: TOGGLE_EXPAND, target}
}

export function setName(target, name) {
    return {type: SET_NAME, target, name}
}

export function setValue(target, field, value) {
    return {type: SET_VALUE, target, field, value}
}

export function grabItem(target, item) {
    return {type: GRAB_ITEM, target, item}
}

export function dropItem(index, target, child, position) {
    return {type: DROP_ITEM, index, target, child, position}
}

export function deleteItem(target) {
    return {type: DELETE_ITEM, target}
}

export function removeItem(index) {
    return deleteItem(index)
}

export function saveItem(target) {
    return {type: SAVE_ITEM, target}
}

export function loadItems(index, items) {
    return {type: LOAD_ITEMS, index, items}
}

export function clearStore() {
    return {type: CLEAR_STORE}
}

export function injectItems(items, target, child, position) {
    return {type: INJECT_ITEMS, items, target, child, position}
}