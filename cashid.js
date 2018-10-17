const React = require("react");
//import axios = require("axios");

const styled = require("styled-components");

class CashID extends React.Component {
  state = { tokens: "" };

  componentDidMount() {}

  render() {
    return (
      <CashIDdiv>
        <h1>test</h1>
      </CashIDdiv>
    );
  }
}

const CashIDdiv = styled.div`
  h1 {
    color: red;
    font-size: 2rem;
  }
`;
export default CashID;
