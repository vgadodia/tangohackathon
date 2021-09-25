import "./App.css";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { StepsStyleConfig as Steps } from "chakra-ui-steps";

import {
  HashRouter,
  Route,
  Redirect,
  Switch,
  BrowserRouter as Router,
} from "react-router-dom";
import Home from "./components/Home";
import Demo from "./components/Demo";

const theme = extendTheme({
  components: {
    Steps,
  },
});

function App() {
  return (
    <ChakraProvider theme={theme}>
      <Router>
        <Switch>
          <Route path="/" exact component={Home} />
          <Route path="/demo" exact component={Demo} />
          <Route component={() => <Redirect path="/" />} />
        </Switch>
      </Router>
    </ChakraProvider>
  );
}

export default App;
