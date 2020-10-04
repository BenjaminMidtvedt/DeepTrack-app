import React from 'react';
import {
    Typography,
    Button,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    withStyles,
    createStyles,
    InputLabel,
    FormControl,
    InputBase,
    Slider,
    IconButton,
    Select,
    Switch,
    FormControlLabel,
    Tabs,
    Tab,
} from '@material-ui/core';
import { PlayArrow } from '@material-ui/icons';
import { withSnackbar } from 'notistack';
import Python from '../../../providers/PythonInterface';
import store, { appPath } from '../../../store/store';
import * as d3 from 'd3';
import { GROUPBEGIN, GROUPEND } from 'easy-redux-undo';
import { addItem, setValue } from '../../../store/actions';

const path = window.require('path');

export function Image(props) {
    let [index, setIndex] = React.useState(0);
    index = Math.min(index, props.sources.length - 1);
    return (
        <div style={props.style}>
            <img
                {...props}
                src={
                    typeof props.sources[index] === 'string'
                        ? props.sources[index]
                        : 'data:image/bmp;base64, ' + props.sources[index].toString('base64')
                }
            ></img>
            {props.sources.length > 1 ? (
                <div style={{ marginLeft: 10, marginRight: 10 }}>
                    <Slider
                        valueLabelDisplay="auto"
                        min={0}
                        max={props.sources.length - 1}
                        value={index}
                        onChange={(e, v) => setIndex(v)}
                    ></Slider>
                </div>
            ) : null}
        </div>
    );
}

const MySelect = withStyles((theme) =>
    createStyles({
        padding: 10,
        margin: 10,
    }),
)(Select);

const { dialog } = window.require('electron').remote;
const fs = window.require('fs');

export function ResultDisplay(props) {
    return (
        <div
            style={{
                padding: '2px',
                flexGrow: 1,
                height: props.height || 'auto',
                width: props.width || '-webkit-fill-available',
                margin: 'auto',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                position: 'relative',
            }}
        >
            {props.title ? (
                <div>
                    <Typography variant="h4">{props.title}</Typography>
                </div>
            ) : null}

            {props.src ? (
                !(typeof props.src[0].name === 'string') ? (
                    <Image
                        className="result-image"
                        style={{
                            objectFit: 'contain',
                            width: '100%',
                            maxHeight: '100% ',
                        }}
                        sources={props.src}
                    />
                ) : (
                    <div class="label-wrapper">
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Label name</TableCell>
                                    <TableCell>Label value</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {props.src.map((row, idx) => (
                                    <TableRow key={row}>
                                        <TableCell>{row.name}</TableCell>
                                        <TableCell>{row.value}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )
            ) : null}
        </div>
    );
}

class ResultVisualisation extends React.Component {
    state = {
        index: 0,
        predictions: [],
        input: '',
        target: '',
    };

    constructor(props) {
        super(props);
        this.deriveImages.bind(this);
    }

    componentDidMount() {
        this.deriveImages();
    }

    componentDidUpdate(oldProps) {
        if (this.props.predictions !== oldProps.predictions) {
            this.deriveImages();
        }
    }

    deriveImages() {}

    render() {
        const { predictions, input, target, index } = this.state;
        const { frame, status } = this.props;
        const frameIndex = (frame + predictions.length) % predictions.length;
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                }}
            >
                <IconButton
                    style={{
                        borderRadius: 5,
                        padding: 20,
                        transform: 'rotate(90deg)',
                        marginLeft: -90,
                        marginRight: -90,
                    }}
                    onClick={() => {
                        if (!this.props.predictions || this.props.predictions.length === 0) return;
                        this.setState({
                            index:
                                (this.state.index - 1 + this.props.predictions[0].length) %
                                this.props.predictions[0].length,
                        });
                    }}
                >
                    <div className="chevron"></div>
                </IconButton>

                <div style={{ flexGrow: 1, margin: 10 }}>
                    <ResultDisplay title="Input" src={this.props.inputs[index]} />
                </div>

                <div style={{ flexGrow: 1, margin: 10 }}>
                    <ResultDisplay title="Prediction" src={(this.props.predictions[frame] || [])[index] || ''} />
                </div>

                <div style={{ flexGrow: 1, margin: 10 }}>
                    <ResultDisplay title="Label" src={this.props.targets[index]} />
                </div>
                <IconButton
                    style={{
                        borderRadius: 5,
                        padding: 20,
                        transform: 'rotate(-90deg)',
                        marginLeft: -90,
                        marginRight: -90,
                    }}
                    onClick={() => {
                        if (!this.props.predictions || this.props.predictions.length === 0) return;
                        this.setState({
                            index: (this.state.index + 1) % this.props.predictions[0].length,
                        });
                    }}
                >
                    <div className="chevron"></div>
                </IconButton>
            </div>
        );
    }
}

