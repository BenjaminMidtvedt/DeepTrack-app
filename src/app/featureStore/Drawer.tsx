import { Divider, Drawer, IconButton, Theme, Typography } from '@material-ui/core';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

import FeatureStore from './FeatureStore.jsx';

import React, { ReactNode, FC } from 'react';

type FeatureStorePropTypes = {
    theme: Theme;
    drawer?: string;
    drawerPaper?: string;
    drawerHeader?: string;

    open: boolean;
    onClose: () => any;
};

const FeatureStoreDrawer = (props: FeatureStorePropTypes) => {
    const handleDrawerClose = () => {
        props.onClose();
    };

    return (
        <Drawer
            className={props.drawer + ' background--dark'}
            variant="persistent"
            anchor="left"
            open={props.open}
            classes={{
                paper: props.drawerPaper + ' background--dark',
            }}
        >
            <div className={props.drawerHeader + ' background--dark'}>
                <Typography variant="h4" style={{ paddingRight: 50 }}>
                    Features
                </Typography>
                <IconButton onClick={handleDrawerClose} style={{ height: 49 }}>
                    {props.theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                </IconButton>
            </div>
            <Divider />
            <FeatureStore key={props.open ? 'open' : 'closed'} />
        </Drawer>
    );
};
export default FeatureStoreDrawer;
