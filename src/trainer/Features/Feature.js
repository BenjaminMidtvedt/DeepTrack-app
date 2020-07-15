import React from 'react';
import { Dialog, DialogActions, DialogTitle, DialogContent, Collapse, List, ListItem, Tooltip, Input, ListSubheader, Button, ListItemText, DialogContentText, LinearProgress, Typography, IconButton, } from "@material-ui/core"
import { ExpandMore, Add, CloseOutlined, SaveOutlined, Settings, Memory, Code, Share, FolderOpen } from "@material-ui/icons"
import {  useSnackbar } from 'notistack';
import { connect } from 'react-redux'
import {UNDO, REDO, GROUPBEGIN, GROUPEND} from "easy-redux-undo"

import { toggleExpand, addItem, setName, setValue, removeItem, dropItem, injectItems } from "../../actions"

import AutoComplete from '../AutoComplete/index.js';

import Python from "../../PythonInterface"
import store from '../../store';




const fs = window.require('fs')
const path = window.require("path")

let available_functions = {}

Python.getAvailableFunctions((err, res) => {
    console.log(err, res)
    if (res) {
        available_functions = res
    }
})


let SAVES_FOLDER = path.resolve("./saves/") + "\\"

if (!fs.existsSync(SAVES_FOLDER)) {
    SAVES_FOLDER = path.resolve("./resources/app/saves/") + "\\"
}

let GLOBAL_REMOVE_TARGET = () => {

}

const throttle = (f) => {
    let token = null, lastArgs = null;
    const invoke = () => {
        f(...lastArgs);
        token = null;
    };
    const result = (...args) => {
        lastArgs = args;
        if (!token) {
            token = requestAnimationFrame(invoke);
        }
    };
    result.cancel = () => token && cancelAnimationFrame(token);
    return result;
};

function getTriggersFromTree(tree, blacklist) {
    // if (this.oldTree === tree) {
    //     return this.oldTriggers
    // } 

    // this.oldTree = {...tree}

    const formatedTree = {}

    tree = store.getState().undoable.present.items
    const getTriggersFromFeature = (featureIndex) => {
        const feature = tree[featureIndex]
        switch (feature.class) {
            case "featureGroup":
                feature.items.forEach((i) => getTriggersFromFeature(i))
                break;
            case "feature":
                let branch = formatedTree;
                if (!blacklist.includes(feature.index)) {
                    const newFeature = {...feature}
                    newFeature.key = newFeature.name
                    formatedTree[feature.name] = {"_suggestionData": newFeature}
                    branch = formatedTree[feature.name]
                }
                
                feature.items.forEach((i) => {
                    const sub = tree[i]
                    if (sub.class === "featureGroup") return getTriggersFromFeature(i)
                    if (!blacklist.includes(sub.index)) {
                        const newItem = {...sub}
                        newItem.key = newItem.name
                        branch[newItem.name] = {"_suggestionData": newItem}
                    }
                    

                })
                break;
            default:
                break;
        }
    }

    tree[0].items.forEach((i) => {tree[i].items.forEach(j => getTriggersFromFeature(j))})
    console.log(formatedTree)
    return formatedTree
} 



function AutoCompleteItem(props) {
    let AcIcon = null
    switch (props.entity[1] ? props.entity[1].class : "") {
        case "property":
            AcIcon = Settings
            break;
        case "feature":
            AcIcon = Memory
            break;
        case "module":
            AcIcon = Share
            break;
        case "function":
            AcIcon = Code
            break;
        default:
            AcIcon = Code
            break;
    }

    return (
        
        <div className={"aci"}>
                <AcIcon style={{height:"20px", top:"1px"}}></AcIcon> <span>{props.entity[0]}</span>
        </div>
    )
}

function getInfoBox(item) {
    if (item) {
        switch (item[1].class) {
            case "module":
                break;
            case "function":
                return (<div>{item[1].signature}</div>)
            case "property":
                return (<div>{item[1].value}</div>)
            default:

                break;
        }
    }
    
}