class StatusVisualisation extends React.Component {
    componentDidMount() {
        const svg = d3
            .select('#svg' + this.props.id)
            .attr('width', 600)
            .attr('height', 350);

        this.__oldData__ = d3.local();
        this.updatePath();
        this.updatePath();
    }

    componentDidUpdate() {
        this.updatePath();
    }

    updatePath() {
        const data = [
            {
                title: 'Validation set',
                x: 150,
                y: 200,
                count: this.props.validation_size,
                maxCount: this.props.validation_set_size,
                color: '#00D25B',
            },
            {
                title: 'Training set',
                x: 450,
                y: 200,
                count: this.props.data_size,
                maxCount: this.props.max_data_size,
                minCount: this.props.min_data_size,
                color: '#0090E7',
            },
        ];
        const self = this;
        const svg = d3.select('#svg' + this.props.id);
        svg.selectAll('g')
            .select('.barpath')
            .each(function (d) {
                self.__oldData__.set(this, d);
            });
        const bars = svg.selectAll('g').data(data);

        const gs = bars
            .enter()
            .append('g')
            .attr('transform', (d) => 'translate(' + d.x + ',' + d.y + ')');

        gs.append('path').attr('class', 'barpath');
        gs.append('path')
            .attr('fill', 'rgba(0, 0, 0, 0.2)')
            .attr(
                'd',
                d3
                    .arc()
                    .innerRadius(100)
                    .outerRadius(130)
                    .startAngle(0)
                    .endAngle(2 * Math.PI),
            );

        gs.append('text')
            .attr('transform', 'translate(0, -160)')
            .attr('text-anchor', 'middle')
            .text((d) => d.title)
            .attr('font-size', '25px')
            .attr('fill', 'white');

        gs.append('text')
            .attr('class', 'indicator')
            .attr('text-anchor', 'middle')
            .attr('transform', 'translate(0, 12.5)')
            .attr('font-size', '25px')
            .attr('fill', 'white');

        bars.select('.indicator').text((d) => d.count + ' / ' + d.maxCount);

        const arc = d3.arc().innerRadius(100).outerRadius(130).startAngle(0);

        bars.select('.barpath')
            .attr('fill', (d) => d.color)
            .transition()
            .duration(1000)
            .attrTween('d', function (d) {
                const old_data = self.__oldData__.get(this);
                const old_count = old_data ? old_data.count : 0;
                const iter = d3.interpolate(
                    (2 * Math.PI * old_count) / d.maxCount,
                    (2 * Math.PI * d.count) / d.maxCount,
                );
                return (t) => {
                    d.endAngle = iter(t);
                    return arc(d);
                };
            });
    }

    render() {
        const result_dict = this.props.test_results;

        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyItems: 'center',
                    alignItems: 'center',
                }}
            >
                <div style={{ width: 250, textAlign: 'center' }}>
                    <Typography variant="h4">{this.props.status}</Typography>
                </div>
                <svg id={'svg' + this.props.id}></svg>
                {this.props.test_results && this.props.test_results.scores ? (
                    <div
                        style={{
                            padding: 15,
                            height: 300,
                            borderLeft: '2px rgba(255, 255, 255, 0.5) dashed',
                        }}
                    >
                        <Typography variant="h4" style={{ borderBottom: '1px solid white' }}>
                            Test results
                        </Typography>
                        {Object.entries(this.props.test_results.scores || {}).map(([key, value]) => (
                            <div class="result-item">{key + ': \t' + value}</div>
                        ))}
                    </div>
                ) : null}
            </div>
        );
    }
}

