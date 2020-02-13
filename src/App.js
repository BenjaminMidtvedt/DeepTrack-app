import React from 'react';
import logo from './logo.svg';
import './App.css';
import Button from "@material-ui/core/Button"
import Base from "./base/index.js"




class App extends React.Component {

  state = {
    pressed_next: false
  }

  on_press_next() {
    this.setState({pressed_next: true})
  }

  render() {
    return this.state.pressed_next ? <Base></Base> : (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            A web-app example using React and Electron!
          </p>
          
          <Button variant="contained" color="primary" onClick={this.on_press_next.bind(this)}>
            Start!
          </Button>
        </header>
      </div>
    );
  }
}

export default App;
