import { createStyles, Tab, TabProps, Tabs, Theme, withStyles } from '@material-ui/core';
import React from 'react';

import Logger from './logger/Logger';

import Predict from './Predict/Predict';
import Simulator from './simulation/Simulator.jsx';
import Training from './training/Training.jsx';

const AntTabs = withStyles((theme: Theme) =>
    createStyles({
        indicator: {
            backgroundColor: theme.palette.primary.main,
        },
    }),
)(Tabs);

const AntTabStyle = (theme: Theme) =>
    createStyles({
        root: {
            textTransform: 'none',
            minWidth: 72,
            fontSize: 20,
            fontWeight: theme.typography.fontWeightRegular,
            marginRight: theme.spacing(4),
            color: theme.palette.text.secondary,
            '&:hover': {
                color: theme.palette.common.white,
                opacity: 1,
            },
            '&$selected': {
                color: theme.palette.common.white,
                fontWeight: theme.typography.fontWeightMedium,
            },
            '&:focus': {
                color: theme.palette.common.white,
            },
        },
        selected: {},
    });

const AntTab = withStyles(AntTabStyle)((props: TabProps) => <Tab disableRipple {...props} />);

interface MainTabsPropTypes {
    theme: Theme;
}

export default function MainTabs(props: MainTabsPropTypes) {
    const [tabIndex, setTabIndex] = React.useState(0);

    return (
        <div id="main">
            <div
                className="background--black"
                style={{
                    width: '100%',
                    flexDirection: 'row',
                    display: 'flex',
                    paddingLeft: 30,
                }}
            >
                <AntTabs value={tabIndex} onChange={(event, newIndex) => setTabIndex(newIndex)}>
                    <AntTab label="Visualize dataset"></AntTab>
                    <AntTab label="Train model"></AntTab>
                    <AntTab label="Predict"></AntTab>
                </AntTabs>
            </div>

            <div style={{ width: '100%' }} hidden={tabIndex !== 0}>
                <Simulator theme={props.theme} />
            </div>

            <div style={{ width: '100%' }} hidden={tabIndex !== 1}>
                <Training theme={props.theme} />
            </div>

            <div style={{ width: '100%' }} hidden={tabIndex !== 2}>
                <Predict theme={props.theme} />
            </div>

            <Logger />
        </div>
    );
}