class LossVisualisation extends React.Component {
    state = {
        xLinear: true,
        yLinear: false,
        metric: 'loss',
        variable: 'epoch',
    };

    metrics = [];
    variables = [];
    variable_names = [];

    constructor(props) {
        super(props);
        const { loss } = props;
        if (loss && loss.length > 0) {
            this.metrics = Object.keys(loss[0])
                .filter((key) => !key.startsWith('val_'))
                .sort((a, b) => (b === 'loss') - (a === 'loss'));
        }
    }

    componentWillReceiveProps(newProps) {
        if (this.metrics.length === 0) {
            const { loss } = newProps;
            if (loss && loss.length > 0) {
                this.metrics = Object.keys(loss[0])
                    .filter((key) => !key.startsWith('val_'))
                    .sort((a, b) => (a === 'loss') - (b === 'loss'));
            }
        }

        if (this.variables.length === 0) {
            const variables = [];
            const variable_names = [];
            newProps.properties.forEach((proplist) => {
                let vars = {};
                let frame = {};
                proplist.forEach((propdict, index) => {
                    Object.entries(propdict).forEach(([key, value]) => {
                        const v = Number.parseFloat(value);
                        if (Number.isNaN(v)) return;

                        if (!vars[key]) vars[key] = [];

                        vars[key].push(v);
                    });
                });
                Object.entries(vars).forEach(([key, value]) => {
                    let v0 = value[0];
                    let not_equal = value.filter((v) => v0 !== v);
                    if (not_equal.length === 0) {
                        frame[key] = v0;
                        if (!variable_names.includes(key)) variable_names.push(key);
                    }
                });
                variables.push(frame);
            });

            let reduced_names = variable_names.filter((name) => {
                let framewise = variables.map((framevars) => framevars[name]).filter((v) => v !== undefined);
                let v0 = framewise[0];
                let not_equal = framewise.filter((v) => v !== v0);
                return not_equal.length > 0;
            });

            this.variables = variables;
            this.variable_names = reduced_names;
        }
    }

    componentDidMount() {
        const { loss } = this.props;

        const svg = d3
            .select('#svgloss' + this.props.id)
            .attr('width', 600)
            .attr('height', 300)
            .append('g')
            .attr('transform', 'translate(50, 20)');

        svg.append('g').attr('color', '#4C4D4F').attr('class', 'axis');

        svg.append('g').attr('transform', 'translate(0, 250)').attr('color', '#4C4D4F').attr('class', 'xaxis');

        svg.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#0090E7')
            .attr('class', 'line')
            .attr('stroke-width', 1.5);
        svg.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#0090E7')
            .attr('stroke-opacity', 0.3)
            .attr('class', 'lineback');

        svg.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#00D25B')
            .attr('class', 'valline')
            .attr('stroke-width', 1.5);
        svg.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#00D25B')
            .attr('stroke-opacity', 0.3)
            .attr('class', 'vallineback');

        this.updatePath();
    }

    componentDidUpdate() {
        this.updatePath();
    }

