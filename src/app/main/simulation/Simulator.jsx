import React from 'react';
import { Typography, Button, Input, IconButton } from '@material-ui/core';
import { RefreshOutlined, GetApp, ArrowBack } from '@material-ui/icons';
import Store from '../../../store/store.js';
import Python from '../../../providers/PythonInterface.js';
import { ResultDisplay } from '../training/Training.jsx';
const { dialog } = window.require('electron').remote;
const fs = window.require('fs');

const history_length = 5;

export class ImageContainer extends React.Component {
    displayElements() {
        if (this.props.src && this.props.label) {
            return (
                <div style={{ flexDirection: 'row', display: 'flex' }} className={this.props.wrapClass}>
                    <>
                        <ResultDisplay title="Input" src={this.props.src} height="100%" width="100%"></ResultDisplay>
                        <ResultDisplay title="Label" src={this.props.label} height="100%" width="100%"></ResultDisplay>
                    </>
                </div>
            );
        } else if (this.props.src) {
            return (
                <div style={{ flexDirection: 'row', display: 'flex' }} className={this.props.wrapClass}>
                    <>
                        <ResultDisplay title="" src={[this.props.src]} height="100%" width="100%"></ResultDisplay>
                    </>
                </div>
            );
        } else {
            return (
                <div style={{ flexDirection: 'row', display: 'flex' }} className={this.props.wrapClass}>
                    <div>
                        <Typography color="secondary" variant="h3">
                            {this.props.errorTitle}
                        </Typography>
                        <pre style={{ fontSize: 20, whiteSpace: 'pre-wrap' }}>{this.props.errorMessage}</pre>
                    </div>
                </div>
            );
        }
    }

    render() {
        return (
            <div class="image-container" style={{ userSelect: 'none' }}>
                <div class="image-header background--20">
                    <Button style={{ height: '100%', border: 'none' }} onClick={this.props.onRequestRefresh}>
                        <RefreshOutlined></RefreshOutlined>
                    </Button>
                    {this.props.label ? (
                        <div style={{ marginLeft: 'auto' }}>
                            Save Images
                            <Input
                                id="images_to_save"
                                style={{ marginLeft: 10 }}
                                type="number"
                                defaultValue={1}
                            ></Input>
                            <Button
                                style={{ height: '100%', border: 'none' }}
                                onClick={() =>
                                    this.props.onRequestDownload(
                                        parseInt(document.getElementById('images_to_save').value),
                                    )
                                }
                            >
                                <GetApp></GetApp>
                            </Button>
                        </div>
                    ) : null}
                </div>
                <div class={'image-wrapper '}>{this.displayElements()}</div>
            </div>
        );
    }
}

function History(props) {
    const { result, error, index } = props;

    let errorTitle = '';
    let errorMessage = ''.slice();
    if (error) {
        errorTitle = error.name;
        errorMessage = '...' + error.stack.slice(-200) + '\n\n' + error.message;
    }
    let element;
    if (result) {
        element = (R, L, i, ylabel) => (
            <>
                <div class="ylabel text--background--80">{ylabel}</div>
                <ResultDisplay ylabel={ylabel} src={R} height="100%"></ResultDisplay>
                <ResultDisplay src={L} height="100%"></ResultDisplay>
            </>
        );
    } else {
        element = (R, L) => (
            <div
                style={{
                    width: '100%',
                    overflow: 'hidden',
                    gridColumn: '1 / -1',
                }}
            >
                <Typography color="secondary" variant="h3">
                    {errorTitle}
                </Typography>
                <pre style={{ fontSize: 20, whiteSpace: 'pre-wrap' }}>{errorMessage}</pre>
            </div>
        );
    }

    const mapping = {
        S: 'Training sample',
        V: 'Validation',
        T: 'Test',
    };

    return (
        <div
            className={'background--20'}
            style={{
                transition: 'bottom 300ms, transform 300ms, opacity 300ms',
                transitionTimingFunction: 'ease-in-out',
                padding: 20,
                borderRadius: 10,
                gap: 10,
                display: 'grid',
                gridTemplateRows:
                    '30px repeat(' +
                    Object.keys(result || { a: 1 }).length +
                    ', calc(' +
                    100 / Object.keys(result || { a: 1 }).length +
                    '% - ' +
                    (30 + (Object.keys(result || { a: 1 }).length - 1) * 10) / Object.keys(result || { a: 1 }).length +
                    'px))',
                gridTemplateColumns: '30px 1fr 1fr',
                maxHeight: 'calc(100% - 60px)',
                width: 'calc(100% - 60px)',
                position: 'absolute',
                transform:
                    'translate3d(0, ' + -80 * index + 'px, ' + -80 * index + 'px) scale(' + (1 - 0.2 * index) + ')',
                zIndex: history_length - index,
                opacity: 1 - index / (history_length - 1),
            }}
        >
            <>
                <div></div>
                <div style={{ fontSize: '1.8rem' }}>Input</div>
                <div style={{ fontSize: '1.8rem' }}>Label</div>
                {Object.entries(result || { a: 1 }).map(([key, value], i) => {
                    return element(value[0], value[1], i, mapping[key]);
                })}
            </>
        </div>
    );
}

