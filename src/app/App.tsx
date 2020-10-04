import React from 'react';

import '../styles/colors.scss';
import '../styles/App.scss';
import '../styles/sidebar.scss';

import store, { reset } from '../store/store.js';

import { Provider } from 'react-redux';
import Tabs from './main/Tabs';
import { SnackbarProvider } from 'notistack';

import { createStyles, makeStyles } from '@material-ui/core/styles';
import clsx from 'clsx';
import CssBaseline from '@material-ui/core/CssBaseline';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import { DeleteOutline, SaveOutlined, FolderOpen, Code, CloudDownload } from '@material-ui/icons';

import { MuiThemeProvider, createMuiTheme, Tooltip } from '@material-ui/core';
import Sidebar from './sidebar/Sidebar';
import FeatureSet from './sidebar/Features/Feature';
import DownloadModal from './DownloadModal';
import FeatureStoreDrawer from './featureStore/Drawer';

import PythonInterface from '../providers/PythonInterface';

const fs = window.require('fs');
const { dialog } = window.require('electron').remote;

const theme = createMuiTheme({
    palette: {
        type: 'dark',
        primary: {
            main: '#0090E7',
            dark: '#0090E7',
        },
        success: {
            main: '#00D25B',
            dark: '#00D25B',
        },
        secondary: {
            main: '#FC424A',
            dark: '#FC424A',
        },
    },
});

const drawerWidth = 280;

const useStyles = makeStyles((theme) =>
    createStyles({
        root: {
            display: 'flex',
            height: 'calc(100vh - 30px)',
            overflow: 'hidden',
        },
        appBar: {
            transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
        },
        appBarShift: {
            width: `calc(100% - ${drawerWidth}px)`,
            marginLeft: drawerWidth,
            transition: theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
        },
        menuButton: {
            marginRight: theme.spacing(0.2),
            marginLeft: theme.spacing(0.2),
        },
        hide: {
            display: 'none',
        },
        drawer: {
            marginTop: 30,
            width: drawerWidth,
            flexShrink: 0,
        },
        drawerPaper: {
            marginTop: 30,
            width: drawerWidth,
        },
        drawerHeader: {
            display: 'flex',
            alignItems: 'center',
            height: 49,
            padding: theme.spacing(0, 1),
            // necessary for content to be below app bar
            ...theme.mixins.toolbar,
            justifyContent: 'flex-end',
        },
        content: {
            flexGrow: 1,
            padding: theme.spacing(0),
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            marginLeft: -drawerWidth,
        },
        contentShift: {
            transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.easeOut,
                duration: theme.transitions.duration.enteringScreen,
            }),
            marginLeft: 0,
        },
    }),
);

export default function App() {
    const classes = useStyles();
    const [featureStoreOpen, setFeatureStoreOpen] = React.useState(false);
    const [dopen, setDOpen] = React.useState(false);

    function savePython() {
        const present = store.getState().undoable.present;
        dialog
            .showSaveDialog({
                defaultPath: 'MyModel',
                filters: [{ name: 'Python', extensions: ['py'] }],
            })
            .then(({ filePath }) => {
                if (filePath)
                    PythonInterface.to_py(present, filePath, (err, res) => {
                        if (res) alert('Saved as ' + filePath);
                        else alert('Error converting pipeline to python.');
                    });
            });
    }

    function save() {
        const present = store.getState().undoable.present;
        dialog
            .showSaveDialog({
                defaultPath: 'MyModel',
                filters: [{ name: 'DeepTrack Set (.dts)', extensions: ['dts'] }],
            })
            .then(({ filePath }) => {
                if (filePath) {
                    fs.writeFileSync(filePath, JSON.stringify(present));
                }
            });
    }

    function load() {
        dialog
            .showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'DeepTrack Set (.dts)', extensions: ['dts'] },
                    { name: 'All Files', extensions: ['*'] },
                ],
            })
            .then(({ filePaths }) => {
                if (filePaths && filePaths.length > 0) {
                    const present = fs.readFileSync(filePaths[0]);
                    if (present) {
                        try {
                            store.dispatch({
                                type: 'SET_STATE',
                                present: JSON.parse(present),
                            });
                        } catch (error) {}
                    }
                }
            });
    }

    document.onkeydown = function (e) {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
        }
    };

    return (
        <Provider store={store}>
            <SnackbarProvider maxSnack={3}>
                <MuiThemeProvider theme={theme}>
                    <CssBaseline />
                    <DownloadModal open={dopen} onClose={() => setDOpen(false)} />
                    <div className={classes.root + ' background--dark'}>
                        <div
                            className={
                                clsx(classes.content, {
                                    [classes.contentShift]: featureStoreOpen,
                                }) + ' root'
                            }
                        >
                            <FeatureStoreDrawer
                                open={featureStoreOpen}
                                drawer={classes.drawer}
                                drawerHeader={classes.drawerHeader}
                                drawerPaper={classes.drawerPaper}
                                theme={theme}
                                onClose={() => setFeatureStoreOpen(false)}
                            />

                            <Sidebar theme={theme}>
                                <div
                                    className="background--20"
                                    style={{
                                        height: 49,
                                        display: 'flex',
                                        width: '100%',
                                    }}
                                >
                                    <IconButton
                                        color="inherit"
                                        aria-label="open drawer"
                                        onClick={() => {
                                            setFeatureStoreOpen(!featureStoreOpen);
                                        }}
                                        edge="start"
                                        className={clsx(classes.menuButton)}
                                    >
                                        <MenuIcon />
                                    </IconButton>
                                    <Typography
                                        style={{
                                            lineHeight: '49px',
                                            textAlign: 'left',
                                            textIndent: 10,
                                            paddingRight: 50,
                                        }}
                                        variant="h5"
                                    >
                                        DeepTrack 2.0
                                    </Typography>
                                    <Tooltip title="Save as python code">
                                        <IconButton
                                            color="inherit"
                                            aria-label="Save as python code"
                                            onClick={savePython}
                                            edge="end"
                                            className={clsx(classes.menuButton)}
                                        >
                                            <Code></Code>
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Download dataset">
                                        <IconButton
                                            color="inherit"
                                            aria-label="download data"
                                            onClick={() => {
                                                setDOpen(true);
                                            }}
                                            edge="end"
                                            className={clsx(classes.menuButton)}
                                        >
                                            <CloudDownload />
                                        </IconButton>
                                    </Tooltip>

                                    <IconButton
                                        color="inherit"
                                        aria-label="save"
                                        onClick={save}
                                        edge="end"
                                        className={clsx(classes.menuButton)}
                                    >
                                        <SaveOutlined />
                                    </IconButton>
                                    <IconButton
                                        color="inherit"
                                        aria-label="open"
                                        onClick={load}
                                        edge="end"
                                        className={clsx(classes.menuButton)}
                                    >
                                        <FolderOpen />
                                    </IconButton>
                                    <IconButton
                                        color="inherit"
                                        aria-label="clear"
                                        onClick={reset}
                                        edge="end"
                                        className={clsx(classes.menuButton)}
                                    >
                                        <DeleteOutline />
                                    </IconButton>
                                </div>

                                <FeatureSet theme={theme} />
                            </Sidebar>

                            <Tabs theme={theme} />
                        </div>
                    </div>
                </MuiThemeProvider>
            </SnackbarProvider>
        </Provider>
    );
}