function AutoCompleteInput(props) {

    const [tree, setTree] = React.useState({})

    console.log(props.parent, "input")
    return (
        <AutoComplete
            getInfoBox={getInfoBox}
            className={"actb"}
            onFocus={() => {
                setTree({...(available_functions || {}), ...getTriggersFromTree(props.tree, [props.parent])})
            }}
            style={{width:"90%", fontFamily: "Hack", fontSize: "12px"}}
            onChange={props.onChange}
            value={props.value}
            dropdownStyle={{zIndex: 999}}
            separators={props.separators}
            component={(props) => <AutoCompleteItem {...props} onSelect={(item) => {}}/>}
            tree={tree}
            >
        </AutoComplete>
    )
}

function NameInput(props) {

    const re = /[^a-zA-Z0-9_]/gi;

    // const [value, setValue] = React.useState((props.inputProps.defaultValue && props.inputProps.defaultValue.replace(re, "")) || "")

    function onChangeHandler(e) {
        const newValue = e.target.value.replace(re, "")
        
        e.target.value = newValue

        e.persist()
        props.onChange && props.onChange(e)
    }

    return (
        <Input {...props.inputProps}
        onChange={onChangeHandler}></Input>
    )
}

class PropertyValue extends React.Component {

    render() {
        const { item } = this.props
        return (

            <div>
                
                {/* <Input style={{ width: "80%" }}
                    defaultValue={item.value || ""}
                    onChange={(e) => item.value = e.target.value}
                    placeholder={"Enter value or expression"}
                /> */}
            </div>
        )
    }
}

class Property extends React.Component {

    state = {
        isopen: false,
        alertOpen: false
    }

    render() {
        const { item, onDelete, parent } = this.props
        const parentType = store.getState().undoable.present.items[parent].key

        console.log(item.index, "property")

        return (
            <div className="property">
                <Tooltip enterDelay={200} title={(item.descriptions && item.descriptions[item.name] && item.descriptions[item.name].length) ? item.descriptions[item.name][1] : ""}>
                    <div className={parentType}>
                        <div
                            className={"header-wrap darken"}
                            onClick={() => actions.toggleExpand(item.index)}>

                            <div className={"expand-wrap " + (item.expand ? " expand-open" : "expand-closed")}>
                                <ExpandMore
                                    className="expand-left"
                                />
                            </div>
                            <div className="block-header">
                                <NameInput 
                                    inputProps = {{
                                        style: {fontFamily: "Hack", fontSize:12, height:"24px"},
                                        value: item.name,
                                        placeholder: "Property name", 
                                    }}
                                    
                                onChange={(e) => { actions.setName(item.index, e.target.value) }} />
                            </div>
                            {/* <div className="header-right">
                                <CloseOutlined onClick={(ev) => {
                                    ev.stopPropagation()
                                    this.setState({ alertOpen: true })
                                }}></CloseOutlined>
                            </div>
                            <DeleteAlert
                                open={this.state.alertOpen}
                                onClose={(shouldDelete, e) => {
                                    if (shouldDelete === true) {
                                        onDelete()
                                    }
                                    this.setState({ alertOpen: false })
                                }} /> */}
                        </div>
                    </div>
                </Tooltip>
                <div className={"sidebar-item-noscroll"}>
                    <Collapse in={item.expand}>
                        <div className="collapsed">
                            <div className={parentType}><div className={"darken"}><div className={"darken"}>
                                <AutoCompleteInput 
                                    parent={item}
                                    name={item.name}
                                    style={{width: "80%"}} 
                                    placeholder={"Enter value or expression"}
                                    value={item.value}
                                    onChange={(e) => actions.setValue(item.index, e.target.value)}
                                    tree={this.props.tree} 
                                    separators = {["\\*", "\\-", "\\+", "\\/", "\\("]}/>
                            </div></div></div>
                        </div>
                    </Collapse>
                </div>
            </div>
        )
    }
}