    updatePath() {
        const svg = d3.select('#svgloss' + this.props.id);
        const { loss, validations, frame } = this.props;
        const { metric, variable } = this.state;

        let X =
            variable === 'epoch'
                ? Array(loss.length)
                      .fill(0)
                      .map((a, i) => i + 1)
                : this.variables.map((v) => v[variable]);
        let Y = variable === 'epoch' ? loss : validations[frame];
        let include_val = variable === 'epoch';

        const xScale = d3[this.state.xLinear ? 'scaleLinear' : 'scaleLog']().domain(d3.extent(X)).range([0, 550]);

        const additional_metrics = include_val
            ? [loss.map((s) => s['val_' + metric])]
            : validations.map((v) => v.map((v) => v[metric]));

        const yScale = d3[this.state.yLinear ? 'scaleLinear' : 'scaleLog']()
            .domain(
                d3.extent(
                    [].concat(
                        (Y || []).map((s) => s[metric]),
                        ...additional_metrics,
                    ),
                ),
            )
            .rangeRound([250, 0]);

        let labels = null;

        if (variable === 'epoch') {
            labels = svg.selectAll('.labels').data([metric, 'validation ' + metric]);

            svg.selectAll('circle').remove();
            const line = d3
                .line()
                .curve(d3.curveBasis)
                .x((d, index) => xScale(X[index]))
                .y((d) => yScale(d[metric]));

            const lineback = d3
                .line()
                .curve(d3.curveLinear)
                .x((d, index) => xScale(X[index]))
                .y((d) => yScale(d[metric]));

            const validation_line = d3
                .line()
                .curve(d3.curveBasis)
                .x((d, index) => xScale(X[index]))
                .y((d) => yScale(d['val_' + metric]));

            const validation_backline = d3
                .line()
                .curve(d3.curveLinear)
                .x((d, index) => xScale(X[index]))
                .y((d) => yScale(d['val_' + metric]));

            svg.select('.line').transition().attr('d', line(loss));
            svg.select('.lineback').transition().attr('d', lineback(loss));
            svg.select('.valline').transition().attr('d', validation_line(loss));
            svg.select('.vallineback').transition().attr('d', validation_backline(loss));
        } else {
            labels = svg.selectAll('.labels').data([metric]);
            svg.select('.line').attr('d', '');
            svg.select('.lineback').attr('d', '');
            svg.select('.valline').attr('d', '');
            svg.select('.vallineback').attr('d', '');

            const dat = svg.select('g').selectAll('circle').data(Y);
            dat.enter().append('circle').attr('r', 5).attr('fill', '#00D25B');

            svg.select('g')
                .selectAll('circle')
                .transition()
                .duration(100)
                .attr('cx', (d, i) => xScale(X[i]))
                .attr('cy', (d, i) => yScale(d[metric]));
        }

        let labs = labels.enter();
        labs.append('text')
            .attr('x', 500)
            .attr('y', (d, i) => 25 + i * 25)
            .style('fill', (d, i) => ['#0090E7', '00D25B'][i])
            .attr('class', 'labels');

        svg.selectAll('.labels').text((d) => d);

        const axis = d3.axisLeft().scale(yScale);
        const x_axis = d3.axisBottom().scale(xScale);
        svg.select('.axis').transition().call(axis);
        svg.select('.xaxis').transition().call(x_axis);
    }

    render() {
        return (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                <svg id={'svgloss' + this.props.id} style={{ width: 630, flexShrink: 0 }}></svg>
                <form>
                    <FormControl style={{ width: 200, padding: 10 }} variant="outlined">
                        <InputLabel htmlFor="select-variable">Variable</InputLabel>
                        <MySelect
                            native
                            inputProps={{
                                id: 'select-variable',
                                name: 'Variable',
                            }}
                            label="Variable"
                            value={this.state.variable}
                            onChange={(e) => {
                                this.setState({ variable: e.target.value });
                            }}
                        >
                            <option value="epoch" key="epoch">
                                Epoch
                            </option>

                            {this.props.validations.length > 0
                                ? this.variable_names.map((key) => (
                                      <option value={key} key={key}>
                                          {key}
                                      </option>
                                  ))
                                : null}
                        </MySelect>
                    </FormControl>

                    <FormControl style={{ width: 200, padding: 10 }} variant="outlined">
                        <InputLabel htmlFor="select-metric">Metric</InputLabel>
                        <MySelect
                            native
                            inputProps={{ id: 'select-metric', name: 'Metric' }}
                            label="Metric"
                            value={this.state.metric}
                            onChange={(e) => {
                                this.setState({ metric: e.target.value });
                            }}
                        >
                            {this.metrics.map((key, index) => (
                                <option value={key} key={key}>
                                    {key}
                                </option>
                            ))}
                        </MySelect>
                    </FormControl>
                    <br></br>
                    <FormControlLabel
                        label={'Log X'}
                        control={
                            <Switch
                                checked={!this.state.xLinear}
                                onChange={(e, xLinear) => this.setState({ xLinear: !xLinear })}
                                name="checkedC"
                            />
                        }
                    ></FormControlLabel>
                    <FormControlLabel
                        label={'Log Y'}
                        control={
                            <Switch
                                checked={!this.state.yLinear}
                                onChange={(e, yLinear) => this.setState({ yLinear: !yLinear })}
                                name="checkedC"
                            />
                        }
                    ></FormControlLabel>
                </form>
            </div>
        );
    }
}

