import React from 'react';
import { Typography, Tabs, Tab, Card, CardHeader, CardContent, Collapse, List, ListItem, Slider, Tooltip, Select, MenuItem } from "@material-ui/core"
import {ExpandMore} from "@material-ui/icons"

class Property extends React.Component {

    static defaultProps = {
        step: 1,
        description: "",
        unit: ""
    }

    render() {
        const {name, min, max, unit, step, description, value, onChange} = this.props
        return (
            <ListItem alignitems="flex-start">
                <Tooltip title={description}>
                    <Typography  id="prop_label" style={{width: "50%"}}>{name}</Typography>
                </Tooltip>
                <Slider
                    style={{width: "50%", float:"right"}}
                    defaultValue = {value}
                    aria-labelledby="prop_label" 
                    min={min} 
                    max={max}
                    step={step}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(number) => number + unit}
                    onChange={onChange}
                    ></Slider>
            </ListItem>
        )
    }
}

export class Feature extends React.Component {

    changeType(event, newvalue) {
        
        this.setState({type: newvalue.props.value})
        this.props.onChange(newvalue.props.value, this.getAllItems())
    }

    getAllItems() {
        const {type} = this.state
        return [...this.items, ...((this.typed_items || {})[type] || [])]
    }
    

    componentDidMount() {
        this.props.onChange(this.state.type, this.getAllItems())
    }


    render() {
        const {expanded, type} = this.state
        const {onChange} = this.props
        const items = this.getAllItems()
        return (
            <Card style={{margin: "10px 0"}}>
                <CardHeader 
                    title={
                        <Select
                            value={type}
                            onChange={this.changeType.bind(this)}
                        >
                            {this.accepted_types.map((_type) => {
                                return (<MenuItem value={_type}>{_type}</MenuItem>)
                            })}
                        </Select>} 
                    action={
                        <ExpandMore 
                            onClick={() => this.setState({expanded: !expanded})}
                            style={
                                {
                                    fontSize: 40, 
                                }
                            }
                            ></ExpandMore>}>
                </CardHeader>

                <Collapse in={this.state.expanded}>
                    <List>
                        {
                            items.map((item) => {
                                return (
                                    <Property 
                                        {...item}
                                        onChange={(ev, newvalue) => {
                                            item.value = newvalue
                                            onChange(type, items)
                                        }}></Property>
                                    )
                            })
                        }
                        
                    </List>
                </Collapse>
                
            </Card>
            
        )
    }
}

export class Optics extends Feature {

    items = [
        {
            name: "Wavelength",
            min: 200,
            max: 1000,
            unit: "nm",
            value: 600,
            description: "The wavelength of the light-source",
            scale: 1e-9
        },
        {
            name: "Pixel size",
            min: 20,
            max: 1000,
            unit: "nm",
            value: 100,
            description: "The effective size of each pixel",
            scale: 1e-9
        },
        {
            name: "NA",
            min: 0,
            max: 1.33,
            step: 0.01,
            unit: "",
            value: 0.7,
            description: "The NA of the limiting aperature"
        },
    ]

    typed_items = {
        "Brightfield": [
            {
                name: "Gradient", 
                min: 0,
                max: 2,
                step: 0.01,
                unit: "",
                value: 0.7,
                description: "The standard deviation of the illumination gradient"
            }
        ]
    }

    accepted_types = [
        "Brightfield",
        "Fluorescence",
    ]

    state = {
        expanded: false,
        type: this.accepted_types[0]
    }
}


export class Aberration extends Feature {

    items = [
        {
            name: "Coefficient",
            min: -5,
            max: 5,
            unit: "",
            step: 0.01,
            value: 0,
            description: "Strength of the aberration in terms of the corresponding Zernike polynomial"
        },
    ]

    accepted_types = [
        "Defocus",
        "Spherical",
    ]

    state = {
        expanded: false,
        type: this.accepted_types[0],
    }
}

export class Scatterer extends Feature {
    items = [
        {
            name: "Count",
            min: 0,
            max: 100,
            value: [1, 10],
            description: "The number of this particle in the image"
        }, {
            name: "Value",
            min: 0,
            max: 1,
            step: 0.01,
            value: [0.1, 0.2],
            description: "Represents the absroption coefficient in the case of Brightfield, and the emitted intensity in the case of Fluorescence"
        }, {
            name: "z",
            min: -100,
            max: 100,
            step: 1,
            value: [-10, 10],
            description: "The particle position in the focal axis"
        },
    ]

    typed_items = {
        "Sphere": [
            {
                name: "Radius",
                min: 0,
                max: 2000,
                unit: "nm",
                value: [500, 1000],
                description: "The radius of the sphere in nanometers",
                scale: 1e-9
            }
        ]
    }

    accepted_types = [
        "Sphere"
    ]

    state = {
        expanded: false,
        type: this.accepted_types[0],
    }
}