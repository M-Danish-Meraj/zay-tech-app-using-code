import React, { createContext, useReducer, useContext } from 'react';

const initialState = {
  workflowState: 'IDLE', // IDLE, GENERATING, RESULT_READY, APPROVING, APPROVED, REJECTING, REGENERATING, ERROR
  prompt: '',
  generationResult: null, // { success, generationId, imageUrl, imageName, caption }
  errorMessage: '',
};

const WorkflowContext = createContext();

function workflowReducer(state, action) {
  switch (action.type) {
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    case 'SET_STATE':
      return { ...state, workflowState: action.payload };
    case 'SET_RESULT':
      return { 
        ...state, 
        generationResult: action.payload,
        workflowState: 'RESULT_READY',
        errorMessage: '' 
      };
    case 'SET_ERROR':
      return { 
        ...state, 
        errorMessage: action.payload, 
        workflowState: 'ERROR' 
      };
    case 'SET_APPROVED':
      return {
        ...state,
        workflowState: 'APPROVED',
      };
    case 'RESET':
      return {
        ...state,
        workflowState: 'IDLE',
        generationResult: null,
        errorMessage: '',
      };
    default:
      return state;
  }
}

export const WorkflowProvider = ({ children }) => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  return (
    <WorkflowContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