function VisualisationPlayer(props) {
    const [frame, setFrame] = React.useState(0);
    const [visualiserIndex, setVisualiser] = React.useState(0);

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <Tabs value={visualiserIndex} onChange={(e, v) => setVisualiser(v)} variant="fullWidth">
                    <Tab label={'Status'}></Tab>
                    <Tab label="Loss"></Tab>
                    <Tab label="Validations"></Tab>
                    <Tab label="Predict"></Tab>
                </Tabs>
            </div>
            <div hidden={visualiserIndex != 0}>
                <StatusVisualisation {...props} />
            </div>
            <div hidden={visualiserIndex != 1}>
                <LossVisualisation {...props} frame={frame} />
            </div>
            <div hidden={visualiserIndex != 2}>
                <ResultVisualisation {...props} frame={frame} />
            </div>
            <div hidden={visualiserIndex != 3}>
                <PredictVisualiser {...props}></PredictVisualiser>
            </div>

            {visualiserIndex == 1 || visualiserIndex == 2 ? (
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <IconButton
                        onClick={() => {
                            const frame_end = props.predictions.length - 1;
                            let current_frame = 0;
                            const interval = Math.min(10000 / (props.predictions.length + 1), 100);

                            let c = setInterval(() => {
                                setFrame(current_frame);
                                current_frame++;
                                if (current_frame > frame_end) {
                                    clearInterval(c);
                                }
                            }, 100);
                        }}
                    >
                        <PlayArrow color="primary"></PlayArrow>
                    </IconButton>

                    <Slider
                        value={frame}
                        min={0}
                        max={props.predictions.length - 1 || 0}
                        onChange={(e, value) => setFrame(value)}
                    ></Slider>
                </div>
            ) : null}
        </div>
    );
}

class PredictVisualiser extends React.Component {
    state = {
        isDragging: false,
        input: undefined,
        result: undefined,
    };

    call_tracker(files) {
        files = Array.from(files);
        this.setState({ input: files[0].path });

        Python.predict(files[0].path, store.getState().undoable.present.items, this.props.id, (err, res) => {
            if (res) {
                this.setState({ result: res });
            } else {
                this.props.enqueueSnackbar('...' + err.message.slice(-200), {
                    variant: 'error',
                });
            }
        });
    }

    render() {
        const { isDragging, result, input } = this.state;

        return (
            <div
                style={{
                    width: 800,
                    height: 400,
                    display: 'flex',
                    flexDirection: 'row',
                }}
                onDragOver={(e) => {
                    this.setState({ isDragging: true });
                    e.stopPropagation();
                    e.preventDefault();
                }}
                onDragEnd={(e) => {
                    e.preventDefault();
                    this.setState({ isDragging: false });
                }}
                onDrop={(e) => {
                    e.stopPropagation();
                    const files = e.dataTransfer.files;

                    if (files.length === 0) return;
                    this.call_tracker(files);
                    this.setState({ isDragging: false });
                }}
            >
                {input && result && !isDragging ? (
                    <>
                        <ResultDisplay title="Input" height={350} width={'100%'} src={[input]} alt=""></ResultDisplay>
                        <ResultDisplay
                            title="Prediction"
                            height={350}
                            width={'100%'}
                            src={result}
                            alt=""
                        ></ResultDisplay>
                    </>
                ) : (
                    <Typography variant="h4" style={{ color: '#fff' }}>
                        {isDragging ? 'Drop the image here!' : 'Drag image to analyze'}
                    </Typography>
                )}
            </div>
        );
    }
}

PredictVisualiser = withSnackbar(PredictVisualiser);