function SaveModal(props) {
    const { enqueueSnackbar } = useSnackbar();
    function handleClose(shouldSave) {
        if (shouldSave) {
            const filepath = SAVES_FOLDER + props.item.name + (props.extension || ".dtf")
            
            let list = []
            const snapshot = store.getState().undoable.present.items
            function recurseItem(item) {
                if (item) {
                    list.push(item)
                    if (item.items) {
                        item.items.forEach((index) => {
                            recurseItem(snapshot[index])
                        })
                    }
                }
            }

            recurseItem(props.item)

            fs.writeFile(filepath, JSON.stringify(list),
                (err) => {
                    if (err) {
                        enqueueSnackbar("Could not save file", { variant: "error" })
                    } else {
                        enqueueSnackbar("Feature saved to " + filepath, { variant: "success" })
                    }

                })
        }
        props.onClose(shouldSave)
    }
    return (
        <Dialog
            open={props.open}>
            <DialogTitle>Save {props.item.name}?</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    This will overwrite the existing file with the same name
                </DialogContentText>
            </DialogContent>

            <DialogActions>
                <Button onClick={() => handleClose(false)}>
                    Cancel
                </Button>
                <Button onClick={() => handleClose(true)} color="primary" autoFocus>
                    Save
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export class Feature extends React.Component {

    state = {
        isopen: false,
        alertOpen: false,
        nameError: false,
        isDragging: false,
        openSave: false,
        openSnack: false
    }

    borderBottom = false
    borderTop = false

    property_descriptions = {}

    _ref = React.createRef();

    validateName(name) {
        const names = getAllNames("feature")
        return !names.includes(name)
    }

    _update = throttle(() => {
        if (this._ref && this._ref.current) {
            this._ref.current.style.borderBottom = this.borderBottom ? `dashed 2px white` : ``;
            this._ref.current.style.borderTop = this.borderTop ? `dashed 2px white` : ``;
        }
    });

    componentDidUpdate() {
        this._update()
    }

    componentDidMount() {
        // this.properties = Python.getFeatureProperties(this.props.type)
        const { item } = this.props


        if (!item.items || item.items.length === 0) {

            Python.getFeatureProperties(item.type, (err, obj) => {
                if (obj) {
                    Object.entries(obj).forEach((value) => {
                        const name = value[0]
                        const obj = value[1]
                        console.log(obj)
                        const propDict = {
                            class: "property",
                            name: name,
                            value: obj.default || ""
                        }

                        let annotation = obj.annotation

                        if (annotation) {
                            annotation = annotation.split("'")[1]
                            propDict.type = annotation
                            if (annotation === "deeptrack.features.Feature") {
                                propDict.class = "featureGroup"
                                propDict.items = []
                            }
                        }

                        let description = obj.description

                        if (description) {
                            this.property_descriptions[description[0]] = [description[1], description[2]]
                        }

                        propDict.descriptions = this.property_descriptions
                        actions.addItem(item.index, propDict)
                    })
                }
                actions.GROUPEND()
            })
        }
    }

    _ref = React.createRef()

    render() {
        const { item, onDelete } = this.props
        const { nameError, openSave } = this.state
        
        console.log(item.index, "feature")

        return (
            <div className={"block feature "}
                ref={this._ref}
                onDragOver={(e) => {

                    e.stopPropagation();
                    e.preventDefault();

                    var bounds = this._ref.current.getBoundingClientRect();
                    var y = (e.clientY - bounds.top) / (bounds.bottom - bounds.top);

                    this.borderTop = y < 0.5
                    this.borderBottom = y >= 0.5
                    this._update()
                }}
                onDragLeave={(e) => {
                    this.borderTop = false
                    this.borderBottom = false
                    this._update()
                }}

                onDrop={(e) => {
                    e.preventDefault()

                    var bounds = this._ref.current.getBoundingClientRect();
                    var y = (e.clientY - bounds.top) / (bounds.bottom - bounds.top);

                    e.feature = item.index;
                    e.position = y > 0.5;
                    this.borderTop = false
                    this.borderBottom = false
                }}
            >
                <div draggable
                    onDragStart={e => {
                        const sent = item.index
                        e.dataTransfer.setData("item", sent)

                        window.requestAnimationFrame(() => {
                            if (this._ref && this._ref.current) {
                                this._ref.current.style.visibility = "hidden"
                                this._ref.current.style.height = "0"
                            }
                        })
                    }}
                    onDragEnd={e => {
                        window.requestAnimationFrame(() => {
                            if (this._ref && this._ref.current) {
                                this._ref.current.style.visibility = ""
                                this._ref.current.style.height = ""
                            }  
                        })

                    }}
                    className={"header-wrap grabbable accent-border " + item.key}
                    onClick={() => actions.toggleExpand(item.index)}>

                    <div className={"expand-wrap " + (item.expand ? " expand-open" : "expand-closed")}>
                        <ExpandMore
                            style={{height:24}}
                            className="expand-left"
                        />
                    </div>
                    <div className="block-header ">
                        <NameInput
                            onChange={(e)=>{
                                actions.setName(item.index, e.target.value)
                            }}
                            inputProps = {{
                                error: nameError,
                                style:{fontFamily: "Hack", fontSize:12, height:"24px"},
                                value: item.name,
                                onBlur:(e) => {
                                    const { value } = e.target

                                    if (this.validateName(value)) {
                                        
                                        this.setState({ nameError: false })
                                    } else {
                                        this.setState({ nameError: true })
                                    }
                                }
                            }}/>
                        <span style={{ fontSize: "11px", paddingLeft: "6px", color: "rgba(255,255,255, 0.4)" }}>
                            {item.type}
                        </span>
                    </div>
                    <div className="header-right">
                        <SaveOutlined onClick={(ev) => {
                            ev.stopPropagation()
                            this.setState({ openSave: true })
                        }}></SaveOutlined>
                        <CloseOutlined onClick={(ev) => {
                            ev.stopPropagation()
                            this.setState({ alertOpen: true })
                        }}></CloseOutlined>
                    </div>
                    <DeleteAlert
                        open={this.state.alertOpen}
                        onClose={(shouldDelete, e) => {
                            if (shouldDelete === true) {
                                actions.removeItem(item.index)
                            }
                            this.setState({ alertOpen: false })
                        }} />

                </div>

                {/* <Collapse in={this.state.expanded}> */}
                <div className={"sidebar-item-noscroll"}>
                <Collapse in={item.expand}>
                    <div className="collapsed">
                        {to_list(item.items || [], item.index)}
                        <div className={item.key}>
                            <div className={"darken"}>
                                <Button style={{padding:0}} className={"add"} onClick={() => {
                                    actions.addItem(item.index, {
                                        class: "property",
                                        name: "",
                                        value: ""
                                    })
                                }}><Add style={{height: "24px"}}></Add></Button>
                            </div>
                        </div>
                    </div>
                </Collapse>
                </div>
                {/* </Collapse> */}
                <SaveModal open={openSave} item={item} onClose={() => { this.setState({ openSave: false }) }}></SaveModal>
            </div>

        )
    }
}

class FeaturePicker extends React.Component {

    state = {
        features: {}
    }

    custom_key = "My features"

    constructor(props) {
        super(props)

        if (!this.props.ignoreFeatures) {
            Python.getAllFeatures((error, res) => {
                if (this.props.whitelist) {
                    let newres = {}
                    this.props.whitelist.forEach((key) => {
                        newres[key] = res[key]
                    })
                    res = newres
                }
                this.setState({ features: res })
            })
        }
    }

    componentWillReceiveProps(newProps) {

        let custom_key = "My features"

        if (newProps.extension === ".dts") {
            custom_key = "My feature-sets"
        } else if (newProps.extension === ".dtm") {
            custom_key = "My models"
        }

        this.custom_key = custom_key


        if (!this.props.open && newProps.open) {
            let custom_features = fs.readdirSync(SAVES_FOLDER)
            custom_features = custom_features.filter(file => file.endsWith(this.props.extension || ".dtf"))
            custom_features = custom_features.map(file => file.slice(0, file.length - 4))
            const features = {}

            custom_features.forEach((v) => {
                features[v] = v
            })
            const newState = { ...this.state.features }
            newState[this.custom_key] = features
            this.setState({ features: newState })
        }
    }

    render() {
        const { onClose, selectedValue, open } = this.props;
        const { features } = this.state

        const handleClose = () => {
            onClose(selectedValue);
        };

        const handleListItemClick = (value) => {
            onClose(value);
        };

        return (
            <Dialog onClose={handleClose} open={open} PaperProps={{ style: { position: "absolute", left: "150px" } }}>
                <List>
                    {Object.keys(features).map(key => (
                        [
                            <ListSubheader style={{ fontSize: 30, color: "#fff", borderBottom: "1px solid #eee" }} disableSticky key={key}>{key}</ListSubheader>,
                            ...Object.keys(features[key]).map(feature => {
                                return <ListItem style={{ height: "28px" }} button onClick={() => handleListItemClick(
                                    JSON.parse(
                                        key === this.custom_key ?
                                            fs.readFileSync(SAVES_FOLDER + feature + (this.props.extension || ".dtf")) :
                                            JSON.stringify(features[key][feature])
                                    )
                                )} key={feature + Math.random()}>
                                    {features[key][feature].description ?
                                        <Tooltip key={feature} enterDelay={300} title={features[key][feature].description}>
                                            <ListItemText primary={feature}></ListItemText>
                                        </Tooltip> :
                                        <ListItemText primary={feature}></ListItemText>}
                                </ListItem>
                            })

                        ]
                    ))}
                </List>
            </Dialog>
        );
    }
}

export class DeleteAlert extends React.Component {
    render() {
        const { onClose, open, name } = this.props;

        const handleClose = (shouldDelete) => {
            onClose(shouldDelete);
        };

        return (
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <DialogTitle>{"Delete " + (name || "component") + "?"}</DialogTitle>

                <DialogActions>
                    <Button onClick={() => handleClose(false)} color="default">
                        Cancel
                </Button>
                    <Button onClick={() => handleClose(true)} color="secondary" autoFocus>
                        Delete
                </Button>
                </DialogActions>
            </Dialog>
        )
    }
}

export class FeatureGroup extends React.Component {

    state = {
        isopen: true,
        dialogOpen: false,
        alertOpen: false,
        draggingOver: false,
    }

    draggingOver = false
    _ref = React.createRef()

    _update() {
        if (this._ref && this._ref.current) {
            if (this.draggingOver && this.props.item.items.length === 0) {
                this._ref.current.style.backgroundColor = "rgba(255, 255, 255, 0.2)"
            } else {
                this._ref.current.style.backgroundColor = "transparent"
            }
        }
    }

    componentDidUpdate() {
        this._update()
    }

    render() {
        const { item, onDelete } = this.props
        const { dialogOpen } = this.state
        console.log(item.index, "group")
        return (
            <div className={"featureGroup"}
                ref={this._ref}
                onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()

                    let nitem = e.dataTransfer.getData("item")
                    let nitems = e.dataTransfer.getData("items")
                    
                    const feature = e.feature;
                    const position = e.position;
                    if (nitem) {
                        actions.GROUPBEGIN()
                        actions.dropItem(JSON.parse(nitem), item.index, feature, position)
                    } else if (nitems) {
                        actions.injectItems(JSON.parse(nitems), item.index, feature, position)
                    }
                    
                    this.draggingOver = false

                }}
                onDragOver={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    this.draggingOver = true
                    this._update()
                }}
                onDragLeave={(e) => {
                    e.preventDefault()
                    this.draggingOver = false
                    this._update()
                }}>
                <div className={this.props.parent && this.props.parent.key}>
                    <div
                    className={"header-wrap grabbable accent-border darken"}
                    onClick={() => this.setState({ isopen: !this.state.isopen })}>

                    <div className={"expand-wrap " + (this.state.isopen ? " expand-open" : "expand-closed")}>
                        <ExpandMore
                            style={{height:24}}
                            className="expand-left"
                        />
                    </div>
                    <div className="sidebar-item-text" style={{fontFamily: "Hack"}}>
                        {item.name}
                    </div>

                    </div>
                </div>
                
                <div className={"sidebar-item-noscroll"}>
                    <Collapse in={this.state.isopen}>
                        <div className="collapsed">
                            {to_list(item.items, item.index, this.props.getAllNames)}
                        </div>
                    </Collapse>
                </div>

            </div>)
    }

}

