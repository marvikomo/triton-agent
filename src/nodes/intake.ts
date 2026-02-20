
import { AgentState } from "../states";

export class IntakeNode {

 private model: any;

  constructor(model: any, ) {
    this.model = model;
  }

  async execute(state: typeof AgentState.State) {

    if(state.sessionHistory.length === 0) {
        return { mode: 'fresh'}
    }else {
        return { mode: 'iterate'}
    }
    
  }


}