export default class Trainer extends React.Component {
    state = {
        result: null,
        label: null,
        comparison: null,
        remountKey: new Date().getTime(),
        history: [],
        S: true,
        V: true,
        T: true,
    };

    counter = 0;

    remount() {
        this.setState({
            remountKey: new Date().getTime(),
        });
    }

    async updateState(err, res) {
        const history = [...this.state.history];

        this.counter++;
        if (!err) {
            history.unshift({
                error: '',
                result: res,
                key: this.counter,
            });
            while (history.length > history_length) {
                history.pop();
            }
            this.setState({
                history: history,
                error: '',
                result: res,
            });
        } else {
            history.unshift({
                error: err,
                result: null,
                label: null,
                key: this.counter,
            });
            while (history.length > history_length) {
                history.pop();
            }
            this.setState({
                history: history,
                error: err,
                result: null,
                label: null,
            });
        }
    }

    sampleFeature() {
        Python.sampleFeature(Store.getState().undoable.present.items, this.state, (err, res) => {
            this.updateState(err, res);
        });
    }

    updateComparison() {
        if (this.comparisons && this.comparisons.length > 0) {
            const index = this.comparisonIndex % this.comparisons.length;
            this.setState({ comparison: this.comparisons[index].path });
            this.comparisonIndex += 1;
        }
    }

    downloadImages(num) {
        const self = this;
        dialog.showOpenDialog({ properties: ['openDirectory'] }).then((res) => {
            if (res.filePaths && res.filePaths.length === 1) {
                let dict = [];
                const dir = res.filePaths[0] + '/';
                try {
                    dict = JSON.parse(fs.readFileSync(dir + 'config.json'));
                } catch {}
                try {
                    fs.mkdirSync(dir + 'images');
                } catch {}
                try {
                    fs.mkdirSync(dir + 'labels');
                } catch {}

                const items = Store.getState().undoable.present.items;
                const d = new Date();
                let datestring =
                    ('0' + d.getDate()).slice(-2) +
                    ('0' + (d.getMonth() + 1)).slice(-2) +
                    d.getFullYear() +
                    ('0' + d.getHours()).slice(-2) +
                    ('0' + d.getMinutes()).slice(-2) +
                    ('0' + d.getSeconds()).slice(-2);

                function save(index, result, label) {
                    const entry = {};

                    if (typeof result[0].name == 'string') {
                        entry.input = { value: result, type: 'list' };
                    } else {
                        entry.input = { value: [], type: 'paths' };
                        result.forEach((item, j) => {
                            const path = dir + 'images/' + datestring + 'image' + index + '_layer_' + j + '.bmp';
                            fs.writeFileSync(path, item, 'base64', () => {});
                            entry.input.value.push(path);
                        });
                    }

                    if (typeof result[0].name == 'string') {
                        entry.label = { value: label, type: 'list' };
                    } else {
                        entry.label = { value: [], type: 'paths' };
                        label.forEach((item, j) => {
                            const path = dir + 'images/' + datestring + 'label' + index + '_layer_' + j + '.bmp';
                            fs.writeFileSync(path, item, 'base64', () => {});
                            entry.label.value.push(path);
                        });
                    }
                    dict.push(entry);
                }
                function requestNext(index, self) {
                    if (index < num) {
                        Python.sampleFeature(items, { S: true, V: false, T: false }, (err, res) => {
                            if (res) {
                                save(index, res.S[0], res.S[1]);
                            }

                            self.updateState(err, res);

                            requestNext(index + 1, self);
                        });
                    } else {
                        fs.writeFileSync(dir + 'config.json', JSON.stringify(dict, null, 4));
                    }
                }

                if (this.state.result && this.state.label) {
                    save(0, this.state.result, this.state.label);
                    requestNext(1, self);
                } else requestNext(0, self);
            }
        });
    }
    sidebar = undefined;

    comparisons = [];
    comparisonIndex = 0;

    // }
    X0 = 0;
    W0 = 0;
    leftContainer = undefined;