function SidebarItem(props) {
    

    const {item, headerStyle, itemStyle} = props;
    const {name, items, expand, index, load} = item
    console.log(index, "sidebar")
    return (
        <div className="sidebar-item-wrapper">
            <div className="sidebar-item-header" 
                 style={headerStyle}
                 onClick={() => actions.toggleExpand(index)}>
                <div style={{}} className={"sidebar-icon-wrap " + (expand ? " sidebar-icon-open" : " sidebar-icon-closed")}>
                    <ExpandMore 
                        style={{height: 24}}
                    />
                </div>
                <div className="sidebar-item-text">
                    {name.toUpperCase()}
                </div>
                
            </div>
            <div style={itemStyle} className="sidebar-item">
                <Collapse in={expand}>
                    {to_list(items, this)}
                </Collapse>
            </div>
        </div>
    )
}

class FeatureSet extends React.Component {

    state = {
        openSave: false,
        openPicker: false,
        inputKey: (new Date()).getTime(),
        baseKey: (new Date()).getTime()

    }

    componentDidMount() {

        document.addEventListener("keydown", (event) => {
            if (event.ctrlKey && event.key.toLowerCase() === "z") {
                if (event.shiftKey) {
                    this.props.REDO()
                } else {
                    this.props.UNDO()
                }
            }
        })
    }

