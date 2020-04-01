import React from 'react';
import logo from './logo.svg';
import './App.scss';
import { Tabs, Tab, Typography } from "@material-ui/core"
import { Album, FitnessCenter, BarChart } from '@material-ui/icons'
import Base from "./base"
import Trainer from "./trainer"

import { SnackbarProvider } from 'notistack'

import { MuiThemeProvider, createMuiTheme} from '@material-ui/core';

const theme = createMuiTheme({
  palette: {
    type: 'dark',
  },
})

const iconstyle = {
  fill: "inherit", 
  fontSize:"inherit"
}


export default function App() {
    
  const [value, setValue] = React.useState(1);

  function a11yProps(index: any) {
    return {
      className: index === value ? "tab tab-active" : "tab",
      style: {
        fontSize: 35
      },
      onClick: () => setValue(index)
    };
  }

  return (
    <SnackbarProvider maxSnack={3}>
      <MuiThemeProvider theme={theme}>      
        <div className="root">
          <div className="tabs">
            <div {...a11yProps(0)}> <Album style={iconstyle}></Album> </div>
            <div {...a11yProps(1)}> <FitnessCenter style={iconstyle}></FitnessCenter> </div>
            <div {...a11yProps(2)}> <BarChart style={iconstyle}></BarChart> </div>
          </div>
          <div hidden = {value !== 0}>
            <Base theme={theme}></Base>
          </div>

          <div hidden = {value !== 1}>
            <Trainer theme={theme}></Trainer>
          </div>

          <div hidden = {value !== 2}>
            <Typography>Not yet implemented :(</Typography>
          </div>
        </div>
        
      </MuiThemeProvider>
    </SnackbarProvider>
      
  );
}

