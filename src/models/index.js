import React from 'react';
import './index.scss';
import { Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, withStyles, createStyles, InputLabel, FormControl, InputBase, Slider, IconButton, Select, MenuItem, Grid, Switch, FormControlLabel } from "@material-ui/core"
import { ChevronLeft, Label, PlayArrow } from "@material-ui/icons"

import Python from "../PythonInterface"
import store from '../store';
import * as d3 from "d3"
import { scaleLinear } from 'd3';

const MySelect = withStyles((theme) => (
    createStyles({

    })
))(Select)



function ResultDisplay(props) {

    return (

            <div style={{padding: "5px", height:"250px", width:"250px"}}>
                {props.src ? 
                    Array.isArray(props.src) ? 
                        (<div class="label-wrapper">
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>
                                            Label name
                                        </TableCell>
                                        <TableCell>
                                            Label value
                                        </TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                {props.src.map((row, idx) => (
                                    <TableRow key={row}>
                                        <TableCell>
                                            {row.name}
                                        </TableCell>
                                        <TableCell>
                                            {row.value}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>) : <img src={"data:image/bmp;base64, " + props.src.toString("base64")} /> 
                    : null}
            </div>
            
    )
}

class ResultVisualisation extends React.Component {

    state = {
        index: 0,
        predictions: [],
        input: "",
        target: "",
    }

    constructor(props) {
        super(props)
        this.deriveImages.bind(this)
    }

    componentDidMount() {
        this.deriveImages()
    }

    componentDidUpdate(oldProps) {
        if (this.props.predictions !== oldProps.predictions) {
            this.deriveImages()
        }
    }

    deriveImages() {
    }

    render() {
        const { predictions, input, target, index } = this.state
        const { frame, status } = this.props
        const frameIndex = (frame + predictions.length) % predictions.length;
        return (
            <div style={{display: "flex", flexDirection:"row", alignItems:"center"}}>

                <IconButton style={{borderRadius: 5, padding:20, transform: "rotate(90deg)", marginLeft:-90, marginRight: -90}} onClick={()=>this.setState({index: (this.state.index - 1 + this.props.predictions[0].length) % this.props.predictions[0].length})}>
                    <div className="chevron" ></div>
                </IconButton>

                <div style={{flexGrow:1, margin:10}}>
                    <Typography variant="h6">
                        Input
                    </Typography>
                    <img src={"data:image/bmp;base64, " + this.props.inputs[index].toString("base64")} />
                </div>

                <div style={{flexGrow:1, margin:10}}>
                    <Typography variant="h6">
                        Prediction
                    </Typography>
                    <img src={"data:image/bmp;base64, " + ((this.props.predictions[frame] || [] )[index] || "").toString("base64")} />
                </div>

                <div style={{flexGrow:1, margin:10}}>
                    <Typography variant="h6">
                        Target
                    </Typography>
                    <img src={"data:image/bmp;base64, " + this.props.targets[index].toString("base64")} />
                </div>
                <IconButton style={{borderRadius: 5, padding:20, transform: "rotate(-90deg)", marginLeft:-90, marginRight: -90}} onClick={()=>this.setState({index: (this.state.index + 1) % this.props.predictions[0].length})}>
                    <div className="chevron" ></div>
                </IconButton>
            </div>
        )
    }
}


class LossVisualisation extends React.Component {

    state = {
        xLinear: true,
        yLinear: true
    }

    componentDidMount() {
        const { loss } = this.props

        const svg = d3.select("#svg" + this.props.id)
          .attr("width", 600)
          .attr("height", 300)
          .append("g")
          .attr("transform", "translate(50, 20)")
          

        svg.append("g")
          .attr("color", "#4C4D4F")
          .attr("class", "axis")

        svg.append("g")
          .attr("transform", "translate(0, 250)")
          .attr("color", "#4C4D4F")
          .attr("class", "xaxis")
    

        svg.append("path")
           .attr("fill", "none")
           .attr("stroke", "#0090E7")
           .attr("class", "line")
           .attr("stroke-width", 1.5)
        svg.append("path")
           .attr("fill", "none")
           .attr("stroke", "#0090E7")
           .attr("stroke-opacity", 0.3)
           .attr("class", "lineback")

        svg.append("path")
           .attr("fill", "none")
           .attr("stroke", "#00D25B")
           .attr("class", "valline")
           .attr("stroke-width", 1.5)
        svg.append("path")
           .attr("fill", "none")
           .attr("stroke", "#00D25B")
           .attr("stroke-opacity", 0.3)
           .attr("class", "vallineback")

        this.updatePath()
    }

    componentDidUpdate() {
        this.updatePath()
    }

    updatePath() { 
        const svg = d3.select("#svg" + this.props.id)
        const { loss } = this.props

        const xScale = d3[(this.state.xLinear ? "scaleLinear" : "scaleLog")]()
            .domain([1, loss.length])
            .range([0, 500])
        
        const yScale = d3[(this.state.yLinear ? "scaleLinear" : "scaleLog")]()
            .domain(d3.extent([].concat(loss.map(s => s.loss), loss.map(s=> s.val_loss))))
            .rangeRound([250, 0])

        const line = d3.line()
            .curve(d3.curveBasis)
            .x((d) => xScale(Math.max(loss.indexOf(d) + 1, 1)))
            .y(d => yScale(d.loss))

        const lineback = d3.line()
            .curve(d3.curveLinear)
            .x((d) => xScale(Math.max(loss.indexOf(d) + 1, 1)))
            .y(d => yScale(d.loss))

        const validation_line = d3.line()
                       .curve(d3.curveBasis)
                       .x((d) => xScale(Math.max(loss.indexOf(d) + 1, 1)))
                       .y(d => yScale(d.val_loss))
        
        const validation_backline = d3.line()
                       .curve(d3.curveLinear)
                       .x((d) => xScale(Math.max(loss.indexOf(d) + 1, 1)))
                       .y(d => yScale(d.val_loss))

        const axis = d3.axisLeft().scale(yScale)
        const x_axis = d3.axisBottom().scale(xScale)

        svg.select(".axis").transition().call(axis)
        svg.select(".xaxis").transition().call(x_axis)
        svg.select(".line").transition().attr("d", line(loss))
        svg.select(".lineback").transition().attr("d", lineback(loss))
        svg.select(".valline").transition().attr("d", validation_line(loss))
        svg.select(".vallineback").transition().attr("d", validation_backline(loss))
    }


    render() {
        return (
            <div style={{display:"flex", flexDirection: "row"}}>
                <svg id={"svg"+this.props.id}></svg>
                <form>
                    <FormControlLabel
                        label={"Log X"}
                        control={<Switch checked={!this.state.xLinear} onChange={(e, xLinear) => this.setState({xLinear: !xLinear})} name="checkedC" />}>
                        </FormControlLabel>
                    <FormControlLabel
                        label={"Log Y"}
                        control={<Switch checked={!this.state.yLinear} onChange={(e, yLinear) => this.setState({yLinear: !yLinear})} name="checkedC" />}>
                        </FormControlLabel>
                    

                </form>
            </div>
        )
    }
    
}



function VisualisationPlayer(props) {
    
    const [frame, setFrame] = React.useState(props.predictions.length - 1);
    const [visualiserIndex, setVisualiser] = React.useState(0)

    const visualiser = [
        <LossVisualisation loss = {props.loss} id={props.id}/>,
        (<ResultVisualisation {...props} frame={frame}/>)
    ]
    return (
        <div>
            <div>
                <FormControl variant="outlined">
                    <InputLabel htmlFor="select-visualiser">Visualiser</InputLabel>
                    <MySelect native inputProps={{"id":"select-visualiser", "name": "Visualiser"}} label="Visualiser" value={visualiserIndex} onChange={(e) => setVisualiser(e.target.value)}>
                        <option value={0}>Loss</option>
                        <option value={1}>Predictions</option>
                    </MySelect>
                </FormControl>
            </div>
            {props.status}
            {visualiser[visualiserIndex]}
            <div style={{display:"flex", flexDirection:"row", alignItems:"center", justifyContent:"center"}}>
                <IconButton onClick = {() => {
                    const frame_end = props.predictions.length - 1
                    let current_frame = 0;
                    const interval = Math.min(10000 / (props.predictions.length + 1), 100)

                    let c = setInterval(() => {
                        setFrame(current_frame)
                        current_frame++
                        if (current_frame > frame_end) {
                            clearInterval(c)
                        }
                    }, 100)
                }}><PlayArrow color="primary" ></PlayArrow></IconButton>
                <Slider value={frame} min={1} max={props.predictions.length || 1} onChange={(e, value) => setFrame(value - 1)}></Slider>
            </div>
        </div>
    )
}



const useStyles = (theme) => {
    return ({
        form: {
            padding: 25,
            margin: "30px 0",
            borderRadius:5,
            backgroundColor: "#181B23",
        },
        textField: {
            margin: "15px 60px 15px 0px",
            width: 280,
        },
        textFieldLabel: {
            color:"white",
            fontSize:20
        },
        tableHead: {
            fontSize:20,
            backgroundColor: "#181B23"
        },
        tableBody:{
            
            color:"#6C7293"
        },
        tableCell:{
            fontSize:16,
            color:"#6C7293"
        }
    })
}

const BootstrapInput = withStyles((theme: Theme) =>
  createStyles({
    root: {
      'label + &': {
        marginTop: theme.spacing(3),
      },
    },
    input: {
      position: 'relative',
      backgroundColor: "#2A2C31",
      fontSize: 16,
      width: "100%",
      padding: '10px 12px',
      transition: theme.transitions.create(['border-color', 'box-shadow']),
    },
  }),
)(InputBase);


class Models extends React.Component {
    state = {
        value: 0,
        baseTabValue: 0,
        jobQueue: [],
        validationOpenId: []
    }

    featureSet = null
    modelSet = null

    componentDidMount() {
        setInterval(() => {
            Python.getQueue(null, (err, res) => {
                if (res) {
                    this.setState({jobQueue: res})
                } 
            })
        }, 5000)
    }
    render() {
        const { classes } = this.props
        const { value, baseTabValue, jobQueue, validationOpenId } = this.state
        return (
            <div className="base container horizontal" style={{height: "calc(100vh - 40px)", overflowY:"scroll"}}>

                <div style={{width: "100%"}}>
                    
                    <div style={{padding:30}}>
                        {jobQueue.map((job, i) => (
                            <div key={job.id} className={classes.form}>
                                            <VisualisationPlayer {...job}/>
                                                <Button
                                                        variant="outlined"
                                                        color="primary"
                                                        onClick ={(e) => {
                                                            e.stopPropagation()
                                                        }}>
                                                    Save model
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    color="secondary"
                                                        onClick ={(e) => {
                                                            Python.popQueue(job.id, (err, res)=> {
                                                                if (!err) {
                                                                    this.setState({jobQueue: res})
                                                                }
                                                            })
                                                            e.stopPropagation()
                                                        }}>
                                                    Remove entry
                                                </Button>

                                            
                                        {validationOpenId.includes(job.id) ?
                        
                                                    <div className="evaluation-wrapper">
                                                        {[...(job.evaluations  || [])].reverse().map((e, i) => (
                                                            <div key={i} style={{width:"300px"}}>
                                                                <Typography variant="h5">Epoch {e[0]}</Typography>
                                                                <Typography variant="h6">Input data</Typography>
                                                                <ResultDisplay src={e[1]}/>
                                                                <Typography variant="h6">Ground truth</Typography>
                                                                <ResultDisplay src={e[2]}/>
                                                                <Typography variant="h6">Prediction</Typography>
                                                                <ResultDisplay src={e[3]}/>
                                                            </div>

                                                        ))}
                                                    </div>
                                     
                                             : null
                                        }
                                        
                                        </div>
                                ))}

                        <form className={classes.form}>
                            <Typography variant="h5">Queue training session</Typography>
                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Batch size</InputLabel>
                                <BootstrapInput variant="filled" id="batch_size" type="number" defaultValue="8" ></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Number of epochs</InputLabel>
                                <BootstrapInput id="number_of_epochs" type="number" defaultValue="100"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Minimum size of training set</InputLabel>
                                <BootstrapInput id="min_data_size" type="number" defaultValue="500"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Maximum size of training set</InputLabel>
                                <BootstrapInput id="max_data_size" type="number" defaultValue="5000"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Validation frequency</InputLabel>
                                <BootstrapInput id="validation_frequency" type="number" defaultValue="5" ></BootstrapInput>
                            </FormControl>
                            
                            <FormControl className={classes.textField}>
                                <Button style={{backgroundColor: this.props.theme.palette.success.main, padding:"10px 12px", marginTop:20}} onClick={() => {
                                            const config = {}
                                            config.items = store.getState().undoable.present.items
                                            config.batch_size = document.getElementById("batch_size").value
                                            config.epochs = document.getElementById("number_of_epochs").value
                                            config.validation_freq = document.getElementById("validation_frequency").value
                                            config.name = "Placeholder name"
                                            console.log("PRESSED")
                                            Python.enqueueTraining(config, (err, res) => {
                                                if (res) {
                                                    this.setState({jobQueue: res})
                                                }
                                            })
                                        }}>Add to queue</Button>
                            </FormControl>
                        </form>

                        <div style={{height:"300px"}}></div>
                        
                    </div>
                </div>
            </div>
        );
    }

}

export default withStyles(useStyles)(Models)