    shouldComponentUpdate() {
        return false
    }

    default_item = () => {
        return {
            name: "Untitled project",
            type: "",
            class: "featureSet",
            label_method: "default",
            label_aux: this.get_label_aux("default"),
            items: [
                {
                    class: "featureGroup",
                    name: this.props.isModel ? "Model" : "Base",
                    items: []
                }
            ]
        }
    }

    get_label_aux = (key) => {
        switch (key) {
            case "default":
                return {
                    class: "feature",
                    type: "Label",
                    name: "Label",
                    key: "features",
                    items: []
                }
            case "conditional":
                return {
                }

            default:
                return {
                }
                break;
        }
    }

    item = this.default_item()


    sampleOnBlur = false

    resolve(callback) {
        Python.sampleFeature(callback)
    }

    getAllNames() {
        const names = []
        function recurseNames(item, name_list) {
            if (item.class === "feature") {
                name_list.push(item.name)
            }

            if (item.items) {
                item.items.forEach(li => recurseNames(li, name_list))
            }
        }

        recurseNames(this.item.items, names)

        return names
    }

    form = React.createRef()

    render() {
        console.log(store.getState())
        console.log("root render")
        const { items } = this.props.item 

        function handleSave() {
            this.setState({ openSave: true })
        }

        function handleOpen() {
            this.setState({ openPicker: true })
        }

        function handleCreate() {
            this.item = this.default_item()
            this.setState({
                inputKey: (new Date()).getTime(),
                baseKey: (new Date()).getTime()
            })
        }
        return (
            <div
                ref = {ref => this._ref = ref}
                key={this.state.baseKey}
                className="featureSet"
                onFocus={(e) => {
                    e.target.oldValue = e.target.value
                }}
                onBlur={(e) => {
                    if (this.props.refresh && this.sampleOnBlur && (e.target.oldValue !== e.target.value)) {
                        this.props.refresh()
                    }
                }}
                onKeyPress={(e) => {
                    if (this.props.refresh && e.which === 13) {
                        this.props.refresh()
                    }
                }}>
                
                {(items || []).map((item) => (
                    <SidebarItem key={item} index={item}></SidebarItem>
                ))}
                
                <SaveModal
                    open={this.state.openSave}
                    onClose={() => this.setState({ openSave: false })}
                    item={this.item}
                    extension={this.props.isModel ? ".dtm" : ".dts"}
                ></SaveModal>
                
                <FeaturePicker ignoreFeatures extension={this.props.isModel ? ".dtm" : ".dts"} open={this.state.openPicker}
                    onClose={(item) => {
                        if (item) {
                            this.item = item;
                            this.setState({ openPicker: false, inputKey: (new Date()).getTime(), baseKey: (new Date()).getTime() })
                        } else {
                            this.setState({ openPicker: false })
                        }
                    }}>

                </FeaturePicker>
                <SaveProgress open={this.state.openProgress}
                    itemsSaved={this.state.itemsSaved}
                    itemsRequested={this.state.itemsRequested}
                    progressSource={this.state.progressSource}
                    onClose={() => this.setState({
                        openProgress: false
                    })}>

                </SaveProgress>
                </div>
            

        )
    }
}

