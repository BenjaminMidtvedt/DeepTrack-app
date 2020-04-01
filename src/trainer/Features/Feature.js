import React from 'react';
import { Dialog, DialogActions, DialogTitle, DialogContent, Tabs, Tab, Card, CardHeader, CardContent, Collapse, List, ListItem, Slider, Tooltip, Input, Select, MenuItem, Grid, ListSubheader, Button, ListItemText, DialogContentText, Snackbar, Switch, FormControl, FormLabel, FormControlLabel, FormGroup, ButtonGroup } from "@material-ui/core"
import {ExpandMore, HelpOutline, Add, CloseOutlined, SaveOutlined, CheckBox, FolderOpen, CreateOutlined} from "@material-ui/icons"
import { VariantType, useSnackbar } from 'notistack';
import Python from "../../PythonInterface"

import Draggable from "./Draggable"

const fs = window.require('fs')
const path = window.require("path")

const SAVES_FOLDER = path.resolve("./saves/") + "\\"
console.log(SAVES_FOLDER)

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

class PropertyValue extends React.Component {
    
    render() {
        const {item} = this.props
        return (

            <div>
            
                <Input style={{width:"80%"}}
                    defaultValue={item.value || ""}
                    onChange={(e) => item.value = e.target.value}
                    placeholder={"Enter value or expression"}
                />
                <Tooltip
                    title={
                        "Valid inputs are any input that can be parsed as a single python line. For example: \n \
                        Any number: eg. 1, -1, 0.1, 1e-11. \n \
                        Any word enclosed in quotation-marks: eg. \"Word\", 'Word' \
                        Any python expression ()"
                    }>
                    <HelpOutline/>
                </Tooltip>
            
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
        const {item, onDelete} = this.props
        const {name, items} = this.props.item
        return (
            <div className="property">
                <div 
                    className="header-wrap"
                    onClick={() => this.setState({isopen: !this.state.isopen})}
                    tabindex="-1">

                    <div className={"expand-wrap " + (this.state.isopen ? " expand-open" : "expand-closed")}>
                        <ExpandMore 
                            className="expand-left"
                        />
                    </div>
                    <div className="block-header"> 
                        <Input defaultValue={item.name} placeholder="Property name" onChange={(e) => item.name = e.target.value}/>
                    </div>
                    <div className="header-right">
                        <CloseOutlined onClick={(ev) => {
                            ev.stopPropagation()
                            this.setState({alertOpen: true})
                        }}></CloseOutlined>
                    </div>
                    <DeleteAlert 
                        open={this.state.alertOpen}
                        onClose={(shouldDelete, e) => {
                            if(shouldDelete === true)  {
                                onDelete()
                            }
                            this.setState({alertOpen: false})
                        }}/>
                </div>
                <Collapse in={this.state.isopen}>
                    <div className="collapsed">
                        {to_list(items, this, this.props.cgetAllNames)}
                    </div>
                </Collapse>
            </div>
        )
    }
}


function SaveModal(props) {
    const { enqueueSnackbar } = useSnackbar();
    function handleClose(shouldSave) {
        if (shouldSave) {
            const filepath = SAVES_FOLDER + props.item.name + (props.extension || ".dtf")
            fs.writeFile(filepath, JSON.stringify(props.item),
            (err) => {
                if (err) {
                    console.log(err)
                    enqueueSnackbar("Could not save file", {variant: "error"})
                } else {
                    enqueueSnackbar("Feature saved to " + filepath, {variant: "success"})
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
                <Button onClick={()=>handleClose(false)}>
                    Cancel  
                </Button>
                <Button onClick={()=>handleClose(true)} color="primary" autoFocus>
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

    _ref = React.createRef();

    validateName(name) {
        const names = this.props.getAllNames()
        return !names.includes(name) 
    }

    _update = throttle(() => {
        this._ref.current.style.borderBottom = this.borderBottom ? `dashed 2px white` : ``;
        this._ref.current.style.borderTop = this.borderTop ? `dashed 2px white` : ``;
    });

    componentDidUpdate() {
        this._update()
    }

    componentDidMount() {
        // this.properties = Python.getFeatureProperties(this.props.type)
        const {item} = this.props

        if (!item.items || item.items.length === 0) {
            item.items = []
              
            Python.getFeatureProperties(item.type, (err, obj) => {
                
                Object.entries(obj).forEach((value) => {
                    const name = value[0]
                    const obj = value[1]
                    const propDict = {
                        class: "property",
                        name: name,
                        default: obj.default,
                        items: [{
                            class: "propertyValue",
                            value: obj.default,
                        }]
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
                    item.items.push(propDict)
                })
                this.forceUpdate()
            })        
        }
    }
    
    _ref = React.createRef()

    render() {
        const {item, onDelete} = this.props
        const {nameError, openSave} = this.state

        return (
            <div className={"block feature " + item.key}
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
                onDragLeave = {(e) => {
                    this.borderTop = false
                    this.borderBottom = false
                    this._update()
                }}
                
                onDrop = {(e) => {
                    e.stopPropagation();
                    e.preventDefault()

                    var bounds = this._ref.current.getBoundingClientRect();
                    var y = (e.clientY - bounds.top) / (bounds.bottom - bounds.top);
                    if (!e.ctrlKey) {
                        GLOBAL_REMOVE_TARGET()
                    }
                    const received = JSON.parse(e.dataTransfer.getData("item"))
                    console.log("Received", received)
                    if (y <= 0.5) {
                        this.props.pushBefore(e.dataTransfer.getData("item"))
                    } else {
                        this.props.pushAfter(e.dataTransfer.getData("item"))
                    }
                    this.borderTop = false
                    this.borderBottom = false
                    this.forceUpdate()
                }}
                >
                <div draggable
                    onDragStart={e => {
                        const sent = JSON.stringify(item)
                        e.dataTransfer.setData("item", sent)
                        console.log("Grabbed", sent)
                        GLOBAL_REMOVE_TARGET = () => {
                            onDelete()
                        }

                        window.requestAnimationFrame(() => {
                            this._ref.current.style.visibility = "hidden"
                            this._ref.current.style.height = "0"
                        })
                    }}
                    onDragEnd={e => {
                        GLOBAL_REMOVE_TARGET = () => {
                        }

                        window.requestAnimationFrame(() => {
                            this._ref.current.style.visibility = ""
                            this._ref.current.style.height = ""
                        })

                    }}
                    className="header-wrap grabbable"
                    onClick={() => this.setState({isopen: !this.state.isopen})}>

                    <div className={"expand-wrap " + (this.state.isopen ? " expand-open" : "expand-closed")}>
                        <ExpandMore 
                            className="expand-left"
                        />
                    </div>
                    <div className="block-header">
                        <Input defaultValue={item.name}
                               error={nameError}
                               onBlur={(e) => {
                            const oldName = item.name;
                            item.name = ""
                            const {value} = e.target
                            
                            if (this.validateName(value)) {
                                item.name = value
                                this.setState({nameError: false})
                            } else {
                                item.name = oldName
                                this.setState({nameError: true})
                            }

                        }}></Input>
                        <span style={{fontSize:"11px", paddingLeft:"6px", color: "rgba(255,255,255, 0.4)"}}>
                            {item.type}
                        </span>
                    </div>
                    <div className="header-right">
                        <SaveOutlined onClick={(ev) => {
                            ev.stopPropagation()
                            this.setState({openSave: true})
                        }}></SaveOutlined>
                        <CloseOutlined onClick={(ev) => {
                            ev.stopPropagation()
                            this.setState({alertOpen: true})
                        }}></CloseOutlined>
                    </div>
                    <DeleteAlert 
                        open={this.state.alertOpen}
                        onClose={(shouldDelete, e) => {
                            console.log(shouldDelete, e)
                            if(shouldDelete === true)  {
                                onDelete()
                            }
                            this.setState({alertOpen: false})
                        }}/>
                    
                </div>

                {/* <Collapse in={this.state.expanded}> */}
                <Collapse in={this.state.isopen}>
                    <div className="collapsed">
                        {to_list(item.items || [], this, this.props.getAllNames)}
                        <Button className={"add"} onClick = {() => {
                            item.items.push({
                                class: "property",
                                name: "",
                                items: [{class: "propertyValue"}]
                            })
                            this.forceUpdate()
                        }}><Add></Add></Button>
                    </div>
                </Collapse>
                {/* </Collapse> */}
                <SaveModal open={openSave} item={item} onClose={() => {this.setState({openSave: false})}}></SaveModal>
            </div>
            
        )
    }
}

class FeaturePicker extends React.Component {

    state = {
        features: {}
    }
    constructor(props) {
        super(props)
        if (!this.props.ignoreFeatures) {
            Python.getAllFeatures((error, res) => {
                this.setState({features: res})
            })
        }
    }

    componentWillReceiveProps(newProps) {
        if (!this.props.open && newProps.open) {
            let custom_features = fs.readdirSync(SAVES_FOLDER)
            custom_features = custom_features.filter(file => file.endsWith(this.props.extension || ".dtf"))
            custom_features = custom_features.map(file => file.slice(0, file.length - 4))
            const features = {}

            custom_features.forEach((v) => {
                features[v] = v
            })
            const newState = {...this.state.features}
            newState["My features"] = features
            this.setState({features: newState})
        }
    }

    render() {
        const { onClose, selectedValue, open } = this.props;
        const {features} = this.state

        const handleClose = () => {
            onClose(selectedValue);
        };

        const handleListItemClick = (value) => {
            onClose(value);
        };

        return ( 
        <Dialog onClose={handleClose} open={open}>
            <List>
            {Object.keys(features).map(key => (
                [
                    <ListSubheader style={{fontSize: 30, color: "#fff", borderBottom: "1px solid #eee"}} disableSticky key={key}>{key}</ListSubheader>,
                    ...Object.keys(features[key]).map(feature => {
                        return <ListItem button onClick={() => handleListItemClick(
                                    JSON.parse(
                                        key === "My features" ? 
                                            fs.readFileSync(SAVES_FOLDER + feature + ".dtf") :
                                            JSON.stringify(features[key][feature])
                                    )
                                )} key={feature + Math.random()}>
                                        <ListItemText primary={feature}></ListItemText>
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
                <DialogTitle>{"Delete "+ (name || "component") + "?"}</DialogTitle>

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
        if (this.draggingOver && this.props.item.items.length === 0) {
            this._ref.current.style.backgroundColor = "rgba(255, 255, 255, 0.2)"
        } else {
            this._ref.current.style.backgroundColor = "rgba(0, 0, 0, 0.2)"
        }
    }

    componentDidUpdate() {
        this._update()
    }

    render() {
        const {item, onDelete} = this.props
        const {dialogOpen} = this.state
        return (
            <div className={"block featureGroup"} 
                ref = {this._ref}
                onDrop={(e) => {
                    e.preventDefault()
                    if (item.items.length === 0) {
                        e.stopPropagation()
                        if (!e.ctrlKey) {
                            GLOBAL_REMOVE_TARGET()
                        }
                        const newitem = JSON.parse(e.dataTransfer.getData("item"))
                        item.items.push(newitem)
                    }
                    this.draggingOver = false
                    this.forceUpdate()
                }}
                onDragOver = {(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    this.draggingOver = true
                    this._update()
                }}
                onDragLeave = {(e) => {
                    e.preventDefault()
                    this.draggingOver = false
                    this._update()
                }}>
                <div 
                    className="header-wrap"
                    onClick={() => this.setState({isopen: !this.state.isopen})}>

                    <div className={"expand-wrap " + (this.state.isopen ? " expand-open" : "expand-closed")}>
                        <ExpandMore 
                            className="expand-left"
                        />
                    </div>
                    <div className="block-header"> 
                        {item.name} 
                    </div>
                    <div className="header-right">
                        <CloseOutlined onClick={(ev) => {
                            ev.stopPropagation()
                            this.setState({alertOpen: true})
                        }}></CloseOutlined>
                    </div>
                    <DeleteAlert 
                        open={this.state.alertOpen}
                        onClose={(shouldDelete, e) => {
                            console.log(shouldDelete, e)
                            if(shouldDelete === true)  {
                                onDelete()
                            }
                            this.setState({alertOpen: false})
                        }}/>
                </div>

                <Collapse in={this.state.isopen}>
                    <div className="collapsed">
                        {to_list(item.items, this, this.props.getAllNames)}
                    </div>
                    <Button className="add" onClick={() => {
                        this.setState({dialogOpen: true})
                    }}><Add></Add></Button>
                </Collapse>

                <FeaturePicker open={dialogOpen} onClose={(feature)=>{
                    if (feature) {
                        const names = this.props.getAllNames()
                        let oldname = feature.name || feature.type
                        let newname = feature.name || feature.type
                        let idx = 0;
                        while (names.includes(newname)) {
                            newname = oldname + idx
                            idx = idx + 1;
                        }
                        feature.name = newname;
                        item.items.push({...feature})
                    }
                    this.setState({dialogOpen: false})
                }}/>
                
            </div>)
    }
    
}

export class FeatureSet extends React.Component {

    state = {
        openSave: false,
        openPicker: false,
        inputKey: (new Date()).getTime()
    }
    
    
    item = {
        name: "Untitled project",
        type: "",
        class: "featureSet",
        items: [
            {
                class: "featureGroup",
                name: "Base",
                items: []
            }
        ]
    }

    sampleOnBlur = false

    resolve(callback) {
        Python.sampleFeature(this.item.items[0], callback)
    }

    getAllNames() {
        const names = []
        function recurseNames(item, name_list) {
            console.log(item)
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
        console.log(this.props.item)
        function handleSave() {
            this.setState({openSave: true})    
        }
        function handleOpen() {
            this.setState({openPicker: true})    
        }
        function handleCreate() {
            this.props.remount()
        }

        

        return (
            <div className="block featureSet"
                onFocus={(e) => {
                    e.target.oldValue = e.target.value
                }}
                onBlur={(e) => {
                    console.log(this.sampleOnBlur)
                    if (this.sampleOnBlur && (e.target.oldValue !== e.target.value)) {
                        this.props.refresh()
                    }
                }}
                onKeyPress={(e) => {
                    if (e.which === 13) {
                        this.props.refresh()
                    }
                }}>
                <FormControl
                    style={{paddingLeft:"10px"}} 
                    componenet="fieldset">
                    
                        <FormControlLabel
                            control={
                                <FormGroup>
                                    <Input key={this.state.inputKey} placeholder="Name" ref={this.form} defaultValue={this.item.name} onChange={(e)=>{
                                        this.item.name = e.target.value
                                    }}></Input>
                                    
                                </FormGroup>}
                            label={<div>
                                <ButtonGroup
                                    variant="text">
                                    <Button onClick={handleSave.bind(this)}><SaveOutlined></SaveOutlined></Button>
                                    <Button onClick={handleOpen.bind(this)}><FolderOpen></FolderOpen></Button>
                                    <Button onClick={handleCreate.bind(this)}><CreateOutlined></CreateOutlined></Button>
                                </ButtonGroup>
                                </div>}>
                                
                            </FormControlLabel>
                        
                    <FormControlLabel 
                        onChange={(e)=>this.sampleOnBlur = e.target.checked}
                        control={<Switch color={"primary"} placeholder="Name"></Switch>}
                        label={"Automatic image generation"}>
                        </FormControlLabel>
                    
                </FormControl>
                {to_list(this.item.items, this, this.getAllNames.bind(this))}
                <SaveModal 
                    open={this.state.openSave}
                    onClose={()=>this.setState({openSave: false})}
                    item={this.item}
                    extension={".dts"}
                    ></SaveModal>
                <FeaturePicker ignoreFeatures extension=".dts" open={this.state.openPicker} 
                    onClose={(item)=>{
                        if (item) {
                            this.item = item; 
                            this.setState({openPicker:false, inputKey: (new Date()).getTime()})
                        } else {
                            this.setState({openPicker:false})
                        }}}>

                    </FeaturePicker>
            </div>
            
        )
    }
}

function to_list(items, self, getAllNames) {
    return items.map((item, idx) => {
        if (item.class === "feature") {
            return <Feature
                        key={item.name}
                        item={item} 
                        getAllNames={getAllNames}
                        onDelete={() => {items.splice(items.indexOf(item), 1); self.forceUpdate()}}
                        pushBefore={(newitem) => {
                            items.splice(items.indexOf(item), 0, JSON.parse(newitem))
                            self.forceUpdate()
                        }}
                        pushAfter={(newitem) => {
                            items.splice(items.indexOf(item) + 1, 0, JSON.parse(newitem))
                            self.forceUpdate()
                        }}/>
                        
        } else if (item.class === "featureGroup") {
            return <FeatureGroup 
                        item={item} 
                        getAllNames={getAllNames}
                        onDelete={() => {items.splice(items.indexOf(item), 1); self.forceUpdate()}}/>
        } else if (item.class === "property") {
            return <Property  
                        item={item} 
                        getAllNames={getAllNames}
                        onDelete={() => {console.log(items);items.splice(items.indexOf(item), 1);console.log(items); self.forceUpdate()}}/>
        } else if (item.class === "propertyValue") {
            return <PropertyValue 
                            item={item} 
                            getAllNames={getAllNames}
                            onDelete={() => {items.splice(items.indexOf(item), 1); self.forceUpdate()}}/>
        } else {
            return null
        }
    })
}
