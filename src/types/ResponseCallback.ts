import { PythonShell } from 'python-shell';

/**
 * A callback function for communicating between the logic layer (Python) and the UI (React) with the following arguments:
 *  
 * | Argument         | Type                                      | Description                                                                                |
 * | ---------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------ |
 * | message          | string                                    | The message that was recieved from the Python script                                       |
 * | sendLogicMessage | (message: string | Object) => PythonShell | Function to                      |
 * | uiArgumentMap    | object                                    | The arguments supplied to the UI (React) callback keyed to names given within the metadata file |
 * | logicMessages    | string[]                                  | An array of all the past messages recieved from the Python script                               |
 * | sendUIMessage    | (channel: string, ...args: any[]) => void | Function to allow sending messages back to the UI (react)                                       |
 * | resolve          | Function                                  | The resolve function (used to resolve the promise that wraps the PythonShell object)            |
 * | reject           | Function                                  | The reject function (used to reject the promise returned by the PythonShell object)             |
 * 
 * Note, we provide these arguments for every callback but not every callback needs to use them all (a feature of JavaScript)
 */
export type ResponseCallback = (
    message: string, 
    sendLogicMessage: (message: string | Object) => PythonShell, 
    uiArgumentMap: { 
        [argName: string]: unknown 
    }, 
    logicMessages: string[], 
    sendUIMessage: (channel: string, ...args: any[]) => void, 
    resolve: (Result?: unknown) => any, 
    reject: (reason?: any) => void
) => void;