const getAllNames = (type) => {
    return store.getState().undoable.present.items.filter(e => e && e.class === type).map(e => e.name)
} 
  
const mapStateToProps = (state, props) => {
    return {item: {...state.undoable.present.items[props.index || 0]}}
}


const actions = {
    toggleExpand: (index) => store.dispatch(toggleExpand(index)),
    addItem: (index, item) => store.dispatch(addItem(index, item)),
    setName: (index, name) => store.dispatch(setName(index, name)),
    setValue: (index, value) => store.dispatch(setValue(index, value)),
    removeItem: (index) => store.dispatch(removeItem(index)),
    dropItem: (index, target, child, position) => store.dispatch(dropItem(index, target, child, position)),
    REDO: () => store.dispatch(REDO()),
    UNDO: () => store.dispatch(UNDO()),
    GROUPBEGIN: () => store.dispatch(GROUPBEGIN()),
    GROUPEND: () => store.dispatch(GROUPEND()),
    injectItems: (index, target, items, position) => store.dispatch(injectItems(index, target, items, position))
}

const mapDispatchToProps = dispatch => (actions)


function deepEqual(x, y) {
    const ok = Object.keys, tx = typeof x, ty = typeof y;
    return x && y && tx === 'object' && tx === ty ? (
      ok(x).length === ok(y).length &&
        ok(x).every(key => deepEqual(x[key], y[key]))
    ) : (x === y);
  }