    render() {
        const props = this.props;
        const { result, remountKey, error } = this.state;
        const onmousemove = (e2) => {
            requestAnimationFrame(() => {
                document.getElementById('display-left').style.width =
                    (100 * (e2.pageX - this.W0.left)) / (this.W0.right - this.W0.left) + '%';
            });
        };

        return (
            <div className="container horizontal">
                <div
                    id="display-container"
                    onMouseDown={(e) => {
                        if (e.target.id === 'display-center') {
                            this.W0 = e.currentTarget.getBoundingClientRect();

                            e.currentTarget.addEventListener('mousemove', onmousemove);
                        }
                        this.isDragging = false;
                    }}
                    onMouseUp={(e) => {
                        e.currentTarget.removeEventListener('mousemove', onmousemove);
                    }}
                >
                    <div id="display-left" className="background--black" style={{ minWidth: 400 }}>
                        <div class="image-container" style={{ userSelect: 'none' }}>
                            <div class="image-header background--20">
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.setState({
                                            S: !this.state.S,
                                        });
                                    }}
                                >
                                    <div
                                        className={
                                            'text-button ' +
                                            (this.state.S ? 'text-button-selected text-button-active' : '')
                                        }
                                    >
                                        S
                                    </div>
                                </IconButton>
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.setState({
                                            V: !this.state.V,
                                        });
                                    }}
                                >
                                    <div
                                        className={
                                            'text-button ' +
                                            (this.state.V ? 'text-button-selected text-button-active' : '')
                                        }
                                    >
                                        V
                                    </div>
                                </IconButton>
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        this.setState({
                                            T: !this.state.T,
                                        });
                                    }}
                                >
                                    <div
                                        className={
                                            'text-button ' +
                                            (this.state.T ? 'text-button-selected text-button-active' : '')
                                        }
                                    >
                                        T
                                    </div>
                                </IconButton>
                                <Button style={{ height: '100%', border: 'none' }} onClick={() => this.sampleFeature()}>
                                    <RefreshOutlined></RefreshOutlined>
                                </Button>
                                {this.state.history.length > 1 ? (
                                    <Button
                                        style={{
                                            height: '100%',
                                            border: 'none',
                                        }}
                                        onClick={() => {
                                            const history = [...this.state.history];
                                            history.shift();
                                            this.setState({
                                                history: history,
                                                result: history[0].result,
                                                label: history[0].label,
                                                error: history[0].error,
                                            });
                                        }}
                                    >
                                        <ArrowBack></ArrowBack>
                                    </Button>
                                ) : null}
                                {this.state.history ? (
                                    <div style={{ marginLeft: 'auto' }}>
                                        Save Images
                                        <Input
                                            id="images_to_save"
                                            style={{
                                                marginLeft: 10,
                                                width: 30,
                                            }}
                                            type="number"
                                            defaultValue={1}
                                        ></Input>
                                        <Button
                                            style={{
                                                height: '100%',
                                                border: 'none',
                                            }}
                                            onClick={() =>
                                                this.downloadImages(
                                                    parseInt(document.getElementById('images_to_save').value),
                                                )
                                            }
                                        >
                                            <GetApp></GetApp>
                                        </Button>
                                    </div>
                                ) : null}
                            </div>
                            <div
                                class={'image-wrapper'}
                                style={{
                                    position: 'relative',
                                    overflow: 'hidden',
                                    justifyContent: 'center',
                                }}
                            >
                                {this.state.history.map((historyElement, i) => (
                                    <History {...historyElement} index={i} />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div id="display-center" className="background--60">
                        <div></div>
                    </div>

                    <div
                        id="display-right"
                        className="background--black"
                        onDragOver={(e) => {
                            e.preventDefault();
                            const dt = e.dataTransfer;
                            if (
                                dt.types &&
                                (dt.types.indexOf ? dt.types.indexOf('Files') !== -1 : dt.types.contains('Files'))
                            ) {
                                requestAnimationFrame(() => {
                                    document.getElementById('display-right').style.backgroundColor = '#333';
                                });
                            }
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            const dt = e.dataTransfer;
                            if (
                                dt.types &&
                                (dt.types.indexOf ? dt.types.indexOf('Files') !== -1 : dt.types.contains('Files'))
                            ) {
                                requestAnimationFrame(() => {
                                    document.getElementById('display-right').style.backgroundColor = '';
                                });
                            }
                        }}
                        onDragEnd={(e) => {
                            e.preventDefault();
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            let files = e.dataTransfer.files;
                            if (files.length === 0) return;

                            const images = [];

                            for (let i = 0; i < files.length; i++) {
                                if (files[i].type.startsWith('image')) {
                                    images.push(files[i]);
                                }
                            }

                            this.comparisons = images;

                            this.comparisonIndex = 0;

                            this.updateComparison();

                            requestAnimationFrame(() => {
                                document.getElementById('display-right').style.backgroundColor = '';
                            });
                        }}
                    >
                        {this.state.comparison ? (
                            <ImageContainer
                                wrapClass={'background--30 wrapper'}
                                src={this.state.comparison}
                                onRequestRefresh={this.updateComparison.bind(this)}
                            />
                        ) : (
                            <Typography
                                variant="h4"
                                className="text--emphasis"
                                style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    overflow: 'wrap',
                                    userSelect: 'none',
                                }}
                            >
                                Drag image(s) here!
                            </Typography>
                        )}
                    </div>
                </div>
            </div>
        );
    }
}
