import React, { Component } from "react";

import MontrealMap from "./MontrealMap"
import logo from "./Bixi_logo.svg";
import "./App.css";

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
        </div>
        <div className="content">
          <MontrealMap />
         {/*} <Map google={this.props.google} /> */}
        </div>
      </div>
    );
  }
}

export default App;
