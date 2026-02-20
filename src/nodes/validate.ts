
import { AgentState } from "../states";

export class ValidateNode {

 private model: any;
 private state: typeof AgentState;

  constructor(model: any, state: typeof AgentState) {
    this.model = model;
    this.state = state;
  }

  async execute() {
    
  }


}