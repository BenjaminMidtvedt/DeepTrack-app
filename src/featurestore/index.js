import React from 'react';
import { Tabs, Tab, Typography, List, ListItem, Collapse, IconButton, Divider } from "@material-ui/core"
import { Album, FitnessCenter, BarChart, ArrowDownward, ArrowDropDown, ExpandMore, ExpandLess } from '@material-ui/icons'
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
        features: []
    }

    constructor(props) {
        super(props)
        this.populateStore.bind(this)
    }

    populateStore() {
        Python.getAllFeatures((error, res) => {
            console.log(res)
            if (!res) return

            let custom_features = fs.readdirSync(SAVES_FOLDER)
            
            custom_features.forEach((file) => {

                const header = EXTENSIONS[file.slice(file.length - 4, file.length)]
                if (!header) return
                const feature = JSON.parse(fs.readFileSync(SAVES_FOLDER +  file))
                
                if (!res[header]) res[header] = {};
                res[header][file.slice(0, file.length - 4)] = feature
                
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
            <List>

                {Object.entries(features).map((keyvalue, idx) => (
                    <FeatureListSection key={keyvalue[0] + idx} name={keyvalue[0]} items={keyvalue[1]}></FeatureListSection>
                ))}
            </List>
        );
    }
}

function FeatureListSection(props) {
    const [open, setOpen] = React.useState(false)

    const {name, items} = props
    console.log(name, items)
    return (
        <div style={{width: "100%"}} className={name}>
            <div style={{display: "flex", width: "100%"}} onClick={() => setOpen(!open)}>
                <Typography variant="h5" style={{textAlign: "center", textIndent:5 }}>
                    {name}
                </Typography>
                
            </div>
            <Collapse in={open}>
                {Object.entries(items).map((item, idx) => <FeatureListItem key={JSON.stringify(item[1]) + idx} item={item[1]} name={item[0]}></FeatureListItem>)}
            </Collapse>
            <Divider></Divider>
        </div>
    )
}

function FeatureListItem(props) {
    const {item, name} = props
    return (
        <div className="grabbable"
            draggable
            onDragStart={(e) => {
                if (Array.isArray(item)) {
                    e.dataTransfer.setData("items", JSON.stringify(item))
                } else {
                    e.dataTransfer.setData("item", JSON.stringify(item))
                }
                
            }}
            style={{height: 22, border: "1px solid rgba(255, 255, 255, 0.1)"}}>
            <Typography noWrap style={{fontFamily: "hack", overflow:"hidden", userSelect: "none"}}>{name}</Typography>
            
        </div>
    )
}