const options = {
    pure: true,
    areStatePropsEqual: (x, y) => {return deepEqual(x, y)},
}

Feature = connect(mapStateToProps, mapDispatchToProps, null, options)(Feature)
FeatureGroup = connect(mapStateToProps, mapDispatchToProps, null, options)(FeatureGroup)
Property = connect(mapStateToProps, mapDispatchToProps, null, options)(Property)
SidebarItem = connect(mapStateToProps, mapDispatchToProps, null, options)(SidebarItem)
export default connect(mapStateToProps, mapDispatchToProps, null, options)(FeatureSet)

function SaveProgress(props) {

    const { enqueueSnackbar } = useSnackbar()

    return (
        <Dialog open={props.open} PaperProps={{ style: { backgroundColor: "#fff", transform: "translateX(-40%)" } }}>
            <DialogTitle style={{ color: "black" }} >Creating images...</DialogTitle>
            <div id="dialog-container">
                <div id="dialog-text">
                    <DialogContentText style={{ color: "black" }}> {props.itemsSaved + " out of " + props.itemsRequested + " images created."}</DialogContentText>
                </div>
                <div id="dialog-image">
                    <img src={"data:image/bmp;base64, " + (props.progressSource ? props.progressSource.toString("base64") : "")} />
                </div>
                <div id="dialog-progress">
                    <LinearProgress variant="determinate" value={props.itemsSaved / props.itemsRequested * 100}></LinearProgress>
                </div>
            </div>
            <DialogActions><Button color="primary" onClick={() => props.onClose()}>Close</Button></DialogActions>
        </Dialog>
    )
}

