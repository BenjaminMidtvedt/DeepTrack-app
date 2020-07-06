import {
    ADD_ITEM,
    DELETE_ITEM,
    DROP_ITEM,
    LOAD_ITEMS,
    SET_NAME,
    SET_VALUE,
    TOGGLE_EXPAND,
    CLEAR_STORE
} from './actions.js'

const defaultItem = {
    items: [],
    name: "",
    expand: true
}

const initialItems = [{
    ...defaultItem,
    index: 0
}]

function addItem(items, action) {

    const targetItem = {...items[action.target]}
    const newItem = {...defaultItem, ...action.item}
    newItem.index = items.length
    targetItem.items = [...targetItem.items, items.length]
    const newList = items.slice()
    
    newList[targetItem.index] = targetItem;
    newList.push(newItem)
    return newList
}

// Receives a copied version of items and can therefore mutate the state
function collect(items) {
    const is_referenced = Array(items.length).fill(false)
    is_referenced[0] = true
    for (let index = 0; index < items.length; index++) {
        const item = items[index]

        if (item && item.items) {
            item.items.forEach(i => is_referenced[i] = true)
        }
    }
    console.log(is_referenced)
    return items.map((item, index) => is_referenced[index] ? item : null)
}

function deleteItem(items, action) {

    
    items = items.map(item => {
        if (!item || !item.items) return item 

        const idx = item.items.indexOf(action.target);
        if ( idx === -1 ) return item

        item = {...item}
        item.items = item.items.slice()
        item.items.splice(idx, 1)
        return item
    })

    items = collect(items)
    return items
}



function dropItem(items, action) {

    if (action.index instanceof Object) {
        items = addItem(items, {item: action.index, target: action.target})
        action.index = items.length - 1
    }

    return (items.map((item, index) => {
        if (item && item.items) {

            if (item.items.indexOf(action.index) !== -1) {
                const targetItem = {...item}
                targetItem.items = targetItem.items.slice()
                targetItem.items.splice(targetItem.items.indexOf(action.index), 1)
                item = targetItem
            }

            if (index === action.target) {
                const itemIndex = action.child
                console.log(itemIndex) 
                const targetItem = {...item}
                targetItem.items = targetItem.items.slice()

                const position = (targetItem.items.indexOf(itemIndex) + action.position) || 0
                console.log(position, targetItem.items.indexOf(itemIndex), action.position)
                targetItem.items.splice(position, 0, action.index)
                item = targetItem
            } 
            
        }
        return item
    }))
}

function setName(items, action) {
    return (
        items.map((item, index) => {
            if (item && index === action.target) {
                return {...item, 
                    name: action.name
                }
            }
            return item
        })
    )
}

function setValue(items, action) {
    return (
        items.map((item, index) => {
            if (item && index === action.target) {
                return {...item, 
                    value: action.value
                }
            }
            return item
        })
    )
}

function toggleExpand(items, action) {
    return (
        items.map((item, index) => {
            
            if (item && index === action.target) {
                return {
                    ...item, 
                    expand: !item.expand
                }
            }
            return item
        })
    )
}

function loadItems(items, action) {
    items = deleteItem(items, action)

    const indexMap = {}
    action.items.forEach((item, index) => {
        indexMap[item.index] = items.length + index 
    })

    action.items.forEach((item, index) => {
        if (!item) return
        item = {...item}
        if (item.items) {
            item.items = item.items.map((ind) => indexMap[ind])
        }
        items.push(item)
    })
}

function copyItem(items, action) {

    const copied_item = {...items[action.index]}
    copied_item.index = items.length
    items.append(copied_item)

    copied_item.items = (copied_item.items || []).map((item) => {
        const index = items.length
        copyItem(items, {"index": item})
        return index
    })

    return items
}




export function items(state = initialItems, action) {
    switch (action.type) {
        case ADD_ITEM:
            return addItem(state, action)
        case DELETE_ITEM:
            return deleteItem(state, action)
        case DROP_ITEM:
            return dropItem(state, action)
        case SET_NAME:
            return setName(state, action)
        case SET_VALUE:
            return setValue(state, action)
        case LOAD_ITEMS:
            return loadItems(state, action)
        case TOGGLE_EXPAND:
            return toggleExpand(state, action)
        case CLEAR_STORE:
            return initialItems
        default:
            return state
    }
}