const useStyles = (theme) => {
    return {
        form: {
            padding: 25,
            margin: '30px 0',
            borderRadius: 5,
        },
        textField: {
            margin: '15px 60px 15px 0px',
            width: '40%',
        },
        textFieldLabel: {
            color: 'white',
            fontSize: 20,
        },
        tableHead: {
            fontSize: 20,
        },
        tableCell: {
            fontSize: 16,
        },
    };
};

const BootstrapInput = withStyles((theme) =>
    createStyles({
        root: {
            'label + &': {
                marginTop: theme.spacing(3),
            },
        },
        input: {
            position: 'relative',
            fontSize: 16,
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            width: '100%',
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
        validationOpenId: [],
    };

    featureSet = null;
    modelSet = null;

    componentDidMount() {
        setInterval(() => {
            const current = this.state.jobQueue.map((job) => ({
                id: job.id,
                timestamp: job.timestamp,
            }));
            Python.getQueue(current, (err, res) => {
                if (res) {
                    let changed = false;
                    let old_queue = [...this.state.jobQueue];
                    old_queue = old_queue.map((job) => {
                        let index = res.findIndex((v) => v.id === job.id);
                        if (index !== -1) {
                            changed = true;
                            let item = res.splice(index, 1)[0];
                            return item;
                        }
                        return job;
                    });
                    changed = changed || res.length > 0;
                    let newQueue = [...old_queue, ...res];
                    if (changed) {
                        this.setState({ jobQueue: newQueue });
                    }
                }
            });
        }, 5000);
    }
    render() {
        const { classes } = this.props;
        const { value, baseTabValue, jobQueue, validationOpenId } = this.state;
        return (
            <div
                className="container horizontal background--10"
                style={{ height: 'calc(100vh - 40px)', overflowY: 'scroll' }}
            >
                <div style={{ width: '100%' }}>
                    <div style={{ padding: 30 }}>
                        {jobQueue.map((job, i) => (
                            <div key={job.id} className={classes.form + ' background--20'}>
                                <VisualisationPlayer {...job} />
                                <Button
                                    style={{ margin: 5 }}
                                    variant="outlined"
                                    color="primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        Python.pauseQueue();
                                        dialog
                                            .showSaveDialog({
                                                defaultPath: job.id,
                                                filters: [
                                                    {
                                                        name: 'Hierarchical Data Format (.h5)',
                                                        extensions: ['h5'],
                                                    },
                                                ],
                                            })
                                            .then(({ filePath }) => {
                                                if (filePath) {
                                                    fs.copyFile(
                                                        path.join(appPath, '/tmp/models/', job.id + '.h5'),
                                                        filePath,
                                                        (err) => {
                                                            if (err) console.log(err);
                                                        },
                                                    );
                                                }
                                            })
                                            .finally(() => {
                                                Python.unpauseQueue();
                                            });
                                    }}
                                >
                                    Save model
                                </Button>
                                <Button
                                    style={{ margin: 5 }}
                                    variant="outlined"
                                    color="primary"
                                    onClick={(e) => {
                                        store.dispatch({
                                            type: 'SET_STATE',
                                            present: job,
                                        });
                                    }}
                                >
                                    Load configuration
                                </Button>
                                <Button
                                    style={{ margin: 5 }}
                                    variant="outlined"
                                    color="primary"
                                    onClick={(e) => {
                                        const current_store = store.getState().undoable.present.items;

                                        let model_index = undefined;

                                        store.dispatch(GROUPBEGIN());
                                        const new_store = current_store.map((f, idx) => {
                                            if (f && f.name === 'Network' && f.class === 'featureGroup') {
                                                const new_f = { ...f };
                                                new_f.items = [];
                                                model_index = idx;
                                                return new_f;
                                            }
                                            return f;
                                        });
                                        store.dispatch({
                                            type: 'SET_STATE',
                                            present: { items: new_store },
                                        });
                                        store.dispatch(
                                            addItem(model_index, {
                                                name: 'LoadModel',
                                                class: 'feature',
                                                key: 'models',
                                                type: 'LoadModel',
                                            }),
                                        );

                                        let c = setInterval(() => {
                                            const sta = store.getState().undoable.present.items;
                                            const st = sta[sta[model_index].items[0]];

                                            if (st.items && st.items.length > 3) {
                                                st.items.forEach((propdx) => {
                                                    let prop = sta[propdx];
                                                    if (prop && prop.name === 'path') {
                                                        store.dispatch(
                                                            setValue(
                                                                propdx,
                                                                "r'" +
                                                                    path.join(appPath, '/tmp/models/', job.id + '.h5') +
                                                                    "'",
                                                            ),
                                                        );
                                                        store.dispatch(GROUPEND());

                                                        clearInterval(c);
                                                    }
                                                });
                                            }
                                        }, 100);
                                    }}
                                >
                                    Load model
                                </Button>
                                <Button
                                    style={{ margin: 5 }}
                                    variant="outlined"
                                    color="secondary"
                                    onClick={(e) => {
                                        Python.popQueue(job.id, (err, res) => {
                                            if (!err) {
                                                this.setState({
                                                    jobQueue: res,
                                                });
                                            }
                                        });
                                        e.stopPropagation();
                                    }}
                                >
                                    Remove entry
                                </Button>

                                {validationOpenId.includes(job.id) ? (
                                    <div className="evaluation-wrapper">
                                        {[...(job.evaluations || [])].reverse().map((e, i) => (
                                            <div key={i} style={{ width: '300px' }}>
                                                <Typography variant="h5">Epoch {e[0]}</Typography>
                                                <Typography variant="h6">Input data</Typography>
                                                <ResultDisplay src={e[1]} />
                                                <Typography variant="h6">Ground truth</Typography>
                                                <ResultDisplay src={e[2]} />
                                                <Typography variant="h6">Prediction</Typography>
                                                <ResultDisplay src={e[3]} />
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        ))}

                        <form className={classes.form + ' background--20'}>
                            <Typography variant="h5">Queue training session</Typography>
                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Batch size</InputLabel>
                                <BootstrapInput
                                    variant="filled"
                                    id="batch_size"
                                    type="number"
                                    defaultValue="16"
                                ></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Number of epochs</InputLabel>
                                <BootstrapInput id="number_of_epochs" type="number" defaultValue="100"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Minimum size of training set</InputLabel>
                                <BootstrapInput id="min_data_size" type="number" defaultValue="200"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Maximum size of training set</InputLabel>
                                <BootstrapInput id="max_data_size" type="number" defaultValue="1000"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Validation set size</InputLabel>
                                <BootstrapInput id="validation_size" type="number" defaultValue="64"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Epochs per validation</InputLabel>
                                <BootstrapInput
                                    id="validation_frequency"
                                    type="number"
                                    defaultValue="1"
                                ></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>
                                    Stop if validation has not improved in
                                </InputLabel>
                                <BootstrapInput id="patience" type="number" defaultValue="10"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <InputLabel className={classes.textFieldLabel}>Test set size</InputLabel>
                                <BootstrapInput id="test_set_size" type="number" defaultValue="100"></BootstrapInput>
                            </FormControl>

                            <FormControl className={classes.textField}>
                                <Button
                                    style={{
                                        backgroundColor: this.props.theme.palette.success.main,
                                        padding: '10px 12px',
                                        marginTop: 20,
                                    }}
                                    onClick={() => {
                                        const config = {};
                                        config.items = store.getState().undoable.present.items;
                                        config.batch_size = document.getElementById('batch_size').value;
                                        config.epochs = document.getElementById('number_of_epochs').value;
                                        config.validation_set_size = document.getElementById('validation_size').value;
                                        config.validation_freq = document.getElementById('validation_frequency').value;
                                        config.min_data_size = document.getElementById('min_data_size').value;
                                        config.max_data_size = document.getElementById('max_data_size').value;
                                        config.patience = document.getElementById('patience').value;
                                        config.test_set_size = document.getElementById('test_set_size').value;
                                        config.name = 'Placeholder name';
                                        Python.enqueueTraining(config, (err, res) => {
                                            if (res) {
                                                this.setState({
                                                    jobQueue: res,
                                                });
                                            }
                                        });
                                    }}
                                >
                                    Add to queue
                                </Button>
                            </FormControl>
                        </form>

                        <div style={{ height: '300px' }}></div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withStyles(useStyles)(Models);
