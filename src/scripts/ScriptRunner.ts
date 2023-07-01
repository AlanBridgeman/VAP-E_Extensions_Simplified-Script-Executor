import path from 'path';
import { spawnSync, SpawnSyncReturns } from 'child_process';

import fse from 'fs-extra';

import { InterpreterOptions } from '../types/InterpreterOptions';

import { ScriptCommunicator } from './ScriptCommunicator';

export abstract class ScriptRunner {
    /**
     * The interpreter (ex. PythonShell) options to use when running a (ex. Python) script
     */
    protected interpreterOptions: InterpreterOptions;

    /**
     * The function to use to send a message to the UI (or mock sending a message to the UI)
     */
    protected uiCallbackMock: (channel: string, ...args: any[]) => void;
    
    /**
     * Create a new ScriptRunner object
     * 
     * @param uiCallbackMock The function to use to send a message to the UI (or mock sending a message to the UI)
     * @param interpreterOptions The interpreter (ex. PythonShell) options to use when running a (ex. Python) script
     */
    constructor(uiCallbackMock: (channel: string, ...args: any[]) => void, interpreterOptions: InterpreterOptions) {
        this.uiCallbackMock = uiCallbackMock;
        this.interpreterOptions = interpreterOptions;
    }

    /**
     * Run a script
     * 
     * Note, this function isn't asynchronous itself but does return a Promise. This is because the nature of the task of running a script from within Electron/Node is 
     * asynchronous. And it's more relevant to pass the resolve and reject functions further down the chain so that the logic code can resolve or reject as needed based on 
     * script output, etc...
     * 
     * Admittedly, the above is a bit of a simplification, because we end up with a few nested promises but the result is ultimately almost the same.
     * 
     * @param {string} script The path to the script to run
     * @param {{[argName: string]: unknown}} uiCallbackArgs The UI (React) callback arguments (the mapping of names with callback arguments - this is done differently between this simplified version and the real one)
     * @returns {Promise} A Promise that's related to the script's execution
     */
    abstract runScript(script: string, uiCallbackArgs?: { [argName: string]: unknown }): Promise<unknown>;
}