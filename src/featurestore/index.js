import React from 'react';
import { Tabs, Tab, Typography, List, ListItem, Collapse, IconButton, Divider, Input, FormControlLabel, InputLabel, InputAdornment } from "@material-ui/core"
import { Album, FitnessCenter, BarChart, ArrowDownward, ArrowDropDown, ExpandMore, ExpandLess, Search, DeleteForever } from '@material-ui/icons'
import Python from "../PythonInterface"
import { appPath } from '../store';

const fs = window.require('fs')
const path = window.require("path")
let SAVES_FOLDER = path.join(appPath, "/saves/") + "\\"


const EXTENSIONS = {
    ".dtf": "My Features",
    ".dtm": "My Models"
}

export default class FeatureStore extends React.Component {

    state = {
        features: [],
        search:""
    }

    constructor(props) {
        super(props)
        this.populateStore.bind(this)
    }

    populateStore() {

        Python.getAllFeatures((error, res) => {
            console.log(res)
            if (!res) {this.populateStore()}

            const featureKeys = JSON.parse(window.localStorage.getItem("featureKeys")) || []
            featureKeys.forEach((key) => {
                const feature = JSON.parse(window.localStorage.getItem("featureKeys"))
                if (feature) {
                    if (!res["My Features"]) res["My Features"] = {};
                    res["My Features"][key] = feature
                }  
            })
            this.setState({ features: res })
        })
    }

    componentDidMount() {
        this.populateStore()
    }
  
    render() {
        const { features } = this.state
        console.log(features)
        return (
            <div>

                <Input 
                    style={{marginLeft:10}} 
                    placeholder={"Search..."} 
                    id="searchFeature"
                    onChange={(e) => {this.setState({search:e.target.value})}}
                    startAdornment={
                        <InputAdornment position="start">
                          <Search />
                        </InputAdornment>
                      }></Input>
                <List>
                    {Object.entries(features).map((keyvalue, idx) => (
                        <FeatureListSection search={this.state.search} key={keyvalue[0] + idx} name={keyvalue[0]} items={keyvalue[1]}></FeatureListSection>
                    ))}
                </List>
            </div>
        );
    }
}

function FeatureListSection(props) {
    const [open, setOpen] = React.useState(false)

    const {name, items} = props
    console.log(name, items)


    let subitems = Object.entries(items).filter(k => !props.search || k[0].toLowerCase().indexOf(props.search.toLowerCase()) !== -1).map((item, idx) => (
        <FeatureListItem search={props.search} key={JSON.stringify(item[1]) + idx} item={item[1]} name={item[0]}></FeatureListItem>
    ))

    subitems = subitems.filter(item => item !== null)
    console.log(name, subitems.length, subitems)
    if (subitems.length > 0) {
        return (
            <div className={name}>
                <div style={{backgroundColor:"#181B23", }}>
                    <div style={{width: "100%"}} className={"text--"+name}>
                        <div style={{display: "flex", width: "100%"}} onClick={() => setOpen(!open)}>
                            <Typography variant="h5" style={{textAlign: "center", textIndent:5 }}>
                                {name}
                            </Typography>
                            
                        </div>
                        <Collapse in={open || props.search}>
                            {subitems}
                        </Collapse>
                        <Divider></Divider>
                    </div>
                </div>
            </div>
            
        )
    } else {
        return null
    }
}

function FeatureListItem(props) {
    const {item, name} = props
    const [showMe, setShow] = React.useState(true)
    return (
        showMe ? 
        <div className="grabbable"
            draggable
            onDragStart={(e) => {
                if (Array.isArray(item)) {
                    e.dataTransfer.setData("items", JSON.stringify(item))
                } else {
                    e.dataTransfer.setData("item", JSON.stringify(item))
                }
                
            }}
            style={{height: 22, border: "1px solid rgba(255, 255, 255, 0.02)", display:"flex", flexDirection:"row"}}>
            <Typography noWrap style={{fontFamily: "hack", overflow:"hidden", userSelect: "none", textIndent:10}}>{name}</Typography>
            {Array.isArray(item) ? 
                <IconButton style={{height:20, width:20, padding:0, position:"absolut", left: 5}} onClick={() => {if (window.confirm("Are you sure you want to permanently delete this feature?")) {window.localStorage.removeItem(name); setShow(false)}}}><DeleteForever></DeleteForever></IconButton>
            :
                null}
            
        </div> : null
    )
    
}