function to_list(items, parent) {
    const storeItems = store.getState().undoable.present.items;
    console.log(items, parent, storeItems)
    return items.map((itemindex, idx) => {
        const item = storeItems[itemindex]
        if (!item) return null
        if (item.class === "feature") {
            return <Feature
                item={item}
                key={item.index}
                index={item.index}
                parent={parent}
                // onDelete={() => { items.splice(items.indexOf(item), 1); self.forceUpdate() }}
                // pushBefore={(newitem) => {
                //     items.splice(items.indexOf(item), 0, JSON.parse(newitem))
                //     self.forceUpdate()
                // }}
                // pushAfter={(newitem) => {
                //     items.splice(items.indexOf(item) + 1, 0, JSON.parse(newitem))
                //     self.forceUpdate()
                // }} 
                />

        } else if (item.class === "featureGroup") {
            return <FeatureGroup
                        item={item}
                        key={item.index}
                        index={item.index}
                        parent={parent}
                        // onDelete={() => { items.splice(items.indexOf(item), 1); self.forceUpdate() }} 
                        />
        } else if (item.class === "property") {
            return <Property
                item={item}
                key={item.index}
                index={item.index}
                parent={parent}
                // onDelete={() => { items.splice(items.indexOf(item), 1); self.forceUpdate() }}
                 />
        } else {
            return null
        }
    })
}
/* <SidebarItem name="Setup">
                    <div className="featureHeader">
                    <FormControl
                        
                        style={{ paddingLeft: "10px", width:"100%"}}
                        componenet="fieldset">

                        <FormControlLabel
                            labelPlacement="end"
                            control={
                                    <Input style={{width:400}} key={this.state.inputKey} placeholder="Name" ref={this.form} defaultValue={this.item.name} onChange={(e) => {
                                        this.item.name = e.target.value
                                    }}></Input>}
                            label={<div style={{float:"right"}}>
                                <ButtonGroup
                                    variant="text">
                                    <Button  onClick={handleSave.bind(this)}><SaveOutlined></SaveOutlined></Button>
                                    <Button onClick={handleOpen.bind(this)}><FolderOpen></FolderOpen></Button>
                                    <Button onClick={handleCreate.bind(this)}><CreateOutlined></CreateOutlined></Button>
                                </ButtonGroup>
                            </div>}>

                        </FormControlLabel>
                    </FormControl>
                    <FormControl
                        style={{ paddingLeft: "10px" }}>
                        <FormControlLabel
                            onChange={(e) => {
                                if (this.item.label_method !== e.target.value) {
                                    this.item.label_method = e.target.value;
                                    this.item.label_aux = this.get_label_aux(e.target.value);
                                    this.forceUpdate()
                                }
                            }
                            }
                            label={"Label method"}
                            control={
                                <Select value={this.item.label_method}>
                                    <MenuItem value={"default"}>Individual numbers</MenuItem>
                                    <MenuItem value={"conditional"}>Toggle conditional features</MenuItem>
                                </Select>}>
                        </FormControlLabel>

                        {!this.props.removeLabel ?
                            <FormControlLabel
                                onChange={(e) => this.sampleOnBlur = e.target.checked}
                                control={<Switch color={"primary"} placeholder="Name"></Switch>}
                                label={"Automatic image generation"}>
                            </FormControlLabel> : null
                        }

                        {!this.props.removeLabel ?
                            <FormControlLabel
                                onChange={(e) => this.sampleOnBlur = e.target.checked}
                                control={<Input id="imageNumberInput" type="number" color={"primary"} placeholder={"Number of images"}></Input>}
                                label={<Button onClick={() => {

                                    const numItems = document.getElementById("imageNumberInput").value
                                    if (numItems && numItems > 0) {
                                        var path = dialog.showOpenDialogSync({
                                            properties: ['openDirectory']
                                        });

                                        if (path) {
                                            let itemsSaved = 0;
                                            this.setState({
                                                openProgress: true,
                                                itemsSaved: 0,
                                                itemsRequested: numItems,
                                                progressSource: ""
                                            }, () => {
                                                const createNext = () => {
                                                    if (itemsSaved < numItems && this.state.openProgress) {
                                                        this.resolve((err, res) => {
                                                            if (!err) {
                                                                fs.writeFile(path + "/" + this.item.name + itemsSaved + ".bmp", res[0], "base64", () => { })
                                                            }
                                                            itemsSaved += 1
                                                            this.setState({ itemsSaved: itemsSaved, progressSource: res[0] }, () => {
                                                                createNext()
                                                            })
                                                        })
                                                    }
                                                }
                                                createNext()
                                            })
                                        }
                                    }


                                }}>Save to folder</Button>}>
                            </FormControlLabel> : null
                        }

                    </FormControl>
                    </div>
                </SidebarItem> */